import { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "@dandanlink/db";
import { type StaffRequest } from "./staff-access.js";
import { csvRecords, demographicInput, fail, fingerprint, PatientError } from "./patient-validation.js";
import { patientAccess, patientBrief, getPatient, lockClinic, duplicates, insertPatient, logPatient } from "./patient-service.js";

type PlannedAction={mode:"skip"|"create"|"merge";reason?:string;targetPatientId?:string};
type ImportRow={rowNumber:number;values:any};
const task=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
  (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const userId=(req:StaffRequest)=>req.actor!.id;
const clinicId=(req:StaffRequest)=>String(req.params.clinicId);
function details(csv:unknown,mapping:any){
  if(typeof csv!=="string")fail(422,"CSV_REQUIRED");
  return csvRecords(csv as string,mapping);
}
function safeCode(error:unknown){
  return error instanceof PatientError?error.code:"ROW_PROCESSING_FAILED";
}
function parseAction(raw:any):PlannedAction|undefined{
  if(raw===undefined)return undefined;
  if(!raw||typeof raw!=="object"||!["skip","create","merge"].includes(raw.mode))
    fail(422,"INVALID_IMPORT_ACTION");
  const action:PlannedAction={mode:raw.mode};
  if(raw.reason!==undefined){
    if(typeof raw.reason!=="string"||raw.reason.trim().length<10||raw.reason.length>300)
      fail(422,"INVALID_DUPLICATE_REASON");
    action.reason=raw.reason.trim();
  }
  if(raw.targetPatientId!==undefined){
    if(typeof raw.targetPatientId!=="string"||! /^[a-z0-9-]{20,45}$/i.test(raw.targetPatientId))
      fail(422,"INVALID_TARGET_PATIENT");
    action.targetPatientId=raw.targetPatientId;
  }
  return action;
}
function cleanActions(actions:any,rows:ImportRow[]){
  const result:Record<string,PlannedAction>={};
  if(actions===undefined||actions===null)return result;
  if(typeof actions!=="object"||Array.isArray(actions)||Object.keys(actions).length>500)
    fail(422,"INVALID_IMPORT_ACTIONS");
  const allowed=new Set(rows.map(x=>String(x.rowNumber)));
  for(const [key,value] of Object.entries(actions)){
    if(!allowed.has(key))fail(422,"UNKNOWN_IMPORT_ROW");
    result[key]=parseAction(value)!;
  }
  return result;
}
function validateRow(values:any){
  const {preferredName,phone,importSourceId,dateOfBirth,ageEstimate}=values;
  if(!preferredName?.trim())fail(422,"PREFERRED_NAME_REQUIRED");
  // Explicitly no clinical history, charting, DOB precision inference or consent import.
  return demographicInput({...values,noticeAcknowledged:false}, "import");
}
function fileDuplicates(rows:ImportRow[]){
  const seen=new Set<string>();const duplicatesSet=new Set<number>();
  for(const row of rows){
    try{
      const normalized=validateRow(row.values);
      const keys=[
        normalized.importSourceId?"source:"+normalized.importSourceId.toLowerCase():null,
        normalized.phone?"namephone:"+normalized.normalizedName+":"+normalized.phone:null,
        normalized.dateOfBirth?"namedob:"+normalized.normalizedName+":"+normalized.dateOfBirth:null
      ].filter(Boolean) as string[];
      if(keys.some(k=>seen.has(k)))duplicatesSet.add(row.rowNumber);
      keys.forEach(k=>seen.add(k));
    }catch{ /* Invalid rows are classified separately. */ }
  }
  return duplicatesSet;
}
function responseJob(j:typeof schema.clinicPatientImportJob.$inferSelect,
                    rows:(typeof schema.clinicPatientImportRow.$inferSelect)[]){
  return {job:{id:j.id,state:j.state,rowCount:j.rowCount,
    created:j.created,skipped:j.skipped,needsReview:j.needsReview,failed:j.failed,
    completedAt:j.completedAt},rows:rows.map(r=>({
      rowNumber:r.rowNumber,result:r.result,code:r.code,patientId:r.patientId
    }))};
}
export function patientImportRouter(){
 const router=Router({mergeParams:true});
 router.get("/template",task(async(req,res)=>{
   await patientAccess(req,clinicId(req),"import");
   const csv="preferred_name,family_name,phone,source_id,date_of_birth,age_estimate,province,city,address,alternate_contact,emergency_contact\r\n";
   res.setHeader("Content-Disposition",'attachment; filename="dandanlink-patient-import-template.csv"');
   res.setHeader("Cache-Control","private, no-store");
   res.type("text/csv; charset=utf-8").send("\ufeff"+csv);
 }));
 router.post("/preview",task(async(req,res)=>{
   const cid=clinicId(req);await patientAccess(req,cid,"import");
   if(req.body?.authorizedTransfer!==true)fail(422,"IMPORT_ATTESTATION_REQUIRED");
   const {headers,mapping,records}=details(req.body?.csv,req.body?.mapping);
   const repeated=fileDuplicates(records);
   const rows=[];
   for(const row of records){
     let status="ready",errorCode:null|string=null;
     let candidates:any[]=[];
     try{
       const data=validateRow(row.values);
       const found=await duplicates(db,cid,data,5);
       candidates=found.map(p=>patientBrief(p));
       if(found.length){status="duplicate";errorCode="EXISTING_PATIENT_CANDIDATE";}
       if(repeated.has(row.rowNumber)){status="duplicate";errorCode="DUPLICATE_IN_CSV";}
     }catch(error){status="invalid";errorCode=safeCode(error);}
     rows.push({rowNumber:row.rowNumber,values:row.values,status,errorCode,candidates});
   }
   const counts={
     ready:rows.filter(r=>r.status==="ready").length,
     duplicates:rows.filter(r=>r.status==="duplicate").length,
     invalid:rows.filter(r=>r.status==="invalid").length
   };
   res.setHeader("Cache-Control","private, no-store");
   res.json({headers,mapping,previewHash:fingerprint(req.body.csv,mapping),rows,counts,
     restrictions:["Only demographics are imported","No clinical records, X-rays, billing or history",
       "Imported records have no individual notice acknowledgement"]});
 }));
 router.post("/commit",task(async(req,res)=>{
   const cid=clinicId(req);await patientAccess(req,cid,"import");
   if(req.body?.authorizedTransfer!==true||req.body?.confirmed!==true)
     fail(422,"IMPORT_CONFIRMATION_REQUIRED");
   const jobId=req.body?.jobId;
   if(typeof jobId!=="string"||! /^[0-9a-fA-F-]{36}$/.test(jobId))
     fail(422,"INVALID_JOB_ID");
   const {mapping,records}=details(req.body?.csv,req.body?.mapping);
   const previewHash=fingerprint(req.body.csv,mapping);
   if(req.body?.previewHash!==previewHash)fail(409,"STALE_IMPORT_PREVIEW");
   const actions=cleanActions(req.body?.actions,records);
   const digest=fingerprint(req.body.csv,mapping,actions);
   const repeated=fileDuplicates(records);
   // A job id is an idempotency key. Preserve output for full and partial retries.
   await db.insert(schema.clinicPatientImportJob).values({
     id:jobId,clinicId:cid,createdBy:userId(req),digest,rowCount:records.length
   }).onConflictDoNothing();
   let job=await db.query.clinicPatientImportJob.findFirst({where:and(
     eq(schema.clinicPatientImportJob.id,jobId),eq(schema.clinicPatientImportJob.clinicId,cid)
   )});
   if(!job)fail(409,"JOB_ID_USED_IN_ANOTHER_CLINIC");
   if(job.digest!==digest||job.createdBy!==userId(req))fail(409,"JOB_ID_REUSED_WITH_DIFFERENT_CONTENT");
   const existingRows=await db.select().from(schema.clinicPatientImportRow)
     .where(eq(schema.clinicPatientImportRow.jobId,jobId));
   if(job.state==="completed"&&existingRows.length===records.length){
     res.setHeader("Cache-Control","private, no-store");
     res.json(responseJob(job,existingRows));return;
   }
   // Each row is a separate atomic transaction. Per-job row record prevents double write on retry.
   for(const row of records){
     try{
       await db.transaction(async tx=>{
         await tx.select({id:schema.clinicPatientImportJob.id}).from(schema.clinicPatientImportJob)
           .where(eq(schema.clinicPatientImportJob.id,jobId)).for("update");
         const prior=await tx.select().from(schema.clinicPatientImportRow).where(and(
           eq(schema.clinicPatientImportRow.jobId,jobId),
           eq(schema.clinicPatientImportRow.rowNumber,row.rowNumber)));
         if(prior.length)return;
         await lockClinic(tx,cid);
         let result:"created"|"skipped"|"needs_review"|"failed"="failed",code="INVALID_ROW";
         let patientId:string|null=null;
         try{
           const input=validateRow(row.values);
           const found=await duplicates(tx,cid,input,5);
           const duplicateInFile=repeated.has(row.rowNumber);
           const collision=found.length>0||duplicateInFile;
           const action=actions[String(row.rowNumber)];
           if(collision){
             if(!action || action.mode==="skip"){result="skipped";code=duplicateInFile?"DUPLICATE_IN_CSV":"EXISTING_PATIENT_CANDIDATE";}
             else if(action.mode==="create"){
               if(!action.reason)fail(422,"DUPLICATE_REASON_REQUIRED");
               if(input.importSourceId && found.some(x=>x.importSourceId===input.importSourceId))
                 fail(409,"SOURCE_ID_ALREADY_USED");
               const inserted=await insertPatient(tx,cid,userId(req),input,"import");
               patientId=inserted.id;result="created";code="CREATED_WITH_DUPLICATE_OVERRIDE";
               await logPatient(tx,userId(req),cid,inserted.id,"patient.duplicate.override");
             }else if(action.mode==="merge"){
               if(!action.reason||!action.targetPatientId)fail(422,"MERGE_REASON_AND_TARGET_REQUIRED");
               const target=found.find(p=>p.id===action.targetPatientId);
               if(!target||duplicateInFile){result="needs_review";code="MERGE_CANDIDATE_AMBIGUOUS";}
               else if(target.normalizedName!==input.normalizedName ||
                 input.phone&&target.phone&&input.phone!==target.phone ||
                 input.dateOfBirth&&target.dateOfBirth&&input.dateOfBirth!==target.dateOfBirth ||
                 input.importSourceId&&target.importSourceId&&input.importSourceId!==target.importSourceId){
                 result="needs_review";code="MERGE_CONFLICT_REQUIRES_MANUAL_EDIT";
               }else{
                 const patch:any={},fill=[
                   "phone","alternateContact","dateOfBirth","ageEstimate","province","city","address",
                   "emergencyContact","importSourceId"
                 ] as const;
                 for(const k of fill)if(!target[k] && input[k]!==null && input[k]!==undefined)patch[k]=input[k];
                 if(Object.keys(patch).length){
                   await tx.update(schema.clinicPatient).set({
                     ...patch,updatedAt:new Date(),updatedBy:userId(req),revision:target.revision+1
                   }).where(and(eq(schema.clinicPatient.id,target.id),eq(schema.clinicPatient.clinicId,cid)));
                   await logPatient(tx,userId(req),cid,target.id,"patient.import.demographics.filled");
                   result="skipped";code="MERGED_MISSING_DEMOGRAPHICS";patientId=target.id;
                 }else{result="skipped";code="NOTHING_TO_MERGE";patientId=target.id;}
               }
             }
           }else{
             const inserted=await insertPatient(tx,cid,userId(req),input,"import");
             patientId=inserted.id;result="created";code="CREATED";
           }
         }catch(error){
           // Expected bad rows are counted, never included in logs.
           result=error instanceof PatientError && error.code.startsWith("MERGE_")?
             "needs_review":"failed";
           code=safeCode(error);
         }
         await tx.insert(schema.clinicPatientImportRow).values({
           jobId,rowNumber:row.rowNumber,result,code,patientId
         });
       });
     }catch{
       // A DB outage should not be disguised as an invalid patient row.
       fail(503,"IMPORT_TEMPORARILY_UNAVAILABLE");
     }
   }
   const saved=await db.transaction(async tx=>{
     await tx.select({id:schema.clinicPatientImportJob.id}).from(schema.clinicPatientImportJob)
       .where(eq(schema.clinicPatientImportJob.id,jobId)).for("update");
     const results=await tx.select().from(schema.clinicPatientImportRow)
       .where(eq(schema.clinicPatientImportRow.jobId,jobId));
     const count=(type:string)=>results.filter(r=>r.result===type).length;
     const done=results.length===records.length;
     const [updated]=await tx.update(schema.clinicPatientImportJob).set({
       created:count("created"),skipped:count("skipped"),needsReview:count("needs_review"),
       failed:count("failed"),state:done?"completed":"processing",
       updatedAt:new Date(),completedAt:done?new Date():null
     }).where(eq(schema.clinicPatientImportJob.id,jobId)).returning();
     if(done)await tx.insert(schema.auditEvent).values({
       id:randomUUID(),actorId:userId(req),clinicId:cid,action:"patient.import.completed",
       subjectType:"patient_import_job",subjectId:jobId,outcome:"success"
     });
     return {job:updated,rows:results};
   });
   res.setHeader("Cache-Control","private, no-store");
   res.json(responseJob(saved.job,saved.rows));
 }));
 router.get("/jobs/:jobId",task(async(req,res)=>{
   const cid=clinicId(req);await patientAccess(req,cid,"import");
   const id=String(req.params.jobId);
   const job=await db.query.clinicPatientImportJob.findFirst({where:and(
     eq(schema.clinicPatientImportJob.id,id),eq(schema.clinicPatientImportJob.clinicId,cid))});
   if(!job)fail(404,"IMPORT_JOB_NOT_FOUND");
   const rows=await db.select().from(schema.clinicPatientImportRow)
     .where(eq(schema.clinicPatientImportRow.jobId,id)).orderBy(schema.clinicPatientImportRow.rowNumber);
   res.setHeader("Cache-Control","private, no-store");
   res.json(responseJob(job,rows));
 }));
 return router;
}
