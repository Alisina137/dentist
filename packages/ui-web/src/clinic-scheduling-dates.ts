/**
 * DandanLink clinic scheduling date model.
 *
 * HTTP appointment API accepts Gregorian ISO dates in Kabul local time, even
 * when the user prefers the solar Hijri display calendar. These helpers keep
 * the server range bounded (<= 34 days) and never transform a UI display date
 * into a false Gregorian date.
 */
export type ClinicScheduleMode="day"|"week"|"month"|"agenda";
export type ClinicDisplayCalendar="solar_hijri"|"gregorian";
export type ClinicDateWindow={from:string;to:string};

export function clinicValidDay(day:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 const n=new Date(day+"T12:00:00.000Z");
 return Number.isFinite(n.getTime())&&n.toISOString().slice(0,10)===day;
}
export function clinicShiftDay(day:string,offset:number):string{
 if(!clinicValidDay(day)||!Number.isInteger(offset)||Math.abs(offset)>400)
  throw new RangeError("INVALID_CALENDAR_DAY");
 return new Date(Date.parse(day+"T12:00:00.000Z")+offset*86400000).toISOString().slice(0,10);
}
function saturday(day:string):string{
 const weekday=(new Date(day+"T12:00:00Z").getUTCDay()+1)%7;
 return clinicShiftDay(day,-weekday);
}
const solarFormat=new Intl.DateTimeFormat("en-US-u-ca-persian",{
 timeZone:"UTC",year:"numeric",month:"numeric",day:"numeric"
});
function solarYearMonth(day:string):string{
 const parts=Object.fromEntries(solarFormat.formatToParts(new Date(day+"T12:00:00Z"))
  .filter(x=>x.type==="year"||x.type==="month").map(x=>[x.type,x.value]));
 return parts.year+"-"+parts.month;
}
/** Find the *true* first/last Gregorian dates of the selected solar month. */
export function clinicMonthWindow(day:string,calendar:ClinicDisplayCalendar):ClinicDateWindow{
 if(!clinicValidDay(day))throw new RangeError("INVALID_CALENDAR_DAY");
 if(calendar==="gregorian"){
  const from=day.slice(0,7)+"-01";
  const d=new Date(day.slice(0,7)+"-01T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth()+1);
  return {from,to:clinicShiftDay(d.toISOString().slice(0,10),-1)};
 }
 const target=solarYearMonth(day);
 let from=day,to=day;
 for(let i=0;i<32;i++){
  const candidate=clinicShiftDay(from,-1);
  if(solarYearMonth(candidate)!==target)break;
  from=candidate;
 }
 for(let i=0;i<32;i++){
  const candidate=clinicShiftDay(to,1);
  if(solarYearMonth(candidate)!==target)break;
  to=candidate;
 }
 return {from,to};
}
export function clinicScheduleWindow(day:string,mode:ClinicScheduleMode,
 calendar:ClinicDisplayCalendar):ClinicDateWindow{
 if(!clinicValidDay(day))throw new RangeError("INVALID_CALENDAR_DAY");
 if(mode==="day")return {from:day,to:day};
 if(mode==="week"){const from=saturday(day);return {from,to:clinicShiftDay(from,6)};}
 if(mode==="agenda")return {from:day,to:clinicShiftDay(day,6)};
 return clinicMonthWindow(day,calendar);
}
export function clinicShiftPeriod(day:string,mode:ClinicScheduleMode,delta:-1|1,
 calendar:ClinicDisplayCalendar):string{
 if(mode==="day")return clinicShiftDay(day,delta);
 if(mode==="week"||mode==="agenda")return clinicShiftDay(day,delta*7);
 const window=clinicMonthWindow(day,calendar);
 return delta===1?clinicShiftDay(window.to,1):clinicShiftDay(window.from,-1);
}
export function clinicMonthCells(window:ClinicDateWindow):string[]{
 const start=saturday(window.from);
 const total=Math.ceil((1+Math.round((Date.parse(window.to+"T12:00:00Z")-
  Date.parse(start+"T12:00:00Z"))/86400000))/7)*7;
 if(total>42||total<28)throw new RangeError("CALENDAR_GRID_OUT_OF_BOUNDS");
 return Array.from({length:total},(_,i)=>clinicShiftDay(start,i));
}
export function clinicDayNumber(day:string,locale:string,
 calendar:ClinicDisplayCalendar):string{
 return new Intl.DateTimeFormat(locale,{timeZone:"UTC",
  calendar:calendar==="solar_hijri"?"persian":"gregory",day:"numeric"}
 ).format(new Date(day+"T12:00:00Z"));
}
