import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const shell=read("apps/clinic-web/app/clinic/clinic-shell.tsx");
const css=read("apps/clinic-web/app/clinic/clinic-shell.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");
const old=read("packages/ui-web/src/phase03.tsx");
const sections=shell.slice(shell.indexOf("const NAV_SECTIONS:readonly Section[]="),
 shell.indexOf("const NAV_EXPANSION_KEY="));

test("Clinic Phase 02: six navigational groups organize only existing authorized pages",()=>{
 const found=[...sections.matchAll(/key:"([^"]+)",icon:"[^"]+",items:\[([^\]]+)\]/g)];
 assert.equal(found.length,6,"all six expandable groups must be defined");
 assert.deepEqual(found.map(x=>x[1]),[
  "frontDesk","clinicalCare","billing","operations","growth","settings"
 ]);
 const keys=found.flatMap(x=>[...x[2].matchAll(/"([^"]+)"/g)].map(item=>item[1]));
 const seen=new Set();
 for(const key of keys){
  assert.ok(!seen.has(key),"duplicate group navigation: "+key);seen.add(key);
  assert.ok(shell.includes('key:"'+key+'"'),"group points to a missing navigation route: "+key);
 }
 assert.ok(shell.includes('items.filter(item=>section.items.includes(item.key))'),
  "the group must be filtered from the server-verified staff role's allowed links");
 assert.ok(shell.includes('.filter(section=>section.links.length>0)'),
  "empty or prohibited groups must never be displayed");
 assert.ok(shell.includes('items.filter(item=>item.key==="overview")'),
  "Overview must remain a direct top-level destination");
 assert.ok(!sections.includes("waitlist")&&!sections.includes("inventory"),
  "unfinished business features must not be linked as if they already exist");
});

test("Clinic Phase 02: role-specific menus and quick links never override server authority",()=>{
 for(const role of [
  'space.role==="owner"','space.role==="manager"','space.role==="dentist"',
  'space.role==="receptionist"','space.role==="assistant"','space.role==="cashier"'
 ])assert.ok(shell.includes(role),role);
 assert.ok(shell.includes('...(space.clinicianEnabled?["clinical"]:[])'));
 assert.ok(shell.includes('...(space.role==="owner"?["settings","exportData","subscription"]:[])'));
 assert.ok(shell.includes('const items=selected?navigation(selected):[]'));
 assert.ok(shell.includes('const quickLinks=quickKeys.flatMap(key=>items.filter(item=>item.key===key))'));
 assert.ok(shell.includes('selected?.role==="dentist"?["appointments","clinical","patients"]'));
 assert.ok(shell.includes('selected?.role==="receptionist"?["bookingRequests","queue","patients"]'));
 assert.ok(shell.includes('selected?.role==="cashier"?["finance","reports","patients"]'));
 assert.ok(shell.includes('aria-label={t("navigateQuickly")}'));
 assert.ok(old.includes('space.capabilities.includes("staff.read")'),
  "legacy server-validated staff capabilities must stay in force");
 assert.ok(shell.includes('fetch(API+"/v1/team/context",{credentials:"include",cache:"no-store"'));
 assert.ok(shell.includes('const requestedInvalid=Boolean(requested&&ctx&&!selected)'));
});

test("Clinic Phase 02: accordion groups have persisted preferences and expand on navigation",()=>{
 for(const marker of [
  'const NAV_EXPANSION_KEY="dandan.clinic.navSections"',
  'const [expandedSections,setExpandedSections]=useState<Partial<Record<SectionKey,boolean>>>({})',
  'JSON.parse(localStorage.getItem(NAV_EXPANSION_KEY)||"{}")',
  'if(typeof stored[group.key]==="boolean")',
  'localStorage.setItem(NAV_EXPANSION_KEY,JSON.stringify(next))',
  'const activeSection=current?sectionOf(current.key):null',
  'if(isPublic||!activeSection)return',
  'setExpandedSections(previous=>previous[activeSection]?previous:',
  'function changeSection(section:SectionKey)',
  'aria-controls={sectionId} aria-expanded={showLinks}',
  'aria-label={t(showLinks?"collapseGroup":"expandGroup")+" — "+t(section.key)}',
  'hidden={!showLinks}',
  'const iconOnly=collapsed&&!mobileOpen'
 ])assert.ok(shell.includes(marker),marker);
 assert.ok(css.includes('.clinic-sidebar-collapsed .clinic-nav-section-links[hidden]'));
 assert.ok(css.includes('.clinic-persistent-shell .clinic-nav-section-links[hidden]{display:none!important}'));
 assert.ok(css.includes('@media(max-width:900px)'));
 assert.ok(css.includes('[dir="rtl"] .clinic-nav-section-toggle[aria-expanded="true"]'));
});

