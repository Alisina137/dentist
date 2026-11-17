/**
 * Clinic Phase 15 — read-only no-credential operator diagnostics.
 * No patient/clinic details, emails, tokens, DB credentials or secrets are sent or logged.
 * A PASS means only that the current API instance and database respond.
 * It does NOT mean the healthcare pilot or clinical release is approved.
 *
 * Usage: pnpm qa:clinic
 * Optional: set DANDANLINK_CHECK_API_URL=https://your-public-api.example
 */
import {pathToFileURL} from "node:url";
export function checkOrigin(raw){
 let uri;
 try{uri=new URL(raw);}catch{throw new Error("QUALITY_INVALID_API_ORIGIN");}
 const loopback=["localhost","127.0.0.1","[::1]"].includes(uri.hostname);
 if(!["https:","http:"].includes(uri.protocol)||(!loopback&&uri.protocol!=="https:")||
  uri.username||uri.password||uri.pathname!=="/"||uri.search||uri.hash)
  throw new Error("QUALITY_INVALID_API_ORIGIN");
 return uri.origin;
}
export async function fetchDiagnostic(base,path,fetcher=fetch){
 try{
  const response=await fetcher(base+path,{
   method:"GET",headers:{"Accept":"application/json",
    ...(new URL(base).hostname.endsWith(".ngrok-free.dev")?
     {"ngrok-skip-browser-warning":"1"}:{})},
   redirect:"error",signal:AbortSignal.timeout(8000),cache:"no-store"
  });
  if(!response.ok)return {ok:false,issue:"NON_SUCCESS_STATUS"};
  const kind=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  if(kind!=="application/json")return {ok:false,issue:"NON_JSON_RESPONSE"};
  const payload=await response.json();
  if(path==="/health")return {ok:payload?.status==="up",issue:"INVALID_API_HEALTH"};
  if(path==="/ready")return {ok:payload?.status==="ready",issue:"DATABASE_UNAVAILABLE"};
  if(path==="/v1/public/status")return {
   ok:payload?.product==="DandanLink"&&typeof payload?.pilotReleaseEnabled==="boolean",
   issue:"INVALID_API_IDENTITY",
   pilotReleaseEnabled:payload?.pilotReleaseEnabled===true
  };
  return {ok:false,issue:"UNKNOWN_PROBE"};
 }catch{return {ok:false,issue:"UNREACHABLE"};}
}
export async function runClinicQualityPreflight(
 base=process.env.DANDANLINK_CHECK_API_URL||"http://127.0.0.1:4000",
 writer=console,fetcher=fetch){
 let origin;
 try{origin=checkOrigin(base);}
 catch{
  writer.error("QUALITY_API_ORIGIN=INVALID (use HTTPS or localhost; no credentials)");
  return 1;
 }
 writer.info("QUALITY_DIAGNOSTIC_SCOPE=public_read_only (no credentials)");
 const paths=[
  ["/health","QUALITY_API_PROCESS"],
  ["/ready","QUALITY_DATABASE"],
  ["/v1/public/status","QUALITY_API_IDENTITY"]
 ];
 const results=[];
 for(const [path,label] of paths){
  const checked=await fetchDiagnostic(origin,path,fetcher);
  results.push(checked);
  writer.info(label+"="+(checked.ok?"PASS":"FAIL"));
  if(!checked.ok)writer.error(label+"_ISSUE="+checked.issue);
 }
 const identity=results[2];
 writer.info("QUALITY_PILOT_FLAG="+(
  identity.ok?(identity.pilotReleaseEnabled?"OPERATOR_MARKED_REQUIRES_HUMAN_EVIDENCE":"NO_GO"):
   "UNVERIFIED"));
 writer.info("QUALITY_NOTICE=Not clinical certification, legal approval, or production signoff");
 return results.every(row=>row.ok)?0:1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 process.exitCode=await runClinicQualityPreflight();
}
