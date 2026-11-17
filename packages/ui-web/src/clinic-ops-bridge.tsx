"use client";
import React from "react";
import {CareIcon,usePreferences,type CareIconName} from "./index";
import {clinicOpsAreas,clinicOpsHref,type ClinicOpsArea,type ClinicOpsRole}
 from "./clinic-ops-bridge-model";

const icon:Record<ClinicOpsArea,CareIconName>={
 appointments:"calendar",queue:"users",requests:"clock",
 notifications:"mail",reports:"chart-columns",finance:"receipt"
};
const words={
 en:{
  title:"Clinic workflow shortcuts",intro:"Navigate connected clinic operations without changing clinic.",
  appointments:"Calendar",queue:"Patient queue",requests:"Online requests",
  notifications:"Delivery monitoring",reports:"Reports",finance:"Finance",
  private:"Clinic-only • role restricted"
 },
 "fa-AF":{
  title:"راه‌های سریع کارهای کلینیک",intro:"بین بخش‌های مرتبط بدون تغییر کلینیک حرکت کنید.",
  appointments:"تقویم",queue:"صف مریضان",requests:"درخواست‌های آنلاین",
  notifications:"وضعیت ارسال",reports:"گزارش‌ها",finance:"مالی",
  private:"تنها کلینیک • محدود به صلاحیت"
 },
 "ps-AF":{
  title:"د کلینیک چټکې لارې",intro:"په همدې کلینیک کې اړوند برخو ته ورشئ.",
  appointments:"مهالوېش",queue:"د ناروغانو کتار",requests:"انلاین غوښتنې",
  notifications:"د خبرتیا څارنه",reports:"راپورونه",finance:"مالي چارې",
  private:"یوازې کلینیک • محدود لاسرسی"
 }
} as const;
export function ClinicOpsBridge({clinicId,role,active,date}:{
 clinicId:string;role:ClinicOpsRole;active:ClinicOpsArea;date?:string;
}){
 const {locale}=usePreferences();
 const t=words[locale as keyof typeof words]||words.en;
 const visible=clinicOpsAreas(role);
 if(!visible.length)return null;
 return <nav className="clinic-phase14-bridge" aria-label={t.title}>
  <div className="clinic-phase14-bridge-label">
   <span className="clinic-phase14-bridge-icon">
    <CareIcon name="layers" size={19}/></span>
   <div><strong>{t.title}</strong><p>{t.intro}</p></div>
  </div>
  <div className="clinic-phase14-bridge-links">
   {visible.map(area=><a key={area}
    href={clinicOpsHref(area,clinicId,area==="appointments"?date:undefined)}
    aria-current={active===area?"page":undefined}
    className={"clinic-phase14-bridge-link"+(active===area?" is-active":"")}>
    <CareIcon name={icon[area]} size={17}/>{t[area]}</a>)}
  </div>
  <p className="clinic-phase14-bridge-privacy">
   <CareIcon name="shield-check" size={15}/>{t.private}</p>
 </nav>;
}
