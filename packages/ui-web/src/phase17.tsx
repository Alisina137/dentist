"use client";
import React,{useEffect,useState} from "react";
import {usePreferences,InlineAlert} from "./index";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
type Lang="en"|"fa-AF"|"ps-AF";
const dictionary={
 en:{title:"Verified patient reviews",subtitle:"Only patients with completed appointments can review their care.",
 eligible:"Completed visits",mine:"My reviews",notices:"Updates",submit:"Submit review",
 headline:"Short headline",feedback:"Describe your experience without personal or medical information.",
 privacy:"Do not include names, phone numbers, diagnoses, or medical records.",
 rating:"Rating",edit:"Edit",withdraw:"Withdraw",appeal:"Appeal decision",
 confirm:"Confirm",retry:"Retry",empty:"Nothing to show here yet.",pending:"Awaiting impartial moderation",
 published:"Published",rejected:"Rejected",loading:"Loading…",reason:"Reason",
 reports:"Reports",appeals:"Appeals",queue:"Pending reviews",approve:"Publish",reject:"Reject",
 dismiss:"Dismiss report",remove:"Remove for policy violation",uphold:"Uphold rejection",
 overturn:"Overturn rejection",modNote:"Policy reason (at least 15 characters)",
 category:"Policy category",success:"Saved successfully",report:"Report review",noReviews:"No published reviews yet.",
 verified:"Verified completed appointment",reviewCount:"verified reviews",average:"Average",
 reportHelp:"Report a specific policy problem. Low ratings are not a reason for removal.",
 reviewRules:"Negative but policy-compliant reviews are allowed."},
 "fa-AF":{title:"نظرات تأییدشده مریضان",subtitle:"تنها مریضان با نوبت تکمیل‌شده می‌توانند نظر بدهند.",
 eligible:"ملاقات‌های تکمیل‌شده",mine:"نظرات من",notices:"اطلاعیه‌ها",submit:"ثبت نظر",
 headline:"عنوان کوتاه",feedback:"تجربه خود را بدون معلومات شخصی یا صحی بنویسید.",
 privacy:"نام، شماره تلفن، تشخیص یا اسناد صحی را درج نکنید.",
 rating:"امتیاز",edit:"ویرایش",withdraw:"پس گرفتن",appeal:"درخواست تجدیدنظر",
 confirm:"تأیید",retry:"دوباره کوشش",empty:"فعلاً چیزی موجود نیست.",pending:"در انتظار بررسی بی‌طرفانه",
 published:"نشرشده",rejected:"ردشده",loading:"در حال بارگذاری…",reason:"دلیل",
 reports:"گزارش‌ها",appeals:"تجدیدنظرها",queue:"نظرات در انتظار",approve:"نشر",reject:"رد",
 dismiss:"رد گزارش",remove:"حذف به علت تخلف از پالیسی",uphold:"تأیید رد",
 overturn:"لغو تصمیم رد",modNote:"دلیل مطابق پالیسی (حداقل ۱۵ حرف)",
 category:"دسته تخلف",success:"با موفقیت ذخیره شد",report:"گزارش نظر",
 noReviews:"هنوز نظری نشر نشده است.",verified:"ملاقات تکمیل‌شده تأییدشده",
 reviewCount:"نظر تأییدشده",average:"میانگین",reportHelp:"فقط تخلف مشخص از مقررات را گزارش دهید.",
 reviewRules:"نظرات منفی که مطابق مقررات باشند مجاز اند."},
 "ps-AF":{title:"د ناروغانو تایید شوي نظرونه",subtitle:"یوازې د بشپړ شوي ملاقات ناروغان نظر ورکولای شي.",
 eligible:"بشپړ شوي ملاقاتونه",mine:"زما نظرونه",notices:"خبرتیاوې",submit:"نظر ثبت کړه",
 headline:"لنډ سرلیک",feedback:"خپله تجربه د شخصي یا طبي معلوماتو پرته ولیکئ.",
 privacy:"نوم، تلیفون، تشخیص یا طبي ریکارډ مه لیکئ.",
 rating:"درجه",edit:"سمول",withdraw:"بېرته اخیستل",appeal:"د بیاکتنې غوښتنه",
 confirm:"تایید",retry:"بیا هڅه",empty:"دلته لا څه نشته.",pending:"بې پرې څېړنې ته منتظر",
 published:"خپور شوی",rejected:"رد شوی",loading:"بارېږي…",reason:"دلیل",
 reports:"راپورونه",appeals:"بیاکتنې",queue:"منتظر نظرونه",approve:"خپرول",reject:"رد",
 dismiss:"راپور رد کړه",remove:"د اصولو خلاف نظر لرې کړه",uphold:"رد تایید کړه",
 overturn:"رد لغوه کړه",modNote:"د اصولو دلیل (لږ تر لږه ۱۵ توري)",
 category:"د سرغړونې ډول",success:"په بریالیتوب خوندي شو",report:"نظر راپور کړه",
 noReviews:"لا نظر نه دی خپور شوی.",verified:"تایید شوی بشپړ ملاقات",
 reviewCount:"تایید شوي نظرونه",average:"منځنی",reportHelp:"یوازې د مشخصې سرغړونې راپور ورکړئ.",
 reviewRules:"د اصولو سره سم منفي نظرونه هم منل کېږي."}
} as const;
type Trans=typeof dictionary.en;
function useT(){const {locale}=usePreferences();const lang=(locale in dictionary?locale:"en") as Lang;
 return {lang,t:(key:keyof Trans)=>dictionary[lang][key]};}
