import {Router,type Request,type Response,type NextFunction} from "express";
import {authStaff,AccessFault,type StaffRequest} from "./staff-access.js";
import {AppointmentFault,access,cid,create,list,detail,reschedule,transition} from "./appointments-service.js";
import {OpsFault} from "./operations-validation.js";
import {db,schema} from "@dandanlink/db";
import {and,eq,asc} from "drizzle-orm";
const work=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
 (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const privateResponse=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
export function appointmentsRouter(){
 const router=Router();
 router.use((req,res,next)=>{
  const origin=req.headers.origin;
  if(!["GET","HEAD","OPTIONS"].includes(req.method)&&origin&&
   ![process.env.CLINIC_WEB_URL||"http://localhost:3001",
     process.env.ADMIN_WEB_URL||"http://localhost:3000"].includes(origin)){
    res.status(403).json({code:"ORIGIN_DENIED"});return;
  }next();
 });
 router.use(authStaff);
 const clinic=Router({mergeParams:true});
 router.use("/clinics/:clinicId",clinic);
 clinic.get("/calendar",work(async(req,res)=>{
  privateResponse(res);
  res.json(await list(req,cid(req),{from:req.query.from,to:req.query.to,
   providerId:req.query.providerId,resourceId:req.query.resourceId,status:req.query.status}));
 }));
 clinic.get("/queue",work(async(req,res)=>{
  const date=String(req.query.date||"");
  privateResponse(res);
  res.json(await list(req,cid(req),{from:date,to:date,providerId:req.query.providerId}));
 }));
 clinic.get("/summary",work(async(req,res)=>{
  await access(req,cid(req),"read");
  const date=String(req.query.date||"");
  const result=await list(req,cid(req),{from:date,to:date});
  const counts={total:result.appointments.length,confirmed:0,arrived:0,in_treatment:0,
   completed:0,cancelled:0,no_show:0};
  for(const item of result.appointments){
   const key=item.status as keyof typeof counts;
   if(key!=="total"&&key in counts)counts[key]++;
  }
  privateResponse(res);res.json({counts,timezone:"Asia/Kabul"});
 }));
 clinic.get("/patients/search",work(async(req,res)=>{
  const context=await access(req,cid(req),"read");
  const q=String(req.query.q||"").trim().slice(0,100).toLowerCase();
  if(q.length<2){res.json({patients:[]});return;}
  // Bounded tenant-only patient selection; avoids looking at any other clinic.
  const matches=await db.select({
   id:schema.clinicPatient.id,patientNumber:schema.clinicPatient.patientNumber,
   preferredName:schema.clinicPatient.preferredName,familyName:schema.clinicPatient.familyName,
   phone:schema.clinicPatient.phone,status:schema.clinicPatient.status
  }).from(schema.clinicPatient).where(and(
   eq(schema.clinicPatient.clinicId,cid(req)),
   eq(schema.clinicPatient.status,"active")
  )).orderBy(asc(schema.clinicPatient.patientNumber)).limit(1500);
  const results=matches.filter(p=>(p.patientNumber+" "+p.preferredName+" "+(p.familyName||"")+
   " "+(p.phone||"")).toLowerCase().includes(q)).slice(0,15).map(p=>({
   id:p.id,patientNumber:p.patientNumber,preferredName:p.preferredName,
   familyName:p.familyName,
   phone:context.role==="dentist"||context.role==="receptionist"||
    context.role==="owner"||context.role==="manager"?p.phone:null
  }));
  privateResponse(res);res.json({patients:results});
 }));
 clinic.get("/appointments/:appointmentId",work(async(req,res)=>{
  privateResponse(res);res.json(await detail(req,cid(req),String(req.params.appointmentId)));
 }));
 clinic.post("/appointments",work(async(req,res)=>{
  const result=await create(req,cid(req),req.body);
  privateResponse(res);res.status(result.replayed?200:201).json(result);
 }));
 clinic.patch("/appointments/:appointmentId/reschedule",work(async(req,res)=>{
  const appointment=await reschedule(req,cid(req),String(req.params.appointmentId),req.body);
  privateResponse(res);res.json({appointment});
 }));
 clinic.patch("/appointments/:appointmentId/status",work(async(req,res)=>{
  const appointment=await transition(req,cid(req),String(req.params.appointmentId),req.body);
  privateResponse(res);res.json({appointment});
 }));
 router.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(err instanceof AppointmentFault||err instanceof AccessFault||err instanceof OpsFault){
   res.status(err.status).json({code:err.code,...(err instanceof AppointmentFault&&err.extra?err.extra:{})});return;
  }
  const code=(err as any)?.code||(err as any)?.cause?.code;
  if(code==="23P01"){res.status(409).json({code:"APPOINTMENT_SLOT_CONFLICT"});return;}
  if(code==="23503"){res.status(422).json({code:"INVALID_APPOINTMENT_REFERENCE"});return;}
  if(code==="23505"){res.status(409).json({code:"APPOINTMENT_ALREADY_EXISTS"});return;}
  console.error("PH06 booking API failure",err instanceof Error?err.name:"unknown");
  res.status(500).json({code:"INTERNAL_ERROR"});
 });
 return router;
}
