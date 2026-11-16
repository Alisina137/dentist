import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import * as SecureStore from "expo-secure-store";
import {ApiError} from "./api-error";
export {ApiError} from "./api-error";

/**
 * Session token is an opaque Better Auth bearer session, stored only in
 * iOS Keychain/Android Keystore-backed SecureStore. Never in unencrypted storage.
 * Every private API call checks the session on the server (PH14/PH15 rules).
 */
declare const process:{readonly env:{readonly EXPO_PUBLIC_API_URL?:string;readonly EXPO_PUBLIC_PATIENT_WEB_URL?:string}};
const API=(process.env.EXPO_PUBLIC_API_URL||"").trim().replace(/\/+$/,"");
const WEB=(process.env.EXPO_PUBLIC_PATIENT_WEB_URL||"").trim().replace(/\/+$/,"");
const TOKEN_KEY="dandanlink_native_session_v1";
export type NativeAccount={
 registered:boolean;
 user:{id:string;name:string;email:string;emailVerified:boolean;locale:string;calendar:string};
 profile:null|{preferredName:string;phone:string|null;city:string;revision:number};
 onboarding:{termsVersion:string;privacyVersion:string;requiresAdultAttestation:boolean};
};

type HttpMethod="GET"|"POST"|"PUT"|"DELETE";
type AccountContext={
 account:NativeAccount|null;loading:boolean;onlineError:string|null;tokenPresent:boolean;
 signIn:(email:string,password:string)=>Promise<void>;
 signUp:(name:string,email:string,password:string)=>Promise<void>;
 requestPasswordReset:(email:string)=>Promise<void>;
 resendVerification:(email:string)=>Promise<void>;
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
async function accountFor(value:string):Promise<NativeAccount>{
 try{
  return (await requestRaw<NativeAccount>("/v1/patients/me","GET",undefined,value)).data;
 }catch(err){
  if(!(err instanceof ApiError&&err.status===403&&err.code==="PATIENT_ONBOARDING_REQUIRED"))
   throw err;
  const session=await requestRaw<{user:{id:string;name:string;email:string;emailVerified:boolean}|null}>(
   "/api/auth/get-session","GET",undefined,value);
  const user=session.data?.user;
  if(!user?.emailVerified)throw new ApiError(403,"EMAIL_VERIFICATION_REQUIRED");
  return {registered:false,user:{...user,locale:"fa-AF",calendar:"solar_hijri"},
   profile:null,onboarding:{termsVersion:"",privacyVersion:"",requiresAdultAttestation:true}};
 }
}
export function NativeAuthProvider({children}:{children:ReactNode}){
 const [account,setAccount]=useState<NativeAccount|null>(null);
 const [token,setToken]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [onlineError,setOnlineError]=useState<string|null>(null);
 // All async auth responses are checked against the active session generation.
 // A delayed restore, refresh or 401 must never revive or revoke another user.
 const sessionGeneration=useRef(0);
 const activeToken=useRef<string|null>(null);
 const clear=useCallback(async()=>{
  sessionGeneration.current++;
  activeToken.current=null;
  setToken(null);setAccount(null);setOnlineError(null);setLoading(false);
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(()=>{});
 },[]);
 const validate=useCallback(async(value:string)=>{
  const revision=sessionGeneration.current;
  try{
   const current=await requestRaw<{user:{emailVerified:boolean}|null}>(
    "/api/auth/get-session","GET",undefined,value);
   if(!current.data?.user?.emailVerified){
    if(sessionGeneration.current===revision){
     await clear();setOnlineError("EMAIL_VERIFICATION_OR_SESSION_REQUIRED");
    }
    return;
   }
   const profile=await accountFor(value);
   if(sessionGeneration.current!==revision)return;
   activeToken.current=value;setToken(value);setAccount(profile);setOnlineError(null);
  }catch(err){
   if(sessionGeneration.current!==revision)return;
   if(err instanceof ApiError&&(err.status===401||err.status===403)){
    await clear();setOnlineError(err.code);
   }else{
    setAccount(null);setOnlineError(err instanceof ApiError?err.code:"NETWORK_UNAVAILABLE");
   }
  }
 },[clear]);
 const refresh=useCallback(async()=>{
  const revision=sessionGeneration.current;
  const saved=activeToken.current||await SecureStore.getItemAsync(TOKEN_KEY).catch(()=>null);
  if(revision!==sessionGeneration.current)return;
  if(saved)await validate(saved);
  else{setAccount(null);setOnlineError(null)}
 },[validate]);
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
  const currentToken=activeToken.current;
  if(!currentToken)throw new ApiError(401,"AUTH_REQUIRED");
  const revision=sessionGeneration.current;
  try{
   const data=(await requestRaw<T>(path,method,body,currentToken)).data;
   if(sessionGeneration.current!==revision||activeToken.current!==currentToken)
    throw new ApiError(401,"SESSION_CHANGED");
   return data;
  }catch(err){
   if(err instanceof ApiError&&err.status===401&&err.code!=="SESSION_CHANGED"&&
      sessionGeneration.current===revision&&activeToken.current===currentToken)
    await clear();
   throw err;
  }
 },[clear]);
 const signIn=useCallback(async(email:string,password:string)=>{
  // Clear the previous account before starting a new sign-in, not after it.
  await clear();
  const revision=sessionGeneration.current;
  const response=await requestRaw<{twoFactorRedirect?:boolean}>("/api/auth/sign-in/email","POST",{
   email:email.trim().toLowerCase(),password});
  if(sessionGeneration.current!==revision)throw new ApiError(401,"SESSION_CHANGED");
  if(response.data?.twoFactorRedirect)throw new ApiError(403,"MFA_WEB_REQUIRED");
  const newToken=response.headers.get("set-auth-token");
  if(!newToken||!newToken.trim())throw new ApiError(500,"SECURE_SESSION_NOT_RETURNED");
  await SecureStore.setItemAsync(TOKEN_KEY,newToken);
  if(sessionGeneration.current!==revision){
   await SecureStore.deleteItemAsync(TOKEN_KEY).catch(()=>{});
   throw new ApiError(401,"SESSION_CHANGED");
  }
  activeToken.current=newToken;setToken(newToken);
  setLoading(true);
  try{
   const profile=await accountFor(newToken);
   if(sessionGeneration.current!==revision)throw new ApiError(401,"SESSION_CHANGED");
   setAccount(profile);setOnlineError(null);
  }catch(err){
   if(sessionGeneration.current===revision)await clear();
   throw err;
  }finally{if(sessionGeneration.current===revision)setLoading(false)}
 },[clear]);
 const signUp=useCallback(async(name:string,email:string,password:string)=>{
  await requestRaw("/api/auth/sign-up/email","POST",{name:name.trim(),
   email:email.trim().toLowerCase(),password});
 },[]);
 const requestPasswordReset=useCallback(async(email:string)=>{
  if(!WEB||(!__DEV__&&!/^https:\/\//i.test(WEB)))
   throw new ApiError(0,"PATIENT_WEB_REQUIRED");
  await requestRaw("/api/auth/request-password-reset","POST",{
   email:email.trim().toLowerCase(),redirectTo:WEB+"/reset-password"});
 },[]);
 const resendVerification=useCallback(async(email:string)=>{
  await requestRaw("/api/auth/send-verification-email","POST",{
   email:email.trim().toLowerCase(),
   ...(WEB?{callbackURL:WEB+"/verify"}:{})
  });
 },[]);
 const signOut=useCallback(async()=>{
  const oldToken=activeToken.current;
  // Private screens must disappear immediately, even if server sign-out times out.
  await clear();
  if(oldToken){
   try{await requestRaw("/api/auth/sign-out","POST",{},oldToken)}
   catch{throw new ApiError(0,"LOCAL_SIGN_OUT_ONLY")}
  }
 },[clear]);
 const value=useMemo(()=>({account,loading,onlineError,tokenPresent:!!token,
  signIn,signUp,requestPasswordReset,resendVerification,signOut,refresh,request}),
  [account,loading,onlineError,token,signIn,signUp,requestPasswordReset,resendVerification,signOut,refresh,request]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useNativeAuth(){
 const ctx=useContext(AuthContext);
 if(!ctx)throw new Error("Wrap native views in NativeAuthProvider");
 return ctx;
}
