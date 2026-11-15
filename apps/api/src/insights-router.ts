import {Router,type Request,type Response,type NextFunction} from "express";
import {sqlClient} from "@dandanlink/db";
import {AccessFault,authStaff,scope,type StaffRequest} from "./staff-access.js";
import {OpsFault,opsIdentity,opsTask,opsAdmin,opsStaff,privateOps,opsFail,type OpsRequest} from "./ops-access.js";

type Period={from:string;to:string};
function kabulDay(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date()).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 return [parts.year,parts.month,parts.day].join("-");
}
function period(req:Request):Period{
 const today=kabulDay();
 const from=String(req.query.from??today.slice(0,7)+"-01");
 const to=String(req.query.to??today);
 for(const value of [from,to]){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||
   !Number.isFinite(Date.parse(value+"T12:00:00Z"))||
   new Date(value+"T12:00:00Z").toISOString().slice(0,10)!==value)
   opsFail(422,"INVALID_DATE");
 }
 const duration=(Date.parse(to+"T00:00:00Z")-Date.parse(from+"T00:00:00Z"))/86400000;
 if(duration<0||duration>366)opsFail(422,"INVALID_REPORT_PERIOD");
 return {from,to};
}
function countSafe(value:unknown){const n=Number(value)||0;return n===0||n>=5?n:null;}
const reportTask=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
 (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};

