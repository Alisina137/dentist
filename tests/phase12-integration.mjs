import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {API,origin,request,ok,key,admin,owner,dentist,reception,assistant,
 clinic,unrelated,service,chair,date} from "./phase07-fixture.mjs";

const root="/v1/listings",mine=root+"/clinics/"+clinic.id,
 publicRoute=root+"/public/clinics/"+clinic.id,adminRoot=root+"/admin";
const token=key();
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9XsvV8sAAAAASUVORK5CYII=","base64");
const pdf=Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
function profile(doctorId,serviceId,photoId,description="A trusted dental practice serving families with independently reviewed local professionals."){
 return {description,specialties:["General dentistry","Preventive care"],
  latitude:34.5553,longitude:69.2075,contactNote:"Contact the clinic for current appointment information.",
  photoIds:[{id:photoId,caption:"Clinic reception and waiting space"}],
  dentistIds:[doctorId],serviceIds:[serviceId],
  bookingRules:{approvalMode:"manual",minNoticeHours:2,horizonDays:30,
   cancellationHours:12,bufferMinutes:10}};
}
ok(await request(publicRoute,"GET"),[404],"draft clinics are not discoverable");
ok(await request(mine+"/workspace","GET",undefined,dentist.session),
 [403],"dentist cannot manage owner listing");
ok(await request(adminRoot+"/dentists","GET",undefined,owner.session),
 [403],"clinic owner cannot access platform credential moderation");
ok(await request(adminRoot+"/listings","GET",undefined,reception.session),
 [403],"reception cannot moderate public data");
ok(await request(mine+"/workspace","GET",undefined,admin.session),
 [403],"platform administrator cannot access clinic staff workspace");

const ownerClinicReview=ok(await request("/v1/admin/clinics/"+clinic.id+"/review","POST",{
 action:"approve",confirmation:clinic.displayName},admin.session),[200],
 "platform admin independently approves clinic license");
assert.equal(ownerClinicReview.clinic.status,"approved");
const dentistContext=ok(await request("/v1/team/context","GET",undefined,dentist.session),
 [200],"dentist membership context");
const doctorId=dentistContext.clinics.find(c=>c.clinicId===clinic.id)?.membershipId;
assert.ok(doctorId);
const staffPath="/v1/team/clinics/"+clinic.id+"/staff/"+doctorId;
const initial=ok(await request(staffPath,"GET",undefined,dentist.session),
 [200],"clinician profile draft");
const doc=ok(await request(staffPath+"/dentist","POST",{
 displayName:"Dr. PH12 Dental",specialty:"General dentistry",
 qualifications:"Dental medicine degree (evidence under review)",
 professionalLicense:"PH12-DENTAL-2017",
 experienceYears:6,biography:"Patient-focused clinician with verified affiliation.",
 draftVersion:initial.draft?.draftVersion??0
},dentist.session),[200],"dentist submits professional identity draft");
const currentDraft=doc.draft.draftVersion;
ok(await request(mine+"/dentists/"+doctorId+"/credentials","POST",{
 credentialType:"Dental professional license",credentialNumber:"PH12-DENTAL-2017",
 validUntil:"2030-11-14",attested:false,evidence:{
  fileName:"license.pdf",mimeType:"application/pdf",contentBase64:pdf.toString("base64")}
},dentist.session),[422],"submitting evidence requires an attestation");
const credential=ok(await request(mine+"/dentists/"+doctorId+"/credentials","POST",{
 credentialType:"Dental professional license",credentialNumber:"PH12-DENTAL-2017",
 validUntil:"2030-11-14",attested:true,evidence:{
 fileName:"license.pdf",mimeType:"application/pdf",contentBase64:pdf.toString("base64")}
},dentist.session),[201],"dentist submits private credential document");
assert.equal(credential.status,"pending");
assert.equal(credential.draftVersion,currentDraft);
const selfCredential=ok(await request(mine+"/dentists/"+doctorId+"/credential","GET",undefined,dentist.session),
 [200],"dentist sees only own credential status and review history");
assert.equal(selfCredential.verification.status,"pending");
ok(await request(mine+"/dentists/"+doctorId+"/credential","GET",undefined,reception.session),
 [403],"unrelated reception role cannot inspect clinician credential history");
