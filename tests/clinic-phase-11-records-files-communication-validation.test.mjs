import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const clinical=read("packages/ui-web/src/phase07.tsx");
const api=read("apps/api/src/clinical-router.ts");
const bookingMail=read("apps/api/src/booking-notifications.ts");
const css=read("apps/clinic-web/app/clinic/clinic-records.css");
const layout=read("apps/clinic-web/app/clinic/layout.tsx");

test("Clinic Phase 11: authorized records stay tenant and patient scoped with real counts, filters and five-row paging",()=>{
 for(const marker of [
  'const base="/clinics/"+encodeURIComponent(space.clinicId)+"/patients/"+encodeURIComponent(patientId)',
  'useLoad(base+"/encounters")',
  'const encounters:Array<{id:string;reason:string;status:"draft"|"signed";',
  'e.reason+" "+e.author_name',
  'status==="all"||e.status===status',
  'const pages=Math.max(1,Math.ceil(filtered.length/5))',
  'filtered.slice((safePage-1)*5,safePage*5)',
  'aria-pressed={status===key}',
  'role="status" aria-live="polite"',
  'disabled={safePage<=1}',
  'disabled={safePage>=pages}',
  'recordsLimit:"Showing up to 100 latest authorized visits',
  'recordsLimit:"حداکثر ۱۰۰ معاینۀ مجاز اخیر',
  'recordsLimit:"تر ۱۰۰ وروستي مجاز ریکارډونه',
  'const canStart=space.role!=="assistant"||Boolean(appointmentId)',
  'if(busy||reason.trim().length<2)return',
  'new URLSearchParams(location.search).get("appointmentId")',
  'const [snapshot,setSnapshot]=useState<{path:string|null;data:any;error:string}>',
  'return {data:snapshot.path===path?snapshot.data:null',
  'credentials:"include",cache:"no-store",signal,'
 ])assert.ok(clinical.includes(marker),marker);
 for(const marker of [
  'api.use(authStaff)',
  'clinics.get("/patients/:patientId/encounters"',
  'await access(req,cid(req))',
  'AND e.clinic_id=${cid(req)} AND e.patient_id=${pid(req)}',
  'ORDER BY e.created_at DESC LIMIT 100',
  'noStore(res);res.json({patient:',
  'canSign:e.status==="draft"&&canSign(ctx,e)',
  'canAmend:e.status==="signed"&&canSign(ctx,e)'
 ])assert.ok(api.includes(marker),marker);
 assert.ok(!clinical.includes("localStorage.setItem("));
 assert.ok(!clinical.includes("sessionStorage.setItem("));
});

test("Clinic Phase 11: signing uses an explicit review and exact server revision, not a native confirm",()=>{
 for(const marker of [
  'const [review,setReview]=useState<"sign"|"amend"|null>(null)',
  'const [versionPage,setVersionPage]=useState(1)',
  'setReview("sign");setReviewed(false);setFailure("")',
  'setReview("amend");setReviewed(false);setFailure("")',
  'if(type==="sign"&&(!data.canSign||!note.reason.trim()',
  'if(type==="amend"&&(!data.canAmend||reason.trim().length<10))return',
  'review!==type||!reviewed',
  'const result=await call(base+"/encounters/"+encounterId,"PATCH",{...note,revision:rev})',
  '{revision:result.revision,confirmation:"SIGN"}',
  'setReview(null);setReviewed(false);setNotice',
  'if(draftSaved){setReview(null);setReviewed(false);refresh();}',
  'role="alertdialog" aria-modal="true"',
  'aria-labelledby="clinic-phase11-confirm-title"',
  'autoFocus className="clinic-phase11-close"',
  'if(event.key==="Escape"&&!busy)',
  'note.performedProcedures.map(p=>p.description).join("; ")',
  'review==="amend"&&<div><dt>{t("correction")}</dt><dd>{reason}</dd></div>',
  'checked={reviewed} disabled={busy}',
  'disabled={busy||!reviewed}',
  'onClick={()=>void action(review)}',
  'const visibleVersions=versions.slice((safeVersionPage-1)*5,safeVersionPage*5)',
  'recordVersionNote:"Up to 100 latest audit versions',
  'setReview(null);setReviewed(false);setVersionPage(1)',
  '<ClinicalCommunication space={space} appointmentId={e.appointmentId}/>'
 ])assert.ok(clinical.includes(marker),marker);
 assert.ok(!clinical.includes('if(type==="sign"&&!confirm(t("signConfirm")))return'));
 assert.ok(!clinical.includes('if(type==="amend"&&!confirm(t("amendConfirm")))return'));
 for(const marker of [
  'SIGN_CONFIRMATION_REQUIRED',
  'ONLY_CLINICIAN_MAY_SIGN',
  'SIGNED_NOTE_IMMUTABLE',
  'STALE_ENCOUNTER_REVISION',
  'AMENDMENT_REASON_REQUIRED',
  'if(e.status!=="signed")fail(409,"ENCOUNTER_NOT_SIGNED")',
  'VALUES(${randomUUID()},${cid(req)},${id},${rev+1}',
  'FROM clinic_encounter_versions v',
  'ORDER BY v.revision DESC LIMIT 100'
 ])assert.ok(api.includes(marker),marker);
});

