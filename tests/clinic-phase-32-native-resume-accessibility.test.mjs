import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {makeChecklist,validateChecklist,caseIds,oses,workspaces,locales,scenarios}
 from "../scripts/phase32-device-accessibility-check.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const raw=read("apps/mobile/native-session-lifecycle.ts");
const js=ts.transpileModule(raw,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
}}).outputText;
const model={exports:{}};
new Function("module","exports",js)(model,model.exports);
const {nativeSessionVisibilityAction,privateResumePermitted}=model.exports;

test("C32-01 2-workspace privacy boundaries wipe on suspend and revalidate on resume",()=>{
 for(const from of ["inactive","background","unknown"]){
  assert.equal(nativeSessionVisibilityAction(from,"active",true),"revalidate");
 }
 for(const dest of ["inactive","background","unknown"]){
  assert.equal(nativeSessionVisibilityAction("active",dest,true),"hide");
 }
 for(const dest of ["active","inactive","background"]){
  assert.equal(nativeSessionVisibilityAction(dest,dest,true),"none");
 }
 assert.equal(nativeSessionVisibilityAction("active","background",false),"none");
 assert.equal(nativeSessionVisibilityAction("background","active",false),"none");
 assert.equal(nativeSessionVisibilityAction("inactive","background",true),"none");
});
test("C32-02 session recovery needs verified identity and live authorized workspace",()=>{
 for(const token of [false,true]){
  for(const verified of [false,true]){
   for(const authorized of [false,true]){
    assert.equal(privateResumePermitted(token,verified,authorized),
     token&&verified&&authorized);
   }
  }
 }
 assert.equal(privateResumePermitted("true",true,true),false);
 assert.equal(privateResumePermitted(true,true,"yes"),false);
});
test("C32-03 patient foreground recovery clears account before server auth validation",()=>{
 const source=read("apps/mobile/native-auth.tsx");
 const app=read("apps/mobile/App.tsx");
 assert.match(source,/AppState\.addEventListener\("change"/);
 assert.match(source,/nativeSessionVisibilityAction/);
 assert.match(source,/sessionGeneration\.current\+\+/);
 assert.match(source,/setAccount\(null\);setOnlineError\(null\);setLoading\(true\)/);
 assert.match(source,/void refresh\(\)\.finally/);
 assert.match(source,/\/api\/auth\/get-session/);
 assert.match(source,/\/v1\/patients\/me/);
 assert.match(source,/switchWorkspace=useCallback/);
 assert.match(source,/await SecureStore\.deleteItemAsync\(TOKEN_KEY\)/);
 assert.match(source,/void requestRaw\("\/api\/auth\/sign-out"/);
 assert.match(app,/native\.switchWorkspace\(\)\.then\(onChangeWorkspace\)/);
 assert.match(app,/if\(viewIdentity!==identityKey\)/);
 assert.doesNotMatch(app,/native\.signOut\(\)\.catch\(\(\)=>\{\}\)\.finally\(onChangeWorkspace\)/);
});
test("C32-04 clinic session recovery checks current role, clinic and MFA context",()=>{
 const source=read("apps/mobile/native-clinic.tsx");
 assert.match(source,/AppState\.addEventListener\("change"/);
 assert.match(source,/nativeSessionVisibilityAction/);
 assert.match(source,/generation\.current\+\+/);
 assert.match(source,/setToken\(null\);setContext\(null\);setSelected\(null\);setRecords\(\[\]\)/);
 assert.match(source,/await refreshSession\(bearer\)/);
 assert.match(source,/validClinicContext\(profile\.data\)/);
 assert.match(source,/EMAIL_VERIFICATION_REQUIRED/);
 assert.match(source,/setRecovering\(true\)/);
 assert.match(source,/if\(boot\|\|recovering\)/);
 assert.match(source,/await SecureStore\.deleteItemAsync\(TOKEN_KEY\)/);
 assert.match(source,/else\{\s*setError\(i18n\[locale\]\.network\)/);
 assert.match(source,/tokenRef\.current&&<Card>/);
});
test("C32-05 multilingual workspace onboarding supports screen readers, 44dp and large type",()=>{
 const choice=read("apps/mobile/native-workspace-choice.tsx");
 const app=read("apps/mobile/App.tsx");
 const clinic=read("apps/mobile/native-clinic.tsx");
 for(const locale of ["en","fa-AF","ps-AF"])assert.ok(choice.includes('"'+locale+'":')||choice.includes(locale+':'));
 assert.match(choice,/useWindowDimensions\(\)/);
 assert.match(choice,/fontScale>=1\.3/);
 assert.match(choice,/accessibilityRole="header"/);
 assert.match(choice,/accessibilityRole="radio"/);
 assert.match(choice,/accessibilityState=\{\{checked:selection==="patient"\}\}/);
 assert.match(choice,/accessibilityState=\{\{checked:selection==="clinic"\}\}/);
 assert.match(choice,/minHeight:44,minWidth:44/);
 assert.match(choice,/workspaceWrites\.current=workspaceWrites\.current\.catch/);
 assert.match(app,/accessibilityLabel=\{ui\.t\("findLabel"\)\}/);
 assert.match(app,/minWidth:44,minHeight:44/);
 assert.match(app,/expandedType\?2:1/);
 assert.match(clinic,/expandedType\?2:1/);
 assert.match(clinic,/flexDirection:rtl\?"row-reverse":"row"/);
 assert.match(clinic,/minHeight:44/);
});
test("C32-06 all 96 physical-device UX checks default NOT_RUN and PH19 is false",()=>{
 const document=makeChecklist();
 assert.equal(caseIds.length,oses.length*workspaces.length*locales.length*scenarios.length);
 assert.equal(caseIds.length,96);
 assert.equal(new Set(caseIds).size,96);
 const result=validateChecklist(document);
 assert.deepEqual(result.stats,{NOT_RUN:96,PASS:0,FAIL:0,BLOCKED:0});
 assert.equal(result.complete,false);
 assert.equal(result.releaseApproval,false);
 const gate=read("apps/api/src/pilot-gate.ts");
 assert.match(gate,/PH19_PENETRATION_TEST_APPROVED/);
 assert.match(gate,/PH19_ACCESSIBILITY_RTL_APPROVED/);
});
test("C32-07 proof cannot include secrets, URL, screenshot, duplicate ID or false PASS",()=>{
 const document=makeChecklist();
 document.cases[0].status="PASS";
 assert.throws(()=>validateChecklist(document),/sanitized ticket/);
 document.cases[0].ticket="PH32_TEST_ABC123";
 document.cases[0].observedAt="2026-11-19T09:00:00.000Z";
 assert.equal(validateChecklist(document,Date.parse("2026-11-19T12:00:00.000Z")).remaining,95);
 for(const bad of [
  "https://example.org/ticket/12","cookie=value","Screenshot: abc",
  "123456","EMAIL:user@example.org"
 ]){
  document.cases[0].ticket=bad;
  assert.throws(()=>validateChecklist(document),/sanitized ticket/);
 }
 document.cases[0].ticket="PH32_TEST_ABC123";
 document.cases[0].code="123456";
 assert.throws(()=>validateChecklist(document),/device evidence fields/);
 delete document.cases[0].code;
 document.cases[1].id=document.cases[0].id;
 assert.throws(()=>validateChecklist(document),/duplicate/);
 document.cases[1].id=caseIds[1];
 document.releaseApproval=true;
 assert.throws(()=>validateChecklist(document),/Invalid Phase32/);
});
test("C32-08 checklist rejects future or invalid timestamps, incomplete human evidence",()=>{
 const sample=makeChecklist();
 sample.cases.forEach((c,i)=>{
  c.status="PASS";c.ticket="PH32_CASE_"+String(i).padStart(6,"0");
  c.observedAt="2026-11-19T09:00:00.000Z";
 });
 const now=Date.parse("2026-11-19T12:00:00.000Z");
 assert.equal(validateChecklist(sample,now).complete,true);
 assert.equal(validateChecklist(sample,now).releaseApproval,false);
 sample.cases[0].observedAt="2060-01-01T00:00:00.000Z";
 assert.throws(()=>validateChecklist(sample,now),/witnessed UTC/);
 sample.cases[0].status="BLOCKED";
 sample.cases[0].ticket="";
 sample.cases[0].observedAt="";
 assert.equal(validateChecklist(sample,now).complete,false);
});
