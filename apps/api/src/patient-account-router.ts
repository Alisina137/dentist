import {randomUUID} from "node:crypto";
import {Router,type Request,type Response,type NextFunction} from "express";
import {fromNodeHeaders} from "better-auth/node";
import {sqlClient} from "@dandanlink/db";
import {auth} from "./auth.js";
import {sendAccountMail} from "./mail.js";

const TERMS="patient-terms-2026-11-14-v1",PRIVACY="patient-privacy-2026-11-14-v1";
const FAMILY="patient-family-2026-11-14-v1";
type PatientRequest=Request&{patientUserId?:string;patientEmail?:string;profile?:any};
class Fault extends Error{constructor(public status:number,public code:string){super(code);}}
function fail(status:number,code:string):never{throw new Fault(status,code)}
const route=(fn:(req:PatientRequest,res:Response)=>Promise<void>)=>
 (req:PatientRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next)};
function content(res:Response){
 res.setHeader("Cache-Control","private, no-store");
 res.setHeader("X-Content-Type-Options","nosniff");
 res.setHeader("Referrer-Policy","no-referrer");
}
function str(raw:unknown,name:string,min=1,max=120){
 if(typeof raw!=="string")fail(422,"INVALID_"+name);
 const s=raw.trim().replace(/\s+/g," ");
 if(s.length<min||s.length>max||/[\u0000-\u001f\u007f]/.test(s))fail(422,"INVALID_"+name);
 return s;
}
function optional(raw:unknown,name:string,max=100){
 return raw===null||raw===undefined||raw===""?null:str(raw,name,1,max);
}
function codeId(raw:unknown){
 if(typeof raw!=="string"||!/^[a-f0-9-]{36}$/.test(raw))fail(404,"NOT_FOUND");
 return raw;
}
function revision(raw:unknown){
 if(typeof raw!=="number"||!Number.isInteger(raw)||raw<1||raw>2000000000)fail(422,"REVISION_REQUIRED");
 return raw as number;
}
function dateOnly(raw:unknown){
 const s=str(raw,"BIRTH_DATE",10,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+"T12:00:00Z"))||
  new Date(s+"T12:00:00Z").toISOString().slice(0,10)!==s)
  fail(422,"INVALID_BIRTH_DATE");
 return s;
}
function nowDate(){
 const fields=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [fields.year,fields.month,fields.day].join("-");
}
function ageOn(birth:string,now=nowDate()){
 const [y,m,d]=birth.split("-").map(Number),[ty,tm,td]=now.split("-").map(Number);
 return ty-y-(tm<m||tm===m&&td<d?1:0);
}
async function identity(req:PatientRequest,res:Response,next:NextFunction){
 try{
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user){res.status(401).json({code:"AUTH_REQUIRED"});return;}
  if(session.user.emailVerified!==true){
   res.status(403).json({code:"EMAIL_VERIFICATION_REQUIRED"});return;
  }
  req.patientUserId=session.user.id;req.patientEmail=session.user.email;
  next();
 }catch(err){next(err);}
}
async function profileGuard(req:PatientRequest,res:Response,next:NextFunction){
 try{
  const [row]=await sqlClient`SELECT user_id,preferred_name,city,phone,
   legal_version,privacy_version,accepted_at,revision,created_at,updated_at
   FROM patient_profiles WHERE user_id=${req.patientUserId!}`;
  if(!row){res.status(403).json({code:"PATIENT_ONBOARDING_REQUIRED"});return}
  req.profile=row;next();
 }catch(e){next(e);}
}
async function event(tx:any,user:string,subject:string,id:string|null,yes:boolean,policy:string){
 await tx`INSERT INTO patient_consent_events(id,user_id,subject_type,subject_id,
 consent,policy_version,actor_id)
 VALUES(${randomUUID()},${user},${subject},${id},${yes},${policy},${user})`;
}
async function audit(tx:any,user:string,action:string,subject:string|null){
 await tx`INSERT INTO audit_events(id,actor_id,action,subject_type,subject_id,outcome)
 VALUES(${randomUUID()},${user},${action},'patient_portal',${subject},'success')`;
}
function profileView(row:any){
 return {preferredName:row.preferred_name,city:row.city,phone:row.phone,
  phoneVerified:false,legalVersion:row.legal_version,privacyVersion:row.privacy_version,
  acceptedAt:row.accepted_at,revision:row.revision,createdAt:row.created_at,
  updatedAt:row.updated_at,
  avatar:{kind:"initials",initials:String(row.preferred_name||"?").split(/\s+/)
   .slice(0,2).map((part:string)=>part.slice(0,1).toUpperCase()).join("")}};
}
function minorView(row:any){
 const dob=String(row.date_of_birth).slice(0,10),age=ageOn(dob);
 return {id:row.id,memberType:"minor",displayName:row.display_name,
  relationship:row.relationship,dateOfBirth:dob,age,guardianPolicyVersion:row.guardian_policy_version,
  authorization:"guardian_attested",authorizationStatus:age>=18?"requires_adult_reauthorization":row.status,
  eligibleForFutureBooking:row.status==="active"&&age<18,revision:row.revision,
  createdAt:row.created_at};
}
function adultView(row:any){
 return {id:row.id,memberType:"adult",displayName:row.display_name,
  relationship:"adult_authorized",dateOfBirth:null,age:null,
  authorization:"independently_confirmed",authorizationStatus:row.status,
  eligibleForFutureBooking:row.status==="active",revision:row.revision,
  createdAt:row.created_at};
}
const optionalPhone=(input:unknown)=>{
 const s=optional(input,"PHONE",22);
 if(s&&!/^\+?[0-9][0-9 ()-]{6,21}$/.test(s))fail(422,"INVALID_PHONE");
 return s;
};
const email=(raw:unknown)=>{
 const e=str(raw,"EMAIL",5,254).toLowerCase();
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))fail(422,"INVALID_EMAIL");
 return e;
};
export function patientAccountRouter(){
 const router=Router();
 router.use((req,res,next)=>{
  content(res);
  const origin=req.headers.origin;
  if(!["GET","HEAD","OPTIONS"].includes(req.method)&&origin&&![
   process.env.PATIENT_WEB_URL||"http://localhost:3002",
   process.env.CLINIC_WEB_URL||"http://localhost:3000",
   process.env.ADMIN_WEB_URL||"http://localhost:3001"
  ].includes(origin)){
   res.status(403).json({code:"ORIGIN_DENIED"});return;
  }next();
 });
 router.use(identity);
 router.get("/me",route(async(req,res)=>{
  const [person,profile]=await Promise.all([
   sqlClient`SELECT id,name,email,email_verified,locale,calendar,image,created_at
     FROM auth_users WHERE id=${req.patientUserId!}`,
   sqlClient`SELECT * FROM patient_profiles WHERE user_id=${req.patientUserId!}`
  ]);
  if(!person.length)fail(401,"AUTH_REQUIRED");
  res.json({registered:!!profile.length,
   user:{id:person[0].id,name:person[0].name,email:person[0].email,
    emailVerified:true,locale:person[0].locale,calendar:person[0].calendar,
    joinedAt:person[0].created_at},profile:profile[0]?profileView(profile[0]):null,
   onboarding:{termsVersion:TERMS,privacyVersion:PRIVACY,
    requiresAdultAttestation:true,accountAndBookingFree:true},
   publicBookingsEnabled:false,clinicalRecordLinksEnabled:false});
 }));
 router.post("/onboard",route(async(req,res)=>{
  const body=req.body||{};
  if(body.termsAccepted!==true||body.privacyAcknowledged!==true||
   body.adultAttested!==true||body.termsVersion!==TERMS||
   body.privacyVersion!==PRIVACY)fail(422,"PATIENT_CONSENT_REQUIRED");
  const name=str(body.preferredName,"PREFERRED_NAME",2,120),
   city=str(body.city,"CITY",2,90),phone=optionalPhone(body.phone);
  const user=req.patientUserId!;
  const row=await sqlClient.begin(async tx=>{
   const [old]=await tx`SELECT user_id FROM patient_profiles WHERE user_id=${user}`;
   if(old)fail(409,"PATIENT_ALREADY_REGISTERED");
   const [created]=await tx`INSERT INTO patient_profiles
    (user_id,preferred_name,city,phone,legal_version,privacy_version,
     accepted_at,adult_attested)
    VALUES(${user},${name},${city},${phone},${TERMS},${PRIVACY},now(),true)
    RETURNING *`;
   await tx`INSERT INTO patient_notification_preferences(user_id) VALUES(${user})`;
   await event(tx,user,"portal_terms",null,true,TERMS);
   await event(tx,user,"portal_privacy",null,true,PRIVACY);
   await audit(tx,user,"patient.onboard",user);
   return created;
  });
  res.status(201).json({registered:true,profile:profileView(row)});
 }));
 // All remaining personal endpoints require both verified email and explicit onboarding consent.
 const privateArea=Router();
 router.use(privateArea);
 privateArea.use(profileGuard);
 privateArea.put("/me",route(async(req,res)=>{
  const preferredName=str(req.body?.preferredName,"PREFERRED_NAME",2,120);
  const city=str(req.body?.city,"CITY",2,90),phone=optionalPhone(req.body?.phone);
  const expected=revision(req.body?.revision),user=req.patientUserId!;
  const updated=await sqlClient.begin(async tx=>{
   const [row]=await tx`UPDATE patient_profiles SET preferred_name=${preferredName},
    city=${city},phone=${phone},revision=revision+1,updated_at=now()
    WHERE user_id=${user} AND revision=${expected} RETURNING *`;
   if(!row)fail(409,"PATIENT_PROFILE_CONFLICT");
   await audit(tx,user,"patient.profile.update",user);
   return row;
  });
  res.json({profile:profileView(updated)});
 }));
 privateArea.get("/preferences",route(async(req,res)=>{
  const user=req.patientUserId!;
  const [person]=await sqlClient`SELECT locale,calendar FROM auth_users WHERE id=${user}`;
  const [preferences]=await sqlClient`SELECT * FROM patient_notification_preferences
   WHERE user_id=${user}`;
  res.json({locale:person.locale,calendar:person.calendar,
   notifications:{emailBookings:preferences.email_booking,
    emailUpdates:preferences.email_updates,
    smsEnabled:false,pushEnabled:false,
    emailDeliveryConfigured:Boolean(process.env.SMTP_HOST&&process.env.SMTP_FROM&&
     process.env.SMTP_USER&&process.env.SMTP_PASSWORD),
    bookingNotificationsReleased:false,phase:"PH15"},
   privacy:{clinicalRecordsShared:false,linkedClinics:0,
    explanation:"No clinic medical record may be linked merely by name, phone, or family declaration. Consent and explicit clinic verification arrive in PH15."},
   revision:preferences.revision});
 }));
 privateArea.put("/preferences",route(async(req,res)=>{
  const locale=req.body?.locale,calendar=req.body?.calendar;
  if(!["en","fa-AF","ps-AF"].includes(locale)||
   !["gregorian","solar_hijri"].includes(calendar)||
   typeof req.body?.emailBookings!=="boolean"||
   typeof req.body?.emailUpdates!=="boolean")fail(422,"INVALID_PREFERENCES");
  const expected=revision(req.body?.revision),user=req.patientUserId!;
  const result=await sqlClient.begin(async tx=>{
   const [updated]=await tx`UPDATE patient_notification_preferences
   SET email_booking=${req.body.emailBookings},email_updates=${req.body.emailUpdates},
   revision=revision+1,updated_at=now()
   WHERE user_id=${user} AND revision=${expected} RETURNING *`;
   if(!updated)fail(409,"PATIENT_PREFERENCES_CONFLICT");
   await tx`UPDATE auth_users SET locale=${locale},calendar=${calendar},updated_at=now()
    WHERE id=${user}`;
   await event(tx,user,"notifications",null,
    req.body.emailBookings||req.body.emailUpdates,"patient-notifications-v1");
   await audit(tx,user,"patient.preferences.update",user);
   return updated;
  });
  res.json({locale,calendar,notifications:{
   emailBookings:result.email_booking,emailUpdates:result.email_updates},
   revision:result.revision,saved:true});
 }));
 privateArea.get("/family",route(async(req,res)=>{
  const user=req.patientUserId!;
  const rows=await sqlClient`SELECT id,member_type,display_name,relationship,date_of_birth,
   guardian_policy_version,status,revision,created_at
   FROM patient_dependents
   WHERE guardian_user_id=${user} AND status='active'
   ORDER BY created_at DESC,id LIMIT 40`;
  const [count]=await sqlClient`SELECT count(*)::integer AS total FROM patient_dependents
   WHERE guardian_user_id=${user} AND status='active'`;
  res.json({members:rows.map(x=>x.member_type==="minor"?minorView(x):adultView(x)),
   total:count.total,limit:20,
   policy:{minorAgeLimit:18,guardianPolicyVersion:FAMILY,
    adultRequiresIndependentAccountAcceptance:true,
    clinicRecordAccessViaName:false}});
 }));
 privateArea.post("/family/minors",route(async(req,res)=>{
  const user=req.patientUserId!,body=req.body||{};
  if(body.authorizationStatement!==true||
   body.guardianPolicyVersion!==FAMILY)fail(422,"GUARDIAN_AUTHORIZATION_REQUIRED");
  const name=str(body.displayName,"NAME",2,120),dob=dateOnly(body.dateOfBirth);
  if(dob>nowDate()||ageOn(dob)>=18||ageOn(dob)<0)
   fail(422,"CHILD_AGE_REQUIRED");
  const relationship=body.relationship;
  if(!["child","legal_guardian"].includes(relationship))
   fail(422,"INVALID_RELATIONSHIP");
  const id=randomUUID();
  const result=await sqlClient.begin(async tx=>{
   await tx`SELECT user_id FROM patient_profiles WHERE user_id=${user} FOR UPDATE`;
   const [count]=await tx`SELECT count(*)::integer AS n FROM patient_dependents
    WHERE guardian_user_id=${user} AND status='active'`;
   if(count.n>=20)fail(409,"FAMILY_CAP_REACHED");
   const [created]=await tx`INSERT INTO patient_dependents
    (id,guardian_user_id,member_type,display_name,relationship,date_of_birth,
     authorization_basis,guardian_policy_version)
    VALUES(${id},${user},'minor',${name},${relationship},${dob}::date,
      'minor_guardian_attestation',${FAMILY})
    RETURNING *`;
   await event(tx,user,"family_minor",id,true,FAMILY);
   await audit(tx,user,"patient.family.minor.add",id);
   return created;
  });
  res.status(201).json({member:minorView(result)});
 }));
 privateArea.put("/family/minors/:memberId",route(async(req,res)=>{
  const user=req.patientUserId!,memberId=codeId(req.params.memberId);
  const body=req.body||{};
  if(body.authorizationStatement!==true||body.guardianPolicyVersion!==FAMILY)
   fail(422,"GUARDIAN_AUTHORIZATION_REQUIRED");
  const name=str(body.displayName,"NAME",2,120),dob=dateOnly(body.dateOfBirth);
  if(dob>nowDate()||ageOn(dob)>=18||ageOn(dob)<0)fail(422,"CHILD_AGE_REQUIRED");
  const relationship=body.relationship;
  if(!["child","legal_guardian"].includes(relationship))
   fail(422,"INVALID_RELATIONSHIP");
  const expected=revision(body.revision);
  const row=await sqlClient.begin(async tx=>{
   const [changed]=await tx`UPDATE patient_dependents
    SET display_name=${name},relationship=${relationship},date_of_birth=${dob}::date,
    revision=revision+1,updated_at=now()
    WHERE id=${memberId} AND guardian_user_id=${user} AND member_type='minor'
     AND status='active' AND revision=${expected} RETURNING *`;
   if(!changed)fail(409,"FAMILY_MEMBER_CONFLICT");
   await event(tx,user,"family_minor",memberId,true,FAMILY);
   await audit(tx,user,"patient.family.minor.update",memberId);
   return changed;
  });
  res.json({member:minorView(row)});
 }));
 privateArea.delete("/family/:memberId",route(async(req,res)=>{
  const user=req.patientUserId!,memberId=codeId(req.params.memberId);
  const expected=revision(req.body?.revision);
  const [row]=await sqlClient.begin(async tx=>{
   const changed=await tx`UPDATE patient_dependents SET status='revoked',
    revoked_at=now(),revision=revision+1,updated_at=now()
    WHERE id=${memberId} AND guardian_user_id=${user}
      AND status='active' AND revision=${expected} RETURNING id,member_type`;
   if(!changed.length)fail(409,"FAMILY_MEMBER_CONFLICT");
   await event(tx,user,changed[0].member_type==="adult"?"family_adult":"family_minor",
    memberId,false,FAMILY);
   await audit(tx,user,"patient.family.revoke",memberId);
   return changed;
  });
  res.json({revoked:true,id:row.id});
 }));
 privateArea.post("/family/invite-adult",route(async(req,res)=>{
  const user=req.patientUserId!,targetEmail=email(req.body?.email);
  if(req.body?.explicitAuthorization!==true)
   fail(422,"ADULT_APPROVAL_REQUIRED");
  const [target]=await sqlClient`SELECT id,email FROM auth_users
   WHERE lower(email)=${targetEmail} AND email_verified=true LIMIT 1`;
  // Identical 202 response whether the target email exists or not.
  // Never permit a caretaker to assert adult authority without that adult's own login.
  if(target&&target.id!==user){
   const [count]=await sqlClient`SELECT count(*)::integer AS n FROM patient_dependents
     WHERE guardian_user_id=${user} AND status='active'`;
   if(count.n<20){
    const [old]=await sqlClient`SELECT id FROM patient_dependents
     WHERE guardian_user_id=${user} AND adult_user_id=${target.id} AND status='active'`;
    if(!old){
     const id=randomUUID();
     const [invitation]=await sqlClient`INSERT INTO patient_family_invitations
      (id,guardian_user_id,target_user_id,expires_at)
      VALUES(${id},${user},${target.id},now()+interval '7 days')
      ON CONFLICT DO NOTHING RETURNING id`;
     if(invitation){
      try{await sendAccountMail({to:target.email,
       subject:"DandanLink family authorization request",
       url:(process.env.PATIENT_WEB_URL||"http://localhost:3002")+"/account/family/requests"});
      }catch{
       // Safe failure does not disclose whether an email corresponds to an account.
       await sqlClient`UPDATE patient_family_invitations
        SET status='cancelled',decided_at=now() WHERE id=${id} AND status='pending'`;
      }
     }
    }
   }
  }
  res.status(202).json({requested:true,message:"If a verified DandanLink account exists, an authorization invitation can be delivered to it. Adult permission is not active unless that account accepts."});
 }));
 privateArea.get("/family/requests",route(async(req,res)=>{
  const user=req.patientUserId!;
  const rows=await sqlClient`SELECT inv.id,inv.created_at,inv.expires_at,
   g.preferred_name AS guardian_name,inv.guardian_user_id
   FROM patient_family_invitations inv JOIN patient_profiles g
    ON g.user_id=inv.guardian_user_id
   WHERE inv.target_user_id=${user} AND inv.status='pending'
     AND inv.expires_at>now() ORDER BY inv.created_at DESC LIMIT 30`;
  res.json({requests:rows.map(x=>({id:x.id,guardianName:x.guardian_name,
   createdAt:x.created_at,expiresAt:x.expires_at,
   authorizationActive:false}))});
 }));
 privateArea.post("/family/requests/:invitationId/decide",route(async(req,res)=>{
  const user=req.patientUserId!,id=codeId(req.params.invitationId);
  const decision=req.body?.decision;
  if(!["accept","decline"].includes(decision)||req.body?.adultConsent!==true)
   fail(422,"EXPLICIT_ADULT_DECISION_REQUIRED");
  const accepted=await sqlClient.begin(async tx=>{
   const [row]=await tx`SELECT * FROM patient_family_invitations WHERE id=${id}
    AND target_user_id=${user} FOR UPDATE`;
   if(!row||row.status!=="pending"||new Date(row.expires_at).getTime()<=Date.now())
    fail(409,"INVITATION_NO_LONGER_ACTIVE");
   if(decision==="decline"){
    await tx`UPDATE patient_family_invitations SET status='declined',decided_at=now()
      WHERE id=${id}`;
    await event(tx,user,"family_adult",id,false,FAMILY);
    await audit(tx,user,"patient.family.adult.decline",id);
    return {status:"declined"};
   }
   const [profile]=await tx`SELECT name,email_verified FROM auth_users WHERE id=${user}`;
   if(!profile?.email_verified)fail(403,"VERIFIED_ADULT_ACCOUNT_REQUIRED");
   const [guardian]=await tx`SELECT user_id FROM patient_profiles
     WHERE user_id=${row.guardian_user_id} FOR UPDATE`;
   if(!guardian)fail(404,"GUARDIAN_UNAVAILABLE");
   const [count]=await tx`SELECT count(*)::integer AS n FROM patient_dependents
    WHERE guardian_user_id=${row.guardian_user_id} AND status='active'`;
   if(count.n>=20)fail(409,"FAMILY_CAP_REACHED");
   const [old]=await tx`SELECT id FROM patient_dependents
    WHERE guardian_user_id=${row.guardian_user_id} AND adult_user_id=${user}
      AND status='active'`;
   if(old)fail(409,"ADULT_ALREADY_AUTHORIZED");
   const memberId=randomUUID();
   await tx`INSERT INTO patient_dependents(id,guardian_user_id,member_type,
     display_name,relationship,adult_user_id,authorization_basis,guardian_policy_version)
     VALUES(${memberId},${row.guardian_user_id},'adult',${profile.name},
      'adult_authorized',${user},'adult_account_acceptance',${FAMILY})`;
   await tx`UPDATE patient_family_invitations SET status='accepted',decided_at=now(),
     dependent_id=${memberId} WHERE id=${id}`;
   await event(tx,user,"family_adult",memberId,true,FAMILY);
   await audit(tx,user,"patient.family.adult.accept",memberId);
   return {status:"accepted",memberId};
  });
  res.json({...accepted,authorized:accepted.status==="accepted"});
 }));
 privateArea.get("/family/delegations",route(async(req,res)=>{
  const user=req.patientUserId!;
  const rows=await sqlClient`SELECT d.id,d.created_at,d.revision,
   g.preferred_name AS guardian_name FROM patient_dependents d
   JOIN patient_profiles g ON g.user_id=d.guardian_user_id
   WHERE d.adult_user_id=${user} AND d.member_type='adult'
     AND d.status='active' ORDER BY d.created_at DESC LIMIT 30`;
  res.json({delegations:rows.map(x=>({id:x.id,guardianName:x.guardian_name,
   revision:x.revision,createdAt:x.created_at}))});
 }));
 privateArea.delete("/family/delegations/:memberId",route(async(req,res)=>{
  const user=req.patientUserId!,memberId=codeId(req.params.memberId);
  const [row]=await sqlClient.begin(async tx=>{
   const changes=await tx`UPDATE patient_dependents
    SET status='revoked',revoked_at=now(),revision=revision+1,updated_at=now()
    WHERE id=${memberId} AND adult_user_id=${user} AND member_type='adult'
    AND status='active' RETURNING id`;
   if(!changes.length)fail(404,"DELEGATION_NOT_FOUND");
   await event(tx,user,"family_adult",memberId,false,FAMILY);
   await audit(tx,user,"patient.family.adult.self_revoke",memberId);
   return changes;
  });
  res.json({revoked:true,id:row.id});
 }));
 privateArea.get("/security/sessions",route(async(req,res)=>{
  const user=req.patientUserId!;
  const rows=await sqlClient`SELECT id,created_at,expires_at,user_agent,
   ip_address FROM auth_sessions WHERE user_id=${user} AND expires_at>now()
   ORDER BY created_at DESC LIMIT 50`;
  res.json({sessions:rows.map(x=>({id:x.id,createdAt:x.created_at,
   expiresAt:x.expires_at,device:String(x.user_agent||"Unknown device").slice(0,160),
   // IP addresses are optional security identifiers and returned only to the owner.
   ipAddress:x.ip_address}))});
 }));
 privateArea.delete("/security/sessions/:sessionId",route(async(req,res)=>{
  const user=req.patientUserId!;
  const id=str(req.params.sessionId,"SESSION_ID",4,140);
  const [row]=await sqlClient`DELETE FROM auth_sessions WHERE
   id=${id} AND user_id=${user} RETURNING id`;
  if(!row)fail(404,"SESSION_NOT_FOUND");
  res.json({revoked:true,id:row.id});
 }));
 privateArea.get("/privacy/consents",route(async(req,res)=>{
  const user=req.patientUserId!;
  const rows=await sqlClient`SELECT subject_type,subject_id,consent,policy_version,
    created_at FROM patient_consent_events WHERE user_id=${user}
    ORDER BY created_at DESC LIMIT 100`;
  res.json({events:rows.map(x=>({subjectType:x.subject_type,subjectId:x.subject_id,
   consent:x.consent,policyVersion:x.policy_version,createdAt:x.created_at})),
   clinicalAccessGrants:[],recordLinkingReleased:false,
   explanation:"Patient portal identity is never used to discover or expose a clinic's private clinical records."});
 }));
 privateArea.get("/privacy/export",route(async(req,res)=>{
  const user=req.patientUserId!;
  const [identity,profile,settings,dependents,authorizations,consents]=await Promise.all([
   sqlClient`SELECT name,email,email_verified,locale,calendar,created_at
    FROM auth_users WHERE id=${user}`,
   sqlClient`SELECT * FROM patient_profiles WHERE user_id=${user}`,
   sqlClient`SELECT email_booking,email_updates,updated_at FROM patient_notification_preferences
    WHERE user_id=${user}`,
   sqlClient`SELECT id,member_type,display_name,relationship,date_of_birth,
     authorization_basis,guardian_policy_version,status,authorized_at,revoked_at
    FROM patient_dependents WHERE guardian_user_id=${user} ORDER BY created_at DESC LIMIT 250`,
   sqlClient`SELECT id,guardian_user_id,status,authorized_at,revoked_at
    FROM patient_dependents WHERE adult_user_id=${user} ORDER BY created_at DESC LIMIT 250`,
   sqlClient`SELECT subject_type,subject_id,consent,policy_version,created_at
    FROM patient_consent_events WHERE user_id=${user} ORDER BY created_at DESC LIMIT 1000`
  ]);
  const data={exportedAt:new Date().toISOString(),scope:"patient_portal_only",
   notice:"Clinical and billing records remain in clinic-controlled systems. No automatic patient/clinic record matching exists.",
   account:identity[0],profile:profileView(profile[0]),notifications:settings[0],
   family:dependents,adultPermissions:authorizations,consentHistory:consents};
  await sqlClient.begin(async tx=>{
   await event(tx,user,"data_access",null,true,"patient-export-v1");
   await audit(tx,user,"patient.data.export",user);
  });
  res.setHeader("Content-Disposition",'attachment; filename="dandanlink-patient-account.json"');
  res.json(data);
 }));
 router.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof Fault){res.status(error.status).json({code:error.code});return;}
  if((error as any)?.code==="23505"){
   res.status(409).json({code:"PATIENT_DUPLICATE_OR_CONFLICT"});return;
  }
  console.error("Patient PH14 router failure",error instanceof Error?error.name:"unknown");
  res.status(500).json({code:"PATIENT_PORTAL_UNAVAILABLE"});
 });
 return router;
}
