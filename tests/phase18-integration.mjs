import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {request,ok,signup,admin,owner,stranger,clinic,unrelated} from "./phase07-fixture.mjs";
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
 console.log("PH18_INTEGRATION_OK — ledger reconciliation, Kabul reporting, isolated support tickets and MFA privileges.");
}finally{await db.end({timeout:2})}
