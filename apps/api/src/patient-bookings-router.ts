import {createHash,randomUUID} from "node:crypto";
import {Router,type Request,type Response,type NextFunction} from "express";
import {fromNodeHeaders} from "better-auth/node";
import {sqlClient} from "@dandanlink/db";
import {auth} from "./auth.js";
import {publicListing} from "./listing-router.js";
import {availabilityPreview} from "./operations-availability.js";

type PatientReq=Request&{userId?:string;profile?:any};
type Db=any;
type Booking=any;
class Fault extends Error {constructor(public status:number,public code:string){super(code)}}
function fail(status:number,code:string):never{throw new Fault(status,code)}
const execute=(fn:(req:PatientReq,res:Response)=>Promise<void>)=>
 (req:PatientReq,res:Response,next:NextFunction)=>{fn(req,res).catch(next)};
const query=(tx:Db,statement:string,values:unknown[]=[])=>tx.unsafe(statement,values);
const id=(v:unknown)=>{
 if(typeof v!=="string"||!/^[A-Za-z0-9_-]{8,100}$/.test(v))fail(422,"INVALID_ID");
 return v as string;
};
const digest=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const noStore=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
const dateInKabul=(d:Date)=>{
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(d).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 return [parts.year,parts.month,parts.day].join("-");
};
async function patientSession(req:PatientReq,res:Response,next:NextFunction){
 try{
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user){res.status(401).json({code:"AUTH_REQUIRED"});return;}
  if(!session.user.emailVerified){res.status(403).json({code:"EMAIL_VERIFICATION_REQUIRED"});return;}
  const [profile]=await query(sqlClient,"SELECT * FROM patient_profiles WHERE user_id=$1",[session.user.id]);
  if(!profile){res.status(403).json({code:"PATIENT_ONBOARDING_REQUIRED"});return;}
  req.userId=session.user.id;req.profile=profile;next();
 }catch(error){next(error);}
}
async function family(tx:Db,user:string,dependent:string|null){
 if(!dependent)return {name:null,dob:null,subjectUser:user};
 const [dep]=await query(tx,"SELECT * FROM patient_dependents WHERE id=$1 AND guardian_user_id=$2 FOR UPDATE",[dependent,user]);
 if(!dep||dep.status!=="active")fail(403,"FAMILY_AUTHORITY_REQUIRED");
 if(dep.member_type==="minor"){
  const born=String(dep.date_of_birth).slice(0,10),today=dateInKabul(new Date());
  const age=Number(today.slice(0,4))-Number(born.slice(0,4))-
   (today.slice(5)<born.slice(5)?1:0);
  if(age>=18)fail(403,"ADULT_INDEPENDENT_CONSENT_REQUIRED");
  return {name:dep.display_name,dob:born,subjectUser:null};
 }
 if(dep.member_type!=="adult"||!dep.adult_user_id)fail(403,"FAMILY_AUTHORITY_REQUIRED");
 return {name:dep.display_name,dob:null,subjectUser:dep.adult_user_id};
}
async function slot(clinic:string,service:string,provider:string,iso:string){
 const publicData=await publicListing(clinic);
 const published=publicData.profile.services.find(s=>s.id===service);
 if(!published||!publicData.profile.dentists.some(d=>d.id===provider))
  fail(404,"PUBLISHED_PROVIDER_OR_SERVICE_REQUIRED");
 const start=new Date(iso);
 if(!Number.isFinite(start.getTime())||start.toISOString()!==iso)
  fail(422,"INVALID_SLOT_START");
 const rules=publicData.profile.bookingRules;
 if(start.getTime()<Date.now()+Number(rules.minNoticeHours)*3600000)
  fail(409,"MINIMUM_NOTICE_NOT_MET");
 if(start.getTime()>Date.now()+Number(rules.horizonDays)*86400000)
  fail(422,"BOOKING_OUTSIDE_HORIZON");
 const available=await availabilityPreview(clinic,{
  date:dateInKabul(start),serviceId:service,providerId:provider
 });
 const chosen=available.slots.find(s=>s.startAt===iso);
 if(!chosen||available.service.version!==published.version||
    available.service.basePriceAfn!==published.priceAfn)fail(409,"BOOKING_SLOT_UNAVAILABLE");
 return {chosen,available,rules};
}
async function recordEvent(tx:Db,booking:string,actor:string,action:string){
 await query(tx,"INSERT INTO patient_booking_events(id,booking_id,actor_id,action) VALUES($1,$2,$3,$4)",
  [randomUUID(),booking,actor,action]);
 await query(tx,"INSERT INTO patient_booking_outbox(id,booking_id,recipient_user_id,event_type) SELECT $1,id,owner_user_id,$2 FROM patient_online_bookings WHERE id=$3",
  [randomUUID(),action,booking]);
}
async function ensureClinicPatient(tx:Db,booking:Booking,actor:string){
 const familySubject=await family(tx,booking.owner_user_id,booking.dependent_id);
 const [existing]=await query(tx,"SELECT clinic_patient_id FROM patient_booking_subjects WHERE clinic_id=$1 AND owner_user_id=$2 AND dependent_id IS NOT DISTINCT FROM $3 FOR UPDATE",
  [booking.clinic_id,booking.owner_user_id,booking.dependent_id]);
 if(existing)return existing.clinic_patient_id as string;
 const [owner]=await query(tx,"SELECT preferred_name,city,phone FROM patient_profiles WHERE user_id=$1",[booking.owner_user_id]);
 if(!owner)fail(403,"PATIENT_ONBOARDING_REQUIRED");
 const name=familySubject.name||owner.preferred_name;
 await query(tx,"INSERT INTO clinic_patient_counters(clinic_id,next_number) VALUES($1,1) ON CONFLICT(clinic_id) DO NOTHING",[booking.clinic_id]);
 const [counter]=await query(tx,"UPDATE clinic_patient_counters SET next_number=next_number+1 WHERE clinic_id=$1 RETURNING next_number-1 AS value",[booking.clinic_id]);
 if(!counter||counter.value>=2147483646)fail(409,"PATIENT_NUMBER_EXHAUSTED");
 const patientId=randomUUID(),number="P-"+String(counter.value).padStart(6,"0");
 await query(tx,"INSERT INTO clinic_patients(id,clinic_id,patient_number,preferred_name,normalized_name,phone,city,date_of_birth,notice_acknowledged,intake_source,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,'online',$9,$9)",
  [patientId,booking.clinic_id,number,name,String(name).toLowerCase(),
    booking.dependent_id?null:owner.phone,owner.city,familySubject.dob,actor]);
 await query(tx,"INSERT INTO patient_booking_subjects(id,clinic_id,owner_user_id,dependent_id,subject_user_id,clinic_patient_id) VALUES($1,$2,$3,$4,$5,$6)",
  [randomUUID(),booking.clinic_id,booking.owner_user_id,booking.dependent_id,familySubject.subjectUser,patientId]);
 return patientId;
}
async function confirm(tx:Db,booking:Booking,actor:string){
 // Called under clinic row lock. PH06 appointment exclusion constraint remains the final arbiter.
 const current=await slot(booking.clinic_id,booking.service_id,booking.provider_id,
  new Date(booking.start_at).toISOString());
 const patient=await ensureClinicPatient(tx,booking,actor);
 const appointment=randomUUID();
 await query(tx,"INSERT INTO clinic_appointments(id,clinic_id,patient_id,service_id,provider_membership_id,resource_id,service_version,service_name,service_category,service_price_afn,service_duration_minutes,preparation_minutes,start_at,end_at,status,source,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'confirmed','online',$15,$15)",
  [appointment,booking.clinic_id,patient,booking.service_id,booking.provider_id,
   current.chosen.resourceId,current.available.service.version,current.available.service.name,
   current.available.service.category,current.available.service.basePriceAfn,
   current.available.service.durationMinutes,current.available.service.preparationMinutes,
   current.chosen.startAt,current.chosen.endAt,actor]);
 await query(tx,"INSERT INTO clinic_appointment_events(id,clinic_id,appointment_id,action,after_status,after_start_at,after_end_at,actor_id) VALUES($1,$2,$3,'created','confirmed',$4,$5,$6)",
  [randomUUID(),booking.clinic_id,appointment,current.chosen.startAt,current.chosen.endAt,actor]);
 await query(tx,"UPDATE patient_online_bookings SET appointment_id=$1,status='confirmed',revision=revision+1,updated_at=now() WHERE id=$2",[appointment,booking.id]);
 await recordEvent(tx,booking.id,actor,"confirmed");
}
function safe(row:Booking){
 return {id:row.id,clinicId:row.clinic_id,dependentId:row.dependent_id,
  serviceId:row.service_id,dentistId:row.provider_id,
  startAt:row.start_at,endAt:row.end_at,serviceName:row.service_name,
  priceAfn:row.price_afn,status:row.status,revision:row.revision,
  appointmentId:row.appointment_id,createdAt:row.created_at,
  decisionReason:row.decision_reason};
}
export function patientBookingsRouter(){
 const api=Router();
 api.use((req,res,next)=>{
  if(!["GET","HEAD","OPTIONS"].includes(req.method)){
   const origin=req.headers.origin,allowed=process.env.PATIENT_WEB_URL||"http://localhost:3002";
   if(origin&&origin!==allowed){res.status(403).json({code:"ORIGIN_DENIED"});return;}
  }next();
 });
 api.use(patientSession);
 api.get("/",execute(async(req,res)=>{
  const rows=await query(sqlClient,"SELECT * FROM patient_online_bookings WHERE owner_user_id=$1 ORDER BY created_at DESC LIMIT 100",[req.userId!]);
  noStore(res);res.json({bookings:rows.map(safe),timezone:"Asia/Kabul"});
 }));
 api.get("/:bookingId",execute(async(req,res)=>{
  const [booking]=await query(sqlClient,"SELECT * FROM patient_online_bookings WHERE id=$1 AND owner_user_id=$2",
   [id(req.params.bookingId),req.userId!]);
  if(!booking)fail(404,"BOOKING_NOT_FOUND");
  noStore(res);res.json({booking:safe(booking)});
 }));
 api.post("/",execute(async(req,res)=>{
  const clinic=id(req.body?.clinicId),service=id(req.body?.serviceId),
   dentist=id(req.body?.dentistId),key=id(req.body?.idempotencyKey),
   dependent=req.body?.dependentId==null?null:id(req.body.dependentId);
  const start=req.body?.startAt;
  if(typeof start!=="string")fail(422,"INVALID_SLOT_START");
  if(req.body?.consent!==true)fail(422,"BOOKING_CONSENT_REQUIRED");
  const hash=digest({clinic,service,dentist,dependent,start,consent:true});
  const [prior]=await query(sqlClient,"SELECT * FROM patient_online_bookings WHERE owner_user_id=$1 AND idempotency_key=$2",
   [req.userId!,key]);
  if(prior){
   if(prior.request_digest!==hash)fail(409,"IDEMPOTENCY_KEY_REUSED");
   noStore(res);res.json({booking:safe(prior),replayed:true});return;
  }
  const preview=await slot(clinic,service,dentist,start);
  let booking:Booking;
  try{
   booking=await sqlClient.begin(async tx=>{
    await query(tx,"SELECT id FROM clinics WHERE id=$1 FOR UPDATE",[clinic]);
    await family(tx,req.userId!,dependent);
    const [existing]=await query(tx,"SELECT * FROM patient_online_bookings WHERE owner_user_id=$1 AND idempotency_key=$2",[req.userId!,key]);
    if(existing){
     if(existing.request_digest!==hash)fail(409,"IDEMPOTENCY_KEY_REUSED");
     return existing;
    }
    const bookingId=randomUUID();
    const [created]=await query(tx,"INSERT INTO patient_online_bookings(id,clinic_id,owner_user_id,dependent_id,service_id,provider_id,start_at,end_at,service_name,price_afn,status,idempotency_key,request_digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *",
     [bookingId,clinic,req.userId!,dependent,service,dentist,
      preview.chosen.startAt,preview.chosen.endAt,preview.available.service.name,
      preview.available.service.basePriceAfn,preview.rules.approvalMode==="manual"?"pending":"confirmed",
      key,hash]);
    await recordEvent(tx,created.id,req.userId!,"requested");
    if(preview.rules.approvalMode==="auto")await confirm(tx,created,req.userId!);
    const [result]=await query(tx,"SELECT * FROM patient_online_bookings WHERE id=$1",[created.id]);
    return result;
   });
  }catch(err:any){
   if(["23P01","23505"].includes(err?.code)||["23P01","23505"].includes(err?.cause?.code))
    fail(409,"BOOKING_SLOT_UNAVAILABLE");
   throw err;
  }
  noStore(res);res.status(201).json({booking:safe(booking)});
 }));
 api.post("/:bookingId/cancel",execute(async(req,res)=>{
  const bookingId=id(req.params.bookingId);
  const reason=typeof req.body?.reason==="string"?req.body.reason.trim():"Patient cancellation";
  if(reason.length<5||reason.length>300)fail(422,"CANCELLATION_REASON_REQUIRED");
  const row=await sqlClient.begin(async tx=>{
   const [booking]=await query(tx,"SELECT * FROM patient_online_bookings WHERE id=$1 AND owner_user_id=$2 FOR UPDATE",
    [bookingId,req.userId!]);
   if(!booking)fail(404,"BOOKING_NOT_FOUND");
   if(booking.status==="cancelled")return booking;
   if(!["confirmed","pending"].includes(booking.status))fail(409,"BOOKING_CANNOT_CANCEL");
   if(req.body?.revision!==booking.revision)fail(409,"STALE_BOOKING_REVISION");
   await family(tx,req.userId!,booking.dependent_id);
   const published=await publicListing(booking.clinic_id);
   const cutoff=Number(published.profile.bookingRules.cancellationHours)*3600000;
   if(booking.status==="confirmed"&&Date.parse(booking.start_at)<Date.now()+cutoff)
    fail(409,"CANCELLATION_WINDOW_CLOSED");
   if(booking.appointment_id){
    const [appointment]=await query(tx,"SELECT * FROM clinic_appointments WHERE id=$1 AND clinic_id=$2 FOR UPDATE",
     [booking.appointment_id,booking.clinic_id]);
    if(!appointment||appointment.status!=="confirmed")fail(409,"APPOINTMENT_CANNOT_CANCEL");
    await query(tx,"UPDATE clinic_appointments SET status='cancelled',revision=revision+1,cancelled_at=now(),updated_by=$1,updated_at=now() WHERE id=$2",
     [req.userId!,appointment.id]);
    await query(tx,"INSERT INTO clinic_appointment_events(id,clinic_id,appointment_id,action,before_status,after_status,before_start_at,before_end_at,after_start_at,after_end_at,reason,actor_id) VALUES($1,$2,$3,'cancelled','confirmed','cancelled',$4,$5,$4,$5,$6,$7)",
     [randomUUID(),booking.clinic_id,appointment.id,appointment.start_at,appointment.end_at,reason,req.userId!]);
   }
   const [result]=await query(tx,"UPDATE patient_online_bookings SET status='cancelled',revision=revision+1,decision_reason=$1,updated_at=now() WHERE id=$2 RETURNING *",[reason,bookingId]);
   await recordEvent(tx,bookingId,req.userId!,"cancelled");
   return result;
  });
  noStore(res);res.json({booking:safe(row)});
 }));
 api.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof Fault){res.status(error.status).json({code:error.code});return;}
  console.error("PH15 booking failure",error instanceof Error?error.name:"unknown");
  res.status(500).json({code:"BOOKING_UNAVAILABLE"});
 });
 return api;
}
