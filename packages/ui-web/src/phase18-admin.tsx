"use client";
import React,{useEffect,useState,type FormEvent} from "react";
import {InlineAlert,AdminMfaSetup} from "./index";
import {call18,useWords,Stat,ChipTabs,Notice,num} from "./phase18";

type View="support"|"analytics"|"security"|"settings";
type Ticket={id:string;reference:string;title:string;category_code:string;status:string;
 priority:string;created_at:string;updated_at:string;assigned?:boolean;
 assignee_id?:string|null;assignee_name?:string|null;age_hours?:number;overdue_for_triage?:boolean;source?:string};
type Detail={ticket:Ticket;messages:{id:string;author_role:string;body:string;created_at:string}[]};
type Overview={period:string;suppression:string;clinics:Record<string,number|null>;
 patients:number|null;dentists:number|null;bookings:Record<string,number|null>;
 platformReceipts:{paidInvoices:number|null;totalAfn:number|null};
 tickets:Record<string,number|null>};
type Security={period:string;note:string;
 actions:{action:string;outcome:string;count:number|null}[];
 denialsByDay:{day:string;count:number|null}[]};
type Category={code:string;label_en:string;label_fa:string;label_ps:string;active:boolean;sort_order:number};
type Template={id:string;title_en:string;title_fa:string;title_ps:string;
 body_en:string;body_fa:string;body_ps:string;active:boolean};
