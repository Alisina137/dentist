import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,existsSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const root=resolve(fileURLToPath(new URL("../",import.meta.url)));
const ledger=join(root,"scripts","patient-acceptance.mjs");
const smoke=join(root,"scripts","patient-android-smoke.mjs");
const matrix=readFileSync(join(root,"docs","PATIENT-PHASE-E-END-TO-END-ACCEPTANCE.md"),"utf8");
const call=(command,args=[],state)=>spawnSync(process.execPath,[command,...args,...(state?["--state",state]:[])],
 {cwd:root,encoding:"utf8",timeout:12000,maxBuffer:2e6});

test("Patient F: physical acceptance source matrix has exactly 24 uniquely named cases",()=>{
 const ids=[...matrix.matchAll(/^\| (E\d\d) \|/gm)].map(x=>x[1]);
 assert.equal(ids.length,24);
 assert.equal(new Set(ids).size,24);
 assert.equal(ids[0],"E01");assert.equal(ids[23],"E24");
 assert.match(matrix,/\*\*Release decision:\*\*/);
 assert.match(matrix,/NOT RUN/);
});

test("Patient F: human acceptance evidence ledger is local, gated and never changes untested cases",()=>{
 const temp=mkdtempSync(join(tmpdir(),"dandan-patient-accept-"));
 const state=join(temp,"results.json");
 try{
  let result=call(ledger,["init"],state);
  assert.equal(result.status,0,result.stderr);
  assert.ok(existsSync(state));
  let data=JSON.parse(readFileSync(state,"utf8"));
  assert.equal(data.cases.length,24);
  assert.equal(data.cases.filter(c=>c.status==="NOT_RUN").length,23);
  assert.equal(data.cases.find(c=>c.id==="E24").status,"BLOCKED");
  result=call(ledger,["init"],state);
  assert.equal(result.status,1,"existing human evidence cannot be overwritten");

  result=call(ledger,["record","E01","PASS","--note","Smoke good"],state);
  assert.equal(result.status,1,"PASS without human reviewer cannot be accepted");
  result=call(ledger,["record","E01","PASS","--reviewer","Synthetic QA"],state);
  assert.equal(result.status,1,"PASS without observation cannot be accepted");
  result=call(ledger,["record","E24","PASS","--note","Ready","--reviewer","QA"],state);
  assert.equal(result.status,1,"production gate cannot be marked PASS without independent approvals");

  result=call(ledger,["record","E01","PASS","--note","Guest home okay, alice@example.com not retained","--reviewer","Tester A"],state);
  assert.equal(result.status,0,result.stderr);
  result=call(ledger,["record","E07","FAIL","--note","Network timeout during booking; synthetic only","--reviewer","Tester A"],state);
  assert.equal(result.status,0,result.stderr);
  data=JSON.parse(readFileSync(state,"utf8"));
  assert.equal(data.cases.find(c=>c.id==="E01").status,"PASS");
  assert.match(data.cases.find(c=>c.id==="E01").observation,/\[email redacted\]/);
  assert.equal(data.cases.find(c=>c.id==="E07").status,"FAIL");
  assert.equal(data.cases.find(c=>c.id==="E08").status,"NOT_RUN");
  assert.equal(data.cases.find(c=>c.id==="E24").status,"BLOCKED");
  assert.equal(data.cases.filter(c=>c.status==="PASS").length,1);

  result=call(ledger,["next"],state);
  assert.equal(result.status,0);
  assert.match(result.stdout,/E02/);
  result=call(ledger,["report"],state);
  assert.equal(result.status,0,result.stderr);
  const report=readFileSync(join(temp,"report.md"),"utf8");
  assert.match(report,/NO-GO \/ INCOMPLETE/);
  assert.match(report,/PASS 1 \| FAIL 1 \| BLOCKED 1 \| NOT_RUN 21/);
  assert.doesNotMatch(report,/alice@example\.com/);
  assert.match(report,/All evidence is kept in ignored local/);
 }finally{rmSync(temp,{recursive:true,force:true})}
});

test("Patient F: Android smoke never automates medical actions, session changes or persists UI dumps",()=>{
 const script=readFileSync(smoke,"utf8");
 for(const clause of [
  '["Home","Explore","Appointments","Saved","Account"]',
  '["خانه","جستجو","نوبت‌ها","ذخیره‌ها","حساب"]',
  '["کور","لټون","ملاقاتونه","ساتل شوي","حساب"]',
  'readUi(serial)',
  '["shell","uiautomator","dump",remote]',
  '["shell","rm","-f",remote]',
  '["shell","input","tap"',
  'inferLanguage',
  'orderCorrect',
  'E01-E24',
  'No screenshots or UI XML are retained'
 ])assert.ok(script.includes(clause),clause);
 assert.ok(!script.includes('writeFileSync(path,xml'));
 assert.ok(!script.includes('screencap'));
 assert.ok(!script.includes('input text'));
 assert.ok(!script.includes('sendText'));
 assert.ok(!script.includes('adb shell input keyevent 66'));
 assert.ok(!script.includes('submitBooking'));
 const result=call(smoke,["--help"]);
 assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/Android Platform Tools/);
});

test("Patient F: acceptance evidence and UI dumps are excluded from GitHub, no new dependencies",()=>{
 const ignore=readFileSync(join(root,".gitignore"),"utf8");
 assert.ok(ignore.includes(".patient-acceptance/"));
 const pkg=JSON.parse(readFileSync(join(root,"apps/mobile","package.json"),"utf8"));
 assert.ok(pkg.dependencies.expo);
 assert.ok(!Object.keys(pkg.dependencies).some(x=>/maestro|detox|appium|webdriver/i.test(x)));
});
