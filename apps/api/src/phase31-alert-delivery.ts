/**
 * Clinic Phase 31 — optional HMAC-authenticated HTTPS alert delivery.
 *
 * Only a strictly validated Phase30 aggregate enters this transport. Never
 * serialize URL paths, queries, names, emails, tokens or raw error messages.
 * Local journal is per-process, low cardinality, 0600 and atomic; it is not
 * independently validated production incident-response infrastructure.
 */
import {createHmac,randomUUID} from "node:crypto";
import {isIP} from "node:net";
import {closeSync,existsSync,fsyncSync,lstatSync,openSync,
 readFileSync,renameSync,unlinkSync,writeFileSync} from "node:fs";
import {isAbsolute} from "node:path";
import type {Phase30Alert} from "./phase30-observability.js";

export type Phase31Disposition="ack"|"retry"|"reject";
export type Phase31Job={
 id:string; alert:Phase30Alert; attempts:number;
 createdAt:number; nextAttemptAt:number;
};
export type Phase31WebhookConfig={url:string;host:string;secret:string;spoolFile:string};
export type Phase31State={
 queued:number;oldestAgeSeconds:number;delivered:number;
 retryScheduled:number;discarded:number;queueFull:number;
};
const MAX_JOBS=128,MAX_ATTEMPTS=6,MAX_AGE_MS=24*3600_000;
const MAX_FILE_BYTES=65536,MAX_BATCH=4;
const CODE_SET=new Set([
 "phase31_synthetic_delivery_probe",
 "auth_denials_spike","permission_denials_spike","conflicts_spike",
 "api_server_errors","staff_invitation_delivery_failed",
 "notification_delivery_exhausted","notification_queue_stale",
 "notification_transport_unconfigured","notification_worker_failed",
 "db_readiness_failed","backup_heartbeat_unconfigured",
 "backup_heartbeat_missing","backup_heartbeat_invalid","backup_stale",
 "restore_verification_stale"
]);
const AREA_SET=new Set([
 "auth","booking","appointments","patients","patient-favorites","reviews",
 "clinical","chart","treatments","registry","billing","expenses","team",
 "admin","insights","operations","listings","discovery","support",
 "portability","pilot-feedback","other","database"
]);
function own(value:unknown):value is Record<string,unknown>{
 return Boolean(value)&&typeof value==="object"&&!Array.isArray(value);
}
function finite(value:unknown,min:number,max:number):value is number{
 return typeof value==="number"&&Number.isInteger(value)&&value>=min&&value<=max;
}
function safeTimestamp(value:unknown):value is string{
 return typeof value==="string"&&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&
  Number.isFinite(Date.parse(value));
}
function safeAlert(input:unknown):Phase30Alert|null{
 if(!own(input)||Object.keys(input).length!==7||
  Object.keys(input).some(k=>![
   "kind","code","area","count","windowSeconds","at","productionClearance"
  ].includes(k)))return null;
 if(input.kind!=="dandanlink.operational_alert.v1"||
  typeof input.code!=="string"||!CODE_SET.has(input.code)||
  typeof input.area!=="string"||!AREA_SET.has(input.area)||
  !finite(input.count,1,1_000_000_000)||
  input.windowSeconds!==300||!safeTimestamp(input.at)||
  input.productionClearance!==false)return null;
 // Only return known keys, never retain a caller-controlled object.
 return {
  kind:"dandanlink.operational_alert.v1",
  code:input.code as Phase30Alert["code"],area:input.area,
  count:input.count,windowSeconds:300,at:input.at,
  productionClearance:false
 };
}
function safeJob(input:unknown):Phase31Job|null{
 if(!own(input)||Object.keys(input).length!==5||
  Object.keys(input).some(k=>!["id","alert","attempts","createdAt","nextAttemptAt"].includes(k))||
  typeof input.id!=="string"||
  !/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(input.id)||
  !finite(input.attempts,0,MAX_ATTEMPTS-1)||
  !finite(input.createdAt,1,4_102_444_800_000)||
  !finite(input.nextAttemptAt,1,4_102_444_800_000))return null;
 const alert=safeAlert(input.alert);
 if(!alert)return null;
 return {id:input.id,alert,attempts:input.attempts,
  createdAt:input.createdAt,nextAttemptAt:input.nextAttemptAt};
}
function isPublicHostname(host:string):boolean{
 return host.length<=253&&host.includes(".")&&
  host===host.toLowerCase()&&!isIP(host)&&
  !host.startsWith(".")&&!host.endsWith(".")&&
  !host.endsWith(".local")&&!host.endsWith(".internal")&&
  !host.endsWith(".localhost")&&!host.endsWith(".test")&&
  !host.endsWith(".invalid")&&!host.endsWith(".example")&&
  host.split(".").every(label=>
   label.length>=1&&label.length<=63&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
}
export function phase31Configuration(env:NodeJS.ProcessEnv):{
 config:Phase31WebhookConfig|null;issues:string[]
}{
 const keys=[
  "DANDANLINK_ALERT_WEBHOOK_URL","DANDANLINK_ALERT_WEBHOOK_HOST",
  "DANDANLINK_ALERT_WEBHOOK_SECRET","DANDANLINK_ALERT_SPOOL_FILE"
 ] as const;
 if(keys.every(k=>!env[k]))return {config:null,issues:["ALERT_TRANSPORT_UNCONFIGURED"]};
 const issues:string[]=[];
 for(const key of keys)if(!env[key])issues.push("ALERT_TRANSPORT_INCOMPLETE");
 const url=env.DANDANLINK_ALERT_WEBHOOK_URL||"";
 const host=env.DANDANLINK_ALERT_WEBHOOK_HOST||"";
 const secret=env.DANDANLINK_ALERT_WEBHOOK_SECRET||"";
 const spoolFile=env.DANDANLINK_ALERT_SPOOL_FILE||"";
 try{
  const u=new URL(url);
  if(url.trim()!==url||u.protocol!=="https:"||u.username||u.password||
   u.search||u.hash||u.port&&u.port!=="443"||
   !isPublicHostname(u.hostname)||!isPublicHostname(host)||
   u.hostname!==host)
   issues.push("ALERT_WEBHOOK_TARGET_INVALID");
 }catch{issues.push("ALERT_WEBHOOK_TARGET_INVALID");}
 if(secret.length<32||secret.length>256||secret.trim()!==secret||
  /(?:example|changeme|replace_me|test_only)/i.test(secret))
  issues.push("ALERT_SIGNING_SECRET_INVALID");
 if(!isAbsolute(spoolFile)||spoolFile.length>1024)
  issues.push("ALERT_SPOOL_PATH_INVALID");
 return issues.length?
  {config:null,issues:[...new Set(issues)]}:
  {config:{url,host,secret,spoolFile},issues:[]};
}

/**
 * Journal saves the ENTIRE validated queue atomically. No PHI is accepted.
 * Every instance requires its own private spool file. Never share between
 * replicas, containers or a CLI probe. Failed/corrupted loads block startup
 * of the optional forwarder, not patient/auth processing.
 */
export class Phase31FileSpool{
 constructor(readonly file:string){
  if(!isAbsolute(file))throw Error("SPOOL_PATH_INVALID");
 }
 private checkExisting():void{
  if(!existsSync(this.file))return;
  const info=lstatSync(this.file);
  if(!info.isFile()||info.isSymbolicLink()||info.size>MAX_FILE_BYTES)
   throw Error("SPOOL_FILE_INVALID");
  if(process.platform!=="win32"&&(info.mode&0o077)!==0)
   throw Error("SPOOL_PERMISSIONS_UNSAFE");
 }
 load():Phase31Job[]{
  this.checkExisting();
  if(!existsSync(this.file))return [];
  let raw:string;
  try{raw=readFileSync(this.file,"utf8");}
  catch{throw Error("SPOOL_READ_FAILED");}
  let doc:unknown;
  try{doc=JSON.parse(raw);}
  catch{throw Error("SPOOL_SCHEMA_INVALID");}
  if(!own(doc)||doc.version!==1||!Array.isArray(doc.jobs)||
   Object.keys(doc).length!==2||doc.jobs.length>MAX_JOBS)
   throw Error("SPOOL_SCHEMA_INVALID");
  const entries:Phase31Job[]=[], ids=new Set<string>();
  for(const value of doc.jobs){
   const job=safeJob(value);
   if(!job||ids.has(job.id))throw Error("SPOOL_SCHEMA_INVALID");
   ids.add(job.id);entries.push(job);
  }
  return entries;
 }
 save(jobs:Phase31Job[]):void{
  if(jobs.length>MAX_JOBS||jobs.some(x=>!safeJob(x)))
   throw Error("SPOOL_WRITE_DENIED");
  this.checkExisting();
  const serialized=JSON.stringify({version:1,jobs});
  if(Buffer.byteLength(serialized,"utf8")>MAX_FILE_BYTES)
   throw Error("SPOOL_CAPACITY_EXCEEDED");
  const temp=this.file+"."+randomUUID()+".tmp";
  let fd:number|undefined;
  try{
   fd=openSync(temp,"wx",0o600);
   writeFileSync(fd,serialized,"utf8");
   fsyncSync(fd);
   closeSync(fd);fd=undefined;
   renameSync(temp,this.file);
  }catch{
   if(fd!==undefined)closeSync(fd);
   try{unlinkSync(temp);}catch{}
   throw Error("SPOOL_WRITE_FAILED");
  }
 }
}
export class Phase31AlertQueue{
 private jobs:Phase31Job[];
 private processing=false;
 private delivered=0;
 private retryScheduled=0;
 private discarded=0;
 private queueFull=0;
 constructor(
  private readonly deliver:(job:Phase31Job)=>Promise<Phase31Disposition>,
  private readonly spool?:{load():Phase31Job[];save(entries:Phase31Job[]):void}
 ){
  this.jobs=spool?.load()||[];
 }
 enqueue(input:unknown,now=Date.now()):boolean{
  const alert=safeAlert(input);
  if(!alert||!Number.isFinite(now)||now<1)return false;
  if(this.jobs.length>=MAX_JOBS){this.queueFull++;return false;}
  const job:Phase31Job={id:randomUUID(),alert,attempts:0,createdAt:now,nextAttemptAt:now};
  const next=[...this.jobs,job];
  this.spool?.save(next); // write-ahead: never claim persisted if this fails
  this.jobs=next;
  return true;
 }
 snapshot(now=Date.now()):Phase31State{
  return {
   queued:this.jobs.length,
   oldestAgeSeconds:this.jobs.length?
    Math.max(0,Math.floor((now-Math.min(...this.jobs.map(j=>j.createdAt)))/1000)):0,
   delivered:this.delivered,retryScheduled:this.retryScheduled,
   discarded:this.discarded,queueFull:this.queueFull
  };
 }
 async drain(now=Date.now()):Promise<void>{
  if(this.processing)return;
  this.processing=true;
  try{
   for(let n=0;n<MAX_BATCH;n++){
    const index=this.jobs.findIndex(x=>x.nextAttemptAt<=now);
    if(index<0)break;
    const job=this.jobs[index];
    let outcome:Phase31Disposition="retry";
    if(now-job.createdAt>MAX_AGE_MS)outcome="reject";
    else try{outcome=await this.deliver({...job,alert:{...job.alert}});}
     catch{outcome="retry";}
    const next=this.jobs.slice();
    if(outcome==="ack"){
     next.splice(index,1);
    }else if(outcome==="reject"||job.attempts+1>=MAX_ATTEMPTS){
     next.splice(index,1);
    }else{
     const attempts=job.attempts+1;
     next[index]={...job,attempts,
      nextAttemptAt:now+Math.min(15*60_000,10_000*2**(attempts-1))};
    }
    this.spool?.save(next);
    this.jobs=next;
    if(outcome==="ack")this.delivered++;
    else if(outcome==="reject"||job.attempts+1>=MAX_ATTEMPTS)this.discarded++;
    else this.retryScheduled++;
   }
  }finally{this.processing=false;}
 }
}
export async function deliverSignedAlert(
 job:Phase31Job,config:Phase31WebhookConfig,
 fetcher:typeof fetch=fetch
):Promise<Phase31Disposition>{
 // Validate again at the network trust boundary, even for restored jobs.
 const safe=safeJob(job);
 if(!safe)return "reject";
 const body=JSON.stringify({
  kind:"dandanlink.alert_delivery.v1",eventId:safe.id,alert:safe.alert
 });
 const timestamp=String(Date.now());
 const signature=createHmac("sha256",config.secret)
  .update(timestamp+"."+body).digest("hex");
 try{
  const response=await fetcher(config.url,{
   method:"POST",redirect:"manual",cache:"no-store",
   signal:AbortSignal.timeout(4000),
   headers:{
    "Content-Type":"application/json",
    "X-Dandanlink-Event-Id":safe.id,
    "X-Dandanlink-Timestamp":timestamp,
    "X-Dandanlink-Signature":"sha256="+signature
   },
   body
  });
  if(response.status>=200&&response.status<300)return "ack";
  if(response.status===408||response.status===425||response.status===429||
   response.status>=500)return "retry";
  return "reject"; // 3xx and non-retriable 4xx never follow redirects
 }catch{return "retry";}
}
