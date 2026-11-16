"use client";

import React,{useEffect,useRef,useState,useTransition,type MouseEvent,type ReactNode} from "react";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {authClient,CareIcon,LocaleControls,usePreferences,type CareIconName} from "@dandanlink/ui";
import {PersistentClinicShellProvider} from "@dandanlink/ui/clinic-shell-context";

type Role="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
type Space={clinicId:string;clinicName:string;clinicStatus:string;membershipId:string;
 role:Role;clinicianEnabled:boolean;capabilities:string[]};
type Context={name:string;email:string;mfaEnabled:boolean;clinics:Space[]};
type Group="workspace"|"operations"|"settings";
type Item={key:string;path:string;icon:CareIconName;group:Group};
type SectionKey="frontDesk"|"clinicalCare"|"billing"|"operations"|"growth"|"settings";
type Section={key:SectionKey;icon:CareIconName;items:readonly string[]};
/**
 * Sections group existing real authorized routes. They are not permission
 * grants: navigation(space) is still the only route visibility source, and
 * each backend endpoint continues to enforce staff/tenant permissions.
 */
const NAV_SECTIONS:readonly Section[]=[
 {key:"frontDesk",icon:"calendar",items:["appointments","queue","bookingRequests","patients"]},
 {key:"clinicalCare",icon:"dental",items:["clinical","myVerification"]},
 {key:"billing",icon:"receipt",items:["finance","reports"]},
 {key:"operations",icon:"hospital",items:["staff","resources","services","hours"]},
 {key:"growth",icon:"chart-columns",items:["listing","notifications"]},
 {key:"settings",icon:"settings",items:["settings","security","subscription","exportData","myProfile"]}
] as const;
const NAV_EXPANSION_KEY="dandan.clinic.navSections";
const sectionOf=(key:string):SectionKey|null=>
 NAV_SECTIONS.find(section=>section.items.includes(key))?.key||null;

