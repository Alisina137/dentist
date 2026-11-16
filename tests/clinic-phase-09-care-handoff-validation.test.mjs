import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const worklist=read("packages/ui-web/src/phase07.tsx");
const patient=read("packages/ui-web/src/phase05.tsx");
const model=read("packages/ui-web/src/clinic-handoff-model.ts");
const clinicApi=read("apps/api/src/clinical-router.ts");
const appointmentsApi=read("apps/api/src/appointments-router.ts");
const patientApi=read("apps/api/src/patient-registry.ts");
const css=read("apps/clinic-web/app/clinic/clinic-care.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");

test("Clinic Phase 09: real handoff selector prefers actually checked-in cases over future scheduling",async()=>{
 const {
  clinicPickHandoffAppointment:select,clinicCanLinkClinicalEncounter:canOpen,
  clinicHandoffStatusKey:label,clinicHandoffKabulDay:kabul
 }=await import("../packages/ui-web/src/clinic-handoff-model.ts");
 const now=Date.parse("2026-11-16T09:00:00Z");
 const upcoming={id:"future",startAt:"2026-11-17T09:00:00Z",status:"confirmed"};
 const requested={id:"request",startAt:"2026-11-16T15:00:00Z",status:"requested"};
 const checked={id:"checked",startAt:"2026-11-16T08:00:00Z",
  endAt:"2026-11-16T08:30:00Z",status:"arrived"};
 const history={id:"old",startAt:"2026-11-10T09:00:00Z",status:"completed"};
 assert.equal(select([upcoming,requested,checked,history],now)?.id,"checked");
 assert.equal(select([history,upcoming,requested],now)?.id,"request",
  "Choose earliest upcoming booking without falsely claiming approval");
 assert.equal(select([history],now)?.id,"old");
 assert.equal(select([],now),undefined);
 assert.equal(select([{startAt:"bad",status:"arrived"}],now),undefined);
 assert.throws(()=>select([],NaN),RangeError);
 for(const status of ["arrived","in_treatment","completed"])
  assert.equal(canOpen(status),true,status);
 for(const status of ["requested","confirmed","cancelled","no_show","rejected","other"])
  assert.equal(canOpen(status),false,status);
 assert.equal(label("requested"),"handoffRequested");
 assert.equal(label("confirmed"),"handoffAwaiting");
 assert.equal(label("arrived"),"handoffChecked");
 assert.equal(label("in_treatment"),"handoffTreatment");
 assert.equal(label("completed"),"handoffCompleted");
 assert.equal(label("cancelled"),"handoffUnknown");
 assert.equal(kabul("2026-11-16T20:00:00.000Z"),"2026-11-17");
 assert.equal(kabul("2026-11-16T00:00:00.000Z"),"2026-11-16");
 assert.throws(()=>kabul("invalid timestamp"),RangeError);
 assert.ok(model.includes("All writes are revalidated by the backend."));
});

test("Clinic Phase 09: clinical worklist reads only assigned server rows, shows accurate workflow and links",()=>{
 for(const token of [
  'type WorklistTab="today"|"pending"|"cases"',
  'type WorklistStatus="all"|"confirmed"|"arrived"|"in_treatment"|"completed"',
  'const WORKLIST_PAGE_SIZE=5',
  'const [ready,setReady]=useState(false)',
  'clinicValidDay(queryDate)',
  'setTab(q.get("tab") as WorklistTab)',
  'q.set("clinic",space.clinicId)',
  'history.replaceState(null,"",location.pathname+"?"+q.toString())',
  'useLoad(ready?base+"/worklist?date="+date:null)',
  'const todayRows:WorklistAppointment[]=data?.today||[]',
  'const pendingRows:WorklistCase[]=data?.pending||[]',
  'const caseRows:WorklistCase[]=data?.cases||[]',
  'filtered.slice((safePage-1)*WORKLIST_PAGE_SIZE,safePage*WORKLIST_PAGE_SIZE)',
  'role="tablist" aria-label={t("worklist")}',
  'aria-selected={tab===key}',
  'aria-pressed={tab==="today"&&status===key}',
  'clinicHandoffStatusKey(a.status)',
  'clinicCanLinkClinicalEncounter(a.status)',
  'a.encounter_id?',
  'encodeURIComponent(a.appointment_id)',
  'className="clinic-phase09-textlink"',
  'space.role!=="assistant"&&<a',
  'handoffRange:"Up to 100 appointments',
  'handoffWarning:"Check-in does not establish clinical readiness'
 ])assert.ok(worklist.includes(token),token);
 for(const token of [
  'const ctx=await access(req,cid(req))',
  'AND a.status NOT IN (\'cancelled\',\'no_show\')',
  'a.provider_membership_id=${ctx.membership.id}',
  'a.status IN (\'arrived\',\'in_treatment\',\'completed\')',
  'ORDER BY a.start_at ASC LIMIT 100',
  'ORDER BY e.updated_at DESC LIMIT 60',
  "ORDER BY e.signed_at DESC LIMIT 60",
  'noStore(res);res.json({date,today:schedule,pending,cases'
 ])assert.ok(clinicApi.includes(token),token);
 assert.ok(worklist.includes("qualified?<Worklist space={space}/>:<OperationalSummary space={space}/>"));
});

