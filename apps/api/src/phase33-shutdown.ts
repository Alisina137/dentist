/**
 * Phase 33: bounded, single-flight API shutdown.
 * Stop new claims, drain in-flight HTTP and notification work, then release DB.
 * Never cancel a patient booking and claim it failed or succeeded on timeout.
 */
export type ShutdownResult="clean"|"timeout"|"failed";
export type ShutdownHooks={
 stopNewWork:()=>void;
 stopWorker:()=>Promise<void>|void;
 closeHttp:()=>Promise<void>|void;
 forceHttp:()=>void;
 closeDb:()=>Promise<void>|void;
};
export class BoundedShutdown{
 private running:Promise<ShutdownResult>|null=null;
 constructor(private readonly hooks:ShutdownHooks,
  private readonly deadlineMs=20000,
  private readonly dbDeadlineMs=5000){
  if(!Number.isInteger(deadlineMs)||deadlineMs<1||deadlineMs>120000||
     !Number.isInteger(dbDeadlineMs)||dbDeadlineMs<1||dbDeadlineMs>120000)
   throw Error("SHUTDOWN_DEADLINE_INVALID");
 }
 run():Promise<ShutdownResult>{
  if(this.running)return this.running;
  this.running=this.execute();
  return this.running;
 }
 private async deadline<T>(work:Promise<T>,timeoutMs:number):Promise<{ok:boolean;value?:T}>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const timeout=new Promise<{ok:false}>(resolve=>{
   timer=setTimeout(()=>resolve({ok:false}),timeoutMs);
  });
  try{
   // Absorb late rejection from abandoned tasks; never leak an unhandled
   // rejection when an HTTP/SMTP connection exceeds the drain deadline.
   const settled=work.then(value=>({ok:true as const,value}),
    ()=>({ok:false as const}));
   return await Promise.race([settled,timeout]);
  }finally{if(timer!==undefined)clearTimeout(timer);}
 }
 private async execute():Promise<ShutdownResult>{
  let status:ShutdownResult="clean";
  // Even a scheduler/forwarder stop exception must not skip HTTP and DB
  // cleanup: return a failure result, but continue the shutdown sequence.
  try{this.hooks.stopNewWork();}
  catch{status="failed";}
  // Promise.all rejected as soon as ONE drain task failed, which could close
  // Postgres while the OTHER was still persisting a booking or SMTP receipt.
  // Wait for both tasks (settled, not just first rejection) before DB close.
  const drain=Promise.allSettled([
   Promise.resolve().then(()=>this.hooks.stopWorker()),
   Promise.resolve().then(()=>this.hooks.closeHttp())
  ]);
  const result=await this.deadline(drain,this.deadlineMs);
  if(!result.ok){
   if(status==="clean")status="timeout";
   try{this.hooks.forceHttp();}catch{status="failed";}
  }else if(result.value?.some(item=>item.status==="rejected")){
   status="failed";
   try{this.hooks.forceHttp();}catch{}
  }
  const db=await this.deadline(Promise.resolve().then(
   ()=>this.hooks.closeDb()),this.dbDeadlineMs);
  if(!db.ok)status="failed";
  return status;
 }
}
