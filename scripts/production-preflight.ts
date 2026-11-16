/**
 * Stage L operator preflight (read-only). Never displays env values or secrets.
 * A successful exit means configuration syntax passed, NOT healthcare approval.
 *
 * Run: pnpm exec tsx scripts/production-preflight.ts
 */
import {productionConfigurationIssues} from "../apps/api/src/production-config.js";
import {getPilotReadiness} from "../apps/api/src/pilot-gate.js";

const issues=productionConfigurationIssues(process.env);
if(issues.length){
 console.error("DANDANLINK_CONFIG_BLOCKED: "+issues.length+" configuration issue(s)");
 for(const issue of issues)console.error(" - "+issue);
 process.exitCode=1;
}else{
 console.info("DANDANLINK_CONFIG_CHECK_PASS (configuration shape only; no network/provider verification)");
}
const gate=getPilotReadiness();
console.info("HEALTHCARE_PILOT="+(gate.releaseEnabled?"OPERATOR_MARKED_PASS_REQUIRES_INDEPENDENT_EVIDENCE":"NO_GO"));
console.info("CONTROL_FLAGS_SET="+gate.passCount+"/"+gate.controls.length);
console.info("NOT_CERTIFIED: legal, clinical, penetration testing, infrastructure, accessibility and backup evidence require human signoff.");
