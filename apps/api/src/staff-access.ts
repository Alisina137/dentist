import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response, NextFunction } from "express";
import { db, schema } from "@dandanlink/db";
import { auth } from "./auth.js";

export type Role = "owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
export type Actor = { id:string; name:string; email:string; mfa:boolean };
export type StaffRequest = Request & { actor?:Actor };
export class AccessFault extends Error {
  constructor(public status:number, public code:string){super(code);}
}
export function fail(status:number,code:string):never{throw new AccessFault(status,code);}
export const roles = ["manager","dentist","receptionist","assistant","cashier"] as const;
export const capabilities:Record<Role,readonly string[]>={
  owner:["clinic.read","staff.read","staff.invite","staff.manage","security.read","dentist.read","dentist.edit"],
  manager:["clinic.read","staff.read","staff.invite","staff.manage","security.read","dentist.read","dentist.edit"],
  dentist:["clinic.read","account.self","dentist.self.read","dentist.self.edit"],
  receptionist:["clinic.read","account.self"],
  assistant:["clinic.read","account.self"],
  cashier:["clinic.read","account.self"]
};
export const roleValid=(value:unknown):value is typeof roles[number]=>
  roles.some(role=>role===value);
export function required(value:unknown,min:number,max:number,label:string):string{
  if(typeof value!=="string"||value.trim().length<min||value.trim().length>max)fail(422,"INVALID_"+label);
  return (value as string).trim();
}
export function optional(value:unknown,max:number,label:string):string|null{
  return value==null||value===""?null:required(value,1,max,label);
}
export function mayAssign(actorRole:Role,role:string,currentRole?:string){
  if(role==="owner"||!roleValid(role))return false;
  if(actorRole==="owner")return true;
  return actorRole==="manager"&&role!=="manager"&&currentRole!=="manager"&&currentRole!=="owner";
}
export async function authStaff(req:StaffRequest,res:Response,next:NextFunction){
  try{
    const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
    if(!session?.user?.emailVerified)fail(401,"AUTH_REQUIRED");
    const admin=await db.query.platformAdmin.findFirst({where:eq(schema.platformAdmin.userId,session.user.id)});
    if(admin&&!admin.revokedAt)fail(403,"PLATFORM_WORKSPACE_ONLY");
    const factor=await db.query.twoFactor.findFirst({where:eq(schema.twoFactor.userId,session.user.id)});
    req.actor={id:session.user.id,name:session.user.name,email:session.user.email,
      mfa:Boolean(session.user.twoFactorEnabled&&factor?.verified)};
    next();
  }catch(error){next(error);}
}
export async function scope(req:StaffRequest,clinicId:string){
  const c=await db.query.clinic.findFirst({where:eq(schema.clinic.id,clinicId)});
  if(!c)fail(404,"CLINIC_NOT_FOUND");
  const m=await db.query.clinicMembership.findFirst({where:and(
    eq(schema.clinicMembership.clinicId,clinicId),
    eq(schema.clinicMembership.userId,req.actor!.id)
  )});
  if(!m)fail(404,"CLINIC_NOT_FOUND");
  if(m.status!=="active")fail(403,"MEMBERSHIP_INACTIVE");
  if(m.role==="owner" && c.ownerUserId!==req.actor!.id)fail(403,"OWNER_MISMATCH");
  return {clinic:c,membership:m,role:m.role as Role};
}
export async function permission(req:StaffRequest,clinicId:string,action:string,mfa=false){
  const ctx=await scope(req,clinicId);
  if(!capabilities[ctx.role].includes(action)){
    await db.insert(schema.auditEvent).values({id:randomUUID(),actorId:req.actor!.id,
      clinicId,action:"staff.permission.denied",subjectType:"staff",
      subjectId:action,outcome:"denied"});
    fail(403,"STAFF_FORBIDDEN");
  }
  if(mfa&&!req.actor!.mfa)fail(403,"STAFF_MFA_REQUIRED");
  return ctx;
}
export async function audit(tx:any,actorId:string,clinicId:string,action:string,subjectId:string){
  await tx.insert(schema.auditEvent).values({id:randomUUID(),actorId,clinicId,action,
    subjectType:"staff",subjectId,outcome:"success"});
}
export async function outbox(tx:any,clinicId:string,kind:string){
  await tx.insert(schema.outboxEvent).values({id:randomUUID(),kind,state:"pending",
    safePayload:JSON.stringify({clinicId})});
}
export async function revokeSessions(tx:any,userId:string){
  // All account sessions are revoked to enforce immediate cross-device removal.
  // Other clinic grants are unchanged; user can sign in again for still-active clinics.
  await tx.delete(schema.session).where(eq(schema.session.userId,userId));
}
