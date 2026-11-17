import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 clinicFinanceTab,clinicInvoiceLineIssue,clinicKabulDateTimeInput,
 clinicKabulInputToIso,clinicCsvSafeCell,clinicCsvRows,
 clinicFinancialNet,clinicCanEnterPayment
} from "../packages/ui-web/src/clinic-finance-model.ts";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const ui=read("packages/ui-web/src/phase10.tsx");
const api=read("apps/api/src/billing-router.ts");
const shell=read("apps/clinic-web/app/clinic/layout.tsx");
const css=read("apps/clinic-web/app/clinic/clinic-finance.css");

test("Clinic Phase 12: financial tab selection obeys staff roles and carries authorized clinic URL",()=>{
 assert.equal(clinicFinanceTab("overview",true),"overview");
 assert.equal(clinicFinanceTab("balances",true),"balances");
 assert.equal(clinicFinanceTab("payments",true),"payments");
 assert.equal(clinicFinanceTab("expenses",true),"expenses");
 assert.equal(clinicFinanceTab("invoices",true),"invoices");
 assert.equal(clinicFinanceTab("invoices",false),"invoices");
 assert.equal(clinicFinanceTab("payments",false),"invoices");
 assert.equal(clinicFinanceTab("balances",false),"invoices");
 assert.equal(clinicFinanceTab("expenses",false),"invoices");
 assert.equal(clinicFinanceTab("../other",true),"overview");
 for(const marker of [
  'const canOverview=["owner","manager","cashier"].includes(space.role)',
  'const allowed:ClinicFinanceTab[]=canOverview?',
  '["overview","invoices","payments","balances","expenses"]:["invoices"]',
  'history.replaceState(null,"",financeHref(space.clinicId,target))',
  'aria-controls="clinic-phase12-finance-panel"',
  'role="tabpanel" aria-label={t(tab)}',
  'const space=selected?ctx.clinics.find(x=>x.clinicId===selected):ctx.clinics[0]',
  '["owner","manager","cashier","receptionist"].includes(space.role)',
  'const controller=new AbortController()',
  'api(path,"GET",undefined,controller.signal)',
  'return()=>{controller.abort();};',
  'data:snapshot.path===path?snapshot.data:null',
  'setTab(clinicFinanceTab(new URLSearchParams(location.search).get("tab"),canOverview))'
 ])assert.ok(ui.includes(marker),marker);
 assert.ok(!ui.includes("localStorage.setItem("));
 assert.ok(!ui.includes("sessionStorage.setItem("));
 for(const marker of [
  'const canRead=(role:string)=>["owner","manager","cashier","receptionist"]',
  'const canPost=(role:string)=>["owner","manager","cashier"]',
  'const canReverse=(role:string)=>["owner","manager"]',
  'if(!allowed)fail(403,"BILLING_ROLE_DENIED")',
  'const ctx=await scope(req,cid(req))'
 ])assert.ok(api.includes(marker),marker);
});

test("Clinic Phase 12: Kabul transaction date is timezone accurate and rejects invalid, future or stale timestamps",()=>{
 const now=new Date("2026-11-17T05:01:00.000Z");
 assert.equal(clinicKabulDateTimeInput(new Date("2026-11-17T05:00:00Z")),
  "2026-11-17T09:30");
 assert.equal(clinicKabulInputToIso("2026-11-17T09:30",now),
  "2026-11-17T05:00:00.000Z");
 assert.equal(clinicKabulDateTimeInput(new Date("2026-01-01T20:00:00Z")),
  "2026-01-02T00:30");
 for(const value of ["invalid","2026-02-30T09:30","2026-11-17T09:99",
  "2026-11-17T12:30","2024-06-10T10:30","2026-11-17T05:00Z"]){
  assert.throws(()=>clinicKabulInputToIso(value,now),RangeError,value);
 }
 assert.throws(()=>clinicKabulDateTimeInput(new Date("invalid")),RangeError);
 for(const marker of [
  'clinicKabulDateTimeInput()',
  'clinicKabulInputToIso(occurredAt)',
  'kind==="payment"&&paymentIso===null',
  'financeDateZone:"Afghanistan time (UTC+04:30)"',
  'financeDateZone:"وقت افغانستان (UTC+04:30)"',
  'financeDateZone:"د افغانستان وخت (UTC+04:30)"'
 ])assert.ok(ui.includes(marker),marker);
 assert.ok(api.includes("INVALID_PAYMENT_DATE"));
});

