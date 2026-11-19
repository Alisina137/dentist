/** Phase27 clinic account/settings DTOs. All sensitive server results are
 * reduced to allowlisted fields and checked for tenant, role and revision.
 * No notification recipients, invite links or payment evidence are cached. */
import {blankClinicDraft,clinicRegistrationPayload,type ClinicDraft,type NativeClinicRole} from "./native-clinic-model";
export type Language="en"|"fa-AF"|"ps-AF";
export type Calendar="gregorian"|"solar_hijri";
export type Identity={name:string;email:string;verified:boolean;locale:Language;calendar:Calendar;twoFactorEnabled:boolean};
export type SessionRow={id:string;createdAt:string;updatedAt:string;expiresAt:string;userAgent:string|null};
export type DeliveryRow={id:string;event:string;status:"pending"|"processing"|"sent"|"failed"|"skipped";attemptCount:number;createdAt:string;sentAt:string|null;errorCode:string|null};
export type Deliveries={records:DeliveryRow[];emailConfigured:boolean;smsConfigured:boolean;pushConfigured:boolean};
export type Plan={id:string;label:string;billingPeriod:"monthly"|"annual";priceAfn:number;staffLimit:number;branchLimit:number;trialDays:number;graceDays:number;active:boolean};
export type Subscription={status:string;planVersionId:string;trialEndsAt:string|null;currentPeriodEndsAt:string|null;pendingPlanVersionId:string|null};
export type Invoice={id:string;status:string;amountAfn:number;planVersionId:string;createdAt:string};
export type ClinicSettings={id:string;status:string;revision:number;selectedPlanId:string;plannedDentistCount:number;
 fields:ClinicDraft;effectiveStatus:string;subscription:Subscription|null;plan:Plan|null;invoices:Invoice[]};