ok(await request(mine+"/dentists/"+doctorId+"/credentials","POST",{
 credentialType:"Dental professional license",credentialNumber:"PH12-DENTAL-2017",
 validUntil:"2030-11-14",attested:true,evidence:{
 fileName:"license.pdf",mimeType:"application/pdf",contentBase64:pdf.toString("base64")}
},dentist.session),[409],"duplicate pending credential submissions blocked");
const credentialQueue=ok(await request(adminRoot+"/dentists?status=pending","GET",
 undefined,admin.session),[200],"admin pending credentials queue");
assert.ok(credentialQueue.dentists.some(x=>x.membership_id===doctorId));
const credentialDetail=ok(await request(adminRoot+"/dentists/"+doctorId,"GET",
 undefined,admin.session),[200],"admin sees professional affiliation and evidence metadata");
assert.equal(credentialDetail.verification.status,"pending");
assert.equal(credentialDetail.submissions[0].id,credential.submissionId);
assert.ok(!JSON.stringify(credentialDetail).includes(pdf.toString("base64")));
const privateDoc=await fetch(API+adminRoot+"/dentists/"+doctorId+"/evidence/"+
 credential.submissionId,{headers:{origin,cookie:admin.session}});
assert.equal(privateDoc.status,200);
assert.equal(privateDoc.headers.get("cache-control"),"private, no-store");
assert.deepEqual(Buffer.from(await privateDoc.arrayBuffer()),pdf);
ok(await request(adminRoot+"/dentists/"+doctorId+"/evidence/"+credential.submissionId,
 "GET",undefined,owner.session),[403],"owner cannot download privileged professional evidence");
ok(await request(adminRoot+"/dentists/"+doctorId+"/decision","POST",{
 action:"approve",reason:"Reviewed dental license and valid current clinic affiliation",
 reviewBasis:"Manually compared provided license evidence to declared professional identity"
},admin.session),[422],"independent reviewer must explicitly confirm");
const approve=ok(await request(adminRoot+"/dentists/"+doctorId+"/decision","POST",{
 action:"approve",reason:"Reviewed dental license and valid current clinic affiliation",
 reviewBasis:"Manually compared provided license evidence to declared professional identity",
 confirmation:"VERIFY"},admin.session),[200],"admin manually verifies dentist evidence");
assert.equal(approve.status,"verified");
assert.equal(approve.externalRegistryMatchVerified,false);
const verified=ok(await request(mine+"/dentists","GET",undefined,owner.session),
 [200],"owner sees approved professional verification");
assert.equal(verified.dentists.find(d=>d.id===doctorId)?.currentlyVerified,true);
const servicesPath="/v1/operations/clinics/"+clinic.id+"/services";
const publicService=ok(await request(servicesPath,"POST",{
 name:"PH12 Public Dental Care",category:"General dentistry",
 description:"Real consultation service exposed after professional review",
 durationMinutes:30,preparationMinutes:0,basePriceAfn:850,
 requiresChair:true,publicBooking:true,active:true
},owner.session),[201],"owner creates active genuine public service").service;
const image=ok(await request(mine+"/photos","POST",{
 image:{fileName:"clinic.png",mimeType:"image/png",contentBase64:png.toString("base64")},
 rightsAttested:true},owner.session),[201],"clinic owner uploads rights-attested gallery image");
ok(await request(mine+"/photos","POST",{
 image:{fileName:"unlicensed.png",mimeType:"image/png",contentBase64:png.toString("base64")},
 rightsAttested:false},owner.session),[422],"image rights must be attested");
ok(await request(publicRoute+"/photos/"+image.id,"GET"),[404],
 "unapproved clinic images are private even with identifier");
const workspace=ok(await request(mine+"/workspace","GET",undefined,owner.session),
 [200],"load listing wizard");
assert.equal(workspace.head.revision,0);
const body=profile(doctorId,publicService.id,image.id);
ok(await request(mine+"/draft","PUT",{profile:body,revision:4},owner.session),
 [409],"draft optimistic revision prevents silent overwrites");
