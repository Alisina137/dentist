"use client";
import React,{useEffect,useState} from "react";
import {CareIcon,InlineAlert,usePreferences,type CareIconName} from "./index";
import {adminWord,changeSnooze,getAdminOps,type OperationsSummary,type AlertItem,
 type AlertKey} from "./admin-operations-shared";

type Signal="supportOpened"|"invoicesConfirmed"|"accessFailures";
function SeverityIcon({severity}:{severity:"critical"|"warning"|"info"}){
 return <CareIcon name={severity==="critical"?"shield":severity==="warning"?"bell":"activity"} size={20}/>;
}
function TrendPanel({data,locale,calendar,t}:{
 data:OperationsSummary["activityTrend"];locale:string;calendar:string;
 t:(key:string)=>string;
}){
 const [metric,setMetric]=useState<Signal>("supportOpened");
 const f=(x:number)=>new Intl.NumberFormat(locale).format(x);
 const day=(v:string)=>new Intl.DateTimeFormat(locale,{timeZone:"Asia/Kabul",
  calendar:calendar==="solar_hijri"?"persian":"gregory",day:"numeric",month:"short"})
  .format(new Date(v+"T12:00:00Z"));
 const values=data.map(row=>row[metric]),max=Math.max(1,...values);
 const pts=values.map((value,i)=>({
  x:52+i*744/Math.max(1,data.length-1),y:175-145*value/max
 }));
 const line=pts.map((p,i)=>(i?"L":"M")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
 const allZero=values.every(x=>x===0);
 return <section className="adm-e-card adm-e-trend" aria-label={t("dailyTrend")}>
  <header><div><h2>{t("dailyTrend")}</h2><p>{t("trendDescription")}</p></div>
   <span className="adm-e-chip">{t("timeKabul")}</span></header>
  <div className="adm-e-trend-tabs" role="group" aria-label={t("dailyTrend")}>
   {(["supportOpened","invoicesConfirmed","accessFailures"] as const).map(x=>
    <button key={x} type="button" aria-pressed={metric===x}
     onClick={()=>setMetric(x)}>{t(x)}</button>)}
  </div>
  <div className="adm-e-chart">
   <svg role="img" aria-label={t(metric)+": "+f(values.reduce((a,b)=>a+b,0))}
    viewBox="0 0 850 225" preserveAspectRatio="xMidYMid meet">
    {[0,1,2,3].map(i=><g key={i}>
     <line x1="52" x2="796" y1={30+i*145/3} y2={30+i*145/3}
      stroke="#dfebee" strokeDasharray="4 5"/>
     <text x="43" textAnchor="end" y={34+i*145/3} fontSize="12"
      fill="#6c8390">{f(Math.round(max*(3-i)/3))}</text>
    </g>)}
    {!allZero&&<path d={line} fill="none" stroke="#0e8191" strokeWidth="3.2"
     strokeLinecap="round" strokeLinejoin="round"/>}
    {data.map((d,i)=>i===0||i===data.length-1||i===4||i===9?
     <text key={d.day} x={pts[i].x} y="209" textAnchor={i===0?"start":i===data.length-1?"end":"middle"}
      fontSize="12" fill="#607987">{day(d.day)}</text>:null)}
   </svg>
   {allZero&&<p className="adm-e-chart-empty">{t("emptyChart")}</p>}
  </div>
  <details className="adm-e-chart-table"><summary>{t("chartTable")}</summary>
   <div><table><thead><tr><th>{t("date")}</th><th>{t(metric)}</th></tr></thead>
    <tbody>{data.map(row=><tr key={row.day}><td>{day(row.day)}</td>
     <td>{f(row[metric])}</td></tr>)}</tbody></table></div>
  </details>
 </section>;
}
export function AdminOperationsPage({view}:{view:"alerts"|"monitoring"}){
 const {locale,calendar}=usePreferences(),t=(key:string)=>adminWord(locale,key);
 const n=(v:number)=>new Intl.NumberFormat(locale).format(v);
 const stamp=(v:string)=>new Intl.DateTimeFormat(locale,{timeZone:"Asia/Kabul",
  dateStyle:"medium",timeStyle:"short"}).format(new Date(v));
 const [data,setData]=useState<OperationsSummary|null>(null),[error,setError]=useState("");
 const [reload,setReload]=useState(0),[loading,setLoading]=useState(true);
 const [busyKey,setBusyKey]=useState<AlertKey|null>(null),[message,setMessage]=useState("");
 const [filter,setFilter]=useState<"all"|"active"|"snoozed">("active");
 useEffect(()=>{
  const timer=window.setInterval(()=>{
   if(document.visibilityState==="visible")setReload(x=>x+1);
  },90000);
  return()=>window.clearInterval(timer);
 },[]);
 useEffect(()=>{
  const controller=new AbortController(),alive={yes:true};
  setError("");setLoading(true);
  getAdminOps<OperationsSummary>("/overview",controller.signal)
   .then(d=>{if(alive.yes)setData(d);})
   .catch(e=>{if(alive.yes&&!controller.signal.aborted){
    setData(null);setError(e instanceof Error?e.message:"OPS_UNAVAILABLE");
   }}).finally(()=>{if(alive.yes)setLoading(false);});
  return()=>{alive.yes=false;controller.abort();};
 },[reload]);
 async function snooze(alert:AlertItem){
  if(busyKey)return;
  setBusyKey(alert.key);setMessage("");setError("");
  try{await changeSnooze(alert.key,alert.snoozedUntil?"unsnooze":"snooze");
   setMessage(t("success"));setReload(x=>x+1);
  }catch(e){setError(t("failure")+(e instanceof Error?" · "+e.message:""))}
  finally{setBusyKey(null)}
 }
 const alerts=data?.alerts.filter(a=>filter==="all"||(filter==="active"?!a.snoozedUntil:!!a.snoozedUntil))||[];
 const tiles=data?[{key:"pendingClinics",href:"/admin/clinics?status=pending",icon:"hospital" as CareIconName},
  {key:"pendingListings",href:"/admin/listings?status=pending",icon:"images" as CareIconName},
  {key:"openTickets",href:"/admin/support?status=open",icon:"life-buoy" as CareIconName},
  {key:"paidInvoices14",href:"/admin/subscriptions?status=paid",icon:"credit-card" as CareIconName}]:[];
 return <main className="adm-e-page">
  <header className="adm-e-page-header"><div><span className="adm-e-eyebrow">DANDANLINK · OPERATIONS</span>
   <h1>{t(view==="alerts"?"alertsTitle":"monitoringTitle")}</h1>
   <p>{t(view==="alerts"?"alertsSubtitle":"monitoringSubtitle")}</p></div>
   <button type="button" className="btn btn-secondary" onClick={()=>setReload(x=>x+1)}
    disabled={loading}><CareIcon name="activity" size={17}/>{t("refresh")}</button>
  </header>
  <nav className="adm-e-page-tabs" role="tablist" aria-label={t("monitoring")}>
   <a role="tab" aria-selected={view==="alerts"} href="/admin/alerts"><CareIcon name="bell" size={17}/>{t("alertsCenter")}</a>
   <a role="tab" aria-selected={view==="monitoring"} href="/admin/monitoring">
    <CareIcon name="activity" size={17}/>{t("monitoring")}</a>
  </nav>
  {message&&<InlineAlert kind="success">{message}</InlineAlert>}
  {error&&<InlineAlert kind="error">{t("failed")} · {error}</InlineAlert>}
  {!data?loading?<section className="admin-page-loading" role="status" aria-label={t("loading")}>
    <div className="admin-loading-grid">{[1,2,3,4].map(x=><div className="admin-loading-card" key={x}/>)}</div>
    <div className="admin-loading-card admin-loading-wide"/></section>:
   <button type="button" className="btn btn-primary" onClick={()=>setReload(x=>x+1)}>{t("retry")}</button>:
  <>
   <div className="adm-e-updated"><CareIcon name="clock" size={15}/>
    {t("observed")}: {stamp(data.generatedAt)} · {t("timeKabul")}</div>
   {view==="alerts"?<>
    <section className="adm-e-alert-top">
     <div className="adm-e-count-card"><span>{t("count")}</span>
      <strong>{n(data.activeCount)}</strong><small>{t("active")}</small></div>
     <div className="adm-e-count-card is-critical"><span>{t("critical")}</span>
      <strong>{n(data.criticalCount)}</strong><small>{t("active")}</small></div>
     <div className="adm-e-count-card"><span>{t("snoozed")}</span>
      <strong>{n(data.alerts.length-data.activeCount)}</strong>
      <small>{t("acknowledgeNote")}</small></div>
    </section>
    <div className="adm-e-alert-filters" role="group" aria-label={t("alerts")}>
     {(["active","all","snoozed"] as const).map(key=><button key={key} type="button"
      aria-pressed={filter===key} onClick={()=>setFilter(key)}>{t(key)}</button>)}
    </div>
    <section className="adm-e-alert-list" aria-label={t("alerts")}>
     {!alerts.length?<div className="adm-e-card adm-e-no-alert">
      <CareIcon name="shield-check" size={28}/><h2>{t("noAlerts")}</h2>
      <p>{t("noAlertsDetail")}</p></div>:
      alerts.map(item=><article className={"adm-e-alert-card is-"+item.severity+
        (item.snoozedUntil?" is-snoozed":"")} key={item.key}>
       <span className="adm-e-alert-symbol"><SeverityIcon severity={item.severity}/></span>
       <div className="adm-e-alert-description">
        <div className="adm-e-alert-title-row"><h2>{t(item.key)}</h2>
         <span className={"adm-e-severity is-"+item.severity}>{t(item.severity)}</span></div>
        <p>{t(item.key+"_detail")}</p>
        <span className="adm-e-alert-affected">{n(item.count)} {t("results")}</span>
        {item.snoozedUntil&&<small>{t("snoozed")} · {stamp(item.snoozedUntil)}</small>}
       </div>
       <div className="adm-e-alert-actions">
        <a href={item.href} className="btn btn-primary">{t("goTo")} →</a>
        <button type="button" className="btn btn-secondary" disabled={!!busyKey}
         onClick={()=>void snooze(item)}>{t(item.snoozedUntil?"unsnooze":"snooze")}</button>
       </div>
      </article>)}
    </section>
    <p className="adm-e-legal-note"><CareIcon name="shield" size={16}/>{t("acknowledgeNote")}</p>
   </>:<>
    <section className="adm-e-metric-tiles">{tiles.map(tile=><a key={tile.key} href={tile.href}>
     <span><CareIcon name={tile.icon} size={19}/></span>
     <strong>{n(data.metrics[tile.key as keyof typeof data.metrics])}</strong>
     <small>{t(tile.key)}</small></a>)}</section>
    <div className="adm-e-monitor-grid">
     <section className="adm-e-card adm-e-health">
      <header><h2>{t("systemChecks")}</h2></header>
      <div className="adm-e-health-status"><CareIcon name="check" size={19}/>
       <span>{t("reachable")}</span><strong>{t("active")}</strong></div>
      <div className="adm-e-health-status is-warning"><CareIcon name="shield" size={19}/>
       <span>{data.checks.pilotReleaseEnabled?t("readyFlag"):t("notReady")}</span>
       <strong>{data.checks.pilotReleaseEnabled?t("active"):t("warning")}</strong></div>
      <p className="adm-e-legal-note">{t("releaseNote")}</p>
      <a href="/admin/pilot">{t("goTo")} →</a>
     </section>
     <section className="adm-e-card adm-e-mini-alerts">
      <header><h2>{t("alerts")}</h2>
       <a href="/admin/alerts">{t("viewAll")} →</a></header>
      {data.alerts.filter(item=>!item.snoozedUntil).slice(0,5).map(item=>
       <a href={item.href} key={item.key}><span className={"adm-e-alert-dot is-"+item.severity}/>
        <strong>{t(item.key)}</strong><span>{n(item.count)}</span></a>)}
      {data.activeCount===0&&<p>{t("noAlerts")}</p>}
     </section>
    </div>
    <TrendPanel data={data.activityTrend} locale={locale} calendar={calendar} t={t}/>
    <section className="adm-e-card adm-e-events">
     <header><h2>{t("recentTitle")}</h2></header>
     {data.recentActions.length===0?<p>{t("recentEmpty")}</p>:
      <ol>{data.recentActions.map((event,i)=><li key={i}>
       <strong>{event.action.replace(/[._]/g," ")}</strong>
       <span>{event.outcome}</span>
       <time>{stamp(event.at)}</time></li>)}</ol>}
    </section>
   </>}
   <p className="adm-e-legal-note"><CareIcon name="shield" size={16}/>{t("privacy")}</p>
  </>}
 </main>;
}
