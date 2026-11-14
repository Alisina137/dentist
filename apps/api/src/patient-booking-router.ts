import {createHash,randomUUID} from "node:crypto";
import {Router,type Request,type Response,type NextFunction} from "express";
import {fromNodeHeaders} from "better-auth/node";
import {sqlClient} from "@dandanlink/db";
import {auth} from "./auth.js";
import {authStaff,scope,type StaffRequest} from "./staff-access.js";
import {publicListing} from "./listing-router.js";
import {availabilityPreview} from "./operations-availability.js";

/** PH15. Only the clinic appointment table owns reservations.
 * Pending public requests don't occupy a slot; acceptance does, using the
 * existing GiST exclusion constraints (and the same per-clinic lock as PH06).
 * Public users never get a clinic patient search endpoint.
 */
type PatientReq=Request&{patientUserId?:string;patientProfile?:any};
type BookingFault=Error&{status?:number;code?:string};
class Fault extends Error {constructor(public status:number,public code:string){super(code);}}
function fail(status:number,code:string):never{throw new Fault(status,code);}
function id(v:unknown){if(typeof v!=="string"||!/^[a-zA-Z0-9_-]{8,100}$/.test(v))fail(422,"INVALID_ID");return v;}
function key(v:unknown){const s=id(v);if(s.length>100)fail(422,"INVALID_IDEMPOTENCY_KEY");return s;}
function date(v:unknown){const d=new Date(String(v));if(typeof v!=="string"||!/^\d{4}-\d\d-\d\dT/.test(v)||
 !Number.isFinite(d.getTime())||v.length>36)fail(422,"INVALID_START_AT");return d;}
function reason(v:unknown){if(typeof v!=="string"||v.trim().length<10||v.trim().length>300)fail(422,"REASON_REQUIRED");return v.trim();}
function short(v:unknown,max=120){if(typeof v!=="string"||v.trim().length<2||v.trim().length>max)fail(422,"INVALID_TEXT");return v.trim();}
function hash(v:unknown){return createHash("sha256").update(JSON.stringify(v)).digest("hex");}
const route=(fn:(req:any,res:Response)=>Promise<void>)=>(req:any,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const privateResponse=(res:Response)=>{res.setHeader("Cache-Control","private, no-store");res.setHeader("Referrer-Policy","no-referrer");};
const dayInKabul=(at:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kabul",
 year:"numeric",month:"2-digit",day:"2-digit"}).format(at);
const clockInKabul=(at:Date)=>new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
 hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(at);
function localDay(at:Date){const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
 timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(at)
 .filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));return [p.year,p.month,p.day].join("-");}