type Agent={user_id:string;name:string;granted_at:string;revoked_at:string|null};
type Settings={categories:Category[];templates:Template[];agents:Agent[]};
const O:Record<string,Record<string,string>>={
 en:{desk:"Support desk",supportHint:"Booking, account and operational issues only — never clinical records.",
 metrics:"Privacy-safe platform metrics",agents:"Support agents",reply:"Reply to request",
 subject:"Title",updateStatus:"Update status",unassigned:"Unassigned",all:"All requests",
 statusOpen:"Open",statusInProgress:"In progress",statusWaiting:"Waiting for requester",
 statusResolved:"Resolved",statusClosed:"Closed",noTickets:"No requests for this filter.",
 clinics:"Clinics",approved:"Approved clinics",pending:"Pending clinics",dentists:"Active dentist memberships",
 patients:"Patient profiles",bookings:"Bookings created (30 days)",cancelled:"Bookings cancelled",
 subscriptions:"Paid subscriptions",collections:"Confirmed platform payments (AFN)",
 tickets:"Support tickets",audit:"Audit actions in the last 30 days",denials:"Denials by day",
 supportSettings:"Support taxonomy and reply templates",template:"Reply template",
 categories:"Categories",categoryCode:"Category code",nameEn:"English name",nameFa:"Dari name",
 namePs:"Pashto name",templateId:"Template ID",titleEn:"English title",titleFa:"Dari title",titlePs:"Pashto title",
 bodyEn:"English response",bodyFa:"Dari response",bodyPs:"Pashto response",
 create:"Create / update",active:"Active",email:"Verified email",grant:"Grant support access",
 revoke:"Revoke",none:"None",assigned:"Assignee",myAssignments:"Assigned to me",age:"Age (days)",overdue:"Needs urgent triage",openDetail:"Open direct link",assign:"Assign",escalate:"Escalate",internalNotes:"Internal notes",internalNotesHint:"Visible only to assigned support and administrators. No clinical information.",addNote:"Save private note",roleGate:"This operation requires a platform administrator and verified MFA.",
 supportGate:"Only authorized support agents or MFA-verified administrators can access this console.",
 mfaGate:"Enable and verify two-factor authentication to access support operations.",
 privacy:"All reporting is aggregate and suppresses small groups. Staff cannot access clinical records.",
 users:"Users",current:"Current",waiting:"Waiting"},
 "fa-AF":{desk:"میز پشتیبانی",supportHint:"فقط مشکلات ملاقات، حساب و عملیات؛ بدون اسناد صحی.",
 metrics:"شاخص‌های محرمیت‌محور پلتفرم",agents:"کارمندان پشتیبانی",reply:"پاسخ به درخواست",
 subject:"عنوان",updateStatus:"تغییر حالت",unassigned:"بدون مسئول",all:"همه درخواست‌ها",
 statusOpen:"باز",statusInProgress:"در حال بررسی",statusWaiting:"منتظر درخواست‌کننده",
 statusResolved:"حل‌شده",statusClosed:"بسته‌شده",noTickets:"در این بخش درخواستی نیست.",
 clinics:"کلینیک‌ها",approved:"کلینیک‌های تأییدشده",pending:"کلینیک‌های منتظر",dentists:"عضویت‌های فعال داکتران",
 patients:"حساب‌های مریضان",bookings:"رزروهای ۳۰ روز اخیر",cancelled:"رزروهای لغوشده",
 subscriptions:"اشتراک‌های پرداخت‌شده",collections:"پرداخت‌های تأییدشده پلتفرم",
 tickets:"درخواست‌های پشتیبانی",audit:"فعالیت حسابرسی ۳۰ روز اخیر",denials:"رد دسترسی بر اساس روز",
 supportSettings:"دسته‌بندی‌ها و پاسخ‌های آماده",template:"پاسخ آماده",categories:"دسته‌ها",
 categoryCode:"کد دسته",nameEn:"عنوان انگلیسی",nameFa:"عنوان دری",namePs:"عنوان پشتو",
 templateId:"شناسه پاسخ",titleEn:"عنوان انگلیسی",titleFa:"عنوان دری",titlePs:"عنوان پشتو",
 bodyEn:"پاسخ انگلیسی",bodyFa:"پاسخ دری",bodyPs:"پاسخ پشتو",
 create:"ایجاد / ویرایش",active:"فعال",email:"ایمیل تأییدشده",grant:"دادن دسترسی پشتیبانی",
 revoke:"لغو دسترسی",none:"هیچ",assigned:"مسئول",myAssignments:"به من سپرده‌شده",age:"سن درخواست (روز)",overdue:"نیاز به بررسی فوری",openDetail:"بازکردن لینک مستقیم",assign:"سپردن",escalate:"ارجاع عاجل",internalNotes:"یادداشت داخلی",internalNotesHint:"فقط برای مسئول و مدیران؛ بدون معلومات صحی.",addNote:"ثبت یادداشت",roleGate:"این بخش به مدیر پلتفرم با تأیید دومرحله‌ای نیاز دارد.",
 supportGate:"فقط کارمند مجاز پشتیبانی یا مدیر دارای تأیید دومرحله‌ای.",
 mfaGate:"برای ورود به بخش پشتیبانی، تأیید دومرحله‌ای را فعال و تأیید کنید.",
 privacy:"گزارش‌ها مجموعی اند و گروه‌های کوچک پنهان می‌شوند. پشتیبانی به اسناد صحی دسترسی ندارد.",
 users:"کاربران",current:"فعلی",waiting:"منتظر"},
 "ps-AF":{desk:"د ملاتړ مرکز",supportHint:"یوازې د لیدنو، حسابونو او چارو ستونزې؛ طبي ریکارډونه نه.",
 metrics:"د محرمیت خوندي شمېرې",agents:"د ملاتړ کارکوونکي",reply:"غوښتنې ته ځواب",
 subject:"سرلیک",updateStatus:"حالت بدل کړئ",unassigned:"بې مسووله",all:"ټولې غوښتنې",
 statusOpen:"پرانیستې",statusInProgress:"تر څېړنې لاندې",statusWaiting:"غوښتونکي ته منتظر",
 statusResolved:"حل شوې",statusClosed:"بندې شوې",noTickets:"د دې حالت غوښتنه نشته.",
 clinics:"کلینیکونه",approved:"تایید شوي کلینیکونه",pending:"منتظر کلینیکونه",dentists:"فعال ډاکټران",
 patients:"د ناروغانو حسابونه",bookings:"د ۳۰ ورځو رزرو",cancelled:"لغوه شوي رزرو",
 subscriptions:"ورکړل شوې ګډون پیسې",collections:"د پلاتفورم تایید شوې پیسې",
 tickets:"د ملاتړ غوښتنې",audit:"د تېرو ۳۰ ورځو امنیتي فعالیتونه",denials:"رد شوې هڅې په ورځ",
 supportSettings:"د ملاتړ ډولونه او چمتو ځوابونه",template:"چمتو ځواب",categories:"ډولونه",
 categoryCode:"د ډول کوډ",nameEn:"انګلیسي نوم",nameFa:"دري نوم",namePs:"پښتو نوم",
 templateId:"د ځواب کوډ",titleEn:"انګلیسي سرلیک",titleFa:"دري سرلیک",titlePs:"پښتو سرلیک",
 bodyEn:"انګلیسي ځواب",bodyFa:"دري ځواب",bodyPs:"پښتو ځواب",
 create:"جوړول / بدلول",active:"فعال",email:"تایید شوی برېښنالیک",grant:"د ملاتړ اجازه ورکړئ",
 revoke:"اجازه ختمه کړئ",none:"هیڅ",assigned:"مسوول",myAssignments:"زما سپارل شوي",age:"د غوښتنې عمر (ورځې)",overdue:"بیړنۍ څېړنې ته اړتیا",openDetail:"مستقیم لینک",assign:"سپارل",escalate:"بیړنی کول",internalNotes:"داخلي یادښتونه",internalNotesHint:"یوازې مسوول او مدیر ته ښکاري. طبي معلومات مه لیکئ.",addNote:"یادښت خوندي",roleGate:"دا برخه د MFA لرونکي مدیر لپاره ده.",
 supportGate:"یوازې مجاز ملاتړ کارکوونکي یا MFA لرونکي مدیران دې برخې ته داخلېږي.",
 mfaGate:"د ملاتړ لپاره دوه پړاوه تایید فعال او بشپړ کړئ.",
 privacy:"شمېرې مجموعي دي او وړې ډلې پټې دي. ملاتړ طبي ریکارډونو ته لاسرسی نه لري.",
 users:"کاروونکي",current:"اوسنی",waiting:"منتظر"}
};
const statusList=["open","in_progress","waiting_user","resolved","closed"] as const;
const initialCategory:Category={code:"",label_en:"",label_fa:"",label_ps:"",active:true,sort_order:100};
const initialTemplate:Template={id:"",title_en:"",title_fa:"",title_ps:"",body_en:"",body_fa:"",body_ps:"",active:true};
export function AdminOperationsPortal({view}:{view:View}){
 const {lang,t}=useWords();const o=(key:string)=>O[lang]?.[key]||O.en[key]||key;
 const [role,setRole]=useState<"admin"|"support"|"user"|null>(null),[needsMfa,setNeedsMfa]=useState(false);
 const [error,setError]=useState(""),[success,setSuccess]=useState(""),[busy,setBusy]=useState(false);
 const [reload,setReload]=useState(0);
 useEffect(()=>{let live=true;call18<{role:"admin"|"support"|"user";mfaRequired:boolean}>("/support/me")
  .then(x=>{if(live){setRole(x.role);setNeedsMfa(x.mfaRequired)}})
  .catch(e=>{if(live){setError(e.message);setRole("user")}});
  return()=>{live=false};
 },[]);
 const permitted=role==="admin"||role==="support"&&["support","analytics"].includes(view);
 const links=[{id:"support",label:t("support")},{id:"analytics",label:t("analytics")},
  ...(role==="admin"?[{id:"security",label:t("security")},{id:"settings",label:t("settings")}]:[])];
 return <div className="p18-admin-layout">
  <aside className="p18-admin-sidebar">
   <span className="p18-kicker">DANDANLINK · OPERATIONS</span><h2>{o("desk")}</h2>
   {role==="admin"&&<a href="/admin">← {t("back")}</a>}
   <nav aria-label={o("desk")}>{links.map(x=>
    <a key={x.id} aria-current={view===x.id?"page":undefined} href={"/admin/"+x.id}>{x.label}</a>)}</nav>
   <a href="/admin/support">{t("help")}</a>
  </aside>
  <div className="p18-admin-main">
   <header className="p18-hero"><span className="p18-kicker">PH18 · PLATFORM OPERATIONS</span>
    <h1>{view==="support"?t("support"):view==="analytics"?t("analytics"):
     view==="security"?t("security"):t("settings")}</h1>
    <p>{view==="support"?o("supportHint"):o("privacy")}</p></header>
   {role===null?<InlineAlert>{t("loading")}</InlineAlert>:needsMfa?
    role==="support"?<AdminMfaSetup home="/admin/support"/>:
    <InlineAlert kind="warning">{o("mfaGate")} <a href="/admin/2fa">{t("security")}</a></InlineAlert>:
    !permitted?<InlineAlert kind="error">{view==="settings"||view==="security"?o("roleGate"):o("supportGate")}
     <a href="/admin/login?next=/admin/support">{t("login")}</a></InlineAlert>:
    <><Notice error={error} success={success}/>{view==="support"?
     <SupportDesk role={role as "admin"|"support"} busy={busy} setBusy={setBusy} signal={reload} reload={()=>setReload(x=>x+1)}
      message={(e,ok=false)=>{setError(ok?"":e);setSuccess(ok?e:"")}}/>:
     view==="analytics"?<PlatformAnalytics signal={reload}/>:
     view==="security"?<SecurityReview signal={reload}/>:
      <OperationSettings busy={busy} setBusy={setBusy} signal={reload} reload={()=>setReload(x=>x+1)}
       message={(e,ok=false)=>{setError(ok?"":e);setSuccess(ok?e:"")}}/>}</>}
  </div></div>;
}
type DeskProps={busy:boolean;setBusy:(v:boolean)=>void;signal:number;reload:()=>void;
 message:(value:string,ok?:boolean)=>void};
