/**
 * Phase 23 – native clinic patient directory and authorized profile contracts.
 * Server endpoints stay authoritative for identity, role, clinic membership,
 * duplicate checks, clinical ownership, optimistic revisions, and pilot gates.
 * Only intentionally allowlisted scalars enter mobile component state.
 */
import type {NativeClinicRole} from "./native-clinic-model";
import {parseAppointment,type AppointmentView} from "./native-clinic-phase22-model";

export type PatientStatus="active"|"inactive"|"archived";
export type DirectoryFilter=PatientStatus|"all";
export type DirectorySort="activity"|"name";
export type PatientBrief={
 id:string;patientNumber:string;preferredName:string;familyName:string|null;
 status:PatientStatus;revision:number;updatedAt:string;
};
export type PatientDirectory={
 patients:PatientBrief[];total:number;page:number;pages:number;
 limit:10|20;status:DirectoryFilter;sort:DirectorySort;query:string;
};
export type PatientCounts={active:number;inactive:number;archived:number;total:number};
export type PatientProfile=PatientBrief&{
 phone:string|null;phoneVerified:boolean;
 alternateContact:string|null;dateOfBirth:string|null;
 ageEstimate:number|null;dobIsEstimated:boolean;
 province:string|null;city:string|null;address:string|null;emergencyContact:string|null;
};
export type PatientProfileResult={
 patient:PatientProfile;clinicalAvailable:boolean;appointmentsAvailable:boolean;
};
export type PatientAppointmentHistory={rows:AppointmentView[];total:number;truncated:boolean};
export type PatientEncounter={
 id:string;status:"draft"|"signed"|"amended";createdAt:string;authorName:string;
};
export type PatientTreatments={
 id:string;status:string;version:number;expectedSessions:number;
 stageCount:number;completedStages:number;
};
export type PatientDraft={
 preferredName:string;familyName:string;phone:string;alternateContact:string;
 dateOfBirth:string;ageEstimate:string;province:string;city:string;
 address:string;emergencyContact:string;noticeAcknowledged:boolean;
};
export const newPatientDraft=():PatientDraft=>({
 preferredName:"",familyName:"",phone:"",alternateContact:"",
 dateOfBirth:"",ageEstimate:"",province:"",city:"",address:"",
 emergencyContact:"",noticeAcknowledged:false
});
const object=(v:unknown):v is Record<string,unknown>=>
 !!v&&typeof v==="object"&&!Array.isArray(v);
const id=(v:unknown):v is string=>
 typeof v==="string"&&/^[0-9a-f-]{36}$/i.test(v);
const safeInt=(v:unknown,max=100000000):v is number=>
 typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=max;
const text=(v:unknown,max=160):v is string=>typeof v==="string"&&v.length<=max;
const optional=(v:unknown,max=160):v is string|null=>v===null||text(v,max);
const statuses=["active","inactive","archived"] as const;
const validIso=(v:unknown):v is string=>
 typeof v==="string"&&Number.isFinite(Date.parse(v))&&v.length<=40;
