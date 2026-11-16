"use client";
import React from "react";
import {CareIcon,type CareIconName} from "./care-icons";
import {clinicErrorText,ClinicFailureState,ClinicLoadingState} from "./clinic-feedback";

// All values come from already-authorized, tenant-scoped API requests in the
// existing clinic dashboard. No fixture values, cookies or client-side cache.
export type ClinicDashboardRole="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
export type DashboardRead<T>={data:T|null;loading:boolean;error:string;refresh:()=>void};
export type DashboardSchedule={
 todayTotal:number;weekTotal:number;
 counts:{confirmed:number;arrived:number;in_treatment:number;completed:number;no_show:number}
};
export type DashboardPatients={total:number;counts:{active:number;inactive:number;archived:number}};
export type DashboardRequests={requests:{id:string}[]};
export type DashboardOperations={metrics:{services:number;chairs:number;openDays:number;scheduledDentists:number};
 checklist:{key:string;done:boolean}[]};
export type ClinicInsights={
 from:string;to:string;timezone:string;currency:"AFN";
 appointments:{total:number;byDay:{day:string;count:number}[]};
 patients:{newRegistered:number;activeTotal:number};
 revenue:{netReceiptsAfn:number;issuedInvoices:number;issuedFaceValueAfn:number;postedExpensesAfn:number};
};

