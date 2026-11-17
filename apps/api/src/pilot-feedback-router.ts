import {randomUUID} from "node:crypto";
import {Router,type NextFunction,type Response} from "express";
import {sqlClient} from "@dandanlink/db";
import {authStaff,permission,fail,type StaffRequest,AccessFault}
 from "./staff-access.js";
import {validPilotInput,validPilotStatusChange,pilotTransition}
 from "./pilot-feedback-validation.js";

/**
 * Private, tenant-scoped structured pilot feedback.
 * No free text, media, patient identifiers or arbitrary metadata is accepted.
 * Owner/manager manage triage; status changes require MFA and optimistic revision.
 * The endpoint does NOT set or approve any PH19 healthcare release flag.
 */
const work=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
 (req:StaffRequest,res:Response,next:NextFunction)=>void fn(req,res).catch(next);
const clinic=(req:StaffRequest)=>String(req.params.clinicId);
const noStore=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
const validId=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function pilotFeedbackRouter(){
 const r=Router();
 r.use(authStaff);
 r.get("/clinics/:clinicId/observations",work(async(req,res)=>{
  const cid=clinic(req);
  await permission(req,cid,"staff.read");
  const observations=await sqlClient`SELECT id,area,symptom,severity,frequency,network,
   device,locale,status,resolution,revision,created_at AS "createdAt",
   updated_at AS "updatedAt"
   FROM clinic_pilot_observations WHERE clinic_id=${cid}
   ORDER BY created_at DESC,id DESC LIMIT 40`;
  noStore(res);res.json({observations,window:40,scope:"clinic_metadata_only"});
 }));
 r.post("/clinics/:clinicId/observations",work(async(req,res)=>{
  const cid=clinic(req);
  await permission(req,cid,"staff.read");
  if(!validPilotInput(req.body))fail(422,"INVALID_PILOT_OBSERVATION");
  const input=req.body;
  const actor=req.actor!.id,id=randomUUID();
  await sqlClient.begin(async tx=>{
   // Serialize actor-specific 20/hour enforcement to avoid concurrent bursts.
   await tx`SELECT pg_advisory_xact_lock(hashtextextended(${cid+"|"+actor},0))`;
   const rate=await tx`SELECT count(*)::int AS n FROM clinic_pilot_observations
    WHERE clinic_id=${cid} AND actor_id=${actor} AND created_at>now()-interval '1 hour'`;
   if(Number(rate[0]?.n)>=20)fail(429,"PILOT_FEEDBACK_RATE_LIMIT");
   await tx`INSERT INTO clinic_pilot_observations
    (id,clinic_id,actor_id,area,symptom,severity,frequency,network,device,locale)
    VALUES (${id},${cid},${actor},${input.area},${input.symptom},${input.severity},
    ${input.frequency},${input.network},${input.device},${input.locale})`;
   await tx`INSERT INTO clinic_pilot_observation_events
    (id,clinic_id,observation_id,actor_id,previous_status,next_status)
    VALUES (${randomUUID()},${cid},${id},${actor},NULL,'open')`;
   await tx`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
    VALUES (${randomUUID()},${actor},${cid},'pilot.observation.created',
    'pilot_observation',${id},'success')`;
  });
  noStore(res);res.status(201).json({saved:true});
 }));
 r.patch("/clinics/:clinicId/observations/:observationId",work(async(req,res)=>{
  const cid=clinic(req),id=String(req.params.observationId);
  await permission(req,cid,"staff.manage",true);
  if(!validId(id))fail(422,"INVALID_PILOT_OBSERVATION_ID");
  if(!validPilotStatusChange(req.body))fail(422,"INVALID_PILOT_STATUS");
  const {status,reason,revision}=req.body,actor=req.actor!.id;
  await sqlClient.begin(async tx=>{
   const current=await tx`SELECT status,revision FROM clinic_pilot_observations
    WHERE id=${id} AND clinic_id=${cid} FOR UPDATE`;
   if(!current.length)fail(404,"PILOT_OBSERVATION_NOT_FOUND");
   if(Number(current[0].revision)!==revision)fail(409,"STALE_PILOT_OBSERVATION");
   const previous=String(current[0].status);
   if(!pilotTransition(previous,status))fail(409,"INVALID_PILOT_TRANSITION");
   const updated=await tx`UPDATE clinic_pilot_observations
    SET status=${status},resolution=${reason},revision=revision+1,updated_at=now()
    WHERE id=${id} AND clinic_id=${cid} AND revision=${revision}
    RETURNING id,revision`;
   if(!updated.length)fail(409,"STALE_PILOT_OBSERVATION");
   await tx`INSERT INTO clinic_pilot_observation_events
    (id,clinic_id,observation_id,actor_id,previous_status,next_status)
    VALUES (${randomUUID()},${cid},${id},${actor},${previous},${status})`;
   await tx`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
    VALUES (${randomUUID()},${actor},${cid},'pilot.observation.triaged',
    'pilot_observation',${id},'success')`;
  });
  noStore(res);res.json({updated:true});
 }));
 r.use((error:unknown,_req:StaffRequest,res:Response,next:NextFunction)=>{
  if(error instanceof AccessFault){
   noStore(res);res.status(error.status).json({code:error.code});return;
  }
  next(error);
 });
 return r;
}
