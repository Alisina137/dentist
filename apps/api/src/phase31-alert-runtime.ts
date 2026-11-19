import {registerOperationalAlertForwarder} from "./phase30-observability.js";
import {Phase31AlertQueue,Phase31FileSpool,deliverSignedAlert,
 phase31Configuration} from "./phase31-alert-delivery.js";

const TICK_MS=5000,LOG_COOLDOWN_MS=5*60_000;
/**
 * Local process-owned queue + external signed HTTPS webhook.
 * Disabled when incomplete: never send to unvalidated destinations.
 * No API endpoints, patient/clinic data, identifiers or raw HTTP errors.
 */
export function startOperationalAlertDelivery(env:NodeJS.ProcessEnv=process.env):()=>void{
 const {config,issues}=phase31Configuration(env);
 if(!config){
  if(env.NODE_ENV==="production"||
   issues[0]!=="ALERT_TRANSPORT_UNCONFIGURED")
   console.error("[phase31-delivery] CONFIG_NOT_READY");
  return ()=>{};
 }
 let queue:Phase31AlertQueue;
 try{
  queue=new Phase31AlertQueue(
   job=>deliverSignedAlert(job,config),
   new Phase31FileSpool(config.spoolFile)
  );
 }catch{
  console.error("[phase31-delivery] PRIVATE_SPOOL_NOT_READY");
  return ()=>{};
 }
 let lastWarningAt=-Infinity;
 const warn=(code:string)=>{
  if(Date.now()-lastWarningAt<LOG_COOLDOWN_MS)return;
  lastWarningAt=Date.now();
  // Fixed messages, no destination/filename/secret/status body.
  console.error("[phase31-delivery] "+code);
 };
 const unregister=registerOperationalAlertForwarder(alert=>{
  try{
   if(!queue.enqueue(alert))warn("QUEUE_SATURATED");
  }catch{warn("SPOOL_WRITE_UNAVAILABLE");}
 });
 const tick=async()=>{
  try{
   await queue.drain();
   const state=queue.snapshot();
   if(state.discarded>0)warn("DELIVERY_EXHAUSTED_OR_REJECTED");
   else if(state.queueFull>0)warn("QUEUE_SATURATED");
   else if(state.queued>0&&state.oldestAgeSeconds>300)
    warn("DELIVERY_LAG_EXCEEDS_FIVE_MINUTES");
  }catch{warn("SPOOL_WRITE_UNAVAILABLE");}
 };
 const timer=setInterval(()=>{void tick();},TICK_MS);
 timer.unref();
 void tick();
 return ()=>{unregister();clearInterval(timer);};
}
