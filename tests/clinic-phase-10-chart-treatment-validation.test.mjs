import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const chart=read("packages/ui-web/src/phase08.tsx");
const treatment=read("packages/ui-web/src/phase09.tsx");
const chartApi=read("apps/api/src/chart-router.ts");
const treatmentApi=read("apps/api/src/treatment-router.ts");
const css=read("apps/clinic-web/app/clinic/clinic-chart-treatment.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");

test("Clinic Phase 10: chart queries never expose stale clinic, patient or tooth data",()=>{
 for(const token of [
  'const [snapshot,setSnapshot]=useState<{path:string|null;data:any;error:string}>',
  'const controller=new AbortController();',
  'api(path,"GET",undefined,controller.signal)',
  'return()=>controller.abort();',
  'data:snapshot.path===path?snapshot.data:null',
  'error:snapshot.path===path?snapshot.error:"",refresh',
  'credentials:"include",signal,',
  'const snapshotUrl=dentition&&context&&(mode!=="visit"||encounterId)?',
  'base+"/observations?"+new URLSearchParams({toothCode:selected,',
  'const selectedObservation=teeth.find(x=>x.toothCode===selected)',
  'snapshot&&selectedObservation?',
  'snapshot?.observedCount??"—"',
  'chartTeeth.length-snapshot.observedCount'
 ])assert.ok(chart.includes(token),token);
 assert.ok(!chart.includes('localStorage.setItem('));
 assert.ok(!chart.includes('Math.random('));
});

test("Clinic Phase 10: FDI input enforces anatomical dentition and has accessible tooth picker",()=>{
 for(const token of [
  'function findTooth(event:FormEvent)',
  'toothInput.replace(/[۰-۹]/g',
  '.replace(/[٠-٩]/g',
  'fdi(dentition).all.includes(normalized)',
  'requestAnimationFrame(()=>document.getElementById("fdi-tooth-"+normalized)?.focus())',
  'className="clinic-phase10-tooth-finder"',
  'inputMode="numeric" dir="ltr"',
  'aria-invalid={toothError}',
  'role="alert"',
  'aria-pressed={selected}',
  'role="tablist"',
  'role="region"',
  'phase08-orientation',
  'phase08-chart-scroll',
  'phase08-inspector',
  'snapshotError?<Problem code={snapshotError} retry={refreshSnapshot}'
 ])assert.ok(chart.includes(token),token);
 for(const token of [
  '/^[1-4][1-8]$/',
  '/^[5-8][1-5]$/',
  'if(index<=3&&surfaces.includes("O")||index>=4&&surfaces.includes("I"))',
  "AND o.status='validated'",
  'observation_date DESC,o.validated_at DESC',
  'AND o.tooth_code=${toothCode}'
 ])assert.ok(chartApi.includes(token),token);
});

test("Clinic Phase 10: clinician validation is explicit, patient-bound, and server-authoritative",()=>{
 for(const token of [
  'const [validationTarget,setValidationTarget]=useState<Observation|null>(null)',
  'if(!validationTarget||validationTarget.id!==id||writing||!context?.canValidate)return',
  'api(base+"/observations/"+id+"/validate","POST",{confirmation:"VALIDATE"})',
  'setValidationTarget(null);refreshSnapshot();refreshObservations();',
  'setValidationTarget(ob);setFailure("")',
  'role="alertdialog" aria-modal="true"',
  'aria-labelledby="clinic-phase10-confirm-title"',
  'validationTarget.encounterId.slice(0,8)',
  'validationTarget.toothCode',
  'validationTarget.condition',
  'validationTarget.notes&&',
  'if(event.key==="Escape"&&!writing)setValidationTarget(null)',
  'onClick={()=>void validate(validationTarget.id)}',
  'onMouseDown={event=>{if(event.currentTarget===event.target&&!writing)setValidationTarget(null);}}',
  'space.role!=="assistant"&&<a href={patientPath',
  'space.role!=="assistant"&&<a href={"/clinic/patients/"+patientId+"/treatments',
  'clinicErrorText(code,lang)'
 ])assert.ok(chart.includes(token),token);
 assert.ok(!chart.includes('if(!confirm(t("validatePrompt")))return;'));
 for(const token of [
  'CHART_CASE_NOT_ASSIGNED',
  'CLINICIAN_VALIDATION_REQUIRED',
  'VALIDATION_CONFIRMATION_REQUIRED',
  'DUPLICATE_ACTION_CHANGED',
  'ASSISTANT_DRAFT_ONLY',
  'if(write){',
  'await audit(req,"clinical.chart.viewed"'
 ])assert.ok(chartApi.includes(token),token);
});

