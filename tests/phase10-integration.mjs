import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {API,origin,request,ok,key,signup,invite,
 owner,dentist,dentist2,reception,assistant,admin,clinic,unrelated,service,p1,p2}
 from "./phase07-fixture.mjs";

const root="/v1/billing/clinics/"+clinic.id;
const other="/v1/billing/clinics/"+unrelated.id;
const patient=root+"/patients/"+p1.id;
const financeLabel="Clinic root canal";
function inp(serviceId,patientId,sourceId,total=1,discount=0){
 return {patientId,sourceType:"encounter",sourceId,
  items:[{serviceId,quantity:total,discountAfn:discount}],
  dueDate:new Date(Date.now()+10*86400000).toISOString().slice(0,10),
  note:"For performed clinic care; no medical diagnoses in billing"};
}
async function signedProcedure(serviceId,label,patientId=p1.id){
 const path="/v1/clinical/clinics/"+clinic.id+"/patients/"+patientId;
 const started=ok(await request(path+"/encounters","POST",{reason:"Clinical care performed and verified"},
  dentist.session),[201],"create clinician encounter");
 const enc=path+"/encounters/"+started.id;
 ok(await request(enc,"PATCH",{revision:1,reason:"Doctor evaluated patient",
  findings:"Observations recorded privately",assessment:"Medical assessment stored in clinical domain",
  historySource:"Patient",historyDate:null,followUp:"Care reviewed",
  performedProcedures:[{description:label,serviceId,toothIds:["11"]}]},dentist.session),
  [200],"clinician records performed billed service");
 ok(await request(enc+"/sign","POST",{revision:2,confirmation:"SIGN"},dentist.session),
  [200],"clinician signs performed billing evidence");
 return started.id;
}
const cashier=await signup("cashier-ph10");
await invite(owner,clinic.id,cashier,"cashier");
const cashierCtx=ok(await request("/v1/team/context","GET",undefined,cashier.session),
 [200],"cashier sees assigned clinic");
assert.equal(cashierCtx.clinics.some(x=>x.clinicId===clinic.id&&x.role==="cashier"),true);
ok(await request(root+"/overview","GET",undefined,reception.session),
 [403],"receptionist has patient invoice access, not clinic revenue overview");
ok(await request(root+"/overview","GET",undefined,dentist.session),
 [403],"dentist lacks billing permissions");
ok(await request(root+"/invoices","GET",undefined,assistant.session),
 [403],"assistant cannot read finance");
ok(await request(root+"/invoices","GET",undefined,admin.session),
 [403],"platform administration cannot read patient finance");
ok(await request(other+"/invoices","GET",undefined,cashier.session),
 [404],"cashier from first clinic cannot access other clinic");
ok(await request(root+"/patients","GET",undefined,cashier.session),
 [200],"cashier can choose clinic patient without clinical notes");
const catalog=ok(await request(root+"/catalog","GET",undefined,cashier.session),
 [200],"cashier sees finance-safe service catalog");
assert.equal(catalog.currency,"AFN");
const priced=ok(await request("/v1/operations/clinics/"+clinic.id+"/services","POST",{
 name:"Completed root canal care",category:"Dental treatment",
 description:"Billable professional clinical service",durationMinutes:60,preparationMinutes:0,
 basePriceAfn:6000,requiresChair:true,publicBooking:false,active:true
},owner.session),[201],"owner configures 6000 AFN active service").service;
const source=await signedProcedure(priced.id,"Completed root canal care");
const available=ok(await request(patient+"/sources","GET",undefined,cashier.session),
 [200],"cashier sees only completed billable reference metadata");
assert.equal(available.sources.some(x=>x.type==="encounter"&&x.id===source&&
 x.serviceIds.includes(priced.id)),true);
assert.ok(!JSON.stringify(available).includes("Medical assessment stored in clinical domain"));
assert.ok(!JSON.stringify(available).includes("Observations recorded privately"));
ok(await request(root+"/invoices","POST",inp(priced.id,p1.id,source),dentist.session),
 [403],"dentist cannot create patient invoice");
ok(await request(root+"/invoices","POST",inp(service.id,p1.id,source),cashier.session),
 [409],"unperformed service cannot be invoiced");
ok(await request(root+"/invoices","POST",inp(priced.id,p2.id,source),cashier.session),
 [409],"cannot charge another patient's encounter");
ok(await request(root+"/invoices","POST",inp(priced.id,p1.id,source,1,500),cashier.session),
 [403],"cashier cannot invent discounts");
const created=ok(await request(root+"/invoices","POST",inp(priced.id,p1.id,source),cashier.session),
 [201],"cashier creates actual-care invoice draft");
