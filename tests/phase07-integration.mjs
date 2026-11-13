import assert from "node:assert/strict";
import {API,origin,key,request,ok,fixture,doBooking,
 dentist,dentist2,reception,assistant,clinic,unrelated,service,chair,p1,p2,date,base} from "./phase07-fixture.mjs";
const cb="/v1/clinical/clinics/"+clinic.id;
const first=cb+"/patients/"+p1.id;
const second=cb+"/patients/"+p2.id;
const note={reason:"Clinical evaluation request",findings:"Observed symptom on examination",
 assessment:"Dentist assessment recorded",historySource:"Patient",
 historyDate:date,followUp:"Review appointment",performedProcedures:[]};
ok(await request(first+"/encounters","GET"),[401],"unauthenticated denied");
ok(await request(first+"/encounters","GET",undefined,reception.session),[403],"reception denied");
ok(await request(first+"/files","GET",undefined,reception.session),[403],"files denied");
ok(await request("/v1/clinical/clinics/"+unrelated.id+"/patients/"+p1.id+"/encounters",
 "GET",undefined,dentist.session),[404],"cross clinic denied");
const created=ok(await request(first+"/encounters","POST",{reason:note.reason},dentist.session),
 [201],"create unscheduled draft");
const path=first+"/encounters/"+created.id;
ok(await request(path,"GET",undefined,dentist2.session),[404],"unassigned dentist denied");
const draft=ok(await request(path,"GET",undefined,dentist.session),[200],"own draft");
assert.equal(draft.encounter.status,"draft");
ok(await request(path,"PATCH",{...note,revision:51},dentist.session),[409],"stale patch");
ok(await request(path,"PATCH",{...note,revision:1},dentist.session),[200],"save draft");
ok(await request(path+"/sign","POST",{revision:2,confirmation:"SIGN"},assistant.session),
 [403,404],"assistant cannot sign");
ok(await request(path+"/sign","POST",{revision:2,confirmation:"NO"},dentist.session),
 [422],"confirmation required");
const signed=ok(await request(path+"/sign","POST",{revision:2,confirmation:"SIGN"},
 dentist.session),[200],"sign draft");
assert.equal(signed.status,"signed");
ok(await request(path,"PATCH",{...note,revision:3},dentist.session),[409],"signed immutable");
ok(await request(path+"/amend","POST",{...note,revision:3,
 correctionReason:"short"},dentist.session),[422],"reason required");
const amendment=ok(await request(path+"/amend","POST",{...note,
 reason:"Corrected presenting complaint",revision:3,
 correctionReason:"Correction after clinician follow-up review"},dentist.session),
 [200],"append amended note");
assert.equal(amendment.revision,4);
const snapshot=ok(await request(path,"GET",undefined,dentist.session),[200],"version history");
assert.deepEqual(snapshot.versions.map(v=>v.action),["amended","signed","draft_saved","created"]);
assert.equal(snapshot.versions[1].note.reason,note.reason);
assert.equal(snapshot.encounter.note.reason,"Corrected presenting complaint");
const pdf=Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
const file={title:"Test clinical attachment",fileName:"test.pdf",kind:"other",
 mime:"application/pdf",contentBase64:pdf.toString("base64"),encounterId:created.id};
ok(await request(first+"/files","POST",{...file,mime:"image/png"},dentist.session),
 [415],"signature does not match MIME");
ok(await request(first+"/files","POST",{...file,contentBase64:Buffer.from("garbage").toString("base64")},
 dentist.session),[415],"non-PDF rejected");
ok(await request(first+"/files","POST",file,reception.session),[403],"reception upload denied");
const uploaded=ok(await request(first+"/files","POST",file,dentist.session),[201],"private upload");
const listing=ok(await request(first+"/files","GET",undefined,dentist.session),[200],"private file list");
assert.ok(listing.files.some(f=>f.id===uploaded.id));
const invisible=ok(await request(first+"/files","GET",undefined,dentist2.session),[200],
 "scope filtered list");
assert.ok(!invisible.files.some(f=>f.id===uploaded.id));
const response=await fetch(API+first+"/files/"+uploaded.id+"/content",
 {headers:{origin,cookie:dentist.session}});
assert.equal(response.status,200);
assert.equal(response.headers.get("cache-control"),"private, no-store");
assert.deepEqual(Buffer.from(await response.arrayBuffer()),pdf);
ok(await request(first+"/files/"+uploaded.id+"/content","GET",undefined,dentist2.session),
 [404],"other dentist file denied");
const booked=ok(await doBooking(clinic.id,reception,p2,service,
 {membershipId:(await request("/v1/appointments/clinics/"+clinic.id+"/catalog",
 "GET",undefined,reception.session)).data.providers[0].membershipId},chair,date,"09:00"),
 [201],"appointment for assistant draft").appointment;
ok(await request(second+"/encounters","POST",{reason:"No appointment"},assistant.session),
 [403],"assistant cannot create unscheduled note");
ok(await request(second+"/encounters","POST",{reason:"Before check-in",appointmentId:booked.id},
 assistant.session),[409],"assistant cannot open unarrived appointment");
fixture(clinic.id,booked.id);
const current=ok(await request(base+"/appointments/"+booked.id,"GET",undefined,reception.session),
 [200],"appointment shifted to today").appointment;
ok(await request(base+"/appointments/"+booked.id+"/status","POST",
 {status:"arrived",revision:current.revision,idempotencyKey:key()},reception.session),
 [200],"check in");
const assist=ok(await request(second+"/encounters","POST",
 {reason:"Assistant draft",appointmentId:booked.id},assistant.session),[201],
 "assistant drafts checked-in visit");
ok(await request(second+"/encounters/"+assist.id+"/sign","POST",
 {revision:1,confirmation:"SIGN"},assistant.session),[403],"assistant sign denied");
ok(await request(second+"/encounters/"+assist.id,"PATCH",
 {...note,revision:1},assistant.session),[200],"assistant saves structured note");
ok(await request(second+"/encounters/"+assist.id+"/sign","POST",
 {revision:2,confirmation:"SIGN"},dentist.session),[200],"assigned dentist signs");
ok(await request(second+"/encounters/"+assist.id,"GET",undefined,assistant.session),
 [404],"signed note not readable by assistant");
console.log("PH07_INTEGRATION_OK — tenant isolation, role access, sign/amend, immutable versions, file checks, assistant draft.");
