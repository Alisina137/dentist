import { randomUUID,createHash } from "node:crypto";
import { and,asc,eq,gte,lt,inArray } from "drizzle-orm";
import { db,schema } from "@dandanlink/db";
import { scope,type StaffRequest } from "./staff-access.js";
import { availabilityPreview } from "./operations-availability.js";
import { localToUtc,dateInput } from "./operations-validation.js";
export class AppointmentFault extends Error{
 constructor(public status:number,public code:string,public extra?:Record<string,unknown>){super(code);}
}
export function fail(status:number,code:string,extra?:Record<string,unknown>):never{
 throw new AppointmentFault(status,code,extra);
}
const statuses=["confirmed","arrived","in_treatment","completed","cancelled","no_show"];
export async function access(req:StaffRequest,cid:string,mode:"read"|"write"){
 const ctx=await scope(req,cid);
 if(!["owner","manager","receptionist","dentist"].includes(ctx.role))fail(403,"APPOINTMENT_FORBIDDEN");
 if(mode==="write"){
  if(ctx.clinic.status==="suspended")fail(403,"CLINIC_SUSPENDED");
  const sub=await db.query.clinicSubscription.findFirst({where:eq(schema.clinicSubscription.clinicId,cid)});
  if(!sub)fail(403,"SUBSCRIPTION_REQUIRED");
  const plan=await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,sub.planVersionId)});
  const end=sub.status==="trialing"?sub.trialEndsAt:sub.currentPeriodEndsAt;
  const grace=sub.status==="trialing"?0:(plan?.graceDays||0)*86400000;
  if(sub.status==="cancelled"||!plan||(end&&Date.now()>end.getTime()+grace))
   fail(403,"SUBSCRIPTION_INACTIVE");
 }
 return ctx;
}
export const cid=(req:StaffRequest)=>String(req.params.clinicId);
export async function load(cid:string,id:string){
 const a=await db.query.clinicAppointment.findFirst({where:and(
  eq(schema.clinicAppointment.clinicId,cid),eq(schema.clinicAppointment.id,id))});
 if(!a)fail(404,"APPOINTMENT_NOT_FOUND");return a;
}
async function clinicLock(tx:any,cid:string){
 await tx.select({id:schema.clinic.id}).from(schema.clinic)
  .where(eq(schema.clinic.id,cid)).for("update");
}
async function log(tx:any,cid:string,appointmentId:string,actorId:string,
 action:string,from:string|null,to:string|null,reason:string|null,
 previous?:{startAt:Date;endAt:Date},next?:{startAt:Date;endAt:Date}){
 await tx.insert(schema.clinicAppointmentEvent).values({
  id:randomUUID(),clinicId:cid,appointmentId,actorId,action,fromStatus:from,toStatus:to,
  reason,previousStartAt:previous?.startAt,previousEndAt:previous?.endAt,
  nextStartAt:next?.startAt,nextEndAt:next?.endAt
 });
 await tx.insert(schema.auditEvent).values({id:randomUUID(),actorId,clinicId:cid,
  action:"appointment."+action,subjectType:"appointment",subjectId:appointmentId,outcome:"success"});
 await tx.insert(schema.outboxEvent).values({id:randomUUID(),kind:"appointment."+action,
  state:"pending",safePayload:JSON.stringify({clinicId:cid,appointmentId})});
}
async function validate(cid:string,raw:any,role:string,membership:string,ignoreId?:string){
 if(!raw||typeof raw!=="object")fail(422,"INVALID_BODY");
 const patientId=String(raw.patientId||""),serviceId=String(raw.serviceId||""),
  providerId=String(raw.providerId||""),resourceId=raw.resourceId||null;
 if(!patientId||!serviceId||!providerId)fail(422,"PATIENT_SERVICE_DENTIST_REQUIRED");
 if(role==="dentist"&&membership!==providerId)fail(403,"DENTIST_OWN_ONLY");
 if(resourceId!==null&&typeof resourceId!=="string")fail(422,"INVALID_RESOURCE");
 const patient=await db.query.clinicPatient.findFirst({where:and(
  eq(schema.clinicPatient.clinicId,cid),eq(schema.clinicPatient.id,patientId))});
 if(!patient||patient.status!=="active")fail(422,"ACTIVE_PATIENT_REQUIRED");
 const service=await db.query.clinicService.findFirst({where:and(
  eq(schema.clinicService.clinicId,cid),eq(schema.clinicService.id,serviceId))});
 if(!service||!service.active)fail(422,"ACTIVE_SERVICE_REQUIRED");
 if(service.requiresChair&&!resourceId)fail(422,"CHAIR_REQUIRED");
 if(!service.requiresChair&&resourceId)fail(422,"CHAIR_NOT_APPLICABLE");
 if(!["staff","walk_in","phone"].includes(raw.source))fail(422,"INVALID_SOURCE");
 if(raw.adminNote!=null&&(typeof raw.adminNote!=="string"||raw.adminNote.length>1000))
  fail(422,"INVALID_ADMIN_NOTE");
 const date=dateInput(raw.date);
 if(typeof raw.start!=="string"||!/^([01]\d|2[0-3]):(00|15|30|45)$/.test(raw.start))
  fail(422,"INVALID_TIME");
 const minute=Number(raw.start.slice(0,2))*60+Number(raw.start.slice(3));
 const duration=service.durationMinutes+service.preparationMinutes;
 if(minute+duration>1440)fail(422,"OUTSIDE_DAY");
 const endDay=minute+duration===1440?
  new Date(Date.parse(date+"T00:00:00Z")+86400000).toISOString().slice(0,10):date;
 const startAt=new Date(localToUtc(date,minute));
 const endAt=new Date(localToUtc(endDay,(minute+duration)%1440));
 if(startAt.getTime()<Date.now()-60000)fail(422,"SLOT_IN_PAST");
 let preview:any;
 try{preview=await availabilityPreview(cid,{date,serviceId,providerId,
  resourceId:resourceId||undefined,ignoreAppointmentId:ignoreId});}
 catch(err:any){if(typeof err?.status==="number")fail(err.status,err.code);throw err;}
 if(!preview.slots.some((s:any)=>s.start===raw.start&&(s.resourceId||null)===(resourceId||null)))
  fail(409,"SLOT_NOT_AVAILABLE");
 return {patient,service,providerId,resourceId,source:raw.source as string,
  adminNote:raw.adminNote?.trim()||null,startAt,endAt};
}
export async function create(req:StaffRequest,clinic:string,body:any){
 const ctx=await access(req,clinic,"write");
 if(typeof body?.idempotencyKey!=="string"||
   !/^[-A-Za-z0-9_]{12,100}$/.test(body.idempotencyKey))
  fail(422,"INVALID_IDEMPOTENCY_KEY");
 const hash=createHash("sha256").update(JSON.stringify({
  patientId:body.patientId,serviceId:body.serviceId,providerId:body.providerId,
  resourceId:body.resourceId||null,date:body.date,start:body.start,
  source:body.source,adminNote:body.adminNote||null
 })).digest("hex");
 return db.transaction(async tx=>{
  await clinicLock(tx,clinic);
  const prior=await tx.query.clinicAppointmentIdempotency.findFirst({where:and(
   eq(schema.clinicAppointmentIdempotency.clinicId,clinic),
   eq(schema.clinicAppointmentIdempotency.actorId,req.actor!.id),
   eq(schema.clinicAppointmentIdempotency.requestKey,body.idempotencyKey)
  )});
  if(prior){
   if(prior.requestDigest!==hash)fail(409,"IDEMPOTENCY_KEY_REUSED");
   const replay=await tx.query.clinicAppointment.findFirst({where:eq(
    schema.clinicAppointment.id,prior.appointmentId)});
   if(!replay)fail(409,"IDEMPOTENT_RECORD_MISSING");
   return {appointment:replay,replayed:true};
  }
  const p=await validate(clinic,body,ctx.role,ctx.membership.id);
  const id=randomUUID();
  const [a]=await tx.insert(schema.clinicAppointment).values({
   id,clinicId:clinic,patientId:p.patient.id,serviceId:p.service.id,
   serviceVersion:p.service.version,serviceName:p.service.name,
   priceSnapshotAfn:p.service.basePriceAfn,durationMinutes:p.service.durationMinutes,
   bufferMinutes:p.service.preparationMinutes,providerMembershipId:p.providerId,
   resourceId:p.resourceId,startAt:p.startAt,endAt:p.endAt,
   status:"confirmed",source:p.source,adminNote:p.adminNote,
   createdBy:req.actor!.id,updatedBy:req.actor!.id
  }).returning();
  await tx.insert(schema.clinicAppointmentIdempotency).values({
   clinicId:clinic,actorId:req.actor!.id,requestKey:body.idempotencyKey,
   requestDigest:hash,appointmentId:id
  });
  await log(tx,clinic,id,req.actor!.id,"created",null,"confirmed",null,undefined,
    {startAt:a.startAt,endAt:a.endAt});
  return {appointment:a,replayed:false};
 });
}
export async function reschedule(req:StaffRequest,clinic:string,id:string,body:any){
 const ctx=await access(req,clinic,"write");
 if(!Number.isInteger(body?.revision)||body.revision<1)fail(422,"INVALID_REVISION");
 return db.transaction(async tx=>{
  await clinicLock(tx,clinic);
  const [old]=await tx.select().from(schema.clinicAppointment).where(and(
   eq(schema.clinicAppointment.id,id),eq(schema.clinicAppointment.clinicId,clinic))).for("update");
  if(!old)fail(404,"APPOINTMENT_NOT_FOUND");
  if(old.revision!==body.revision)fail(409,"STALE_APPOINTMENT_REVISION");
  if(old.status!=="confirmed")fail(409,"RESCHEDULE_NOT_ALLOWED");
  if(ctx.role==="dentist"&&ctx.membership.id!==old.providerMembershipId)
   fail(403,"DENTIST_OWN_ONLY");
  const v=await validate(clinic,{
   patientId:old.patientId,serviceId:body.serviceId||old.serviceId,
   providerId:body.providerId||old.providerMembershipId,
   resourceId:body.resourceId===undefined?old.resourceId:body.resourceId,
   date:body.date,start:body.start,source:old.source,adminNote:old.adminNote
  },ctx.role,ctx.membership.id,id);
  const [next]=await tx.update(schema.clinicAppointment).set({
   serviceId:v.service.id,serviceVersion:v.service.version,serviceName:v.service.name,
   priceSnapshotAfn:v.service.basePriceAfn,durationMinutes:v.service.durationMinutes,
   bufferMinutes:v.service.preparationMinutes,providerMembershipId:v.providerId,
   resourceId:v.resourceId,startAt:v.startAt,endAt:v.endAt,revision:old.revision+1,
   updatedBy:req.actor!.id,updatedAt:new Date()
  }).where(eq(schema.clinicAppointment.id,id)).returning();
  await log(tx,clinic,id,req.actor!.id,"rescheduled",old.status,next.status,null,
   {startAt:old.startAt,endAt:old.endAt},{startAt:next.startAt,endAt:next.endAt});
  return next;
 });
}
const transitions:Record<string,string[]>={
 confirmed:["arrived","cancelled","no_show"],arrived:["in_treatment","cancelled"],
 in_treatment:["completed"],completed:[],cancelled:[],no_show:[]
};
export async function transition(req:StaffRequest,clinic:string,id:string,body:any){
 const ctx=await access(req,clinic,"write");
 if(!Number.isInteger(body?.revision)||body.revision<1)fail(422,"INVALID_REVISION");
 if(!statuses.includes(body?.status))fail(422,"INVALID_STATUS");
 const status=String(body.status),reason=body.reason==null?null:String(body.reason).trim();
 if(["cancelled","no_show"].includes(status)&&(reason?.length||0)<10)
  fail(422,"STATUS_REASON_REQUIRED");
 if(reason&&reason.length>400)fail(422,"INVALID_STATUS_REASON");
 return db.transaction(async tx=>{
  await clinicLock(tx,clinic);
  const [old]=await tx.select().from(schema.clinicAppointment).where(and(
   eq(schema.clinicAppointment.id,id),eq(schema.clinicAppointment.clinicId,clinic))).for("update");
  if(!old)fail(404,"APPOINTMENT_NOT_FOUND");
  if(old.revision!==body.revision)fail(409,"STALE_APPOINTMENT_REVISION");
  if(!transitions[old.status]?.includes(status))fail(409,"INVALID_STATUS_TRANSITION");
  if(ctx.role==="dentist"&&ctx.membership.id!==old.providerMembershipId)
   fail(403,"DENTIST_OWN_ONLY");
  if(["in_treatment","completed"].includes(status)&&
   !(ctx.role==="dentist"||ctx.membership.clinicianEnabled&&
    ["owner","manager"].includes(ctx.role)))fail(403,"CLINICIAN_REQUIRED");
  if(ctx.role==="dentist"&&["arrived","cancelled","no_show"].includes(status))
   fail(403,"FRONT_DESK_ONLY");
  const now=new Date();
  if(status==="no_show"&&old.startAt.getTime()>now.getTime()+10*60000)
   fail(409,"NO_SHOW_TOO_EARLY");
  const [fresh]=await tx.update(schema.clinicAppointment).set({
   status,revision:old.revision+1,updatedBy:req.actor!.id,updatedAt:now,
   ...(status==="arrived"?{checkedInAt:now}:{}),
   ...(status==="in_treatment"?{treatmentStartedAt:now}:{}),
   ...(status==="completed"?{completedAt:now}:{}),
   ...(status==="cancelled"?{cancelledAt:now,cancellationReason:reason}:{}),
   ...(status==="no_show"?{noShowAt:now}:{})
  }).where(eq(schema.clinicAppointment.id,id)).returning();
  await log(tx,clinic,id,req.actor!.id,status,old.status,status,reason);
  return fresh;
 });
}
export async function list(req:StaffRequest,clinic:string,q:{
 from:unknown;to:unknown;providerId?:unknown;resourceId?:unknown;status?:unknown}){
 const ctx=await access(req,clinic,"read");
 const from=dateInput(q.from),to=dateInput(q.to);
 const span=(Date.parse(to+"T00:00:00Z")-Date.parse(from+"T00:00:00Z"))/86400000;
 if(span<0||span>45)fail(422,"INVALID_DATE_RANGE");
 if(q.providerId!==undefined&&typeof q.providerId!=="string")fail(422,"INVALID_PROVIDER_FILTER");
 if(q.resourceId!==undefined&&typeof q.resourceId!=="string")fail(422,"INVALID_RESOURCE_FILTER");
 if(q.status!==undefined&&q.status!=="all"&&!statuses.includes(String(q.status)))fail(422,"INVALID_STATUS_FILTER");
 const next=new Date(Date.parse(to+"T00:00:00Z")+86400000).toISOString().slice(0,10);
 const conditions=[eq(schema.clinicAppointment.clinicId,clinic),
  gte(schema.clinicAppointment.startAt,new Date(localToUtc(from,0))),
  lt(schema.clinicAppointment.startAt,new Date(localToUtc(next,0)))];
 if(ctx.role==="dentist")conditions.push(eq(schema.clinicAppointment.providerMembershipId,ctx.membership.id));
 else if(q.providerId)conditions.push(eq(schema.clinicAppointment.providerMembershipId,q.providerId));
 if(q.resourceId)conditions.push(eq(schema.clinicAppointment.resourceId,q.resourceId));
 if(q.status&&q.status!=="all")conditions.push(eq(schema.clinicAppointment.status,String(q.status)));
 const records=await db.select().from(schema.clinicAppointment).where(and(...conditions))
  .orderBy(asc(schema.clinicAppointment.startAt)).limit(1500);
 const patients=records.length?await db.select({
  id:schema.clinicPatient.id,patientNumber:schema.clinicPatient.patientNumber,
  preferredName:schema.clinicPatient.preferredName,familyName:schema.clinicPatient.familyName
 }).from(schema.clinicPatient).where(and(eq(schema.clinicPatient.clinicId,clinic),
  inArray(schema.clinicPatient.id,[...new Set(records.map(x=>x.patientId))]))):[];
 const lookup=new Map(patients.map(p=>[p.id,p]));
 return {appointments:records.map(a=>({...a,patient:lookup.get(a.patientId)||null})),
  timezone:"Asia/Kabul",limit:1500};
}
export async function detail(req:StaffRequest,clinic:string,id:string){
 const ctx=await access(req,clinic,"read"),a=await load(clinic,id);
 if(ctx.role==="dentist"&&ctx.membership.id!==a.providerMembershipId)fail(403,"DENTIST_OWN_ONLY");
 const p=await db.query.clinicPatient.findFirst({where:and(
  eq(schema.clinicPatient.clinicId,clinic),eq(schema.clinicPatient.id,a.patientId))});
 const events=await db.select().from(schema.clinicAppointmentEvent).where(and(
  eq(schema.clinicAppointmentEvent.clinicId,clinic),
  eq(schema.clinicAppointmentEvent.appointmentId,id)))
  .orderBy(asc(schema.clinicAppointmentEvent.createdAt));
 return {appointment:a,patient:p?{id:p.id,preferredName:p.preferredName,
  familyName:p.familyName,patientNumber:p.patientNumber,phone:p.phone}:null,events};
}
