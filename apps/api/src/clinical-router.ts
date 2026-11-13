import { Router, type Request, type Response, type NextFunction } from "express";
import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema, sqlClient } from "@dandanlink/db";
import { authStaff, scope, AccessFault, type StaffRequest } from "./staff-access.js";
import { getPatient } from "./patient-service.js";
import { PatientError } from "./patient-validation.js";
import { isoDayWindow, localDate } from "./appointments-service.js";

class ClinicalFault extends Error {
 constructor(public status:number,public code:string){super(code);}
}
function fail(status:number,code:string):never{throw new ClinicalFault(status,code);}
const wrap=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
 (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const cid=(req:StaffRequest)=>String(req.params.clinicId);
const pid=(req:StaffRequest)=>String(req.params.patientId);
const noStore=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
const clinician=(ctx:Awaited<ReturnType<typeof scope>>)=>
 ctx.role==="dentist" || (["owner","manager"].includes(ctx.role)&&ctx.membership.clinicianEnabled);
async function access(req:StaffRequest,clinicId:string,write=false){
 const ctx=await scope(req,clinicId);
 if(!clinician(ctx)&&ctx.role!=="assistant")fail(403,"CLINICAL_ROLE_REQUIRED");
 if(write){
  if(ctx.clinic.status==="suspended")fail(403,"CLINIC_SUSPENDED");
  const sub=await db.query.clinicSubscription.findFirst({
   where:eq(schema.clinicSubscription.clinicId,clinicId)});
  if(!sub||sub.status==="cancelled")fail(403,"SUBSCRIPTION_REQUIRED");
  const plan=await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,sub.planVersionId)});
  if(!plan)fail(403,"SUBSCRIPTION_REQUIRED");
  const expiry=sub.status==="trialing"?sub.trialEndsAt:sub.currentPeriodEndsAt;
  if(expiry&&expiry.getTime()+(sub.status==="trialing"?0:plan.graceDays*86400000)<Date.now())
   fail(403,"SUBSCRIPTION_EXPIRED");
 }
 return ctx;
}
const canView=(ctx:Awaited<ReturnType<typeof scope>>,actor:string,e:any)=>
 ctx.role==="assistant"?(e.created_by===actor&&e.status==="draft"):
 e.provider_membership_id===ctx.membership.id;
const canSign=(ctx:Awaited<ReturnType<typeof scope>>,e:any)=>
 clinician(ctx)&&e.provider_membership_id===ctx.membership.id;
