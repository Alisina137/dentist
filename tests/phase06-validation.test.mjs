import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {join,resolve} from "node:path";
const root=resolve(import.meta.dirname,"..");
async function source(path){return readFile(join(root,path),"utf8");}
test("PH06 uses database-level exclusion locks for overlapping clinic clinician and chair",async()=>{
 const sql=await source("packages/db/migrations/0006_appointments_queue.sql");
 for(const token of ["btree_gist","appointment_provider_no_overlap","appointment_resource_no_overlap",
  "EXCLUDE USING gist","tstzrange(start_at,end_at,'[)')","appointment_action","appointment_events"]){
  assert.ok(sql.toLowerCase().includes(token.toLowerCase()),"missing "+token);
 }
});
test("PH06 all real pages and authorization/mobility constraints are present",async()=>{
 for(const path of ["apps/clinic-web/app/clinic/appointments/page.tsx",
  "apps/clinic-web/app/clinic/appointments/new/page.tsx",
  "apps/clinic-web/app/clinic/appointments/queue/page.tsx",
  "apps/clinic-web/app/clinic/appointments/[appointmentId]/page.tsx"]){
  assert.match(await source(path),/AppointmentsPortal/);
 }
 const ui=await source("packages/ui-web/src/phase06.tsx");
 const staff=await source("packages/ui-web/src/phase03.tsx");
 const owner=await source("packages/ui-web/src/phase02.tsx");
 const styles=await source("packages/ui-web/src/styles.css");
 for(const component of ["CalendarPanel","DayGrid","WeekGrid","MonthGrid","BookingWizard",
  "QueuePanel","AppointmentDetail","ReschedulePanel","ActionDialog","MainTabs"]){
  assert.ok(ui.includes("function "+component+"("),"missing functioning "+component);
 }
 for(const language of ['"en"','"fa-AF"','"ps-AF"'])assert.ok(ui.includes(language));
 for(const tab of ["tabCalendar","tabQueue"])assert.ok(ui.includes(tab));
 assert.ok(!ui.includes('href="/clinic/appointments/requests"'),
 "PH15 booking-requests tab must remain hidden until implemented");
 assert.match(staff,/\/clinic\/appointments/);
 assert.match(owner,/\/clinic\/appointments/);
 assert.match(ui,/role="alertdialog"/);
 assert.match(ui,/aria-current/);
 assert.match(ui,/type="date"/);
 assert.match(styles,/@media\(max-width:540px\)/);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
});
test("PH06 does not expose public patient booking or clinical records",async()=>{
 const server=await source("apps/api/src/server.ts");
 const route=await source("apps/api/src/appointments-router.ts");
 assert.match(server,/app.use\("\/v1\/appointments", appointmentsRouter\(\)\)/);
 assert.match(route,/api.use\(authStaff\)/);
 assert.ok(!route.includes("public/appointments"));
 assert.ok(!route.includes("clinicPatientIntake"));
 const service=await source("apps/api/src/appointments-service.ts");
 assert.match(service,/clinicAppointmentAction/);
 assert.match(service,/IDEMPOTENCY_KEY_REUSED/);
 assert.match(service,/canTreat|mayChangeClinically/);
});
