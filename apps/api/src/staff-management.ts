import { randomUUID } from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@dandanlink/db";
import { audit, authStaff, capabilities, fail, mayAssign, optional, outbox,
  permission, required, revokeSessions, roleValid, scope, type StaffRequest } from "./staff-access.js";
type Member=typeof schema.clinicMembership.$inferSelect;
const work=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
  (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
function cid(req:Request){return String(req.params.clinicId);}
async function memberById(clinicId:string,id:string){
  const member=await db.query.clinicMembership.findFirst({where:and(
    eq(schema.clinicMembership.clinicId,clinicId),eq(schema.clinicMembership.id,id)
  )});
  if(!member)fail(404,"STAFF_NOT_FOUND");
  return member;
}
async function person(m:Member){
  const u=await db.query.user.findFirst({where:eq(schema.user.id,m.userId)});
  return {...m,name:u?.name||"—",email:u?.email||"",mfaEnabled:!!u?.twoFactorEnabled};
}
function dentistBody(input:any){
  if(!input||typeof input!=="object")fail(422,"INVALID_DENTIST_DRAFT");
  const years=input.experienceYears===null||input.experienceYears===""||
    input.experienceYears===undefined?null:Number(input.experienceYears);
  if(years!==null&&(!Number.isInteger(years)||years<0||years>70))fail(422,"INVALID_EXPERIENCE");
  return {
    displayName:required(input.displayName,2,120,"DISPLAY_NAME"),
    specialty:optional(input.specialty,120,"SPECIALTY"),
    qualifications:optional(input.qualifications,300,"QUALIFICATIONS"),
    professionalLicense:optional(input.professionalLicense,100,"LICENSE"),
    experienceYears:years,biography:optional(input.biography,1000,"BIOGRAPHY")
  };
}
export function staffManagementRouter(){
  const router=Router({mergeParams:true});
  router.use(authStaff);
  router.get("/team",work(async(req,res)=>{
    const clinicId=cid(req);
    await permission(req,clinicId,"staff.read");
    const members=await db.select().from(schema.clinicMembership).where(
      eq(schema.clinicMembership.clinicId,clinicId)
    ).orderBy(desc(schema.clinicMembership.joinedAt));
    const users=members.length?await db.select({
      id:schema.user.id,name:schema.user.name,email:schema.user.email,
      twoFactorEnabled:schema.user.twoFactorEnabled
    }).from(schema.user).where(inArray(schema.user.id,members.map(x=>x.userId))):[];
    const byId=new Map(users.map(x=>[x.id,x]));
    res.setHeader("Cache-Control","no-store");
    res.json({members:members.map(m=>({...m,
      name:byId.get(m.userId)?.name||"—",email:byId.get(m.userId)?.email||"",
      mfaEnabled:!!byId.get(m.userId)?.twoFactorEnabled}))});
  }));
  router.get("/dentists",work(async(req,res)=>{
    const clinicId=cid(req);
    await permission(req,clinicId,"dentist.read");
    const members=await db.select().from(schema.clinicMembership).where(
      and(eq(schema.clinicMembership.clinicId,clinicId),eq(schema.clinicMembership.role,"dentist"))
    ).orderBy(desc(schema.clinicMembership.joinedAt));
    const dentists=[];
    for(const m of members){
      const u=await db.query.user.findFirst({where:eq(schema.user.id,m.userId)});
      const draft=await db.query.dentistDraft.findFirst({where:eq(schema.dentistDraft.membershipId,m.id)});
      dentists.push({...(await person(m)),draft:draft||null});
    }
    res.json({dentists});
  }));
  router.get("/security",work(async(req,res)=>{
    const clinicId=cid(req);
    await permission(req,clinicId,"security.read");
    const members=await db.select().from(schema.clinicMembership).where(
      eq(schema.clinicMembership.clinicId,clinicId)
    );
    const users=members.length?await db.select({
      id:schema.user.id,name:schema.user.name,email:schema.user.email,
      twoFactorEnabled:schema.user.twoFactorEnabled
    }).from(schema.user).where(inArray(schema.user.id,members.map(m=>m.userId))):[];
    const byId=new Map(users.map(x=>[x.id,x]));
    const events=await db.select({
      id:schema.auditEvent.id,action:schema.auditEvent.action,actorId:schema.auditEvent.actorId,
      subjectId:schema.auditEvent.subjectId,outcome:schema.auditEvent.outcome,
      createdAt:schema.auditEvent.createdAt
    }).from(schema.auditEvent).where(eq(schema.auditEvent.clinicId,clinicId))
      .orderBy(desc(schema.auditEvent.createdAt)).limit(60);
    res.setHeader("Cache-Control","no-store");
    res.json({
      access:members.map(m=>({id:m.id,role:m.role,status:m.status,changedAt:m.changedAt,
        name:byId.get(m.userId)?.name||"—",email:byId.get(m.userId)?.email||"",
        mfaEnabled:!!byId.get(m.userId)?.twoFactorEnabled})),
      events
    });
  }));
  router.get("/staff/:membershipId",work(async(req,res)=>{
    const clinicId=cid(req), ctx=await scope(req,clinicId);
    const m=await memberById(clinicId,String(req.params.membershipId));
    const privileged=capabilities[ctx.role].includes("staff.read");
    if(!privileged&&m.userId!==req.actor!.id)await permission(req,clinicId,"staff.read");
    const draft=m.role==="dentist"?await db.query.dentistDraft.findFirst({
      where:eq(schema.dentistDraft.membershipId,m.id)
    }):null;
    const events=privileged?await db.select({
      action:schema.auditEvent.action,createdAt:schema.auditEvent.createdAt,
      actorId:schema.auditEvent.actorId,outcome:schema.auditEvent.outcome
    }).from(schema.auditEvent).where(and(
      eq(schema.auditEvent.clinicId,clinicId),eq(schema.auditEvent.subjectId,m.id)
    )).orderBy(desc(schema.auditEvent.createdAt)).limit(50):[];
    res.setHeader("Cache-Control","no-store");
    res.json({member:await person(m),draft:draft||null,events,
      canManage:ctx.role==="owner"&&m.role!=="owner"&&m.userId!==req.actor!.id||
        ctx.role==="manager"&&m.role!=="owner"&&m.role!=="manager"&&m.userId!==req.actor!.id,
      canEditDentist:m.role==="dentist" && (privileged||m.userId===req.actor!.id)});
  }));
  router.post("/staff/:membershipId/role",work(async(req,res)=>{
    const clinicId=cid(req),ctx=await permission(req,clinicId,"staff.manage",true);
    const m=await memberById(clinicId,String(req.params.membershipId));
    if(m.role==="owner"||m.userId===req.actor!.id)fail(403,"PROTECTED_MEMBERSHIP");
    const nextRole=req.body?.role;
    if(!roleValid(nextRole)||!mayAssign(ctx.role,nextRole,m.role))fail(403,"ROLE_CEILING");
    if(m.status!=="active")fail(409,"MEMBERSHIP_INACTIVE");
    if(m.role===nextRole)fail(409,"ROLE_UNCHANGED");
    const reason=required(req.body?.reason,5,300,"REASON");
    await db.transaction(async tx=>{
      const changed=await tx.update(schema.clinicMembership).set({
        role:nextRole,changedAt:new Date(),reason
      }).where(and(eq(schema.clinicMembership.id,m.id),eq(schema.clinicMembership.role,m.role),
        eq(schema.clinicMembership.status,"active"))).returning({id:schema.clinicMembership.id});
      if(!changed.length)fail(409,"STALE_MEMBERSHIP");
      if(nextRole==="dentist"){
        const u=await db.query.user.findFirst({where:eq(schema.user.id,m.userId)});
        await tx.insert(schema.dentistDraft).values({
          membershipId:m.id,clinicId,userId:m.userId,displayName:u?.name||"Dentist",
          updatedBy:req.actor!.id
        }).onConflictDoNothing();
      }
      // Unclaimed invites issued by a demoted manager cannot silently survive.
      await tx.update(schema.clinicInvitation).set({status:"revoked",resolutionReason:"Inviter permission revoked",resolvedAt:new Date(),updatedAt:new Date()})
        .where(and(eq(schema.clinicInvitation.clinicId,clinicId),
          eq(schema.clinicInvitation.invitedBy,m.userId),eq(schema.clinicInvitation.status,"pending")));
      await revokeSessions(tx,m.userId);
      await audit(tx,req.actor!.id,clinicId,"staff.role.changed",m.id);
    });
    res.json({member:await person(await memberById(clinicId,m.id)),sessionsRevoked:true});
  }));
  router.post("/staff/:membershipId/status",work(async(req,res)=>{
    const clinicId=cid(req),ctx=await permission(req,clinicId,"staff.manage",true);
    const m=await memberById(clinicId,String(req.params.membershipId));
    if(m.role==="owner"||m.userId===req.actor!.id||!mayAssign(ctx.role,m.role,m.role))
      fail(403,"PROTECTED_MEMBERSHIP");
    const action=String(req.body?.action);
    const transitions:Record<string,string[]>={suspend:["active"],reactivate:["suspended"],
      revoke:["active","suspended"]};
    if(!transitions[action]?.includes(m.status))fail(409,"INVALID_STATUS_TRANSITION");
    const reason=required(req.body?.reason,5,300,"REASON");
    const status=action==="suspend"?"suspended":action==="revoke"?"revoked":"active";
    await db.transaction(async tx=>{
      const changed=await tx.update(schema.clinicMembership).set({
        status,reason,changedAt:new Date(),
        suspendedAt:status==="suspended"?new Date():null,
        revokedAt:status==="revoked"?new Date():null
      }).where(and(eq(schema.clinicMembership.id,m.id),eq(schema.clinicMembership.status,m.status)))
        .returning({id:schema.clinicMembership.id});
      if(!changed.length)fail(409,"STALE_MEMBERSHIP");
      if(status!=="active"){
        await revokeSessions(tx,m.userId);
        await tx.update(schema.clinicInvitation).set({status:"revoked",resolvedAt:new Date(),updatedAt:new Date()})
          .where(and(eq(schema.clinicInvitation.clinicId,clinicId),
            eq(schema.clinicInvitation.invitedBy,m.userId),eq(schema.clinicInvitation.status,"pending")));
      }
      await audit(tx,req.actor!.id,clinicId,"staff.membership."+action,m.id);
      await outbox(tx,clinicId,"staff.membership.changed");
    });
    res.json({member:await person(await memberById(clinicId,m.id)),
      sessionsRevoked:status!=="active"});
  }));
  router.post("/staff/:membershipId/force-logout",work(async(req,res)=>{
    const clinicId=cid(req),ctx=await permission(req,clinicId,"staff.manage",true);
    const m=await memberById(clinicId,String(req.params.membershipId));
    if(m.role==="owner"||m.userId===req.actor!.id||!mayAssign(ctx.role,m.role,m.role))
      fail(403,"PROTECTED_MEMBERSHIP");
    required(req.body?.reason,5,300,"REASON");
    await db.transaction(async tx=>{
      await revokeSessions(tx,m.userId);
      await audit(tx,req.actor!.id,clinicId,"staff.sessions.revoked",m.id);
    });
    res.json({sessionsRevoked:true});
  }));
  router.post("/staff/:membershipId/dentist",work(async(req,res)=>{
    const clinicId=cid(req),ctx=await scope(req,clinicId);
    const m=await memberById(clinicId,String(req.params.membershipId));
    if(m.role!=="dentist"||m.status!=="active")fail(409,"NOT_ACTIVE_DENTIST");
    const self=m.userId===req.actor!.id;
    if(!self && !capabilities[ctx.role].includes("dentist.edit"))
      await permission(req,clinicId,"dentist.edit");
    if(!self&&!req.actor!.mfa)fail(403,"STAFF_MFA_REQUIRED");
    const input=dentistBody(req.body);
    const existing=await db.query.dentistDraft.findFirst({where:eq(schema.dentistDraft.membershipId,m.id)});
    if(existing && Number(req.body?.draftVersion)!==existing.draftVersion)fail(409,"STALE_DENTIST_DRAFT");
    await db.transaction(async tx=>{
      await tx.select({id:schema.clinicMembership.id}).from(schema.clinicMembership)
        .where(eq(schema.clinicMembership.id,m.id)).for("update");
      const latest=await tx.select().from(schema.clinicMembership)
        .where(eq(schema.clinicMembership.id,m.id));
      if(latest[0]?.status!=="active"||latest[0]?.role!=="dentist")fail(409,"NOT_ACTIVE_DENTIST");
      if(existing){
        const changed=await tx.update(schema.dentistDraft).set({
          ...input,draftVersion:existing.draftVersion+1,
          updatedBy:req.actor!.id,updatedAt:new Date(),verificationState:"unverified"
        }).where(and(eq(schema.dentistDraft.membershipId,m.id),
          eq(schema.dentistDraft.draftVersion,existing.draftVersion)))
          .returning({id:schema.dentistDraft.membershipId});
        if(!changed.length)fail(409,"STALE_DENTIST_DRAFT");
      }else{
        await tx.insert(schema.dentistDraft).values({
          membershipId:m.id,clinicId,userId:m.userId,...input,updatedBy:req.actor!.id
        });
      }
      await audit(tx,req.actor!.id,clinicId,"dentist.draft.updated",m.id);
    });
    res.json({draft:await db.query.dentistDraft.findFirst({where:eq(schema.dentistDraft.membershipId,m.id)})});
  }));
  return router;
}
