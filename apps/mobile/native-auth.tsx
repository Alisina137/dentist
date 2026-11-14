import React,{createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from "react";
import * as SecureStore from "expo-secure-store";

/**
 * Session token is an opaque Better Auth bearer session, stored only in
 * iOS Keychain/Android Keystore-backed SecureStore. Never in unencrypted storage.
 * Every private API call checks the session on the server (PH14/PH15 rules).
 */
declare const process:{readonly env:{readonly EXPO_PUBLIC_API_URL?:string}};
const API=(process.env.EXPO_PUBLIC_API_URL||"").trim().replace(/\/+$/,"");
const TOKEN_KEY="dandanlink_native_session_v1";
export type NativeAccount={
 registered:boolean;
 user:{id:string;name:string;email:string;emailVerified:boolean;locale:string;calendar:string};
 profile:null|{preferredName:string;phone:string|null;city:string;revision:number};
 onboarding:{termsVersion:string;privacyVersion:string;requiresAdultAttestation:boolean};
};
export class ApiError extends Error{
 constructor(public status:number,public code:string){super(code);}
}
type HttpMethod="GET"|"POST"|"PUT"|"DELETE";
type AccountContext={
 account:NativeAccount|null;loading:boolean;onlineError:string|null;tokenPresent:boolean;
 signIn:(email:string,password:string)=>Promise<void>;
 signUp:(name:string,email:string,password:string)=>Promise<void>;
 signOut:()=>Promise<void>;
 refresh:()=>Promise<void>;
 request:<T>(path:string,method?:HttpMethod,body?:unknown)=>Promise<T>;
};
const AuthContext=createContext<AccountContext|null>(null);
let pendingSequence=0;
export function uniqueActionKey(){
 // Not a secret; the server scopes the key to the verified patient account.
 // Use high-resolution and monotonic process sequence to prevent accidental replay.
 pendingSequence+=1;
 const micros=typeof performance!=="undefined"?Math.round(performance.now()*1000):0;
 return "native-"+Date.now().toString(36)+"-"+micros.toString(36)+"-"+pendingSequence.toString(36);
}
async function requestRaw<T>(path:string,method:HttpMethod="GET",body?:unknown,token?:string|null){
 if(!API)throw new ApiError(0,"API_NOT_CONFIGURED");
 if(!/^https:\/\//i.test(API) && !__DEV__)throw new ApiError(0,"HTTPS_REQUIRED");
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(API+path,{
   method,signal:controller.signal,cache:"no-store",
   headers:{
    Accept:"application/json",
    ...(body!==undefined?{"Content-Type":"application/json"}:{}),
    ...(token?{"Authorization":"Bearer "+token}:{})
   },
   ...(body!==undefined?{body:JSON.stringify(body)}:{})
  });
  const data=await response.json().catch(()=>null) as T&{code?:string};
  if(!response.ok)throw new ApiError(response.status,data?.code||"REQUEST_FAILED");
  return {data,headers:response.headers};
 }catch(error){
  if(error instanceof ApiError)throw error;
  throw new ApiError(0,"NETWORK_UNAVAILABLE");
 }finally{clearTimeout(timer)}
}
export function NativeAuthProvider({children}:{children:ReactNode}){
 const [account,setAccount]=useState<NativeAccount|null>(null);
 const [token,setToken]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [onlineError,setOnlineError]=useState<string|null>(null);
 const clear=useCallback(async()=>{
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(()=>{});
  setToken(null);setAccount(null);
 },[]);
 const validate=useCallback(async(value:string)=>{
  try{
   const current=await requestRaw<{user:{emailVerified:boolean}|null}>(
    "/api/auth/get-session","GET",undefined,value);
   if(!current.data?.user||!current.data.user.emailVerified){
    await clear();setOnlineError("EMAIL_VERIFICATION_OR_SESSION_REQUIRED");return;
   }
   const profile=await requestRaw<NativeAccount>("/v1/patients/me","GET",undefined,value);
   setToken(value);setAccount(profile.data);setOnlineError(null);
  }catch(err){
   if(err instanceof ApiError&&(err.status===401||err.status===403)){
    await clear();setOnlineError(err.code);
   }else{
    setAccount(null);setOnlineError(err instanceof ApiError?err.code:"NETWORK_UNAVAILABLE");
   }
  }
 },[clear]);
 const refresh=useCallback(async()=>{
  const saved=token||await SecureStore.getItemAsync(TOKEN_KEY).catch(()=>null);
  if(saved)await validate(saved);
  else{setAccount(null);setOnlineError(null)}
 },[token,validate]);
 useEffect(()=>{
  let live=true;
  void SecureStore.getItemAsync(TOKEN_KEY).then(async saved=>{
   if(!live)return;
   if(saved)await validate(saved);
  }).catch(()=>{if(live)setOnlineError("SECURE_STORAGE_UNAVAILABLE")})
   .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[validate]);
 const request=useCallback(async<T,>(path:string,method:HttpMethod="GET",body?:unknown):Promise<T>=>{
  if(!token)throw new ApiError(401,"AUTH_REQUIRED");
  try{return (await requestRaw<T>(path,method,body,token)).data}
  catch(err){
   if(err instanceof ApiError&&err.status===401)await clear();
   throw err;
  }
 },[clear,token]);
 const signIn=useCallback(async(email:string,password:string)=>{
  const {headers}=await requestRaw("/api/auth/sign-in/email","POST",{
   email:email.trim().toLowerCase(),password});
  const newToken=headers.get("set-auth-token");
  if(!newToken||!newToken.trim())throw new ApiError(500,"SECURE_SESSION_NOT_RETURNED");
  await SecureStore.setItemAsync(TOKEN_KEY,newToken);
  setToken(newToken);
  setLoading(true);
  try{
   const current=await requestRaw<NativeAccount>("/v1/patients/me","GET",undefined,newToken);
   setAccount(current.data);setOnlineError(null);
  }catch(err){
   // Verified accounts may not have completed patient onboarding.
   if(err instanceof ApiError&&err.status===403&&err.code==="PATIENT_ONBOARDING_REQUIRED"){
    const session=await requestRaw<{user:{id:string;name:string;email:string;emailVerified:boolean}}>(
     "/api/auth/get-session","GET",undefined,newToken);
    if(!session.data.user.emailVerified){await clear();throw new ApiError(403,"EMAIL_VERIFICATION_REQUIRED")}
    setAccount({registered:false,user:{...session.data.user,locale:"fa-AF",calendar:"solar_hijri"},
     profile:null,onboarding:{termsVersion:"",privacyVersion:"",requiresAdultAttestation:true}});
   }else{await clear();throw err}
  }finally{setLoading(false)}
 },[clear]);
 const signUp=useCallback(async(name:string,email:string,password:string)=>{
  await requestRaw("/api/auth/sign-up/email","POST",{name:name.trim(),
   email:email.trim().toLowerCase(),password});
 },[]);
 const signOut=useCallback(async()=>{
  let error:unknown=null;
  if(token){
   try{await requestRaw("/api/auth/sign-out","POST",{},token)}
   catch(err){error=err}
  }
  await clear();
  if(error)throw new ApiError(0,"LOCAL_SIGN_OUT_ONLY");
 },[token,clear]);
 const value=useMemo(()=>({account,loading,onlineError,tokenPresent:!!token,
  signIn,signUp,signOut,refresh,request}),[account,loading,onlineError,token,signIn,signUp,signOut,refresh,request]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useNativeAuth(){
 const ctx=useContext(AuthContext);
 if(!ctx)throw new Error("Wrap native views in NativeAuthProvider");
 return ctx;
}
