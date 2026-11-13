import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { db, schema } from "@dandanlink/db";
import { fail, weekInput, exceptionData, weekday, overlaps, availableIn, type Shift } from "./operations-validation.js";
import { lockClinic, opsAudit } from "./operations-catalog.js";


/** PH06 protects recorded future bookings against destructive schedule edits. */
function wallClock(value:Date){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"})
  .formatToParts(value);
 const p=Object.fromEntries(parts.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return {date:p.year+"-"+p.month+"-"+p.day,minute:Number(p.hour)*60+Number(p.minute)};
}
async function futureBookings(tx:any,cid:string,provider?:string,resource?:string){
 const conditions=[eq(schema.clinicAppointment.clinicId,cid),
  gt(schema.clinicAppointment.endAt,new Date()),
  inArray(schema.clinicAppointment.status,["confirmed","arrived","in_treatment"])];
 if(provider)conditions.push(eq(schema.clinicAppointment.providerMembershipId,provider));
 if(resource)conditions.push(eq(schema.clinicAppointment.resourceId,resource));
 return tx.select({startAt:schema.clinicAppointment.startAt,endAt:schema.clinicAppointment.endAt})
  .from(schema.clinicAppointment).where(and(...conditions));
}
function fitsShift(date:Date,end:Date,shift:Shift){
 if(!shift.isOpen)return false;
 const startTime=wallClock(date),endTime=wallClock(end);
 if(startTime.date!==endTime.date)return false;
 return availableIn({start:shift.startMinute,end:shift.endMinute},shift.breaks,
  {start:startTime.minute,end:endTime.minute});
}
export async function clinicians(cid:string){
 const memberships=await db.select().from(schema.clinicMembership).where(and(
  eq(schema.clinicMembership.clinicId,cid),eq(schema.clinicMembership.status,"active")
 ));
 const valid=memberships.filter(m=>m.role==="dentist"||m.clinicianEnabled);
 const result=[];
 for(const member of valid){
  const account=await db.query.user.findFirst({
   where:eq(schema.user.id,member.userId),columns:{name:true}
  });
  result.push({membershipId:member.id,name:account?.name||"Clinician",role:member.role});
 }
 return result;
}
export async function schedules(cid:string){
 const [hours,providers,resources,exceptions,doctors]=await Promise.all([
  db.select().from(schema.clinicWeeklyHour).where(eq(schema.clinicWeeklyHour.clinicId,cid))
   .orderBy(asc(schema.clinicWeeklyHour.weekday)),
  db.select().from(schema.clinicProviderHour).where(eq(schema.clinicProviderHour.clinicId,cid))
   .orderBy(asc(schema.clinicProviderHour.weekday)),
  db.select().from(schema.clinicResourceHour).where(eq(schema.clinicResourceHour.clinicId,cid))
   .orderBy(asc(schema.clinicResourceHour.weekday)),
  db.select().from(schema.clinicScheduleException).where(eq(schema.clinicScheduleException.clinicId,cid))
   .orderBy(asc(schema.clinicScheduleException.startDate)),
  clinicians(cid)
 ]);
 return {hours,providers,resources,exceptions,clinicians:doctors,timezone:"Asia/Kabul"};
}
export async function eligibleDoctor(cid:string,membershipId:string){
 const staff=await db.query.clinicMembership.findFirst({where:and(
  eq(schema.clinicMembership.id,membershipId),eq(schema.clinicMembership.clinicId,cid)
 )});
 if(!staff||staff.status!=="active"||!(staff.role==="dentist"||staff.clinicianEnabled))
  fail(422,"INVALID_DENTIST");
 return staff;
}
export async function eligibleResource(cid:string,id:string){
 const resource=await db.query.clinicResource.findFirst({where:and(
  eq(schema.clinicResource.id,id),eq(schema.clinicResource.clinicId,cid)
 )});
 if(!resource)fail(404,"RESOURCE_NOT_FOUND");
 return resource;
}
export async function saveWeek(cid:string,actorId:string,kind:"clinic"|"provider"|"resource",
 target:string|null,raw:unknown){
 const week=weekInput(raw);
 if(kind==="provider")await eligibleDoctor(cid,target!);
 if(kind==="resource"){
  const resource=await eligibleResource(cid,target!);
  if(!resource.active && week.some(s=>s.isOpen))fail(409,"RESOURCE_INACTIVE");
 }
 await db.transaction(async tx=>{
  await lockClinic(tx,cid);
  const future=await futureBookings(tx,cid,
    kind==="provider"?target||undefined:undefined,
    kind==="resource"?target||undefined:undefined);
  for(const reserved of future){
   const local=wallClock(reserved.startAt),weekdayIndex=weekday(local.date);
   const proposed=week.find(w=>w.weekday===weekdayIndex)!;
   if(!fitsShift(reserved.startAt,reserved.endAt,proposed))
    fail(409,"SCHEDULE_CHANGE_CONFLICTS_WITH_APPOINTMENTS");
  }
  for(const day of week){
   // Ensure two editors cannot silently overwrite each other's saved clinic/shift rules.
   const row=Array.isArray(raw)?raw.find((x:any)=>x?.weekday===day.weekday):null;
   if(!row||!Number.isInteger(row.revision)||row.revision<0)
     fail(422,"EXPECTED_SCHEDULE_REVISION_REQUIRED");
   const current=kind==="clinic"?
     await tx.select({revision:schema.clinicWeeklyHour.revision}).from(schema.clinicWeeklyHour)
       .where(and(eq(schema.clinicWeeklyHour.clinicId,cid),eq(schema.clinicWeeklyHour.weekday,day.weekday))):
     kind==="provider"?
     await tx.select({revision:schema.clinicProviderHour.revision}).from(schema.clinicProviderHour)
       .where(and(eq(schema.clinicProviderHour.clinicId,cid),
         eq(schema.clinicProviderHour.membershipId,target!),eq(schema.clinicProviderHour.weekday,day.weekday))):
     await tx.select({revision:schema.clinicResourceHour.revision}).from(schema.clinicResourceHour)
       .where(and(eq(schema.clinicResourceHour.clinicId,cid),
         eq(schema.clinicResourceHour.resourceId,target!),eq(schema.clinicResourceHour.weekday,day.weekday)));
   if((current[0]?.revision??0)!==row.revision)fail(409,"STALE_SCHEDULE_VERSION");
   const values={clinicId:cid,weekday:day.weekday,isOpen:day.isOpen,
    startMinute:day.startMinute,endMinute:day.endMinute,breaks:day.breaks,
    updatedBy:actorId,updatedAt:new Date()};
   if(kind==="clinic"){
    await tx.insert(schema.clinicWeeklyHour).values(values).onConflictDoUpdate({
     target:[schema.clinicWeeklyHour.clinicId,schema.clinicWeeklyHour.weekday],
     set:{...values,revision:sql.raw('"clinic_weekly_hours"."revision" + 1')}
    });
   }else if(kind==="provider"){
    await tx.insert(schema.clinicProviderHour).values({...values,membershipId:target!})
    .onConflictDoUpdate({
     target:[schema.clinicProviderHour.clinicId,schema.clinicProviderHour.membershipId,
             schema.clinicProviderHour.weekday],
     set:{...values,revision:sql.raw('"clinic_provider_hours"."revision" + 1')}
    });
   }else{
    await tx.insert(schema.clinicResourceHour).values({...values,resourceId:target!})
    .onConflictDoUpdate({
     target:[schema.clinicResourceHour.clinicId,schema.clinicResourceHour.resourceId,
             schema.clinicResourceHour.weekday],
     set:{...values,revision:sql.raw('"clinic_resource_hours"."revision" + 1')}
    });
   }
  }
  await opsAudit(tx,cid,actorId,"operations.hours."+kind+".updated",target||cid);
 });
 return schedules(cid);
}
export async function clearResourceSchedule(cid:string,actorId:string,resourceId:string){
 await eligibleResource(cid,resourceId);
 await db.transaction(async tx=>{
  await lockClinic(tx,cid);
  await tx.delete(schema.clinicResourceHour).where(and(
   eq(schema.clinicResourceHour.clinicId,cid),
   eq(schema.clinicResourceHour.resourceId,resourceId)));
  await opsAudit(tx,cid,actorId,"operations.hours.resource.cleared",resourceId);
 });
 return schedules(cid);
}
export async function addException(cid:string,actorId:string,raw:unknown){
 const values=exceptionData(raw),id=randomUUID();
 await db.transaction(async tx=>{
  await lockClinic(tx,cid);
  const overlapping=await tx.select().from(schema.clinicScheduleException).where(and(
   eq(schema.clinicScheduleException.clinicId,cid),
   lte(schema.clinicScheduleException.startDate,values.endDate),
   gte(schema.clinicScheduleException.endDate,values.startDate)
  )).limit(1);
  if(overlapping.length)fail(409,"OVERLAPPING_EXCEPTION");
  const reserved=await futureBookings(tx,cid);
  const conflicting=reserved.some(a=>{
   const local=wallClock(a.startAt);
   if(local.date<values.startDate||local.date>values.endDate)return false;
   if(values.kind==="closed")return true;
   const end=wallClock(a.endAt);
   return end.date!==local.date||local.minute<values.startMinute!||
    end.minute>values.endMinute!;
  });
  if(conflicting)fail(409,"EXCEPTION_CONFLICTS_WITH_APPOINTMENTS");
  await tx.insert(schema.clinicScheduleException).values({
   id,clinicId:cid,...values,createdBy:actorId
  });
  await opsAudit(tx,cid,actorId,"operations.exception.created",id);
 });
 return db.query.clinicScheduleException.findFirst({where:eq(schema.clinicScheduleException.id,id)});
}
export async function removeException(cid:string,actorId:string,id:string,reason:unknown){
 if(typeof reason!=="string"||reason.trim().length<5||reason.length>200)
  fail(422,"EXCEPTION_DELETE_REASON_REQUIRED");
 await db.transaction(async tx=>{
  await lockClinic(tx,cid);
  const old=await tx.delete(schema.clinicScheduleException).where(and(
   eq(schema.clinicScheduleException.id,id),eq(schema.clinicScheduleException.clinicId,cid)
  )).returning({id:schema.clinicScheduleException.id});
  if(!old.length)fail(404,"EXCEPTION_NOT_FOUND");
  await opsAudit(tx,cid,actorId,"operations.exception.removed",id);
 });
 return {deleted:true};
}
