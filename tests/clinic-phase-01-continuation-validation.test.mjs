import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const site=read("packages/ui-web/src/index.tsx");
const root=read("apps/clinic-web/app/layout.tsx");
const route=read("apps/clinic-web/app/clinic-site-layout.tsx");
const shell=read("apps/clinic-web/app/clinic/clinic-shell.tsx");
const css=read("apps/clinic-web/app/clinic/clinic-shell.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");
const legacy=read("packages/ui-web/src/phase03.tsx");

test("Clinic PH01 continuation: exactly one site/workspace header on protected routes",()=>{
 assert.ok(root.includes('import { ClinicSiteLayout } from "./clinic-site-layout";'));
 assert.ok(root.includes("<ClinicSiteLayout>{children}</ClinicSiteLayout>"));
 assert.ok(route.includes('import {usePathname} from "next/navigation"'));
 assert.ok(route.includes('const clinicWorkspace=(pathname==="/clinic"||pathname.startsWith("/clinic/"))&&'));
 assert.ok(route.includes("!PUBLIC_CLINIC_PATH.test(pathname)"));
 assert.ok(route.includes('<SiteLayout audience="clinic" clinicWorkspace={clinicWorkspace}>'));
 assert.ok(site.includes('clinicWorkspace=false'));
 assert.ok(site.includes('{!clinicWorkspace&&<header'));
 assert.ok(site.includes('{!clinicWorkspace&&<footer'));
 assert.ok(!site.includes('import {usePathname} from "next/navigation"'),
  "Shared UI package must not require an undeclared Next.js dependency");
 assert.ok(layout.includes("<ClinicPersistentShell>{children}</ClinicPersistentShell>"));
 assert.ok(shell.includes('className="work-heading clinic-persistent-header"'));
 assert.ok(legacy.includes('if(persistent)return <>{children}</>'));
});

test("Clinic PH01 continuation: sign-in, verification and onboarding retain public site navigation",()=>{
 for(const marker of ["login","signup","verify","invite","onboarding","reset-password","2fa"])
  assert.ok(route.includes(marker),marker);
 assert.ok(route.includes("!PUBLIC_CLINIC_PATH.test(pathname)"));
 assert.ok(shell.includes('if(isPublic)return <>{children}</>'));
 assert.ok(shell.includes('setCtx(null);setLoading(true);setError("");setRequested(undefined)'),
  "Public routes must purge any cached clinic context before returning to private pages");
});

test("Clinic PH01 continuation: sign-out errors are surfaced and idle staff memberships revalidated",()=>{
 for(const marker of [
  'const response=await authClient.signOut()',
  'if(response.error)throw new Error("SIGN_OUT_FAILED")',
  'setSigningOut(false);setSignOutError(true)',
  'role="alert" className="clinic-shell-error"',
  'setCtx(null)',
  'window.location.assign("/clinic/login")',
  'lastContextCheck.current=Date.now()',
  'document.visibilityState==="visible"&&!loading',
  'Date.now()-lastContextCheck.current>60000',
  'setRequestIndex(v=>v+1)',
  'document.addEventListener("visibilitychange",recheck)',
  'window.addEventListener("focus",recheck)',
  'document.removeEventListener("visibilitychange",recheck)',
  'window.removeEventListener("focus",recheck)',
  'fetch(API+"/v1/team/context",{credentials:"include",cache:"no-store"'
 ])assert.ok(shell.includes(marker),marker);
});

test("Clinic PH01 continuation: mobile recovery, accessibility and policy links survive removing the site header",()=>{
 for(const marker of [
  'const onDesktop=(event:MediaQueryListEvent)=>',
  'mq.addEventListener("change",onDesktop)',
  'mq.removeEventListener("change",onDesktop)',
  'mobileCloseRef.current?.focus()',
  'document.body.style.overflow="hidden"',
  'href="#clinic-route-content"',
  'id="clinic-route-content" tabIndex={-1}',
  '<Link href="/help"',
  '<Link href="/privacy"',
  '<Link href="/terms"',
  'signOutFailed:',
  'aria-current={active?"page":undefined}'
 ])assert.ok(shell.includes(marker),marker);
 for(const marker of [
  '.clinic-workspace-skip',
  '.clinic-sidebar-extras',
  '.clinic-shell-error',
  '.clinic-sidebar-collapsed .clinic-sidebar-extras',
  '@media(max-width:900px)',
  '.clinic-mobile-open.clinic-sidebar-collapsed .clinic-sidebar-extras'
 ])assert.ok(css.includes(marker),marker);
});

test("Clinic PH01 continuation: patient and admin keep the original site chrome",()=>{
 assert.ok(site.includes('audience: "clinic" | "admin" | "patient"; clinicWorkspace?:boolean'));
 assert.ok(site.includes('{audience==="patient"&&<PatientBottomNav path={path}/> }')||
  site.includes('{audience==="patient"&&<PatientBottomNav path={path}/>}'));
 assert.ok(root.includes('<PreferencesProvider>'));
 assert.ok(!read("apps/admin-web/app/layout.tsx").includes("ClinicSiteLayout"));
 assert.ok(!read("apps/patient-web/app/layout.tsx").includes("ClinicSiteLayout"));
});
