import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root=resolve(import.meta.dirname,"..");
const json=async name=>JSON.parse(await readFile(join(root,name),"utf8"));
test("dedicated dashboard development commands use admin 3000 and clinic 3001",async()=>{
 const rootPackage=await json("package.json");
 const admin=await json("apps/admin-web/package.json");
 const clinic=await json("apps/clinic-web/package.json");
 assert.match(rootPackage.scripts["dev:admin"],/admin-web/);
 assert.match(rootPackage.scripts["dev:clinic"],/clinic-web/);
 assert.equal(admin.scripts.dev,"next dev -p 3000");
 assert.equal(clinic.scripts.dev,"next dev -p 3001");
 assert.equal(admin.scripts.start,"next start -p 3000");
 assert.equal(clinic.scripts.start,"next start -p 3001");
 assert.match(rootPackage.scripts.dev,/dev:admin/);
 assert.match(rootPackage.scripts.dev,/dev:clinic/);
 assert.doesNotMatch(rootPackage.scripts.dev,/dev:patient:web/);
 const env=await readFile(join(root,".env.example"),"utf8");
 assert.match(env,/^ADMIN_WEB_URL=http:\/\/localhost:3000$/m);
 assert.match(env,/^CLINIC_WEB_URL=http:\/\/localhost:3001$/m);
 const workflow=await readFile(join(root,".github/workflows/ci.yml"),"utf8");
 assert.match(workflow,/ADMIN_WEB_URL: http:\/\/localhost:3000/);
 assert.match(workflow,/CLINIC_WEB_URL: http:\/\/localhost:3001/);
});
test("Expo Go patient app is a native workspace not a Next.js mobile shortcut",async()=>{
 const rootPackage=await json("package.json");
 const native=await json("apps/mobile/package.json");
 const config=await json("apps/mobile/app.json");
 const source=await readFile(join(root,"apps/mobile/App.tsx"),"utf8");
 assert.equal(native.name,"@dandanlink/mobile");
 assert.equal(native.main,"index.js");
 assert.match(native.dependencies.expo,/^~57\./);
 assert.equal(native.dependencies["react-native"],"0.86.3");
 assert.equal(native.dependencies["@react-native-async-storage/async-storage"],"2.2.0");
 assert.match(rootPackage.scripts["dev:mobile"],/expo start --tunnel --clear --go/);
 assert.equal(rootPackage.scripts["dev:patient"],"pnpm dev:mobile");
 assert.equal(config.expo.android.package,"com.dandanlink.patient");
 for(const name of ['"home"','"appointments"','"saved"','"account"']){
   assert.ok(source.includes(name),"missing tab "+name);
 }
 for(const language of ["fa-AF","ps-AF","en"]){
   assert.ok(source.includes('"'+language+'"'),"missing language "+language);
 }
 assert.match(source,/AsyncStorage\.setItem/);
 assert.match(source,/EXPO_PUBLIC_API_URL/);
 assert.match(source,/marketplaceAvailable/);
 assert.match(source,/notLaunched/);
 assert.match(source,/No real patient appointments/);
});
test("dev origin sync preserves existing secrets and rejects missing .env",async()=>{
 const directory=await mkdtemp(join(tmpdir(),"dandan-ports-"));
 try{
  const executable=join(root,"scripts/sync-dev-ports.mjs");
  const missing=spawnSync(process.execPath,[executable],{cwd:directory,encoding:"utf8"});
  assert.equal(missing.status,1);
  await writeFile(join(directory,".env"),
    "NODE_ENV=development\nDATABASE_URL=postgres://db-secret.test/db\nBETTER_AUTH_SECRET=my-testing-secret-value-which-is-long\n"+
    "ADMIN_WEB_URL=http://localhost:3001\nCLINIC_WEB_URL=http://localhost:3000\n");
  const result=spawnSync(process.execPath,[executable],{cwd:directory,encoding:"utf8"});
  assert.equal(result.status,0,result.stderr);
  const changed=await readFile(join(directory,".env"),"utf8");
  assert.match(changed,/DATABASE_URL=postgres:\/\/db-secret\.test\/db/);
  assert.match(changed,/BETTER_AUTH_SECRET=my-testing-secret-value-which-is-long/);
  assert.match(changed,/^ADMIN_WEB_URL=http:\/\/localhost:3000$/m);
  assert.match(changed,/^CLINIC_WEB_URL=http:\/\/localhost:3001$/m);
 }finally{await rm(directory,{recursive:true,force:true});}
});
