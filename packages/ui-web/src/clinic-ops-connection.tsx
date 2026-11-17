"use client";
import React,{useEffect,useState} from "react";
import {CareIcon,usePreferences} from "./index";
const messages={
 en:{
  offline:"You're offline. Previously loaded clinic information may be outdated.",
  online:"Network connection restored. Refresh to retrieve the latest clinic information.",
  retry:"Refresh this section",check:"Connection status",live:"Connected"
 },
 "fa-AF":{
  offline:"اتصال اینترنت قطع است. معلومات کلینیک ممکن است تازه نباشد.",
  online:"ارتباط دوباره برقرار شد. برای دریافت معلومات جدید تازه‌سازی کنید.",
  retry:"تازه‌سازی این بخش",check:"وضعیت اتصال",live:"متصل"
 },
 "ps-AF":{
  offline:"انټرنیټ نشته. د کلینیک مخکې پورته شوي معلومات ښايي زاړه وي.",
  online:"اړیکه بېرته جوړه شوه. د تازه معلوماتو لپاره بیا تازه کړئ.",
  retry:"دا برخه تازه کړئ",check:"د اړیکې حالت",live:"نښلول شوی"
 }
} as const;
/**
 * Browser navigator.onLine is only a hint, never proof that a server or
 * database is reachable. Reconnection never silently replays a POST.
 */
export function ClinicOpsConnection({onRefresh}:{onRefresh?:()=>void}){
 const {locale}=usePreferences();
 const t=messages[locale as keyof typeof messages]||messages.en;
 const [connection,setConnection]=useState<"unverified"|"offline"|"reconnected">("unverified");
 useEffect(()=>{
  const down=()=>setConnection("offline");
  const up=()=>setConnection(old=>old==="offline"?"reconnected":"unverified");
  if(!navigator.onLine)down();
  window.addEventListener("offline",down);
  window.addEventListener("online",up);
  return()=>{
   window.removeEventListener("offline",down);
   window.removeEventListener("online",up);
  };
 },[]);
 if(connection==="unverified")return null;
 return <div className={"clinic-phase15-connectivity"+(
  connection==="offline"?" is-offline":" is-reconnected")}
  role="status" aria-live="polite">
  <CareIcon name={connection==="offline"?"about":"shield-check"} size={19}/>
  <span>{connection==="offline"?t.offline:t.online}</span>
  {connection==="reconnected"&&onRefresh&&
   <button type="button" className="btn btn-secondary"
    onClick={()=>{setConnection("unverified");onRefresh();}}>
    <CareIcon name="activity" size={16}/>{t.retry}</button>}
 </div>;
}
