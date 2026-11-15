import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Admin segment owns a persistent sidebar shared by every tab route",()=>{
 const layout=file("apps/admin-web/app/admin/layout.tsx");
 const shell=file("apps/admin-web/app/admin/admin-shell.tsx");
 const root=file("apps/admin-web/app/layout.tsx");
 assert.match(layout,/AdminPersistentShell/);
 assert.match(root,/SiteLayout audience="admin"/);
 assert.match(root,/admin-persistent\.css/);
 assert.match(shell,/import Link from "next\/link"/);
 assert.match(shell,/usePathname/);
 assert.match(shell,/PersistentAdminShellProvider/);
 assert.match(shell,/className="card side-panel admin-persistent-sidebar"/);
 assert.match(shell,/className="work-content admin-persistent-content"/);
 assert.match(shell,/className="admin-route-content"/);
 assert.match(shell,/role==="loading"/);
 assert.match(shell,/PUBLIC_ADMIN_PATH/);
 assert.match(shell,/path\.startsWith/);
 assert.match(shell,/router\.push\(url\.pathname/);
 assert.match(shell,/aria-current=\{active\(item\.href\)/);
 for(const path of ["clinics","dentists","listings","reviews","subscriptions","plans",
  "support","analytics","security","settings","pilot"]){
  assert.ok(shell.includes('href:"/admin/'+path+'"'),"sidebar route missing: "+path);
 }
 for(const lang of ["fa-AF","ps-AF","en:"])assert.ok(shell.includes(lang),lang);
});

test("Admin portal routes no longer render their own sidebar when inside the persistent shell",()=>{
 const old=file("packages/ui-web/src/phase02.tsx");
 const ops=file("packages/ui-web/src/phase18-admin.tsx");
 const provider=file("packages/ui-web/src/admin-shell-context.tsx");
 assert.match(old,/if\(audience==="admin"&&persistentAdminShell\)return <>{children}<\/>;/);
 assert.match(ops,/persistentAdminShell\?main:<div className="p18-admin-layout">/);
 assert.match(provider,/createContext\(false\)/);
 assert.match(provider,/PersistentAdminShellProvider/);
 const pkg=file("packages/ui-web/package.json");
 assert.match(pkg,/"\.\/admin-shell-context":"\.\/src\/admin-shell-context.tsx"/);
 const loading=file("apps/admin-web/app/admin/loading.tsx");
 assert.match(loading,/admin-page-loading/);
 assert.doesNotMatch(loading,/side-panel|admin-persistent-sidebar/);
});

test("Admin sidebar skeleton and content loading remain stable across route changes",()=>{
 const css=file("packages/ui-web/src/admin-persistent.css");
 for(const selector of [".admin-persistent-shell",".admin-persistent-sidebar",
  ".admin-persistent-content",".admin-nav-skeleton",".admin-page-loading",
  "prefers-reduced-motion"])
  assert.ok(css.includes(selector),selector);
 assert.match(css,/position:sticky/);
 assert.match(css,/min-height:540px/);
 const shell=file("apps/admin-web/app/admin/admin-shell.tsx");
 assert.match(shell,/const items=role==="admin"\?NAV:role==="support"/);
 assert.match(shell,/LocaleControls/);
 assert.match(shell,/async function signOut/);
});
