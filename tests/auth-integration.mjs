import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";

const base = "http://localhost:4000";
const email = "phase01+" + Date.now() + "@example.test";
const password = "Dandan-Test-Password-2026!";
const log = process.env.PH01_API_LOG || "/tmp/dandanlink-api.log";

async function http(path, body, cookie = "") {
  return fetch(path.startsWith("http") ? path : base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? (cookie ? { cookie } : {}) : {
      "content-type": "application/json", ...(cookie ? { cookie } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual"
  });
}
function cookieOf(response) {
  return response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
}
async function findEmailLink(subject, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const output = await readFile(log, "utf8").catch(() => "");
    const items = output.matchAll(/subject:\s*'([^']+)'[\s\S]{0,1500}?url:\s*'([^']+)'/g);
    for (const item of items) if (item[1] === subject) return item[2];
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error("No local-only verification link found for: " + subject);
}
async function expectStatus(response, codes, label) {
  if (!codes.includes(response.status)) {
    const body = await response.text();
    throw new Error(label + ": expected " + codes.join("/") + ", got " + response.status + ", body " + body.slice(0, 250));
  }
}
function totp(uri) {
  const secret = new URL(uri).searchParams.get("secret");
  assert.ok(secret, "authenticator secret missing");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0;
  const bytes = [];
  for (const char of secret.toUpperCase().replaceAll("=", "")) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) continue;
    value = (value << 5) | digit; bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hmac = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = hmac.at(-1) & 0x0f;
  const number = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(number).padStart(6, "0");
}
await expectStatus(await http("/ready"), [200], "ready");
const created = await http("/api/auth/sign-up/email", {
  name: "Phase One Test Owner", email, password,
  callbackURL: "http://localhost:3000/clinic/verify"
});
await expectStatus(created, [200, 201], "signup");
const before = await http("/api/auth/sign-in/email", { email, password });
assert.ok(before.status >= 400, "unverified account must not sign in");
const verificationUrl = await findEmailLink("Verify your DandanLink account");
const verified = await http(verificationUrl);
await expectStatus(verified, [200, 302, 303], "verify email");
const invalid = await http("/api/auth/sign-in/email", { email, password: "wrong-password" });
assert.ok(invalid.status >= 400, "invalid password accepted");
const signIn = await http("/api/auth/sign-in/email", { email, password });
await expectStatus(signIn, [200], "verified sign-in");
let cookie = cookieOf(signIn);
assert.ok(cookie.length > 10, "sign-in cookie missing");
const me = await http("/v1/me", undefined, cookie);
await expectStatus(me, [200], "current user");
assert.equal((await me.json()).user.email, email);
await expectStatus(await http("/v1/clinic/home", undefined, cookie), [200], "clinic shell");
await expectStatus(await http("/v1/admin/home", undefined, cookie), [403], "admin forbidden");
const badPreference = await fetch(base + "/v1/me/preferences", {
  method: "PUT", headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ locale: "fr", calendar: "invalid" })
});
await expectStatus(badPreference, [422], "preference validation");
const goodPreference = await fetch(base + "/v1/me/preferences", {
  method: "PUT", headers: { cookie, "content-type": "application/json" },
  body: JSON.stringify({ locale: "ps-AF", calendar: "gregorian" })
});
await expectStatus(goodPreference, [200], "save preference");
const persisted = await (await http("/v1/me", undefined, cookie)).json();
assert.equal(persisted.locale, "ps-AF");
assert.equal(persisted.calendar, "gregorian");

const resetRequest = await http("/api/auth/request-password-reset", {
  email, redirectTo: "http://localhost:3000/clinic/reset-password"
});
await expectStatus(resetRequest, [200], "password reset request");
const resetUrl = await findEmailLink("Reset your DandanLink password");
const resetVisit = await http(resetUrl);
await expectStatus(resetVisit, [200, 302, 303], "password reset link");
const location = resetVisit.headers.get("location") || "";
const token = new URL(location || resetUrl, base).searchParams.get("token");
assert.ok(token, "password reset callback token missing");
const newPassword = "Dandan-New-Password-2026!";
await expectStatus(await http("/api/auth/reset-password", { token, newPassword }), [200], "reset password");
const oldSession = await http("/v1/me", undefined, cookie);
assert.ok(oldSession.status === 401, "password reset must invalidate old session");
const nextSignIn = await http("/api/auth/sign-in/email", { email, password: newPassword });
await expectStatus(nextSignIn, [200], "new password sign in");
cookie = cookieOf(nextSignIn);