test("Clinic Phase 11: private file library enforces real server results, safe filters, quarantine and honest bounds",()=>{
 for(const marker of [
  'useLoad(base+"/files?kind="+kind)',
  'const allFiles:Array<{id:string;title:string;kind:string;',
  'f.title+" "+f.file_name+" "+f.uploaded_by_name',
  'matches.slice((safePage-1)*5,safePage*5)',
  'const safePage=Math.min(page,pages)',
  'aria-pressed={kind===key}',
  'setKind(event.target.value);setPage(1)',
  'documentsLimit:"Up to 100 recent authorized files',
  'documentsLimit:"سرور حداکثر ۱۰۰ فایل',
  'documentsLimit:"سرور تر ۱۰۰ مجاز',
  'f.scan_status==="quarantined"',
  'disabled={f.scan_status==="quarantined"}',
  'if(file.scan_status==="quarantined"){setFailure("FILE_QUARANTINED");return;}',
  'encodeURIComponent(file.id)+"/content"',
  '<ClinicalCommunication space={space}/>'
 ])assert.ok(clinical.includes(marker),marker);
 for(const marker of [
  'clinics.get("/patients/:patientId/files"',
  'ORDER BY f.created_at DESC LIMIT 100',
  'f.encounter_id,f.scan_status',
  'if(!["all","xray","photo","consent","other"].includes(kind))',
  'AND f.patient_id=${pid(req)}',
  'if(file.scan_status==="quarantined")fail(423,"FILE_QUARANTINED")',
  'noStore(res)',
  'Content-Security-Policy","sandbox"',
  'X-Content-Type-Options","nosniff"',
  'res.setHeader("Content-Disposition"',
  'await audit(req.actor!.id,cid(req),"clinical.file.downloaded"'
 ])assert.ok(api.includes(marker),marker);
});

test("Clinic Phase 11: bounded upload survives partial failure, never retries completed files or crosses patients",()=>{
 for(const marker of [
  'const uploadAbort=useRef<AbortController|null>(null)',
  'const controller=new AbortController();uploadAbort.current=controller',
  'uploadAbort.current?.abort();viewAbort.current?.abort();',
  'setPreview(null);setSelected([]);setSearch("");setPage(1);',
  'setTitle("");setNotes("");setFailure("");setSuccess("");',
  'if(controller.signal.aborted)throw new Error("NETWORK_ERROR")',
  'contentBase64},controller.signal)',
  'completed++',
  'setSelected(selected.slice(completed))',
  'setSuccess(t("documentsPartial")+" "+completed+" / "+selected.length)',
  'if(fileInput.current)fileInput.current.value=""',
  'selected.length>8',
  'file.size===0||file.size>2097152',
  'file.size>2097152||file.size===0',
  'fileBase64(file)',
  'setProgress((i+1)+" / "+selected.length)',
  'const previewRef=useRef<string|null>(null)',
  'URL.revokeObjectURL(previewRef.current)',
  'viewAbort.current?.abort();',
  'if(controller.signal.aborted)return',
  'autoFocus className="btn btn-secondary" onClick={closePreview}',
  'if(event.key==="Escape")closePreview()',
  'role="dialog" aria-modal="true"'
 ])assert.ok(clinical.includes(marker),marker);
 for(const marker of [
  'FILE_TYPE_UNSUPPORTED',
  'FILE_SIGNATURE_MISMATCH',
  'FILE_TOO_LARGE',
  'PATIENT_INACTIVE',
  'ASSISTANT_REQUIRES_ENCOUNTER',
  'if(ctx.role==="assistant"&&e.status!=="draft")',
  'const valid=mime==="image/png"?',
  'if(!valid)fail(415,"FILE_SIGNATURE_MISMATCH")',
  'await audit(req.actor!.id,cid(req),"clinical.file.uploaded",id)'
 ])assert.ok(api.includes(marker),marker);
});

