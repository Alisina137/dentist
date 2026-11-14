import assert from "node:assert/strict";
import {sqlClient} from "../packages/db/src/client.js";
// Direct PostgreSQL assertions on private CI test fixtures, no patient details logged.
const [invoiceId,paymentId]=process.argv.slice(2);
assert.ok(invoiceId&&paymentId,"PH10 requires existing fixture IDs");
async function verify(){
 try{
  const [original]=await sqlClient`SELECT total_afn,version,status FROM clinic_invoices WHERE id=${invoiceId}`;
  assert.equal(original.status,"issued");
  const [entry]=await sqlClient`SELECT amount_afn,kind,method FROM clinic_payment_entries
    WHERE id=${paymentId}`;
  assert.equal(entry.kind,"payment");
  const [version]=await sqlClient`SELECT version,total_afn FROM clinic_invoice_versions
    WHERE invoice_id=${invoiceId} ORDER BY version DESC LIMIT 1`;
  assert.equal(version.version,original.version);
  await assert.rejects(async()=>sqlClient`UPDATE clinic_invoice_versions SET total_afn=1
    WHERE invoice_id=${invoiceId}`,()=>true);
  await assert.rejects(async()=>sqlClient`DELETE FROM clinic_invoice_versions
    WHERE invoice_id=${invoiceId}`,()=>true);
  await assert.rejects(async()=>sqlClient`UPDATE clinic_payment_entries SET amount_afn=1
    WHERE id=${paymentId}`,()=>true);
  await assert.rejects(async()=>sqlClient`DELETE FROM clinic_payment_entries
    WHERE id=${paymentId}`,()=>true);
  const [ev]=await sqlClient`SELECT id FROM clinic_invoice_events WHERE invoice_id=${invoiceId} LIMIT 1`;
  assert.ok(ev);
  await assert.rejects(async()=>sqlClient`DELETE FROM clinic_invoice_events WHERE id=${ev.id}`,()=>true);
  await assert.rejects(async()=>sqlClient`UPDATE clinic_invoices SET total_afn=1
    WHERE id=${invoiceId}`,()=>true);
  const [unchanged]=await sqlClient`SELECT total_afn,status FROM clinic_invoices WHERE id=${invoiceId}`;
  const [paymentUnchanged]=await sqlClient`SELECT amount_afn FROM clinic_payment_entries WHERE id=${paymentId}`;
  assert.equal(unchanged.total_afn,6000);
  assert.equal(paymentUnchanged.amount_afn,2000);
  console.log("PH10_IMMUTABILITY_OK");
 }finally{await sqlClient.end();}
}
verify().catch(e=>{console.error("PH10_DB_GUARD_FAILED",e instanceof Error?e.name:"unknown");
 process.exitCode=1;});
