#!/usr/bin/env node
/**
 * DandanLink Phase34 release-candidate engineering and independent review
 * ledger. NO-GO is unconditional without signed, independently verified PH19
 * evidence. The script never treats a successful CI run, a marker in JSON, or
 * operator-set environment variables as a clinical launch approval.
 *
 *  --ci       static cross-workspace/CI invariants, exits 0 when structurally OK
 *  --review   additionally summarizes local Phase29/32 manual device ledgers
 *  --snapshot saves a redacted summary in an ignored private local directory
 *
 * No network calls, file-system traversal outside this repo, medical data,
 * emails, screenshots, user identifiers, secrets, or freeform evidence notes.
 */
import {existsSync,readFileSync,mkdirSync,writeFileSync,statSync} from "node:fs";
import {join,resolve,dirname} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {validateChecklist as validate29} from "./phase29-device-mfa-check.mjs";
import {validateChecklist as validate32} from "./phase32-device-accessibility-check.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
export const independentControls=[
 "LEGAL_PRIVACY","CLINICAL_REVIEW","HOSTING_SECURITY","BACKUP_RESTORE",
 "PENETRATION_TEST","ACCESS_REVIEW","ALERTS","ACCESSIBILITY_RTL","PILOT_ROSTER"
];
export const workspaceContracts={
 admin:[
  "apps/admin-web/app/admin/page.tsx",
  "apps/admin-web/app/admin/clinics/page.tsx",
  "apps/admin-web/app/admin/dentists/page.tsx",
  "apps/admin-web/app/admin/subscriptions/page.tsx",
  "apps/admin-web/app/admin/security/page.tsx",
  "apps/admin-web/app/admin/pilot/page.tsx",
  "apps/admin-web/app/admin/support/page.tsx"
 ],
 clinic:[
  "apps/clinic-web/app/clinic/page.tsx",
  "apps/clinic-web/app/clinic/appointments/page.tsx",
  "apps/clinic-web/app/clinic/patients/page.tsx",
  "apps/clinic-web/app/clinic/clinical/page.tsx",
  "apps/clinic-web/app/clinic/finance/page.tsx",
  "apps/clinic-web/app/clinic/staff/page.tsx",
  "apps/clinic-web/app/clinic/settings/security/page.tsx",
  "apps/clinic-web/app/clinic/settings/quality/page.tsx"
 ],
 patient:[
  "apps/patient-web/app/page.tsx",
  "apps/patient-web/app/search/page.tsx",
  "apps/patient-web/app/appointments/page.tsx",
  "apps/patient-web/app/account/family/page.tsx",
  "apps/patient-web/app/account/records/page.tsx",
  "apps/patient-web/app/account/security/page.tsx",
  "apps/patient-web/app/book/[dentistId]/page.tsx"
 ],
 mobile:[
  "apps/mobile/App.tsx",
  "apps/mobile/native-clinic.tsx",
  "apps/mobile/native-auth.tsx",
  "apps/mobile/native-workspace-choice.tsx",
  "apps/mobile/native-clinic-phase22.tsx",
  "apps/mobile/native-clinic-phase23.tsx",
  "apps/mobile/native-clinic-phase27.tsx",
  "apps/mobile/native-safe-path.ts",
  "apps/mobile/native-session-lifecycle.ts"
 ],
 infra:[
  "apps/api/src/server.ts",
  "apps/api/src/pilot-gate.ts",
  "apps/api/src/production-config.ts",
  "apps/api/src/phase33-readiness.ts",
  "apps/api/src/phase33-shutdown.ts",
  "apps/api/src/phase31-alert-delivery.ts",
  "apps/api/src/booking-notifications.ts",
  "docs/PH19-PILOT-RUNBOOK.md",
  "docs/CLINIC-PHASE-34-FINAL-AUDIT-ACCEPTANCE.md",
  "tests/clinic-phase-28-cross-workspace-audit.test.mjs",
  "tests/clinic-phase-29-synthetic-journey.mjs",
  "tests/clinic-phase-30-operational-observability.test.mjs",
  "tests/clinic-phase-31-alert-recovery.test.mjs",
  "tests/clinic-phase-32-native-resume-accessibility.test.mjs",
  "tests/clinic-phase-33-hardening-recovery.test.mjs",
  "tests/clinic-phase-34-final-audit.test.mjs"
 ]
};
const invariants=[
 ["GATE_RELEASE_FLAG","apps/api/src/pilot-gate.ts","PH19_PILOT_RELEASE_ENABLED"],
 ["GATE_CLINICAL_WRITE_BLOCK","apps/api/src/pilot-gate.ts","PILOT_RELEASE_BLOCKED"],
 ["GATE_ENV_VALIDATION","apps/api/src/production-config.ts","PH19_PILOT_RELEASE_ENABLED requires all nine independently evidenced approval switches"],
 ["CROSS_TENANT_READS","apps/api/src/staff-access.ts","export"],
 ["PATIENT_BOOKING_REPLAY","apps/api/src/patient-booking-router.ts","idempotency_key"],
 ["CLINIC_MFA","apps/mobile/native-clinic.tsx","verifyMfa"],
 ["PATIENT_MFA","apps/mobile/native-auth.tsx","verifyMfa"],
 ["ALERT_OUTBOX","apps/api/src/phase31-alert-delivery.ts","Phase31FileSpool"],
 ["BACKUP_WATCHDOG","apps/api/src/phase30-backup-watchdog.ts","backupHeartbeatIssues"],
 ["READINESS_BOUNDED","apps/api/src/server.ts","BoundedReadinessProbe"],
 ["SHUTDOWN_SETTLED","apps/api/src/phase33-shutdown.ts","Promise.allSettled"],
 ["SMTP_TLS","apps/api/src/mail.ts","requireTLS"],
 ["PATIENT_SECURE_DELETE","apps/mobile/native-auth.tsx","SECURE_STORAGE_UNAVAILABLE"],
 ["CLINIC_SECURE_DELETE","apps/mobile/native-clinic.tsx","SecureStore.deleteItemAsync(TOKEN_KEY)"]
];
const ciMarkers=[
 "pnpm test","pnpm typecheck","pnpm build",
 "expo export --platform android","expo export --platform ios",
 "stage-l-security-integration.mjs",
 "clinic-phase-29-synthetic-journey.mjs",
 "phase33-public-safety-smoke.mjs",
 "verify-test-backup-restore.mjs",
 "phase34-release-candidate.mjs --ci"
];
const paths=Object.values(workspaceContracts).flat();
export function structuralAudit(base=root){
 const issues=[];
 let count=0;
 for(const [area,required] of Object.entries(workspaceContracts)){
  for(const path of required){
   count++;
   if(!existsSync(join(base,path)))issues.push("MISSING_"+area.toUpperCase());
  }
 }
 for(const [id,path,marker] of invariants){
  count++;
  try{
   if(!readFileSync(join(base,path),"utf8").includes(marker))
    issues.push("INVARIANT_"+id);
  }catch{issues.push("INVARIANT_"+id);}
 }
 const gate=join(base,"apps/api/src/pilot-gate.ts");
 const config=join(base,"apps/api/src/production-config.ts");
 try{
  const sources=readFileSync(gate,"utf8")+readFileSync(config,"utf8");
  for(const name of independentControls){
   count++;
   if(!sources.includes("PH19_"+name+"_APPROVED"))
    issues.push("CONTROL_CONTRACT_"+name);
  }
 }catch{
  count+=independentControls.length;
  issues.push("CONTROL_CONTRACT_MISSING");
 }
 const workflow=join(base,".github/workflows/ci.yml");
 let source="";
 try{source=readFileSync(workflow,"utf8");}catch{}
 for(const marker of ciMarkers){
  count++;
  if(!source.includes(marker))issues.push("CI_PIPELINE_INCOMPLETE");
 }
 return {pass:issues.length===0,checks:count,passed:count-issues.length,
  issues:[...new Set(issues)].sort()};
}

