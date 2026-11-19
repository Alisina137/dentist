#!/usr/bin/env node
/**
 * Phase32 manual Android/iOS × clinic/patient × EN/Dari/Pashto
 * accessibility and low-connectivity acceptance tracker.
 *
 * This script NEVER connects to real devices or reads private patient data.
 * An operator may attach only sanitized external evidence ticket IDs.
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
export const oses=["android","ios"];
export const workspaces=["patient","clinic"];
export const locales=["en","fa-AF","ps-AF"];
export const scenarios=[
 "portrait_320dp_no_clipping",
 "portrait_360dp_no_clipping",
 "portrait_414dp_no_clipping",
 "landscape_controls_reachable",
 "screen_reader_headings_roles_focus",
 "font_scale_200_percent_no_obstruction",
 "offline_background_resume_no_private_stale_data",
 "revoked_session_and_workspace_switch_isolated"
];
export const caseIds=oses.flatMap(os=>workspaces.flatMap(workspace=>
 locales.flatMap(locale=>scenarios.map(s=>
  [os,workspace,locale,s].join("__").toUpperCase()))));
const expected=new Set(caseIds),statusSet=new Set(["NOT_RUN","PASS","FAIL","BLOCKED"]);
const caseKeys=new Set(["id","status","ticket","observedAt"]);
const ticket=/^[A-Z][A-Z0-9_-]{6,63}$/;
export function makeChecklist(){
 return {schemaVersion:1,format:"DANDANLINK_PHASE32_DEVICE_ACCESSIBILITY_V1",
  syntheticAccountsOnly:true,releaseApproval:false,
  cases:caseIds.map(id=>({id,status:"NOT_RUN",ticket:"",observedAt:""}))};
}
export function validateChecklist(data,now=Date.now()){
 if(!data||typeof data!=="object"||Array.isArray(data)||
  Object.keys(data).length!==5||
  data.schemaVersion!==1||
  data.format!=="DANDANLINK_PHASE32_DEVICE_ACCESSIBILITY_V1"||
  data.syntheticAccountsOnly!==true||data.releaseApproval!==false||
  !Array.isArray(data.cases)||data.cases.length!==caseIds.length)
  throw Error("Invalid Phase32 device manifest");
 const seen=new Set(),stats={NOT_RUN:0,PASS:0,FAIL:0,BLOCKED:0};
 for(const entry of data.cases){
  if(!entry||typeof entry!=="object"||Array.isArray(entry)||
   Object.keys(entry).length!==4||
   Object.keys(entry).some(key=>!caseKeys.has(key))||
   typeof entry.id!=="string"||!expected.has(entry.id)||
   seen.has(entry.id)||!statusSet.has(entry.status)||
   typeof entry.ticket!=="string"||typeof entry.observedAt!=="string")
   throw Error("Unknown, duplicate or extra device evidence fields");
  seen.add(entry.id);
  if(entry.status==="PASS"){
   if(!ticket.test(entry.ticket)||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(entry.observedAt)||
    !Number.isFinite(Date.parse(entry.observedAt))||
    Date.parse(entry.observedAt)>now+5*60_000)
    throw Error("PASS requires a sanitized ticket and witnessed UTC timestamp");
  }else if(entry.ticket||entry.observedAt)
   throw Error("Only witnessed PASS can reference an external evidence ticket");
  stats[entry.status]++;
 }
 return {complete:stats.PASS===caseIds.length,total:caseIds.length,
  remaining:caseIds.length-stats.PASS,stats,releaseApproval:false};
}
export function main(argv=process.argv.slice(2)){
 if(argv.length!==1||!["--init","--verify"].includes(argv[0])){
  console.info("Usage: node scripts/phase32-device-accessibility-check.mjs --init|--verify");
  return 2;
 }
 const dir=resolve(dirname(fileURLToPath(import.meta.url)),"..",".patient-acceptance");
 const file=resolve(dir,"phase32-device-accessibility.json");
 if(argv[0]==="--init"){
  mkdirSync(dir,{recursive:true});
  if(existsSync(file))throw Error("Existing private checklist preserved");
  writeFileSync(file,JSON.stringify(makeChecklist(),null,2)+"\n",{
   encoding:"utf8",flag:"wx",mode:0o600});
  console.info("PH32_DEVICE_CASES_CREATED="+caseIds.length);
  console.info("PH32_DEVICE_EXECUTION=NOT_RUN");
  return 0;
 }
 const report=validateChecklist(JSON.parse(readFileSync(file,"utf8")));
 console.info("PH32_DEVICE_RESULTS="+JSON.stringify(report.stats));
 console.info("PH19_RELEASE_APPROVAL=NOT_ESTABLISHED");
 if(!report.complete){
  console.error("PH32_DEVICE_UAT_INCOMPLETE="+report.remaining);
  return 2;
 }
 console.info("PH32_OPERATOR_CHECKLIST_COMPLETE=REQUIRES_INDEPENDENT_REVIEW");
 return 0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{process.exitCode=main();}
 catch{
  console.error("PH32_DEVICE_EVIDENCE_INVALID");
  process.exitCode=2;
 }
}
