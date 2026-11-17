/**
 * Local operator check for the API URL embedded into the Expo mobile bundle.
 * No credentials, tokens or PHI. This intentionally does not mutate .env.
 *
 * Run pnpm dev:api in one terminal, then pnpm dev:api:check in another.
 */
import {existsSync,readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";

const root=fileURLToPath(new URL("../",import.meta.url));
const mobileEnv=resolve(root,"apps/mobile/.env");
const origin=/^EXPO_PUBLIC_API_URL\s*=\s*(.*)$/m.exec(
 existsSync(mobileEnv)?readFileSync(mobileEnv,"utf8"):"")?.[1]?.trim()
 .replace(/^['"]|['"]$/g,"").replace(/\/+$/,"");
if(!origin){
 console.error("[mobile-api] Missing apps/mobile/.env EXPO_PUBLIC_API_URL. Start pnpm dev:api first.");
 process.exitCode=1;
}else{
 const parsed=URL.canParse(origin)?new URL(origin):null;
 if(!parsed||parsed.protocol!=="https:"||parsed.username||parsed.password){
  console.error("[mobile-api] Expected a public HTTPS origin. Restart pnpm dev:api.");
  process.exitCode=1;
 }else{
  const headers={Accept:"application/json","ngrok-skip-browser-warning":"1"};
  console.info("[mobile-api] Checking "+parsed.origin+" (no credentials sent).");
  async function check(path,validate){
   try{
    const response=await fetch(parsed.origin+path,{headers,signal:AbortSignal.timeout(10000)});
    const kind=response.headers.get("content-type")||"";
    if(!kind.toLowerCase().includes("application/json")){
     console.error("[mobile-api] "+path+": non-JSON response from tunnel ("+
      response.status+"). Restart pnpm dev:api; check ngrok/Cloudflare connectivity.");
     return false;
    }
    const json=await response.json();
    const ok=response.ok&&validate(json);
    console[ok?"info":"error"]("[mobile-api] "+path+": "+(ok?"OK":
     "FAILED ("+response.status+", "+(json?.code||"unexpected server response")+")"));
    return ok;
   }catch{
    console.error("[mobile-api] "+path+": unreachable. Keep pnpm dev:api running; test phone internet and tunnel.");
    return false;
   }
  }
  const status=await check("/v1/public/status",body=>body?.product==="DandanLink");
  const ready=await check("/ready",body=>body?.status==="ready");
  if(status&&ready){
   console.info("[mobile-api] API reachable with healthy database. Reload Expo Go after any tunnel change.");
  }else{
   console.error("[mobile-api] API is not fully accessible. Do not create another account until connectivity is restored.");
   process.exitCode=1;
  }
 }
}
