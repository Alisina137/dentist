/**
 * Clinic improvement Phase 16 — integration against the actual CI API and
 * PostgreSQL database. Public health/status checks and unauthenticated 401
 * probes only: no database mutations, staff sessions or patient identifiers.
 */
import assert from "node:assert/strict";
import {runPilotPreflight} from "../scripts/clinic-pilot-preflight.mjs";

const base=process.env.API_BASE_URL||"http://127.0.0.1:4000";
const out=[],errors=[];
const code=await runPilotPreflight(base,{
 info:line=>out.push(line),error:line=>errors.push(line)
});
assert.equal(code,0,"public API/DB must be healthy and private endpoints must deny anonymous access");
assert.deepEqual(errors,[]);
assert.ok(out.includes("PILOT_TECHNICAL_CHECKS=PASS"));
assert.ok(out.includes("PILOT_PRIVATE_TEAM_CONTEXT=PASS"));
assert.ok(out.includes("PILOT_PRIVATE_APPOINTMENTS=PASS"));
assert.ok(out.includes("PILOT_PRIVATE_NOTIFICATIONS=PASS"));
assert.ok(out.includes("PILOT_PRIVATE_REPORT=PASS"));
assert.ok(out.includes("PILOT_SERVER_FLAG=DISABLED"),
 "CI must never enable operator production pilot flags");
assert.ok(out.includes("PILOT_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW"));
console.info("CLINIC_PHASE16_INTEGRATION_OK: public JSON/API/DB ready, protected routes 401/no-store/request-id, production flag disabled; healthcare release remains NO-GO.");
