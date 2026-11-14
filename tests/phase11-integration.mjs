import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {API,origin,request,ok,key,signup,invite,owner,dentist,reception,assistant,admin,
 clinic,unrelated,service,p1} from "./phase07-fixture.mjs";

const root="/v1/expenses/clinics/"+clinic.id,expenses=root+"/expenses";
const billing="/v1/billing/clinics/"+clinic.id;
const thisDay=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kabul",year:"numeric",
 month:"2-digit",day:"2-digit"}).format(new Date());
const day=/^\d{4}-\d{2}-\d{2}$/.test(thisDay)?thisDay:
 Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",year:"numeric",
 month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(x=>[x.type,x.value])).year+
 "-"+new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",month:"2-digit"}).format(new Date())+
 "-"+new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",day:"2-digit"}).format(new Date());
const qs="from="+day+"&to="+day;
const action=(date,category,amountAfn,description,extra={})=>({
 date,category,amountAfn,description,paymentMethod:"cash",reference:null,attribution:null,
 actionKey:key(),receipt:null,removeReceipt:false,...extra
});
const cashier=await signup("cashier-ph11");
await invite(owner,clinic.id,cashier,"cashier");
const signed=ok(await request("/v1/clinical/clinics/"+clinic.id+"/patients/"+p1.id+
 "/encounters","POST",{reason:"Performed treatment prior to collecting fees"},
 dentist.session),[201],"create signed clinical evidence for income comparison");
const enc="/v1/clinical/clinics/"+clinic.id+"/patients/"+p1.id+"/encounters/"+signed.id;
ok(await request(enc,"PATCH",{revision:1,reason:"Actual performed service",
 findings:"Private clinical observations",assessment:"Confidential clinical diagnosis",
 historySource:"Patient",historyDate:null,followUp:"Review",performedProcedures:[
 {description:"Clinic consultation performed",serviceId:service.id,toothIds:[]}
]},dentist.session),[200],"record actual performed visit");
ok(await request(enc+"/sign","POST",{revision:2,confirmation:"SIGN"},dentist.session),
 [200],"sign performed evidence");
const invoice=ok(await request(billing+"/invoices","POST",{
 patientId:p1.id,sourceType:"encounter",sourceId:signed.id,
 items:[{serviceId:service.id,quantity:1,discountAfn:0}],dueDate:null,note:null
},cashier.session),[201],"create finance invoice independently of expenses");
ok(await request(billing+"/invoices/"+invoice.id+"/issue","POST",{revision:1},
 cashier.session),[200],"issue bill");
ok(await request(billing+"/invoices/"+invoice.id+"/payments","POST",{
 actionKey:key(),amountAfn:200,method:"cash",reference:"PH11-CASH-01"
},cashier.session),[201],"record real cash collection");
const before=ok(await request(billing+"/invoices/"+invoice.id,"GET",undefined,cashier.session),
 [200],"patient balance before expenses");
assert.equal(before.invoice.paidAfn,200);
assert.equal(before.invoice.balanceAfn,service.basePriceAfn-200);
ok(await request(expenses,"GET",undefined,reception.session),[403],"reception must not view costs");
ok(await request(expenses,"GET",undefined,dentist.session),[403],"dentist cannot view payroll/costs");
ok(await request(expenses,"GET",undefined,assistant.session),[403],"assistant cannot view costs");
ok(await request(expenses,"GET",undefined,admin.session),[403],"platform admin cannot view cost ledger");
ok(await request("/v1/expenses/clinics/"+unrelated.id+"/expenses","GET",
 undefined,cashier.session),[404],"cross tenant cashier blocked");
ok(await request(expenses,"POST",action(day,"rent",-500,"Negative test amount"),
 cashier.session),[422],"negative amount rejected");
ok(await request(expenses,"POST",action(day,"rent",0,"Zero test amount"),
 cashier.session),[422],"zero amount rejected");
ok(await request(expenses,"POST",action(day,"not_category",200,"Unknown cost category"),
 cashier.session),[422],"unknown category rejected");