async function audit(actor:string,clinicId:string,action:string,id:string){
 await db.insert(schema.auditEvent).values({id:randomUUID(),actorId:actor,
  clinicId,action,subjectType:"clinical",subjectId:id,outcome:"success"});
}
const string=(v:unknown,max:number,required=false)=>{
 if(v===null||v===undefined||v===""){if(required)fail(422,"REQUIRED_FIELD");return "";}
 if(typeof v!=="string"||v.trim().length>max)fail(422,"INVALID_CLINICAL_FIELD");
 const normalized=v.trim();
 if(required&&!normalized)fail(422,"REQUIRED_FIELD");
 return normalized;
};
function noteInput(raw:any,signed=false){
 if(!raw||typeof raw!=="object")fail(422,"INVALID_NOTE");
 const reason=string(raw.reason,2000,signed);
 const findings=string(raw.findings,5000,signed);
 const assessment=string(raw.assessment,5000,signed);
 const historySource=string(raw.historySource,200);
 const historyDate=string(raw.historyDate,10);
 if(historyDate&&!/^\d{4}-\d{2}-\d{2}$/.test(historyDate))fail(422,"INVALID_HISTORY_DATE");
 if(historyDate&&!Number.isFinite(Date.parse(historyDate+"T00:00:00Z")))fail(422,"INVALID_HISTORY_DATE");
 const followUp=string(raw.followUp,3000);
 const procedures=raw.performedProcedures??[];
 if(!Array.isArray(procedures)||procedures.length>20)fail(422,"INVALID_PROCEDURES");
 const performedProcedures=procedures.map((p:any)=>{
  if(!p||typeof p!=="object")fail(422,"INVALID_PROCEDURES");
  const description=string(p.description,600,true);
  const serviceId=string(p.serviceId,100)||null;
  const toothIds=p.toothIds??[];
  if(!Array.isArray(toothIds)||toothIds.length>32||
    toothIds.some((s:any)=>typeof s!=="string"||!/^[1-8][1-8]$/.test(s)))
   fail(422,"INVALID_TOOTH_IDS");
  return {description,serviceId,toothIds:[...new Set(toothIds)]};
 });
 return {reason,findings,assessment,historySource:historySource||null,
  historyDate:historyDate||null,followUp:followUp||null,performedProcedures};
}
const noteFrom=(e:any)=>({
 reason:e.reason,findings:e.findings,assessment:e.assessment,
 historySource:e.history_source,historyDate:e.history_date,
 followUp:e.follow_up,performedProcedures:e.performed_procedures
});
const noteDb=(n:ReturnType<typeof noteInput>)=>JSON.stringify(n);
const revision=(v:unknown)=>{
 const n=Number(v);if(!Number.isInteger(n)||n<1)fail(422,"REVISION_REQUIRED");return n;
};
async function encounter(clinicId:string,patientId:string,id:string,ctx:Awaited<ReturnType<typeof scope>>,actor:string){
 const rows=await sqlClient`SELECT * FROM clinic_encounters
  WHERE clinic_id=${clinicId} AND patient_id=${patientId} AND id=${id} LIMIT 1`;
 const e=rows[0];
 if(!e||!canView(ctx,actor,e))fail(404,"ENCOUNTER_NOT_FOUND");
 return e;
}
async function findFile(req:StaffRequest,ctx:Awaited<ReturnType<typeof scope>>,fileId:string){
 const rows=await sqlClient`SELECT f.id,f.title,f.kind,f.file_name,f.mime,f.size_bytes,f.notes,
 f.encounter_id,f.uploaded_by,f.created_at,f.scan_status,e.provider_membership_id,
 e.created_by AS encounter_creator,e.status AS encounter_status
 FROM clinic_clinical_files f LEFT JOIN clinic_encounters e ON e.id=f.encounter_id
 AND e.clinic_id=f.clinic_id AND e.patient_id=f.patient_id
 WHERE f.clinic_id=${cid(req)} AND f.patient_id=${pid(req)} AND f.id=${fileId} LIMIT 1`;
 const f=rows[0];
 if(!f)fail(404,"FILE_NOT_FOUND");
 const allowed=ctx.role==="assistant"?
  (f.encounter_creator===req.actor!.id&&f.encounter_status==="draft"):
  f.encounter_id?f.provider_membership_id===ctx.membership.id:f.uploaded_by===req.actor!.id;
 if(!allowed)fail(404,"FILE_NOT_FOUND");
 return f;
}

