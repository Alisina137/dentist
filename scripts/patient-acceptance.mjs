#!/usr/bin/env node
/**
 * DandanLink patient Expo Go human-acceptance evidence ledger.
 * Local-only: deliberately does not collect screenshots, passwords, tokens,
 * patient names, phone numbers, record contents, or raw Android UI dumps.
 * Requires only Node 22+ and the committed Phase E acceptance matrix.
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve,dirname,relative} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const matrix=resolve(root,"docs/PATIENT-PHASE-E-END-TO-END-ACCEPTANCE.md");
const statuses=new Set(["PASS","FAIL","BLOCKED","NOT_RUN"]);
const args=process.argv.slice(2),command=args.shift()||"help";
const option=(key,fallback="")=>{
 const index=args.indexOf("--"+key);
 return index>=0?args[index+1]??fallback:fallback;
};
const dataDir=resolve(root,".patient-acceptance");
const statePath=resolve(root,option("state",".patient-acceptance/results.json"));
function matrixRows(){
 const source=readFileSync(matrix,"utf8");
 const rows=[];
 for(const line of source.split(/\r?\n/)){
  const cells=line.split("|").map(x=>x.trim()).filter(Boolean);
  if(/^E\d\d$/.test(cells[0]||"")&&cells.length>=4)
   rows.push({id:cells[0],area:cells[1],criteria:cells[2]});
 }
 if(rows.length!==24||new Set(rows.map(r=>r.id)).size!==24)
  throw Error("Phase E source matrix must contain exactly 24 unique E01-E24 cases.");
 return rows;
}
function safe(note){
 return String(note||"").replace(/[\r\n\t]+/g," ").slice(0,500)
  .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,"[email redacted]")
  .replace(/\b(?:Bearer\s+)?(?:eyJ[A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+/g,"[token redacted]")
  .replace(/\b(?:Bearer\s+)[A-Za-z0-9._~-]{12,}/gi,"[token redacted]")
  .replace(/\+?\d[\d()\s-]{8,}\d/g,"[number redacted]")
  .replace(/\|/g,"/");
}
function initial(){
 return {version:1,project:"DandanLink synthetic patient device acceptance",
  createdAt:new Date().toISOString(),
  cases:matrixRows().map(row=>({...row,status:row.id==="E24"?"BLOCKED":"NOT_RUN",
   observation:"",evidence:"",reviewer:"",testedAt:null}))};
}
function load(){
 if(!existsSync(statePath))throw Error("No evidence ledger. Run: node scripts/patient-acceptance.mjs init");
 const data=JSON.parse(readFileSync(statePath,"utf8"));
 if(data.version!==1||!Array.isArray(data.cases)||data.cases.length!==24)
  throw Error("Evidence ledger is malformed; nothing was overwritten.");
 return data;
}
function persist(data){
 mkdirSync(dirname(statePath),{recursive:true});
 writeFileSync(statePath,JSON.stringify(data,null,2)+"\n",{flag:"w",mode:0o600});
}
function summary(data){
 const count=Object.fromEntries([...statuses].map(s=>[s,data.cases.filter(c=>c.status===s).length]));
 const ready=count.PASS===24;
 return {count,ready};
}
function report(data){
 const {count,ready}=summary(data);
 const header=[
  "# DandanLink patient physical-device acceptance evidence",
  "",
  "Generated: "+new Date().toISOString(),
  "Automated API/CI passing is NOT a substitute for real-device acceptance.",
  "**Overall device result: "+(ready?"RECORDED AS PASSED — verify independent release sign-off":"NO-GO / INCOMPLETE")+"**",
  "PASS "+count.PASS+" | FAIL "+count.FAIL+" | BLOCKED "+count.BLOCKED+
   " | NOT_RUN "+count.NOT_RUN,
  "",
  "| Case | Area | Status | Test date (UTC) | Reviewer | Sanitized observation | Evidence reference |",
  "| --- | --- | --- | --- | --- | --- | --- |"
 ];
 const body=data.cases.map(c=>[
  c.id,safe(c.area),c.status,c.testedAt||"—",safe(c.reviewer)||"—",
  safe(c.observation)||"—",safe(c.evidence)||"—"].join(" | "));
 return [...header,...body.map(row=>"| "+row+" |"),"",
  "Only human reviewers may attest physical-device PASS, and E24 must remain BLOCKED until independent legal, clinical, privacy, security, accessibility and backup approvals exist.",
  "All evidence is kept in ignored local .patient-acceptance/; do not commit unredacted screenshots, identity data or clinical records.",
  ""].join("\n");
}
function main(){
 if(command==="help"||["-h","--help"].includes(command)){
  console.log("Usage: node scripts/patient-acceptance.mjs init");
  console.log("       node scripts/patient-acceptance.mjs next");
  console.log("       node scripts/patient-acceptance.mjs record E01 PASS --note \"Observed on Android\" --reviewer \"QA\"");
  console.log("       node scripts/patient-acceptance.mjs record E07 FAIL --note \"... \" --evidence \"local reference\"");
  console.log("       node scripts/patient-acceptance.mjs report [--state path]");
  console.log("All evidence stays local; never use real patient information.");
  return;
 }
 if(command==="init"){
  if(existsSync(statePath))throw Error("Ledger exists: refusing to overwrite existing human evidence.");
  persist(initial());
  console.log("Created local evidence ledger with 23 NOT_RUN and one BLOCKED clinical approval.");
  console.log("Run 'node scripts/patient-acceptance.mjs next' to start E01.");
  return;
 }
 const data=load();
 if(command==="next"){
  const todo=data.cases.find(c=>c.status==="NOT_RUN"||c.status==="FAIL")||
   data.cases.find(c=>c.status==="BLOCKED");
  if(!todo){console.log("No open cases remain. Independent signoff is still required.");return}
  console.log(todo.id+" — "+todo.area+"\nExpected: "+todo.criteria);
  console.log("Record after testing: node scripts/patient-acceptance.mjs record "+todo.id+
   " PASS --note \"what you actually observed\" --reviewer \"tester\"");
  return;
 }
 if(command==="record"){
  const id=args[0],status=(args[1]||"").toUpperCase();
  if(!/^E(?:0[1-9]|1\d|2[0-4])$/.test(id||"")||!statuses.has(status))
   throw Error("Use: record E01 PASS|FAIL|BLOCKED|NOT_RUN --note \"...\" --reviewer \"...\"");
  const row=data.cases.find(c=>c.id===id);
  if(!row)throw Error("Unknown case in the Phase E matrix");
  if(id==="E24"&&status==="PASS"&&!option("approval-refs"))
   throw Error("E24 cannot be marked PASS without independent clinical, privacy, security, legal, accessibility and backup approval references (--approval-refs).");
  if(status==="PASS"&&!option("reviewer").trim())
   throw Error("PASS needs a named human reviewer (--reviewer), not an automatic CI result.");
  if(status==="PASS"&&!option("note").trim())
   throw Error("PASS needs the real observed result in --note; never infer it from source code.");
  row.status=status;row.testedAt=status==="NOT_RUN"?null:new Date().toISOString();
  row.observation=safe(option("note"));row.reviewer=safe(option("reviewer"));
  row.evidence=safe(option("evidence"));
  if(id==="E24"&&status==="PASS")
   row.evidence+=(row.evidence?"; ":"")+safe(option("approval-refs"));
  persist(data);
  console.log("Recorded "+id+" as "+status+" from human evidence; no other cases were changed.");
  return;
 }
 if(command==="report"){
  const output=resolve(dirname(statePath),"report.md");
  writeFileSync(output,report(data),"utf8");
  const {count}=summary(data);
  console.log("Local report written: "+relative(root,output));
  console.log("PASS "+count.PASS+" / FAIL "+count.FAIL+" / BLOCKED "+count.BLOCKED+
   " / NOT_RUN "+count.NOT_RUN+" — release decision NO-GO until all cases and approvals verified.");
  return;
 }
 throw Error("Unknown command. Run: node scripts/patient-acceptance.mjs help");
}
try{main()}catch(error){console.error("Acceptance ledger: "+error.message);process.exitCode=1}