ok(await request(expenses,"POST",action(day,"rent",300,"Rejected image receipt",{
 receipt:{fileName:"bad.png",mimeType:"image/png",contentBase64:Buffer.from("not a PNG")
 .toString("base64")}
}),cashier.session),[415],"fake receipt signature forbidden");
const proof=Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
const receipt={fileName:"rent-receipt.pdf",mimeType:"application/pdf",
 contentBase64:proof.toString("base64")};
const firstBody=action(day,"rent",800,"Monthly clinic premises rent",{
 paymentMethod:"bank_transfer",reference:"PH11-RENT-01",attribution:"Kabul branch",
 receipt});
const rent=ok(await request(expenses,"POST",firstBody,cashier.session),
 [201],"cashier records clinic rent with PDF proof").expense;
assert.equal(rent.revision,1);
assert.ok(rent.receiptId);
assert.equal(rent.amountAfn,800);
const replay=ok(await request(expenses,"POST",firstBody,cashier.session),
 [200],"identical expense create replayed");
assert.equal(replay.expense.id,rent.id);
assert.equal(replay.replayed,true);
ok(await request(expenses,"POST",{...firstBody,amountAfn:801},cashier.session),
 [409],"same action key with different payload refused");
const document=await fetch(API+expenses+"/"+rent.id+"/receipts/"+rent.receiptId,{
 headers:{origin,cookie:cashier.session}});
assert.equal(document.status,200);
assert.equal(document.headers.get("cache-control"),"private, no-store");
assert.equal(document.headers.get("content-type"),"application/pdf");
assert.deepEqual(Buffer.from(await document.arrayBuffer()),proof);
ok(await request(expenses+"/"+rent.id+"/receipts/"+rent.receiptId,"GET",undefined,
 reception.session),[403],"reception cannot download expense receipt");
ok(await request(expenses+"/"+rent.id+"/receipts/"+rent.receiptId,"GET",undefined,
 dentist.session),[403],"dentist cannot view expense receipts");
const supplies=ok(await request(expenses,"POST",action(day,"supplies",300,
 "Disposable clinical supply purchase",{reference:"PH11-SUP-01",attribution:"Supply desk"}),
 cashier.session),[201],"cashier records supplies").expense;
const filtered=ok(await request(expenses+"?"+qs+"&category=rent","GET",undefined,
 cashier.session),[200],"rent category filter");
assert.equal(filtered.expenses.length,1);
assert.equal(filtered.expenses[0].id,rent.id);
const methods=ok(await request(expenses+"?"+qs+"&method=bank_transfer","GET",undefined,
 cashier.session),[200],"expense method filter");
assert.equal(methods.expenses.length,1);
const list=ok(await request(expenses+"?"+qs,"GET",undefined,owner.session),
 [200],"owner views period-scoped expense register");
assert.equal(list.expenses.length,2);
assert.ok(!JSON.stringify(list).includes("Confidential clinical diagnosis"));
const summary=ok(await request(expenses+"/summary?"+qs,"GET",undefined,owner.session),
 [200],"owner sees reconciled income/expense comparison");
assert.equal(summary.summary.expense_total_afn,1100);
assert.equal(summary.summary.expense_count,2);
assert.equal(summary.summary.net_collections_afn,200);
assert.equal(summary.summary.net_after_expenses_afn,-900);
assert.equal(summary.categories.find(x=>x.category==="rent").total_afn,800);
assert.equal(summary.netAfterExpensesIsNotProfit,true);
const cashView=ok(await request(expenses+"/summary?"+qs,"GET",undefined,cashier.session),
 [200],"cashier sees period totals");
assert.equal(cashView.categories.length,0,"only owner/manager see grouped cost reporting");
ok(await request(expenses+"/summary?from=2026-01-20&to=2025-01-20","GET",undefined,
 owner.session),[422],"invalid date period rejected");
const past=new Date(Date.parse(day+"T00:00:00Z")-86400000).toISOString().slice(0,10);
const priorPeriod=ok(await request(expenses+"/summary?from="+past+"&to="+past,
 "GET",undefined,owner.session),[200],"prior-day period has no costs");
