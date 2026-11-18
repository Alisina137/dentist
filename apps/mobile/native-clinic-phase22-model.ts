/**
 * Phase 22 – native reception and appointments.
 * All mutations target the existing guarded server endpoints. No role is
 * granted by the client; these are only UI gates to avoid misleading actions.
 * No clinical notes, health charts, billing or patient contact is cached.
 */
import type {NativeClinicRole} from "./native-clinic-model";
export type AppointmentStatus="confirmed"|"arrived"|"in_treatment"|"completed"|"cancelled"|"no_show";
export type AppointmentAction="arrived"|"no_show"|"cancelled"|"in_treatment"|"completed";
export type AppointmentSource="staff"|"walk_in"|"phone";
export type AppointmentView={
 id:string;clinicId:string;patientId:string;serviceId:string;
 providerMembershipId:string;resourceId:string|null;
 patientName:string;providerName:string;serviceName:string;
 startAt:string;endAt:string;status:AppointmentStatus;
 revision:number;source:AppointmentSource;durationMinutes:number;
};
export type AppointmentCalendar={from:string;to:string;total:number;
 appointments:AppointmentView[];truncated:boolean};
export type AppointmentQueue={day:string;counts:Record<string,number>;
 appointments:AppointmentView[]};
export type BookingCatalog={
 services:{id:string;name:string;requiresChair:boolean;durationMinutes:number}[];
 providers:{membershipId:string;name:string}[];
 resources:{id:string;label:string}[];
};
export type BookingSlot={start:string;end:string;resourceId:string|null;startAt:string};
export type SlotPreview={status:string;date:string;providerId:string;
 serviceId:string;slots:BookingSlot[]};
export type SearchPatient={id:string;patientNumber:string;preferredName:string;familyName:string};
const record=(v:unknown):v is Record<string,unknown>=>
 !!v&&typeof v==="object"&&!Array.isArray(v);
const bounded=(v:unknown,n=120):v is string=>typeof v==="string"&&v.length<=n;
const idValid=(v:unknown):v is string=>
 typeof v==="string"&&/^[a-zA-Z0-9_-]{8,100}$/.test(v);
export const clinicIdValid=(v:unknown):v is string=>
 typeof v==="string"&&/^[0-9a-f-]{36}$/i.test(v);
