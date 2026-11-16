import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const schedule=read("packages/ui-web/src/phase06.tsx");
const patients=read("packages/ui-web/src/phase05.tsx");
const css=read("packages/ui-web/src/clinic-operations.css");

test("Stage I appointment reads never show another clinic or date's stale result",()=>{
 for(const marker of [
  'const [snapshot,setSnapshot]=useState<{path:string|null;data:any;error:string}>',
  'return {data:snapshot.path===path?snapshot.data:null',
  'error:snapshot.path===path?snapshot.error:"",refresh',
  'if(!path){setSnapshot({path:null,data:null,error:""});return;}',
  'return()=>{live=false;}'
 ])assert.ok(schedule.includes(marker),marker);
});
test("Stage I validates actual Gregorian ISO days rather than matching date-looking text",()=>{
 for(const marker of [
  'function validIsoDay(value:string)',
  'parsed.toISOString().slice(0,10)===value',
  'if(queryDate&&validIsoDay(queryDate))setDate(queryDate)',
  'if(requested&&validIsoDay(requested))setDay(requested)',
  'requested>=dayKabul()&&requested<=advance(dayKabul(),365)'
 ])assert.ok(schedule.includes(marker),marker);
 assert.ok(!schedule.includes('if(queryDate&&/^\\d{4}-\\d\\d-\\d\\d$/.test(queryDate))'));
});
test("Stage I booking cannot confirm an outdated slot after a real availability refresh",()=>{
 for(const marker of [
  'const selectedSlotValid=Boolean(slot&&available&&slots.some(s=>',
  's.startAt===slot.startAt&&s.endAt===slot.endAt&&s.resourceId===slot.resourceId',
  'function recheckSlots(){setSlot(null);setIdempotencyKey(crypto.randomUUID());refreshSlots();}',
  'if(!patient||!slot||!selectedSlotValid||!selectedService||!providerId)return',
  'onClick={recheckSlots}',
  'disabled={!selectedSlotValid||!selectedService||!providerId}',
  'disabled={busy||!selectedSlotValid||!patient}'
 ])assert.ok(schedule.includes(marker),marker);
});
test("Stage I patient records support localized five-row appointment pages, not clinical data caching",()=>{
 for(const marker of [
  'type VisitFilter="all"|"planned"|"finished"|"cancelled"',
  'setFilter(item.key);setPage(1)',
  'visits.slice((safePage-1)*5,safePage*5)',
  'aria-pressed={filter===item.key}',
  'setPage(p=>Math.min(pages,p+1))',
  'data.maximumRows&&data.total>=data.maximumRows',
  'const controller=new AbortController()',
  'return()=>controller.abort()',
  'const data=snapshot.key===key?snapshot.data:null',
  'return {data:snapshot.path===path?snapshot.data:null',
  'historyLimit:"Showing up to 150 recent visits."',
  'historyLimit:"حداکثر ۱۵۰ ملاقات اخیر نمایش داده می‌شود."',
  'historyLimit:"تر ۱۵۰ وروستۍ لیدنې ښودل کېږي."'
 ])assert.ok(patients.includes(marker),marker);
 for(const forbidden of ["localStorage.setItem(", "Math.random(", "fakePatient"])
  assert.ok(!patients.includes(forbidden),forbidden);
});
test("Stage I queue never shows out-of-date no-show panel during failure; dates respect user preference",()=>{
 for(const marker of [
  'Boolean(data)&&!error&&filtered.some(a=>a.status==="no_show")',
  'calendar:calendar==="solar_hijri"?"persian":"gregory"',
  'dateTitle(period.from,lang,calendar)',
  'dateTitle(date,lang,calendar)',
  'dateTitle(day,lang,calendar)'
 ])assert.ok(schedule.includes(marker),marker);
 for(const marker of [
  '.phase06-patient-history-controls',
  '.phase06-history-tab.is-active',
  '@media(max-width:600px)',
  '.phase06-history-tab:focus-visible'
 ])assert.ok(css.includes(marker),marker);
});
