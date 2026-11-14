import {Router,type Request,type Response,type NextFunction} from "express";
import {createHash,randomUUID} from "node:crypto";
import {eq} from "drizzle-orm";
import {db,schema,sqlClient} from "@dandanlink/db";
import {authStaff,scope,AccessFault,type StaffRequest} from "./staff-access.js";

/** PH11 operational expenses. No patient reference and no interaction with PH10 receivables. */
class ExpenseFault extends Error{constructor(public status:number,public code:string){super(code);}}
function fail(status:number,code:string):never{throw new ExpenseFault(status,code);}
const task=(fn:(req:StaffRequest,res:Response)=>Promise<void>)=>
 (req:StaffRequest,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const cid=(req:StaffRequest)=>String(req.params.clinicId);
const privateResponse=(res:Response)=>res.setHeader("Cache-Control","private, no-store");
const str=(v:unknown,min:number,max:number,key:string):string=>{
 if(typeof v!=="string"||v.trim().length<min||v.trim().length>max)fail(422,"INVALID_"+key);
 return v.trim();
};
const optional=(v:unknown,max:number,key:string):string|null=>
 v==null||v===""?null:str(v,1,max,key);
const integer=(v:unknown,min:number,max:number,key:string):number=>{
 if(typeof v!=="number"||!Number.isSafeInteger(v)||v<min||v>max)fail(422,"INVALID_"+key);
 return v;
};
function day(v:unknown):string{
 const s=str(v,10,10,"DATE");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+"T12:00:00Z"))||
  new Date(s+"T12:00:00Z").toISOString().slice(0,10)!==s)fail(422,"INVALID_DATE");
 return s;
}
const categories=["rent","salary","supplies","utilities","other"] as const;
const methods=["cash","bank_transfer","other_manual"] as const;
type Category=typeof categories[number];
type Method=typeof methods[number];
const category=(v:unknown):Category=>{
 if(!categories.includes(v as Category))fail(422,"INVALID_EXPENSE_CATEGORY");return v as Category;
};
const method=(v:unknown):Method=>{
 if(!methods.includes(v as Method))fail(422,"INVALID_PAYMENT_METHOD");return v as Method;
};
const actionKey=(v:unknown):string=>{
 const s=str(v,8,100,"ACTION_KEY");
 if(!/^[A-Za-z0-9_-]{8,100}$/.test(s))fail(422,"INVALID_ACTION_KEY");return s;
};
const sha=(content:Buffer|string)=>createHash("sha256").update(content).digest("hex");
const localDay=():string=>{
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kabul",
  year:"numeric",month:"2-digit",day:"2-digit"})
  .formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join("-");
};
const monthStart=()=>localDay().slice(0,7)+"-01";
function period(req:StaffRequest){
 const from=day(req.query.from??monthStart()),to=day(req.query.to??localDay());
 const days=(Date.parse(to+"T00:00:00Z")-Date.parse(from+"T00:00:00Z"))/86400000;
 if(days<0||days>365)fail(422,"INVALID_REPORT_PERIOD");
 return {from,to};
}
async function access(req:StaffRequest,kind:"read"|"write"|"void"|"summary"="read"){
 const context=await scope(req,cid(req));
 if(!["owner","manager","cashier"].includes(context.role))fail(403,"EXPENSE_ROLE_DENIED");
 if(kind==="void"&&!["owner","manager"].includes(context.role))fail(403,"EXPENSE_VOID_DENIED");
 if(kind==="write"||kind==="void"){
  if(context.clinic.status==="suspended")fail(403,"CLINIC_SUSPENDED");
  const sub=await db.query.clinicSubscription.findFirst({
   where:eq(schema.clinicSubscription.clinicId,cid(req))});
  if(!sub||sub.status==="cancelled")fail(403,"SUBSCRIPTION_REQUIRED");
  const plan=await db.query.planVersion.findFirst({
   where:eq(schema.planVersion.id,sub.planVersionId)});
  if(!plan)fail(403,"SUBSCRIPTION_REQUIRED");
  const expiry=sub.status==="trialing"?sub.trialEndsAt:sub.currentPeriodEndsAt;
  if(expiry&&expiry.getTime()+(sub.status==="trialing"?0:plan.graceDays*86400000)<Date.now())
   fail(403,"SUBSCRIPTION_EXPIRED");
 }
 return context;
}
type Receipt={name:string;mime:string;bytes:Buffer;digest:string};
function receipt(v:unknown):Receipt|null{
 if(v==null)return null;
 if(!v||typeof v!=="object")fail(422,"INVALID_RECEIPT");
 const file=v as Record<string,unknown>;
 const name=str(file.fileName,3,120,"FILE_NAME");
 if(!/^[\w. ()-]+$/.test(name))fail(422,"INVALID_FILE_NAME");
 const mime=str(file.mimeType,7,40,"RECEIPT_MIME");
 if(!["application/pdf","image/png","image/jpeg"].includes(mime))fail(415,"RECEIPT_FILE_TYPE");
 const content=str(file.contentBase64,8,1400000,"RECEIPT_DATA");
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(content)||content.length%4!==0)
  fail(422,"INVALID_RECEIPT_DATA");
 const bytes=Buffer.from(content,"base64");
 if(bytes.length<8||bytes.length>1048576)fail(413,"RECEIPT_SIZE_LIMIT");
 const valid=mime==="application/pdf"?bytes.subarray(0,5).toString()==="%PDF-":
 mime==="image/png"?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
 bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!valid)fail(415,"RECEIPT_SIGNATURE_MISMATCH");
 return {name,mime,bytes,digest:sha(bytes)};
}
type Input={date:string;category:Category;description:string;amountAfn:number;
 paymentMethod:Method;reference:string|null;attribution:string|null;
 removeReceipt:boolean;receipt:Receipt|null};