const draft=ok(await request(mine+"/draft","PUT",{profile:body,revision:0},
 owner.session),[200],"save owner Overview/Dentists/Photos/Booking Rules draft");
assert.equal(draft.draftVersion,1);
const saved=ok(await request(mine+"/workspace","GET",undefined,owner.session),
 [200],"owner readiness checklist");
assert.equal(saved.checklist.ready,true,JSON.stringify(saved.checklist));
assert.ok(saved.draft);
assert.equal(saved.draft.profile.photoIds[0].id,image.id);
const unpublishedPreview=ok(await request(mine+"/preview?version=draft","GET",
 undefined,owner.session),[200],"clinic owner-only private patient-facing draft preview");
assert.equal(unpublishedPreview.previewOnly,true);
ok(await request(mine+"/preview?version=draft","GET",undefined,dentist.session),
 [403],"dentist cannot see unpublished owner preview");
const submitted=ok(await request(mine+"/submit","POST",{revision:1},owner.session),
 [200],"real provider/clinic slots and verification gate submission");
assert.equal(submitted.status,"pending");
const pendingState=ok(await request(mine+"/workspace","GET",undefined,owner.session),
 [200],"pending is read-only while under review");
assert.equal(pendingState.head.pending_version,1);
ok(await request(mine+"/draft","PUT",{profile:body,revision:2},owner.session),
 [409],"pending revision cannot be silently overwritten");
ok(await request(publicRoute,"GET"),[404],"pending revision never leaks publicly");
const listingQueue=ok(await request(adminRoot+"/listings?status=pending","GET",
 undefined,admin.session),[200],"admin sees pending revision");
assert.ok(listingQueue.listings.some(x=>x.clinicId===clinic.id));
const mod=ok(await request(adminRoot+"/listings/"+clinic.id,"GET",undefined,
 admin.session),[200],"admin sees complete pending revision and provenance");
assert.equal(mod.pending.version,1);
assert.equal(mod.approved,null);
ok(await request(adminRoot+"/listings/"+clinic.id+"/decision","POST",{
 action:"approve",revision:2,reason:"Reviewed clinic presentation, license and image rights",
 confirmation:null},admin.session),[422],"publishing requires explicit admin acknowledgement");
const published=ok(await request(adminRoot+"/listings/"+clinic.id+"/decision","POST",{
 action:"approve",revision:2,reason:"Reviewed clinic presentation, license and image rights",
 confirmation:"PUBLISH"},admin.session),[200],"admin approves safe live listing");
assert.equal(published.status,"published");
const publicItem=ok(await request(publicRoute,"GET"),[200],
 "public direct-link projection shows only independently approved data");
assert.equal(publicItem.verifiedClinic,true);
assert.equal(publicItem.publicBookingsEnabled,true);
assert.equal(publicItem.searchable,true);
assert.equal(publicItem.profile.dentists[0].verified,true);
assert.equal(publicItem.profile.services[0].priceAfn,850);
assert.equal(publicItem.profile.photos[0].id,image.id);
assert.ok(!JSON.stringify(publicItem).includes("PH12-DENTAL-2017"),
 "private credentials are not embedded in public records");
assert.ok(!JSON.stringify(publicItem).includes("license.pdf"));
assert.ok(!JSON.stringify(publicItem).includes("Patient registry"));
const picture=await fetch(API+publicRoute+"/photos/"+image.id);
assert.equal(picture.status,200);
assert.equal(picture.headers.get("content-type"),"image/png");
assert.deepEqual(Buffer.from(await picture.arrayBuffer()),png);
const nextDescription="An updated public clinic profile awaiting moderation. Original approved details remain displayed.";
const updated=ok(await request(mine+"/draft","PUT",{
 profile:profile(doctorId,publicService.id,image.id,nextDescription),revision:3
},owner.session),[200],"material public profile revision becomes independent draft");
assert.equal(updated.draftVersion,2);
ok(await request(mine+"/submit","POST",{revision:4},owner.session),
 [200],"owner submits material edit");
const oldStillLive=ok(await request(publicRoute,"GET"),[200],
 "old approved version remains while revision is pending");
