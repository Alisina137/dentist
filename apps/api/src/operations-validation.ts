export class OpsFault extends Error {
 constructor(readonly status:number,readonly code:string){super(code);}
}
export function fail(status:number,code:string):never{throw new OpsFault(status,code);}
export function required(v:unknown,min:number,max:number,key:string):string{
 if(typeof v!=="string"||v.trim().length<min||v.trim().length>max)fail(422,"INVALID_"+key);
 return v.trim();
}
export function optional(v:unknown,max:number,key:string){
 return v===null||v===undefined||v===""?null:required(v,1,max,key);
}
export function integer(v:unknown,min:number,max:number,key:string):number{
 if(typeof v!=="number"||!Number.isInteger(v)||v<min||v>max)fail(422,"INVALID_"+key);
 return v;
}
export function flag(v:unknown,key:string):boolean{
 if(typeof v!=="boolean")fail(422,"INVALID_"+key);return v;
}
export function serviceData(v:any){
 if(!v||typeof v!=="object")fail(422,"INVALID_SERVICE");
 const durationMinutes=integer(v.durationMinutes,5,240,"DURATION");
 const preparationMinutes=integer(v.preparationMinutes??0,0,120,"PREPARATION");
 if(durationMinutes%5||preparationMinutes%5)fail(422,"INVALID_DURATION_STEP");
 return {
  name:required(v.name,2,100,"SERVICE_NAME"),
  category:required(v.category,2,60,"CATEGORY"),
  description:optional(v.description,700,"DESCRIPTION"),
  durationMinutes,preparationMinutes,basePriceAfn:integer(v.basePriceAfn,0,10000000,"PRICE"),
  requiresChair:flag(v.requiresChair,"REQUIRES_CHAIR"),
  publicBooking:flag(v.publicBooking,"PUBLIC_BOOKING"),
  active:flag(v.active,"ACTIVE")
 };
}
export function resourceData(v:any){
 if(!v||typeof v!=="object")fail(422,"INVALID_RESOURCE");
 const code=required(v.code,2,24,"RESOURCE_CODE").toUpperCase();
 if(!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(code))fail(422,"INVALID_RESOURCE_CODE");
 if(!["chair","room"].includes(v.kind))fail(422,"INVALID_RESOURCE_KIND");
 return {
  code,label:required(v.label,1,50,"RESOURCE_NAME"),kind:v.kind as "chair"|"room",
  equipment:optional(v.equipment,200,"EQUIPMENT"),active:flag(v.active,"ACTIVE")
 };
}
export type Span={start:number,end:number};
export type Shift={weekday:number;isOpen:boolean;startMinute:number;endMinute:number;breaks:Span[]};
export function minutes(raw:unknown):number{
 if(typeof raw==="number"&&Number.isInteger(raw)&&raw>=0&&raw<=1440)return raw;
 if(typeof raw!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw))fail(422,"INVALID_TIME");
 const parts=raw.split(":").map(Number);return parts[0]*60+parts[1];
}
export const clock=(value:number)=>String(Math.floor(value/60)).padStart(2,"0")+":"+
 String(value%60).padStart(2,"0");
export function span(start:unknown,end:unknown,key="TIME"):Span{
 const a=minutes(start),b=minutes(end);
 if(a>=b||b>1440)fail(422,"INVALID_"+key+"_RANGE");
 return {start:a,end:b};
}
export function breaksInput(raw:unknown,range:Span):Span[]{
 if(!Array.isArray(raw)||raw.length>8)fail(422,"INVALID_BREAKS");
 const list=raw.map(x=>span(x?.start,x?.end,"BREAK")).sort((a,b)=>a.start-b.start);
 for(let i=0;i<list.length;i++){
  const b=list[i];
  if(b.start<range.start||b.end>range.end||i>0&&list[i-1].end>b.start)
   fail(422,"OVERLAPPING_OR_OUTSIDE_BREAKS");
 }
 return list;
}
export function weekInput(raw:any):Shift[]{
 if(!Array.isArray(raw)||raw.length!==7)fail(422,"INVALID_WEEK_LENGTH");
 const seen=new Set<number>();
 return raw.map((r:any)=>{
  if(!r||typeof r!=="object")fail(422,"INVALID_SHIFT");
  const weekday=integer(r.weekday,0,6,"WEEKDAY");
  if(seen.has(weekday))fail(422,"DUPLICATE_WEEKDAY");seen.add(weekday);
  const isOpen=flag(r.isOpen,"IS_OPEN");
  const range=span(r.startMinute??540,r.endMinute??1020);
  const breaks=isOpen?breaksInput(r.breaks??[],range):[];
  return {weekday,isOpen,startMinute:range.start,endMinute:range.end,breaks};
 }).sort((a,b)=>a.weekday-b.weekday);
}
export function dateInput(raw:unknown):string{
 const value=required(raw,10,10,"DATE");
 if(!/^\d{4}-\d\d-\d\d$/.test(value))fail(422,"INVALID_DATE");
 const parsed=new Date(value+"T00:00:00Z");
 if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)
  fail(422,"INVALID_DATE");
 return value;
}
export const weekday=(date:string)=>(new Date(date+"T12:00:00Z").getUTCDay()+1)%7;
export function exceptionData(raw:any){
 if(!raw||typeof raw!=="object")fail(422,"INVALID_EXCEPTION");
 const startDate=dateInput(raw.startDate),endDate=dateInput(raw.endDate);
 const length=(Date.parse(endDate+"T00:00:00Z")-Date.parse(startDate+"T00:00:00Z"))/86400000;
 if(length<0||length>90)fail(422,"INVALID_EXCEPTION_DATE_RANGE");
 if(!["closed","special_hours"].includes(raw.kind))fail(422,"INVALID_EXCEPTION_KIND");
 const range=raw.kind==="special_hours"?span(raw.startMinute,raw.endMinute,"EXCEPTION"):null;
 return {startDate,endDate,kind:raw.kind as "closed"|"special_hours",
  startMinute:range?.start??null,endMinute:range?.end??null,
  reason:required(raw.reason,5,200,"EXCEPTION_REASON")};
}
export const overlaps=(a:Span,b:Span)=>a.start<b.end&&b.start<a.end;
export const contains=(outer:Span,inner:Span)=>inner.start>=outer.start&&inner.end<=outer.end;
export function availableIn(window:Span,breaks:Span[],requested:Span){
 return contains(window,requested)&&!breaks.some(block=>overlaps(block,requested));
}
export function localToUtc(date:string,totalMinute:number){
 const d=dateInput(date);
 const [y,m,day]=d.split("-").map(Number);
 // Resolve local wall-clock via the actual configured IANA zone, not the
 // browser timezone and not by assuming Solar Hijri dates are Gregorian.
 const utcWall=Date.UTC(y,m-1,day,0,totalMinute);
 let instant=utcWall-270*60000;
 const formatter=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
 for(let tries=0;tries<3;tries++){
  const p=Object.fromEntries(formatter.formatToParts(new Date(instant))
   .filter(x=>x.type!=="literal").map(x=>[x.type,Number(x.value)]));
  const observed=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);
  const diff=utcWall-observed;
  if(!diff)break;
  instant+=diff;
 }
 const actual=formatter.formatToParts(new Date(instant));
 const parts=Object.fromEntries(actual.filter(x=>x.type!=="literal").map(x=>[x.type,Number(x.value)]));
 if(parts.year!==y||parts.month!==m||parts.day!==day||
   parts.hour!==Math.floor(totalMinute/60)||parts.minute!==totalMinute%60)
   fail(422,"INVALID_LOCAL_TIME");
 return new Date(instant).toISOString();
}
