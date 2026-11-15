import {Router,type NextFunction,type Response} from "express";
import {createHash,randomBytes,randomUUID} from "node:crypto";
import {fromNodeHeaders} from "better-auth/node";
import {sqlClient} from "@dandanlink/db";
import {auth} from "./auth.js";
import {authStaff,scope,fail,type StaffRequest,type AccessFault} from "./staff-access.js";
import {opsIdentity,opsAdmin,opsTask} from "./ops-access.js";
import {getPilotReadiness} from "./pilot-gate.js";

const task=(f:(req:StaffRequest,res:Response)=>Promise<void>)=>
 (req:StaffRequest,res:Response,next:NextFunction)=>f(req,res).catch(next);
const secure=(res:Response)=>{
 res.setHeader("Cache-Control","private, no-store");res.setHeader("Pragma","no-cache");
 res.setHeader("X-Content-Type-Options","nosniff");
};
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const validId=(s:unknown)=>typeof s==="string"&&/^[0-9a-f-]{36}$/i.test(s);
async function owner(req:StaffRequest){
 const clinic=String(req.params.clinicId),ctx=await scope(req,clinic);
 if(ctx.role!=="owner")fail(403,"EXPORT_OWNER_ONLY");
 if(!req.actor?.mfa)fail(403,"EXPORT_MFA_REQUIRED");
 return clinic;
}
async function recentLogin(req:StaffRequest){
 const s=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
 const age=Date.now()-new Date(s?.session?.createdAt??0).getTime();
 if(age<0||age>10*60*1000)fail(403,"EXPORT_RECENT_LOGIN_REQUIRED");
}
function visible(row:any){return{
 id:row.id,status:row.status==="ready"&&new Date(row.expires_at).getTime()<Date.now()?"expired":row.status,
 reason:row.reason,createdAt:row.created_at,expiresAt:row.expires_at,downloadedAt:row.downloaded_at
};}
async function buildExport(cid:string){
 const [patients,appointments,invoices,payments]=await Promise.all([
  sqlClient`SELECT id,patient_number,preferred_name,family_name,phone,date_of_birth,
   age_estimate,province,city,status,notice_acknowledged,created_at
   FROM clinic_patients WHERE clinic_id=${cid} ORDER BY patient_number LIMIT 5001`,
  sqlClient`SELECT id,patient_id,service_name,start_at,end_at,status,source,created_at
   FROM clinic_appointments WHERE clinic_id=${cid} ORDER BY start_at,id LIMIT 5001`,
  sqlClient`SELECT id,patient_id,invoice_number,status,total_afn,issued_at,created_at
   FROM clinic_invoices WHERE clinic_id=${cid} ORDER BY created_at,id LIMIT 5001`,
  sqlClient`SELECT id,patient_id,invoice_id,kind,amount_afn,method,occurred_at
   FROM clinic_payment_entries WHERE clinic_id=${cid} ORDER BY occurred_at,id LIMIT 5001`
 ]);
 if([patients,appointments,invoices,payments].some(rows=>rows.length>5000))
  fail(409,"EXPORT_TOO_LARGE_CONTACT_SUPPORT");
 return {manifest:{schema:"DandanLink-PH19-1",clinicId:cid,scope:"administrative",
  generatedAt:new Date().toISOString(),timezone:"Asia/Kabul",currency:"AFN",
  excludes:["clinical_intakes","signed_encounters","chart","clinical_files"],
  notice:"Sensitive patient data. Store encrypted; do not distribute publicly."},
  patients,appointments,invoices,payments};
}
export function portabilityRouter(){
 const r=Router();
 r.get("/admin/readiness",opsIdentity,opsTask(async(req,res)=>{
  opsAdmin(req);
  secure(res);res.json(getPilotReadiness());
 }));
 r.use(authStaff);
 r.get("/clinics/:clinicId/exports",task(async(req,res)=>{
  const cid=await owner(req);
  const rows=await sqlClient`SELECT id,status,reason,created_at,expires_at,downloaded_at
   FROM clinic_export_jobs WHERE clinic_id=${cid} AND actor_id=${req.actor!.id}
   ORDER BY created_at DESC LIMIT 30`;
  secure(res);res.json({jobs:rows.map(visible),scope:"administrative",
   limit:5000,expiresMinutes:5,loginFreshnessMinutes:10});
 }));
 r.get("/clinics/:clinicId/retention",task(async(req,res)=>{
  const cid=await owner(req);
  const rows=await sqlClient`SELECT requested_days,updated_at
   FROM clinic_retention_preferences WHERE clinic_id=${cid}`;
  secure(res);res.json({requestedDays:Number(rows[0]?.requested_days??1825),
   updatedAt:rows[0]?.updated_at??null,status:"proposal_only",automatedDeletion:false});
 }));
 r.put("/clinics/:clinicId/retention",task(async(req,res)=>{
  const cid=await owner(req);await recentLogin(req);
  const days=req.body?.requestedDays;
  if(![365,730,1825,3650].includes(days)||req.body?.acknowledgeNoDeletion!==true)
   fail(422,"INVALID_RETENTION_PROPOSAL");
  await sqlClient.begin(async tx=>{
   await tx`INSERT INTO clinic_retention_preferences(clinic_id,requested_days,updated_by)
    VALUES(${cid},${days},${req.actor!.id})
    ON CONFLICT(clinic_id) DO UPDATE SET requested_days=excluded.requested_days,
     updated_by=excluded.updated_by,updated_at=now()`;
   await tx`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
    VALUES(${randomUUID()},${req.actor!.id},${cid},'portability.retention.proposed','clinic',${cid},'success')`;
  });
  secure(res);res.json({requestedDays:days,status:"proposal_only",automatedDeletion:false});
 }));
 r.post("/clinics/:clinicId/exports",task(async(req,res)=>{
  const cid=await owner(req);await recentLogin(req);
  const reason=req.body?.reason;
  if(req.body?.scope!=="administrative"||req.body?.acknowledgeSensitive!==true||
    typeof reason!=="string"||reason.trim().length<12||reason.trim().length>240)
   fail(422,"INVALID_EXPORT_REQUEST");
  const id=randomUUID(),token=randomBytes(32).toString("base64url"),actor=req.actor!.id;
  const expires=new Date(Date.now()+5*60*1000);
  const issued=await sqlClient.begin(async tx=>{
   await tx`SELECT pg_advisory_xact_lock(hashtextextended(${actor},0))`;
   const count=await tx`SELECT count(*)::int AS n FROM clinic_export_jobs WHERE
    actor_id=${actor} AND created_at>now()-interval '1 hour'`;
   if(Number(count[0].n)>=4)return false;
   await tx`INSERT INTO clinic_export_jobs(id,clinic_id,actor_id,token_hash,status,reason,expires_at)
    VALUES(${id},${cid},${actor},${hash(token)},'ready',${reason.trim()},${expires.toISOString()})`;
   await tx`INSERT INTO clinic_export_events(id,clinic_id,job_id,actor_id,action)
    VALUES(${randomUUID()},${cid},${id},${actor},'created')`;
   await tx`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
    VALUES(${randomUUID()},${actor},${cid},'portability.export.created','clinic_export',${id},'success')`;
   return true;
  });
  if(!issued)fail(429,"EXPORT_RATE_LIMIT");
  secure(res);res.status(201).json({job:{id,status:"ready",expiresAt:expires.toISOString()},
   downloadPath:"/v1/portability/clinics/"+encodeURIComponent(cid)+"/exports/"+id+
    "/download?token="+encodeURIComponent(token)});
 }));
 r.get("/clinics/:clinicId/exports/:exportId/download",task(async(req,res)=>{
  const cid=await owner(req);await recentLogin(req);
  const id=req.params.exportId,token=req.query.token,actor=req.actor!.id;
  if(!validId(id)||typeof token!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(token))
   fail(404,"EXPORT_LINK_NOT_FOUND");
  const grant=await sqlClient`SELECT id FROM clinic_export_jobs
    WHERE id=${id} AND clinic_id=${cid} AND actor_id=${actor}
     AND token_hash=${hash(token)} AND status='ready' AND expires_at>now()`;
  if(!grant.length)fail(410,"EXPORT_LINK_EXPIRED_OR_USED");
  // Build only for a validated capability; validate again during atomic consumption.
  const payload=await buildExport(cid);
  const updated=await sqlClient`UPDATE clinic_export_jobs
    SET status='downloaded',downloaded_at=now()
    WHERE id=${id} AND clinic_id=${cid} AND actor_id=${actor}
      AND token_hash=${hash(token)} AND status='ready' AND expires_at>now()
    RETURNING id`;
  if(!updated.length)fail(410,"EXPORT_LINK_EXPIRED_OR_USED");
  await sqlClient`INSERT INTO clinic_export_events(id,clinic_id,job_id,actor_id,action)
   VALUES(${randomUUID()},${cid},${id},${actor},'downloaded')`;
  secure(res);
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Content-Disposition",'attachment; filename="dandanlink-clinic-export-'+id+'.json"');
  res.send(JSON.stringify(payload));
 }));
 r.post("/clinics/:clinicId/exports/:exportId/revoke",task(async(req,res)=>{
  const cid=await owner(req);await recentLogin(req);
  const id=req.params.exportId;
  if(!validId(id))fail(422,"INVALID_EXPORT_ID");
  const done=await sqlClient`UPDATE clinic_export_jobs SET status='revoked'
    WHERE id=${id} AND clinic_id=${cid} AND actor_id=${req.actor!.id}
    AND status='ready' RETURNING id`;
  if(!done.length)fail(409,"EXPORT_NOT_REVOCABLE");
  await sqlClient`INSERT INTO clinic_export_events(id,clinic_id,job_id,actor_id,action)
   VALUES(${randomUUID()},${cid},${id},${req.actor!.id},'revoked')`;
  secure(res);res.json({id,status:"revoked"});
 }));
 r.use((err:unknown,_req:StaffRequest,res:Response,next:NextFunction)=>{
  if(err&&typeof err==="object"&&"status" in err&&"code" in err){
   const e=err as AccessFault;secure(res);res.status(e.status).json({code:e.code});return;
  }
  next(err);
 });
 return r;
}
