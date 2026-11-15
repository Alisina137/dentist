"use client";
import React,{useEffect,useState,type FormEvent} from "react";
import {InlineAlert,usePreferences} from "./index";
import {Shell} from "./phase03";
import {call18} from "./phase18";

type Lang="en"|"fa-AF"|"ps-AF";
type Space={clinicId:string;clinicName:string;membershipId:string;role:"owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";clinicianEnabled:boolean;clinicStatus:string;capabilities:string[]};
type Context={name:string;email:string;clinics:Space[];mfaEnabled:boolean};
type Job={id:string;reason:string;status:string;createdAt:string;expiresAt:string;downloadedAt:string|null};
type History={jobs:Job[];scope:string;limit:number;expiresMinutes:number;loginFreshnessMinutes:number};
type Retention={requestedDays:number;updatedAt:string|null;status:string;automatedDeletion:boolean};
const dictionary:Record<Lang,Record<string,string>>={
 en:{title:"Export & data retention",eyebrow:"Privacy & data control",
  intro:"Prepare a one-time, audited clinic data export. This is a sensitive administrative file, not a complete clinical record.",
  exports:"Export requests",retention:"Retention preference",history:"Access history",
  security:"Security rules",scope:"Included: patient directory, appointments, invoices and payment entries.",
  excluded:"Excluded: clinical intakes, signed visits, dental charts, X-rays, notes and attachments.",
  noData:"No exports requested yet.",reason:"Reason for export (12–240 characters)",reasonHint:"Example: Move approved clinic administration records to an encrypted archive.",
  request:"Create & download secure export",confirm:"I understand that patient identifiers are sensitive and will protect the exported file.",
  urgent:"An authenticator and a fresh sign-in (within 10 minutes) are required. The download expires after 5 minutes and can only be used once.",
  state:"Status",issued:"Created",expires:"Expires",revoke:"Revoke unused link",downloaded:"Downloaded",
  ready:"Ready",revoked:"Revoked",expired:"Expired",failure:"The operation could not complete.",
  loading:"Loading workspace…",denied:"Only the clinic owner with MFA can access these controls.",
  tryAgain:"Try again",login:"Sign in",goBack:"Clinic overview",empty:"No active clinic was selected.",
  days:"Requested retention period",save:"Save retention proposal",oneYear:"1 year",twoYears:"2 years",fiveYears:"5 years",tenYears:"10 years",
  retentionNotice:"This is a non-destructive preference only. No patient, clinical, finance or audit records will be deleted automatically. Legally approved retention rules must be configured before production launch.",
  accept:"I understand this will not delete any data.",saved:"Retention proposal recorded.",completed:"Secure export downloaded. Store the file in an encrypted location.",
  refresh:"Refresh",date:"Date",why:"Reason",status:"Status",noUrl:"Old download links are never displayed or recoverable.",
  reconnect:"If you just signed in again, refresh this page.",ownerOnly:"The owner must enroll two-factor authentication to use data exports.",
  blocked:"Production release is blocked until hosting, backups, legal and clinical approvals are verified."
 },
 "fa-AF":{title:"دریافت اطلاعات و نگهداری داده‌ها",eyebrow:"محرمیت و مدیریت معلومات",
  intro:"یک نسخه یک‌بارمصرف و ثبت‌شده از اطلاعات اداری کلینیک تهیه کنید. این فایل حساس است و دوسیه کامل صحی نیست.",
  exports:"درخواست‌های دریافت",retention:"پیشنهاد مدت نگهداری",history:"تاریخچه دسترسی",
  security:"شرایط امنیتی",scope:"شامل: فهرست مریضان، ملاقات‌ها، فاکتورها و پرداخت‌ها.",
  excluded:"شامل نیست: سوابق صحی، ویزیت‌های امضا‌شده، چارت دندان، عکس‌های طبی و یادداشت‌ها.",
  noData:"هنوز درخواستی ثبت نشده است.",reason:"دلیل دریافت (۱۲ تا ۲۴۰ حرف)",reasonHint:"مثلاً انتقال داده‌های اداری مجاز به آرشیف رمزگذاری‌شده.",
  request:"ساخت و دریافت فایل امن",confirm:"می‌دانم که اطلاعات مریضان محرمانه است و از فایل محافظت می‌کنم.",
  urgent:"تأیید دومرحله‌ای و ورود مجدد در ۱۰ دقیقه اخیر لازم است. لینک پس از ۵ دقیقه منقضی می‌شود و فقط یک‌بار قابل استفاده است.",
  state:"حالت",issued:"ثبت شده",expires:"انقضا",revoke:"لغو لینک استفاده‌نشده",downloaded:"دریافت‌شده",
  ready:"آماده",revoked:"لغوشده",expired:"منقضی",failure:"عملیات انجام نشد.",
  loading:"در حال بارگیری…",denied:"فقط مالک کلینیک با تأیید دومرحله‌ای به این بخش دسترسی دارد.",
  tryAgain:"تلاش دوباره",login:"ورود",goBack:"نمای کلی کلینیک",empty:"کلینیک فعال انتخاب نشده است.",
  days:"مدت پیشنهادی نگهداری",save:"ثبت پیشنهاد نگهداری",oneYear:"۱ سال",twoYears:"۲ سال",fiveYears:"۵ سال",tenYears:"۱۰ سال",
  retentionNotice:"این تنها یک پیشنهاد است و هیچ معلومات مریض، داده صحی، مالی یا تاریخچه امنیتی به‌طور خودکار حذف نمی‌شود. شرایط نگهداری باید پیش از نشر توسط متخصصان حقوقی تأیید شود.",
  accept:"می‌دانم که این تنظیم هیچ داده‌ای را حذف نمی‌کند.",saved:"پیشنهاد نگهداری ثبت شد.",completed:"فایل امن دریافت شد. آن را به‌شکل رمزگذاری‌شده نگهداری کنید.",
  refresh:"تازه‌سازی",date:"تاریخ",why:"دلیل",status:"حالت",noUrl:"لینک‌های قبلی قابل بازیابی یا نمایش دوباره نیستند.",
  reconnect:"اگر دوباره وارد شده‌اید، صفحه را تازه کنید.",ownerOnly:"مالک باید تأیید دومرحله‌ای را فعال کند.",
  blocked:"انتشار رسمی تا تأیید میزبانی، پشتیبان‌گیری، حقوقی و طبی مجاز نیست."
 },
 "ps-AF":{title:"د معلوماتو لېږد او ساتنه",eyebrow:"محرمیت او د معلوماتو کنټرول",
  intro:"د کلینیک د اداري معلوماتو یو ځل کارېدونکی او ثبت شوی فایل ترلاسه کړئ. دا حساس فایل دی، بشپړ طبي ریکارډ نه دی.",
  exports:"د صادرولو غوښتنې",retention:"د ساتنې وړاندیز",history:"د لاسرسي تاریخ",
  security:"امنیتي شرطونه",scope:"شامل دي: د ناروغانو نوملړ، لیدنې، بلونه او تادیات.",
  excluded:"شامل نه دي: طبي تاریخ، لاسلیک شوې لیدنې، د غاښونو چارت، عکسونه او یادښتونه.",
  noData:"تر اوسه صادرات نشته.",reason:"د صادرولو دلیل (۱۲–۲۴۰ توري)",reasonHint:"بېلګه: د اداري معلوماتو خوندي او کوډ شوې زېرمه.",
  request:"خوندي فایل جوړ او ښکته کړئ",confirm:"پوهېږم چې د ناروغانو معلومات حساس دي او فایل به خوندي ساتم.",
  urgent:"دوه پړاوه تایید او په تېرو ۱۰ دقیقو کې بیا ننوتل اړین دي. لینک له ۵ دقیقو وروسته ختمېږي او یو ځل کارېږي.",
  state:"حالت",issued:"جوړ شوی",expires:"پای",revoke:"ناکارول شوی لینک لغوه کړئ",downloaded:"ښکته شوی",
  ready:"چمتو",revoked:"لغوه شوی",expired:"پای ته رسېدلی",failure:"عملیات بشپړ نه شول.",
  loading:"معلومات بارېږي…",denied:"یوازې د کلینیک خاوند چې دوه پړاوه تایید لري لاسرسی لري.",
  tryAgain:"بیا هڅه",login:"ننوتل",goBack:"د کلینیک عمومي پاڼه",empty:"فعال کلینیک نه دی ټاکل شوی.",
  days:"د ساتنې وړاندیز شوې موده",save:"د ساتنې وړاندیز خوندي کړئ",oneYear:"۱ کال",twoYears:"۲ کاله",fiveYears:"۵ کاله",tenYears:"۱۰ کاله",
  retentionNotice:"دا یوازې وړاندیز دی. د ناروغانو طبي، مالي او امنیتي معلومات په اوتومات ډول نه پاکېږي. د قانوني تایید پرته د پاکولو قانون نه فعالېږي.",
  accept:"پوهېږم چې دا هېڅ معلومات نه پاکوي.",saved:"وړاندیز ثبت شو.",completed:"خوندي فایل ښکته شو. فایل کوډ شوي ځای کې وساتئ.",
  refresh:"بیا تازه",date:"نېټه",why:"دلیل",status:"حالت",noUrl:"پخواني لینکونه بیا نه ښودل کېږي.",
  reconnect:"که بیا ننوتلي یاست، دا پاڼه تازه کړئ.",ownerOnly:"خاوند باید دوه پړاوه تایید فعال کړي.",
  blocked:"تر قانوني، طبي، کوربه‌توب او بیک اپ تایید پورې تولیدي خپرونه بنده ده."
 }};
