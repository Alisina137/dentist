/**
 * SDK 57 only. These file bytes are kept in memory for the current screen:
 * never AsyncStorage, URL params, console, logs, or automatic retries.
 * Server recomputes MIME from the magic bytes and enforces owner/tenant rights.
 */
import * as DocumentPicker from "expo-document-picker";
import {File} from "expo-file-system";
import {nativeApiHeaders,nativeJsonResponse} from "./api-transport";
import {ApiError} from "./api-error";

export const CLINIC_LICENSE_MAX_BYTES=2097152;
export const CREDENTIAL_MAX_BYTES=1572864;

export type EvidenceFile={
 name:string;mime:"application/pdf"|"image/png"|"image/jpeg";
 size:number;bytes:Uint8Array;
};
export function detectEvidenceMime(bytes:Uint8Array):EvidenceFile["mime"]|null{
 if(bytes.length<8)return null;
 if(bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45)
  return "application/pdf";
 if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&
    bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return "image/png";
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return "image/jpeg";
 return null;
}
/** Header-safe ASCII filename; does not expose the original device path. */
export function evidenceFileName(input:string,mime:EvidenceFile["mime"]):string{
 const ext=mime==="application/pdf"?".pdf":mime==="image/png"?".png":".jpg";
 const basename=input.replace(/\.[^.]+$/,"").replace(/[^a-zA-Z0-9 _-]+/g,"_")
  .replace(/\s+/g,"_").replace(/^[_-]+|[_-]+$/g,"").slice(0,90);
 return (basename||"clinic_document")+ext;
}
export function validEvidence(bytes:Uint8Array,size:number,max:number){
 return Number.isSafeInteger(size)&&size>=8&&size<=max&&bytes.length===size&&
  detectEvidenceMime(bytes)!==null;
}
export async function pickClinicEvidence(max=CLINIC_LICENSE_MAX_BYTES):Promise<EvidenceFile|null>{
 const selected=await DocumentPicker.getDocumentAsync({
  type:["application/pdf","image/png","image/jpeg"],
  copyToCacheDirectory:true,multiple:false
 });
 if(selected.canceled)return null;
 const item=selected.assets?.[0];
 if(!item||!item.uri||typeof item.name!=="string")throw new ApiError(422,"INVALID_DOCUMENT");
 // Reject over-sized files before reading multi-MB buffers into JavaScript.
 if(typeof item.size!=="number"||item.size<8||item.size>max)
  throw new ApiError(413,"INVALID_FILE_SIZE");
 const file=new File(item.uri);
 const bytes=await file.bytes();
 if(!validEvidence(bytes,item.size,max))throw new ApiError(415,"DOCUMENT_SIGNATURE_MISMATCH");
 const mime=detectEvidenceMime(bytes)!;
 return {name:evidenceFileName(item.name,mime),mime,size:bytes.length,bytes};
}
export function evidenceBase64(bytes:Uint8Array):string{
 // RFC4648, without importing filesystem content into external web tooling.
 const abc="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
 let result="";
 for(let i=0;i<bytes.length;i+=3){
  const a=bytes[i],b=bytes[i+1],c=bytes[i+2];
  result+=abc[a>>2]+abc[((a&3)<<4)|((b??0)>>4)]+
   (b===undefined?"=":abc[((b&15)<<2)|((c??0)>>6)])+
   (c===undefined?"=":abc[c&63]);
 }
 return result;
}
export function credentialEvidence(file:EvidenceFile){
 if(!validEvidence(file.bytes,file.size,CREDENTIAL_MAX_BYTES))
  throw new ApiError(413,"INVALID_CREDENTIAL_FILE");
 return {fileName:file.name,mimeType:file.mime,contentBase64:evidenceBase64(file.bytes)};
}
export async function uploadClinicLicense(
 apiBase:string,clinicId:string,token:string,document:EvidenceFile,signal?:AbortSignal
):Promise<{id:string;kind:string;fileName:string;sizeBytes:number}>{
 if(!/^[a-f\d-]{36}$/i.test(clinicId)||!token)
  throw new ApiError(403,"OWNER_SESSION_REQUIRED");
 if(!validEvidence(document.bytes,document.size,CLINIC_LICENSE_MAX_BYTES))
  throw new ApiError(415,"DOCUMENT_SIGNATURE_MISMATCH");
 if(!__DEV__&&!/^https:\/\//.test(apiBase))throw new ApiError(0,"HTTPS_REQUIRED");
 const timeout=new AbortController();
 const timer=setTimeout(()=>timeout.abort(),20000);
 const cancel=()=>timeout.abort();
 signal?.addEventListener("abort",cancel,{once:true});
 if(signal?.aborted)timeout.abort();
 try{
  const blob=new Blob([new Uint8Array(document.bytes)],{type:"application/octet-stream"});
  const response=await fetch(apiBase+"/v1/clinics/"+encodeURIComponent(clinicId)+"/evidence",{
   method:"POST",signal:timeout.signal,body:blob,
   headers:{...nativeApiHeaders(apiBase),Accept:"application/json",
    "Content-Type":"application/octet-stream",
    Authorization:"Bearer "+token,
    "x-document-kind":"clinic_license","x-file-name":document.name
   }
  });
  const payload=await nativeJsonResponse<{id:string;kind:string;fileName:string;sizeBytes:number}>(response);
  if(!payload||payload.kind!=="clinic_license"||payload.sizeBytes!==document.size||
    typeof payload.id!=="string")throw new ApiError(502,"UPLOAD_CONFIRMATION_INVALID");
  return payload;
 }catch(e){
  if(e instanceof ApiError)throw e;
  throw new ApiError(0,"UPLOAD_NETWORK_UNCERTAIN");
 }finally{
  clearTimeout(timer);signal?.removeEventListener("abort",cancel);
 }
}
