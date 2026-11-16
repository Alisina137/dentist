import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const ui=read("packages/ui-web/src/phase05.tsx");
const api=read("apps/api/src/patient-registry.ts");
const service=read("apps/api/src/patient-service.ts");
const validator=read("apps/api/src/patient-validation.ts");
const css=read("apps/clinic-web/app/clinic/clinic-patients.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");

test("Clinic Phase 08: patient directory keeps role and tenant-scoped, server-paginated clinical data private",()=>{
 for(const token of [
  'const [ready,setReady]=useState(false)',
  'const prefix="/clinics/"+encodeURIComponent(space.clinicId)+"/patients"',
  'useResource(ready?prefix+"/summary":null)',
  'useResource(ready?prefix+"?"+new URLSearchParams({',
  'q,status,sort,page:String(page),limit:String(limit)',
  'const patients:Patient[]=data?.patients||[]',
  'const canWrite=["owner","manager","dentist","receptionist"].includes(space.role)',
  'const canImport=["owner","manager"].includes(space.role)',
  '["owner","manager","dentist","receptionist","cashier"].includes(space.role)',
  'return {data:snapshot.path===path?snapshot.data:null',
  'return()=>{mounted=false;}',
  'credentials:"include",cache:"no-store"',
  'if(!space)return',
  'status===key',
  'aria-pressed={status===key}'
 ])assert.ok(ui.includes(token),token);
 for(const token of [
  'await patientAccess(req,cid,"read")',
  'const page=number(req.query.page,1,100000)',
  'if(![10,20].includes(limit))fail(422,"INVALID_PAGE_SIZE")',
  'if(!["active","inactive","archived","all"].includes(status))',
  'if(!["activity","name"].includes(sort))',
  'eq(schema.clinicPatient.clinicId,cid)',
  'ilike(schema.clinicPatient.patientNumber,textLike)',
  'ilike(schema.clinicPatient.phone,textLike)',
  '.limit(limit).offset((page-1)*limit)'
 ])assert.ok(api.includes(token),token);
 assert.ok(service.includes('phone:financeOnly?null:p.phone'));
 assert.ok(service.includes('phoneVerified:financeOnly?false:p.phoneVerified'));
});

test("Clinic Phase 08: shareable validated directory filters, honest result counts and responsive patient cards",()=>{
 for(const token of [
  'new URLSearchParams(location.search)',
  'setSearch(requestedSearch);setQ(requestedSearch)',
  '["active","inactive","archived","all"].includes(requestedStatus||"")',
  '["activity","name"].includes(requestedSort||"")',
  '["10","20"].includes(requestedLimit||"")',
  'Number.isInteger(requestedPage)&&requestedPage>=1&&requestedPage<=100000',
  'params.set("clinic",space.clinicId)',
  'history.replaceState(null,"",location.pathname+"?"+params.toString())',
  'if(term!==q){setQ(term);setPage(1);}',
  'setStatus(value);setPage(1)',
  'if(ready&&data&&page>data.pages)setPage(data.pages)',
  'const lower=data&&data.total?(data.page-1)*data.limit+1:0',
  'Math.min(data.page*data.limit,data.total)',
  'onClick={()=>{retry();refreshSummary();}}',
  'className="phase05-scroll clinic-phase08-desktop"',
  'className="clinic-phase08-mobile"',
  '<PatientLink cid={space.clinicId} id={p.id}>',
  'canWrite&&p.status==="active"',
  'encodeURIComponent(p.id)',
  'p.phone&&!p.phoneVerified',
  'aria-live="polite"',
  't("directoryPrivacy")'
 ])assert.ok(ui.includes(token),token);
 assert.ok(!ui.includes('localStorage.setItem('));
 assert.ok(!ui.includes('sessionStorage.setItem('));
 assert.ok(!ui.includes('Math.random('));
});

