/** Clinic Phase 15 — pure read-only operational readiness assessments.
 * This is a setup diagnostic, NEVER a clinical or healthcare release approval.
 * Client-side checks cannot override server permissions or the PH19 pilot gate.
 */
export type QualityState="pass"|"action"|"unknown";
export type QualityAction="services"|"resources"|"clinicHours"|"dentistHours"|"staffMfa"|"email";
export type QualityCheck={id:QualityAction;state:QualityState;current:number|null;target:number;
 href:string};
export type OperationSummary={metrics:{services:number;chairs:number;openDays:number;
 scheduledDentists:number};checklist:{key:string;done:boolean}[];readyForPreview:boolean};
export type StaffSecuritySummary={access:{status:string;mfaEnabled:boolean;role:string}[]};
export type ChannelSummary={emailConfigured:boolean;smsConfigured:boolean;pushConfigured:boolean;
 deliveries:{status:string;event_name:string;attempt_count:number}[]};
export type AppointmentSummary={todayTotal:number;weekTotal:number;
 counts:Record<string,number>;timezone:string};
export type QualitySnapshot={
 operations:OperationSummary|null;
 staff:StaffSecuritySummary|null;
 channels:ChannelSummary|null;
 appointments:AppointmentSummary|null;
};
const path=(p:string,cid:string)=>p+"?"+new URLSearchParams({clinic:cid});
const sane=(x:unknown)=>typeof x==="number"&&Number.isSafeInteger(x)&&x>=0?x:null;
export function clinicQualityChecks(summary:QualitySnapshot,cid:string):QualityCheck[]{
 const operations=summary.operations?.metrics;
 const op=(value:unknown)=>sane(value);
 const staff=summary.staff?.access;
 const active=staff?.filter(x=>x.status==="active")||[];
 const unprotected=staff?active.filter(x=>!x.mfaEnabled).length:null;
 return [
  {id:"services",state:operations?op(operations.services)!==null&&operations.services>0?"pass":"action":"unknown",
   current:op(operations?.services),target:1,href:path("/clinic/services",cid)},
  {id:"resources",state:operations?
    summary.operations?.checklist.find(item=>item.key==="chair")?.done===true?"pass":"action":"unknown",
   current:op(operations?.chairs),target:1,href:path("/clinic/resources",cid)},
  {id:"clinicHours",state:operations?op(operations.openDays)!==null&&operations.openDays>0?"pass":"action":"unknown",
   current:op(operations?.openDays),target:1,href:path("/clinic/settings/hours",cid)},
  {id:"dentistHours",state:operations?op(operations.scheduledDentists)!==null&&operations.scheduledDentists>0?"pass":"action":"unknown",
   current:op(operations?.scheduledDentists),target:1,href:path("/clinic/settings/hours",cid)},
  {id:"staffMfa",state:staff?unprotected===0&&active.length>0?"pass":"action":"unknown",
   current:unprotected,target:0,href:path("/clinic/settings/security",cid)},
  {id:"email",state:summary.channels?summary.channels.emailConfigured?"pass":"action":"unknown",
   current:summary.channels?Number(summary.channels.emailConfigured):null,
   target:1,href:path("/clinic/settings/notifications",cid)}
 ];
}
export function clinicQualitySummary(checks:QualityCheck[]){
 const passed=checks.filter(x=>x.state==="pass").length;
 const action=checks.filter(x=>x.state==="action").length;
 const unknown=checks.filter(x=>x.state==="unknown").length;
 return {passed,action,unknown,total:checks.length,complete:unknown===0&&action===0};
}
export function clinicQualityStatus(status:number):"auth"|"forbidden"|"unavailable"{
 if(status===401)return "auth";
 if(status===403||status===404)return "forbidden";
 return "unavailable";
}
export function clinicQualityOverview(summary:QualitySnapshot){
 const appointment=summary.appointments;
 const deliveries=summary.channels?.deliveries;
 return {
  today:appointment?sane(appointment.todayTotal):null,
  week:appointment?sane(appointment.weekTotal):null,
  activeStaff:summary.staff?summary.staff.access.filter(m=>m.status==="active").length:null,
  failedDeliveries:deliveries?deliveries.filter(d=>d.status==="failed").length:null,
  deliveryWindow:deliveries?deliveries.length:null
 };
}
export function clinicQualitySelected(cid:string|null,ids:readonly string[]):string|null{
 if(!cid||!ids.includes(cid))return null;
 return cid;
}
