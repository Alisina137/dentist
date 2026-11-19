import {readFileSync,statSync} from "node:fs";
import {operationalAlerts,backupHeartbeatIssues} from "./phase30-observability.js";

const MAX_BYTES=2048;
const CHECK_EVERY_MS=60*60_000;

/**
 * Optional file-based operational signal sourced from an independent backup
 * scheduler. This is a freshness alarm, NOT a backup or restore verifier.
 * File contains strictly three fields (schemaVersion, backupCompletedAt,
 * restoreVerifiedAt). Do not point it at a log containing PHI or secrets.
 */
export function checkBackupWatchdog(path:string|undefined=process.env.DANDANLINK_BACKUP_HEARTBEAT_FILE){
 if(!path){
  operationalAlerts.recordSignal("backup_heartbeat_unconfigured");
  return;
 }
 try{
  if(statSync(path).size>MAX_BYTES){
   operationalAlerts.recordSignal("backup_heartbeat_invalid");return;
  }
  const raw=readFileSync(path,"utf8");
  if(Buffer.byteLength(raw,"utf8")>MAX_BYTES){
   operationalAlerts.recordSignal("backup_heartbeat_invalid");return;
  }
  const parsed:unknown=JSON.parse(raw);
  for(const issue of backupHeartbeatIssues(parsed))operationalAlerts.recordSignal(issue);
 }catch(error){
  const missing=(error as NodeJS.ErrnoException)?.code==="ENOENT";
  operationalAlerts.recordSignal(missing?"backup_heartbeat_missing":"backup_heartbeat_invalid");
 }
}
export function startBackupWatchdog():()=>void{
 const path=process.env.DANDANLINK_BACKUP_HEARTBEAT_FILE;
 // Allow opt-in local testing. In production, explicitly alert when the
 // external backup heartbeat is unconfigured rather than implying readiness.
 if(process.env.NODE_ENV!=="production"&&!path)return ()=>{};
 checkBackupWatchdog(path);
 const timer=setInterval(()=>checkBackupWatchdog(path),CHECK_EVERY_MS);
 timer.unref();
 return ()=>clearInterval(timer);
}
