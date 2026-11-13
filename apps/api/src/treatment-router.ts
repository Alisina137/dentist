import {Router,type Request,type Response,type NextFunction} from "express";
import {randomUUID} from "node:crypto";
import {eq} from "drizzle-orm";
import {db,schema,sqlClient} from "@dandanlink/db";
import {authStaff,scope,AccessFault,type StaffRequest} from "./staff-access.js";
import {getPatient} from "./patient-service.js";
import {PatientError} from "./patient-validation.js";

type Ctx=Awaited<ReturnType<typeof scope>>;
type Item={serviceId:string;serviceVersion:number;name:string;quantity:number;unitPriceAfn:number;discountAfn:number;totalAfn:number};
type Stage={description:string;toothCodes:string[];expectedVisits:number;dueDate:string|null};
class Fault extends Error{constructor(public status:number,public code:string){super(code);}}
function reject(status:number,code:string):never{throw new Fault(status,code);}
const route=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
 (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const cid=(r:StaffRequest)=>String(r.params.clinicId);
const pid=(r:StaffRequest)=>String(r.params.patientId);
const noStore=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
const clinician=(c:Ctx)=>c.role==="dentist"||
 (["owner","manager"].includes(c.role)&&c.membership.clinicianEnabled);
function str(v:unknown,min:number,max:number,key:string):string{
 if(typeof v!=="string"||v.trim().length<min||v.trim().length>max)reject(422,"INVALID_"+key);
 return v.trim();
}
function number(v:unknown,min:number,max:number,key:string):number{
 const n=Number(v);
 if(typeof v!=="number"||!Number.isSafeInteger(n)||n<min||n>max)reject(422,"INVALID_"+key);
 return n;
}
function day(v:unknown,allowNull=true):string|null{
 if((v==null||v==="")&&allowNull)return null;
 const s=str(v,10,10,"DATE");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s+"T12:00:00Z"))||
 new Date(s+"T12:00:00Z").toISOString().slice(0,10)!==s)reject(422,"INVALID_DATE");
 return s;
}
const fdi=(code:string)=>/^([1-4][1-8]|[5-8][1-5])$/.test(code);
const idem=(value:unknown)=>str(value,8,100,"IDEMPOTENCY_KEY");
const revision=(value:unknown)=>number(value,1,1000000,"REVISION");
async function access(req:StaffRequest,write=false){
 const ctx=await scope(req,cid(req));
 if(!clinician(ctx))reject(403,"TREATMENT_CLINICIAN_ONLY");
 if(write){
  if(ctx.clinic.status==="suspended")reject(403,"CLINIC_SUSPENDED");
  const sub=await db.query.clinicSubscription.findFirst({where:eq(schema.clinicSubscription.clinicId,cid(req))});
  if(!sub||sub.status==="cancelled")reject(403,"SUBSCRIPTION_REQUIRED");
  const plan=await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,sub.planVersionId)});
  if(!plan)reject(403,"SUBSCRIPTION_REQUIRED");
  const expiry=sub.status==="trialing"?sub.trialEndsAt:sub.currentPeriodEndsAt;
  if(expiry&&expiry.getTime()+(sub.status==="trialing"?0:plan.graceDays*86400000)<Date.now())
   reject(403,"SUBSCRIPTION_EXPIRED");
 }
 const p=await getPatient(cid(req),pid(req));
 if(write&&p.status!=="active")reject(409,"PATIENT_INACTIVE");
 return {ctx,patient:p};
}
async function assigned(req:StaffRequest,ctx:Ctx){
 const [e]=await sqlClient`SELECT id FROM clinic_encounters WHERE clinic_id=${cid(req)}
  AND patient_id=${pid(req)} AND provider_membership_id=${ctx.membership.id} LIMIT 1`;
 if(e)return;
 const [a]=await sqlClient`SELECT id FROM clinic_appointments WHERE clinic_id=${cid(req)}
  AND patient_id=${pid(req)} AND provider_membership_id=${ctx.membership.id}
  AND status NOT IN ('cancelled','no_show') LIMIT 1`;
 if(!a)reject(403,"TREATMENT_CASE_NOT_ASSIGNED");
}
async function loadPlan(req:StaffRequest,ctx:Ctx,id:string,tx:any=sqlClient){
 const [p]=await tx`SELECT * FROM clinic_treatment_plans WHERE id=${id}
  AND clinic_id=${cid(req)} AND patient_id=${pid(req)} LIMIT 1`;
 if(!p||p.clinician_membership_id!==ctx.membership.id)reject(404,"TREATMENT_NOT_FOUND");
 return p;
}
async function event(tx:any,req:StaffRequest,p:any,action:string,from:string|null,to:string|null,
 reason:string|null=null,stageId:string|null=null){
 await tx`INSERT INTO clinic_treatment_events(id,clinic_id,patient_id,plan_id,version,action,
  stage_id,from_status,to_status,reason,actor_id)
  VALUES(${randomUUID()},${cid(req)},${pid(req)},${p.id},${p.version},${action},
   ${stageId},${from},${to},${reason},${req.actor!.id})`;
 await tx`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
 VALUES(${randomUUID()},${req.actor!.id},${cid(req)},${"treatment."+action},
  'treatment_plan',${p.id},'success')`;
}
function row(r:any){return{
 id:r.id,clinicId:r.clinic_id,patientId:r.patient_id,clinicianMembershipId:r.clinician_membership_id,
 title:r.title,indication:r.indication,expectedSessions:r.expected_sessions,
 durationMinutes:r.duration_minutes,notes:r.notes,status:r.status,revision:r.revision,
 version:r.version,acceptedVersion:r.accepted_version,consentState:r.consent_state,
 patientReleased:r.patient_released,estimateTotalAfn:r.estimate_total_afn,
 createdAt:r.created_at,updatedAt:r.updated_at
};}
function stageRow(s:any){return{id:s.id,version:s.version,position:s.position,description:s.description,
 toothCodes:s.tooth_codes,expectedVisits:s.expected_visits,dueDate:s.due_date,status:s.status,
 startedAt:s.started_at,completedAt:s.completed_at,linkedEncounterId:s.linked_encounter_id,
 completionNote:s.completion_note};}
