import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, gt, inArray, lte } from "drizzle-orm";
import { db, schema } from "@dandanlink/db";
import { sendAccountMail } from "./mail.js";
import { authStaff, audit, fail, mayAssign, outbox, permission,
  required, roleValid, type StaffRequest } from "./staff-access.js";

const digest=(s:string)=>createHash("sha256").update(s).digest("hex");
const issueToken=()=>randomBytes(32).toString("base64url");
const work=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
  (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const emailOf=(value:unknown)=>{
  const address=required(value,5,160,"EMAIL").toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))fail(422,"INVALID_EMAIL");
  return address;
};
const safeInvite=(i:typeof schema.clinicInvitation.$inferSelect)=>({
  id:i.id,email:i.email,role:i.role,clinicId:i.clinicId,
  status:i.status==="pending"&&i.expiresAt<=new Date()?"expired":i.status,
  expiresAt:i.expiresAt,sentAt:i.sentAt,createdAt:i.createdAt,resolvedAt:i.resolvedAt,
  resolutionReason:i.resolutionReason,
  resendCount:i.resendCount
});
async function emailInvite(to:string,clinicName:string,raw:string){
  const url=(process.env.CLINIC_WEB_URL||"http://localhost:3000")+
    "/clinic/invite?token="+encodeURIComponent(raw);
  await sendAccountMail({to,subject:"DandanLink clinic staff invitation — "+clinicName,url});
}
async function seatLimit(cid:string){
  const sub=await db.query.clinicSubscription.findFirst({where:eq(schema.clinicSubscription.clinicId,cid)});
  if(!sub)fail(403,"SUBSCRIPTION_REQUIRED");
  const plan=await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,sub.planVersionId)});
  if(!plan)fail(403,"PLAN_REQUIRED");
  const end=sub.status==="trialing"?sub.trialEndsAt:sub.currentPeriodEndsAt;
  if(sub.status==="cancelled"||(end&&end.getTime()+(sub.status==="trialing"?0:plan.graceDays*86400000)<Date.now()))
    fail(403,"SUBSCRIPTION_EXPIRED");
  return plan.staffLimit;
}
async function countSeats(tx:any,cid:string){
  const seats=await tx.select({id:schema.clinicMembership.id}).from(schema.clinicMembership)
    .where(and(eq(schema.clinicMembership.clinicId,cid),
      inArray(schema.clinicMembership.status,["active","suspended"])));
  const open=await tx.select({id:schema.clinicInvitation.id}).from(schema.clinicInvitation)
    .where(and(eq(schema.clinicInvitation.clinicId,cid),
      eq(schema.clinicInvitation.status,"pending"),gt(schema.clinicInvitation.expiresAt,new Date())));
  return seats.length+open.length;
}
async function lockClinic(tx:any,cid:string){
  await tx.select({id:schema.clinic.id}).from(schema.clinic).where(eq(schema.clinic.id,cid)).for("update");
}

