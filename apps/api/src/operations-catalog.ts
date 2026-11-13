import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { db, schema } from "@dandanlink/db";
import type { StaffRequest } from "./staff-access.js";
import { scope } from "./staff-access.js";
import { fail, resourceData, serviceData } from "./operations-validation.js";

export async function operationsAccess(req:StaffRequest,cid:string,write=false){
 const context=await scope(req,cid);
 if(!["owner","manager","dentist","receptionist"].includes(context.role))
  fail(403,"OPERATIONS_ACCESS_DENIED");
 if(write){
  if(!["owner","manager"].includes(context.role))fail(403,"OPERATIONS_MANAGE_DENIED");
  if(context.clinic.status==="suspended")fail(403,"CLINIC_SUSPENDED");
  const sub=await db.query.clinicSubscription.findFirst({
    where:eq(schema.clinicSubscription.clinicId,cid)
  });
  // The owner may set up a draft clinic before submitting it.
  if(!sub && context.clinic.status!=="draft")fail(403,"SUBSCRIPTION_REQUIRED");
  if(sub){
   if(sub.status==="cancelled")fail(403,"SUBSCRIPTION_INACTIVE");
   const plan=await db.query.planVersion.findFirst({
    where:eq(schema.planVersion.id,sub.planVersionId)
   });
   if(!plan||plan.branchLimit<1)fail(403,"PLAN_NOT_ELIGIBLE");
   const expires=sub.status==="trialing"?sub.trialEndsAt:sub.currentPeriodEndsAt;
   const grace=sub.status==="trialing"?0:plan.graceDays*86400000;
   if(expires && Date.now()>expires.getTime()+grace)fail(403,"SUBSCRIPTION_EXPIRED");
  }
 }
 return context;
}
export async function opsAudit(tx:any,cid:string,actorId:string,action:string,id:string){
 await tx.insert(schema.auditEvent).values({
  id:randomUUID(),clinicId:cid,actorId,action,subjectType:"clinic_operations",
  subjectId:id,outcome:"success"
 });
}
export async function lockClinic(tx:any,cid:string){
 await tx.select({id:schema.clinic.id}).from(schema.clinic).where(eq(schema.clinic.id,cid)).for("update");
}
function immutableFields(values:ReturnType<typeof serviceData>){
 return {name:values.name,category:values.category,description:values.description,
   durationMinutes:values.durationMinutes,preparationMinutes:values.preparationMinutes,
   basePriceAfn:values.basePriceAfn,requiresChair:values.requiresChair,
   publicBooking:values.publicBooking,active:values.active};
}
export async function listServices(cid:string){
 const services=await db.select().from(schema.clinicService)
  .where(eq(schema.clinicService.clinicId,cid))
  .orderBy(asc(schema.clinicService.category),asc(schema.clinicService.name));
 return services;
}
export async function createService(cid:string,actorId:string,raw:any){
 const validated=serviceData(raw),id=randomUUID();
 await db.transaction(async tx=>{
  await lockClinic(tx,cid);
  await tx.insert(schema.clinicService).values({
   id,clinicId:cid,...validated,createdBy:actorId,updatedBy:actorId
  });
  await tx.insert(schema.clinicServiceVersion).values({
   serviceId:id,clinicId:cid,version:1,...immutableFields(validated),changedBy:actorId
  });
  await opsAudit(tx,cid,actorId,"operations.service.created",id);
 });
 return (await db.query.clinicService.findFirst({where:eq(schema.clinicService.id,id)}))!;
}
export async function changeService(cid:string,actorId:string,id:string,raw:any){
 const validated=serviceData(raw);
 const version=raw?.version;
 if(!Number.isInteger(version)||version<1)fail(422,"INVALID_SERVICE_VERSION");
 const updated=await db.transaction(async tx=>{
  await lockClinic(tx,cid);
  const row=await tx.select().from(schema.clinicService).where(and(
   eq(schema.clinicService.id,id),eq(schema.clinicService.clinicId,cid))).for("update");
  const existing=row[0];
  if(!existing)fail(404,"SERVICE_NOT_FOUND");
  if(existing.version!==version)fail(409,"STALE_SERVICE_VERSION");
  if(existing.active && !validated.active){
   const reserved=await tx.select({id:schema.clinicAppointment.id}).from(schema.clinicAppointment)
    .where(and(eq(schema.clinicAppointment.clinicId,cid),
      eq(schema.clinicAppointment.serviceId,id),
      inArray(schema.clinicAppointment.status,["confirmed","arrived","in_treatment"]),
      gte(schema.clinicAppointment.endAt,new Date()))).limit(1);
   if(reserved.length)fail(409,"SERVICE_HAS_ACTIVE_BOOKINGS");
  }
  const [fresh]=await tx.update(schema.clinicService).set({
   ...validated,version:existing.version+1,updatedBy:actorId,updatedAt:new Date()
  }).where(and(eq(schema.clinicService.id,id),eq(schema.clinicService.clinicId,cid),
    eq(schema.clinicService.version,existing.version))).returning();
  if(!fresh)fail(409,"STALE_SERVICE_VERSION");
  await tx.insert(schema.clinicServiceVersion).values({
   serviceId:id,clinicId:cid,version:fresh.version,...immutableFields(validated),changedBy:actorId
  });
  await opsAudit(tx,cid,actorId,"operations.service.version.updated",id);
  return fresh;
 });
 return updated;
}
export async function serviceHistory(cid:string,id:string){
 const service=await db.query.clinicService.findFirst({where:and(
  eq(schema.clinicService.id,id),eq(schema.clinicService.clinicId,cid))});
 if(!service)fail(404,"SERVICE_NOT_FOUND");
 return db.select().from(schema.clinicServiceVersion).where(and(
  eq(schema.clinicServiceVersion.clinicId,cid),
  eq(schema.clinicServiceVersion.serviceId,id)
 )).orderBy(desc(schema.clinicServiceVersion.version));
}
export async function listResources(cid:string){
 return db.select().from(schema.clinicResource)
 .where(eq(schema.clinicResource.clinicId,cid))
 .orderBy(asc(schema.clinicResource.code));
}
export async function createResource(cid:string,actorId:string,raw:any){
 const values=resourceData(raw),id=randomUUID();
 await db.transaction(async tx=>{
  await lockClinic(tx,cid);
  // No public branch-management route exists until a proper plan-aware branch model ships.
  const existing=await tx.select({id:schema.clinicResource.id}).from(schema.clinicResource)
    .where(eq(schema.clinicResource.clinicId,cid));
  if(existing.length>=50)fail(409,"RESOURCE_SAFETY_LIMIT");
  await tx.insert(schema.clinicResource).values({
   id,clinicId:cid,...values,createdBy:actorId,updatedBy:actorId
  });
  await opsAudit(tx,cid,actorId,"operations.resource.created",id);
 });
 return (await db.query.clinicResource.findFirst({where:eq(schema.clinicResource.id,id)}))!;
}
export async function changeResource(cid:string,actorId:string,id:string,raw:any){
 const values=resourceData(raw);
 if(!Number.isInteger(raw?.revision)||raw.revision<1)fail(422,"INVALID_REVISION");
 return db.transaction(async tx=>{
  await lockClinic(tx,cid);
  const records=await tx.select().from(schema.clinicResource).where(and(
   eq(schema.clinicResource.id,id),eq(schema.clinicResource.clinicId,cid))).for("update");
  const resource=records[0];
  if(!resource)fail(404,"RESOURCE_NOT_FOUND");
  if(resource.revision!==raw.revision)fail(409,"STALE_RESOURCE_REVISION");
  if(resource.active && !values.active){
   const reserved=await tx.select({id:schema.clinicAppointment.id}).from(schema.clinicAppointment)
    .where(and(eq(schema.clinicAppointment.clinicId,cid),
      eq(schema.clinicAppointment.resourceId,id),
      inArray(schema.clinicAppointment.status,["confirmed","arrived","in_treatment"]),
      gte(schema.clinicAppointment.endAt,new Date()))).limit(1);
   if(reserved.length)fail(409,"RESOURCE_HAS_ACTIVE_BOOKINGS");
   const shifts=await tx.select().from(schema.clinicResourceHour).where(and(
    eq(schema.clinicResourceHour.clinicId,cid),
    eq(schema.clinicResourceHour.resourceId,id)
   ));
   if(shifts.some(x=>x.isOpen))fail(409,"RESOURCE_USED_BY_SCHEDULE");
  }
  if(resource.kind!==values.kind && resource.active)
   fail(409,"DEACTIVATE_BEFORE_CHANGING_RESOURCE_KIND");
  const [updated]=await tx.update(schema.clinicResource).set({
   ...values,updatedBy:actorId,updatedAt:new Date(),revision:resource.revision+1
  }).where(and(eq(schema.clinicResource.id,id),eq(schema.clinicResource.clinicId,cid),
    eq(schema.clinicResource.revision,resource.revision))).returning();
  if(!updated)fail(409,"STALE_RESOURCE_REVISION");
  await opsAudit(tx,cid,actorId,"operations.resource.updated",id);
  return updated;
 });
}