test("Clinic Phase 08: registration preserves duplicate checks, server validation and notice acknowledgement",()=>{
 for(const token of [
  'function PatientFields(',
  'dateOfBirth:value,ageEstimate:value?"":s.ageEstimate',
  'ageEstimate:value,dateOfBirth:value?"":s.dateOfBirth',
  'type="date" max={todayKabul()}',
  'type="number" min={0} max={120}',
  'type="tel" placeholder="+93…"',
  'if(!form.noticeAcknowledged)',
  'if(form.dateOfBirth&&form.dateOfBirth>todayKabul())',
  'form.preferredName.trim().length<2',
  'DOB_AND_ESTIMATE_MUTUALLY_EXCLUSIVE',
  'Number(form.ageEstimate)>120',
  'api(target+"/duplicates","POST",payload)',
  'duplicateOverride:"create_anyway",duplicateReason:reason.trim()',
  'e.code==="DUPLICATE_CANDIDATES"&&e.candidates?.length',
  'setCandidates(e.candidates)',
  'reason.trim().length<10',
  'form.preferredName?.trim().length<2',
  'describe(error)',
  'existing.revision',
  'directoryContactHint'
 ])assert.ok(ui.includes(token),token);
 for(const token of [
  'DUPLICATE_CANDIDATES',
  'DUPLICATE_REASON_REQUIRED',
  'STALE_PATIENT_REVISION',
  'await lockClinic(tx,cid)',
  'await duplicates(tx,cid,input)',
  'await logPatient('
 ])assert.ok(api.includes(token),token);
 for(const token of [
  'if(dateOfBirth!==null&&ageEstimate!==null)',
  'dateOfBirth=isoDate(b.dateOfBirth)',
  'if(source==="frontdesk"&&b.noticeAcknowledged!==true)',
  'phone:phone(b.phone)'
 ])assert.ok(validator.includes(token),token);
});

test("Clinic Phase 08: safe patient status confirmation respects future bookings and revision",()=>{
 for(const token of [
  'const [statusConfirm,setStatusConfirm]=useState(false)',
  'if(!p||!statusConfirm||busy||statusReason.trim().length<10)return',
  'role="alertdialog" aria-modal="true"',
  'aria-labelledby="clinic-phase08-status-title"',
  'if(event.key==="Escape"&&!busy)setStatusConfirm(false)',
  'setStatusConfirm(false);retry()',
  'revision:p.revision,reason:statusReason.trim()',
  'minLength={10} maxLength={300} rows={3} required',
  'disabled={busy||statusReason.trim().length<10}',
  'directoryStatusHelp',
  'problem==="STALE_PATIENT_REVISION"?t("stale"):describe(problem)'
 ])assert.ok(ui.includes(token),token);
 assert.ok(!ui.includes('confirm(t("confirm"))'),"Native confirm must not be used for record status changes");
 for(const token of [
  'if(!["owner","manager"].includes(ctx.role))',
  'if(next===existing.status)fail(409,"STATUS_UNCHANGED")',
  'inArray(schema.clinicAppointment.status,["confirmed","arrived","in_treatment"])',
  'PATIENT_HAS_FUTURE_APPOINTMENTS',
  'eq(schema.clinicPatient.revision,existing.revision)',
  'logPatient(tx,req.actor!.id,cid,existing.id,"patient.status."+next)'
 ])assert.ok(api.includes(token),token);
});

test("Clinic Phase 08: RTL/English copy, accessible mobile design and patient vs clinic style isolation",()=>{
 for(const token of [
  'directoryIntro:"Find verified clinic records',
  'directoryIntro:"پرونده‌های کلینیک',
  'directoryIntro:"د کلینیک ریکارډونه',
  'directoryStatusTitle:"Confirm patient record status"',
  'directoryStatusTitle:"تأیید تغییر وضعیت مریض"',
  'directoryStatusTitle:"د ناروغ د حالت بدلون تایید"',
  'directoryDobHint:"The birth date cannot be in the future.',
  'directoryDobHint:"تاریخ تولد نباید آینده باشد.',
  'directoryDobHint:"د زېږېدو نېټه باید راتلونکې نه وي.',
  '<CareIcon name="users"','<CareIcon name="shield"',
  'className="card panel clinic-phase08-profile-hero"'
 ])assert.ok(ui.includes(token),token);
 assert.ok(layout.includes('import "./clinic-reception.css";\nimport "./clinic-patients.css";'));
 assert.ok(css.startsWith("/*"));
 for(const token of [
  '.clinic-persistent-shell .clinic-phase08-directory',
  '.clinic-persistent-shell .clinic-phase08-stat',
  '.clinic-persistent-shell .clinic-phase08-search-control',
  '.clinic-persistent-shell .clinic-phase08-patient-card',
  '.clinic-persistent-shell .clinic-phase08-status-modal',
  '.clinic-persistent-shell .clinic-phase08-editor',
  '@media(max-width:1100px)','@media(max-width:760px)',
  '@media(max-width:580px)','@media(max-width:375px)',
  '@media(prefers-reduced-motion:reduce)',
  ':focus-visible',
  'min-width:0','overflow-wrap:anywhere'
 ])assert.ok(css.includes(token),token);
 for(const forbidden of [':root{','svg path{','.odontogram{',
  'transform:scaleX(-1)','Math.random('])assert.ok(!css.includes(forbidden),forbidden);
 for(const path of ["apps/clinic-web/app/layout.tsx",
  "apps/admin-web/app/layout.tsx","apps/patient-web/app/layout.tsx"])
  assert.ok(!read(path).includes("clinic-patients.css"),path);
});
