import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const transport=read("apps/mobile/api-transport.ts");
const auth=read("apps/mobile/native-auth.tsx");
const app=read("apps/mobile/App.tsx");
const account=read("apps/mobile/native-patient.tsx");
const errors=read("apps/mobile/patient-errors.ts");
const startup=read("scripts/dev-api-with-ngrok.mjs");
const checker=read("scripts/check-mobile-api.mjs");
const pkg=JSON.parse(read("package.json"));

// Run production helper code, not a duplicate copy of the validation logic.
const js=ts.transpileModule(transport,{compilerOptions:{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
}}).outputText;
class ApiError extends Error{
 constructor(status,code){super(code);this.status=status;this.code=code;}
}
const loaded={exports:{}};
new Function("require","exports","module",js)(id=>{
 assert.equal(id,"./api-error");return {ApiError};
},loaded.exports,loaded);
const {nativeApiHeaders,nativeJsonResponse,nativeIsDandanlinkStatus,nativeJsonContentType}=loaded.exports;

test("native API tunnel browser warning bypass works only on the trusted ngrok hostname",()=>{
 assert.deepEqual(nativeApiHeaders("https://rasping-brunch-consonant.ngrok-free.dev"),{
  Accept:"application/json","ngrok-skip-browser-warning":"1"
 });
 assert.deepEqual(nativeApiHeaders("https://example.ngrok.app"),{
  Accept:"application/json","ngrok-skip-browser-warning":"1"
 });
 assert.deepEqual(nativeApiHeaders("https://foo.trycloudflare.com"),{Accept:"application/json"});
 assert.deepEqual(nativeApiHeaders("https://api.example.com"),{Accept:"application/json"});
 assert.deepEqual(nativeApiHeaders("https://malicious-ngrok-free.dev.example.com"),
  {Accept:"application/json"});
 assert.deepEqual(nativeApiHeaders("http://test.ngrok-free.dev"),{Accept:"application/json"});
 assert.deepEqual(nativeApiHeaders("invalid"),{Accept:"application/json"});
 assert.equal(nativeJsonContentType("application/json; charset=utf-8"),true);
 assert.equal(nativeJsonContentType("APPLICATION/problem+JSON"),true);
 assert.equal(nativeJsonContentType("text/html; charset=utf-8"),false);
 assert.equal(nativeJsonContentType(null),false);
});

test("native signup cannot treat a 200 HTML tunnel warning page as successful account creation",async()=>{
 const html=new Response("<html>ngrok warning</html>",{
  status:200,headers:{"content-type":"text/html"}});
 await assert.rejects(nativeJsonResponse(html),err=>
  err instanceof ApiError&&err.code==="API_NON_JSON_RESPONSE");
 const missingType=new Response('{"user":{"id":"x"}}',{status:200});
 await assert.rejects(nativeJsonResponse(missingType),err=>err.code==="API_NON_JSON_RESPONSE");
 const invalid=new Response("truncated",{status:200,headers:{"content-type":"application/json"}});
 await assert.rejects(nativeJsonResponse(invalid),err=>err.code==="API_INVALID_JSON_RESPONSE");
});

test("native auth preserves safe real JSON API errors and accepts valid signup response",async()=>{
 const payload={user:{id:"user-123",email:"new@example.org"},token:null};
 const ok=new Response(JSON.stringify(payload),{
  status:200,headers:{"content-type":"application/json; charset=utf-8"}});
 assert.deepEqual(await nativeJsonResponse(ok),payload);
 const denied=new Response(JSON.stringify({code:"INVALID_EMAIL"}),{
  status:422,headers:{"content-type":"application/json"}});
 await assert.rejects(nativeJsonResponse(denied),err=>
  err instanceof ApiError&&err.status===422&&err.code==="INVALID_EMAIL");
 const throttle=new Response(JSON.stringify({}),{
  status:429,headers:{"content-type":"application/json"}});
 await assert.rejects(nativeJsonResponse(throttle),err=>err.code==="RATE_LIMIT_EXCEEDED");
 const down=new Response(JSON.stringify({}),{
  status:503,headers:{"content-type":"application/json"}});
 await assert.rejects(nativeJsonResponse(down),err=>err.code==="SERVER_UNAVAILABLE");
 assert.equal(nativeIsDandanlinkStatus({product:"DandanLink"}),true);
 assert.equal(nativeIsDandanlinkStatus({product:"Something else"}),false);
 assert.equal(nativeIsDandanlinkStatus("<html>"),false);
 assert.equal(nativeIsDandanlinkStatus(null),false);
});