test("Clinic Phase 12: invoice editor mirrors clinic draft constraints while backend remains authoritative",()=>{
 const priceOf=id=>({a:1000,b:2000})[id];
 const line=(serviceId="a",quantity=1,discountAfn=0)=>({serviceId,quantity,discountAfn});
 assert.equal(clinicInvoiceLineIssue([line()],priceOf,true),null);
 assert.equal(clinicInvoiceLineIssue([line("a",2,600)],priceOf,true),null);
 assert.equal(clinicInvoiceLineIssue([line("a",2,601)],priceOf,true),"DISCOUNT_EXCEEDS_POLICY");
 assert.equal(clinicInvoiceLineIssue([line("a",1,1)],priceOf,false),"DISCOUNT_REQUIRES_OWNER");
 assert.equal(clinicInvoiceLineIssue([line("a"),line("a")],priceOf,true),"DUPLICATE_SERVICE_LINE");
 assert.equal(clinicInvoiceLineIssue([line("")],priceOf,true),"MISSING_SERVICE");
 assert.equal(clinicInvoiceLineIssue([line("unknown")],priceOf,true),"MISSING_SERVICE");
 assert.equal(clinicInvoiceLineIssue([line("a",0)],priceOf,true),"INVALID_QUANTITY");
 assert.equal(clinicInvoiceLineIssue([line("a",21)],priceOf,true),"INVALID_QUANTITY");
 assert.equal(clinicInvoiceLineIssue([line("a",1,-5)],priceOf,true),"INVALID_DISCOUNT");
 assert.equal(clinicInvoiceLineIssue([],priceOf,true),"INVOICE_AMOUNT_LIMIT");
 for(const marker of [
  'const priceOf=(id:string)=>',
  'const lineIssue=clinicInvoiceLineIssue(items,priceOf,canDiscount)',
  'if(lineIssue||!catalog.data||!patientId||(!original&&!sourceId)',
  'discountAfn:0',
  'max={Math.min(10000000,Math.floor(unit*x.quantity*0.3))}',
  'disabled={!canDiscount||busy}',
  'disabled={busy||Boolean(lineIssue)||total<=0||total>2000000000||',
  'financeEstimateWarning:"Displayed amounts use current catalog prices',
  'financeEstimateWarning:"مبلغ نمایشی',
  'financeEstimateWarning:"ښودل شوې بیه',
  'sourceId',
  'selectedSource?.serviceIds.includes(s.id)',
  'original?.items.find'
 ])assert.ok(ui.includes(marker),marker);
 for(const marker of [
  'UNPERFORMED_SERVICE_CANNOT_BE_CHARGED',
  'DISCOUNT_EXCEEDS_POLICY','DUPLICATE_SERVICE_LINE',
  'DISCOUNT_REQUIRES_OWNER','INVOICE_AMOUNT_LIMIT',
  'SIGNED_ENCOUNTER_REQUIRED','COMPLETED_STAGE_REQUIRED',
  'COMPLETED_APPOINTMENT_REQUIRED',
  'ISSUED_INVOICE_IMMUTABLE',
  'STALE_INVOICE_REVISION'
 ])assert.ok(api.includes(marker),marker);
});

test("Clinic Phase 12: manual payments and credits require explicit reviewed confirmation, remain idempotent",()=>{
 assert.equal(clinicCanEnterPayment(800,200),true);
 for(const args of [[800,801],[800,-1],[800,0],[800,1.5],[0,0],[100,NaN],[100,Infinity]])
  assert.equal(clinicCanEnterPayment(...args),false,JSON.stringify(args));
 for(const marker of [
  'const key=actionKey||crypto.randomUUID();setActionKey(key)',
  'if(busy||!review||!reviewed||!valid)return',
  'actionKey:key,amountAfn:numeric',
  'occurredAt:paymentIso',
  'setActionKey("");setReview(false);setReviewed(false)',
  'setReview(true)',
  'setError(ex instanceof Error?ex.message:"NETWORK_ERROR")',
  'role="alertdialog" aria-modal="true"',
  'aria-labelledby="clinic-phase12-payment-title"',
  'autoFocus className="clinic-phase12-confirm-close"',
  'checked={reviewed}',
  'disabled={busy||!reviewed||!valid}',
  'onClick={()=>void post()}',
  'clinicCanEnterPayment(invoice.balanceAfn,numeric)',
  'financeNoOnline:"Do not mark unverified bank transfers',
  'financeNoOnline:"حوالۀ بانکی تأییدنشده',
  'financeNoOnline:"بې تایید بانکي حواله',
  'if(event.key==="Escape"&&!busy)'
 ])assert.ok(ui.includes(marker),marker);
 assert.ok(!ui.includes('if(!confirm(confirmText))return'));
 assert.ok(api.includes('WHERE clinic_id=${cid(req)} AND created_by=${req.actor!.id} AND action_key=${key}'));
 assert.ok(api.includes('IDEMPOTENCY_KEY_CHANGED'));
 assert.ok(api.includes('AMOUNT_EXCEEDS_BALANCE'));
 assert.ok(api.includes('DUPLICATE_PAYMENT_REFERENCE'));
 assert.ok(api.includes('CREDIT_REASON_REQUIRED'));
});

