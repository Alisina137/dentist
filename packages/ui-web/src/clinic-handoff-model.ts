/**
 * Clinic Phase 09 — pure, tenant-neutral workflow helpers.
 *
 * This module never returns clinical-readiness, consent or signed-note claims.
 * It only interprets appointment state already returned by the protected
 * tenant-scoped API. All writes are revalidated by the backend.
 */
export type HandoffState="requested"|"confirmed"|"arrived"|"in_treatment"|
 "completed"|"cancelled"|"no_show"|"rejected";
export type HandoffAppointment={
 startAt:string;endAt?:string|null;status:string
};
export function clinicCanLinkClinicalEncounter(status:string):boolean{
 // The clinical API allows appointment-linked notes only after arrival:
 // POST /v1/clinical/clinics/:clinicId/patients/:id/encounters
 return status==="arrived"||status==="in_treatment"||status==="completed";
}
export function clinicHandoffStatusKey(status:string):string{
 if(status==="requested")return "handoffRequested";
 if(status==="confirmed")return "handoffAwaiting";
 if(status==="arrived")return "handoffChecked";
 if(status==="in_treatment")return "handoffTreatment";
 if(status==="completed")return "handoffCompleted";
 return "handoffUnknown";
}
/**
 * Prefer an active, checked-in patient on the day of work, otherwise the next
 * pending/confirmed appointment, otherwise the most recent record. Never
 * fabricate a visit, signed note, or eligibility state from a date gap.
 */
export function clinicPickHandoffAppointment<T extends HandoffAppointment>(
 appointments:readonly T[],nowMs:number=Date.now()):T|undefined{
 if(!Number.isFinite(nowMs))throw new RangeError("INVALID_REFERENCE_TIME");
 const valid=appointments.filter(a=>Number.isFinite(Date.parse(a.startAt)));
 if(!valid.length)return undefined;
 const recentCutoff=nowMs-24*60*60*1000;
 const attended=valid.filter(a=>clinicCanLinkClinicalEncounter(a.status)&&
  a.status!=="completed"&&Date.parse(a.endAt||a.startAt)>=recentCutoff)
  .sort((a,b)=>Date.parse(b.startAt)-Date.parse(a.startAt));
 if(attended.length)return attended[0];
 const upcoming=valid.filter(a=>(a.status==="confirmed"||a.status==="requested")&&
  Date.parse(a.endAt||a.startAt)>=recentCutoff)
  .sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt));
 if(upcoming.length)return upcoming[0];
 return [...valid].sort((a,b)=>Date.parse(b.startAt)-Date.parse(a.startAt))[0];
}
/** Convert an actual UTC appointment instant to a Kabul-local Gregorian API day. */
export function clinicHandoffKabulDay(value:string):string{
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))throw new RangeError("INVALID_APPOINTMENT_TIME");
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
 const out=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 return [out.year,out.month,out.day].join("-");
}
