/** Structured, free-text-free pilot observation validation; rejects arbitrary PHI.
 * Never accept patient IDs, screenshots, clinical notes, emails, names, or URLs.
 */
export const pilotFields={
 area:["calendar","queue","booking","notifications","reports","finance","staff","settings","mobile","accessibility"],
 symptom:["crash","blank","slow","wrong_state","permission","navigation","localization","offline","visual","other"],
 severity:["blocker","high","medium","low"],
 frequency:["once","sometimes","always"],
 network:["wifi","slow","offline","unknown"],
 device:["desktop","android","ios","narrow"],
 locale:["en","fa-AF","ps-AF"]
} as const;
export type PilotInput={area:string;symptom:string;severity:string;frequency:string;
 network:string;device:string;locale:string};
export const pilotStatuses=["open","triaged","in_progress","resolved","deferred"] as const;
export const pilotReasons=["reproduced","fixed_in_build","not_reproducible","duplicate","followup"] as const;
const dictionary=(input:unknown):input is Record<string,unknown>=>
 Boolean(input)&&typeof input==="object"&&!Array.isArray(input);
export function validPilotInput(input:unknown):input is PilotInput{
 if(!dictionary(input))return false;
 const keys=Object.keys(pilotFields) as (keyof PilotInput)[];
 return Object.keys(input).length===keys.length&&keys.every(key=>
  Object.hasOwn(input,key)&&(pilotFields[key] as readonly string[]).includes(input[key] as string));
}
export function validPilotStatusChange(input:unknown):input is {
 status:typeof pilotStatuses[number];reason:typeof pilotReasons[number];revision:number}{
 if(!dictionary(input)||Object.keys(input).length!==3)return false;
 return pilotStatuses.includes(input.status as typeof pilotStatuses[number])&&
  pilotReasons.includes(input.reason as typeof pilotReasons[number])&&
  typeof input.revision==="number"&&Number.isSafeInteger(input.revision)&&input.revision>=1;
}
export function pilotTransition(oldStatus:string,nextStatus:string):boolean{
 if(oldStatus===nextStatus)return false;
 const transitions:Record<string,readonly string[]>={
  open:["triaged","deferred"],
  triaged:["in_progress","deferred"],
  in_progress:["resolved","deferred"],
  deferred:["triaged"],
  resolved:["triaged"]
 };
 return (transitions[oldStatus]||[]).includes(nextStatus);
}
