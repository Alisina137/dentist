import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {API,request,ok,signup,admin,owner,stranger,clinic,unrelated} from "./phase07-fixture.mjs";
await import("./phase17-integration.mjs");
const require=createRequire(new URL("../packages/db/package.json",import.meta.url));
const postgres=require("postgres");
const db=postgres(process.env.DATABASE_URL,{max:1});
const root="/v1/support",reports="/v1/insights";
try{
 const faq=ok(await request(root+"/public/help"),[200],"public localized FAQs");
 assert.ok(faq.faq?.length>=3&&faq.categories?.length>=4);
 assert.ok(faq.categories[0].label_fa&&faq.categories[0].label_ps);
 ok(await request(root+"/tickets/mine"),[401],"anonymous has no tickets");
 ok(await request(reports+"/platform/overview"),[401],"anonymous cannot see platform data");
// Phase B: live metrics, role separation, Kabul date boundaries, trends and privacy.
 ok(await request(reports+"/platform/dashboard"),[401],"anonymous dashboard denied");
 ok(await request(reports+"/platform/dashboard","GET",undefined,owner.session),[403],
  "clinic owner must not access platform dashboard or payment data");
 ok(await request(reports+"/platform/dashboard?days=14","GET",undefined,admin.session),[422],
  "unapproved chart range is not accepted");
 ok(await request(reports+"/platform/dashboard?days=7&days=90","GET",undefined,admin.session),[422],
  "multi-value range cannot bypass strict validation");
 const liveResponse=await request(reports+"/platform/dashboard?days=30","GET",undefined,admin.session);
 const live=ok(liveResponse,[200],"MFA admin receives true operational dashboard");
 assert.match(liveResponse.headers.get("cache-control")||"",/no-store/);
 assert.equal(live.period.timezone,"Asia/Kabul");
 assert.equal(live.period.days,30);
 assert.equal(live.trend.length,30);
 assert.equal(live.trend[0].day,live.period.from);
 assert.equal(live.trend.at(-1).day,live.period.to);
 const [clinicCount]=await db`SELECT count(*)::int AS count FROM clinics`;
 assert.equal(live.clinics.total,clinicCount.count,"dashboard clinic total from database");
 assert.equal(live.trend.reduce((acc,x)=>acc+x.registrations,0),live.clinics.registered,
  "daily registrations reconcile with period KPI");
 assert.equal(live.trend.reduce((acc,x)=>acc+x.appointments,0),live.appointments.created,
  "daily booked appointments reconcile with period KPI");
 assert.equal(live.trend.reduce((acc,x)=>acc+x.receiptsAfn,0),live.subscriptions.receiptsAfn,
  "daily platform invoice receipts reconcile with finance KPI");
 assert.ok(Number.isInteger(live.dentists.pending));
 assert.ok(Number.isInteger(live.listings.pending));
 assert.ok(Number.isInteger(live.reviews.pending));
 assert.ok(Number.isInteger(live.support.overdue));
 assert.ok(Number.isInteger(live.support.urgent));
 assert.ok(live.support.urgent>=live.support.overdue);
 assert.ok(typeof live.operations.pilotReleaseEnabled==="boolean");
 const serialized=JSON.stringify(live);
 for(const disallowed of ['"actor_id"','"requester_id"','"patient_id"',
  '"clinic_id"','"support_messages"','"clinical_note"','"email"'])
  assert.ok(!serialized.includes(disallowed),"dashboard leaks a private identifier: "+disallowed);
 assert.ok(live.activity.every(item=>Object.keys(item).every(key=>
  ["action","outcome","subjectType","at"].includes(key))));
 for(const length of [7,90]){
  const period=ok(await request(reports+"/platform/dashboard?days="+length,
   "GET",undefined,admin.session),[200],"dashboard "+length+" day period");
  assert.equal(period.trend.length,length);
 }

 ok(await request(reports+"/platform/security","GET",undefined,owner.session),[403],"clinic owner cannot see security");
 ok(await request(reports+"/platform/overview","GET",undefined,owner.session),[403],"clinic owner cannot see platform data");
 ok(await request(reports+"/clinics/"+clinic.id+"/report","GET",undefined,stranger.session),[404],
  "unrelated user cannot infer clinic financial data");
 ok(await request(reports+"/clinics/"+clinic.id+"/report","GET",undefined,admin.session),[403],
  "platform admin cannot query private clinic patient finance");
 const from=new Date(Date.now()-31*86400000).toISOString().slice(0,10);
 const to=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
 const url=reports+"/clinics/"+clinic.id+"/report?from="+from+"&to="+to;
 const reportResponse=await request(url,"GET",undefined,owner.session);
 const report=ok(reportResponse,[200],"authorized clinic report");
 assert.match(reportResponse.headers.get("cache-control")||"",/no-store/);
 assert.equal(report.timezone,"Asia/Kabul");
 assert.equal(report.currency,"AFN");
 assert.equal(report.appointments.total,Object.values(report.appointments.byStatus).reduce((a,b)=>a+b,0));
 assert.ok(Number.isInteger(report.patients.newRegistered));
 assert.ok(!JSON.stringify(report).includes("patientName"));
 const ledger=await db`SELECT coalesce(sum(CASE WHEN e.kind='reversal' THEN -e.amount_afn ELSE e.amount_afn END),0)::bigint::text AS amount
  FROM clinic_payment_entries e JOIN clinic_invoices i ON i.id=e.invoice_id AND i.clinic_id=e.clinic_id
  WHERE e.clinic_id=${clinic.id} AND i.status='issued' AND e.kind<>'credit'
   AND e.occurred_at >= (${from}::date::timestamp AT TIME ZONE 'Asia/Kabul')
   AND e.occurred_at < ((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Kabul')`;
 assert.equal(report.revenue.netReceiptsAfn,Number(ledger[0].amount),
  "reported net manual receipts reconcile exactly to PH10 ledger without credits");
 ok(await request(reports+"/clinics/"+clinic.id+"/report?from=2026-02-30&to=2026-03-01",
  "GET",undefined,owner.session),[422],"impossible date rejected");
 ok(await request(reports+"/clinics/"+clinic.id+"/report?from=2024-01-01&to=2026-01-01",
  "GET",undefined,owner.session),[422],"excessive report period rejected");

 const requester=await signup("ph18-requester");
 const outsider=await signup("ph18-outsider");
 // Patient Phase D: Expo Go bearer writes have no Origin but retain strict
 // ownership, browser CSRF protection and denial of privileged endpoints.
 const login=await fetch(API+"/api/auth/sign-in/email",{
  method:"POST",headers:{origin:"http://localhost:3002","content-type":"application/json"},
  body:JSON.stringify({email:requester.email,password:"Dandan-PH07-Booked#2026"})});
 assert.equal(login.status,200,"native support bearer sign-in");
 const nativeBearer=login.headers.get("set-auth-token");
 assert.ok(nativeBearer&&nativeBearer.length>12);
 async function nativeSupport(path,method="POST",body,customHeaders={}){
  const response=await fetch(API+root+path,{method,headers:{
   authorization:"Bearer "+nativeBearer,"content-type":"application/json",...customHeaders
  },body:JSON.stringify(body)});
  return {status:response.status,data:await response.json().catch(()=>({})),headers:response.headers};
 }
 const nativeTicket=ok(await nativeSupport("/tickets","POST",{
  category:"booking",title:"Mobile ticket for a booking",
  message:"My booking request is pending and I need a status explanation."
 }),[201],"native bearer support ticket created without an Origin");
 ok(await nativeSupport("/tickets/"+nativeTicket.id+"/messages","POST",{
  message:"I can provide further nonmedical details about the request."
 }),[201],"native bearer support ticket follow-up");
 ok(await nativeSupport("/admin/tickets/"+nativeTicket.id+"/status","POST",{
  status:"resolved"
 }),[403],"native exception never grants administrative support mutations");
 ok(await nativeSupport("/tickets","POST",{
  category:"booking",title:"Invalid browser origin attempt",
  message:"This request should never pass browser Origin restrictions."
 },{origin:"https://untrusted.example.test"}),[403],
  "untrusted browser Origin remains denied even when bearer is valid");
 const unauthNative=await fetch(API+root+"/tickets",{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({category:"booking",title:"Missing bearer",
   message:"Anonymous support request should be rejected."})});
 assert.equal(unauthNative.status,403,"origin-less ticket write without bearer blocked");
 const nativeDetail=ok(await nativeSupport("/tickets/"+nativeTicket.id,"GET",undefined),
  [200],"native bearer can read own ticket");
 assert.equal(nativeDetail.messages.length,2);
 ok(await request(root+"/tickets/"+nativeTicket.id,"GET",undefined,outsider.session),
  [403],"native-created ticket remains owner private");
 ok(await request(root+"/tickets","POST",{
  category:"booking",title:"Clinical diagnosis in request",message:"I was diagnosed with something and need help."
 },requester.session),[422],"PHI in support rejected");
 ok(await request(root+"/tickets","POST",{
  category:"booking",title:"Question about reservation",message:"Please contact me at someone@example.com about a booking."
 },requester.session),[422],"contact details rejected");
 const ticket=ok(await request(root+"/tickets","POST",{
  category:"booking",title:"Booking request did not complete",
  message:"My booking status is still pending; please advise how to confirm the request."
 },requester.session),[201],"ticket created");
 assert.equal(ticket.status,"open");
 assert.ok(ticket.reference.startsWith("DL-"));
 const list=ok(await request(root+"/tickets/mine","GET",undefined,requester.session),
  [200],"requester can see own tickets");
 assert.ok(list.tickets.find(x=>x.id===ticket.id));
 assert.ok(!ok(await request(root+"/tickets/mine","GET",undefined,outsider.session),
  [200],"outsider list isolated").tickets.find(x=>x.id===ticket.id));
 ok(await request(root+"/tickets/"+ticket.id,"GET",undefined,outsider.session),
  [403],"other requester ticket forbidden");
 ok(await request(root+"/tickets/"+ticket.id+"/messages","POST",{
  message:"Please provide updates about the booking request."},outsider.session),
  [403],"other requester reply forbidden");
 ok(await request(root+"/admin/tickets","GET",undefined,requester.session),[403],
  "requester cannot access support console");
 ok(await request(root+"/admin/settings","GET",undefined,requester.session),[403],
  "requester cannot edit support settings");
 const adminQueue=ok(await request(root+"/admin/tickets?status=open","GET",undefined,admin.session),
  [200],"MFA admin support queue");
 assert.ok(adminQueue.tickets.find(x=>x.id===ticket.id));
 const identity=ok(await request(root+"/identity","GET",undefined,admin.session),
  [200],"MFA admin sees own safe support identity");
 assert.ok(identity.id);
 ok(await request(root+"/admin/tickets/"+ticket.id+"/assign","POST",{
  agentId:identity.id
 },admin.session),[200],"MFA admin can self-assign the case");
 const assigned=ok(await request(root+"/tickets/"+ticket.id,"GET",undefined,admin.session),
  [200],"assigned ticket details returned to authorized staff");
 assert.equal(assigned.ticket.assignee_id,identity.id);
 const ownList=ok(await request(root+"/admin/tickets?status=open&assigned=mine",
  "GET",undefined,admin.session),[200],"assigned queue filter");
 assert.ok(ownList.tickets.find(x=>x.id===ticket.id));
 ok(await request(root+"/admin/tickets/"+ticket.id+"/notes","POST",{
  message:"Patient requests an update. Use administrative booking status only."
 },admin.session),[201],"internal support notes stored privately");
 const internal=ok(await request(root+"/admin/tickets/"+ticket.id+"/notes",
  "GET",undefined,admin.session),[200],"internal notes visible to admin");
 assert.equal(internal.notes.length,1);
 ok(await request(root+"/admin/tickets/"+ticket.id+"/notes","GET",undefined,requester.session),
  [403],"requester cannot read support-only notes");
 const agentList=ok(await request(root+"/admin/agents","GET",undefined,admin.session),
  [200],"assignee dropdown data");
 assert.ok(agentList.agents.some(x=>x.id===identity.id));
 ok(await request(root+"/admin/tickets/"+ticket.id+"/escalate","POST",{},admin.session),
  [200],"urgent support ticket escalation");
 ok(await request(root+"/admin/tickets/"+ticket.id+"/escalate","POST",{},admin.session),
  [409],"duplicate escalation blocked");
 const escalated=ok(await request(root+"/admin/tickets?status=open&category=booking&assigned=mine&ageDays=0",
  "GET",undefined,admin.session),[200],"filtered queue shows urgent ticket");
 assert.equal(escalated.tickets.find(x=>x.id===ticket.id).priority,"high");
 ok(await request(root+"/admin/tickets?ageDays=1000","GET",undefined,admin.session),
  [422],"invalid support age filter rejected");
 const initial=ok(await request(root+"/tickets/"+ticket.id,"GET",undefined,admin.session),
  [200],"admin redacted ticket detail");
 assert.equal(initial.messages.length,1);
 assert.ok(!("requester_id" in initial.ticket));
 ok(await request(root+"/tickets/"+ticket.id+"/messages","POST",{
  message:"The booking request is pending confirmation by the clinic. You can check Appointments."
 },admin.session),[201],"admin support reply");
 const conversation=ok(await request(root+"/tickets/"+ticket.id,"GET",undefined,requester.session),
  [200],"requester reads response").messages;
 assert.equal(conversation.length,2);
 assert.equal(conversation[1].author_role,"support");
 ok(await request(root+"/admin/tickets/"+ticket.id+"/status","POST",{
  status:"resolved"
 },admin.session),[200],"resolve support request");
 ok(await request(root+"/tickets/"+ticket.id+"/messages","POST",{
  message:"I need to add information."},requester.session),[409],
  "resolved request is not writable until reopened");

 const agent=await signup("ph18-support-agent");
 ok(await request(root+"/admin/agents","POST",{email:agent.email},admin.session),
  [201],"admin grant nonclinical support privileges");
 ok(await request(root+"/admin/tickets","GET",undefined,agent.session),[403],
  "support must enroll verified MFA");
 ok(await request("/v1/team/context","GET",undefined,agent.session),[403],
  "support agent cannot enter clinic staff workspace");
 ok(await request(reports+"/clinics/"+clinic.id+"/report","GET",undefined,agent.session),[403],
  "support agent cannot read private clinic reports");
 ok(await request(root+"/admin/settings","GET",undefined,agent.session),[403],
  "support agent cannot administrate settings");
 const agentId=await db`SELECT id FROM auth_users WHERE email=${agent.email}`;
 ok(await request(root+"/admin/agents/"+agentId[0].id+"/revoke","POST",{},admin.session),[200],
  "admin revoke support role");
 const overview=ok(await request(reports+"/platform/overview","GET",undefined,admin.session),
  [200],"suppressed platform analytics");
 assert.equal(overview.suppression,"Counts from 1 to 4 are suppressed.");
 assert.equal(overview.platformReceipts.totalAfn>=0,true);
 ok(await request(reports+"/platform/security","GET",undefined,admin.session),
  [200],"admin audit group summary");

 // Phase D: real finance and support management with MFA gates and auditable metadata.
 const finance="/v1/admin/finance";
 ok(await request(finance+"/summary"),[401],"anonymous finance summary denied");
 ok(await request(finance+"/summary","GET",undefined,owner.session),[403],
  "clinic owner denied global finance");
 ok(await request(finance+"/invoices","GET",undefined,owner.session),[403],
  "non-platform admin cannot enumerate manual payment references");
 const financialResponse=await request(finance+"/summary","GET",undefined,admin.session);
 const financial=ok(financialResponse,[200],"MFA verified platform finance summary");
 assert.match(financialResponse.headers.get("cache-control")||"",/no-store/);
 assert.equal(typeof financial.invoices.awaiting,"number");
 assert.equal(typeof financial.subscriptions.active,"number");
 assert.ok(financial.invoices.last30Afn>=0);
 const [paidTotal]=await db`SELECT coalesce(sum(amount_afn),0)::bigint::text AS receipts
  FROM platform_subscription_invoices WHERE status='paid'`;
 assert.equal(financial.invoices.lifetimeAfn,Number(paidTotal.receipts),
  "finance totals reflect ONLY confirmed platform subscriptions");
 for(const endpoint of ["invoices","subscriptions"]){
  for(const invalid of ["page=0","page=-2","page=1.5","sort=amount","status=malicious"]){
   ok(await request(finance+"/"+endpoint+"?"+invalid,"GET",undefined,admin.session),
    [422],"strict finance validation "+endpoint+"/"+invalid);
  }
  const newest=ok(await request(finance+"/"+endpoint+"?page=1&sort=newest",
    "GET",undefined,admin.session),[200],"finance page "+endpoint);
  const oldest=ok(await request(finance+"/"+endpoint+"?page=1&sort=oldest",
    "GET",undefined,admin.session),[200],"finance reverse sort "+endpoint);
  assert.equal(newest.total,oldest.total);
  assert.equal(newest.pageSize,10);
  assert.ok(newest[endpoint].length<=10);
  const missing=ok(await request(finance+"/"+endpoint+"?q=unique-never-matches-143992",
   "GET",undefined,admin.session),[200],"finance search "+endpoint);
  assert.equal(missing.total,0);
  const empty=ok(await request(finance+"/"+endpoint+"?page=99999",
   "GET",undefined,admin.session),[200],"empty finance page");
  assert.equal(empty[endpoint].length,0);
 }
 const [payment]=await db`SELECT id FROM platform_subscription_invoices
  WHERE evidence_reference='bank-transfer-12345' ORDER BY created_at DESC LIMIT 1`;
 assert.ok(payment?.id,"PH02 synthetic verified invoice exists");
 const auditResponse=await request(finance+"/invoices/"+payment.id+"/history",
   "GET",undefined,admin.session);
 const audit=ok(auditResponse,[200],"MFA administrator sees only finance decision metadata");
 assert.match(auditResponse.headers.get("cache-control")||"",/no-store/);
 assert.ok(audit.events.some(x=>x.action==="subscription.invoice.confirm"));
 assert.ok(audit.events.every(row=>Object.keys(row).every(k=>["action","outcome","at"].includes(k))));
 ok(await request(finance+"/invoices/"+payment.id+"/history","GET",undefined,owner.session),
  [403],"clinic owner denied payment decision audit");

 const summaryResponse=await request(root+"/admin/desk-summary","GET",undefined,admin.session);
 const summary=ok(summaryResponse,[200],"operational support SLA targets");
 assert.match(summaryResponse.headers.get("cache-control")||"",/no-store/);
 assert.equal(summary.targets.initialResponseHours,24);
 assert.equal(summary.targets.triageHours,48);
 for(const metric of ["open","inProgress","waiting","unassigned","highPriority",
  "triageOverdue","firstReplyOverdue","firstReplyDueSoon","recentResolved"]){
  assert.ok(Number.isInteger(summary[metric])&&summary[metric]>=0,metric);
 }
 ok(await request(root+"/admin/desk-summary","GET",undefined,requester.session),
  [403],"ordinary requester denied platform SLA overview");
 ok(await request(root+"/admin/tickets/"+ticket.id+"/activity","GET",undefined,requester.session),
  [403],"requester cannot read internal case activity");
 const eventResult=ok(await request(root+"/admin/tickets/"+ticket.id+"/activity",
  "GET",undefined,admin.session),[200],"admin support case activity");
 for(const action of ["opened","assign","escalate","reply","status"]){
  assert.ok(eventResult.events.some(x=>x.action===action),"missing support timeline "+action);
 }
 assert.ok(eventResult.events.every(x=>Object.keys(x).every(k=>
  ["action","at","from","to"].includes(k))));
 const assignment=eventResult.events.find(x=>x.action==="assign");
 assert.equal(assignment?.to,"assigned","event never exposes support agent ID");
 for(const value of ["page=0","page=-1","sort=unknown","priority=invalid",
  "urgency=invalid","ageDays=99"]){
  ok(await request(root+"/admin/tickets?"+value,"GET",undefined,admin.session),
   [422],"support filter rejects "+value);
 }
 // A deliberately aged test-only support request verifies the 24h first-response
 // and 48h triage monitors (it has a requester message but NO staff reply).
 const aged=ok(await request(root+"/tickets","POST",{
  category:"account",title:"Synthetic account login issue awaiting triage",
  message:"A test-only account access request is awaiting a first staff response."
 },requester.session),[201],"synthetic support SLA fixture");
 await db`UPDATE support_tickets SET created_at=now()-interval '51 hours',
  updated_at=now()-interval '51 hours' WHERE id=${aged.id}`;
 const overdue=ok(await request(root+"/admin/desk-summary","GET",undefined,admin.session),
  [200],"aged case counted in support metrics");
 assert.ok(overdue.firstReplyOverdue>=1&&overdue.triageOverdue>=1);
 const triage=ok(await request(root+"/admin/tickets?status=all&urgency=triage&q="+
  encodeURIComponent("Synthetic account login issue"),"GET",undefined,admin.session),
  [200],"triage threshold and indexed search");
 assert.ok(triage.tickets.some(x=>x.id===aged.id));
 assert.ok(triage.tickets.every(x=>x.overdue_for_triage));
 const firstReply=ok(await request(root+"/admin/tickets?status=all&urgency=response&q="+
  encodeURIComponent(aged.reference),"GET",undefined,admin.session),
  [200],"first-response overdue filter");
 assert.equal(firstReply.total,1);
 assert.equal(firstReply.tickets[0].first_reply_overdue,true);
 for(const sort of ["priority","newest","oldest"]){
  const result=ok(await request(root+"/admin/tickets?status=all&sort="+sort+
   "&q="+encodeURIComponent(aged.reference),"GET",undefined,admin.session),
    [200],"ticket sorting "+sort);
  assert.equal(result.total,1);assert.equal(result.pageSize,15);
 }
 const far=ok(await request(root+"/admin/tickets?status=all&page=99999",
  "GET",undefined,admin.session),[200],"last empty ticket page");
 assert.equal(far.tickets.length,0);
 console.log("ADMIN_PHASE_D_OK — private finance totals, 10-row paging, invoice audit and 24h/48h support targets");

 console.log("PH18_INTEGRATION_OK — ledger reconciliation, Kabul reporting, isolated support tickets and MFA privileges.");
}finally{await db.end({timeout:2})}