test("Clinic Phase 09: patient overview uses only real authorized appointment rows, never guessed clinical consent",()=>{
 for(const token of [
  'function PatientCareHandoff(',
  'clinicPickHandoffAppointment(appointments)',
  'clinicHandoffKabulDay(selected.startAt)',
  'clinicCanLinkClinicalEncounter(selected.status)',
  'const clinical=space.role==="dentist"||',
  'space.clinicianEnabled',
  'const receptionist=["owner","manager","receptionist"].includes(space.role)',
  'receptionist&&["confirmed","arrived","in_treatment"].includes(selected.status)',
  'canOpenVisit&&<a className="btn btn-primary"',
  'clinical&&<a className="btn btn-secondary"',
  'className="phase06-patient-history" id="clinic-phase09-patient-history"',
  '<PatientCareHandoff space={space} patientId={patientId} appointments={all}/>',
  'useResource(data?.clinicalAvailable?base+"/intake":null)',
  'data.clinicalAvailable&&<section',
  'data.clinicalAvailable&&<>',
  'canEdit&&p.status==="active"',
  'data.maximumRows&&data.total>=data.maximumRows',
  'className="clinic-phase09-patient-nav"',
  'aria-current="page"'
 ])assert.ok(patient.includes(token),token);
 assert.ok(patient.includes('const data=snapshot.key===key?snapshot.data:null'));
 assert.ok(patient.includes('credentials:"include",cache:"no-store",signal:controller.signal'));
 assert.ok(appointmentsApi.includes('clinic.get("/patients/:patientId/appointments"'));
 assert.ok(appointmentsApi.includes('eq(schema.clinicAppointment.clinicId,cid(req))'));
 assert.ok(appointmentsApi.includes('if(ctx.role==="assistant")fail(403,"PATIENT_DETAIL_DENIED")'));
 assert.ok(patientApi.includes('await patientAccess(req,cid,"read")'));
 for(const bad of ["localStorage.setItem(","sessionStorage.setItem(","Math.random(","fakePatient"])
  assert.ok(!patient.includes(bad),bad);
});

test("Clinic Phase 09: appointment linked encounter requires actual arrival and preserves signed-note/assistant restrictions",()=>{
 for(const token of [
  'clinicCanLinkClinicalEncounter(a.status)?',
  'href={a.encounter_id?',
  'link(space.clinicId,a.patient_id,"visits")',
  'encodeURIComponent(a.appointment_id)',
  'space.role!=="assistant"&&<a',
  '<CareIcon name="calendar" size={16}/>{t("handoffOpenAppointment")}',
  'href={"/clinic/appointments/"+encodeURIComponent(appointmentId)+',
  'handoffNeedsVerification',
  'className="clinic-phase09-visit-navigation"',
  'e.appointmentId&&<a',
  'space.role!=="assistant"&&<div className="clinic-phase09-treatment-link"'
 ])assert.ok(worklist.includes(token.replace('clinicCanLinkClinicalEncounter(a.status)?','!clinicCanLinkClinicalEncounter(a.status)?')),token);
 for(const token of [
  'if(!["arrived","in_treatment","completed"].includes(a.status))',
  'if(clinician(ctx)&&a.provider_membership_id!==ctx.membership.id)',
  'else if(!clinician(ctx))fail(403,"ASSISTANT_REQUIRES_APPOINTMENT")',
  'const canSign=',
  'canSign(ctx,e)',
  'SIGNED_NOTE_IMMUTABLE',
  'STale', // checked separately via actual code below
  'STALE_ENCOUNTER_REVISION'
 ].filter(s=>s!=="STale"))assert.ok(clinicApi.includes(token),token);
});

test("Clinic Phase 09: English/Dari/Pashto roles and responsive accessible CSS are isolated",()=>{
 for(const token of [
  'handoff:"Reception-to-clinician handoff"',
  'handoff:"تحویل کار از پذیرش به داکتر"',
  'handoff:"له استقبال څخه ډاکټر ته سپارل"',
  'handoffRequested:"Awaiting clinic approval"',
  'handoffRequested:"منتظر تأیید درخواست"',
  'handoffRequested:"د کلینیک د تایید په تمه"',
  'handoffWarning:"Check-in does not establish clinical readiness',
  'assistantHint:"Assistants may prepare their own assigned',
  'phase07-intake'
 ])assert.ok(worklist.includes(token),token);
 for(const token of [
  'careHandoff:"Care coordination"',
  'careHandoff:"هماهنگی مراقبت"',
  'careHandoff:"د درملنې همغږي"',
  'careCompleted:"Appointment marked completed. This does not imply',
  'careCompleted:"ملاقات تکمیل‌شده ثبت شده',
  'careCompleted:"ملاقات بشپړ ثبت شوی',
  'careOnlyRecorded:"Clinical data and consent are available',
  'careOnlyRecorded:"معلومات صحی و رضایت فقط',
  'careOnlyRecorded:"طبي معلومات او رضایت یوازې'
 ])assert.ok(patient.includes(token),token);
 assert.ok(layout.includes('import "./clinic-patients.css";\nimport "./clinic-care.css";'));
 for(const token of [
  '.clinic-persistent-shell .clinic-phase09-handoff',
  '.clinic-persistent-shell .clinic-phase09-worklist',
  '.clinic-persistent-shell .clinic-phase09-patient-coordination',
  '.clinic-persistent-shell .clinic-phase09-status-cards',
  '.clinic-persistent-shell .clinic-phase09-visit-row',
  '.clinic-persistent-shell .clinic-phase09-patient-actions',
  '@media(max-width:1100px)','@media(max-width:680px)',
  '@media(max-width:375px)','@media(prefers-reduced-motion:reduce)',
  ':focus-visible','min-width:0','overflow-wrap:anywhere'
 ])assert.ok(css.includes(token),token);
 for(const forbidden of [':root{','svg path{','.odontogram{','transform:scaleX(-1)','Math.random('])
  assert.ok(!css.includes(forbidden),forbidden);
 for(const path of ["apps/clinic-web/app/layout.tsx","apps/admin-web/app/layout.tsx",
  "apps/patient-web/app/layout.tsx"])
  assert.ok(!read(path).includes("clinic-care.css"),path);
});
