import type {Request,Response,NextFunction} from "express";
// Release switches are operator attestations, not self-certifying legal approvals.
// Production patient writes are disabled until reviews have independently confirmed.
const flags=[
 ["legalPrivacy","PH19_LEGAL_PRIVACY_APPROVED"],
 ["clinicalReview","PH19_CLINICAL_REVIEW_APPROVED"],
 ["hostingEncryption","PH19_HOSTING_SECURITY_APPROVED"],
 ["backupRestore","PH19_BACKUP_RESTORE_APPROVED"],
 ["penetrationTest","PH19_PENETRATION_TEST_APPROVED"],
 ["accessReview","PH19_ACCESS_REVIEW_APPROVED"],
 ["criticalAlerts","PH19_ALERTS_APPROVED"],
 ["accessibilityRTL","PH19_ACCESSIBILITY_RTL_APPROVED"],
 ["pilotRoster","PH19_PILOT_ROSTER_APPROVED"]
] as const;
export function getPilotReadiness(){
 const controls=flags.map(([id,key])=>({id,complete:process.env[key]==="true"}));
 const approved=controls.every(x=>x.complete);
 const releaseEnabled=approved&&process.env.PH19_PILOT_RELEASE_ENABLED==="true";
 return {controls,passCount:controls.filter(x=>x.complete).length,
  overall:releaseEnabled?"operator_marked_pass":"blocked",releaseEnabled,
  caveat:"Operator-set status is NOT independent legal, clinical, security or provider certification. Maintain dated and independently reviewed evidence in the controlled pilot worksheet."};
}
export function protectHealthWrites(req:Request,res:Response,next:NextFunction){
 if(process.env.NODE_ENV!=="production"||getPilotReadiness().releaseEnabled||
   !["POST","PUT","PATCH","DELETE"].includes(req.method)){
  next();return;
 }
 // Public browsing and nonclinical account/setup workflows may remain accessible.
 // Clinical and financial writes cannot persist protected patient data before approval.
 if(!/^\/v1\/(?:registry|appointments|clinical|chart|treatments|billing|expenses|booking|patients|patient-favorites|reviews|portability)(?:\/|$)/.test(req.path)){
  next();return;
 }
 res.setHeader("Cache-Control","private, no-store");
 res.status(503).json({code:"PILOT_RELEASE_BLOCKED",messageKey:"errors.unavailable",
  note:"Protected data writes are disabled pending recorded legal, clinical and infrastructure approvals."});
}
