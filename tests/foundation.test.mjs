import test from "node:test";
import assert from "node:assert/strict";
import { normalizePreference, requireTenantScope, hasAdminAccess, safeRedirectPath } from "../packages/domain/src/index.js";

test("locale and calendar combinations must be explicit", () => {
  assert.deepEqual(normalizePreference("fa-AF", "solar_hijri"), { ok: true, locale: "fa-AF", calendar: "solar_hijri" });
  assert.equal(normalizePreference("fr", "solar_hijri").ok, false);
  assert.equal(normalizePreference("ps-AF", "invalid").ok, false);
});
test("default tenant boundary denies absent or mismatching clinics", () => {
  assert.equal(requireTenantScope(null, "c1").allowed, false);
  assert.equal(requireTenantScope("c1", "c2").allowed, false);
  assert.equal(requireTenantScope("c1", "c1").allowed, true);
});
test("platform admin authorization requires membership, verification and MFA", () => {
  assert.equal(hasAdminAccess(null, true, true), false);
  assert.equal(hasAdminAccess({ revokedAt: null }, false, true), false);
  assert.equal(hasAdminAccess({ revokedAt: null }, true, false), false);
  assert.equal(hasAdminAccess({ revokedAt: new Date() }, true, true), false);
  assert.equal(hasAdminAccess({ revokedAt: null }, true, true), true);
});
test("post-auth redirect cannot accept external or protocol-relative paths", () => {
  assert.equal(safeRedirectPath("//evil.site"), "/clinic");
  assert.equal(safeRedirectPath("https://evil.site"), "/clinic");
  assert.equal(safeRedirectPath("/clinic"), "/clinic");
});
