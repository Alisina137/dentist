import {Router,type Request,type Response,type NextFunction} from "express";
import {createHash,randomUUID} from "node:crypto";
import {eq} from "drizzle-orm";
import {db,schema,sqlClient} from "@dandanlink/db";
import {authStaff,scope,AccessFault,type StaffRequest} from "./staff-access.js";
import {getPatient} from "./patient-service.js";
import {PatientError} from "./patient-validation.js";

/** PH10 — financial ledger is separated from platform subscriptions and clinical notes. */
type Ctx=Awaited<ReturnType<typeof scope>>;
type Line={serviceId:string;serviceVersion:number;name:string;quantity:number;unitPriceAfn:number;
 discountAfn:number;totalAfn:number};
class BillingFault extends Error{constructor(public status:number,public code:string){super(code);}}
function fail(status:number,code:string):never{throw new BillingFault(status,code);}
const task=(fn:(r:StaffRequest,res:Response)=>Promise<void>)=>
 (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const cid=(r:StaffRequest)=>String(r.params.clinicId);
const noStore=(r:Response)=>r.setHeader("Cache-Control","private, no-store");
const str=(v:unknown,min:number,max:number,field:string):string=>{
 if(typeof v!=="string"||v.trim().length<min||v.trim().length>max)fail(422,"INVALID_"+field);
 return v.trim();
};
function amount(v:unknown,min:number,max:number,field:string):number{
 if(typeof v!=="number"||!Number.isSafeInteger(v)||v<min||v>max)fail(422,"INVALID_"+field);
 return v;
}
function date(v:unknown,optional=true):string|null{
 if(optional&&(v==null||v===""))return null;
 const s=str(v,10,10,"DATE");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||
  !Number.isFinite(Date.parse(s+"T12:00:00Z"))||
  new Date(s+"T12:00:00Z").toISOString().slice(0,10)!==s)fail(422,"INVALID_DATE");
 return s;
}
function actionKey(v:unknown):string{
 const k=str(v,8,100,"ACTION_KEY");
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(k))fail(422,"INVALID_ACTION_KEY");
 return k;
}
function digest(value:unknown){return createHash("sha256").update(JSON.stringify(value)).digest("hex");}
const canRead=(role:string)=>["owner","manager","cashier","receptionist"].includes(role);
const canPost=(role:string)=>["owner","manager","cashier"].includes(role);
const canReverse=(role:string)=>["owner","manager"].includes(role);
async function access(req:StaffRequest,action:"read"|"invoice"|"post"|"reverse"|"overview"="read"){
 const ctx=await scope(req,cid(req));
 const allowed=action==="read"||action==="invoice"?canRead(ctx.role):
 action==="post"||action==="overview"?canPost(ctx.role):canReverse(ctx.role);
 if(!allowed)fail(403,"BILLING_ROLE_DENIED");
 if(action!=="read"&&action!=="overview"){
  if(ctx.clinic.status==="suspended")fail(403,"CLINIC_SUSPENDED");
  const sub=await db.query.clinicSubscription.findFirst({where:eq(schema.clinicSubscription.clinicId,cid(req))});
  if(!sub||sub.status==="cancelled")fail(403,"SUBSCRIPTION_REQUIRED");
  const plan=await db.query.planVersion.findFirst({where:eq(schema.planVersion.id,sub.planVersionId)});
  if(!plan)fail(403,"SUBSCRIPTION_REQUIRED");
  const expiry=sub.status==="trialing"?sub.trialEndsAt:sub.currentPeriodEndsAt;
  if(expiry&&expiry.getTime()+(sub.status==="trialing"?0:plan.graceDays*86400000)<Date.now())
   fail(403,"SUBSCRIPTION_EXPIRED");
 }
 return ctx;
}
async function log(tx:any,req:StaffRequest,invoice:any,action:string,reason:string|null=null){
 await tx`INSERT INTO clinic_invoice_events(id,clinic_id,patient_id,invoice_id,action,version,reason,actor_id)
  VALUES(${randomUUID()},${cid(req)},${invoice.patient_id},${invoice.id},
   ${action},${invoice.version},${reason},${req.actor!.id})`;
 await tx`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
  VALUES(${randomUUID()},${req.actor!.id},${cid(req)},${"billing."+action},
   'clinic_invoice',${invoice.id},'success')`;
}
async function logLedger(tx:any,req:StaffRequest,id:string,action:string){
 await tx`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
 VALUES(${randomUUID()},${req.actor!.id},${cid(req)},${"billing."+action},
  'clinic_ledger_entry',${id},'success')`;
}
function readable(i:any){
 const paid=Number(i.paid_afn||0);
 const total=Number(i.total_afn);
 const balance=i.status==="void"?0:i.status==="draft"?total:total-paid;
 const state=i.status==="void"?"void":i.status==="draft"?"draft":
 balance===0?"paid":i.due_date&&String(i.due_date).slice(0,10)<localDay()?"overdue":
 paid>0?"partially_paid":"issued";
 return {id:i.id,clinicId:i.clinic_id,patientId:i.patient_id,
  patientName:i.patient_name||null,patientNumber:i.patient_number||null,
  number:i.invoice_number,label:"INV-"+String(i.invoice_number).padStart(6,"0"),
  status:state,documentStatus:i.status,revision:i.revision,version:i.version,
  sourceType:i.source_type,sourceId:i.source_id,totalAfn:total,paidAfn:paid,
  balanceAfn:Math.max(0,balance),dueDate:i.due_date,issuedAt:i.issued_at,
  voidedAt:i.voided_at,voidReason:i.void_reason,createdAt:i.created_at,
  updatedAt:i.updated_at};
}
function localDay(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
  timeZone:"Asia/Kabul",year:"numeric",month:"2-digit",day:"2-digit"})
  .formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [parts.year,parts.month,parts.day].join("-");
}
async function invoiceRow(tx:any,c:string,id:string,lock=false){
 if(lock){
  const found=await tx`SELECT id FROM clinic_invoices WHERE id=${id} AND clinic_id=${c} FOR UPDATE`;
  if(!found.length)fail(404,"INVOICE_NOT_FOUND");
 }
 const [i]=await tx`SELECT i.*,p.preferred_name||' '||coalesce(p.family_name,'') AS patient_name,
   p.patient_number,
   coalesce((SELECT sum(CASE WHEN e.kind='reversal' THEN -e.amount_afn ELSE e.amount_afn END)
    FROM clinic_payment_entries e WHERE e.invoice_id=i.id AND e.clinic_id=i.clinic_id),0)::integer AS paid_afn
  FROM clinic_invoices i JOIN clinic_patients p ON p.id=i.patient_id AND p.clinic_id=i.clinic_id
  WHERE i.id=${id} AND i.clinic_id=${c} LIMIT 1`;
 if(!i)fail(404,"INVOICE_NOT_FOUND");
 return i;
}
async function evidence(tx:any,c:string,p:string,sourceType:string,sourceId:string){
 if(sourceType==="appointment"){
  const [a]=await tx`SELECT id,service_id,status FROM clinic_appointments
   WHERE id=${sourceId} AND clinic_id=${c} AND patient_id=${p} LIMIT 1`;
  if(!a||a.status!=="completed")fail(409,"COMPLETED_APPOINTMENT_REQUIRED");
  return {serviceIds:[a.service_id],prices:null};
 }
 if(sourceType==="encounter"){
  const [e]=await tx`SELECT id,status,performed_procedures FROM clinic_encounters
   WHERE id=${sourceId} AND clinic_id=${c} AND patient_id=${p} LIMIT 1`;
  if(!e||e.status!=="signed")fail(409,"SIGNED_ENCOUNTER_REQUIRED");
  const performed=e.performed_procedures as {serviceId?:string|null}[];
  const ids=Array.isArray(performed)?performed.map(x=>x.serviceId).filter((id):id is string=>Boolean(id)):[];
  if(!ids.length)fail(409,"BILLABLE_PROCEDURE_REQUIRED");
  return {serviceIds:ids,prices:null};
 }
 if(sourceType==="treatment_stage"){
  const [stage]=await tx`SELECT s.id,s.status,v.items FROM clinic_treatment_stages s
   JOIN clinic_treatment_versions v ON v.plan_id=s.plan_id AND v.version=s.version
   WHERE s.id=${sourceId} AND s.clinic_id=${c} AND s.patient_id=${p} LIMIT 1`;
  if(!stage||stage.status!=="completed")fail(409,"COMPLETED_STAGE_REQUIRED");
  const items=stage.items as Line[];
  return {serviceIds:items.map(x=>x.serviceId),prices:items};
 }
 fail(422,"INVALID_BILLING_SOURCE");
}
async function lines(tx:any,c:string,p:string,sourceType:string,sourceId:string,ctx:Ctx,
 raw:any):Promise<{items:Line[];total:number}>{
 if(!Array.isArray(raw)||raw.length<1||raw.length>20)fail(422,"INVALID_INVOICE_LINES");
 const source=await evidence(tx,c,p,sourceType,sourceId),items:Line[]=[];
 let total=0;const seen=new Set<string>();
 for(const value of raw){
  const serviceId=str(value?.serviceId,8,100,"SERVICE"),quantity=amount(value?.quantity,1,20,"QUANTITY"),
  discount=amount(value?.discountAfn??0,0,10000000,"DISCOUNT");
  if(seen.has(serviceId))fail(422,"DUPLICATE_SERVICE_LINE");
  seen.add(serviceId);
  if(!source.serviceIds.includes(serviceId))fail(409,"UNPERFORMED_SERVICE_CANNOT_BE_CHARGED");
  const [svc]=await tx`SELECT id,name,version,base_price_afn FROM clinic_services
   WHERE id=${serviceId} AND clinic_id=${c} LIMIT 1`;
  if(!svc)fail(422,"SERVICE_NOT_FOUND");
  const proposal=source.prices?.find(x=>x.serviceId===serviceId);
  const unit=proposal?proposal.unitPriceAfn:svc.base_price_afn;
  const version=proposal?proposal.serviceVersion:svc.version;
  if(!Number.isSafeInteger(unit)||unit<0)fail(422,"INVALID_PRICE_SNAPSHOT");
  const subtotal=unit*quantity;
  if(subtotal>2000000000)fail(422,"INVOICE_AMOUNT_LIMIT");
  if(discount>0&&!["owner","manager"].includes(ctx.role))fail(403,"DISCOUNT_REQUIRES_OWNER");
  if(discount>subtotal||discount*10>subtotal*3)fail(422,"DISCOUNT_EXCEEDS_POLICY");
  const lineTotal=subtotal-discount;total+=lineTotal;
  if(total>2000000000||!Number.isSafeInteger(total))fail(422,"INVOICE_AMOUNT_LIMIT");
  items.push({serviceId,serviceVersion:version,name:proposal?.name||svc.name,
   quantity,unitPriceAfn:unit,discountAfn:discount,totalAfn:lineTotal});
 }
 if(total<=0)fail(422,"ZERO_VALUE_INVOICE");
 return {items,total};
}
async function saveVersion(tx:any,req:StaffRequest,i:any,items:Line[],total:number,note:string|null){
 await tx`INSERT INTO clinic_invoice_versions(invoice_id,clinic_id,patient_id,version,items,
  total_afn,note,author_id) VALUES (${i.id},${cid(req)},${i.patient_id},${i.version},
   ${JSON.stringify(items)}::jsonb,${total},${note},${req.actor!.id})`;
}
async function invoiceDetails(req:StaffRequest,id:string){
 const i=await invoiceRow(sqlClient,cid(req),id);
 const [v]=await sqlClient`SELECT items,note FROM clinic_invoice_versions
  WHERE invoice_id=${i.id} AND clinic_id=${cid(req)} AND version=${i.version}`;
 const entries=await sqlClient`SELECT e.id,e.kind,e.amount_afn,e.method,e.reference,e.note,
  e.reverses_entry_id,e.occurred_at,e.created_at,u.name AS actor_name
  FROM clinic_payment_entries e JOIN auth_users u ON u.id=e.created_by
  WHERE e.clinic_id=${cid(req)} AND e.invoice_id=${i.id}
  ORDER BY e.created_at DESC,e.id DESC LIMIT 200`;
 const events=await sqlClient`SELECT e.action,e.version,e.reason,e.created_at,u.name AS actor_name
  FROM clinic_invoice_events e JOIN auth_users u ON u.id=e.actor_id
  WHERE e.clinic_id=${cid(req)} AND e.invoice_id=${i.id}
  ORDER BY e.created_at DESC,e.id DESC LIMIT 100`;
 const versions=await sqlClient`SELECT version,total_afn,created_at FROM clinic_invoice_versions
 WHERE clinic_id=${cid(req)} AND invoice_id=${i.id} ORDER BY version DESC LIMIT 40`;
 return {invoice:readable(i),items:v?.items||[],note:v?.note||null,
   entries:entries.map(e=>({id:e.id,kind:e.kind,amountAfn:e.amount_afn,method:e.method,
    reference:e.reference,note:e.note,reversesEntryId:e.reverses_entry_id,
    occurredAt:e.occurred_at,createdAt:e.created_at,actorName:e.actor_name,
    receiptNumber:e.kind==='payment'?'RCT-'+e.id.slice(0,8).toUpperCase():null})),
   events,versions,currency:"AFN",patientAppReleased:false};
}
export function billingRouter(){
 const api=Router();api.use((req,res,next)=>{
  const origin=req.headers.origin;
  if(!["GET","HEAD","OPTIONS"].includes(req.method)&&origin&&![
    process.env.CLINIC_WEB_URL||"http://localhost:3000",
    process.env.ADMIN_WEB_URL||"http://localhost:3001"].includes(origin)){
    res.status(403).json({code:"ORIGIN_DENIED"});return;
  }next();
 });
 api.use(authStaff);
 api.get("/clinics/:clinicId/catalog",task(async(req,res)=>{
  await access(req);
  const services=await sqlClient`SELECT id,name,category,base_price_afn,version FROM clinic_services
  WHERE clinic_id=${cid(req)} AND active=true ORDER BY name LIMIT 200`;
  noStore(res);res.json({services,currency:"AFN"});
 }));
 api.get("/clinics/:clinicId/patients",task(async(req,res)=>{
  await access(req);
  const search=String(req.query.q||"").trim().slice(0,100);
  const rows=await sqlClient`SELECT id,patient_number,preferred_name,family_name FROM clinic_patients
   WHERE clinic_id=${cid(req)} AND status='active' AND
   (${search}='' OR preferred_name ILIKE ${"%"+search+"%"} OR
    family_name ILIKE ${"%"+search+"%"} OR patient_number ILIKE ${"%"+search+"%"})
   ORDER BY preferred_name,patient_number LIMIT 40`;
  noStore(res);res.json({patients:rows});
 }));
 api.get("/clinics/:clinicId/overview",task(async(req,res)=>{
  await access(req,"overview");
  // No diagnosis/procedure text or patient contact is ever included in finance metrics.
  const [summary]=await sqlClient`WITH amounts AS(
   SELECT i.id,i.total_afn,i.due_date,i.issued_at,
   coalesce((SELECT SUM(CASE WHEN e.kind='reversal' THEN -e.amount_afn ELSE e.amount_afn END)
   FROM clinic_payment_entries e WHERE e.invoice_id=i.id),0) AS paid
   FROM clinic_invoices i WHERE i.clinic_id=${cid(req)} AND i.status='issued'
  ),funds AS(
   SELECT e.kind,e.amount_afn,e.occurred_at FROM clinic_payment_entries e
   JOIN clinic_invoices i ON i.id=e.invoice_id
   WHERE e.clinic_id=${cid(req)} AND i.status='issued' AND e.kind<>'credit'
  )
  SELECT
   coalesce((SELECT SUM(CASE WHEN kind='reversal' THEN -amount_afn ELSE amount_afn END)
    FROM funds WHERE (occurred_at AT TIME ZONE 'Asia/Kabul')::date=
     (now() AT TIME ZONE 'Asia/Kabul')::date),0)::integer AS today_receipts,
   coalesce((SELECT SUM(CASE WHEN kind='reversal' THEN -amount_afn ELSE amount_afn END)
    FROM funds WHERE date_trunc('month',occurred_at AT TIME ZONE 'Asia/Kabul')=
     date_trunc('month',now() AT TIME ZONE 'Asia/Kabul')),0)::integer AS month_collections,
   coalesce((SELECT SUM(total_afn-paid) FROM amounts WHERE paid<total_afn),0)::integer AS outstanding,
   coalesce((SELECT SUM(total_afn-paid) FROM amounts WHERE paid<total_afn AND
    due_date<(now() AT TIME ZONE 'Asia/Kabul')::date),0)::integer AS overdue,
   coalesce((SELECT COUNT(*) FROM amounts WHERE paid<total_afn),0)::integer AS open_count`;
  const recent=await sqlClient`SELECT e.id,e.kind,e.amount_afn,e.occurred_at,i.invoice_number,
   p.preferred_name AS patient_name FROM clinic_payment_entries e
   JOIN clinic_invoices i ON i.id=e.invoice_id
   JOIN clinic_patients p ON p.id=e.patient_id
   WHERE e.clinic_id=${cid(req)}
   ORDER BY e.created_at DESC LIMIT 8`;
  noStore(res);res.json({summary,currency:"AFN",recent,
   expensesImplemented:false,receiptsAreCashFlow:true,chargesAreReceivables:true});
 }));
 api.get("/clinics/:clinicId/invoices",task(async(req,res)=>{
  await access(req);
  const status=String(req.query.status||"all");
  if(!["all","draft","issued","partially_paid","paid","overdue","void"].includes(status))
   fail(422,"INVALID_STATUS");
  const search=str(String(req.query.q||""),0,100,"QUERY");
  const page=Number(req.query.page||1);
  if(!Number.isInteger(page)||page<1||page>10000)fail(422,"INVALID_PAGE");
  const patientId=req.query.patientId?str(req.query.patientId,8,100,"PATIENT"):null;
  const rows=await sqlClient`SELECT i.*,p.preferred_name||' '||coalesce(p.family_name,'') AS patient_name,
    p.patient_number,coalesce((
      SELECT sum(CASE WHEN e.kind='reversal' THEN -e.amount_afn ELSE e.amount_afn END)
      FROM clinic_payment_entries e WHERE e.invoice_id=i.id),0)::integer AS paid_afn
   FROM clinic_invoices i JOIN clinic_patients p ON p.id=i.patient_id AND p.clinic_id=i.clinic_id
   WHERE i.clinic_id=${cid(req)} AND (${patientId}::text IS NULL OR i.patient_id=${patientId})
   AND (${search}='' OR p.preferred_name ILIKE ${"%"+search+"%"}
    OR p.patient_number ILIKE ${"%"+search+"%"} OR
    ('INV-'||lpad(i.invoice_number::text,6,'0')) ILIKE ${"%"+search+"%"})
   ORDER BY i.created_at DESC,i.id DESC LIMIT 400`;
  const filtered=rows.map(readable).filter(x=>status==="all"||x.status===status);
  noStore(res);res.json({invoices:filtered.slice((page-1)*15,page*15),page,
   hasMore:filtered.length>page*15,total:filtered.length,currency:"AFN"});
 }));
 api.get("/clinics/:clinicId/invoices/:invoiceId",task(async(req,res)=>{
  await access(req);
  const payload=await invoiceDetails(req,String(req.params.invoiceId));
  noStore(res);res.json(payload);
 }));
 api.post("/clinics/:clinicId/invoices",task(async(req,res)=>{
  const ctx=await access(req,"invoice");
  const patientId=str(req.body?.patientId,8,100,"PATIENT");
  const p=await getPatient(cid(req),patientId);
  if(p.status!=="active")fail(409,"PATIENT_INACTIVE");
  const sourceType=str(req.body?.sourceType,8,30,"SOURCE_TYPE");
  const sourceId=str(req.body?.sourceId,8,100,"SOURCE_ID");
  if(!["appointment","encounter","treatment_stage"].includes(sourceType))fail(422,"INVALID_BILLING_SOURCE");
  const dueDate=date(req.body?.dueDate),note=req.body?.note?str(req.body.note,1,1000,"NOTE"):null;
  let id=randomUUID(),invoiceNumber=0;
  await sqlClient.begin(async tx=>{
   const prices=await lines(tx,cid(req),patientId,sourceType,sourceId,ctx,req.body?.items);
   await tx`INSERT INTO clinic_invoice_counters(clinic_id,next_number)
    VALUES(${cid(req)},1) ON CONFLICT(clinic_id) DO NOTHING`;
   const [counter]=await tx`UPDATE clinic_invoice_counters SET next_number=next_number+1
     WHERE clinic_id=${cid(req)} RETURNING next_number-1 AS number`;
   invoiceNumber=counter.number;
   const item={id,patient_id:patientId,version:1};
   await tx`INSERT INTO clinic_invoices(id,clinic_id,patient_id,invoice_number,source_type,
    source_id,total_afn,due_date,internal_note,created_by)
    VALUES(${id},${cid(req)},${patientId},${invoiceNumber},${sourceType},
      ${sourceId},${prices.total},${dueDate},${note},${req.actor!.id})`;
   await saveVersion(tx,req,item,prices.items,prices.total,note);
   await log(tx,req,item,"created");
  });
  noStore(res);res.status(201).json({id,number:invoiceNumber,version:1,revision:1,status:"draft"});
 }));
 api.put("/clinics/:clinicId/invoices/:invoiceId",task(async(req,res)=>{
  const ctx=await access(req,"invoice");
  const revision=amount(req.body?.revision,1,1000000,"REVISION");
  const dueDate=date(req.body?.dueDate),note=req.body?.note?str(req.body.note,1,1000,"NOTE"):null;
  const id=String(req.params.invoiceId);
  let version=0;
  await sqlClient.begin(async tx=>{
   const current=await invoiceRow(tx,cid(req),id,true);
   if(current.status!=="draft")fail(409,"ISSUED_INVOICE_IMMUTABLE");
   if(current.revision!==revision)fail(409,"STALE_INVOICE_REVISION");
   const priced=await lines(tx,cid(req),current.patient_id,current.source_type,
    current.source_id,ctx,req.body?.items);
   version=current.version+1;
   await tx`UPDATE clinic_invoices SET version=${version},revision=revision+1,
    total_afn=${priced.total},due_date=${dueDate},internal_note=${note},updated_at=now()
    WHERE id=${id}`;
   await saveVersion(tx,req,{...current,version},priced.items,priced.total,note);
   await log(tx,req,{...current,version},"edited");
  });
  noStore(res);res.json({id,version,revision:revision+1,status:"draft"});
 }));
 api.post("/clinics/:clinicId/invoices/:invoiceId/issue",task(async(req,res)=>{
  await access(req,"invoice");
  const revision=amount(req.body?.revision,1,1000000,"REVISION");
  const id=String(req.params.invoiceId);
  await sqlClient.begin(async tx=>{
   const i=await invoiceRow(tx,cid(req),id,true);
   if(i.revision!==revision)fail(409,"STALE_INVOICE_REVISION");
   if(i.status!=="draft")fail(409,"INVOICE_ALREADY_ISSUED");
   await evidence(tx,cid(req),i.patient_id,i.source_type,i.source_id);
   await tx`UPDATE clinic_invoices SET status='issued',revision=revision+1,
     issued_at=now(),issued_by=${req.actor!.id},updated_at=now() WHERE id=${id}`;
   await log(tx,req,i,"issued");
  });
  noStore(res);res.json({id,status:"issued",revision:revision+1});
 }));
 api.post("/clinics/:clinicId/invoices/:invoiceId/void",task(async(req,res)=>{
  await access(req,"reverse");
  const revision=amount(req.body?.revision,1,1000000,"REVISION"),
   reason=str(req.body?.reason,10,500,"VOID_REASON"),id=String(req.params.invoiceId);
  await sqlClient.begin(async tx=>{
   const i=await invoiceRow(tx,cid(req),id,true);
   if(i.revision!==revision)fail(409,"STALE_INVOICE_REVISION");
   if(i.status!=="issued")fail(409,"INVOICE_NOT_ISSUED");
   const [any]=await tx`SELECT id FROM clinic_payment_entries WHERE invoice_id=${id} LIMIT 1`;
   if(any)fail(409,"INVOICE_HAS_LEDGER_HISTORY");
   await tx`UPDATE clinic_invoices SET status='void',revision=revision+1,
    voided_at=now(),voided_by=${req.actor!.id},void_reason=${reason},
    updated_at=now() WHERE id=${id}`;
   await log(tx,req,i,"void",reason);
  });
  noStore(res);res.json({id,status:"void",revision:revision+1});
 }));
 async function postEntry(req:StaffRequest,res:Response,kind:"payment"|"credit"){
  await access(req,kind==="payment"?"post":"reverse");
  const id=String(req.params.invoiceId);
  const key=actionKey(req.body?.actionKey);
  const total=amount(req.body?.amountAfn,1,2000000000,"AMOUNT");
  const method=kind==="credit"?"credit":str(req.body?.method,4,20,"METHOD");
  if(kind==="payment"&&!["cash","bank_transfer","other_manual"].includes(method))
   fail(422,"INVALID_PAYMENT_METHOD");
  const reference=req.body?.reference?str(req.body.reference,2,120,"REFERENCE"):null;
  const note=req.body?.note?str(req.body.note,1,500,"PAYMENT_NOTE"):null;
  if(kind==="credit"&&(!note||note.length<10))fail(422,"CREDIT_REASON_REQUIRED");
  const occurredAt=req.body?.occurredAt?new Date(req.body.occurredAt):new Date();
  if(!Number.isFinite(occurredAt.getTime())||occurredAt.getTime()>Date.now()+60000||
   occurredAt.getTime()<Date.now()-366*86400000)fail(422,"INVALID_PAYMENT_DATE");
  // Digest user-submitted time, not a newly generated default time on replay.
  const payload={kind,id,total,method,reference,note,occurredAt:req.body?.occurredAt??null};
  const hashed=digest(payload);
  let entry:any=null,replayed=false;
  await sqlClient.begin(async tx=>{
   // Lock before checking balance: concurrent partial payments cannot overpay.
   const i=await invoiceRow(tx,cid(req),id,true);
   const [previous]=await tx`SELECT * FROM clinic_payment_entries
    WHERE clinic_id=${cid(req)} AND created_by=${req.actor!.id} AND action_key=${key}`;
   if(previous){
    if(previous.request_digest!==hashed||previous.invoice_id!==id)
     fail(409,"IDEMPOTENCY_KEY_CHANGED");
    entry=previous;replayed=true;return;
   }
   if(i.status!=="issued")fail(409,"INVOICE_NOT_ISSUED");
   const available=i.total_afn-i.paid_afn;
   if(total>available)fail(409,"AMOUNT_EXCEEDS_BALANCE");
   const existingReference=reference&&kind==="payment"?await tx`SELECT id FROM clinic_payment_entries
    WHERE invoice_id=${id} AND clinic_id=${cid(req)} AND
      kind='payment' AND method=${method} AND reference=${reference} LIMIT 1`:[];
   if(existingReference.length)fail(409,"DUPLICATE_PAYMENT_REFERENCE");
   const uid=randomUUID();
   const [saved]=await tx`INSERT INTO clinic_payment_entries
    (id,clinic_id,patient_id,invoice_id,kind,amount_afn,method,reference,
     note,action_key,request_digest,occurred_at,created_by)
    VALUES(${uid},${cid(req)},${i.patient_id},${id},${kind},${total},${method},
     ${reference},${note},${key},${hashed},${occurredAt.toISOString()},${req.actor!.id}) RETURNING *`;
   entry=saved;
   await logLedger(tx,req,uid,kind==="payment"?"payment_recorded":"credit_applied");
  });
  noStore(res);res.status(replayed?200:201).json({entry:{id:entry.id,invoiceId:id,kind,amountAfn:total,
   receiptNumber:kind==="payment"?"RCT-"+entry.id.slice(0,8).toUpperCase():null},replayed});
 }
 api.post("/clinics/:clinicId/invoices/:invoiceId/payments",task((req,res)=>postEntry(req,res,"payment")));
 api.post("/clinics/:clinicId/invoices/:invoiceId/credits",task((req,res)=>postEntry(req,res,"credit")));
 api.post("/clinics/:clinicId/entries/:entryId/reverse",task(async(req,res)=>{
  await access(req,"reverse");
  const id=String(req.params.entryId),key=actionKey(req.body?.actionKey),
    reason=str(req.body?.reason,10,500,"REVERSAL_REASON");
  const hash=digest({id,reason});
  let entry:any=null,replayed=false;
  await sqlClient.begin(async tx=>{
   const [original]=await tx`SELECT * FROM clinic_payment_entries WHERE id=${id} AND clinic_id=${cid(req)}`;
   if(!original)fail(404,"LEDGER_ENTRY_NOT_FOUND");
   const invoice=await invoiceRow(tx,cid(req),original.invoice_id,true);
   const [existing]=await tx`SELECT * FROM clinic_payment_entries
    WHERE clinic_id=${cid(req)} AND created_by=${req.actor!.id} AND action_key=${key}`;
   if(existing){
    if(existing.request_digest!==hash||existing.reverses_entry_id!==id)
     fail(409,"IDEMPOTENCY_KEY_CHANGED");
    entry=existing;replayed=true;return;
   }
   if(invoice.status!=="issued")fail(409,"INVOICE_NOT_ISSUED");
   if(!["payment","credit"].includes(original.kind))fail(409,"CANNOT_REVERSE_REVERSAL");
   const [reversed]=await tx`SELECT id FROM clinic_payment_entries WHERE reverses_entry_id=${id} LIMIT 1`;
   if(reversed)fail(409,"ALREADY_REVERSED");
   const uid=randomUUID();
   const [saved]=await tx`INSERT INTO clinic_payment_entries(id,clinic_id,patient_id,invoice_id,
    kind,amount_afn,method,reference,note,reverses_entry_id,action_key,request_digest,created_by)
    VALUES(${uid},${cid(req)},${original.patient_id},${original.invoice_id},
    'reversal',${original.amount_afn},${original.method},${original.reference},${reason},
     ${id},${key},${hash},${req.actor!.id}) RETURNING *`;
   entry=saved;await logLedger(tx,req,uid,"entry_reversed");
  });
  noStore(res);res.status(replayed?200:201).json({entry:{id:entry.id,invoiceId:entry.invoice_id,
   amountAfn:entry.amount_afn,reversesEntryId:id,kind:"reversal"},replayed});
 }));
 api.get("/clinics/:clinicId/payments",task(async(req,res)=>{
  await access(req,"overview");
  const page=Number(req.query.page||1);
  if(!Number.isInteger(page)||page<1||page>10000)fail(422,"INVALID_PAGE");
  const filter=String(req.query.kind||"all");
  if(!["all","payment","reversal","credit"].includes(filter))fail(422,"INVALID_KIND");
  const rows=await sqlClient`SELECT e.id,e.invoice_id,e.kind,e.amount_afn,e.method,e.reference,
   e.note,e.reverses_entry_id,e.occurred_at,e.created_at,
   i.invoice_number,p.preferred_name||' '||coalesce(p.family_name,'') AS patient_name,
   u.name AS actor_name FROM clinic_payment_entries e
   JOIN clinic_invoices i ON i.id=e.invoice_id
   JOIN clinic_patients p ON p.id=e.patient_id
   JOIN auth_users u ON u.id=e.created_by
   WHERE e.clinic_id=${cid(req)} AND (${filter}='all' OR e.kind=${filter})
   ORDER BY e.created_at DESC,e.id DESC LIMIT 16 OFFSET ${(page-1)*15}`;
  noStore(res);res.json({entries:rows.slice(0,15),page,hasMore:rows.length>15,currency:"AFN"});
 }));
 api.get("/clinics/:clinicId/balances",task(async(req,res)=>{
  await access(req,"overview");
  const aging=String(req.query.aging||"all");
  if(!["all","current","1-30","31-60","61+"].includes(aging))fail(422,"INVALID_AGING");
  const page=Number(req.query.page||1);
  if(!Number.isInteger(page)||page<1||page>10000)fail(422,"INVALID_PAGE");
  const rows=await sqlClient`SELECT i.id,i.invoice_number,i.patient_id,i.due_date,i.total_afn,
   p.preferred_name||' '||coalesce(p.family_name,'') AS patient_name,
   p.patient_number,coalesce((SELECT SUM(CASE WHEN e.kind='reversal'
   THEN -e.amount_afn ELSE e.amount_afn END)
   FROM clinic_payment_entries e WHERE e.invoice_id=i.id),0)::integer AS paid_afn
   FROM clinic_invoices i JOIN clinic_patients p ON p.id=i.patient_id
   WHERE i.clinic_id=${cid(req)} AND i.status='issued' ORDER BY i.due_date NULLS LAST,i.id
   LIMIT 500`;
  const today=Date.parse(localDay()+"T12:00:00Z");
  const receivables=rows.map(x=>{
   const overdueDays=x.due_date?Math.max(0,Math.round((today-Date.parse(String(x.due_date).slice(0,10)+"T12:00:00Z"))/86400000)):0;
   return {id:x.id,label:"INV-"+String(x.invoice_number).padStart(6,"0"),
    patientId:x.patient_id,patientName:x.patient_name,patientNumber:x.patient_number,
    dueDate:x.due_date,overdueDays,
    aging:overdueDays===0?"current":overdueDays<=30?"1-30":overdueDays<=60?"31-60":"61+",
    totalAfn:x.total_afn,paidAfn:x.paid_afn,balanceAfn:x.total_afn-x.paid_afn};
  }).filter(x=>x.balanceAfn>0&&(aging==="all"||x.aging===aging));
  noStore(res);res.json({balances:receivables.slice((page-1)*15,page*15),page,
   hasMore:receivables.length>page*15,total:receivables.length,currency:"AFN"});
 }));
 api.get("/clinics/:clinicId/patients/:patientId/statement",task(async(req,res)=>{
  await access(req);
  const p=await getPatient(cid(req),String(req.params.patientId));
  const rows=await sqlClient`SELECT i.*,coalesce((SELECT SUM(CASE WHEN e.kind='reversal'
    THEN -e.amount_afn ELSE e.amount_afn END) FROM clinic_payment_entries e
    WHERE e.invoice_id=i.id),0)::integer AS paid_afn
   FROM clinic_invoices i WHERE i.clinic_id=${cid(req)} AND i.patient_id=${p.id}
   ORDER BY i.created_at DESC LIMIT 150`;
  const documents=rows.map(readable);
  const posted=documents.filter(x=>x.documentStatus==="issued");
  const summary={totalInvoicedAfn:posted.reduce((s,x)=>s+x.totalAfn,0),
   totalPaidAfn:posted.reduce((s,x)=>s+x.paidAfn,0),
   outstandingAfn:posted.reduce((s,x)=>s+x.balanceAfn,0)};
  const entries=await sqlClient`SELECT e.id,e.invoice_id,e.kind,e.amount_afn,e.method,e.reference,
   e.occurred_at,e.created_at,i.invoice_number
   FROM clinic_payment_entries e JOIN clinic_invoices i ON i.id=e.invoice_id
   WHERE e.clinic_id=${cid(req)} AND e.patient_id=${p.id}
   ORDER BY e.created_at DESC,e.id DESC LIMIT 200`;
  noStore(res);res.json({patient:{id:p.id,number:p.patientNumber,name:
   p.preferredName+" "+(p.familyName||"")},summary,invoices:documents,entries,
   currency:"AFN",patientAppReleased:false});
 }));
 api.get("/clinics/:clinicId/payments/:paymentId/receipt",task(async(req,res)=>{
  await access(req);
  const id=String(req.params.paymentId);
  const [entry]=await sqlClient`SELECT e.id,e.invoice_id,e.patient_id,e.kind,e.amount_afn,e.method,
    e.reference,e.note,e.occurred_at,e.created_at,u.name AS entered_by,
    i.invoice_number,p.preferred_name||' '||coalesce(p.family_name,'') AS patient_name,
    p.patient_number,c.display_name AS clinic_name,
    EXISTS(SELECT 1 FROM clinic_payment_entries r WHERE r.reverses_entry_id=e.id) AS reversed
   FROM clinic_payment_entries e JOIN clinic_invoices i ON i.id=e.invoice_id
   JOIN clinic_patients p ON p.id=e.patient_id JOIN clinics c ON c.id=e.clinic_id
   JOIN auth_users u ON u.id=e.created_by
   WHERE e.id=${id} AND e.clinic_id=${cid(req)} AND e.kind='payment' LIMIT 1`;
  if(!entry)fail(404,"RECEIPT_NOT_FOUND");
  noStore(res);res.json({receipt:{number:"RCT-"+entry.id.slice(0,8).toUpperCase(),
   invoiceNumber:"INV-"+String(entry.invoice_number).padStart(6,"0"),
   amountAfn:entry.amount_afn,method:entry.method,reference:entry.reference,note:entry.note,
   occurredAt:entry.occurred_at,recordedAt:entry.created_at,enteredBy:entry.entered_by,
   clinicName:entry.clinic_name,patientName:entry.patient_name,
   patientNumber:entry.patient_number,reversed:entry.reversed,currency:"AFN",
   verifiedOnline:false,patientAppReleased:false}});
 }));
 api.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof BillingFault||error instanceof AccessFault)
   return void res.status(error.status).json({code:error.code});
  if(error instanceof PatientError)
   return void res.status(error.statusCode).json({code:error.code});
  const code=(error as any)?.code;
  if(code==="23505")return void res.status(409).json({code:"BILLING_CONFLICT"});
  if(code==="23514"||code==="23503")return void res.status(422).json({code:"BILLING_CONSTRAINT"});
  console.error("PH10 billing request failed",error instanceof Error?error.name:"unknown",
   "sqlState",code||"none"); // No SQL text, patient details, parameters or PHI.
  res.status(500).json({code:"BILLING_UNAVAILABLE"});
 });
 return api;
}
