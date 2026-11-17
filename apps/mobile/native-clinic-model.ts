/** Clinic owner onboarding uses the SAME API contract as web Phase 02.
 * Planned dentist capacity is a declaration, NEVER a verified roster or a
 * published dentist. Real staff are invited and credential-reviewed later.
 */
export type ClinicDraft={
 legalName:string;displayName:string;clinicType:"solo"|"office"|"specialty";
 province:string;city:string;district:string;address:string;
 phone:string;email:string;licenseNumber:string;plannedDentistCount:string;
};
export const blankClinicDraft:ClinicDraft={
 legalName:"",displayName:"",clinicType:"office",
 province:"",city:"",district:"",address:"",
 phone:"",email:"",licenseNumber:"",plannedDentistCount:"1"
};
export type ClinicPlan={
 id:string;planKey:string;label:string;billingPeriod:"monthly"|"annual";
 priceAfn:number;staffLimit:number;branchLimit:number;trialDays:number;
 active?:boolean;version?:number
};
export type NativeClinicRole="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
export type NativeClinicSpace={
 clinicId:string;clinicName:string;clinicStatus:string;role:NativeClinicRole;
 membershipId:string;clinicianEnabled:boolean;capabilities:string[];
};
export type NativeClinicContext={
 name:string;email:string;mfaEnabled:boolean;clinics:NativeClinicSpace[];
};
export type NativeClinicRecord={
 id:string;displayName:string;status:string;revision:number;
 selectedPlanId:string;plannedDentistCount:number;
 province:string;city:string;phone:string;
};
export type ClinicOperations={
 metrics:{services:number;chairs:number;openDays:number;scheduledDentists:number};
 readyForPreview:boolean;
};
export type ClinicAppointments={
 todayTotal:number;weekTotal:number;counts:Record<string,number>;
};
export const clinicOnboardingSteps=["identity","plan","review"] as const;

const bounded=(text:string,min:number,max:number):boolean=>
 text.trim().length>=min&&text.trim().length<=max;
export function plannedDentists(value:unknown):number|null{
 if(typeof value!=="string"||!/^\d{1,3}$/.test(value.trim()))return null;
 const count=Number(value);
 return Number.isSafeInteger(count)&&count>=1&&count<=500?count:null;
}
export function clinicDraftErrors(draft:ClinicDraft):string[]{
 const errors:string[]=[];
 const required:[keyof ClinicDraft,number,number][]=[
  ["legalName",2,120],["displayName",2,100],["province",2,80],
  ["city",2,80],["address",5,250]
 ];
 for(const [key,min,max] of required){
  if(!bounded(draft[key],min,max))errors.push(key);
 }
 for(const [key,max] of [["district",80],["licenseNumber",80]] as const){
  if(draft[key].trim().length>max)errors.push(key);
 }
 const phone=draft.phone.replace(/[\s()-]/g,"");
 if(!/^(\+93\d{9}|0\d{9}|\+[1-9]\d{7,14})$/.test(phone))errors.push("phone");
 if(!bounded(draft.email,5,160)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
  errors.push("email");
 if(!["solo","office","specialty"].includes(draft.clinicType))errors.push("clinicType");
 if(plannedDentists(draft.plannedDentistCount)===null)errors.push("plannedDentistCount");
 return errors;
}
export function clinicRegistrationPayload(draft:ClinicDraft,selectedPlanId:string){
 const errors=clinicDraftErrors(draft);
 if(errors.length||!selectedPlanId)throw new Error("CLINIC_REGISTRATION_INVALID");
 return {
  legalName:draft.legalName.trim(),displayName:draft.displayName.trim(),
  clinicType:draft.clinicType,province:draft.province.trim(),
  city:draft.city.trim(),district:draft.district.trim()||null,
  address:draft.address.trim(),phone:draft.phone.replace(/[\s()-]/g,""),
  email:draft.email.trim().toLowerCase(),licenseNumber:draft.licenseNumber.trim()||null,
  plannedDentistCount:plannedDentists(draft.plannedDentistCount),
  selectedPlanId
 };
}
export function validClinicContext(value:unknown):value is NativeClinicContext{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const x=value as Record<string,unknown>;
 if(typeof x.name!=="string"||typeof x.email!=="string"||
  typeof x.mfaEnabled!=="boolean"||!Array.isArray(x.clinics)||x.clinics.length>100)return false;
 const ids=new Set<string>();
 return x.clinics.every(value=>{
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  if(typeof row.clinicId!=="string"||!/^[a-f0-9-]{36}$/i.test(row.clinicId)||
    ids.has(row.clinicId)||typeof row.clinicName!=="string"||
    typeof row.clinicStatus!=="string"||typeof row.membershipId!=="string"||
    !["owner","manager","dentist","receptionist","assistant","cashier"].includes(String(row.role))||
    typeof row.clinicianEnabled!=="boolean"||
    !Array.isArray(row.capabilities)||!row.capabilities.every(x=>typeof x==="string"))return false;
  ids.add(row.clinicId);return true;
 });
}
export function clinicHomeMetrics(payload:unknown):ClinicOperations|null{
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return null;
 const x=payload as Record<string,unknown>;
 if(!x.metrics||typeof x.metrics!=="object"||Array.isArray(x.metrics))return null;
 const values=x.metrics as Record<string,unknown>;
 const valid=(key:string)=>typeof values[key]==="number"&&
  Number.isSafeInteger(values[key])&&Number(values[key])>=0;
 if(!["services","chairs","openDays","scheduledDentists"].every(valid)||
   typeof x.readyForPreview!=="boolean")return null;
 return {metrics:{
  services:Number(values.services),chairs:Number(values.chairs),
  openDays:Number(values.openDays),scheduledDentists:Number(values.scheduledDentists)
 },readyForPreview:x.readyForPreview};
}
export function clinicAppointmentMetrics(payload:unknown):ClinicAppointments|null{
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return null;
 const x=payload as Record<string,unknown>;
 if(typeof x.todayTotal!=="number"||!Number.isSafeInteger(x.todayTotal)||
  x.todayTotal<0||typeof x.weekTotal!=="number"||
  !Number.isSafeInteger(x.weekTotal)||x.weekTotal<0||
  !x.counts||typeof x.counts!=="object"||Array.isArray(x.counts))return null;
 const counts=x.counts as Record<string,unknown>;
 if(!Object.values(counts).every(n=>typeof n==="number"&&
  Number.isSafeInteger(n)&&n>=0))return null;
 return {todayTotal:x.todayTotal,weekTotal:x.weekTotal,
  counts:counts as Record<string,number>};
}
