import {randomUUID} from "node:crypto";
import {Router,type Request,type Response,type NextFunction} from "express";
import {fromNodeHeaders} from "better-auth/node";
import {eq} from "drizzle-orm";
import {sqlClient,db,schema} from "@dandanlink/db";
import {auth} from "./auth.js";
import {publicListing} from "./listing-router.js";

/** PH17 — impartial verified-care reviews; no inferred medical identity or public PHI. */
type ReviewedReq=Request&{actor?:string;isAdmin?:boolean};
type State="pending"|"published"|"rejected";
class ReviewError extends Error {constructor(public status:number,public code:string){super(code)}}
const fail=(status:number,code:string):never=>{throw new ReviewError(status,code)};
const task=(handler:(req:ReviewedReq,res:Response)=>Promise<void>)=>
 (req:ReviewedReq,res:Response,next:NextFunction)=>{handler(req,res).catch(next)};
const id=(v:unknown)=>{
 if(typeof v!=="string"||!/^[A-Za-z0-9_-]{8,100}$/.test(v))fail(422,"INVALID_ID");
 return v as string;
};
const note=(v:unknown,min=10,max=500)=>{
 if(typeof v!=="string"||v.trim().length<min||v.trim().length>max)fail(422,"INVALID_NOTE");
 return v.trim();
};
const policyCategories=["personal_data","clinical_details","harassment","spam","unrelated"] as const;
const checkCategory=(v:unknown)=>{
 if(typeof v!=="string"||!policyCategories.includes(v as any))fail(422,"INVALID_POLICY_CATEGORY");
 return v as string;
};
function safeText(value:unknown,min:number,max:number){
 const text=note(value,min,max);
 // Block contact identifiers and likely identifiable care/clinical details in public reviews.
 // Avoid a forbidden-word list that could censor legitimate negative care experiences.
 if(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/u.test(text)||
  /(?:\+?\d[\d\s-]{7,}\d)/u.test(text)||
  /(?:https?:\/\/|www\.)/iu.test(text)||
  /\b(?:diagnosis|diagnosed with|blood test|HIV|hepatitis|patient number|medical record|prescription number)\b/iu.test(text)||
  /(?:شماره\s*مریض|شماره\s*تذکره|نسخه\s*طبی|تشخیص\s*بیماری|د\s*ناروغ\s*شمېره)/u.test(text))
  fail(422,"REVIEW_PRIVACY_OR_CONTACT_DETAILS");
 return text;
}
const clean=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
const publicCache=(res:Response)=>res.setHeader("Cache-Control","public, max-age=45");
async function identity(req:ReviewedReq,res:Response,next:NextFunction){
 try{
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user){res.status(401).json({code:"AUTH_REQUIRED"});return}
  if(!session.user.emailVerified){res.status(403).json({code:"EMAIL_VERIFICATION_REQUIRED"});return}
  req.actor=session.user.id;next();
 }catch(error){next(error)}
}
async function patient(req:ReviewedReq,res:Response,next:NextFunction){
 try{
  const [profile]=await sqlClient`SELECT user_id FROM patient_profiles WHERE user_id=${req.actor!}`;
  if(!profile){res.status(403).json({code:"PATIENT_ONBOARDING_REQUIRED"});return}
  next();
 }catch(e){next(e)}
}
async function admin(req:ReviewedReq,res:Response,next:NextFunction){
 try{
  const m=await db.query.platformAdmin.findFirst({
   where:eq(schema.platformAdmin.userId,req.actor!)
  });
  const factor=m&&!m.revokedAt?await db.query.twoFactor.findFirst({
   where:eq(schema.twoFactor.userId,req.actor!)
  }):null;
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!m||m.revokedAt||!session?.user?.twoFactorEnabled||!factor?.verified){
   res.status(403).json({code:"ADMIN_MFA_REQUIRED"});return;
  }
  req.isAdmin=true;next();
 }catch(e){next(e)}
}
function originGuard(req:Request,res:Response,next:NextFunction){
 if(!["GET","HEAD","OPTIONS"].includes(req.method)){
  const origin=req.headers.origin;
  const allowed=[process.env.PATIENT_WEB_URL||"http://localhost:3002",
   process.env.ADMIN_WEB_URL||"http://localhost:3000"];
  if(origin&&!allowed.includes(origin)){res.status(403).json({code:"ORIGIN_DENIED"});return}
 }
 next();
}
async function event(tx:any,review:string,version:number,user:string,action:string,explanation:string|null=null){
 await tx`INSERT INTO patient_review_events(id,review_id,version,actor_id,action,explanation)
 VALUES(${randomUUID()},${review},${version},${user},${action},${explanation})`;
}
async function notify(tx:any,review:string,code:string){
 await tx`INSERT INTO patient_review_notices(id,review_id,owner_user_id,code)
 SELECT ${randomUUID()},id,owner_user_id,${code} FROM patient_visit_reviews WHERE id=${review}`;
}
async function audit(tx:any,actor:string,action:string,review:string,clinic:string|null){
 await tx`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
 VALUES(${randomUUID()},${actor},${clinic},${action},'patient_review',${review},'success')`;
}
function reviewView(r:any){
 return {id:r.id,bookingId:r.booking_id,clinicId:r.clinic_id,dentistId:r.dentist_id,
  currentVersion:r.current_version,publishedVersion:r.published_version,withdrawn:!!r.withdrawn_at,
  stars:r.stars??null,headline:r.headline??null,feedback:r.feedback??null,
  state:r.state??null,createdAt:r.created_at,decidedAt:r.decided_at??null,
  decisionCategory:r.decision_category??null,decisionNote:r.decision_note??null};
}
async function publicReviews(clinic:string,dentist:string|null,page:number){
 const rows=await sqlClient`SELECT r.id,r.clinic_id,r.dentist_id,v.stars,v.headline,
  v.feedback,v.decided_at FROM patient_visit_reviews r
 JOIN patient_review_versions v ON v.review_id=r.id AND v.version=r.published_version
 WHERE r.clinic_id=${clinic} AND r.withdrawn_at IS NULL
 AND v.state='published' AND (${dentist}::text IS NULL OR r.dentist_id=${dentist})
 ORDER BY v.decided_at DESC,r.id DESC LIMIT 11 OFFSET ${(page-1)*10}`;
 const [stats]=await sqlClient`SELECT count(*)::integer AS total,
  round(avg(v.stars)::numeric,1)::float AS average
 FROM patient_visit_reviews r JOIN patient_review_versions v
 ON v.review_id=r.id AND v.version=r.published_version
 WHERE r.clinic_id=${clinic} AND r.withdrawn_at IS NULL
 AND v.state='published' AND (${dentist}::text IS NULL OR r.dentist_id=${dentist})`;
 return {reviews:rows.slice(0,10).map(r=>({id:r.id,clinicId:r.clinic_id,dentistId:r.dentist_id,
  stars:r.stars,headline:r.headline,feedback:r.feedback,publishedAt:r.decided_at,
  verifiedVisit:true})),summary:{count:stats.total,average:stats.average??null},
  hasNext:rows.length>10,page,source:"verified_completed_visits"};
}
export function patientReviewRouter(){
 const router=Router(),publicArea=Router(),privateArea=Router(),adminArea=Router();
 router.use(originGuard);
 router.use("/public",publicArea);
 publicArea.get("/clinics/:clinicId",task(async(req,res)=>{
  const clinic=id(req.params.clinicId);
  await publicListing(clinic);
  const page=Math.min(100,Math.max(1,Number(req.query.page)||1));
  if(!Number.isInteger(page))fail(422,"INVALID_PAGE");
  publicCache(res);res.json(await publicReviews(clinic,null,page));
 }));
 publicArea.get("/clinics/:clinicId/dentists/:dentistId",task(async(req,res)=>{
  const clinic=id(req.params.clinicId),dentist=id(req.params.dentistId);
  const published=await publicListing(clinic);
  if(!published.profile.dentists.some((x:{id:string})=>x.id===dentist))fail(404,"DENTIST_NOT_PUBLIC");
  publicCache(res);res.json(await publicReviews(clinic,dentist,1));
 }));
 router.use("/my",privateArea);
 privateArea.use(identity,patient);
 privateArea.get("/eligibility",task(async(req,res)=>{
  const rows=await sqlClient`SELECT b.id AS booking_id,b.clinic_id,a.provider_membership_id AS dentist_id,
  a.service_name,a.start_at,a.status,rv.id AS review_id,
  c.display_name AS clinic_name FROM patient_public_bookings b
 JOIN clinic_appointments a ON a.id=b.appointment_id
 JOIN clinics c ON c.id=b.clinic_id
 LEFT JOIN patient_visit_reviews rv ON rv.booking_id=b.id
 WHERE b.user_id=${req.actor!} AND a.status='completed' AND a.end_at<now()
 ORDER BY a.start_at DESC LIMIT 100`;
  clean(res);res.json({eligible:rows.map(x=>({bookingId:x.booking_id,clinicId:x.clinic_id,
   clinicName:x.clinic_name,dentistId:x.dentist_id,serviceName:x.service_name,
   visitedAt:x.start_at,reviewId:x.review_id,canReview:!x.review_id}))});
 }));
 privateArea.get("/",task(async(req,res)=>{
  const rows=await sqlClient`SELECT r.*,v.stars,v.headline,v.feedback,v.state,
  v.decided_at,v.decision_category,v.decision_note
 FROM patient_visit_reviews r JOIN patient_review_versions v
 ON v.review_id=r.id AND v.version=r.current_version
 WHERE r.owner_user_id=${req.actor!} ORDER BY r.created_at DESC LIMIT 100`;
  clean(res);res.json({reviews:rows.map(reviewView)});
 }));
 privateArea.get("/notices",task(async(req,res)=>{
  const rows=await sqlClient`SELECT n.id,n.code,n.created_at,n.seen_at FROM patient_review_notices n
 WHERE owner_user_id=${req.actor!} ORDER BY n.created_at DESC LIMIT 50`;
  clean(res);res.json({notices:rows});
 }));
 privateArea.post("/",task(async(req,res)=>{
  const booking=id(req.body?.bookingId),stars=req.body?.stars;
  if(!Number.isInteger(stars)||stars<1||stars>5)fail(422,"INVALID_RATING");
  const headline=safeText(req.body?.headline,5,100),feedback=safeText(req.body?.feedback,20,1200);
  const row=await sqlClient.begin(async tx=>{
   const [eligible]=await tx`SELECT b.user_id,b.clinic_id,a.provider_membership_id,
    a.status,a.end_at FROM patient_public_bookings b
    JOIN clinic_appointments a ON a.id=b.appointment_id
    WHERE b.id=${booking} AND b.user_id=${req.actor!} FOR UPDATE OF a`;
   if(!eligible)fail(404,"ELIGIBLE_VISIT_NOT_FOUND");
   if(eligible.status!=="completed"||new Date(eligible.end_at).getTime()>Date.now())
    fail(403,"COMPLETED_VISIT_REQUIRED");
   const [exists]=await tx`SELECT id FROM patient_visit_reviews WHERE booking_id=${booking}`;
   if(exists)fail(409,"ONE_REVIEW_PER_VISIT");
   const review=randomUUID();
   await tx`INSERT INTO patient_visit_reviews(id,booking_id,clinic_id,dentist_id,owner_user_id)
    VALUES(${review},${booking},${eligible.clinic_id},${eligible.provider_membership_id},${req.actor!})`;
   await tx`INSERT INTO patient_review_versions(id,review_id,version,stars,headline,feedback)
    VALUES(${randomUUID()},${review},1,${stars},${headline},${feedback})`;
   await event(tx,review,1,req.actor!,"submitted");
   await notify(tx,review,"submitted");
   await audit(tx,req.actor!,"review.submitted",review,eligible.clinic_id);
   return {id:review};
  });
  clean(res);res.status(201).json({reviewId:row.id,state:"pending",verifiedVisit:true});
 }));
 privateArea.post("/:reviewId/edit",task(async(req,res)=>{
  const review=id(req.params.reviewId),stars=req.body?.stars;
  if(!Number.isInteger(stars)||stars<1||stars>5)fail(422,"INVALID_RATING");
  const headline=safeText(req.body?.headline,5,100),feedback=safeText(req.body?.feedback,20,1200);
  const result=await sqlClient.begin(async tx=>{
   const [r]=await tx`SELECT * FROM patient_visit_reviews WHERE id=${review}
    AND owner_user_id=${req.actor!} FOR UPDATE`;
   if(!r||r.withdrawn_at)fail(404,"REVIEW_NOT_FOUND");
   if(req.body?.revision!==r.current_version)fail(409,"REVIEW_REVISION_CONFLICT");
   const version=r.current_version+1;
   await tx`UPDATE patient_visit_reviews SET current_version=${version},updated_at=now() WHERE id=${review}`;
   await tx`INSERT INTO patient_review_versions(id,review_id,version,stars,headline,feedback)
    VALUES(${randomUUID()},${review},${version},${stars},${headline},${feedback})`;
   await event(tx,review,version,req.actor!,"edited");
   await notify(tx,review,"submitted");
   await audit(tx,req.actor!,"review.edited",review,r.clinic_id);
   return {version};
  });
  clean(res);res.json({version:result.version,state:"pending",previousPublicVersionUnaffected:true});
 }));
 privateArea.post("/:reviewId/withdraw",task(async(req,res)=>{
  const review=id(req.params.reviewId);
  await sqlClient.begin(async tx=>{
   const [r]=await tx`SELECT * FROM patient_visit_reviews WHERE id=${review} AND owner_user_id=${req.actor!} FOR UPDATE`;
   if(!r)fail(404,"REVIEW_NOT_FOUND");
   if(r.withdrawn_at)fail(409,"REVIEW_ALREADY_WITHDRAWN");
   await tx`UPDATE patient_visit_reviews SET withdrawn_at=now(),published_version=NULL,updated_at=now() WHERE id=${review}`;
   await event(tx,review,r.current_version,req.actor!,"withdrawn");
   await audit(tx,req.actor!,"review.withdrawn",review,r.clinic_id);
  });
  clean(res);res.json({withdrawn:true});
 }));
 privateArea.post("/:reviewId/appeal",task(async(req,res)=>{
  const review=id(req.params.reviewId),reason=safeText(req.body?.reason,20,500);
  const result=await sqlClient.begin(async tx=>{
   const [r]=await tx`SELECT r.*,v.state FROM patient_visit_reviews r
    JOIN patient_review_versions v ON v.review_id=r.id AND v.version=r.current_version
    WHERE r.id=${review} AND r.owner_user_id=${req.actor!} FOR UPDATE OF r`;
   if(!r)fail(404,"REVIEW_NOT_FOUND");
   if(r.state!=="rejected")fail(409,"ONLY_REJECTED_REVIEW_APPEALABLE");
   const appeal=randomUUID();
   await tx`INSERT INTO patient_review_appeals(id,review_id,version,owner_user_id,reason)
    VALUES(${appeal},${review},${r.current_version},${req.actor!},${reason})`;
   await event(tx,review,r.current_version,req.actor!,"appealed");
   await audit(tx,req.actor!,"review.appealed",review,r.clinic_id);
   return {appeal};
  });
  clean(res);res.status(201).json({id:result.appeal,state:"pending"});
 }));
 router.use("/admin",adminArea);
 adminArea.use(identity,admin);
 adminArea.get("/queue",task(async(req,res)=>{
  const rows=await sqlClient`SELECT r.id,r.clinic_id,r.dentist_id,r.owner_user_id,
    v.version,v.stars,v.headline,v.feedback,v.submitted_at FROM patient_visit_reviews r
   JOIN patient_review_versions v ON v.review_id=r.id AND v.version=r.current_version
   WHERE v.state='pending' AND r.withdrawn_at IS NULL
   ORDER BY v.submitted_at ASC LIMIT 100`;
  clean(res);res.json({pending:rows.map(r=>({id:r.id,clinicId:r.clinic_id,
   dentistId:r.dentist_id,version:r.version,stars:r.stars,headline:r.headline,
   feedback:r.feedback,submittedAt:r.submitted_at}))});
 }));
 adminArea.post("/:reviewId/decision",task(async(req,res)=>{
  const review=id(req.params.reviewId),version=req.body?.version,
   action=req.body?.action,reason=req.body?.reason;
  if(!Number.isInteger(version)||!["approve","reject"].includes(action))
   fail(422,"INVALID_DECISION");
  const category=action==="approve"?"policy_compliant":checkCategory(req.body?.category);
  const justification=action==="approve"?"Meets impartial review policy":note(reason,15,500);
  const result=await sqlClient.begin(async tx=>{
   const [r]=await tx`SELECT * FROM patient_visit_reviews WHERE id=${review} FOR UPDATE`;
   if(!r)fail(404,"REVIEW_NOT_FOUND");
   if(r.current_version!==version||r.withdrawn_at)fail(409,"REVIEW_REVISION_CONFLICT");
   if(r.owner_user_id===req.actor)fail(403,"SELF_MODERATION_FORBIDDEN");
   const [v]=await tx`SELECT * FROM patient_review_versions
    WHERE review_id=${review} AND version=${version} FOR UPDATE`;
   if(!v||v.state!=="pending")fail(409,"REVIEW_ALREADY_DECIDED");
   await tx`UPDATE patient_review_versions SET state=${action==="approve"?"published":"rejected"},
     decided_by=${req.actor!},decided_at=now(),decision_category=${category},
     decision_note=${justification} WHERE id=${v.id}`;
   if(action==="approve")
    await tx`UPDATE patient_visit_reviews SET published_version=${version},updated_at=now() WHERE id=${review}`;
   await event(tx,review,version,req.actor!,action==="approve"?"approved":"rejected",justification);
   await notify(tx,review,action==="approve"?"published":"rejected");
   await audit(tx,req.actor!,"review."+action,review,r.clinic_id);
   return {state:action==="approve"?"published":"rejected"};
  });
  clean(res);res.json(result);
 }));
 adminArea.get("/reports",task(async(_req,res)=>{
  const rows=await sqlClient`SELECT f.id,f.review_id,f.version,f.category,f.note,
    f.reported_at,r.clinic_id,v.headline,v.feedback,v.stars
   FROM patient_review_reports f JOIN patient_visit_reviews r ON r.id=f.review_id
   JOIN patient_review_versions v ON v.review_id=f.review_id AND v.version=f.version
   WHERE f.state='pending' ORDER BY f.reported_at ASC LIMIT 100`;
  clean(res);res.json({reports:rows});
 }));
 adminArea.get("/appeals",task(async(_req,res)=>{
  const rows=await sqlClient`SELECT a.id,a.review_id,a.version,a.reason,
    a.created_at,r.clinic_id,v.headline,v.feedback,v.stars,v.decision_note,v.decision_category
   FROM patient_review_appeals a JOIN patient_visit_reviews r ON r.id=a.review_id
   JOIN patient_review_versions v ON v.review_id=a.review_id AND v.version=a.version
   WHERE a.state='pending' ORDER BY a.created_at ASC LIMIT 100`;
  clean(res);res.json({appeals:rows});
 }));
 adminArea.post("/reports/:reportId/decision",task(async(req,res)=>{
  const report=id(req.params.reportId),action=req.body?.action;
  if(!["dismiss","remove"].includes(action))fail(422,"INVALID_REPORT_DECISION");
  const reason=note(req.body?.reason,15,500);
  const category=action==="remove"?checkCategory(req.body?.category):"policy_compliant";
  await sqlClient.begin(async tx=>{
   const [f]=await tx`SELECT f.*,r.clinic_id,r.owner_user_id FROM patient_review_reports f
    JOIN patient_visit_reviews r ON r.id=f.review_id WHERE f.id=${report} FOR UPDATE OF f`;
   if(!f)fail(404,"REPORT_NOT_FOUND");
   if(f.state!=="pending")fail(409,"REPORT_ALREADY_DECIDED");
   await tx`UPDATE patient_review_reports SET state=${action==="remove"?"removed":"dismissed"},
    decided_by=${req.actor!},decided_at=now(),decision_reason=${reason} WHERE id=${report}`;
   if(action==="remove"){
    // Only remove public visibility of the exact reported version.
    await tx`UPDATE patient_visit_reviews SET published_version=NULL,updated_at=now()
     WHERE id=${f.review_id} AND published_version=${f.version}`;
    await notify(tx,f.review_id,"report_removed");
   }
   await event(tx,f.review_id,f.version,req.actor!,action==="remove"?"report_removed":"report_dismissed",
    category+": "+reason);
   await audit(tx,req.actor!,"review.report."+action,f.review_id,f.clinic_id);
  });
  clean(res);res.json({state:action==="remove"?"removed":"dismissed"});
 }));
 adminArea.post("/appeals/:appealId/decision",task(async(req,res)=>{
  const appeal=id(req.params.appealId),action=req.body?.action;
  if(!["uphold","overturn"].includes(action))fail(422,"INVALID_APPEAL_DECISION");
  const reason=note(req.body?.reason,15,500);
  await sqlClient.begin(async tx=>{
   const [a]=await tx`SELECT a.*,r.clinic_id,r.owner_user_id,r.current_version,
    r.withdrawn_at FROM patient_review_appeals a
    JOIN patient_visit_reviews r ON r.id=a.review_id
    WHERE a.id=${appeal} FOR UPDATE OF a,r`;
   if(!a)fail(404,"APPEAL_NOT_FOUND");
   if(a.state!=="pending")fail(409,"APPEAL_ALREADY_DECIDED");
   if(a.owner_user_id===req.actor)fail(403,"SELF_MODERATION_FORBIDDEN");
   if(a.current_version!==a.version||a.withdrawn_at)fail(409,"STALE_REVIEW_APPEAL");
   await tx`UPDATE patient_review_appeals SET state=${action==="uphold"?"upheld":"overturned"},
    decided_at=now(),decided_by=${req.actor!},decision_reason=${reason} WHERE id=${appeal}`;
   if(action==="overturn"){
    await tx`UPDATE patient_review_versions SET state='published',decision_category='policy_compliant',
      decision_note=${reason},decided_by=${req.actor!},decided_at=now()
      WHERE review_id=${a.review_id} AND version=${a.version} AND state='rejected'`;
    await tx`UPDATE patient_visit_reviews SET published_version=${a.version},updated_at=now()
     WHERE id=${a.review_id}`;
   }
   await event(tx,a.review_id,a.version,req.actor!,action==="uphold"?"appeal_upheld":"appeal_overturned",reason);
   await notify(tx,a.review_id,action==="uphold"?"appeal_upheld":"appeal_overturned");
   await audit(tx,req.actor!,"review.appeal."+action,a.review_id,a.clinic_id);
  });
  clean(res);res.json({state:action==="uphold"?"upheld":"overturned"});
 }));
 router.use(identity); // any verified user can report published content, incl. clinic staff
 router.post("/reports",task(async(req,res)=>{
  const review=id(req.body?.reviewId),category=checkCategory(req.body?.category),
   reason=safeText(req.body?.note,10,500);
  const submitted=await sqlClient.begin(async tx=>{
   const [r]=await tx`SELECT id,published_version,clinic_id FROM patient_visit_reviews
    WHERE id=${review} AND published_version IS NOT NULL AND withdrawn_at IS NULL FOR UPDATE`;
   if(!r)fail(404,"PUBLIC_REVIEW_NOT_FOUND");
   const report=randomUUID();
   await tx`INSERT INTO patient_review_reports(id,review_id,version,reporter_user_id,category,note)
    VALUES(${report},${review},${r.published_version},${req.actor!},${category},${reason})`;
   await event(tx,review,r.published_version,req.actor!,"reported",category);
   await audit(tx,req.actor!,"review.reported",review,r.clinic_id);
   return report;
  });
  clean(res);res.status(201).json({reportId:submitted,state:"pending"});
 }));
 router.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(err instanceof ReviewError){res.status(err.status).json({code:err.code});return}
  if((err as any)?.code==="23505"){res.status(409).json({code:"DUPLICATE_REVIEW_OR_REPORT"});return}
  console.error("PH17 review request failed",err instanceof Error?err.name:"unknown");
  res.status(500).json({code:"REVIEW_SERVICE_UNAVAILABLE"});
 });
 return router;
}