function SupportDesk({busy,setBusy,signal,reload,message,role}:DeskProps&{role:"admin"|"support"}){
 const {lang,t}=useWords();const o=(key:string)=>O[lang]?.[key]||O.en[key]||key;
 const [filter,setFilter]=useState("open"),[tickets,setTickets]=useState<Ticket[]>([]);
 const [selected,setSelected]=useState(""),[detail,setDetail]=useState<Detail|null>(null);
 const [reply,setReply]=useState(""),[status,setStatus]=useState("open"),[loading,setLoading]=useState(false);
 const [categories,setCategories]=useState<{code:string;label_en:string;label_fa:string;label_ps:string}[]>([]);
 const [category,setCategory]=useState("all"),[age,setAge]=useState("0"),[assigned,setAssigned]=useState("all");
 const [agents,setAgents]=useState<{id:string;name:string}[]>([]);
 const [agentId,setAgentId]=useState(""),[myId,setMyId]=useState("");
 const [note,setNote]=useState(""),[notes,setNotes]=useState<{id:string;body:string;created_at:string;author_name:string}[]>([]);
 useEffect(()=>{const match=location.pathname.match(/^\/admin\/support\/([A-Za-z0-9_-]{8,100})$/);
  if(match)setSelected(match[1]);
 },[]);
 useEffect(()=>{let alive=true;Promise.all([
  call18<{agents:{id:string;name:string}[]}>("/support/admin/agents"),
  call18<{faq:any[];categories:typeof categories}>("/support/public/help"),
  call18<{role:string;displayName:string}>("/support/me")
 ]).then(([a,b])=>{if(alive){setAgents(a.agents);setCategories(b.categories)}})
  .catch(e=>{if(alive)message(e.message)});return()=>{alive=false};
 },[signal]);
 useEffect(()=>{let alive=true;call18<{id:string}>("/support/identity")
  .then(d=>{if(alive)setMyId(d.id)}).catch(()=>{});
  return()=>{alive=false};
 },[]);
 useEffect(()=>{let live=true;setLoading(true);
  const qs=new URLSearchParams({status:filter,category,assigned,ageDays:age});
  call18<{tickets:Ticket[]}>("/support/admin/tickets?"+qs).then(d=>{if(live)setTickets(d.tickets)})
   .catch(e=>message(e.message)).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[filter,category,assigned,age,signal]);
 useEffect(()=>{if(!selected)return;let live=true;setDetail(null);
  call18<Detail>("/support/tickets/"+selected).then(d=>{if(live){
    setDetail(d);setStatus(d.ticket.status);setAgentId(d.ticket.assignee_id||"");
    call18<{notes:typeof notes}>("/support/admin/tickets/"+selected+"/notes")
      .then(n=>{if(live)setNotes(n.notes)}).catch(()=>{if(live)setNotes([])});
   }}).catch(e=>message(e.message));
  return()=>{live=false};
 },[selected,signal]);
 async function respond(e:FormEvent){
  e.preventDefault();if(!selected)return;setBusy(true);
  try{await call18("/support/tickets/"+selected+"/messages","POST",{message:reply});
   setReply("");reload();message(t("sendSuccess"),true)}
  catch(e){message(e instanceof Error?e.message:t("error"))}finally{setBusy(false)}
 }
 async function assignAgent(){
  if(!selected)return;setBusy(true);
  try{await call18("/support/admin/tickets/"+selected+"/assign","POST",{agentId:agentId||null});
   reload();message(t("save"),true)}
  catch(e){message(e instanceof Error?e.message:t("error"))}finally{setBusy(false)}
 }
 async function escalate(){
  if(!selected)return;setBusy(true);
  try{await call18("/support/admin/tickets/"+selected+"/escalate","POST",{});
   reload();message(o("escalate"),true)}
  catch(e){message(e instanceof Error?e.message:t("error"))}finally{setBusy(false)}
 }
 async function addNote(e:FormEvent){
  e.preventDefault();if(!selected)return;setBusy(true);
  try{await call18("/support/admin/tickets/"+selected+"/notes","POST",{message:note});
   setNote("");reload();message(t("save"),true)}
  catch(e){message(e instanceof Error?e.message:t("error"))}finally{setBusy(false)}
 }
 async function changeStatus(){
  if(!selected)return;setBusy(true);
  try{await call18("/support/admin/tickets/"+selected+"/status","POST",{status});
   reload();message(t("save"),true)}
  catch(e){message(e instanceof Error?e.message:t("error"))}finally{setBusy(false)}
 }
 return <div className="p18-panel"><div className="p18-toolbar">
  <label>{t("status")}<select value={filter} onChange={e=>{setFilter(e.target.value);setSelected("");setDetail(null)}}>
   <option value="all">{o("all")}</option>
   {statusList.map(s=><option key={s} value={s}>{o("status"+s.charAt(0).toUpperCase()+s.slice(1).replace(/_(\w)/g,(_m,c:string)=>c.toUpperCase()))}</option>)}
  </select></label>
  <label>{t("category")}<select value={category} onChange={e=>setCategory(e.target.value)}>
   <option value="all">{o("all")}</option>
   {categories.map(c=><option key={c.code} value={c.code}>{lang==="fa-AF"?c.label_fa:lang==="ps-AF"?c.label_ps:c.label_en}</option>)}
  </select></label>
  <label>{o("assigned")}<select value={assigned} onChange={e=>setAssigned(e.target.value)}>
   <option value="all">{o("all")}</option><option value="unassigned">{o("unassigned")}</option><option value="mine">{o("myAssignments")}</option>
  </select></label>
  <label>{o("age")}<select value={age} onChange={e=>setAge(e.target.value)}>
   {[0,3,7,30].map(x=><option key={x} value={x}>{x===0?o("all"):x+"+"}</option>)}
  </select></label>
  <button className="btn btn-secondary" onClick={reload}>{t("refresh")}</button></div>
  <div className="p18-split"><div className="p18-ticket-list" aria-label={o("desk")}>
   {loading?<p>{t("loading")}</p>:!tickets.length?<p className="muted">{o("noTickets")}</p>:
    tickets.map(ticket=><button type="button" className={"p18-ticket-option"+(selected===ticket.id?" selected":"")}
     key={ticket.id} onClick={()=>setSelected(ticket.id)}>
     <bdi dir="ltr">{ticket.reference}</bdi><span>{ticket.title}</span>
     <small>{ticket.status} · {ticket.category_code} · {ticket.age_hours||0}h</small>
     {ticket.overdue_for_triage&&<small className="p18-priority">{o("overdue")}</small>}
     <small>{ticket.assignee_name||o("unassigned")} · {ticket.source}</small></button>)}
   </div>
   <div>{detail?<><h2>{detail.ticket.title}</h2>
    <p className="muted"><bdi dir="ltr">{detail.ticket.reference}</bdi> · {detail.ticket.category_code} · {detail.ticket.priority}</p>
    <a href={"/admin/support/"+selected} className="p18-deeplink">{o("openDetail")}</a>
    <div className="p18-toolbar">
     <label>{o("assigned")}<select value={agentId} onChange={e=>setAgentId(e.target.value)}>
      {role==="admin"&&<option value="">{o("unassigned")}</option>}
      {agents.filter(a=>role==="admin"||a.id===myId).map(a=>
       <option key={a.id} value={a.id}>{a.name}</option>)}
     </select></label>
     <button className="btn btn-secondary" disabled={busy||agentId===(detail.ticket.assignee_id||"")} onClick={assignAgent}>{o("assign")}</button>
     <button className="btn btn-secondary" disabled={busy||detail.ticket.priority==="high"||detail.ticket.status==="closed"} onClick={escalate}>{o("escalate")}</button>
    </div>
    <div className="p18-conversation">{detail.messages.map(m=><div key={m.id}
     className={"p18-message "+m.author_role}><small>{m.author_role} · {new Date(m.created_at).toLocaleString(lang)}</small>
     <p>{m.body}</p></div>)}</div>
    {(role==="admin"||detail.ticket.assignee_id===myId)&&
      <section className="p18-private-notes"><h3>{o("internalNotes")}</h3>
       <p className="p18-footnote">{o("internalNotesHint")}</p>
       {notes.map(n=><div className="p18-message" key={n.id}><small>{n.author_name}</small><p>{n.body}</p></div>)}
       <form className="p18-form" onSubmit={addNote}>
        <label>{o("internalNotes")}<textarea required minLength={5} maxLength={1000} rows={2}
         value={note} onChange={e=>setNote(e.target.value)}/></label>
        <button className="btn btn-secondary" disabled={busy}>{o("addNote")}</button>
       </form></section>}
    {detail.ticket.status!=="closed"&&(role==="admin"||detail.ticket.assignee_id===myId)&&<>
     <div className="p18-toolbar"><label>{t("status")}<select value={status} onChange={e=>setStatus(e.target.value)}>
      {statusList.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <button disabled={busy||status===detail.ticket.status} className="btn btn-secondary"
       onClick={changeStatus}>{o("updateStatus")}</button></div>
     {!["closed","resolved"].includes(detail.ticket.status)&&<form className="p18-form" onSubmit={respond}>
      <label>{o("reply")}<textarea required minLength={5} maxLength={2000} rows={4}
       value={reply} onChange={e=>setReply(e.target.value)}/></label>
      <button disabled={busy} className="btn btn-primary">{t("reply")}</button>
     </form>}</>}
   </>:<p className="muted">{t("selectTicket")}</p>}</div>
  </div></div>;
}
function PlatformAnalytics({signal}:{signal:number}){
 const {lang,t}=useWords();const o=(key:string)=>O[lang]?.[key]||O.en[key]||key;
 const [data,setData]=useState<Overview|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;setLoading(true);call18<Overview>("/insights/platform/overview")
  .then(x=>{if(live)setData(x)}).catch(e=>{if(live)setError(e.message)})
  .finally(()=>{if(live)setLoading(false)});return()=>{live=false};},[signal]);
 if(loading)return <InlineAlert>{t("loading")}</InlineAlert>;
 if(error)return <InlineAlert kind="error">{error}</InlineAlert>;
 if(!data)return <InlineAlert>{t("noData")}</InlineAlert>;
 return <><div className="p18-stats">
  <Stat label={o("clinics")} value={data.clinics.total}/><Stat label={o("approved")} value={data.clinics.approved}/>
  <Stat label={o("pending")} value={data.clinics.pending}/><Stat label={o("dentists")} value={data.dentists}/>
  <Stat label={o("patients")} value={data.patients}/><Stat label={o("bookings")} value={data.bookings.created}/>
  <Stat label={o("cancelled")} value={data.bookings.cancelled}/><Stat label={o("subscriptions")} value={data.platformReceipts.paidInvoices}/>
  {data.platformReceipts.totalAfn!==null&&
   <Stat label={o("collections")} value={num(data.platformReceipts.totalAfn)}/>}
  </div><section className="p18-panel"><h2>{o("tickets")}</h2>
   <div className="p18-table">{Object.entries(data.tickets).map(([key,n])=><div className="p18-table-row" key={key}>
    <span>{key}</span><strong>{n??"—"}</strong></div>)}</div>
   <a className="btn btn-primary" href="/admin/support">{t("openSupport")}</a>
   <p className="p18-footnote">{t("suppressed")}. {o("privacy")}</p>
  </section></>;
}
function SecurityReview({signal}:{signal:number}){
 const {lang,t}=useWords();const o=(key:string)=>O[lang]?.[key]||O.en[key]||key;
 const [data,setData]=useState<Security|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;call18<Security>("/insights/platform/security")
  .then(d=>{if(live)setData(d)}).catch(e=>{if(live)setError(e.message)})
  .finally(()=>{if(live)setLoading(false)});return()=>{live=false};},[signal]);
 if(loading)return <InlineAlert>{t("loading")}</InlineAlert>;
 if(error)return <InlineAlert kind="error">{error}</InlineAlert>;
 if(!data)return <InlineAlert>{t("noData")}</InlineAlert>;
 return <div className="p18-split">
  <section className="p18-panel"><h2>{o("audit")}</h2><div className="p18-table">
   {data.actions.length?data.actions.map((x,i)=><div className="p18-table-row" key={x.action+i}>
    <span>{x.action} · {x.outcome}</span><strong>{x.count??"—"}</strong></div>):
    <p className="muted">{t("noData")}</p>}</div></section>
  <section className="p18-panel"><h2>{o("denials")}</h2><div className="p18-table">
   {data.denialsByDay.length?data.denialsByDay.map(x=><div className="p18-table-row" key={x.day}>
    <time dir="ltr">{x.day}</time><strong>{x.count??"—"}</strong></div>):<p className="muted">{t("noData")}</p>}</div>
   <p className="p18-footnote">{data.note}</p></section></div>;
}
function OperationSettings({busy,setBusy,signal,reload,message}:DeskProps){
 const {lang,t}=useWords();const o=(key:string)=>O[lang]?.[key]||O.en[key]||key;
 const [data,setData]=useState<Settings|null>(null);
 const [cat,setCat]=useState<Category>(initialCategory),[tpl,setTpl]=useState<Template>(initialTemplate);
 const [email,setEmail]=useState(""),[tab,setTab]=useState<"categories"|"template"|"agents">("categories");
 useEffect(()=>{let live=true;call18<Settings>("/support/admin/settings")
  .then(x=>{if(live)setData(x)}).catch(e=>message(e.message));return()=>{live=false};},[signal]);
 async function saveCategory(e:FormEvent){
  e.preventDefault();setBusy(true);
  try{await call18("/support/admin/categories/"+cat.code,"PUT",{
   en:cat.label_en,fa:cat.label_fa,ps:cat.label_ps,active:cat.active});
   setCat(initialCategory);reload();message(t("save"),true)}
  catch(e){message(e instanceof Error?e.message:t("error"))}finally{setBusy(false)}
 }
 async function saveTemplate(e:FormEvent){
  e.preventDefault();setBusy(true);
  try{await call18("/support/admin/templates/"+tpl.id,"PUT",{
   title_en:tpl.title_en,title_fa:tpl.title_fa,title_ps:tpl.title_ps,
   body_en:tpl.body_en,body_fa:tpl.body_fa,body_ps:tpl.body_ps,active:tpl.active});
   setTpl(initialTemplate);reload();message(t("save"),true)}
  catch(e){message(e instanceof Error?e.message:t("error"))}finally{setBusy(false)}
 }
 async function grant(e:FormEvent){
  e.preventDefault();setBusy(true);
  try{await call18("/support/admin/agents","POST",{email});
   setEmail("");reload();message(t("save"),true)}
  catch(e){message(e instanceof Error?e.message:t("error"))}finally{setBusy(false)}
 }
 async function revoke(id:string){
  if(!window.confirm(o("revoke")+"?"))return;
  setBusy(true);
  try{await call18("/support/admin/agents/"+id+"/revoke","POST",{});
   reload();message(t("save"),true)}
  catch(e){message(e instanceof Error?e.message:t("error"))}finally{setBusy(false)}
 }
 const field=(label:string,value:string,change:(s:string)=>void,min=2,max=120)=>
  <label key={label}>{label}<input required minLength={min} maxLength={max} value={value} onChange={e=>change(e.target.value)}/></label>;
 return <div className="p18-panel">
  <h2>{o("supportSettings")}</h2>
  <ChipTabs items={(["categories","template","agents"] as const).map(id=>({id,label:o(id)}))}
   active={tab} set={setTab}/>
  {!data?<InlineAlert>{t("loading")}</InlineAlert>:tab==="categories"?<div className="p18-split">
   <div className="p18-table">{data.categories.map(x=><button className="p18-ticket-option" key={x.code}
    onClick={()=>setCat({...x})} type="button"><strong>{x.code}</strong>
     <span>{lang==="fa-AF"?x.label_fa:lang==="ps-AF"?x.label_ps:x.label_en}</span></button>)}</div>
   <form className="p18-form" onSubmit={saveCategory}>
    {field(o("categoryCode"),cat.code,s=>setCat(x=>({...x,code:s})),3,32)}
    {field(o("nameEn"),cat.label_en,s=>setCat(x=>({...x,label_en:s})))}
    {field(o("nameFa"),cat.label_fa,s=>setCat(x=>({...x,label_fa:s})))}
    {field(o("namePs"),cat.label_ps,s=>setCat(x=>({...x,label_ps:s})))}
    <label className="p18-check"><input type="checkbox" checked={cat.active}
     onChange={e=>setCat(x=>({...x,active:e.target.checked}))}/>{o("active")}</label>
    <button disabled={busy} className="btn btn-primary">{o("create")}</button>
   </form></div>:tab==="template"?<div className="p18-split">
    <div className="p18-table">{data.templates.map(x=><button type="button" className="p18-ticket-option"
      onClick={()=>setTpl({...x})} key={x.id}><strong>{x.id}</strong>
      <span>{lang==="fa-AF"?x.title_fa:lang==="ps-AF"?x.title_ps:x.title_en}</span></button>)}</div>
    <form className="p18-form" onSubmit={saveTemplate}>
     {field(o("templateId"),tpl.id,s=>setTpl(x=>({...x,id:s})),3,32)}
     {(["en","fa","ps"] as const).map(k=>
      field(o("title"+k.charAt(0).toUpperCase()+k.slice(1)),tpl[`title_${k}`],s=>
       setTpl(x=>({...x,["title_"+k]:s})),3,120))}
     {(["en","fa","ps"] as const).map(k=><label key={k}>{o("body"+k.charAt(0).toUpperCase()+k.slice(1))}
      <textarea required rows={3} minLength={10} maxLength={1000} value={tpl[`body_${k}`]}
       onChange={e=>setTpl(x=>({...x,["body_"+k]:e.target.value}))}/></label>)}
     <label className="p18-check"><input type="checkbox" checked={tpl.active}
      onChange={e=>setTpl(x=>({...x,active:e.target.checked}))}/>{o("active")}</label>
     <button disabled={busy} className="btn btn-primary">{o("create")}</button>
    </form></div>:<div className="p18-split">
    <form className="p18-form" onSubmit={grant}>{field(o("email"),email,setEmail,5,160)}
     <button disabled={busy} className="btn btn-primary">{o("grant")}</button></form>
    <div className="p18-table">{data.agents.length?data.agents.map(a=>
     <div key={a.user_id} className="p18-table-row"><span>{a.name}</span>
      <span>{a.revoked_at?o("revoke"):o("active")}</span>
      {!a.revoked_at&&<button className="btn btn-secondary" disabled={busy}
       type="button" onClick={()=>revoke(a.user_id)}>{o("revoke")}</button>}</div>):
     <p>{t("noData")}</p>}</div></div>}
 </div>;
}