assert.equal(created.status,"draft");
const inv=root+"/invoices/"+created.id;
let detail=ok(await request(inv,"GET",undefined,cashier.session),[200],"invoice detail");
assert.equal(detail.invoice.totalAfn,6000);
assert.equal(detail.invoice.paidAfn,0);
assert.equal(detail.invoice.status,"draft");
assert.equal(detail.items[0].unitPriceAfn,6000);
assert.equal(detail.items[0].serviceVersion,priced.version);
const snap=detail.items[0].name;
assert.equal(detail.versions.length,1);
const edited=ok(await request(inv,"PUT",{
 revision:1,items:inp(priced.id,p1.id,source).items,
 dueDate:inp(priced.id,p1.id,source).dueDate,
 note:"Corrected receptionist draft without pricing changes"
},cashier.session),[200],"edit draft with immutable new version");
assert.equal(edited.version,2);
ok(await request(inv,"PUT",{revision:1,items:inp(priced.id,p1.id,source).items},
 cashier.session),[409],"stale revision blocks silent overwrites");
detail=ok(await request(inv,"GET",undefined,cashier.session),[200],"edited invoice");
assert.equal(detail.versions.length,2);
assert.equal(detail.items[0].name,snap);
ok(await request(inv+"/issue","POST",{revision:1},reception.session),
 [409],"cannot issue stale revision");
const issued=ok(await request(inv+"/issue","POST",{revision:2},reception.session),
 [200],"reception can issue actual completed-care invoice");
assert.equal(issued.status,"issued");
ok(await request(inv+"/issue","POST",{revision:3},reception.session),
 [409],"cannot issue same invoice twice");
ok(await request(inv,"PUT",{revision:3,items:inp(priced.id,p1.id,source).items},
 cashier.session),[409],"issued line snapshot is immutable");
ok(await request(root+"/invoices","POST",inp(priced.id,p1.id,source),cashier.session),
 [409],"same source cannot be double billed");
ok(await request(inv+"/payments","POST",{
 actionKey:key(),amountAfn:0,method:"cash"},cashier.session),[422],"zero payment forbidden");
ok(await request(inv+"/payments","POST",{
 actionKey:key(),amountAfn:6001,method:"cash"},cashier.session),[409],"overpayment rejected");
ok(await request(inv+"/payments","POST",{
 actionKey:key(),amountAfn:2000,method:"cash"},reception.session),[403],
 "receptionist cannot post cash receipts");
const pKey=key(),firstPayment={
 actionKey:pKey,amountAfn:2000,method:"cash",reference:"PH10-CASH-0001",
 note:"Received at clinic front desk"};
const payment=ok(await request(inv+"/payments","POST",firstPayment,cashier.session),
 [201],"first 2000 AFN partial payment").entry;
assert.equal(payment.amountAfn,2000);
const replay=ok(await request(inv+"/payments","POST",firstPayment,cashier.session),
 [200],"duplicate post is idempotent");
assert.equal(replay.entry.id,payment.id);
assert.equal(replay.replayed,true);
ok(await request(inv+"/payments","POST",{...firstPayment,amountAfn:1500},
 cashier.session),[409],"same idempotency key cannot change amount");
ok(await request(inv+"/payments","POST",{...firstPayment,actionKey:key()},
 cashier.session),[409],"duplicate payment reference requires resolution");
let partial=ok(await request(inv,"GET",undefined,cashier.session),
 [200],"first payment reduces invoice balance");
assert.equal(partial.invoice.paidAfn,2000);
assert.equal(partial.invoice.balanceAfn,4000);
assert.equal(partial.invoice.status,"partially_paid");
const second=ok(await request(inv+"/payments","POST",{
 actionKey:key(),amountAfn:1500,method:"bank_transfer",reference:"PH10-BANK-2026",
 note:"Manually recorded bank transfer, not verified online",
 occurredAt:new Date().toISOString()},cashier.session),
 [201],"second 1500 AFN manual transfer").entry;
partial=ok(await request(inv,"GET",undefined,cashier.session),
 [200],"two partial payments");
assert.equal(partial.invoice.totalAfn,6000);
assert.equal(partial.invoice.paidAfn,3500);
assert.equal(partial.invoice.balanceAfn,2500);
assert.equal(partial.invoice.status,"partially_paid");
const stmt=ok(await request(patient+"/statement","GET",undefined,cashier.session),
 [200],"patient-scoped invoice and statement");
assert.equal(stmt.summary.totalInvoicedAfn,6000);
assert.equal(stmt.summary.totalPaidAfn,3500);
assert.equal(stmt.summary.outstandingAfn,2500);
assert.ok(!JSON.stringify(stmt).includes("Medical assessment stored in clinical domain"));
const overview=ok(await request(root+"/overview","GET",undefined,cashier.session),
 [200],"real finance overview");
assert.ok(overview.summary.outstanding>=2500);
assert.ok(overview.summary.month_collections>=3500);
const aging=ok(await request(root+"/balances","GET",undefined,cashier.session),
 [200],"receivables aging");
