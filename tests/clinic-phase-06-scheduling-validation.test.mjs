import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {join,dirname} from "node:path";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(join(root,path),"utf8");
const ui=read("packages/ui-web/src/phase06.tsx");
const dates=read("packages/ui-web/src/clinic-scheduling-dates.ts");
const style=read("apps/clinic-web/app/clinic/clinic-scheduling.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");
const api=read("apps/api/src/appointments-service.ts");

test("Clinic Phase 06: date utilities validate Gregorian ISO input and compute bounded ranges",async()=>{
 const cal=await import("../packages/ui-web/src/clinic-scheduling-dates.ts");
 assert.equal(cal.clinicValidDay("2026-02-29"),false);
 assert.equal(cal.clinicValidDay("2028-02-29"),true);
 assert.equal(cal.clinicValidDay("2026-13-07"),false);
 assert.equal(cal.clinicShiftDay("2026-03-01",-1),"2026-02-28");
 assert.throws(()=>cal.clinicScheduleWindow("wrong","day","gregorian"));
 assert.deepEqual(cal.clinicScheduleWindow("2026-11-16","day","gregorian"),{
  from:"2026-11-16",to:"2026-11-16"
 });
 assert.deepEqual(cal.clinicScheduleWindow("2026-11-16","week","gregorian"),{
  from:"2026-11-14",to:"2026-11-20"
 });
 assert.deepEqual(cal.clinicScheduleWindow("2026-11-16","agenda","solar_hijri"),{
  from:"2026-11-16",to:"2026-11-22"
 });
 assert.deepEqual(cal.clinicMonthWindow("2026-11-16","gregorian"),{
  from:"2026-11-01",to:"2026-11-30"
 });
 assert.equal(cal.clinicShiftPeriod("2026-11-16","week",1,"gregorian"),"2026-11-23");
 assert.equal(cal.clinicShiftPeriod("2026-11-16","agenda",-1,"gregorian"),"2026-11-09");
});

test("Clinic Phase 06: Solar Hijri month is the actual date range, not only a translated label",async()=>{
 const cal=await import("../packages/ui-web/src/clinic-scheduling-dates.ts");
 const day="2026-11-16",window=cal.clinicMonthWindow(day,"solar_hijri");
 assert.ok(window.from<=day&&window.to>=day);
 assert.notEqual(window.from,"2026-11-01","Solar month cannot silently use Gregorian Nov 1");
 const solarMonth=d=>new Intl.DateTimeFormat("en-US-u-ca-persian",{
  timeZone:"UTC",year:"numeric",month:"numeric"
 }).format(new Date(d+"T12:00:00Z"));
 const target=solarMonth(day);
 assert.equal(solarMonth(window.from),target);
 assert.equal(solarMonth(window.to),target);
 assert.notEqual(solarMonth(cal.clinicShiftDay(window.from,-1)),target);
 assert.notEqual(solarMonth(cal.clinicShiftDay(window.to,1)),target);
 const count=(Date.parse(window.to)-Date.parse(window.from))/86400000+1;
 assert.ok(count>=29&&count<=31,"Month must fit API <=34-day range");
 const after=cal.clinicShiftPeriod(day,"month",1,"solar_hijri");
 const before=cal.clinicShiftPeriod(day,"month",-1,"solar_hijri");
 assert.equal(after,cal.clinicShiftDay(window.to,1));
 assert.equal(before,cal.clinicShiftDay(window.from,-1));
 const cells=cal.clinicMonthCells(window);
 assert.ok([28,35,42].includes(cells.length));
 assert.equal(cells.length%7,0);
 assert.ok(cells[0]<=window.from);
 assert.ok(cells.at(-1)>=window.to);
 assert.equal(cal.clinicDayNumber("2026-11-16","en","gregorian"),"16");
 assert.ok(dates.includes('timeZone:"UTC"'));
});

