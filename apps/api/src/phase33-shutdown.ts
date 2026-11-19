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
  try{this.hooks.stopNewWork();}
  catch{return "failed";}
  let status:ShutdownResult="clean";
  const drain=Promise.all([
   Promise.resolve().then(()=>this.hooks.stopWorker()),
   Promise.resolve().then(()=>this.hooks.closeHttp())
  ]);
  const result=await this.deadline(drain,this.deadlineMs);
  if(!result.ok){
   status="timeout";
   try{this.hooks.forceHttp();}catch{status="failed";}
  }
  const db=await this.deadline(Promise.resolve().then(
   ()=>this.hooks.closeDb()),this.dbDeadlineMs);
  if(!db.ok)status=status==="clean"?"failed":status;
  return status;
 }
}
