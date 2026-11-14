import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("PH11 private expense domain is separate from patient invoices",()=>{
 const migration=read("packages/db/migrations/0011_clinic_expenses.sql");
 for(const term of ["clinic_expenses","clinic_expense_counters","clinic_expense_versions",
  "clinic_expense_receipts","clinic_expense_immutable","clinic_expense_update_guard",
  "expense_date","category","payment_method","UNIQUE(clinic_id,actor_id,action_key)",
  "BEFORE UPDATE OR DELETE ON clinic_expense_versions",
  "BEFORE UPDATE OR DELETE ON clinic_expense_receipts","BEFORE DELETE ON clinic_expenses"])
  assert.ok(migration.includes(term),term);
 assert.doesNotMatch(migration,/UPDATE clinic_invoices|UPDATE clinic_payment_entries/);
});
test("PH11 guard real receipt MIME signatures, amount validity, correction and void audit",()=>{
 const router=read("apps/api/src/expense-router.ts");
 for(const invariant of ["EXPENSE_ROLE_DENIED","EXPENSE_VOID_DENIED","EXPENSE_ACTION_KEY_REUSED",
  "STALE_EXPENSE_REVISION","EXPENSE_FINAL","CORRECTION_REASON","AMOUNT",
  "RECEIPT_SIGNATURE_MISMATCH","RECEIPT_SIZE_LIMIT","private, no-store",
  "EXPENSE_CONFLICT","bank_transfer","clinic_payment_entries","netAfterExpensesIsNotProfit",
  "category","summary","/void","FOR UPDATE"])
  assert.ok(router.includes(invariant),invariant);
 assert.match(router,/e\.kind<>'credit'/);
});
test("PH11 finance UI has Expenses tab and real rich form, reporting and private evidence",()=>{
 const ui=read("packages/ui-web/src/phase11.tsx");
 for(const term of ["ExpensePanel","CashFlowInsights","ExpenseEditor","ExpenseDetail","receiptHint",
  "phase11-table","history","amountAfn","category","reason","exportPage","downloadReceipt",
  "from","to","fa-AF","ps-AF","usePreferences","phase11-insights","categoryBreakdown"])
  assert.ok(ui.includes(term),term);
 const parent=read("packages/ui-web/src/phase10.tsx");
 assert.match(parent,/import \{ExpensePanel,CashFlowInsights\}/);
 assert.match(parent,/tab==="expenses"/);
 assert.match(parent,/<CashFlowInsights space=\{space\}/);
 const server=read("apps/api/src/server.ts");
 assert.match(server,/app\.use\("\/v1\/expenses", express\.json\(\{limit:"1.6mb"\}\), expenseRouter\(\)\)/);
 assert.doesNotMatch(read("apps/patient-web/app/page.tsx"),/ExpensePanel|CashFlowInsights/);
});
