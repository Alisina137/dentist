"use client";

import React,{useEffect,useRef,useState} from "react";
import {CareIcon,usePreferences} from "@dandanlink/ui";
type Section="search"|"notices"|"monitoring";
type Category="all"|"clinics"|"dentists"|"listings"|"invoices"|"support";
type Result={id:string;category:string;title:string;detail:string;href:string};
type Notice={key:string;kind:string;severity:"critical"|"warning"|"info";count:number;
 title:string;description:string;href:string;occurredAt:string;read:boolean};
type Monitor={metrics:{key:string;value:number;severity:string;description:string}[];
 trend:{day:string;successful:number;failed:number}[];generatedAt:string;scope:string;launchReadiness:string};
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
const translations:Record<string,Record<string,string>>={
 en:{title:"Operations center",subtitle:"Search the platform, review notifications and inspect live operating signals.",
 search:"Global search",notices:"Notifications",monitoring:"Platform monitoring",
 placeholder:"Search clinic, dentist, listing, payment or support reference…",searchHint:"Enter at least two characters.",
 category:"Category",all:"All",clinics:"Clinics",dentists:"Dentists",listings:"Listings",
 invoices:"Subscription payments",support:"Support",results:"Search results",none:"No matches found.",
 scope:"Search includes administrative records only. No patient, clinical or support-message content.",
 recent:"Recent operational alerts",unread:"Unread",read:"Mark reviewed",reviewed:"Reviewed",
 refresh:"Refresh",empty:"No active notifications.",noTrend:"No audit events in this period.",
 alertPrivacy:"Notifications show administrative counts and event metadata, never clinical records.",
 status:"Status",count:"Count",activity:"Administrative outcomes by day (14 days)",
 successful:"Successful",failed:"Unsuccessful",time:"Last refreshed",close:"Close",
 error:"Unable to load the operations center.",retry:"Try again",loading:"Loading…",
 searchSlow:"Type at least two characters to search.",critical:"Critical",warning:"Attention",
 info:"Information",healthy:"Healthy",details:"Open section",noMonitoring:"No monitoring data available.",
 searchKeyboard:"Ctrl + K",markHelp:"Reviewed items remain accessible. New queue changes create new alerts.",
 database:"Database",outboxPending:"Queued delivery events",outboxDelayed:"Delayed delivery events",
 failedNotices:"Failed booking notifications",overduePayments:"Payments overdue for review",
 triageOverdue:"Support triage overdue",firstReplyOverdue:"Support first reply overdue",
 auditFailures:"Unsuccessful audit actions (24h)",privacy:"Private, admin-only workspace"},
 "fa-AF":{title:"مرکز عملیات",subtitle:"جستجوی پلتفرم، اعلان‌ها و بررسی وضعیت خدمات.",
 search:"جستجوی سراسری",notices:"اعلان‌ها",monitoring:"نظارت پلتفرم",
 placeholder:"جستجوی کلینیک، داکتر، آگهی، پرداخت یا درخواست پشتیبانی…",searchHint:"حداقل دو حرف وارد کنید.",
 category:"بخش",all:"همه",clinics:"کلینیک‌ها",dentists:"داکتران",listings:"آگهی‌ها",
 invoices:"پرداخت اشتراک",support:"پشتیبانی",results:"نتایج جستجو",none:"موردی پیدا نشد.",
 scope:"فقط معلومات مدیریتی جستجو می‌شوند؛ بدون اطلاعات مریض، اسناد صحی یا پیام‌های پشتیبانی.",
 recent:"هشدارهای عملیاتی",unread:"خوانده‌نشده",read:"علامت‌گذاری به‌عنوان بررسی‌شده",reviewed:"بررسی‌شده",
 refresh:"تازه‌سازی",empty:"اعلان فعالی موجود نیست.",noTrend:"در این دوره رویدادی ثبت نشده است.",
 alertPrivacy:"اعلان‌ها تنها شمار و معلومات رویدادهای مدیریتی را نشان می‌دهند.",
 status:"حالت",count:"تعداد",activity:"نتیجه رویدادهای مدیریتی در ۱۴ روز",
 successful:"موفق",failed:"ناموفق",time:"آخرین تازه‌سازی",close:"بستن",
 error:"مرکز عملیات بارگیری نشد.",retry:"دوباره",loading:"در حال بارگیری…",
 searchSlow:"برای جستجو حداقل دو حرف بنویسید.",critical:"بحرانی",warning:"نیاز به بررسی",
 info:"معلومات",healthy:"سالم",details:"بازکردن بخش",noMonitoring:"معلومات نظارتی موجود نیست.",
 searchKeyboard:"Ctrl + K",markHelp:"موارد بررسی‌شده باقی می‌مانند؛ با تغییر صف اعلان جدید ساخته می‌شود.",
 database:"دیتابیس",outboxPending:"رویدادهای در صف",outboxDelayed:"رویدادهای تأخیری",
 failedNotices:"اعلان‌های ناموفق ملاقات",overduePayments:"پرداخت‌های منتظر بررسی",
 triageOverdue:"تأخیر بررسی پشتیبانی",firstReplyOverdue:"تأخیر پاسخ اول پشتیبانی",
 auditFailures:"فعالیت‌های ناموفق ۲۴ ساعت",privacy:"محیط خصوصی مدیریت"},
 "ps-AF":{title:"د عملیاتو مرکز",subtitle:"د پلاتفورم لټون، خبرتیاوې او د سیستم حالت وګورئ.",
 search:"عمومي لټون",notices:"خبرتیاوې",monitoring:"د پلاتفورم څارنه",
 placeholder:"کلینیک، ډاکټر، اعلان، تادیه یا د ملاتړ مرجع ولټوئ…",searchHint:"لږترلږه دوه توري ولیکئ.",
 category:"برخه",all:"ټول",clinics:"کلینیکونه",dentists:"ډاکټران",listings:"اعلانونه",
 invoices:"د ګډون تادیات",support:"ملاتړ",results:"د لټون پایلې",none:"هیڅ مورد نه شته.",
 scope:"یوازې اداري معلومات؛ د ناروغانو، طبي ریکارډونو او ملاتړ پیغامونه نشته.",
 recent:"وروستۍ عملیاتي خبرتیاوې",unread:"نالوستل شوي",read:"کتل شوی نښه کول",reviewed:"کتل شوی",
 refresh:"تازه کول",empty:"فعالې خبرتیاوې نشته.",noTrend:"په دې موده کې فعالیت نشته.",
 alertPrivacy:"خبرتیاوې یوازې اداري شمېرې او پېښې ښيي.",
 status:"حالت",count:"شمېر",activity:"د ۱۴ ورځو اداري پایلې",
 successful:"بریالي",failed:"ناکام",time:"وروستی تازه وخت",close:"بندول",
 error:"د عملیاتو مرکز نه خلاصیږي.",retry:"بیا هڅه",loading:"بارېږي…",
 searchSlow:"د لټون لپاره لږترلږه دوه توري ولیکئ.",critical:"جدي",warning:"پاملرنه",
 info:"مالومات",healthy:"روغ",details:"برخه پرانیستل",noMonitoring:"د څارنې معلومات نشته.",
 searchKeyboard:"Ctrl + K",markHelp:"کتل شوي موارد پاتې کېږي؛ نوی کتار نوې خبرتیا جوړوي.",
 database:"ډیټابېس",outboxPending:"په کتار کې پېښې",outboxDelayed:"ځنډېدلې پېښې",
 failedNotices:"ناکامې خبرتیاوې",overduePayments:"د تادیو ځنډېدلې کتنه",
 triageOverdue:"د ملاتړ ځنډېدلې کتنه",firstReplyOverdue:"د ملاتړ لومړی ځواب ځنډېدلی",
 auditFailures:"د ۲۴ ساعتونو ناکامې پېښې",privacy:"شخصي اداري برخه"}
};
async function get<T>(path:string,signal?:AbortSignal):Promise<T>{
 const r=await fetch(API+"/v1/admin/center"+path,{
  credentials:"include",cache:"no-store",signal});
 const json=await r.json().catch(()=>({})) as T&{code?:string};
 if(!r.ok)throw Error(json.code||"REQUEST_FAILED");
 return json;
}
async function readNotice(key:string){
 const r=await fetch(API+"/v1/admin/center/notices/read",{
  method:"POST",credentials:"include",cache:"no-store",
  headers:{"Content-Type":"application/json"},body:JSON.stringify({key})});
 const x=await r.json().catch(()=>({})) as {code?:string};
 if(!r.ok)throw Error(x.code||"REQUEST_FAILED");
}
export function AdminCommandCenter({initialTab="search",onClose,compact=false}:{
 initialTab?:Section;onClose?:()=>void;compact?:boolean}){
 const {locale}=usePreferences(),lang=locale in translations?locale:"en";
 const t=(key:string)=>translations[lang][key]||translations.en[key]||key;
 const fmt=(value:number)=>new Intl.NumberFormat(lang).format(value);
 const [tab,setTab]=useState<Section>(initialTab),[q,setQ]=useState(""),[category,setCategory]=useState<Category>("all");
 const [results,setResults]=useState<Result[]>([]),[notices,setNotices]=useState<Notice[]>([]);
 const [monitor,setMonitor]=useState<Monitor|null>(null),[unread,setUnread]=useState(0);
 const [searching,setSearching]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[reload,setReload]=useState(0);
 const inputRef=useRef<HTMLInputElement>(null),rootRef=useRef<HTMLElement>(null);
 useEffect(()=>{if(tab==="search")inputRef.current?.focus();},[tab]);
 useEffect(()=>{
  if(!compact)return;
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();onClose?.();}
   if(event.key==="Tab"){
    const items=Array.from(rootRef.current?.querySelectorAll<HTMLElement>(
     'button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')||[])
     .filter(node=>node.getClientRects().length>0);
    if(!items.length)return;
    if(event.shiftKey&&document.activeElement===items[0]){
     event.preventDefault();items.at(-1)?.focus();}
    else if(!event.shiftKey&&document.activeElement===items.at(-1)){
     event.preventDefault();items[0].focus();}
   }
  };
  document.addEventListener("keydown",onKey);
  const previous=document.body.style.overflow;document.body.style.overflow="hidden";
  return()=>{document.removeEventListener("keydown",onKey);document.body.style.overflow=previous;};
 },[compact,onClose]);
 useEffect(()=>{
  if(tab!=="search"){setSearching(false);return;}
  if(q.trim().length<2){setResults([]);return;}
  const controller=new AbortController();const timer=setTimeout(()=>{
   setSearching(true);setError("");
   get<{results:Result[]}>("/search?"+new URLSearchParams({q:q.trim(),category}),controller.signal)
    .then(x=>setResults(x.results)).catch(e=>{
     if(!controller.signal.aborted)setError(e instanceof Error?e.message:String(e));})
    .finally(()=>{if(!controller.signal.aborted)setSearching(false)});
  },250);
  return()=>{clearTimeout(timer);controller.abort();};
 },[tab,q,category,reload]);
 useEffect(()=>{
  if(tab!=="notices")return;
  let alive=true;const controller=new AbortController();setBusy(true);setError("");
  get<{notices:Notice[];unread:number}>("/notices",controller.signal)
   .then(x=>{if(alive){setNotices(x.notices);setUnread(x.unread);}})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:String(e));})
   .finally(()=>{if(alive)setBusy(false)});
  return()=>{alive=false;controller.abort();};
 },[tab,reload]);
 useEffect(()=>{
  if(tab!=="monitoring")return;
  let alive=true;const controller=new AbortController();setBusy(true);setError("");
  get<Monitor>("/monitoring",controller.signal)
   .then(x=>{if(alive)setMonitor(x);})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:String(e));})
   .finally(()=>{if(alive)setBusy(false)});
  return()=>{alive=false;controller.abort();};
 },[tab,reload]);
 useEffect(()=>{
  if(tab==="search")return;
  const poll=setInterval(()=>{if(document.visibilityState==="visible")setReload(v=>v+1);},60000);
  return()=>clearInterval(poll);
 },[tab]);
 async function markRead(item:Notice){
  if(item.read)return;
  setBusy(true);setError("");
  try{await readNotice(item.key);
   setNotices(rows=>rows.map(x=>x.key===item.key?{...x,read:true}:x));
   setUnread(x=>Math.max(0,x-1));
   window.dispatchEvent(new CustomEvent("admin-notices-changed"));
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 const close=()=>onClose?.();
 return <section ref={rootRef} className={"adm-e-center"+(compact?" adm-e-dialog":"")}
  role={compact?"dialog":undefined} aria-modal={compact||undefined} aria-label={t("title")}>
  <header className="adm-e-head"><div>
   <span className="adm-e-eyebrow">DANDANLINK · OPERATIONS</span>
   <h1>{t("title")}</h1><p>{t("subtitle")}</p></div>
   {compact?<button type="button" className="adm-e-close btn btn-secondary" aria-label={t("close")}
    onClick={close}><CareIcon name="close" size={18}/></button>:
   <button type="button" className="btn btn-secondary" onClick={()=>setReload(x=>x+1)}>
    <CareIcon name="activity" size={16}/>{t("refresh")}</button>}
  </header>
  <nav className="adm-e-tabs" role="tablist" aria-label={t("title")}>
   {(["search","notices","monitoring"] as const).map(x=>
    <button type="button" role="tab" key={x} aria-selected={tab===x}
     onClick={()=>{setTab(x);setError("");}}>
     <CareIcon name={x==="search"?"search":x==="notices"?"bell":"chart-columns"} size={17}/>
     {t(x)}{x==="notices"&&unread>0&&<b className="adm-e-badge">{fmt(unread)}</b>}</button>)}
  </nav>
  {error&&<div className="adm-e-error" role="alert">{t("error")}: {error}
   <button className="btn btn-secondary" type="button" onClick={()=>setReload(x=>x+1)}>{t("retry")}</button></div>}
  {tab==="search"&&<div className="adm-e-search">
   <div className="adm-e-search-row">
    <label className="adm-e-query"><CareIcon name="search" size={19}/>
     <input ref={inputRef} type="search" value={q} maxLength={100} aria-label={t("search")}
      placeholder={t("placeholder")} onChange={e=>setQ(e.target.value)}/></label>
    <label className="adm-e-filter">{t("category")}
     <select value={category} aria-label={t("category")}
      onChange={e=>setCategory(e.target.value as Category)}>
      {(["all","clinics","dentists","listings","invoices","support"] as const).map(x=>
       <option value={x} key={x}>{t(x)}</option>)}</select></label>
   </div>
   <p className="adm-e-caption">{t("scope")}</p>
   <div className="adm-e-results" aria-live="polite">
    {q.trim().length<2?<div className="adm-e-empty">{t("searchSlow")}</div>:
     searching?<div className="adm-e-empty" role="status">{t("loading")}</div>:
     results.length===0?<div className="adm-e-empty">{t("none")}</div>:
     results.map(item=><a key={item.category+item.id} href={item.href}
      onClick={close} className="adm-e-result">
      <span className="adm-e-result-icon"><CareIcon name={
       item.category==="clinics"?"hospital":item.category==="dentists"?"badge-check":
       item.category==="listings"?"images":item.category==="invoices"?"credit-card":"life-buoy"} size={18}/></span>
      <span><strong>{item.title}</strong><small>{t(item.category)} · {item.detail}</small></span>
      <CareIcon name="chevron" size={17}/></a>)}
   </div>
  </div>}
  {tab==="notices"&&<section className="adm-e-notices">
   <div className="adm-e-section-heading"><h2>{t("recent")}</h2>
    <span>{fmt(unread)} {t("unread")}</span></div>
   <p className="adm-e-caption">{t("alertPrivacy")} {t("markHelp")}</p>
   {busy&&!notices.length?<div className="adm-e-empty" role="status">{t("loading")}</div>:
    notices.length===0?<div className="adm-e-empty">{t("empty")}</div>:
    <div className="adm-e-notice-list">{notices.map(item=><article className={"adm-e-notice is-"+item.severity+
     (item.read?" is-read":"")} key={item.key}>
     <span className="adm-e-notice-dot" aria-hidden="true"/>
     <div className="adm-e-notice-content"><strong>{item.title}</strong><p>{item.description}</p>
      <small>{new Intl.DateTimeFormat(lang,{timeZone:"Asia/Kabul",dateStyle:"short",timeStyle:"short"})
       .format(new Date(item.occurredAt))} · {t(item.severity)} {item.count>1?"· "+fmt(item.count):""}</small>
      <div><a href={item.href} onClick={close}>{t("details")} ↗</a>
       {!item.read?<button disabled={busy} type="button"
        onClick={()=>void markRead(item)}>{t("read")}</button>:
        <span className="adm-e-reviewed">✓ {t("reviewed")}</span>}
      </div></div></article>)}</div>}
  </section>}
  {tab==="monitoring"&&<section className="adm-e-monitor">
   <div className="adm-e-section-heading"><h2>{t("monitoring")}</h2></div>
   {!monitor&&busy?<div className="adm-e-empty" role="status">{t("loading")}</div>:
   !monitor?<div className="adm-e-empty">{t("noMonitoring")}</div>:
   <>
    <div className="adm-e-monitor-grid">{monitor.metrics.map(x=><div key={x.key}
     className={"adm-e-monitor-metric is-"+x.severity}>
     <span>{t(x.key)}</span><strong>{fmt(x.value)}</strong>
     <small>{x.description}</small></div>)}</div>
    <div className="adm-e-monitor-history"><h2>{t("activity")}</h2>
     {!monitor.trend.length?<p>{t("noTrend")}</p>:
      <div className="adm-e-table-wrap"><table><thead><tr><th>{t("time")}</th>
       <th>{t("successful")}</th><th>{t("failed")}</th></tr></thead><tbody>
       {monitor.trend.map(x=><tr key={x.day}><td>{x.day}</td>
        <td>{fmt(x.successful)}</td><td>{fmt(x.failed)}</td></tr>)}
      </tbody></table></div>}
    </div>
    <p className="adm-e-caption">{monitor.scope} {monitor.launchReadiness}</p>
   </>}
  </section>}
  <footer className="adm-e-footer"><CareIcon name="shield" size={16}/>
   <span>{t("privacy")}</span><span>{t("searchKeyboard")}</span></footer>
 </section>;
}