test("Clinic Phase 11: patient communication never claims or triggers clinical-data delivery",()=>{
 for(const marker of [
  'function ClinicalCommunication({space,appointmentId}',
  'const monitoring=["owner","manager"].includes(space.role)',
  'aria-label={t("communication")}',
  'communicationNoSend:"Viewing or uploading a medical record never emails',
  'communicationNoSend:"مشاهده یا بارگذاری سند طبی',
  'communicationNoSend:"طبي ریکارډ کتل',
  'communicationChannel:"Only opted-in, configured booking-status email',
  'communicationChannel:"فقط ایمیل وضعیت ملاقات',
  'communicationChannel:"یوازې د رضایت لرونکو',
  'communicationNotice:"Private files and signed notes',
  'communicationBooking:"Open appointment status"',
  'communicationSettings:"Booking delivery monitoring"',
  'appointmentId&&<a className="btn btn-secondary"',
  'monitoring&&<a className="btn btn-secondary"',
  '"/clinic/settings/notifications?clinic="+encodeURIComponent(space.clinicId)',
  '"/clinic/appointments/"+encodeURIComponent(appointmentId)',
  'role="note"'
 ])assert.ok(clinical.includes(marker),marker);
 for(const marker of [
  'Never sends names, clinical notes, prices or',
  'Missing SMTP or consent does not undo the database booking transaction.',
  'const opted=item.event_name',
  'if(!opted)',
  'if(!mailAvailable())return []',
  'No medical information is included in this message.'
 ])assert.ok(bookingMail.includes(marker),marker);
 assert.ok(!clinical.includes('fetch(API+"/v1/notifications/send"'));
 assert.ok(!clinical.includes('navigator.share('));
 assert.ok(!clinical.includes('mailto:'));
});

test("Clinic Phase 11: styles, translations, stable shell and mobile privacy isolation",()=>{
 assert.ok(layout.includes('import "./clinic-chart-treatment.css";\nimport "./clinic-records.css";'));
 for(const marker of [
  'recordsTitle:"Clinical record workspace"',
  'recordsTitle:"بخش سوابق کلینیکی"',
  'recordsTitle:"د کلینیکي ریکارډونو برخه"',
  'recordReviewWarning:"Signing locks the original clinical note.',
  'recordReviewWarning:"امضا سند اصلی را قفل',
  'recordReviewWarning:"لاسلیک اصل قفلوي',
  'documentsTitle:"Private clinical documents"',
  'documentsTitle:"اسناد خصوصی کلینیکی"',
  'documentsTitle:"شخصي کلینیکي اسناد"',
  'documentsPartial:"Some files were uploaded.',
  'documentsPartial:"بعضی فایل‌ها بارگذاری شدند',
  'documentsPartial:"ځینې فایلونه پورته شول',
  'clinic-phase11-documents',
  'clinic-phase11-note-workspace',
  'clinic-phase11-records'
 ])assert.ok(clinical.includes(marker),marker);
 for(const marker of [
  '.clinic-persistent-shell .clinic-phase11-records',
  '.clinic-persistent-shell .clinic-phase11-note-workspace',
  '.clinic-persistent-shell .clinic-phase11-documents',
  '.clinic-persistent-shell .clinic-phase11-records-toolbar',
  '.clinic-persistent-shell .clinic-phase11-records-stats',
  '.clinic-persistent-shell .clinic-phase11-confirm-dialog',
  '.clinic-persistent-shell .clinic-phase11-confirm-details',
  '.clinic-persistent-shell .clinic-phase11-file-card',
  '.clinic-persistent-shell .clinic-phase11-communication',
  '.clinic-persistent-shell .clinic-phase11-document-preview',
  '@media(max-width:1100px)','@media(max-width:760px)',
  '@media(max-width:580px)','@media(max-width:375px)',
  '@media(prefers-reduced-motion:reduce)',
  ':focus-visible','overscroll-behavior:contain','max-height:92dvh',
  'min-width:0','overflow-wrap:anywhere'
 ])assert.ok(css.includes(marker),marker);
 for(const forbidden of [':root{','svg path{','.odontogram{','transform:scaleX(-1)','Math.random('])
  assert.ok(!css.includes(forbidden),forbidden);
 for(const p of ["apps/clinic-web/app/layout.tsx","apps/admin-web/app/layout.tsx",
  "apps/patient-web/app/layout.tsx"])
  assert.ok(!read(p).includes("clinic-records.css"),p);
});