test("Clinic Phase 02: search lists accessible authorized items only and never requests clinical data",()=>{
 for(const marker of [
  'const [navSearch,setNavSearch]=useState("")',
  'const normalizedSearch=navSearch.trim().toLocaleLowerCase(locale)',
  'items.filter(item=>(t(item.key)+" "+t(sectionOf(item.key)||"workspace"))',
  'searchResults.map(item=>renderNavItem(item))',
  'maxLength={70}',
  'autoComplete="off"',
  'aria-label={t("navigationSearch")}',
  'aria-label={t("clearNavigationSearch")}',
  'navSearchRef.current?.focus()',
  '(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"',
  'window.removeEventListener("keydown",shortcut)',
  'setMobileOpen(false);setNavSearch("")',
  'role="status">{t("noNavigationMatch")}'
 ])assert.ok(shell.includes(marker),marker);
 assert.ok(!shell.includes('fetch(API+"/v1/patients/search"'));
 assert.ok(!shell.includes("localStorage.setItem(NAV_SEARCH"));
 assert.ok(css.includes('.clinic-navigation-search:focus-within'));
 assert.ok(css.includes('.clinic-navigation-search-reveal'));
});

test("Clinic Phase 02: active navigation is the deepest route, not every ancestor",()=>{
 for(const marker of [
  'const current=items.filter(item=>pathActive(pathname,item.path))',
  '.sort((a,b)=>b.path.length-a.path.length)[0]',
  'const active=current?.key===item.key',
  'aria-current={active?"page":undefined}',
  'aria-current={current?.key===item.key?"page":undefined}',
  'href={hrefFor(item.path)}',
  'prefetch={false} data-next-nav',
  'const navDetails=current&&pathname!==current.path&&pathname!==current.path+"/"?t("details"):null',
  'aria-label={t("breadcrumb")}',
  't(activeSection)',
  'aria-current="page">{navDetails}',
  'href={hrefFor(current?.path||"/clinic")}'
 ])assert.ok(shell.includes(marker),marker);
 assert.ok(!shell.includes('const active=pathActive(pathname,item.path);'),
  "ancestor routes must never be highlighted as if they are the selected page");
 assert.ok(shell.includes('url.searchParams.set("clinic",selected.clinicId)'));
 assert.ok(shell.includes('window.location.assign("/clinic?clinic="+encodeURIComponent(event.target.value))'));
 assert.ok(!shell.includes("pathname.split('/').pop()"),
  "breadcrumbs must not disclose patient IDs as labels");
});

test("Clinic Phase 02: accessibility, RTL and responsive mobile navigation keep Phase 01 stable",()=>{
 for(const marker of [
  'role={mobileOpen?"dialog":undefined}',
  'aria-modal={mobileOpen||undefined}',
  'aria-controls="clinic-workspace-navigation" aria-expanded={mobileOpen}',
  'event.key==="Escape"',
  'mobileCloseRef.current?.focus()',
  'document.body.style.overflow="hidden"',
  'aria-label={t("navigation")}',
  'aria-label={t("pageContent")}',
  'onClick={()=>{setMobileOpen(false);setNavSearch("")}}',
  'showPage&&ctx?<PersistentClinicShellProvider session={{',
  'const showPage=!loading&&!error&&!requestedInvalid',
  'navigationPending&&<div role="status" className="clinic-route-progress"'
 ])assert.ok(shell.includes(marker),marker);
 assert.ok(layout.includes('<ClinicPersistentShell>{children}</ClinicPersistentShell>'));
 assert.ok(css.includes('.clinic-persistent-nav .clinic-nav-subitem'));
 assert.ok(css.includes('.clinic-nav-section-active>.clinic-nav-section-toggle'));
 assert.ok(css.includes('.clinic-header-quick-links'));
 assert.ok(css.includes('.clinic-mobile-open.clinic-sidebar-collapsed .clinic-sidebar-extras'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 for(const language of ['en:{','"fa-AF":{','"ps-AF":{'])
  assert.ok(shell.includes(language));
 for(const label of ["frontDesk","clinicalCare","billing","growth","navigationSearch","details"])
  assert.equal((shell.match(new RegExp(label+':"','g'))||[]).length,3,
   label+" requires Dari, Pashto and English");
});