export function insightsRouter(){
 const router=Router();
 // Private tenant analytics use the existing staff identity and independently enforce finance privileges.
 router.get("/clinics/:clinicId/report",authStaff,reportTask(async(req,res)=>{
  const clinicId=String(req.params.clinicId);
  const person=await scope(req,clinicId);
  if(!["owner","manager","cashier"].includes(person.role))opsFail(403,"REPORT_FORBIDDEN");
  const {from,to}=period(req);
  const [statusRows,dayRows,patients,totalPatients,payments,invoices,expenses]=await Promise.all([
   sqlClient`SELECT status,count(*)::int AS count FROM clinic_appointments
    WHERE clinic_id=${clinicId}
     AND start_at >= (${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
     AND start_at < ((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')
    GROUP BY status`,
   sqlClient`SELECT (start_at AT TIME ZONE 'Asia/Kabul')::date::text AS day,
     count(*)::int AS count FROM clinic_appointments
    WHERE clinic_id=${clinicId}
     AND start_at >= (${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
     AND start_at < ((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')
    GROUP BY 1 ORDER BY 1`,
   sqlClient`SELECT count(*)::int AS count FROM clinic_patients
    WHERE clinic_id=${clinicId}
     AND created_at >= (${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
     AND created_at < ((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')`,
   sqlClient`SELECT count(*)::int AS count FROM clinic_patients
    WHERE clinic_id=${clinicId} AND status='active'`,
   sqlClient`SELECT e.method,
     coalesce(sum(CASE WHEN e.kind='reversal' THEN -e.amount_afn ELSE e.amount_afn END),0)::bigint::text AS amount
     FROM clinic_payment_entries e
     JOIN clinic_invoices i ON i.id=e.invoice_id AND i.clinic_id=e.clinic_id
     WHERE e.clinic_id=${clinicId} AND i.status='issued' AND e.kind<>'credit'
      AND e.occurred_at >= (${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND e.occurred_at < ((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')
     GROUP BY e.method ORDER BY e.method`,
   sqlClient`SELECT count(*)::int AS issued,
     coalesce(sum(total_afn),0)::bigint::text AS total_afn FROM clinic_invoices
     WHERE clinic_id=${clinicId} AND status='issued'
      AND issued_at >= (${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
      AND issued_at < ((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')`,
   sqlClient`SELECT coalesce(sum(amount_afn),0)::bigint::text AS total_afn
     FROM clinic_expenses WHERE clinic_id=${clinicId} AND status='posted'
      AND expense_date BETWEEN ${from}::date AND ${to}::date`
  ]);
  const appointments=Object.fromEntries(["confirmed","arrived","in_treatment","completed","cancelled","no_show"]
   .map(k=>[k,Number(statusRows.find(x=>x.status===k)?.count||0)]));
  const byMethod=Object.fromEntries(["cash","bank_transfer","other_manual"]
   .map(k=>[k,Number(payments.find(x=>x.method===k)?.amount||0)]));
  const receipts=Object.values(byMethod).reduce((sum,value)=>sum+value,0);
  privateOps(res);
  res.json({
   clinicId,from,to,timezone:"Asia/Kabul",currency:"AFN",
   basis:"Scheduled appointment start in Kabul; ledger payment occurrence in Kabul. Credits excluded.",
   appointments:{byStatus:appointments,total:Object.values(appointments).reduce((a,b)=>a+b,0),
    byDay:dayRows.map(x=>({day:x.day,count:Number(x.count)}))},
   patients:{newRegistered:Number(patients[0]?.count||0),activeTotal:Number(totalPatients[0]?.count||0)},
   revenue:{netReceiptsAfn:receipts,byMethodAfn:byMethod,
    issuedInvoices:Number(invoices[0]?.issued||0),issuedFaceValueAfn:Number(invoices[0]?.total_afn||0),
    postedExpensesAfn:Number(expenses[0]?.total_afn||0)}
  });
 }));
 router.use("/platform",opsIdentity);
 router.get("/platform/overview",opsTask(async(req,res)=>{
  opsStaff(req);
  const [clinics,appointments,users,verified,subscriptions,tickets]=await Promise.all([
   sqlClient`SELECT count(*)::int AS total,
    count(*) FILTER (WHERE status='approved')::int AS approved,
    count(*) FILTER (WHERE status='pending')::int AS pending FROM clinics`,
   sqlClient`SELECT count(*)::int AS total,
    count(*) FILTER (WHERE status='cancelled')::int AS cancelled FROM clinic_appointments
    WHERE created_at >= now()-interval '30 days'`,
   sqlClient`SELECT count(*)::int AS total FROM patient_profiles`,
   sqlClient`SELECT count(*)::int AS total FROM clinic_memberships WHERE status='active' AND role='dentist'`,
   sqlClient`SELECT count(*)::int AS total,
    coalesce(sum(amount_afn),0)::bigint::text AS afn FROM platform_subscription_invoices
    WHERE status='paid'`,
   sqlClient`SELECT status,count(*)::int AS count FROM support_tickets GROUP BY status`
  ]);
  privateOps(res);
  res.json({period:"last_30_days_for_bookings",suppression:"Counts from 1 to 4 are suppressed.",
   clinics:{total:countSafe(clinics[0]?.total),approved:countSafe(clinics[0]?.approved),
    pending:countSafe(clinics[0]?.pending)},
   patients:countSafe(users[0]?.total),dentists:countSafe(verified[0]?.total),
   bookings:{created:countSafe(appointments[0]?.total),cancelled:countSafe(appointments[0]?.cancelled)},
   platformReceipts:{paidInvoices:countSafe(subscriptions[0]?.total),
    totalAfn:req.opsActor!.role==="admin"?Number(subscriptions[0]?.afn||0):null},
   tickets:Object.fromEntries(["open","in_progress","waiting_user","resolved","closed"]
    .map(k=>[k,countSafe(tickets.find(x=>x.status===k)?.count)]))
  });
 }));
 router.get("/platform/security",opsTask(async(req,res)=>{
  opsAdmin(req);
  const [events,failures]=await Promise.all([
   sqlClient`SELECT action,outcome,count(*)::int AS count FROM audit_events
    WHERE created_at>=now()-interval '30 days'
    GROUP BY action,outcome ORDER BY count DESC LIMIT 30`,
   sqlClient`SELECT date_trunc('day',created_at AT TIME ZONE 'Asia/Kabul')::date::text AS day,
    count(*)::int AS count FROM audit_events
    WHERE created_at>=now()-interval '14 days' AND outcome<>'success'
    GROUP BY 1 ORDER BY 1 DESC`
  ]);
  privateOps(res);res.json({period:"30 days",timezone:"Asia/Kabul",
   note:"Aggregated audit actions only: no actor, patient, clinical note or subject identifiers.",
   actions:events.map(x=>({action:x.action,outcome:x.outcome,count:countSafe(x.count)})),
   denialsByDay:failures.map(x=>({day:x.day,count:countSafe(x.count)}))});
 }));
 router.use((err:unknown,_req:Request,res:Response,next:NextFunction)=>{
  if(err instanceof OpsFault||err instanceof AccessFault){
   res.status(err.status).json({code:err.code});return;
  }
  next(err);
 });
 return router;
}
