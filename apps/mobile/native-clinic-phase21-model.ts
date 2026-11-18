/**
 * Phase 21: defensive native-clinic dashboard contracts.
 *
 * The dashboard renders only bounded, allowlisted operational scalars and
 * appointment preview fields from the current authenticated clinic. It never
 * caches patient identity, notes, contact details, chart data, or invoices.
 */
import type {NativeClinicRole} from "./native-clinic-model";

export type DashboardPermission="operations"|"appointments"|"queue";
export type DashboardShortcuts="registration"|"team"|"today"|"bookings"|
 "patients"|"operations"|"finance"|"account";
export type QueueStatus="confirmed"|"arrived"|"in_treatment"|"completed"|"no_show";
export type QueuePreview={
 id:string;status:QueueStatus;startAt:string;providerName:string|null;
 preferredName:string|null;
};
export type QueueSummary={
 day:string;counts:Record<QueueStatus,number>;rows:QueuePreview[];total:number;
};
export type ScheduleSummary={
 day:string;todayTotal:number;weekTotal:number;
 counts:Record<QueueStatus,number>;
};
export type OperationalSummary={
 metrics:{services:number;chairs:number;openDays:number;scheduledDentists:number};
 checklist:{key:"service"|"chair"|"clinicHours"|"dentistHours";done:boolean}[];
 readyForPreview:boolean;
};
export type DashboardReadState="loading"|"ready"|"forbidden"|"unavailable";
export type DashboardRead<T>={state:DashboardReadState;data:T|null};
export type DashboardSnapshot={
 operations:DashboardRead<OperationalSummary>;
 schedule:DashboardRead<ScheduleSummary>;
 queue:DashboardRead<QueueSummary>;
 observedAt:number|null;
};

export const isValidClinicId=(id:unknown):id is string=>
 typeof id==="string"&&/^[a-f0-9-]{36}$/i.test(id);
const safeInt=(v:unknown,max=100000):v is number=>
 typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=max;
const object=(v:unknown):v is Record<string,unknown>=>
 !!v&&typeof v==="object"&&!Array.isArray(v);
const day=(v:unknown):v is string=>
 typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
 !Number.isNaN(Date.parse(v+"T00:00:00Z"))&&
 new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