test("Clinic Phase 12: issuance, void and ledger reversals are review-gated with immutable records",()=>{
 for(const marker of [
  '[reviewed,setReviewed]=useState(false),[reverseKey,setReverseKey]=useState("")',
  'function beginReview(type:"issue"|"void"|"reverse")',
  'async function finalize()',
  'if(busy||!review||!reviewed||!data)return',
  'if(review==="issue"&&invoice.documentStatus!=="draft")return',
  'if(review==="reverse"&&(!reverseId||reason.trim().length<10',
  'const key=reverseKey||crypto.randomUUID();setReverseKey(key)',
  'actionKey:key',
  'setReview(null);setReviewed(false);setReverseKey("")',
  'onClick={()=>beginReview("issue")}',
  'onClick={()=>beginReview("reverse")}',
  'onClick={()=>beginReview("void")}',
  'aria-labelledby="clinic-phase12-invoice-action-title"',
  'financeReviewReverseInfo:"This posts a manual accounting reversal',
  'financeReviewIssueInfo:"Issuing freezes the invoice document',
  'financeReviewVoidInfo:"Only unpaid invoices without ledger history',
  'review==="reverse"&&<div><dt>{t("financeReviewEntry")}</dt>',
  'setReview(null);setReviewed(false);setReverseId("")'
 ])assert.ok(ui.includes(marker),marker);
 assert.ok(!ui.includes('confirm(t("confirmReverse"))'));
 assert.ok(!ui.includes('confirm(t("confirmIssue"))'));
 for(const marker of [
  'if(i.status!=="draft")fail(409,"INVOICE_ALREADY_ISSUED")',
  'if(i.status!=="issued")fail(409,"INVOICE_NOT_ISSUED")',
  'if(any)fail(409,"INVOICE_HAS_LEDGER_HISTORY")',
  'if(reversed)fail(409,"ALREADY_REVERSED")',
  'if(!["payment","credit"].includes(original.kind))',
  'reverses_entry_id','request_digest','logLedger(tx,req'
 ])assert.ok(api.includes(marker),marker);
});

test("Clinic Phase 12: ledger CSV protects spreadsheet users from malicious formulas",()=>{
 assert.equal(clinicCsvSafeCell("Alice"),'"Alice"');
 assert.equal(clinicCsvSafeCell('quote"here'),'"quote""here"');
 assert.equal(clinicCsvSafeCell("=1+1"),'"\'=1+1"');
 assert.equal(clinicCsvSafeCell("  +SUM(1,1)"),'"\'  +SUM(1,1)"');
 assert.equal(clinicCsvSafeCell("@cmd"),'"\'@cmd"');
 assert.equal(clinicCsvSafeCell("-cmd"),'"\'-cmd"');
 assert.equal(clinicCsvSafeCell(1000),'"1000"');
 assert.equal(clinicCsvSafeCell(-1000),'"\'-1000"');
 const csv=clinicCsvRows([["name","amount"],["=HYPERLINK(\"x\")",125]]);
 assert.ok(csv.startsWith("\uFEFF"));
 assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));
 assert.ok(csv.includes("\r\n"));
 for(const marker of [
  'const csv=clinicCsvRows([head,...rows])',
  'const blob=new Blob([csv],{type:"text/csv;charset=utf-8"})',
  'setTimeout(()=>URL.revokeObjectURL(url),60000)',
  'financeExportWarning:"CSV contains financial and patient details',
  'financeExportWarning:"CSV شامل معلومات مالی',
  'financeExportWarning:"CSV شخصي',
  'clinicFinancialNet(e.kind,e.amount_afn)'
 ])assert.ok(ui.includes(marker),marker);
 assert.equal(clinicFinancialNet("reversal",250),-250);
 assert.equal(clinicFinancialNet("credit",250),250);
 assert.equal(clinicFinancialNet("payment",250),250);
});

