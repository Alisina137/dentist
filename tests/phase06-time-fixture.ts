// Integration-test-only fixture for simulating elapsed time in a real PostgreSQL appointment.
// No runtime endpoint, production command or user-facing clock override exists.
import { sqlClient } from "../packages/db/src/client.ts";
import { localToUtc } from "../apps/api/src/operations-validation.ts";
const [clinicId,appointmentId]=process.argv.slice(2);
if(process.env.NODE_ENV!=="test"||!process.env.DATABASE_URL||
 !clinicId||!appointmentId)throw Error("PH06 test fixture refused outside controlled CI");
const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
 year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
const values=Object.fromEntries(parts.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
const date=[values.year,values.month,values.day].join("-");
const start=localToUtc(date,0),end=localToUtc(date,30);
try{
 const rows=await sqlClient.unsafe(
  "UPDATE clinic_appointments SET start_at=$1, end_at=$2 WHERE clinic_id=$3 AND id=$4 AND status='confirmed' RETURNING id",
  [start,end,clinicId,appointmentId]
 );
 if(rows.length!==1)throw Error("PH06 fixture target missing");
 console.info("PH06_TEST_TIME_SET",date);
}finally{await sqlClient.end();}