async function identity(req:PatientReq,res:Response,next:NextFunction){
 try{
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user){res.status(401).json({code:"AUTH_REQUIRED"});return;}
  if(!session.user.emailVerified){res.status(403).json({code:"EMAIL_VERIFICATION_REQUIRED"});return;}
  const [profile]=await sqlClient`SELECT user_id,preferred_name FROM patient_profiles WHERE user_id=${session.user.id}`;
  if(!profile){res.status(403).json({code:"PATIENT_ONBOARDING_REQUIRED"});return;}
  req.patientUserId=session.user.id;req.patientProfile=profile;
  next();
 }catch(error){next(error);}
}
async function clinicScheduler(req:StaffRequest,write=true){
 const clinic=id(req.params.clinicId),ctx=await scope(req,clinic);
 if(!["owner","manager","receptionist","dentist"].includes(ctx.role))fail(403,"BOOKING_ROLE_DENIED");
 if(write&&ctx.clinic.status==="suspended")fail(403,"CLINIC_SUSPENDED");
 return {clinic,ctx};
}
async function scheduleLock(tx:any,clinic:string){
 const rows=await tx`SELECT id FROM clinics WHERE id=${clinic} FOR UPDATE`;
 if(!rows.length)fail(404,"CLINIC_NOT_FOUND");
}
async function eligibleSubject(tx:any,user:string,type:string,dependentId:unknown){
 if(type==="self"&&dependentId==null){
  const [p]=await tx`SELECT preferred_name FROM patient_profiles WHERE user_id=${user}`;
  if(!p)fail(403,"PATIENT_ONBOARDING_REQUIRED");
  return {type:"self",dependentId:null,name:short(p.preferred_name)};
 }
 if(!["minor","adult_delegate"].includes(type))fail(422,"INVALID_BOOKING_PATIENT");
 const member=id(dependentId);
 const [d]=await tx`SELECT d.*,u.email_verified FROM patient_dependents d
 LEFT JOIN auth_users u ON u.id=d.adult_user_id
 WHERE d.id=${member} AND d.guardian_user_id=${user} AND d.status='active' FOR UPDATE OF d`;
 if(!d)fail(403,"FAMILY_AUTHORIZATION_REQUIRED");
 if(type==="minor"){
  if(d.member_type!=="minor"||d.authorization_basis!=="minor_guardian_attestation"||
   !d.date_of_birth)fail(403,"FAMILY_AUTHORIZATION_REQUIRED");
  const [age]=await tx`SELECT (date_part('year',age(current_date,${d.date_of_birth}::date)))::int AS years`;
  if(age.years>=18)fail(403,"MINOR_REQUIRES_ADULT_CONSENT");
 }else if(d.member_type!=="adult"||d.authorization_basis!=="adult_account_acceptance"||
  !d.email_verified)fail(403,"FAMILY_AUTHORIZATION_REQUIRED");
 return {type,dependentId:member,name:short(d.display_name)};
}
async function clinicPatient(tx:any,clinic:string,actor:string,name:string){
 // A new clinic-local registry identity, not a name/phone match to PH05 data.
 // Public booking NEVER creates a record-link grant to clinic clinical history.
 await tx`INSERT INTO clinic_patient_counters(clinic_id,next_number)
 VALUES(${clinic},1) ON CONFLICT (clinic_id) DO NOTHING`;
 const [seq]=await tx`UPDATE clinic_patient_counters
 SET next_number=next_number+1 WHERE clinic_id=${clinic}
 RETURNING next_number-1 AS n`;
 if(!seq)fail(409,"PATIENT_COUNTER_UNAVAILABLE");
 const patientId=randomUUID(),number="DL-"+String(seq.n).padStart(6,"0");
 await tx`INSERT INTO clinic_patients(id,clinic_id,patient_number,
 preferred_name,normalized_name,notice_acknowledged,notice_acknowledged_at,
 intake_source,created_by,updated_by)
 VALUES(${patientId},${clinic},${number},${name},${name.toLocaleLowerCase()},
 true,now(),'online',${actor},${actor})`;
 return patientId;
}
async function event(tx:any,clinic:string,actor:string,appointment:any,action:string,before:any=null,why:string|null=null){
 await tx`INSERT INTO clinic_appointment_events(id,clinic_id,appointment_id,
 action,before_status,after_status,before_start_at,before_end_at,
 after_start_at,after_end_at,reason,actor_id)
 VALUES(${randomUUID()},${clinic},${appointment.id},${action},
 ${before?.status||null},${appointment.status},${before?.start_at||null},
 ${before?.end_at||null},${appointment.start_at},${appointment.end_at},
 ${why},${actor})`;
 await tx`INSERT INTO audit_events(id,clinic_id,actor_id,action,subject_type,subject_id,outcome)
 VALUES(${randomUUID()},${clinic},${actor},${"booking."+action},'appointment',
 ${appointment.id},'success')`;
}
async function enqueue(tx:any,bookingId:string,user:string,name:string){
 await tx`INSERT INTO patient_booking_notifications(id,booking_id,user_id,event_name)
 VALUES(${randomUUID()},${bookingId},${user},${name})`;
}
async function bookingView(row:any){
 return {id:row.booking_id,clinicId:row.clinic_id,clinicName:row.clinic_name,
 clinicCity:row.city,clinicAddress:row.address,clinicPhone:row.phone,
 appointmentId:row.appointment_id,patientName:row.subject_name,
 subjectType:row.subject_type,startAt:row.start_at,endAt:row.end_at,
 dentistId:row.provider_membership_id,serviceId:row.service_id,
 serviceName:row.service_name,priceAfn:row.service_price_afn,
 status:row.status,approvalMode:row.approval_mode,revision:row.revision,
 createdAt:row.created_at,timezone:"Asia/Kabul",
 cancelUntil:new Date(new Date(row.start_at).getTime()-Number(row.cancellation_hours||0)*3600000).toISOString()};
}
async function myBookings(user:string,bookingId?:string){
 const rows=await sqlClient`SELECT b.id AS booking_id,b.subject_name,b.subject_type,b.dependent_id,
 b.approval_mode,b.created_at,b.clinic_id,a.id AS appointment_id,a.start_at,a.end_at,
 a.provider_membership_id,a.service_id,a.service_name,a.service_price_afn,
 a.status,a.revision,c.display_name AS clinic_name,c.city,c.address,c.phone,
 COALESCE((lv.profile->'bookingRules'->>'cancellationHours')::int,24) AS cancellation_hours
 FROM patient_public_bookings b
 JOIN clinic_appointments a ON a.id=b.appointment_id AND a.clinic_id=b.clinic_id
 JOIN clinics c ON c.id=b.clinic_id
 LEFT JOIN clinic_listing_heads lh ON lh.clinic_id=c.id
 LEFT JOIN clinic_listing_versions lv ON lv.clinic_id=c.id AND lv.version=lh.approved_version
 WHERE b.user_id=${user} AND (${bookingId||null}::text IS NULL OR b.id=${bookingId||null})
 ORDER BY a.start_at DESC,b.id LIMIT 150`;
 return Promise.all(rows.map(bookingView));
}
async function slotFor(clinic:string,serviceId:string,providerId:string,startAt:Date,
 exclude?:string){
 const start=startAt.toISOString(),day=localDay(startAt);
 const view=await availabilityPreview(clinic,{date:day,serviceId,providerId,
  excludeAppointmentId:exclude});
 const slot=view.slots.find(x=>x.startAt===start);
 if(!slot)fail(409,"BOOKING_SLOT_CONFLICT");
 return {slot,service:view.service};
}
async function listedBooking(clinicId:string,serviceId:string,providerId:string,startAt:Date){
 let listing:any;
 try{listing=await publicListing(clinicId);}catch{fail(404,"CLINIC_NOT_BOOKABLE");}
 const service=listing.profile.services.find((x:any)=>x.id===serviceId);
 const dentist=listing.profile.dentists.find((x:any)=>x.id===providerId);
 if(!service||!dentist||!dentist.verified)fail(404,"PROVIDER_NOT_BOOKABLE");
 const rules=listing.profile.bookingRules;
 if(startAt.getTime()<Date.now()+rules.minNoticeHours*3600000)
  fail(409,"BOOKING_NOTICE_WINDOW");
 const days=Math.floor((Date.parse(localDay(startAt)+"T12:00:00Z")-
  Date.parse(localDay(new Date())+"T12:00:00Z"))/86400000);
 if(days<0||days>=rules.horizonDays)fail(409,"BOOKING_OUTSIDE_HORIZON");
 const [catalog]=await sqlClient`SELECT version,base_price_afn,public_booking,active
 FROM clinic_services WHERE clinic_id=${clinicId} AND id=${serviceId}`;
 if(!catalog?.public_booking||!catalog.active||catalog.version!==service.version||
  catalog.base_price_afn!==service.priceAfn)fail(409,"SERVICE_PUBLICATION_CHANGED");
 return {rules,service,dentist};
}

