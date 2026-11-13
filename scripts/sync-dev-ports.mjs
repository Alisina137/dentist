// Updates only local development web origins. Never modifies database credentials or secrets.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const file=resolve(process.cwd(),".env");
if(!existsSync(file)){
  console.error("Missing .env. Copy .env.example to .env and set DATABASE_URL and BETTER_AUTH_SECRET first.");
  process.exitCode=1;
}else{
  let content=readFileSync(file,"utf8");
  for(const [name,value] of [["ADMIN_WEB_URL","http://localhost:3000"],["CLINIC_WEB_URL","http://localhost:3001"]]){
    const line=new RegExp("^"+name+"=.*$","m");
    content=line.test(content)?content.replace(line,name+"="+value):content.replace(/\s*$/,"")+"\n"+name+"="+value+"\n";
  }
  writeFileSync(file,content,"utf8");
  console.log("Development origins set: Admin http://localhost:3000; Clinic http://localhost:3001.");
  console.log("Your DATABASE_URL, BETTER_AUTH_SECRET and other settings were preserved.");
}
