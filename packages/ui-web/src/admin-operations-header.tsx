"use client";
import React,{useEffect,useRef,useState} from "react";
import {CareIcon,usePreferences} from "./index";
import {adminWord,getAdminOps,type SearchResult,type OperationsSummary} from "./admin-operations-shared";

export function AdminHeaderTools(){
 const {locale}=usePreferences(),t=(key:string)=>adminWord(locale,key);
 const [open,setOpen]=useState(false),[alertsOpen,setAlertsOpen]=useState(false);
 const [query,setQuery]=useState(""),[results,setResults]=useState<SearchResult[]>([]);
 const [searchBusy,setSearchBusy]=useState(false),[searchError,setSearchError]=useState("");
 const [ops,setOps]=useState<OperationsSummary|null>(null),[opsError,setOpsError]=useState("");
 const searchButton=useRef<HTMLButtonElement>(null),input=useRef<HTMLInputElement>(null);
 const alertButton=useRef<HTMLButtonElement>(null),alertContainer=useRef<HTMLDivElement>(null);
 const modal=useRef<HTMLDivElement>(null);
 function close(){setOpen(false);setQuery("");setResults([]);setSearchError("");searchButton.current?.focus();}
 useEffect(()=>{
  const key=(event:KeyboardEvent)=>{
   if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){
    event.preventDefault();setAlertsOpen(false);setOpen(value=>!value);
   }else if(event.key==="Escape"){
    setOpen(false);setAlertsOpen(false);
   }
  };
  window.addEventListener("keydown",key);
  return()=>window.removeEventListener("keydown",key);
 },[]);
 useEffect(()=>{
  if(!open)return;
  input.current?.focus();
  const trap=(event:KeyboardEvent)=>{
   if(event.key!=="Tab")return;
   const els=Array.from(modal.current?.querySelectorAll<HTMLElement>(
    'input:not([disabled]),button:not([disabled]),a[href]')||[])
    .filter(node=>node.getClientRects().length>0);
   if(!els.length)return;
   const first=els[0],last=els[els.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  window.addEventListener("keydown",trap);
  return()=>window.removeEventListener("keydown",trap);
 },[open,results]);
 useEffect(()=>{
  const closeOnOutside=(event:PointerEvent)=>{
   if(alertsOpen&&!alertContainer.current?.contains(event.target as Node)&&
      !alertButton.current?.contains(event.target as Node))setAlertsOpen(false);
  };
  document.addEventListener("pointerdown",closeOnOutside);
  return()=>document.removeEventListener("pointerdown",closeOnOutside);
 },[alertsOpen]);
 useEffect(()=>{
  if(!open||query.trim().length<2){setResults([]);setSearchError("");setSearchBusy(false);return;}
  const controller=new AbortController();
  setSearchBusy(true);setSearchError("");
  const timer=setTimeout(()=>{
   getAdminOps<{results:SearchResult[]}>("/search?q="+encodeURIComponent(query.trim()),controller.signal)
    .then(data=>setResults(data.results)).catch(e=>{
     if(!controller.signal.aborted)setSearchError(e instanceof Error?e.message:"SEARCH_UNAVAILABLE");
    }).finally(()=>{if(!controller.signal.aborted)setSearchBusy(false);});
  },270);
  return()=>{clearTimeout(timer);controller.abort();};
 },[open,query]);
 useEffect(()=>{
  let alive=true;let controller:AbortController|null=null;
  function update(){
   if(document.visibilityState!=="visible")return;
   controller?.abort();controller=new AbortController();
   getAdminOps<OperationsSummary>("/overview",controller.signal)
    .then(data=>{if(alive){setOps(data);setOpsError("");}})
    .catch(e=>{if(alive&&!controller?.signal.aborted){setOps(null);
     setOpsError(e instanceof Error?e.message:"OPS_UNAVAILABLE");}});
  }
  update();
  const timer=window.setInterval(update,90000);
  const visible=()=>{if(document.visibilityState==="visible")update();};
  document.addEventListener("visibilitychange",visible);
  return()=>{alive=false;controller?.abort();window.clearInterval(timer);
   document.removeEventListener("visibilitychange",visible);};
 },[]);
 const notices=ops?.alerts.filter(item=>!item.snoozedUntil).slice(0,4)||[];
 return <>
  <div className="adm-e-header-controls">
   <button className="adm-e-search-trigger" type="button" ref={searchButton}
    onClick={()=>{setOpen(true);setAlertsOpen(false);}}
    aria-label={t("search")} aria-haspopup="dialog" aria-expanded={open}>
    <CareIcon name="search" size={18}/><span>{t("search")}</span>
    <kbd>⌘ K</kbd>
   </button>
   <div className="adm-e-bell-wrapper">
    <button ref={alertButton} className="adm-e-bell-trigger" type="button"
     aria-label={t("alerts")} aria-expanded={alertsOpen} aria-controls="adm-e-bell-popover"
     onClick={()=>{setAlertsOpen(v=>!v);setOpen(false);}}>
     <CareIcon name="bell" size={19}/>
     {ops&&ops.activeCount>0&&<span className="adm-e-alert-badge" aria-label={t("badge")}>
      {ops.activeCount>9?"9+":ops.activeCount}</span>}
     {opsError&&<span className="adm-e-bell-failed" aria-hidden="true">!</span>}
    </button>
    {alertsOpen&&<div ref={alertContainer} className="adm-e-bell-popover" id="adm-e-bell-popover">
     <header><strong>{t("alerts")}</strong><button type="button" aria-label={t("close")}
      onClick={()=>setAlertsOpen(false)}><CareIcon name="close" size={17}/></button></header>
     {opsError?<p role="alert">{t("failed")}</p>:!ops?
      <p role="status">{t("loading")}</p>:notices.length?
      <div className="adm-e-bell-list">{notices.map(item=><a href={item.href} key={item.key}
       onClick={()=>setAlertsOpen(false)}>
       <span className={"adm-e-alert-dot is-"+item.severity}/>
       <span><strong>{t(item.key)}</strong><small>{item.count} {t("results")}</small></span>
      </a>)}</div>:<p>{t("noAlerts")}</p>}
     <a className="adm-e-bell-footer" href="/admin/alerts"
      onClick={()=>setAlertsOpen(false)}>{t("viewAll")} →</a>
    </div>}
   </div>
  </div>
  {open&&<div className="adm-e-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}>
   <div className="adm-e-command" role="dialog" aria-modal="true"
    aria-label={t("searchTitle")} ref={modal}>
    <header><strong>{t("searchTitle")}</strong><button type="button"
     onClick={close} aria-label={t("close")}><CareIcon name="close" size={20}/></button></header>
    <div className="adm-e-command-input"><CareIcon name="search" size={20}/>
     <input ref={input} autoComplete="off" type="search" maxLength={80}
      value={query} onChange={e=>setQuery(e.target.value)}
      placeholder={t("searchPlaceholder")} aria-label={t("search")}/>
     <kbd>ESC</kbd>
    </div>
    <p className="adm-e-command-hint">{t("searchHint")}</p>
    <div className="adm-e-command-results" aria-live="polite">
     {query.trim().length<2?<p>{t("searchShort")}</p>:
      searchBusy?<p role="status">{t("searchLoading")}</p>:
      searchError?<p role="alert">{t("searchError")} · {searchError}</p>:
      results.length===0?<p>{t("searchEmpty")}</p>:
      results.map(item=><a key={item.type+"-"+item.id} href={item.href}
       onClick={()=>{setOpen(false);setQuery("");}}>
       <span className="adm-e-result-icon">
        <CareIcon name={({clinics:"hospital",dentists:"badge-check",listings:"images",
         invoices:"credit-card",tickets:"life-buoy"} as const)[item.type]} size={18}/></span>
       <span className="adm-e-result-copy"><strong>{item.title}</strong>
        <small>{t(item.type)} · {item.detail}</small></span>
       <span className="adm-e-result-status">{item.status.replaceAll("_"," ")}</span>
       <CareIcon name="arrow" size={15}/>
      </a>)}
    </div>
   </div>
  </div>}
 </>;
}
