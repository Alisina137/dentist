import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const booking=read("packages/ui-web/src/phase15.tsx");
const queue=read("packages/ui-web/src/phase06.tsx");
const api=read("apps/api/src/patient-booking-router.ts");
const css=read("apps/clinic-web/app/clinic/clinic-reception.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");

test("Clinic Phase 07: receptionist inbox uses real scoped API and no invented data",()=>{
 for(const marker of [
  'export function ClinicBookingRequestsPage()',
  '<Requests key={clinicId}',
  'const key=cid+":"+filter+":"+(identityOpen?"links":"bookings")',
  'const current=snapshot?.key===key?snapshot:null',
  'const controller=new AbortController()',
  'return()=>controller.abort()',
  '"/v1/booking/clinics/"+cid+"/requests?state="+filter',
  '"/v1/booking/clinics/"+cid+"/requests/"+r.id+"/decision","POST"',
  '{action,reason:action==="reject"?reasons[r.id]?.trim():undefined,revision:r.revision}',
  'setSnapshot(null);reload()',
  'if(e.message==="REQUEST_ALREADY_PROCESSED")',
  'const reload=useCallback(()=>setRevision(x=>x+1),[])',
  'window.setInterval(visible,45000)',
  'if(document.visibilityState==="visible")reload()',
  'limitReached:requests.value.limitReached===true||requests.value.requests.length===100',
  'current?.limitReached'
 ])assert.ok(booking.includes(marker),marker);
 for(const forbidden of ["Math.random(","fakeRequest","localStorage.setItem(","sessionStorage.setItem("]){
  assert.ok(!booking.includes(forbidden),"No demo or private cached data: "+forbidden);
 }
});

test("Clinic Phase 07: server enforces clinician scope before 100-item pagination limit",()=>{
 const start=api.indexOf('staff.get("/requests"');
 const end=api.indexOf('staff.post("/requests/:bookingId/decision"',start);
 assert.ok(start>=0&&end>start);
 const handler=api.slice(start,end);
 const predicate='AND (${ctx.role}<>\'dentist\' OR a.provider_membership_id=${ctx.membership.id})';
 assert.ok(handler.includes(predicate),"SQL must constrain provider before LIMIT");
 assert.ok(handler.indexOf(predicate)<handler.indexOf('LIMIT 100'),"Prevent dentist request starvation");
 for(const marker of [
  'WHERE b.clinic_id=${clinic}',
  'ctx.role!=="dentist"||',
  'filter:state,limitReached:rows.length===100'
 ])assert.ok(handler.includes(marker),marker);
 const decision=api.slice(end,api.indexOf('staff.get("/record-links"',end));
 for(const marker of [
  'await clinicScheduler(req)',
  'scheduleLock(tx,clinic)',
  'if(row.status!=="requested"||row.revision!==req.body.revision)',
  'listedBooking(clinic,row.service_id,row.provider_membership_id,new Date(row.start_at))',
  'slotFor(clinic,row.service_id,row.provider_membership_id,new Date(row.start_at))',
  'RETURNING *','await enqueue('
 ])assert.ok(decision.includes(marker),marker);
});

test("Clinic Phase 07: five-row inbox search/sort/pagination and true pending/processed tabs",()=>{
 for(const marker of [
  'const RECEPTION_PAGE_SIZE=5',
  'useState<"newest"|"appointment">("newest")',
  'const [page,setPage]=useState(1)',
  'const [search,setSearch]=useState("")',
  'row.patientName+" "+row.serviceName',
  'Date.parse(a.startAt)-Date.parse(b.startAt)',
  'filtered.slice((safePage-1)*RECEPTION_PAGE_SIZE,safePage*RECEPTION_PAGE_SIZE)',
  'const pages=Math.max(1,Math.ceil(filtered.length/RECEPTION_PAGE_SIZE))',
  'aria-pressed={filter===s}',
  'aria-live="polite"',
  'onClick={()=>setPage(x=>Math.max(1,x-1))}',
  'onClick={()=>setPage(x=>Math.min(pages,x+1))}',
  'function selectFilter(value:string)',
  'setFilter(value);setPage(1)',
  'onClick={()=>{setSearch("");setPage(1);}}',
  'role="status"'
 ])assert.ok(booking.includes(marker),marker);
});

test("Clinic Phase 07: irreversible decisions need accessible review, 10-character rejection and stale recovery",()=>{
 for(const marker of [
  'type RequestDecision={row:StaffRequestRow;action:"accept"|"reject"}',
  'role="alertdialog" aria-modal="true"',
  'aria-labelledby="clinic-reception-modal-title"',
  'confirm.action==="reject"&&<label',
  'minLength={10} maxLength={300} required autoFocus',
  'reasons[confirm.row.id]||""',
  'reasons[confirm.row.id]||"").trim().length<10',
  'disabled={busy}',
  'key==="Escape"&&!busy',
  'if(event.currentTarget===event.target&&!busy)setConfirm(null)',
  'clinicErrorText(loadError,lang)',
  'clinicErrorText(actionError,lang)',
  'actionError==="REQUEST_ALREADY_PROCESSED"?t("deskStale")',
  'setConfirm(null);setActionError(e.message);reload()',
  'setSuccess(t(action==="accept"?"deskApproved":"deskRejected"))',
  'aria-expanded={identityOpen}',
  'identityOpen&&canReviewLinks?',
  'canReviewLinks=role!=="dentist"||clinicianEnabled'
 ])assert.ok(booking.includes(marker),marker);
 assert.ok(!booking.includes('window.confirm('));
 assert.ok(!booking.includes('window.alert('));
});