export function validDay(v:unknown):v is string{
 if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const n=Date.parse(v+"T00:00:00.000Z");
 return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===v;
}
export function shiftDay(day:string,by:number):string{
 if(!validDay(day)||!Number.isInteger(by)||Math.abs(by)>366)throw Error("INVALID_DAY");
 return new Date(Date.parse(day+"T00:00:00.000Z")+by*86400000).toISOString().slice(0,10);
}
export function kabulToday(now:Date=new Date()):string{
 const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
 const values=Object.fromEntries(p.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return values.year+"-"+values.month+"-"+values.day;
}
export function weekWindow(date:string,lang:"en"|"fa-AF"|"ps-AF"){
 if(!validDay(date))throw Error("INVALID_DAY");
 const dow=new Date(date+"T00:00:00Z").getUTCDay();
 const offset=lang==="en"?(dow+6)%7:(dow+1)%7;
 const from=shiftDay(date,-offset);
 return {from,to:shiftDay(from,6)};
}
const statuses=["confirmed","arrived","in_treatment","completed","cancelled","no_show"] as const;
export function parseAppointment(input:unknown,clinicId:string):AppointmentView|null{
 if(!record(input)||input.clinicId!==clinicId||!idValid(input.id)||
  !idValid(input.patientId)||!idValid(input.serviceId)||
  !idValid(input.providerMembershipId)||
  !(input.resourceId===null||idValid(input.resourceId))||
  !statuses.includes(input.status as AppointmentStatus)||
  !Number.isSafeInteger(input.revision)||Number(input.revision)<1||
  !bounded(input.serviceName,160)||!bounded(input.providerName,120)||
  !["staff","walk_in","phone"].includes(String(input.source))||
  typeof input.startAt!=="string"||typeof input.endAt!=="string"||
  !Number.isFinite(Date.parse(input.startAt))||!Number.isFinite(Date.parse(input.endAt))||
  Date.parse(input.endAt)<=Date.parse(input.startAt)||
  !Number.isSafeInteger(input.serviceDurationMinutes)||Number(input.serviceDurationMinutes)<5||
  Number(input.serviceDurationMinutes)>240)return null;
 const patient=record(input.patient)?input.patient:null;
 if(patient&&(!bounded(patient.preferredName,120)||!bounded(patient.familyName,120)))return null;
 return {
  id:input.id,clinicId,patientId:input.patientId,serviceId:input.serviceId,
  providerMembershipId:input.providerMembershipId,resourceId:input.resourceId,
  patientName:patient?String(patient.preferredName).trim():"",providerName:String(input.providerName),
  serviceName:String(input.serviceName),startAt:input.startAt,endAt:input.endAt,
  status:input.status as AppointmentStatus,revision:Number(input.revision),
  source:input.source as AppointmentSource,durationMinutes:Number(input.serviceDurationMinutes)
 };
}
/** Mutating queue items requires fresh appointment detail after tapping. */
export function parseQueue(value:unknown,clinicId:string,day:string):AppointmentQueue|null{
 if(!record(value)||value.timezone!=="Asia/Kabul"||value.date!==day||
  !Array.isArray(value.queue)||value.queue.length>1500||!record(value.counts))
  return null;
 const items:AppointmentView[]=[],ids=new Set<string>();
 for(const raw of value.queue){
  const parsed=parseAppointment(raw,clinicId);
  if(!parsed||ids.has(parsed.id)||parsed.status==="cancelled")return null;
  ids.add(parsed.id);items.push(parsed);
 }
 for(const status of ["confirmed","arrived","in_treatment","completed","no_show"]){
  if(!Number.isSafeInteger(value.counts[status])||Number(value.counts[status])<0||
   items.filter(item=>item.status===status).length!==value.counts[status])return null;
 }
 return {day,counts:value.counts as Record<string,number>,appointments:items};
}
export function parseCalendar(value:unknown,clinicId:string,from:string,to:string):AppointmentCalendar|null{
 if(!record(value)||!record(value.range)||value.range.from!==from||value.range.to!==to||
  value.timezone!=="Asia/Kabul"||value.truncated!==false||
  !Array.isArray(value.appointments)||value.appointments.length>1500||
  !Number.isSafeInteger(value.total)||value.total!==value.appointments.length)return null;
 const items:AppointmentView[]=[],ids=new Set<string>();
 for(const raw of value.appointments){
  const parsed=parseAppointment(raw,clinicId);
  if(!parsed||ids.has(parsed.id)||kabulDayOfTimestamp(parsed.startAt)<from||
    kabulDayOfTimestamp(parsed.startAt)>to)return null;
  items.push(parsed);ids.add(parsed.id);
 }
 return {from,to,total:items.length,appointments:items};
}
export function kabulDayOfTimestamp(timestamp:string):string{
 return kabulToday(new Date(timestamp));
}
export function parseAppointmentDetail(value:unknown,clinicId:string,appointmentId:string){
 if(!record(value)||value.timezone!=="Asia/Kabul")return null;
 const appointment=parseAppointment(value.appointment,clinicId);
 return appointment?.id===appointmentId?appointment:null;
}
export function parseCatalog(value:unknown):BookingCatalog|null{
 if(!record(value)||value.timezone!=="Asia/Kabul"||
  !Array.isArray(value.services)||value.services.length>400||
  !Array.isArray(value.providers)||value.providers.length>400||
  !Array.isArray(value.resources)||value.resources.length>400)return null;
 const services:BookingCatalog["services"]=[],providers:BookingCatalog["providers"]=[],resources:BookingCatalog["resources"]=[];
 for(const s of value.services){
  if(!record(s)||!idValid(s.id)||!bounded(s.name,160)||
    typeof s.requiresChair!=="boolean"||
    !Number.isSafeInteger(s.durationMinutes)||Number(s.durationMinutes)<5)return null;
  services.push({id:s.id,name:s.name as string,requiresChair:s.requiresChair,
   durationMinutes:Number(s.durationMinutes)});
 }
 for(const p of value.providers){
  if(!record(p)||!idValid(p.membershipId)||!bounded(p.name,120))return null;
  providers.push({membershipId:p.membershipId,name:p.name as string});
 }
 for(const r of value.resources){
  if(!record(r)||!idValid(r.id)||!bounded(r.label,120))return null;
  resources.push({id:r.id,label:r.label as string});
 }
 return {services,providers,resources};
}
export function parsePatientSearch(value:unknown):SearchPatient[]|null{
 if(!record(value)||!Array.isArray(value.patients)||value.patients.length>12)return null;
 const rows:SearchPatient[]=[];
 for(const x of value.patients){
  if(!record(x)||!idValid(x.id)||!bounded(x.patientNumber,80)||
   !bounded(x.preferredName,120)||!bounded(x.familyName,120))return null;
  rows.push({id:x.id,patientNumber:x.patientNumber as string,
   preferredName:x.preferredName as string,familyName:x.familyName as string});
 }
 return rows;
}
export function parseSlots(value:unknown,clinicId:string,date:string,
 serviceId:string,providerId:string):SlotPreview|null{
 if(!record(value)||value.clinicId!==clinicId||value.date!==date||
  value.providerId!==providerId||value.timezone!=="Asia/Kabul"||
  value.staffBookable!==true||!record(value.service)||value.service.id!==serviceId||
  !Array.isArray(value.slots)||value.slots.length>200||!bounded(value.status,40))return null;
 const slots:BookingSlot[]=[];
 for(const s of value.slots){
  if(!record(s)||typeof s.start!=="string"||!/^([01]\d|2[0-3]):(00|15|30|45)$/.test(s.start)||
   !bounded(s.end,8)||!bounded(s.startAt,50)||
   !Number.isFinite(Date.parse(s.startAt))||
   !(s.resourceId===null||idValid(s.resourceId)))return null;
  slots.push({start:s.start,end:s.end as string,resourceId:s.resourceId,
   startAt:s.startAt as string});
 }
 return {status:value.status as string,date,providerId,serviceId,slots};
}
export function canReadAppointments(role:NativeClinicRole){
 return ["owner","manager","dentist","receptionist","assistant"].includes(role);
}
export function canBook(role:NativeClinicRole){
 return ["owner","manager","dentist","receptionist"].includes(role);
}
export function allowedTransition(role:NativeClinicRole,assigned:boolean,status:AppointmentStatus)
 :AppointmentAction[]{
 if((role==="owner"||role==="manager"||role==="receptionist")&&status==="confirmed")
  return ["arrived","no_show","cancelled"];
 if((role==="owner"||role==="manager"||role==="receptionist")&&status==="arrived")
  return ["cancelled"];
 if((role==="dentist"&&assigned||["owner","manager"].includes(role)&&assigned)&&
  status==="arrived")return ["in_treatment"];
 if((role==="dentist"&&assigned||["owner","manager"].includes(role)&&assigned)&&
  status==="in_treatment")return ["completed"];
 return [];
}
/** A strict lower bound; the backend additionally validates no-show time. */
export function transitionReasonValid(status:AppointmentAction,reason:string){
 return status==="no_show"||status==="cancelled"?
  reason.trim().length>=10&&reason.trim().length<=300:true;
}
export function rescheduleReasonValid(reason:string){
 return reason.trim().length>=10&&reason.trim().length<=300;
}
export function bookingDateAllowed(date:string,today:string){
 return validDay(date)&&validDay(today)&&date>=today&&
  date<=shiftDay(today,365);
}
/** This value identifies an attempt, not an authentication credential. */
export function newActionKey(now=Date.now(),random=Math.random()):string{
 const ordinal=Math.max(0,Math.floor(random*0xffffffff));
 return "mobile_"+now.toString(36)+"_"+ordinal.toString(36).padStart(7,"0");
}