test("Clinic Phase 10: treatment plans and catalogs never leak prior patient snapshots",()=>{
 for(const token of [
  'const [snapshot,setSnapshot]=useState<{path:string|null;data:any;error:string}>',
  'const controller=new AbortController();setSnapshot({path,data:null,error:""})',
  'req(path,"GET",undefined,controller.signal)',
  'return()=>controller.abort();',
  'data:snapshot.path===path?snapshot.data:null',
  'error:snapshot.path===path?snapshot.error:"",refresh',
  'credentials:"include",cache:"no-store",signal,',
  'clinicErrorText(code,lang)',
  'useLoad(ready?base(space.clinicId,pid)+"/plans?"+qs:null)',
  'new URLSearchParams(location.search)',
  'history.replaceState(null,"",location.pathname+"?"+params.toString())',
  'query.set("clinic",space.clinicId)',
  'history.replaceState(null,"",location.pathname+"?"+query.toString())',
  'const tabs=["summary","stages","estimate","consent","timeline"]'
 ])assert.ok(treatment.includes(token),token);
 for(const token of [
  'const {ctx}=await access(req);await assigned(req,ctx)',
  'p.clinician_membership_id!==ctx.membership.id',
  'p.patient_id=${pid(req)}',
  'AND p.clinician_membership_id=${ctx.membership.id}',
  'ORDER BY p.updated_at DESC,p.id DESC LIMIT 11',
  'noStore(res);res.json({plans:rows.slice(0,10),hasMore:rows.length>10,page})'
 ])assert.ok(treatmentApi.includes(token),token);
});

test("Clinic Phase 10: progress, consent and stages reflect real versioned backend facts",()=>{
 for(const token of [
  'className="clinic-phase10-treatment-intro"',
  'workspaceSafeguard:"Plans do not automatically diagnose',
  'workspaceSafeguard:"پلان به‌طور خودکار تشخیص',
  'workspaceSafeguard:"پلان په خپله تشخیص',
  'className="clinic-phase10-plan-progress"',
  'info.stages.filter(stage=>stage.status==="completed").length',
  'value={info.stages.filter(stage=>stage.status==="completed").length}',
  'p.consentState==="recorded"?"workspaceConsentActive":"workspaceNoConsent"',
  'className="clinic-phase10-plan-actions"',
  'onClick={()=>setTab("stages")}',
  'onClick={()=>setTab("consent")}',
  'onClick={()=>setTab("estimate")}',
  'onClick={()=>setTab("timeline")}',
  'const visits=useLoad(tab==="stages"?base(space.clinicId,pid)+"/catalog":null)',
  '.filter((v:Encounter)=>v.status==="signed")',
  's.linkedEncounterId&&<p>{t("signedVisit")}',
  'encodeURIComponent(s.linkedEncounterId)',
  'canAdvance&&s.status==="in_progress"',
  'revision:p.revision,action:"complete",encounterId',
  'workspaceUnsafe:"Never mark a stage complete',
  'p.consentState==="recorded"',
  'confirmation:"IN_PERSON_RECORDED"',
  'consentForm.confirmed',
  'reason.trim().length<10'
 ])assert.ok(treatment.includes(token),token);
 for(const token of [
  'TREATMENT_CONSENT_REQUIRED','STALE_TREATMENT_REVISION',
  'PERFORMED_PROCEDURE_EVIDENCE_REQUIRED',
  'SIGNED_ENCOUNTER_REQUIRED',
  'IN_PERSON_CONFIRMATION_REQUIRED',
  'patient_released=false',
  'invoiceCreated:false,paymentPosted:false'
 ])assert.ok(treatmentApi.includes(token),token);
});

