/**
 * Phase 33: fail-closed bounded database readiness.
 *
 * A hung DB probe must not hold /ready open forever or create unbounded
 * concurrent SQL requests from an orchestrator storm. The underlying
 * database client may keep its query alive after this HTTP deadline;
 * until it settles, new HTTP probes return 503 without starting SQL work.
 * Do not interpret /health as DB or healthcare-pilot readiness.
 */
export class BoundedReadinessProbe{
 private inFlight:Promise<boolean>|null=null;
 private timedOut=false;
 constructor(private readonly probe:()=>Promise<unknown>,
  private readonly deadlineMs=2500){
  if(!Number.isInteger(deadlineMs)||deadlineMs<1||deadlineMs>30000)
   throw Error("READINESS_DEADLINE_INVALID");
 }
 async check():Promise<boolean>{
  if(this.inFlight&&this.timedOut)return false;
  if(!this.inFlight){
   const running=Promise.resolve().then(this.probe).then(()=>true,()=>false);
   this.inFlight=running;
   void running.finally(()=>{
    if(this.inFlight===running){
     this.inFlight=null;this.timedOut=false;
    }
   });
  }
  const running=this.inFlight;
  if(!running)return false;
  let timeoutId:ReturnType<typeof setTimeout>|undefined;
  let expired=false;
  const deadline=new Promise<false>(resolve=>{
   timeoutId=setTimeout(()=>{expired=true;resolve(false)},this.deadlineMs);
  });
  try{
   const result=await Promise.race([running,deadline]);
   if(expired&&this.inFlight===running)this.timedOut=true;
   return result;
  }finally{if(timeoutId!==undefined)clearTimeout(timeoutId);}
 }
}
