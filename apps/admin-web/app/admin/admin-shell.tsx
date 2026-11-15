"use client";

import React,{useEffect,useRef,useState,type MouseEvent,type ReactNode} from "react";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {authClient,CareIcon,LocaleControls,usePreferences,type CareIconName} from "@dandanlink/ui";
import {PersistentAdminShellProvider} from "@dandanlink/ui/admin-shell-context";
import {AdminCommandCenter} from "./command-center";

type Role="admin"|"support"|"user"|"loading";
type Group="overview"|"verification"|"finance"|"operations"|"platform";
type Item={key:string;href:string;group:Group;icon:CareIconName};
const NAV:Item[]=[
 {key:"dashboard",href:"/admin",group:"overview",icon:"layout-dashboard"},
 {key:"clinics",href:"/admin/clinics",group:"verification",icon:"hospital"},
 {key:"dentists",href:"/admin/dentists",group:"verification",icon:"badge-check"},
 {key:"listings",href:"/admin/listings",group:"verification",icon:"images"},
 {key:"reviews",href:"/admin/reviews",group:"verification",icon:"message-square-star"},
 {key:"subscriptions",href:"/admin/subscriptions",group:"finance",icon:"credit-card"},
 {key:"plans",href:"/admin/plans",group:"finance",icon:"package"},
 {key:"support",href:"/admin/support",group:"operations",icon:"life-buoy"},
 {key:"analytics",href:"/admin/analytics",group:"operations",icon:"chart-columns"},
 {key:"security",href:"/admin/security",group:"platform",icon:"shield-check"},
 {key:"settings",href:"/admin/settings",group:"platform",icon:"sliders-horizontal"},
 {key:"pilot",href:"/admin/pilot",group:"platform",icon:"rocket"}
];
const TRANSLATIONS:Record<string,Record<string,string>>={
 en:{searchPlatform:"Search platform",notifications:"Notifications",dashboard:"Dashboard",clinics:"Clinics",dentists:"Dentist verification",listings:"Clinic listings",
  reviews:"Patient reviews",subscriptions:"Subscriptions",plans:"Plans",support:"Support desk",
  analytics:"Analytics",security:"Security",settings:"Settings",pilot:"Pilot readiness",
  overview:"Overview",verification:"Verification",finance:"Finance",operations:"Operations",
  platform:"Platform",navigation:"Administration navigation",signOut:"Sign out",
  workspace:"Administration",loading:"Loading administrator access",login:"Sign in",
  unauthorized:"Administrator or authorized support access is required",
  collapse:"Collapse sidebar",expand:"Expand sidebar",openMenu:"Open navigation",
  closeMenu:"Close navigation",account:"Account",adminRole:"Platform administrator",
  supportRole:"Support agent",current:"Current page",breadcrumb:"Breadcrumb",
  secureWorkspace:"Secure workspace",mainContent:"Workspace content"},
 "fa-AF":{searchPlatform:"جستجوی پلتفرم",notifications:"اعلان‌ها",dashboard:"داشبورد",clinics:"کلینیک‌ها",dentists:"تأیید داکتران",listings:"آگهی‌های کلینیک",
  reviews:"نظرات مریضان",subscriptions:"اشتراک‌ها",plans:"پلن‌ها",support:"پشتیبانی",
  analytics:"تحلیل‌ها",security:"امنیت",settings:"تنظیمات",pilot:"آمادگی آزمایشی",
  overview:"نمای کلی",verification:"تأیید",finance:"مالی",operations:"عملیات",
  platform:"پلتفرم",navigation:"منوی مدیریت",signOut:"خروج",workspace:"مدیریت",
  loading:"در حال بررسی دسترسی مدیر",login:"ورود",
  unauthorized:"ورود مدیر یا کارمند مجاز پشتیبانی لازم است",
  collapse:"جمع‌کردن منو",expand:"بازکردن منو",openMenu:"بازکردن منوی مدیریت",
  closeMenu:"بستن منوی مدیریت",account:"حساب",adminRole:"مدیر پلتفرم",
  supportRole:"کارمند پشتیبانی",current:"صفحه فعلی",breadcrumb:"مسیر صفحه",
  secureWorkspace:"محیط امن مدیریت",mainContent:"محتوای مدیریت"},
 "ps-AF":{searchPlatform:"د پلاتفورم لټون",notifications:"خبرتیاوې",dashboard:"ډشبورډ",clinics:"کلینیکونه",dentists:"د ډاکټرانو تایید",listings:"د کلینیک اعلانونه",
  reviews:"د ناروغانو نظرونه",subscriptions:"ګډونونه",plans:"پلانونه",support:"ملاتړ",
  analytics:"شننې",security:"امنیت",settings:"تنظیمات",pilot:"ازمایښتي چمتووالی",
  overview:"عمومي کتنه",verification:"تایید",finance:"مالي",operations:"عملیات",
  platform:"پلاتفورم",navigation:"د ادارې نوملړ",signOut:"وتل",workspace:"مدیریت",
  loading:"د مدیر لاسرسی کتل کېږي",login:"ننوتل",
  unauthorized:"د مدیر یا مجاز ملاتړ لاسرسي ته اړتیا ده",
  collapse:"نوملړ لنډول",expand:"نوملړ پراخول",openMenu:"نوملړ پرانیستل",
  closeMenu:"نوملړ بندول",account:"حساب",adminRole:"د پلاتفورم مدیر",
  supportRole:"د ملاتړ کارکوونکی",current:"اوسنۍ پاڼه",breadcrumb:"د پاڼې لاره",
  secureWorkspace:"خوندي اداره",mainContent:"د ادارې منځپانګه"}
};
const PUBLIC_ADMIN_PATH=/^\/admin\/(?:login|reset-password|2fa)(?:\/|$)/;
const STORAGE_COLLAPSE_KEY="dandan.admin.sidebarCollapsed";
const api=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";

