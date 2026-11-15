import {Router,type Request,type Response,type NextFunction} from "express";
import {sqlClient} from "@dandanlink/db";
import {OpsFault,opsIdentity,opsTask,opsAdmin,opsFail,privateOps} from "./ops-access.js";

type Alert={key:string;kind:string;severity:"critical"|"warning"|"info";count:number;
 title:string;description:string;href:string;occurredAt:string;read:boolean};
function searchValue(q:unknown){
 if(typeof q!=="string"||q.trim().length<2||q.trim().length>100)opsFail(422,"INVALID_SEARCH");
 return q.trim();
}
function categoryValue(value:unknown){
 const category=String(value??"all");
 if(!["all","clinics","dentists","listings","invoices","support"].includes(category))
  opsFail(422,"INVALID_SEARCH_CATEGORY");
 return category;
}
const asNum=(x:unknown)=>Number(x??0);
async function getAlerts(adminId:string):Promise<Alert[]>{
 const [clinic,credentials,listings,reviews,finance,support,delivery,latest,reads]=await Promise.all([
  sqlClient`SELECT count(*)::int AS total,max(updated_at) AS newest FROM clinics
   WHERE status='pending'`,
  sqlClient`SELECT count(*)::int AS total,max(updated_at) AS newest
   FROM clinic_dentist_credential_cases WHERE status='pending'`,
  sqlClient`SELECT count(*)::int AS total,max(updated_at) AS newest
   FROM clinic_listing_heads WHERE pending_version IS NOT NULL`,
  sqlClient`SELECT count(*)::int AS total,max(v.submitted_at) AS newest
   FROM patient_visit_reviews r JOIN patient_review_versions v ON
    v.review_id=r.id AND v.version=r.current_version
   WHERE v.state='pending' AND r.withdrawn_at IS NULL`,
  sqlClient`SELECT count(*)::int AS total,max(created_at) AS newest
   FROM platform_subscription_invoices WHERE status='awaiting'
    AND created_at<now()-interval '48 hours'`,
  sqlClient`SELECT count(*)::int AS total,max(updated_at) AS newest
   FROM support_tickets WHERE status IN ('open','in_progress')
    AND created_at<now()-interval '48 hours'`,
  sqlClient`SELECT
    (SELECT count(*)::int FROM outbox_events WHERE state='pending'
     AND available_at<now()-interval '15 minutes') AS late,
    (SELECT count(*)::int FROM patient_booking_notifications
     WHERE status='failed') AS failed`,
  sqlClient`SELECT id,action,outcome,created_at FROM audit_events
   WHERE created_at>=now()-interval '14 days'
    AND (action LIKE 'clinic.%' OR action LIKE 'subscription.%'
     OR action LIKE 'support.%' OR action LIKE 'credential.%'
     OR action LIKE 'listing.%' OR action LIKE 'review.%')
   ORDER BY created_at DESC,id DESC LIMIT 12`,
  sqlClient`SELECT notice_key FROM admin_notice_reads WHERE admin_id=${adminId}`
 ]);
 const seen=new Set(reads.map(x=>String(x.notice_key)));
 const base:Alert[]=[];
 function add(kind:string,count:number,last:unknown,href:string,title:string,
  description:string,severity:"critical"|"warning"|"info"="warning"){
  if(count<=0)return;
  const timestamp=last?new Date(String(last)).toISOString():"";
  // Updated timestamp binds acknowledgements to the current queue snapshot.
  const stamp=timestamp?Date.parse(timestamp).toString(36):"0";
  const key="queue:"+kind+":"+count+":"+stamp;
  base.push({key,kind,severity,count,title,description,href,
   occurredAt:timestamp||new Date().toISOString(),read:seen.has(key)});
 }
 add("clinics",asNum(clinic[0].total),clinic[0].newest,
  "/admin/clinics?status=pending","Clinics awaiting verification",
  "Review submitted clinic credentials.");
 add("dentists",asNum(credentials[0].total),credentials[0].newest,
  "/admin/dentists?status=pending","Dentist credentials awaiting review",
  "Review professional evidence.");
 add("listings",asNum(listings[0].total),listings[0].newest,
  "/admin/listings?status=pending","Listing revisions awaiting review",
  "Compare proposed listing changes.");
 add("reviews",asNum(reviews[0].total),reviews[0].newest,
  "/admin/reviews","Patient reviews awaiting moderation",
  "Review published-content policy without exposing medical records.");
 add("invoices",asNum(finance[0].total),finance[0].newest,
  "/admin/subscriptions?status=awaiting","Subscription payments older than 48 hours",
  "Check payment evidence independently before verifying.","critical");
 add("support",asNum(support[0].total),support[0].newest,
  "/admin/support","Support requests older than 48 hours",
  "Review unanswered or untriaged support cases.","critical");
 add("outbox",asNum(delivery[0].late),null,"/admin/center",
  "Delayed delivery events","Inspect the delivery queue; alerts are not delivery confirmations.","critical");
 add("notifications",asNum(delivery[0].failed),null,"/admin/center",
  "Failed booking notifications","Review notification delivery failures.","critical");
 for(const e of latest){
  const action=String(e.action);
  const kind=action.split(".")[0];
  const href=kind==="subscription"?"/admin/subscriptions":kind==="support"?"/admin/support":
   kind==="clinic"?"/admin/clinics":kind==="credential"?"/admin/dentists":
   kind==="listing"?"/admin/listings":"/admin/reviews";
  const key="event:"+String(e.id);
  base.push({key,kind,severity:e.outcome==="success"?"info":"warning",count:1,
   title:action.replace(/[._]/g," "),description:e.outcome==="success"?
    "Administrative activity recorded.":"An administrative action reported an unsuccessful outcome.",
   href,occurredAt:new Date(String(e.created_at)).toISOString(),read:seen.has(key)});
 }
 return base.sort((a,b)=>Number(a.read)-Number(b.read)||
  ({critical:0,warning:1,info:2}[a.severity]-
   {critical:0,warning:1,info:2}[b.severity])||
  Date.parse(b.occurredAt)-Date.parse(a.occurredAt)).slice(0,25);
}