async function call<T>(path:string,method="GET",body?:unknown):Promise<T>{
 const response=await fetch(API+"/v1/reviews"+path,{method,credentials:"include",cache:"no-store",
  headers:body===undefined?{}:{"Content-Type":"application/json"},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json().catch(()=>({})) as T&{code?:string};
 if(!response.ok)throw Error(data.code||"REVIEW_SERVICE_UNAVAILABLE");
 return data;
}
type Eligibility={bookingId:string;clinicId:string;clinicName:string;dentistId:string;
 serviceName:string;visitedAt:string;reviewId:string|null;canReview:boolean};
type Review={id:string;bookingId:string;currentVersion:number;state:string;
 stars:number;headline:string;feedback:string;decisionCategory:string|null;decisionNote:string|null;
 publishedVersion:number|null;withdrawn:boolean};
type Pending={id:string;clinicId:string;version:number;stars:number;headline:string;feedback:string};
type Report={id:string;review_id:string;version:number;headline:string;feedback:string;stars:number;category:string;note:string};
type Appeal={id:string;review_id:string;version:number;headline:string;feedback:string;stars:number;reason:string};
function Choice({selected,onClick,children}:{selected:boolean;onClick:()=>void;children:React.ReactNode}){
 return <button type="button" className={"p17-pill"+(selected?" active":"")} onClick={onClick}>{children}</button>;
}
function ErrorBlock({error,retry}:{error:string;retry:()=>void}){const {t}=useT();
 return error?<div className="p17-error" role="alert">{error}
  <button onClick={retry} type="button">{t("retry")}</button></div>:null;
}
function Rating({value,onChange}:{value:number;onChange:(rating:number)=>void}){
 const {t}=useT();
 return <fieldset className="p17-rating"><legend>{t("rating")}</legend>
  {[1,2,3,4,5].map(n=><button key={n} type="button"
   aria-label={String(n)+" "+t("rating")} aria-pressed={value===n} onClick={()=>onChange(n)}
   className={n<=value?"chosen":""}>★</button>)}</fieldset>;
}
export function PatientReviewsPage(){
 const {lang,t}=useT();
 const [tab,setTab]=useState<"eligible"|"mine"|"notices">("eligible");
 const [eligible,setEligible]=useState<Eligibility[]>([]),[mine,setMine]=useState<Review[]>([]);
 const [notices,setNotices]=useState<{id:string;code:string;created_at:string}[]>([]);
 const [reload,setReload]=useState(0),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[message,setMessage]=useState("");
 const [chosen,setChosen]=useState<Eligibility|Review|null>(null),[form,setForm]=useState<"new"|"edit"|"appeal"|null>(null);
 const [stars,setStars]=useState(5),[headline,setHeadline]=useState(""),[feedback,setFeedback]=useState("");
 useEffect(()=>{let alive=true;setLoading(true);
  Promise.all([call<{eligible:Eligibility[]}>("/my/eligibility"),
   call<{reviews:Review[]}>("/my"),call<{notices:typeof notices}>("/my/notices")])
   .then(([a,b,c])=>{if(alive){setEligible(a.eligible);setMine(b.reviews);setNotices(c.notices);setError("")}})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:"REVIEW_SERVICE_UNAVAILABLE")})
   .finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[reload]);
 const edit=(review:Review)=>{setChosen(review);setStars(review.stars);
  setHeadline(review.headline);setFeedback(review.feedback);setForm("edit");};
 async function save(){
  if(!chosen||!form)return;setBusy(true);setError("");setMessage("");
  try{
   if(form==="new")await call("/my","POST",{bookingId:(chosen as Eligibility).bookingId,stars,headline,feedback});
   if(form==="edit")await call("/my/"+(chosen as Review).id+"/edit","POST",{
    stars,headline,feedback,revision:(chosen as Review).currentVersion});
   if(form==="appeal")await call("/my/"+(chosen as Review).id+"/appeal","POST",{reason:feedback});
   setMessage(t("success"));setForm(null);setChosen(null);setReload(x=>x+1);
  }catch(e){setError(e instanceof Error?e.message:"REVIEW_SERVICE_UNAVAILABLE")}
  finally{setBusy(false)}
 }
 async function withdraw(review:Review){if(!window.confirm(t("confirm")))return;
  setBusy(true);try{await call("/my/"+review.id+"/withdraw","POST",{});
   setReload(x=>x+1)}catch(e){setError(e instanceof Error?e.message:"REVIEW_SERVICE_UNAVAILABLE")}
   finally{setBusy(false)}
 }
 return <main className="p17-wrap" dir={lang==="en"?"ltr":"rtl"}>
  <div className="p17-heading"><span>DANDANLINK · VERIFIED CARE</span>
   <h1>{t("title")}</h1><p>{t("subtitle")}</p></div>
  <div className="p17-tabs">
   {(["eligible","mine","notices"] as const).map(key=><Choice key={key}
    selected={tab===key} onClick={()=>{setTab(key);setForm(null)}}>
    {t(key)}</Choice>)}</div>
  <ErrorBlock error={error} retry={()=>setReload(x=>x+1)}/>
  {message&&<InlineAlert kind="success">{message}</InlineAlert>}
  {loading?<div role="status" className="p17-loading">{t("loading")}</div>:<div className="p17-list">
   {tab==="eligible"&&<>{!eligible.length&&<p>{t("empty")}</p>}
    {eligible.map(item=><article className="p17-card" key={item.bookingId}>
     <span className="p17-verified">✓ {t("verified")}</span>
     <h2>{item.clinicName}</h2><p>{item.serviceName}</p>
     <time>{new Date(item.visitedAt).toLocaleDateString(lang)}</time>
     {item.canReview?<button type="button" className="p17-action" onClick={()=>{
      setChosen(item);setForm("new");setStars(5);setHeadline("");setFeedback("");}}>
      {t("submit")}</button>:<span>✓ {t("mine")}</span>}
    </article>)}</>}
   {tab==="mine"&&<>{!mine.length&&<p>{t("empty")}</p>}
    {mine.map(review=><article key={review.id} className="p17-card">
     <span className="p17-verified">✓ {t("verified")}</span>
     <span className="p17-status">{t(review.state==="published"?"published":review.state==="rejected"?"rejected":"pending")}</span>
     <h2>{review.headline}</h2><p className="p17-stars">{"★".repeat(review.stars)}</p>
     <p>{review.feedback}</p>
     {review.decisionNote&&<p className="p17-reason">{review.decisionCategory}: {review.decisionNote}</p>}
     {!review.withdrawn&&<div className="p17-card-actions">
      <button onClick={()=>edit(review)} type="button">{t("edit")}</button>
      {review.state==="rejected"&&<button type="button" onClick={()=>{
       setChosen(review);setForm("appeal");setFeedback("");}}>{t("appeal")}</button>}
      <button type="button" onClick={()=>void withdraw(review)}>{t("withdraw")}</button>
     </div>}
    </article>)}</>}
   {tab==="notices"&&<>{!notices.length&&<p>{t("empty")}</p>}
    {notices.map(item=><article className="p17-card" key={item.id}>
     <strong>{item.code}</strong><p>{new Date(item.created_at).toLocaleDateString(lang)}</p>
    </article>)}</>}
  </div>}
  {form&&<section className="p17-dialog" aria-label={t("submit")}>
   <h2>{form==="appeal"?t("appeal"):form==="edit"?t("edit"):t("submit")}</h2>
   {form!=="appeal"&&<><Rating value={stars} onChange={setStars}/>
    <label>{t("headline")}<input maxLength={100} minLength={5} value={headline}
     onChange={e=>setHeadline(e.target.value)}/></label></>}
   <label>{form==="appeal"?t("reason"):t("feedback")}<textarea
    value={feedback} minLength={form==="appeal"?20:20} maxLength={form==="appeal"?500:1200}
    onChange={e=>setFeedback(e.target.value)}/></label>
   <p className="p17-privacy">{t("privacy")}</p><p>{t("reviewRules")}</p>
   <div className="p17-card-actions">
    <button disabled={busy||feedback.trim().length<20||(form!=="appeal"&&headline.trim().length<5)}
     className="p17-action" onClick={()=>void save()}>{t("confirm")}</button>
    <button type="button" onClick={()=>setForm(null)}>{t("retry")}</button>
   </div>
  </section>}
 </main>;
}
const reasons=["personal_data","clinical_details","harassment","spam","unrelated"] as const;
export function ReviewModerationPage(){
 const {lang,t}=useT();
 const [tab,setTab]=useState<"queue"|"reports"|"appeals">("queue"),[items,setItems]=useState<Array<Pending|Report|Appeal>>([]);
 const [error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [reason,setReason]=useState(""),[category,setCategory]=useState<(typeof reasons)[number]>("personal_data"),[reload,setReload]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError("");
  call<Record<string,any[]>>("/admin/"+(tab==="queue"?"queue":tab)).then(data=>{
   if(active)setItems(data[tab==="queue"?"pending":tab]||[])})
   .catch(e=>{if(active)setError(e.message)})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[tab,reload]);
 async function decide(item:Pending|Report|Appeal,action:string){
  setBusy(true);setError("");
  try{
   if(tab==="queue")await call("/admin/"+(item as Pending).id+"/decision","POST",{
    version:(item as Pending).version,action,category,reason});
   if(tab==="reports")await call("/admin/reports/"+item.id+"/decision","POST",{
    action,reason,category});
   if(tab==="appeals")await call("/admin/appeals/"+item.id+"/decision","POST",{action,reason});
   setReason("");setReload(x=>x+1);
  }catch(e){setError(e instanceof Error?e.message:"REVIEW_SERVICE_UNAVAILABLE")}
  finally{setBusy(false)}
 }
 return <main className="p17-wrap" dir={lang==="en"?"ltr":"rtl"}>
  <div className="p17-heading"><span>DANDANLINK · MODERATION</span><h1>{t("title")}</h1>
   <p>{t("reviewRules")}</p></div>
  <div className="p17-tabs">{(["queue","reports","appeals"] as const).map(key=>
   <Choice key={key} selected={tab===key} onClick={()=>setTab(key)}>{t(key)}</Choice>)}</div>
  <ErrorBlock error={error} retry={()=>setReload(x=>x+1)}/>
  <div className="p17-moderation-controls">
   <label>{t("category")}<select value={category} onChange={e=>setCategory(e.target.value as typeof category)}>
    {reasons.map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></label>
   <label>{t("modNote")}<textarea minLength={15} maxLength={500} value={reason}
    onChange={e=>setReason(e.target.value)}/></label>
  </div>
  {loading?<p role="status">{t("loading")}</p>:!items.length?<p className="p17-card">{t("empty")}</p>:
   <div className="p17-list">{items.map(item=><article key={item.id} className="p17-card">
    <span className="p17-verified">✓ {t("verified")}</span>
    <h2>{item.headline}</h2>
    <p>{"★".repeat(item.stars||0)}</p><p>{item.feedback}</p>
    {"note" in item&&<p className="p17-reason">{item.category}: {item.note}</p>}
    {"reason" in item&&<p className="p17-reason">{item.reason}</p>}
    <div className="p17-card-actions">
     {(tab==="queue"?["approve","reject"]:tab==="reports"?["dismiss","remove"]:["uphold","overturn"])
      .map(action=><button type="button" key={action} disabled={busy||(action!=="approve"&&reason.trim().length<15)}
       className={action==="approve"?"p17-action":""} onClick={()=>void decide(item,action)}>
       {t(action as keyof Trans)}</button>)}
    </div>
   </article>)}</div>}
 </main>;
}
export function PublicVerifiedReviews({clinicId,dentistId}:{clinicId:string;dentistId?:string}){
 const {lang,t}=useT();
 const [data,setData]=useState<{reviews:{id:string;stars:number;headline:string;feedback:string;publishedAt:string}[];
  summary:{count:number;average:number|null};hasNext:boolean;page:number}|null>(null);
 const [page,setPage]=useState(1),[error,setError]=useState("");
 const [reportId,setReportId]=useState(""),[note,setNote]=useState(""),[category,setCategory]=useState<(typeof reasons)[number]>("personal_data");
 useEffect(()=>{let live=true;const suffix=dentistId?"/dentists/"+encodeURIComponent(dentistId):"?page="+page;
  const path="/public/clinics/"+encodeURIComponent(clinicId)+(dentistId?suffix:suffix);
  call<any>(path).then(res=>{if(live){setData(res);setError("")}}).catch(e=>{if(live)setError(e.message)});
  return()=>{live=false};
 },[clinicId,dentistId,page]);
 async function report(){try{await call("/reports","POST",{reviewId:reportId,category,note});
  setReportId("");setNote("");setError("")}catch(e){setError(e instanceof Error?e.message:"REVIEW_SERVICE_UNAVAILABLE")}}
 return <section className="p17-public" dir={lang==="en"?"ltr":"rtl"}>
  <div className="p17-summary"><h2>{t("title")}</h2>
   <strong>{data?.summary.average===null?"—":data?.summary.average??"—"} / 5</strong>
   <span>{data?.summary.count??0} {t("reviewCount")}</span></div>
  <ErrorBlock error={error} retry={()=>setPage(x=>x)}/>
  {!data?.reviews.length&&<p>{t("noReviews")}</p>}
  {data?.reviews.map(x=><article key={x.id} className="p17-card">
   <span className="p17-verified">✓ {t("verified")}</span>
   <div className="p17-stars">{"★".repeat(x.stars)}</div>
   <h3>{x.headline}</h3><p>{x.feedback}</p>
   <button type="button" onClick={()=>{setReportId(x.id);setNote("")}}>{t("report")}</button>
   {reportId===x.id&&<div className="p17-report">
    <p>{t("reportHelp")}</p>
    <select value={category} onChange={e=>setCategory(e.target.value as typeof category)}>
     {reasons.map(reason=><option key={reason}>{reason}</option>)}</select>
    <textarea value={note} minLength={10} maxLength={500} onChange={e=>setNote(e.target.value)}/>
    <button type="button" disabled={note.trim().length<10} onClick={()=>void report()}>{t("confirm")}</button>
   </div>}
  </article>)}
  {!dentistId&&data?.hasNext&&<button onClick={()=>setPage(x=>x+1)}>{t("reviewCount")} →</button>}
 </section>;
}