function showDate(value:string|null|undefined){return value?new Date(value).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}):"—";}
function errorText(value:unknown){return value instanceof Error?value.message:String(value);}
export function ClinicDataPortability(){
 const {locale}=usePreferences(),lang=locale in dictionary?locale as Lang:"en",t=(key:string)=>dictionary[lang][key]||key;
 const [ctx,setCtx]=useState<Context|null>(null),[space,setSpace]=useState<Space|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[success,setSuccess]=useState("");
 const [history,setHistory]=useState<History|null>(null),[retention,setRetention]=useState<Retention|null>(null);
 const [tab,setTab]=useState<"exports"|"retention"|"history">("exports");
 const [reason,setReason]=useState(""),[ack,setAck]=useState(false);
 const [days,setDays]=useState(1825),[understood,setUnderstood]=useState(false);
 async function refresh(clinicId:string){
  const [jobs,ret]=await Promise.all([
   call18<History>("/portability/clinics/"+encodeURIComponent(clinicId)+"/exports"),
   call18<Retention>("/portability/clinics/"+encodeURIComponent(clinicId)+"/retention")
  ]);setHistory(jobs);setRetention(ret);setDays(ret.requestedDays);
 }
 useEffect(()=>{let live=true;
  call18<Context>("/team/context").then(async c=>{
   if(!live)return;
   setCtx(c);
   const wanted=new URLSearchParams(location.search).get("clinic");
   const selected=(wanted?c.clinics.find(x=>x.clinicId===wanted):c.clinics[0])||null;
   setSpace(selected);
   if(selected?.role==="owner"){await refresh(selected.clinicId);}
  }).catch(e=>{if(live)setError(errorText(e))}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[]);
 async function requestExport(e:FormEvent){
  e.preventDefault();if(!space)return;
  setBusy(true);setError("");setSuccess("");
  try{
   const result=await call18<{downloadPath:string;job:{id:string}}>("/portability/clinics/"+space.clinicId+"/exports","POST",{
    scope:"administrative",reason,acknowledgeSensitive:ack
   });
   // Authenticated fetch avoids sharing token in browser history, link previews or referrers.
   const response=await fetch((process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000")+result.downloadPath,{
    credentials:"include",cache:"no-store",referrerPolicy:"no-referrer"
   });
   if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.code||"DOWNLOAD_FAILED");}
   const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");
   a.href=url;a.download="dandanlink-administrative-"+result.job.id+".json";a.click();
   setTimeout(()=>URL.revokeObjectURL(url),3000);
   setReason("");setAck(false);setSuccess(t("completed"));
   await refresh(space.clinicId);
  }catch(e){setError(errorText(e));if(space)await refresh(space.clinicId).catch(()=>{});}
  finally{setBusy(false);}
 }
 async function saveRetention(e:FormEvent){
  e.preventDefault();if(!space)return;setBusy(true);setError("");setSuccess("");
  try{
   await call18("/portability/clinics/"+space.clinicId+"/retention","PUT",{
    requestedDays:days,acknowledgeNoDeletion:understood
   });await refresh(space.clinicId);setSuccess(t("saved"));setUnderstood(false);
  }catch(e){setError(errorText(e));}finally{setBusy(false);}
 }
 async function revoke(id:string){
  if(!space)return;setBusy(true);setError("");setSuccess("");
  try{await call18("/portability/clinics/"+space.clinicId+"/exports/"+id+"/revoke","POST",{});
   await refresh(space.clinicId);
  }catch(e){setError(errorText(e));}finally{setBusy(false);}
 }
 if(loading)return <div className="p18-wrap"><InlineAlert>{t("loading")}</InlineAlert></div>;
 if(!ctx||!space)return <div className="p18-wrap"><InlineAlert kind="warning">{error||t("empty")}</InlineAlert>
  <a className="btn btn-secondary" href="/clinic">{t("goBack")}</a></div>;
 if(space.role!=="owner")return <Shell ctx={ctx} space={space} active="export">
  <InlineAlert kind="warning">{t("denied")}</InlineAlert></Shell>;
 const jobs=history?.jobs||[];
 return <Shell ctx={ctx} space={space} active="export"><div className="p18-wrap p19-wrap">
  <header className="p18-hero"><span className="p18-kicker">DANDANLINK · PH19</span>
   <h1>{t("title")}</h1><p>{space.clinicName} · {t("intro")}</p></header>
  <div className="p18-stats"><div className="p18-stat"><span>{t("exports")}</span>
   <strong>{jobs.length}</strong><small>{t("history")}</small></div>
   <div className="p18-stat"><span>{t("retention")}</span><strong>{days}</strong><small>{t("days")}</small></div></div>
  <div role="tablist" className="p18-tabs">{(["exports","retention","history"] as const).map(key=>
   <button type="button" role="tab" aria-selected={tab===key} key={key} onClick={()=>setTab(key)}>{t(key)}</button>)}</div>
  {error&&<InlineAlert kind="error">{error==="EXPORT_RECENT_LOGIN_REQUIRED"?t("urgent"):error}</InlineAlert>}
  {success&&<InlineAlert kind="success">{success}</InlineAlert>}
  {!ctx.mfaEnabled&&<InlineAlert kind="warning">{t("ownerOnly")}</InlineAlert>}
  {tab==="exports"&&<div className="p18-split">
   <section className="p18-panel"><h2>{t("security")}</h2>
    <p className="muted">{t("scope")}</p><p className="muted">{t("excluded")}</p>
    <InlineAlert kind="warning">{t("urgent")}</InlineAlert>
    <p className="p18-footnote">{t("blocked")}</p>
    <a className="btn btn-secondary" href={"/clinic/settings/security?clinic="+space.clinicId}>{t("security")} ↗</a>
   </section>
   <section className="p18-panel"><h2>{t("request")}</h2>
    <form className="p18-form" onSubmit={requestExport}>
     <label>{t("reason")}<textarea required minLength={12} maxLength={240}
      value={reason} placeholder={t("reasonHint")} onChange={e=>setReason(e.target.value)}/></label>
     <label className="p18-check"><input type="checkbox" required checked={ack}
      onChange={e=>setAck(e.target.checked)}/>{t("confirm")}</label>
     <button className="btn btn-primary" type="submit" disabled={busy||!ctx.mfaEnabled||!ack||reason.trim().length<12}>
      {busy?t("loading"):t("request")}</button>
    </form>
   </section>
  </div>}
  {tab==="retention"&&<section className="p18-panel"><h2>{t("retention")}</h2>
   <InlineAlert kind="warning">{t("retentionNotice")}</InlineAlert>
   <form className="p18-form p19-form" onSubmit={saveRetention}>
    <label>{t("days")}<select value={days} onChange={e=>setDays(Number(e.target.value))}>
     <option value={365}>{t("oneYear")}</option><option value={730}>{t("twoYears")}</option>
     <option value={1825}>{t("fiveYears")}</option><option value={3650}>{t("tenYears")}</option>
    </select></label>
    <label className="p18-check"><input type="checkbox" required checked={understood}
     onChange={e=>setUnderstood(e.target.checked)}/>{t("accept")}</label>
    <button type="submit" className="btn btn-primary" disabled={!understood||busy||!ctx.mfaEnabled}>{t("save")}</button>
   </form>
   <p className="p18-footnote">{t("status")}: {retention?.status||"—"} · {t("date")}: {showDate(retention?.updatedAt)}</p>
  </section>}
  {tab==="history"&&<section className="p18-panel"><div className="p19-head">
   <h2>{t("history")}</h2><button className="btn btn-secondary" type="button" disabled={busy}
    onClick={()=>refresh(space.clinicId).catch(e=>setError(errorText(e)))}>{t("refresh")}</button></div>
   {!jobs.length?<p className="muted">{t("noData")}</p>:
    <div className="p19-list">{jobs.map(job=><article className="p19-row" key={job.id}>
     <div><strong>{job.reason}</strong><small>{t("issued")}: {showDate(job.createdAt)} · {t("expires")}: {showDate(job.expiresAt)}</small></div>
     <div className="p19-actions"><span className={"p19-state "+job.status}>{t(job.status)}</span>
      {job.status==="ready"&&<button className="btn btn-secondary" disabled={busy}
       type="button" onClick={()=>revoke(job.id)}>{t("revoke")}</button>}</div>
    </article>)}</div>}
   <p className="p18-footnote">{t("noUrl")}</p>
  </section>}
 </div></Shell>;
}
