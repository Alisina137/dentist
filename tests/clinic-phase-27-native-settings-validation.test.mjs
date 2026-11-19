import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const js=ts.transpileModule(read("apps/mobile/native-clinic-phase27-model.ts"),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const module={exports:{}};
const native=read("apps/mobile/native-clinic-model.ts");
const transpile=ts.transpileModule(native,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const nativeModule={exports:{}};
new Function("module","exports",transpile)(nativeModule,nativeModule.exports);
const deps={"./native-clinic-model":nativeModule.exports};
new Function("module","exports","require",js)(module,module.exports,name=>{
 if(!deps[name])throw Error("Unexpected dependency: "+name);return deps[name];
});
const p=module.exports;
const cid="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const plan="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const invoice="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const identity=()=>({user:{id:"x".repeat(30),name:"Synthetic Owner",
 email:"owner@example.test",emailVerified:true,twoFactorEnabled:true,
 passwordHash:"PRIVATE"},locale:"fa-AF",calendar:"solar_hijri",
 adminMfaVerified:false,secret:"NOT_PUBLIC"});
const clinic=()=>({id:cid,legalName:"Synthetic Dental Clinic",
 displayName:"Synthetic Dental",clinicType:"office",province:"Kabul",
 city:"Kabul",district:null,address:"Sample Street Kabul",
 phone:"0799123456",email:"clinic@example.test",licenseNumber:null,
 plannedDentistCount:4,status:"approved",selectedPlanId:plan,
 revision:3,ownerUserId:"NOT_FOR_MOBILE"});
const selectedPlan=()=>({id:plan,label:"Professional",billingPeriod:"monthly",
 priceAfn:4500,staffLimit:15,branchLimit:1,trialDays:14,graceDays:7,active:true,
 planKey:"pro",internalCreatedBy:"PRIVATE"});
const snapshot=()=>({clinic:clinic(),subscription:{
 clinicId:cid,status:"trialing",planVersionId:plan,trialEndsAt:"2026-12-10T10:00:00.000Z",
 currentPeriodEndsAt:null,pendingPlanVersionId:null,
 secretInvoiceToken:"PRIVATE"},
 effectiveStatus:"trialing",plan:selectedPlan(),
 invoices:[{id:invoice,planVersionId:plan,amountAfn:4500,status:"awaiting",
 createdAt:"2026-11-19T02:30:00.000Z",evidenceReference:"PRIVATE_REFERENCE",
 verifiedBy:null}],documents:[{content:"PRIVATE_LICENSE"}],
 history:[{reason:"PRIVATE_LICENSE"}]});
const notification=(status="sent")=>({event_name:"requested",status,
 attempt_count:2,created_at:"2026-11-19T02:30:00Z",
 sent_at:status==="sent"?"2026-11-19T03:01:00Z":null,
 last_error_code:null,patient_name:"REDACT_ME",
 booking_id:"REDACT_BOOKING_ID",email:"PRIVATE_RECIPIENT"});