test("Clinic Phase 10: editor mirrors server FDI and discount limits without making payment claims",()=>{
 for(const token of [
  'const invalidStage=form.stages.some(stage=>{',
  '/^([1-4][1-8]|[5-8][1-5])$/.test(code)',
  'new Set(codes).size',
  'new Error("INVALID_TOOTH_CODES")',
  'line.discountAfn*10>subtotal*3',
  'new Error("DISCOUNT_EXCEEDS_POLICY")',
  'money(Math.max(0,(svc?.base_price_afn||0)*x.quantity-x.discountAfn))',
  'money(Math.max(0,total))',
  '<Notice kind="warning">{t("priceWarning")}</Notice>'
 ])assert.ok(treatment.includes(token),token);
 for(const token of [
  'DISCOUNT_EXCEEDS_POLICY',
  'DISCOUNT_EXCEEDS_LINE',
  'const fdi=(code:string)=>/^([1-4][1-8]|[5-8][1-5])$/.test(code)',
  'if(discountAfn*10>subtotal*3)',
  'if(!Number.isSafeInteger(total)||total>2000000000)',
  'invoiceCreated:false,paymentPosted:false'
 ])assert.ok(treatmentApi.includes(token),token);
});

test("Clinic Phase 10: clinic-specific responsive styling and translations leave clinical geometry intact",()=>{
 for(const token of [
  'workspaceTitle:"Interactive clinical chart"',
  'workspaceTitle:"چارت کلینیکی تعاملی"',
  'workspaceTitle:"تعامل لرونکی کلینیکي چارټ"',
  'chartReviewHint:"Validate only after reviewing',
  'chartReviewHint:"پیش از تأیید',
  'chartReviewHint:"د تایید مخکې',
  'toothFinderError:"Choose a valid FDI tooth',
  'chartOnlyValidated:"Only validated observations affect this map.'
 ])assert.ok(chart.includes(token),token);
 for(const token of [
  'workspaceTitle:"Treatment workspace"',
  'workspaceTitle:"بخش پلان تداوی"',
  'workspaceTitle:"د درملنې برخه"',
  'workspaceConsent:"Witness consent"',
  'workspaceConsent:"رضایت با شاهد"',
  'workspaceConsent:"د شاهد رضایت"',
  'workspacePatientPrivate:"Private to clinic; not released to patient app.'
 ])assert.ok(treatment.includes(token),token);
 assert.ok(layout.includes('import "./clinic-care.css";\nimport "./clinic-chart-treatment.css";'));
 for(const token of [
  '.clinic-persistent-shell .clinic-phase10-chart-overview',
  '.clinic-persistent-shell .clinic-phase10-chart-stat-grid',
  '.clinic-persistent-shell .clinic-phase10-tooth-finder',
  '.clinic-persistent-shell .clinic-phase10-confirm-dialog',
  '.clinic-persistent-shell .clinic-phase10-treatment-intro',
  '.clinic-persistent-shell .clinic-phase10-plan-actions',
  '.clinic-persistent-shell .clinic-phase10-plan-progress',
  '@media(max-width:1200px)','@media(max-width:800px)',
  '@media(max-width:640px)','@media(max-width:375px)',
  '@media(prefers-reduced-motion:reduce)',
  ':focus-visible','max-height:92dvh','overscroll-behavior:contain'
 ])assert.ok(css.includes(token),token);
 for(const forbidden of [':root{','.odontogram{','svg path{',
  'transform:scaleX(-1)','Math.random('])assert.ok(!css.includes(forbidden),forbidden);
 for(const p of ["apps/clinic-web/app/layout.tsx",
  "apps/admin-web/app/layout.tsx","apps/patient-web/app/layout.tsx"])
  assert.ok(!read(p).includes("clinic-chart-treatment.css"),p);
});