assert.equal(oldStillLive.profile.description,body.description);
const rejected=ok(await request(adminRoot+"/listings/"+clinic.id+"/decision","POST",{
 action:"reject",revision:5,reason:"Description needs a more precise nonpromotional explanation"
},admin.session),[200],"admin rejects changed profile with documented reason");
assert.equal(rejected.previouslyPublishedRetained,true);
const afterReject=ok(await request(publicRoute,"GET"),[200],
 "rejection preserves existing approved public listing");
assert.equal(afterReject.profile.description,body.description);
const rejectedState=ok(await request(mine+"/workspace","GET",undefined,owner.session),
 [200],"clinic sees rejection reason and old listing");
assert.equal(rejectedState.head.pending_version,null);
assert.match(rejectedState.events[0].reason,/Description needs/);
const updateAgain=ok(await request(mine+"/draft","PUT",{
 profile:profile(doctorId,publicService.id,image.id,
  "An independently reviewed dental clinic with clearly displayed services and licensed professionals."),
 revision:6},owner.session),[200],"owner can edit after rejected revision");
assert.equal(updateAgain.draftVersion,3);
ok(await request(mine+"/submit","POST",{revision:7},owner.session),
 [200],"resubmit corrected description");
ok(await request(adminRoot+"/listings/"+clinic.id+"/decision","POST",{
 action:"approve",revision:8,reason:"Reviewed revised factual clinic text with verified source",
 confirmation:"PUBLISH"},admin.session),[200],"independent approval replaces published snapshot");
const newer=ok(await request(publicRoute,"GET"),[200],"new approved profile released");
assert.notEqual(newer.profile.description,body.description);
assert.equal(newer.version,3);
const hidden=ok(await request(adminRoot+"/listings/"+clinic.id+"/decision","POST",{
 action:"hide",revision:9,reason:"Safety report requires temporary marketplace review",
},admin.session),[200],"emergency admin hide");
assert.equal(hidden.status,"hidden");
ok(await request(publicRoute,"GET"),[404],"hidden clinic invisible publicly");
ok(await request(publicRoute+"/photos/"+image.id,"GET"),[404],"hidden gallery has no public access");
const restored=ok(await request(adminRoot+"/listings/"+clinic.id+"/decision","POST",{
 action:"restore",revision:10,reason:"Safety investigation completed; original license remains valid"
},admin.session),[200],"admin restores after rechecking readiness");
assert.equal(restored.status,"restored");
ok(await request(publicRoute,"GET"),[200],"restored profile visible");
const revoked=ok(await request(adminRoot+"/dentists/"+doctorId+"/decision","POST",{
 action:"revoke",reason:"Independent license validity review requires credential replacement"
},admin.session),[200],"admin revokes professional verification");
assert.equal(revoked.status,"revoked");
ok(await request(publicRoute,"GET"),[404],
 "loss of credential immediately disables verified public profile");
const revokedDentists=ok(await request(mine+"/dentists","GET",undefined,owner.session),
 [200],"owner sees verification revoked");
assert.equal(revokedDentists.dentists.find(d=>d.id===doctorId)?.currentlyVerified,false);
ok(await request(mine+"/draft","PUT",{profile:body,revision:11},
 owner.session),[200],"owner retains ability to prepare new draft after revocation");
ok(await request(mine+"/submit","POST",{revision:12},owner.session),
 [422],"unverified professional cannot be published by bypass");
const guarded=spawnSync("pnpm",["exec","tsx","tests/phase12-immutability.ts",
 clinic.id,credential.submissionId,image.id],{cwd:process.cwd(),encoding:"utf8",env:process.env});
assert.equal(guarded.status,0,"PH12 DB evidence guards: "+guarded.stderr+" "+guarded.stdout);
const suspended=ok(await request("/v1/admin/clinics/"+clinic.id+"/review","POST",{
 action:"suspend",reason:"Clinic public profile suspended for platform safety review",
 confirmation:clinic.displayName},admin.session),[200],"suspend clinic verification");
assert.equal(suspended.clinic.status,"suspended");
ok(await request(publicRoute,"GET"),[404],
 "suspended clinic is unpublishable and unbookable in the public projection");
console.log("PH12_INTEGRATION_OK — private credentials, MFA review, real slots, immutable profile versions, published/rejected/hidden snapshots, role and public safety.");
