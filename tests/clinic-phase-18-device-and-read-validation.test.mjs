import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const js=ts.transpileModule(read("packages/ui-web/src/clinic-readonly.ts"),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const mod={exports:{}};
new Function("module","exports",js)(mod,mod.exports);
const {clinicReadJson}=mod.exports;
const ok=payload=>new Response(JSON.stringify(payload),{
 status:200,headers:{"Content-Type":"application/json; charset=utf-8"}
});

test("Clinic Phase 18: GET is private, no-store, no redirect, no write or automatic retry",async()=>{
 let requests=0;
 const fetcher=async (url,options)=>{
  requests++;
  assert.equal(url,"https://api.test/v1/billing/synthetic");
  assert.equal(options.method,"GET");
  assert.equal(options.credentials,"include");
  assert.equal(options.cache,"no-store");
  assert.equal(options.redirect,"error");
  assert.equal(options.headers.Accept,"application/json");
  assert.equal(options.body,undefined);
  return ok({invoices:[],total:0});
 };
 assert.deepEqual(await clinicReadJson("https://api.test/v1/billing/synthetic",undefined,100,fetcher),
  {invoices:[],total:0});
 assert.equal(requests,1);
});

test("Clinic Phase 18: fail closed without rendering untrusted response text",async()=>{
 const base="https://api.test/anything";
 for(const [status,code] of [[401,"AUTH_REQUIRED"],[403,"FORBIDDEN"],
  [409,"CONFLICT"],[503,"NETWORK_ERROR"]]){
  await assert.rejects(
   clinicReadJson(base,undefined,100,async()=>new Response(
    JSON.stringify({message:"private patient",code:"CONFIDENTIAL"}),{
     status,headers:{"content-type":"application/json"}
    })),new RegExp(code));
 }
 await assert.rejects(clinicReadJson(base,undefined,100,async()=>new Response(
  "<html>ngrok browser warning</html>",{headers:{"content-type":"text/html"}})),/NETWORK_ERROR/);
 await assert.rejects(clinicReadJson(base,undefined,100,async()=>new Response(
  "{bad",{headers:{"content-type":"application/json"}})),/NETWORK_ERROR/);
 await assert.rejects(clinicReadJson(base,undefined,100,async()=>ok([])),/NETWORK_ERROR/);
});

test("Clinic Phase 18: aborted and timed-out GETs never return stale responses",async()=>{
 const controller=new AbortController();
 let calls=0;
 const pending=async (_url,options)=>{
  calls++;
  return await new Promise((_resolve,reject)=>{
   const cancel=()=>reject(Object.assign(new Error("Aborted"),{name:"AbortError"}));
   options.signal.addEventListener("abort",cancel,{once:true});
   if(options.signal.aborted)cancel();
  });
 };
 const request=clinicReadJson("https://api.test/patient",controller.signal,100,pending);
 controller.abort();
 await assert.rejects(request,/REQUEST_CANCELLED/);
 await assert.rejects(clinicReadJson("https://api.test/patient",undefined,10,pending),/REQUEST_TIMEOUT/);
 assert.equal(calls,2);
});

test("Clinic Phase 18: schedule and finance reuse shell and keep narrow screens keyboard-accessible",()=>{
 const schedule=read("packages/ui-web/src/phase06.tsx");
 const billing=read("packages/ui-web/src/phase10.tsx");
 const layout=read("apps/clinic-web/app/clinic/layout.tsx");
 const css=read("apps/clinic-web/app/clinic/clinic-phase18-responsive.css");
 for(const source of [schedule,billing]){
  assert.match(source,/useClinicWorkspaceSession/);
  assert.match(source,/clinicReadJson/);
  assert.match(source,/controller\.abort\(\)/);
  assert.match(source,/clinic-phase18-scroll-region/);
  assert.match(source,/tabIndex=\{0\}/);
  assert.match(source,/if\(method==="GET"&&body===undefined\)/);
 }
 assert.match(layout,/clinic-phase18-responsive\.css/);
 assert.match(css,/@media\(max-width:375px\)/);
 assert.match(css,/focus-visible/);
});
