import { randomUUID } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import { db, schema } from "@dandanlink/db";
import { scope, type StaffRequest, type Role } from "./staff-access.js";
import { demographicInput, fail, type PatientError } from "./patient-validation.js";

export type Mode="read"|"write"|"import"|"clinical";
const readRoles:Role[]=["owner","manager","dentist","receptionist","cashier"];
const writeRoles:Role[]=["owner","manager","dentist","receptionist"];
const importRoles:Role[]=["owner","manager"];
export async function patientAccess(req:StaffRequest,cid:string,mode:Mode){
  const ctx=await scope(req,cid);
  let allowed=false;
  if(mode==="read")allowed=readRoles.includes(ctx.role);
  if(mode==="write")allowed=writeRoles.includes(ctx.role);
  if(mode==="import")allowed=importRoles.includes(ctx.role);
  if(mode==="clinical")allowed=ctx.role==="dentist"||ctx.membership.clinicianEnabled &&
    ["owner","manager"].includes(ctx.role);
  if(!allowed){
    // Permission logs contain only a capability and tenant, never patient identifiers or content.
    await db.insert(schema.auditEvent).values({
      id:randomUUID(),actorId:req.actor!.id,clinicId:cid,action:"patient.permission.denied",
      subjectType:"capability",subjectId:"patient."+mode,outcome:"denied"
    });
    fail(403,"PATIENT_PERMISSION_DENIED");
  }
  return ctx;
}
export async function getPatient(cid:string,id:string){
  const p=await db.query.clinicPatient.findFirst({where:and(
    eq(schema.clinicPatient.id,id),eq(schema.clinicPatient.clinicId,cid))});
  if(!p)fail(404,"PATIENT_NOT_FOUND");
  return p;
}
export function patientBrief(p:typeof schema.clinicPatient.$inferSelect,financeOnly=false){
  return {id:p.id,patientNumber:p.patientNumber,preferredName:p.preferredName,
    familyName:p.familyName,phone:financeOnly?null:p.phone,
    phoneVerified:financeOnly?false:p.phoneVerified,
    status:p.status,updatedAt:p.updatedAt,createdAt:p.createdAt,revision:p.revision};
}
export async function logPatient(tx:any,actorId:string,cid:string,patientId:string,action:string){
  await tx.insert(schema.auditEvent).values({
    id:randomUUID(),clinicId:cid,actorId,action,subjectType:"patient",subjectId:patientId,outcome:"success"
  });
}
export async function allocatePatientNumber(tx:any,cid:string){
  await tx.insert(schema.clinicPatientCounter).values({clinicId:cid,nextNumber:1}).onConflictDoNothing();
  const [record]=await tx.select().from(schema.clinicPatientCounter)
    .where(eq(schema.clinicPatientCounter.clinicId,cid)).for("update");
  if(!record||record.nextNumber>=2147483646)fail(409,"PATIENT_NUMBER_EXHAUSTED");
  await tx.update(schema.clinicPatientCounter).set({nextNumber:record.nextNumber+1})
    .where(eq(schema.clinicPatientCounter.clinicId,cid));
  return "P-"+String(record.nextNumber).padStart(6,"0");
}
/** Serialize intra-clinic concurrent create/import dedupe checks. */
export async function lockClinic(tx:any,cid:string){
  await tx.select({id:schema.clinic.id}).from(schema.clinic)
    .where(eq(schema.clinic.id,cid)).for("update");
}
type PatientInput=ReturnType<typeof demographicInput>;
export async function duplicates(tx:any,cid:string,input:PatientInput,limit=5){
  const conditions=[];
  if(input.phone)conditions.push(and(
    eq(schema.clinicPatient.phone,input.phone),eq(schema.clinicPatient.normalizedName,input.normalizedName)));
  if(input.importSourceId)conditions.push(eq(schema.clinicPatient.importSourceId,input.importSourceId));
  if(input.dateOfBirth)conditions.push(and(
    eq(schema.clinicPatient.dateOfBirth,input.dateOfBirth),
    eq(schema.clinicPatient.normalizedName,input.normalizedName)));
  if(!conditions.length)return [];
  return tx.select().from(schema.clinicPatient).where(and(eq(schema.clinicPatient.clinicId,cid),
    conditions.length===1?conditions[0]:or(...conditions))).limit(limit);
}
export async function insertPatient(tx:any,cid:string,actorId:string,input:PatientInput,source:"frontdesk"|"import"){
  const id=randomUUID(),patientNumber=await allocatePatientNumber(tx,cid);
  await tx.insert(schema.clinicPatient).values({
    id,clinicId:cid,patientNumber,...input,
    noticeAcknowledgedAt:input.noticeAcknowledged?new Date():null,intakeSource:source,createdBy:actorId,updatedBy:actorId
  });
  await tx.insert(schema.clinicPatientIntake).values({patientId:id,clinicId:cid});
  await logPatient(tx,actorId,cid,id,"patient.created");
  return {id,patientNumber};
}
export function privateDemographics(p:typeof schema.clinicPatient.$inferSelect,role:Role){
  if(role==="cashier")return patientBrief(p,true);
  // Never include clinical intake in demographic endpoints.
  return {
    ...patientBrief(p),alternateContact:p.alternateContact,dateOfBirth:p.dateOfBirth,
    ageEstimate:p.ageEstimate,dobIsEstimated:p.dobIsEstimated,
    province:p.province,city:p.city,address:p.address,emergencyContact:p.emergencyContact,
    noticeAcknowledged:p.noticeAcknowledged,noticeAcknowledgedAt:p.noticeAcknowledgedAt,
    intakeSource:p.intakeSource,importSourceId:p.importSourceId
  };
}
