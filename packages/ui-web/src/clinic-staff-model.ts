/** Pure UI guards for the authorized staff workspace. The API remains authoritative. */
export type StaffRole="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
export type StaffState="active"|"suspended"|"revoked";
export type StaffTab="team"|"dentists"|"invitations";
export type StaffEntry={id:string;name:string;email:string;role:StaffRole;
 status:StaffState;joinedAt?:string;clinicianEnabled?:boolean;mfaEnabled?:boolean};
export function staffTab(value:string|null):StaffTab{
 return value==="dentists"||value==="invitations"?value:"team";
}
export function staffMayInvite(role:StaffRole,mfa:boolean):boolean{
 return mfa&&(role==="owner"||role==="manager");
}
export function staffAssignableRoles(role:StaffRole):StaffRole[]{
 return role==="owner"?["manager","dentist","receptionist","assistant","cashier"]:
  role==="manager"?["dentist","receptionist","assistant","cashier"]:[];
}
export function staffMayManage(actorRole:StaffRole,targetRole:StaffRole,
 isSelf:boolean,targetStatus:StaffState):boolean{
 if(isSelf||targetRole==="owner"||targetStatus==="revoked")return false;
 if(actorRole==="owner")return true;
 return actorRole==="manager"&&targetRole!=="manager";
}
export function staffEmail(value:string):string|null{
 const trimmed=value.trim().toLowerCase();
 // Server independently validates canonical addresses and membership limits.
 return trimmed.length<=160&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)?trimmed:null;
}
export function staffFiltered(records:StaffEntry[],query:string,state:string,role:string):StaffEntry[]{
 const q=query.trim().toLocaleLowerCase().slice(0,120);
 return records.filter(m=>
  (state==="all"||m.status===state)&&
  (role==="all"||m.role===role)&&
  (!q||[m.name,m.email,m.role].some(x=>x.toLocaleLowerCase().includes(q))));
}
export function staffPage<T>(items:T[],page:number,size=5){
 const safeSize=Math.max(1,Math.min(25,Math.trunc(size)||5));
 const pages=Math.max(1,Math.ceil(items.length/safeSize));
 const index=Math.max(1,Math.min(pages,Math.trunc(page)||1));
 return {rows:items.slice((index-1)*safeSize,index*safeSize),
  page:index,pages,total:items.length,
  start:items.length?(index-1)*safeSize+1:0,end:Math.min(index*safeSize,items.length)};
}
export function staffStats(records:StaffEntry[]){
 return {total:records.length,active:records.filter(x=>x.status==="active").length,
  suspended:records.filter(x=>x.status==="suspended").length,
  clinicians:records.filter(x=>x.status==="active"&&
   (x.role==="dentist"||x.clinicianEnabled)).length};
}
export function clinicSettingsCanSave(status:string,form:any,original:any):boolean{
 if(!original||!form||["pending","suspended"].includes(status))return false;
 return ["displayName","legalName","clinicType","province","city","district",
  "address","phone","email","licenseNumber"].some(
   key=>String(form[key]??"")!==String(original[key]??""));
}
