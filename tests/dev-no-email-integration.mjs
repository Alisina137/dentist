import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const project=resolve(import.meta.dirname,"..");
const email="dev-admin-"+Date.now()+"@example.test";
const password="Dev-Only-Strong-Password-2026!";
const url="http://localhost:4010";
const settings={
 ...process.env,
 NODE_ENV:"development",
 DEV_SKIP_EMAIL_VERIFICATION:"true",
 PORT:"4010",
 API_BASE_URL:url,
 // Only the existing ephemeral CI PostgreSQL database is accessed.
 BETTER_AUTH_SECRET:process.env.BETTER_AUTH_SECRET
};
const child=spawn(process.execPath,["--import","tsx","apps/api/src/server.ts"],{
 cwd:project,env:settings,stdio:["ignore","pipe","pipe"]
});
let logs="";
child.stdout.on("data",part=>{logs+=part.toString();});
child.stderr.on("data",part=>{logs+=part.toString();});
async function waitForReady(){
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw new Error("Development server exited: "+logs.slice(-1500));
  try{const r=await fetch(url+"/ready");if(r.status===200)return;}catch{}
  await new Promise(done=>setTimeout(done,160));
 }
 throw new Error("Dev API startup timed out: "+logs.slice(-1500));
}
async function request(path,body,cookie=""){
 const response=await fetch(url+path,{method:body===undefined?"GET":"POST",
  headers:{...(cookie?{cookie}:{}),...(body===undefined?{}:{"content-type":"application/json"})},
  redirect:"manual",body:body===undefined?undefined:JSON.stringify(body)
 });
 const raw=await response.text();let json;
 try{json=JSON.parse(raw);}catch{json={};}
 return {response,json};
}
function check(result,expected,title){
 assert.equal(result.response.status,expected,title+": "+JSON.stringify(result.json));
 return result.json;
}
try{
 await waitForReady();
 const policy=check(await request("/v1/public/status"),200,"read public policy");
 assert.equal(policy.emailVerificationRequired,false,
  "Development requires explicit no-email mode");
 check(await request("/api/auth/sign-up/email",{name:"Local Dev Admin",email,password,
  callbackURL:"http://localhost:3001/clinic/verify"}),200,"create development account without proof");
 const signed=await request("/api/auth/sign-in/email",{email,password});
 check(signed,200,"unverified local account can sign in");
 const cookie=signed.response.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
 assert.ok(cookie.length>15,"signed session cookie required");
 const me=check(await request("/v1/me",undefined,cookie),200,"development account API");
 assert.equal(me.user.emailVerified,false,"do not falsely mark unverified email as verified");
 assert.equal(me.isPlatformAdmin,false,"no automatic admin grants");
 check(await request("/v1/team/context",undefined,cookie),200,"development team context");
 const unauthorized=await request("/v1/admin/home",undefined,cookie);
 check(unauthorized,403,"non-admin cannot use admin workspace");
 assert.ok(!logs.includes("Verify your DandanLink account"),"no verification email must be generated");
 const result=spawnSync("pnpm",["admin:grant",email],{
  cwd:project,env:{...settings,ALLOW_ADMIN_BOOTSTRAP:"true",ADMIN_BOOTSTRAP_EMAIL:email},
  encoding:"utf8"
 });
 assert.equal(result.status,0,"development admin grant denied: "+result.stderr);
 const granted=check(await request("/v1/me",undefined,cookie),200,"check granted admin");
 assert.equal(granted.isPlatformAdmin,true,"admin grant should succeed in local dev");
 assert.equal(granted.adminMfaVerified,false,"MFA still mandatory");
 check(await request("/v1/admin/home",undefined,cookie),403,"MFA protects admin API");
 console.log("DEV_EMAIL_BYPASS_OK: password sign-in, unverified account session, gated admin grant and MFA.");
}finally{
 child.kill("SIGTERM");
}
