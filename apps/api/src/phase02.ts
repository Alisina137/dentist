
import { randomUUID, createHash } from "node:crypto";
import express, { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, inArray, or, ilike } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import { db, schema } from "@dandanlink/db";
import { auth } from "./auth.js";

type Actor = { id: string; admin: boolean };
type R = Request & { actor?: Actor };
class Fault extends Error { constructor(public status: number, public code: string) { super(code); } }
function fail(status:number, code:string):never { throw new Fault(status,code); }
function job(fn:(req:R,res:Response)=>Promise<void>) {
  return (req:R,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
}
function field(v:unknown,min:number,max:number,name:string):string {
  if(typeof v!=="string" || v.trim().length<min || v.trim().length>max)fail(422,"INVALID_"+name);
  return (v as string).trim();
}
function optional(v:unknown,max=100) { return v==null || v===""?null:field(v,1,max,"FIELD"); }
function clinicBody(b:any) {
  if(!b || typeof b!=="object")fail(422,"INVALID_BODY");
  const clinicType=field(b.clinicType,4,20,"TYPE");
  if(!["solo","office","specialty"].includes(clinicType))fail(422,"INVALID_TYPE");
  const phone=field(b.phone,9,20,"PHONE").replace(/[\s()-]/g,"");
  if(!/^(\+93\d{9}|0\d{9}|\+[1-9]\d{7,14})$/.test(phone))fail(422,"INVALID_PHONE");
  const email=field(b.email,5,160,"EMAIL").toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(422,"INVALID_EMAIL");
  return {
    legalName:field(b.legalName,2,120,"LEGAL_NAME"),
    displayName:field(b.displayName,2,100,"DISPLAY_NAME"),clinicType,
    province:field(b.province,2,80,"PROVINCE"),city:field(b.city,2,80,"CITY"),
    district:optional(b.district,80),address:field(b.address,5,250,"ADDRESS"),
    phone,email,licenseNumber:optional(b.licenseNumber,80),timezone:"Asia/Kabul"
  };
}
function effectiveStatus(sub:any,plan:any) {
  if(!sub)return "unsubscribed";
  if(sub.status==="cancelled")return "cancelled";
  const end=sub.status==="trialing"?sub.trialEndsAt:sub.currentPeriodEndsAt;
  if(!end)return sub.status;
  if(new Date(end).getTime()>Date.now())return sub.status==="trialing"?"trialing":"active";
  if(sub.status!=="trialing" && Date.now()<new Date(end).getTime()+(plan?.graceDays||0)*86400000)return "grace";
  return "expired";
}
async function audit(tx:any,actor:string,clinic:string|null,action:string,id:string) {
  await tx.insert(schema.auditEvent).values({
    id:randomUUID(),actorId:actor,clinicId:clinic,action,subjectType:"clinic",subjectId:id,outcome:"success"
  });
}
async function notify(tx:any,clinic:string,kind:string) {
  await tx.insert(schema.outboxEvent).values({
    id:randomUUID(),kind,state:"pending",safePayload:JSON.stringify({clinicId:clinic})
  });
}
async function ownerClinic(req:R,id:string) {
  const clinic=await db.query.clinic.findFirst({where:and(eq(schema.clinic.id,id),eq(schema.clinic.ownerUserId,req.actor!.id))});
  if(!clinic)fail(404,"NOT_FOUND");
  return clinic;
}
async function adminClinic(id:string) {
  const clinic=await db.query.clinic.findFirst({where:eq(schema.clinic.id,id)});
  if(!clinic)fail(404,"NOT_FOUND");
  return clinic;
}
async function selectedPlan(id:unknown) {
  if(typeof id!=="string")fail(422,"INVALID_PLAN");
  const p=await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,id as string)});
  if(!p || !p.active || p.effectiveAt>new Date())fail(422,"PLAN_UNAVAILABLE");
  return p;
}
async function subscription(id:string) {
  const sub=await db.query.clinicSubscription.findFirst({where:eq(schema.clinicSubscription.clinicId,id)});
  const plan=sub?await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,sub.planVersionId)}):null;
  const invoices=await db.select({
    id:schema.platformInvoice.id,planVersionId:schema.platformInvoice.planVersionId,
    amountAfn:schema.platformInvoice.amountAfn,status:schema.platformInvoice.status,
    evidenceReference:schema.platformInvoice.evidenceReference,createdAt:schema.platformInvoice.createdAt
  }).from(schema.platformInvoice).where(eq(schema.platformInvoice.clinicId,id))
    .orderBy(desc(schema.platformInvoice.createdAt));
  return {subscription:sub??null,plan:plan??null,effectiveStatus:effectiveStatus(sub,plan),invoices};
}
export function phase02Router() {
  const api=Router();
  api.use((req,res,next)=>{
    const origin=req.headers.origin;
    const origins=[process.env.CLINIC_WEB_URL||"http://localhost:3000",
      process.env.ADMIN_WEB_URL||"http://localhost:3001",
      process.env.PATIENT_WEB_URL||"http://localhost:3002"];
    if(!["GET","HEAD","OPTIONS"].includes(req.method)&&origin&&!origins.includes(origin)){
      res.status(403).json({code:"ORIGIN_DENIED"});return;
    }
    next();
  });
  api.get("/public/plans",job(async(_req,res)=>{
    const plans=await db.select().from(schema.planVersion).where(eq(schema.planVersion.active,true))
      .orderBy(desc(schema.planVersion.version));
    const latest=new Map<string,typeof plans[number]>();
    for(const p of plans)if(p.effectiveAt<=new Date()&&!latest.has(p.planKey+":"+p.billingPeriod))
      latest.set(p.planKey+":"+p.billingPeriod,p);
    res.json({plans:[...latest.values()]});
  }));
  api.use(async(req:R,res,next)=>{
    try {
      const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
      if(!session?.user?.emailVerified)fail(401,"AUTH_REQUIRED");
      const membership=await db.query.platformAdmin.findFirst({where:eq(schema.platformAdmin.userId,session.user.id)});
      const factor=membership&&!membership.revokedAt
        ?await db.query.twoFactor.findFirst({where:eq(schema.twoFactor.userId,session.user.id)}):null;
      req.actor={id:session.user.id,admin:Boolean(membership&&!membership.revokedAt&&session.user.twoFactorEnabled&&factor?.verified)};
      next();
    } catch(error){next(error);}
  });
  const owner=(req:R)=>{if(req.actor!.admin)fail(403,"WORKSPACE_DENIED");};
  const admin=(req:R)=>{if(!req.actor!.admin)fail(403,"ADMIN_MFA_REQUIRED");};

  api.get("/clinics",job(async(req,res)=>{
    owner(req);
    const clinics=await db.select().from(schema.clinic).where(eq(schema.clinic.ownerUserId,req.actor!.id))
      .orderBy(desc(schema.clinic.createdAt));
    res.json({clinics});
  }));
  api.post("/clinics",job(async(req,res)=>{
    owner(req);
    const values=clinicBody(req.body);
    const plan=await selectedPlan(req.body.selectedPlanId);
    const id=randomUUID();
    await db.transaction(async tx=>{
      await tx.insert(schema.clinic).values({id,ownerUserId:req.actor!.id,...values,selectedPlanId:plan.id,status:"draft"});
      await audit(tx,req.actor!.id,id,"clinic.created",id);
    });
    res.status(201).json({clinic:await ownerClinic(req,id)});
  }));
  api.get("/clinics/:id",job(async(req,res)=>{
    owner(req);
    const c=await ownerClinic(req,String(req.params.id));
    const documents=await db.select({
      id:schema.clinicEvidence.id,kind:schema.clinicEvidence.kind,
      fileName:schema.clinicEvidence.fileName,sizeBytes:schema.clinicEvidence.sizeBytes
    }).from(schema.clinicEvidence).where(eq(schema.clinicEvidence.clinicId,c.id));
    const history=await db.select({
      action:schema.clinicReview.action,reason:schema.clinicReview.reason,createdAt:schema.clinicReview.createdAt
    }).from(schema.clinicReview).where(eq(schema.clinicReview.clinicId,c.id))
      .orderBy(desc(schema.clinicReview.createdAt));
    res.json({clinic:c,...await subscription(c.id),documents,history});
  }));
  api.patch("/clinics/:id",job(async(req,res)=>{
    owner(req);
    const c=await ownerClinic(req,String(req.params.id));
    if(Number(req.body?.revision)!==c.revision)fail(409,"STALE_REVISION");
    if(!["draft","needs_info","rejected","approved"].includes(c.status))fail(409,"UNDER_REVIEW");
    const values=clinicBody(req.body);
    const plan=c.status==="draft"?await selectedPlan(req.body.selectedPlanId):null;
    const status=c.status==="approved"?"pending":"draft";
    await db.transaction(async tx=>{
      const changed=await tx.update(schema.clinic).set({...values,status,revision:c.revision+1,
        selectedPlanId:plan?.id||c.selectedPlanId,updatedAt:new Date(),
        submittedAt:status==="pending"?new Date():c.submittedAt})
        .where(and(eq(schema.clinic.id,c.id),eq(schema.clinic.revision,c.revision))).returning({id:schema.clinic.id});
      if(!changed.length)fail(409,"STALE_REVISION");
      await audit(tx,req.actor!.id,c.id,"clinic.updated",c.id);
      if(status==="pending")await notify(tx,c.id,"clinic.verification.submitted");
    });
    res.json({clinic:await ownerClinic(req,c.id)});
  }));
  // A small, private, tightly restricted binary upload. No public file URL.
  api.post("/clinics/:id/evidence",express.raw({type:"application/octet-stream",limit:"2mb"}),job(async(req,res)=>{
    owner(req);
    const c=await ownerClinic(req,String(req.params.id));
    if(!["draft","needs_info","rejected"].includes(c.status))fail(409,"EVIDENCE_LOCKED");
    if(!Buffer.isBuffer(req.body))fail(415,"BINARY_REQUIRED");
    const bytes=req.body as Buffer;
    if(bytes.length<1||bytes.length>2097152)fail(413,"INVALID_FILE_SIZE");
    const kind=String(req.headers["x-document-kind"]||"");
    if(!["clinic_license","professional_credential","other"].includes(kind))fail(422,"INVALID_DOCUMENT_KIND");
    const name=field(req.headers["x-file-name"],1,110,"FILE_NAME").replaceAll("/","_").replaceAll("\\\\","_");
    let mime="";
    if(bytes.subarray(0,5).toString()==="%PDF-")mime="application/pdf";
    else if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime="image/png";
    else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime="image/jpeg";
    else fail(415,"INVALID_FILE_FORMAT");
    const id=randomUUID();
    await db.transaction(async tx=>{
      await tx.insert(schema.clinicEvidence).values({
        id,clinicId:c.id,kind,fileName:name,mime,sizeBytes:bytes.length,
        digest:createHash("sha256").update(bytes).digest("hex"),
        content:bytes.toString("base64"),uploadedBy:req.actor!.id
      });
      await audit(tx,req.actor!.id,c.id,"clinic.evidence.uploaded",id);
    });
    res.status(201).json({id,kind,fileName:name,sizeBytes:bytes.length});
  }));
  api.post("/clinics/:id/submit",job(async(req,res)=>{
    owner(req);
    const c=await ownerClinic(req,String(req.params.id));
    if(!["draft","needs_info","rejected"].includes(c.status))fail(409,"SUBMISSION_LOCKED");
    if(req.body?.attested!==true)fail(422,"ATTESTATION_REQUIRED");
    if(!c.selectedPlanId)fail(422,"PLAN_REQUIRED");
    const docs=await db.select({id:schema.clinicEvidence.id}).from(schema.clinicEvidence)
      .where(and(eq(schema.clinicEvidence.clinicId,c.id),eq(schema.clinicEvidence.kind,"clinic_license")));
    if(!docs.length)fail(422,"CLINIC_LICENSE_REQUIRED");
    const p=await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,c.selectedPlanId)});
    if(!p)fail(422,"PLAN_UNAVAILABLE");
    const previous=await db.query.clinicSubscription.findFirst({where:eq(schema.clinicSubscription.clinicId,c.id)});
    if(!previous&&!p.active)fail(422,"PLAN_UNAVAILABLE");
    await db.transaction(async tx=>{
      const changed=await tx.update(schema.clinic).set({
        status:"pending",submittedAt:new Date(),updatedAt:new Date(),revision:c.revision+1
      }).where(and(eq(schema.clinic.id,c.id),eq(schema.clinic.revision,c.revision))).returning({id:schema.clinic.id});
      if(!changed.length)fail(409,"STALE_REVISION");
      if(!previous)await tx.insert(schema.clinicSubscription).values({
        id:randomUUID(),clinicId:c.id,planVersionId:p.id,status:"trialing",
        trialEndsAt:new Date(Date.now()+p.trialDays*86400000)
      });
      await tx.insert(schema.clinicReview).values({
        id:randomUUID(),clinicId:c.id,actorId:req.actor!.id,action:"submitted"
      });
      await audit(tx,req.actor!.id,c.id,"clinic.submitted",c.id);
      await notify(tx,c.id,"clinic.verification.submitted");
    });
    res.json({clinic:await ownerClinic(req,c.id),...await subscription(c.id)});
  }));
  api.post("/clinics/:id/subscription/request",job(async(req,res)=>{
    owner(req);
    const c=await ownerClinic(req,String(req.params.id));
    const sub=await db.query.clinicSubscription.findFirst({where:eq(schema.clinicSubscription.clinicId,c.id)});
    if(!sub)fail(409,"SUBSCRIPTION_NOT_STARTED");
    const plan=await selectedPlan(req.body?.planVersionId);
    const evidenceReference=field(req.body?.evidenceReference,5,160,"PAYMENT_REFERENCE");
    const id=randomUUID();
    try {
      await db.transaction(async tx=>{
        await tx.insert(schema.platformInvoice).values({
          id,clinicId:c.id,planVersionId:plan.id,amountAfn:plan.priceAfn,
          evidenceReference,status:"awaiting"
        });
        await tx.update(schema.clinicSubscription).set({
          pendingPlanVersionId:plan.id,updatedAt:new Date()
        }).where(eq(schema.clinicSubscription.clinicId,c.id));
        await audit(tx,req.actor!.id,c.id,"subscription.payment.requested",id);
        await notify(tx,c.id,"subscription.payment.review");
      });
    } catch(e) { if((e as any)?.code==="23505")fail(409,"INVOICE_ALREADY_PENDING"); throw e; }
    res.status(201).json({invoiceId:id,status:"awaiting",amountAfn:plan.priceAfn});
  }));
  api.get("/admin/overview",job(async(req,res)=>{
    admin(req);
    const clinics=await db.select({status:schema.clinic.status}).from(schema.clinic);
    const invoices=await db.select({status:schema.platformInvoice.status}).from(schema.platformInvoice);
    const counts:Record<string,number>={};
    for(const c of clinics)counts[c.status]=(counts[c.status]||0)+1;
    res.json({clinics:counts,pendingInvoices:invoices.filter(i=>i.status==="awaiting").length});
  }));
  api.get("/admin/clinics",job(async(req,res)=>{
    admin(req);
    const status=String(req.query.status||"pending");
    if(!["pending","needs_info","approved","rejected","suspended","draft","all"].includes(status))fail(422,"INVALID_FILTER");
    const page=Math.min(100000,Math.max(1,Number.parseInt(String(req.query.page||"1"),10)||1));
    const state=status==="all"?undefined:status==="pending"
      ?inArray(schema.clinic.status,["pending","needs_info"]):eq(schema.clinic.status,status);
    const q=String(req.query.q||"").trim().slice(0,80);
    const search=q?or(ilike(schema.clinic.displayName,"%"+q+"%"),
      ilike(schema.clinic.city,"%"+q+"%"),
      ilike(schema.clinic.licenseNumber,"%"+q+"%")):undefined;
    const filter=and(state,search);
    const clinics=await db.select().from(schema.clinic).where(filter).orderBy(desc(schema.clinic.updatedAt))
      .limit(20).offset((page-1)*20);
    const count=(await db.select({id:schema.clinic.id}).from(schema.clinic).where(filter)).length;
    res.json({clinics,page,total:count});
  }));
  api.get("/admin/clinics/:id",job(async(req,res)=>{
    admin(req);
    const c=await adminClinic(String(req.params.id));
    const documents=await db.select({
      id:schema.clinicEvidence.id,kind:schema.clinicEvidence.kind,fileName:schema.clinicEvidence.fileName,
      sizeBytes:schema.clinicEvidence.sizeBytes,mime:schema.clinicEvidence.mime
    }).from(schema.clinicEvidence).where(eq(schema.clinicEvidence.clinicId,c.id));
    const history=await db.select().from(schema.clinicReview).where(eq(schema.clinicReview.clinicId,c.id))
      .orderBy(desc(schema.clinicReview.createdAt));
    res.json({clinic:c,...await subscription(c.id),documents,history});
  }));
  api.get("/admin/clinics/:id/evidence/:doc",job(async(req,res)=>{
    admin(req);
    const c=await adminClinic(String(req.params.id));
    const d=await db.query.clinicEvidence.findFirst({where:and(
      eq(schema.clinicEvidence.clinicId,c.id),eq(schema.clinicEvidence.id,String(req.params.doc))
    )});
    if(!d)fail(404,"NOT_FOUND");
    await db.insert(schema.auditEvent).values({
      id:randomUUID(),actorId:req.actor!.id,clinicId:c.id,action:"clinic.evidence.read",
      subjectType:"verification_document",subjectId:d.id,outcome:"success"
    });
    res.setHeader("Cache-Control","private, no-store");
    res.setHeader("X-Content-Type-Options","nosniff");
    res.setHeader("Content-Disposition",'attachment; filename="verification-evidence"');
    res.type(d.mime).send(Buffer.from(d.content,"base64"));
  }));
  api.post("/admin/clinics/:id/review",job(async(req,res)=>{
    admin(req);
    const c=await adminClinic(String(req.params.id));
    const action=String(req.body?.action);
    const allowed:Record<string,string[]>={
      approve:["pending","suspended"],needs_info:["pending"],
      reject:["pending"],suspend:["approved"],reopen:["suspended"]
    };
    if(!allowed[action]?.includes(c.status))fail(409,"INVALID_VERIFICATION_TRANSITION");
    const reason=action==="approve"?optional(req.body?.reason,500):field(req.body?.reason,5,500,"REASON");
    if(["approve","suspend"].includes(action)&&req.body?.confirmation!==c.displayName)
      fail(422,"CONFIRMATION_REQUIRED");
    if(action==="approve"){
      const docs=await db.select({id:schema.clinicEvidence.id}).from(schema.clinicEvidence)
        .where(and(eq(schema.clinicEvidence.clinicId,c.id),eq(schema.clinicEvidence.kind,"clinic_license")));
      if(!docs.length)fail(422,"CLINIC_LICENSE_REQUIRED");
    }
    const status=action==="approve"?"approved":action==="reopen"?"pending":action==="suspend"?"suspended":action==="reject"?"rejected":action;
    await db.transaction(async tx=>{
      const changed=await tx.update(schema.clinic).set({status,reviewedAt:new Date(),
        updatedAt:new Date(),revision:c.revision+1})
        .where(and(eq(schema.clinic.id,c.id),eq(schema.clinic.revision,c.revision)))
        .returning({id:schema.clinic.id});
      if(!changed.length)fail(409,"STALE_REVISION");
      await tx.insert(schema.clinicReview).values({
        id:randomUUID(),clinicId:c.id,actorId:req.actor!.id,action,reason
      });
      await audit(tx,req.actor!.id,c.id,"clinic.review."+action,c.id);
      await notify(tx,c.id,"clinic.verification.updated");
    });
    res.json({clinic:await adminClinic(c.id)});
  }));
  api.get("/admin/plans",job(async(req,res)=>{
    admin(req);
    res.json({plans:await db.select().from(schema.planVersion).orderBy(desc(schema.planVersion.createdAt))});
  }));
  api.post("/admin/plans",job(async(req,res)=>{
    admin(req);
    const b=req.body||{};
    if(!["starter","professional","business"].includes(b.planKey)||
       !["monthly","annual"].includes(b.billingPeriod))fail(422,"INVALID_PLAN");
    for(const [name,min,max] of [["priceAfn",1,100000000],["staffLimit",1,100000],
      ["branchLimit",1,10000],["trialDays",0,30],["graceDays",0,30]] as const){
      if(!Number.isInteger(b[name])||b[name]<min||b[name]>max)fail(422,"INVALID_"+name.toUpperCase());
    }
    const label=field(b.label,2,80,"LABEL");
    const id=randomUUID();
    try{
      await db.transaction(async tx=>{
        const old=await tx.select({version:schema.planVersion.version}).from(schema.planVersion)
          .where(and(eq(schema.planVersion.planKey,b.planKey),eq(schema.planVersion.billingPeriod,b.billingPeriod)));
        await tx.update(schema.planVersion).set({active:false}).where(
          and(eq(schema.planVersion.planKey,b.planKey),eq(schema.planVersion.billingPeriod,b.billingPeriod))
        );
        await tx.insert(schema.planVersion).values({
          id,planKey:b.planKey,version:Math.max(0,...old.map(x=>x.version))+1,label,
          billingPeriod:b.billingPeriod,priceAfn:b.priceAfn,staffLimit:b.staffLimit,
          branchLimit:b.branchLimit,trialDays:b.trialDays,graceDays:b.graceDays,
          entitlements:"core",createdBy:req.actor!.id
        });
        await audit(tx,req.actor!.id,null,"plan.version.created",id);
      });
    }catch(e){if((e as any)?.code==="23505")fail(409,"PLAN_VERSION_CONFLICT");throw e;}
    res.status(201).json({plan:await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,id)})});
  }));
  api.patch("/admin/plans/:id",job(async(req,res)=>{
    admin(req);
    if(typeof req.body?.active!=="boolean")fail(422,"INVALID_ACTIVE");
    const p=await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,String(req.params.id))});
    if(!p)fail(404,"NOT_FOUND");
    await db.transaction(async tx=>{
      await tx.update(schema.planVersion).set({active:req.body.active}).where(eq(schema.planVersion.id,p.id));
      await audit(tx,req.actor!.id,null,"plan.availability.changed",p.id);
    });
    res.json({active:req.body.active});
  }));
  api.get("/admin/subscriptions",job(async(req,res)=>{
    admin(req);
    const subs=await db.select({
      clinicId:schema.clinic.id,clinicName:schema.clinic.displayName,
      status:schema.clinicSubscription.status,trialEndsAt:schema.clinicSubscription.trialEndsAt,
      currentPeriodEndsAt:schema.clinicSubscription.currentPeriodEndsAt,
      planVersionId:schema.clinicSubscription.planVersionId
    }).from(schema.clinicSubscription).innerJoin(schema.clinic,eq(schema.clinic.id,schema.clinicSubscription.clinicId))
      .orderBy(desc(schema.clinicSubscription.updatedAt)).limit(100);
    const plans=await db.select().from(schema.planVersion);
    res.json({subscriptions:subs.map(s=>({...s,
      effectiveStatus:effectiveStatus(s,plans.find(p=>p.id===s.planVersionId))}))});
  }));
  api.get("/admin/invoices",job(async(req,res)=>{
    admin(req);
    const invoices=await db.select({
      id:schema.platformInvoice.id,clinicId:schema.platformInvoice.clinicId,
      clinicName:schema.clinic.displayName,amountAfn:schema.platformInvoice.amountAfn,
      planVersionId:schema.platformInvoice.planVersionId,status:schema.platformInvoice.status,
      evidenceReference:schema.platformInvoice.evidenceReference,
      createdAt:schema.platformInvoice.createdAt
    }).from(schema.platformInvoice).innerJoin(schema.clinic,eq(schema.clinic.id,schema.platformInvoice.clinicId))
      .orderBy(desc(schema.platformInvoice.createdAt)).limit(100);
    res.json({invoices});
  }));
  api.post("/admin/invoices/:id/decision",job(async(req,res)=>{
    admin(req);
    const invoice=await db.query.platformInvoice.findFirst({where:eq(schema.platformInvoice.id,String(req.params.id))});
    if(!invoice)fail(404,"NOT_FOUND");
    if(invoice.status!=="awaiting")fail(409,"INVOICE_ALREADY_DECIDED");
    const action=String(req.body?.action);
    if(!["confirm","reject"].includes(action))fail(422,"INVALID_ACTION");
    field(req.body?.reason,5,400,"REASON");
    if(action==="confirm"&&req.body?.confirmation!==invoice.evidenceReference)fail(422,"CONFIRMATION_REQUIRED");
    const p=await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,invoice.planVersionId)});
    if(!p)fail(409,"PLAN_MISSING");
    const end=new Date(Date.now()+(p.billingPeriod==="annual"?365:30)*86400000);
    await db.transaction(async tx=>{
      const changed=await tx.update(schema.platformInvoice).set({
        status:action==="confirm"?"paid":"void",verifiedBy:req.actor!.id,
        verifiedAt:new Date(),periodEndsAt:action==="confirm"?end:null
      }).where(and(eq(schema.platformInvoice.id,invoice.id),eq(schema.platformInvoice.status,"awaiting")))
        .returning({id:schema.platformInvoice.id});
      if(!changed.length)fail(409,"INVOICE_ALREADY_DECIDED");
      await tx.update(schema.clinicSubscription).set({
        pendingPlanVersionId:null,updatedAt:new Date(),
        ...(action==="confirm"?{planVersionId:p.id,status:"active",currentPeriodEndsAt:end}:{})
      }).where(eq(schema.clinicSubscription.clinicId,invoice.clinicId));
      await audit(tx,req.actor!.id,invoice.clinicId,"subscription.invoice."+action,invoice.id);
      await notify(tx,invoice.clinicId,"subscription.invoice.decision");
    });
    res.json({status:action==="confirm"?"paid":"void",periodEndsAt:action==="confirm"?end:null});
  }));
  api.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{
    if(err instanceof Fault){res.status(err.status).json({code:err.code});return;}
    if((err as any)?.code==="23505"){res.status(409).json({code:"DUPLICATE"});return;}
    console.error("PH02 API error",err instanceof Error?err.name:"unknown");
    res.status(500).json({code:"INTERNAL_ERROR"});
  });
  return api;
}
