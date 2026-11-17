/**
 * Clinic Phase 16: public, credential-free release boundary smoke test.
 *
 * This is an operator diagnostic, NOT a clinical approval or proof of a
 * completed security/backup/provider audit. No patient identifiers, passwords,
 * session cookies, PHI, environment secret values or authorization headers.
 *
 * Run: pnpm qa:pilot
 * Optional DANDANLINK_CHECK_API_URL=https://your-public-api.example
 */
import {pathToFileURL} from "node:url";
import {checkOrigin,fetchDiagnostic} from "./clinic-quality-preflight.mjs";

const PRIVATE_ROUTES=[
 ["/v1/team/context","TEAM_CONTEXT"],
 ["/v1/appointments/clinics/11111111-1111-4111-8111-111111111111/overview","APPOINTMENTS"],
 ["/v1/booking/clinics/11111111-1111-4111-8111-111111111111/notifications","NOTIFICATIONS"],
 ["/v1/insights/clinics/11111111-1111-4111-8111-111111111111/report?from=2026-11-01&to=2026-11-17","REPORT"]
];
export async function probeUnauthenticatedEndpoint(origin,path,fetcher=fetch){
 try{
  const uri=new URL(origin);
  const response=await fetcher(origin+path,{
   method:"GET",redirect:"error",cache:"no-store",
   headers:{Accept:"application/json",
    ...(uri.protocol==="https:"&&uri.hostname.endsWith(".ngrok-free.dev")?
      {"ngrok-skip-browser-warning":"1"}:{})},
   signal:AbortSignal.timeout(8000)
  });
  const kind=(response.headers.get("content-type")||"")
   .split(";")[0].trim().toLowerCase();
  if(kind!=="application/json")return {ok:false,issue:"NON_JSON_RESPONSE"};
  if(response.status!==401)return {ok:false,issue:"PRIVATE_ROUTE_NOT_AUTH_GATED"};
  const cc=(response.headers.get("cache-control")||"").toLowerCase();
  if(!cc.includes("no-store"))return {ok:false,issue:"PRIVATE_DATA_CACHEABLE"};
  const requestId=response.headers.get("x-request-id");
  if(!requestId||!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))
   return {ok:false,issue:"MISSING_REQUEST_ID"};
  const body=await response.json();
  if(!body||typeof body!=="object"||body.code!=="AUTH_REQUIRED"||
   Object.keys(body).some(key=>["email","patient","token","password","clinical"].includes(key)))
   return {ok:false,issue:"PRIVATE_RESPONSE_UNSAFE"};
  return {ok:true,issue:"NONE"};
 }catch{return {ok:false,issue:"ENDPOINT_UNAVAILABLE"};}
}
export async function runPilotPreflight(
 origin=process.env.DANDANLINK_CHECK_API_URL||"http://127.0.0.1:4000",
 writer=console,fetcher=fetch){
 let base;
 try{base=checkOrigin(origin);}
 catch{
  writer.error("PILOT_TECHNICAL_CHECKS=FAIL");
  writer.error("PILOT_ISSUE=INVALID_PUBLIC_API_ORIGIN");
  writer.info("PILOT_RELEASE_DECISION=NO_GO");
  return 1;
 }
 writer.info("PILOT_SCOPE=PUBLIC_READ_ONLY_NO_CREDENTIALS");
 const checks=[
  ["/health","API_PROCESS"],
  ["/ready","DATABASE_READINESS"],
  ["/v1/public/status","SERVER_IDENTITY"]
 ];
 let pass=true;
 let flag=null;
 for(const [path,label] of checks){
  const result=await fetchDiagnostic(base,path,fetcher);
  writer.info("PILOT_"+label+"="+(result.ok?"PASS":"FAIL"));
  if(!result.ok){pass=false;writer.error("PILOT_"+label+"_ISSUE="+result.issue);}
  if(path==="/v1/public/status"&&result.ok)flag=result.pilotReleaseEnabled===true;
 }
 for(const [path,label] of PRIVATE_ROUTES){
  const result=await probeUnauthenticatedEndpoint(base,path,fetcher);
  writer.info("PILOT_PRIVATE_"+label+"="+(result.ok?"PASS":"FAIL"));
  if(!result.ok){pass=false;writer.error("PILOT_PRIVATE_"+label+"_ISSUE="+result.issue);}
 }
 writer.info("PILOT_TECHNICAL_CHECKS="+(pass?"PASS":"FAIL"));
 writer.info("PILOT_SERVER_FLAG="+(flag===null?"UNVERIFIED":
  flag?"OPERATOR_MARKED_REQUIRES_EVIDENCE":"DISABLED"));
 // We cannot establish external review from an API status flag or a smoke test.
 writer.info("PILOT_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW");
 writer.info("PILOT_NOTICE=Signed legal, clinical, security, recovery, accessibility and pilot approvals required");
 return pass?0:1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 process.exitCode=await runPilotPreflight();
}
