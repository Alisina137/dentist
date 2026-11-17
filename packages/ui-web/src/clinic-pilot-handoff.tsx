"use client";
import React,{useEffect,useState} from "react";
import {CareIcon,usePreferences} from "./index";
import {pilotHandoffFilename,clinicPilotHandoff,
 type PilotHandoffInput,type PilotHandoffReason} from "./clinic-pilot-handoff-model";

type Locale="en"|"fa-AF"|"ps-AF";
const messages={
 en:{
  eyebrow:"PHASE 19 · OPERATOR HANDOFF",title:"Pilot technical evidence handoff",
  body:"Capture a recent, redacted technical observation for an independent reviewer. It is not a launch approval.",
  notice:"Healthcare release: NO-GO until dated, signed independent evidence is reviewed.",
  ready:"Read-only snapshot ready",scope:"Clinic changed — refresh to confirm access",
  loading:"Checks still loading",stale:"Technical checks are more than five minutes old",
  unverified:"A check failed or its result could not be verified",
  pending:"External control signoffs: 9 unverified",detail:"No clinic or patient identifiers, notes, tokens, URLs or clinical records are exported.",
  passed:"Configured setup checks",action:"Setup checks needing attention",
  audit:"Observed audit events (latest 60 maximum)",notProof:"Audit counts do not prove complete coverage.",
  rerun:"Re-run live checks",download:"Download redacted JSON",hint:"Review, sign, and store independent evidence in an approved protected system, outside this application.",
  saved:"Technical observations only; release remains blocked."
 },
 "fa-AF":{
  eyebrow:"مرحله ۱۹ · سپردن شواهد",title:"بستهٔ شواهد فنی پایلوت",
  body:"خلاصهٔ فنی تازه و بدون هویت را برای بررسی مستقل دریافت کنید. این سند مجوز راه‌اندازی نیست.",
  notice:"راه‌اندازی خدمات صحی: ممنوع تا بررسی شواهد مستقل، تاریخ‌دار و امضاشده.",
  ready:"خلاصهٔ فقط‌خواندنی آماده است",scope:"کلینیک تغییر کرد؛ برای تأیید دسترسی بررسی کنید",
  loading:"بررسی‌ها هنوز جریان دارد",stale:"بیش از پنج دقیقه از بررسی گذشته است",
  unverified:"یک بررسی ناکام یا نامعلوم است",
  pending:"تأییدهای مستقل: ۹ مورد بررسی‌نشده",detail:"هیچ شناسهٔ کلینیک یا مریض، یادداشت، رمز، لینک یا سند طبی صادر نمی‌شود.",
  passed:"تنظیمات تکمیل‌شده",action:"تنظیمات نیازمند اقدام",
  audit:"رویدادهای مشاهده‌شدهٔ حسابرسی (حداکثر ۶۰)",notProof:"شمار رویدادها اثبات پوشش کامل حسابرسی نیست.",
  rerun:"بررسی دوباره",download:"دریافت JSON بدون هویت",hint:"شواهد مستقل باید در سیستم مصئون بیرون از این برنامه بررسی و امضا شوند.",
  saved:"فقط مشاهدات فنی؛ راه‌اندازی هنوز مسدود است."
 },
 "ps-AF":{
  eyebrow:"۱۹ پړاو · شواهد سپارل",title:"د پایلوت تخنیکي شواهد",
  body:"د خپلواکې کتنې لپاره تازه، بې هویته تخنیکي لنډیز واخلئ؛ دا د پیل اجازه نه ده.",
  notice:"د روغتیايي خدماتو پیل: د خپلواکو لاسلیک شويو شواهدو تر تایید پورې بند دی.",
  ready:"یوازې لوستل کېدونکی لنډیز چمتو دی",scope:"کلینیک بدل شوی؛ لاسرسی بیا وګورئ",
  loading:"کتنې روانې دي",stale:"له تخنیکي کتنې پنځه دقیقې تېرې دي",
  unverified:"یوې کتنې ناکامي کړې یا نه ده تایید شوې",
  pending:"خپلواکې تاییدنې: ۹ لا ناتایید",detail:"د کلینیک یا ناروغ پېژندنې، یادښتونه، رمزونه، پته یا طبي اسناد نه صادریږي.",
  passed:"بشپړ تنظیمات",action:"د اقدام وړ تنظیمات",
  audit:"لیدل شوې پلټنې (تر ۶۰ پېښو)",notProof:"د پېښو شمېر بشپړ امنیتي ثبت نه ثابتوي.",
  rerun:"بیا کتنه",download:"بې هویته JSON ښکته کول",hint:"خپلواک شواهد باید له اپ څخه بهر په خوندي سیستم کې وکتل او لاسلیک شي.",
  saved:"یوازې تخنیکي معلومات؛ پیل لا هم بند دی."
 }
} as const;
const reasonKey:Record<PilotHandoffReason,"ready"|"scope"|"loading"|"stale"|"unverified">={
 ready:"ready",scope:"scope",loading:"loading",stale:"stale",unverified:"unverified"
};