export function clinicalRouter(){
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
 const clinics=Router({mergeParams:true});
 api.use("/clinics/:clinicId",clinics);
 clinics.get("/worklist",wrap(async(req,res)=>{
  const ctx=await access(req,cid(req));
  const date=typeof req.query.date==="string"?req.query.date:localDate(new Date());
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+"T00:00:00Z")))
   fail(422,"INVALID_DATE");
  const window=isoDayWindow(date);
  const schedule=await sqlClient`SELECT a.id AS appointment_id,a.patient_id,a.provider_membership_id,
   a.status,a.start_at,a.end_at,a.service_name,p.patient_number,p.preferred_name,p.family_name,
   CASE WHEN ${ctx.role==="assistant"} AND e.created_by<>${req.actor!.id} THEN NULL ELSE e.id END AS encounter_id,e.status AS encounter_status
   FROM clinic_appointments a JOIN clinic_patients p ON p.id=a.patient_id AND p.clinic_id=a.clinic_id
   LEFT JOIN clinic_encounters e ON e.appointment_id=a.id AND e.clinic_id=a.clinic_id
   WHERE a.clinic_id=${cid(req)} AND a.start_at>=${window.from} AND a.start_at<${window.to}
   AND (${ctx.role==="assistant"} OR a.provider_membership_id=${ctx.membership.id})
   AND a.status NOT IN ('cancelled','no_show')
   ORDER BY a.start_at ASC LIMIT 100`;
  const pending=await sqlClient`SELECT e.id,e.patient_id,e.reason,e.updated_at,e.revision,
   p.patient_number,p.preferred_name,p.family_name
   FROM clinic_encounters e JOIN clinic_patients p ON p.id=e.patient_id AND p.clinic_id=e.clinic_id
   WHERE e.clinic_id=${cid(req)} AND e.status='draft'
   AND (${ctx.role==="assistant"} AND e.created_by=${req.actor!.id}
    OR ${ctx.role!=="assistant"} AND e.provider_membership_id=${ctx.membership.id})
   ORDER BY e.updated_at DESC LIMIT 60`;
  const cases=ctx.role==="assistant"?[]:await sqlClient`SELECT e.id,e.patient_id,e.reason,e.signed_at,
   p.patient_number,p.preferred_name,p.family_name
   FROM clinic_encounters e JOIN clinic_patients p ON p.id=e.patient_id AND p.clinic_id=e.clinic_id
   WHERE e.clinic_id=${cid(req)} AND e.provider_membership_id=${ctx.membership.id}
   AND e.status='signed' ORDER BY e.signed_at DESC LIMIT 60`;
  noStore(res);res.json({date,today:schedule,pending,cases,timezone:"Asia/Kabul",
   isAssistant:ctx.role==="assistant"});
 }));
 clinics.get("/patients/:patientId/encounters",wrap(async(req,res)=>{
  const ctx=await access(req,cid(req));const patient=await getPatient(cid(req),pid(req));
  const rows=await sqlClient`SELECT e.id,e.reason,e.status,e.revision,e.created_at,e.updated_at,
   e.signed_at,e.appointment_id,u.name AS author_name
   FROM clinic_encounters e JOIN auth_users u ON u.id=e.created_by
   WHERE e.clinic_id=${cid(req)} AND e.patient_id=${pid(req)}
   AND (${ctx.role==="assistant"} AND e.created_by=${req.actor!.id} AND e.status='draft'
     OR ${ctx.role!=="assistant"} AND e.provider_membership_id=${ctx.membership.id})
   ORDER BY e.created_at DESC LIMIT 100`;
  noStore(res);res.json({patient:{id:patient.id,patientNumber:patient.patientNumber,
   preferredName:patient.preferredName,familyName:patient.familyName},encounters:rows});
 }));
 clinics.post("/patients/:patientId/encounters",wrap(async(req,res)=>{
  const ctx=await access(req,cid(req),true);const patient=await getPatient(cid(req),pid(req));
  if(patient.status!=="active")fail(409,"PATIENT_INACTIVE");
  const note=noteInput(req.body);
  if(!note.reason)fail(422,"REQUIRED_COMPLAINT");
  const appointmentId=string(req.body?.appointmentId,100)||null;
  let providerId=ctx.membership.id;
  if(appointmentId){
   const rows=await sqlClient`SELECT id,provider_membership_id,status FROM clinic_appointments
    WHERE id=${appointmentId} AND clinic_id=${cid(req)} AND patient_id=${pid(req)} LIMIT 1`;
   const a=rows[0];
   if(!a)fail(404,"APPOINTMENT_NOT_FOUND");
   if(!["arrived","in_treatment","completed"].includes(a.status))fail(409,"APPOINTMENT_NOT_READY");
   if(clinician(ctx)&&a.provider_membership_id!==ctx.membership.id)
    fail(403,"NOT_ASSIGNED_PROVIDER");
   providerId=a.provider_membership_id;
  }else if(!clinician(ctx))fail(403,"ASSISTANT_REQUIRES_APPOINTMENT");
  const id=randomUUID();
  try{
   await sqlClient.begin(async tx=>{
    await tx`INSERT INTO clinic_encounters(id,clinic_id,patient_id,appointment_id,
     provider_membership_id,created_by,reason,findings,assessment,history_source,history_date,
     performed_procedures,follow_up)
     VALUES (${id},${cid(req)},${pid(req)},${appointmentId},${providerId},
      ${req.actor!.id},${note.reason},${note.findings},${note.assessment},
      ${note.historySource},${note.historyDate},${JSON.stringify(note.performedProcedures)}::jsonb,${note.followUp})`;
    await tx`INSERT INTO clinic_encounter_versions(id,clinic_id,encounter_id,revision,action,note,actor_id)
     VALUES(${randomUUID()},${cid(req)},${id},1,'created',${noteDb(note)}::jsonb,${req.actor!.id})`;
   });
  }catch(e:any){if(e.code==="23505")fail(409,"APPOINTMENT_ALREADY_HAS_ENCOUNTER");throw e;}
  await audit(req.actor!.id,cid(req),"clinical.encounter.created",id);
  noStore(res);res.status(201).json({id,revision:1});
 }));
 clinics.get("/patients/:patientId/encounters/:encounterId",wrap(async(req,res)=>{
  const ctx=await access(req,cid(req));const p=await getPatient(cid(req),pid(req));
  const e=await encounter(cid(req),pid(req),String(req.params.encounterId),ctx,req.actor!.id);
  const versions=await sqlClient`SELECT v.id,v.revision,v.action,v.note,v.correction_reason,
   v.created_at,u.name AS author_name FROM clinic_encounter_versions v
   JOIN auth_users u ON u.id=v.actor_id WHERE v.clinic_id=${cid(req)}
   AND v.encounter_id=${e.id} ORDER BY v.revision DESC LIMIT 100`;
  const intake=await sqlClient`SELECT allergies_status,allergies_notes,medications_status,
   medications_notes,conditions_status,conditions_notes,source_kind,source_date,updated_at
   FROM clinic_patient_intakes WHERE clinic_id=${cid(req)} AND patient_id=${pid(req)} LIMIT 1`;
  await audit(req.actor!.id,cid(req),"clinical.encounter.viewed",e.id);
  noStore(res);res.json({patient:{id:p.id,patientNumber:p.patientNumber,
    preferredName:p.preferredName,familyName:p.familyName},encounter:{
    id:e.id,appointmentId:e.appointment_id,status:e.status,revision:e.revision,
    providerMembershipId:e.provider_membership_id,createdBy:e.created_by,
    signedBy:e.signed_by,signedAt:e.signed_at,createdAt:e.created_at,updatedAt:e.updated_at,
    note:e.status==="draft"?noteFrom(e):versions[0]?.note||noteFrom(e)},
    versions,history:intake[0]||null,canEdit:e.status==="draft",
    canSign:e.status==="draft"&&canSign(ctx,e),
    canAmend:e.status==="signed"&&canSign(ctx,e)});
 }));
 clinics.patch("/patients/:patientId/encounters/:encounterId",wrap(async(req,res)=>{
  const ctx=await access(req,cid(req),true);
  const note=noteInput(req.body);if(!note.reason)fail(422,"REQUIRED_COMPLAINT");
  const rev=revision(req.body?.revision);
  const id=String(req.params.encounterId);let newRev=rev+1;
  await sqlClient.begin(async tx=>{
   const r=await tx`SELECT * FROM clinic_encounters WHERE id=${id} AND clinic_id=${cid(req)}
    AND patient_id=${pid(req)} FOR UPDATE`;
   const e=r[0];
   if(!e||!canView(ctx,req.actor!.id,e))fail(404,"ENCOUNTER_NOT_FOUND");
   if(e.status!=="draft")fail(409,"SIGNED_NOTE_IMMUTABLE");
   if(e.revision!==rev)fail(409,"STALE_ENCOUNTER_REVISION");
   await tx`UPDATE clinic_encounters SET reason=${note.reason},findings=${note.findings},
    assessment=${note.assessment},history_source=${note.historySource},
    history_date=${note.historyDate},performed_procedures=${JSON.stringify(note.performedProcedures)}::jsonb,
    follow_up=${note.followUp},revision=${newRev},updated_at=now() WHERE id=${id}`;
   await tx`INSERT INTO clinic_encounter_versions(id,clinic_id,encounter_id,revision,action,note,actor_id)
    VALUES(${randomUUID()},${cid(req)},${id},${newRev},'draft_saved',${noteDb(note)}::jsonb,${req.actor!.id})`;
  });
  await audit(req.actor!.id,cid(req),"clinical.encounter.draft_saved",id);
  noStore(res);res.json({revision:newRev});
 }));
 clinics.post("/patients/:patientId/encounters/:encounterId/sign",wrap(async(req,res)=>{
  const ctx=await access(req,cid(req),true);
  if(!clinician(ctx))fail(403,"ONLY_CLINICIAN_MAY_SIGN");
  if(req.body?.confirmation!=="SIGN")fail(422,"SIGN_CONFIRMATION_REQUIRED");
  const id=String(req.params.encounterId),rev=revision(req.body?.revision);
  await sqlClient.begin(async tx=>{
   const [e]=await tx`SELECT * FROM clinic_encounters WHERE id=${id} AND clinic_id=${cid(req)}
    AND patient_id=${pid(req)} FOR UPDATE`;
   if(!e||!canSign(ctx,e))fail(404,"ENCOUNTER_NOT_FOUND");
   if(e.status!=="draft")fail(409,"ALREADY_SIGNED");
   if(e.revision!==rev)fail(409,"STALE_ENCOUNTER_REVISION");
   const note=noteInput(noteFrom(e),true);
   await tx`UPDATE clinic_encounters SET status='signed',signed_by=${req.actor!.id},
    signed_at=now(),revision=${rev+1},updated_at=now() WHERE id=${id}`;
   await tx`INSERT INTO clinic_encounter_versions(id,clinic_id,encounter_id,revision,action,note,actor_id)
    VALUES(${randomUUID()},${cid(req)},${id},${rev+1},'signed',${noteDb(note)}::jsonb,${req.actor!.id})`;
  });
  await audit(req.actor!.id,cid(req),"clinical.encounter.signed",id);
  noStore(res);res.json({revision:rev+1,status:"signed"});
 }));
 clinics.post("/patients/:patientId/encounters/:encounterId/amend",wrap(async(req,res)=>{
  const ctx=await access(req,cid(req),true);
  if(!clinician(ctx))fail(403,"ONLY_CLINICIAN_MAY_AMEND");
  const note=noteInput(req.body,true),rev=revision(req.body?.revision);
  const reason=string(req.body?.correctionReason,500,true);
  if(reason.length<10)fail(422,"AMENDMENT_REASON_REQUIRED");
  const id=String(req.params.encounterId);
  await sqlClient.begin(async tx=>{
   const [e]=await tx`SELECT * FROM clinic_encounters WHERE id=${id} AND clinic_id=${cid(req)}
    AND patient_id=${pid(req)} FOR UPDATE`;
   if(!e||!canSign(ctx,e))fail(404,"ENCOUNTER_NOT_FOUND");
   if(e.status!=="signed")fail(409,"ENCOUNTER_NOT_SIGNED");
   if(e.revision!==rev)fail(409,"STALE_ENCOUNTER_REVISION");
   await tx`UPDATE clinic_encounters SET revision=${rev+1},updated_at=now() WHERE id=${id}`;
   await tx`INSERT INTO clinic_encounter_versions(id,clinic_id,encounter_id,revision,action,note,
    correction_reason,actor_id) VALUES(${randomUUID()},${cid(req)},${id},${rev+1},
    'amended',${noteDb(note)}::jsonb,${reason},${req.actor!.id})`;
  });
  await audit(req.actor!.id,cid(req),"clinical.encounter.amended",id);
  noStore(res);res.json({revision:rev+1,status:"signed"});
 }));
 clinics.get("/patients/:patientId/files",wrap(async(req,res)=>{
  const ctx=await access(req,cid(req));const p=await getPatient(cid(req),pid(req));
  const kind=req.query.kind?String(req.query.kind):"all";
  if(!["all","xray","photo","consent","other"].includes(kind))fail(422,"INVALID_FILE_KIND");
  const rows=await sqlClient`SELECT f.id,f.title,f.kind,f.file_name,f.mime,f.size_bytes,f.notes,
   f.encounter_id,f.scan_status,f.created_at,u.name AS uploaded_by_name
   FROM clinic_clinical_files f JOIN auth_users u ON u.id=f.uploaded_by
   LEFT JOIN clinic_encounters e ON e.id=f.encounter_id AND e.clinic_id=f.clinic_id
   WHERE f.clinic_id=${cid(req)} AND f.patient_id=${pid(req)}
   AND (${kind}='all' OR f.kind=${kind})
   AND (${ctx.role==="assistant"} AND e.created_by=${req.actor!.id} AND e.status='draft'
    OR ${ctx.role!=="assistant"} AND (
      e.provider_membership_id=${ctx.membership.id}
      OR (f.encounter_id IS NULL AND f.uploaded_by=${req.actor!.id})))
   ORDER BY f.created_at DESC LIMIT 100`;
  noStore(res);res.json({patient:{id:p.id,patientNumber:p.patientNumber,
   preferredName:p.preferredName,familyName:p.familyName},files:rows,kind});
 }));
 clinics.post("/patients/:patientId/files",wrap(async(req,res)=>{
  const ctx=await access(req,cid(req),true);
  const patient=await getPatient(cid(req),pid(req));
  if(patient.status!=="active")fail(409,"PATIENT_INACTIVE");
  const title=string(req.body?.title,150,true),fileName=string(req.body?.fileName,180,true)
   .replace(/[\\/\r\n"]/g,"_");
  const kind=string(req.body?.kind,20,true);
  const mime=string(req.body?.mime,60,true);
  const notes=string(req.body?.notes,500)||null;
  if(!["xray","photo","consent","other"].includes(kind))fail(422,"INVALID_FILE_KIND");
  if(!["image/jpeg","image/png","application/pdf"].includes(mime))fail(415,"FILE_TYPE_UNSUPPORTED");
  const base64=req.body?.contentBase64;
  if(typeof base64!=="string"||base64.length>2_796_208||
   !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))fail(422,"INVALID_FILE_BODY");
  const bytes=Buffer.from(base64,"base64");
  if(bytes.length<1||bytes.length>2097152)fail(413,"FILE_TOO_LARGE");
  const valid=mime==="image/png"?bytes.subarray(0,8).equals(Buffer.from("89504e470d0a1a0a","hex")):
   mime==="image/jpeg"?bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff:
   bytes.subarray(0,5).toString("ascii")==="%PDF-";
  if(!valid)fail(415,"FILE_SIGNATURE_MISMATCH");
  const link=string(req.body?.encounterId,100)||null;
  if(link){
   const e=await encounter(cid(req),pid(req),link,ctx,req.actor!.id);
   if(ctx.role==="assistant"&&e.status!=="draft")fail(403,"ASSISTANT_DRAFT_ONLY");
  }else if(!clinician(ctx))fail(403,"ASSISTANT_REQUIRES_ENCOUNTER");
  const id=randomUUID(),sha256=createHash("sha256").update(bytes).digest("hex");
  await sqlClient`INSERT INTO clinic_clinical_files(id,clinic_id,patient_id,encounter_id,title,
   kind,file_name,mime,size_bytes,sha256,bytes,notes,uploaded_by)
   VALUES(${id},${cid(req)},${pid(req)},${link},${title},${kind},${fileName},
   ${mime},${bytes.length},${sha256},${bytes},${notes},${req.actor!.id})`;
  await audit(req.actor!.id,cid(req),"clinical.file.uploaded",id);
  noStore(res);res.status(201).json({id,title,kind,mime,sizeBytes:bytes.length});
 }));
 clinics.get("/patients/:patientId/files/:fileId/content",wrap(async(req,res)=>{
  const ctx=await access(req,cid(req));
  const file=await findFile(req,ctx,String(req.params.fileId));
  if(file.scan_status==="quarantined")fail(423,"FILE_QUARANTINED");
  const [row]=await sqlClient`SELECT bytes FROM clinic_clinical_files
   WHERE id=${file.id} AND clinic_id=${cid(req)} AND patient_id=${pid(req)}`;
  if(!row)fail(404,"FILE_NOT_FOUND");
  await audit(req.actor!.id,cid(req),"clinical.file.downloaded",file.id);
  noStore(res);
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Content-Security-Policy","sandbox");
  res.setHeader("Content-Disposition",'attachment; filename="clinical-file"');
  res.type(file.mime);
  res.send(row.bytes);
 }));
 api.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof PatientError){res.status(error.statusCode).json({code:error.code});return;}
  if(error instanceof ClinicalFault||error instanceof AccessFault){
   res.status(error.status).json({code:error.code});return;
  }
  const dbCode=(error as any)?.code;
  if(dbCode==="23505"){res.status(409).json({code:"CLINICAL_CONFLICT"});return;}
  if(dbCode==="23514"){res.status(422).json({code:"CLINICAL_CONSTRAINT"});return;}
  console.error("PH07 clinical request failed",error instanceof Error?error.name:"unknown");
  res.status(500).json({code:"CLINICAL_UNAVAILABLE"});
 });
 return api;
}