console.log("PH01 HTTP integration passed: signup, verification, login, protected routes, locale, reset + session revocation.");

// Administrative grant requires an explicit operator command; smoke verifies API remains denied by default.
assert.ok(!(await (await http("/v1/me", undefined, cookie)).json()).isPlatformAdmin);
console.log("PH01 security passed: ordinary verified account has no platform administrator membership.");

const { spawnSync } = await import("node:child_process");
const grant = spawnSync("pnpm", ["--filter", "@dandanlink/api", "grant:admin", email], {
  env: { ...process.env, ALLOW_ADMIN_BOOTSTRAP: "true", ADMIN_BOOTSTRAP_EMAIL: email },
  cwd: process.cwd(), encoding: "utf8"
});
assert.equal(grant.status, 0, "trusted admin grant command failed: " + grant.stderr);
const promoted = await (await http("/v1/me", undefined, cookie)).json();
assert.equal(promoted.isPlatformAdmin, true);
assert.equal(promoted.adminMfaVerified, false);
await expectStatus(await http("/v1/clinic/home", undefined, cookie), [403], "admin cannot use clinic shell");
await expectStatus(await http("/v1/admin/home", undefined, cookie), [403], "admin MFA enforced");

const mfaEnroll = await http("/api/auth/two-factor/enable", { password: newPassword, method: "totp" }, cookie);
await expectStatus(mfaEnroll, [200], "TOTP enrollment");
const enrollment = await mfaEnroll.json();
const uri = enrollment.totpURI || enrollment.data?.totpURI;
assert.ok(uri, "TOTP enrollment did not return authenticator URI");
const verifiedMfa = await http("/api/auth/two-factor/verify-totp", { code: totp(uri) }, cookie);
await expectStatus(verifiedMfa, [200], "TOTP verification");
if (cookieOf(verifiedMfa)) cookie = cookieOf(verifiedMfa);
await expectStatus(await http("/v1/admin/home", undefined, cookie), [200], "admin home after MFA");
console.log("PH01 privileged integration passed: explicit grant, clinic deny, MFA deny/enrollment/verification.");

// Clinic Phase 26: MFA sign-in from a native-style cookie-continuous client.
// Better Auth must NOT return a bearer token on a password-only challenge.
// The second factor has to mint the actual signed bearer token, never a
// client-generated session or a copied challenge cookie.
const phase26SignIn=await http("/api/auth/sign-in/email",{
 email,password:newPassword,rememberMe:false
});
await expectStatus(phase26SignIn,[200],"C26 MFA password step");
const challenge=await phase26SignIn.json();
assert.equal(challenge.twoFactorRedirect,true,"MFA password must not authenticate");
assert.equal(phase26SignIn.headers.get("set-auth-token"),null,
 "password-only response exposed a bearer credential");
const phase26Cookie=cookieOf(phase26SignIn);
assert.match(phase26Cookie,/two_factor/i,
 "Better Auth pending second factor cookie missing");
// TOTP verification can reject reuse of an already consumed time-step code.
// Exercise the next 30-second period to test a distinct code.
const waitForNextTotp=30500-Date.now()%30000;
await new Promise(resolve=>setTimeout(resolve,waitForNextTotp));
const phase26Verified=await http("/api/auth/two-factor/verify-totp",{
 code:totp(uri),trustDevice:false
},phase26Cookie);
await expectStatus(phase26Verified,[200],"C26 final TOTP");
const phase26Data=await phase26Verified.json();
assert.ok(typeof phase26Data.token==="string"&&phase26Data.token.length>20,
 "TOTP final response did not establish a session");
assert.ok(phase26Data.user?.id,"TOTP final response missing user");
const phase26Bearer=phase26Verified.headers.get("set-auth-token");
assert.ok(phase26Bearer&&phase26Bearer.length>20,
 "Bearer plugin did not issue a token after TOTP");
const phase26Session=await fetch(base+"/api/auth/get-session",{
 headers:{Authorization:"Bearer "+phase26Bearer}
});
await expectStatus(phase26Session,[200],"C26 authenticated bearer session");
const phase26Identity=await phase26Session.json();
assert.equal(phase26Identity.user?.email,email);
const phase26Replay=await http("/api/auth/two-factor/verify-totp",{
 code:totp(uri),trustDevice:false
},phase26Cookie);
assert.ok(phase26Replay.status>=400,
 "Already consumed MFA challenge must not mint a second session");
console.log("C26 MFA integration passed: password challenge has no bearer, one verified TOTP mints bearer, replay denied.");
