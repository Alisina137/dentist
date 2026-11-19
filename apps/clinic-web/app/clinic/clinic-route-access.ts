/**
 * Phase 28: clinic sidebar is the source of allowed top-level destinations;
 * this secondary page mount gate protects nested clinical and admin routes.
 * It is NOT authorization — each API route independently checks membership,
 * clinician scope and tenant, and PH19 clinical production release gates.
 */
export type ClinicActorRole="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
const manager=(r:ClinicActorRole)=>r==="owner"||r==="manager";
const clinical=(r:ClinicActorRole,enabled:boolean)=>r==="dentist"||manager(r)&&enabled;
const starts=(path:string,base:string)=>path===base||path.startsWith(base+"/");
const clinicalPatientSubroute=(path:string)=>/^\/clinic\/patients\/[^/]+\/(?:chart|visits|treatments|files)(?:\/|$)/.test(path);
const billRoute=(path:string)=>/^\/clinic\/patients\/[^/]+\/billing(?:\/|$)/.test(path);
const editRoute=(path:string)=>/^\/clinic\/patients\/[^/]+\/edit(?:\/|$)/.test(path);
export function clinicPageAllowed(
 role:ClinicActorRole,clinicianEnabled:boolean,membershipId:string,
 pathname:string,allowedPaths:readonly string[]
):boolean{
 if(pathname==="/clinic"||pathname==="/clinic/")return true;
 if(!pathname.startsWith("/clinic/")||pathname.includes("//")||
  pathname.includes(".."))return false;
 // It must be one of the active user's visible sidebar destinations.
 // This prevents a cashier from navigating directly to a clinician-only
 // tab, including route segments with hidden detail IDs.
 if(!allowedPaths.some(path=>path!=="/clinic"&&starts(pathname,path)))return false;
 if(starts(pathname,"/clinic/clinical"))
  return clinical(role,clinicianEnabled)||role==="assistant";
 if(starts(pathname,"/clinic/appointments/requests"))
  return manager(role)||role==="dentist"||role==="receptionist";
 if(clinicalPatientSubroute(pathname))return clinical(role,clinicianEnabled);
 if(billRoute(pathname))return manager(role)||role==="cashier"||role==="receptionist";
 if(editRoute(pathname))return manager(role)||role==="dentist"||role==="receptionist";
 if(starts(pathname,"/clinic/patients/new")||starts(pathname,"/clinic/patients/import"))
  return manager(role)||role==="dentist"||role==="receptionist";
 if(starts(pathname,"/clinic/staff/")){
  if(manager(role))return true;
  return pathname==="/clinic/staff/"+encodeURIComponent(membershipId);
 }
 if(starts(pathname,"/clinic/appointments/new"))
  return manager(role)||role==="dentist"||role==="receptionist";
 if(starts(pathname,"/clinic/settings/export")||
  starts(pathname,"/clinic/settings/subscription")||
  pathname==="/clinic/settings")return role==="owner";
 return true;
}
