import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve,join } from "node:path";
const root=resolve(import.meta.dirname,"..");
function run(text){
 const child=spawnSync(process.execPath,["--import","tsx","--input-type=module","-e",text],
  {cwd:root,encoding:"utf8",env:{...process.env,TZ:"UTC"}});
 assert.equal(child.status,0,child.stderr||child.stdout);
 return child.stdout.trim();
}
test("PH04 time validation rejects overlap, missing weekday and invalid exception range",()=>{
 const output=run([
  'import { weekInput, exceptionData, OpsFault } from "./apps/api/src/operations-validation.ts";',
  'const valid=Array.from({length:7},(_,weekday)=>({weekday,isOpen:weekday<6,startMinute:540,endMinute:1020,breaks:[]}));',
  'if(weekInput(valid).length!==7)throw Error("week invalid");',
  'let ok=0;',
  'for(const fn of [()=>weekInput(valid.slice(1)),',
  '()=>weekInput(valid.map((v,i)=>i? v :{...v,breaks:[{start:600,end:630},{start:615,end:645}]})),',
  '()=>weekInput(valid.map((v,i)=>i?v:{...v,endMinute:500})),',
  '()=>exceptionData({startDate:"2026-11-22",endDate:"2026-11-20",kind:"closed",reason:"Test exception"})]){',
  'try{fn();}catch(e){if(e instanceof OpsFault&&e.status===422)ok++;}}',
  'if(ok!==4)throw Error("Expected validation to reject all four cases");',
  'console.log("OK");'
 ].join("\n"));
 assert.equal(output,"OK");
});
test("PH04 Kabul wall-clock conversion is independent of host timezone",()=>{
 const script=[
  'import { localToUtc } from "./apps/api/src/operations-validation.ts";',
  'if(localToUtc("2026-11-14",540)!=="2026-11-14T04:30:00.000Z")throw Error("Kabul offset");',
  'if(localToUtc("2026-11-14",720)!=="2026-11-14T07:30:00.000Z")throw Error("Kabul noon");',
  'console.log("OK");'
 ].join("\n");
 assert.equal(run(script),"OK");
});
test("PH04 all active navigation pages, language variants and responsive components are present",async()=>{
 const ui=await readFile(join(root,"packages/ui-web/src/phase04.tsx"),"utf8");
 const staff=await readFile(join(root,"packages/ui-web/src/phase03.tsx"),"utf8");
 const owner=await readFile(join(root,"packages/ui-web/src/phase02.tsx"),"utf8");
 const styles=await readFile(join(root,"packages/ui-web/src/styles.css"),"utf8");
 const next=["services","resources","settings/hours"];
 for(const item of next){
  const route=await readFile(join(root,"apps/clinic-web/app/clinic",item,"page.tsx"),"utf8");
  assert.match(route,/OperationsPortal/);
  assert.ok(staff.includes('"/clinic/'+item),item+" omitted from staff navigation");
  assert.ok(owner.includes('"/clinic/'+item),item+" omitted from owner navigation");
 }
 for(const language of ['"en"','"fa-AF"','"ps-AF"'])assert.ok(ui.includes(language));
 for(const component of ["ServicesPanel","ResourcesPanel","HoursPanel","WeekEditor","ExceptionPanel","PreviewPanel"]){
  assert.ok(ui.includes("function "+component+"("),"missing feature "+component);
 }
 assert.match(ui,/role="dialog"/);
 assert.match(ui,/aria-current/);
 assert.match(styles,/@media\(max-width:700px\)/);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
});
