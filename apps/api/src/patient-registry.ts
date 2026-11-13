import { randomUUID } from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { and, asc, count, desc, eq, gt, ilike, inArray, or } from "drizzle-orm";
import { db, schema } from "@dandanlink/db";
import { authStaff, AccessFault, type StaffRequest } from "./staff-access.js";
import { patientAccess, patientBrief, getPatient, privateDemographics,
  lockClinic, duplicates, insertPatient, logPatient } from "./patient-service.js";
import { demographicInput, intakeInput, fail, PatientError, str } from "./patient-validation.js";
import { patientImportRouter } from "./patient-import.js";

const wrap=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
  (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const clinicId=(req:StaffRequest)=>String(req.params.clinicId);
const patientId=(req:StaffRequest)=>String(req.params.patientId);
const noCache=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
const number=(value:unknown,def:number,max:number)=>{
  const n=value===undefined?def:Number(value);
  if(!Number.isInteger(n)||n<1||n>max)fail(422,"INVALID_PAGE");
  return n;
};

export function patientRegistryRouter(){
 const api=Router();
 api.use(authStaff);
 const clinics=Router({mergeParams:true});
 api.use("/clinics/:clinicId",clinics);

 clinics.get("/patients/summary",wrap(async(req,res)=>{
   const cid=clinicId(req);
   await patientAccess(req,cid,"read");
   const result=await db.select({
     status:schema.clinicPatient.status,total:count()
   }).from(schema.clinicPatient).where(eq(schema.clinicPatient.clinicId,cid))
     .groupBy(schema.clinicPatient.status);
   const counts={active:0,inactive:0,archived:0};
   for(const item of result)if(item.status in counts)counts[item.status as keyof typeof counts]=item.total;
   noCache(res);res.json({counts,total:counts.active+counts.inactive+counts.archived});
 }));
 clinics.get("/patients",wrap(async(req,res)=>{
   const cid=clinicId(req),ctx=await patientAccess(req,cid,"read");
   const page=number(req.query.page,1,100000);
   const limit=number(req.query.limit,20,20);
   if(![10,20].includes(limit))fail(422,"INVALID_PAGE_SIZE");
   const status=String(req.query.status||"active");
   if(!["active","inactive","archived","all"].includes(status))fail(422,"INVALID_STATUS");
   const sort=String(req.query.sort||"activity");
   if(!["activity","name"].includes(sort))fail(422,"INVALID_SORT");
   const query=String(req.query.q||"").trim().slice(0,120);
   const conditions=[eq(schema.clinicPatient.clinicId,cid)];
   if(status!=="all")conditions.push(eq(schema.clinicPatient.status,status));
   if(query){
     const escaped=query.replace(/[\\%_]/g,ch=>"\\"+ch);
     const textLike="%"+escaped+"%";
     // All searches are tenant-limited. Phone search is for clinic staff only,
     // and the phone is always presented as unverified until proof exists.
     conditions.push(or(ilike(schema.clinicPatient.preferredName,textLike),
       ilike(schema.clinicPatient.familyName,textLike),
       ilike(schema.clinicPatient.patientNumber,textLike),
       ilike(schema.clinicPatient.phone,textLike))!);
   }
   const filter=and(...conditions);
   const total=(await db.select({value:count()}).from(schema.clinicPatient).where(filter))[0]?.value||0;
   const people=await db.select().from(schema.clinicPatient).where(filter)
     .orderBy(sort==="name"?asc(schema.clinicPatient.normalizedName):desc(schema.clinicPatient.updatedAt),
       desc(schema.clinicPatient.createdAt),asc(schema.clinicPatient.id))
     .limit(limit).offset((page-1)*limit);
   noCache(res);res.json({
     patients:people.map(p=>patientBrief(p,ctx.role==="cashier")),
     total,page,limit,pages:Math.max(1,Math.ceil(total/limit)),
     sort,status,query
   });
 }));
 clinics.post("/patients/duplicates",wrap(async(req,res)=>{
   const cid=clinicId(req),ctx=await patientAccess(req,cid,"write");
   const body={...req.body,noticeAcknowledged:true};
   const input=demographicInput(body);
   const found=await duplicates(db,cid,input);
   noCache(res);res.json({candidates:found.map(p=>patientBrief(p)),count:found.length});
 }));
 clinics.post("/patients",wrap(async(req,res)=>{
   const cid=clinicId(req);await patientAccess(req,cid,"write");
   const input=demographicInput(req.body);
   const duplicateOverride=String(req.body?.duplicateOverride||"");
   const duplicateReason=req.body?.duplicateReason;
   const outcome=await db.transaction(async tx=>{
     await lockClinic(tx,cid);
     const found=await duplicates(tx,cid,input);
     if(found.length && duplicateOverride!=="create_anyway")
       fail(409,"DUPLICATE_CANDIDATES",{candidates:found.map(p=>patientBrief(p))});
     if(found.length){
       if(typeof duplicateReason!=="string"||duplicateReason.trim().length<10||duplicateReason.length>300)
         fail(422,"DUPLICATE_REASON_REQUIRED");
     }
     const result=await insertPatient(tx,cid,req.actor!.id,input,"frontdesk");
     if(found.length)await logPatient(tx,req.actor!.id,cid,result.id,"patient.duplicate.override");
     return result;
   });
   const saved=await getPatient(cid,outcome.id);
   noCache(res);res.status(201).json({patient:privateDemographics(saved,"receptionist")});
 }));
 clinics.use("/patients/import",patientImportRouter());

 clinics.get("/patients/:patientId",wrap(async(req,res)=>{
   const cid=clinicId(req),ctx=await patientAccess(req,cid,"read");
   const record=await getPatient(cid,patientId(req));
   await db.insert(schema.auditEvent).values({
     id:randomUUID(),actorId:req.actor!.id,clinicId:cid,action:"patient.demographics.viewed",
     subjectType:"patient",subjectId:record.id,outcome:"success"
   });
   noCache(res);res.json({patient:privateDemographics(record,ctx.role),
     clinicalAvailable:ctx.role==="dentist"||ctx.membership.clinicianEnabled &&
       ["owner","manager"].includes(ctx.role),
     appointmentsAvailable:true,financialAvailable:false});
 }));
 clinics.patch("/patients/:patientId",wrap(async(req,res)=>{
   const cid=clinicId(req);await patientAccess(req,cid,"write");
   const existing=await getPatient(cid,patientId(req));
   if(Number(req.body?.revision)!==existing.revision)fail(409,"STALE_PATIENT_REVISION");
   const input=demographicInput(req.body);
   const patch={...input,importSourceId:existing.importSourceId};
   await db.transaction(async tx=>{
     await lockClinic(tx,cid);
     const dup=await duplicates(tx,cid,patch);
     const other=dup.filter(p=>p.id!==existing.id);
     if(other.length)fail(409,"DUPLICATE_CANDIDATES",{
       candidates:other.map(p=>patientBrief(p))
     });
     const changed=await tx.update(schema.clinicPatient).set({
       ...patch,noticeAcknowledgedAt:existing.noticeAcknowledgedAt||new Date(),
       revision:existing.revision+1,updatedBy:req.actor!.id,updatedAt:new Date()
     }).where(and(eq(schema.clinicPatient.id,existing.id),
       eq(schema.clinicPatient.clinicId,cid),
       eq(schema.clinicPatient.revision,existing.revision)))
       .returning({id:schema.clinicPatient.id});
     if(!changed.length)fail(409,"STALE_PATIENT_REVISION");
     await logPatient(tx,req.actor!.id,cid,existing.id,"patient.demographics.updated");
   });
   noCache(res);res.json({patient:privateDemographics(await getPatient(cid,existing.id),"receptionist")});
 }));
 clinics.patch("/patients/:patientId/status",wrap(async(req,res)=>{
   const cid=clinicId(req);
   const ctx=await patientAccess(req,cid,"write");
   if(!["owner","manager"].includes(ctx.role))fail(403,"PATIENT_STATUS_PERMISSION_DENIED");
   const existing=await getPatient(cid,patientId(req));
   if(Number(req.body?.revision)!==existing.revision)fail(409,"STALE_PATIENT_REVISION");
   const next=String(req.body?.status);
   if(!["active","inactive","archived"].includes(next))fail(422,"INVALID_STATUS");
   if(next===existing.status)fail(409,"STATUS_UNCHANGED");
   str(req.body?.reason,10,300,"REASON");
   if(next!=="active"){
    const upcoming=await db.select({id:schema.clinicAppointment.id})
      .from(schema.clinicAppointment).where(and(
       eq(schema.clinicAppointment.clinicId,cid),
       eq(schema.clinicAppointment.patientId,existing.id),
       gt(schema.clinicAppointment.endAt,new Date()),
       inArray(schema.clinicAppointment.status,["confirmed","arrived","in_treatment"])
      )).limit(1);
    if(upcoming.length)fail(409,"PATIENT_HAS_FUTURE_APPOINTMENTS");
   }
   await db.transaction(async tx=>{
     const changed=await tx.update(schema.clinicPatient).set({
       status:next,revision:existing.revision+1,updatedAt:new Date(),updatedBy:req.actor!.id
     }).where(and(eq(schema.clinicPatient.id,existing.id),eq(schema.clinicPatient.clinicId,cid),
       eq(schema.clinicPatient.revision,existing.revision))).returning({id:schema.clinicPatient.id});
     if(!changed.length)fail(409,"STALE_PATIENT_REVISION");
     await logPatient(tx,req.actor!.id,cid,existing.id,"patient.status."+next);
   });
   noCache(res);res.json({patient:privateDemographics(await getPatient(cid,existing.id),ctx.role)});
 }));
 clinics.get("/patients/:patientId/intake",wrap(async(req,res)=>{
   const cid=clinicId(req);await patientAccess(req,cid,"clinical");
   const p=await getPatient(cid,patientId(req));
   const entry=await db.query.clinicPatientIntake.findFirst({where:and(
     eq(schema.clinicPatientIntake.patientId,p.id),
     eq(schema.clinicPatientIntake.clinicId,cid))});
   if(!entry)fail(404,"INTAKE_NOT_FOUND");
   await db.insert(schema.auditEvent).values({id:randomUUID(),
     actorId:req.actor!.id,clinicId:cid,action:"patient.intake.viewed",
     subjectType:"patient",subjectId:p.id,outcome:"success"});
   noCache(res);res.json({intake:entry});
 }));
 clinics.patch("/patients/:patientId/intake",wrap(async(req,res)=>{
   const cid=clinicId(req);await patientAccess(req,cid,"clinical");
   const p=await getPatient(cid,patientId(req));
   const input=intakeInput(req.body);
   const revision=number(req.body?.revision,0,100000000);
   await db.transaction(async tx=>{
     const changed=await tx.update(schema.clinicPatientIntake).set({
       ...input,revision:revision+1,recordedBy:req.actor!.id,updatedAt:new Date()
     }).where(and(eq(schema.clinicPatientIntake.clinicId,cid),
       eq(schema.clinicPatientIntake.patientId,p.id),
       eq(schema.clinicPatientIntake.revision,revision))).returning({patientId:schema.clinicPatientIntake.patientId});
     if(!changed.length)fail(409,"STALE_INTAKE_REVISION");
     await logPatient(tx,req.actor!.id,cid,p.id,"patient.intake.recorded");
   });
   noCache(res);res.json({intake:await db.query.clinicPatientIntake.findFirst({
     where:eq(schema.clinicPatientIntake.patientId,p.id)})});
 }));

 api.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
   if(error instanceof PatientError){res.status(error.statusCode).json({
     code:error.code,...(error.extra||{})
   });return;}
   if(error instanceof AccessFault){res.status(error.status).json({code:error.code});return;}
   if((error as any)?.code==="23505"||(error as any)?.cause?.code==="23505"){
     res.status(409).json({code:"PATIENT_RECORD_CONFLICT"});return;
   }
   console.error("PH05 registry failure",error instanceof Error?error.name:"unknown");
   res.status(500).json({code:"PATIENT_INTERNAL_ERROR"});
 });
 return api;
}
