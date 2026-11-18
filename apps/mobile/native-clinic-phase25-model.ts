/**
 * Phase 25 – clinic operations contracts. All state is from the authenticated
 * clinic-scoped API; no synthetic pricing, credentials, bookings or opening.
 * Native forms mirror server validation; the server is always authoritative.
 */
import type {NativeClinicRole} from "./native-clinic-model";
export type Service={
 id:string;clinicId:string;name:string;category:string;description:string|null;
 durationMinutes:number;preparationMinutes:number;basePriceAfn:number;
 requiresChair:boolean;publicBooking:boolean;active:boolean;version:number;
};
export type Resource={
 id:string;clinicId:string;code:string;label:string;kind:"chair"|"room";
 equipment:string|null;active:boolean;revision:number;
};
export type Break={start:number;end:number};
export type Shift={weekday:number;isOpen:boolean;startMinute:number;endMinute:number;
 breaks:Break[];revision:number};
export type Exception={
 id:string;clinicId:string;kind:"closed"|"special_hours";
 startDate:string;endDate:string;startMinute:number|null;endMinute:number|null;
 reason:string;revision:number;createdAt:string;
};
export type Clinician={membershipId:string;name:string};
export type Hours={
 timezone:"Asia/Kabul";clinic:Shift[];resourceHours:Record<string,Shift[]>;
 providers:Clinician[];exceptions:Exception[];
};
export type Readiness={clinicName:string;services:number;chairs:number;
 openDays:number;scheduledDentists:number;readyForPreview:boolean;
 publicBookingsEnabled:boolean;appointmentManagementEnabled:boolean;
 checklist:{key:"service"|"chair"|"clinicHours"|"dentistHours";done:boolean}[];
};
export type Slot={start:string;end:string;startAt:string;endAt:string;
 resourceId:string|null;durationMinutes:number;preparationMinutes:number};
export type Availability={status:"ready"|"clinic_closed"|"provider_unavailable"|
 "chair_unavailable"|"holiday_closed"|"fully_booked";date:string;
 slots:Slot[];serviceName:string;price:number;timezone:"Asia/Kabul"};
export type ServiceDraft={
 name:string;category:string;description:string;durationMinutes:string;
 preparationMinutes:string;basePriceAfn:string;requiresChair:boolean;
 publicBooking:boolean;active:boolean;
};
export type ResourceDraft={code:string;label:string;kind:"chair"|"room";
 equipment:string;active:boolean};
export type ExceptionDraft={startDate:string;endDate:string;
 kind:"closed"|"special_hours";startMinute:number;endMinute:number;reason:string};

const record=(v:unknown):v is Record<string,unknown>=>
 v!==null&&typeof v==="object"&&!Array.isArray(v);
const str=(v:unknown,max=160)=>typeof v==="string"&&v.length<=max;
const text=(v:unknown,max=160):v is string=>typeof v==="string"&&v.length<=max;
const nullable=(v:unknown,max=160):v is string|null=>v===null||text(v,max);
const int=(v:unknown,min=0,max=100000000):v is number=>
 typeof v==="number"&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export const isId=(v:unknown):v is string=>
 typeof v==="string"&&/^[0-9a-f-]{36}$/i.test(v);
const iso=(v:unknown):v is string=>typeof v==="string"&&v.length<=45&&
 Number.isFinite(Date.parse(v));
