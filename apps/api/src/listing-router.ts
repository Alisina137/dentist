import {Router,type Request,type Response,type NextFunction} from "express";
import {randomUUID,createHash} from "node:crypto";
import {fromNodeHeaders} from "better-auth/node";
import {eq} from "drizzle-orm";
import {db,schema,sqlClient} from "@dandanlink/db";
import {auth} from "./auth.js";
import {authStaff,scope,AccessFault,type StaffRequest} from "./staff-access.js";
import {permitsUnverifiedEmail} from "./email-policy.js";
import {availabilityPreview} from "./operations-availability.js";

/** PH12: no clinical records; no public search or booking until PH13/15. */
type AdminRequest=Request&{reviewer?:{id:string;name:string}};
class ListingFault extends Error{constructor(public status:number,public code:string){super(code);}}
function fail(status:number,code:string):never{throw new ListingFault(status,code);}
const task=<T extends Request>(fn:(req:T,res:Response)=>Promise<void>)=>
 (req:T,res:Response,next:NextFunction)=>{fn(req,res).catch(next)};
const cId=(r:Request)=>String(r.params.clinicId);
const noStore=(r:Response)=>r.setHeader("Cache-Control","private, no-store");
const pubCache=(r:Response)=>r.setHeader("Cache-Control","public, max-age=30");
const string=(v:unknown,min:number,max:number,name:string)=>{
 if(typeof v!=="string"||v.trim().length<min||v.trim().length>max)fail(422,"INVALID_"+name);
 return v.trim();
};
const opt=(v:unknown,max:number,name:string):string|null=>v==null||v===""?null:string(v,1,max,name);
const uint=(v:unknown,min:number,max:number,name:string):number=>{
 if(typeof v!=="number"||!Number.isInteger(v)||v<min||v>max)fail(422,"INVALID_"+name);return v;
};
const date=(v:unknown)=>{const s=string(v,10,10,"DATE");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+"T12:00:00Z"))||
  new Date(s+"T12:00:00Z").toISOString().slice(0,10)!==s)fail(422,"INVALID_DATE");
 return s;};
const today=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
 timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"})
 .formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join("-");};
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
async function log(tx:any,clinic:string,actor:string,action:string,subject:string,version:number|null=null,reason:string|null=null){
 await tx`INSERT INTO clinic_listing_events(id,clinic_id,version,action,reason,actor_id)
 VALUES(${randomUUID()},${clinic},${version},${action},${reason},${actor})`;
 await tx`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
 VALUES(${randomUUID()},${actor},${clinic},${"listing."+action},'marketplace_listing',${subject},'success')`;
}
async function credentialLog(tx:any,clinic:string,membership:string,submission:string|null,
 actor:string,decision:string,reason:string,reviewBasis:string|null=null){
 await tx`INSERT INTO clinic_dentist_credential_decisions(id,clinic_id,membership_id,
 submission_id,decision,reason,review_basis,actor_id)
 VALUES(${randomUUID()},${clinic},${membership},${submission},${decision},
 ${reason},${reviewBasis},${actor})`;
 await tx`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
 VALUES(${randomUUID()},${actor},${clinic},${"credential."+decision},
  'professional_verification',${membership},'success')`;
}
async function clinicAccess(req:StaffRequest,edit=false){
 const ctx=await scope(req,cId(req));
 if(!["owner","manager"].includes(ctx.role))fail(403,"LISTING_STAFF_FORBIDDEN");
 if(edit){
  if(ctx.clinic.status==="suspended")fail(403,"CLINIC_SUSPENDED");
  const sub=await db.query.clinicSubscription.findFirst({
   where:eq(schema.clinicSubscription.clinicId,cId(req))});
  if(!sub||sub.status==="cancelled")fail(403,"SUBSCRIPTION_REQUIRED");
  const plan=await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,sub.planVersionId)});
  if(!plan)fail(403,"SUBSCRIPTION_REQUIRED");
  const end=sub.status==="trialing"?sub.trialEndsAt:sub.currentPeriodEndsAt;
  if(end&&end.getTime()+(sub.status==="trialing"?0:plan.graceDays*86400000)<Date.now())
   fail(403,"SUBSCRIPTION_EXPIRED");
 }
 return ctx;
}
async function adminAuth(req:AdminRequest,_res:Response,next:NextFunction){
 try{
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user||!permitsUnverifiedEmail(session.user.emailVerified))
   fail(401,"AUTH_REQUIRED");
  const m=await db.query.platformAdmin.findFirst({where:eq(schema.platformAdmin.userId,session.user.id)});
  const factor=m&&!m.revokedAt?
   await db.query.twoFactor.findFirst({where:eq(schema.twoFactor.userId,session.user.id)}):null;
  if(!m||m.revokedAt||!session.user.twoFactorEnabled||!factor?.verified)
   fail(403,"ADMIN_MFA_REQUIRED");
  req.reviewer={id:session.user.id,name:session.user.name};next();
 }catch(e){next(e);}
}
type Document={name:string;mime:string;bytes:Buffer;sha:string};
function document(data:any,mode:"credential"|"photo"):Document{
 if(!data||typeof data!=="object")fail(422,"DOCUMENT_REQUIRED");
 const name=string(data.fileName,3,120,"FILE_NAME");
 if(/[\\/\x00-\x1F\x7F]/u.test(name))fail(422,"INVALID_FILE_NAME");
 const mime=string(data.mimeType,9,40,"MIME");
 const validTypes=mode==="photo"?["image/jpeg","image/png"]:
  ["application/pdf","image/jpeg","image/png"];
 if(!validTypes.includes(mime))fail(415,"DOCUMENT_MIME_NOT_ALLOWED");
 const base=string(data.contentBase64,8,2200000,"FILE_BYTES");
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(base)||base.length%4!==0)fail(422,"INVALID_BASE64");
 const bytes=Buffer.from(base,"base64");
 if(bytes.length<8||bytes.length>(mode==="photo"?1048576:1572864))fail(413,"FILE_TOO_LARGE");
 if(mime==="application/pdf"&&bytes.subarray(0,5).toString()!=="%PDF-")
  fail(415,"DOCUMENT_SIGNATURE_MISMATCH");
 if(mime==="image/png"&&!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
  fail(415,"DOCUMENT_SIGNATURE_MISMATCH");
 if(mime==="image/jpeg"&&!(bytes[0]===255&&bytes[1]===216&&bytes[2]===255))
  fail(415,"DOCUMENT_SIGNATURE_MISMATCH");
 return {name,mime,bytes,sha:hash(bytes)};
}
async function membership(tx:any,clinic:string,id:string){
 const [m]=await tx`SELECT m.id,m.clinic_id,m.user_id,m.role,m.clinician_enabled,m.status,
 d.display_name,d.specialty,d.qualifications,d.professional_license,d.experience_years,
 d.biography,d.draft_version,u.name AS account_name
 FROM clinic_memberships m LEFT JOIN clinic_dentist_drafts d ON d.membership_id=m.id
 JOIN auth_users u ON u.id=m.user_id
 WHERE m.id=${id} AND m.clinic_id=${clinic} LIMIT 1`;
 if(!m)fail(404,"DENTIST_NOT_FOUND");
 if(m.status!=="active"||!(m.role==="dentist"||m.clinician_enabled))
  fail(409,"ACTIVE_DENTIST_AFFILIATION_REQUIRED");
 if(!m.draft_version||!m.display_name||!m.professional_license)
  fail(409,"DENTIST_PROFILE_REQUIRED");
 return m;
}
async function verifiedDentist(tx:any,clinic:string,membershipId:string){
 const m=await membership(tx,clinic,membershipId);
 const [v]=await tx`SELECT status,current_submission_id,approved_draft_version,valid_until,
 verified_snapshot FROM clinic_dentist_credential_cases
 WHERE clinic_id=${clinic} AND membership_id=${membershipId}`;
 if(!v||v.status!=="verified"||v.approved_draft_version!==m.draft_version||
  !v.valid_until||String(v.valid_until).slice(0,10)<today())
  fail(409,"CURRENT_DENTIST_VERIFICATION_REQUIRED");
 return {...v,membershipId,displayName:m.display_name,
  specialty:m.specialty,qualifications:m.qualifications,
  approvedSnapshot:v.verified_snapshot};
}
const LIMIT=8;
type Profile={description:string;specialties:string[];photoIds:{id:string;caption:string}[];
 dentistIds:string[];serviceIds:string[];bookingRules:{approvalMode:"auto"|"manual";
 minNoticeHours:number;horizonDays:number;cancellationHours:number;bufferMinutes:number};
 latitude:number|null;longitude:number|null;contactNote:string|null};