export function validBirthDate(v:unknown,now=new Date()):v is string{
 if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const epoch=Date.parse(v+"T00:00:00.000Z");
 return Number.isFinite(epoch)&&new Date(epoch).toISOString().slice(0,10)===v&&
  v<=now.toISOString().slice(0,10);
}
export function canReadPatients(role:NativeClinicRole){
 return ["owner","manager","dentist","receptionist","cashier"].includes(role);
}
export function canWritePatients(role:NativeClinicRole){
 return ["owner","manager","dentist","receptionist"].includes(role);
}
export function canViewPatientAppointments(role:NativeClinicRole){
 return ["owner","manager","dentist","receptionist"].includes(role);
}
export function canViewClinicalHistory(role:NativeClinicRole,clinicianEnabled:boolean){
 return role==="dentist"||["owner","manager"].includes(role)&&clinicianEnabled;
}
export function canChangePatientStatus(role:NativeClinicRole){
 return role==="owner"||role==="manager";
}
export function canViewContact(role:NativeClinicRole){return role!=="cashier"&&canReadPatients(role)}
export function directoryPath(clinicId:string,page:number,status:DirectoryFilter,
 sort:DirectorySort,query:string):string{
 if(!id(clinicId)||!safeInt(page,100000)||page<1||
  !["active","inactive","archived","all"].includes(status)||
  !["activity","name"].includes(sort))throw Error("INVALID_PATIENT_DIRECTORY");
 const normalized=query.trim().slice(0,120);
 return "/v1/registry/clinics/"+encodeURIComponent(clinicId)+
  "/patients?page="+page+"&limit=10&status="+status+"&sort="+sort+
  "&q="+encodeURIComponent(normalized);
}
export function parsePatientBrief(value:unknown):PatientBrief|null{
 if(!object(value)||!id(value.id)||!text(value.patientNumber,80)||
  !text(value.preferredName,120)||!optional(value.familyName,120)||
  !statuses.includes(value.status as PatientStatus)||
  !safeInt(value.revision)||value.revision<1||
  !validIso(value.updatedAt))return null;
 return {id:value.id,patientNumber:value.patientNumber,preferredName:value.preferredName,
  familyName:value.familyName as string|null,status:value.status as PatientStatus,
  revision:value.revision,updatedAt:value.updatedAt};
}
export function parsePatientCounts(value:unknown):PatientCounts|null{
 if(!object(value)||!object(value.counts)||!safeInt(value.total))return null;
 const {active,inactive,archived}=value.counts;
 if(!safeInt(active)||!safeInt(inactive)||!safeInt(archived)||
  active+inactive+archived!==value.total)return null;
 return {active,inactive,archived,total:value.total};
}
export function parseDirectory(value:unknown,expected:{page:number;status:DirectoryFilter;
 sort:DirectorySort;query:string}):PatientDirectory|null{
 if(!object(value)||!Array.isArray(value.patients)||value.patients.length>10||
  !safeInt(value.total)||!safeInt(value.page)||!safeInt(value.pages)||
  !safeInt(value.limit)||value.limit!==10||value.page!==expected.page||
  !["active","inactive","archived","all"].includes(String(value.status))||
  !["activity","name"].includes(String(value.sort))||
  value.status!==expected.status||value.sort!==expected.sort||
  value.query!==expected.query.trim().slice(0,120)||
  value.pages!==Math.max(1,Math.ceil(value.total/10))||
  value.page>value.pages||!text(value.query,120))return null;
 const patients:PatientBrief[]=[],seen=new Set<string>();
 for(const raw of value.patients){
  const brief=parsePatientBrief(raw);
  if(!brief||seen.has(brief.id)||expected.status!=="all"&&brief.status!==expected.status)return null;
  seen.add(brief.id);patients.push(brief);
 }
 if(patients.length===0&&value.total>0&&value.page<=value.pages&&value.page!==1)return null;
 return {patients,total:value.total,page:value.page,pages:value.pages,
  limit:10,status:expected.status,sort:expected.sort,query:expected.query.trim().slice(0,120)};
}
export function parsePatientProfile(value:unknown,expectedId:string,
 role:NativeClinicRole):PatientProfileResult|null{
 if(!object(value)||!object(value.patient)||typeof value.clinicalAvailable!=="boolean"||
  typeof value.appointmentsAvailable!=="boolean"||!canReadPatients(role))return null;
 const raw=value.patient,base=parsePatientBrief(raw);
 if(!base||base.id!==expectedId)return null;
 // Cashiers must never receive/reveal contact or health info even if API
 // accidentally includes it. The returned role-specific profile is minimal.
 if(role==="cashier"){
  return {patient:{...base,phone:null,phoneVerified:false,alternateContact:null,
   dateOfBirth:null,ageEstimate:null,dobIsEstimated:false,
   province:null,city:null,address:null,emergencyContact:null},
   clinicalAvailable:false,appointmentsAvailable:false};
 }
 if(!optional(raw.phone,24)||!optional(raw.alternateContact,120)||
  !optional(raw.dateOfBirth,10)||!optional(raw.province,80)||
  !optional(raw.city,80)||!optional(raw.address,250)||
  !optional(raw.emergencyContact,160)||
  typeof raw.phoneVerified!=="boolean"||
  typeof raw.dobIsEstimated!=="boolean"||
  !(raw.ageEstimate===null||safeInt(raw.ageEstimate,120))||
  raw.dateOfBirth!==null&&!validBirthDate(raw.dateOfBirth))return null;
 if(raw.dateOfBirth!==null&&raw.ageEstimate!==null)return null;
 return {patient:{...base,phone:raw.phone as string|null,
  phoneVerified:raw.phoneVerified as boolean,
  alternateContact:raw.alternateContact as string|null,
  dateOfBirth:raw.dateOfBirth as string|null,
  ageEstimate:raw.ageEstimate as number|null,
  dobIsEstimated:raw.dobIsEstimated as boolean,
  province:raw.province as string|null,
  city:raw.city as string|null,address:raw.address as string|null,
  emergencyContact:raw.emergencyContact as string|null},
  clinicalAvailable:value.clinicalAvailable,
  appointmentsAvailable:value.appointmentsAvailable};
}
export function profileToDraft(profile:PatientProfile):PatientDraft{
 return {
  preferredName:profile.preferredName,familyName:profile.familyName??"",
  phone:profile.phone??"",alternateContact:profile.alternateContact??"",
  dateOfBirth:profile.dateOfBirth??"",
  ageEstimate:profile.ageEstimate===null?"":String(profile.ageEstimate),
  province:profile.province??"",city:profile.city??"",
  address:profile.address??"",emergencyContact:profile.emergencyContact??"",
  noticeAcknowledged:true
 };
}
export function validatePatientDraft(input:PatientDraft):string[]{
 const bad:string[]=[];
 if(input.preferredName.trim().length<2||input.preferredName.trim().length>120)
  bad.push("preferredName");
 for(const [name,max] of Object.entries({
  familyName:120,alternateContact:120,province:80,city:80,
  address:250,emergencyContact:160
 }) as [keyof PatientDraft,number][]){
  const value=String(input[name]).trim();
  if(value.length>max)bad.push(name);
 }
 const phone=input.phone.trim().replace(/[\s()-]/g,"");
 if(phone&& !/^(\+[1-9]\d{7,14}|0\d{9}|93\d{9})$/.test(phone))
  bad.push("phone");
 if(input.dateOfBirth!==""&&!validBirthDate(input.dateOfBirth))bad.push("dateOfBirth");
 if(input.ageEstimate!==""&&!/^\d{1,3}$/.test(input.ageEstimate))bad.push("ageEstimate");
 else if(input.ageEstimate!==""&&(Number(input.ageEstimate)<0||Number(input.ageEstimate)>120))
  bad.push("ageEstimate");
 if(input.ageEstimate!==""&&input.dateOfBirth!=="")bad.push("birthChoice");
 if(!input.noticeAcknowledged)bad.push("noticeAcknowledged");
 return bad;
}
export function patientPayload(input:PatientDraft,revision?:number){
 const bad=validatePatientDraft(input);
 if(bad.length)throw Error("INVALID_PATIENT_FIELDS:"+bad.join(","));
 if(revision!==undefined&&(!safeInt(revision)||revision<1))
  throw Error("INVALID_PATIENT_REVISION");
 const normalize=(s:string)=>s.trim()||null;
 return {preferredName:input.preferredName.trim(),
  familyName:normalize(input.familyName),
  phone:normalize(input.phone),alternateContact:normalize(input.alternateContact),
  dateOfBirth:normalize(input.dateOfBirth),
  ageEstimate:input.ageEstimate===""?null:Number(input.ageEstimate),
  province:normalize(input.province),city:normalize(input.city),
  address:normalize(input.address),emergencyContact:normalize(input.emergencyContact),
  noticeAcknowledged:true,...(revision!==undefined?{revision}:{})
 };
}
export function parsePatientHistory(value:unknown,clinicId:string,patientId:string,
 role:NativeClinicRole):PatientAppointmentHistory|null{
 if(!canViewPatientAppointments(role)||!object(value)||!object(value.patient)||
  value.patient.id!==patientId||!Array.isArray(value.appointments)||
  value.appointments.length>150||!safeInt(value.total)||value.total!==value.appointments.length||
  value.maximumRows!==150)return null;
 const rows:AppointmentView[]=[],ids=new Set<string>();
 for(const raw of value.appointments){
  const appointment=parseAppointment(raw,clinicId);
  if(!appointment||appointment.patientId!==patientId||ids.has(appointment.id))return null;
  ids.add(appointment.id);rows.push(appointment);
 }
 return {rows:rows.sort((a,b)=>b.startAt.localeCompare(a.startAt)).slice(0,20),
  total:rows.length,truncated:rows.length===150};
}
export function parseEncounterHistory(value:unknown,patientId:string):PatientEncounter[]|null{
 if(!object(value)||!object(value.patient)||value.patient.id!==patientId||
  !Array.isArray(value.encounters)||value.encounters.length>100)return null;
 const rows:PatientEncounter[]=[];
 for(const row of value.encounters){
  if(!object(row)||!id(row.id)||!["draft","signed","amended"].includes(String(row.status))||
   !validIso(row.created_at)||!text(row.author_name,120))return null;
  rows.push({id:row.id,status:row.status as PatientEncounter["status"],
   createdAt:row.created_at,authorName:row.author_name});
 }
 return rows;
}
export function parseTreatmentStatus(value:unknown):PatientTreatments[]|null{
 if(!object(value)||!Array.isArray(value.summary)||value.summary.length>60)return null;
 const rows:PatientTreatments[]=[];
 for(const row of value.summary){
  if(!object(row)||!id(row.id)||!text(row.status,40)||
   !safeInt(row.version,1000)||row.version<1||
   !safeInt(row.expected_sessions,1000)||!safeInt(row.stage_count,1000)||
   !safeInt(row.completed_stages,1000)||row.completed_stages>row.stage_count)return null;
  rows.push({id:row.id,status:row.status as string,version:row.version,
   expectedSessions:row.expected_sessions,
   stageCount:row.stage_count,completedStages:row.completed_stages});
 }
 return rows;
}
export function validStatusReason(reason:string):boolean{
 return reason.trim().length>=10&&reason.trim().length<=300;
}
