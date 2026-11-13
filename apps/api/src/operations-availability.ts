import { and, eq, gte, gt, inArray, lt, lte } from "drizzle-orm";
import { db, schema } from "@dandanlink/db";
import { availableIn, clock, dateInput, fail, localToUtc, weekday,
  type Span } from "./operations-validation.js";
import { eligibleDoctor } from "./operations-schedule.js";

function blocks(value:unknown):Span[]{
 if(!Array.isArray(value))return [];
 return value.filter((v:any)=>typeof v?.start==="number"&&typeof v?.end==="number");
}
type AvailabilityRequest={
 date:unknown;serviceId:unknown;providerId:unknown;resourceId?:unknown;
 /** Internal PH06 rescheduling: leave original reservation out of the candidate filter. */
 excludeAppointmentId?:string;
 /** Preserve a booked service snapshot when clinic catalog price/duration changes. */
 overrideDuration?:number;overridePreparation?:number;allowInactiveService?:boolean;
};
export async function availabilityPreview(cid:string,q:AvailabilityRequest){
 const date=dateInput(q.date);
 if(typeof q.serviceId!=="string"||typeof q.providerId!=="string")
  fail(422,"SERVICE_AND_DENTIST_REQUIRED");
 const startOfDay=Date.parse(date+"T00:00:00Z"),today=Date.now();
 if(startOfDay<today-86400000 || startOfDay>today+365*86400000)
  fail(422,"PREVIEW_DATE_OUT_OF_RANGE");
 const service=await db.query.clinicService.findFirst({where:and(
  eq(schema.clinicService.id,q.serviceId),eq(schema.clinicService.clinicId,cid)
 )});
 if(!service||!service.active&&!q.allowInactiveService)fail(404,"ACTIVE_SERVICE_NOT_FOUND");
 await eligibleDoctor(cid,q.providerId);
 const day=weekday(date);
 const [weekly,provider,exceptions,resources,resourceHours]=await Promise.all([
  db.query.clinicWeeklyHour.findFirst({where:and(eq(schema.clinicWeeklyHour.clinicId,cid),
   eq(schema.clinicWeeklyHour.weekday,day))}),
  db.query.clinicProviderHour.findFirst({where:and(eq(schema.clinicProviderHour.clinicId,cid),
   eq(schema.clinicProviderHour.membershipId,q.providerId),eq(schema.clinicProviderHour.weekday,day))}),
  db.select().from(schema.clinicScheduleException).where(and(
   eq(schema.clinicScheduleException.clinicId,cid),
   lte(schema.clinicScheduleException.startDate,date),gte(schema.clinicScheduleException.endDate,date))),
  db.select().from(schema.clinicResource).where(and(
   eq(schema.clinicResource.clinicId,cid),eq(schema.clinicResource.active,true))),
  db.select().from(schema.clinicResourceHour).where(and(
   eq(schema.clinicResourceHour.clinicId,cid),eq(schema.clinicResourceHour.weekday,day)))
 ]);
 let reason:"ready"|"clinic_closed"|"provider_unavailable"|"chair_unavailable"|"holiday_closed"|"fully_booked"="ready";
 const exception=exceptions[0]||null;
 if(exception?.kind==="closed")reason="holiday_closed";
 else if(!exception && !weekly?.isOpen)reason="clinic_closed";
 else if(!provider?.isOpen)reason="provider_unavailable";
 let clinicWindow:Span=exception?.kind==="special_hours"?{
  start:exception.startMinute!,end:exception.endMinute!
 }:{start:weekly?.startMinute??0,end:weekly?.endMinute??0};
 const clinicianWindow:Span={start:provider?.startMinute??0,end:provider?.endMinute??0};
 const resourceSelected=typeof q.resourceId==="string"?q.resourceId:null;
 if(q.resourceId!==undefined&&q.resourceId!==""&&typeof q.resourceId!=="string")
  fail(422,"INVALID_RESOURCE_ID");
 if(resourceSelected && !resources.some(x=>x.id===resourceSelected))
  fail(404,"ACTIVE_RESOURCE_NOT_FOUND");
 const selected=service.requiresChair?resources.filter(x=>x.kind==="chair"&&
  (!resourceSelected||x.id===resourceSelected)):[];
 if(service.requiresChair&&selected.length===0)reason="chair_unavailable";
 const effectiveResources=service.requiresChair?selected:[null];
 const sessionMinutes=q.overrideDuration??service.durationMinutes;
 const bufferMinutes=q.overridePreparation??service.preparationMinutes;
 const duration=sessionMinutes+bufferMinutes;
 if(sessionMinutes<5||sessionMinutes>240||bufferMinutes<0||bufferMinutes>120)
  fail(422,"INVALID_SERVICE_DURATION");
 const nextDay=new Date(Date.parse(date+"T00:00:00Z")+86400000).toISOString().slice(0,10);
 const booked=await db.select({
  id:schema.clinicAppointment.id,providerId:schema.clinicAppointment.providerMembershipId,
  resourceId:schema.clinicAppointment.resourceId,
  startAt:schema.clinicAppointment.startAt,endAt:schema.clinicAppointment.endAt
 }).from(schema.clinicAppointment).where(and(
   eq(schema.clinicAppointment.clinicId,cid),
   lt(schema.clinicAppointment.startAt,new Date(localToUtc(nextDay,0))),
   gt(schema.clinicAppointment.endAt,new Date(localToUtc(date,0))),
   inArray(schema.clinicAppointment.status,["confirmed","arrived","in_treatment","completed"])
 ));
 const candidates:{
  start:string;end:string;startAt:string;endAt:string;resourceId:string|null;
  durationMinutes:number;preparationMinutes:number
 }[]=[];
 if(reason==="ready"){
  const interval:Span={
    start:Math.max(clinicWindow.start,clinicianWindow.start),
    end:Math.min(clinicWindow.end,clinicianWindow.end)
  };
  for(const resource of effectiveResources){
   const shift=resource?resourceHours.find(h=>h.resourceId===resource.id):null;
   if(shift&&!shift.isOpen)continue;
   const feasible:Span={
    start:Math.max(interval.start,shift?.startMinute??0),
    end:Math.min(interval.end,shift?.endMinute??1440)
   };
   const exclusions=[
    ...(exception?.kind==="special_hours"?[]:blocks(weekly?.breaks)),
    ...blocks(provider?.breaks),...blocks(shift?.breaks)
   ];
   for(let minute=Math.ceil(feasible.start/15)*15;minute+duration<=feasible.end;minute+=15){
    const slot={start:minute,end:minute+duration};
    if(!availableIn(feasible,exclusions,slot))continue;
    const startAt=new Date(localToUtc(date,minute));
    const endAt=new Date(localToUtc(slot.end===1440?nextDay:date,slot.end===1440?0:slot.end));
    if(booked.some(appointment=>appointment.id!==q.excludeAppointmentId&&
      (appointment.providerId===q.providerId||resource!==null&&
        appointment.resourceId===resource.id)&&
      appointment.startAt<endAt&&appointment.endAt>startAt))continue;
    const endDate=slot.end===1440?new Date(Date.parse(date+"T00:00:00Z")+86400000).toISOString().slice(0,10):date;
    const endMinute=slot.end===1440?0:slot.end;
    candidates.push({start:clock(minute),end:clock(slot.end%1440),
     startAt:localToUtc(date,minute),endAt:localToUtc(endDate,endMinute),
     resourceId:resource?.id??null,durationMinutes:sessionMinutes,
     preparationMinutes:bufferMinutes});
    if(candidates.length>=200)break;
   }
  }
 }
 candidates.sort((a,b)=>a.startAt.localeCompare(b.startAt)||String(a.resourceId).localeCompare(String(b.resourceId)));
 if(reason==="ready"&&!candidates.length)
  reason=booked.length?"fully_booked":service.requiresChair?"chair_unavailable":"provider_unavailable";
 return {
  clinicId:cid,service:{id:service.id,name:service.name,category:service.category,durationMinutes:sessionMinutes,
   preparationMinutes:bufferMinutes,basePriceAfn:service.basePriceAfn,
   requiresChair:service.requiresChair,version:service.version},
  date,weekday:day,providerId:q.providerId,resourceId:resourceSelected,
  timezone:"Asia/Kabul",status:reason,slots:candidates,
  previewOnly:true,bookable:false,staffBookable:true,appointmentsImplemented:true,
  explanation:"Staff candidate slots account for existing appointments and configuration. Final booking is rechecked and enforced by PostgreSQL exclusion constraints. Patient/public booking remains unavailable until PH15."
 };
}
