import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Admin navigation uses a distinct modern SVG icon for every sidebar tab",()=>{
 const source=read("apps/admin-web/app/admin/admin-shell.tsx");
 const symbols=read("packages/ui-web/src/care-icons.tsx");
 const items=Array.from(source.matchAll(/\{key:"([^"]+)",href:"([^"]+)",group:"([^"]+)",icon:"([^"]+)"\}/g),
  m=>({key:m[1],href:m[2],group:m[3],icon:m[4]}));
 assert.equal(items.length,12,"Each existing platform sidebar tab remains present");
 assert.equal(new Set(items.map(x=>x.icon)).size,12,"Every tab has its own recognizable icon");
 const expected={
  dashboard:"layout-dashboard",clinics:"hospital",dentists:"badge-check",
  listings:"images",reviews:"message-square-star",subscriptions:"credit-card",
  plans:"package",support:"life-buoy",analytics:"chart-columns",
  security:"shield-check",settings:"sliders-horizontal",pilot:"rocket"
 };
 for(const item of items){
  assert.equal(item.icon,expected[item.key],item.key+" icon should match its function");
  assert.ok(symbols.includes('"' + item.icon + '"'),item.icon+" should be in the SVG set");
  assert.match(symbols,new RegExp('(?:\\b|")'+item.icon+'":<>?'),'Icon definition missing: '+item.icon);
 }
 assert.match(source,/<CareIcon name=\{item\.icon\} size=\{19\}\/>/);
 assert.match(symbols,/strokeLinecap="round" strokeLinejoin="round"/);
});
test("Admin navigation has subtle logical inset and RTL-aware hover translation",()=>{
 const css=read("packages/ui-web/src/admin-design.css");
 const part=css.slice(css.indexOf("Navigation refinement: slight inward alignment"));
 assert.ok(part.length>500,"Nav refinement must be imported with the existing admin CSS");
 assert.match(part,/margin-inline:5px 3px/);
 assert.match(part,/translate:3px 0/);
 assert.match(part,/\[dir="rtl"\][^{]+\{\s*translate:-3px 0/);
 assert.match(part,/hover:not\(\[aria-current="page"\]\)/);
 assert.match(part,/admin-sidebar-collapsed[^{]+\{[\s\S]*?margin-inline:0/);
 assert.match(part,/prefers-reduced-motion:reduce/);
 assert.match(part,/stroke-width:1\.85/);
 assert.match(part,/admin-sidebar-icon/);
 assert.match(css,/.admin-sidebar-link\[aria-current="page"\]/);
 const root=read("apps/admin-web/app/layout.tsx");
 assert.match(root,/import "@dandanlink\/ui\/admin-design\.css"/);
 assert.doesNotMatch(read("apps/clinic-web/app/layout.tsx"),/admin-design\.css/);
 assert.doesNotMatch(read("apps/patient-web/app/layout.tsx"),/admin-design\.css/);
});
test("Sidebar still persists between tabs with role and localization controls",()=>{
 const shell=read("apps/admin-web/app/admin/admin-shell.tsx");
 assert.match(shell,/PersistentAdminShellProvider/);
 assert.match(shell,/const items=role==="admin"\?NAV:role==="support"/);
 assert.match(shell,/NAV\.filter\(item=>item\.key==="support"\|\|item\.key==="analytics"\)/);
 assert.match(shell,/aria-current=\{active\(item\.href\)/);
 assert.match(shell,/LocaleControls/);
 assert.match(read("apps/admin-web/app/admin/layout.tsx"),/AdminPersistentShell/);
});
