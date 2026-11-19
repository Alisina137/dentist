/**
 * Clinic Phase 30: bounded, low-cardinality operational alerts.
 * No URL, path params, query string, request body, IP, identity, error
 * message, credentials, patient/clinic ID or exception reaches the sink.
 * Console output is intentionally a transport adapter for separately
 * configured operator log collection; this is NOT a certified alert system.
 */
export type Phase30Signal =
 "phase31_synthetic_delivery_probe"|
 "staff_invitation_delivery_failed"|
 "notification_delivery_exhausted"|
 "notification_queue_stale"|
 "notification_transport_unconfigured"|
 "notification_worker_failed"|
 "db_readiness_failed"|
 "backup_heartbeat_unconfigured"|
 "backup_heartbeat_missing"|
 "backup_heartbeat_invalid"|
 "backup_stale"|
 "restore_verification_stale";
export type Phase30Code =
 "auth_denials_spike"|"permission_denials_spike"|
 "conflicts_spike"|"api_server_errors"|Phase30Signal;

export type Phase30Alert={
 kind:"dandanlink.operational_alert.v1";
 code:Phase30Code;
 area:string;
 count:number;
 windowSeconds:number;
 at:string;
 productionClearance:false;
};
const signalSet=new Set<Phase30Signal>([
 "phase31_synthetic_delivery_probe",
 "staff_invitation_delivery_failed",
 "notification_delivery_exhausted","notification_queue_stale",
 "notification_transport_unconfigured","notification_worker_failed",
 "db_readiness_failed","backup_heartbeat_unconfigured",
 "backup_heartbeat_missing","backup_heartbeat_invalid",
 "backup_stale","restore_verification_stale"
]);
const GROUPS=new Set([
 "auth","booking","appointments","patients","patient-favorites",
 "reviews","clinical","chart","treatments","registry","billing",
 "expenses","team","admin","insights","operations","listings",
 "discovery","support","portability","pilot-feedback"
]);
const WINDOW_MS=5*60_000,COOLDOWN_MS=15*60_000;
function group(path:unknown):string{
 if(typeof path!=="string")return "other";
 if(path.startsWith("/api/auth/")||path==="/api/auth")return "auth";
 if(path==="/ready")return "readiness";
 const match=/^\/v1\/([a-z-]+)(?:\/|$)/.exec(path);
 if(!match)return "other";
 return GROUPS.has(match[1])?match[1]:"other";
}
type Counter={windowStart:number;count:number;lastAlert:number};
export class RedactedOperationalAlerts{
 private readonly counters=new Map<string,Counter>();
 constructor(private readonly sink:(alert:Phase30Alert)=>void){}
 private record(code:Phase30Code,area:string,threshold:number,now:number):void{
  if(!Number.isFinite(now)||now<0)return;
  const key=code+":"+area;
  // All keys are from finite enums; this map never grows with request IDs.
  let item=this.counters.get(key);
  if(!item){item={windowStart:now,count:0,lastAlert:-Infinity};
   this.counters.set(key,item);}
  if(now<item.windowStart||now-item.windowStart>=WINDOW_MS){
   item.windowStart=now;item.count=0;
  }
  item.count++;
  if(item.count<threshold||now-item.lastAlert<COOLDOWN_MS)return;
  item.lastAlert=now;
  const alert:Phase30Alert={
   kind:"dandanlink.operational_alert.v1",code,area,
   count:item.count,windowSeconds:WINDOW_MS/1000,
   at:new Date(now).toISOString(),productionClearance:false
  };
  try{this.sink(alert);}catch{
   // Telemetry must never fail a patient booking or an authentication response.
  }
 }
 recordHttp(path:unknown,status:unknown,now=Date.now()):void{
  if(typeof status!=="number"||!Number.isInteger(status))return;
  const area=group(path);
  if(area==="readiness"&&status===503){
   this.record("db_readiness_failed","database",1,now);return;
  }
  if(status===401)this.record("auth_denials_spike",area,30,now);
  else if(status===403)this.record("permission_denials_spike",area,20,now);
  else if(status===409)this.record("conflicts_spike",area,15,now);
  else if(status>=500&&status<=599)
   this.record("api_server_errors",area,3,now);
 }
 recordSignal(code:Phase30Signal,now=Date.now()):void{
  if(!signalSet.has(code))return;
  this.record(code,"operations",1,now);
 }
}

// Register after production configuration checks; no runtime import cycle.
// Forwarder never changes booking/auth response success or failure.
let externalAlertForwarder:((alert:Phase30Alert)=>void)|null=null;
export function registerOperationalAlertForwarder(fn:(alert:Phase30Alert)=>void):()=>void{
 externalAlertForwarder=fn;
 return ()=>{if(externalAlertForwarder===fn)externalAlertForwarder=null;};
}
export const operationalAlerts=new RedactedOperationalAlerts(alert=>{
 // Only allowlisted fields get serialized. The sink emits no PHI or secrets.
 console.warn("[phase30-alert] "+JSON.stringify(alert));
 try{externalAlertForwarder?.(alert);}catch{
  console.error("[phase31-delivery] ALERT_ENQUEUE_UNAVAILABLE");
 }
});

/** The untrusted heartbeat states only OPERATOR-REPORTED timestamps.
 * It never independently proves that backups exist, decrypt or restore.
 */
export type BackupIssue=Extract<Phase30Signal,
 "backup_heartbeat_invalid"|"backup_stale"|"restore_verification_stale">;
const MAX_BACKUP_MS=26*60*60_000;
const MAX_RESTORE_MS=30*24*60*60_000;
function timestamp(value:unknown,now:number):number|null{
 if(typeof value!=="string"||
  !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value))
  return null;
 const parsed=Date.parse(value);
 return Number.isFinite(parsed)&&parsed<=now+5*60_000?parsed:null;
}
export function backupHeartbeatIssues(input:unknown,now=Date.now()):BackupIssue[]{
 if(!Number.isFinite(now)||now<0)return ["backup_heartbeat_invalid"];
 if(!input||typeof input!=="object"||Array.isArray(input))
  return ["backup_heartbeat_invalid"];
 const doc=input as Record<string,unknown>;
 if(doc.schemaVersion!==1||Object.keys(doc).length!==3||
  Object.keys(doc).some(key=>!["schemaVersion","backupCompletedAt","restoreVerifiedAt"].includes(key)))
  return ["backup_heartbeat_invalid"];
 const backup=timestamp(doc.backupCompletedAt,now);
 const restore=timestamp(doc.restoreVerifiedAt,now);
 if(backup===null||restore===null)return ["backup_heartbeat_invalid"];
 const issues:BackupIssue[]=[];
 if(now-backup>MAX_BACKUP_MS)issues.push("backup_stale");
 if(now-restore>MAX_RESTORE_MS)issues.push("restore_verification_stale");
 return issues;
}
