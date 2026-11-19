import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const js=ts.transpileModule(read("apps/mobile/native-clinic-mfa.ts"),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const module={exports:{}};
const deps={
 "./api-error":{ApiError:class ApiError extends Error{
  constructor(status,code){super(code);this.status=status;this.code=code}
 }},
 "./api-transport":{nativeApiHeaders:()=>({Accept:"application/json"}),
 nativeJsonResponse:async r=>r.json()}
};
new Function("module","exports","require",js)(module,module.exports,name=>{
 if(!deps[name])throw Error("UNEXPECTED_DEPENDENCY:"+name);
 return deps[name];
});
const x=module.exports;
test("C26-01 Better Auth redirect creates only a short-lived, untrusted 2FA challenge",()=>{
 const when=50000000;
 const c=x.parseMfaRedirect({twoFactorRedirect:true,twoFactorMethods:["totp"]},when);
 assert.deepEqual(c,{startedAt:when,expiresAt:when+9*60000,methods:["totp","backup"]});
 assert.equal(x.challengeValid(c,when),true);
 assert.equal(x.challengeValid(c,when+9*60000),false);
 assert.equal(x.challengeValid(c,when-1),false);
 assert.equal(x.challengeValid(null,when),false);
 assert.equal(x.parseMfaRedirect({twoFactorRedirect:false},when),null);
 assert.equal(x.parseMfaRedirect({twoFactorRedirect:true,twoFactorMethods:["otp"]},when),null);
 assert.equal(x.parseMfaRedirect({twoFactorRedirect:true,twoFactorMethods:["totp",42]},when),null);
 assert.equal(x.parseMfaRedirect({twoFactorRedirect:true,token:"NOT_A_TOKEN"},when).methods[0],"totp");
});
test("C26-02 secrets never leave fixed verification endpoints; trustDevice is always false",()=>{
 assert.equal(x.normalizeMfaCode("totp"," 001239 "),"001239");
 assert.equal(x.normalizeMfaCode("totp","12345"),null);
 assert.equal(x.normalizeMfaCode("totp","１２３４５６"),null);
 assert.equal(x.normalizeMfaCode("totp","12\n3456"),null);
 assert.equal(x.normalizeMfaCode("backup","A0B2-C3D4"),"A0B2-C3D4");
 assert.equal(x.normalizeMfaCode("backup","<script>"),null);
 assert.equal(x.normalizeMfaCode("backup","a".repeat(65)),null);
 assert.deepEqual(x.mfaBody("totp","012345"),{code:"012345",trustDevice:false});
 assert.deepEqual(x.mfaBody("backup","SAFE-AB12"),{
  code:"SAFE-AB12",trustDevice:false,disableSession:false
 });
 assert.equal(x.mfaEndpoint("totp"),"/api/auth/two-factor/verify-totp");
 assert.equal(x.mfaEndpoint("backup"),"/api/auth/two-factor/verify-backup-code");
 assert.throws(()=>x.mfaBody("totp","123"),/INVALID_MFA_CODE/);
});
test("C26-03 final session token is taken only from header after full MFA authentication",()=>{
 const token="a".repeat(70);
 assert.equal(x.authToken(new Headers({"set-auth-token":token})),token);
 assert.equal(x.authToken(new Headers({})),null);
 assert.equal(x.authToken(new Headers({"set-auth-token":"abc"})),null);
 assert.equal(x.authToken(new Headers({"set-auth-token":"a b"})),null);
 assert.equal(x.isFullMfaResponse({token,user:{id:"account_user_12"}}),true);
 assert.equal(x.isFullMfaResponse({token,user:{id:"account_user_12"},
  twoFactorRedirect:true}),false);
 assert.equal(x.isFullMfaResponse({token:null,user:{id:"account_user_12"}}),false);
 assert.equal(x.isFullMfaResponse({token,user:null}),false);
});
test("C26-04 native request delegates HttpOnly cookie continuity to native fetch jar",async()=>{
 const old=globalThis.fetch,oldDev=globalThis.__DEV__;
 const captured=[];
 const token="opaque_token_value_1234567890abcdefghijklmnopqrstuvwxyz";
 try{
  globalThis.__DEV__=true;
  globalThis.fetch=async (url,opts)=>{
   captured.push({url,opts});
   return {headers:new Headers({"content-type":"application/json",
    "set-auth-token":token}),json:async()=>({token,user:{id:"a".repeat(24)}})};
  };
  const response=await x.nativeMfaRequest(
   "http://localhost:4000","/api/auth/two-factor/verify-totp",
   {code:"123456",trustDevice:false});
  assert.equal(captured[0].opts.credentials,"include");
  assert.equal(captured[0].opts.cache,"no-store");
  assert.equal(captured[0].opts.method,"POST");
  assert.equal(captured[0].opts.headers.Cookie,undefined);
  assert.equal(captured[0].opts.headers.Authorization,undefined);
  assert.equal(captured[0].url,"http://localhost:4000/api/auth/two-factor/verify-totp");
  assert.equal(response.headers.get("set-auth-token"),token);
  await assert.rejects(()=>x.nativeMfaRequest(
   "http://localhost:4000","/api/auth/two-factor/disable",
   {password:"illegal"}),/MFA_ENDPOINT_DENIED/);
  assert.equal(captured.length,1);
 }finally{globalThis.fetch=old;globalThis.__DEV__=oldDev}
});
test("C26-05 native UI does not store MFA challenge or OTP in local storage",()=>{
 const app=read("apps/mobile/native-clinic.tsx");
 const helper=read("apps/mobile/native-clinic-mfa.ts");
 const staff=read("apps/api/src/staff-access.ts");
 const auth=read("apps/api/src/auth.ts");
 const ui=read("apps/mobile/native-clinic-phase24.tsx");
 assert.match(app,/nativeMfaRequest/);
 assert.match(app,/parseMfaRedirect/);
 assert.match(app,/mfaBody/);
 assert.match(app,/verifyMfa\(\)/);
 assert.match(app,/cancelMfa\(\)/);
 assert.match(app,/challengeValid\(pendingMfa/);
 assert.match(app,/isFullMfaResponse/);
 assert.match(app,/setMfaCode\(""\)/);
 assert.match(helper,/credentials:"include"/);
 assert.doesNotMatch(helper,/get\("set-cookie"\)|getSetCookie\(|Cookie:/);
 assert.doesNotMatch(helper,/AsyncStorage|SecureStore|localStorage|console\.log/);
 assert.match(app,/SecureStore.setItemAsync\(TOKEN_KEY,bearer\)/);
 assert.match(app,/setPendingMfa\(null\)/);
 assert.match(staff,/factor\?\.verified/);
 assert.match(staff,/STAFF_MFA_REQUIRED/);
 assert.match(auth,/twoFactor\(/);
 assert.match(auth,/bearer\(\{requireSignature:true\}\)/);
 assert.match(ui,/staffNeedsMfa/);
});
