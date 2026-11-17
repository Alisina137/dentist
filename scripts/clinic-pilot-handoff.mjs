/**
 * Clinic Phase 19 — one-command pilot technical handoff collection.
 * Public read-only probes only; no passwords, identifiers, cookies, PHI,
 * independent approval capture or healthcare release enablement.
 */
import {pathToFileURL} from "node:url";
import {runPilotPreflight} from "./clinic-pilot-preflight.mjs";
import {runPilotLatency} from "./clinic-pilot-latency.mjs";

export async function runClinicPilotHandoff(
 origin=process.env.DANDANLINK_CHECK_API_URL||"http://127.0.0.1:4000",
 writer=console,fetcher=fetch,clock=()=>performance.now(),
 samples=process.env.DANDANLINK_LATENCY_SAMPLES||"3"){
 writer.info("CLINIC19_HANDOFF_SCOPE=PUBLIC_READ_ONLY_NO_CREDENTIALS");
 const privateGate=await runPilotPreflight(origin,writer,fetcher);
 const latency=await runPilotLatency(origin,writer,fetcher,clock,samples);
 const ok=privateGate===0&&latency===0;
 writer.info("CLINIC19_TECHNICAL_EVIDENCE="+(ok?"OBSERVED":"INCOMPLETE"));
 writer.info("CLINIC19_EXTERNAL_CONTROLS=9_INDEPENDENT_REVIEWS_NOT_COLLECTED");
 writer.info("CLINIC19_PATIENT_DATA_PRODUCTION=NOT_AUTHORIZED_BY_THIS_COMMAND");
 writer.info("CLINIC19_RELEASE_DECISION=NO_GO_PENDING_INDEPENDENT_REVIEW");
 return ok?0:1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 process.exitCode=await runClinicPilotHandoff();
}