export function adminCenterRouter(){
 const router=Router();
 router.use(opsIdentity);
 router.get("/search",opsTask(async(req,res)=>{
  opsAdmin(req);
  const q=searchValue(req.query.q),category=categoryValue(req.query.category);
  const pattern="%"+q+"%";
  const selected=(name:string)=>category==="all"||category===name;
  const [clinics,dentists,listings,invoices,support]=await Promise.all([
   selected("clinics")?sqlClient`SELECT id,display_name,status,city,province
    FROM clinics WHERE display_name ILIKE ${pattern} OR legal_name ILIKE ${pattern}
     OR city ILIKE ${pattern} ORDER BY updated_at DESC,id LIMIT 6`:Promise.resolve([]),
   selected("dentists")?sqlClient`SELECT v.membership_id AS id,d.display_name AS label,
     c.display_name AS clinic_name,v.status
    FROM clinic_dentist_credential_cases v
    JOIN clinic_dentist_drafts d ON d.membership_id=v.membership_id
    JOIN clinics c ON c.id=v.clinic_id
    WHERE d.display_name ILIKE ${pattern} OR c.display_name ILIKE ${pattern}
    ORDER BY v.updated_at DESC,v.membership_id LIMIT 6`:Promise.resolve([]),
   selected("listings")?sqlClient`SELECT h.clinic_id AS id,c.display_name AS label,
     c.city,h.pending_version,h.hidden
    FROM clinic_listing_heads h JOIN clinics c ON c.id=h.clinic_id
    WHERE c.display_name ILIKE ${pattern} OR c.city ILIKE ${pattern}
    ORDER BY h.updated_at DESC,h.clinic_id LIMIT 6`:Promise.resolve([]),
   selected("invoices")?sqlClient`SELECT i.id,i.status,i.amount_afn,c.display_name AS label,
     i.evidence_reference
    FROM platform_subscription_invoices i JOIN clinics c ON c.id=i.clinic_id
    WHERE c.display_name ILIKE ${pattern} OR i.evidence_reference ILIKE ${pattern}
    ORDER BY i.created_at DESC,i.id LIMIT 6`:Promise.resolve([]),
   selected("support")?sqlClient`SELECT id,reference,title,status,priority
    FROM support_tickets WHERE title ILIKE ${pattern} OR reference ILIKE ${pattern}
    ORDER BY updated_at DESC,id LIMIT 6`:Promise.resolve([])
  ]);
  const results=[
   ...clinics.map(x=>({id:x.id,category:"clinics",title:x.display_name,
    detail:[x.city,x.province,x.status].filter(Boolean).join(" · "),
    href:"/admin/clinics/"+encodeURIComponent(String(x.id))})),
   ...dentists.map(x=>({id:x.id,category:"dentists",title:x.label,
    detail:[x.clinic_name,x.status].filter(Boolean).join(" · "),
    href:"/admin/dentists/"+encodeURIComponent(String(x.id))})),
   ...listings.map(x=>({id:x.id,category:"listings",title:x.label,
    detail:[x.city,x.pending_version?"pending":"published"].filter(Boolean).join(" · "),
    href:"/admin/listings/"+encodeURIComponent(String(x.id))})),
   ...invoices.map(x=>({id:x.id,category:"invoices",title:x.label,
    detail:[x.status,Number(x.amount_afn)+" AFN"].join(" · "),
    href:"/admin/subscriptions?status="+encodeURIComponent(String(x.status))})),
   ...support.map(x=>({id:x.id,category:"support",title:x.title,
    detail:[x.reference,x.status,x.priority].join(" · "),
    href:"/admin/support/"+encodeURIComponent(String(x.id))}))
  ];
  privateOps(res);res.json({results,q,category,limitedTo:6,totalReturned:results.length,
   note:"Only platform administrative records. No patient identities, medical charts or support bodies."});
 }));
 router.get("/notices",opsTask(async(req,res)=>{
  opsAdmin(req);
  const notices=await getAlerts(req.opsActor!.id);
  privateOps(res);res.json({notices,unread:notices.filter(x=>!x.read).length,
   refreshedAt:new Date().toISOString(),pollSeconds:60});
 }));
 // Defence in depth, as on other PH18 support writes.
 router.post("/notices/read",opsTask(async(req,res)=>{
  opsAdmin(req);
  const origin=req.headers.origin;
  const allowed=[process.env.ADMIN_WEB_URL||"http://localhost:3000",
   ...(process.env.NODE_ENV==="production"?[]:["http://localhost:3001"])];
  // Never grant an alternate local development origin in production.
  if(!origin||!allowed.includes(origin))opsFail(403,"ORIGIN_DENIED");
  const key=req.body?.key;
  if(typeof key!=="string"||!/^(?:queue:[a-z]+:[0-9]+:[a-z0-9]+|event:[\w-]{8,100})$/.test(key))
   opsFail(422,"INVALID_NOTICE_KEY");
  const alerts=await getAlerts(req.opsActor!.id);
  if(!alerts.some(x=>x.key===key))opsFail(404,"NOTICE_NOT_FOUND");
  await sqlClient`INSERT INTO admin_notice_reads(admin_id,notice_key,read_at)
   VALUES(${req.opsActor!.id},${key},now())
   ON CONFLICT(admin_id,notice_key) DO UPDATE SET read_at=now()`;
  privateOps(res);res.json({read:true,key});
 }));
 router.get("/monitoring",opsTask(async(req,res)=>{
  opsAdmin(req);
  const [queues,support,authEvents,trend]=await Promise.all([
   sqlClient`SELECT
    (SELECT count(*)::int FROM outbox_events WHERE state='pending') AS outbox_pending,
    (SELECT count(*)::int FROM outbox_events WHERE state='pending'
      AND available_at<now()-interval '15 minutes') AS outbox_delayed,
    (SELECT count(*)::int FROM patient_booking_notifications WHERE status='failed') AS failed_booking_notices,
    (SELECT count(*)::int FROM platform_subscription_invoices WHERE status='awaiting'
      AND created_at<now()-interval '48 hours') AS payment_backlog`,
   sqlClient`SELECT count(*) FILTER (WHERE status IN ('open','in_progress') AND
    created_at<now()-interval '48 hours')::int AS triage_overdue,
    count(*) FILTER (WHERE status NOT IN ('closed','resolved')
     AND created_at<now()-interval '24 hours'
     AND NOT EXISTS(SELECT 1 FROM support_ticket_messages m
      WHERE m.ticket_id=support_tickets.id AND m.author_role='support'))::int AS first_reply_overdue
    FROM support_tickets`,
   sqlClient`SELECT count(*)::int AS errors_last24
    FROM audit_events WHERE outcome<>'success' AND created_at>=now()-interval '24 hours'`,
   sqlClient`SELECT (created_at AT TIME ZONE 'Asia/Kabul')::date::text AS day,
    count(*) FILTER (WHERE outcome='success')::int AS successful,
    count(*) FILTER (WHERE outcome<>'success')::int AS failed
    FROM audit_events WHERE created_at>=now()-interval '14 days'
     AND (action LIKE 'clinic.%' OR action LIKE 'subscription.%'
      OR action LIKE 'support.%' OR action LIKE 'listing.%' OR action LIKE 'review.%')
    GROUP BY 1 ORDER BY day`
  ]);
  const q=queues[0],s=support[0];
  const metrics=[
   {key:"database",value:1,severity:"healthy",description:"Database queries completed during this request."},
   {key:"outboxPending",value:asNum(q.outbox_pending),severity:"info",description:"Queued delivery events."},
   {key:"outboxDelayed",value:asNum(q.outbox_delayed),severity:q.outbox_delayed>0?"critical":"healthy",
    description:"Queued delivery events delayed more than 15 minutes."},
   {key:"failedNotices",value:asNum(q.failed_booking_notices),severity:q.failed_booking_notices>0?"critical":"healthy",
    description:"Failed booking notifications; delivery not confirmed."},
   {key:"overduePayments",value:asNum(q.payment_backlog),severity:q.payment_backlog>0?"warning":"healthy",
    description:"Awaiting subscription payment review for more than 48 hours."},
   {key:"triageOverdue",value:asNum(s.triage_overdue),severity:s.triage_overdue>0?"warning":"healthy",
    description:"Open support cases requiring triage over 48 hours."},
   {key:"firstReplyOverdue",value:asNum(s.first_reply_overdue),severity:s.first_reply_overdue>0?"warning":"healthy",
    description:"Support cases without first staff reply after 24 hours."},
   {key:"auditFailures",value:asNum(authEvents[0].errors_last24),
    severity:authEvents[0].errors_last24>0?"warning":"healthy",
    description:"Audit outcomes marked unsuccessful during last 24 hours."}
  ];
  privateOps(res);res.json({metrics,trend:trend.map(x=>({
   day:x.day,successful:asNum(x.successful),failed:asNum(x.failed)})),
   generatedAt:new Date().toISOString(),timezone:"Asia/Kabul",
   scope:"Application database and queue signals only; no synthetic probe, uptime guarantee or human safety certification.",
   launchReadiness:"Production clinical/legal, privacy, backups and infrastructure checks require separate signed approval."});
 }));
 router.use((error:unknown,_req:Request,res:Response,next:NextFunction)=>{
  if(error instanceof OpsFault){privateOps(res);res.status(error.status).json({code:error.code});return;}
  next(error);
 });
 return router;
}
