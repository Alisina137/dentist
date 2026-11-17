/**
 * Clinic Phase 17 — small, safe public API/DB latency sampling.
 * Measures only public /health, /ready and /v1/public/status endpoints.
 * Never submits credentials, patient records, names, clinic IDs or POSTs.
 * This is a network observation, NOT a performance certification or SLA.
 *
 * pnpm qa:pilot:latency
 * DANDANLINK_CHECK_API_URL=https://your-public-api.example
 * DANDANLINK_LATENCY_SAMPLES=3 (1..5, defaults to 3)
 */
import {pathToFileURL} from "node:url";
import {checkOrigin,fetchDiagnostic} from "./clinic-quality-preflight.mjs";

export function pilotLatencyStats(samples){
 if(!Array.isArray(samples)||!samples.length||
  samples.some(x=>typeof x!=="number"||!Number.isFinite(x)||x<0))return null;
 const ordered=[...samples].sort((a,b)=>a-b);
 const value=p=>Math.round(ordered[Math.max(0,Math.ceil(ordered.length*p)-1)]);
 return {samples:ordered.length,p50Ms:value(.5),p95Ms:value(.95),
  maxMs:Math.round(ordered.at(-1))};
}
export async function runPilotLatency(
 origin=process.env.DANDANLINK_CHECK_API_URL||"http://127.0.0.1:4000",
 writer=console,fetcher=fetch,clock=()=>performance.now(),
 requestedSamples=process.env.DANDANLINK_LATENCY_SAMPLES||"3"){
 let base;
 try{base=checkOrigin(origin);}
 catch{
  writer.error("PILOT_LATENCY=FAIL_INVALID_ORIGIN");
  writer.info("PILOT_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW");
  return 1;
 }
 if(!/^[1-5]$/.test(String(requestedSamples))){
  writer.error("PILOT_LATENCY=FAIL_INVALID_SAMPLE_COUNT");
  writer.info("PILOT_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW");
  return 1;
 }
 writer.info("PILOT_LATENCY_SCOPE=PUBLIC_READ_ONLY_NO_CREDENTIALS");
 const paths=[
  ["/health","API_PROCESS"],
  ["/ready","DATABASE"],
  ["/v1/public/status","IDENTITY"]
 ];
 let failed=false;
 for(const [path,label] of paths){
  const ms=[];
  for(let i=0;i<Number(requestedSamples);i++){
   const start=clock();
   const result=await fetchDiagnostic(base,path,fetcher);
   const duration=clock()-start;
   if(!result.ok||!Number.isFinite(duration)||duration<0){
    writer.info("PILOT_LATENCY_"+label+"=UNAVAILABLE");
    writer.error("PILOT_LATENCY_"+label+"_ISSUE="+(result.ok?"INVALID_DURATION":result.issue));
    failed=true;break;
   }
   ms.push(duration);
  }
  if(ms.length===Number(requestedSamples)){
   const metrics=pilotLatencyStats(ms);
   writer.info("PILOT_LATENCY_"+label+"_SAMPLES="+metrics.samples);
   writer.info("PILOT_LATENCY_"+label+"_P50_MS="+metrics.p50Ms);
   writer.info("PILOT_LATENCY_"+label+"_P95_MS="+metrics.p95Ms);
   writer.info("PILOT_LATENCY_"+label+"_MAX_MS="+metrics.maxMs);
  }
 }
 writer.info("PILOT_LATENCY="+(failed?"FAIL":"OBSERVED"));
 writer.info("PILOT_LATENCY_SLO=NOT_CERTIFIED_NO_AUTHENTICATED_TRAFFIC_TESTED");
 writer.info("PILOT_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW");
 return failed?1:0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 process.exitCode=await runPilotLatency();
}