export function ClinicPilotHandoff({input,onRefresh}:{input:PilotHandoffInput;onRefresh:()=>void}){
 const {locale}=usePreferences();
 const t=messages[locale as Locale]||messages.en;
 const [,setClockTick]=useState(0);
 // Availability expires naturally even if the operator leaves this tab open.
 useEffect(()=>{
  const timer=window.setInterval(()=>setClockTick(value=>value+1),30000);
  return()=>window.clearInterval(timer);
 },[]);
 const result=clinicPilotHandoff(input);
 function exportPacket(){
  // Recalculate at click-time: a stale result or tenant switch never exports.
  const fresh=clinicPilotHandoff(input);
  if(!fresh.available||!fresh.packet)return;
  const blob=new Blob([JSON.stringify(fresh.packet,null,2)+"\n"],{
   type:"application/json;charset=utf-8"
  });
  const url=URL.createObjectURL(blob);
  try{
   const a=document.createElement("a");
   a.href=url;a.download=pilotHandoffFilename;
   document.body.appendChild(a);a.click();a.remove();
  }finally{
   window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
 }
 const setup=(result.packet?.operationalSetup||null) as {
  configured?:number;attentionNeeded?:number
 }|null;
 const audit=(result.packet?.auditWindow||null) as {observedEvents?:number}|null;
 return <section className="clinic-phase19-handoff" aria-labelledby="clinic-phase19-handoff-title">
  <div className="clinic-phase19-handoff-heading">
   <div><span className="clinic-phase19-eyebrow">
    <CareIcon name="shield-check" size={16}/>{t.eyebrow}</span>
    <h2 id="clinic-phase19-handoff-title">{t.title}</h2>
    <p>{t.body}</p></div>
   <span className="clinic-phase19-no-go"><CareIcon name="about" size={16}/>NO-GO</span>
  </div>
  <p className="clinic-phase19-warning" role="note">{t.notice}</p>
  <div className={"clinic-phase19-status"+(result.available?" is-ready":" is-unverified")}
   role="status" aria-live="polite">
   <CareIcon name={result.available?"check":"clock"} size={18}/>
   {t[reasonKey[result.reason]]}
  </div>
  {result.available&&<div className="clinic-phase19-facts" aria-label={t.ready}>
   <div><span>{t.passed}</span><strong>{setup?.configured}</strong></div>
   <div><span>{t.action}</span><strong>{setup?.attentionNeeded}</strong></div>
   <div><span>{t.audit}</span><strong>{audit?.observedEvents}</strong></div>
  </div>}
  <p className="clinic-phase19-notice">{t.pending} · {t.notProof}</p>
  <p className="clinic-phase19-privacy">{t.detail}</p>
  <div className="clinic-phase19-actions">
   <button type="button" className="btn btn-secondary" onClick={onRefresh}>
    <CareIcon name="activity" size={17}/>{t.rerun}</button>
   <button type="button" className="btn btn-primary" disabled={!result.available}
    onClick={exportPacket}><CareIcon name="file" size={17}/>{t.download}</button>
  </div>
  <p className="clinic-phase19-hint">{t.hint} {t.saved}</p>
 </section>;
}