function deviceLedger(base,name,total,validator){
 const file=join(base,".patient-acceptance",name);
 if(!existsSync(file))return {status:"NOT_RUN",total,passed:0,remaining:total};
 try{
  // Read only bounded operator-supplied manifests. A huge or corrupted file
  // must never flood CI memory or print evidence contents in diagnostics.
  if(statSync(file).size>96_000)throw Error("OVERSIZED");
  const data=JSON.parse(readFileSync(file,"utf8"));
  const result=validator(data);
  return {status:result.complete?"OPERATOR_REPORTED_COMPLETE":"INCOMPLETE",
   total,passed:result.stats.PASS,remaining:result.remaining};
 }catch{
  return {status:"INVALID_EVIDENCE",total,passed:0,remaining:total};
 }
}
export function manualEvidenceStatus(base=root){
 return {
  physicalMfa:deviceLedger(base,"phase29-device-mfa.json",32,validate29),
  physicalAccessibility:deviceLedger(base,"phase32-device-accessibility.json",96,validate32)
 };
}
export function buildReview(base=root,env=process.env,now=new Date()){
 const engineering=structuralAudit(base);
 const devices=manualEvidenceStatus(base);
 const sha=typeof env.GITHUB_SHA==="string"&&/^[0-9a-f]{40}$/i.test(env.GITHUB_SHA)?
  env.GITHUB_SHA.toLowerCase():null;
 return {
  schema:"dandanlink.release_candidate_review.v1",
  generatedAt:now.toISOString(),
  commitSha:sha,
  technicalScope:"SOURCE_AND_CI_CONTRACT_ONLY_NOT_A_RUNTIME_CERTIFICATION",
  engineering,
  physicalDevices:devices,
  independentSignoffs:{
   required:independentControls.length,verifiedByThisTool:0,
   status:"NOT_VERIFIED_BY_AUTOMATION"
  },
  clinicalProductionDecision:"NO_GO_PENDING_INDEPENDENT_REVIEW",
  authorizesProtectedHealthWrites:false
 };
}
export function run(args=process.argv.slice(2),base=root,writer=console){
 if(args.length!==1||!["--ci","--review","--snapshot"].includes(args[0])){
  writer.error("PH34_USAGE=--ci|--review|--snapshot");
  return 2;
 }
 const mode=args[0],report=buildReview(base);
 writer.info("PH34_ENGINEERING_CONTRACT="+(report.engineering.pass?"PASS":"FAIL"));
 writer.info("PH34_ENGINEERING_CHECKS="+report.engineering.passed+"/"+report.engineering.checks);
 for(const issue of report.engineering.issues)writer.error("PH34_CONTROL_FAIL="+issue);
 if(mode!=="--ci"){
  for(const [key,row] of Object.entries(report.physicalDevices)){
   writer.info("PH34_"+key.toUpperCase()+"="+row.status);
   writer.info("PH34_"+key.toUpperCase()+"_WITNESSED="+row.passed+"/"+row.total);
  }
 }
 if(mode==="--snapshot"){
  const dir=join(base,".patient-acceptance");
  try{
   mkdirSync(dir,{recursive:true,mode:0o700});
   const name="phase34-release-candidate-review.json";
   writeFileSync(join(dir,name),JSON.stringify(report,null,2)+"\n",{
    flag:"wx",mode:0o600
   });
   writer.info("PH34_PRIVATE_REVIEW_SNAPSHOT=CREATED");
  }catch{
   writer.error("PH34_PRIVATE_REVIEW_SNAPSHOT=NOT_CREATED");
   writer.error("PH34_EXISTING_REVIEW_NOT_OVERWRITTEN");
   return 2;
  }
 }
 writer.info("PH34_EXTERNAL_SIGNOFFS_VERIFIED=0/9");
 writer.info("PH34_CLINICAL_PRODUCTION_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW");
 return report.engineering.pass?0:2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
 process.exitCode=run();