function ids(v:unknown,max:number,name:string):string[]{
 if(!Array.isArray(v)||v.length>max)fail(422,"INVALID_"+name);
 const list=v.map((x:unknown)=>string(x,8,100,name));
 if(new Set(list).size!==list.length)fail(422,"DUPLICATE_"+name);
 return list;
}
function profile(v:any):Profile{
 if(!v||typeof v!=="object")fail(422,"INVALID_PROFILE");
 const specialties=Array.isArray(v.specialties)?v.specialties.map((x:any)=>
  string(x,2,70,"SPECIALTY")):[];
 if(specialties.length>8||new Set(specialties).size!==specialties.length)
  fail(422,"INVALID_SPECIALTIES");
 const photoIds:{id:string;caption:string}[]=Array.isArray(v.photoIds)?v.photoIds.map((x:any)=>({
  id:string(x?.id,8,100,"PHOTO_ID"),caption:opt(x?.caption,160,"CAPTION")||""
 })):[];
 if(photoIds.length>LIMIT||new Set(photoIds.map(x=>x.id)).size!==photoIds.length)
  fail(422,"INVALID_PHOTO_SELECTION");
 const rules=v.bookingRules||{};
 const approvalMode=rules.approvalMode==="auto"?"auto":"manual";
 if(rules.approvalMode!=="auto"&&rules.approvalMode!=="manual")
  fail(422,"INVALID_APPROVAL_MODE");
 const lat=v.latitude==null||v.latitude===""?null:Number(v.latitude),
  lon=v.longitude==null||v.longitude===""?null:Number(v.longitude);
 if(lat!==null&&(!Number.isFinite(lat)||lat<-90||lat>90))fail(422,"INVALID_LATITUDE");
 if(lon!==null&&(!Number.isFinite(lon)||lon<-180||lon>180))fail(422,"INVALID_LONGITUDE");
 if((lat===null)!==(lon===null))fail(422,"LOCATION_COORDINATES_PAIR_REQUIRED");
 return {description:string(v.description,10,2200,"DESCRIPTION"),specialties,
  photoIds,dentistIds:ids(v.dentistIds,30,"DENTISTS"),
  serviceIds:ids(v.serviceIds,40,"SERVICES"),
  bookingRules:{approvalMode,minNoticeHours:uint(rules.minNoticeHours,0,72,"MIN_NOTICE"),
   horizonDays:uint(rules.horizonDays,1,90,"HORIZON"),
   cancellationHours:uint(rules.cancellationHours,0,168,"CANCELLATION"),
   bufferMinutes:uint(rules.bufferMinutes,0,120,"BUFFER")},
  latitude:lat,longitude:lon,contactNote:opt(v.contactNote,300,"CONTACT_NOTE")};
}
async function head(tx:any,clinic:string){
 const [h]=await tx`SELECT * FROM clinic_listing_heads WHERE clinic_id=${clinic}`;
 return h||null;
}
async function version(tx:any,clinic:string,v:number|null){
 if(v==null)return null;
 const [r]=await tx`SELECT id,version,status,profile,approved_dentists,approved_services,submitted_at,reviewed_at,
  decision_reason,created_at FROM clinic_listing_versions
  WHERE clinic_id=${clinic} AND version=${v}`;
 return r||null;
}
async function photos(tx:any,clinic:string){
 return tx`SELECT id,mime_type,size_bytes,file_name,created_at FROM clinic_listing_photos
 WHERE clinic_id=${clinic} ORDER BY created_at DESC,id DESC LIMIT 60`;
}
async function listingEvents(tx:any,clinic:string){
 return tx`SELECT e.version,e.action,e.reason,e.created_at,u.name AS actor_name
 FROM clinic_listing_events e JOIN auth_users u ON u.id=e.actor_id
 WHERE e.clinic_id=${clinic} ORDER BY e.created_at DESC LIMIT 100`;
}
async function check(tx:any,clinic:string,data:Profile,slots=false){
 const issues:string[]=[];
 const [c]=await tx`SELECT id,display_name,province,city,address,phone,email,status
  FROM clinics WHERE id=${clinic}`;
 if(!c)fail(404,"CLINIC_NOT_FOUND");
 if(c.status!=="approved")issues.push("CLINIC_MUST_BE_APPROVED");
 if(!c.city||!c.address||!c.phone)issues.push("CLINIC_CONTACT_LOCATION_REQUIRED");
 if(data.latitude===null||data.longitude===null)issues.push("MAP_COORDINATES_REQUIRED");
 if(data.dentistIds.length<1)issues.push("VERIFIED_DENTIST_REQUIRED");
 if(data.serviceIds.length<1)issues.push("PUBLIC_SERVICE_REQUIRED");
 if(!data.photoIds.length)issues.push("PRIMARY_PHOTO_REQUIRED");
 if(!data.specialties.length)issues.push("SPECIALTY_REQUIRED");
 const dentists:any[]=[],services:any[]=[];
 for(const id of data.dentistIds){
  try{const verified=await verifiedDentist(tx,clinic,id);
   dentists.push({id,displayName:verified.approvedSnapshot?.displayName||verified.displayName,
    specialty:verified.approvedSnapshot?.specialty||verified.specialty,
    qualifications:verified.approvedSnapshot?.qualifications||null,
    verified:true,validUntil:verified.valid_until});
  }catch{issues.push("DENTIST_VERIFICATION_INVALID");}
 }
 for(const id of data.serviceIds){
  const [s]=await tx`SELECT id,name,category,duration_minutes,base_price_afn,
   version,active,public_booking,requires_chair FROM clinic_services
   WHERE clinic_id=${clinic} AND id=${id}`;
  if(!s||!s.active||!s.public_booking)issues.push("SERVICE_NOT_PUBLIC");
  else services.push({id:s.id,name:s.name,category:s.category,
   requiresChair:s.requires_chair,durationMinutes:s.duration_minutes,priceAfn:s.base_price_afn,version:s.version});
 }
 for(const photo of data.photoIds){
  const [file]=await tx`SELECT id FROM clinic_listing_photos
   WHERE clinic_id=${clinic} AND id=${photo.id}`;
  if(!file)issues.push("PHOTO_NOT_IN_CLINIC");
 }
 const [hours]=await tx`SELECT EXISTS(SELECT 1 FROM clinic_weekly_hours
  WHERE clinic_id=${clinic} AND is_open=true) AS clinic_hours,
  EXISTS(SELECT 1 FROM clinic_provider_hours h JOIN clinic_memberships m
   ON m.id=h.membership_id AND m.clinic_id=h.clinic_id
   WHERE h.clinic_id=${clinic} AND h.is_open=true AND
    m.status='active' AND (m.role='dentist' OR m.clinician_enabled)) AS provider_hours`;
 if(!hours?.clinic_hours)issues.push("CLINIC_HOURS_REQUIRED");
 if(!hours?.provider_hours)issues.push("PROVIDER_HOURS_REQUIRED");
 const [resources]=await tx`SELECT count(*)::integer AS n FROM clinic_resources
 WHERE clinic_id=${clinic} AND kind='chair' AND active=true`;
 if(services.some(x=>x.requiresChair)&&!resources?.n)issues.push("ACTIVE_CHAIR_REQUIRED");
 if(slots&&issues.length===0){
  let found=false;
  for(let n=0;n<Math.min(data.bookingRules.horizonDays,8)&&!found;n++){
   const tomorrow=new Date(Date.parse(today()+"T12:00:00Z")+n*86400000)
    .toISOString().slice(0,10);
   for(const d of dentists){if(found)break;for(const s of services){
    try{
     const view=await availabilityPreview(clinic,{date:tomorrow,providerId:d.id,serviceId:s.id});
     if(view.slots.some(x=>Date.parse(x.startAt)>Date.now()+
       data.bookingRules.minNoticeHours*3600000)){found=true;break;}
    }catch{/* No real slot; never invent availability. */}
   }}
  }
  if(!found)issues.push("REAL_AVAILABILITY_REQUIRED");
 }
 return {ready:issues.length===0,issues,clinic:c,dentists,services,bookable:false,
  publicBookingsEnabled:false};
}
function safeStatus(value:any){
 if(!value)return {status:"unverified",currentSubmissionId:null,validUntil:null};
 return {status:value.status,currentSubmissionId:value.current_submission_id,
  validUntil:value.valid_until,approvedDraftVersion:value.approved_draft_version,
  reviewedAt:value.reviewed_at};
}
export async function publicListing(clinic:string){
 const [h]=await sqlClient`SELECT * FROM clinic_listing_heads WHERE clinic_id=${clinic}`;
 if(!h||h.hidden||h.approved_version==null)fail(404,"PUBLIC_LISTING_NOT_FOUND");
 const v=await version(sqlClient,clinic,h.approved_version);
 if(!v||v.status!=="approved")fail(404,"PUBLIC_LISTING_NOT_FOUND");
 const data=v.profile as Profile;
 const c=await check(sqlClient,clinic,data,false);
 if(!c.ready)fail(404,"PUBLIC_LISTING_UNAVAILABLE");
 if(!Array.isArray(v.approved_dentists)||!Array.isArray(v.approved_services))
  fail(404,"PUBLIC_REVIEW_SNAPSHOT_MISSING");
 if(c.services.some(s=>!v.approved_services.some((p:any)=>p.id===s.id&&
    p.version===s.version&&p.priceAfn===s.priceAfn)))
  fail(404,"PUBLIC_SERVICE_PRICE_CHANGED");
 if(c.dentists.some(d=>!v.approved_dentists.some((p:any)=>p.id===d.id)))
  fail(404,"PUBLIC_CREDENTIAL_CHANGED");
 const [sub]=await sqlClient`SELECT s.status,s.trial_ends_at,s.current_period_ends_at,
 p.grace_days FROM clinic_subscriptions s
 JOIN platform_plan_versions p ON p.id=s.plan_version_id
 WHERE s.clinic_id=${clinic}`;
 if(!sub||sub.status==="cancelled"||
  (sub.status==="trialing"&&sub.trial_ends_at&&
   new Date(sub.trial_ends_at).getTime()<Date.now())||
  (sub.status!=="trialing"&&sub.current_period_ends_at&&
   new Date(sub.current_period_ends_at).getTime()+sub.grace_days*86400000<Date.now()))
  fail(404,"PUBLIC_LISTING_UNAVAILABLE");
 return {clinic:{id:clinic,name:c.clinic.display_name,province:c.clinic.province,
   city:c.clinic.city,address:c.clinic.address,phone:c.clinic.phone},
  profile:{description:data.description,specialties:data.specialties,
   latitude:data.latitude,longitude:data.longitude,contactNote:data.contactNote,
   photos:data.photoIds.map(x=>({id:x.id,caption:x.caption,
    url:"/v1/listings/public/clinics/"+clinic+"/photos/"+x.id})),
   dentists:v.approved_dentists,services:v.approved_services,bookingRules:data.bookingRules},
  version:h.approved_version,publishedAt:h.published_at,verifiedClinic:true,
  publicBookingsEnabled:false,appointmentsNotReleasedUntil:"PH15",
  searchable:true,reviewedContent:true};
}
export function listingRouter(){
 const api=Router();
 api.use((req,res,next)=>{
  const origin=req.headers.origin;
  if(!["GET","HEAD","OPTIONS"].includes(req.method)&&origin&&![
    process.env.CLINIC_WEB_URL||"http://localhost:3000",
    process.env.ADMIN_WEB_URL||"http://localhost:3001",
    process.env.PATIENT_WEB_URL||"http://localhost:3002"].includes(origin)){
    res.status(403).json({code:"ORIGIN_DENIED"});return;
  }next();
 });
 api.get("/public/clinics/:clinicId",task(async(req,res)=>{
  const item=await publicListing(cId(req));pubCache(res);res.json(item);
 }));
 api.get("/public/clinics/:clinicId/photos/:photoId",task(async(req,res)=>{
  const item=await publicListing(cId(req));
  if(!item.profile.photos.some(x=>x.id===String(req.params.photoId)))
   fail(404,"PHOTO_NOT_PUBLISHED");
  const [file]=await sqlClient`SELECT content_bytes,mime_type,size_bytes,sha256_hex
   FROM clinic_listing_photos WHERE clinic_id=${cId(req)} AND id=${String(req.params.photoId)}`;
  if(!file)fail(404,"PHOTO_NOT_PUBLISHED");
  const bytes=Buffer.from(file.content_bytes);
  if(bytes.length!==file.size_bytes||hash(bytes)!==file.sha256_hex)
   fail(500,"PHOTO_INTEGRITY_ERROR");
  pubCache(res);res.setHeader("X-Content-Type-Options","nosniff");
  res.type(file.mime_type).send(bytes);
 }));
 const clinic=Router({mergeParams:true});
 api.use("/clinics/:clinicId",authStaff,clinic);
 clinic.get("/workspace",task<StaffRequest>(async(req,res)=>{
  await clinicAccess(req);
  const c=cId(req),h=await head(sqlClient,c);
  const [draft,pending,approved,assets,events,clinicInfo]=await Promise.all([
   version(sqlClient,c,h?.draft_version??null),version(sqlClient,c,h?.pending_version??null),
   version(sqlClient,c,h?.approved_version??null),photos(sqlClient,c),listingEvents(sqlClient,c),
   db.query.clinic.findFirst({where:eq(schema.clinic.id,c)})
  ]);
  const selected=(draft||pending||approved)?.profile as Profile|undefined;
  const checklist=selected?await check(sqlClient,c,selected,true):null;
  noStore(res);res.json({head:h||{clinic_id:c,revision:0,draft_version:null,
   pending_version:null,approved_version:null,hidden:false},draft,pending,approved,
   photos:assets,events,checklist,clinic:{
    name:clinicInfo?.displayName,city:clinicInfo?.city,province:clinicInfo?.province,
    address:clinicInfo?.address,phone:clinicInfo?.phone,status:clinicInfo?.status
   }, publicPath:"/v1/listings/public/clinics/"+c});
 }));
 clinic.get("/dentists",task<StaffRequest>(async(req,res)=>{
  await clinicAccess(req);
  const rows=await sqlClient`SELECT m.id,m.status AS affiliation_status,
   m.role,m.clinician_enabled,d.display_name,d.specialty,d.qualifications,
   d.professional_license,d.draft_version,
   v.status AS verification_status,v.current_submission_id,v.approved_draft_version,
   v.valid_until,v.reviewed_at
   FROM clinic_memberships m JOIN clinic_dentist_drafts d ON d.membership_id=m.id
   LEFT JOIN clinic_dentist_credential_cases v ON v.membership_id=m.id
   WHERE m.clinic_id=${cId(req)} AND (m.role='dentist' OR m.clinician_enabled)
   ORDER BY d.display_name LIMIT 150`;
  noStore(res);res.json({dentists:rows.map(x=>({
   ...x,currentlyVerified:x.verification_status==="verified"&&
    x.approved_draft_version===x.draft_version&&
    String(x.valid_until||"").slice(0,10)>=today()&&x.affiliation_status==="active"
  }))});
 }));
 clinic.get("/dentists/:membershipId/credential",task<StaffRequest>(async(req,res)=>{
  const ctx=await scope(req,cId(req));
  const id=String(req.params.membershipId);
  const m=await membership(sqlClient,cId(req),id);
  if(!["owner","manager"].includes(ctx.role)&&m.user_id!==req.actor!.id)
   fail(403,"CREDENTIAL_SELF_OR_OWNER_REQUIRED");
  const [state]=await sqlClient`SELECT * FROM clinic_dentist_credential_cases
   WHERE membership_id=${id} AND clinic_id=${cId(req)}`;
  const history=await sqlClient`SELECT decision,reason,created_at,review_basis FROM
   clinic_dentist_credential_decisions WHERE membership_id=${id} AND clinic_id=${cId(req)}
   ORDER BY created_at DESC LIMIT 30`;
  noStore(res);res.json({verification:safeStatus(state),decisions:history});
 }));
 clinic.post("/dentists/:membershipId/credentials",task<StaffRequest>(async(req,res)=>{
  const ctx=await scope(req,cId(req));
  const m=await membership(sqlClient,cId(req),String(req.params.membershipId));
  if(!["owner","manager"].includes(ctx.role)&&m.user_id!==req.actor!.id)
   fail(403,"CREDENTIAL_SUBMISSION_DENIED");
  if(ctx.clinic.status==="suspended")fail(403,"CLINIC_SUSPENDED");
  const credentials=document(req.body?.evidence,"credential");
  const type=string(req.body?.credentialType,3,100,"CREDENTIAL_TYPE"),
   number=string(req.body?.credentialNumber,3,120,"CREDENTIAL_NUMBER"),
   validUntil=date(req.body?.validUntil);
  if(validUntil<=today())fail(422,"CREDENTIAL_ALREADY_EXPIRED");
  const attestation=req.body?.attested===true;
  if(!attestation)fail(422,"DOCUMENT_ATTESTATION_REQUIRED");
  const id=randomUUID();
  await sqlClient.begin(async tx=>{
   const [existing]=await tx`SELECT * FROM clinic_dentist_credential_cases
    WHERE membership_id=${m.id} AND clinic_id=${cId(req)} FOR UPDATE`;
   if(existing?.status==="pending")fail(409,"CREDENTIAL_ALREADY_PENDING");
   await tx`INSERT INTO clinic_dentist_credential_cases(membership_id,clinic_id,status)
    VALUES(${m.id},${cId(req)},'unverified')
    ON CONFLICT(membership_id) DO NOTHING`;
   await tx`INSERT INTO clinic_dentist_credential_submissions
    (id,clinic_id,membership_id,draft_version,credential_type,credential_number,
     valid_until,file_name,mime_type,size_bytes,content_bytes,sha256_hex,submitted_by)
    VALUES(${id},${cId(req)},${m.id},${m.draft_version},${type},${number},
    ${validUntil}::date,${credentials.name},${credentials.mime},
    ${credentials.bytes.length},
    decode(${credentials.bytes.toString("base64")},'base64'),${credentials.sha},
    ${req.actor!.id})`;
   await tx`UPDATE clinic_dentist_credential_cases SET current_submission_id=${id},
    status='pending',approved_draft_version=NULL,verified_snapshot=NULL,
    reviewed_by=NULL,reviewed_at=NULL,valid_until=NULL,updated_at=now()
    WHERE membership_id=${m.id} AND clinic_id=${cId(req)}`;
   await credentialLog(tx,cId(req),m.id,id,req.actor!.id,"submitted",
    "Professional submitted declared credential evidence for independent review");
  });
  noStore(res);res.status(201).json({submissionId:id,status:"pending",draftVersion:m.draft_version,
   externalRegistryMatchVerified:false});
 }));
 clinic.post("/photos",task<StaffRequest>(async(req,res)=>{
  await clinicAccess(req,true);
  if(req.body?.rightsAttested!==true)fail(422,"PHOTO_RIGHTS_ATTESTATION_REQUIRED");
  const doc=document(req.body?.image,"photo"),id=randomUUID();
  await sqlClient.begin(async tx=>{
   const [count]=await tx`SELECT count(*)::integer AS n FROM clinic_listing_photos
    WHERE clinic_id=${cId(req)}`;
   if(count.n>=60)fail(409,"PHOTO_STORAGE_LIMIT");
   await tx`INSERT INTO clinic_listing_photos
   (id,clinic_id,mime_type,size_bytes,file_name,sha256_hex,content_bytes,uploaded_by)
   VALUES(${id},${cId(req)},${doc.mime},${doc.bytes.length},
   ${doc.name},${doc.sha},decode(${doc.bytes.toString("base64")},'base64'),${req.actor!.id})`;
   await tx`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
    VALUES(${randomUUID()},${req.actor!.id},${cId(req)},'listing.photo.uploaded',
    'marketplace_photo',${id},'success')`;
  });
  noStore(res);res.status(201).json({id,fileName:doc.name,mimeType:doc.mime,sizeBytes:doc.bytes.length,
   previewPath:"/v1/listings/clinics/"+cId(req)+"/photos/"+id});
 }));
 clinic.get("/photos/:photoId",task<StaffRequest>(async(req,res)=>{
  await clinicAccess(req);
  const [f]=await sqlClient`SELECT content_bytes,mime_type,size_bytes,sha256_hex
   FROM clinic_listing_photos
   WHERE id=${String(req.params.photoId)} AND clinic_id=${cId(req)}`;
  if(!f)fail(404,"PHOTO_NOT_FOUND");
  const bytes=Buffer.from(f.content_bytes);
  if(bytes.length!==f.size_bytes||hash(bytes)!==f.sha256_hex)fail(500,"PHOTO_INTEGRITY_FAILED");
  noStore(res);res.setHeader("X-Content-Type-Options","nosniff");res.type(f.mime_type).send(bytes);
 }));
 clinic.put("/draft",task<StaffRequest>(async(req,res)=>{
  await clinicAccess(req,true);
  const data=profile(req.body?.profile),revision=uint(req.body?.revision,0,1000000,"REVISION");
  let number=0;
  await sqlClient.begin(async tx=>{
   await tx`INSERT INTO clinic_listing_heads(clinic_id) VALUES(${cId(req)})
    ON CONFLICT(clinic_id) DO NOTHING`;
   const [h]=await tx`SELECT * FROM clinic_listing_heads
    WHERE clinic_id=${cId(req)} FOR UPDATE`;
   if(h.revision!==revision)fail(409,"STALE_LISTING_REVISION");
   if(h.pending_version!==null)fail(409,"LISTING_REVIEW_IN_PROGRESS");
   // Validate ownership of selected media; incomplete dentist/service data may be saved as draft.
   for(const photo of data.photoIds){
    const [found]=await tx`SELECT id FROM clinic_listing_photos
     WHERE id=${photo.id} AND clinic_id=${cId(req)}`;
    if(!found)fail(422,"PHOTO_NOT_IN_CLINIC");
   }
   const [max]=await tx`SELECT coalesce(max(version),0)::integer AS n FROM clinic_listing_versions
    WHERE clinic_id=${cId(req)}`;
   number=max.n+1;
   await tx`INSERT INTO clinic_listing_versions(id,clinic_id,version,status,profile,created_by)
    VALUES(${randomUUID()},${cId(req)},${number},'draft',
     ${JSON.stringify(data)}::jsonb,${req.actor!.id})`;
   await tx`UPDATE clinic_listing_heads SET revision=revision+1,draft_version=${number},
    updated_at=now() WHERE clinic_id=${cId(req)}`;
   await log(tx,cId(req),req.actor!.id,"saved",cId(req),number);
  });
  noStore(res);res.json({draftVersion:number,revision:revision+1,status:"draft"});
 }));
 clinic.post("/submit",task<StaffRequest>(async(req,res)=>{
  await clinicAccess(req,true);
  const revision=uint(req.body?.revision,1,1000000,"REVISION");
  let versionId=0;
  await sqlClient.begin(async tx=>{
   const [h]=await tx`SELECT * FROM clinic_listing_heads
    WHERE clinic_id=${cId(req)} FOR UPDATE`;
   if(!h||h.revision!==revision)fail(409,"STALE_LISTING_REVISION");
   if(h.pending_version!==null||h.draft_version===null)
    fail(409,"LISTING_DRAFT_NOT_READY");
   const v=await version(tx,cId(req),h.draft_version);
   if(v?.status!=="draft")fail(409,"LISTING_DRAFT_NOT_READY");
   const validation=await check(tx,cId(req),v.profile,true);
   if(!validation.ready)fail(422,"LISTING_INCOMPLETE_"+validation.issues[0]);
   versionId=v.version;
   await tx`UPDATE clinic_listing_versions SET status='pending',submitted_at=now()
    WHERE clinic_id=${cId(req)} AND version=${v.version}`;
   await tx`UPDATE clinic_listing_heads SET pending_version=${v.version},
    draft_version=NULL,revision=revision+1,updated_at=now()
    WHERE clinic_id=${cId(req)}`;
   await log(tx,cId(req),req.actor!.id,"submitted",cId(req),v.version);
  });
  noStore(res);res.json({status:"pending",submittedVersion:versionId,
   previouslyPublishedRemainsAvailable:true});
 }));
 clinic.get("/preview",task<StaffRequest>(async(req,res)=>{
  await clinicAccess(req);
  const h=await head(sqlClient,cId(req));
  const requested=String(req.query.version||"draft");
  const v=await version(sqlClient,cId(req),requested==="published"?h?.approved_version:
   requested==="pending"?h?.pending_version:h?.draft_version);
  if(!v)fail(404,"PREVIEW_NOT_FOUND");
  const checked=await check(sqlClient,cId(req),v.profile,false);
  const clinicInfo=checked.clinic;
  noStore(res);res.json({version:v.version,status:v.status,previewOnly:true,
   publicBookingsEnabled:false,clinic:{name:clinicInfo.display_name,
    city:clinicInfo.city,province:clinicInfo.province,address:clinicInfo.address,
    phone:clinicInfo.phone},profile:v.profile,checklist:checked});
 }));
 const admin=Router();api.use("/admin",adminAuth,admin);
 admin.get("/dentists",task<AdminRequest>(async(req,res)=>{
  const filter=String(req.query.status||"pending");
  if(!["all","pending","verified","rejected","needs_changes","revoked"].includes(filter))
   fail(422,"INVALID_STATUS");
  const q=String(req.query.q||"").trim().slice(0,100);
  const rows=await sqlClient`SELECT v.membership_id,v.clinic_id,v.status,v.valid_until,v.reviewed_at,
   v.current_submission_id,s.credential_type,s.credential_number,s.created_at AS submitted_at,
   c.display_name AS clinic_name,c.city,c.province,d.display_name,d.specialty,
   d.draft_version,m.status AS affiliation_status
   FROM clinic_dentist_credential_cases v
   JOIN clinics c ON c.id=v.clinic_id
   JOIN clinic_memberships m ON m.id=v.membership_id AND m.clinic_id=v.clinic_id
   JOIN clinic_dentist_drafts d ON d.membership_id=m.id
   LEFT JOIN clinic_dentist_credential_submissions s ON s.id=v.current_submission_id
   WHERE (${filter}='all' OR v.status=${filter}) AND
    (${q}='' OR d.display_name ILIKE ${"%"+q+"%"} OR
     c.display_name ILIKE ${"%"+q+"%"} OR c.city ILIKE ${"%"+q+"%"})
   ORDER BY v.updated_at DESC,v.membership_id LIMIT 150`;
  noStore(res);res.json({dentists:rows});
 }));
 admin.get("/dentists/:membershipId",task<AdminRequest>(async(req,res)=>{
  const id=String(req.params.membershipId);
  const [v]=await sqlClient`SELECT c.*,m.clinic_id,m.user_id,m.role,m.status AS affiliation_status,
   d.display_name,d.specialty,d.qualifications,d.professional_license,
   d.biography,d.draft_version,cl.display_name AS clinic_name,cl.city,cl.status AS clinic_status
   FROM clinic_dentist_credential_cases c
   JOIN clinic_memberships m ON m.id=c.membership_id AND m.clinic_id=c.clinic_id
   JOIN clinic_dentist_drafts d ON d.membership_id=m.id
   JOIN clinics cl ON cl.id=m.clinic_id
   WHERE c.membership_id=${id}`;
  if(!v)fail(404,"VERIFICATION_NOT_FOUND");
  const submissions=await sqlClient`SELECT id,draft_version,credential_type,credential_number,
   valid_until,file_name,mime_type,size_bytes,created_at
   FROM clinic_dentist_credential_submissions WHERE membership_id=${id}
   AND clinic_id=${v.clinic_id} ORDER BY created_at DESC LIMIT 25`;
  const decisions=await sqlClient`SELECT x.decision,x.reason,x.review_basis,x.created_at,
   u.name AS reviewer_name FROM clinic_dentist_credential_decisions x
   JOIN auth_users u ON u.id=x.actor_id WHERE x.membership_id=${id}
   ORDER BY x.created_at DESC LIMIT 60`;
  noStore(res);res.json({verification:v,submissions,decisions});
 }));
 admin.get("/dentists/:membershipId/evidence/:submissionId",task<AdminRequest>(async(req,res)=>{
  const id=String(req.params.membershipId),submissionId=String(req.params.submissionId);
  const [v]=await sqlClient`SELECT d.content_bytes,d.mime_type,d.size_bytes,d.sha256_hex,d.clinic_id
   FROM clinic_dentist_credential_submissions d
   WHERE d.membership_id=${id} AND d.id=${submissionId}`;
  if(!v)fail(404,"CREDENTIAL_EVIDENCE_NOT_FOUND");
  const bytes=Buffer.from(v.content_bytes);
  if(bytes.length!==v.size_bytes||hash(bytes)!==v.sha256_hex)fail(500,"EVIDENCE_INTEGRITY_FAILED");
  await sqlClient`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
   VALUES(${randomUUID()},${req.reviewer!.id},${v.clinic_id},'credential.evidence.viewed',
   'professional_credential',${submissionId},'success')`;
  noStore(res);res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Content-Disposition",'attachment; filename="private-professional-evidence"');
  res.type(v.mime_type).send(bytes);
 }));
 admin.post("/dentists/:membershipId/decision",task<AdminRequest>(async(req,res)=>{
  const id=String(req.params.membershipId);
  const action=string(req.body?.action,6,20,"ACTION");
  if(!["approve","reject","needs_changes","revoke"].includes(action))
   fail(422,"INVALID_DECISION");
  const reason=string(req.body?.reason,10,700,"DECISION_REASON");
  const basis=action==="approve"?string(req.body?.reviewBasis,15,700,"REVIEW_BASIS"):null;
  if(action==="approve"&&req.body?.confirmation!=="VERIFY")
   fail(422,"VERIFICATION_CONFIRMATION_REQUIRED");
  await sqlClient.begin(async tx=>{
   const [v]=await tx`SELECT * FROM clinic_dentist_credential_cases
    WHERE membership_id=${id} FOR UPDATE`;
   if(!v)fail(404,"VERIFICATION_NOT_FOUND");
   if(action==="revoke"&&v.status!=="verified")fail(409,"NOT_VERIFIED");
   if(action!=="revoke"&&v.status!=="pending")fail(409,"NO_PENDING_CREDENTIAL_REVIEW");
   let m:any=null,submission:any=null;
   if(action==="approve"){
    m=await membership(tx,v.clinic_id,id);
    const [c]=await tx`SELECT status FROM clinics WHERE id=${v.clinic_id}`;
    if(c?.status!=="approved")fail(409,"CLINIC_APPROVAL_REQUIRED");
    [submission]=await tx`SELECT * FROM clinic_dentist_credential_submissions
     WHERE id=${v.current_submission_id} AND membership_id=${id} AND clinic_id=${v.clinic_id}`;
    if(!submission||submission.draft_version!==m.draft_version)
     fail(409,"PROFESSIONAL_PROFILE_CHANGED_REVIEW_AGAIN");
    if(String(submission.valid_until).slice(0,10)<=today())
     fail(409,"CREDENTIAL_EXPIRED");
    const snap={displayName:m.display_name,specialty:m.specialty,
     qualifications:m.qualifications,professionalLicense:m.professional_license,
     biography:m.biography,experienceYears:m.experience_years,
     credentialType:submission.credential_type,
     credentialNumber:submission.credential_number,
     draftVersion:submission.draft_version};
    await tx`UPDATE clinic_dentist_credential_cases SET
     status='verified',approved_draft_version=${m.draft_version},
     valid_until=${submission.valid_until}::date,verified_snapshot=${JSON.stringify(snap)}::jsonb,
     reviewed_by=${req.reviewer!.id},reviewed_at=now(),updated_at=now()
     WHERE membership_id=${id}`;
   }else{
    const status=action==="reject"?"rejected":action==="needs_changes"?"needs_changes":"revoked";
    await tx`UPDATE clinic_dentist_credential_cases SET status=${status},
     approved_draft_version=NULL,verified_snapshot=NULL,valid_until=NULL,
     reviewed_by=${req.reviewer!.id},reviewed_at=now(),updated_at=now()
     WHERE membership_id=${id}`;
   }
   await credentialLog(tx,v.clinic_id,id,v.current_submission_id,req.reviewer!.id,
    action==="approve"?"approved":action==="reject"?"rejected":action==="revoke"?"revoked":action,reason,basis);
  });
  noStore(res);res.json({membershipId:id,status:action==="approve"?"verified":
   action==="reject"?"rejected":action==="revoke"?"revoked":"needs_changes",
   externalRegistryMatchVerified:false,reviewedBy:req.reviewer!.name});
 }));
 admin.get("/listings",task<AdminRequest>(async(req,res)=>{
  const status=String(req.query.status||"pending");
  if(!["all","pending","published","hidden"].includes(status))fail(422,"INVALID_STATUS");
  const q=String(req.query.q||"").trim().slice(0,100);
  const rows=await sqlClient`SELECT h.*,c.display_name,c.city,c.province,c.status AS clinic_status,
   pend.profile AS pending_profile,live.profile AS live_profile,
   pend.submitted_at FROM clinic_listing_heads h
   JOIN clinics c ON c.id=h.clinic_id
   LEFT JOIN clinic_listing_versions pend ON pend.clinic_id=h.clinic_id
    AND pend.version=h.pending_version
   LEFT JOIN clinic_listing_versions live ON live.clinic_id=h.clinic_id
    AND live.version=h.approved_version
   WHERE (${status}='all' OR
    (${status}='pending' AND h.pending_version IS NOT NULL) OR
    (${status}='published' AND h.approved_version IS NOT NULL AND h.hidden=false) OR
    (${status}='hidden' AND h.hidden=true))
    AND (${q}='' OR c.display_name ILIKE ${"%"+q+"%"} OR c.city ILIKE ${"%"+q+"%"})
   ORDER BY coalesce(pend.submitted_at,h.updated_at) DESC LIMIT 150`;
  noStore(res);res.json({listings:rows.map(x=>({clinicId:x.clinic_id,clinicName:x.display_name,
   city:x.city,province:x.province,clinicStatus:x.clinic_status,
   pendingVersion:x.pending_version,approvedVersion:x.approved_version,
   hidden:x.hidden,submittedAt:x.submitted_at,publishedAt:x.published_at,
   changedFields:x.pending_profile?
    Object.keys(x.pending_profile).filter(k=>JSON.stringify(x.pending_profile[k])!==
     JSON.stringify(x.live_profile?.[k])):[]}))});
 }));
 admin.get("/listings/:clinicId",task<AdminRequest>(async(req,res)=>{
  const id=cId(req),[c]=await sqlClient`SELECT id,display_name,status,city,province,address
    FROM clinics WHERE id=${id}`;
  if(!c)fail(404,"CLINIC_NOT_FOUND");
  const h=await head(sqlClient,id);
  if(!h)fail(404,"LISTING_NOT_FOUND");
  const [pending,approved,draft,events]=await Promise.all([
   version(sqlClient,id,h.pending_version),version(sqlClient,id,h.approved_version),
   version(sqlClient,id,h.draft_version),listingEvents(sqlClient,id)]);
  let readiness=null;
  if(pending)readiness=await check(sqlClient,id,pending.profile,true);
  noStore(res);res.json({clinic:c,head:h,pending,approved,draft,events,readiness});
 }));
 admin.get("/listings/:clinicId/photos/:photoId",task<AdminRequest>(async(req,res)=>{
  const [f]=await sqlClient`SELECT content_bytes,mime_type,size_bytes,sha256_hex
   FROM clinic_listing_photos WHERE clinic_id=${cId(req)} AND id=${String(req.params.photoId)}`;
  if(!f)fail(404,"PHOTO_NOT_FOUND");
  const bytes=Buffer.from(f.content_bytes);
  if(bytes.length!==f.size_bytes||hash(bytes)!==f.sha256_hex)fail(500,"PHOTO_INTEGRITY_FAILED");
  noStore(res);res.setHeader("X-Content-Type-Options","nosniff");res.type(f.mime_type).send(bytes);
 }));
 admin.post("/listings/:clinicId/decision",task<AdminRequest>(async(req,res)=>{
  const action=string(req.body?.action,4,15,"ACTION");
  if(!["approve","reject","hide","restore"].includes(action))fail(422,"INVALID_ACTION");
  const reason=string(req.body?.reason,10,500,"MODERATION_REASON"),
   revision=uint(req.body?.revision,1,1000000,"REVISION");
  let result="";
  await sqlClient.begin(async tx=>{
   const [h]=await tx`SELECT * FROM clinic_listing_heads WHERE clinic_id=${cId(req)} FOR UPDATE`;
   if(!h)fail(404,"LISTING_NOT_FOUND");
   if(revision!==h.revision)fail(409,"STALE_LISTING_REVISION");
   if(action==="hide"){
    if(h.hidden)fail(409,"ALREADY_HIDDEN");
    await tx`UPDATE clinic_listing_heads SET hidden=true,hidden_reason=${reason},
     hidden_by=${req.reviewer!.id},hidden_at=now(),revision=revision+1,
     updated_at=now() WHERE clinic_id=${cId(req)}`;
    result="hidden";
   }else if(action==="restore"){
    if(!h.hidden||h.approved_version===null)fail(409,"NO_HIDDEN_PUBLIC_LISTING");
    const v=await version(tx,cId(req),h.approved_version);
    const checked=await check(tx,cId(req),v.profile,true);
    if(!checked.ready)fail(409,"RESTORE_NOT_READY_"+checked.issues[0]);
    await tx`UPDATE clinic_listing_heads SET hidden=false,hidden_reason=NULL,
     hidden_by=NULL,hidden_at=NULL,revision=revision+1,updated_at=now()
     WHERE clinic_id=${cId(req)}`;
    result="restored";
   }else{
    if(h.pending_version===null)fail(409,"NO_PENDING_REVISION");
    const v=await version(tx,cId(req),h.pending_version);
    if(v?.status!=="pending")fail(409,"NO_PENDING_REVISION");
    if(action==="approve"){
     if(req.body?.confirmation!=="PUBLISH")fail(422,"PUBLISH_CONFIRMATION_REQUIRED");
     const checked=await check(tx,cId(req),v.profile,true);
     if(!checked.ready)fail(409,"PUBLISH_NOT_READY_"+checked.issues[0]);
     await tx`UPDATE clinic_listing_versions SET status='approved',
      approved_dentists=${JSON.stringify(checked.dentists)}::jsonb,
      approved_services=${JSON.stringify(checked.services)}::jsonb,
      reviewed_by=${req.reviewer!.id},reviewed_at=now(),decision_reason=${reason}
      WHERE clinic_id=${cId(req)} AND version=${v.version}`;
     await tx`UPDATE clinic_listing_heads SET approved_version=${v.version},
      pending_version=NULL,hidden=false,hidden_reason=NULL,hidden_at=NULL,
      hidden_by=NULL,published_at=now(),revision=revision+1,updated_at=now()
      WHERE clinic_id=${cId(req)}`;
     result="published";
    }else{
     await tx`UPDATE clinic_listing_versions SET status='rejected',
      reviewed_by=${req.reviewer!.id},reviewed_at=now(),decision_reason=${reason}
      WHERE clinic_id=${cId(req)} AND version=${v.version}`;
     await tx`UPDATE clinic_listing_heads SET pending_version=NULL,
      revision=revision+1,updated_at=now() WHERE clinic_id=${cId(req)}`;
     result="rejected";
    }
   }
   await log(tx,cId(req),req.reviewer!.id,
    action==="approve"?"approved":action==="reject"?"rejected":
    action==="hide"?"hidden":"restored",cId(req),h.pending_version??h.approved_version,reason);
  });
  noStore(res);res.json({status:result,publicSearchReleased:false,
   previouslyPublishedRetained:result==="rejected"});
 }));
 api.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof ListingFault||error instanceof AccessFault)
   return void res.status(error.status).json({code:error.code});
  const code=(error as any)?.code;
  if(code==="23505")return void res.status(409).json({code:"LISTING_CONFLICT"});
  if(code==="23503"||code==="23514")return void res.status(422).json({code:"LISTING_CONSTRAINT"});
  console.error("PH12 listing error",error instanceof Error?error.name:"unknown",
   "sqlState",code||"none"); // Never log credentials, clinic contact or files.
  res.status(500).json({code:"LISTING_UNAVAILABLE"});
 });
 return api;
}
