/**
 * Clinic improvement Phase 19 — redacted technical handoff.
 * The client creates a limited observation packet, never a release approval.
 * No patient, staff, clinic identity, URL, arbitrary server text, or session
 * material can enter the exported JSON.
 */
import {pilotReviewControls,type PilotSignal,type AuditSignal} from "./clinic-pilot-readiness-model";
import type {QualityCheck} from "./clinic-quality-model";

export const pilotHandoffSlots=["operations","staff","channels","appointments"] as const;
export const pilotHandoffChecks=["services","resources","clinicHours","dentistHours","staffMfa","email"] as const;
export type PilotHandoffSlot=typeof pilotHandoffSlots[number];
export type PilotReadState="ready"|"loading"|"auth"|"forbidden"|"unavailable";
export type PilotHandoffInput={
 clinicId:string;qualityClinicId:string|null;pilotClinicId:string|null;
 qualityCheckedAt:string|null;pilotCheckedAt:string|null;
 pilotSignal:PilotSignal;states:Record<PilotHandoffSlot,PilotReadState>|null;
 checks:QualityCheck[];audit:AuditSignal;
};
export type PilotHandoffReason="ready"|"scope"|"loading"|"stale"|"unverified";
export type PilotHandoffResult={available:boolean;reason:PilotHandoffReason;packet:Record<string,unknown>|null};
const unavailable=(reason:Exclude<PilotHandoffReason,"ready">):PilotHandoffResult=>
 ({available:false,reason,packet:null});
export const pilotHandoffFilename="dandanlink-clinic-technical-handoff.json";

/** A stale browser snapshot is not a reliable technical handoff. */
export function pilotHandoffFresh(value:string|null,now:Date=new Date()):boolean{
 if(typeof value!=="string"||!Number.isFinite(now.getTime()))return false;
 const ms=Date.parse(value);
 return Number.isFinite(ms)&&ms<=now.getTime()+10000&&now.getTime()-ms<=300000;
}

export function clinicPilotHandoff(input:PilotHandoffInput,now:Date=new Date()):PilotHandoffResult{
 if(!input||!input.clinicId||input.qualityClinicId!==input.clinicId||
  input.pilotClinicId!==input.clinicId)return unavailable("scope");
 if(!input.states||pilotHandoffSlots.some(slot=>input.states?.[slot]==="loading"))
  return unavailable("loading");
 if(pilotHandoffSlots.some(slot=>input.states?.[slot]!=="ready")||
  input.pilotSignal==="unverified")return unavailable("unverified");
 if(!pilotHandoffFresh(input.qualityCheckedAt,now)||
  !pilotHandoffFresh(input.pilotCheckedAt,now))return unavailable("stale");
 if(!Array.isArray(input.checks)||input.checks.length!==pilotHandoffChecks.length)
  return unavailable("unverified");
 const states=new Map<string,string>();
 for(const row of input.checks){
  if(!row||!pilotHandoffChecks.some(id=>id===row.id)||
   states.has(row.id)||!["pass","action","unknown"].includes(row.state))
   return unavailable("unverified");
  states.set(row.id,row.state);
 }
 if(pilotHandoffChecks.some(id=>!states.has(id))||
  [...states.values()].includes("unknown"))return unavailable("unverified");
 const audit=input.audit;
 const boundedInt=(value:unknown,max:number)=>typeof value==="number"&&
  Number.isSafeInteger(value)&&value>=0&&value<=max;
 if(!audit||audit.bounded!==true||!boundedInt(audit.events,60)||
  !boundedInt(audit.successful,60)||!boundedInt(audit.failed,60)||
  audit.successful!+audit.failed!==audit.events)return unavailable("unverified");
 const passed=[...states.values()].filter(v=>v==="pass").length;
 const action=[...states.values()].filter(v=>v==="action").length;
 // The packet is constructed field by field from narrow scalars.
 const packet={
  schema:"dandanlink.clinic.technical-handoff.v1",
  collectedAt:now.toISOString(),
  classification:"REDACTED_NONCLINICAL_OBSERVATIONS",
  scope:"AUTHORIZED_CLINIC_READS_IDENTITY_OMITTED",
  dataWindowMinutes:5,
  privateEndpointChecks:pilotHandoffSlots.map(id=>({id,response:"validated"})),
  operationalSetup:{configured:passed,attentionNeeded:action,total:pilotHandoffChecks.length,
   diagnosticOnly:true},
  auditWindow:{observedEvents:audit.events,successful:audit.successful,
   otherOutcomes:audit.failed,maximumEvents:60,completeCoverageProven:false},
  serverPilotFlag:input.pilotSignal==="blocked"?"disabled":"operator_marked_requires_evidence",
  independentEvidence:pilotReviewControls.map(control=>({
   id:control.id,status:"NOT_VERIFIED_IN_THIS_REPORT"
  })),
  releaseDecision:"NO_GO_PENDING_INDEPENDENT_REVIEW",
  limitations:[
   "Not an independent legal, clinical, privacy, security or accessibility approval.",
   "Does not prove complete audit logging, backup restore, staff competence or performance SLO.",
   "Manual signed evidence and external pilot authorization are still mandatory."
  ]
 };
 return {available:true,reason:"ready",packet};
}
