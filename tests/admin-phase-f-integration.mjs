import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {request,ok,admin,owner} from "./phase07-fixture.mjs";
await import("./admin-phase-e-integration.mjs");

const require=createRequire(new URL("../packages/db/package.json",import.meta.url));
const postgres=require("postgres");
const db=postgres(process.env.DATABASE_URL,{max:2});
try{
 const base="/v1/admin/security";
 ok(await request(base+"/posture"),[401],"anonymous cannot enumerate platform security posture");
 ok(await request(base+"/posture","GET",undefined,owner.session),[403],
  "clinic owner cannot enumerate admin/staff MFA readiness");
 const response=await request(base+"/posture","GET",undefined,admin.session);
 const posture=ok(response,[200],"MFA admin can inspect aggregate security posture");
 assert.match(response.headers.get("cache-control")||"",/no-store/);
 assert.equal(posture.timezone,"Asia/Kabul");
 assert.ok(posture.notice.toLowerCase().includes("not proof"));
 assert.ok(posture.privacy.includes("session tokens"));
 const [admins]=await db`SELECT count(*)::int AS active,
  count(*) FILTER (WHERE u.two_factor_enabled=true AND f.verified=true)::int AS mfa_ready
  FROM platform_admins a JOIN auth_users u ON u.id=a.user_id
  LEFT JOIN auth_two_factors f ON f.user_id=u.id WHERE a.revoked_at IS NULL`;
 const [support]=await db`SELECT count(*)::int AS active,
  count(*) FILTER (WHERE u.two_factor_enabled=true AND f.verified=true)::int AS mfa_ready
  FROM platform_support_agents s JOIN auth_users u ON u.id=s.user_id
  LEFT JOIN auth_two_factors f ON f.user_id=u.id WHERE s.revoked_at IS NULL`;
 assert.equal(posture.access.admins.active,admins.active,"real admin count");
 assert.equal(posture.access.admins.mfaReady,admins.mfa_ready,"real enrolled admin MFA count");
 assert.equal(posture.access.admins.mfaMissing,admins.active-admins.mfa_ready);
 assert.equal(posture.access.support.active,support.active,"real support grants count");
 assert.equal(posture.access.support.mfaReady,support.mfa_ready,"real enrolled support MFA count");
 assert.equal(posture.access.support.mfaMissing,support.active-support.mfa_ready);
 assert.ok(posture.access.activePrivilegedSessions>=1,"signed-in privileged session counted");
 for(const name of ["unsuccessfulLast30","unsuccessfulLast24","supportGrantsLast30",
  "supportRevocationsLast30"])
  assert.ok(Number.isInteger(posture.audit[name])&&posture.audit[name]>=0,name);
 assert.ok(posture.audit.topActions.every(x=>
  Object.keys(x).every(k=>["action","outcome","count"].includes(k))));
 const serialized=JSON.stringify(posture);
 for(const sensitive of ['"user_id"','"email"','"sessionToken"','"ip_address"',
  '"patientId"','"requester_id"','"actor_id"'])
  assert.ok(!serialized.includes(sensitive),"security posture leaked private ID "+sensitive);
 const readiness=ok(await request("/v1/portability/admin/readiness","GET",undefined,admin.session),
  [200],"pilot approval remains independently gated");
 assert.equal(posture.release.enabled,readiness.releaseEnabled);
 assert.equal(posture.release.marked,readiness.passCount);
 assert.equal(posture.release.total,readiness.controls.length);
 assert.equal(posture.release.enabled,false,"CI and default pilot release are blocked");
 ok(await request("/v1/support/admin/settings","GET",undefined,owner.session),
  [403],"clinic owner cannot inspect support role details");
 const settingsResponse=await request("/v1/support/admin/settings","GET",undefined,admin.session);
 const settings=ok(settingsResponse,[200],"MFA admin can audit delegated support grants");
 assert.match(settingsResponse.headers.get("cache-control")||"",/no-store/);
 assert.ok(Array.isArray(settings.agents));
 for(const agent of settings.agents){
  assert.equal(typeof agent.mfa_ready,"boolean");
  assert.equal(typeof agent.email_verified,"boolean");
  assert.ok(!("email" in agent),"display only non-secret agent status");
 }
 console.log("ADMIN_PHASE_F_OK — aggregate MFA posture, immutable audit counts, delegated agent badges and human-gated launch");
} finally{
 await db.end();
}