type Locale="en"|"fa-AF"|"ps-AF";
const words:Record<Locale,Record<string,string>>={
 en:{
  snapshot:"Your daily snapshot",owner:"Owner's overview",manager:"Manager's overview",
  dentist:"Dentist's workspace",receptionist:"Reception desk",assistant:"Care team workspace",
  cashier:"Finance workspace",live:"Figures from your clinic only",today:"Today's appointments",
  arrived:"Checked in",treating:"In treatment",completed:"Completed",
  pending:"Online requests",active:"Active patients",week:"Next seven days",
  receipts:"Net receipts",invoices:"Issued invoices",expenses:"Posted expenses",
  notReady:"Information unavailable",attention:"Needs attention",allClear:"No action items from the available dashboard data.",
  limited:"Some sections are unavailable. Refresh to check outstanding tasks.",
  waiting:"Confirmed appointments awaiting arrival",online:"Review online booking requests",
  setup:"Finish clinic configuration",verification:"Review clinic verification",
  review:"Open",insights:"Clinic performance",daily:"Scheduled appointments by day",
  period7:"7 days",period30:"30 days",periodNote:"Kabul calendar days, including today",
  noActivity:"No appointments scheduled in this period.",
  faceValue:"Issued invoice face value",moneyNote:"AFN · Ledger receipts include reversals and exclude credits; not profit.",
  chartHelp:"Appointment totals reflect scheduled start dates, not booking creation dates.",
  report:"View detailed reports",finance:"Open finance",
  retry:"Retry",error:"Could not load clinic performance.",
  status:"Status",readonly:"Read-only operational summary",
  dentistCoverage:"Dentists with configured weekly shifts",
  chairs:"Configured treatment chairs",seeHours:"View shifts and opening hours",
  noActions:"No urgent tasks identified",metricUnavailable:"—"
 },
 "fa-AF":{
  snapshot:"نمای امروز شما",owner:"نمای مالک کلینیک",manager:"نمای مدیر کلینیک",
  dentist:"محیط کاری داکتر",receptionist:"میز پذیرش",assistant:"محیط کاری تیم تداوی",
  cashier:"محیط کاری مالی",live:"ارقام تنها از کلینیک شماست",today:"نوبت‌های امروز",
  arrived:"حاضرشده",treating:"در تداوی",completed:"تکمیل‌شده",
  pending:"درخواست‌های آنلاین",active:"مریضان فعال",week:"هفت روز آینده",
  receipts:"دریافتی خالص",invoices:"بل‌های صادرشده",expenses:"مصارف ثبت‌شده",
  notReady:"معلومات در دسترس نیست",attention:"نیازمند رسیدگی",
  allClear:"بر اساس معلومات موجود، کاری برای رسیدگی نیست.",
  limited:"بعضی بخش‌ها در دسترس نیستند. برای بررسی دوباره تازه‌سازی کنید.",
  waiting:"نوبت‌های تأییدشده در انتظار ورود",online:"بررسی درخواست‌های آنلاین",
  setup:"تکمیل تنظیمات کلینیک",verification:"بررسی تأیید کلینیک",
  review:"بازکردن",insights:"عملکرد کلینیک",daily:"نوبت‌های برنامه‌ریزی‌شده در هر روز",
  period7:"۷ روز",period30:"۳۰ روز",periodNote:"روزهای تقویم کابل تا امروز",
  noActivity:"در این بازه نوبتی ثبت نشده است.",faceValue:"ارزش بل‌های صادرشده",
  moneyNote:"افغانی · دریافتی دفتر مالی شامل برگشت و بدون اعتبار است؛ سود نیست.",
  chartHelp:"تعداد نوبت‌ها بر اساس تاریخ تعیین‌شده است، نه تاریخ ثبت.",
  report:"گزارش‌های مفصل",finance:"بخش مالی",retry:"دوباره کوشش",
  error:"عملکرد کلینیک بارگیری نشد.",status:"وضعیت",readonly:"خلاصۀ تنظیمات عملیاتی",
  dentistCoverage:"داکتران با شیفت هفتگی ثبت‌شده",
  chairs:"چوکی‌های تداوی ثبت‌شده",seeHours:"دیدن شیفت‌ها و ساعات کاری",
  noActions:"کار فوری شناسایی نشد",metricUnavailable:"—"
 },
 "ps-AF":{
  snapshot:"د نن ورځې لنډیز",owner:"د خاوند عمومي لید",manager:"د مدیر عمومي لید",
  dentist:"د ډاکټر کاري برخه",receptionist:"د منلو میز",assistant:"د درملنې ټیم کاري برخه",
  cashier:"مالي کاري برخه",live:"شمېرې یوازې ستاسو د کلینیک دي",today:"د نن لیدنې",
  arrived:"حاضر شوي",treating:"د درملنې لاندې",completed:"بشپړ شوي",
  pending:"آنلاین غوښتنې",active:"فعال ناروغان",week:"راتلونکې اووه ورځې",
  receipts:"خالص ترلاسه شوې پیسې",invoices:"صادر شوي بلونه",expenses:"ثبت شوي لګښتونه",
  notReady:"معلومات نشته",attention:"پاملرنې ته اړتیا",
  allClear:"د شته معلوماتو له مخې بېړنی کار نشته.",limited:"ځینې برخې نشته؛ بیا یې تازه کړئ.",
  waiting:"تایید شوي وختونه چې لا ناروغان نه دي راغلي",
  online:"آنلاین غوښتنې وڅېړئ",setup:"د کلینیک امستنې بشپړې کړئ",
  verification:"د کلینیک تایید وګورئ",review:"پرانیزئ",
  insights:"د کلینیک فعالیت",daily:"د هرې ورځې ټاکل شوې لیدنې",
  period7:"۷ ورځې",period30:"۳۰ ورځې",periodNote:"د کابل ورځې تر نن پورې",
  noActivity:"په دې موده کې لیدنې نشته.",faceValue:"د صادر شویو بلونو ارزښت",
  moneyNote:"افغانۍ · خالص ترلاسه شوې پیسې د بېرته ورکړې په ګډون دي؛ ګټه نه ده.",
  chartHelp:"لیدنې د ټاکل شوې ورځې له مخې شمېرل شوي، نه د ثبت ورځې.",
  report:"بشپړ راپورونه",finance:"مالي برخه",retry:"بیا هڅه",
  error:"د کلینیک فعالیت پورته نه شو.",status:"حالت",readonly:"د کلینیک د امستنو لنډیز",
  dentistCoverage:"ډاکټران چې اونیز مهالویش لري",
  chairs:"ثبت شوې د درملنې څوکۍ",seeHours:"مهالویش او ساعتونه",
  noActions:"بېړنی کار ونه موندل شو",metricUnavailable:"—"
 }
};
function label(lang:Locale,key:string){return words[lang][key]||words.en[key]||key;}
function number(n:number,lang:Locale){return new Intl.NumberFormat(lang,{maximumFractionDigits:0}).format(n);}
export function clinicReportWindow(days:7|30,now=new Date()){
 // Date parts are explicitly taken in Asia/Kabul, never the machine timezone.
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(now).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 const day=parts.year+"-"+parts.month+"-"+parts.day;
 const start=new Date(day+"T00:00:00.000Z");
 start.setUTCDate(start.getUTCDate()-(days-1));
 return {from:start.toISOString().slice(0,10),to:day};
}
type Metric={key:string;icon:CareIconName;href:string;read:DashboardRead<unknown>;value?:number;currency?:boolean};
type Task={key:string;count?:number;href:string;icon:CareIconName};
const prefix=(clinicId:string)=>"?clinic="+encodeURIComponent(clinicId);
function wrapRead<T>(read:DashboardRead<T>):DashboardRead<unknown>{return read;}
export function ClinicDashboardSnapshot({role,clinicId,clinicStatus,lang,schedule,patients,requests,operations,insights}:{
 role:ClinicDashboardRole;clinicId:string;clinicStatus:string;lang:Locale;
 schedule:DashboardRead<DashboardSchedule>;patients:DashboardRead<DashboardPatients>;
 requests:DashboardRead<DashboardRequests>;operations:DashboardRead<DashboardOperations>;
 insights:DashboardRead<ClinicInsights>;
}){
 const t=(key:string)=>label(lang,key),p=prefix(clinicId);
 const scheduling=role!=="cashier";
 const finance=["owner","manager","cashier"].includes(role);
 const manager=["owner","manager"].includes(role);
 const booking=["owner","manager","dentist","receptionist"].includes(role);
 const metric=(key:string,icon:CareIconName,href:string,read:DashboardRead<unknown>,value?:number,currency=false):Metric=>
  ({key,icon,href:href+p,read,value,currency});
 const cards:Metric[]=role==="cashier"?[
  metric("receipts","receipt","/clinic/finance",wrapRead(insights),insights.data?.revenue.netReceiptsAfn,true),
  metric("invoices","file","/clinic/finance",wrapRead(insights),insights.data?.revenue.issuedInvoices),
  metric("expenses","chart","/clinic/reports",wrapRead(insights),insights.data?.revenue.postedExpensesAfn,true),
  metric("active","users","/clinic/patients",wrapRead(patients),patients.data?.counts.active)
 ]:manager?[
  metric("today","calendar","/clinic/appointments",wrapRead(schedule),schedule.data?.todayTotal),
  metric("pending","bell","/clinic/appointments/requests",wrapRead(requests),requests.data?.requests.length),
  metric("receipts","receipt","/clinic/finance",wrapRead(insights),insights.data?.revenue.netReceiptsAfn,true),
  metric("active","users","/clinic/patients",wrapRead(patients),patients.data?.counts.active)
 ]:role==="receptionist"?[
  metric("today","calendar","/clinic/appointments",wrapRead(schedule),schedule.data?.todayTotal),
  metric("arrived","clock","/clinic/appointments/queue",wrapRead(schedule),schedule.data?.counts.arrived),
  metric("pending","bell","/clinic/appointments/requests",wrapRead(requests),requests.data?.requests.length),
  metric("active","users","/clinic/patients",wrapRead(patients),patients.data?.counts.active)
 ]:[
  metric("today","calendar","/clinic/appointments",wrapRead(schedule),schedule.data?.todayTotal),
  metric("arrived","clock","/clinic/appointments/queue",wrapRead(schedule),schedule.data?.counts.arrived),
  metric("treating","dental","/clinic/clinical",wrapRead(schedule),schedule.data?.counts.in_treatment),
  metric("completed","check","/clinic/appointments",wrapRead(schedule),schedule.data?.counts.completed)
 ];
 const tasks:Task[]=[];
 if(booking&&requests.data?.requests.length)
  tasks.push({key:"online",count:requests.data.requests.length,href:"/clinic/appointments/requests"+p,icon:"bell"});
 if(scheduling&&schedule.data?.counts.confirmed)
  tasks.push({key:"waiting",count:schedule.data.counts.confirmed,href:"/clinic/appointments/queue"+p,icon:"clock"});
 if(manager&&operations.data&&operations.data.checklist.some(x=>!x.done))
  tasks.push({key:"setup",count:operations.data.checklist.filter(x=>!x.done).length,
   href:"/clinic/settings/hours"+p,icon:"settings"});
 if(role==="owner"&&clinicStatus!=="approved")
  tasks.push({key:"verification",href:"/clinic/onboarding"+p,icon:"shield"});
 const needed=[...(scheduling?[schedule]:[]),...(role!=="assistant"?[patients]:[]),
  ...(booking?[requests]:[]),...(manager?[operations]:[]),...(finance?[insights]:[])];
 const unresolved=needed.some(x=>x.loading||x.error||!x.data);
 return <section className="c5-command" aria-label={t("snapshot")}>
  <div className="c5-command-heading">
   <div><span className="c5-kicker"><CareIcon name="activity" size={16}/>{t(role)}</span>
    <h2>{t("snapshot")}</h2><p>{t("live")}</p></div>
   <span className="c5-command-badge"><CareIcon name="shield-check" size={15}/>{t("live")}</span>
  </div>
  <div className="c5-kpis">
   {cards.map(card=><a className="c5-kpi" key={card.key} href={card.href}
    aria-label={t(card.key)+(card.read.loading?"":": "+(card.value===undefined?t("notReady"):number(card.value,lang)))}>
    <span className="c5-kpi-head"><span>{t(card.key)}</span><CareIcon name={card.icon} size={18}/></span>
    {card.read.loading?<span className="c5-kpi-skeleton" role="status" aria-label={t("notReady")}/>:
     <strong className="c5-kpi-value" dir="auto">{card.read.error||card.value===undefined?
      t("metricUnavailable"):number(card.value,lang)}{!card.read.error&&card.value!==undefined&&card.currency&&
       <small dir="ltr"> AFN</small>}</strong>}
    <span className="c5-kpi-arrow" aria-hidden="true"><CareIcon name="arrow" size={15}/></span>
   </a>)}
  </div>
  <div className="c5-attention">
   <div className="c5-attention-title"><CareIcon name="bell" size={17}/><h3>{t("attention")}</h3></div>
   {tasks.length?<div className="c5-tasks">{tasks.map(task=><a key={task.key}
    className="c5-task" href={task.href}><span className="c5-task-icon">
     <CareIcon name={task.icon} size={17}/></span>
     <span>{t(task.key)}</span>{task.count!==undefined&&<strong dir="auto">{number(task.count,lang)}</strong>}
     <CareIcon name="chevron" size={15}/></a>)}</div>:
    <p className="c5-no-tasks" role="status">{t(unresolved?"limited":"allClear")}</p>}
  </div>
  {operations.data&&manager&&<div className="c5-coverage">
   <span><CareIcon name="users" size={16}/>{t("dentistCoverage")}: <strong dir="auto">{number(operations.data.metrics.scheduledDentists,lang)}</strong></span>
   <span><CareIcon name="clinic" size={16}/>{t("chairs")}: <strong dir="auto">{number(operations.data.metrics.chairs,lang)}</strong></span>
   <a href={"/clinic/settings/hours"+p}>{t("seeHours")} <CareIcon name="arrow" size={14}/></a>
  </div>}
 </section>;
}
export function ClinicDashboardInsights({clinicId,lang,days,onDaysChange,read}:{
 clinicId:string;lang:Locale;days:7|30;onDaysChange:(days:7|30)=>void;
 read:DashboardRead<ClinicInsights>;
}){
 const t=(key:string)=>label(lang,key),p=prefix(clinicId);
 const window=clinicReportWindow(days);
 // Server returns sparse days. Render explicit zeroes only *after* successful
 // retrieval; no placeholder bar can be mistaken for real clinic activity.
 const entries=new Map(read.data?.appointments.byDay.map(row=>[row.day,row.count])||[]);
 const fromDate=new Date(window.from+"T00:00:00.000Z");
 const points=Array.from({length:days},(_,i)=>{
  const d=new Date(fromDate);d.setUTCDate(d.getUTCDate()+i);
  const day=d.toISOString().slice(0,10);
  return {day,count:entries.get(day)||0};
 });
 const max=Math.max(1,...points.map(x=>x.count));
 const hasBookings=points.some(x=>x.count>0);
 return <section className="h-card c5-insights" aria-label={t("insights")}>
  <div className="h-card-heading c5-insights-head">
   <div><span className="h-kicker"><CareIcon name="chart" size={17}/>{t("readonly")}</span>
    <h2>{t("insights")}</h2><p>{t("periodNote")}</p></div>
   <div className="c5-period-picker" role="group" aria-label={t("periodNote")}>
    {([7,30] as const).map(n=><button key={n} type="button"
     className={days===n?"c5-period active":"c5-period"} aria-pressed={days===n}
     onClick={()=>onDaysChange(n)}>{t(n===7?"period7":"period30")}</button>)}
   </div>
  </div>
  {read.loading?<ClinicLoadingState label={t("insights")} variant="cards"/>:
   read.error?<ClinicFailureState title={t("error")}
    message={clinicErrorText(read.error,lang)} onRetry={read.refresh} retryLabel={t("retry")}/>:
   read.data?<div className="c5-insight-body">
    <div className="c5-money-grid">
     {([{key:"receipts",value:read.data.revenue.netReceiptsAfn},
       {key:"invoices",value:read.data.revenue.issuedInvoices},
       {key:"faceValue",value:read.data.revenue.issuedFaceValueAfn},
       {key:"expenses",value:read.data.revenue.postedExpensesAfn}] as const).map(item=>
       <div className="c5-money-stat" key={item.key}>
        <span>{t(item.key)}</span><strong dir="auto">{number(item.value,lang)}
         {item.key!=="invoices"&&<small dir="ltr"> AFN</small>}</strong>
       </div>)}
    </div>
    <div className="c5-chart-heading"><div><h3>{t("daily")}</h3>
     <p>{t("chartHelp")}</p></div><strong dir="auto">{number(read.data.appointments.total,lang)}</strong></div>
    {hasBookings?<div className="c5-chart-scroll" tabIndex={0} role="region" aria-label={t("daily")}>
     <div className="c5-bars" style={{"--c5-days":days} as React.CSSProperties}>
      {points.map(x=><div key={x.day} className="c5-bar-column" role="img"
       aria-label={x.day+": "+number(x.count,lang)}>
       <span className="c5-bar-count" dir="auto">{x.count?number(x.count,lang):""}</span>
       <span className="c5-bar-track"><span className="c5-bar-fill"
        style={{height:(x.count/max*100)+"%"}}/></span>
       <time dateTime={x.day} dir="ltr">{x.day.slice(5)}</time>
      </div>)}
     </div></div>:<div className="c5-chart-empty" role="status">{t("noActivity")}</div>}
    <p className="c5-finance-note"><CareIcon name="about" size={15}/>{t("moneyNote")}</p>
    <div className="c5-insight-links">
     <a className="btn btn-secondary" href={"/clinic/reports"+p}>{t("report")}</a>
     <a className="btn btn-secondary" href={"/clinic/finance"+p}>{t("finance")}</a>
    </div>
   </div>:null}
 </section>;
}
