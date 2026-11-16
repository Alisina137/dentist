import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const app=read("apps/mobile/App.tsx");
const native=read("apps/mobile/native-patient.tsx");

test("Stage G: home specialty chips lead to live filtered results",()=>{
 for(const marker of [
  "onSpecialty:(specialty:string)=>void",
  "onPress={()=>onSpecialty(x.name)}",
  "setSpecialtySeed(specialty);select(\"explore\")",
  "specialtySeed={specialtySeed}",
  "setSpecialty(specialtySeed)",
  "urlSearch({q,city,specialty,service,sort,page,limit:8})",
  "facets.error&&<Failure"
 ])assert.ok(app.includes(marker),marker);
 assert.ok(!app.includes("fakeDentists"));
});

test("Stage G: pull refreshes current data view and Android navigation preserves origins",()=>{
 for(const marker of [
  'import {Alert,BackHandler} from "react-native";',
  'BackHandler.addEventListener("hardwareBackPress"',
  'accountSection==="settings"',
  'tab+":"+accountSection',
  's.accountSegment',
  'fromDentistId:route?.kind==="dentist"?route.dentistId:undefined',
  'else if(route.returnTab==="appointments")',
  'if(tab!=="home"){select("home");return true;}',
  'setRefreshVersion(x=>x+1)',
  'onRefresh={pullToRefresh}',
  'refreshing={pullRefreshing}',
  '":"+refreshVersion'
 ])assert.ok(app.includes(marker),marker);
 assert.ok(!app.includes("onRefresh={checkApi}"),"old network-only refresh removed");
});

test("Stage G: appointments show accurate statuses, ordering and deadline-aware actions",()=>{
 for(const marker of [
  "function appointmentStatus(status:string,lang:Language)",
  'completed:"Completed"',
  'no_show:"Did not attend"',
  'calendar:Calendar;onExplore',
  'formatDate(b.startAt,locale,calendar)',
  'filter==="past"?',
  'filter==="upcoming"?Date.parse(a.startAt)-Date.parse(b.startAt)',
  'Date.parse(b.cancelUntil)>Date.now()',
  'b.status==="requested"',
  'disabled={!!busy}',
  'return <View style={{gap:12,direction:locale==="en"?"ltr":"rtl"}}>'
 ])assert.ok(native.includes(marker),marker);
 assert.ok(!native.includes("b.status===\"rejected\"?t.rejected:t.cancelledStatus"),
  "completed or checked-in visits must never appear as cancelled");
});

test("Stage G: booking uses live-slot pending/error states, calendar and signout works mid-onboarding",()=>{
 for(const marker of [
  'calendar:Calendar;clinicId:string',
  'setSlotsLoading(true)',
  'setSlotsLoading(false)',
  'slotsLoading?<ActivityIndicator',
  '!slots.length&&!error?',
  'formatDay(d,locale,calendar)',
  'formatDate(item.startAt,locale,calendar)',
  'formatDate(receipt.startAt,locale,calendar)',
  'formatDate(time,locale,calendar)',
  'onPress={()=>void run(async()=>await auth.signOut())}',
  'direction:locale==="en"?"ltr":"rtl"'
 ])assert.ok(native.includes(marker),marker);
 assert.ok(!native.includes("Math.random("),"no fabricated appointment slots");
});
