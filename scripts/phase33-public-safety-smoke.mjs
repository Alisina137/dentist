#!/usr/bin/env node
/**
 * Phase 33: safe public read-only service hardening smoke.
 * Never sends credentials, patient data, clinic IDs, OTPs or POST requests.
 * Verifies the API process, bounded DB readiness, private no-store headers,
 * Helmet no-sniff, and unauthorized /v1 account/booking responses.
 * Passing is NOT healthcare production authorization.
 */
import {pathToFileURL} from "node:url";
import {checkOrigin} from "./clinic-quality-preflight.mjs";

const endpoints=[
 {path:"/health",label:"PROCESS",status:200,private:true},
 {path:"/ready",label:"DATABASE",status:200,private:true},
 {path:"/v1/public/status",label:"PUBLIC_IDENTITY",status:200,private:false},
 {path:"/v1/me",label:"ACCOUNT_DENY",status:401,private:true},
 {path:"/v1/booking/my",label:"BOOKING_DENY",status:401,private:true}
];
export async function runPhase33Smoke(
 origin=process.env.DANDANLINK_CHECK_API_URL||"http://127.0.0.1:4000",
 writer=console,fetcher=fetch
){
 let base;
 try{base=checkOrigin(origin);}
 catch{
  writer.error("PH33_API_ORIGIN=INVALID");return 2;
 }
 let errors=0;
 writer.info("PH33_SCOPE=UNAUTHENTICATED_GET_ONLY_NO_PHI_NO_MUTATIONS");
 for(const {path,label,status,private:requiresNoStore} of endpoints){
  let issue="";
  try{
   const response=await fetcher(base+path,{
    method:"GET",redirect:"error",cache:"no-store",
    signal:AbortSignal.timeout(7000),
    headers:{Accept:"application/json",
     ...(new URL(base).hostname.endsWith(".ngrok-free.dev")?
      {"ngrok-skip-browser-warning":"1"}:{})}
   });
   if(response.status!==status)issue="WRONG_HTTP_STATUS";
   else if(!/\bapplication\/json\b/i.test(response.headers.get("content-type")||""))
    issue="NON_JSON";
   else if(response.headers.get("x-content-type-options")!=="nosniff")
    issue="MISSING_NOSNIFF";
   else if(requiresNoStore&&
    !/\bno-store\b/i.test(response.headers.get("cache-control")||""))
    issue="MISSING_NO_STORE";
   else{
    const data=await response.json();
    const valid=label==="PROCESS"?data?.status==="up":
     label==="DATABASE"?data?.status==="ready":
     label==="PUBLIC_IDENTITY"?data?.product==="DandanLink"&&
      typeof data?.pilotReleaseEnabled==="boolean":
     data?.code==="AUTH_REQUIRED";
    if(!valid)issue="UNEXPECTED_RESPONSE";
   }
  }catch{issue="NETWORK_OR_JSON_UNAVAILABLE";}
  if(issue){errors++;writer.error("PH33_"+label+"=FAIL_"+issue);}
  else writer.info("PH33_"+label+"=PASS");
 }
 writer.info("PH33_PRODUCTION_SECURITY_REVIEW=NOT_CERTIFIED");
 writer.info("PH19_HEALTHCARE_PILOT=NO_GO_PENDING_INDEPENDENT_REVIEW");
 return errors?2:0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 process.exitCode=await runPhase33Smoke();
}