test("Clinic Phase 06: calendar has real four-way day/week/month/agenda modes",()=>{
 for(const token of [
  'type ViewMode="day"|"week"|"month"|"agenda"',
  'agenda:"Agenda"','agenda:"فهرست نوبت‌ها"','agenda:"د لیدنو لړلیک"',
  'clinicScheduleWindow(date,mode,calendar)',
  'clinicShiftPeriod(date,mode,1,calendar)',
  'clinicShiftPeriod(date,mode,-1,calendar)',
  '["day","week","month","agenda"]',
  'function AgendaGrid(',
  'function MonthGrid(',
  'clinicMonthCells(period)',
  'clinicDayNumber(day,lang,calendar)',
  'outside?[]:byDate.get(day)||[]',
  'outside?t("outOfPeriod"):events.length',
  'mode==="agenda"?<AgendaGrid',
  'type="button" aria-pressed={mode===view}',
  'href={appHref(space.clinicId,a.id)}',
  'href={appHref(space.clinicId,"new")+"&date="+day}'
 ])assert.ok(ui.includes(token),"Missing "+token);
 assert.ok(api.includes('if(span<0||span>34)fail(422,"CALENDAR_RANGE_LIMIT")'));
 assert.ok(api.includes('eq(schema.clinicAppointment.clinicId,cid)'));
});

test("Clinic Phase 06: navigation/filters and queue preserve clinic, selected date and provider in the URL",()=>{
 for(const token of [
  'const q=new URLSearchParams(location.search);',
  'setDoctor(q.get("providerId")||"")',
  'setChair(q.get("resourceId")||"")',
  'setStatus(requestedStatus!)',
  'function updateFilter(key:"providerId"|"resourceId"|"status",value:string)',
  'function clearFilters(){',
  'updateQuery({providerId:"",resourceId:"",status:""})',
  'q.set("clinic",space.clinicId);',
  'history.replaceState(null,"",location.pathname+"?"+q.toString())',
  'new URLSearchParams({from:period.from,to:period.to,',
  '...doctor?{providerId:doctor}', // logical expression checked below instead
  'function queueNavigate(nextDay:string,providerId:string)',
  'queueNavigate(dayKabul(),provider)',
  'queueNavigate(e.target.value,provider)',
  'queueNavigate(day,value)',
  'appHref(space.clinicId)+"&view=day&date="+day',
  'data?.truncated',
  'phase06-availability-disclaimer',
  'clinicDayNumber(date,lang,calendar)'
 ].filter(x=>x!=='...doctor?{providerId:doctor}'))assert.ok(ui.includes(token),token);
 assert.ok(ui.includes('...(doctor?{providerId:doctor}:{})'));
 assert.ok(ui.includes('...(chair?{resourceId:chair}:{})'));
 assert.ok(ui.includes('...(status!=="all"?{status}:{})'));
 assert.ok(ui.includes('candidateNotice'));
});

test("Clinic Phase 06: scheduling visual system has a11y and is isolated to clinic workspace",()=>{
 assert.ok(layout.includes('import "./clinic-dashboard.css";\nimport "./clinic-scheduling.css";'));
 for(const path of ["apps/clinic-web/app/layout.tsx","apps/admin-web/app/layout.tsx",
  "apps/patient-web/app/layout.tsx"])
  assert.ok(!read(path).includes("clinic-scheduling.css"),path);
 assert.ok(style.startsWith("/*"));
 for(const marker of [
  '.clinic-persistent-shell .phase06-calendar-page',
  '.clinic-persistent-shell .clinic-schedule-agenda',
  '.clinic-persistent-shell .clinic-agenda-row',
  '.clinic-persistent-shell .phase06-month-outside',
  '.clinic-persistent-shell .phase06-range-warning',
  '@media(max-width:1024px)',
  '@media(max-width:680px)','@media(max-width:375px)',
  '@media(prefers-reduced-motion:reduce)',
  ':focus-visible','min-width:0','overflow-wrap:anywhere'
 ])assert.ok(style.includes(marker),marker);
 for(const bad of [':root{','transform:scaleX(-1)',"Math.random(",'.odontogram{','svg path{'])
  assert.ok(!style.includes(bad),bad);
 assert.ok(ui.includes('aria-live="polite"'));
 assert.ok(ui.includes('role="alert"'));
 assert.ok(ui.includes('role="status"'));
 assert.ok(ui.includes('dateTime={a.startAt}'));
 assert.ok(!ui.includes('href="/clinic/appointments/requests"'));
});
