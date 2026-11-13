import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, gte, inArray, lt, lte, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@dandanlink/db";
import { scope, type StaffRequest } from "./staff-access.js";
import { dateInput, fail, localToUtc, type Span } from "./operations-validation.js";
import { availabilityPreview } from "./operations-availability.js";
import { lockClinic } from "./operations-catalog.js";

export type Appointment=typeof schema.clinicAppointment.$inferSelect;
type ActorContext=Awaited<ReturnType<typeof scope>>;
export type AppointmentMode="read"|"schedule"|"arrival"|"clinical";
export const blocksResource=["confirmed","arrived","in_treatment","completed"];
const terminal=["completed","cancelled","no_show"];
const statuses=["confirmed","arrived","in_treatment","completed","cancelled","no_show"];
function trimmed(v:unknown,min:number,max:number,key:string):string{
 if(typeof v!=="string"||v.trim().length<min||v.trim().length>max)fail(422,"INVALID_"+key);
 return v.trim();
}
function uuidLike(v:unknown,key:string):string{
 const id=trimmed(v,32,100,key);
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(id))fail(422,"INVALID_"+key);
 return id;
}
export const digest=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
export async function appointmentAccess(req:StaffRequest,cid:string,mode:AppointmentMode){
 const ctx=await scope(req,cid);
 const role=ctx.role;
 const permitted=mode==="read"?["owner","manager","dentist","receptionist","assistant"].includes(role):
 mode==="schedule"?["owner","manager","receptionist","dentist"].includes(role):
 mode==="arrival"?["owner","manager","receptionist"].includes(role):
 role==="dentist"||(["owner","manager"].includes(role)&&ctx.membership.clinicianEnabled);
 if(!permitted)fail(403,"APPOINTMENT_ROLE_DENIED");
 if(mode!=="read"){
  if(ctx.clinic.status==="suspended")fail(403,"CLINIC_SUSPENDED");
  const sub=await db.query.clinicSubscription.findFirst({where:eq(schema.clinicSubscription.clinicId,cid)});
  if(!sub&&ctx.clinic.status!=="draft")fail(403,"SUBSCRIPTION_REQUIRED");
  if(sub){
   if(sub.status==="cancelled")fail(403,"SUBSCRIPTION_INACTIVE");
   const plan=await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,sub.planVersionId)});
   if(!plan)fail(403,"SUBSCRIPTION_PLAN_UNAVAILABLE");
   const expiry=sub.status==="trialing"?sub.trialEndsAt:sub.currentPeriodEndsAt;
   const grace=sub.status==="trialing"?0:plan.graceDays*86400000;
   if(expiry&&expiry.getTime()+grace<Date.now())fail(403,"SUBSCRIPTION_EXPIRED");
  }
 }
 return ctx;
}
export function mayReadAppointment(ctx:ActorContext,a:Appointment){
 return ctx.role!=="dentist"||a.providerMembershipId===ctx.membership.id;
}
export function mayScheduleProvider(ctx:ActorContext,provider:string){
 return ctx.role!=="dentist"||provider===ctx.membership.id;
}
export function mayChangeClinically(ctx:ActorContext,a:Appointment){
 return ctx.role==="dentist"?a.providerMembershipId===ctx.membership.id:
  ["owner","manager"].includes(ctx.role)&&ctx.membership.clinicianEnabled;
}
function allowedAction(ctx:ActorContext,a:Appointment,target:string){
 if(!statuses.includes(target))fail(422,"INVALID_APPOINTMENT_STATUS");
 if(target==="arrived"||target==="no_show"||target==="cancelled"){
  if(!["owner","manager","receptionist"].includes(ctx.role))fail(403,"APPOINTMENT_ACTION_DENIED");
 }else if(target==="in_treatment"||target==="completed"){
  if(!mayChangeClinically(ctx,a))fail(403,"APPOINTMENT_CLINICIAN_REQUIRED");
 }else fail(422,"INVALID_APPOINTMENT_TRANSITION");
 if(target==="no_show"&&a.startAt>new Date())fail(409,"NO_SHOW_BEFORE_START");
 if(target==="arrived"&&localDate(a.startAt)!==localDate(new Date()))
  fail(409,"CHECK_IN_ONLY_ON_APPOINTMENT_DAY");
 const allowed:Record<string,string[]>={
  confirmed:["arrived","no_show","cancelled"],
  arrived:["in_treatment","cancelled"],
  in_treatment:["completed"],
  completed:[],cancelled:[],no_show:[]
 };
 if(!allowed[a.status]?.includes(target))fail(409,"INVALID_APPOINTMENT_TRANSITION");
}
export function localDate(date:Date){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
 const p=Object.fromEntries(parts.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join("-");
}
export function shiftDay(date:string,days:number):string{
 return new Date(Date.parse(date+"T00:00:00Z")+days*86400000).toISOString().slice(0,10);
}
export function isoDayWindow(day:string){
 const date=dateInput(day);
 return {from:new Date(localToUtc(date,0)),to:new Date(localToUtc(shiftDay(date,1),0))};
}
export function parseStart(raw:unknown){
 const str=trimmed(raw,5,5,"START_TIME");
 if(!/^([01]\d|2[0-3]):(00|15|30|45)$/.test(str))fail(422,"INVALID_SLOT_INTERVAL");
 return str;
}
export function appointmentInput(raw:any){
 if(!raw||typeof raw!=="object")fail(422,"INVALID_APPOINTMENT");
 const patientId=trimmed(raw.patientId,8,100,"PATIENT"),
  serviceId=trimmed(raw.serviceId,8,100,"SERVICE"),
  providerId=trimmed(raw.providerId,8,100,"PROVIDER"),
  chairId=raw.resourceId===null||raw.resourceId===""||raw.resourceId===undefined?
   null:trimmed(raw.resourceId,8,100,"CHAIR"),
  date=dateInput(raw.date),start=parseStart(raw.start),
  source=raw.source;
 if(!["staff","walk_in","phone"].includes(source))fail(422,"INVALID_BOOKING_SOURCE");
 const note=raw.administrativeNote===null||raw.administrativeNote===undefined||raw.administrativeNote===""?
  null:trimmed(raw.administrativeNote,1,500,"ADMIN_NOTE");
 return {patientId,serviceId,providerId,resourceId:chairId,date,start,source,administrativeNote:note};
}
export function changeInput(raw:any){
 if(!raw||typeof raw!=="object")fail(422,"INVALID_RESCHEDULE");
 return {date:dateInput(raw.date),start:parseStart(raw.start),
  providerId:trimmed(raw.providerId,8,100,"PROVIDER"),
  resourceId:raw.resourceId===null||raw.resourceId===undefined||raw.resourceId===""?
   null:trimmed(raw.resourceId,8,100,"CHAIR"),
  reason:trimmed(raw.reason,10,300,"RESCHEDULE_REASON")};
}
export async function requirePatient(cid:string,id:string){
 const row=await db.query.clinicPatient.findFirst({where:and(
  eq(schema.clinicPatient.id,id),eq(schema.clinicPatient.clinicId,cid))});
 if(!row||row.status!=="active")fail(422,"ACTIVE_CLINIC_PATIENT_REQUIRED");
 return row;
}
export async function byId(cid:string,id:string){
 const row=await db.query.clinicAppointment.findFirst({where:and(
  eq(schema.clinicAppointment.clinicId,cid),eq(schema.clinicAppointment.id,id))});
 if(!row)fail(404,"APPOINTMENT_NOT_FOUND");
 return row;
}
async function actionReplay(tx:any,cid:string,actorId:string,key:string,operation:string,input:unknown){
 const requestDigest=digest({operation,input});
 const found=await tx.query.clinicAppointmentAction.findFirst({where:and(
  eq(schema.clinicAppointmentAction.clinicId,cid),eq(schema.clinicAppointmentAction.actorId,actorId),
  eq(schema.clinicAppointmentAction.actionKey,key)
 )});
 if(found&&(found.operation!==operation||found.requestDigest!==requestDigest))
  fail(409,"IDEMPOTENCY_KEY_REUSED");
 return {found,requestDigest};
}
async function markAction(tx:any,cid:string,actorId:string,key:string,operation:string,
 requestDigest:string,id:string){
 await tx.insert(schema.clinicAppointmentAction).values({
  id:randomUUID(),clinicId:cid,actorId,actionKey:key,operation,requestDigest,appointmentId:id
 });
}
async function event(tx:any,cid:string,actorId:string,a:Appointment,action:string,
 before:Appointment|null,reason:string|null){
 await tx.insert(schema.clinicAppointmentEvent).values({
  id:randomUUID(),clinicId:cid,appointmentId:a.id,action,
  beforeStatus:before?.status??null,afterStatus:a.status,
  beforeStartAt:before?.startAt??null,beforeEndAt:before?.endAt??null,
  afterStartAt:a.startAt,afterEndAt:a.endAt,reason,actorId
 });
 await tx.insert(schema.auditEvent).values({id:randomUUID(),clinicId:cid,actorId,
  action:"appointment."+action,subjectType:"appointment",subjectId:a.id,outcome:"success"});
 await tx.insert(schema.outboxEvent).values({id:randomUUID(),kind:"appointment."+action,
  state:"pending",safePayload:JSON.stringify({clinicId:cid,appointmentId:a.id})});
}
async function nextAlternatives(cid:string,input:{date:string;serviceId:string;providerId:string;resourceId:string|null},
 after:string,excludeId?:string):Promise<{date:string;start:string;resourceId:string|null}[]>{
 const found:{date:string;start:string;resourceId:string|null}[]=[];
 for(let n=0;n<10&&found.length<3;n++){
  const date=shiftDay(input.date,n);
  try{
   const view=await availabilityPreview(cid,{date,serviceId:input.serviceId,
    providerId:input.providerId,resourceId:input.resourceId??undefined,excludeAppointmentId:excludeId});
   for(const x of view.slots){
    if(n===0&&x.start<=after)continue;
    found.push({date,start:x.start,resourceId:x.resourceId});
    if(found.length===3)break;
   }
  }catch{/* No suggestions for a closed/non-operational day. */}
 }
 return found;
}
export async function createAppointment(ctx:ActorContext,cid:string,actorId:string,raw:any){
 const input=appointmentInput(raw);
 if(!mayScheduleProvider(ctx,input.providerId))fail(403,"PROVIDER_SCOPE_DENIED");
 const key=uuidLike(raw.idempotencyKey,"IDEMPOTENCY_KEY");
 // Validate patient before locking; every id is required to be inside this exact clinic.
 await requirePatient(cid,input.patientId);
 let created:Appointment|undefined;
 let reused=false;
 try{
  created=await db.transaction(async tx=>{
   await lockClinic(tx,cid);
   const replay=await actionReplay(tx,cid,actorId,key,"create",input);
   if(replay.found){reused=true;return (await tx.query.clinicAppointment.findFirst({
    where:and(eq(schema.clinicAppointment.id,replay.found.appointmentId),
     eq(schema.clinicAppointment.clinicId,cid))}))!;}
   const view=await availabilityPreview(cid,{date:input.date,serviceId:input.serviceId,
    providerId:input.providerId,resourceId:input.resourceId??undefined});
   const resourceChosen=view.slots.find(x=>x.start===input.start&&
    (!view.service.requiresChair||x.resourceId===input.resourceId));
   if(!resourceChosen||view.service.requiresChair&&!input.resourceId)
    fail(409,"APPOINTMENT_SLOT_UNAVAILABLE");
   const start=new Date(resourceChosen.startAt);
   if(start.getTime()<Date.now()-60000)fail(422,"PAST_APPOINTMENT_NOT_ALLOWED");
   const id=randomUUID();
   const [row]=await tx.insert(schema.clinicAppointment).values({
    id,clinicId:cid,patientId:input.patientId,serviceId:input.serviceId,
    providerMembershipId:input.providerId,resourceId:resourceChosen.resourceId,
    serviceVersion:view.service.version,serviceName:view.service.name,
    serviceCategory:view.service.category,servicePriceAfn:view.service.basePriceAfn,
    serviceDurationMinutes:view.service.durationMinutes,
    preparationMinutes:view.service.preparationMinutes,
    startAt:new Date(resourceChosen.startAt),endAt:new Date(resourceChosen.endAt),
    source:input.source,status:"confirmed",administrativeNote:input.administrativeNote,
    createdBy:actorId,updatedBy:actorId
   }).returning();
   await event(tx,cid,actorId,row,"created",null,null);
   await markAction(tx,cid,actorId,key,"create",replay.requestDigest,row.id);
   return row;
  });
 }catch(e:any){
  if(e?.message==="APPOINTMENT_SLOT_UNAVAILABLE"||e?.code==="23P01"||e?.cause?.code==="23P01"){
   const alternatives=await nextAlternatives(cid,input,input.start);
   return {conflict:true,alternatives};
  }
  throw e;
 }
 return {appointment:created,replayed:reused,conflict:false};
}
export async function rescheduleAppointment(ctx:ActorContext,cid:string,actorId:string,id:string,raw:any){
 const input=changeInput(raw),key=uuidLike(raw.idempotencyKey,"IDEMPOTENCY_KEY");
 if(!mayScheduleProvider(ctx,input.providerId))fail(403,"PROVIDER_SCOPE_DENIED");
 let reused=false;
 let updated:Appointment|undefined;
 try{
  updated=await db.transaction(async tx=>{
   await lockClinic(tx,cid);
   const replay=await actionReplay(tx,cid,actorId,key,"reschedule",{id,...input});
   if(replay.found){reused=true;return (await tx.query.clinicAppointment.findFirst({
    where:and(eq(schema.clinicAppointment.id,replay.found.appointmentId),
      eq(schema.clinicAppointment.clinicId,cid))}))!;}
   const [before]=await tx.select().from(schema.clinicAppointment).where(and(
    eq(schema.clinicAppointment.clinicId,cid),eq(schema.clinicAppointment.id,id))).for("update");
   if(!before)fail(404,"APPOINTMENT_NOT_FOUND");
   if(!mayReadAppointment(ctx,before))fail(404,"APPOINTMENT_NOT_FOUND");
   if(before.status!=="confirmed")fail(409,"ONLY_CONFIRMED_CAN_RESCHEDULE");
   if(!Number.isInteger(raw.revision)||raw.revision!==before.revision)
    fail(409,"STALE_APPOINTMENT_REVISION");
   // Snapshot survives service reprice; existing appointments retain exact duration and estimate.
   // Rescheduling retains the booked service duration and price snapshot even if the catalog changed.
   const view=await availabilityPreview(cid,{date:input.date,serviceId:before.serviceId,
    providerId:input.providerId,resourceId:input.resourceId??undefined,excludeAppointmentId:id,
    overrideDuration:before.serviceDurationMinutes,overridePreparation:before.preparationMinutes,
    allowInactiveService:true});
   const slot=view.slots.find(x=>x.start===input.start&&
    (!view.service.requiresChair||x.resourceId===input.resourceId));
   if(!slot||view.service.requiresChair&&!input.resourceId)fail(409,"APPOINTMENT_SLOT_UNAVAILABLE");
   if(Date.parse(slot.startAt)<Date.now()-60000)fail(422,"PAST_APPOINTMENT_NOT_ALLOWED");
   const [after]=await tx.update(schema.clinicAppointment).set({
    providerMembershipId:input.providerId,resourceId:slot.resourceId,
    startAt:new Date(slot.startAt),endAt:new Date(slot.endAt),revision:before.revision+1,
    updatedBy:actorId,updatedAt:new Date()
   }).where(and(eq(schema.clinicAppointment.clinicId,cid),eq(schema.clinicAppointment.id,id),
     eq(schema.clinicAppointment.revision,before.revision))).returning();
   if(!after)fail(409,"STALE_APPOINTMENT_REVISION");
   await event(tx,cid,actorId,after,"rescheduled",before,input.reason);
   await markAction(tx,cid,actorId,key,"reschedule",replay.requestDigest,id);
   return after;
  });
 }catch(e:any){
  if(e?.message==="APPOINTMENT_SLOT_UNAVAILABLE"||e?.code==="23P01"||e?.cause?.code==="23P01"){
   return {conflict:true,alternatives:await nextAlternatives(cid,{
    date:input.date,serviceId:(await byId(cid,id)).serviceId,providerId:input.providerId,
    resourceId:input.resourceId},input.start,id)};
  }
  throw e;
 }
 return {appointment:updated,replayed:reused,conflict:false};
}
export async function transitionAppointment(ctx:ActorContext,cid:string,actorId:string,id:string,raw:any){
 const status=trimmed(raw?.status,4,20,"STATUS");
 const key=uuidLike(raw?.idempotencyKey,"IDEMPOTENCY_KEY");
 if(!Number.isInteger(raw?.revision)||raw.revision<1)fail(422,"INVALID_REVISION");
 const reason=status==="cancelled"||status==="no_show"?
  trimmed(raw?.reason,10,300,"ACTION_REASON"):null;
 let reused=false;
 const updated=await db.transaction(async tx=>{
  await lockClinic(tx,cid);
  const replay=await actionReplay(tx,cid,actorId,key,"transition",{
    id,status,revision:raw.revision,reason
  });
  if(replay.found){reused=true;return (await tx.query.clinicAppointment.findFirst({where:and(
   eq(schema.clinicAppointment.id,replay.found.appointmentId),
   eq(schema.clinicAppointment.clinicId,cid))}))!;}
  const [before]=await tx.select().from(schema.clinicAppointment).where(and(
   eq(schema.clinicAppointment.clinicId,cid),eq(schema.clinicAppointment.id,id))).for("update");
  if(!before)fail(404,"APPOINTMENT_NOT_FOUND");
  if(!mayReadAppointment(ctx,before))fail(404,"APPOINTMENT_NOT_FOUND");
  if(before.revision!==raw.revision)fail(409,"STALE_APPOINTMENT_REVISION");
  allowedAction(ctx,before,status);
  const now=new Date(),change=status==="arrived"?{arrivedAt:now}:
   status==="in_treatment"?{startedAt:now}:status==="completed"?{completedAt:now}:
   status==="cancelled"?{cancelledAt:now}:{noShowAt:now};
  const [after]=await tx.update(schema.clinicAppointment).set({
   status,revision:before.revision+1,updatedBy:actorId,updatedAt:now,...change
  }).where(and(eq(schema.clinicAppointment.clinicId,cid),eq(schema.clinicAppointment.id,id),
   eq(schema.clinicAppointment.revision,before.revision))).returning();
  if(!after)fail(409,"STALE_APPOINTMENT_REVISION");
  await event(tx,cid,actorId,after,status,before,reason);
  await markAction(tx,cid,actorId,key,"transition",replay.requestDigest,id);
  return after;
 });
 return {appointment:updated,replayed:reused};
}
export async function enriched(rows:Appointment[],ctx:ActorContext){
 const patientIds=[...new Set(rows.map(a=>a.patientId))];
 const providerIds=[...new Set(rows.map(a=>a.providerMembershipId))];
 const resourceIds=[...new Set(rows.map(a=>a.resourceId).filter((x):x is string=>!!x))];
 const [patients,members,resources]=await Promise.all([
  patientIds.length?db.select({id:schema.clinicPatient.id,patientNumber:schema.clinicPatient.patientNumber,
   preferredName:schema.clinicPatient.preferredName,familyName:schema.clinicPatient.familyName,
   phone:schema.clinicPatient.phone}).from(schema.clinicPatient).where(and(
    eq(schema.clinicPatient.clinicId,ctx.clinic.id),inArray(schema.clinicPatient.id,patientIds))):[],
  providerIds.length?db.select({id:schema.clinicMembership.id,userId:schema.clinicMembership.userId})
   .from(schema.clinicMembership).where(and(eq(schema.clinicMembership.clinicId,ctx.clinic.id),
    inArray(schema.clinicMembership.id,providerIds))):[],
  resourceIds.length?db.select({id:schema.clinicResource.id,label:schema.clinicResource.label,
   code:schema.clinicResource.code}).from(schema.clinicResource).where(and(
    eq(schema.clinicResource.clinicId,ctx.clinic.id),inArray(schema.clinicResource.id,resourceIds))):[]
 ]);
 const userIds=[...new Set(members.map(x=>x.userId))];
 const accounts=userIds.length?await db.select({id:schema.user.id,name:schema.user.name})
  .from(schema.user).where(inArray(schema.user.id,userIds)):[];
 const p=new Map(patients.map(x=>[x.id,x]));
 const m=new Map(members.map(x=>[x.id,accounts.find(a=>a.id===x.userId)?.name||"Dentist"]));
 const r=new Map(resources.map(x=>[x.id,x]));
 return rows.filter(a=>mayReadAppointment(ctx,a)).map(a=>{
  const patient=p.get(a.patientId);
  const minimal=ctx.role==="assistant";
  return {...a,administrativeNote:minimal?null:a.administrativeNote,
   patient:patient?{id:patient.id,patientNumber:patient.patientNumber,
    preferredName:patient.preferredName,familyName:minimal?null:patient.familyName,
    phone:minimal?null:patient.phone}:null,
   providerName:m.get(a.providerMembershipId)||"Dentist",
   resourceName:a.resourceId?r.get(a.resourceId)?.label||null:null};
 });
}
export async function dayQueue(ctx:ActorContext,cid:string,day:string){
 const {from,to}=isoDayWindow(day);
 const rows=await db.select().from(schema.clinicAppointment).where(and(
  eq(schema.clinicAppointment.clinicId,cid),
  gte(schema.clinicAppointment.startAt,from),lt(schema.clinicAppointment.startAt,to),
  inArray(schema.clinicAppointment.status,["confirmed","arrived","in_treatment","completed","no_show"])
 )).orderBy(asc(schema.clinicAppointment.startAt));
 return enriched(rows,ctx);
}
export async function calendar(ctx:ActorContext,cid:string,raw:any){
 const from=dateInput(raw.from),to=dateInput(raw.to);
 const span=(Date.parse(to+"T00:00:00Z")-Date.parse(from+"T00:00:00Z"))/86400000;
 if(span<0||span>34)fail(422,"CALENDAR_RANGE_LIMIT");
 const bounds={from:new Date(localToUtc(from,0)),
  to:new Date(localToUtc(shiftDay(to,1),0))};
 const rows=await db.select().from(schema.clinicAppointment).where(and(
  eq(schema.clinicAppointment.clinicId,cid),
  gte(schema.clinicAppointment.startAt,bounds.from),
  lt(schema.clinicAppointment.startAt,bounds.to)
 )).orderBy(asc(schema.clinicAppointment.startAt)).limit(1500);
 const safe=await enriched(rows,ctx);
 const provider=typeof raw.providerId==="string"?raw.providerId:"";
 const resource=typeof raw.resourceId==="string"?raw.resourceId:"";
 const status=typeof raw.status==="string"?raw.status:"";
 if(status&&status!=="all"&&!statuses.includes(status))fail(422,"INVALID_STATUS_FILTER");
 const filtered=safe.filter(a=>(!provider||a.providerMembershipId===provider)&&
  (!resource||a.resourceId===resource)&&(!status||status==="all"||a.status===status));
 return {appointments:filtered,total:filtered.length,range:{from,to},timezone:"Asia/Kabul",
  truncated:rows.length===1500};
}
export async function timeline(cid:string,id:string){
 return db.select().from(schema.clinicAppointmentEvent).where(and(
  eq(schema.clinicAppointmentEvent.clinicId,cid),
  eq(schema.clinicAppointmentEvent.appointmentId,id)
 )).orderBy(asc(schema.clinicAppointmentEvent.createdAt),asc(schema.clinicAppointmentEvent.id));
}
