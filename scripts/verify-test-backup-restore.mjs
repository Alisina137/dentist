import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";

if(process.env.NODE_ENV!=="test")throw Error("PH19 restore drill only runs against synthetic test data");
const raw=process.env.DATABASE_URL;
if(!raw||!raw.includes("dandan_test"))throw Error("Refusing to run restore drill on a non-test database");
const uri=new URL(raw),restoreName="dandan_restore_ph19_"+process.pid;
const require=createRequire(new URL("../packages/db/package.json",import.meta.url));
const postgres=require("postgres");
const adminUri=new URL(uri);adminUri.pathname="/postgres";
const restoreUri=new URL(uri);restoreUri.pathname="/"+restoreName;
const env={...process.env,
 PGHOST:uri.hostname,PGPORT:uri.port||"5432",PGUSER:decodeURIComponent(uri.username),
 PGPASSWORD:decodeURIComponent(uri.password),PGDATABASE:decodeURIComponent(uri.pathname.slice(1)),
 PGSSLMODE:uri.searchParams.get("sslmode")||"disable"};
const dir=await mkdtemp(join(tmpdir(),"dandan-ph19-restore-")),archive=join(dir,"backup.dump");
const admin=postgres(adminUri.toString(),{max:1}),source=postgres(raw,{max:1});
const tables=["clinic_patients","clinic_appointments","clinic_payment_entries","clinic_encounter_versions","clinic_export_events"];
let restore;
function command(name,args,overrides={}){
 const started=Date.now();
 const ran=spawnSync(name,args,{encoding:"utf8",env:{...env,...overrides},timeout:150000});
 if(ran.error||ran.status!==0)throw Error(name+" restore drill failed: "+
  (ran.error?.message||ran.stderr?.slice(0,400)||"unknown"));
 return Date.now()-started;
}
try{
 const before={};
 for(const table of tables){const rows=await source.unsafe(`SELECT count(*)::int AS n FROM ${table}`);before[table]=rows[0].n;}
 const dumpMs=command("pg_dump",["--format=custom","--no-owner","--file",archive]);
 await admin.unsafe(`CREATE DATABASE "${restoreName}"`);
 const restoreMs=command("pg_restore",["--no-owner","--no-privileges",
  "--dbname",restoreName,archive]);
 restore=postgres(restoreUri.toString(),{max:1});
 for(const table of tables){
  const rows=await restore.unsafe(`SELECT count(*)::int AS n FROM ${table}`);
  assert.equal(rows[0].n,before[table],"restored row count mismatch in "+table);
 }
 const constraints=await restore`SELECT conname FROM pg_constraint
   WHERE conname='appointment_provider_no_overlap'`;
 assert.ok(constraints.length,"critical booking exclusion constraint must survive backup and restore");
 console.log("PH19_RESTORE_DRILL_OK dumpMs="+dumpMs+" restoreMs="+restoreMs+
  " tablesChecked="+tables.length+" constraintsChecked=1");
}finally{
 await restore?.end().catch(()=>{});
 await source.end().catch(()=>{});
 await admin.unsafe(`DROP DATABASE IF EXISTS "${restoreName}" WITH (FORCE)`).catch(()=>{});
 await admin.end().catch(()=>{});
 await rm(dir,{recursive:true,force:true}).catch(()=>{});
}
