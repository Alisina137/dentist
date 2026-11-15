"use client";
import React,{useEffect,useState} from "react";
import {InlineAlert} from "./index";
import {call18,useWords} from "./phase18";
type Report={controls:{id:string;complete:boolean}[];passCount:number;overall:string;releaseEnabled:boolean;caveat:string};
const labels:Record<string,Record<string,string>>={
 en:{title:"Pilot readiness",intro:"Operational launch gates for verified clinics. Missing approvals remain release blockers.",
  legalPrivacy:"Legal privacy & retention",clinicalReview:"Clinical review & guardian consent",
  hostingEncryption:"Hosting, encryption & PHI controls",backupRestore:"Production backup & recovery",
  penetrationTest:"Penetration & authorization audit",accessReview:"Admin/staff access review",
  criticalAlerts:"On-call alerts & incident response",accessibilityRTL:"Device accessibility & RTL localization",
  pilotRoster:"Five-to-ten-clinic pilot roster",complete:"Operator marked complete",blocked:"Not approved",
  approve:"No-go until every gate has dated, independently verified evidence.",
  reload:"Refresh gate checks",error:"Could not load current operational evidence.",
  pass:"Operator marked ready — human sign-off evidence is still mandatory.",
  note:"These indicators come from operator environment configuration, not automatic proof of certification.",
  evidence:"Approval runbook",score:"Controls marked complete"},
 "fa-AF":{title:"آمادگی آزمایشی",intro:"شرایط نشر آزمایشی برای کلینیک‌های تأییدشده. هر تأیید ناقص مانع نشر است.",
  legalPrivacy:"تأیید حقوقی و محرمیت",clinicalReview:"بازبینی طبی و رضایت سرپرست",
  hostingEncryption:"میزبانی، رمزگذاری و محرمیت صحی",backupRestore:"پشتیبان‌گیری و بازیابی واقعی",
  penetrationTest:"آزمون نفوذ و دسترسی",accessReview:"بازبینی دسترسی مدیران و کارمندان",
  criticalAlerts:"هشدارها و پاسخ به حوادث",accessibilityRTL:"دسترسی‌پذیری و راست‌به‌چپ",
  pilotRoster:"فهرست ۵ تا ۱۰ کلینیک",complete:"توسط مسئول تکمیل نشان شده",blocked:"هنوز تأیید نشده",
  approve:"تا تأیید مستقل و ثبت مستندات، نشر مجاز نیست.",reload:"تازه‌سازی شرایط",error:"بارگیری وضعیت ممکن نیست.",
  pass:"آماده به تأیید مسئول؛ اسناد رسمی هنوز ضروری است.",note:"این علایم از تنظیمات مسئول می‌آید و تأیید مستقل نیست.",
  evidence:"رهنمود تأیید",score:"شرایط ثبت‌شده"},
 "ps-AF":{title:"د ازمایښتي پیل چمتووالی",intro:"د تایید شوو کلینیکونو لپاره د پیل شرایط. هر نیمګړی شرط پیل بندوي.",
  legalPrivacy:"قانوني محرمیت او ساتنه",clinicalReview:"طبي ارزونه او د سرپرست رضا",
  hostingEncryption:"کوربه‌توب، کوډ کول او محرمیت",backupRestore:"ریښتینی بیک اپ او بېرته راګرځول",
  penetrationTest:"د امنیتي نفوذ او اجازو ازموینه",accessReview:"د کارکوونکو د لاسرسي ارزونه",
  criticalAlerts:"خبرتیاوې او د پېښو ځواب",accessibilityRTL:"لاسرسی او ښي-څخه-چپ ژبه",
  pilotRoster:"د ۵ تر ۱۰ کلینیکونو نوملړ",complete:"د مسئول له خوا بشپړ ښوول شوی",blocked:"لا نه دی تایید شوی",
  approve:"تر خپلواک او مستند تایید پورې پیل مه کوئ.",reload:"شرایط تازه کړئ",error:"حالت نه پورته کېږي.",
  pass:"د مسئول له خوا چمتو ښوول شوی؛ رسمي اسناد لا هم اړین دي.",
  note:"دا نښې د تنظیماتو څخه دي، خپلواک تصدیق نه دی.",evidence:"د تایید لارښود",score:"ثبت شوي شرایط"}};
export function AdminPilotReadiness(){
 const {lang}=useWords(),t=(key:string)=>labels[lang]?.[key]||labels.en[key]||key;
 const [data,setData]=useState<Report|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function reload(){setBusy(true);setError("");
  try{setData(await call18<Report>("/portability/admin/readiness"));}catch(e){setData(null);setError((e as Error).message);}
  finally{setBusy(false);}}
 useEffect(()=>{void reload();},[]);
 return <div className="p18-wrap">
  <div className="p19-head"><h2>{t("title")}</h2><button type="button" className="btn btn-secondary"
   onClick={()=>void reload()} disabled={busy}>{t("reload")}</button></div>
  {error&&<InlineAlert kind="error">{t("error")} ({error})</InlineAlert>}
  {busy&&<p role="status" className="muted">{t("reload")}…</p>}
  {data&&<>
   <div className="p18-stats"><div className="p18-stat"><span>{t("score")}</span>
    <strong>{data.passCount}/{data.controls.length}</strong></div>
    <div className="p18-stat"><span>{t("title")}</span>
     <strong style={{fontSize:"1.1rem"}}>{data.releaseEnabled?t("pass"):t("blocked")}</strong></div></div>
   <InlineAlert kind={data.releaseEnabled?"success":"warning"}>{t("approve")}</InlineAlert>
   <p className="p18-footnote">{t("note")}</p>
   <section className="p18-panel"><div className="p19-list">{data.controls.map(item=>
    <article className="p19-row" key={item.id}><strong>{t(item.id)}</strong>
     <span className={"p19-state "+(item.complete?"downloaded":"expired")}>
      {item.complete?t("complete"):t("blocked")}</span>
    </article>)}</div></section>
  </>}
  <div className="p18-panel"><h2>{t("evidence")}</h2>
   <p className="muted">{t("intro")}</p><p className="p18-footnote">docs/PH19-PILOT-RUNBOOK.md · docs/PH19-ACCEPTANCE.md</p>
  </div>
 </div>;
}
