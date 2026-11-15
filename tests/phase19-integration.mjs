import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {request,ok,owner,admin,reception,stranger,clinic,unrelated,service,chair,p1,date,base,doBooking,key} from "./phase07-fixture.mjs";
await import("./phase18-integration.mjs");
const require=createRequire(new URL("../packages/db/package.json",import.meta.url));
const postgres=require("postgres"),db=postgres(process.env.DATABASE_URL,{max:3});
const root="/v1/portability/clinics/"+clinic.id;
try{
 const gate=ok(await request("/v1/portability/admin/readiness","GET",undefined,admin.session),[200],"MFA admin checks pilot approval");
 assert.equal(gate.releaseEnabled,false,"release defaults to no-go without human signoff");
 assert.ok(gate.controls.length>=8);
 ok(await request("/v1/portability/admin/readiness","GET",undefined,owner.session),[403],"clinic owner cannot see admin release gate");
 ok(await request(root+"/exports"),[401],"export history needs a session");
 ok(await request(root+"/exports","GET",undefined,stranger.session),[404],"stranger cannot find clinic export");
 ok(await request(root+"/exports","GET",undefined,reception.session),[403],"non-owner cannot export patient data");
 ok(await request(root+"/exports","GET",undefined,admin.session),[403],"platform admin is not a clinic owner");
 ok(await request("/v1/portability/clinics/"+unrelated.id+"/exports","GET",undefined,stranger.session),
  [404],"no external tenant read");
 const list=ok(await request(root+"/exports","GET",undefined,owner.session),[200],"owner history");
 assert.ok(Array.isArray(list.jobs));
 assert.equal(list.scope,"administrative");
 const retention=ok(await request(root+"/retention","GET",undefined,owner.session),[200],"retention notice");
 assert.equal(retention.automatedDeletion,false);
 ok(await request(root+"/retention","PUT",{requestedDays:999,acknowledgeNoDeletion:true},owner.session),
  [422],"unapproved retention period forbidden");
 ok(await request(root+"/exports","POST",{scope:"clinical",reason:"All diagnoses and images",
  acknowledgeSensitive:true},owner.session),[422],"cannot export clinical records");
 ok(await request(root+"/exports","POST",{scope:"administrative",reason:"short",
  acknowledgeSensitive:true},owner.session),[422],"export requires justification");
 const exportRecord=ok(await request(root+"/exports","POST",{
   scope:"administrative",reason:"Approved pilot archive and tenant-scoped test export",
   acknowledgeSensitive:true
  },owner.session),[201],"owner creates an expiring grant");
 assert.match(exportRecord.downloadPath,/\/download\?token=/);
 const jobId=exportRecord.job.id;
 const foreignPath=exportRecord.downloadPath.replace("/clinics/"+clinic.id+"/","/clinics/"+unrelated.id+"/");
 ok(await request(foreignPath,"GET",undefined,owner.session),[410],
  "token cannot be redeemed under another tenant");
 ok(await request(exportRecord.downloadPath,"GET",undefined,stranger.session),[404],
  "other user cannot redeem owner token");
 const downloadResponse=await request(exportRecord.downloadPath,"GET",undefined,owner.session);
 const payload=ok(downloadResponse,[200],"single-use signed export");
 assert.match(downloadResponse.headers.get("cache-control")||"",/no-store/);
 assert.match(downloadResponse.headers.get("content-disposition")||"",/attachment/);
 assert.equal(payload.manifest.clinicId,clinic.id);
 assert.equal(payload.manifest.scope,"administrative");
 assert.ok(payload.patients.some(p=>p.patient_number===p1.patientNumber));
 for(const key of ["signed_encounters","clinical_intakes","chart","clinical_files"])
  assert.ok(payload.manifest.excludes.includes(key));
 assert.ok(!("notes" in payload)&&!("clinical" in payload));
 ok(await request(exportRecord.downloadPath,"GET",undefined,owner.session),[410],
  "link cannot be downloaded twice");
 const recent=ok(await request(root+"/exports","GET",undefined,owner.session),[200],"history list");
 assert.equal(recent.jobs.find(x=>x.id===jobId)?.status,"downloaded");
 assert.ok(!JSON.stringify(recent).includes("token="),"history hides credentials");
 const second=ok(await request(root+"/exports","POST",{
   scope:"administrative",reason:"Temporary pilot access grant to revoke safely",acknowledgeSensitive:true
  },owner.session),[201],"second token");
 ok(await request(root+"/exports/"+second.job.id+"/revoke","POST",{},owner.session),[200],"owner revokes");
 ok(await request(second.downloadPath,"GET",undefined,owner.session),[410],"revoked link unusable");
 const third=ok(await request(root+"/exports","POST",{
   scope:"administrative",reason:"Short-lived link expiry verification for clinic owner",acknowledgeSensitive:true
  },owner.session),[201],"third token");
 await db`UPDATE clinic_export_jobs SET created_at=now()-interval '10 minutes',
  expires_at=now()-interval '5 minutes' WHERE id=${third.job.id}`;
 ok(await request(third.downloadPath,"GET",undefined,owner.session),[410],"expired link cannot download");
 const policy=ok(await request(root+"/retention","PUT",{
  requestedDays:730,acknowledgeNoDeletion:true
 },owner.session),[200],"owner proposes non-destructive retention");
 assert.equal(policy.automatedDeletion,false);
 assert.equal(ok(await request(root+"/retention","GET",undefined,owner.session),
  [200],"policy read").requestedDays,730);
 const eventRows=await db`SELECT count(*)::int AS n FROM clinic_export_events
  WHERE clinic_id=${clinic.id} AND job_id=${jobId}`;
 assert.equal(eventRows[0].n,2,"creation and download recorded");
 await assert.rejects(db`DELETE FROM clinic_export_events WHERE job_id=${jobId}`,
  /Export access history is immutable/,"audit cannot be erased");

 // Real API/DB concurrency: 100 unique booking intents for one free slot cannot double-book.
 const docs=await db`SELECT id FROM clinic_memberships
  WHERE clinic_id=${clinic.id} AND role='dentist' AND status='active' ORDER BY id`;
 let selected=null;
 for(const provider of docs){
  const qs=new URLSearchParams({date,serviceId:service.id,
   providerId:provider.id,resourceId:chair.id});
  const slots=ok(await request(base+"/slots?"+qs,"GET",undefined,reception.session),
    [200],"available clinician slots").slots;
  if(slots.length){selected={providerId:provider.id,slot:slots.at(-1).start};break;}
 }
 assert.ok(selected,"an available verified clinic slot is required for concurrency test");
 const provider={membershipId:selected.providerId};
 const results=await Promise.all(Array.from({length:100},()=>doBooking(
   clinic.id,reception,p1,service,provider,chair,date,selected.slot,key(),"staff")));
 const wins=results.filter(x=>x.status===201).length;
 assert.equal(wins,1,"100 simultaneous booking attempts must have exactly one winner");
 assert.equal(results.filter(x=>x.status===409).length,99,
  "overlap loser requests must receive an explicit conflict, not double reserve");
 const overlapping=await db`SELECT count(*)::int AS n FROM clinic_appointments
  WHERE clinic_id=${clinic.id} AND provider_membership_id=${selected.providerId}
   AND resource_id=${chair.id} AND status IN ('confirmed','arrived','in_treatment','completed')
   AND start_at AT TIME ZONE 'Asia/Kabul' >= ${date+" "+selected.slot}::timestamp
   AND start_at AT TIME ZONE 'Asia/Kabul' < (${date+" "+selected.slot}::timestamp +interval '30 minutes')`;
 assert.equal(overlapping[0].n,1,"unique stored appointment for contended slot");
 console.log("PH19_INTEGRATION_OK — owner tenant-scope, single-use link, 5-minute expiry, revocation, immutable events, retention proposals and 100 API booking contenders");
}finally{await db.end();}
