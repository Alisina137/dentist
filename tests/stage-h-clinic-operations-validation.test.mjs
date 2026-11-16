import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const dashboard=read("packages/ui-web/src/clinic-operations-dashboard.tsx");
const shell=read("packages/ui-web/src/phase03.tsx");
const css=read("packages/ui-web/src/clinic-operations.css");
const layout=read("apps/clinic-web/app/layout.tsx");
const pkg=JSON.parse(read("packages/ui-web/package.json"));

test("Stage H gives every active clinic role a real operations overview, not stale PH03 placeholders",()=>{
 assert.ok(shell.includes("ClinicOperationsOverview ctx={ctx} space={space}"));
 assert.ok(shell.includes('if(!requested && !space)return <Phase02Portal audience="clinic" view="dashboard"/>'),
  "owners without a clinic must retain onboarding");
 assert.ok(!shell.includes('if(space.role==="owner")return <Phase02Portal audience="clinic" view="dashboard"/>'));
 assert.ok(!shell.includes("<Permission/>\n    <div className=\"phase-actions\">"),
  "operational roles must not land on the obsolete placeholder dashboard");
});

test("Stage H dashboard data is tenant restricted, server authorized, and never fabricated",()=>{
 for(const required of [
  'encodeURIComponent(space.clinicId)',
  '"/v1/appointments/clinics/"+prefix+"/overview"',
  '"/v1/registry/clinics/"+prefix+"/patients/summary"',
  '"/v1/operations/clinics/"+prefix+"/summary"',
  '"/v1/booking/clinics/"+prefix+"/requests?state=pending"',
  'credentials:"include",cache:"no-store"',
  'signal:controller.signal',
  'controller.abort()',
  'state.path===path?state.data:null',
  'if(!res.ok)throw new Error',
  'PanelState loading={appointments.loading}',
  'PanelState loading={patients.loading}',
  'PanelState loading={operations.loading}',
  'PanelState loading={bookingRequests.loading}',
  'function refreshAll(){appointments.refresh();patients.refresh();operations.refresh();bookingRequests.refresh();}'
 ])assert.ok(dashboard.includes(required),required);
 for(const forbidden of ["Math.random(", "fakePatient", "demoPatient",
  "localStorage.setItem(", "sessionStorage.setItem(", "patientName", "phoneNumber"])
  assert.ok(!dashboard.includes(forbidden),"No fabricated or persisted medical data: "+forbidden);
});

test("Stage H role permissions prevent unauthorized module fetches and quick actions",()=>{
 for(const required of [
  'const canSchedule=space.role!=="cashier"',
  'const canPatients=space.role!=="assistant"',
  'const canOperate=["owner","manager","dentist","receptionist"].includes(space.role)',
  'const canReadRequests=canOperate',
  'if(space.role==="cashier")return',
  'if(space.role==="assistant")return',
  'if(space.role==="dentist")actions.push(',
  'if(isManager)actions.push(',
  'space.role==="owner"&&<>',
  '["owner","manager"].includes(space.role)'
 ]) {
  // The manager check is encoded as an explicit comparison in the action list.
  if(required==='["owner","manager"].includes(space.role)'){
   assert.ok(dashboard.includes('space.role==="owner"||space.role==="manager"'));continue;
  }
  assert.ok(dashboard.includes(required),required);
 }
});

test("Stage H keeps clinic sidebar complete, translated, role specific and offers queue",()=>{
 for(const s of [
  'const queue=link("queue","/clinic/appointments/queue"',
  'const settings=link("settings","/clinic/settings"',
  'const subscription=link("subscription","/clinic/settings/subscription"',
  'options.push(appointments,queue,bookingRequests',
  'clinicIcons:Record<string,CareIconName>',
  'CareIcon name={clinicIcons[item.key]||"panel"}',
  'nav.find(n=>n.key===active)?.title',
  'queue:"Today’s queue",subscription:"Subscription"',
  'queue:"صف امروز",subscription:"اشتراک"',
  'queue:"د نن کتار",subscription:"ګډون"'
 ])assert.ok(shell.includes(s),s);
 const schedule=read("packages/ui-web/src/phase06.tsx");
 assert.ok(schedule.includes('active={view==="queue"?"queue":"appointments"}'));
});

test("Stage H clinic styling is scoped, responsive, accessible and wired to the app",()=>{
 assert.equal(pkg.exports["./clinic-operations.css"],"./src/clinic-operations.css");
 assert.ok(layout.includes('@dandanlink/ui/clinic-operations.css'));
 for(const s of [
  ".shell-clinic .h-clinic","@media(max-width:640px)","@media(prefers-reduced-motion:reduce)",
  ".h-identity",".h-primary",".h-layout",".h-checklist",".h-upcoming",".h-request-count",
  ".shell-clinic .staff-side"
 ])assert.ok(css.includes(s),s);
 for(const s of [
  'role="progressbar"','aria-valuemin={0}','aria-valuemax={4}',
  'aria-valuenow={completed}','role="alert"','role="status"',
  'timeZone:"Asia/Kabul"','calendar==="solar_hijri"?"persian":"gregory"',
  't("bookingPending")', 't("noFixtures")'
 ])assert.ok(dashboard.includes(s),s);
});