const PUBLIC_CLINIC_PATH=/^\/clinic\/(?:login|signup|verify|invite|onboarding|reset-password|2fa)(?:\/|$)/;
const COLLAPSE_KEY="dandan.clinic.sidebarCollapsed";
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const translations:Record<string,Record<string,string>>={
 en:{
  clinic:"Clinic workspace",overview:"Overview",appointments:"Appointments",queue:"Today's queue",
  bookingRequests:"Online requests",patients:"Patients",clinical:"Clinical",finance:"Finance",
  reports:"Reports",listing:"Public listing",staff:"Staff",resources:"Chairs & rooms",
  services:"Services & pricing",hours:"Hours & holidays",notifications:"Notifications",
  security:"Security & access",settings:"Clinic settings",subscription:"Subscription",
  exportData:"Export & retention",myVerification:"My credentials",myProfile:"My membership",
  workspace:"Workspace",operations:"Operations",account:"Account",
  frontDesk:"Front desk",clinicalCare:"Clinical care",billing:"Billing & reports",
  growth:"Growth & updates",navigationSearch:"Search clinic pages",
  navigationSearchTip:"Search navigation (Ctrl+K)",noNavigationMatch:"No matching clinic page.",
  clearNavigationSearch:"Clear navigation search",navigateQuickly:"Quick access",
  details:"Details",expandGroup:"Expand section",collapseGroup:"Collapse section",
  changeClinic:"Active clinic",navigation:"Clinic navigation",collapse:"Collapse sidebar",
  expand:"Expand sidebar",openMenu:"Open navigation",closeMenu:"Close navigation",
  signOut:"Sign out",signingOut:"Signing out…",loading:"Loading clinic access…",
  noClinic:"No active clinic membership",invalidClinic:"This clinic is not in your memberships.",
  login:"Sign in",register:"Register clinic",retry:"Try again",
  connection:"Unable to load clinic access. Check your connection and retry.",
  secure:"Authorized clinic workspace",breadcrumb:"Page location",
  pageContent:"Clinic page content",role:"Your role",
  owner:"Owner",manager:"Manager",dentist:"Dentist",
  receptionist:"Receptionist",assistant:"Assistant",cashier:"Cashier",
  approved:"Approved",pending:"Pending review",suspended:"Suspended",
  skip:"Skip to workspace content",help:"Help",privacy:"Privacy",terms:"Terms",
  signOutFailed:"Sign out failed. Please retry; your session is still active."
 },
 "fa-AF":{
  clinic:"محیط مدیریت کلینیک",overview:"نمای کلی",appointments:"ملاقات‌ها",queue:"صف امروز",
  bookingRequests:"درخواست‌های آنلاین",patients:"مریضان",clinical:"کلینیکی",finance:"مالی",
  reports:"گزارش‌ها",listing:"نمایش عمومی کلینیک",staff:"کارمندان",resources:"چوکی‌ها و اتاق‌ها",
  services:"خدمات و قیمت‌ها",hours:"ساعات و رخصتی‌ها",notifications:"اعلان‌ها",
  security:"امنیت و دسترسی",settings:"تنظیمات کلینیک",subscription:"اشتراک",
  exportData:"صادرات و نگهداری",myVerification:"اسناد مسلکی من",myProfile:"عضویت من",
  workspace:"فضای کاری",operations:"عملیات",account:"حساب",
  frontDesk:"پذیرش",clinicalCare:"بخش کلینیکی",billing:"مالی و گزارش‌ها",
  growth:"رشد و اطلاع‌رسانی",navigationSearch:"جستجوی صفحات کلینیک",
  navigationSearchTip:"جستجوی منو (Ctrl+K)",noNavigationMatch:"صفحه‌ای پیدا نشد.",
  clearNavigationSearch:"پاک‌کردن جستجو",navigateQuickly:"دسترسی سریع",
  details:"جزئیات",expandGroup:"بازکردن بخش",collapseGroup:"بستن بخش",
  changeClinic:"کلینیک فعال",navigation:"منوی کلینیک",collapse:"جمع‌کردن منو",
  expand:"بازکردن منو",openMenu:"بازکردن منو",closeMenu:"بستن منو",
  signOut:"خروج",signingOut:"در حال خروج…",loading:"در حال بررسی دسترسی کلینیک…",
  noClinic:"عضویت فعال کلینیک ندارید",invalidClinic:"این کلینیک در عضویت‌های شما نیست.",
  login:"ورود",register:"ثبت کلینیک",retry:"کوشش دوباره",
  connection:"دسترسی کلینیک دریافت نشد. اتصال را بررسی و دوباره کوشش کنید.",
  secure:"محیط کاری دارای مجوز",breadcrumb:"مسیر صفحه",pageContent:"محتوای کلینیک",role:"نقش شما",
  owner:"مالک",manager:"مدیر",dentist:"داکتر دندان",
  receptionist:"پذیرش",assistant:"دستیار",cashier:"صندوق‌دار",
  approved:"تأییدشده",pending:"در حال بررسی",suspended:"تعلیق‌شده",
  skip:"رفتن به محتوای کلینیک",help:"راهنما",privacy:"حریم خصوصی",terms:"شرایط خدمات",
  signOutFailed:"خروج انجام نشد. دوباره کوشش کنید؛ نشست شما هنوز فعال است."
 },
 "ps-AF":{
  clinic:"د کلینیک کاري چاپېریال",overview:"لنډیز",appointments:"ملاقاتونه",queue:"د نن کتار",
  bookingRequests:"آنلاین غوښتنې",patients:"ناروغان",clinical:"کلینیکي",finance:"مالي",
  reports:"راپورونه",listing:"د کلینیک عامه پاڼه",staff:"کارکوونکي",resources:"څوکۍ او خونې",
  services:"خدمتونه او بیې",hours:"وختونه او رخصتۍ",notifications:"خبرتیاوې",
  security:"امنیت او لاسرسی",settings:"د کلینیک تنظیمات",subscription:"ګډون",
  exportData:"صادرات او ساتنه",myVerification:"زما مسلکي اسناد",myProfile:"زما غړیتوب",
  workspace:"کاري برخه",operations:"چارې",account:"حساب",
  frontDesk:"پذیرش",clinicalCare:"کلینیکي پاملرنه",billing:"مالي چارې او راپورونه",
  growth:"وده او خبرتیاوې",navigationSearch:"د کلینیک پاڼې ولټوئ",
  navigationSearchTip:"نوملړ ولټوئ (Ctrl+K)",noNavigationMatch:"اړونده پاڼه ونه موندل شوه.",
  clearNavigationSearch:"لټون پاک کړئ",navigateQuickly:"چټک لاسرسی",
  details:"تفصیل",expandGroup:"برخه پرانیزئ",collapseGroup:"برخه بنده کړئ",
  changeClinic:"فعال کلینیک",navigation:"د کلینیک نوملړ",collapse:"نوملړ لنډول",
  expand:"نوملړ پراخول",openMenu:"نوملړ پرانیستل",closeMenu:"نوملړ بندول",
  signOut:"وتل",signingOut:"د وتلو په حال کې…",loading:"د کلینیک لاسرسی کتل کېږي…",
  noClinic:"فعال کلینیکي غړیتوب نشته",invalidClinic:"دا کلینیک ستاسو په غړیتوب کې نشته.",
  login:"ننوتل",register:"کلینیک ثبت کړئ",retry:"بیا هڅه",
  connection:"د کلینیک لاسرسی ونه لوستل شو. اړیکه وګورئ او بیا هڅه وکړئ.",
  secure:"مجاز کاري چاپېریال",breadcrumb:"د پاڼې لاره",pageContent:"د کلینیک منځپانګه",
  role:"ستاسې دنده",owner:"مالک",manager:"مدیر",dentist:"د غاښونو ډاکټر",
  receptionist:"پذیرش",assistant:"مرستیال",cashier:"حسابدار",
  approved:"تایید شوی",pending:"تر څېړنې لاندې",suspended:"ځنډول شوی",
  skip:"د کلینیک منځپانګې ته لاړ شئ",help:"مرسته",privacy:"محرمیت",terms:"د خدمت شرطونه",
  signOutFailed:"وتل بریالي نه شول. بیا هڅه وکړئ؛ ناسته لا فعاله ده."
 }
};
function navigation(space:Space):Item[]{
 const nav:Item[]=[
  {key:"overview",path:"/clinic",group:"workspace",icon:"layout-dashboard"},
  {key:"appointments",path:"/clinic/appointments",group:"workspace",icon:"calendar"},
  {key:"queue",path:"/clinic/appointments/queue",group:"workspace",icon:"clock"},
  {key:"bookingRequests",path:"/clinic/appointments/requests",group:"workspace",icon:"bell"},
  {key:"patients",path:"/clinic/patients",group:"workspace",icon:"users"},
  {key:"clinical",path:"/clinic/clinical",group:"workspace",icon:"dental"},
  {key:"finance",path:"/clinic/finance",group:"workspace",icon:"receipt"},
  {key:"reports",path:"/clinic/reports",group:"workspace",icon:"chart-columns"},
  {key:"listing",path:"/clinic/listing",group:"workspace",icon:"clinic"},
  {key:"staff",path:"/clinic/staff",group:"operations",icon:"users"},
  {key:"resources",path:"/clinic/resources",group:"operations",icon:"hospital"},
  {key:"services",path:"/clinic/services",group:"operations",icon:"clipboard"},
  {key:"hours",path:"/clinic/settings/hours",group:"operations",icon:"clock"},
  {key:"notifications",path:"/clinic/settings/notifications",group:"settings",icon:"mail"},
  {key:"security",path:"/clinic/settings/security",group:"settings",icon:"shield-check"},
  {key:"settings",path:"/clinic/settings",group:"settings",icon:"settings"},
  {key:"subscription",path:"/clinic/settings/subscription",group:"settings",icon:"credit-card"},
  {key:"exportData",path:"/clinic/settings/export",group:"settings",icon:"download"},
  {key:"myVerification",path:"/clinic/credentials",group:"settings",icon:"badge-check"},
  {key:"myProfile",path:"/clinic/staff/"+encodeURIComponent(space.membershipId),
   group:"settings",icon:"account"}
 ];
 const manager=space.role==="owner"||space.role==="manager";
 const wanted=manager?[
  "overview","appointments","queue","bookingRequests","patients","finance","reports",
  "listing","staff","resources","services","hours","notifications","security",
  ...(space.clinicianEnabled?["clinical"]:[]),
  ...(space.role==="owner"?["settings","exportData","subscription"]:[])
 ]:space.role==="dentist"?[
  "overview","appointments","queue","bookingRequests","patients","clinical",
  "resources","services","hours","myVerification","myProfile","security"
 ]:space.role==="receptionist"?[
  "overview","appointments","queue","bookingRequests","patients",
  "finance","resources","services","hours","myProfile","security"
 ]:space.role==="assistant"?[
  "overview","appointments","queue","clinical","myProfile","security"
 ]:space.role==="cashier"?[
  "overview","finance","reports","patients","myProfile","security"
 ]:["overview","myProfile","security"];
 return wanted.flatMap(key=>nav.filter(item=>item.key===key));
}
function pathActive(pathname:string,href:string){
 return href==="/clinic"?pathname==="/clinic"||pathname==="/clinic/":
  pathname===href||pathname.startsWith(href+"/");
}
export function ClinicPersistentShell({children}:{children:ReactNode}){
 const pathname=usePathname()||"/clinic",router=useRouter();
 const {locale}=usePreferences();
 const t=(key:string)=>translations[locale]?.[key]||translations.en[key]||key;
 const isPublic=PUBLIC_CLINIC_PATH.test(pathname);
 const [ctx,setCtx]=useState<Context|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [requestIndex,setRequestIndex]=useState(0);
 const [requested,setRequested]=useState<string|null|undefined>(undefined);
 const [collapsed,setCollapsed]=useState(false),[mobileOpen,setMobileOpen]=useState(false);
 const [navSearch,setNavSearch]=useState("");
 const [expandedSections,setExpandedSections]=useState<Partial<Record<SectionKey,boolean>>>({});
 const [signingOut,setSigningOut]=useState(false),[signOutError,setSignOutError]=useState(false);
 const [navigationPending,startNavigation]=useTransition();
 const mobileToggleRef=useRef<HTMLButtonElement>(null),
  navSearchRef=useRef<HTMLInputElement>(null),
  drawerRef=useRef<HTMLElement>(null),
  mobileCloseRef=useRef<HTMLButtonElement>(null),
  lastContextCheck=useRef(0);
 // A tenant change is an explicit full navigation. A/B clinic data cannot
 // temporarily share a React subtree while page-local fetches are still live.
 useEffect(()=>{
  // A public sign-in/invitation route must drop the prior authenticated
  // workspace before any subsequent private navigation can render it again.
  if(isPublic){
   setCtx(null);setLoading(true);setError("");setRequested(undefined);
   return;
  }
  setRequested(new URLSearchParams(window.location.search).get("clinic"));
 },[isPublic,pathname]);
 useEffect(()=>{
  try{
   setCollapsed(localStorage.getItem(COLLAPSE_KEY)==="1");
   const stored=JSON.parse(localStorage.getItem(NAV_EXPANSION_KEY)||"{}") as Record<string,unknown>;
   if(stored&&typeof stored==="object"&&!Array.isArray(stored)){
    const allowed:Partial<Record<SectionKey,boolean>>={};
    for(const group of NAV_SECTIONS)
     if(typeof stored[group.key]==="boolean")allowed[group.key]=stored[group.key] as boolean;
    setExpandedSections(allowed);
   }
  }catch{/* locked-down storage or corrupt preference: use safe defaults */}
 },[]);
 useEffect(()=>{
  if(isPublic)return;
  const shortcut=(event:KeyboardEvent)=>{
   if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
    event.preventDefault();setCollapsed(false);
    if(window.matchMedia("(max-width: 900px)").matches)setMobileOpen(true);
    window.setTimeout(()=>navSearchRef.current?.focus(),75);
   }
   if(event.key==="Escape"&&document.activeElement===navSearchRef.current){
    setNavSearch("");navSearchRef.current?.blur();
   }
  };
  window.addEventListener("keydown",shortcut);
  return()=>window.removeEventListener("keydown",shortcut);
 },[isPublic]);
 useEffect(()=>{
  if(isPublic)return;
  const controller=new AbortController();
  setLoading(true);setError("");
  fetch(API+"/v1/team/context",{credentials:"include",cache:"no-store",signal:controller.signal})
   .then(async r=>{
    if(!r.ok)throw new Error(r.status===401?"AUTH_REQUIRED":"CONTEXT_UNAVAILABLE");
    return await r.json() as Context;
   })
   .then(data=>{if(!controller.signal.aborted){lastContextCheck.current=Date.now();
    setCtx(data);setLoading(false);}})
   .catch(e=>{if(!controller.signal.aborted){
    setCtx(null);setError(e instanceof Error?e.message:"CONTEXT_UNAVAILABLE");
    setLoading(false);
   }});
  return()=>controller.abort();
 },[isPublic,requestIndex]);
 useEffect(()=>{
  if(isPublic)return;
  // A dormant clinic tab must re-confirm staff membership and role before
  // the operator resumes working with private patient or billing data.
  const recheck=()=>{
   if(document.visibilityState==="visible"&&!loading&&
    Date.now()-lastContextCheck.current>60000)setRequestIndex(v=>v+1);
  };
  window.addEventListener("focus",recheck);
  document.addEventListener("visibilitychange",recheck);
  return()=>{
   window.removeEventListener("focus",recheck);
   document.removeEventListener("visibilitychange",recheck);
  };
 },[isPublic,loading]);
 useEffect(()=>{setMobileOpen(false);setNavSearch("")},[pathname]);
 useEffect(()=>{
  if(!mobileOpen)return;
  const mq=window.matchMedia("(max-width: 900px)");
  if(!mq.matches)return;
  const onDesktop=(event:MediaQueryListEvent)=>{
   if(!event.matches){setMobileOpen(false);mobileToggleRef.current?.focus();}
  };
  mq.addEventListener("change",onDesktop);
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  mobileCloseRef.current?.focus();
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){
    setMobileOpen(false);mobileToggleRef.current?.focus();return;
   }
   if(event.key!=="Tab")return;
   const tabbable=Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),select:not([disabled]),input:not([disabled])')||[])
    .filter(el=>el.getClientRects().length>0);
   if(!tabbable.length)return;
   if(event.shiftKey&&document.activeElement===tabbable[0]){
    event.preventDefault();tabbable[tabbable.length-1].focus();
   }else if(!event.shiftKey&&document.activeElement===tabbable[tabbable.length-1]){
    event.preventDefault();tabbable[0].focus();
   }
  };
  window.addEventListener("keydown",onKey);
  return()=>{document.body.style.overflow=oldOverflow;
   window.removeEventListener("keydown",onKey);mq.removeEventListener("change",onDesktop);};
 },[mobileOpen]);
 const spaces=ctx?.clinics||[];
 const selected=requested===undefined?null:requested?
  spaces.find(s=>s.clinicId===requested)||null:spaces[0]||null;
 const requestedInvalid=Boolean(requested&&ctx&&!selected);
 const items=selected?navigation(selected):[];
 const current=items.filter(item=>pathActive(pathname,item.path))
  .sort((a,b)=>b.path.length-a.path.length)[0];
 const activeTitle=current?t(current.key):t("workspace");
 const activeSection=current?sectionOf(current.key):null;
 const visibleSections=NAV_SECTIONS.map(section=>({
  ...section,links:items.filter(item=>section.items.includes(item.key))
 })).filter(section=>section.links.length>0);
 const normalizedSearch=navSearch.trim().toLocaleLowerCase(locale);
 const searchResults=normalizedSearch?
  items.filter(item=>(t(item.key)+" "+t(sectionOf(item.key)||"workspace"))
   .toLocaleLowerCase(locale).includes(normalizedSearch)):[];
 const navDetails=current&&pathname!==current.path&&pathname!==current.path+"/"?t("details"):null;
 const quickKeys=selected?.role==="dentist"?["appointments","clinical","patients"]:
  selected?.role==="assistant"?["appointments","queue","clinical"]:
  selected?.role==="cashier"?["finance","reports","patients"]:
  selected?.role==="receptionist"?["bookingRequests","queue","patients"]:
  ["bookingRequests","appointments","patients"];
 const quickLinks=quickKeys.flatMap(key=>items.filter(item=>item.key===key)).slice(0,3);
 // Keep a newly active section expanded after internal navigation even when it
 // was explicitly folded on the previous page; do not persist the active page.
 useEffect(()=>{
  if(isPublic||!activeSection)return;
  setExpandedSections(previous=>previous[activeSection]?previous:
   {...previous,[activeSection]:true});
 },[isPublic,activeSection,pathname]);
 if(isPublic)return <>{children}</>;
 function changeSection(section:SectionKey){
  const expanded=expandedSections[section]??section===activeSection;
  const next={...expandedSections,[section]:!expanded};
  setExpandedSections(next);
  try{localStorage.setItem(NAV_EXPANSION_KEY,JSON.stringify(next));}
  catch{/* private browsing does not block keyboard navigation */}
 }
 function revealSearch(){
  setCollapsed(false);
  window.setTimeout(()=>navSearchRef.current?.focus(),40);
 }
 const tenantParam=selected?"clinic="+encodeURIComponent(selected.clinicId):"";
 const hrefFor=(path:string)=>path+(tenantParam?"?"+tenantParam:"");
 const sameTenant=(url:URL)=>!url.searchParams.has("clinic")||
  url.searchParams.get("clinic")===selected?.clinicId;
 function renderNavItem(item:Item,subItem=false){
  // Deepest matching route wins: /appointments/queue must not also highlight
  // its /appointments parent, and /settings/security must not highlight Settings.
  const active=current?.key===item.key;
  return <Link key={item.key} href={hrefFor(item.path)} prefetch={false} data-next-nav
   onClick={()=>{setMobileOpen(false);setNavSearch("")}}
   className={"phase04-side-link clinic-sidebar-link"+
    (subItem?" clinic-nav-subitem":"")}
   aria-label={t(item.key)} aria-current={active?"page":undefined}
   title={collapsed?t(item.key):undefined}>
   <span className="phase04-side-icon" aria-hidden="true">
    <CareIcon name={item.icon} size={19}/></span>
   <span className="clinic-sidebar-label">{t(item.key)}</span>
  </Link>;
 }

 // Routes shipped by phases 02–19 still use ordinary <a href>. Intercept only
 // same-origin, same-tenant /clinic links to retain this Next segment layout.
 // Downloads, new tabs, modifiers and unrelated paths retain browser semantics.
 function navigateWithinClinic(event:MouseEvent<HTMLElement>){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||
   event.shiftKey||event.altKey)return;
  const target=event.target;if(!(target instanceof Element))return;
  const anchor=target.closest("a[href]");
  if(!(anchor instanceof HTMLAnchorElement)||anchor.hasAttribute("download")||
    anchor.hasAttribute("data-hard-navigation")||anchor.hasAttribute("data-next-nav")||
    (anchor.target&&anchor.target!=="_self"))return;
  const url=new URL(anchor.href,window.location.href);
  if(url.origin!==window.location.origin||
    !(url.pathname==="/clinic"||url.pathname.startsWith("/clinic/"))||
    PUBLIC_CLINIC_PATH.test(url.pathname))return;
  if(!sameTenant(url)){
   // Hard reload on switching clinics to clear all mounted patient/clinical data.
   return;
  }
  if(selected&&!url.searchParams.has("clinic"))
   url.searchParams.set("clinic",selected.clinicId);
  if(url.pathname===window.location.pathname&&url.search===window.location.search&&
   url.hash===window.location.hash)return;
  event.preventDefault();setMobileOpen(false);
  startNavigation(()=>router.push(url.pathname+url.search+url.hash));
 }
 function toggleCollapsed(){
  setCollapsed(v=>{
   try{localStorage.setItem(COLLAPSE_KEY,!v?"1":"0");}catch{}
   return !v;
  });
 }
 async function signOut(){
  if(signingOut)return;
  setSigningOut(true);setSignOutError(false);
  try{
   const response=await authClient.signOut();
   if(response.error)throw new Error("SIGN_OUT_FAILED");
   setCtx(null);
   window.location.assign("/clinic/login");
  }catch{setSigningOut(false);setSignOutError(true);}
 }
 const restricted=error==="AUTH_REQUIRED"||requestedInvalid;
 const showPage=!loading&&!error&&!requestedInvalid;
 return <div className={"work-layout phase-layout staff-shell clinic-persistent-shell"+
   (collapsed?" clinic-sidebar-collapsed":"")+(mobileOpen?" clinic-mobile-open":"")}>
   <a className="clinic-workspace-skip" href="#clinic-route-content">{t("skip")}</a>
   {mobileOpen&&<button type="button" className="clinic-mobile-backdrop"
    aria-label={t("closeMenu")} tabIndex={-1}
    onClick={()=>{setMobileOpen(false);mobileToggleRef.current?.focus();}}/>}
   <aside ref={drawerRef} className="card side-panel staff-side clinic-persistent-sidebar"
    role={mobileOpen?"dialog":undefined} aria-modal={mobileOpen||undefined}
    id="clinic-workspace-navigation" aria-label={t("navigation")}>
    <div className="clinic-sidebar-header">
     <span className="clinic-sidebar-emblem" aria-hidden="true"><CareIcon name="dental" size={22}/></span>
     <div className="clinic-sidebar-brand"><strong>DandanLink</strong><small>{t("clinic")}</small></div>
     <button type="button" className="clinic-sidebar-collapse"
      aria-expanded={!collapsed} aria-label={t(collapsed?"expand":"collapse")}
      title={t(collapsed?"expand":"collapse")} onClick={toggleCollapsed}>
      <CareIcon name="panel" size={18}/></button>
     <button ref={mobileCloseRef} type="button" className="clinic-sidebar-close"
      aria-label={t("closeMenu")} onClick={()=>{setMobileOpen(false);mobileToggleRef.current?.focus();}}>
      <CareIcon name="close" size={20}/></button>
    </div>
    <div className="clinic-sidebar-tenant" title={selected?.clinicName||t("noClinic")}>
     <CareIcon name="clinic" size={18}/>
     <span><strong>{selected?.clinicName||t("noClinic")}</strong>
      {selected&&<small>{t(selected.role)} · {t(selected.clinicStatus)}</small>}</span>
    </div>
    <nav className="side-nav phase04-side-nav clinic-persistent-nav"
     aria-label={t("navigation")}>
     {loading||requested===undefined?<div className="clinic-sidebar-skeleton" role="status"
       aria-label={t("loading")}>{Array.from({length:8},(_,i)=><span key={i}/>)}</div>:
      items.length?<React.Fragment>
       <div className="clinic-navigation-search">
        <CareIcon name="search" size={18}/>
        <input ref={navSearchRef} type="search" value={navSearch}
         aria-label={t("navigationSearch")} placeholder={t("navigationSearchTip")}
         autoComplete="off" maxLength={70}
         onChange={event=>setNavSearch(event.currentTarget.value)}/>
        {navSearch.length>0&&<button type="button" onClick={()=>{setNavSearch("");navSearchRef.current?.focus()}}
         aria-label={t("clearNavigationSearch")} title={t("clearNavigationSearch")}>
         <CareIcon name="close" size={17}/></button>}
       </div>
       <button type="button" className="clinic-navigation-search-reveal"
        aria-label={t("navigationSearch")} title={t("navigationSearchTip")}
        onClick={revealSearch}><CareIcon name="search" size={19}/></button>
       {normalizedSearch?<div className="clinic-nav-search-results" role="region"
        aria-label={t("navigationSearch")}>
        {searchResults.length?searchResults.map(item=>renderNavItem(item)):
         <p className="clinic-nav-empty-match" role="status">{t("noNavigationMatch")}</p>}
       </div>:<React.Fragment>
        {items.filter(item=>item.key==="overview").map(item=>renderNavItem(item))}
        {visibleSections.map(section=>{
         const expanded=expandedSections[section.key]??section.key===activeSection;
         const containsActive=section.key===activeSection;
         const iconOnly=collapsed&&!mobileOpen;
         const showLinks=expanded||iconOnly;
         const sectionId="clinic-nav-section-"+section.key;
         return <div key={section.key} className={"clinic-nav-section"+
          (containsActive?" clinic-nav-section-active":"")}>
          <button type="button" className="clinic-nav-section-toggle"
           aria-controls={sectionId} aria-expanded={showLinks}
           aria-label={t(showLinks?"collapseGroup":"expandGroup")+" — "+t(section.key)}
           onClick={()=>changeSection(section.key)}>
           <span className="clinic-nav-section-icon" aria-hidden="true">
            <CareIcon name={section.icon} size={18}/></span>
           <span className="clinic-nav-section-title">{t(section.key)}</span>
           <span className="clinic-nav-section-count" aria-hidden="true">{section.links.length}</span>
           <span className="clinic-nav-section-chevron" aria-hidden="true">
            <CareIcon name="chevron" size={16}/></span>
          </button>
          <div id={sectionId} className="clinic-nav-section-links" hidden={!showLinks}>
           {section.links.map(item=>renderNavItem(item,true))}
          </div>
         </div>;
        })}
       </React.Fragment>}
      </React.Fragment>:
      <div className="clinic-sidebar-empty">{t(ctx?.clinics.length?"invalidClinic":"noClinic")}</div>}
    </nav>
    <div className="clinic-sidebar-footer"><LocaleControls/>
     <nav className="clinic-sidebar-extras" aria-label={t("help")}>
      <Link href="/help" onClick={()=>setMobileOpen(false)}>{t("help")}</Link>
      <Link href="/privacy" onClick={()=>setMobileOpen(false)}>{t("privacy")}</Link>
      <Link href="/terms" onClick={()=>setMobileOpen(false)}>{t("terms")}</Link>
     </nav>
     <div className="clinic-sidebar-security"><CareIcon name="shield" size={16}/>
      <span>{t("secure")}</span></div>
    </div>
   </aside>
   <section className="work-content staff-content clinic-persistent-content"
    onClick={navigateWithinClinic}>
    <header className="work-heading clinic-persistent-header">
     <div className="clinic-header-leading">
      <button ref={mobileToggleRef} type="button" className="clinic-mobile-menu"
       aria-controls="clinic-workspace-navigation" aria-expanded={mobileOpen}
       aria-label={t(mobileOpen?"closeMenu":"openMenu")}
       onClick={()=>setMobileOpen(v=>!v)}>
       <CareIcon name={mobileOpen?"close":"menu"} size={22}/></button>
      <div className="clinic-header-copy">
       <nav className="clinic-breadcrumb" aria-label={t("breadcrumb")}>
        <Link href={hrefFor("/clinic")} prefetch={false} data-next-nav>{t("clinic")}</Link>
        {activeSection&&<React.Fragment>
         <CareIcon name="chevron" size={13}/>
         <span className="clinic-breadcrumb-section">{t(activeSection)}</span>
        </React.Fragment>}
        {current?.key!=="overview"&&<React.Fragment>
         <CareIcon name="chevron" size={13}/>
         {navDetails?<Link href={hrefFor(current?.path||"/clinic")} prefetch={false}
          data-next-nav>{activeTitle}</Link>:
          <span aria-current="page">{activeTitle}</span>}
        </React.Fragment>}
        {navDetails&&<React.Fragment>
         <CareIcon name="chevron" size={13}/>
         <span aria-current="page">{navDetails}</span>
        </React.Fragment>}
       </nav>
       <strong>{navDetails||activeTitle}</strong>
      </div>
     </div>
     <div className="clinic-header-actions">
      {ctx&&ctx.clinics.length>1&&<label className="clinic-header-switch">
       <span>{t("changeClinic")}</span>
       <select aria-label={t("changeClinic")} value={selected?.clinicId||""}
        onChange={event=>{
         // Full reload is deliberate: purge old clinic clinical content and pending fetches.
         window.location.assign("/clinic?clinic="+encodeURIComponent(event.target.value));
        }}>{ctx.clinics.map(space=><option key={space.clinicId} value={space.clinicId}>
         {space.clinicName} · {t(space.role)}</option>)}</select>
      </label>}
      {selected&&<span className="clinic-header-role">{t("role")}: {t(selected.role)}</span>}
      <button type="button" className="clinic-header-signout btn btn-secondary"
       disabled={signingOut} onClick={()=>void signOut()}>
       <CareIcon name="logout" size={17}/><span>{t(signingOut?"signingOut":"signOut")}</span>
      </button>
     </div>
    </header>
    {signOutError&&<div role="alert" className="clinic-shell-error">{t("signOutFailed")}</div>}
    {showPage&&selected&&quickLinks.length>0&&<nav className="clinic-header-quick-links"
     aria-label={t("navigateQuickly")}>
     <span className="clinic-quick-label">{t("navigateQuickly")}</span>
     {quickLinks.map(item=><Link key={item.key} href={hrefFor(item.path)}
      prefetch={false} data-next-nav
      aria-current={current?.key===item.key?"page":undefined}
      onClick={()=>setMobileOpen(false)}>
      <CareIcon name={item.icon} size={16}/><span>{t(item.key)}</span>
     </Link>)}
    </nav>}
    {navigationPending&&<div role="status" className="clinic-route-progress"
     aria-label={t("loading")}/>}
    <div className="clinic-route-content" id="clinic-route-content" tabIndex={-1}
     aria-label={t("pageContent")}>
     {loading||requested===undefined?<div className="clinic-page-skeleton"
       role="status" aria-label={t("loading")}>
       <span className="clinic-page-skeleton-title"/>
       <div className="clinic-page-skeleton-grid">{Array.from({length:4},(_,i)=>
        <span key={i}/>)}</div><span className="clinic-page-skeleton-body"/></div>:
      restricted?<div className="clinic-access-card card panel" role="alert">
       <h2>{t(requestedInvalid?"invalidClinic":"login")}</h2>
       <p>{t("secure")}</p>
       <Link className="btn btn-primary" href={error?"/clinic/login":"/clinic"}>
        {t(error?"login":"overview")}</Link></div>:
      error?<div className="clinic-access-card card panel" role="alert">
       <h2>{t("connection")}</h2><button type="button" className="btn btn-secondary"
        onClick={()=>setRequestIndex(x=>x+1)}>{t("retry")}</button></div>:
      showPage&&ctx?<PersistentClinicShellProvider session={{
       ctx,space:selected,requested:requested??null}}>
       <div key={selected?.clinicId||"unregistered"}>{children}</div>
      </PersistentClinicShellProvider>:null}
    </div>
   </section>
  </div>;
}
