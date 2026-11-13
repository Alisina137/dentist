// Enable no-email-confirmation sign-up ONLY in an existing development .env.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), ".env");
if (!existsSync(path)) {
  console.error("Missing .env. Copy .env.example to .env, then configure database and auth secrets.");
  process.exit(1);
}
let contents=readFileSync(path,"utf8");
const envMode=contents.match(/^\s*NODE_ENV\s*=\s*["']?([^\s#"'\r\n]+)/m)?.[1] || "development";
if (envMode!=="development" || (process.env.NODE_ENV && process.env.NODE_ENV!=="development")) {
  console.error("Refusing to skip email verification outside development mode.");
  process.exit(2);
}
const key=/^DEV_SKIP_EMAIL_VERIFICATION\s*=.*$/m;
contents=key.test(contents)
  ? contents.replace(key,"DEV_SKIP_EMAIL_VERIFICATION=true")
  : contents.replace(/\s*$/,"")+"\nDEV_SKIP_EMAIL_VERIFICATION=true\n";
writeFileSync(path,contents,"utf8");
console.log("Development only: email verification is disabled. Restart pnpm dev:api.");
console.log("Password sign-in, explicit admin grants and administrator MFA remain required.");
