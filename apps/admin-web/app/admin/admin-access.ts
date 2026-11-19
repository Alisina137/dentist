/** Phase 28: user-interface access gate is defense-in-depth only.
 * Each protected API endpoint also independently checks the server session.
 * Never mount a restricted page before server identity is resolved.
 */
export type AdminAccessRole="admin"|"support"|"user"|"loading"|"error";
export type AdminPageGate="allowed"|"loading"|"sign-in"|"offline"|"restricted";
export const adminPublicPath=(path:string)=>/^\/admin\/(?:login|reset-password|2fa)(?:\/|$)/.test(path);
export function adminAllowedPath(role:AdminAccessRole,path:string):boolean{
 if(role==="admin")return path==="/admin"||path.startsWith("/admin/");
 if(role==="support"){
  return ["/admin/support","/admin/analytics"].some(base=>path===base||
   path.startsWith(base+"/"));
 }
 return false;
}
export function adminPageGate(role:AdminAccessRole,path:string,rechecking=false):AdminPageGate{
 if(adminPublicPath(path))return "allowed";
 if(rechecking||role==="loading")return "loading";
 if(role==="error")return "offline";
 if(role==="user")return "sign-in";
 return adminAllowedPath(role,path)?"allowed":"restricted";
}
export function validAdminIdentity(raw:unknown):{role:"admin"|"support";displayName:string}|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const data=raw as {role?:unknown;displayName?:unknown};
 if(data.role!=="admin"&&data.role!=="support")return null;
 if(typeof data.displayName!=="string"||data.displayName.length>140)return null;
 return {role:data.role,displayName:data.displayName};
}
