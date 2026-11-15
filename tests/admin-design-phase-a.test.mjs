import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const shell=()=>read("apps/admin-web/app/admin/admin-shell.tsx");
const css=()=>read("packages/ui-web/src/admin-design.css");

test("Phase A: admin navigation uses one professional SVG icon system",()=>{
 const source=shell();
 const icons=read("packages/ui-web/src/care-icons.tsx");
 const layout=read("apps/admin-web/app/layout.tsx");
 const pkg=read("packages/ui-web/package.json");
 assert.match(source,/import \{authClient,CareIcon,LocaleControls,usePreferences,type CareIconName\}/);
 assert.match(source,/<CareIcon name=\{item\.icon\} size=\{19\}/);
 for(const key of ["chart","star","layers","receipt","dental","clipboard","panel"])
  assert.match(icons,new RegExp("\\b"+key+":<"),key+" SVG must have a path");
 assert.doesNotMatch(source,/<span className="phase04-side-icon"[^>]*>\s*[▧◈◇✚]/);
 assert.match(layout,/import "@dandanlink\/ui\/admin-design\.css"/);
 assert.match(pkg,/"\.\/admin-design\.css":"\.\/src\/admin-design\.css"/);
 assert.match(read("packages/ui-web/src/index.tsx"),/export \{ CareIcon \}/);
});

test("Phase A: navigation remains persistent, collapsible, keyboard accessible, and localized",()=>{
 const source=shell();
 const context=read("packages/ui-web/src/admin-shell-context.tsx");
 assert.match(source,/PersistentAdminShellProvider/);
 assert.match(context,/PersistentAdminShellProvider/);
 assert.match(read("apps/admin-web/app/admin/layout.tsx"),/AdminPersistentShell/);
 assert.match(source,/dandan\.admin\.sidebarCollapsed/);
 assert.match(source,/localStorage\.getItem\(STORAGE_COLLAPSE_KEY\)/);
 assert.match(source,/localStorage\.setItem\(STORAGE_COLLAPSE_KEY/);
 assert.match(source,/aria-expanded=\{!collapsed\}/);
 assert.match(source,/aria-expanded=\{mobileOpen\}/);
 assert.match(source,/aria-current=\{active\(item\.href\)/);
 assert.match(source,/aria-controls="admin-workspace-navigation"/);
 assert.match(source,/event\.key==="Escape"/);
 assert.match(source,/event\.key!=="Tab"/);
 assert.match(source,/mobileCloseRef\.current\?\.focus\(\)/);
 assert.match(source,/role=\{mobileOpen\?"dialog":undefined\}/);
 assert.match(source,/event\.metaKey\|\|event\.ctrlKey/);
 assert.match(source,/link\.hasAttribute\("download"\)/);
 assert.match(source,/router\.push\(url\.pathname/);
 assert.match(source,/const items=role==="admin"\?NAV:role==="support"/);
 assert.match(source,/NAV\.filter\(item=>item\.key==="support"\|\|item\.key==="analytics"\)/);
 for(const lang of ["en:","fa-AF","ps-AF"])assert.ok(source.includes(lang),lang);
 for(const section of ["overview","verification","finance","operations","platform"])
  assert.ok(source.includes(section+":")||source.includes(section+",")||
   source.includes("group:\""+section+"\""),section);
});

test("Phase A: visual tokens, RTL, mobile drawer and accessibility are admin-only",()=>{
 const stylesheet=css();
 const root=read("apps/admin-web/app/layout.tsx");
 assert.match(root,/admin-persistent\.css/);
 for(const token of ["--admin-ink","--admin-subtle","--admin-brand","--admin-surface",
 "--admin-border","--admin-radius","--admin-text","--admin-title"])
  assert.ok(stylesheet.includes(token),token);
 for(const selector of [".shell-admin",".admin-persistent-shell.admin-sidebar-collapsed",
  ".admin-persistent-sidebar",".admin-sidebar-head",".admin-persistent-header",
  ".admin-mobile-backdrop",".admin-mobile-open .admin-persistent-sidebar",
  ".admin-sidebar-link[aria-current=\"page\"]",
  ".admin-route-content",".admin-breadcrumb","@media(max-width:900px)",
  "@media(max-width:590px)","prefers-reduced-motion"])
  assert.ok(stylesheet.includes(selector),selector);
 assert.match(stylesheet,/\[dir="rtl"\] \.admin-persistent-sidebar/);
 assert.match(stylesheet,/focus-visible/);
 assert.match(stylesheet,/visibility:hidden;pointer-events:none/);
 assert.doesNotMatch(read("apps/clinic-web/app/layout.tsx"),/admin-design\.css/);
 assert.doesNotMatch(read("apps/patient-web/app/layout.tsx"),/admin-design\.css/);
});

test("Phase A: older admin modules still run in the same persistent shell",()=>{
 const legacy=read("packages/ui-web/src/phase02.tsx");
 const ops=read("packages/ui-web/src/phase18-admin.tsx");
 assert.match(legacy,/if\(audience==="admin"&&persistentAdminShell\)return <>{children}<\/>;/);
 assert.match(ops,/persistentAdminShell\?main:<div className="p18-admin-layout">/);
 const load=read("apps/admin-web/app/admin/loading.tsx");
 assert.match(load,/admin-page-loading/);
 assert.doesNotMatch(load,/side-panel|admin-persistent-sidebar/);
});
