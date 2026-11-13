/** Isolated integration-test helper; never import or expose from the production API. */
import { and, eq } from "drizzle-orm";
import { db, schema, sqlClient } from "@dandanlink/db";
const id=process.argv[2],email=process.argv[3];
if(process.env.NODE_ENV!=="test"||process.env.PH03_TEST_FIXTURE!=="allow"||
   !id||!email?.endsWith("@example.test")){
  console.error("PH03 fixture is restricted to explicit isolated test runs.");
  process.exit(2);
}
try{
  const rows=await db.update(schema.clinicInvitation).set({
    expiresAt:new Date("2000-01-01T00:00:00Z"),
    sentAt:new Date("2000-01-01T00:00:00Z")
  }).where(and(eq(schema.clinicInvitation.id,id),eq(schema.clinicInvitation.email,email),
    eq(schema.clinicInvitation.status,"pending"))).returning({id:schema.clinicInvitation.id});
  if(rows.length!==1)throw new Error("Matching pending test invite not found");
  console.log("Test invitation expiry simulated");
}catch(error){
  console.error(error instanceof Error?error.message:"Fixture failed");
  process.exitCode=1;
}finally{await sqlClient.end();}
