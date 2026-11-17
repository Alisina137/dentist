/** Phase 20: all readiness is server-observed, never a client-granted approval. */
export type NativeClinicDocument={id:string;kind:string;fileName:string;sizeBytes:number};
export type NativeClinicHistory={action:string;reason:string|null;createdAt:string};
export type NativeClinicReview={
 clinic:{id:string;status:string;revision:number;displayName:string;legalName:string;
  plannedDentistCount:number;selectedPlanId:string|null};
 documents:NativeClinicDocument[];history:NativeClinicHistory[];
 effectiveStatus:string;plan:null|{id:string;label:string;priceAfn:number}
};
export type NativeReadinessStage="complete"|"action"|"waiting";
export type NativeClinicReadiness={
 checks:{id:"identity"|"plan"|"license"|"submitted"|"approved";state:NativeReadinessStage}[];
 complete:number;total:5;submitted:boolean;approved:boolean;canEdit:boolean;canSubmit:boolean;
};
export function validateClinicReview(value:unknown,expectedId:string):value is NativeClinicReview{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const d=value as Record<string,unknown>;
 if(!d.clinic||typeof d.clinic!=="object"||Array.isArray(d.clinic))return false;
 const c=d.clinic as Record<string,unknown>;
 if(c.id!==expectedId||typeof c.status!=="string"||
  !["draft","needs_info","rejected","pending","approved","suspended"].includes(c.status)||
  !Number.isSafeInteger(c.revision)||Number(c.revision)<1||
  typeof c.displayName!=="string"||typeof c.legalName!=="string"||
  !Number.isSafeInteger(c.plannedDentistCount)||
  Number(c.plannedDentistCount)<1||Number(c.plannedDentistCount)>500||
  !(c.selectedPlanId===null||typeof c.selectedPlanId==="string"))return false;
 if(!Array.isArray(d.documents)||d.documents.length>100||
  !d.documents.every(x=>x&&typeof x==="object"&&
   typeof x.id==="string"&&typeof x.kind==="string"&&
   typeof x.fileName==="string"&&Number.isSafeInteger(x.sizeBytes)&&x.sizeBytes>0))return false;
 if(!Array.isArray(d.history)||d.history.length>200||
  !d.history.every(x=>x&&typeof x==="object"&&
   typeof x.action==="string"&&typeof x.createdAt==="string"&&
   (x.reason===null||typeof x.reason==="string")))return false;
 return typeof d.effectiveStatus==="string"&&(d.plan===null||
  !!d.plan&&typeof d.plan==="object"&&typeof (d.plan as Record<string,unknown>).label==="string");
}
export function nativeClinicReadiness(review:NativeClinicReview):NativeClinicReadiness{
 const clinic=review.clinic;
 const license=review.documents.some(x=>x.kind==="clinic_license");
 const submitted=["pending","approved","suspended"].includes(clinic.status);
 const approved=clinic.status==="approved";
 const plan=!!clinic.selectedPlanId;
 const checks=[
  {id:"identity" as const,state:"complete" as const},
  {id:"plan" as const,state:plan?"complete" as const:"action" as const},
  {id:"license" as const,state:license?"complete" as const:"action" as const},
  {id:"submitted" as const,state:submitted?"complete" as const:"action" as const},
  {id:"approved" as const,state:approved?"complete" as const:
    submitted?"waiting" as const:"action" as const}
 ];
 return {checks,complete:checks.filter(x=>x.state==="complete").length,total:5,
  submitted,approved,canEdit:["draft","needs_info","rejected"].includes(clinic.status),
  canSubmit:["draft","needs_info","rejected"].includes(clinic.status)&&plan&&license};
}
export type DentistDraftNative={
 displayName:string;specialty:string;qualifications:string;professionalLicense:string;
 experienceYears:string;biography:string
};
export const blankDentistDraft:DentistDraftNative={
 displayName:"",specialty:"",qualifications:"",professionalLicense:"",
 experienceYears:"",biography:""
};
export function dentistDraftIssues(value:DentistDraftNative):string[]{
 const errors:string[]=[];
 const length=(text:string,min:number,max:number)=>text.trim().length>=min&&text.trim().length<=max;
 if(!length(value.displayName,2,120))errors.push("displayName");
 for(const [key,max] of [["specialty",120],["qualifications",300],
  ["professionalLicense",100],["biography",1000]] as const)
  if(value[key].trim().length>max)errors.push(key);
 if(value.experienceYears.trim()&&(!/^\d{1,2}$/.test(value.experienceYears.trim())||
   Number(value.experienceYears)>70))errors.push("experienceYears");
 return errors;
}
export function dentistDraftPayload(value:DentistDraftNative,version:number|null){
 if(dentistDraftIssues(value).length)throw Error("INVALID_DENTIST_PROFILE");
 return {displayName:value.displayName.trim(),specialty:value.specialty.trim()||null,
  qualifications:value.qualifications.trim()||null,
  professionalLicense:value.professionalLicense.trim()||null,
  experienceYears:value.experienceYears.trim()?Number(value.experienceYears):null,
  biography:value.biography.trim()||null,
  ...(version===null?{}:{draftVersion:version})};
}
export type DentistVerification={
 verification:{status:string;currentSubmissionId:string|null;validUntil:string|null};
 decisions:{decision:string;reason:string|null;created_at:string}[];
};
export const validDate=(value:string)=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+"T12:00:00Z");
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
};
export function credentialFormIssues(credentialType:string,credentialNumber:string,validUntil:string,
 today:string):string[]{
 const errors:string[]=[];
 if(credentialType.trim().length<3||credentialType.trim().length>100)errors.push("credentialType");
 if(credentialNumber.trim().length<3||credentialNumber.trim().length>120)errors.push("credentialNumber");
 if(!validDate(validUntil)||validUntil<=today)errors.push("validUntil");
 return errors;
}