assert.equal(priorPeriod.summary.expense_total_afn,0);
ok(await request(expenses+"/"+rent.id,"PUT",{...firstBody,revision:1,
 reason:"short",actionKey:key()},cashier.session),[422],"correction needs reason");
ok(await request(expenses+"/"+rent.id,"PUT",{...firstBody,revision:8,
 reason:"Correct allocation after confirmed statement",actionKey:key()},cashier.session),
 [409],"stale revision cannot rewrite expense");
const correctedBody={...firstBody,actionKey:key(),revision:1,amountAfn:900,
 receipt:null,reason:"Bank statement confirmed corrected premises rent amount"};
const corrected=ok(await request(expenses+"/"+rent.id,"PUT",correctedBody,cashier.session),
 [200],"cashier corrects amount with permanent history").expense;
assert.equal(corrected.revision,2);
assert.equal(corrected.amountAfn,900);
assert.equal(corrected.receiptId,rent.receiptId,"correction retains original receipt association");
const correctionReplay=ok(await request(expenses+"/"+rent.id,"PUT",correctedBody,cashier.session),
 [200],"identical correction replayed without duplicate version");
assert.equal(correctionReplay.replayed,true);
const detail=ok(await request(expenses+"/"+rent.id,"GET",undefined,owner.session),
 [200],"owner inspects original and corrected expense versions");
assert.deepEqual(detail.history.map(h=>h.action),["corrected","created"]);
assert.equal(detail.history[0].amount_afn,900);
assert.equal(detail.history[1].amount_afn,800);
assert.match(detail.history[0].correction_reason,/Bank statement confirmed/);
const newSummary=ok(await request(expenses+"/summary?"+qs,"GET",undefined,owner.session),
 [200],"correction only counts latest amount");
assert.equal(newSummary.summary.expense_total_afn,1200);
assert.equal(newSummary.summary.net_after_expenses_afn,-1000);
ok(await request(expenses+"/"+supplies.id+"/void","POST",{
 revision:1,reason:"Original purchase invoice was cancelled",actionKey:key()
},cashier.session),[403],"cashier cannot void posted expenses");
const voidBody={revision:1,reason:"Duplicate supplies cost entered during closing",actionKey:key()};
const voided=ok(await request(expenses+"/"+supplies.id+"/void","POST",voidBody,
 owner.session),[200],"owner voids expense preserving source").expense;
assert.equal(voided.status,"void");
const voidAgain=ok(await request(expenses+"/"+supplies.id+"/void","POST",voidBody,
 owner.session),[200],"idempotent void replay");
assert.equal(voidAgain.replayed,true);
ok(await request(expenses+"/"+supplies.id,"PUT",{...firstBody,revision:2,
 reason:"Cannot correct a voided expense",actionKey:key()},owner.session),
 [409],"voided expense cannot be edited");
const finalSum=ok(await request(expenses+"/summary?"+qs,"GET",undefined,owner.session),
 [200],"void excludes current expense totals");
assert.equal(finalSum.summary.expense_total_afn,900);
assert.equal(finalSum.summary.net_after_expenses_afn,-700);
const voidHistory=ok(await request(expenses+"/"+supplies.id,"GET",undefined,owner.session),
 [200],"void history remains");
assert.deepEqual(voidHistory.history.map(h=>h.action),["voided","created"]);
const after=ok(await request(billing+"/invoices/"+invoice.id,"GET",undefined,cashier.session),
 [200],"patient bill unchanged by expenses or voids");
assert.equal(after.invoice.balanceAfn,before.invoice.balanceAfn);
assert.equal(after.invoice.paidAfn,before.invoice.paidAfn);
const check=spawnSync("pnpm",["exec","tsx","tests/phase11-immutability.ts",
 rent.id,supplies.id,rent.receiptId],{cwd:process.cwd(),encoding:"utf8",env:process.env});
assert.equal(check.status,0,"PH11 history DB guard failed: "+check.stderr+" "+check.stdout);
console.log("PH11_INTEGRATION_OK — rent + supplies by date/category, audited corrections, void, private PDF, cash comparison, tenant ACL, no invoice balance impact.");
