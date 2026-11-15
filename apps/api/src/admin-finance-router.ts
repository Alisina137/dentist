import {Router,type Request,type Response,type NextFunction} from "express";
import {sqlClient} from "@dandanlink/db";
import {OpsFault,opsIdentity,opsTask,opsAdmin,opsFail,privateOps} from "./ops-access.js";

// Revenue and invoices here are platform subscriptions ONLY, never clinic/patient billing.
function filters(req:Request,allowed:string[]){
 const status=String(req.query.status??"all"),sort=String(req.query.sort??"newest");
 const raw=String(req.query.page??"1"),q=String(req.query.q??"").trim().slice(0,100);
 if(!allowed.includes(status))opsFail(422,"INVALID_STATUS");
 if(!/^[1-9]\d{0,4}$/.test(raw))opsFail(422,"INVALID_PAGE");
 if(!["newest","oldest"].includes(sort))opsFail(422,"INVALID_SORT");
 return {status,sort,page:Number(raw),pageSize:10,offset:(Number(raw)-1)*10,q};
}
export function adminFinanceRouter(){
 const router=Router();
 router.use(opsIdentity);
 router.get("/summary",opsTask(async(req,res)=>{
  opsAdmin(req);
  const [invoice,subscription]=await Promise.all([
   sqlClient`SELECT count(*) FILTER (WHERE status='awaiting')::int AS awaiting,
    count(*) FILTER (WHERE status='paid')::int AS paid,
    count(*) FILTER (WHERE status='void')::int AS voided,
    coalesce(sum(amount_afn) FILTER (WHERE status='paid'),0)::bigint::text AS lifetime_afn,
    coalesce(sum(amount_afn) FILTER (WHERE status='paid'
     AND verified_at>=now()-interval '30 days'),0)::bigint::text AS last30_afn,
    coalesce(sum(amount_afn) FILTER (WHERE status='paid'
     AND verified_at>=now()-interval '60 days'
     AND verified_at<now()-interval '30 days'),0)::bigint::text AS previous30_afn,
    count(*) FILTER (WHERE status='awaiting'
     AND created_at<now()-interval '48 hours')::int AS awaiting_over48
    FROM platform_subscription_invoices`,
   sqlClient`SELECT count(*) FILTER (WHERE effective_status='active')::int AS active,
    count(*) FILTER (WHERE effective_status='trialing')::int AS trialing,
    count(*) FILTER (WHERE effective_status='grace')::int AS grace,
    count(*) FILTER (WHERE effective_status='expired')::int AS expired,
    count(*) FILTER (WHERE effective_status='cancelled')::int AS cancelled
    FROM (
      SELECT CASE WHEN s.status='cancelled' THEN 'cancelled'
       WHEN (CASE WHEN s.status='trialing' THEN s.trial_ends_at ELSE s.current_period_ends_at END) IS NULL
        THEN s.status
       WHEN (CASE WHEN s.status='trialing' THEN s.trial_ends_at ELSE s.current_period_ends_at END)>now()
        THEN CASE WHEN s.status='trialing' THEN 'trialing' ELSE 'active' END
       WHEN s.status<>'trialing' AND now()<s.current_period_ends_at+
        coalesce(p.grace_days,0)*interval '1 day' THEN 'grace'
       ELSE 'expired' END AS effective_status
      FROM clinic_subscriptions s
      JOIN platform_plan_versions p ON p.id=s.plan_version_id
    ) x`
  ]);
  const a=invoice[0],s=subscription[0];
  privateOps(res);res.json({
   invoices:{awaiting:Number(a.awaiting),paid:Number(a.paid),void:Number(a.voided),
    awaitingOver48:Number(a.awaiting_over48),lifetimeAfn:Number(a.lifetime_afn),
    last30Afn:Number(a.last30_afn),previous30Afn:Number(a.previous30_afn)},
   subscriptions:{active:Number(s.active),trialing:Number(s.trialing),grace:Number(s.grace),
    expired:Number(s.expired),cancelled:Number(s.cancelled)},
   generatedAt:new Date().toISOString(),
   note:"Only platform subscription payments verified as paid. Clinic/patient transactions excluded."
  });
 }));
 router.get("/invoices",opsTask(async(req,res)=>{
  opsAdmin(req);
  const {status,sort,page,pageSize,offset,q}=filters(req,["all","awaiting","paid","void"]);
  const [rows,count]=await Promise.all([
   sqlClient`SELECT i.id,i.clinic_id,c.display_name AS clinic_name,c.city,
    i.amount_afn,i.status,i.evidence_reference,i.created_at,i.verified_at,i.period_ends_at,
    p.label AS plan_label,p.billing_period
    FROM platform_subscription_invoices i
    JOIN clinics c ON c.id=i.clinic_id
    JOIN platform_plan_versions p ON p.id=i.plan_version_id
    WHERE (${status}='all' OR i.status=${status})
     AND (${q}='' OR c.display_name ILIKE ${"%"+q+"%"} OR
      c.city ILIKE ${"%"+q+"%"} OR i.evidence_reference ILIKE ${"%"+q+"%"})
    ORDER BY CASE WHEN ${sort}='oldest' THEN i.created_at END ASC NULLS LAST,
     CASE WHEN ${sort}='newest' THEN i.created_at END DESC NULLS LAST,i.id
    LIMIT ${pageSize} OFFSET ${offset}`,
   sqlClient`SELECT count(*)::int AS total FROM platform_subscription_invoices i
    JOIN clinics c ON c.id=i.clinic_id
    WHERE (${status}='all' OR i.status=${status})
     AND (${q}='' OR c.display_name ILIKE ${"%"+q+"%"} OR
      c.city ILIKE ${"%"+q+"%"} OR i.evidence_reference ILIKE ${"%"+q+"%"})`
  ]);
  privateOps(res);res.json({invoices:rows.map(x=>({
   id:x.id,clinicId:x.clinic_id,clinicName:x.clinic_name,city:x.city,
   amountAfn:x.amount_afn,status:x.status,evidenceReference:x.evidence_reference,
   createdAt:x.created_at,verifiedAt:x.verified_at,periodEndsAt:x.period_ends_at,
   planLabel:x.plan_label,billingPeriod:x.billing_period
  })),total:Number(count[0]?.total??0),page,pageSize,sort,status});
 }));
 router.get("/subscriptions",opsTask(async(req,res)=>{
  opsAdmin(req);
  const {status,sort,page,pageSize,offset,q}=filters(req,
   ["all","trialing","active","grace","expired","cancelled"]);
  const [rows,count]=await Promise.all([
   sqlClient`WITH current AS (
    SELECT s.clinic_id,c.display_name AS clinic_name,c.city,s.status,
     s.trial_ends_at,s.current_period_ends_at,s.updated_at,
     p.label AS plan_label,p.billing_period,
     CASE WHEN s.status='cancelled' THEN 'cancelled'
      WHEN (CASE WHEN s.status='trialing' THEN s.trial_ends_at ELSE s.current_period_ends_at END) IS NULL
       THEN s.status
      WHEN (CASE WHEN s.status='trialing' THEN s.trial_ends_at ELSE s.current_period_ends_at END)>now()
       THEN CASE WHEN s.status='trialing' THEN 'trialing' ELSE 'active' END
      WHEN s.status<>'trialing' AND now()<s.current_period_ends_at+
       coalesce(p.grace_days,0)*interval '1 day' THEN 'grace'
      ELSE 'expired' END AS effective_status
    FROM clinic_subscriptions s JOIN clinics c ON c.id=s.clinic_id
    JOIN platform_plan_versions p ON p.id=s.plan_version_id
   ) SELECT * FROM current t WHERE (${status}='all' OR t.effective_status=${status})
    AND (${q}='' OR t.clinic_name ILIKE ${"%"+q+"%"} OR t.city ILIKE ${"%"+q+"%"})
    ORDER BY CASE WHEN ${sort}='oldest' THEN t.updated_at END ASC NULLS LAST,
     CASE WHEN ${sort}='newest' THEN t.updated_at END DESC NULLS LAST,t.clinic_id
    LIMIT ${pageSize} OFFSET ${offset}`,
   sqlClient`SELECT count(*)::int AS total FROM (
    SELECT c.display_name AS clinic_name,c.city,
     CASE WHEN s.status='cancelled' THEN 'cancelled'
      WHEN (CASE WHEN s.status='trialing' THEN s.trial_ends_at ELSE s.current_period_ends_at END) IS NULL
       THEN s.status
      WHEN (CASE WHEN s.status='trialing' THEN s.trial_ends_at ELSE s.current_period_ends_at END)>now()
       THEN CASE WHEN s.status='trialing' THEN 'trialing' ELSE 'active' END
      WHEN s.status<>'trialing' AND now()<s.current_period_ends_at+
       coalesce(p.grace_days,0)*interval '1 day' THEN 'grace'
      ELSE 'expired' END AS effective_status
    FROM clinic_subscriptions s JOIN clinics c ON c.id=s.clinic_id
    JOIN platform_plan_versions p ON p.id=s.plan_version_id
   ) t WHERE (${status}='all' OR t.effective_status=${status})
    AND (${q}='' OR t.clinic_name ILIKE ${"%"+q+"%"} OR t.city ILIKE ${"%"+q+"%"})`
  ]);
  privateOps(res);res.json({subscriptions:rows.map(x=>({
   clinicId:x.clinic_id,clinicName:x.clinic_name,city:x.city,
   status:x.status,effectiveStatus:x.effective_status,trialEndsAt:x.trial_ends_at,
   currentPeriodEndsAt:x.current_period_ends_at,updatedAt:x.updated_at,
   planLabel:x.plan_label,billingPeriod:x.billing_period
  })),total:Number(count[0]?.total??0),page,pageSize,sort,status});
 }));
 router.get("/invoices/:id/history",opsTask(async(req,res)=>{
  opsAdmin(req);
  const id=String(req.params.id);
  if(!/^[\w-]{8,100}$/.test(id))opsFail(422,"INVALID_ID");
  const [inv]=await sqlClient`SELECT id FROM platform_subscription_invoices WHERE id=${id}`;
  if(!inv)opsFail(404,"INVOICE_NOT_FOUND");
  const events=await sqlClient`SELECT action,outcome,created_at FROM audit_events
   WHERE subject_id=${id} AND action IN ('subscription.invoice.confirm','subscription.invoice.reject')
   ORDER BY created_at DESC,id DESC LIMIT 20`;
  privateOps(res);res.json({events:events.map(x=>({action:x.action,outcome:x.outcome,at:x.created_at}))});
 }));
 router.use((e:unknown,_req:Request,res:Response,next:NextFunction)=>{
  if(e instanceof OpsFault){privateOps(res);res.status(e.status).json({code:e.code});return;}
  next(e);
 });
 return router;
}
