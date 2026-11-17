/**
 * Clinic Phase 18: bounded, cancellable, read-only requests.
 * Do not use for appointment, invoice, credit, payment or reversal writes.
 */
export async function clinicReadJson(
 url:string,external?:AbortSignal,timeoutMs=11000,fetcher:typeof fetch=fetch
):Promise<any>{
 const controller=new AbortController();
 let timedOut=false;
 if(external?.aborted)controller.abort();
 const onAbort=()=>controller.abort();
 external?.addEventListener("abort",onAbort,{once:true});
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
 try{
  const response=await fetcher(url,{
   method:"GET",credentials:"include",cache:"no-store",redirect:"error",
   headers:{Accept:"application/json"},signal:controller.signal
  });
  if(!response.ok){
   // Only stable status classifications; never render unknown server responses.
   const code=response.status===401?"AUTH_REQUIRED":
    response.status===403?"FORBIDDEN":
    response.status===409?"CONFLICT":"NETWORK_ERROR";
   throw Object.assign(new Error(code),{status:response.status});
  }
  const type=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  if(type!=="application/json")throw new Error("NETWORK_ERROR");
  let body:unknown;
  try{body=await response.json();}catch{throw new Error("NETWORK_ERROR");}
  if(body===null||typeof body!=="object"||Array.isArray(body))
   throw new Error("NETWORK_ERROR");
  return body;
 }catch(error){
  if(timedOut)throw new Error("REQUEST_TIMEOUT");
  if(controller.signal.aborted)throw new Error("REQUEST_CANCELLED");
  if(error instanceof Error&&["AUTH_REQUIRED","FORBIDDEN","CONFLICT"].includes(error.message))
   throw error;
  throw new Error("NETWORK_ERROR");
 }finally{
  clearTimeout(timer);
  external?.removeEventListener("abort",onAbort);
 }
}
