import { Router,type Request,type Response,type NextFunction } from "express";
import { and, asc, eq, gte, ilike, inArray, lt, or } from "drizzle-orm";
import { db,schema } from "@dandanlink/db";
import { authStaff, AccessFault,type StaffRequest } from "./staff-access.js";
import { OpsFault, dateInput, fail } from "./operations-validation.js";
import { listServices,listResources } from "./operations-catalog.js";
import { clinicians } from "./operations-schedule.js";
import { availabilityPreview } from "./operations-availability.js";
import { appointmentAccess,createAppointment,rescheduleAppointment,transitionAppointment,
 calendar,dayQueue,isoDayWindow,localDate,shiftDay,byId,enriched,timeline,
 mayReadAppointment,mayScheduleProvider } from "./appointments-service.js";

const wrap=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
 (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const cid=(req:StaffRequest)=>String(req.params.clinicId);
const noCache=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
export function appointmentsRouter(){
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
 clinic.get("/catalog",wrap(async(req,res)=>{
  const ctx=await appointmentAccess(req,cid(req),"read");
  const [services,resources,providers]=await Promise.all([
   listServices(cid(req)),listResources(cid(req)),clinicians(cid(req))
  ]);
  noCache(res);res.json({services:services.filter(s=>s.active),
   resources:resources.filter(r=>r.active&&r.kind==="chair"),
   providers:ctx.role==="dentist"?providers.filter(p=>p.membershipId===ctx.membership.id):providers,
   timezone:"Asia/Kabul",bookingSource:"staff",publicBookingAvailable:false});
 }));
 clinic.get("/patients/search",wrap(async(req,res)=>{
  const ctx=await appointmentAccess(req,cid(req),"schedule");
  const query=String(req.query.q||"").trim().slice(0,100);
  if(query.length<2){noCache(res);res.json({patients:[]});return;}
  const pattern="%"+query.replace(/[\\%_]/g,x=>"\\"+x)+"%";
  const patients=await db.select({
   id:schema.clinicPatient.id,patientNumber:schema.clinicPatient.patientNumber,
   preferredName:schema.clinicPatient.preferredName,familyName:schema.clinicPatient.familyName,
   phone:schema.clinicPatient.phone
  }).from(schema.clinicPatient).where(and(
   eq(schema.clinicPatient.clinicId,cid(req)),eq(schema.clinicPatient.status,"active"),
   or(ilike(schema.clinicPatient.patientNumber,pattern),
    ilike(schema.clinicPatient.preferredName,pattern),
    ilike(schema.clinicPatient.familyName,pattern),ilike(schema.clinicPatient.phone,pattern))
  )).orderBy(asc(schema.clinicPatient.preferredName)).limit(12);
  noCache(res);res.json({patients});
 }));
 clinic.get("/overview",wrap(async(req,res)=>{
  const ctx=await appointmentAccess(req,cid(req),"read");
  const date=localDate(new Date());
  const today=await dayQueue(ctx,cid(req),date);
  const tomorrow=shiftDay(date,1);
  const soon=await calendar(ctx,cid(req),{from:date,to:shiftDay(date,6)});
  const counts:Record<string,number>={confirmed:0,arrived:0,in_treatment:0,completed:0,no_show:0};
  for(const a of today)if(a.status in counts)counts[a.status]++;
  noCache(res);res.json({today:date,counts,todayTotal:today.length,
   weekTotal:soon.appointments.length,upcoming:soon.appointments.filter(a=>a.status==="confirmed").slice(0,5),
   timezone:"Asia/Kabul"});
 }));
 clinic.get("/calendar",wrap(async(req,res)=>{
  const ctx=await appointmentAccess(req,cid(req),"read");
  const data=await calendar(ctx,cid(req),req.query);
  noCache(res);res.json(data);
 }));
 clinic.get("/queue",wrap(async(req,res)=>{
  const ctx=await appointmentAccess(req,cid(req),"read");
  const date=typeof req.query.date==="string"?dateInput(req.query.date):localDate(new Date());
  const queue=await dayQueue(ctx,cid(req),date);
  const count:Record<string,number>={confirmed:0,arrived:0,in_treatment:0,completed:0,no_show:0};
  for(const a of queue)if(a.status in count)count[a.status]++;
  noCache(res);res.json({date,queue,counts:count,timezone:"Asia/Kabul"});
 }));
 clinic.get("/slots",wrap(async(req,res)=>{
  const ctx=await appointmentAccess(req,cid(req),"read");
  const providerId=String(req.query.providerId||"");
  if(!mayScheduleProvider(ctx,providerId))fail(403,"PROVIDER_SCOPE_DENIED");
  const excludeAppointmentId=typeof req.query.excludeAppointmentId==="string"?
   req.query.excludeAppointmentId:undefined;
  let snapshot:typeof schema.clinicAppointment.$inferSelect|undefined;
  if(excludeAppointmentId){
   snapshot=await byId(cid(req),excludeAppointmentId);
   if(!mayReadAppointment(ctx,snapshot))fail(404,"APPOINTMENT_NOT_FOUND");
   if(snapshot.status!=="confirmed")fail(409,"ONLY_CONFIRMED_CAN_RESCHEDULE");
  }
  const data=await availabilityPreview(cid(req),{
   date:req.query.date,serviceId:req.query.serviceId,
   providerId:req.query.providerId,resourceId:req.query.resourceId,
   excludeAppointmentId,overrideDuration:snapshot?.serviceDurationMinutes,
   overridePreparation:snapshot?.preparationMinutes,
   allowInactiveService:Boolean(snapshot)
  });
  noCache(res);res.json(data);
 }));
 clinic.post("/appointments",wrap(async(req,res)=>{
  const ctx=await appointmentAccess(req,cid(req),"schedule");
  const value=await createAppointment(ctx,cid(req),req.actor!.id,req.body);
  noCache(res);
  if(value.conflict){res.status(409).json({code:"APPOINTMENT_SLOT_UNAVAILABLE",
   alternatives:value.alternatives});return;}
  res.status(value.replayed?200:201).json({
   appointment:(await enriched([value.appointment!],ctx))[0],replayed:value.replayed});
 }));
 clinic.get("/appointments/:appointmentId",wrap(async(req,res)=>{
  const ctx=await appointmentAccess(req,cid(req),"read");
  const a=await byId(cid(req),String(req.params.appointmentId));
  if(!mayReadAppointment(ctx,a))fail(404,"APPOINTMENT_NOT_FOUND");
  const events=await timeline(cid(req),a.id);
  noCache(res);res.json({appointment:(await enriched([a],ctx))[0],
   events:ctx.role==="assistant"?events.map(e=>({...e,reason:null})):events,
   timezone:"Asia/Kabul",clinicalEncounterAvailable:false,
   financialInvoiceAvailable:false,patientPublicBookingAvailable:false});
 }));
 clinic.post("/appointments/:appointmentId/reschedule",wrap(async(req,res)=>{
  const ctx=await appointmentAccess(req,cid(req),"schedule");
  const value=await rescheduleAppointment(ctx,cid(req),req.actor!.id,
    String(req.params.appointmentId),req.body);
  noCache(res);
  if(value.conflict){res.status(409).json({code:"APPOINTMENT_SLOT_UNAVAILABLE",
   alternatives:value.alternatives});return;}
  res.json({appointment:(await enriched([value.appointment!],ctx))[0],replayed:value.replayed});
 }));
 clinic.post("/appointments/:appointmentId/status",wrap(async(req,res)=>{
  const ctx=await appointmentAccess(req,cid(req),"read");
  const value=await transitionAppointment(ctx,cid(req),req.actor!.id,
    String(req.params.appointmentId),req.body);
  noCache(res);res.json({appointment:(await enriched([value.appointment],ctx))[0],
   replayed:value.replayed});
 }));
 api.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof OpsFault||error instanceof AccessFault){
   res.status(error.status).json({code:error.code});return;
  }
  const code=(error as any)?.code||(error as any)?.cause?.code;
  if(code==="23P01"||code==="23505"){
   res.status(409).json({code:code==="23P01"?"APPOINTMENT_SLOT_UNAVAILABLE":"DUPLICATE_ACTION"});return;
  }
  if(code==="23514"){res.status(422).json({code:"APPOINTMENT_RULE_INVALID"});return;}
  console.error("PH06 appointment failure",error instanceof Error?error.name:"unknown",
   code||"unknown");
  res.status(500).json({code:"APPOINTMENTS_INTERNAL_ERROR"});
 });
 return api;
}
