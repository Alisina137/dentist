import { randomUUID } from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@dandanlink/db";
import { AccessFault, authStaff, capabilities, revokeSessions,
  type Role, type StaffRequest } from "./staff-access.js";
import { staffInvitationsRouter, clinicInviteRouter } from "./staff-invitations.js";
import { staffManagementRouter } from "./staff-management.js";
const work=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
  (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
export function phase03Router(){
  const router=Router();
  router.use((req,res,next)=>{
    const origin=req.headers.origin;
    const allowed=[
      process.env.CLINIC_WEB_URL||"http://localhost:3000",
      process.env.ADMIN_WEB_URL||"http://localhost:3001",
      process.env.PATIENT_WEB_URL||"http://localhost:3002"
    ];
    if(!["GET","HEAD","OPTIONS"].includes(req.method) && origin && !allowed.includes(origin)){
      res.status(403).json({code:"ORIGIN_DENIED"});return;
    }
    next();
  });
  router.use("/invitations",staffInvitationsRouter());
  router.use("/clinics/:clinicId/invitations",clinicInviteRouter());
  router.use("/clinics/:clinicId",staffManagementRouter());
  router.use(authStaff);
  router.get("/context",work(async(req,res)=>{
    const memberships=await db.select().from(schema.clinicMembership).where(and(
      eq(schema.clinicMembership.userId,req.actor!.id),
      eq(schema.clinicMembership.status,"active")
    )).orderBy(desc(schema.clinicMembership.joinedAt));
    const clinics=[];
    for(const m of memberships){
      const c=await db.query.clinic.findFirst({where:eq(schema.clinic.id,m.clinicId)});
      if(c)clinics.push({clinicId:c.id,clinicName:c.displayName,clinicStatus:c.status,
        membershipId:m.id,role:m.role,clinicianEnabled:m.clinicianEnabled,capabilities:capabilities[m.role as Role]||[]});
    }
    res.setHeader("Cache-Control","no-store");
    res.json({name:req.actor!.name,email:req.actor!.email,
      mfaEnabled:req.actor!.mfa,clinics});
  }));
  router.get("/sessions",work(async(req,res)=>{
    const rows=await db.select({
      id:schema.session.id,createdAt:schema.session.createdAt,
      updatedAt:schema.session.updatedAt,expiresAt:schema.session.expiresAt,
      userAgent:schema.session.userAgent
    }).from(schema.session).where(eq(schema.session.userId,req.actor!.id))
      .orderBy(desc(schema.session.createdAt)).limit(25);
    res.setHeader("Cache-Control","no-store");
    res.json({sessions:rows.map(x=>({...x,userAgent:x.userAgent?.slice(0,160)||null}))});
  }));
  router.post("/sessions/revoke",work(async(req,res)=>{
    await db.transaction(async tx=>{
      await revokeSessions(tx,req.actor!.id);
      await tx.insert(schema.auditEvent).values({id:randomUUID(),actorId:req.actor!.id,
        action:"staff.sessions.revoke_self",subjectType:"account",
        subjectId:req.actor!.id,outcome:"success"});
    });
    res.json({revoked:true});
  }));
  router.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
    if(error instanceof AccessFault){res.status(error.status).json({code:error.code});return;}
    if((error as any)?.code==="23505"||(error as any)?.cause?.code==="23505"){
      res.status(409).json({code:"DUPLICATE_STAFF_OR_INVITATION"});return;
    }
    console.error("PH03 API error",error instanceof Error?error.name:"unknown");
    res.status(500).json({code:"INTERNAL_ERROR"});
  });
  return router;
}
