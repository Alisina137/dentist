import assert from "node:assert/strict";
import {sqlClient} from "../packages/db/src/client.js";
// CI-only direct PostgreSQL assertion: no API path, no PHI is logged.
const ids=process.argv.slice(2);
assert.equal(ids.length,2,"expected two fixture observations");
async function verifyImmutable(){
 try{
 for(const id of ids){
  const existing=await sqlClient`SELECT id,status,condition FROM clinic_tooth_observations WHERE id=${id}`;
  assert.equal(existing.length,1);
  assert.equal(existing[0].status,"validated");
  await assert.rejects(async()=>{await sqlClient`UPDATE clinic_tooth_observations
    SET condition='missing' WHERE id=${id}`;},error=>(error as any)?.code==="P0001");
  await assert.rejects(async()=>{await sqlClient`DELETE FROM clinic_tooth_observations
    WHERE id=${id}`;},error=>(error as any)?.code==="P0001");
  const after=await sqlClient`SELECT condition FROM clinic_tooth_observations WHERE id=${id}`;
  assert.equal(after.length,1);
  assert.equal(after[0].condition,existing[0].condition);
 }
 console.log("PH08_IMMUTABILITY_OK");
}finally{
 await sqlClient.end();
}
}
verifyImmutable().catch(error=>{
 console.error("PH08_DB_PROTECTION_FAILED",error instanceof Error?error.name:"unknown");
 process.exitCode=1;
});
