import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root=resolve(import.meta.dirname,"..");
const command=resolve(root,"scripts/enable-dev-email-bypass.mjs");
test("development-only email bypass helper preserves other settings",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"dandan-no-email-"));
 try{
  const empty=spawnSync(process.execPath,[command],{cwd:dir,encoding:"utf8",env:{PATH:process.env.PATH}});
  assert.equal(empty.status,1);
  const initial="NODE_ENV=development\nDATABASE_URL=postgresql://test-secret\nBETTER_AUTH_SECRET=32-character-secret-with-entropy\nADMIN_BOOTSTRAP_EMAIL=admin@example.test\n";
  await writeFile(join(dir,".env"),initial);
  const result=spawnSync(process.execPath,[command],{cwd:dir,encoding:"utf8",env:{PATH:process.env.PATH}});
  assert.equal(result.status,0,result.stderr);
  const again=spawnSync(process.execPath,[command],{cwd:dir,encoding:"utf8",env:{PATH:process.env.PATH}});
  assert.equal(again.status,0);
  const contents=await readFile(join(dir,".env"),"utf8");
  assert.match(contents,/^DEV_SKIP_EMAIL_VERIFICATION=true$/m);
  assert.equal(contents.match(/^DEV_SKIP_EMAIL_VERIFICATION=/gm)?.length,1);
  assert.ok(contents.includes("DATABASE_URL=postgresql://test-secret"));
  assert.ok(contents.includes("BETTER_AUTH_SECRET=32-character-secret-with-entropy"));
  assert.ok(contents.includes("ADMIN_BOOTSTRAP_EMAIL=admin@example.test"));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test("email bypass helper refuses production environment",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"dandan-no-email-prod-"));
 try{
  const initial="NODE_ENV=production\nBETTER_AUTH_SECRET=a-private-value\n";
  await writeFile(join(dir,".env"),initial);
  const result=spawnSync(process.execPath,[command],{cwd:dir,encoding:"utf8",env:{PATH:process.env.PATH}});
  assert.equal(result.status,2);
  assert.equal(await readFile(join(dir,".env"),"utf8"),initial);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test("server email bypass is strictly gated to NODE_ENV=development",async()=>{
 const cases=[
  {nodeEnv:"production",dev:"true",expected:false},
  {nodeEnv:"test",dev:"true",expected:false},
  {nodeEnv:"development",dev:"false",expected:false},
  {nodeEnv:"development",dev:"true",expected:true}
 ];
 for(const scenario of cases){
  const output=spawnSync(process.execPath,["--import","tsx","--input-type=module","-e",
    'import {devEmailVerificationDisabled} from "./apps/api/src/email-policy.ts"; console.log(devEmailVerificationDisabled);'],
    {cwd:root,encoding:"utf8",env:{...process.env,NODE_ENV:scenario.nodeEnv,
      DEV_SKIP_EMAIL_VERIFICATION:scenario.dev}}
  );
  assert.equal(output.status,0,output.stderr);
  assert.equal(output.stdout.trim(),String(scenario.expected),
    "incorrect bypass policy for "+scenario.nodeEnv);
 }
});
