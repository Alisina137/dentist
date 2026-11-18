import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const {outputText}=ts.transpileModule(read("apps/mobile/native-clinic-phase25-model.ts"),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
});
const m={exports:{}};
new Function("module","exports",outputText)(m,m.exports);
const f=m.exports;
const cid="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
 other="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
 svc="cccccccc-cccc-4ccc-8ccc-cccccccccccc",
 chair="dddddddd-dddd-4ddd-8ddd-dddddddddddd",
 dentist="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
 exc="ffffffff-ffff-4fff-8fff-ffffffffffff";
const service=(delta={})=>({
 id:svc,clinicId:cid,name:"Cleaning",category:"Preventive",
 description:null,durationMinutes:30,preparationMinutes:10,basePriceAfn:200,
 requiresChair:true,publicBooking:false,active:true,version:2,
 createdBy:"PRIVATE_USER",...delta
});
const resource=(delta={})=>({
 id:chair,clinicId:cid,code:"CH-01",label:"Chair one",kind:"chair",
 equipment:null,active:true,revision:3,updatedBy:"PRIVATE_ACTOR",...delta
});
const hour=(day,delta={})=>({
 weekday:day,clinicId:cid,isOpen:day!==0,revision:1,
 startMinute:540,endMinute:1020,breaks:[],updatedBy:"SECRET",...delta
});
const exception=(delta={})=>({
 id:exc,clinicId:cid,startDate:"2026-12-01",endDate:"2026-12-01",
 kind:"closed",startMinute:null,endMinute:null,reason:"Staff training",
 revision:1,createdAt:"2026-11-18T08:00:00.000Z",createdBy:"PRIVATE",
 ...delta
});
const schedule=(delta={})=>({
 timezone:"Asia/Kabul",
 hours:[hour(0),hour(1,{isOpen:true}),hour(2)],
 providers:[],resources:[hour(1,{resourceId:chair,breaks:[{start:750,end:780}]})],
 clinicians:[{membershipId:dentist,name:"Test Provider",role:"dentist"}],
 exceptions:[exception()],...delta
});
const readyness=()=>({
 clinicName:"Demo Clinic",timezone:"Asia/Kabul",
 metrics:{services:1,chairs:1,openDays:6,scheduledDentists:1},
 checklist:[{key:"service",done:true},{key:"chair",done:true},
  {key:"clinicHours",done:true},{key:"dentistHours",done:true}],
 readyForPreview:true,publicBookingsEnabled:false,
 appointmentManagementEnabled:false,diagnosisSecret:"PRIVATE"
});
const preview=(delta={})=>({
 clinicId:cid,service:{id:svc,name:"Cleaning",category:"Preventive",
  durationMinutes:30,preparationMinutes:10,basePriceAfn:200,
  requiresChair:true,version:2},
 date:"2026-11-19",weekday:5,providerId:dentist,resourceId:null,
 timezone:"Asia/Kabul",status:"ready",previewOnly:true,
 bookable:false,staffBookable:true,slots:[{
  start:"09:00",end:"09:40",startAt:"2026-11-19T04:30:00.000Z",
  endAt:"2026-11-19T05:10:00.000Z",resourceId:chair,
  durationMinutes:30,preparationMinutes:10,privateBookedPatient:"NOPE"
 }],...delta
});
test("C25-01 owner/manager can write; dentist/receptionist read-only; cashier/assistant excluded",()=>{
 for(const role of ["owner","manager","dentist","receptionist"])
  assert.equal(f.canReadOps(role),true);
 for(const role of ["assistant","cashier"])
  assert.equal(f.canReadOps(role),false);
 for(const role of ["owner","manager"])assert.equal(f.canManageOps(role),true);
 for(const role of ["dentist","receptionist","assistant","cashier"])
  assert.equal(f.canManageOps(role),false);
});
test("C25-02 catalog service parsing strips unneeded staff, rejects cross-clinic or corrupt data",()=>{
 const valid=f.parseServices({services:[service()]},cid);
 assert.equal(valid.length,1);
 assert.equal(valid[0].version,2);
 assert.equal(valid[0].basePriceAfn,200);
 assert.equal(JSON.stringify(valid).includes("PRIVATE_USER"),false);
 assert.equal(f.parseServices({services:[service({clinicId:other})]},cid),null);
 assert.equal(f.parseServices({services:[service(),service()]},cid),null);
 assert.equal(f.parseServices({services:[service({durationMinutes:13})]},cid),null);
 assert.equal(f.parseServices({services:[service({basePriceAfn:-1})]},cid),null);
 const draft=f.serviceForm(valid[0]);
 assert.deepEqual(f.servicePayload(draft,valid[0]),{
  name:"Cleaning",category:"Preventive",description:null,durationMinutes:30,
  preparationMinutes:10,basePriceAfn:200,requiresChair:true,
  publicBooking:false,active:true,version:2
 });
 assert.equal(f.servicePayload({...draft,durationMinutes:"13"},valid[0]),null);
 assert.equal(f.servicePayload({...draft,basePriceAfn:"10000001"}),null);
 assert.equal(f.servicePayload({...draft,name:"X"}),null);
 assert.equal(f.servicePayload({...draft,preparationMinutes:"7"}),null);
 assert.equal(f.servicePayload({...draft,basePriceAfn:"25.4"}),null);
});
test("C25-03 resources strict 50 limit, code and guarded optimistic revision",()=>{
 const parsed=f.parseResources({resources:[resource()]},cid);
 assert.equal(parsed[0].revision,3);
 assert.equal(parsed[0].code,"CH-01");
 assert.equal(JSON.stringify(parsed).includes("PRIVATE_ACTOR"),false);
 assert.equal(f.parseResources({resources:[resource({clinicId:other})]},cid),null);
 assert.equal(f.parseResources({resources:[resource(),resource()]},cid),null);
 assert.equal(f.parseResources({resources:[resource({kind:"table"})]},cid),null);
 assert.deepEqual(f.resourcePayload(f.resourceForm(parsed[0]),parsed[0]),{
  code:"CH-01",label:"Chair one",kind:"chair",equipment:null,
  active:true,revision:3
 });
 assert.equal(f.resourcePayload({...f.resourceForm(),code:"bad code",label:"Chair"}),null);
 assert.equal(f.resourcePayload({...f.resourceForm(),code:"X",label:"Chair"}),null);
});
test("C25-04 clinic hours and special days preserve revisions and break intervals",()=>{
 const data=f.parseHours(schedule(),cid);
 assert.ok(data);assert.equal(data.timezone,"Asia/Kabul");
 assert.equal(data.providers.length,1);
 assert.equal(data.resourceHours[chair][0].breaks[0].start,750);
 assert.equal(data.exceptions[0].reason,"Staff training");
 assert.equal(JSON.stringify(data).includes("PRIVATE"),false);
 const week=f.fullWeek(data.clinic);
 assert.equal(week.length,7);
 assert.deepEqual(week.map(x=>x.weekday),[0,1,2,3,4,5,6]);
 assert.equal(week[3].revision,0);
 assert.equal(week[1].revision,1);
 assert.equal(f.validWeek(week),true);
 assert.deepEqual(f.saveWeekPayload(week).week[0].breaks,[]);
 assert.equal(f.parseHours(schedule({timezone:"UTC"}),cid),null);
 assert.equal(f.parseHours(schedule({resources:[hour(1,{resourceId:chair,clinicId:other})]}),cid),null);
 assert.equal(f.parseHours(schedule({hours:[hour(0),hour(0)]}),cid),null);
 assert.equal(f.parseHours(schedule({exceptions:[exception(),exception()]}),cid),null);
 assert.equal(f.validWeek([...week.slice(0,6),week[5]]),false);
 assert.equal(f.validWeek([...week.slice(0,6),{...week[6],startMinute:1020,endMinute:540}]),false);
});
test("C25-05 Kabul dates, leap years, valid holiday ranges and reasons",()=>{
 assert.equal(f.kabulToday(new Date("2026-11-18T20:30:00Z")),"2026-11-19");
 assert.equal(f.validDate("2026-02-29"),false);
 assert.equal(f.validDate("2028-02-29"),true);
 assert.equal(f.shiftDate("2026-12-31",1),"2027-01-01");
 assert.equal(f.dateInPreviewRange("2026-11-19","2026-11-18"),true);
 assert.equal(f.dateInPreviewRange("2026-11-17","2026-11-18"),false);
 assert.equal(f.dateInPreviewRange("2028-11-18","2026-11-18"),false);
 const draft={startDate:"2026-12-01",endDate:"2026-12-02",
  kind:"closed",startMinute:540,endMinute:1020,reason:"Staff training"};
 assert.deepEqual(f.exceptionPayload(draft,"2026-11-18"),{
  startDate:"2026-12-01",endDate:"2026-12-02",kind:"closed",reason:"Staff training"
 });
 assert.equal(f.exceptionPayload({...draft,reason:"short".slice(0,4)},"2026-11-18"),null);
 assert.equal(f.exceptionPayload({...draft,endDate:"2026-11-30"},"2026-11-18"),null);
 assert.equal(f.exceptionPayload({...draft,endDate:"2027-08-30"},"2026-11-18"),null);
 assert.equal(f.exceptionPayload({...draft,kind:"special_hours",startMinute:900,
  endMinute:540},"2026-11-18"),null);
 assert.deepEqual(f.exceptionPayload({...draft,kind:"special_hours"},"2026-11-18"),{
  startDate:"2026-12-01",endDate:"2026-12-02",
  kind:"special_hours",startMinute:540,endMinute:1020,reason:"Staff training"
 });
});
test("C25-06 summary is from server, never fabricate public booking activation",()=>{
 const result=f.parseReadiness(readyness());
 assert.equal(result.services,1);
 assert.equal(result.readyForPreview,true);
 assert.equal(result.publicBookingsEnabled,false);
 assert.equal(result.appointmentManagementEnabled,false);
 assert.equal(result.checklist.length,4);
 assert.equal(JSON.stringify(result).includes("diagnosisSecret"),false);
 assert.equal(f.parseReadiness({...readyness(),metrics:{
  ...readyness().metrics,chairs:-1}}),null);
 assert.equal(f.parseReadiness({...readyness(),checklist:[
  ...readyness().checklist.slice(0,3),{key:"service",done:true}]}),null);
 assert.equal(f.parseReadiness({...readyness(),timezone:"UTC"}),null);
});
test("C25-07 availability parser enforces tenant, actual preview and no booking",()=>{
 const expected={clinicId:cid,date:"2026-11-19",serviceId:svc,
  providerId:dentist,resourceId:null};
 const path=f.previewPath(cid,expected.date,svc,dentist,null);
 assert.match(path,/\/availability\/preview\?date=2026-11-19/);
 const result=f.parsePreview(preview(),expected);
 assert.equal(result.price,200);
 assert.equal(result.slots.length,1);
 assert.equal(JSON.stringify(result).includes("NOPE"),false);
 assert.equal(f.parsePreview(preview({clinicId:other}),expected),null);
 assert.equal(f.parsePreview(preview({bookable:true}),expected),null);
 assert.equal(f.parsePreview(preview({previewOnly:false}),expected),null);
 assert.equal(f.parsePreview(preview({date:"2026-11-20"}),expected),null);
 assert.equal(f.parsePreview(preview({providerId:other}),expected),null);
 assert.equal(f.parsePreview(preview({slots:[{...preview().slots[0],
  start:"not a time"}]}),expected),null);
 assert.equal(f.parsePreview(preview({status:"not_real"}),expected),null);
 assert.throws(()=>f.previewPath(other,"2026-11-32",svc,dentist,null));
});
test("C25-08 native UX routes and server rules maintain independent release gate",()=>{
 const ui=read("apps/mobile/native-clinic-phase25.tsx");
 const shell=read("apps/mobile/native-clinic.tsx");
 const dash=read("apps/mobile/native-clinic-phase21.tsx");
 const phase20=read("apps/mobile/native-clinic-phase20.tsx");
 const ops=read("apps/api/src/operations-router.ts");
 const catalog=read("apps/api/src/operations-catalog.ts");
 const schedule=read("apps/api/src/operations-schedule.ts");
 const pilot=read("apps/api/src/pilot-gate.ts");
 assert.match(shell,/NativeClinicPhase25/);
 assert.match(shell,/"operations","clinic"/);
 assert.match(shell,/type JsonMethod="GET"\|"POST"\|"PATCH"\|"PUT"\|"DELETE"/);
 assert.match(phase20,/Phase20Request=<T>\(path:string,method\?:"GET"\|"POST"\|"PATCH"\|"PUT"\|"DELETE"/);
 assert.match(dash,/if\(id==="operations"\)\{onNavigate\("operations"\)/);
 for(const path of ["/services","/resources","/hours","/summary",
  "/exceptions","/availability/preview"]){
  assert.ok(ui.includes(path),path);
 }
 assert.match(ui,/AppState.addEventListener/);
 assert.match(ui,/controller.abort\(\)|ac.abort\(\)/);
 assert.match(ui,/saveWeekPayload/);
 assert.match(ui,/servicePayload/);
 assert.match(ui,/resourcePayload/);
 assert.match(ui,/parsePreview/);
 assert.match(ui,/canManageOps/);
 assert.match(ui,/Alert.alert/);
 assert.match(ui,/uncertain/);
 assert.doesNotMatch(ui,/AsyncStorage|SecureStore|console.log|localStorage/);
 assert.match(ops,/operationsAccess\(req,cid\(req\),true\)/);
 assert.match(ops,/clinic.put\("\/hours\/clinic"/);
 assert.match(ops,/clinic.delete\("\/exceptions\/:exceptionId"/);
 assert.match(catalog,/STALE_SERVICE_VERSION/);
 assert.match(catalog,/STALE_RESOURCE_REVISION/);
 assert.match(catalog,/SERVICE_USED_BY_UPCOMING_APPOINTMENT/);
 assert.match(catalog,/RESOURCE_USED_BY_UPCOMING_APPOINTMENT/);
 assert.match(schedule,/SCHEDULE_CHANGE_CONFLICTS_WITH_APPOINTMENTS/);
 assert.match(schedule,/EXCEPTION_CONFLICTS_WITH_APPOINTMENTS/);
 assert.match(pilot,/PH19_PILOT_RELEASE_ENABLED/);
 assert.match(pilot,/protectHealthWrites/);
});
