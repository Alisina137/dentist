/**
 * Clinic Phase 24. Safe, allowlisted DTOs for staff, invitations, verification
 * and provider schedules. All mutations are enforced independently by API.
 */
import type {NativeClinicRole} from "./native-clinic-model";

export type StaffRole=NativeClinicRole;
export type MemberStatus="active"|"suspended"|"revoked";
export type StaffMember={
 id:string;clinicId:string;name:string;email:string;role:StaffRole;
 status:MemberStatus;clinicianEnabled:boolean;mfaEnabled:boolean;
 joinedAt:string;changedAt:string;self:boolean;
};
export type InviteStatus="pending"|"accepted"|"expired"|"revoked";
export type StaffInvitation={
 id:string;clinicId:string;email:string;role:Exclude<StaffRole,"owner">;
 status:InviteStatus;expiresAt:string;createdAt:string;sentAt:string|null;
 resendCount:number;
};
export type DentistStatus={
 id:string;displayName:string;verificationStatus:string|null;
 currentlyVerified:boolean;affiliationStatus:string;professionalLicense:string|null;
};
export type Shift={weekday:number;isOpen:boolean;startMinute:number;endMinute:number;
 breaks:{start:number;end:number}[];revision:number};
export type ClinicSchedule={
 timezone:"Asia/Kabul";providers:Record<string,Shift[]>;
 clinicianIds:string[];clinicHours:Shift[];
};
export type StaffDetail={member:StaffMember;canManage:boolean;
 canEditDentist:boolean;displayName:string|null;specialty:string|null;
 qualifications:string|null;experienceYears:number|null;
 professionalLicense:string|null;draftVersion:number|null};
export type StaffSummary={active:number;suspended:number;revoked:number;
 dentists:number;invites:number;verified:number};
const object=(v:unknown):v is Record<string,unknown>=>
 v!==null&&typeof v==="object"&&!Array.isArray(v);
const text=(v:unknown,max=160):v is string=>typeof v==="string"&&v.length<=max;
const date=(v:unknown):v is string=>typeof v==="string"&&v.length<=40&&
 Number.isFinite(Date.parse(v));
const uid=(v:unknown):v is string=>typeof v==="string"&&
 /^[0-9a-f-]{36}$/i.test(v);
const safe=(v:unknown,max=1000000):v is number=>
 typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=max;
