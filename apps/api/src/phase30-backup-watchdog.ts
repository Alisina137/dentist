import {readFileSync,statSync} from "node:fs";
import {operationalAlerts,backupHeartbeatIssues,type Phase30Signal} from "./phase30-observability.js";

const MAX_BYTES=2048;
const CHECK_EVERY_MS=60*60_000;

/**
 * Operator-reported backup freshness only; never evidence of backup integrity
 * or successful independent restoration. Metadata must not contain PHI.
 * The filename and its raw contents never enter the alert stream.
 */
export function inspectBackupHeartbeat(
 path:string|undefined=process.env.DANDANLINK_BACKUP_HEARTBEAT_FILE
):Phase30Signal[]{
 if(!path)return ["backup_heartbeat_unconfigured"];
 try{
  if(statSync(path).size>MAX_BYTES)return ["backup_heartbeat_invalid"];
  const raw=readFileSync(path,"utf8");
  if(Buffer.byteLength(raw,"utf8")>MAX_BYTES)return ["backup_heartbeat_invalid"];
  const parsed:unknown=JSON.parse(raw);
  return backupHeartbeatIssues(parsed);
 }catch(error){
  const missing=(error as NodeJS.ErrnoException)?.code==="ENOENT";
  return [missing?"backup_heartbeat_missing":"backup_heartbeat_invalid"];
 }
}
export function checkBackupWatchdog(
 path:string|undefined=process.env.DANDANLINK_BACKUP_HEARTBEAT_FILE
):void{
 for(const issue of inspectBackupHeartbeat(path))operationalAlerts.recordSignal(issue);
}
export function startBackupWatchdog():()=>void{
 const path=process.env.DANDANLINK_BACKUP_HEARTBEAT_FILE;
 // In production always report absent configuration. Dev opt-in only.
 if(process.env.NODE_ENV!=="production"&&!path)return ()=>{};
 checkBackupWatchdog(path);
 const timer=setInterval(()=>checkBackupWatchdog(path),CHECK_EVERY_MS);
 timer.unref();
 return ()=>clearInterval(timer);
}
