import {randomUUID} from "node:crypto";
import {Router,type Request,type Response,type NextFunction} from "express";
import {fromNodeHeaders} from "better-auth/node";
import {sqlClient} from "@dandanlink/db";
import {auth} from "./auth.js";
import {publicListing} from "./listing-router.js";

type UserRequest=Request&{ownerId?:string};
class FavoriteError extends Error{constructor(public status:number,public code:string){super(code)}}
const fail=(status:number,code:string):never=>{throw new FavoriteError(status,code)};
const id=(value:unknown):string=>{
 if(typeof value!=="string"||!/^[A-Za-z0-9_-]{8,100}$/.test(value))fail(422,"INVALID_ID");
 return value as string;
};
const run=(handler:(req:UserRequest,res:Response)=>Promise<void>)=>
 (req:UserRequest,res:Response,next:NextFunction)=>{handler(req,res).catch(next)};
const noStore=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
async function loggedIn(req:UserRequest,res:Response,next:NextFunction){
 try{
  const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  if(!session?.user){res.status(401).json({code:"AUTH_REQUIRED"});return;}
  if(!session.user.emailVerified){res.status(403).json({code:"EMAIL_VERIFICATION_REQUIRED"});return;}
  const [patient]=await sqlClient`SELECT user_id FROM patient_profiles WHERE user_id=${session.user.id}`;
  if(!patient){res.status(403).json({code:"PATIENT_ONBOARDING_REQUIRED"});return;}
  req.ownerId=session.user.id;next();
 }catch(error){next(error)}
}
async function eligible(clinicId:string,dentistId:string|null){
 let item:Awaited<ReturnType<typeof publicListing>>;
 try{item=await publicListing(clinicId)}catch{fail(404,"PUBLIC_PROFILE_UNAVAILABLE")}
 if(dentistId&&!item.profile.dentists.some(x=>x.id===dentistId))fail(404,"VERIFIED_DENTIST_UNAVAILABLE");
 return item;
}
export function patientFavoritesRouter(){
 const app=Router();
 app.use((req,res,next)=>{
  if(!["GET","HEAD","OPTIONS"].includes(req.method)){
   const origin=req.headers.origin,allowed=process.env.PATIENT_WEB_URL||"http://localhost:3002";
   if(origin&&origin!==allowed){res.status(403).json({code:"ORIGIN_DENIED"});return;}
  }
  next();
 });
 app.use(loggedIn);
 app.get("/",run(async(req,res)=>{
  const rows=await sqlClient`SELECT clinic_id,dentist_id FROM patient_favorites
   WHERE user_id=${req.ownerId!} ORDER BY created_at DESC LIMIT 100`;
  const allowed=await Promise.all(rows.map(async(row)=>{
   try{
    const p=await eligible(row.clinic_id,row.dentist_id);
    return {clinicId:row.clinic_id,clinicName:p.clinic.name,
     dentistId:row.dentist_id||null,
     dentistName:row.dentist_id?
      p.profile.dentists.find(x=>x.id===row.dentist_id)?.displayName:null};
   }catch{return null;}
  }));
  noStore(res);res.json({favorites:allowed.filter(Boolean),reviewedOnly:true});
 }));
 app.post("/",run(async(req,res)=>{
  const clinicId=id(req.body?.clinicId),dentistId=req.body?.dentistId==null?null:id(req.body.dentistId);
  await eligible(clinicId,dentistId);
  // The two unique partial indexes independently enforce clinic & dentist favorite limits.
  await sqlClient`INSERT INTO patient_favorites(id,user_id,clinic_id,dentist_id)
   VALUES(${randomUUID()},${req.ownerId!},${clinicId},${dentistId}) ON CONFLICT DO NOTHING`;
  noStore(res);res.json({saved:true,clinicId,dentistId});
 }));
 app.delete("/",run(async(req,res)=>{
  const clinicId=id(req.body?.clinicId),dentistId=req.body?.dentistId==null?null:id(req.body.dentistId);
  await sqlClient`DELETE FROM patient_favorites WHERE user_id=${req.ownerId!} AND
   clinic_id=${clinicId} AND dentist_id IS NOT DISTINCT FROM ${dentistId}`;
  noStore(res);res.json({saved:false,clinicId,dentistId});
 }));
 app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof FavoriteError){res.status(error.status).json({code:error.code});return;}
  console.error("PH16 favorite service error",error instanceof Error?error.name:"unknown");
  res.status(500).json({code:"FAVORITES_UNAVAILABLE"});
 });
 return app;
}