function input(value:any):Input{
 if(!value||typeof value!=="object")fail(422,"INVALID_EXPENSE");
 const removeReceipt=value.removeReceipt===true;
 const file=receipt(value.receipt);
 if(removeReceipt&&file)fail(422,"RECEIPT_REMOVE_CONFLICT");
 return {date:day(value.date),category:category(value.category),
  description:str(value.description,3,500,"DESCRIPTION"),
  amountAfn:integer(value.amountAfn,1,2000000000,"AMOUNT"),
  paymentMethod:method(value.paymentMethod),
  reference:optional(value.reference,120,"REFERENCE"),
  attribution:optional(value.attribution,120,"ATTRIBUTION"),
  receipt:file,removeReceipt};
}
function signature(i:Input,reason:string|null=null){
 return sha(JSON.stringify({date:i.date,category:i.category,description:i.description,
  amountAfn:i.amountAfn,paymentMethod:i.paymentMethod,reference:i.reference,
  attribution:i.attribution,receiptSha:i.receipt?.digest||null,
  removeReceipt:i.removeReceipt,reason}));
}
async function exp(tx:any,clinicId:string,id:string,lock=false){
 if(lock){
  const e=await tx`SELECT id FROM clinic_expenses WHERE id=${id} AND clinic_id=${clinicId} FOR UPDATE`;
  if(!e.length)fail(404,"EXPENSE_NOT_FOUND");
 }
 const [r]=await tx`SELECT e.*,u.name AS actor_name,
  (SELECT v.receipt_id FROM clinic_expense_versions v WHERE v.expense_id=e.id
   AND v.version=e.revision) AS receipt_id
  FROM clinic_expenses e JOIN auth_users u ON u.id=e.updated_by
  WHERE e.id=${id} AND e.clinic_id=${clinicId} LIMIT 1`;
 if(!r)fail(404,"EXPENSE_NOT_FOUND");
 return r;
}
function brief(e:any){
 return {id:e.id,number:e.expense_number,label:"EXP-"+String(e.expense_number).padStart(6,"0"),
  clinicId:e.clinic_id,revision:e.revision,status:e.status,date:e.expense_date,
  category:e.category,description:e.description,amountAfn:e.amount_afn,
  paymentMethod:e.payment_method,reference:e.reference,attribution:e.attribution,
  voidReason:e.void_reason,receiptId:e.receipt_id||null,
  actorName:e.actor_name||null,createdAt:e.created_at,updatedAt:e.updated_at};
}
async function saveReceipt(tx:any,req:StaffRequest,id:string,version:number,value:Receipt){
 const receiptId=randomUUID();
 await tx`INSERT INTO clinic_expense_receipts(id,clinic_id,expense_id,version,file_name,
  mime_type,byte_length,sha256_hex,document_bytes,uploaded_by)
 VALUES(${receiptId},${cid(req)},${id},${version},${value.name},${value.mime},
 ${value.bytes.length},${value.digest},decode(${value.bytes.toString("base64")},'base64'),
 ${req.actor!.id})`;
 return receiptId;
}
async function snapshot(tx:any,req:StaffRequest,id:string,version:number,
 action:"created"|"corrected"|"voided",fields:Input,receiptId:string|null,
 reason:string|null,key:string,digest:string){
 await tx`INSERT INTO clinic_expense_versions(id,expense_id,clinic_id,version,action,
 expense_date,category,description,amount_afn,payment_method,reference,attribution,receipt_id,
 correction_reason,actor_id,action_key,request_digest)
 VALUES(${randomUUID()},${id},${cid(req)},${version},${action},
 ${fields.date}::date,${fields.category},${fields.description},${fields.amountAfn},
 ${fields.paymentMethod},${fields.reference},${fields.attribution},${receiptId},
 ${reason},${req.actor!.id},${key},${digest})`;
 await tx`INSERT INTO audit_events(id,actor_id,clinic_id,action,subject_type,subject_id,outcome)
 VALUES(${randomUUID()},${req.actor!.id},${cid(req)},${"expense."+action},
  'clinic_expense',${id},'success')`;
}
async function previousAction(tx:any,req:StaffRequest,key:string,digest:string,
 expenseId?:string){
 const [prior]=await tx`SELECT v.expense_id,v.action,v.version,v.request_digest
 FROM clinic_expense_versions v WHERE v.clinic_id=${cid(req)} AND
 v.actor_id=${req.actor!.id} AND v.action_key=${key} LIMIT 1`;
 if(!prior)return null;
 if(prior.request_digest!==digest||(expenseId&&prior.expense_id!==expenseId))
  fail(409,"EXPENSE_ACTION_KEY_REUSED");
 return prior;
}
export function expenseRouter(){
 const router=Router();
 router.use((req,res,next)=>{
  const origin=req.headers.origin;
  if(!["GET","HEAD","OPTIONS"].includes(req.method)&&origin&&![
   process.env.CLINIC_WEB_URL||"http://localhost:3000",
   process.env.ADMIN_WEB_URL||"http://localhost:3001"].includes(origin)){
   res.status(403).json({code:"ORIGIN_DENIED"});return;
  }
  next();
 });
 router.use(authStaff);
 router.get("/clinics/:clinicId/expenses/summary",task(async(req,res)=>{
  const ctx=await access(req,"summary"),p=period(req);
  const [summary]=await sqlClient`WITH expense AS (
   SELECT coalesce(SUM(amount_afn),0)::integer AS total,COUNT(*)::integer AS count
   FROM clinic_expenses WHERE clinic_id=${cid(req)} AND status='posted'
    AND expense_date BETWEEN ${p.from}::date AND ${p.to}::date
  ),ledger AS (
   SELECT e.kind,e.amount_afn
   FROM clinic_payment_entries e JOIN clinic_invoices i ON i.id=e.invoice_id
   WHERE e.clinic_id=${cid(req)} AND i.status='issued' AND e.kind<>'credit'
    AND (e.occurred_at AT TIME ZONE 'Asia/Kabul')::date
     BETWEEN ${p.from}::date AND ${p.to}::date
  ),revenue AS (
   SELECT coalesce(SUM(CASE WHEN kind='reversal' THEN -amount_afn ELSE amount_afn END),0)::integer
     AS cash_collections FROM ledger
  )
  SELECT expense.total AS expense_total_afn,expense.count AS expense_count,
   revenue.cash_collections AS net_collections_afn,
   revenue.cash_collections-expense.total AS net_after_expenses_afn
  FROM expense,revenue`;
  const byCategory=ctx.role==="owner"||ctx.role==="manager"?
   await sqlClient`SELECT category,COUNT(*)::integer AS count,
   SUM(amount_afn)::integer AS total_afn FROM clinic_expenses
   WHERE clinic_id=${cid(req)} AND status='posted' AND
    expense_date BETWEEN ${p.from}::date AND ${p.to}::date
   GROUP BY category ORDER BY total_afn DESC,category`:[];
  privateResponse(res);res.json({period:p,summary,
   categories:byCategory,currency:"AFN",accountingBasis:"manual_recorded_cash_flow",
   netAfterExpensesIsNotProfit:true,bankTransfersNotVerified:true,
   patientReceivablesUnaffected:true});
 }));
 router.get("/clinics/:clinicId/expenses",task(async(req,res)=>{
  await access(req);
  const p=period(req),q=String(req.query.q||"").trim().slice(0,100);
  const cat=String(req.query.category||"all"),met=String(req.query.method||"all"),
   status=String(req.query.status||"posted");
  if(!["all",...categories].includes(cat))fail(422,"INVALID_EXPENSE_CATEGORY");
  if(!["all",...methods].includes(met))fail(422,"INVALID_PAYMENT_METHOD");
  if(!["all","posted","void"].includes(status))fail(422,"INVALID_EXPENSE_STATUS");
  const page=Number(req.query.page||1);
  if(!Number.isInteger(page)||page<1||page>10000)fail(422,"INVALID_PAGE");
  const rows=await sqlClient`SELECT e.*,u.name AS actor_name,
   (SELECT v.receipt_id FROM clinic_expense_versions v WHERE
      v.expense_id=e.id AND v.version=e.revision) AS receipt_id
   FROM clinic_expenses e JOIN auth_users u ON u.id=e.updated_by
   WHERE e.clinic_id=${cid(req)}
    AND e.expense_date BETWEEN ${p.from}::date AND ${p.to}::date
    AND (${cat}='all' OR e.category=${cat})
    AND (${met}='all' OR e.payment_method=${met})
    AND (${status}='all' OR e.status=${status})
    AND (${q}='' OR e.description ILIKE ${"%"+q+"%"} OR
     e.reference ILIKE ${"%"+q+"%"} OR
     ('EXP-'||lpad(e.expense_number::text,6,'0')) ILIKE ${"%"+q+"%"})
   ORDER BY e.expense_date DESC,e.created_at DESC,e.id DESC
   LIMIT 16 OFFSET ${(page-1)*15}`;
  privateResponse(res);res.json({expenses:rows.slice(0,15).map(brief),page,hasMore:rows.length>15,
   period:p,currency:"AFN"});
 }));
 router.get("/clinics/:clinicId/expenses/:expenseId",task(async(req,res)=>{
  await access(req);
  const id=String(req.params.expenseId),e=await exp(sqlClient,cid(req),id);
  const history=await sqlClient`SELECT v.id,v.version,v.action,v.expense_date,v.category,
   v.description,v.amount_afn,v.payment_method,v.reference,v.attribution,
   v.receipt_id,v.correction_reason,v.created_at,u.name AS actor_name
   FROM clinic_expense_versions v JOIN auth_users u ON u.id=v.actor_id
   WHERE v.clinic_id=${cid(req)} AND v.expense_id=${id}
   ORDER BY v.version DESC LIMIT 100`;
  privateResponse(res);res.json({expense:brief(e),history,currency:"AFN"});
 }));
 router.post("/clinics/:clinicId/expenses",task(async(req,res)=>{
  await access(req,"write");
  const fields=input(req.body),key=actionKey(req.body?.actionKey),digest=signature(fields);
  let id=randomUUID(),number=0,replayed=false;
  await sqlClient.begin(async tx=>{
   const prior=await previousAction(tx,req,key,digest);
   if(prior){if(prior.action!=="created")fail(409,"EXPENSE_ACTION_KEY_REUSED");
    id=prior.expense_id;replayed=true;return;}
   await tx`INSERT INTO clinic_expense_counters(clinic_id,next_number)
    VALUES(${cid(req)},1) ON CONFLICT(clinic_id) DO NOTHING`;
   const [counter]=await tx`UPDATE clinic_expense_counters SET next_number=next_number+1
    WHERE clinic_id=${cid(req)} RETURNING next_number-1 AS number`;
   number=counter.number;
   await tx`INSERT INTO clinic_expenses(id,clinic_id,expense_number,expense_date,
    category,description,amount_afn,payment_method,reference,attribution,created_by,updated_by)
   VALUES(${id},${cid(req)},${number},${fields.date}::date,${fields.category},
   ${fields.description},${fields.amountAfn},${fields.paymentMethod},${fields.reference},
   ${fields.attribution},${req.actor!.id},${req.actor!.id})`;
   const receiptId=fields.receipt?await saveReceipt(tx,req,id,1,fields.receipt):null;
   await snapshot(tx,req,id,1,"created",fields,receiptId,null,key,digest);
  });
  const current=await exp(sqlClient,cid(req),id);
  privateResponse(res);res.status(replayed?200:201).json({expense:brief(current),replayed});
 }));
 router.put("/clinics/:clinicId/expenses/:expenseId",task(async(req,res)=>{
  await access(req,"write");
  const id=String(req.params.expenseId),fields=input(req.body),
   version=integer(req.body?.revision,1,1000000,"REVISION"),
   reason=str(req.body?.reason,10,500,"CORRECTION_REASON"),
   key=actionKey(req.body?.actionKey),digest=signature(fields,reason);
  let replayed=false;
  await sqlClient.begin(async tx=>{
   const current=await exp(tx,cid(req),id,true);
   const previous=await previousAction(tx,req,key,digest,id);
   if(previous){
    if(previous.action!=="corrected")fail(409,"EXPENSE_ACTION_KEY_REUSED");
    replayed=true;return;
   }
   if(current.status!=="posted")fail(409,"EXPENSE_FINAL");
   if(current.revision!==version)fail(409,"STALE_EXPENSE_REVISION");
   const next=version+1;
   const receiptId=fields.receipt?await saveReceipt(tx,req,id,next,fields.receipt):
    fields.removeReceipt?null:current.receipt_id;
   await tx`UPDATE clinic_expenses SET expense_date=${fields.date}::date,
    category=${fields.category},description=${fields.description},
    amount_afn=${fields.amountAfn},payment_method=${fields.paymentMethod},
    reference=${fields.reference},attribution=${fields.attribution},
    revision=${next},updated_by=${req.actor!.id},updated_at=now() WHERE id=${id}`;
   await snapshot(tx,req,id,next,"corrected",fields,receiptId,reason,key,digest);
  });
  const current=await exp(sqlClient,cid(req),id);
  privateResponse(res);res.json({expense:brief(current),replayed});
 }));
 router.post("/clinics/:clinicId/expenses/:expenseId/void",task(async(req,res)=>{
  await access(req,"void");
  const id=String(req.params.expenseId),version=integer(req.body?.revision,1,1000000,"REVISION"),
   reason=str(req.body?.reason,10,500,"VOID_REASON"),
   key=actionKey(req.body?.actionKey),digest=sha(JSON.stringify({id,reason}));
  let replayed=false;
  await sqlClient.begin(async tx=>{
   const current=await exp(tx,cid(req),id,true);
   const previous=await previousAction(tx,req,key,digest,id);
   if(previous){if(previous.action!=="voided")fail(409,"EXPENSE_ACTION_KEY_REUSED");
    replayed=true;return;}
   if(current.status!=="posted")fail(409,"EXPENSE_FINAL");
   if(current.revision!==version)fail(409,"STALE_EXPENSE_REVISION");
   const next=version+1;
   await tx`UPDATE clinic_expenses SET status='void',void_reason=${reason},
    revision=${next},updated_by=${req.actor!.id},updated_at=now() WHERE id=${id}`;
   await snapshot(tx,req,id,next,"voided",{
    date:String(current.expense_date).slice(0,10),category:current.category,
    description:current.description,amountAfn:current.amount_afn,
    paymentMethod:current.payment_method,reference:current.reference,
    attribution:current.attribution,receipt:null,removeReceipt:false
   },current.receipt_id,reason,key,digest);
  });
  const current=await exp(sqlClient,cid(req),id);
  privateResponse(res);res.json({expense:brief(current),replayed});
 }));
 router.get("/clinics/:clinicId/expenses/:expenseId/receipts/:receiptId",task(async(req,res)=>{
  await access(req);
  const id=String(req.params.expenseId),fileId=String(req.params.receiptId);
  // Never expose receipts across clinics or through unauthenticated public URLs.
  const [file]=await sqlClient`SELECT file_name,mime_type,byte_length,sha256_hex,document_bytes
   FROM clinic_expense_receipts WHERE id=${fileId}
    AND expense_id=${id} AND clinic_id=${cid(req)} LIMIT 1`;
  if(!file)fail(404,"RECEIPT_NOT_FOUND");
  const bytes=Buffer.from(file.document_bytes);
  if(bytes.length!==file.byte_length||sha(bytes)!==file.sha256_hex)
   fail(500,"RECEIPT_INTEGRITY_FAILED");
  privateResponse(res);res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Content-Type",file.mime_type);
  res.setHeader("Content-Disposition","attachment; filename="+JSON.stringify(file.file_name));
  res.send(bytes);
 }));
 router.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(err instanceof ExpenseFault||err instanceof AccessFault)
   return void res.status(err.status).json({code:err.code});
  const sqlState=(err as any)?.code;
  if(sqlState==="23505")return void res.status(409).json({code:"EXPENSE_CONFLICT"});
  if(sqlState==="23503"||sqlState==="23514")
   return void res.status(422).json({code:"EXPENSE_CONSTRAINT"});
  console.error("PH11 expense request failed",err instanceof Error?err.name:"unknown",
   "sqlState",sqlState||"none"); // No clinic identifiers, receipts, patient records or SQL arguments.
  res.status(500).json({code:"EXPENSE_UNAVAILABLE"});
 });
 return router;
}