const yes=(v:unknown)=>typeof v==="boolean";
const servicesMax=300,resourcesMax=50;
export function canReadOps(role:NativeClinicRole){
 return ["owner","manager","dentist","receptionist"].includes(role);
}
export function canManageOps(role:NativeClinicRole){
 return role==="owner"||role==="manager";
}
export function parseService(v:unknown,clinicId:string):Service|null{
 if(!record(v)||v.clinicId!==clinicId||!isId(v.id)||
  !text(v.name,100)||!text(v.category,60)||!nullable(v.description,700)||
  !int(v.durationMinutes,5,240)||v.durationMinutes%5!==0||
  !int(v.preparationMinutes,0,120)||v.preparationMinutes%5!==0||
  !int(v.basePriceAfn,0,10000000)||!yes(v.requiresChair)||
  !yes(v.publicBooking)||!yes(v.active)||!int(v.version,1,100000))return null;
 return {id:v.id,clinicId,name:v.name,category:v.category,
  description:v.description as string|null,durationMinutes:v.durationMinutes,
  preparationMinutes:v.preparationMinutes,basePriceAfn:v.basePriceAfn,
  requiresChair:v.requiresChair as boolean,publicBooking:v.publicBooking as boolean,
  active:v.active as boolean,version:v.version};
}
export function parseServices(raw:unknown,clinicId:string):Service[]|null{
 if(!record(raw)||!Array.isArray(raw.services)||raw.services.length>servicesMax)return null;
 const seen=new Set<string>(),data:Service[]=[];
 for(const v of raw.services){
  const row=parseService(v,clinicId);
  if(!row||seen.has(row.id))return null;
  seen.add(row.id);data.push(row);
 }
 return data;
}
export function parseResource(v:unknown,clinicId:string):Resource|null{
 if(!record(v)||v.clinicId!==clinicId||!isId(v.id)||
  !text(v.code,24)||!text(v.label,50)||
  !["chair","room"].includes(String(v.kind))||
  !nullable(v.equipment,200)||!yes(v.active)||!int(v.revision,1,100000))return null;
 return {id:v.id,clinicId,code:v.code,label:v.label,kind:v.kind as Resource["kind"],
  equipment:v.equipment as string|null,active:v.active as boolean,revision:v.revision};
}
export function parseResources(raw:unknown,clinicId:string):Resource[]|null{
 if(!record(raw)||!Array.isArray(raw.resources)||raw.resources.length>resourcesMax)return null;
 const seen=new Set<string>(),data:Resource[]=[];
 for(const v of raw.resources){
  const row=parseResource(v,clinicId);
  if(!row||seen.has(row.id))return null;
  seen.add(row.id);data.push(row);
 }
 return data;
}
export function serviceForm(row?:Service|null):ServiceDraft{
 return {name:row?.name||"",category:row?.category||"",
  description:row?.description||"",
  durationMinutes:String(row?.durationMinutes??30),
  preparationMinutes:String(row?.preparationMinutes??0),
  basePriceAfn:String(row?.basePriceAfn??0),
  requiresChair:row?.requiresChair??true,publicBooking:row?.publicBooking??false,
  active:row?.active??true};
}
export function resourceForm(row?:Resource|null):ResourceDraft{
 return {code:row?.code||"",label:row?.label||"",kind:row?.kind||"chair",
  equipment:row?.equipment||"",active:row?.active??true};
}
const numberText=(s:string,min:number,max:number,step=1)=>{
 if(!/^\d{1,8}$/.test(s))return null;
 const n=Number(s);return Number.isSafeInteger(n)&&n>=min&&n<=max&&n%step===0?n:null;
};
export function servicePayload(d:ServiceDraft,row?:Service|null){
 const name=d.name.trim(),category=d.category.trim();
 const duration=numberText(d.durationMinutes.trim(),5,240,5);
 const prep=numberText(d.preparationMinutes.trim(),0,120,5);
 const price=numberText(d.basePriceAfn.trim(),0,10000000);
 if(name.length<2||name.length>100||category.length<2||category.length>60||
  d.description.trim().length>700||duration===null||prep===null||price===null||
  typeof d.requiresChair!=="boolean"||typeof d.publicBooking!=="boolean"||
  typeof d.active!=="boolean")return null;
 return {name,category,description:d.description.trim()||null,
  durationMinutes:duration,preparationMinutes:prep,basePriceAfn:price,
  requiresChair:d.requiresChair,publicBooking:d.publicBooking,active:d.active,
  ...(row?{version:row.version}:{})};
}
export function resourcePayload(d:ResourceDraft,row?:Resource|null){
 const code=d.code.trim().toUpperCase(),label=d.label.trim();
 if(!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(code)||label.length<1||
  label.length>50||d.equipment.trim().length>200||
  !["chair","room"].includes(d.kind)||typeof d.active!=="boolean")return null;
 return {code,label,kind:d.kind,equipment:d.equipment.trim()||null,
  active:d.active,...(row?{revision:row.revision}:{})};
}
function parseBreaks(raw:unknown,start:number,end:number):Break[]|null{
 if(!Array.isArray(raw)||raw.length>8)return null;
 const values:Break[]=[];
 for(const v of raw){
  if(!record(v)||!int(v.start,0,1440)||!int(v.end,0,1440)||
   v.start>=v.end||v.start<start||v.end>end)return null;
  values.push({start:v.start,end:v.end});
 }
 values.sort((a,b)=>a.start-b.start);
 if(values.some((v,i)=>i>0&&values[i-1].end>v.start))return null;
 return values;
}
export function parseShift(v:unknown):Shift|null{
 if(!record(v)||!int(v.weekday,0,6)||!yes(v.isOpen)||
  !int(v.startMinute,0,1440)||!int(v.endMinute,0,1440)||
  v.startMinute>=v.endMinute||!int(v.revision,0,100000000))return null;
 const breaks=parseBreaks(v.breaks,v.startMinute,v.endMinute);
 if(breaks===null)return null;
 return {weekday:v.weekday,isOpen:v.isOpen as boolean,startMinute:v.startMinute,
  endMinute:v.endMinute,breaks,revision:v.revision};
}
export function validDate(v:unknown):v is string{
 if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const time=Date.parse(v+"T00:00:00.000Z");
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===v;
}
export function kabulToday(now=new Date()){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
 const v=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 return v.year+"-"+v.month+"-"+v.day;
}
export function shiftDate(date:string,days:number):string{
 if(!validDate(date))throw Error("INVALID_DATE");
 return new Date(Date.parse(date+"T00:00:00Z")+days*86400000).toISOString().slice(0,10);
}
export function dateInPreviewRange(date:string,now=kabulToday()){
 return validDate(date)&&validDate(now)&&date>=now&&
  (Date.parse(date+"T00:00:00Z")-Date.parse(now+"T00:00:00Z"))/86400000<=365;
}
export function parseException(v:unknown,clinicId:string):Exception|null{
 if(!record(v)||v.clinicId!==clinicId||!isId(v.id)||
  !["closed","special_hours"].includes(String(v.kind))||
  !validDate(v.startDate)||!validDate(v.endDate)||
  v.endDate<v.startDate||!text(v.reason,200)||!iso(v.createdAt)||
  !int(v.revision,1,100000))return null;
 if(v.kind==="special_hours"&&(!int(v.startMinute,0,1440)||
  !int(v.endMinute,0,1440)||v.startMinute>=v.endMinute))return null;
 if(v.kind==="closed"&&!(v.startMinute===null&&v.endMinute===null))return null;
 return {id:v.id,clinicId,kind:v.kind as Exception["kind"],
  startDate:v.startDate,endDate:v.endDate,
  startMinute:v.startMinute as number|null,endMinute:v.endMinute as number|null,
  reason:v.reason,revision:v.revision,createdAt:v.createdAt};
}
export function parseHours(raw:unknown,clinicId:string):Hours|null{
 if(!record(raw)||raw.timezone!=="Asia/Kabul"||
  !Array.isArray(raw.hours)||!Array.isArray(raw.resources)||
  !Array.isArray(raw.exceptions)||!Array.isArray(raw.clinicians)||
  raw.hours.length>7||raw.resources.length>350||
  raw.exceptions.length>500||raw.clinicians.length>500)return null;
 const clinic:Shift[]=[],resourceHours:Record<string,Shift[]>={};
 const exceptions:Exception[]=[],providers:Clinician[]=[];
 for(const v of raw.hours){
  if(!record(v)||v.clinicId!==clinicId)return null;
  const parsed=parseShift(v);
  if(!parsed||clinic.some(x=>x.weekday===parsed.weekday))return null;
  clinic.push(parsed);
 }
 for(const v of raw.resources){
  if(!record(v)||v.clinicId!==clinicId||!isId(v.resourceId))return null;
  const row=parseShift(v);
  if(!row)return null;
  const id=v.resourceId as string;
  if(!Object.prototype.hasOwnProperty.call(resourceHours,id))resourceHours[id]=[];
  if(resourceHours[id].some(s=>s.weekday===row.weekday))return null;
  resourceHours[id].push(row);
 }
 for(const v of raw.exceptions){
  const parsed=parseException(v,clinicId);
  if(!parsed||exceptions.some(e=>e.id===parsed.id))return null;
  exceptions.push(parsed);
 }
 for(const v of raw.clinicians){
  if(!record(v)||!isId(v.membershipId)||!text(v.name,120)||
   providers.some(x=>x.membershipId===v.membershipId))return null;
  providers.push({membershipId:v.membershipId,name:v.name});
 }
 return {timezone:"Asia/Kabul",clinic,resourceHours,providers,exceptions};
}
export function fullWeek(rows:Shift[]):Shift[]{
 return Array.from({length:7},(_,weekday)=>{
  const existing=rows.find(x=>x.weekday===weekday);
  return existing?{...existing,breaks:existing.breaks.map(b=>({...b}))}:
   {weekday,isOpen:false,startMinute:540,endMinute:1020,breaks:[],revision:0};
 });
}
export function validWeek(week:Shift[]):boolean{
 if(!Array.isArray(week)||week.length!==7||
  new Set(week.map(s=>s.weekday)).size!==7)return false;
 return week.every(x=>parseShift(x)!==null);
}
export function saveWeekPayload(week:Shift[]){
 if(!validWeek(week))return null;
 return {week:week.map(x=>({...x,breaks:x.isOpen?x.breaks:[]}))};
}
export function exceptionPayload(d:ExceptionDraft,now=kabulToday()){
 const start=d.startDate.trim(),end=d.endDate.trim(),reason=d.reason.trim();
 if(!validDate(start)||!validDate(end)||start>end||start<now||
  (Date.parse(end+"T00:00:00Z")-Date.parse(start+"T00:00:00Z"))/86400000>90||
  reason.length<5||reason.length>200)return null;
 if(d.kind==="special_hours"&&(!int(d.startMinute,0,1440)||
  !int(d.endMinute,0,1440)||d.startMinute>=d.endMinute))return null;
 return {startDate:start,endDate:end,kind:d.kind,
  ...(d.kind==="special_hours"?{startMinute:d.startMinute,endMinute:d.endMinute}:{}),
  reason};
}
export function parseReadiness(raw:unknown):Readiness|null{
 if(!record(raw)||raw.timezone!=="Asia/Kabul"||
  !text(raw.clinicName,180)||!record(raw.metrics)||
  !int(raw.metrics.services,0,100000)||!int(raw.metrics.chairs,0,100000)||
  !int(raw.metrics.openDays,0,7)||!int(raw.metrics.scheduledDentists,0,10000)||
  !yes(raw.readyForPreview)||!yes(raw.publicBookingsEnabled)||
  !yes(raw.appointmentManagementEnabled)||!Array.isArray(raw.checklist)||
  raw.checklist.length!==4)return null;
 const keys=["service","chair","clinicHours","dentistHours"] as const;
 const checklist:Readiness["checklist"]=[];
 for(const v of raw.checklist){
  if(!record(v)||!keys.includes(v.key as typeof keys[number])||!yes(v.done)||
   checklist.some(x=>x.key===v.key))return null;
  checklist.push({key:v.key as typeof keys[number],done:v.done as boolean});
 }
 return {clinicName:raw.clinicName,services:raw.metrics.services,
  chairs:raw.metrics.chairs,openDays:raw.metrics.openDays,
  scheduledDentists:raw.metrics.scheduledDentists,
  readyForPreview:raw.readyForPreview,publicBookingsEnabled:raw.publicBookingsEnabled,
  appointmentManagementEnabled:raw.appointmentManagementEnabled,checklist};
}
export function previewPath(clinicId:string,date:string,serviceId:string,
 providerId:string,resourceId:string|null){
 if(!isId(clinicId)||!isId(serviceId)||!isId(providerId)||!validDate(date)||
  resourceId!==null&&!isId(resourceId))throw Error("INVALID_PREVIEW_PARAMS");
 return "/v1/operations/clinics/"+encodeURIComponent(clinicId)+
  "/availability/preview?date="+encodeURIComponent(date)+
  "&serviceId="+encodeURIComponent(serviceId)+
  "&providerId="+encodeURIComponent(providerId)+
  (resourceId?"&resourceId="+encodeURIComponent(resourceId):"");
}
const states=["ready","clinic_closed","provider_unavailable","chair_unavailable",
 "holiday_closed","fully_booked"] as const;
