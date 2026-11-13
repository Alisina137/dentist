// Integration-test-only fixture for simulating elapsed time in a real PostgreSQL appointment.
// No runtime endpoint, production command or user-facing clock override exists.
import { sqlClient } from "../packages/db/src/client.ts";
import { localToUtc } from "../apps/api/src/operations-validation.ts";
const [clinicId,appointmentId,offsetRaw="0",dayShiftRaw="0"]=process.argv.slice(2);
const offset=Number(offsetRaw),dayShift=Number(dayShiftRaw);
if(!Number.isInteger(dayShift)||dayShift<-1||dayShift>0)throw Error("Invalid test date shift");
if(!Number.isInteger(offset)||offset<0||offset>120||offset%30)throw Error("Invalid test time offset");
if(process.env.NODE_ENV!=="test"||!process.env.DATABASE_URL||
 !clinicId||!appointmentId)throw Error("PH06 test fixture refused outside controlled CI");
const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
 year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
const values=Object.fromEntries(parts.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
const currentDate=[values.year,values.month,values.day].join("-");
const date=new Date(Date.parse(currentDate+"T00:00:00Z")+dayShift*86400000).toISOString().slice(0,10);
const start=localToUtc(date,offset),end=localToUtc(date,offset+30);
void (async()=>{
 try{
 const rows=await sqlClient.unsafe(
  "UPDATE clinic_appointments SET start_at=$1, end_at=$2 WHERE clinic_id=$3 AND id=$4 AND status='confirmed' RETURNING id",
  [start,end,clinicId,appointmentId]
 );
 if(rows.length!==1)throw Error("PH06 fixture target missing");
 console.info("PH06_TEST_TIME_SET",date);
 }finally{await sqlClient.end();}
})().catch(error=>{console.error(error instanceof Error?error.name:"fixture_failed");process.exitCode=1;});