assert.ok(aging.balances.some(x=>x.id===created.id&&x.balanceAfn===2500));
const receipt=ok(await request(root+"/payments/"+payment.id+"/receipt","GET",undefined,cashier.session),
 [200],"printable clinic-private receipt").receipt;
assert.equal(receipt.amountAfn,2000);
assert.equal(receipt.invoiceNumber,partial.invoice.label);
assert.equal(receipt.reversed,false);
assert.equal(receipt.patientAppReleased,false);
ok(await request(root+"/payments/"+payment.id+"/receipt","GET",undefined,dentist.session),
 [403],"clinical staff cannot download receipts");
ok(await request(inv+"/void","POST",{revision:3,reason:"Wrong patient charges"},owner.session),
 [409],"cannot void invoice with payment history");
ok(await request(root+"/entries/"+second.id+"/reverse","POST",{
 actionKey:key(),reason:"Cashier posting error corrected by clinic manager"},cashier.session),
 [403],"cashier cannot reverse payment");
const reverseKey=key(),reverseBody={actionKey:reverseKey,
 reason:"Correction after reviewing the bank transfer posting"};
const reversed=ok(await request(root+"/entries/"+second.id+"/reverse","POST",
 reverseBody,owner.session),[201],"owner posts immutable compensating reversal").entry;
assert.equal(reversed.amountAfn,1500);
const reReverse=ok(await request(root+"/entries/"+second.id+"/reverse","POST",
 reverseBody,owner.session),[200],"reversal idempotency").entry;
assert.equal(reReverse.id,reversed.id);
ok(await request(root+"/entries/"+second.id+"/reverse","POST",
 {...reverseBody,actionKey:key()},owner.session),[409],"already reversed cannot be reversed again");
partial=ok(await request(inv,"GET",undefined,owner.session),[200],"reversed balance recomputed");
assert.equal(partial.invoice.paidAfn,2000);
assert.equal(partial.invoice.balanceAfn,4000);
const receiptAfter=ok(await request(root+"/payments/"+second.id+"/receipt","GET",
 undefined,owner.session),[200],"reversed bank receipt retained");
assert.equal(receiptAfter.receipt.reversed,true);
const credit=ok(await request(inv+"/credits","POST",{actionKey:key(),amountAfn:500,
 note:"Authorized patient credit for billing adjustment"},owner.session),
 [201],"owner issues documented manual credit");
assert.equal(credit.entry.kind,"credit");
partial=ok(await request(inv,"GET",undefined,owner.session),[200],"credit changes receivables");
assert.equal(partial.invoice.paidAfn,2500);
assert.equal(partial.invoice.balanceAfn,3500);
const anotherSource=await signedProcedure(priced.id,"Second separate clinical procedure");
const secondDraft=ok(await request(root+"/invoices","POST",
 inp(priced.id,p1.id,anotherSource),reception.session),[201],"reception draft second invoice");
const anotherInvoice=root+"/invoices/"+secondDraft.id;
const voidable=ok(await request(anotherInvoice+"/issue","POST",
 {revision:1},owner.session),[200],"issue second invoice");
assert.equal(voidable.status,"issued");
const voided=ok(await request(anotherInvoice+"/void","POST",
 {revision:2,reason:"Second completed care invoice prepared in error"},
 owner.session),[200],"owner voids unpaid invoice with reason");
assert.equal(voided.status,"void");
const voidedDetail=ok(await request(anotherInvoice,"GET",undefined,owner.session),
 [200],"void invoice retains version");
assert.equal(voidedDetail.invoice.status,"void");
assert.equal(voidedDetail.versions.length,1);
const list=ok(await request(root+"/invoices?status=all","GET",undefined,cashier.session),
 [200],"tenant-scoped invoice listing");
assert.ok(list.invoices.some(x=>x.id===created.id));
assert.ok(list.invoices.some(x=>x.id===secondDraft.id));
assert.ok(!JSON.stringify(list).includes("Clinical care performed and verified"));
const ledger=ok(await request(root+"/payments?kind=all","GET",undefined,cashier.session),
 [200],"real entry ledger");
assert.ok(ledger.entries.some(x=>x.kind==="reversal"));
assert.ok(ledger.entries.some(x=>x.kind==="credit"));
const check=spawnSync("pnpm",["exec","tsx","tests/phase10-immutability.ts",created.id,payment.id],
 {cwd:process.cwd(),encoding:"utf8",env:process.env});
assert.equal(check.status,0,"PH10 DB immutability failure: "+check.stderr+" "+check.stdout);
console.log("PH10_INTEGRATION_OK — 6000−2000−1500=2500, idempotency, compensating reversal, credit, invoice void rules, clinic-only finance and preserved ledger.");
