import { Router,type Request,type Response,type NextFunction } from "express";
import { randomUUID,createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db,schema,sqlClient } from "@dandanlink/db";
import { authStaff,scope,AccessFault,type StaffRequest } from "./staff-access.js";
import { getPatient } from "./patient-service.js";
import { PatientError } from "./patient-validation.js";
import { localDate } from "./appointments-service.js";

/** C12 / AC08. No patient-facing or public route; no chart-driven diagnoses or charges. */
export const CONDITIONS=["sound","caries_suspected","restored","missing","extraction_planned",
 "root_canal_treated","crown","implant","other"] as const;
export const SURFACES=["M","D","B","L","P","O","I"] as const;
type Dentition="permanent"|"primary";
type Context=Awaited<ReturnType<typeof scope>>;
class ChartFault extends Error{constructor(public status:number,public code:string){super(code);}}
function fail(status:number,code:string):never{throw new ChartFault(status,code);}
const wrap=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
 (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const cid=(req:StaffRequest)=>String(req.params.clinicId);
const pid=(req:StaffRequest)=>String(req.params.patientId);
const noStore=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
const clinician=(ctx:Context)=>ctx.role==="dentist"||
 (["owner","manager"].includes(ctx.role)&&ctx.membership.clinicianEnabled);
function text(v:unknown,max:number,key:string,required=false):string{
 if(v===undefined||v===null||v===""){if(required)fail(422,"REQUIRED_"+key);return "";}
 if(typeof v!=="string"||v.trim().length>max||required&&!v.trim())fail(422,"INVALID_"+key);
 return v.trim();
}
function validDay(v:unknown,key:string,allowEmpty=false):string|null{
 if(allowEmpty&&(v===undefined||v===null||v===""))return null;
 const day=text(v,10,key,true);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+"T12:00:00Z"))||
  new Date(day+"T12:00:00Z").toISOString().slice(0,10)!==day||day>localDate(new Date()))
   fail(422,"INVALID_"+key);
 return day;
}
export function checkFdi(code:unknown,dentition:unknown):string{
 const tooth=text(code,2,"TOOTH",true);
 if(dentition!=="permanent"&&dentition!=="primary")fail(422,"INVALID_DENTITION");
 const re=dentition==="permanent"?/^[1-4][1-8]$/:/^[5-8][1-5]$/;
 if(!re.test(tooth))fail(422,"INVALID_FDI_TOOTH");
 return tooth;
}
function form(raw:any){
 if(!raw||typeof raw!=="object")fail(422,"INVALID_OBSERVATION");
 const dentition=raw.dentition;
 const toothCode=checkFdi(raw.toothCode,dentition);
 const condition=text(raw.condition,30,"CONDITION",true);
 if(!(CONDITIONS as readonly string[]).includes(condition))fail(422,"INVALID_CONDITION");
 const surfaces=raw.surfaces??[];
 if(!Array.isArray(surfaces)||surfaces.length>7||
   surfaces.some((v:unknown)=>typeof v!=="string"||!(SURFACES as readonly string[]).includes(v))||
   new Set(surfaces).size!==surfaces.length)fail(422,"INVALID_SURFACES");
 // Occlusal applies to posterior teeth, incisal to anterior teeth.
 const index=Number(toothCode[1]);
 if(index<=3&&surfaces.includes("O")||index>=4&&surfaces.includes("I"))
   fail(422,"INVALID_TOOTH_SURFACE");
 const notes=text(raw.notes,1000,"NOTES")||null;
 const observationDate=validDay(raw.observationDate,"OBSERVATION_DATE")!;
 const encounterId=text(raw.encounterId,100,"ENCOUNTER",true);
 const actionKey=text(raw.actionKey,100,"ACTION_KEY",true);
 if(actionKey.length<8||!/^[a-zA-Z0-9_-]{8,100}$/.test(actionKey))fail(422,"INVALID_ACTION_KEY");
 return {toothCode,dentition:dentition as Dentition,condition,surfaces:surfaces as string[],
   notes,observationDate,encounterId,actionKey};
}
async function access(req:StaffRequest,write=false):Promise<{ctx:Context;patient:typeof schema.clinicPatient.$inferSelect;encounters:any[]}>{
 const ctx=await scope(req,cid(req));
 if(!clinician(ctx)&&ctx.role!=="assistant")fail(403,"CHART_ROLE_DENIED");
 const patient=await getPatient(cid(req),pid(req));
 // A dentist must have an assigned clinic appointment or an encounter for this patient;
 // an assistant must be the author of an unsigned encounter draft.
 const links=await sqlClient`SELECT e.id,e.status,e.reason,e.created_at,e.provider_membership_id,
  e.created_by,a.status AS appointment_status
  FROM clinic_encounters e LEFT JOIN clinic_appointments a ON a.id=e.appointment_id
  WHERE e.clinic_id=${cid(req)} AND e.patient_id=${pid(req)}
   AND (${ctx.role==="assistant"} AND e.created_by=${req.actor!.id} AND e.status='draft'
    OR ${ctx.role!=="assistant"} AND e.provider_membership_id=${ctx.membership.id})
  ORDER BY e.created_at DESC LIMIT 100`;
 let related=links.length>0;
 if(!related&&clinician(ctx)){
  const [appointment]=await sqlClient`SELECT id FROM clinic_appointments
   WHERE clinic_id=${cid(req)} AND patient_id=${pid(req)}
   AND provider_membership_id=${ctx.membership.id}
   AND status NOT IN ('cancelled','no_show') LIMIT 1`;
  related=Boolean(appointment);
 }
 if(!related)fail(403,"CHART_CASE_NOT_ASSIGNED");
 if(write){
  if(patient.status!=="active")fail(409,"PATIENT_INACTIVE");
  if(ctx.clinic.status==="suspended")fail(403,"CLINIC_SUSPENDED");
  const sub=await db.query.clinicSubscription.findFirst({
   where:eq(schema.clinicSubscription.clinicId,cid(req))});
  if(!sub||sub.status==="cancelled")fail(403,"SUBSCRIPTION_REQUIRED");
  const plan=await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,sub.planVersionId)});
  if(!plan)fail(403,"SUBSCRIPTION_REQUIRED");
  const expiry=sub.status==="trialing"?sub.trialEndsAt:sub.currentPeriodEndsAt;
  if(expiry&&expiry.getTime()+(sub.status==="trialing"?0:plan.graceDays*86400000)<Date.now())
   fail(403,"SUBSCRIPTION_EXPIRED");
 }
 return {ctx,patient,encounters:links};
}
function patientBrief(p:typeof schema.clinicPatient.$inferSelect){
 const dob=p.dateOfBirth;
 const age=dob?Math.floor((Date.now()-Date.parse(dob+"T12:00:00Z"))/(365.2425*86400000)):
 p.ageEstimate;
 const suggestedDentition=age==null?"choose":age<12?"primary":"permanent";
 return {id:p.id,patientNumber:p.patientNumber,preferredName:p.preferredName,
   familyName:p.familyName,suggestedDentition};
}
function row(r:any){
 return {id:r.id,toothCode:r.tooth_code,dentition:r.dentition,condition:r.condition,
  surfaces:r.surfaces||[],notes:r.notes,observationDate:r.observation_date,
  encounterId:r.encounter_id,status:r.status,recordedBy:r.recorded_by,
  recordedByName:r.recorded_by_name||null,validatedByName:r.validated_by_name||null,
  createdAt:r.created_at,validatedAt:r.validated_at,providerMembershipId:r.provider_membership_id};
}
async function audit(req:StaffRequest,action:string,subjectId:string){
 await db.insert(schema.auditEvent).values({id:randomUUID(),actorId:req.actor!.id,
  clinicId:cid(req),action,subjectType:"tooth_observation",subjectId,outcome:"success"});
}
function memberEncounter(links:any[],id:string){
 const e=links.find(x=>x.id===id);
 if(!e)fail(404,"ENCOUNTER_NOT_FOUND");
 return e;
}