async function input(req:StaffRequest,ctx:Ctx,raw:any){
 if(!raw||typeof raw!=="object")reject(422,"INVALID_TREATMENT");
 const title=str(raw.title,3,120,"TITLE"),indication=str(raw.indication,10,5000,"INDICATION");
 const expectedSessions=number(raw.expectedSessions,1,60,"EXPECTED_SESSIONS");
 const durationMinutes=raw.durationMinutes==null?null:number(raw.durationMinutes,5,100000,"DURATION");
 const notes=raw.notes==null||raw.notes===""?null:str(raw.notes,1,2000,"NOTES");
 const stageInput=raw.stages;
 if(!Array.isArray(stageInput)||stageInput.length<1||stageInput.length>30)reject(422,"INVALID_STAGES");
 const stages:Stage[]=stageInput.map((s:any)=>{
  const description=str(s?.description,3,500,"STAGE_DESCRIPTION");
  const toothCodes=s?.toothCodes??[];
  if(!Array.isArray(toothCodes)||toothCodes.length>32||
   toothCodes.some((x:unknown)=>typeof x!=="string"||!fdi(x))||
   new Set(toothCodes).size!==toothCodes.length)reject(422,"INVALID_TOOTH_CODES");
  return {description,toothCodes,expectedVisits:number(s?.expectedVisits,1,20,"STAGE_VISITS"),
   dueDate:day(s?.dueDate)};
 });
 const inputItems=raw.items;
 if(!Array.isArray(inputItems)||inputItems.length<1||inputItems.length>20)
  reject(422,"INVALID_ESTIMATE_ITEMS");
 const items:Item[]=[];let total=0;
 for(const item of inputItems){
  const serviceId=str(item?.serviceId,5,100,"SERVICE");
  const quantity=number(item?.quantity,1,20,"QUANTITY");
  const discountAfn=number(item?.discountAfn??0,0,10000000,"DISCOUNT");
  const [service]=await sqlClient`SELECT id,name,version,base_price_afn FROM clinic_services
   WHERE id=${serviceId} AND clinic_id=${cid(req)} AND active=true LIMIT 1`;
  if(!service)reject(422,"SERVICE_UNAVAILABLE");
  const subtotal=service.base_price_afn*quantity;
  if(discountAfn>subtotal)reject(422,"DISCOUNT_EXCEEDS_LINE");
  if(discountAfn>0&&(!["owner","manager"].includes(ctx.role)||!ctx.membership.clinicianEnabled))
   reject(403,"PRICE_ADJUSTMENT_REQUIRES_OWNER");
  // Cap discounts at 30% and use only integer AFN calculations, never floating point.
  if(discountAfn*10>subtotal*3)reject(422,"DISCOUNT_EXCEEDS_POLICY");
  const lineTotal=subtotal-discountAfn;
  total+=lineTotal;
  if(!Number.isSafeInteger(total)||total>2000000000)reject(422,"ESTIMATE_EXCEEDS_LIMIT");
  items.push({serviceId:service.id,serviceVersion:service.version,name:service.name,
   quantity,unitPriceAfn:service.base_price_afn,discountAfn,totalAfn:lineTotal});
 }
 return {title,indication,expectedSessions,durationMinutes,notes,stages,items,total};
}
async function versionAndStages(tx:any,req:StaffRequest,p:any,
 data:Awaited<ReturnType<typeof input>>,reason:string|null){
 await tx`INSERT INTO clinic_treatment_versions(plan_id,clinic_id,patient_id,version,title,
  indication,expected_sessions,duration_minutes,notes,items,estimate_total_afn,revision_reason,author_id)
 VALUES(${p.id},${cid(req)},${pid(req)},${p.version},${data.title},${data.indication},
  ${data.expectedSessions},${data.durationMinutes},${data.notes},${JSON.stringify(data.items)}::jsonb,
  ${data.total},${reason},${req.actor!.id})`;
 for(let i=0;i<data.stages.length;i++){
  const s=data.stages[i];
  await tx`INSERT INTO clinic_treatment_stages(id,clinic_id,patient_id,plan_id,
   version,position,description,tooth_codes,expected_visits,due_date)
   VALUES(${randomUUID()},${cid(req)},${pid(req)},${p.id},${p.version},${i+1},
    ${s.description},${JSON.stringify(s.toothCodes)}::jsonb,${s.expectedVisits},${s.dueDate}::date)`;
 }
}
async function full(req:StaffRequest,ctx:Ctx,id:string){
 const p=await loadPlan(req,ctx,id);
 const [v]=await sqlClient`SELECT * FROM clinic_treatment_versions WHERE plan_id=${p.id}
  AND version=${p.version} AND clinic_id=${cid(req)}`;
 const stages=await sqlClient`SELECT * FROM clinic_treatment_stages WHERE plan_id=${p.id}
  AND version=${p.version} AND clinic_id=${cid(req)} ORDER BY position`;
 const events=await sqlClient`SELECT e.id,e.version,e.action,e.stage_id,e.from_status,e.to_status,
  e.reason,e.created_at,u.name AS actor_name FROM clinic_treatment_events e
  JOIN auth_users u ON u.id=e.actor_id WHERE e.plan_id=${p.id} AND e.clinic_id=${cid(req)}
  ORDER BY e.created_at DESC,e.id DESC LIMIT 150`;
 const consents=await sqlClient`SELECT c.id,c.version,c.action,c.patient_role,c.person_name,c.relationship,
  c.witness_name,c.scope_description,c.acknowledged_at,c.reason,c.created_at,
  u.name AS recorded_by_name FROM clinic_treatment_consents c JOIN auth_users u ON u.id=c.actor_id
  WHERE c.plan_id=${p.id} AND c.clinic_id=${cid(req)}
  ORDER BY c.created_at DESC,c.id DESC LIMIT 50`;
 const versions=await sqlClient`SELECT version,title,expected_sessions,duration_minutes,estimate_total_afn,
  revision_reason,created_at FROM clinic_treatment_versions WHERE plan_id=${p.id} AND
  clinic_id=${cid(req)} ORDER BY version DESC LIMIT 100`;
 return {plan:row(p),items:v?.items||[],stages:stages.map(stageRow),events,consents,versions,
  currency:"AFN",autoInvoicing:false};
}
export function treatmentRouter(){
 const api=Router();
 api.use((req,res,next)=>{
  const origin=req.headers.origin;
  if(!["GET","HEAD","OPTIONS"].includes(req.method)&&origin&&
    ![process.env.CLINIC_WEB_URL||"http://localhost:3000",
      process.env.ADMIN_WEB_URL||"http://localhost:3001"].includes(origin)){
   res.status(403).json({code:"ORIGIN_DENIED"});return;
  }
  next();
 });
 api.use(authStaff);
 // Finance-only projection: intentionally no patient ID, diagnosis, consent or stage notes.
 api.get("/clinics/:clinicId/plans/:planId/estimate",route(async(req,res)=>{
  const ctx=await scope(req,cid(req));
  if(!["owner","manager","cashier"].includes(ctx.role)&&!clinician(ctx))
   reject(403,"ESTIMATE_ROLE_DENIED");
  const [p]=await sqlClient`SELECT id,clinic_id,clinician_membership_id,version,status FROM clinic_treatment_plans
   WHERE id=${String(req.params.planId)} AND clinic_id=${cid(req)} LIMIT 1`;
  if(!p)reject(404,"TREATMENT_NOT_FOUND");
  if(ctx.role==="dentist"&&p.clinician_membership_id!==ctx.membership.id)
   reject(404,"TREATMENT_NOT_FOUND");
  const [v]=await sqlClient`SELECT items,estimate_total_afn FROM clinic_treatment_versions
   WHERE plan_id=${p.id} AND version=${p.version} AND clinic_id=${cid(req)}`;
  noStore(res);res.json({planId:p.id,version:p.version,currency:"AFN",
   items:v.items,totalAfn:v.estimate_total_afn,invoiceCreated:false,paymentPosted:false});
 }));
 const scoped=Router({mergeParams:true});
 api.use("/clinics/:clinicId/patients/:patientId",scoped);
 scoped.get("/status-summary",route(async(req,res)=>{
  const ctx=await scope(req,cid(req));
  if(!["owner","manager","receptionist","assistant","dentist"].includes(ctx.role))
   reject(403,"SUMMARY_ROLE_DENIED");
  await getPatient(cid(req),pid(req));
  const rows=await sqlClient`SELECT p.id,p.status,p.version,p.expected_sessions,
   (SELECT COUNT(*)::integer FROM clinic_treatment_stages s WHERE s.plan_id=p.id
    AND s.version=p.version AND s.status='completed') AS completed_stages,
   (SELECT COUNT(*)::integer FROM clinic_treatment_stages s WHERE s.plan_id=p.id
    AND s.version=p.version) AS stage_count
   FROM clinic_treatment_plans p WHERE p.clinic_id=${cid(req)} AND p.patient_id=${pid(req)}
   AND (${ctx.role!=="dentist"} OR p.clinician_membership_id=${ctx.membership.id})
   ORDER BY p.updated_at DESC LIMIT 60`;
  noStore(res);res.json({summary:rows});
 }));
 scoped.get("/catalog",route(async(req,res)=>{
  const {ctx}=await access(req);
  await assigned(req,ctx);
  const serviceRows=await sqlClient`SELECT id,name,category,base_price_afn,version
   FROM clinic_services WHERE clinic_id=${cid(req)} AND active=true ORDER BY name LIMIT 100`;
  const encounters=await sqlClient`SELECT id,reason,status,created_at FROM clinic_encounters
   WHERE clinic_id=${cid(req)} AND patient_id=${pid(req)}
    AND provider_membership_id=${ctx.membership.id} ORDER BY created_at DESC LIMIT 80`;
  noStore(res);res.json({services:serviceRows,encounters,
   availableDiscount:ctx.role==="owner"||ctx.role==="manager",currency:"AFN"});
 }));
 scoped.get("/plans",route(async(req,res)=>{
  const {ctx}=await access(req);await assigned(req,ctx);
  const status=String(req.query.status||"all"),search=String(req.query.search||"").trim().slice(0,100);
  if(!["all","draft","proposed","accepted","in_progress","active","completed","discontinued"].includes(status))
   reject(422,"INVALID_STATUS");
  const page=Number(req.query.page||1);
  if(!Number.isInteger(page)||page<1||page>10000)reject(422,"INVALID_PAGE");
  const rows=await sqlClient`SELECT p.id,p.title,p.status,p.version,p.revision,p.consent_state,
   p.estimate_total_afn,p.expected_sessions,p.updated_at,u.name AS clinician_name,
   (SELECT COUNT(*)::integer FROM clinic_treatment_stages s
    WHERE s.plan_id=p.id AND s.version=p.version) AS stage_count
   FROM clinic_treatment_plans p JOIN clinic_memberships m ON m.id=p.clinician_membership_id
   JOIN auth_users u ON u.id=m.user_id
   WHERE p.clinic_id=${cid(req)} AND p.patient_id=${pid(req)}
   AND p.clinician_membership_id=${ctx.membership.id}
   AND (${status}='all' OR p.status=${status} OR (${status}='active' AND p.status IN ('accepted','in_progress')))
   AND (${search}='' OR p.title ILIKE ${"%"+search+"%"})
   ORDER BY p.updated_at DESC,p.id DESC LIMIT 11 OFFSET ${(page-1)*10}`;
  noStore(res);res.json({plans:rows.slice(0,10),hasMore:rows.length>10,page});
 }));
 scoped.post("/plans",route(async(req,res)=>{
  const {ctx}=await access(req,true);await assigned(req,ctx);
  const data=await input(req,ctx,req.body);const id=randomUUID();
  await sqlClient.begin(async tx=>{
   await tx`INSERT INTO clinic_treatment_plans(id,clinic_id,patient_id,clinician_membership_id,
    title,indication,expected_sessions,duration_minutes,notes,estimate_total_afn,created_by)
    VALUES(${id},${cid(req)},${pid(req)},${ctx.membership.id},${data.title},${data.indication},
     ${data.expectedSessions},${data.durationMinutes},${data.notes},${data.total},${req.actor!.id})`;
   const p={id,version:1};
   await versionAndStages(tx,req,p,data,null);
   await event(tx,req,p,"created",null,"draft");
  });
  noStore(res);res.status(201).json({id,version:1,revision:1,status:"draft"});
 }));
 scoped.get("/plans/:planId",route(async(req,res)=>{
  const {ctx}=await access(req);await assigned(req,ctx);
  const data=await full(req,ctx,String(req.params.planId));
  noStore(res);res.json(data);
 }));
 scoped.put("/plans/:planId/revise",route(async(req,res)=>{
  const {ctx}=await access(req,true);await assigned(req,ctx);
  const data=await input(req,ctx,req.body);
  const rev=revision(req.body.revision),reason=str(req.body.reason,10,500,"REVISION_REASON");
  const id=String(req.params.planId);
  let version=0,resultStatus='proposed';
  await sqlClient.begin(async tx=>{
   const [p]=await tx`SELECT * FROM clinic_treatment_plans WHERE id=${id}
    AND clinic_id=${cid(req)} AND patient_id=${pid(req)} FOR UPDATE`;
   if(!p||p.clinician_membership_id!==ctx.membership.id)reject(404,"TREATMENT_NOT_FOUND");
   if(p.revision!==rev)reject(409,"STALE_TREATMENT_REVISION");
   if(["completed","discontinued"].includes(p.status))reject(409,"PLAN_IS_FINAL");
   version=p.version+1;
   const to=p.status==="draft"?"draft":"proposed";
   resultStatus=to;
   await tx`UPDATE clinic_treatment_plans SET title=${data.title},indication=${data.indication},
    expected_sessions=${data.expectedSessions},duration_minutes=${data.durationMinutes},
    notes=${data.notes},estimate_total_afn=${data.total},version=${version},revision=revision+1,
    status=${to},consent_state='none',accepted_version=NULL,patient_released=false,updated_at=now()
    WHERE id=${id}`;
   const next={...p,version};
   await versionAndStages(tx,req,next,data,reason);
   await event(tx,req,next,p.status==="draft"?"draft_edited":"revised",p.status,to,reason);
  });
  noStore(res);res.json({id,version,revision:rev+1,
   status:resultStatus,consentState:"none",reconsentRequired:true});
 }));
 scoped.post("/plans/:planId/propose",route(async(req,res)=>{
  const {ctx}=await access(req,true),rev=revision(req.body?.revision),id=String(req.params.planId);
  await sqlClient.begin(async tx=>{
   const [p]=await tx`SELECT * FROM clinic_treatment_plans WHERE id=${id}
    AND clinic_id=${cid(req)} AND patient_id=${pid(req)} FOR UPDATE`;
   if(!p||p.clinician_membership_id!==ctx.membership.id)reject(404,"TREATMENT_NOT_FOUND");
   if(p.revision!==rev)reject(409,"STALE_TREATMENT_REVISION");
   if(p.status!=="draft")reject(409,"PROPOSAL_NOT_DRAFT");
   await tx`UPDATE clinic_treatment_plans SET status='proposed',revision=revision+1,
    updated_at=now() WHERE id=${id}`;
   await event(tx,req,p,"proposed","draft","proposed");
  });
  noStore(res);res.json({status:"proposed",revision:rev+1});
 }));
 scoped.post("/plans/:planId/consent",route(async(req,res)=>{
  const {ctx}=await access(req,true),id=String(req.params.planId);
  const rev=revision(req.body?.revision);
  if(req.body?.confirmation!=="IN_PERSON_RECORDED")reject(422,"IN_PERSON_CONFIRMATION_REQUIRED");
  const who=str(req.body?.patientRole,7,8,"PATIENT_ROLE");
  if(!["patient","guardian"].includes(who))reject(422,"INVALID_PATIENT_ROLE");
  const person=str(req.body?.personName,2,120,"PERSON_NAME");
  const witness=str(req.body?.witnessName,2,120,"WITNESS_NAME");
  const relationship=who==="guardian"?str(req.body?.relationship,2,120,"RELATIONSHIP"):null;
  const scopeDescription=str(req.body?.scopeDescription,10,2000,"CONSENT_SCOPE");
  const acknowledgedAt=str(req.body?.acknowledgedAt,20,35,"ACKNOWLEDGED_TIME");
  const instant=new Date(acknowledgedAt);
  if(!Number.isFinite(instant.getTime())||instant.getTime()>Date.now()+60000||
    instant.getTime()<Date.now()-30*86400000)reject(422,"INVALID_ACKNOWLEDGED_TIME");
  await sqlClient.begin(async tx=>{
   const [p]=await tx`SELECT * FROM clinic_treatment_plans WHERE id=${id}
    AND clinic_id=${cid(req)} AND patient_id=${pid(req)} FOR UPDATE`;
   if(!p||p.clinician_membership_id!==ctx.membership.id)reject(404,"TREATMENT_NOT_FOUND");
   if(p.revision!==rev)reject(409,"STALE_TREATMENT_REVISION");
   if(p.consent_state==="withdrawn")reject(409,"CONSENT_WITHDRAWN_REVISE_REQUIRED");
   if(p.status!=="proposed"||p.consent_state==="recorded")reject(409,"CONSENT_NOT_ALLOWED");
   // No e-sign is claimed; the named clinician is recording an in-person attestation.
   await tx`INSERT INTO clinic_treatment_consents(id,clinic_id,patient_id,plan_id,version,action,
    patient_role,person_name,relationship,witness_name,scope_description,acknowledged_at,actor_id)
    VALUES(${randomUUID()},${cid(req)},${pid(req)},${p.id},${p.version},'recorded',
     ${who},${person},${relationship},${witness},${scopeDescription},${instant.toISOString()},${req.actor!.id})`;
   await tx`UPDATE clinic_treatment_plans SET status='accepted',consent_state='recorded',
    accepted_version=version,revision=revision+1,updated_at=now() WHERE id=${p.id}`;
   await event(tx,req,p,"consent_recorded","proposed","accepted");
  });
  noStore(res);res.json({status:"accepted",consentState:"recorded",revision:rev+1});
 }));
 scoped.post("/plans/:planId/withdraw-consent",route(async(req,res)=>{
  const {ctx}=await access(req,true),id=String(req.params.planId),rev=revision(req.body?.revision);
  const reason=str(req.body?.reason,10,500,"WITHDRAWAL_REASON");
  await sqlClient.begin(async tx=>{
   const [p]=await tx`SELECT * FROM clinic_treatment_plans WHERE id=${id} AND clinic_id=${cid(req)}
    AND patient_id=${pid(req)} FOR UPDATE`;
   if(!p||p.clinician_membership_id!==ctx.membership.id)reject(404,"TREATMENT_NOT_FOUND");
   if(p.revision!==rev)reject(409,"STALE_TREATMENT_REVISION");
   if(!["accepted","in_progress"].includes(p.status)||p.consent_state!=="recorded")
    reject(409,"CONSENT_NOT_ACTIVE");
   const [record]=await tx`SELECT patient_role,person_name,relationship,witness_name,scope_description
    FROM clinic_treatment_consents WHERE plan_id=${p.id} AND version=${p.version}
    AND action='recorded' LIMIT 1`;
   if(!record)reject(409,"CONSENT_NOT_ACTIVE");
   await tx`INSERT INTO clinic_treatment_consents(id,clinic_id,patient_id,plan_id,version,action,
    patient_role,person_name,relationship,witness_name,scope_description,acknowledged_at,reason,actor_id)
    VALUES(${randomUUID()},${cid(req)},${pid(req)},${p.id},${p.version},'withdrawn',
     ${record.patient_role},${record.person_name},${record.relationship},${record.witness_name},
     ${record.scope_description},now(),${reason},${req.actor!.id})`;
   await tx`UPDATE clinic_treatment_plans SET consent_state='withdrawn',status='proposed',
    accepted_version=NULL,revision=revision+1,patient_released=false,updated_at=now() WHERE id=${id}`;
   await event(tx,req,p,"consent_withdrawn",p.status,"proposed",reason);
  });
  noStore(res);res.json({status:"proposed",consentState:"withdrawn",revision:rev+1});
 }));
 scoped.post("/plans/:planId/stages/:stageId/action",route(async(req,res)=>{
  const {ctx}=await access(req,true),id=String(req.params.planId),sid=String(req.params.stageId);
  const rev=revision(req.body?.revision),action=str(req.body?.action,4,9,"STAGE_ACTION");
  if(!["start","complete","skip"].includes(action))reject(422,"INVALID_STAGE_ACTION");
  const reason=action==="skip"?str(req.body?.reason,10,500,"SKIP_REASON"):null;
  const encounterId=action==="complete"?str(req.body?.encounterId,8,100,"ENCOUNTER_ID"):null;
  let resultStatus="";
  await sqlClient.begin(async tx=>{
   const [p]=await tx`SELECT * FROM clinic_treatment_plans WHERE id=${id} AND clinic_id=${cid(req)}
    AND patient_id=${pid(req)} FOR UPDATE`;
   if(!p||p.clinician_membership_id!==ctx.membership.id)reject(404,"TREATMENT_NOT_FOUND");
   if(p.revision!==rev)reject(409,"STALE_TREATMENT_REVISION");
   if(!["accepted","in_progress"].includes(p.status)||p.consent_state!=="recorded"||
      p.accepted_version!==p.version)reject(409,"TREATMENT_CONSENT_REQUIRED");
   const [s]=await tx`SELECT * FROM clinic_treatment_stages WHERE id=${sid} AND plan_id=${id}
    AND clinic_id=${cid(req)} AND patient_id=${pid(req)} AND version=${p.version} FOR UPDATE`;
   if(!s)reject(404,"TREATMENT_STAGE_NOT_FOUND");
   if(action==="start"){
    if(s.status!=="pending")reject(409,"STAGE_ALREADY_STARTED");
    await tx`UPDATE clinic_treatment_stages SET status='in_progress',
     started_at=now(),started_by=${req.actor!.id} WHERE id=${sid}`;
    resultStatus="in_progress";
   }else if(action==="skip"){
    if(!["pending","in_progress"].includes(s.status))reject(409,"STAGE_FINAL");
    await tx`UPDATE clinic_treatment_stages SET status='skipped',completed_at=now(),
     completed_by=${req.actor!.id},completion_note=${reason} WHERE id=${sid}`;
    resultStatus="skipped";
   }else{
    if(s.status!=="in_progress")reject(409,"STAGE_MUST_START_FIRST");
    const [encounter]=await tx`SELECT id,status,performed_procedures,provider_membership_id
     FROM clinic_encounters WHERE id=${encounterId} AND clinic_id=${cid(req)}
      AND patient_id=${pid(req)} LIMIT 1`;
    if(!encounter||encounter.provider_membership_id!==ctx.membership.id)
     reject(404,"ENCOUNTER_NOT_FOUND");
    if(encounter.status!=="signed")reject(409,"SIGNED_ENCOUNTER_REQUIRED");
    const expected=String(s.description).trim().toLocaleLowerCase("en-US");
    const codes=s.tooth_codes as string[];
    const procedures=encounter.performed_procedures as Array<{description?:string;toothIds?:string[]}>;
    // Evidence must be a verified signed encounter's actual performed procedure,
    // not a scheduled service or a planned stage.
    if(!Array.isArray(procedures)||!procedures.some(x=>
     x.description?.trim().toLocaleLowerCase("en-US")===expected&&
      (!codes.length||codes.every(c=>Array.isArray(x.toothIds)&&x.toothIds.includes(c)))))
     reject(409,"PERFORMED_PROCEDURE_EVIDENCE_REQUIRED");
    await tx`UPDATE clinic_treatment_stages SET status='completed',completed_at=now(),
     completed_by=${req.actor!.id},linked_encounter_id=${encounterId} WHERE id=${sid}`;
    resultStatus="completed";
   }
   const [remaining]=await tx`SELECT COUNT(*) FILTER(WHERE status NOT IN ('completed','skipped'))::integer AS remaining,
    COUNT(*) FILTER(WHERE status='completed')::integer AS completed
    FROM clinic_treatment_stages WHERE plan_id=${id} AND version=${p.version}`;
   const next=remaining.remaining===0&&remaining.completed>0?"completed":
    p.status==="accepted"?"in_progress":p.status;
   await tx`UPDATE clinic_treatment_plans SET status=${next},revision=revision+1,updated_at=now()
    WHERE id=${id}`;
   await event(tx,req,p,action==="start"?"stage_started":action==="complete"?"stage_completed":
    "stage_skipped",p.status,next,reason,sid);
   if(next==="completed")await event(tx,req,p,"completed",p.status,"completed");
   resultStatus=next;
  });
  noStore(res);res.json({status:resultStatus,revision:rev+1});
 }));
 scoped.post("/plans/:planId/discontinue",route(async(req,res)=>{
  const {ctx}=await access(req,true),id=String(req.params.planId),rev=revision(req.body?.revision);
  const reason=str(req.body?.reason,10,500,"DISCONTINUE_REASON");
  await sqlClient.begin(async tx=>{
   const [p]=await tx`SELECT * FROM clinic_treatment_plans WHERE id=${id} AND clinic_id=${cid(req)}
    AND patient_id=${pid(req)} FOR UPDATE`;
   if(!p||p.clinician_membership_id!==ctx.membership.id)reject(404,"TREATMENT_NOT_FOUND");
   if(p.revision!==rev)reject(409,"STALE_TREATMENT_REVISION");
   if(["completed","discontinued"].includes(p.status))reject(409,"PLAN_IS_FINAL");
   await tx`UPDATE clinic_treatment_plans SET status='discontinued',revision=revision+1,
    patient_released=false,updated_at=now() WHERE id=${id}`;
   await event(tx,req,p,"discontinued",p.status,"discontinued",reason);
  });
  noStore(res);res.json({status:"discontinued",revision:rev+1});
 }));
 api.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(err instanceof Fault||err instanceof AccessFault)return void res.status(err.status).json({code:err.code});
  if(err instanceof PatientError)return void res.status(err.statusCode).json({code:err.code});
  const code=(err as any)?.code;
  if(code==="23505")return void res.status(409).json({code:"TREATMENT_CONFLICT"});
  if(code==="23514"||code==="23503")return void res.status(422).json({code:"TREATMENT_CONSTRAINT"});
  console.error("PH09 treatment request failed",err instanceof Error?err.name:"unknown",
   "sqlState",code||"none"); // Never log clinical text, patient ID or SQL parameters.
  res.status(500).json({code:"TREATMENT_UNAVAILABLE"});
 });
 return api;
}
