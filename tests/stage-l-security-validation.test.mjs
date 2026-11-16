import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(resolve(root,path),"utf8");
const server=read("apps/api/src/server.ts");
const policy=read("apps/api/src/production-config.ts");
const auth=read("apps/api/src/auth.ts");
const pilot=read("apps/api/src/pilot-gate.ts");
const workflow=read(".github/workflows/ci.yml");

const synthetic={
 NODE_ENV:"production",
 API_BASE_URL:"https://api.example.org",
 CLINIC_WEB_URL:"https://clinic.example.org",
 ADMIN_WEB_URL:"https://admin.example.org",
 PATIENT_WEB_URL:"https://patients.example.org",
 BETTER_AUTH_SECRET:"SafeDemoRandomSyntheticOnlyNotForRealProduction_F4m9Xq8Yj2vW",
 DATABASE_URL:"postgresql://demo_user:demo_password@db.example.org:5432/synthetic?sslmode=require",
 SMTP_HOST:"smtp.example.org",
 SMTP_PORT:"587",
 SMTP_USER:"demo@example.org",
 SMTP_PASSWORD:"test_not_a_real_password",
 SMTP_FROM:"DandanLink <demo@example.org>",
 DEV_SKIP_EMAIL_VERIFICATION:"false",
 PH19_PILOT_RELEASE_ENABLED:"false",
 ...Object.fromEntries([
  "LEGAL_PRIVACY","CLINICAL_REVIEW","HOSTING_SECURITY","BACKUP_RESTORE",
  "PENETRATION_TEST","ACCESS_REVIEW","ALERTS","ACCESSIBILITY_RTL","PILOT_ROSTER"
 ].map(x=>["PH19_"+x+"_APPROVED","false"]))
};
function preflight(patch={}){
 // Do not read .env files or contact a provider. These are fake fixture values.
 const args=["--import","tsx","scripts/production-preflight.ts"];
 return spawnSync(process.execPath,args,{
  cwd:root,encoding:"utf8",timeout:15000,
  env:{...process.env,...synthetic,...patch}
 });
}
test("Stage L: production startup validates HTTPS, PostgreSQL TLS, real SMTP and pilot flags",()=>{
 for(const marker of [
  'export function productionConfigurationIssues(',
  'if(env.NODE_ENV!=="production")',
  '["API_BASE_URL","CLINIC_WEB_URL","ADMIN_WEB_URL","PATIENT_WEB_URL"]',
  'u.protocol==="https:"',
  'BETTER_AUTH_SECRET must be',
  '"DATABASE_URL must use authenticated PostgreSQL with sslmode=require or stronger"',
  '["require","verify-full","verify-ca"]',
  '"SMTP_HOST","SMTP_FROM","SMTP_USER","SMTP_PASSWORD"',
  'DEV_SKIP_EMAIL_VERIFICATION must be disabled in production',
  'PH19_PILOT_RELEASE_ENABLED requires all nine independently evidenced approval switches',
  'export function assertProductionConfiguration('
 ])assert.ok(policy.includes(marker),marker);
 assert.ok(server.includes("assertProductionConfiguration()"));
 assert.ok(pilot.includes('process.env.NODE_ENV!=="production"'),"development bypass must not reach production");
});

test("Stage L: real read-only preflight passes synthetic safe config but does not certify deployment",()=>{
 const r=preflight();
 assert.equal(r.status,0,r.stderr);
 assert.match(r.stdout,/DANDANLINK_CONFIG_CHECK_PASS/);
 assert.match(r.stdout,/HEALTHCARE_PILOT=NO_GO/);
 assert.match(r.stdout,/NOT_CERTIFIED/);
 assert.ok(!r.stdout.includes(synthetic.BETTER_AUTH_SECRET));
 assert.ok(!r.stdout.includes(synthetic.DATABASE_URL));
});

test("Stage L: production preflight refuses insecure or incomplete configurations",()=>{
 const scenarios=[
  {API_BASE_URL:"http://api.example.org"},
  {ADMIN_WEB_URL:"http://localhost:3000"},
  {CLINIC_WEB_URL:"https://same.example.org",ADMIN_WEB_URL:"https://same.example.org"},
  {DATABASE_URL:"postgresql://demo:pwd@db.example.org:5432/synthetic?sslmode=disable"},
  {BETTER_AUTH_SECRET:"short"},
  {SMTP_HOST:""},
  {DEV_SKIP_EMAIL_VERIFICATION:"true"},
  {PH19_PILOT_RELEASE_ENABLED:"true"}
 ];
 for(const fields of scenarios){
  const r=preflight(fields);
  assert.equal(r.status,1,JSON.stringify(fields)+" should fail: "+r.stdout+" "+r.stderr);
  assert.match(r.stderr,/DANDANLINK_CONFIG_BLOCKED/);
  assert.ok(!r.stderr.includes(synthetic.BETTER_AUTH_SECRET),"no secrets in logs");
 }
});

test("Stage L: sensitive API responses are uncacheable and browser mutations are origin-guarded",()=>{
 for(const marker of [
  'res.setHeader("X-Request-ID", res.locals.requestId)',
  'req.path.startsWith("/v1/")||req.path.startsWith("/api/auth/")',
  'res.setHeader("Cache-Control","private, no-store, max-age=0")',
  'app.use("/v1",(req,res,next)=>',
  'origin!==undefined&&!trusted.includes(origin)',
  'req.headers["sec-fetch-site"]==="cross-site"',
  'code:"ORIGIN_DENIED"',
  'type==="entity.too.large"',
  'code:"BODY_TOO_LARGE"',
  'type==="entity.parse.failed"',
  '"INVALID_JSON"',
  'console.error("API error", error instanceof Error ? error.name : "unknown")'
 ])assert.ok(server.includes(marker),marker);
 assert.ok(!server.includes('console.error("API error", error);'));
 assert.ok(!server.includes('res.json({ error })'));
});

test("Stage L: correct local clinic/admin ports; enforce session and privileged gates",()=>{
 for(const s of [server,auth]){
  assert.ok(s.includes('process.env.CLINIC_WEB_URL || "http://localhost:3001"'));
  assert.ok(s.includes('process.env.ADMIN_WEB_URL || "http://localhost:3000"'));
 }
 for(const marker of ["requireEmailVerification: !devEmailVerificationDisabled",
   'minPasswordLength: 10','revokeSessionsOnPasswordReset: true',
   "rateLimit:",'bearer({requireSignature:true})',
   'sameSite: "lax", secure: process.env.NODE_ENV === "production", httpOnly: true'])
  assert.ok(auth.includes(marker),marker);
});

test("Stage L: CI must exercise the formerly omitted PH19 and cross-role integration checks",()=>{
 assert.ok(workflow.includes("node tests/stage-l-security-integration.mjs"));
 const integration=read("tests/stage-l-security-integration.mjs");
 for(const marker of [
  'await import("./phase19-integration.mjs")',
  'STAGE_L_TEST_DATABASE_REQUIRED',
  'cross-origin writes must fail before mutation',
  'malformed JSON yields typed client error',
  'oversized JSON rejected safely',
  'reception cannot read clinical encounters',
  'platform administrator cannot read clinic clinical records',
  'foreign account cannot enumerate patient directory',
  'no human go-live approval may be inferred from CI'
 ])assert.ok(integration.includes(marker),marker);
});
