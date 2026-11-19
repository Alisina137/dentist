/**
 * Phase 33: treat paths composed by native screens as untrusted at the
 * Authorization bearer boundary. Never allow a caller to replace the API
 * origin or smuggle path traversal, fragments or unsafe HTTP route prefixes.
 *
 * The query string may contain URLSearchParams-encoded search text. It is not
 * used to compute route authorization; only the path before '?' is validated.
 */
export function safeNativeApiPath(value:unknown):value is string{
 if(typeof value!=="string"||value.length<4||value.length>4096||
   !value.startsWith("/")||value.startsWith("//")||
   /[\\\u0000-\u001F\u007F#]/.test(value))return false;
 const path=value.split("?",1)[0];
 if(!(/^\/v1(?:\/|$)/.test(path)||/^\/api\/auth(?:\/|$)/.test(path)))
  return false;
 // URL parsers can normalize dot segments and percent-encoded separators.
 // Refuse normalization-dependent routes instead of guessing the endpoint.
 if(/%(?:2e|2f|5c|00)/i.test(path))return false;
 if(path.split("/").some(part=>part==="."||part===".."))return false;
 return true;
}
