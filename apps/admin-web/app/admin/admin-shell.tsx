"use client";

import React,{useEffect,useState,type MouseEvent,type ReactNode} from "react";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {authClient,LocaleControls,usePreferences} from "@dandanlink/ui";
import {PersistentAdminShellProvider} from "@dandanlink/ui/admin-shell-context";

type Role="admin"|"support"|"user"|"loading";
type Item={key:string;href:string;group:"overview"|"verification"|"finance"|"operations"|"platform";icon:string};
const NAV:Item[]=[
 {key:"dashboard",href:"/admin",group:"overview",icon:"⌂"},
 {key:"clinics",href:"/admin/clinics",group:"verification",icon:"▤"},
 {key:"dentists",href:"/admin/dentists",group:"verification",icon:"✚"},
 {key:"listings",href:"/admin/listings",group:"verification",icon:"◈"},
 {key:"reviews",href:"/admin/reviews",group:"verification",icon:"★"},
 {key:"subscriptions",href:"/admin/subscriptions",group:"finance",icon:"◇"},
 {key:"plans",href:"/admin/plans",group:"finance",icon:"▧"},
 {key:"support",href:"/admin/support",group:"operations",icon:"✉"},
 {key:"analytics",href:"/admin/analytics",group:"operations",icon:"▤"},
 {key:"security",href:"/admin/security",group:"platform",icon:"⛨"},
 {key:"settings",href:"/admin/settings",group:"platform",icon:"⚙"},
 {key:"pilot",href:"/admin/pilot",group:"platform",icon:"◎"}
];
const TRANSLATIONS:Record<string,Record<string,string>>={
 en:{dashboard:"Dashboard",clinics:"Clinics",dentists:"Dentist verification",listings:"Listings",
  reviews:"Reviews",subscriptions:"Subscriptions",plans:"Plans",support:"Support",
  analytics:"Analytics",security:"Security",settings:"Settings",pilot:"Pilot readiness",
  overview:"Overview",verification:"Verification",finance:"Finance",operations:"Operations",
  platform:"Platform",navigation:"Administration navigation",signOut:"Sign out",
  workspace:"Administration",loading:"Loading administrator access",login:"Sign in",
  unauthorized:"Administrator or authorized support access is required"},
 "fa-AF":{dashboard:"داشبورد",clinics:"کلینیک‌ها",dentists:"تأیید داکتران",listings:"آگهی‌ها",
  reviews:"نظرات",subscriptions:"اشتراک‌ها",plans:"پلن‌ها",support:"پشتیبانی",
  analytics:"تحلیل‌ها",security:"امنیت",settings:"تنظیمات",pilot:"آمادگی آزمایشی",
  overview:"نمای کلی",verification:"تأیید",finance:"مالی",operations:"عملیات",
  platform:"پلتفرم",navigation:"منوی مدیریت",signOut:"خروج",workspace:"مدیریت",
  loading:"در حال بررسی دسترسی مدیر",login:"ورود",unauthorized:"ورود مدیر یا کارمند مجاز پشتیبانی لازم است"},
 "ps-AF":{dashboard:"ډشبورډ",clinics:"کلینیکونه",dentists:"د ډاکټرانو تایید",listings:"اعلانونه",
  reviews:"نظرونه",subscriptions:"ګډونونه",plans:"پلانونه",support:"ملاتړ",
  analytics:"شننې",security:"امنیت",settings:"تنظیمات",pilot:"ازمایښتي چمتووالی",
  overview:"عمومي کتنه",verification:"تایید",finance:"مالي",operations:"عملیات",
  platform:"پلاتفورم",navigation:"د ادارې نوملړ",signOut:"وتل",workspace:"مدیریت",
  loading:"د مدیر لاسرسی کتل کېږي",login:"ننوتل",unauthorized:"د مدیر یا مجاز ملاتړ لاسرسي ته اړتیا ده"}
};
const PUBLIC_ADMIN_PATH=/^\/admin\/(?:login|reset-password|2fa)(?:\/|$)/;
const api=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";