const staffRoles=["owner","manager","dentist","receptionist","assistant","cashier"] as const;
const statuses=["active","suspended","revoked"] as const;
const inviteStatuses=["pending","accepted","expired","revoked"] as const;
const lower=(v:string)=>v.trim().toLowerCase();
export function staffCanManage(role:StaffRole){return role==="owner"||role==="manager"}
export function staffNeedsMfa(role:StaffRole,mfa:boolean){
 return staffCanManage(role)&&mfa;
}
export function staffCanAssign(actor:StaffRole,next:StaffRole,current?:StaffRole){
 if(next==="owner"||!staffRoles.includes(next))return false;
 if(actor==="owner")return true;
 return actor==="manager"&&next!=="manager"&&current!=="manager"&&current!=="owner";
}
export function staffMayManageMember(actor:StaffRole,member:StaffMember){
 return member.status!=="revoked"&&!member.self&&member.role!=="owner"&&
 staffCanAssign(actor,member.role,member.role);
}
export function staffCanClinicianToggle(actor:StaffRole,member:StaffMember){
 return actor==="owner"&&member.status==="active"&&
 (member.role==="owner"||member.role==="manager");
}
export function reasonValid(input:string){return input.trim().length>=5&&input.trim().length<=300}
export function inviteEmailValid(value:string){
 const v=lower(value);return v.length>=5&&v.length<=160&&
 /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
export function teamMember(value:unknown,clinicId:string,selfId:string):StaffMember|null{
 if(!object(value)||value.clinicId!==clinicId||!uid(value.id)||
  !text(value.name,120)||!text(value.email,160)||!date(value.joinedAt)||
  !date(value.changedAt)||!staffRoles.includes(value.role as StaffRole)||
  !statuses.includes(value.status as MemberStatus)||
  typeof value.clinicianEnabled!=="boolean"||typeof value.mfaEnabled!=="boolean")return null;
 return {id:value.id,clinicId,name:value.name,email:value.email,
  role:value.role as StaffRole,status:value.status as MemberStatus,
  clinicianEnabled:value.clinicianEnabled,mfaEnabled:value.mfaEnabled,
  joinedAt:value.joinedAt,changedAt:value.changedAt,self:value.id===selfId};
}
export function teamRows(value:unknown,clinicId:string,selfId:string):StaffMember[]|null{
 if(!object(value)||!Array.isArray(value.members)||value.members.length>500)return null;
 const ids=new Set<string>(),members:StaffMember[]=[];
 for(const raw of value.members){
  const member=teamMember(raw,clinicId,selfId);
  if(!member||ids.has(member.id))return null;
  ids.add(member.id);members.push(member);
 }
 return members;
}
export function invitationRows(value:unknown,clinicId:string):StaffInvitation[]|null{
 if(!object(value)||!Array.isArray(value.invitations)||
  value.invitations.length>100)return null;
 const items:StaffInvitation[]=[],ids=new Set<string>();
 for(const raw of value.invitations){
  if(!object(raw)||raw.clinicId!==clinicId||!uid(raw.id)||
   !text(raw.email,160)||!inviteEmailValid(raw.email)||
   !staffRoles.includes(raw.role as StaffRole)||raw.role==="owner"||
   !inviteStatuses.includes(raw.status as InviteStatus)||
   !date(raw.expiresAt)||!date(raw.createdAt)||
   !(raw.sentAt===null||date(raw.sentAt))||
   !safe(raw.resendCount,100)||ids.has(raw.id))return null;
  ids.add(raw.id);
  items.push({id:raw.id,clinicId,email:raw.email,role:raw.role as StaffInvitation["role"],
   status:raw.status as InviteStatus,expiresAt:raw.expiresAt,
   createdAt:raw.createdAt,sentAt:raw.sentAt as string|null,
   resendCount:raw.resendCount});
 }
 return items;
}
export function dentistStatuses(value:unknown):DentistStatus[]|null{
 if(!object(value)||!Array.isArray(value.dentists)||value.dentists.length>500)return null;
 const rows:DentistStatus[]=[],ids=new Set<string>();
 for(const raw of value.dentists){
  if(!object(raw)||!uid(raw.id)||!text(raw.display_name,120)||
   !(raw.verification_status===null||text(raw.verification_status,30))||
   typeof raw.currentlyVerified!=="boolean"||!text(raw.affiliation_status,30)||
   !(raw.professional_license===null||text(raw.professional_license,100))||
   ids.has(raw.id))return null;
  ids.add(raw.id);
  rows.push({id:raw.id,displayName:raw.display_name,
   verificationStatus:raw.verification_status as string|null,
   currentlyVerified:raw.currentlyVerified,
   affiliationStatus:raw.affiliation_status,
   professionalLicense:raw.professional_license as string|null});
 }
 return rows;
}
export function staffDetail(value:unknown,clinicId:string,selfId:string):StaffDetail|null{
 if(!object(value))return null;
 const member=teamMember(value.member,clinicId,selfId);
 if(!member||typeof value.canManage!=="boolean"||
  typeof value.canEditDentist!=="boolean"||
  !(value.draft===null||object(value.draft)))return null;
 const draft=value.draft as Record<string,unknown>|null;
 if(draft&&(!text(draft.displayName,120)||
  !(draft.specialty===null||text(draft.specialty,120))||
  !(draft.qualifications===null||text(draft.qualifications,300))||
  !(draft.professionalLicense===null||text(draft.professionalLicense,100))||
  !(draft.experienceYears===null||safe(draft.experienceYears,70))||
  !safe(draft.draftVersion,99999)))return null;
 return {member,canManage:value.canManage,canEditDentist:value.canEditDentist,
  displayName:draft?draft.displayName as string:null,
  specialty:draft?draft.specialty as string|null:null,
  qualifications:draft?draft.qualifications as string|null:null,
  professionalLicense:draft?draft.professionalLicense as string|null:null,
  experienceYears:draft?draft.experienceYears as number|null:null,
  draftVersion:draft?draft.draftVersion as number:null};
}
function shift(value:unknown):Shift|null{
 if(!object(value)||!safe(value.weekday,6)||typeof value.isOpen!=="boolean"||
  !safe(value.startMinute,1440)||!safe(value.endMinute,1440)||
  value.startMinute>=value.endMinute||!safe(value.revision,100000000)||
  !Array.isArray(value.breaks)||value.breaks.length>8)return null;
 const breaks:Shift["breaks"]=[];
 for(const item of value.breaks){
  if(!object(item)||!safe(item.start,1440)||!safe(item.end,1440)||
   item.start>=item.end||item.start<value.startMinute||
   item.end>value.endMinute)return null;
  breaks.push({start:item.start,end:item.end});
 }
 breaks.sort((a,b)=>a.start-b.start);
 if(breaks.some((b,i)=>i>0&&breaks[i-1].end>b.start))return null;
 return {weekday:value.weekday,isOpen:value.isOpen,
  startMinute:value.startMinute,endMinute:value.endMinute,
  breaks,revision:value.revision};
}
export function parseSchedule(value:unknown,clinicId:string):ClinicSchedule|null{
 if(!object(value)||value.timezone!=="Asia/Kabul"||
  !Array.isArray(value.hours)||!Array.isArray(value.providers)||
  !Array.isArray(value.clinicians)||value.providers.length>3500||
  value.hours.length>7||value.clinicians.length>500)return null;
 const providerRows:Record<string,Shift[]>={},clinicHours:Shift[]=[];
 const clinicians:string[]=[];
 for(const row of value.clinicians){
  if(!object(row)||!uid(row.membershipId)||clinicians.includes(row.membershipId))
   return null;
  clinicians.push(row.membershipId);
 }
 for(const item of value.hours){
  const parsed=shift(item);
  if(!parsed||clinicHours.some(s=>s.weekday===parsed.weekday))return null;
  clinicHours.push(parsed);
 }
 for(const item of value.providers){
  if(!object(item)||item.clinicId!==clinicId||!uid(item.membershipId))return null;
  const parsed=shift(item);
  if(!parsed)return null;
  const id=item.membershipId as string;
  providerRows[id]??=[];
  if(providerRows[id].some(r=>r.weekday===parsed.weekday))return null;
  providerRows[id].push(parsed);
 }
 return {timezone:"Asia/Kabul",providers:providerRows,clinicianIds:clinicians,
  clinicHours};
}
/** Missing provider days are closed; preserve each persisted row's revision. */
export function providerWeek(schedule:ClinicSchedule,membershipId:string):Shift[]{
 if(!schedule.clinicianIds.includes(membershipId))
  throw Error("PROVIDER_NOT_ELIGIBLE");
 const current=schedule.providers[membershipId]||[];
 return Array.from({length:7},(_,weekday)=>{
  const saved=current.find(row=>row.weekday===weekday);
  return saved?{...saved,breaks:saved.breaks.map(b=>({...b}))}:
   {weekday,isOpen:false,startMinute:540,endMinute:1020,breaks:[],revision:0};
 });
}
export function validWeek(week:Shift[]):boolean{
 if(!Array.isArray(week)||week.length!==7||
  new Set(week.map(x=>x.weekday)).size!==7)return false;
 return week.every(x=>safe(x.weekday,6)&&typeof x.isOpen==="boolean"&&
  safe(x.startMinute,1440)&&safe(x.endMinute,1440)&&x.startMinute<x.endMinute&&
  safe(x.revision,100000000)&&Array.isArray(x.breaks)&&x.breaks.length<=8&&
  x.breaks.every(b=>safe(b.start,1440)&&safe(b.end,1440)&&
   b.start<b.end&&b.start>=x.startMinute&&b.end<=x.endMinute));
}
export function weekPayload(week:Shift[]){
 if(!validWeek(week))throw Error("INVALID_PROVIDER_WEEK");
 return week.map(row=>({...row,breaks:row.isOpen?row.breaks:[]}));
}
export function minuteLabel(v:number):string{
 return String(Math.floor(v/60)).padStart(2,"0")+":"+
  String(v%60).padStart(2,"0");
}
export function countStaff(members:StaffMember[],invites:StaffInvitation[],
 dentists:DentistStatus[]):StaffSummary{
 return {active:members.filter(m=>m.status==="active").length,
  suspended:members.filter(m=>m.status==="suspended").length,
  revoked:members.filter(m=>m.status==="revoked").length,
  dentists:members.filter(m=>m.status==="active"&&(m.role==="dentist"||m.clinicianEnabled)).length,
  invites:invites.filter(x=>x.status==="pending").length,
  verified:dentists.filter(d=>d.currentlyVerified).length};
}
