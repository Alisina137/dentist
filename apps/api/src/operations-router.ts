import { randomUUID } from "node:crypto";
import { Router,type Request,type Response,type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "@dandanlink/db";
import { authStaff, AccessFault, type StaffRequest } from "./staff-access.js";
import { OpsFault, fail } from "./operations-validation.js";
import { operationsAccess, listServices, createService, changeService, serviceHistory,
 listResources, createResource, changeResource } from "./operations-catalog.js";
import { schedules,saveWeek,addException,removeException,clearResourceSchedule }
 from "./operations-schedule.js";
import { availabilityPreview } from "./operations-availability.js";
const wrap=(f:(req:StaffRequest,res:Response)=>Promise<void>)=>
 (req:StaffRequest,res:Response,next:NextFunction)=>{f(req,res).catch(next);};
const cid=(req:StaffRequest)=>String(req.params.clinicId);
const nocache=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
export function operationsRouter(){
 const api=Router();
 api.use((req,res,next)=>{
  const origin=req.headers.origin;
  const allowed=[process.env.CLINIC_WEB_URL||"http://localhost:3001",
    process.env.ADMIN_WEB_URL||"http://localhost:3000"];
  if(!["GET","HEAD","OPTIONS"].includes(req.method)&&origin&&!allowed.includes(origin)){
    res.status(403).json({code:"ORIGIN_DENIED"});return;
  }
  next();
 });
 api.use(authStaff);
 const clinic=Router({mergeParams:true});
 api.use("/clinics/:clinicId",clinic);
 clinic.get("/summary",wrap(async(req,res)=>{
  const id=cid(req),ctx=await operationsAccess(req,id);
  const [services,resources,hours,providers]=await Promise.all([
   listServices(id),listResources(id),
   db.select().from(schema.clinicWeeklyHour).where(eq(schema.clinicWeeklyHour.clinicId,id)),
   db.select().from(schema.clinicProviderHour).where(eq(schema.clinicProviderHour.clinicId,id))
  ]);
  const active=services.filter(s=>s.active),chairs=resources.filter(r=>r.active&&r.kind==="chair");
  const doctorCount=new Set(providers.filter(r=>r.isOpen).map(r=>r.membershipId)).size;
  nocache(res);
  res.json({clinicName:ctx.clinic.displayName,timezone:"Asia/Kabul",
   metrics:{services:active.length,chairs:chairs.length,openDays:hours.filter(x=>x.isOpen).length,
    scheduledDentists:doctorCount},
   checklist:[
    {key:"service",done:active.length>0},
    {key:"chair",done:chairs.length>0||active.length>0&&active.every(x=>!x.requiresChair)},
    {key:"clinicHours",done:hours.some(x=>x.isOpen)},
    {key:"dentistHours",done:providers.some(x=>x.isOpen)}
   ],
   readyForPreview:active.length>0 && hours.some(x=>x.isOpen) &&
     providers.some(x=>x.isOpen) && (chairs.length>0||active.every(x=>!x.requiresChair)),
   publicBookingsEnabled:false,appointmentManagementEnabled:false
  });
 }));
 clinic.get("/services",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req));
  nocache(res);res.json({services:await listServices(cid(req))});
 }));
 clinic.post("/services",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req),true);
  const service=await createService(cid(req),req.actor!.id,req.body);
  nocache(res);res.status(201).json({service});
 }));
 clinic.patch("/services/:serviceId",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req),true);
  const service=await changeService(cid(req),req.actor!.id,String(req.params.serviceId),req.body);
  nocache(res);res.json({service});
 }));
 clinic.get("/services/:serviceId/versions",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req));
  nocache(res);res.json({versions:await serviceHistory(cid(req),String(req.params.serviceId))});
 }));
 clinic.get("/resources",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req));
  nocache(res);res.json({resources:await listResources(cid(req))});
 }));
 clinic.post("/resources",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req),true);
  const resource=await createResource(cid(req),req.actor!.id,req.body);
  nocache(res);res.status(201).json({resource});
 }));
 clinic.patch("/resources/:resourceId",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req),true);
  const resource=await changeResource(cid(req),req.actor!.id,String(req.params.resourceId),req.body);
  nocache(res);res.json({resource});
 }));
 clinic.get("/hours",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req));
  nocache(res);res.json(await schedules(cid(req)));
 }));
 clinic.put("/hours/clinic",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req),true);
  nocache(res);res.json(await saveWeek(cid(req),req.actor!.id,"clinic",null,req.body?.week));
 }));
 clinic.put("/hours/providers/:membershipId",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req),true);
  nocache(res);res.json(await saveWeek(cid(req),req.actor!.id,
    "provider",String(req.params.membershipId),req.body?.week));
 }));
 clinic.put("/hours/resources/:resourceId",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req),true);
  nocache(res);res.json(await saveWeek(cid(req),req.actor!.id,
    "resource",String(req.params.resourceId),req.body?.week));
 }));
 clinic.delete("/hours/resources/:resourceId",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req),true);
  nocache(res);res.json(await clearResourceSchedule(cid(req),req.actor!.id,String(req.params.resourceId)));
 }));
 clinic.post("/exceptions",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req),true);
  const exception=await addException(cid(req),req.actor!.id,req.body);
  nocache(res);res.status(201).json({exception});
 }));
 clinic.delete("/exceptions/:exceptionId",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req),true);
  const deleted=await removeException(cid(req),req.actor!.id,String(req.params.exceptionId),
    req.body?.reason);
  nocache(res);res.json(deleted);
 }));
 clinic.get("/availability/preview",wrap(async(req,res)=>{
  await operationsAccess(req,cid(req));
  const slots=await availabilityPreview(cid(req),{
    date:req.query.date,serviceId:req.query.serviceId,
    providerId:req.query.providerId,resourceId:req.query.resourceId
  });
  nocache(res);res.json(slots);
 }));
 api.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof OpsFault){res.status(error.status).json({code:error.code});return;}
  if(error instanceof AccessFault){res.status(error.status).json({code:error.code});return;}
  const dbCode=(error as any)?.code||(error as any)?.cause?.code;
  if(dbCode==="23505"){res.status(409).json({code:"DUPLICATE_SERVICE_OR_RESOURCE"});return;}
  if(dbCode==="23514"){res.status(422).json({code:"INVALID_SCHEDULE_CONSTRAINT"});return;}
  console.error("PH04 operations failure",error instanceof Error?error.name:"unknown");
  res.status(500).json({code:"OPERATIONS_INTERNAL_ERROR"});
 });
 return api;
}
