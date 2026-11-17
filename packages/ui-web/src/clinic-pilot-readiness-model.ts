/**
 * Clinic improvement Phase 16.
 * Release attestations are external, evidence-backed and NOT editable here.
 * Even a true server release flag is not independent clinical/legal certification.
 */
export const pilotReviewControls=[
 {id:"legalPrivacy",en:"Legal, privacy and consent",fa:"قانون، حریم خصوصی و رضایت",ps:"قانون، محرمیت او رضایت"},
 {id:"clinicalReview",en:"Clinical and credential review",fa:"بررسی طبی و اسناد مسلکی",ps:"د طبي اسنادو او خوندیتوب کتنه"},
 {id:"hostingEncryption",en:"Hosting, encryption and key custody",fa:"هاست، رمزگذاری و مدیریت کلیدها",ps:"کوربه، کوډ کول او د کیلي ساتنه"},
 {id:"backupRestore",en:"Independent backup and restore drill",fa:"آزمایش مستقل پشتیبان و بازیابی",ps:"د بیک اپ او بېرته راګرځولو ازموینه"},
 {id:"penetrationTest",en:"Independent penetration and authorization test",fa:"آزمایش مستقل امنیت و صلاحیت",ps:"خپلواکه امنیتي ازموینه"},
 {id:"accessReview",en:"Staff roles, MFA and privileged access",fa:"نقش‌ها، MFA و دسترسی ویژه",ps:"د کارکوونکو رولونه او MFA"},
 {id:"criticalAlerts",en:"Monitoring, incident response and escalation",fa:"نظارت، پاسخ به حادثه و گزارش",ps:"څارنه او د پېښو ځواب"},
 {id:"accessibilityRTL",en:"Accessibility, RTL and device validation",fa:"دسترسی‌پذیری، RTL و بررسی دستگاه",ps:"لاسرسی، RTL او د وسایلو ازموینه"},
 {id:"pilotRoster",en:"Consented, verified pilot-clinic roster",fa:"فهرست کلینیک‌های تأییدشده و رضایتمند",ps:"د تایید شويو آزمایښتي کلینیکونو لېست"}
] as const;
export type PilotSignal="unverified"|"blocked"|"operator_marked_requires_evidence";
export function pilotSignal(payload:unknown):PilotSignal{
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return "unverified";
 const data=payload as Record<string,unknown>;
 if(data.product!=="DandanLink"||typeof data.pilotReleaseEnabled!=="boolean")
  return "unverified";
 return data.pilotReleaseEnabled?"operator_marked_requires_evidence":"blocked";
}
export type AuditSignal={events:number|null;successful:number|null;failed:number|null;
 mostRecentAt:string|null;bounded:boolean};
export function pilotAuditSignal(payload:unknown):AuditSignal{
 const unknown={events:null,successful:null,failed:null,mostRecentAt:null,bounded:true};
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return unknown;
 const data=payload as {events?:unknown};
 if(!Array.isArray(data.events)||data.events.length>60)return unknown;
 const seen=new Set<string>();
 let success=0,fail=0,latest:string|null=null;
 for(const row of data.events){
  if(!row||typeof row!=="object"||Array.isArray(row))return unknown;
  const event=row as Record<string,unknown>;
  if(typeof event.action!=="string"||!/^[a-z][a-z0-9_.]{0,79}$/.test(event.action)||
   typeof event.outcome!=="string"||
   !["success","failure","denied","error"].includes(event.outcome)||
   typeof event.createdAt!=="string"||!Number.isFinite(Date.parse(event.createdAt))||
   typeof event.id!=="string"||!event.id||seen.has(event.id))return unknown;
  seen.add(event.id);
  if(event.outcome==="success")success++;else fail++;
  if(latest===null||event.createdAt>latest)latest=event.createdAt;
 }
 return {events:data.events.length,successful:success,failed:fail,
  mostRecentAt:latest,bounded:true};
}
export function pilotControlLabel(id:string,locale:"en"|"fa-AF"|"ps-AF"):string{
 const match=pilotReviewControls.find(x=>x.id===id);
 return match?(locale==="fa-AF"?match.fa:locale==="ps-AF"?match.ps:match.en):"";
}