test("signup and session restoration share safe connectivity transport and never falsely report success",()=>{
 for(const value of [
  'import {nativeApiHeaders,nativeJsonResponse} from "./api-transport"',
  '...nativeApiHeaders(API)',
  'const data=await nativeJsonResponse<T>(response)',
  'if(!result.data?.user?.id||!result.data.user.email)',
  'throw new ApiError(502,"SIGNUP_RESPONSE_INVALID")',
  '"/api/auth/sign-up/email"',
  '"/api/auth/get-session"',
  'headers.get("set-auth-token")',
  '"Authorization":"Bearer "+token',
  'SecureStore.setItemAsync(TOKEN_KEY,newToken)',
  'SecureStore.deleteItemAsync(TOKEN_KEY)',
  'throw new ApiError(0,"NETWORK_UNAVAILABLE")'
 ])assert.ok(auth.includes(value),value);
 assert.ok(!auth.includes("AsyncStorage"));
 assert.ok(!auth.includes("localStorage"));
});

test("restoration failure no longer locks patient out of signup; public server status verifies real JSON",()=>{
 for(const value of [
  '// A failed restore of a previous session must never lock users out of',
  'if(!auth.account)return <Block>',
  'auth.onlineError&&<>',
  'onPress={()=>void auth.refresh()}',
  'await auth.signUp(name,email,password)',
  'nativeApiHeaders(API)',
  'nativeJsonResponse<T>(response)'
 ])assert.ok(account.includes(value),value);
 assert.ok(!account.includes('if(auth.onlineError&&!auth.account)return <Block>'),
  "network/session errors must not hide the signup form");
 for(const value of [
  'nativeApiHeaders(API)',
  'nativeJsonResponse<unknown>(response)',
  'nativeIsDandanlinkStatus(body)',
  'setConnection("connected")',
  'setConnection("offline")',
  'headers:nativeApiHeaders(API)'
 ])assert.ok(app.includes(value),value);
 assert.ok(!app.includes('if(!response.ok)throw Error("status")'));
});

test("error messages distinguish missing URL, ngrok HTML and unavailable backend in all three locales",()=>{
 for(const value of [
  'apiConfiguration:"The API address is missing.',
  'apiTunnel:"The API address returned a web page',
  'apiUnavailable:"The DandanLink API is temporarily unavailable.',
  'apiConfiguration:"آدرس API تنظیم نشده',
  'apiTunnel:"به‌جای معلومات دندان‌لینک',
  'apiUnavailable:"سرور دندان‌لینک فعلاً پاسخ',
  'apiConfiguration:"د API پته نه ده ټاکل شوې',
  'apiTunnel:"د API پر ځای وېبپاڼه راغلې',
  'apiUnavailable:"د دندان‌لینک سرور اوس ځواب',
  'if(code==="API_NOT_CONFIGURED")',
  'if(["API_NON_JSON_RESPONSE","API_INVALID_JSON_RESPONSE","SIGNUP_RESPONSE_INVALID"].includes(code))',
  'if(["SERVER_UNAVAILABLE","API_UNAVAILABLE"].includes(code))'
 ])assert.ok(errors.includes(value),value);
 assert.ok(!errors.includes('["NETWORK_UNAVAILABLE","API_NOT_CONFIGURED","HTTPS_REQUIRED"]'));
});

test("dev API tunnel public readiness is checked and operator can probe without exposing credentials",()=>{
 assert.equal(pkg.scripts["dev:api:check"],"node scripts/check-mobile-api.mjs");
 for(const token of [
  'selected.url+"/v1/public/status"',
  '"ngrok-skip-browser-warning":"1"',
  'body?.product==="DandanLink"',
  'Public mobile API verified',
  'pnpm dev:api:check'
 ])assert.ok(startup.includes(token),token);
 for(const token of [
  'apps/mobile/.env','EXPO_PUBLIC_API_URL',
  '["ngrok-skip-browser-warning"]',
  '"/v1/public/status"','"/ready"',
  'body?.product==="DandanLink"',
  'body?.status==="ready"',
  'AbortSignal.timeout(10000)',
  'No credentials, tokens or PHI'
 ])assert.ok(checker.includes(token.replace('["ngrok-skip-browser-warning"]','"ngrok-skip-browser-warning":"1"')),
  token);
 assert.ok(!checker.includes("Authorization: Bearer"));
 assert.ok(!checker.includes("BETTER_AUTH_SECRET"));
});
