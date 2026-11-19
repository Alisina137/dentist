/**
 * Phase 31 operator probe: NEVER print a webhook URL, secret, spool contents,
 * request headers or response body. Explicit --send-synthetic uses a separate
 * ephemeral event (does not touch API's private delivery queue).
 *
 * pnpm qa:alerts              # validate config and local journal only
 * pnpm qa:alerts:synthetic    # intentionally POST one synthetic webhook
 */
import {randomUUID} from "node:crypto";
import {Phase31FileSpool,deliverSignedAlert,phase31Configuration,
 type Phase31Job} from "../apps/api/src/phase31-alert-delivery.js";

const args=process.argv.slice(2);
if(args.some(x=>x!=="--send-synthetic")){
 console.error("PH31_ALERT_PROBE=INVALID_ARGUMENT");process.exitCode=2;
}else{
 const {config,issues}=phase31Configuration(process.env);
 if(!config){
  for(const reason of issues)console.error("PH31_ALERT_CONFIG="+reason);
  console.error("PH31_ALERT_PROBE=NOT_READY");process.exitCode=2;
 }else{
  try{
   const pending=new Phase31FileSpool(config.spoolFile).load();
   console.info("PH31_PRIVATE_JOURNAL=VALID");
   console.info("PH31_PENDING_COUNT="+pending.length);
   if(!args.includes("--send-synthetic")){
    console.info("PH31_ALERT_PROBE=CONFIG_ONLY_PASS");
   }else{
    const now=Date.now();
    const job:Phase31Job={
     id:randomUUID(),attempts:0,createdAt:now,nextAttemptAt:now,
     alert:{
      kind:"dandanlink.operational_alert.v1",
      code:"phase31_synthetic_delivery_probe",area:"operations",
      count:1,windowSeconds:300,at:new Date(now).toISOString(),
      productionClearance:false
     }
    };
    const outcome=await deliverSignedAlert(job,config);
    console.info("PH31_SYNTHETIC_WEBHOOK_RESULT="+
     (outcome==="ack"?"HTTP_ACKNOWLEDGED":
      outcome==="retry"?"DELIVERY_RETRY_NEEDED":"REJECTED"));
    if(outcome!=="ack")process.exitCode=2;
   }
  }catch{
   console.error("PH31_PRIVATE_JOURNAL=UNAVAILABLE");
   process.exitCode=2;
  }
 }
 console.info("PH19_ALERTS_APPROVAL=NOT_ESTABLISHED_BY_THIS_PROBE");
}