const hm=(v:unknown)=>typeof v==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export function parsePreview(raw:unknown,expected:{
 clinicId:string;date:string;serviceId:string;providerId:string;
 resourceId:string|null}):Availability|null{
 if(!record(raw)||raw.clinicId!==expected.clinicId||
  raw.timezone!=="Asia/Kabul"||raw.date!==expected.date||
  raw.providerId!==expected.providerId||raw.resourceId!==expected.resourceId||
  !record(raw.service)||raw.service.id!==expected.serviceId||
  !text(raw.service.name,100)||!int(raw.service.basePriceAfn,0,10000000)||
  !states.includes(raw.status as Availability["status"])||
  raw.previewOnly!==true||raw.bookable!==false||
  !Array.isArray(raw.slots)||raw.slots.length>200)return null;
 const slots:Slot[]=[];
 for(const v of raw.slots){
  if(!record(v)||!hm(v.start)||!hm(v.end)||!iso(v.startAt)||!iso(v.endAt)||
   !(v.resourceId===null||isId(v.resourceId))||
   !int(v.durationMinutes,5,240)||!int(v.preparationMinutes,0,120)||
   Date.parse(v.endAt)<=Date.parse(v.startAt))return null;
  slots.push({start:v.start,end:v.end,startAt:v.startAt,endAt:v.endAt,
   resourceId:v.resourceId as string|null,durationMinutes:v.durationMinutes,
   preparationMinutes:v.preparationMinutes});
 }
 return {date:expected.date,status:raw.status as Availability["status"],
  serviceName:raw.service.name,price:raw.service.basePriceAfn,
  timezone:"Asia/Kabul",slots};
}
export function clock(n:number){
 return String(Math.floor(n/60)).padStart(2,"0")+":"+
  String(n%60).padStart(2,"0");
}
