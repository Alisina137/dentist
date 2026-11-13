import assert from "node:assert/strict";
import {sqlClient} from "../packages/db/src/client.js";
const [planId,stageId]=process.argv.slice(2);
assert.ok(planId&&stageId,"test fixture requires valid plan and stage IDs");
async function verify(){
 try{
  const [v]=await sqlClient`SELECT plan_id,version FROM clinic_treatment_versions WHERE plan_id=${planId}
   ORDER BY version ASC LIMIT 1`;
  assert.ok(v,"version exists");
  await assert.rejects(async()=>{await sqlClient`UPDATE clinic_treatment_versions SET title='Altered'
   WHERE plan_id=${planId} AND version=${v.version}`;},()=>true);
  await assert.rejects(async()=>{await sqlClient`DELETE FROM clinic_treatment_versions
   WHERE plan_id=${planId} AND version=${v.version}`;},()=>true);
  const consent=await sqlClient`SELECT id FROM clinic_treatment_consents WHERE plan_id=${planId} LIMIT 1`;
  assert.equal(consent.length>0,true);
  await assert.rejects(async()=>{await sqlClient`DELETE FROM clinic_treatment_consents
   WHERE id=${consent[0].id}`;},()=>true);
  const [e]=await sqlClient`SELECT id FROM clinic_treatment_events WHERE plan_id=${planId} LIMIT 1`;
  assert.ok(e);
  await assert.rejects(async()=>{await sqlClient`UPDATE clinic_treatment_events SET reason='changed'
   WHERE id=${e.id}`;},()=>true);
  const [stage]=await sqlClient`SELECT * FROM clinic_treatment_stages WHERE id=${stageId}`;
  assert.equal(stage.status,"completed");
  await assert.rejects(async()=>{await sqlClient`DELETE FROM clinic_treatment_stages
   WHERE id=${stageId}`;},()=>true);
  await assert.rejects(async()=>{await sqlClient`UPDATE clinic_treatment_stages SET status='pending'
   WHERE id=${stageId}`;},()=>true);
  const [unchanged]=await sqlClient`SELECT status FROM clinic_treatment_stages WHERE id=${stageId}`;
  assert.equal(unchanged.status,"completed");
  console.log("PH09_IMMUTABILITY_OK");
 }finally{await sqlClient.end();}
}
verify().catch(error=>{console.error("PH09_DB_PROTECTION_FAILED",
 error instanceof Error?error.name:"unknown");process.exitCode=1;});