export type PaymentReceipt={invoiceId:string;status:"awaiting";amountAfn:number};
const obj=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const string=(v:unknown,max=250):v is string=>typeof v==="string"&&v.length<=max;
const nonempty=(v:unknown,max=250):v is string=>string(v,max)&&v.length>0;
const integer=(v:unknown,min=0,max=1000000):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const date=(v:unknown):v is string=>string(v,45)&&Number.isFinite(Date.parse(v));
const optionalDate=(v:unknown):v is string|null=>v===null||date(v);
export const isUid=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9-]{36}$/i.test(v);
export const language=(v:unknown):v is Language=>v==="en"||v==="fa-AF"||v==="ps-AF";
export const calendar=(v:unknown):v is Calendar=>v==="gregorian"||v==="solar_hijri";
export function canSeeDeliveries(role:NativeClinicRole){return role==="owner"||role==="manager"}
export function canEditClinic(role:NativeClinicRole){return role==="owner"}
export function accountIdentity(value:unknown):Identity|null{
 if(!obj(value)||!obj(value.user)||!string(value.user.name,120)||
  !nonempty(value.user.email,160)||value.user.email.includes(" ")||
  typeof value.user.emailVerified!=="boolean"||
  typeof value.user.twoFactorEnabled!=="boolean"||
  !language(value.locale)||!calendar(value.calendar))return null;
 return {name:value.user.name,email:value.user.email,verified:value.user.emailVerified,
  locale:value.locale,calendar:value.calendar,twoFactorEnabled:value.user.twoFactorEnabled};
}
export function savedPreferences(value:unknown,expected:Language,cal:Calendar):boolean{
 return obj(value)&&value.locale===expected&&value.calendar===cal;
}
export function parseSessions(value:unknown):SessionRow[]|null{
 if(!obj(value)||!Array.isArray(value.sessions)||value.sessions.length>25)return null;
 const seen=new Set<string>(),rows:SessionRow[]=[];
 for(const raw of value.sessions){
  if(!obj(raw)||!nonempty(raw.id,140)||raw.id.length<8||
   seen.has(raw.id)||!date(raw.createdAt)||!date(raw.updatedAt)||
   !date(raw.expiresAt)||!(raw.userAgent===null||string(raw.userAgent,160)))return null;
  seen.add(raw.id);
  rows.push({id:raw.id,createdAt:raw.createdAt,updatedAt:raw.updatedAt,
   expiresAt:raw.expiresAt,userAgent:raw.userAgent as string|null});
 }
 return rows;
}
const statuses=["pending","processing","sent","failed","skipped"] as const;
export function parseDeliveries(value:unknown):Deliveries|null{
 if(!obj(value)||!Array.isArray(value.deliveries)||value.deliveries.length>100||
  typeof value.emailConfigured!=="boolean"||typeof value.smsConfigured!=="boolean"||
  typeof value.pushConfigured!=="boolean")return null;
 const records:DeliveryRow[]=[];
 for(let i=0;i<value.deliveries.length;i++){
  const v=value.deliveries[i];
  if(!obj(v)||!nonempty(v.event_name,90)||
   !statuses.includes(v.status as DeliveryRow["status"])||
   !integer(v.attempt_count,0,10000)||!date(v.created_at)||
   !optionalDate(v.sent_at)||!(v.last_error_code===null||
    string(v.last_error_code,80)))return null;
  // The API deliberately does not return patients, booking IDs or recipient email.
  records.push({id:String(i)+":"+v.created_at,event:v.event_name,
   status:v.status as DeliveryRow["status"],attemptCount:v.attempt_count,
   createdAt:v.created_at,sentAt:v.sent_at as string|null,
   errorCode:v.last_error_code as string|null});
 }
 return {records,emailConfigured:value.emailConfigured,
  smsConfigured:value.smsConfigured,pushConfigured:value.pushConfigured};
}
export function deliverySummary(data:Deliveries){
 const sent=data.records.filter(x=>x.status==="sent").length;
 const failed=data.records.filter(x=>x.status==="failed").length;
 const skipped=data.records.filter(x=>x.status==="skipped").length;
 return {total:data.records.length,sent,failed,skipped,
  queued:data.records.length-sent-failed-skipped};
}
export function parsePlan(value:unknown):Plan|null{
 if(!obj(value)||!isUid(value.id)||!nonempty(value.label,120)||
  !["monthly","annual"].includes(String(value.billingPeriod))||
  !integer(value.priceAfn,0,100000000)||
  !integer(value.staffLimit,0,10000)||!integer(value.branchLimit,0,1000)||
  !integer(value.trialDays,0,365)||!integer(value.graceDays,0,365)||
  typeof value.active!=="boolean")return null;
 return {id:value.id,label:value.label,billingPeriod:value.billingPeriod as Plan["billingPeriod"],
  priceAfn:value.priceAfn,staffLimit:value.staffLimit,branchLimit:value.branchLimit,
  trialDays:value.trialDays,graceDays:value.graceDays,active:value.active};
}
export function parsePlans(value:unknown):Plan[]|null{
 if(!obj(value)||!Array.isArray(value.plans)||value.plans.length>100)return null;
 const seen=new Set<string>(),items:Plan[]=[];
 for(const row of value.plans){
  const p=parsePlan(row);
  if(!p||seen.has(p.id))return null;
  seen.add(p.id);items.push(p);
 }
 return items;
}
export function parseClinicSettings(value:unknown,clinicId:string):ClinicSettings|null{
 if(!obj(value)||!obj(value.clinic)||value.clinic.id!==clinicId||
  !isUid(clinicId)||!integer(value.clinic.revision,1,1000000)||
  !integer(value.clinic.plannedDentistCount,1,500)||
  !nonempty(value.clinic.status,30)||!isUid(value.clinic.selectedPlanId)||
  !nonempty(value.effectiveStatus,40)||
  !Array.isArray(value.invoices)||value.invoices.length>500)return null;
 const c=value.clinic,fields={...blankClinicDraft};
 for(const name of ["legalName","displayName","province","city","address",
  "phone","email"] as const){
  if(!string(c[name],250))return null;
  fields[name]=c[name] as string;
 }
 if(!["solo","office","specialty"].includes(String(c.clinicType))||
  !(c.district===null||string(c.district,80))||
  !(c.licenseNumber===null||string(c.licenseNumber,80)))return null;
 fields.clinicType=c.clinicType as ClinicDraft["clinicType"];
 fields.district=(c.district as string|null)||"";
 fields.licenseNumber=(c.licenseNumber as string|null)||"";
 fields.plannedDentistCount=String(c.plannedDentistCount);
 // Enforce the same invariant as registration before allowing mutable forms.
 try{clinicRegistrationPayload(fields,c.selectedPlanId as string)}
 catch{return null}
 let subscription:Subscription|null=null;
 if(value.subscription!==null){
  const sub=value.subscription;
  if(!obj(sub)||sub.clinicId!==clinicId||!nonempty(sub.status,40)||
   !isUid(sub.planVersionId)||!optionalDate(sub.trialEndsAt)||
   !optionalDate(sub.currentPeriodEndsAt)||
   !(sub.pendingPlanVersionId===null||isUid(sub.pendingPlanVersionId)))return null;
  subscription={status:sub.status,planVersionId:sub.planVersionId,
   trialEndsAt:sub.trialEndsAt as string|null,
   currentPeriodEndsAt:sub.currentPeriodEndsAt as string|null,
   pendingPlanVersionId:sub.pendingPlanVersionId as string|null};
 }
 const plan=value.plan===null?null:parsePlan(value.plan);
 if(value.plan!==null&&!plan)return null;
 const invoices:Invoice[]=[],seen=new Set<string>();
 for(const raw of value.invoices){
  if(!obj(raw)||!isUid(raw.id)||seen.has(raw.id)||
   !isUid(raw.planVersionId)||!integer(raw.amountAfn,0,100000000)||
   !nonempty(raw.status,35)||!date(raw.createdAt))return null;
  seen.add(raw.id);
  invoices.push({id:raw.id,planVersionId:raw.planVersionId,
   amountAfn:raw.amountAfn,status:raw.status,createdAt:raw.createdAt});
 }
 return {id:clinicId,status:c.status,revision:c.revision,selectedPlanId:c.selectedPlanId,
  plannedDentistCount:c.plannedDentistCount,fields,effectiveStatus:value.effectiveStatus,
  subscription,plan,invoices};
}
export function clinicUpdatePayload(current:ClinicSettings,fields:ClinicDraft){
 const values=clinicRegistrationPayload(fields,current.selectedPlanId);
 return {...values,revision:current.revision};
}
export function parseUpdatedClinic(value:unknown,current:ClinicSettings):boolean{
 if(!obj(value)||!obj(value.clinic))return false;
 return value.clinic.id===current.id&&
  integer(value.clinic.revision,current.revision+1,1000000)&&
  string(value.clinic.displayName,100);
}
export function paymentReference(value:string){
 const clean=value.trim();
 return clean.length>=5&&clean.length<=160&&!/[\r\n\x00-\x1F\x7F]/.test(clean)?clean:null;
}
export function paymentPayload(planId:string,reference:string,plans:Plan[]){
 const plan=plans.find(p=>p.id===planId&&p.active);
 const evidence=paymentReference(reference);
 return plan&&evidence?{planVersionId:plan.id,evidenceReference:evidence}:null;
}
export function parsePaymentReceipt(value:unknown,plan:Plan):PaymentReceipt|null{
 if(!obj(value)||!isUid(value.invoiceId)||value.status!=="awaiting"||
  value.amountAfn!==plan.priceAfn)return null;
 return {invoiceId:value.invoiceId,status:"awaiting",amountAfn:value.amountAfn};
}
export function shortenDate(value:string|null){
 if(!value)return "—";
 const time=Date.parse(value);
 return Number.isFinite(time)?new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(time)):"—";
}
