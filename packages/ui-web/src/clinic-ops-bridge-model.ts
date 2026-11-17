/**
 * Clinic Phase 14 — pure scheduling/notification/report data guards.
 * These never grant server permissions, fabricate bookings, or send messages.
 */
export type ClinicOpsRole="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
export type ClinicOpsArea="appointments"|"queue"|"requests"|"notifications"|"reports"|"finance";
export type DeliveryState="queued"|"sent"|"failed"|"skipped";
export type ClinicDelivery={event_name:string;status:string;attempt_count:number;
 created_at:string;sent_at:string|null;last_error_code:string|null};
export type ReportPreset="week"|"month"|"previousMonth"|"thirtyDays";
export type ReportPeriod={from:string;to:string};
export type ReportIssue="INVALID_DATE"|"INVALID_REPORT_PERIOD"|null;
const pad=(n:number)=>String(n).padStart(2,"0");
const isoDay=(year:number,month:number,day:number)=>
 year+"-"+pad(month)+"-"+pad(day);
function utcDay(value:string):Date{
 return new Date(value+"T00:00:00.000Z");
}
export function clinicValidReportDay(value:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=utcDay(value);
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function clinicReportPeriodIssue(from:string,to:string):ReportIssue{
 if(!clinicValidReportDay(from)||!clinicValidReportDay(to))return "INVALID_DATE";
 const days=(utcDay(to).getTime()-utcDay(from).getTime())/86400000;
 return days<0||days>366?"INVALID_REPORT_PERIOD":null;
}
export function clinicReportPreset(preset:ReportPreset,today:string):ReportPeriod{
 if(!clinicValidReportDay(today))throw new RangeError("INVALID_DATE");
 const current=utcDay(today);
 if(preset==="week"||preset==="thirtyDays"){
  const start=new Date(current.getTime()-(preset==="week"?6:29)*86400000);
  return {from:start.toISOString().slice(0,10),to:today};
 }
 const year=current.getUTCFullYear(),month=current.getUTCMonth();
 if(preset==="month")return {from:isoDay(year,month+1,1),to:today};
 const last=new Date(Date.UTC(year,month,0));
 return {from:last.toISOString().slice(0,10).replace(/-\d\d$/,"-01"),
  to:last.toISOString().slice(0,10)};
}
export function clinicOpsAreas(role:ClinicOpsRole):ClinicOpsArea[]{
 const allowed:ClinicOpsArea[]=[];
 if(role!=="cashier")allowed.push("appointments");
 if(role!=="cashier")allowed.push("queue");
 if(["owner","manager","receptionist","dentist"].includes(role))allowed.push("requests");
 if(role==="owner"||role==="manager")allowed.push("notifications");
 if(["owner","manager","cashier"].includes(role))allowed.push("reports");
 if(["owner","manager","cashier","receptionist"].includes(role))allowed.push("finance");
 return allowed;
}
export function clinicOpsHref(area:ClinicOpsArea,clinicId:string,date?:string):string{
 const route:Record<ClinicOpsArea,string>={
  appointments:"/clinic/appointments",queue:"/clinic/appointments/queue",
  requests:"/clinic/appointments/requests",
  notifications:"/clinic/settings/notifications",reports:"/clinic/reports",
  finance:"/clinic/finance"
 };
 const qs=new URLSearchParams({clinic:clinicId});
 if(area==="appointments"&&date&&clinicValidReportDay(date)){
  qs.set("view","day");qs.set("date",date);
 }
 return route[area]+"?"+qs.toString();
}
export function clinicDeliveryStatus(value:string):DeliveryState{
 if(value==="sent")return "sent";
 if(value==="failed")return "failed";
 if(value==="skipped")return "skipped";
 return "queued";
}
export function clinicDeliveryStats(records:ClinicDelivery[]){
 const counts:{queued:number;sent:number;failed:number;skipped:number}={
  queued:0,sent:0,failed:0,skipped:0
 };
 records.forEach(e=>counts[clinicDeliveryStatus(e.status)]++);
 return counts;
}
export function clinicDeliveryFiltered(records:ClinicDelivery[],status:string,search:string){
 const q=search.trim().toLocaleLowerCase().slice(0,120);
 return records.filter(e=>
  (status==="all"||clinicDeliveryStatus(e.status)===status)&&
  (!q||e.event_name.replace(/_/g," ").toLocaleLowerCase().includes(q)));
}
export function clinicDeliveryPage<T>(rows:T[],page:number,size=10){
 const pages=Math.max(1,Math.ceil(rows.length/size));
 const current=Math.max(1,Math.min(pages,Number.isSafeInteger(page)?page:1));
 return {rows:rows.slice((current-1)*size,current*size),current,pages,
  start:rows.length?(current-1)*size+1:0,end:Math.min(current*size,rows.length),
  total:rows.length};
}
export function clinicReportCompletion(total:number,completed:number):number|null{
 if(!Number.isSafeInteger(total)||total<=0||!Number.isSafeInteger(completed)||
  completed<0||completed>total)return null;
 return Math.round(completed/total*100);
}
export function clinicReportBars(rows:{day:string;count:number}[]){
 const maximum=Math.max(1,...rows.map(x=>Math.max(0,Number(x.count)||0)));
 return rows.filter(x=>clinicValidReportDay(x.day)).map(row=>({
  ...row,width:Math.max(0,Math.min(100,Math.round((Math.max(0,row.count)/maximum)*100)))
 }));
}