export function staffInvitationsRouter(){
  const router=Router();
  // Token possession does not provide access to staff or account data.
  router.get("/preview",work(async(req,res)=>{
    const raw=String(req.query.token||"");
    if(raw.length<30||raw.length>100)fail(404,"INVITATION_NOT_FOUND");
    const i=await db.query.clinicInvitation.findFirst({where:eq(schema.clinicInvitation.tokenHash,digest(raw))});
    if(!i)fail(404,"INVITATION_NOT_FOUND");
    const clinic=await db.query.clinic.findFirst({where:eq(schema.clinic.id,i.clinicId)});
    if(!clinic)fail(404,"INVITATION_NOT_FOUND");
    const hint=i.email.replace(/^(.).*(@.*)$/,"$1***$2");
    res.setHeader("Cache-Control","no-store");
    res.json({clinicName:clinic.displayName,role:i.role,
      status:i.status==="pending"&&i.expiresAt<=new Date()?"expired":i.status,
      emailHint:hint,expiresAt:i.expiresAt});
  }));
  router.use(authStaff);
  router.post("/accept",work(async(req,res)=>{
    const raw=required(req.body?.token,30,100,"TOKEN");
    const i=await db.query.clinicInvitation.findFirst({where:eq(schema.clinicInvitation.tokenHash,digest(raw))});
    if(!i||i.status!=="pending")fail(409,"INVITATION_UNAVAILABLE");
    if(i.expiresAt<=new Date())fail(410,"INVITATION_EXPIRED");
    if(i.email!==req.actor!.email.toLowerCase())fail(403,"INVITED_EMAIL_REQUIRED");
    const clinic=await db.query.clinic.findFirst({where:eq(schema.clinic.id,i.clinicId)});
    if(!clinic||clinic.ownerUserId===req.actor!.id)fail(409,"MEMBERSHIP_CONFLICT");
    const prior=await db.query.clinicMembership.findFirst({where:and(
      eq(schema.clinicMembership.clinicId,i.clinicId),eq(schema.clinicMembership.userId,req.actor!.id)
    )});
    if(prior&&prior.status!=="revoked")fail(409,"ALREADY_MEMBER");
    const id=prior?.id||randomUUID();
    await db.transaction(async tx=>{
      const reserved=await tx.update(schema.clinicInvitation).set({
        status:"accepted",acceptedBy:req.actor!.id,resolvedAt:new Date(),updatedAt:new Date()
      }).where(and(eq(schema.clinicInvitation.id,i.id),eq(schema.clinicInvitation.status,"pending"),
        gt(schema.clinicInvitation.expiresAt,new Date()))).returning({id:schema.clinicInvitation.id});
      if(!reserved.length)fail(409,"INVITATION_UNAVAILABLE");
      if(prior){
        await tx.update(schema.clinicMembership).set({role:i.role,status:"active",changedAt:new Date(),
          suspendedAt:null,revokedAt:null,reason:null,invitedBy:i.invitedBy})
          .where(eq(schema.clinicMembership.id,prior.id));
      }else await tx.insert(schema.clinicMembership).values({
        id,clinicId:i.clinicId,userId:req.actor!.id,role:i.role,status:"active",invitedBy:i.invitedBy
      });
      if(i.role==="dentist")await tx.insert(schema.dentistDraft).values({
        membershipId:id,clinicId:i.clinicId,userId:req.actor!.id,displayName:req.actor!.name,
        updatedBy:req.actor!.id,verificationState:"unverified"
      }).onConflictDoNothing();
      await audit(tx,req.actor!.id,i.clinicId,"staff.invitation.accepted",id);
      await outbox(tx,i.clinicId,"staff.invitation.accepted");
    });
    res.json({clinicId:i.clinicId,membershipId:id,role:i.role});
  }));
  return router;
}
export function clinicInviteRouter(){
  const router=Router({mergeParams:true});
  router.use(authStaff);
  router.get("/",work(async(req,res)=>{
    const cid=String(req.params.clinicId);
    await permission(req,cid,"staff.read");
    const rows=await db.select().from(schema.clinicInvitation)
      .where(eq(schema.clinicInvitation.clinicId,cid))
      .orderBy(desc(schema.clinicInvitation.createdAt)).limit(100);
    res.json({invitations:rows.map(safeInvite)});
  }));
  router.post("/",work(async(req,res)=>{
    const cid=String(req.params.clinicId);
    const scope=await permission(req,cid,"staff.invite",true);
    const email=emailOf(req.body?.email);
    const role=req.body?.role;
    if(!roleValid(role)||!mayAssign(scope.role,role))fail(403,"ROLE_CEILING");
    if(email===req.actor!.email.toLowerCase())fail(422,"SELF_INVITE_FORBIDDEN");
    const known=await db.query.user.findFirst({where:eq(schema.user.email,email)});
    if(known){
      const member=await db.query.clinicMembership.findFirst({where:and(
        eq(schema.clinicMembership.clinicId,cid),eq(schema.clinicMembership.userId,known.id)
      )});
      if(member&&member.status!=="revoked")fail(409,"ALREADY_MEMBER");
    }
    const staffLimit=await seatLimit(cid), raw=issueToken(), inviteId=randomUUID();
    await db.transaction(async tx=>{
      await lockClinic(tx,cid);
      await tx.update(schema.clinicInvitation).set({status:"expired",resolvedAt:new Date(),updatedAt:new Date()})
        .where(and(eq(schema.clinicInvitation.clinicId,cid),eq(schema.clinicInvitation.email,email),
          eq(schema.clinicInvitation.status,"pending"),lte(schema.clinicInvitation.expiresAt,new Date())));
      const existing=await tx.select({id:schema.clinicInvitation.id}).from(schema.clinicInvitation)
        .where(and(eq(schema.clinicInvitation.clinicId,cid),
          eq(schema.clinicInvitation.email,email),eq(schema.clinicInvitation.status,"pending")));
      if(existing.length)fail(409,"INVITATION_ALREADY_PENDING");
      if(await countSeats(tx,cid)>=staffLimit)fail(409,"PLAN_STAFF_LIMIT");
      await tx.insert(schema.clinicInvitation).values({
        id:inviteId,clinicId:cid,email,role,tokenHash:digest(raw),
        expiresAt:new Date(Date.now()+7*86400000),invitedBy:req.actor!.id
      });
      await audit(tx,req.actor!.id,cid,"staff.invitation.created",inviteId);
    });
    try{
      await emailInvite(email,scope.clinic.displayName,raw);
      await db.update(schema.clinicInvitation).set({sentAt:new Date()})
        .where(eq(schema.clinicInvitation.id,inviteId));
    }catch{fail(503,"INVITATION_DELIVERY_FAILED");}
    res.status(201).json({invitationId:inviteId,status:"pending",expiresInDays:7});
  }));
  router.post("/:invitationId/resend",work(async(req,res)=>{
    const cid=String(req.params.clinicId),iid=String(req.params.invitationId);
    const scope=await permission(req,cid,"staff.invite",true);
    const invite=await db.query.clinicInvitation.findFirst({where:and(
      eq(schema.clinicInvitation.id,iid),eq(schema.clinicInvitation.clinicId,cid)
    )});
    if(!invite||["accepted","revoked"].includes(invite.status))fail(409,"INVITATION_UNAVAILABLE");
    if(!mayAssign(scope.role,invite.role))fail(403,"ROLE_CEILING");
    if(invite.resendCount>=25)fail(429,"RESEND_LIMIT");
    if(invite.sentAt&&Date.now()-invite.sentAt.getTime()<60000)fail(429,"RESEND_COOLDOWN");
    const staffLimit=await seatLimit(cid), raw=issueToken();
    await db.transaction(async tx=>{
      await lockClinic(tx,cid);
      const pending=await tx.select({id:schema.clinicInvitation.id}).from(schema.clinicInvitation)
        .where(and(eq(schema.clinicInvitation.clinicId,cid),eq(schema.clinicInvitation.email,invite.email),
          eq(schema.clinicInvitation.status,"pending")));
      if(pending.some(x=>x.id!==iid))fail(409,"INVITATION_ALREADY_PENDING");
      if((invite.status==="expired"||invite.expiresAt<=new Date()) &&
        await countSeats(tx,cid)>=staffLimit)fail(409,"PLAN_STAFF_LIMIT");
      await tx.update(schema.clinicInvitation).set({
        status:"pending",tokenHash:digest(raw),expiresAt:new Date(Date.now()+7*86400000),
        sentAt:null,updatedAt:new Date(),resolvedAt:null,resendCount:invite.resendCount+1,
        invitedBy:req.actor!.id
      }).where(eq(schema.clinicInvitation.id,iid));
      await audit(tx,req.actor!.id,cid,"staff.invitation.resent",iid);
    });
    try{
      await emailInvite(invite.email,scope.clinic.displayName,raw);
      await db.update(schema.clinicInvitation).set({sentAt:new Date()})
        .where(eq(schema.clinicInvitation.id,iid));
    }catch{fail(503,"INVITATION_DELIVERY_FAILED");}
    res.json({status:"pending",expiresInDays:7});
  }));
  router.post("/:invitationId/revoke",work(async(req,res)=>{
    const cid=String(req.params.clinicId),iid=String(req.params.invitationId);
    const scope=await permission(req,cid,"staff.manage",true);
    const invite=await db.query.clinicInvitation.findFirst({where:and(
      eq(schema.clinicInvitation.id,iid),eq(schema.clinicInvitation.clinicId,cid)
    )});
    if(!invite||invite.status!=="pending")fail(409,"INVITATION_UNAVAILABLE");
    if(!mayAssign(scope.role,invite.role))fail(403,"ROLE_CEILING");
    const reason=required(req.body?.reason,5,300,"REASON");
    await db.transaction(async tx=>{
      const updated=await tx.update(schema.clinicInvitation).set({
        status:"revoked",resolvedAt:new Date(),resolutionReason:reason,updatedAt:new Date()
      }).where(and(eq(schema.clinicInvitation.id,iid),eq(schema.clinicInvitation.status,"pending")))
        .returning({id:schema.clinicInvitation.id});
      if(!updated.length)fail(409,"INVITATION_UNAVAILABLE");
      await audit(tx,req.actor!.id,cid,"staff.invitation.revoked",iid);
      await outbox(tx,cid,"staff.invitation.revoked");
    });
    res.json({revoked:true});
  }));
  return router;
}
