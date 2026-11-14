import assert from "node:assert/strict";
import {sqlClient} from "../packages/db/src/client.js";
const [clinicId,submissionId,photoId]=process.argv.slice(2);
assert.ok(clinicId&&submissionId&&photoId,"PH12 requires actual approved listing fixture IDs");
async function guard(){
 try{
  const [first]=await sqlClient`SELECT id,profile,status,approved_services,approved_dentists
   FROM clinic_listing_versions WHERE clinic_id=${clinicId} AND version=1`;
  assert.equal(first.status,"approved");
  assert.ok(Array.isArray(first.approved_services)&&first.approved_services.length===1);
  assert.ok(Array.isArray(first.approved_dentists)&&first.approved_dentists.length===1);
  await assert.rejects(async()=>sqlClient`UPDATE clinic_listing_versions SET profile='{}'::jsonb
    WHERE id=${first.id}`,()=>true);
  await assert.rejects(async()=>sqlClient`DELETE FROM clinic_listing_versions
    WHERE id=${first.id}`,()=>true);
  await assert.rejects(async()=>sqlClient`UPDATE clinic_listing_versions
    SET approved_services='[]'::jsonb WHERE id=${first.id}`,()=>true);
  await assert.rejects(async()=>sqlClient`UPDATE clinic_dentist_credential_submissions
    SET credential_number='FORGED' WHERE id=${submissionId}`,()=>true);
  await assert.rejects(async()=>sqlClient`DELETE FROM clinic_dentist_credential_submissions
    WHERE id=${submissionId}`,()=>true);
  await assert.rejects(async()=>sqlClient`UPDATE clinic_listing_photos
    SET sha256_hex=repeat('x',64) WHERE id=${photoId}`,()=>true);
  await assert.rejects(async()=>sqlClient`DELETE FROM clinic_listing_photos
    WHERE id=${photoId}`,()=>true);
  const [decision]=await sqlClient`SELECT id FROM clinic_dentist_credential_decisions
   WHERE clinic_id=${clinicId} AND decision='approved' LIMIT 1`;
  assert.ok(decision);
  await assert.rejects(async()=>sqlClient`DELETE FROM clinic_dentist_credential_decisions
    WHERE id=${decision.id}`,()=>true);
  const [event]=await sqlClient`SELECT id FROM clinic_listing_events WHERE
    clinic_id=${clinicId} AND action='approved' LIMIT 1`;
  assert.ok(event);
  await assert.rejects(async()=>sqlClient`UPDATE clinic_listing_events
    SET action='hidden' WHERE id=${event.id}`,()=>true);
  const [unchanged]=await sqlClient`SELECT profile,approved_services FROM clinic_listing_versions
    WHERE id=${first.id}`;
  assert.deepEqual(unchanged.profile,first.profile);
  assert.deepEqual(unchanged.approved_services,first.approved_services);
  console.log("PH12_IMMUTABILITY_OK");
 }finally{await sqlClient.end()}
}
guard().catch(ex=>{console.error("PH12_DB_GUARD_FAILED",ex instanceof Error?ex.name:"unknown");
 process.exitCode=1;});
