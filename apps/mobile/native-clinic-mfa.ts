import {ApiError} from "./api-error";
import {nativeApiHeaders,nativeJsonResponse} from "./api-transport";

/**
 * Clinic Phase 26: use Better Auth's own 2FA challenge/session cookies.
 * React Native's native HTTP cookie jar handles HttpOnly cookies through
 * credentials:include. JS must never read, reconstruct or persist 2FA
 * cookies, the TOTP secret, OTP code or backup codes.
 *
 * This is the SAME /api/auth provider that clinic-web uses; no second
 * password/MFA verifier, synthetic session, shortcut to privileged endpoints
 * or custom replay bypass is introduced.
 */
export const MFA_TTL_MS=9*60*1000; // Below Better Auth's default 10-minute challenge.
export type NativeMfaMethod="totp"|"backup";
export type PendingMfa={startedAt:number;expiresAt:number;methods:NativeMfaMethod[]};
const authPaths=[
 "/api/auth/sign-in/email",
 "/api/auth/two-factor/verify-totp",
 "/api/auth/two-factor/verify-backup-code"
] as const;
const object=(v:unknown):v is Record<string,unknown>=>
 v!==null&&typeof v==="object"&&!Array.isArray(v);
export function parseMfaRedirect(data:unknown,now=Date.now()):PendingMfa|null{
 if(!object(data)||data.twoFactorRedirect!==true)return null;
 // TOTP is configured; backup codes are deliberately offered as an
 // emergency alternative, not advertised as an enrolled TOTP method.
 // No email OTP endpoint is configured on the DandanLink server.
 if(data.twoFactorMethods!==undefined&&
  (!Array.isArray(data.twoFactorMethods)||
    !data.twoFactorMethods.every(x=>typeof x==="string")))return null;
 const methods=data.twoFactorMethods as string[]|undefined;
 if(methods&&methods.length>0&&!methods.includes("totp"))return null;
 return {startedAt:now,expiresAt:now+MFA_TTL_MS,methods:["totp","backup"]};
}
export function challengeValid(value:PendingMfa|null,now=Date.now()){
 return Boolean(value&&Number.isFinite(value.startedAt)&&
  Number.isFinite(value.expiresAt)&&value.startedAt<=now&&
  value.expiresAt>now&&value.expiresAt-value.startedAt<=MFA_TTL_MS);
}
export function normalizeMfaCode(method:NativeMfaMethod,code:string):string|null{
 if(method==="totp"){
  // ASCII 6 digits only. Preserve leading zeroes.
  const trimmed=code.trim();
  return /^\d{6}$/.test(trimmed)?trimmed:null;
 }
 // Better Auth backup code is a single-use printable recovery token; do
 // not strip embedded separators, which could change the verifier input.
 const trimmed=code.trim();
 return /^[a-zA-Z0-9_-]{6,64}$/.test(trimmed)?trimmed:null;
}
export function mfaEndpoint(method:NativeMfaMethod){
 return method==="totp"?"/api/auth/two-factor/verify-totp":
  "/api/auth/two-factor/verify-backup-code";
}
export function mfaBody(method:NativeMfaMethod,code:string){
 const cleaned=normalizeMfaCode(method,code);
 if(!cleaned)throw new ApiError(422,"INVALID_MFA_CODE");
 // No remember-device bypass: a new password login always requires 2FA.
 return method==="totp"?{code:cleaned,trustDevice:false}:
  {code:cleaned,trustDevice:false,disableSession:false};
}
export function authToken(headers:Headers):string|null{
 // Never trust a token from a 2FA-redirect response. Only call this function
 // after a verified final auth response (which the caller checked).
 const value=headers.get("set-auth-token");
 return value&&value.length>=20&&value.length<=4096&&
  !/[\r\n\s]/.test(value)?value:null;
}
export function isFullMfaResponse(data:unknown):boolean{
 return object(data)&&typeof data.token==="string"&&data.token.length>=20&&
  object(data.user)&&typeof data.user.id==="string"&&data.user.id.length>=8 &&
  data.twoFactorRedirect!==true;
}
type NativeAuthOutput<T>={data:T;headers:Headers};
export async function nativeMfaRequest<T>(
 api:string,path:typeof authPaths[number],body:unknown,
 signal?:AbortSignal
):Promise<NativeAuthOutput<T>>{
 if(!authPaths.includes(path))throw new ApiError(400,"MFA_ENDPOINT_DENIED");
 if(!api||!/^https?:\/\//i.test(api))throw new ApiError(0,"API_NOT_CONFIGURED");
 if(!__DEV__&&!/^https:\/\//i.test(api))
  throw new ApiError(0,"HTTPS_REQUIRED");
 const controller=new AbortController();
 const forward=()=>controller.abort();
 signal?.addEventListener("abort",forward,{once:true});
 if(signal?.aborted)controller.abort();
 const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(api+path,{
   method:"POST",credentials:"include",cache:"no-store",
   signal:controller.signal,
   headers:{...nativeApiHeaders(api),"Content-Type":"application/json"},
   body:JSON.stringify(body)
  });
  const data=await nativeJsonResponse<T>(response);
  return {data,headers:response.headers};
 }catch(e){
  if(e instanceof ApiError)throw e;
  throw new ApiError(0,"MFA_NETWORK_UNAVAILABLE");
 }finally{
  clearTimeout(timer);
  signal?.removeEventListener("abort",forward);
 }
}
