/** Phase32: deterministic app resume boundary shared by patient and clinic.
 * A suspended app must never keep a mounted private view when the bearer
 * becomes stale, the account changes, or role membership is revoked.
 */
export type NativeVisibility="active"|"inactive"|"background"|"unknown"|"extension";
export type SessionVisibilityAction="hide"|"revalidate"|"none";
export function nativeSessionVisibilityAction(
 previous:NativeVisibility,current:NativeVisibility,sessionMayExist:boolean
):SessionVisibilityAction{
 if(!sessionMayExist||previous===current)return "none";
 if(previous==="active"&&current!=="active")return "hide";
 if(previous!=="active"&&current==="active")return "revalidate";
 return "none";
}
/** Never regard an interrupted mutation or offline session refresh as
 * proof of a successful booking or an authorized clinical workspace.
 */
export function privateResumePermitted(
 sessionValid:boolean,verifiedEmail:boolean,authorizedWorkspace:boolean
):boolean{
 return sessionValid===true&&verifiedEmail===true&&authorizedWorkspace===true;
}