test("C27-01 profile and account preferences derive only from authenticated server response",()=>{
 const item=p.accountIdentity(identity());
 assert.deepEqual(item,{name:"Synthetic Owner",email:"owner@example.test",
  verified:true,locale:"fa-AF",calendar:"solar_hijri",twoFactorEnabled:true});
 assert.equal(JSON.stringify(item).includes("PRIVATE"),false);
 assert.equal(p.accountIdentity({...identity(),locale:"fr"}),null);
 assert.equal(p.accountIdentity({...identity(),calendar:"fake"}),null);
 assert.equal(p.accountIdentity({...identity(),user:{...identity().user,emailVerified:"true"}}),null);
 assert.equal(p.savedPreferences({locale:"ps-AF",calendar:"gregorian"},
  "ps-AF","gregorian"),true);
 assert.equal(p.savedPreferences({locale:"fa-AF",calendar:"gregorian"},
  "en","gregorian"),false);
});
test("C27-02 each clinic account may view its own sessions, never session tokens",()=>{
 const sample={id:"session_account_123456",userAgent:"Synthetic device",
 createdAt:"2026-11-19T01:01:00.000Z",updatedAt:"2026-11-19T03:01:00Z",
 expiresAt:"2026-12-01T03:01:00Z",token:"SECRET_SESSION",
 userId:"RAW_USER_ID"};
 const rows=p.parseSessions({sessions:[sample]});
 assert.equal(rows.length,1);
 assert.equal(rows[0].userAgent,"Synthetic device");
 assert.equal(JSON.stringify(rows).includes("SECRET_SESSION"),false);
 assert.equal(JSON.stringify(rows).includes("RAW_USER_ID"),false);
 assert.equal(p.parseSessions({sessions:[sample,sample]}),null);
 assert.equal(p.parseSessions({sessions:[{...sample,expiresAt:"not-date"}]}),null);
 assert.equal(p.parseSessions({sessions:[{...sample,token:"OTHER",id:"abc"}]}),null);
});
test("C27-03 notifications are status-only, clinic manager-only and redacted",()=>{
 assert.equal(p.canSeeDeliveries("owner"),true);
 assert.equal(p.canSeeDeliveries("manager"),true);
 assert.equal(p.canSeeDeliveries("dentist"),false);
 assert.equal(p.canSeeDeliveries("assistant"),false);
 const result=p.parseDeliveries({deliveries:[notification(),notification("pending")],
  emailConfigured:true,smsConfigured:false,pushConfigured:false});
 assert.equal(result.records.length,2);
 assert.equal(result.emailConfigured,true);
 assert.equal(JSON.stringify(result).includes("REDACT_ME"),false);
 assert.equal(JSON.stringify(result).includes("REDACT_BOOKING_ID"),false);
 assert.equal(JSON.stringify(result).includes("PRIVATE_RECIPIENT"),false);
 assert.deepEqual(p.deliverySummary(result),{
  total:2,sent:1,failed:0,skipped:0,queued:1});
 assert.equal(p.parseDeliveries({deliveries:[notification("invented")],
  emailConfigured:true,smsConfigured:false,pushConfigured:false}),null);
 assert.equal(p.parseDeliveries({deliveries:[notification()],emailConfigured:"yes",
  smsConfigured:false,pushConfigured:false}),null);
});
test("C27-04 owner-only clinic detail uses correct clinic scope, revision and validation",()=>{
 assert.equal(p.canEditClinic("owner"),true);
 assert.equal(p.canEditClinic("manager"),false);
 const detail=p.parseClinicSettings(snapshot(),cid);
 assert.ok(detail);
 assert.equal(detail.fields.displayName,"Synthetic Dental");
 assert.equal(detail.fields.plannedDentistCount,"4");
 assert.equal(detail.revision,3);
 assert.equal(detail.subscription.status,"trialing");
 assert.equal(detail.plan.priceAfn,4500);
 assert.equal(detail.invoices[0].status,"awaiting");
 assert.equal(JSON.stringify(detail).includes("PRIVATE_LICENSE"),false);
 assert.equal(JSON.stringify(detail).includes("PRIVATE_REFERENCE"),false);
 const payload=p.clinicUpdatePayload(detail,detail.fields);
 assert.equal(payload.revision,3);
 assert.equal(payload.selectedPlanId,plan);
 assert.equal(payload.plannedDentistCount,4);
 assert.ok(!("ownerUserId" in payload));
 assert.equal(p.parseClinicSettings(snapshot(),"dddddddd-dddd-4ddd-8ddd-dddddddddddd"),null);
 assert.equal(p.parseClinicSettings({...snapshot(),clinic:{...clinic(),revision:0}},cid),null);
 assert.equal(p.parseClinicSettings({...snapshot(),clinic:{...clinic(),email:"invalid"}},cid),null);
 assert.equal(p.parseUpdatedClinic({clinic:{id:cid,revision:4,displayName:"New"}},detail),true);
 assert.equal(p.parseUpdatedClinic({clinic:{id:cid,revision:3,displayName:"New"}},detail),false);
});
test("C27-05 published plans, payment references and invoice request confirmation",()=>{
 const list=p.parsePlans({plans:[selectedPlan()]});
 assert.equal(list.length,1);
 assert.equal(JSON.stringify(list).includes("PRIVATE"),false);
 assert.equal(p.paymentReference(" PAY-882920 "),"PAY-882920");
 assert.equal(p.paymentReference("a\nbcdef"),null);
 assert.equal(p.paymentReference("bad"),null);
 assert.deepEqual(p.paymentPayload(plan,"PAY-882920",list),{
  planVersionId:plan,evidenceReference:"PAY-882920"});
 assert.equal(p.paymentPayload(cid,"PAY-882920",list),null);
 assert.equal(p.paymentPayload(plan,"xxx",list),null);
 assert.deepEqual(p.parsePaymentReceipt({invoiceId:invoice,status:"awaiting",
  amountAfn:4500,secret:"PRIVATE"},list[0]),
  {invoiceId:invoice,status:"awaiting",amountAfn:4500});
 assert.equal(p.parsePaymentReceipt({invoiceId:invoice,status:"approved",
  amountAfn:4500},list[0]),null);
 assert.equal(p.parsePaymentReceipt({invoiceId:invoice,status:"awaiting",
  amountAfn:100},list[0]),null);
 assert.equal(p.parsePlans({plans:[selectedPlan(),selectedPlan()]}),null);
});
test("C27-06 integration: account uses actual APIs, all-device revoke, server-verified writes",()=>{
 const ui=read("apps/mobile/native-clinic-phase27.tsx");
 const model=read("apps/mobile/native-clinic-phase27-model.ts");
 const shell=read("apps/mobile/native-clinic.tsx");
 const staff=read("apps/api/src/phase03.ts");
 const clinic=read("apps/api/src/phase02.ts");
 const book=read("apps/api/src/patient-booking-router.ts");
 const server=read("apps/api/src/server.ts");
 assert.match(shell,/NativeClinicPhase27/);
 assert.doesNotMatch(shell,/tab==="team"[\s\S]*?t\.setupTitle[\s\S]*?t\.settings[\s\S]*?t\.switch/);
 assert.match(ui,/\/v1\/me\/preferences/);
 assert.match(ui,/\/v1\/team\/sessions/);
 assert.match(ui,/\/v1\/team\/sessions\/revoke/);
 assert.match(ui,/\/v1\/booking\/clinics\//);
 assert.match(ui,/\/subscription\/request/);
 assert.match(ui,/clinicUpdatePayload/);
 assert.match(ui,/parsePaymentReceipt/);
 assert.match(ui,/AppState.addEventListener/);
 assert.match(ui,/Promise\.allSettled/);
 assert.match(ui,/\.abort\(\)/);
 assert.match(ui,/onSignOut/);
 assert.match(ui,/uncertain/);
 assert.doesNotMatch(ui,/SecureStore|AsyncStorage|localStorage|console\.log/);
 assert.match(model,/clinicRegistrationPayload/);
 assert.match(staff,/router\.post\("\/sessions\/revoke"/);
 assert.match(staff,/await revokeSessions\(tx,req\.actor!\.id\)/);
 assert.match(book,/staff\.get\("\/notifications"/);
 assert.match(book,/\["owner","manager"\]/);
 assert.match(clinic,/api\.get\("\/clinics\/:id"/);
 assert.match(clinic,/api\.patch\("\/clinics\/:id"/);
 assert.match(clinic,/STALE_REVISION/);
 assert.match(clinic,/INVOICE_ALREADY_PENDING/);
 assert.match(server,/app\.put\("\/v1\/me\/preferences"/);
});
