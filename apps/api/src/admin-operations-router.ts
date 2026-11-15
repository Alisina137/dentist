import {Router,type Request,type Response,type NextFunction} from "express";
import {sqlClient} from "@dandanlink/db";
import {getPilotReadiness} from "./pilot-gate.js";
import {OpsFault,opsIdentity,opsTask,opsAdmin,opsFail,opsAudit,privateOps} from "./ops-access.js";

const alertDefs=[
 {key:"delivery_backlog",severity:"critical",href:"/admin/monitoring",group:"delivery"},
 {key:"booking_notifications_failed",severity:"critical",href:"/admin/monitoring",group:"delivery"},
 {key:"support_first_reply_overdue",severity:"warning",href:"/admin/support?status=all&urgency=response",group:"support"},
 {key:"support_triage_overdue",severity:"warning",href:"/admin/support?status=all&urgency=triage",group:"support"},
 {key:"high_priority_support",severity:"warning",href:"/admin/support?status=all&priority=high",group:"support"},
 {key:"unassigned_support",severity:"info",href:"/admin/support?status=all&assigned=unassigned",group:"support"},
 {key:"payment_reviews_overdue",severity:"warning",href:"/admin/subscriptions?status=awaiting",group:"finance"},
 {key:"clinic_reviews_overdue",severity:"warning",href:"/admin/clinics?status=pending",group:"verification"},
 {key:"security_denials",severity:"warning",href:"/admin/security",group:"security"}
] as const;
type AlertKey=(typeof alertDefs)[number]["key"];
type MetricName=AlertKey|"pendingClinics"|"pendingListings"|"openTickets"|"paidInvoices14";
function requireKey(value:unknown):AlertKey{
 const def=alertDefs.find(x=>x.key===value);
 if(!def)opsFail(422,"INVALID_ALERT_KEY");
 return def.key;
}
function dayInKabul(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date()).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 return [parts.year,parts.month,parts.day].join("-");
}
function addDay(day:string,delta:number){
 const date=new Date(day+"T12:00:00Z");date.setUTCDate(date.getUTCDate()+delta);
 return date.toISOString().slice(0,10);
}
function validateQ(query:unknown){
 if(typeof query!=="string")opsFail(422,"INVALID_QUERY");
 const q=query.trim();
 if(q.length<2||q.length>80||/[\u0000-\u001f]/.test(q))opsFail(422,"INVALID_QUERY");
 return q;
}
export function adminOperationsRouter(){
 const router=Router();
 // Origin check for writes, matching other protected operations.
 router.use((req,res,next)=>{
  if(["GET","HEAD","OPTIONS"].includes(req.method))return next();
  const allowed=[process.env.ADMIN_WEB_URL||"http://localhost:3000",
   process.env.CLINIC_WEB_URL||"http://localhost:3001",
   process.env.PATIENT_WEB_URL||"http://localhost:3002"];
  if(!req.headers.origin||!allowed.includes(req.headers.origin)){
   res.status(403).json({code:"ORIGIN_DENIED"});return;
  }
  next();
 });
 router.use(opsIdentity);
 router.get("/search",opsTask(async(req,res)=>{
  opsAdmin(req);
  const q=validateQ(req.query.q),needle="%"+q+"%";
  // Limited metadata only. Never search medical charts, patient identities, message bodies,
  // clinic billing, authentication records or payment amounts.
  const [clinics,dentists,listings,invoices,tickets]=await Promise.all([
   sqlClient`SELECT id,display_name,city,status FROM clinics
    WHERE display_name ILIKE ${needle} OR city ILIKE ${needle}
    ORDER BY updated_at DESC,id LIMIT 5`,
   sqlClient`SELECT v.membership_id,d.display_name AS dentist_name,
    c.display_name AS clinic_name,v.status FROM clinic_dentist_credential_cases v
    JOIN clinic_dentist_drafts d ON d.membership_id=v.membership_id
    JOIN clinics c ON c.id=v.clinic_id
    WHERE d.display_name ILIKE ${needle} OR c.display_name ILIKE ${needle}
    ORDER BY v.updated_at DESC,v.membership_id LIMIT 5`,
   sqlClient`SELECT h.clinic_id,c.display_name,c.city,
    h.pending_version,h.hidden FROM clinic_listing_heads h
    JOIN clinics c ON c.id=h.clinic_id
    WHERE c.display_name ILIKE ${needle} OR c.city ILIKE ${needle}
    ORDER BY h.updated_at DESC,h.clinic_id LIMIT 5`,
   sqlClient`SELECT i.id,c.display_name,i.status FROM platform_subscription_invoices i
    JOIN clinics c ON c.id=i.clinic_id WHERE c.display_name ILIKE ${needle}
     OR i.evidence_reference ILIKE ${needle}
    ORDER BY i.created_at DESC,i.id LIMIT 5`,
   sqlClient`SELECT id,reference,title,status FROM support_tickets
    WHERE reference ILIKE ${needle} OR title ILIKE ${needle}
    ORDER BY updated_at DESC,id LIMIT 5`
  ]);
  const results=[
   ...clinics.map(x=>({type:"clinics",id:String(x.id),title:String(x.display_name),
    detail:String(x.city||""),status:String(x.status),href:"/admin/clinics/"+encodeURIComponent(String(x.id))})),
   ...dentists.map(x=>({type:"dentists",id:String(x.membership_id),title:String(x.dentist_name),
    detail:String(x.clinic_name),status:String(x.status),href:"/admin/dentists/"+encodeURIComponent(String(x.membership_id))})),
   ...listings.map(x=>({type:"listings",id:String(x.clinic_id),title:String(x.display_name),
    detail:String(x.city||""),status:x.pending_version!=null?"pending":x.hidden?"hidden":"published",
    href:"/admin/listings/"+encodeURIComponent(String(x.clinic_id))})),
   ...invoices.map(x=>({type:"invoices",id:String(x.id),title:String(x.display_name),
    detail:"",status:String(x.status),href:"/admin/subscriptions?status="+
     (x.status==="awaiting"?"awaiting":x.status==="paid"?"paid":"void")})),
   ...tickets.map(x=>({type:"tickets",id:String(x.id),title:String(x.reference),
    detail:String(x.title),status:String(x.status),href:"/admin/support/"+encodeURIComponent(String(x.id))}))
  ];
  privateOps(res);res.json({query:q,results,limitPerType:5,generatedAt:new Date().toISOString()});
 }));
 router.get("/overview",opsTask(async(req,res)=>{
  opsAdmin(req);
  const end=dayInKabul(),begin=addDay(end,-13);
  const [signals,snoozes,trend,activity]=await Promise.all([
   sqlClient`SELECT
    (SELECT count(*)::int FROM outbox_events WHERE state='pending'
     AND available_at<now()-interval '15 minutes') AS delivery_backlog,
    (SELECT count(*)::int FROM patient_booking_notifications WHERE status='failed')
     AS booking_notifications_failed,
    (SELECT count(*)::int FROM support_tickets t WHERE t.status NOT IN ('resolved','closed')
     AND t.created_at<now()-interval '24 hours'
     AND NOT EXISTS(SELECT 1 FROM support_ticket_messages m WHERE m.ticket_id=t.id
      AND m.author_role='support')) AS support_first_reply_overdue,
    (SELECT count(*)::int FROM support_tickets
     WHERE status IN ('open','in_progress') AND created_at<now()-interval '48 hours')
     AS support_triage_overdue,
    (SELECT count(*)::int FROM support_tickets
     WHERE status NOT IN ('resolved','closed') AND priority='high') AS high_priority_support,
    (SELECT count(*)::int FROM support_tickets
     WHERE status NOT IN ('resolved','closed') AND assignee_id IS NULL) AS unassigned_support,
    (SELECT count(*)::int FROM platform_subscription_invoices
     WHERE status='awaiting' AND created_at<now()-interval '48 hours') AS payment_reviews_overdue,
    (SELECT count(*)::int FROM clinics
     WHERE status='pending' AND submitted_at<now()-interval '48 hours') AS clinic_reviews_overdue,
    (SELECT count(*)::int FROM audit_events
     WHERE outcome IN ('failure','failed','denied') AND created_at>now()-interval '24 hours')
     AS security_denials,
    (SELECT count(*)::int FROM clinics WHERE status='pending') AS pending_clinics,
    (SELECT count(*)::int FROM clinic_listing_heads WHERE pending_version IS NOT NULL)
     AS pending_listings,
    (SELECT count(*)::int FROM support_tickets WHERE status IN ('open','in_progress')) AS open_tickets,
    (SELECT count(*)::int FROM platform_subscription_invoices
     WHERE status='paid' AND verified_at>now()-interval '14 days') AS paid_invoices14`,
   sqlClient`SELECT alert_key,until_at FROM platform_admin_alert_snoozes
    WHERE user_id=${req.opsActor!.id} AND until_at>now()`,
   sqlClient`SELECT day, sum(opened)::int AS support_opened,
     sum(confirmed)::int AS invoices_confirmed,sum(denied)::int AS access_failures
    FROM (
      SELECT (created_at AT TIME ZONE 'Asia/Kabul')::date::text AS day,
        count(*)::int AS opened,0::int AS confirmed,0::int AS denied
      FROM support_tickets WHERE created_at>=(${begin}::date::timestamp AT TIME ZONE 'Asia/Kabul')
       AND created_at<((${end}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')
      GROUP BY 1
      UNION ALL
      SELECT (verified_at AT TIME ZONE 'Asia/Kabul')::date::text,
       0::int,count(*)::int,0::int FROM platform_subscription_invoices
      WHERE status='paid'
       AND verified_at>=(${begin}::date::timestamp AT TIME ZONE 'Asia/Kabul')
       AND verified_at<((${end}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')
      GROUP BY 1
      UNION ALL
      SELECT (created_at AT TIME ZONE 'Asia/Kabul')::date::text,
       0::int,0::int,count(*)::int FROM audit_events
      WHERE outcome IN ('failure','failed','denied')
       AND created_at>=(${begin}::date::timestamp AT TIME ZONE 'Asia/Kabul')
       AND created_at<((${end}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')
      GROUP BY 1
    ) d GROUP BY day ORDER BY day`,
   sqlClient`SELECT action,outcome,created_at FROM audit_events
    WHERE created_at>now()-interval '7 days'
     AND (action LIKE 'support.%' OR action LIKE 'subscription.%'
      OR action LIKE 'clinic.%' OR action LIKE 'listing.%')
    ORDER BY created_at DESC,id DESC LIMIT 12`
  ]);
  const raw=signals[0],untilByKey=new Map(snoozes.map(x=>[String(x.alert_key),x.until_at]));
  const alerts=alertDefs.flatMap(def=>{
   const count=Number(raw[def.key]??0);
   return count>0?[{...def,count,snoozedUntil:untilByKey.get(def.key)??null}]:[];
  });
  const metrics=Object.fromEntries(
   (["pendingClinics","pendingListings","openTickets","paidInvoices14"] as MetricName[])
    .map((key,index)=>[key,Number(raw[["pending_clinics","pending_listings","open_tickets","paid_invoices14"][index]]??0)])
  );
  const daily=new Map(trend.map(x=>[String(x.day),x]));
  const activityTrend=Array.from({length:14},(_,index)=>{
   const day=addDay(begin,index),record=daily.get(day);
   return {day,supportOpened:Number(record?.support_opened??0),
    invoicesConfirmed:Number(record?.invoices_confirmed??0),
    accessFailures:Number(record?.access_failures??0)};
  });
  const active=alerts.filter(x=>!x.snoozedUntil);
  privateOps(res);res.json({
   generatedAt:new Date().toISOString(),
   timezone:"Asia/Kabul",
   alerts,activeCount:active.length,criticalCount:active.filter(x=>x.severity==="critical").length,
   metrics,checks:{databaseResponsive:true,pilotReleaseEnabled:getPilotReadiness().releaseEnabled,
    note:"Live database reachability only. No certification of backups, external monitoring, clinical readiness or legal approval."},
   activityTrend,
   recentActions:activity.map(x=>({action:String(x.action),outcome:String(x.outcome),at:x.created_at})),
   privacy:"Admin-only aggregate operational signals. No patient, clinic, payment-reference or user identifiers."
  });
 }));
 router.post("/alerts/:key/snooze",opsTask(async(req,res)=>{
  opsAdmin(req);
  const key=requireKey(req.params.key);
  await sqlClient`INSERT INTO platform_admin_alert_snoozes(user_id,alert_key,until_at)
   VALUES(${req.opsActor!.id},${key},now()+interval '12 hours')
   ON CONFLICT(user_id,alert_key) DO UPDATE SET
    snoozed_at=now(),until_at=now()+interval '12 hours'`;
  await opsAudit(req.opsActor!.id,"admin.alert.snoozed","operational_alert",key);
  privateOps(res);res.json({key,snoozedHours:12});
 }));
 router.delete("/alerts/:key/snooze",opsTask(async(req,res)=>{
  opsAdmin(req);
  const key=requireKey(req.params.key);
  await sqlClient`DELETE FROM platform_admin_alert_snoozes
   WHERE user_id=${req.opsActor!.id} AND alert_key=${key}`;
  await opsAudit(req.opsActor!.id,"admin.alert.unsnoozed","operational_alert",key);
  privateOps(res);res.json({key,snoozed:false});
 }));
 router.use((err:unknown,_req:Request,res:Response,next:NextFunction)=>{
  if(err instanceof OpsFault){privateOps(res);res.status(err.status).json({code:err.code});return;}
  next(err);
 });
 return router;
}