export function patientBookingRouter(){
 const api=Router();
 api.use((req,res,next)=>{
  privateResponse(res);
  const origin=req.headers.origin;
  const allowed=[process.env.PATIENT_WEB_URL||"http://localhost:3002",
   process.env.CLINIC_WEB_URL||"http://localhost:3001",
   process.env.ADMIN_WEB_URL||"http://localhost:3000"];
  if(!["GET","HEAD","OPTIONS"].includes(req.method)&&origin&&!allowed.includes(origin)){
   res.status(403).json({code:"ORIGIN_DENIED"});return;
  }
  next();
 });
 const staff=Router({mergeParams:true});
 api.use("/clinics/:clinicId",authStaff,staff);

 staff.get("/requests",route(async(req:StaffRequest,res)=>{
  const {clinic,ctx}=await clinicScheduler(req,false);
  const state=String(req.query.state||"pending");
  if(!["pending","processed"].includes(state))fail(422,"INVALID_FILTER");
  const rows=await sqlClient`SELECT b.id,b.user_id,b.subject_name,b.created_at,
   a.id AS appointment_id,a.provider_membership_id,a.service_name,a.start_at,
   a.end_at,a.status,a.revision,a.service_price_afn
   FROM patient_public_bookings b JOIN clinic_appointments a ON a.id=b.appointment_id
   WHERE b.clinic_id=${clinic}
    AND (${state}='pending' AND a.status='requested'
      OR ${state}='processed' AND a.status<>'requested')
   ORDER BY b.created_at DESC LIMIT 100`;
  res.json({requests:rows.filter(x=>ctx.role!=="dentist"||
    x.provider_membership_id===ctx.membership.id).map(x=>({
    id:x.id,patientName:x.subject_name,createdAt:x.created_at,
    appointmentId:x.appointment_id,providerId:x.provider_membership_id,
    serviceName:x.service_name,startAt:x.start_at,endAt:x.end_at,
    priceAfn:x.service_price_afn,status:x.status,revision:x.revision})),filter:state});
 }));
 staff.post("/requests/:bookingId/decision",route(async(req:StaffRequest,res)=>{
  const {clinic,ctx}=await clinicScheduler(req);
  const bookingId=id(req.params.bookingId),action=req.body?.action;
  if(!["accept","reject"].includes(action))fail(422,"INVALID_DECISION");
  if(req.body?.revision==null||!Number.isInteger(req.body.revision))fail(422,"REVISION_REQUIRED");
  const why=action==="reject"?reason(req.body?.reason):null;
  const result=await sqlClient.begin(async tx=>{
   await scheduleLock(tx,clinic);
   const [row]=await tx`SELECT a.*,b.id AS booking_id,b.user_id
     FROM patient_public_bookings b JOIN clinic_appointments a ON a.id=b.appointment_id
     WHERE b.id=${bookingId} AND b.clinic_id=${clinic} FOR UPDATE OF a`;
   if(!row)fail(404,"REQUEST_NOT_FOUND");
   if(ctx.role==="dentist"&&row.provider_membership_id!==ctx.membership.id)fail(404,"REQUEST_NOT_FOUND");
   if(row.status!=="requested"||row.revision!==req.body.revision)fail(409,"REQUEST_ALREADY_PROCESSED");
   if(action==="accept"){
    await listedBooking(clinic,row.service_id,row.provider_membership_id,new Date(row.start_at));
    await slotFor(clinic,row.service_id,row.provider_membership_id,new Date(row.start_at));
   }
   const updated=await tx`UPDATE clinic_appointments SET
    status=${action==="accept"?"confirmed":"rejected"},revision=revision+1,
    updated_by=${req.actor!.id},updated_at=now()
    WHERE id=${row.id} AND clinic_id=${clinic} AND status='requested'
    RETURNING *`;
   if(updated.length!==1)fail(409,"REQUEST_ALREADY_PROCESSED");
   await event(tx,clinic,req.actor!.id,updated[0],
    action==="accept"?"accepted":"rejected",row,why);
   await enqueue(tx,row.booking_id,row.user_id,action==="accept"?"accepted":"rejected");
   return updated[0];
  });
  res.json({status:result.status,revision:result.revision,confirmed:result.status==="confirmed"});
 }));
 staff.get("/record-links",route(async(req:StaffRequest,res)=>{
  const {clinic}=await clinicScheduler(req,false);
  const links=await sqlClient`SELECT l.id,l.state,l.supplied_patient_number,l.created_at,
   l.patient_id,l.verification_method,p.preferred_name
   FROM patient_record_link_requests l JOIN patient_profiles p ON p.user_id=l.user_id
   WHERE l.clinic_id=${clinic} ORDER BY l.created_at DESC LIMIT 100`;
  res.json({links:links.map(l=>({id:l.id,state:l.state,
   suppliedPatientNumber:l.supplied_patient_number,requestedAt:l.created_at,
   patientId:l.patient_id,method:l.verification_method,applicantName:l.preferred_name}))});
 }));
 staff.post("/record-links/:linkId/decision",route(async(req:StaffRequest,res)=>{
  const {clinic,ctx}=await clinicScheduler(req);
  if(ctx.role==="dentist"&&!ctx.membership.clinicianEnabled)fail(403,"LINK_APPROVAL_DENIED");
  const link=id(req.params.linkId),action=req.body?.action;
  if(!["approve","reject"].includes(action))fail(422,"INVALID_DECISION");
  if(req.body?.verifiedInPerson!==true)fail(422,"IN_PERSON_VERIFICATION_REQUIRED");
  const method=req.body?.method;
  if(!["in_person_document","in_person_care"].includes(method))fail(422,"INVALID_PROOF_METHOD");
  const patientId=action==="approve"?id(req.body?.patientId):null;
  const note=action==="reject"?reason(req.body?.reason):null;
  const state=await sqlClient.begin(async tx=>{
   await scheduleLock(tx,clinic);
   const [item]=await tx`SELECT * FROM patient_record_link_requests
    WHERE id=${link} AND clinic_id=${clinic} FOR UPDATE`;
   if(!item)fail(404,"LINK_NOT_FOUND");
   if(item.state!=="pending")fail(409,"LINK_ALREADY_DECIDED");
   if(action==="approve"){
    // A receptionist must select a specific clinic patient after actual
    // in-person identity proof; supplied number is not an identity grant.
    const [record]=await tx`SELECT id FROM clinic_patients
      WHERE id=${patientId} AND clinic_id=${clinic}
      AND patient_number=${item.supplied_patient_number} AND status='active'`;
    if(!record)fail(409,"PATIENT_NUMBER_NOT_VERIFIED");
   }
   const rows=await tx`UPDATE patient_record_link_requests SET
    state=${action==="approve"?"approved":"rejected"},
    patient_id=${patientId},verified_by=${req.actor!.id},
    verification_method=${method},decision_note=${note},decided_at=now()
    WHERE id=${link} AND state='pending' RETURNING state`;
   await tx`INSERT INTO audit_events(id,clinic_id,actor_id,action,subject_type,subject_id,outcome)
    VALUES(${randomUUID()},${clinic},${req.actor!.id},
    ${"record_link."+action},'record_link',${link},'success')`;
   return rows[0].state;
  });
  res.json({state});
 }));
 staff.post("/record-links/:linkId/releases",route(async(req:StaffRequest,res)=>{
  const {clinic,ctx}=await clinicScheduler(req);
  if(ctx.role!=="dentist"&&ctx.role!=="owner"&&ctx.role!=="manager")
   fail(403,"RELEASE_ROLE_DENIED");
  if(ctx.role!=="dentist"&&!ctx.membership.clinicianEnabled)fail(403,"RELEASE_ROLE_DENIED");
  const link=id(req.params.linkId),resourceId=id(req.body?.resourceId);
  const kind=req.body?.kind;
  if(!["signed_encounter_summary","issued_receipt"].includes(kind))fail(422,"INVALID_RELEASE_KIND");
  const operation=req.body?.operation||"release";
  if(!["release","revoke"].includes(operation)||req.body?.patientApproved!==true)
   fail(422,"EXPLICIT_RELEASE_APPROVAL_REQUIRED");
  const result=await sqlClient.begin(async tx=>{
   await scheduleLock(tx,clinic);
   const [linked]=await tx`SELECT * FROM patient_record_link_requests
    WHERE id=${link} AND clinic_id=${clinic} AND state='approved' FOR UPDATE`;
   if(!linked)fail(404,"APPROVED_LINK_REQUIRED");
   const resource=kind==="signed_encounter_summary"?
    await tx`SELECT id FROM clinic_encounters
      WHERE clinic_id=${clinic} AND patient_id=${linked.patient_id}
      AND id=${resourceId} AND status='signed'`:
    await tx`SELECT id FROM clinic_invoices
      WHERE clinic_id=${clinic} AND patient_id=${linked.patient_id}
      AND id=${resourceId} AND status='issued'`;
   if(!resource.length)fail(404,"RELEASABLE_RECORD_NOT_FOUND");
   if(operation==="release"){
    await tx`INSERT INTO patient_record_releases
      (id,link_id,clinic_id,resource_kind,resource_id,released_by)
      VALUES(${randomUUID()},${link},${clinic},${kind},${resourceId},${req.actor!.id})
      ON CONFLICT(link_id,resource_kind,resource_id) DO UPDATE
      SET revoked_by=NULL,revoked_at=NULL,released_by=${req.actor!.id},released_at=now()`;
   }else{
    const revoked=await tx`UPDATE patient_record_releases SET revoked_at=now(),
     revoked_by=${req.actor!.id} WHERE link_id=${link} AND clinic_id=${clinic}
     AND resource_kind=${kind} AND resource_id=${resourceId}
     AND revoked_at IS NULL RETURNING id`;
    if(!revoked.length)fail(404,"RELEASE_NOT_FOUND");
   }
   await tx`INSERT INTO audit_events(id,clinic_id,actor_id,action,subject_type,subject_id,outcome)
    VALUES(${randomUUID()},${clinic},${req.actor!.id},
    ${"record_release."+operation},'record_release',${resourceId},'success')`;
   return operation;
  });
  res.json({status:result});
 }));
 staff.get("/notifications",route(async(req:StaffRequest,res)=>{
  const {clinic,ctx}=await clinicScheduler(req,false);
  if(!["owner","manager"].includes(ctx.role))fail(403,"SETTINGS_ROLE_DENIED");
  const rows=await sqlClient`SELECT n.event_name,n.status,n.attempt_count,
    n.created_at,n.sent_at,n.last_error_code
    FROM patient_booking_notifications n JOIN patient_public_bookings b ON b.id=n.booking_id
    WHERE b.clinic_id=${clinic} ORDER BY n.created_at DESC LIMIT 100`;
  res.json({deliveries:rows,emailConfigured:mailConfigured(),smsConfigured:false,pushConfigured:false});
 }));

 api.use(identity);
 api.post("/requests",route(async(req:PatientReq,res)=>{
  const user=req.patientUserId!,body=req.body||{};
  if(body.bookingConsent!==true)fail(422,"BOOKING_CONSENT_REQUIRED");
  const clinic=id(body.clinicId),serviceId=id(body.serviceId),providerId=id(body.dentistId),
    startAt=date(body.startAt),requestKey=key(body.idempotencyKey);
  const subjectType=body.subjectType||"self";
  const digest=hash({clinic,serviceId,providerId,startAt:startAt.toISOString(),
    subjectType,dependentId:body.dependentId||null});
  const result=await sqlClient.begin(async tx=>{
   await scheduleLock(tx,clinic);
   const old=await tx`SELECT id,appointment_id,request_digest FROM patient_public_bookings
     WHERE user_id=${user} AND idempotency_key=${requestKey}`;
   if(old.length){
    if(old[0].request_digest!==digest)fail(409,"IDEMPOTENCY_KEY_REUSED");
    return {id:old[0].id,replayed:true};
   }
   const patient=await eligibleSubject(tx,user,subjectType,body.dependentId);
   const listing=await listedBooking(clinic,serviceId,providerId,startAt);
   const {slot,service}=await slotFor(clinic,serviceId,providerId,startAt);
   if(service.version!==listing.service.version||service.basePriceAfn!==listing.service.priceAfn)
    fail(409,"SERVICE_PUBLICATION_CHANGED");
   const patientId=await clinicPatient(tx,clinic,user,patient.name);
   const appointmentId=randomUUID(),bookingId=randomUUID();
   const status=listing.rules.approvalMode==="auto"?"confirmed":"requested";
   const rows=await tx`INSERT INTO clinic_appointments(id,clinic_id,patient_id,service_id,
    provider_membership_id,resource_id,service_version,service_name,service_category,
    service_price_afn,service_duration_minutes,preparation_minutes,start_at,end_at,
    status,source,created_by,updated_by)
    VALUES(${appointmentId},${clinic},${patientId},${serviceId},${providerId},
    ${slot.resourceId},${service.version},${service.name},${service.category},
    ${service.basePriceAfn},${service.durationMinutes},${service.preparationMinutes},
    ${new Date(slot.startAt)},${new Date(slot.endAt)},${status},'public',${user},${user})
    RETURNING *`;
   await tx`INSERT INTO patient_public_bookings(id,appointment_id,clinic_id,user_id,
    subject_type,dependent_id,subject_name,idempotency_key,request_digest,approval_mode)
    VALUES(${bookingId},${appointmentId},${clinic},${user},${patient.type},
    ${patient.dependentId},${patient.name},${requestKey},${digest},
    ${listing.rules.approvalMode})`;
   await event(tx,clinic,user,rows[0],"created");
   await enqueue(tx,bookingId,user,status==="requested"?"requested":"confirmed");
   return {id:bookingId,replayed:false};
  });
  const [booking]=await myBookings(user,result.id);
  res.status(result.replayed?200:201).json({booking,replayed:result.replayed});
 }));
 api.get("/my",route(async(req:PatientReq,res)=>{
  res.json({appointments:await myBookings(req.patientUserId!),timezone:"Asia/Kabul"});
 }));
 api.get("/my/:bookingId",route(async(req:PatientReq,res)=>{
  const [found]=await myBookings(req.patientUserId!,id(req.params.bookingId));
  if(!found)fail(404,"BOOKING_NOT_FOUND");
  res.json({booking:found});
 }));
 api.post("/my/:bookingId/cancel",route(async(req:PatientReq,res)=>{
  const user=req.patientUserId!,booking=id(req.params.bookingId);
  if(!Number.isInteger(req.body?.revision))fail(422,"REVISION_REQUIRED");
  const why=reason(req.body?.reason);
  const result=await sqlClient.begin(async tx=>{
   const [pointer]=await tx`SELECT clinic_id FROM patient_public_bookings
    WHERE id=${booking} AND user_id=${user}`;
   if(!pointer)fail(404,"BOOKING_NOT_FOUND");
   await scheduleLock(tx,pointer.clinic_id);
   const [before]=await tx`SELECT a.*,b.id AS booking_id,b.user_id
    FROM patient_public_bookings b JOIN clinic_appointments a ON a.id=b.appointment_id
    WHERE b.id=${booking} AND b.user_id=${user} FOR UPDATE OF a`;
   if(!["requested","confirmed"].includes(before.status)||before.revision!==req.body.revision)
    fail(409,"BOOKING_CANNOT_CANCEL");
   if(before.status==="confirmed"){
    const listed=await listedBooking(before.clinic_id,before.service_id,
      before.provider_membership_id,new Date(before.start_at)).catch(()=>null);
    const cancellationHours=listed?.rules?.cancellationHours??24;
    if(Date.parse(before.start_at)-Date.now()<cancellationHours*3600000)
     fail(409,"CANCELLATION_DEADLINE_PASSED");
   }
   const updated=await tx`UPDATE clinic_appointments SET status='cancelled',
    revision=revision+1,cancelled_at=now(),updated_by=${user},updated_at=now()
    WHERE id=${before.id} AND revision=${before.revision} RETURNING *`;
   await event(tx,before.clinic_id,user,updated[0],"cancelled",before,why);
   await enqueue(tx,booking,user,"cancelled");
   return updated[0];
  });
  res.json({status:result.status,revision:result.revision});
 }));
 api.post("/my/:bookingId/reschedule",route(async(req:PatientReq,res)=>{
  const user=req.patientUserId!,booking=id(req.params.bookingId);
  const startAt=date(req.body?.startAt);
  if(!Number.isInteger(req.body?.revision))fail(422,"REVISION_REQUIRED");
  const why=reason(req.body?.reason);
  const result=await sqlClient.begin(async tx=>{
   const [pointer]=await tx`SELECT clinic_id FROM patient_public_bookings
    WHERE id=${booking} AND user_id=${user}`;
   if(!pointer)fail(404,"BOOKING_NOT_FOUND");
   await scheduleLock(tx,pointer.clinic_id);
   const [before]=await tx`SELECT a.*,b.id AS booking_id,b.subject_type,b.dependent_id
    FROM patient_public_bookings b JOIN clinic_appointments a ON a.id=b.appointment_id
    WHERE b.id=${booking} AND b.user_id=${user} FOR UPDATE OF a`;
   if(!["requested","confirmed"].includes(before.status)||before.revision!==req.body.revision)
    fail(409,"BOOKING_CANNOT_RESCHEDULE");
   await eligibleSubject(tx,user,before.subject_type,before.dependent_id);
   const listed=await listedBooking(before.clinic_id,before.service_id,
    before.provider_membership_id,startAt);
   if(before.status==="confirmed"&&Date.parse(before.start_at)-Date.now()<
     listed.rules.cancellationHours*3600000)fail(409,"RESCHEDULE_DEADLINE_PASSED");
   const {slot}=await slotFor(before.clinic_id,before.service_id,
    before.provider_membership_id,startAt,before.id);
   // The paid estimate and duration are immutable after initial booking;
   // if a service changes, require clinic-managed reschedule rather than alter price silently.
   if(before.service_version!==listed.service.version||
      before.service_price_afn!==listed.service.priceAfn)fail(409,"SERVICE_PUBLICATION_CHANGED");
   const updated=await tx`UPDATE clinic_appointments SET start_at=${new Date(slot.startAt)},
    end_at=${new Date(slot.endAt)},resource_id=${slot.resourceId},
    revision=revision+1,updated_by=${user},updated_at=now()
    WHERE id=${before.id} AND revision=${before.revision} RETURNING *`;
   await event(tx,before.clinic_id,user,updated[0],"rescheduled",before,why);
   await enqueue(tx,booking,user,"rescheduled");
   return updated[0];
  });
  res.json({status:result.status,revision:result.revision,startAt:result.start_at});
 }));
 api.get("/notifications",route(async(req:PatientReq,res)=>{
  const rows=await sqlClient`SELECT event_name,status,attempt_count,created_at,sent_at
    FROM patient_booking_notifications WHERE user_id=${req.patientUserId!}
    ORDER BY created_at DESC LIMIT 100`;
  res.json({events:rows,emailConfigured:mailConfigured(),smsConfigured:false,pushConfigured:false});
 }));
 api.post("/record-links",route(async(req:PatientReq,res)=>{
  const user=req.patientUserId!,clinic=id(req.body?.clinicId),
    number=short(req.body?.patientNumber,40);
  if(req.body?.explicitConsent!==true||req.body?.identityProofAcknowledged!==true)
   fail(422,"LINK_CONSENT_REQUIRED");
  // An applicant-supplied number alone cannot prove identity; never automatically search
  // or return any clinical record, even when the number happens to match.
  try{await publicListing(clinic);}catch{fail(404,"CLINIC_NOT_AVAILABLE");}
  const link=await sqlClient.begin(async tx=>{
   await scheduleLock(tx,clinic);
   const existing=await tx`SELECT id,state FROM patient_record_link_requests
     WHERE user_id=${user} AND clinic_id=${clinic} AND state IN ('pending','approved')`;
   if(existing.length)return existing[0];
   const newId=randomUUID();
   await tx`INSERT INTO patient_record_link_requests(id,clinic_id,user_id,
    supplied_patient_number,consent_at)
    VALUES(${newId},${clinic},${user},${number},now())`;
   await tx`INSERT INTO patient_consent_events(id,user_id,subject_type,subject_id,
    consent,policy_version,actor_id)
    VALUES(${randomUUID()},${user},'data_access',${newId},true,'patient-link-proof-v1',${user})`;
   return {id:newId,state:"pending"};
  });
  res.status(202).json({id:link.id,state:link.state,
   notice:"Clinic must separately verify identity in person and expressly approve each record release."});
 }));
 api.get("/record-links",route(async(req:PatientReq,res)=>{
  const user=req.patientUserId!;
  const links=await sqlClient`SELECT l.id,l.clinic_id,c.display_name AS clinic_name,
   l.state,l.created_at,l.decided_at
   FROM patient_record_link_requests l JOIN clinics c ON c.id=l.clinic_id
   WHERE l.user_id=${user} ORDER BY l.created_at DESC LIMIT 100`;
  res.json({links:links.map(l=>({id:l.id,clinicId:l.clinic_id,
   clinicName:l.clinic_name,state:l.state,requestedAt:l.created_at,
   decidedAt:l.decided_at})),automaticMatching:false});
 }));
 api.post("/record-links/:linkId/revoke",route(async(req:PatientReq,res)=>{
  const user=req.patientUserId!,link=id(req.params.linkId);
  const result=await sqlClient`UPDATE patient_record_link_requests SET state='revoked',
    decided_at=now() WHERE id=${link} AND user_id=${user}
    AND state IN ('pending','approved') RETURNING id`;
  if(!result.length)fail(404,"LINK_NOT_FOUND");
  res.json({revoked:true});
 }));
 api.get("/records",route(async(req:PatientReq,res)=>{
  const user=req.patientUserId!;
  const encounters=await sqlClient`SELECT l.id AS link_id,r.id AS release_id,
    c.display_name AS clinic_name,e.id AS resource_id,
    e.signed_at,e.reason,e.assessment,e.performed_procedures
    FROM patient_record_link_requests l
    JOIN patient_record_releases r ON r.link_id=l.id AND r.revoked_at IS NULL
      AND r.resource_kind='signed_encounter_summary'
    JOIN clinic_encounters e ON e.id=r.resource_id AND e.patient_id=l.patient_id
      AND e.clinic_id=l.clinic_id AND e.status='signed'
    JOIN clinics c ON c.id=l.clinic_id
    WHERE l.user_id=${user} AND l.state='approved'
    ORDER BY e.signed_at DESC LIMIT 100`;
  const receipts=await sqlClient`SELECT l.id AS link_id,r.id AS release_id,
    c.display_name AS clinic_name,i.id AS resource_id,i.invoice_number,
    i.total_afn,i.issued_at,i.due_date
    FROM patient_record_link_requests l
    JOIN patient_record_releases r ON r.link_id=l.id AND r.revoked_at IS NULL
      AND r.resource_kind='issued_receipt'
    JOIN clinic_invoices i ON i.id=r.resource_id AND i.patient_id=l.patient_id
      AND i.clinic_id=l.clinic_id AND i.status='issued'
    JOIN clinics c ON c.id=l.clinic_id
    WHERE l.user_id=${user} AND l.state='approved'
    ORDER BY i.issued_at DESC LIMIT 100`;
  res.json({summaries:encounters.map(x=>({id:x.release_id,clinicName:x.clinic_name,
    signedAt:x.signed_at,reason:x.reason,assessment:x.assessment,
    procedures:x.performed_procedures})),
   receipts:receipts.map(x=>({id:x.release_id,clinicName:x.clinic_name,
    invoiceNumber:x.invoice_number,totalAfn:x.total_afn,
    issuedAt:x.issued_at,dueDate:x.due_date})),releasedOnly:true});
 }));
 api.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof Fault){res.status(error.status).json({code:error.code});return;}
  const sqlError=error as {code?:string;cause?:{code?:string}};
  if(sqlError?.code==="23P01"||sqlError?.cause?.code==="23P01"){
   res.status(409).json({code:"BOOKING_SLOT_CONFLICT"});return;
  }
  if(sqlError?.code==="23505"||sqlError?.cause?.code==="23505"){
   res.status(409).json({code:"DUPLICATE_REQUEST"});return;
  }
  console.error("PH15 booking error",error instanceof Error?error.name:"unknown");
  res.status(500).json({code:"BOOKING_SERVICE_UNAVAILABLE"});
 });
 return api;
}
function mailConfigured(){
 return Boolean(process.env.SMTP_HOST&&process.env.SMTP_FROM&&
  process.env.SMTP_USER&&process.env.SMTP_PASSWORD);
}