export function AdminPersistentShell({children}:{children:ReactNode}){
 const pathname=usePathname()||"/admin";
 const router=useRouter();
 const {locale}=usePreferences();
 const [role,setRole]=useState<Role>("loading");
 const [name,setName]=useState("");
 const [signingOut,setSigningOut]=useState(false);
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
 if(isPublic)return <>{children}</>;

 const items=role==="admin"?NAV:role==="support"?
  NAV.filter(item=>item.key==="support"||item.key==="analytics"):[];
 const active=(href:string)=>href==="/admin"?pathname==="/admin"||pathname==="/admin/":
  pathname===href||pathname.startsWith(href+"/");

 // Existing review/detail links still use <a>. Upgrade only same-origin /admin
 // links in the page body to client navigation; keep downloads and modified clicks native.
 function navigateWithinAdmin(event:MouseEvent<HTMLElement>){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const target=event.target;
  if(!(target instanceof Element))return;
  const link=target.closest("a[href]");
  if(!(link instanceof HTMLAnchorElement)||link.target&&link.target!=="_self"||
   link.hasAttribute("download")||link.hasAttribute("data-hard-navigation"))return;
  const url=new URL(link.href,location.href);
  if(url.origin!==location.origin||
    !(url.pathname==="/admin"||url.pathname.startsWith("/admin/"))||
    PUBLIC_ADMIN_PATH.test(url.pathname))return;
  event.preventDefault();
  router.push(url.pathname+url.search+url.hash);
 }
 async function signOut(){
  if(signingOut)return;
  setSigningOut(true);
  try{await authClient.signOut();setRole("user");router.replace("/admin/login");router.refresh();}
  catch{setSigningOut(false);}
 }
 let lastGroup="";
 return <PersistentAdminShellProvider>
  <div className="work-layout phase-layout admin-persistent-shell">
   <aside className="card side-panel admin-persistent-sidebar" aria-label={t("navigation")}>
    <div className="pill">{t("workspace")}</div>
    <nav className="side-nav admin-persistent-nav" aria-label={t("navigation")}>
     {role==="loading"?<div className="admin-nav-skeleton" aria-label={t("loading")}>
      {Array.from({length:9},(_,i)=><span key={i}/>)}</div>:
      items.length?items.map(item=>{
       const groupLabel=lastGroup!==item.group?item.group:null;
       lastGroup=item.group;
       return <React.Fragment key={item.key}>
        {groupLabel&&<span className="phase04-side-group admin-nav-group">{t(groupLabel)}</span>}
        <Link className="phase04-side-link admin-sidebar-link" href={item.href}
         aria-current={active(item.href)?"page":undefined}>
         <span className="phase04-side-icon" aria-hidden="true">{item.icon}</span>
         <span>{t(item.key)}</span>
        </Link>
       </React.Fragment>;
      }):<div className="admin-nav-no-access" role="status">
       <p>{t("unauthorized")}</p><Link className="btn btn-secondary" href="/admin/login">{t("login")}</Link>
      </div>}
    </nav>
    <div className="phase-sidebar-bottom admin-sidebar-preferences"><LocaleControls/></div>
   </aside>
   <section className="work-content admin-persistent-content" onClick={navigateWithinAdmin}>
    <header className="work-heading phase-work-heading admin-persistent-header">
     <div><span className="pill">DandanLink · {t("workspace")}</span>
      <p className="muted phase-user">{name||"\u00a0"}</p></div>
     {role!=="user"&&<button type="button" className="btn btn-secondary"
      onClick={signOut} disabled={signingOut}>{t("signOut")}</button>}
    </header>
    <div className="admin-route-content">{children}</div>
   </section>
  </div>
 </PersistentAdminShellProvider>;
}
