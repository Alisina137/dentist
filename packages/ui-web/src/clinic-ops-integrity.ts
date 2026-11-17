/**
 * Clinic Phase 15: parse and verify non-clinical operational API response shapes.
 * A 200 response with another clinic's data, a stale period, an HTML splash or
 * missing fields must never become an authenticated report or downloadable CSV.
 * No browser storage, PHI, console logging, or permission-granting fallback.
 */
export type ClinicReportIdentity={clinicId:string;from:string;to:string};
type Dictionary=Record<string,unknown>;
const dict=(v:unknown):v is Dictionary=>Boolean(v)&&typeof v==="object"&&!Array.isArray(v);
const count=(v:unknown):v is number=>Number.isSafeInteger(v)&&typeof v==="number"&&v>=0;
const amount=(v:unknown):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&
 Math.abs(v)<=Number.MAX_SAFE_INTEGER;
function mapping(v:unknown,valid:(v:unknown)=>boolean):v is Record<string,number>{
 return dict(v)&&Object.entries(v).every(([key,value])=>
  /^[a-z][a-z0-9_]{0,39}$/.test(key)&&valid(value));
}
function day(v:unknown):v is string{
 if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const time=new Date(v+"T12:00:00Z");
 return Number.isFinite(time.getTime())&&time.toISOString().slice(0,10)===v;
}
export function clinicValidReportPayload(value:unknown,identity:ClinicReportIdentity):boolean{
 if(!dict(value)||!identity.clinicId||!day(identity.from)||!day(identity.to))return false;
 if(value.clinicId!==identity.clinicId||
  value.from!==identity.from||value.to!==identity.to||
  value.timezone!=="Asia/Kabul"||value.currency!=="AFN")return false;
 const a=value.appointments,p=value.patients,r=value.revenue;
 if(!dict(a)||!dict(p)||!dict(r)||!count(a.total)||
  !mapping(a.byStatus,count)||!Array.isArray(a.byDay)||
  !count(p.newRegistered)||!count(p.activeTotal)||
  !amount(r.netReceiptsAfn)||!mapping(r.byMethodAfn,amount)||
  !count(r.issuedInvoices)||!amount(r.issuedFaceValueAfn)||
  !amount(r.postedExpensesAfn))return false;
 const statuses=["confirmed","arrived","in_treatment","completed","cancelled","no_show"];
 if(Object.keys(a.byStatus).length!==statuses.length||
  !statuses.every(status=>status in (a.byStatus as Dictionary)))return false;
 const statusTotal=statuses.reduce((sum,status)=>sum+Number((a.byStatus as Dictionary)[status]),0);
 if(statusTotal!==a.total||!Number.isSafeInteger(statusTotal))return false;
 if(a.byDay.length>367)return false;
 let previous="",dailyTotal=0;
 for(const row of a.byDay){
  if(!dict(row)||!day(row.day)||row.day<identity.from||
   row.day>identity.to||row.day<=previous||!count(row.count))return false;
  dailyTotal+=row.count;previous=row.day;
 }
 if(!Number.isSafeInteger(dailyTotal)||dailyTotal!==a.total)return false;
 const methodKeys=["cash","bank_transfer","other_manual"];
 if(Object.keys(r.byMethodAfn).length!==methodKeys.length||
  !methodKeys.every(key=>key in (r.byMethodAfn as Dictionary)))return false;
 const paymentSum=methodKeys.reduce((sum,key)=>sum+Number((r.byMethodAfn as Dictionary)[key]),0);
 if(!Number.isSafeInteger(paymentSum)||paymentSum!==r.netReceiptsAfn)return false;
 return true;
}
export type ClinicDeliverySnapshot={
 deliveries:{event_name:string;status:string;attempt_count:number;
 created_at:string;sent_at:string|null;last_error_code:string|null}[];
 emailConfigured:boolean;smsConfigured:boolean;pushConfigured:boolean;
};
/** This endpoint is intentionally metadata-only: no patient contact information. */
export function clinicValidDeliveryPayload(value:unknown):value is ClinicDeliverySnapshot{
 if(!dict(value)||!Array.isArray(value.deliveries)||
  value.deliveries.length>100||
  typeof value.emailConfigured!=="boolean"||
  value.smsConfigured!==false||value.pushConfigured!==false)return false;
 const allowed=["queued","processing","sent","failed","skipped"];
 return value.deliveries.every(item=>dict(item)&&
  Object.keys(item).length===6&&
  /^[a-z][a-z0-9_]{0,59}$/.test(String(item.event_name))&&
  allowed.includes(String(item.status))&&count(item.attempt_count)&&
  item.attempt_count<=100&&typeof item.created_at==="string"&&
  Number.isFinite(Date.parse(item.created_at))&&
  (item.sent_at===null||
   typeof item.sent_at==="string"&&Number.isFinite(Date.parse(item.sent_at)))&&
  (item.last_error_code===null||
   typeof item.last_error_code==="string"&&/^[A-Z0-9_]{1,55}$/.test(item.last_error_code))
 );
}
export function clinicSafeApiCode(value:unknown):string{
 if(typeof value!=="string"||!/^([A-Z][A-Z0-9_]{1,59})$/.test(value))
  return "REQUEST_FAILED";
 return value;
}
