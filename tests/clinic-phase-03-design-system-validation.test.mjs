import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const css=read("apps/clinic-web/app/clinic/clinic-design.css");
const shell=read("apps/clinic-web/app/clinic/clinic-shell.tsx");
const clinicLayout=read("apps/clinic-web/app/clinic/layout.tsx");
const rootLayout=read("apps/clinic-web/app/layout.tsx");
const primitives=read("packages/ui-web/src/clinic-primitives.tsx");
const dashboard=read("packages/ui-web/src/clinic-operations-dashboard.tsx");

test("Clinic Phase 03: premium theme is loaded after clinic shell, never globally on other apps",()=>{
 assert.ok(clinicLayout.includes('import "./clinic-shell.css";\nimport "./clinic-design.css";'));
 assert.ok(clinicLayout.includes("<ClinicPersistentShell>{children}</ClinicPersistentShell>"));
 assert.ok(!rootLayout.includes("clinic-design.css"),"public registration/login must retain original site theme");
 for(const p of ["apps/admin-web/app/layout.tsx","apps/patient-web/app/layout.tsx"]){
  assert.ok(!read(p).includes("clinic-design.css"),p);
 }
 assert.ok(css.startsWith("/*"));
 assert.ok(css.includes(".clinic-persistent-shell{"));
 assert.ok(!css.includes(":root{"),"design tokens must not mutate global patient/admin variables");
 assert.ok(!css.includes("body{"));
 assert.ok(!css.includes("html{"));
 assert.ok(!css.includes("!important")||css.includes("/*"),"exceptional specificity must be documented");
});

test("Clinic Phase 03: semantic clinic tokens unify typography, color, spacing, surfaces",()=>{
 for(const marker of [
  "--clinic-primary:#176db7","--clinic-primary-hover:#11558e",
  "--clinic-primary-weak:#eaf4ff","--clinic-ink:#192f49",
  "--clinic-ink-soft:#4b6580","--clinic-muted:#617890",
  "--clinic-border:#dce7f2","--clinic-border-strong:#b9cde1",
  "--clinic-surface:#fff","--clinic-surface-muted:#f7faff",
  "--clinic-radius-sm:10px","--clinic-radius-md:14px",
  "--clinic-radius-lg:19px","--clinic-shadow-sm:","--clinic-shadow-md:",
  "--clinic-space-1:4px","--clinic-space-6:24px",
  "--clinic-focus:","font-variant-numeric:tabular-nums",
  "[dir=\"rtl\"] .clinic-persistent-shell",
  'font-family:"Noto Sans Arabic"',
  ".clinic-persistent-shell h1{font-size:clamp(",
  '.clinic-persistent-shell :is(h1,h2,h3)'
 ])assert.ok(css.includes(marker),marker);
 assert.ok(css.includes(".clinic-persistent-shell .h-clinic{"));
 assert.ok(css.includes("--h-teal:var(--clinic-primary)"));
});

test("Clinic Phase 03: role-safe visual styling covers existing real workflows",()=>{
 for(const marker of [
  ".phase04-panel",".phase05-form-section",".phase05-stat",
  ".phase06-summary-card",".p15-panel",".p18-panel",
  ".phase04-kpi",".phase05-intake-card",".p15-appointment",
  ".phase04-section-nav",".phase04-inner-tabs",".phase05-tabs",".p15-tabs",
  ".phase05-scroll",".phase04-table-scroll",
  "tbody tr:hover",".state-badge",".p15-badge",
  ".clinic-empty-state",".clinic-section-heading",".clinic-metric-value",
  ".clinic-page-skeleton",".clinic-header-quick-links",
  ".clinic-persistent-sidebar"
 ])assert.ok(css.includes(marker),marker);
 assert.ok(shell.includes('className="clinic-header-quick-links"'));
 assert.ok(shell.includes('className="card side-panel staff-side clinic-persistent-sidebar"'));
});

test("Clinic Phase 03: forms preserve medical controls, validation and keyboard accessibility",()=>{
 for(const marker of [
  ':not([type="checkbox"])',':not([type="radio"])',
  ':not([type="file"])',':not([type="hidden"])',
  'input[type="checkbox"]','input[type="radio"]',
  '[aria-invalid="true"]',":focus-visible",
  'outline:3px solid #297bbb',
  'max-width:100%;min-width:0',
  "textarea{\n min-height:95px",
  '@media(max-width:900px)',
  '@media(max-width:600px)',
  '@media(prefers-reduced-motion:reduce)'
 ])assert.ok(css.includes(marker),marker);
 assert.ok(!css.includes('.dental-chart{'));
 assert.ok(!css.includes('.odontogram{'));
 assert.ok(!css.includes('svg path{'),"clinical tooth colors must never be globally recolored");
 assert.ok(css.includes(".p15-button-danger"));
 assert.ok(css.includes(".state-rejected"));
 assert.ok(css.includes(".state-pending"));
 assert.ok(css.includes(".state-approved"));
});

test("Clinic Phase 03: shared accessible primitives show actual data, not placeholders",()=>{
 for(const marker of [
  "export function ClinicSectionHeading(","export function ClinicMetricValue(",
  "export function ClinicEmptyState(","role=\"status\"",
  "className=\"h-card-heading clinic-section-heading\"",
  "className=\"clinic-metric-value\"",
  'className="h-empty clinic-empty-state"',
  "actionHref&&actionLabel","type ReactNode",
  "CareIcon name={icon}"
 ])assert.ok(primitives.includes(marker),marker);
 for(const marker of [
  'import {ClinicSectionHeading,ClinicMetricValue,ClinicEmptyState} from "./clinic-primitives"',
  '<ClinicSectionHeading icon="calendar" eyebrow={t("overview")} title={t("today")}',
  '<ClinicSectionHeading icon="users" eyebrow={t("patients")} title={t("totalPatients")}',
  '<ClinicMetricValue value={item.key==="todayTotal"?appointments.data!.todayTotal:appointments.data!.counts[item.key]}/>',
  '<ClinicMetricValue value={patients.data.total}/>',
  '<ClinicMetricValue value={patients.data.counts.active}/>',
  '<ClinicEmptyState message={t("noUpcoming")} icon="calendar"/>',
  'credentials:"include",cache:"no-store"',
  'space.role==="owner"||space.role==="manager"'
 ])assert.ok(dashboard.includes(marker),marker);
 for(const marker of ["Math.random(","fakePatients","demoPatients","sessionStorage.setItem(","localStorage.setItem("]){
  assert.ok(!primitives.includes(marker),"no fabricated or stored medical data: "+marker);
 }
});

test("Clinic Phase 03: status colors communicate clinical/financial status without remapping meanings",()=>{
 const success=css.slice(css.indexOf('.clinic-persistent-shell :is(.state-approved'),css.indexOf('.clinic-persistent-shell :is(.state-pending'));
 const pending=css.slice(css.indexOf('.clinic-persistent-shell :is(.state-pending'),css.indexOf('.clinic-persistent-shell :is(.state-rejected'));
 const failed=css.slice(css.indexOf('.clinic-persistent-shell :is(.state-rejected'),css.indexOf('/* Common skeleton'));
 assert.ok(success.includes("color:#126a4c"),"green for approved/completed/sent");
 assert.ok(pending.includes("color:#896018"),"amber for pending/requested");
 assert.ok(failed.includes("color:#a12a49"),"rose for denied/cancelled/failed");
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
});