export function AdminPersistentShell({children}:{children:ReactNode}){
 const pathname=usePathname()||"/admin";
 const router=useRouter();
 const {locale}=usePreferences();
 const [role,setRole]=useState<Role>("loading");
 const [name,setName]=useState("");
 const [signingOut,setSigningOut]=useState(false);
 const [collapsed,setCollapsed]=useState(false);
 const [mobileOpen,setMobileOpen]=useState(false);
 const [navPending,setNavPending]=useState(false);
 const [showCommand,setShowCommand]=useState(false);
 const [commandTab,setCommandTab]=useState<"search"|"notices">("search");
 const [unreadNotices,setUnreadNotices]=useState(0);
 const mobileToggleRef=useRef<HTMLButtonElement>(null);
 const drawerRef=useRef<HTMLElement>(null);
 const mobileCloseRef=useRef<HTMLButtonElement>(null);
 const isPublic=PUBLIC_ADMIN_PATH.test(pathname);
 const t=(key:string)=>TRANSLATIONS[locale]?.[key]||TRANSLATIONS.en[key]||key;
 useEffect(()=>{
  if(isPublic){setRole("loading");setName("");return;}
  let alive=true;setRole("loading");
  fetch(api+"/v1/support/me",{credentials:"include",cache:"no-store"})
   .then(async response=>{
    if(!response.ok)throw new Error("AUTH_REQUIRED");
    return response.json() as Promise<{role:Role;displayName:string}>;
   })
   .then(data=>{if(alive){setRole(data.role);setName(data.displayName||"");}})
   .catch(()=>{if(alive){setRole("user");setName("");}});
  return()=>{alive=false};
 },[isPublic]);
 useEffect(()=>{
  try{setCollapsed(localStorage.getItem(STORAGE_COLLAPSE_KEY)==="1");}catch{/* restricted storage */}
 },[]);
 useEffect(()=>{setMobileOpen(false);setNavPending(false);},[pathname]);
 useEffect(()=>{
  if(role!=="admin"){setUnreadNotices(0);return;}
  let alive=true;
  const refreshNotices=()=>{
   fetch(api+"/v1/admin/center/notices",{credentials:"include",cache:"no-store"})
    .then(async r=>{if(!r.ok)throw Error("NOTICES_DENIED");
     return r.json() as Promise<{unread:number}>;})
    .then(d=>{if(alive)setUnreadNotices(Math.max(0,d.unread));})
    .catch(()=>{if(alive)setUnreadNotices(0);});
  };
  refreshNotices();
  const timer=window.setInterval(()=>{
   if(document.visibilityState==="visible")refreshNotices();
  },60000);
  window.addEventListener("admin-notices-changed",refreshNotices);
  return()=>{alive=false;clearInterval(timer);
   window.removeEventListener("admin-notices-changed",refreshNotices);};
 },[role,pathname,showCommand]);
 useEffect(()=>{
  if(role!=="admin")return;
  const shortcut=(e:KeyboardEvent)=>{
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){
    e.preventDefault();setCommandTab("search");setShowCommand(true);
   }
  };
  window.addEventListener("keydown",shortcut);
  return()=>window.removeEventListener("keydown",shortcut);
 },[role]);
 useEffect(()=>{
  if(!mobileOpen)return;
  mobileCloseRef.current?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){setMobileOpen(false);mobileToggleRef.current?.focus();return;}
   if(event.key!=="Tab")return;
   const tabbable=Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled])')||[]
   ).filter(node=>node.getClientRects().length>0);
   if(!tabbable.length)return;
   const first=tabbable[0],last=tabbable[tabbable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  const oldOverflow=document.body.style.overflow;
  if(window.matchMedia("(max-width: 900px)").matches)document.body.style.overflow="hidden";
  window.addEventListener("keydown",key);
  return()=>{document.body.style.overflow=oldOverflow;window.removeEventListener("keydown",key);};
 },[mobileOpen]);
 if(isPublic)return <>{children}</>;

 const items=role==="admin"?NAV:role==="support"?
  NAV.filter(item=>item.key==="support"||item.key==="analytics"):[];
 const active=(href:string)=>href==="/admin"?pathname==="/admin"||pathname==="/admin/":
  pathname===href||pathname.startsWith(href+"/");
 const currentItem=items.find(item=>active(item.href))??NAV.find(item=>active(item.href));
 const groupLabel=currentItem? t(currentItem.group):t("workspace");
 const title=currentItem?t(currentItem.key):t("workspace");
 const initials=name.trim()?Array.from(name.trim())[0].toUpperCase():"•";

 // Keep legacy internal detail links as client transitions while leaving downloads,
 // modifier clicks, links to log-in and external URLs to standard browser behavior.
 function navigateWithinAdmin(event:MouseEvent<HTMLElement>){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const target=event.target;
  if(!(target instanceof Element))return;
  const link=target.closest("a[href]");
  if(!(link instanceof HTMLAnchorElement)||(link.target&&link.target!=="_self")||
   link.hasAttribute("download")||link.hasAttribute("data-hard-navigation"))return;
  const url=new URL(link.href,location.href);
  if(url.origin!==location.origin||
    !(url.pathname==="/admin"||url.pathname.startsWith("/admin/"))||
    PUBLIC_ADMIN_PATH.test(url.pathname))return;
  if(url.pathname===pathname&&url.search===location.search)return;
  event.preventDefault();
  setNavPending(true);
  router.push(url.pathname+url.search+url.hash);
 }
 function toggleCollapsed(){
  const next=!collapsed;
  setCollapsed(next);
  try{localStorage.setItem(STORAGE_COLLAPSE_KEY,next?"1":"0");}catch{/* restricted storage */}
 }
 async function signOut(){
  if(signingOut)return;
  setSigningOut(true);
  try{await authClient.signOut();setRole("user");router.replace("/admin/login");router.refresh();}
  catch{setSigningOut(false);}
 }
 let lastGroup:Group|""="";
 return <PersistentAdminShellProvider>
  <div className={"work-layout phase-layout admin-persistent-shell"+(collapsed?" admin-sidebar-collapsed":"")+
    (mobileOpen?" admin-mobile-open":"")}>
   {mobileOpen&&<button type="button" className="admin-mobile-backdrop" onClick={()=>{setMobileOpen(false);mobileToggleRef.current?.focus();}}
    aria-label={t("closeMenu")} tabIndex={-1}/>}
   <aside ref={drawerRef} className="card side-panel admin-persistent-sidebar" id="admin-workspace-navigation"
    role={mobileOpen?"dialog":undefined} aria-modal={mobileOpen||undefined}
    aria-label={t("navigation")}>
    <div className="admin-sidebar-head">
     <span className="admin-sidebar-emblem" aria-hidden="true"><CareIcon name="sparkle" size={20}/></span>
     <div className="admin-sidebar-identity"><strong>DandanLink</strong><small>{t("workspace")}</small></div>
     <button className="admin-sidebar-collapse" type="button" onClick={toggleCollapsed}
      title={collapsed?t("expand"):t("collapse")}
      aria-label={collapsed?t("expand"):t("collapse")} aria-expanded={!collapsed}>
      <CareIcon name="panel" size={18}/>
     </button>
     <button ref={mobileCloseRef} className="admin-sidebar-mobile-close" type="button" onClick={()=>{setMobileOpen(false);mobileToggleRef.current?.focus();}}
      aria-label={t("closeMenu")}><CareIcon name="close" size={19}/></button>
    </div>
    <nav className="side-nav admin-persistent-nav" aria-label={t("navigation")}>
     {role==="loading"?<div className="admin-nav-skeleton" aria-label={t("loading")}>
      {Array.from({length:9},(_,i)=><span key={i}/>)}</div>:
      items.length?items.map(item=>{
       const showGroup=lastGroup!==item.group;
       lastGroup=item.group;
       return <React.Fragment key={item.key}>
        {showGroup&&<span className="phase04-side-group admin-nav-group">{t(item.group)}</span>}
        <Link className="phase04-side-link admin-sidebar-link" href={item.href}
         onClick={()=>{setMobileOpen(false);if(!active(item.href))setNavPending(true);}}
         title={collapsed?t(item.key):undefined}
         aria-label={t(item.key)} aria-current={active(item.href)?"page":undefined}>
         <span className="phase04-side-icon admin-sidebar-icon" aria-hidden="true">
          <CareIcon name={item.icon} size={19}/></span>
         <span className="admin-sidebar-link-label">{t(item.key)}</span>
         <span className="admin-nav-selected-indicator" aria-hidden="true"/>
        </Link>
       </React.Fragment>;
      }):<div className="admin-nav-no-access" role="status">
       <p>{t("unauthorized")}</p><Link className="btn btn-secondary" href="/admin/login">{t("login")}</Link>
      </div>}
    </nav>
    <div className="phase-sidebar-bottom admin-sidebar-preferences"><LocaleControls/></div>
    <div className="admin-sidebar-tail"><CareIcon name="shield" size={15}/>
     <span>{t("secureWorkspace")}</span></div>
   </aside>
   <section className="work-content admin-persistent-content" onClick={navigateWithinAdmin}>
    <header className="work-heading phase-work-heading admin-persistent-header">
     <div className="admin-header-leading">
      <button ref={mobileToggleRef} className="admin-mobile-menu-btn" type="button"
       aria-expanded={mobileOpen} aria-controls="admin-workspace-navigation"
       aria-label={mobileOpen?t("closeMenu"):t("openMenu")} onClick={()=>setMobileOpen(v=>!v)}>
       <CareIcon name={mobileOpen?"close":"menu"} size={21}/></button>
      <div className="admin-header-page-info">
       <nav className="admin-breadcrumb" aria-label={t("breadcrumb")}>
        <Link href="/admin">{t("workspace")}</Link>
        <CareIcon name="chevron" size={13}/>
        <span>{groupLabel}</span>
       </nav>
       <div className="admin-header-current"><strong>{title}</strong><span>{t("secureWorkspace")}</span></div>
      </div>
     </div>
     <div className="admin-header-account">
      {role==="admin"&&<div className="adm-e-header-controls">
       <button type="button" onClick={()=>{
        setCommandTab("search");setShowCommand(true);}} title={t("searchPlatform")}>
        <CareIcon name="search" size={17}/><span>{t("searchPlatform")}</span>
        <kbd className="adm-e-shortcut">Ctrl K</kbd></button>
       <button type="button" className="adm-e-header-bell" onClick={()=>{
        setCommandTab("notices");setShowCommand(true);}} title={t("notifications")}
        aria-label={t("notifications")+(unreadNotices?" ("+unreadNotices+")":"")}>
        <CareIcon name="bell" size={19}/>
        {unreadNotices>0&&<b>{unreadNotices>99?"99+":unreadNotices}</b>}
       </button>
      </div>}
      <div className="admin-account-identity">
       <span className="admin-user-avatar" aria-hidden="true">{initials}</span>
       <div className="admin-user-copy"><strong>{name||t("account")}</strong>
        <small>{role==="admin"?t("adminRole"):role==="support"?t("supportRole"):""}</small></div>
      </div>
      {role!=="user"&&<button type="button" className="btn btn-secondary admin-signout"
       onClick={signOut} disabled={signingOut} title={t("signOut")}>
       <CareIcon name="logout" size={17}/><span>{t("signOut")}</span></button>}
     </div>
    </header>
    {navPending&&<div className="admin-navigation-progress" role="status" aria-label={t("loading")}/>}
    <div className="admin-route-content" aria-label={t("mainContent")}>{children}</div>
    {role==="admin"&&showCommand&&<div className="adm-e-overlay" role="presentation"
     onMouseDown={e=>{if(e.target===e.currentTarget)setShowCommand(false);}}>
     <AdminCommandCenter compact initialTab={commandTab}
      onClose={()=>setShowCommand(false)}/>
    </div>}
   </section>
  </div>
 </PersistentAdminShellProvider>;
}
