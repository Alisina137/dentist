import assert from "node:assert/strict";
import {sqlClient} from "../packages/db/src/client.js";
const [rentId,suppliesId,receiptId]=process.argv.slice(2);
assert.ok(rentId&&suppliesId&&receiptId,"PH11 database test requires real expense/receipt identifiers");
async function verify(){
 try{
  const [rent]=await sqlClient`SELECT revision,amount_afn,status FROM clinic_expenses
   WHERE id=${rentId}`;
  assert.equal(rent.revision,2);
  assert.equal(rent.amount_afn,900);
  assert.equal(rent.status,"posted");
  const [first]=await sqlClient`SELECT id,amount_afn,action FROM clinic_expense_versions
   WHERE expense_id=${rentId} AND version=1`;
  assert.equal(first.amount_afn,800);
  await assert.rejects(async()=>sqlClient`UPDATE clinic_expense_versions
   SET amount_afn=1 WHERE id=${first.id}`,()=>true);
  await assert.rejects(async()=>sqlClient`DELETE FROM clinic_expense_versions
   WHERE id=${first.id}`,()=>true);
  await assert.rejects(async()=>sqlClient`UPDATE clinic_expenses SET amount_afn=1
   WHERE id=${rentId}`,()=>true);
  await assert.rejects(async()=>sqlClient`DELETE FROM clinic_expenses
   WHERE id=${rentId}`,()=>true);
  await assert.rejects(async()=>sqlClient`UPDATE clinic_expense_receipts SET file_name='tampered.pdf'
   WHERE id=${receiptId}`,()=>true);
  await assert.rejects(async()=>sqlClient`DELETE FROM clinic_expense_receipts
   WHERE id=${receiptId}`,()=>true);
  const [voided]=await sqlClient`SELECT status,revision FROM clinic_expenses WHERE id=${suppliesId}`;
  assert.equal(voided.status,"void");
  await assert.rejects(async()=>sqlClient`UPDATE clinic_expenses SET status='posted',revision=revision+1,
    void_reason=NULL WHERE id=${suppliesId}`,()=>true);
  const [unchanged]=await sqlClient`SELECT amount_afn,revision,status FROM clinic_expenses WHERE id=${rentId}`;
  assert.equal(unchanged.amount_afn,900);
  assert.equal(unchanged.revision,2);
  console.log("PH11_IMMUTABILITY_OK");
 }finally{await sqlClient.end();}
}
verify().catch(ex=>{console.error("PH11_DB_GUARD_FAILED",ex instanceof Error?ex.name:"unknown");
 process.exitCode=1;});
