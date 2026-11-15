"use client";
import React,{useEffect,useState} from "react";
import Link from "next/link";
import {CareIcon,InlineAlert,usePreferences} from "@dandanlink/ui";

type Posture={
 access:{admins:{active:number;mfaReady:number;mfaMissing:number;emailUnverified:number};
 support:{active:number;mfaReady:number;mfaMissing:number;emailUnverified:number};
 activePrivilegedSessions:number};
 audit:{unsuccessfulLast30:number;unsuccessfulLast24:number;
 supportGrantsLast30:number;supportRevocationsLast30:number;
 topActions:{action:string;outcome:string;count:number}[]};
 release:{enabled:boolean;marked:number;total:number;status:string};
 generatedAt:string;timezone:string;notice:string;privacy:string};
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const translations:Record<string,Record<string,string>>={
 en:{title:"Security & access",subtitle:"MFA coverage, privileged access, audit outcomes and pilot safeguards.",
 eyebrow:"DANDANLINK · SECURITY",refresh:"Refresh",loading:"Checking access posture…",
 denied:"Access requires a verified MFA-enabled platform administrator.",
 fail:"Could not load security information.",retry:"Try again",role:"Privileged roles",
 admin:"Platform administrators",support:"Support agents",mfa:"MFA verified",
 missing:"MFA not ready",email:"Email unverified",sessions:"Active privileged sessions",
 audit:"Security audit",fail24:"Unsuccessful audit outcomes (24h)",fail30:"Unsuccessful outcomes (30d)",
 grants:"Support grants (30d)",revocations:"Support revocations (30d)",
 decisions:"Recent administrative event groups",action:"Action",outcome:"Outcome",
 total:"Count",none:"No matching administrative actions in the last 30 days.",
 attention:"Review access controls",stable:"No recorded MFA gap",warning:"Some privileged accounts cannot pass the MFA access gate.",
 actionSettings:"Review support agents",actionPilot:"Pilot approvals",actionMonitor:"Operations monitoring",
 release:"Pilot release gate",blocked:"Not approved",approved:"Operator marked enabled",
 gate:"Operator-controlled readiness marks",note:"Indicators are aggregate application records, not independent security or legal certification.",
 noHealth:"Protected patient data must remain blocked until external clinical, privacy and hosting approvals are documented.",
 privacy:"No patient records, user identifiers, sessions, email or IP addresses are disclosed.",
 updated:"Updated",timezone:"Asia/Kabul",healthy:"Verified",pending:"Pending"},
 "fa-AF":{title:"امنیت و دسترسی",subtitle:"بررسی تأیید دومرحله‌ای، دسترسی‌های مدیریتی و فعالیت‌های حسابرسی.",
 eyebrow:"دندان‌لینک · امنیت",refresh:"تازه‌سازی",loading:"در حال بررسی امنیت…",
 denied:"این بخش تنها برای مدیر دارای تأیید دومرحله‌ای است.",
 fail:"معلومات امنیتی دریافت نشد.",retry:"دوباره",role:"نقش‌های حساس",
 admin:"مدیران پلتفرم",support:"کارمندان پشتیبانی",mfa:"تأیید دومرحله‌ای",
 missing:"بدون MFA کامل",email:"ایمیل تأییدنشده",sessions:"نشست‌های فعال مسئولان",
 audit:"حسابرسی امنیت",fail24:"فعالیت‌های ناموفق (۲۴ ساعت)",fail30:"فعالیت‌های ناموفق (۳۰ روز)",
 grants:"دسترسی‌های پشتیبانی (۳۰ روز)",revocations:"لغو دسترسی‌ها (۳۰ روز)",
 decisions:"دسته‌های اخیر فعالیت مدیریتی",action:"فعالیت",outcome:"نتیجه",
 total:"تعداد",none:"فعالیت مرتبط در ۳۰ روز ثبت نشده است.",
 attention:"بررسی مجوزها",stable:"کمبود MFA ثبت نشده",warning:"برخی حساب‌ها بدون MFA کامل به دسترسی مدیریت نمی‌رسند.",
 actionSettings:"مدیریت دسترسی پشتیبانی",actionPilot:"تأییدهای پایلوت",actionMonitor:"نظارت عملیات",
 release:"شرط نشر آزمایشی",blocked:"تأیید نشده",approved:"توسط مسئول فعال شده",
 gate:"موارد آمادگی ثبت‌شده",note:"این شاخص‌ها اطلاعات داخلی است، نه تصدیق مستقل امنیتی یا حقوقی.",
 noHealth:"تا تأیید مستقل شرایط حقوقی، طبی و میزبانی، داده‌های مریضان نباید فعال شوند.",
 privacy:"اطلاعات مریضان، شناسه‌ها، نشست‌ها، ایمیل و IP منتشر نمی‌شوند.",
 updated:"تازه‌شده",timezone:"آسیا/کابل",healthy:"تأیید",pending:"منتظر"},
 "ps-AF":{title:"امنیت او لاسرسی",subtitle:"د MFA حالت، اداري لاسرسي او ثبت شویو پېښو څارنه.",
 eyebrow:"دندان‌لینک · امنیت",refresh:"تازه کول",loading:"امنیت کتل کېږي…",
 denied:"دا برخه یوازې د تایید شوي MFA مدیر لپاره ده.",
 fail:"امنیتي معلومات نه ترلاسه کېږي.",retry:"بیا هڅه",role:"حساس رولونه",
 admin:"د پلاتفورم مدیران",support:"د ملاتړ کارکوونکي",mfa:"MFA تایید شوی",
 missing:"MFA ناتمام",email:"برېښنالیک نه دی تایید",sessions:"فعالې اداري ناستې",
 audit:"امنیتي ثبتونه",fail24:"ناکامې پېښې (۲۴ ساعته)",fail30:"ناکامې پېښې (۳۰ ورځې)",
 grants:"د ملاتړ اجازه (۳۰ ورځې)",revocations:"د لاسرسي لغوه (۳۰ ورځې)",
 decisions:"وروستي اداري فعالیتونه",action:"فعالیت",outcome:"پایله",
 total:"شمېر",none:"په ۳۰ ورځو کې اړوند پېښې نه شته.",
 attention:"د لاسرسي بیاکتنه",stable:"د MFA نیمګړتیا نشته",warning:"ځینې اداري حسابونه بشپړ MFA نه لري.",
 actionSettings:"د ملاتړ لاسرسی",actionPilot:"د پایلوت تایید",actionMonitor:"د عملیاتو څارنه",
 release:"د پایلوت د پیل شرط",blocked:"لا نه دی تایید",approved:"د مسئول له خوا فعال شوی",
 gate:"ثبت شوي چمتووالی",note:"دا داخلي شمېرې دي؛ خپلواک امنیتي یا قانوني تصدیق نه دی.",
 noHealth:"د ناروغانو د معلوماتو ساتنې لپاره خپلواک قانوني، طبي او کوربه تایید لا اړین دی.",
 privacy:"د ناروغانو اسناد، هویت، ناستې، ایمیل او IP نه خپرېږي.",
 updated:"تازه شوی",timezone:"آسیا/کابل",healthy:"تایید",pending:"منتظر"}
};
export function AdminSecurityPortal(){
 const {locale}=usePreferences();const lang=locale in translations?locale:"en";
 const t=(key:string)=>translations[lang][key]||translations.en[key]||key;
 const n=(value:number)=>new Intl.NumberFormat(lang).format(value);
 const [data,setData]=useState<Posture|null>(null),[error,setError]=useState("");
 const [loading,setLoading]=useState(true),[tick,setTick]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  setLoading(true);setError("");
  fetch(API+"/v1/admin/security/posture",{credentials:"include",cache:"no-store",signal:controller.signal})
   .then(async response=>{
    const result=await response.json().catch(()=>({})) as Posture&{code?:string};
    if(!response.ok)throw Error(result.code||"REQUEST_FAILED");
    return result;
   }).then(result=>{if(active)setData(result);})
   .catch(e=>{if(active){setData(null);setError(e instanceof Error?e.message:String(e));}})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false;controller.abort()};
 },[tick]);
 useEffect(()=>{
  const interval=window.setInterval(()=>{
   if(document.visibilityState==="visible")setTick(v=>v+1);
  },60000);
  return()=>clearInterval(interval);
 },[]);
 const missing=data?data.access.admins.mfaMissing+data.access.support.mfaMissing:0;
 const figures=data?[
  {label:t("admin"),value:data.access.admins.active,sub:t("mfa")+": "+n(data.access.admins.mfaReady),icon:"shield-check"},
  {label:t("support"),value:data.access.support.active,sub:t("mfa")+": "+n(data.access.support.mfaReady),icon:"life-buoy"},
  {label:t("missing"),value:missing,sub:t("email")+": "+n(data.access.admins.emailUnverified+data.access.support.emailUnverified),icon:"shield"},
  {label:t("sessions"),value:data.access.activePrivilegedSessions,sub:t("role"),icon:"users"},
  {label:t("fail24"),value:data.audit.unsuccessfulLast24,sub:t("audit"),icon:"activity"},
  {label:t("revocations"),value:data.audit.supportRevocationsLast30,sub:t("grants")+": "+n(data.audit.supportGrantsLast30),icon:"badge-check"}
 ] as const:[];
 return <main className="adm-f-security">
  <header className="adm-f-title"><div><span className="adm-f-eyebrow">{t("eyebrow")}</span>
   <h1>{t("title")}</h1><p>{t("subtitle")}</p></div>
   <button className="btn btn-secondary" type="button" disabled={loading}
    onClick={()=>setTick(v=>v+1)}><CareIcon name="activity" size={17}/>{t("refresh")}</button></header>
  {loading&&<div className="admin-page-loading" role="status" aria-label={t("loading")}>
   <div className="admin-loading-grid">{[1,2,3].map(i=><span className="admin-loading-card" key={i}/>)}</div></div>}
  {error&&<div role="alert" className="adm-f-error"><InlineAlert kind="error">{error==="MFA_REQUIRED"||error==="ADMIN_DENIED"?
   t("denied"):t("fail")}</InlineAlert>
   <button type="button" className="btn btn-secondary" onClick={()=>setTick(v=>v+1)}>{t("retry")}</button></div>}
  {data&&<><section className="adm-f-stat-grid" aria-label={t("role")}>
   {figures.map(x=><article key={x.label} className="adm-f-stat">
    <span className="adm-f-stat-icon"><CareIcon name={x.icon} size={19}/></span>
    <span>{x.label}</span><strong>{n(x.value)}</strong><small>{x.sub}</small></article>)}
  </section>
   <section className={"adm-f-notice"+(missing?" is-warning":"")}>
    <CareIcon name={missing?"shield":"shield-check"} size={20}/>
    <div><strong>{missing?t("attention"):t("stable")}</strong>
     <p>{missing?t("warning"):t("note")}</p></div>
    <Link href="/admin/settings">{t("actionSettings")} →</Link>
   </section>
   <div className="adm-f-columns">
    <section className="adm-f-panel"><div className="adm-f-section-head"><h2>{t("audit")}</h2>
     <span>{t("fail30")}: {n(data.audit.unsuccessfulLast30)}</span></div>
     <div className="adm-f-tablewrap"><table><thead><tr>
      <th scope="col">{t("action")}</th><th scope="col">{t("outcome")}</th>
      <th scope="col">{t("total")}</th></tr></thead><tbody>
      {data.audit.topActions.map(x=><tr key={x.action+x.outcome}>
       <td>{x.action.replaceAll("_"," ")}</td><td>{x.outcome}</td>
       <td>{n(x.count)}</td></tr>)}
     </tbody></table>{!data.audit.topActions.length&&<p className="adm-f-empty">{t("none")}</p>}</div>
    </section>
    <section className="adm-f-panel"><h2>{t("release")}</h2>
     <div className="adm-f-pilot-status">
      <strong className={data.release.enabled?"is-operator":"is-blocked"}>
       {data.release.enabled?t("approved"):t("blocked")}</strong>
      <span>{t("gate")}: {n(data.release.marked)} / {n(data.release.total)}</span>
     </div>
     <div className="adm-f-progress" role="progressbar" aria-label={t("gate")}
      aria-valuemin={0} aria-valuemax={data.release.total}
      aria-valuenow={data.release.marked}><span style={{width:
       (100*data.release.marked/Math.max(1,data.release.total))+"%"}}/></div>
     <p className="adm-f-disclaimer">{t("noHealth")}</p>
     <div className="adm-f-links">
      <Link href="/admin/pilot"><CareIcon name="rocket" size={16}/>{t("actionPilot")}</Link>
      <Link href="/admin/center"><CareIcon name="chart-columns" size={16}/>{t("actionMonitor")}</Link>
     </div>
    </section>
   </div>
   <footer className="adm-f-disclaimer"><CareIcon name="shield" size={16}/>
    <span>{t("privacy")} {t("note")}</span>
    <time dateTime={data.generatedAt}>{t("updated")}: {new Intl.DateTimeFormat(lang,{
     timeZone:"Asia/Kabul",dateStyle:"medium",timeStyle:"short"}).format(new Date(data.generatedAt))}</time>
   </footer></>}
 </main>;
}