const queueStatuses=["confirmed","arrived","in_treatment","completed","no_show"] as const;
const checkIds=["service","chair","clinicHours","dentistHours"] as const;
function validatedCounts(value:unknown):Record<QueueStatus,number>|null{
 if(!object(value))return null;
 const result={} as Record<QueueStatus,number>;
 for(const id of queueStatuses){
  if(!safeInt(value[id]))return null;
  result[id]=value[id];
 }
 return result;
}
export function dashboardCanRead(role:NativeClinicRole,resource:DashboardPermission):boolean{
 if(resource==="operations")return ["owner","manager","dentist","receptionist"].includes(role);
 return ["owner","manager","dentist","receptionist","assistant"].includes(role);
}
export function dashboardShortcuts(role:NativeClinicRole):DashboardShortcuts[]{
 switch(role){
  case "owner":return ["today","bookings","registration","team","patients","operations","account"];
  case "manager":return ["today","bookings","team","patients","operations","account"];
  case "dentist":return ["today","bookings","team","patients","account"];
  case "receptionist":return ["today","bookings","patients","account"];
  case "assistant":return ["today","account"];
  case "cashier":return ["finance","account"];
  default:return ["account"];
 }
}
/** Never interpret missing metrics as zero, nor unknown setup as complete. */
export function parseOperationalSummary(value:unknown):OperationalSummary|null{
 if(!object(value)||!object(value.metrics)||!Array.isArray(value.checklist)||
  value.checklist.length!==4||typeof value.readyForPreview!=="boolean"||
  value.timezone!=="Asia/Kabul")return null;
 const m=value.metrics;
 for(const key of ["services","chairs","openDays","scheduledDentists"] as const)
  if(!safeInt(m[key],10000))return null;
 if(Number(m.openDays)>7)return null;
 const seen=new Set<string>();
 const checklist:OperationalSummary["checklist"]=[];
 for(const entry of value.checklist){
  if(!object(entry)||!checkIds.includes(entry.key as typeof checkIds[number])||
   seen.has(String(entry.key))||typeof entry.done!=="boolean")return null;
  seen.add(String(entry.key));
  checklist.push({key:entry.key as OperationalSummary["checklist"][number]["key"],done:entry.done});
 }
 if(checklist.length!==4)return null;
 return {metrics:{
  services:m.services as number,chairs:m.chairs as number,openDays:m.openDays as number,
  scheduledDentists:m.scheduledDentists as number
 },checklist,readyForPreview:value.readyForPreview};
}
export function parseScheduleSummary(value:unknown):ScheduleSummary|null{
 if(!object(value)||!day(value.today)||value.timezone!=="Asia/Kabul"||
  !safeInt(value.todayTotal)||!safeInt(value.weekTotal))return null;
 const counts=validatedCounts(value.counts);
 if(!counts)return null;
 if(Object.values(counts).reduce((a,b)=>a+b,0)!==value.todayTotal)return null;
 return {day:value.today,todayTotal:value.todayTotal,weekTotal:value.weekTotal,counts};
}
/** The API's queue is same-day, clinic-scoped, and role-filtered on the server. */
export function parseQueueSummary(value:unknown,expectedClinic:string,
 expectedDay?:string|null):QueueSummary|null{
 if(!isValidClinicId(expectedClinic)||!object(value)||!day(value.date)||
  value.timezone!=="Asia/Kabul"||
  (expectedDay&&value.date!==expectedDay)||
  !Array.isArray(value.queue)||value.queue.length>3000)return null;
 const counts=validatedCounts(value.counts);
 if(!counts)return null;
 const rows:QueuePreview[]=[];
 const ids=new Set<string>();
 for(const raw of value.queue){
  if(!object(raw)||raw.clinicId!==expectedClinic||
   typeof raw.id!=="string"||raw.id.length<8||raw.id.length>100||
   ids.has(raw.id)||!queueStatuses.includes(raw.status as QueueStatus)||
   typeof raw.startAt!=="string"||raw.startAt.length>50||
   !Number.isFinite(Date.parse(raw.startAt))||
   typeof raw.providerName!=="string"||raw.providerName.length>120||
   !(raw.patient===null||object(raw.patient)))return null;
  const patient=raw.patient;
  let preferredName:string|null=null;
  if(object(patient)){
   if(typeof patient.preferredName!=="string"||
     patient.preferredName.length>120)return null;
   preferredName=patient.preferredName.trim()||null;
  }
  ids.add(raw.id);
  // Deliberately discard administrativeNote, phone, familyName,
  // patientId, staff IDs, and any arbitrary API fields.
  rows.push({id:raw.id,status:raw.status as QueueStatus,
   startAt:raw.startAt,providerName:raw.providerName.trim()||null,
   preferredName});
 }
 const actual=queueStatuses.reduce((sum,status)=>sum+
  rows.filter(x=>x.status===status).length,0);
 if(actual!==rows.length||rows.length!==Object.values(counts).reduce((a,b)=>a+b,0))
  return null;
 return {day:value.date,counts,rows:rows.slice(0,6),total:rows.length};
}
export function dashboardEmptySnapshot(role:NativeClinicRole):DashboardSnapshot{
 const make=<T,>(allowed:boolean):DashboardRead<T>=>({
  state:allowed?"loading":"forbidden",data:null
 });
 return {operations:make(dashboardCanRead(role,"operations")),
  schedule:make(dashboardCanRead(role,"appointments")),
  queue:make(dashboardCanRead(role,"queue")),observedAt:null};
}
export function snapshotIsStale(snapshot:DashboardSnapshot,now=Date.now()):boolean{
 return snapshot.observedAt===null||!Number.isFinite(now)||
  snapshot.observedAt>now+10000||now-snapshot.observedAt>120000;
}
export function canUseDashboardRoute(role:NativeClinicRole,
 shortcut:DashboardShortcuts):boolean{
 return dashboardShortcuts(role).includes(shortcut);
}
