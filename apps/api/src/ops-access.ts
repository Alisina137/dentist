import { randomUUID } from "node:crypto";
import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db, schema, sqlClient } from "@dandanlink/db";
import { auth } from "./auth.js";
import { permitsUnverifiedEmail } from "./email-policy.js";

/** The support principal has NO permission to query clinical, patient or billing records. */
export type OpsActor={id:string;name:string;role:"admin"|"support"|"user";mfa:boolean};
export type OpsRequest=Request & {opsActor?:OpsActor};
export class OpsFault extends Error {
 constructor(public status:number,public code:string){super(code);}
}
export function opsFail(status:number,code:string):never{throw new OpsFault(status,code);}
export const opsTask=(run:(req:OpsRequest,res:Response)=>Promise<void>)=>
 (req:OpsRequest,res:Response,next:NextFunction)=>{run(req,res).catch(next);};
export const privateOps=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
export async function opsIdentity(req:OpsRequest,_res:Response,next:NextFunction){
 try{
  const s=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!s?.user||!permitsUnverifiedEmail(s.user.emailVerified))opsFail(401,"AUTH_REQUIRED");
  const admin=await db.query.platformAdmin.findFirst({where:eq(schema.platformAdmin.userId,s.user.id)});
  const support=await sqlClient`SELECT user_id FROM platform_support_agents
   WHERE user_id=${s.user.id} AND revoked_at IS NULL LIMIT 1`;
  const role=admin&&!admin.revokedAt?"admin":support.length?"support":"user";
  const factor=role!=="user"?await db.query.twoFactor.findFirst({
   where:eq(schema.twoFactor.userId,s.user.id)}):null;
  req.opsActor={id:s.user.id,name:s.user.name,role,
   mfa:Boolean(s.user.twoFactorEnabled&&factor?.verified)};
  next();
 }catch(err){next(err);}
}
export function opsStaff(req:OpsRequest){
 if(req.opsActor?.role!=="admin"&&req.opsActor?.role!=="support")opsFail(403,"SUPPORT_DENIED");
 if(!req.opsActor.mfa)opsFail(403,"MFA_REQUIRED");
}
export function opsAdmin(req:OpsRequest){
 if(req.opsActor?.role!=="admin")opsFail(403,"ADMIN_DENIED");
 if(!req.opsActor.mfa)opsFail(403,"MFA_REQUIRED");
}
export async function opsAudit(actorId:string,action:string,subjectType:string,subjectId?:string){
 await db.insert(schema.auditEvent).values({id:randomUUID(),actorId,action,subjectType,
  subjectId:subjectId??null,outcome:"success"});
}
export function opsText(input:unknown,min:number,max:number,key:string):string{
 if(typeof input!=="string"||input.trim().length<min||input.trim().length>max)
  opsFail(422,"INVALID_"+key);
 return input.trim();
}
/** A stopgap guard, not a substitute for human privacy review. */
export function safeSupportText(input:unknown,min:number,max:number,key:string){
 const value=opsText(input,min,max,key);
 if(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u.test(value)||
  /(?:\+?\d[\d\s()-]{7,}\d)/u.test(value)||
  /(?:https?:\/\/|www\.)/iu.test(value)||
  /\b(?:diagnosis|diagnosed|prescription|patient id|patient number|medical record|hiv|hepatitis|treatment note)\b/iu.test(value)||
  /(?:شماره\s*مریض|شماره\s*تذکره|نسخه\s*طبی|تشخیص|د\s*ناروغ\s*شمېره)/u.test(value))
  opsFail(422,"SUPPORT_PERSONAL_OR_CLINICAL_DETAILS");
 return value;
}
