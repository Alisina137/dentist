/**
 * Structured clinic UAT observations. Entire UI + API surface is enum-only;
 * no free text, patients, contacts, staff identities, screenshots or links.
 */
export const pilotChoices={
 area:["calendar","queue","booking","notifications","reports","finance","staff","settings","mobile","accessibility"],
 symptom:["crash","blank","slow","wrong_state","permission","navigation","localization","offline","visual","other"],
 severity:["blocker","high","medium","low"],
 frequency:["once","sometimes","always"],
 network:["wifi","slow","offline","unknown"],
 device:["desktop","android","ios","narrow"],
 locale:["en","fa-AF","ps-AF"]
} as const;
export type PilotChoice=keyof typeof pilotChoices;
export type PilotObservationInput={area:string;symptom:string;severity:string;frequency:string;
 network:string;device:string;locale:string};
export type PilotStatus="open"|"triaged"|"in_progress"|"resolved"|"deferred";
export const pilotStatuses=["open","triaged","in_progress","resolved","deferred"] as const;
export const pilotReasons=["reproduced","fixed_in_build","not_reproducible","duplicate","followup"] as const;
export type PilotObservation=PilotObservationInput & {
 id:string;status:PilotStatus;resolution:string|null;revision:number;
 createdAt:string;updatedAt:string
};
const dict=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==="object"&&!Array.isArray(v);
export function pilotValidInput(v:unknown):v is PilotObservationInput{
 if(!dict(v))return false;
 const keys=Object.keys(pilotChoices) as PilotChoice[];
 return Object.keys(v).length===keys.length&&keys.every(key=>
  Object.hasOwn(v,key)&&(pilotChoices[key] as readonly string[]).includes(v[key] as string));
}
function safeDate(value:unknown):value is string{
 return typeof value==="string"&&/^\d{4}-\d\d-\d\dT/.test(value)&&
  Number.isFinite(Date.parse(value));
}
export function pilotValidObservation(v:unknown):v is PilotObservation{
 if(!dict(v))return false;
 const allowed=[...Object.keys(pilotChoices),"id","status","resolution","revision","createdAt","updatedAt"];
 return Object.keys(v).length===allowed.length&&allowed.every(key=>Object.hasOwn(v,key))&&
  pilotValidInput(Object.fromEntries(Object.keys(pilotChoices).map(k=>[k,v[k]])))&&
  typeof v.id==="string"&&/^[0-9a-f-]{36}$/i.test(v.id)&&
  pilotStatuses.includes(v.status as PilotStatus)&&
  (v.resolution===null||pilotReasons.includes(v.resolution as typeof pilotReasons[number]))&&
  typeof v.revision==="number"&&Number.isSafeInteger(v.revision)&&v.revision>=1&&
  safeDate(v.createdAt)&&safeDate(v.updatedAt);
}
export function pilotValidList(v:unknown):v is {observations:PilotObservation[];
 window:40;scope:"clinic_metadata_only"}{
 if(!dict(v)||Object.keys(v).length!==3||v.window!==40||
  v.scope!=="clinic_metadata_only"||!Array.isArray(v.observations)||
  v.observations.length>40)return false;
 const ids=new Set<string>();
 return v.observations.every(item=>{
  if(!pilotValidObservation(item)||ids.has(item.id))return false;
  ids.add(item.id);return true;
 });
}
export function pilotStatusTransitions(value:string):PilotStatus[]{
 const map:Record<string,PilotStatus[]>={
  open:["triaged","deferred"],triaged:["in_progress","deferred"],
  in_progress:["resolved","deferred"],deferred:["triaged"],resolved:["triaged"]
 };
 return map[value]||[];
}
export function pilotFeedbackStats(rows:PilotObservation[]){
 return {
  returned:rows.length,
  open:rows.filter(x=>x.status==="open").length,
  critical:rows.filter(x=>["blocker","high"].includes(x.severity)&&x.status!=="resolved").length,
  resolved:rows.filter(x=>x.status==="resolved").length
 };
}
export function pilotFeedbackFilter(rows:PilotObservation[],status:string,area:string){
 return rows.filter(row=>(status==="all"||row.status===status)&&
  (area==="all"||row.area===area));
}
export function pilotFeedbackPage<T>(rows:T[],page:number,size=5){
 const pages=Math.max(1,Math.ceil(rows.length/size));
 const current=Math.max(1,Math.min(pages,Number.isSafeInteger(page)?page:1));
 return {current,pages,rows:rows.slice((current-1)*size,current*size),
  total:rows.length,start:rows.length?(current-1)*size+1:0,
  end:Math.min(current*size,rows.length)};
}