test("Clinic Phase 07: private identity verification remains separate and retains consent gates",()=>{
 for(const marker of [
  '[identityOpen,setIdentityOpen]=useState(false)',
  'identityOpen&&!loading&&!loadError',
  'links.filter(l=>l.state==="pending")',
  'verified[l.id]===true',
  'patientId:patientIds[l.id]',
  'method:methods[l.id]||"in_person_document"',
  'reasons[l.id]||"").trim().length<10',
  'links.filter(l=>l.state==="approved").map(l=><ApprovedRecordReleases',
  'enabled={role==="dentist"||clinicianEnabled}'
 ])assert.ok(booking.includes(marker),marker);
 for(const token of [
  'if((ownerManagerOnly&&!["owner","manager"].includes(space.role))',
  'activeKey==="bookingRequests"&&!["owner","manager","receptionist","dentist"].includes(space.role)'
 ])assert.ok(booking.includes(token),token);
});

test("Clinic Phase 07: reception queue has working search, stage filters and existing authorized cancellations",()=>{
 for(const token of [
  'const [queueSearch,setQueueSearch]=useState("")',
  'const [queueStage,setQueueStage]=useState<',
  'patientDisplay(a)+" "+(a.patient?.patientNumber||"")+" "+a.serviceName',
  'const visibleColumns=queueStage==="all"?columns:columns.filter(c=>c.status===queueStage)',
  'visibleColumns.map(column=>',
  'aria-pressed={queueStage===column.status}',
  'type="search" value={queueSearch}',
  'onClick={()=>setQueueSearch("")}',
  'available.includes("cancelled")',
  'onClick={()=>setAction("cancelled")}',
  'onClick={()=>setAction("no_show")}',
  '<ActionDialog space={space} appointment={a} action={action}',
  'status:action,reason:needsReason?reason.trim():undefined,',
  'revision:appointment.revision,idempotencyKey:key',
  'href={"/clinic/appointments/requests?clinic="+encodeURIComponent(space.clinicId)}',
  'href={appHref(space.clinicId,"new")+"&date="+day}'
 ])assert.ok(queue.includes(token),token);
 assert.ok(api.includes("REQUEST_ALREADY_PROCESSED"));
});

test("Clinic Phase 07: translations, accessible responsive design are clinic-only",()=>{
 for(const marker of [
  'deskTitle:"Reception inbox"',
  'deskTitle:"صندوق درخواست‌های پذیرش"',
  'deskTitle:"د منلو غوښتنې"',
  'deskStale:"This request changed elsewhere.',
  'deskStale:"این درخواست در جای دیگر تغییر',
  'deskStale:"دا غوښتنه بل ځای بدله',
  'queueSearch:"Find in queue"',
  'queueSearch:"جستجو در صف"',
  'queueSearch:"په کتار کې پلټنه"',
  'overline="DandanLink · Clinic workspace"',
  'role="status"','aria-expanded={identityOpen}',
  'aria-live="polite"','role="alert"'
 ])assert.ok(booking.includes(marker)||queue.includes(marker),marker);
 assert.ok(layout.includes('import "./clinic-scheduling.css";\nimport "./clinic-reception.css";'));
 assert.ok(css.startsWith("/*"));
 for(const token of [
  '.clinic-persistent-shell .clinic-reception-hero',
  '.clinic-persistent-shell .clinic-reception-inbox',
  '.clinic-persistent-shell .clinic-reception-requests',
  '.clinic-persistent-shell .clinic-reception-modal',
  '.clinic-persistent-shell .clinic-reception-queue-tools',
  '.clinic-persistent-shell .phase06-queue-board.clinic-reception-one-column',
  '@media(max-width:950px)','@media(max-width:680px)',
  '@media(max-width:375px)','@media(prefers-reduced-motion:reduce)',
  ':focus-visible','max-height:92dvh','overscroll-behavior:contain'
 ])assert.ok(css.includes(token),token);
 for(const path of ["apps/clinic-web/app/layout.tsx","apps/admin-web/app/layout.tsx",
  "apps/patient-web/app/layout.tsx"])
  assert.ok(!read(path).includes("clinic-reception.css"),path);
 for(const bad of ['svg path{','.odontogram{',':root{','Math.random(','transform:scaleX(-1)'])
  assert.ok(!css.includes(bad),bad);
});
