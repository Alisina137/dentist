"use client";
import React,{type FormEvent,type ReactNode} from "react";
import {CareIcon,usePreferences} from "./index";
type L="en"|"fa-AF"|"ps-AF";
const t:Record<L,Record<string,string>>={
 en:{search:"Search",searchHint:"Search name, clinic or city",sort:"Sort by",newest:"Newest first",oldest:"Oldest first",
  reset:"Clear search",prev:"Previous",next:"Next",items:"records",of:"of",page:"Page",
  all:"All",result:"Search results",count:"results",noItems:"No matching records. Adjust your filters.",
  changed:"Changed fields",unchanged:"Not changed",old:"Published",proposed:"Submitted",
  noPrevious:"Not previously published",confirmed:"Decision history",current:"Current"},
 "fa-AF":{search:"جستجو",searchHint:"نام، کلینیک یا شهر را جستجو کنید",sort:"ترتیب",newest:"جدیدترین",oldest:"قدیمی‌ترین",
  reset:"پاک‌کردن جستجو",prev:"قبلی",next:"بعدی",items:"مورد",of:"از",page:"صفحه",
  all:"همه",result:"نتایج جستجو",count:"نتیجه",noItems:"موردی یافت نشد؛ فیلترها را تغییر دهید.",
  changed:"موارد تغییریافته",unchanged:"بدون تغییر",old:"منتشرشده",proposed:"پیشنهادی",
  noPrevious:"قبلاً نشر نشده",confirmed:"تاریخچه تصمیم",current:"فعلی"},
 "ps-AF":{search:"لټون",searchHint:"نوم، کلینیک یا ښار ولټوئ",sort:"ترتیب",newest:"نوي لومړی",oldest:"زاړه لومړی",
  reset:"لټون پاکول",prev:"مخکینی",next:"راتلونکی",items:"موردونه",of:"له",page:"مخ",
  all:"ټول",result:"د لټون پایلې",count:"پایلې",noItems:"هیڅ مورد ونه موندل شو؛ فلټر بدل کړئ.",
  changed:"بدل شوي برخې",unchanged:"بدلون نشته",old:"خپور شوی",proposed:"سپارل شوی",
  noPrevious:"پخوا نه دی خپور شوی",confirmed:"د پریکړې تاریخ",current:"اوسنی"}
};
export function useModerationWords(){
 const {locale}=usePreferences();
 const lang=(locale in t?locale:"en") as L;
 return {lang,w:(key:string)=>t[lang][key]||t.en[key]||key};
}
export function QueueTools({draft,onDraftChange,onSubmit,onClear,sort,onSortChange,placeholder,actions}:{
 draft:string;onDraftChange:(v:string)=>void;onSubmit:()=>void;onClear:()=>void;
 sort:"newest"|"oldest";onSortChange:(v:"newest"|"oldest")=>void;
 placeholder?:string;actions?:ReactNode;
}){
 const {w}=useModerationWords();
 function submit(event:FormEvent){event.preventDefault();onSubmit();}
 return <div className="adm-c-tools">
  <form className="adm-c-search" role="search" onSubmit={submit}>
   <label className="adm-c-search-field"><CareIcon name="search" size={19}/>
    <input type="search" maxLength={100} value={draft} placeholder={placeholder||w("searchHint")}
     aria-label={w("search")} onChange={e=>onDraftChange(e.target.value)}/></label>
   <button type="submit" className="btn btn-primary">{w("search")}</button>
   {draft.trim().length>0&&<button type="button" className="btn btn-secondary"
    onClick={onClear} aria-label={w("reset")}><CareIcon name="close" size={16}/></button>}
  </form>
  <div className="adm-c-sort">
   <label>{w("sort")}<select aria-label={w("sort")} value={sort}
    onChange={e=>onSortChange(e.target.value as "newest"|"oldest")}>
    <option value="newest">{w("newest")}</option>
    <option value="oldest">{w("oldest")}</option></select></label>
   {actions}
  </div>
 </div>;
}
export function QueuePager({page,total,pageSize,onPage,loading=false}:{
 page:number;total:number;pageSize:number;onPage:(page:number)=>void;loading?:boolean;
}){
 const {lang,w}=useModerationWords();
 const f=(n:number)=>new Intl.NumberFormat(lang).format(n);
 const pages=Math.max(1,Math.ceil(total/pageSize));
 const lower=total?Math.min(total,(page-1)*pageSize+1):0,upper=Math.min(total,page*pageSize);
 return <nav aria-label={w("page")} className="adm-c-pager">
  <span role="status" aria-live="polite">{f(lower)}–{f(upper)} {w("of")} {f(total)} {w("items")}</span>
  <div className="adm-c-pager-actions">
   <button className="btn btn-secondary" type="button" disabled={loading||page<=1}
    onClick={()=>onPage(Math.max(1,page-1))}>{w("prev")}</button>
   <strong>{w("page")} {f(page)} / {f(pages)}</strong>
   <button className="btn btn-secondary" type="button" disabled={loading||page>=pages}
    onClick={()=>onPage(Math.min(pages,page+1))}>{w("next")}</button>
  </div>
 </nav>;
}
export function QueueEmpty(){
 const {w}=useModerationWords();
 return <div className="adm-c-empty"><CareIcon name="search" size={27}/>
  <p>{w("noItems")}</p></div>;
}
export function ListingDiff({approved,pending}:{approved:Record<string,unknown>|null;pending:Record<string,unknown>|null}){
 const {w}=useModerationWords();
 if(!pending)return null;
 const fields=Array.from(new Set([...Object.keys(approved||{}),...Object.keys(pending)])).filter(
  key=>JSON.stringify(approved?.[key])!==JSON.stringify(pending[key]));
 const label=(x:string)=>x.replace(/([a-z])([A-Z])/g,"$1 $2").replaceAll("_"," ");
 function value(x:unknown):string{
  if(x===null||x===undefined||x==="")return "—";
  if(Array.isArray(x))return x.map(item=>typeof item==="object"?"[item]":String(item)).join(", ")||"—";
  if(typeof x==="object")return Object.entries(x).map(([k,v])=>label(k)+": "+String(v)).join(" · ");
  return String(x);
 }
 return <section className="adm-c-diff" aria-label={w("changed")}>
  <h3>{w("changed")} <span className="adm-c-diff-count">{fields.length}</span></h3>
  {fields.length===0?<p>{w("unchanged")}</p>:
   <div className="adm-c-diff-table" role="table">
    <div role="row" className="adm-c-diff-table-head"><span role="columnheader">{w("changed")}</span>
     <span role="columnheader">{w("old")}</span><span role="columnheader">{w("proposed")}</span></div>
    {fields.map(key=><div role="row" className="adm-c-diff-row" key={key}>
     <strong role="cell">{label(key)}</strong><span role="cell">{value(approved?.[key])}</span>
     <span role="cell" className="adm-c-diff-new">{value(pending[key])}</span>
    </div>)}
   </div>}
 </section>;
}
