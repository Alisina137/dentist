/**
 * Stage L: fail-closed production configuration checks.
 * Validates configuration shape only, never connects to third-party services,
 * prints a secret, or marks the clinical/legal pilot as ready.
 */
const requiredOrigins=["API_BASE_URL","CLINIC_WEB_URL","ADMIN_WEB_URL","PATIENT_WEB_URL"] as const;
const requiredMail=["SMTP_HOST","SMTP_FROM","SMTP_USER","SMTP_PASSWORD"] as const;

function httpsOrigin(raw:string|undefined):boolean{
 if(!raw||raw.trim()!==raw)return false;
 try{
  const u=new URL(raw);
  return u.protocol==="https:"&&Boolean(u.hostname)&&
   u.username===""&&u.password===""&&u.pathname==="/"&&
   u.search===""&&u.hash===""&&
   !["localhost","127.0.0.1","::1","[::1]"].includes(u.hostname.toLowerCase())&&
   !u.hostname.toLowerCase().endsWith(".localhost")&&
   !u.hostname.toLowerCase().endsWith(".test")&&
   !u.hostname.toLowerCase().endsWith(".invalid");
 }catch{return false}
}

export function productionConfigurationIssues(env:NodeJS.ProcessEnv):string[]{
 const issues:string[]=[];
 if(env.NODE_ENV!=="production"){
  issues.push("NODE_ENV must be production for production preflight");
  return issues;
 }
 for(const key of requiredOrigins)if(!httpsOrigin(env[key]))
  issues.push(key+" must be an HTTPS public origin without path, credentials or query");
 const webOrigins=[env.CLINIC_WEB_URL,env.ADMIN_WEB_URL,env.PATIENT_WEB_URL];
 if(webOrigins.every(Boolean)&&new Set(webOrigins).size!==webOrigins.length)
  issues.push("CLINIC_WEB_URL, ADMIN_WEB_URL and PATIENT_WEB_URL must be distinct origins");
 const secret=env.BETTER_AUTH_SECRET||"";
 if(secret.length<32||secret.trim()!==secret||
   /(?:ci_test_secret|example|changeme|replace_me|test_only|0123456789)/i.test(secret))
  issues.push("BETTER_AUTH_SECRET must be a unique non-example random secret of at least 32 characters");
 const database=env.DATABASE_URL;
 try{
  const u=new URL(database||"");
  if(!["postgres:","postgresql:"].includes(u.protocol)||
    !u.hostname||!u.username||!u.password||!u.pathname||u.pathname==="/"||
    !["require","verify-full","verify-ca"].includes(u.searchParams.get("sslmode")||""))
   issues.push("DATABASE_URL must use authenticated PostgreSQL with sslmode=require or stronger");
 }catch{issues.push("DATABASE_URL must be a valid PostgreSQL TLS connection URL")}
 for(const key of requiredMail)if(!env[key]?.trim())issues.push(key+" is required for verified account email in production");
 const smtpPort=env.SMTP_PORT;
 if(smtpPort!==undefined&&(!/^\d{1,5}$/.test(smtpPort)||
    Number(smtpPort)<1||Number(smtpPort)>65535))
  issues.push("SMTP_PORT must be a valid TCP port");
 if(env.DEV_SKIP_EMAIL_VERIFICATION==="true")
  issues.push("DEV_SKIP_EMAIL_VERIFICATION must be disabled in production");
 if(env.PH19_PILOT_RELEASE_ENABLED==="true"){
  const approvals=[
   "PH19_LEGAL_PRIVACY_APPROVED","PH19_CLINICAL_REVIEW_APPROVED",
   "PH19_HOSTING_SECURITY_APPROVED","PH19_BACKUP_RESTORE_APPROVED",
   "PH19_PENETRATION_TEST_APPROVED","PH19_ACCESS_REVIEW_APPROVED",
   "PH19_ALERTS_APPROVED","PH19_ACCESSIBILITY_RTL_APPROVED",
   "PH19_PILOT_ROSTER_APPROVED"];
  if(approvals.some(key=>env[key]!=="true"))
   issues.push("PH19_PILOT_RELEASE_ENABLED requires all nine independently evidenced approval switches");
 }
 return issues;
}

export function assertProductionConfiguration(env:NodeJS.ProcessEnv=process.env):void{
 if(env.NODE_ENV!=="production")return;
 const issues=productionConfigurationIssues(env);
 if(issues.length)throw new Error("DandanLink production configuration blocked: "+issues.join("; "));
}