export function chartRouter(){
 const api=Router();
 api.use((req,res,next)=>{
  const origin=req.headers.origin;
  const allowed=[process.env.CLINIC_WEB_URL||"http://localhost:3000",
   process.env.ADMIN_WEB_URL||"http://localhost:3001"];
  if(!["GET","HEAD","OPTIONS"].includes(req.method)&&origin&&!allowed.includes(origin)){
   res.status(403).json({code:"ORIGIN_DENIED"});return;
  }
  next();
 });
 api.use(authStaff);
 const patients=Router({mergeParams:true});
 api.use("/clinics/:clinicId/patients/:patientId",patients);
 patients.get("/context",wrap(async(req,res)=>{
  const {ctx,patient,encounters}=await access(req);
  noStore(res);
  res.json({patient:patientBrief(patient),
   encounters:encounters.map(e=>({id:e.id,status:e.status,reason:e.reason,createdAt:e.created_at,
    canRecord:ctx.role==="assistant"?e.status==="draft":true})),
   canValidate:clinician(ctx),canRecord:patient.status==="active",
   timezone:"Asia/Kabul",system:"FDI",conditions:CONDITIONS,surfaces:SURFACES,
   noAutomatedDiagnosis:true});
 }));
 patients.get("/snapshot",wrap(async(req,res)=>{
  const {patient,encounters}=await access(req);
  const dentition=String(req.query.dentition||"");
  if(dentition!=="permanent"&&dentition!=="primary")fail(422,"INVALID_DENTITION");
  const mode=String(req.query.mode||"current");
  if(!["current","visit","history"].includes(mode))fail(422,"INVALID_CHART_MODE");
  const encounterId=mode==="visit"?text(req.query.encounterId,100,"ENCOUNTER",true):null;
  if(encounterId)memberEncounter(encounters,encounterId);
  const asOf=mode==="history"?validDay(req.query.asOf,"HISTORY_DATE"):null;
  const rows=await sqlClient`SELECT DISTINCT ON (o.tooth_code)
    o.id,o.tooth_code,o.dentition,o.condition,o.surfaces,o.notes,o.observation_date,
    o.encounter_id,o.status,o.recorded_by,o.created_at,o.validated_at,o.provider_membership_id
    FROM clinic_tooth_observations o
    WHERE o.clinic_id=${cid(req)} AND o.patient_id=${pid(req)}
     AND o.status='validated' AND o.dentition=${dentition}
     AND (${mode}<>'visit' OR o.encounter_id=${encounterId})
     AND (${mode}<>'history' OR o.observation_date<=${asOf}::date)
    ORDER BY o.tooth_code,o.observation_date DESC,o.validated_at DESC,o.id DESC`;
  await audit(req,"clinical.chart.viewed",pid(req));
  noStore(res);res.json({patient:patientBrief(patient),dentition,mode,asOf,encounterId,
   teeth:rows.map(row),observedCount:rows.length,system:"FDI"});
 }));
 patients.get("/observations",wrap(async(req,res)=>{
  const {ctx,encounters}=await access(req);
  const toothCode=text(req.query.toothCode,2,"TOOTH",true);
  const dentition=/^[1-4]/.test(toothCode)?"permanent":"primary";
  checkFdi(toothCode,dentition);
  const page=Number(req.query.page||1);
  if(!Number.isInteger(page)||page<1||page>100000)fail(422,"INVALID_PAGE");
  const encounterId=req.query.encounterId?text(req.query.encounterId,100,"ENCOUNTER",true):null;
  if(encounterId)memberEncounter(encounters,encounterId);
  const rows=await sqlClient`SELECT o.*,u.name AS recorded_by_name,v.name AS validated_by_name
   FROM clinic_tooth_observations o JOIN auth_users u ON u.id=o.recorded_by
    LEFT JOIN auth_users v ON v.id=o.validated_by
   WHERE o.clinic_id=${cid(req)} AND o.patient_id=${pid(req)}
   AND o.tooth_code=${toothCode}
   AND (${encounterId}::text IS NULL OR o.encounter_id=${encounterId})
   AND (o.status='validated' OR
     ${ctx.role==="assistant"} AND o.recorded_by=${req.actor!.id} AND
       o.encounter_id IN (SELECT id FROM clinic_encounters
        WHERE clinic_id=${cid(req)} AND patient_id=${pid(req)} AND
        created_by=${req.actor!.id} AND status='draft')
     OR ${ctx.role!=="assistant"} AND o.provider_membership_id=${ctx.membership.id})
   ORDER BY o.observation_date DESC,o.created_at DESC,o.id DESC LIMIT 21 OFFSET ${(page-1)*20}`;
  await audit(req,"clinical.chart.tooth_history.viewed",pid(req));
  noStore(res);res.json({toothCode,page,limit:20,hasMore:rows.length>20,
   observations:rows.slice(0,20).map(row)});
 }));
 patients.post("/observations",wrap(async(req,res)=>{
  const {ctx,encounters}=await access(req,true);
  const data=form(req.body),enc=memberEncounter(encounters,data.encounterId);
  if(ctx.role==="assistant"&&enc.status!=="draft")fail(403,"ASSISTANT_DRAFT_ONLY");
  const isValidated=clinician(ctx),status=isValidated?"validated":"draft";
  const normalized={...data,status};
  const digest=createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  const existing=await sqlClient`SELECT * FROM clinic_tooth_observations
   WHERE clinic_id=${cid(req)} AND recorded_by=${req.actor!.id}
   AND action_key=${data.actionKey} LIMIT 1`;
  if(existing.length){
   if(existing[0].request_digest!==digest)fail(409,"DUPLICATE_ACTION_CHANGED");
   noStore(res);res.json({observation:row(existing[0]),replayed:true});return;
  }
  const id=randomUUID();
  const result=await sqlClient`INSERT INTO clinic_tooth_observations
   (id,clinic_id,patient_id,encounter_id,provider_membership_id,tooth_code,dentition,
    condition,surfaces,notes,observation_date,status,recorded_by,validated_by,validated_at,
    action_key,request_digest)
   VALUES (${id},${cid(req)},${pid(req)},${data.encounterId},${enc.provider_membership_id},
    ${data.toothCode},${data.dentition},${data.condition},${JSON.stringify(data.surfaces)}::jsonb,
    ${data.notes},${data.observationDate}::date,${status},${req.actor!.id},
    ${isValidated?req.actor!.id:null},CASE WHEN ${isValidated} THEN now() ELSE NULL END,${data.actionKey},${digest})
   ON CONFLICT (clinic_id,recorded_by,action_key) DO NOTHING RETURNING *`;
  if(!result.length){
   const [saved]=await sqlClient`SELECT * FROM clinic_tooth_observations
    WHERE clinic_id=${cid(req)} AND recorded_by=${req.actor!.id}
    AND action_key=${data.actionKey}`;
   if(!saved||saved.request_digest!==digest)fail(409,"DUPLICATE_ACTION_CHANGED");
   noStore(res);res.json({observation:row(saved),replayed:true});return;
  }
  await audit(req,isValidated?"clinical.chart.observation.validated":"clinical.chart.observation.drafted",id);
  noStore(res);res.status(201).json({observation:row(result[0]),replayed:false});
 }));
 patients.post("/observations/:observationId/validate",wrap(async(req,res)=>{
  const {ctx,encounters}=await access(req,true);
  if(!clinician(ctx))fail(403,"CLINICIAN_VALIDATION_REQUIRED");
  if(req.body?.confirmation!=="VALIDATE")fail(422,"VALIDATION_CONFIRMATION_REQUIRED");
  const id=text(req.params.observationId,100,"OBSERVATION",true);
  let result:any;
  await sqlClient.begin(async tx=>{
   const [observation]=await tx`SELECT * FROM clinic_tooth_observations
    WHERE id=${id} AND clinic_id=${cid(req)} AND patient_id=${pid(req)} FOR UPDATE`;
   if(!observation||observation.provider_membership_id!==ctx.membership.id)
    fail(404,"OBSERVATION_NOT_FOUND");
   memberEncounter(encounters,observation.encounter_id);
   if(observation.status!=="draft")fail(409,"ALREADY_VALIDATED");
   const update=await tx`UPDATE clinic_tooth_observations SET status='validated',
    validated_by=${req.actor!.id},validated_at=now()
    WHERE id=${id} RETURNING *`;
   result=update[0];
  });
  await audit(req,"clinical.chart.observation.validated",id);
  noStore(res);res.json({observation:row(result)});
 }));
 api.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof ChartFault||error instanceof AccessFault){
   res.status(error.status).json({code:error.code});return;
  }
  if(error instanceof PatientError){res.status(error.statusCode).json({code:error.code});return;}
  const code=(error as any)?.code||(error as any)?.cause?.code;
  if(code==="23505")return void res.status(409).json({code:"CHART_CONFLICT"});
  if(code==="23514"||code==="23503")return void res.status(422).json({code:"CHART_CONSTRAINT_INVALID"});
  // Log SQLSTATE and schema constraint only; never log SQL text, params or patient content.
  console.error("PH08 dental chart request failed",error instanceof Error?error.name:"unknown",
   "sqlState",code||"none","constraint",String((error as any)?.constraint||"none"),
   "source",String((error as any)?.stack||"").match(/chart-router\.ts:\d+:\d+/)?.[0]||"unknown");
  res.status(500).json({code:"CHART_UNAVAILABLE"});
 });
 return api;
}
