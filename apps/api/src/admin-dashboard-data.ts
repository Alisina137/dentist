import {sqlClient} from "@dandanlink/db";
import {getPilotReadiness} from "./pilot-gate.js";

// Admin-only, aggregate metadata. Never return patient, clinic, payer or requester identifiers.
// Caller MUST enforce opsAdmin(req) with verified MFA before invoking.
export type DashboardDays=7|30|90;
export function parseDashboardDays(value:unknown):DashboardDays{
 const s=value===undefined?"30":value;
 if(s==="7"||s==="30"||s==="90")return Number(s) as DashboardDays;
 throw Object.assign(new Error("INVALID_DASHBOARD_PERIOD"),{status:422,code:"INVALID_DASHBOARD_PERIOD"});
}
function kabulToday(){
 const fields=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [fields.year,fields.month,fields.day].join("-");
}
function shiftDay(day:string,offset:number){
 const date=new Date(day+"T12:00:00Z");date.setUTCDate(date.getUTCDate()+offset);
 return date.toISOString().slice(0,10);
}
const asNumber=(v:unknown)=>Number(v??0);
export async function platformDashboard(days:DashboardDays){
 const to=kabulToday(),from=shiftDay(to,1-days);
 const prevTo=shiftDay(from,-1),prevFrom=shiftDay(from,-days);
 const [clinics,credentials,listings,reviews,subscriptions,appointments,support,operations,
  registrations,bookings,paidTrend,ticketTrend,activity]=await Promise.all([
  sqlClient`SELECT count(*)::int AS total,
    count(*) FILTER (WHERE status='approved')::int AS verified,
    count(*) FILTER (WHERE status='pending')::int AS pending,
    count(*) FILTER (WHERE status='needs_info')::int AS needs_info,
    count(*) FILTER (WHERE created_at>=(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND created_at<((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul'))::int AS registered,
    count(*) FILTER (WHERE created_at>=(${prevFrom}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND created_at<(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul'))::int AS previous_registered
   FROM clinics`,
  sqlClient`SELECT count(*) FILTER (WHERE status='pending')::int AS pending,
    count(*) FILTER (WHERE status='verified')::int AS verified
    FROM clinic_dentist_credential_cases`,
  sqlClient`SELECT count(*) FILTER (WHERE pending_version IS NOT NULL)::int AS pending
    FROM clinic_listing_heads`,
  sqlClient`SELECT
    (SELECT count(*)::int FROM patient_visit_reviews r
      JOIN patient_review_versions v ON v.review_id=r.id AND v.version=r.current_version
      WHERE v.state='pending' AND r.withdrawn_at IS NULL) AS pending,
    (SELECT count(*)::int FROM patient_review_reports WHERE state='pending') AS reports,
    (SELECT count(*)::int FROM patient_review_appeals WHERE state='pending') AS appeals`,
  sqlClient`SELECT
    (SELECT count(*)::int FROM clinic_subscriptions
      WHERE status='active' AND (current_period_ends_at IS NULL OR current_period_ends_at>now())) AS active,
    (SELECT count(*)::int FROM clinic_subscriptions
      WHERE status='trialing' AND (trial_ends_at IS NULL OR trial_ends_at>now())) AS trialing,
    count(*) FILTER (WHERE status='awaiting')::int AS awaiting,
    count(*) FILTER (WHERE status='paid' AND verified_at>=(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND verified_at<((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul'))::int AS paid_invoices,
    coalesce(sum(amount_afn) FILTER (WHERE status='paid'
      AND verified_at>=(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND verified_at<((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')),0)::bigint::text AS revenue_afn,
    coalesce(sum(amount_afn) FILTER (WHERE status='paid'
      AND verified_at>=(${prevFrom}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND verified_at<(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')),0)::bigint::text AS previous_revenue_afn
   FROM platform_subscription_invoices`,
  sqlClient`SELECT
    count(*) FILTER (WHERE created_at>=(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND created_at<((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul'))::int AS created,
    count(*) FILTER (WHERE status='cancelled' AND created_at>=(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND created_at<((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul'))::int AS cancelled,
    count(*) FILTER (WHERE created_at>=(${prevFrom}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND created_at<(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul'))::int AS previous_created
   FROM clinic_appointments`,
  sqlClient`SELECT
    count(*) FILTER (WHERE status='open')::int AS open,
    count(*) FILTER (WHERE status='in_progress')::int AS in_progress,
    count(*) FILTER (WHERE status='waiting_user')::int AS waiting,
    count(*) FILTER (WHERE priority='high' AND status IN ('open','in_progress','waiting_user'))::int AS high_priority,
    count(*) FILTER (WHERE status IN ('open','in_progress') AND updated_at<now()-interval '48 hours')::int AS overdue,
    count(*) FILTER (WHERE created_at>=(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND created_at<((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul'))::int AS created,
    count(*) FILTER (WHERE created_at>=(${prevFrom}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND created_at<(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul'))::int AS previous_created
   FROM support_tickets`,
  sqlClient`SELECT
    (SELECT count(*)::int FROM outbox_events
      WHERE state='pending' AND available_at<now()-interval '15 minutes') AS delayed_outbox,
    (SELECT count(*)::int FROM patient_booking_notifications WHERE status='failed') AS failed_notifications`,
  sqlClient`SELECT (created_at AT TIME ZONE 'Asia/Kabul')::date::text AS day,
    count(*)::int AS count FROM clinics
    WHERE created_at>=(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND created_at<((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')
    GROUP BY 1 ORDER BY 1`,
  sqlClient`SELECT (created_at AT TIME ZONE 'Asia/Kabul')::date::text AS day,
    count(*)::int AS count FROM clinic_appointments
    WHERE created_at>=(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND created_at<((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')
    GROUP BY 1 ORDER BY 1`,
  sqlClient`SELECT (verified_at AT TIME ZONE 'Asia/Kabul')::date::text AS day,
    count(*)::int AS count,coalesce(sum(amount_afn),0)::bigint::text AS total_afn
    FROM platform_subscription_invoices WHERE status='paid'
      AND verified_at>=(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND verified_at<((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')
    GROUP BY 1 ORDER BY 1`,
  sqlClient`SELECT (created_at AT TIME ZONE 'Asia/Kabul')::date::text AS day,
    count(*)::int AS count FROM support_tickets
    WHERE created_at>=(${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND created_at<((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')
    GROUP BY 1 ORDER BY 1`,
  sqlClient`SELECT action,outcome,subject_type,created_at
    FROM audit_events
    WHERE created_at>=now()-interval '30 days'
    AND (action LIKE 'clinic.%' OR action LIKE 'subscription.%'
      OR action LIKE 'listing.%' OR action LIKE 'credential.%'
      OR action LIKE 'review.%' OR action LIKE 'support.%')
    ORDER BY created_at DESC,id DESC LIMIT 8`
 ]);
 const clinicDay=new Map(registrations.map(x=>[String(x.day),asNumber(x.count)]));
 const bookingDay=new Map(bookings.map(x=>[String(x.day),asNumber(x.count)]));
 const revenueDay=new Map(paidTrend.map(x=>[String(x.day),asNumber(x.total_afn)]));
 const paidDay=new Map(paidTrend.map(x=>[String(x.day),asNumber(x.count)]));
 const supportDay=new Map(ticketTrend.map(x=>[String(x.day),asNumber(x.count)]));
 const trend=Array.from({length:days},(_,i)=>{
  const day=shiftDay(from,i);
  return {day,registrations:clinicDay.get(day)??0,appointments:bookingDay.get(day)??0,
    receiptsAfn:revenueDay.get(day)??0,paidInvoices:paidDay.get(day)??0,supportTickets:supportDay.get(day)??0};
 });
 const [c]=clinics,[v]=credentials,[l]=listings,[r]=reviews,[s]=subscriptions,
  [b]=appointments,[t]=support,[o]=operations;
 return {
  period:{days,from,to,previousFrom:prevFrom,previousTo:prevTo,timezone:"Asia/Kabul",
   generatedAt:new Date().toISOString()},
  clinics:{total:asNumber(c.total),verified:asNumber(c.verified),
   pending:asNumber(c.pending),needsInfo:asNumber(c.needs_info),
   registered:asNumber(c.registered),previousRegistered:asNumber(c.previous_registered)},
  dentists:{pending:asNumber(v.pending),verified:asNumber(v.verified)},
  listings:{pending:asNumber(l.pending)},
  reviews:{pending:asNumber(r.pending),reports:asNumber(r.reports),appeals:asNumber(r.appeals)},
  subscriptions:{active:asNumber(s.active),trialing:asNumber(s.trialing),
   awaitingPayments:asNumber(s.awaiting),paidInvoices:asNumber(s.paid_invoices),
   receiptsAfn:asNumber(s.revenue_afn),previousReceiptsAfn:asNumber(s.previous_revenue_afn)},
  appointments:{created:asNumber(b.created),cancelled:asNumber(b.cancelled),
   previousCreated:asNumber(b.previous_created)},
  support:{open:asNumber(t.open),inProgress:asNumber(t.in_progress),
   waiting:asNumber(t.waiting),highPriority:asNumber(t.high_priority),
   overdue:asNumber(t.overdue),created:asNumber(t.created),
   previousCreated:asNumber(t.previous_created)},
  operations:{databaseResponsive:true,delayedOutbox:asNumber(o.delayed_outbox),
   failedNotifications:asNumber(o.failed_notifications),
   pilotReleaseEnabled:getPilotReadiness().releaseEnabled,
   caveat:"This reports current database connectivity, queue counts and operator pilot release flags. It does not certify backups, monitoring, legal or clinical readiness."},
  trend,activity:activity.map(x=>({
   action:String(x.action),outcome:String(x.outcome),
   subjectType:String(x.subject_type),at:x.created_at
  })),
  privacy:"Admin-only metadata and aggregates. No clinic identifiers, names, patient details, support messages or medical records."
 };
}