test("Clinic Phase 12: billing and receipt screens disclose bounded server windows and reverse status",()=>{
 for(const marker of [
  'financeResultLimit:"Only the latest 400 invoices',
  'financeResultLimit:"جستجو فقط در آخرین ۴۰۰ بل',
  'financeResultLimit:"پلټنه یوازې د وروستیو ۴۰۰',
  'data.total',
  '{(page-1)*15+1}',
  'const visibleInvoices=inv.slice((page-1)*5,page*5)',
  'const visibleStatement=statementInvoices.slice((page-1)*5,page*5)',
  'const visibleEntries=entries.slice((page-1)*5,page*5)',
  'const activeCount=tab==="invoices"?inv.length:tab==="payments"?entries.length:statementInvoices.length',
  'activeCount>5&&<Pager page={page} next={activeNext} setPage={setPage}/>',
  'financePatientLimit:"Statement shows up to 150 most recent invoices',
  'financePatientLimit:"صورت‌حساب تا ۱۵۰ بل',
  'financePatientLimit:"دا حسابپاڼه تر ۱۵۰ وروستي بیلونه',
  'r.invoiceId&&<a className="btn btn-secondary"',
  'r.reversed&&<Alert kind="warning">{t("financeReceiptReversed")}</Alert>',
  'financeReceiptReversed:"This payment was reversed',
  'financeReceiptReversed:"این پرداخت در دفتر مالی برگشت',
  'financeReceiptReversed:"دا تادیه بېرته اړول شوې',
  'phase10-printable'
 ])assert.ok(ui.includes(marker),marker);
 for(const marker of [
  'ORDER BY i.created_at DESC,i.id DESC LIMIT 400',
  'ORDER BY i.created_at DESC LIMIT 150',
  'ORDER BY e.created_at DESC,e.id DESC LIMIT 200',
  'ORDER BY e.created_at DESC,e.id DESC LIMIT 100',
  'noStore(res);res.json({receipt:{invoiceId:entry.invoice_id',
  'verifiedOnline:false,patientAppReleased:false',
  'AND e.clinic_id=${cid(req)} AND e.kind=\'payment\''
 ])assert.ok(api.includes(marker),marker);
});

test("Clinic Phase 12: styles and roles are isolated to clinic app; mobile/print privacy unaffected",()=>{
 assert.ok(shell.includes('import "./clinic-records.css";\nimport "./clinic-finance.css";'));
 for(const marker of [
  '.clinic-persistent-shell .clinic-phase12-workspace',
  '.clinic-persistent-shell .clinic-phase12-page-header',
  '.clinic-persistent-shell .clinic-phase12-hero',
  '.clinic-persistent-shell .clinic-phase12-tabs',
  '.clinic-persistent-shell .clinic-phase12-kpis',
  '.clinic-persistent-shell .clinic-phase12-quick-grid',
  '.clinic-persistent-shell .clinic-phase12-workspace .phase10-table-scroll',
  '.clinic-persistent-shell .clinic-phase12-confirm-dialog',
  '.clinic-persistent-shell .clinic-phase12-confirm-facts',
  '.clinic-persistent-shell .clinic-phase12-patient-billing',
  '.clinic-persistent-shell .clinic-phase12-receipt-warning',
  '@media(max-width:1250px)','@media(max-width:860px)',
  '@media(max-width:640px)','@media(max-width:375px)',
  '@media(prefers-reduced-motion:reduce)',
  ':focus-visible','overflow-wrap:anywhere','overscroll-behavior:contain'
 ])assert.ok(css.includes(marker),marker);
 for(const bad of [':root{','svg path{','.odontogram{','transform:scaleX(-1)','Math.random('])
  assert.ok(!css.includes(bad),bad);
 for(const path of [
  "apps/admin-web/app/layout.tsx","apps/patient-web/app/layout.tsx",
  "apps/clinic-web/app/layout.tsx"
 ])assert.ok(!read(path).includes("clinic-finance.css"),path);
 assert.ok(ui.includes('patientOnly:"Clinic-private; patient app sharing is not enabled."'));
 assert.ok(ui.includes('issuedNotPaid:"Issuing an invoice does not mean it was paid."'));
 assert.ok(ui.includes('noAuto:"No automatic checkout or payment capture."'));
});
