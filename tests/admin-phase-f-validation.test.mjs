import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Phase F security posture uses MFA enforced private aggregates without protected identifiers",()=>{
 const api=read("apps/api/src/admin-security-router.ts");
 const server=read("apps/api/src/server.ts");
 assert.match(server,/app\.use\("\/v1\/admin\/security", adminSecurityRouter\(\)\)/);
 for(const token of ["router.use(opsIdentity)","opsAdmin(req)","privateOps(res)",
   'router.get("/posture"',"auth_two_factors","auth_sessions","platform_admins",
   "platform_support_agents","two_factor_enabled","verified=true","email_verified",
   "audit_events","support.agent.revoke","getPilotReadiness","unsuccessfulLast24",
   "supportGrantsLast30","activePrivilegedSessions","releaseEnabled"])
  assert.ok(api.includes(token),"Security posture missing "+token);
 assert.doesNotMatch(api,/patient_profiles|clinic_invoices|clinical_encounters|clinic_payment_entries|medical_record/);
 assert.doesNotMatch(api,/SELECT.*(?:email|password|secret|token|ip_address)/i);
 assert.doesNotMatch(api,/res\.json\(\{[^}]*actorId/i);
 assert.doesNotMatch(api,/Math\.random|fakeData|mockData/);
});
test("Phase F security page has explicit operator-only safety cautions, actionable MFA and audit views",()=>{
 const ui=read("apps/admin-web/app/admin/security/security-portal.tsx");
 const page=read("apps/admin-web/app/admin/security/page.tsx");
 const css=read("apps/admin-web/app/admin/security/security-final.css");
 assert.match(page,/AdminSecurityPortal/);
 for(const token of ["AdminSecurityPortal","credentials:\"include\"","cache:\"no-store\"",
  "AbortController","60" ,"aria-label","aria-valuenow","MFA_REQUIRED",
  "access.admins.mfaMissing","access.support.mfaMissing","audit.topActions",
  "release.enabled","noHealth","actionSettings","actionPilot","actionMonitor",
  "timeZone:\"Asia/Kabul\"","\"fa-AF\"","\"ps-AF\""])
  assert.ok(ui.includes(token),"Missing security UX "+token);
 for(const token of [".shell-admin .adm-f-security",".adm-f-stat-grid",".adm-f-panel",
  ".adm-f-progress",".adm-f-revoke-panel","max-width:640px","prefers-reduced-motion"])
  assert.ok(css.includes(token),"Missing responsive/accessibility style "+token);
});
test("Phase F support-agent mutations require a deliberate, locally-scoped confirmation and MFA status",()=>{
 const ui=read("packages/ui-web/src/phase18-admin.tsx");
 const api=read("apps/api/src/support-router.ts");
 for(const token of ["grantVerified","revokeConfirmed","revokeId!==id",
  "if(!grantVerified||busy)return","onClick={()=>{setRevokeId(a.user_id);setRevokeConfirmed(false);}}",
  "disabled={busy||!revokeConfirmed}","disabled={busy||!grantVerified}",
  "mfa_ready","agentSearch","settingsIntro","editSelected","resetEditor",
  "editingCategory","editingTemplate","adm-f-settings"])
  assert.ok(ui.includes(token),"Missing safe settings feature "+token);
 assert.doesNotMatch(ui.slice(ui.indexOf("function OperationSettings(")),/window\.confirm/);
 assert.match(api,/u\.two_factor_enabled=true AND coalesce\(f\.verified,false\)=true/);
 assert.match(api,/opsAdmin\(req\)/);
 assert.match(api,/support\.agent\.grant/);
 assert.match(api,/support\.agent\.revoke/);
 assert.match(api,/ELIGIBLE_VERIFIED_USER_NOT_FOUND/);
});
test("Phase F accessible admin command overlay restores focus and pilot checklist remains human-gated",()=>{
 const shell=read("apps/admin-web/app/admin/admin-shell.tsx");
 const center=read("apps/admin-web/app/admin/command-center.tsx");
 const pilot=read("packages/ui-web/src/phase19-admin.tsx");
 const release=read("apps/api/src/pilot-gate.ts");
 for(const token of ["previousCommandFocus","searchTriggerRef","noticeTriggerRef",
   "requestAnimationFrame","closeCommand","onClose={closeCommand}"])
  assert.ok(shell.includes(token),"Focus restoration missing "+token);
 assert.ok(center.includes("tabIndex={compact?-1:undefined}"));
 assert.ok(center.includes('initialTab!=="search"'));
 for(const token of ['role="progressbar"',"aria-valuenow","blockedCount",
  "manualApproval","data.releaseEnabled"])
  assert.ok(pilot.includes(token),"Pilot accessibility missing "+token);
 assert.match(release,/PH19_PILOT_RELEASE_ENABLED/);
 assert.match(release,/controls\.every\(x=>x\.complete\)/);
 assert.match(release,/NODE_ENV!=="production"/);
 assert.doesNotMatch(read("apps/clinic-web/app/layout.tsx"),/security-final.css/);
 assert.doesNotMatch(read("apps/patient-web/app/layout.tsx"),/security-final.css/);
});
