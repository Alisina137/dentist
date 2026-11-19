#!/usr/bin/env node
/**
 * Phase29 real-device MFA evidence tracker — local/offline ONLY.
 * Never collects passwords, MFA codes, recovery secrets, screenshots, cookies,
 * bearer tokens or patient records. It does not execute or claim device tests.
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

export const platforms=["android","ios"];
export const workspaces=["clinic","patient"];
export const scenarios=[
 "password_challenge_no_bearer",
 "valid_totp_and_verified_session",
 "invalid_totp_denied",
 "single_use_recovery_code",
 "expired_or_replayed_challenge_denied",
 "background_switch_erases_code",
 "network_or_cookie_loss_fails_closed",
 "logout_and_revoked_session_denied"
];
const outcomes=new Set(["NOT_RUN","PASS","FAIL","BLOCKED"]);
const ids=new Set(platforms.flatMap(platform=>workspaces.flatMap(workspace=>
 scenarios.map(scenario=>platform.toUpperCase()+"_"+workspace.toUpperCase()+"_"+scenario.toUpperCase()))));
const fields=new Set(["id","status","evidenceId","completedAt"]);
const artifactFields=new Set(["format","scope","syntheticOnly","cases"]);
const evidencePattern=/^[A-Z0-9][A-Z0-9_-]{5,63}$/;
export function makeChecklist(){
 return {
  format:"DANDANLINK_PHASE29_MFA_DEVICE_V1",
  scope:"Physical-device manual observation only; PH19 production clearance NOT granted",
  syntheticOnly:true,
  cases:[...ids].map(id=>({id,status:"NOT_RUN",evidenceId:"",completedAt:""}))
 };
}
export function validateChecklist(data){
 if(!data||typeof data!=="object"||Array.isArray(data)||
  Object.keys(data).some(k=>!artifactFields.has(k))||
  data.format!=="DANDANLINK_PHASE29_MFA_DEVICE_V1"||
  data.syntheticOnly!==true||data.scope!==makeChecklist().scope||
  !Array.isArray(data.cases)||data.cases.length!==ids.size)
  throw Error("Invalid Phase29 device manifest; generate a new one with --init.");
 const seen=new Set(),stats={PASS:0,FAIL:0,BLOCKED:0,NOT_RUN:0};
 for(const entry of data.cases){
  if(!entry||typeof entry!=="object"||Array.isArray(entry)||
   Object.keys(entry).some(k=>!fields.has(k))||
   !ids.has(entry.id)||seen.has(entry.id)||!outcomes.has(entry.status))
   throw Error("Unknown, duplicate or invalid Phase29 device case.");
  seen.add(entry.id);
  if(typeof entry.evidenceId!=="string"||typeof entry.completedAt!=="string")
   throw Error("Device evidence fields must be strings.");
  if(entry.status==="PASS"){
   if(!evidencePattern.test(entry.evidenceId)||
    !/^\\d{4}-\\d\\d-\\d\\dT/.test(entry.completedAt)||
    !Number.isFinite(Date.parse(entry.completedAt)))
    throw Error("PASS requires an external sanitized evidence ticket and ISO timestamp.");
  }else if(entry.evidenceId||entry.completedAt){
   // On FAILED/BLOCKED/NOT_RUN, no freeform evidence or secrets are persisted.
   throw Error("Only PASS may contain a ticket ID and timestamp.");
  }
  stats[entry.status]++;
 }
 return {complete:stats.PASS===ids.size,stats,total:ids.size,
  remaining:ids.size-stats.PASS};
}
function usage(){
 console.info("Phase29 physical-device MFA tracker (no network/API/devices accessed).");
 console.info("  node scripts/phase29-device-mfa-check.mjs --init");
 console.info("  node scripts/phase29-device-mfa-check.mjs --verify");
 console.info("Default private file: .patient-acceptance/phase29-device-mfa.json");
 console.info("Edit only case status; for PASS add sanitized evidenceId and completedAt.");
}
export function main(argv=process.argv.slice(2)){
 if(argv.includes("--help")||argv.includes("-h")){usage();return 0;}
 const dir=resolve(dirname(fileURLToPath(import.meta.url)),"..",
  ".patient-acceptance");
 const path=resolve(dir,"phase29-device-mfa.json");
 if(argv.length!==1||!["--init","--verify"].includes(argv[0])){
  usage();return 2;
 }
 if(argv[0]==="--init"){
  mkdirSync(dir,{recursive:true});
  if(existsSync(path))throw Error("Existing device manifest preserved; --init does not overwrite.");
  writeFileSync(path,JSON.stringify(makeChecklist(),null,2)+"\\n",{
   encoding:"utf8",flag:"wx",mode:0o600
  });
  console.info("Created private Phase29 checklist in .patient-acceptance; all 32 cases NOT_RUN.");
  return 0;
 }
 const report=validateChecklist(JSON.parse(readFileSync(path,"utf8")));
 console.info("Phase29 device MFA: "+JSON.stringify(report.stats)+
  "; synthetic evidence tickets only; no PHI/secrets recorded.");
 if(!report.complete){
  console.error("DEVICE_MFA_NOT_ACCEPTED: "+report.remaining+
   " cases not marked PASS. PH19 healthcare release remains NO-GO.");
  return 2;
 }
 console.info("DEVICE_MFA_OPERATOR_CHECKLIST_COMPLETE: 32 manually attested cases; "+
  "independent accessibility, privacy, legal and clinical reviews remain required.");
 return 0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{process.exitCode=main();}catch(error){
  console.error("DEVICE_MFA_EVIDENCE_BLOCKED: "+
   (error instanceof Error?error.message:"invalid checklist"));
  process.exitCode=2;
 }
}
