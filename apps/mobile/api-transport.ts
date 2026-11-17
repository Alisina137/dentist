import {ApiError} from "./api-error";

/** Native requests must not interpret ngrok's browser interstitial as an API result. */
export function nativeApiHeaders(apiBase:string):Record<string,string>{
 const headers:Record<string,string>={Accept:"application/json"};
 try{
  const {hostname,protocol}=new URL(apiBase);
  if(protocol==="https:"&&(/\.ngrok-free\.dev$/i.test(hostname)||/\.ngrok\.app$/i.test(hostname))){
   // Official ngrok free-plan API request bypass. No session, password or
   // patient data is included in this header.
   headers["ngrok-skip-browser-warning"]="1";
  }
 }catch{/* Invalid URL is rejected by the fetch caller. */}
 return headers;
}
export function nativeJsonContentType(header:string|null):boolean{
 if(!header)return false;
 const contentType=header.split(";")[0]?.trim().toLowerCase()||"";
 return contentType==="application/json"||
  /^application\/[a-z0-9.+-]+\+json$/.test(contentType);
}
export async function nativeJsonResponse<T>(response:Response):Promise<T>{
 // A 200 from a tunnel's HTML splash page must NEVER be accepted as
 // successful signup or a valid account/session.
 if(!nativeJsonContentType(response.headers.get("content-type")))
  throw new ApiError(response.status||0,"API_NON_JSON_RESPONSE");
 let value:unknown;
 try{value=await response.json();}
 catch{throw new ApiError(response.status||0,"API_INVALID_JSON_RESPONSE");}
 if(!response.ok){
  const code=value&&typeof value==="object"&&"code" in value&&
   typeof (value as {code?:unknown}).code==="string"?
    (value as {code:string}).code:
    response.status===429?"RATE_LIMIT_EXCEEDED":
    response.status>=500?"SERVER_UNAVAILABLE":"REQUEST_FAILED";
  throw new ApiError(response.status,code);
 }
 return value as T;
}
export function nativeIsDandanlinkStatus(payload:unknown):boolean{
 return Boolean(payload&&typeof payload==="object"&&
  (payload as {product?:unknown}).product==="DandanLink");
}
