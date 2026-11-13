import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "@dandanlink/db";
import { fail, weekInput, exceptionData } from "./operations-validation.js";
import { lockClinic, opsAudit } from "./operations-catalog.js";

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
  for(const day of week){
   const values={clinicId:cid,weekday:day.weekday,isOpen:day.isOpen,
    startMinute:day.startMinute,endMinute:day.endMinute,breaks:day.breaks,
    updatedBy:actorId,updatedAt:new Date()};
   if(kind==="clinic"){
    await tx.insert(schema.clinicWeeklyHour).values(values).onConflictDoUpdate({
     target:[schema.clinicWeeklyHour.clinicId,schema.clinicWeeklyHour.weekday],
     set:{...values,revision:sql.raw('"revision" + 1')}
    });
   }else if(kind==="provider"){
    await tx.insert(schema.clinicProviderHour).values({...values,membershipId:target!})
    .onConflictDoUpdate({
     target:[schema.clinicProviderHour.clinicId,schema.clinicProviderHour.membershipId,
             schema.clinicProviderHour.weekday],
     set:{...values,revision:sql.raw('"revision" + 1')}
    });
   }else{
    await tx.insert(schema.clinicResourceHour).values({...values,resourceId:target!})
    .onConflictDoUpdate({
     target:[schema.clinicResourceHour.clinicId,schema.clinicResourceHour.resourceId,
             schema.clinicResourceHour.weekday],
     set:{...values,revision:sql.raw('"revision" + 1')}
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
