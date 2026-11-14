import assert from "node:assert/strict";
import {API,request,ok,admin,owner,dentist,clinic,date,p1} from "./phase07-fixture.mjs";
// Build and verify the complete PH12 publication lifecycle in this same ESM fixture instance.
// Each CLI invocation otherwise creates a separate nonce-scoped clinic.
await import("./phase12-integration.mjs");
const base="/v1/discovery",published="/v1/listings/public/clinics/"+clinic.id;
const credentialPath="/v1/listings/clinics/"+clinic.id;
const adminCredentials="/v1/listings/admin/dentists/";
const doctorId=(ok(await request("/v1/team/context","GET",undefined,dentist.session),
 [200],"dentist context").clinics.find(x=>x.clinicId===clinic.id)?.membershipId);
assert.ok(doctorId);
const failBefore=ok(await request(base+"/search?city=Kabul","GET"),
 [200],"public-only search before verification");
assert.equal(failBefore.items.some(x=>x.clinic.id===clinic.id),false,
 "revoked and suspended PH12 clinic must not be discoverable");
assert.equal(failBefore.reviewedOnly,true);
ok(await request("/v1/admin/clinics/"+clinic.id+"/review","POST",{
 action:"reopen",reason:"Reopened after a completed clinic safety review"
},admin.session),[200],"platform admin reopens suspended clinic");
ok(await request("/v1/admin/clinics/"+clinic.id+"/review","POST",{
 action:"approve",reason:"License rechecked and clinic operating eligibility restored",
 confirmation:clinic.displayName},admin.session),[200],"platform admin reapproves clinic");
ok(await request(base+"/search?city=Kabul","GET"),[200],"query before credential restored");
const evidence=Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
ok(await request(credentialPath+"/dentists/"+doctorId+"/credentials","POST",{
 credentialType:"Dental professional license",credentialNumber:"PH13-RETURN-2017",
 validUntil:"2032-11-14",attested:true,evidence:{
  fileName:"reviewed-proof.pdf",mimeType:"application/pdf",
  contentBase64:evidence.toString("base64")}
},dentist.session),[201],"dentist resubmits private credential after revocation");
const approved=ok(await request(adminCredentials+doctorId+"/decision","POST",{
 action:"approve",reason:"Reconfirmed professional license and current clinic affiliation",
 reviewBasis:"Manually inspected updated source document and unchanged professional draft",
 confirmation:"VERIFY"},admin.session),[200],"MFA reviewer restores professional verification");
assert.equal(approved.status,"verified");
const direct=ok(await request(published,"GET"),[200],"PH12 approved clinic direct profile restored");
assert.equal(direct.searchable,true);
assert.equal(direct.profile.dentists[0].id,doctorId);
const facets=ok(await request(base+"/facets","GET"),[200],"guest receives safe live discovery facets");
assert.ok(facets.cities.some(c=>c.city==="Kabul"),JSON.stringify(facets.cities));
assert.ok(facets.services.some(s=>s.name==="PH12 Public Dental Care"),
 "public service filters must contain real approved service");
assert.ok(facets.specialties.some(s=>s.name==="General dentistry"));
assert.ok(facets.verifiedClinics>=1);
for(const x of ["patients","caseNotes","credential_number","professional_license","email"])
 assert.ok(!Object.keys(facets).includes(x),"facets expose only public fields");
const search=ok(await request(base+"/search?city=Kabul","GET"),[200],
 "guest finds current approved clinic in city index");
const card=search.items.find(x=>x.clinic.id===clinic.id);
assert.ok(card,JSON.stringify(search).slice(0,900));
assert.equal(card.verifiedClinic,true);
assert.equal(card.verifiedDentistsOnly,true);
assert.equal(card.publicBookingsEnabled,true);
assert.equal(card.minFeeAfn,850);
assert.equal(card.clinic.name,clinic.displayName);
assert.ok(card.dentists.every(x=>x.verified));
assert.equal(card.location.latitude,34.5553);
assert.equal(card.location.longitude,69.2075);
assert.ok(!JSON.stringify(search).includes("PH13-RETURN-2017"),
 "credential numbers are never returned by public search");
assert.ok(!JSON.stringify(search).includes(p1.preferredName),
 "no clinic-local patient data is included");
const q=(p)=>base+"/search?"+new URLSearchParams(p);
for(const term of ["PH07 Dental","Dr. PH12 Dental","PH12 Public Dental Care",
 "General dentistry"]){
 const hit=ok(await request(q({q:term,city:"Kabul"}),"GET"),[200],
 "search name/provider/service/category: "+term);
 assert.ok(hit.items.some(x=>x.clinic.id===clinic.id),
  "expected verified clinic for phrase "+term+" "+JSON.stringify(hit).slice(0,400));
}
const city=ok(await request(q({city:"Herat"}),"GET"),[200],"nonmatching city");
assert.ok(!city.items.some(x=>x.clinic.id===clinic.id));
const all=ok(await request(q({city:""}),"GET"),[200],"all cities option");
assert.ok(all.items.some(x=>x.clinic.id===clinic.id));
const filtered=ok(await request(q({city:"Kabul",specialty:"General dentistry",
 service:"PH12 Public Dental Care",maxFee:"850"}),"GET"),[200],"combined filters");
assert.ok(filtered.items.some(x=>x.clinic.id===clinic.id));
assert.ok(filtered.pagination.totalExact);
const price=ok(await request(q({city:"Kabul",maxFee:"700"}),"GET"),[200],
 "fees only from approved public catalog");
assert.ok(!price.items.some(x=>x.clinic.id===clinic.id));
const unsafe=ok(await request(q({q:"PH07 Patient",city:"Kabul"}),"GET"),[200],
 "private patient name never matches public search");
assert.ok(!unsafe.items.some(x=>x.clinic.id===clinic.id));
const literal=ok(await request(q({q:"DENTAL%",city:"Kabul"}),"GET"),[200],
 "percent sign treated as literal, not a wildcard");
assert.ok(!literal.items.some(x=>x.clinic.id===clinic.id));
const page=ok(await request(q({city:"Kabul",sort:"name",limit:"1",page:"1"}),"GET"),
 [200],"real pagination and alphabetical name sort");
assert.equal(page.pagination.limit,1);
assert.equal(page.items.length,1);
ok(await request(q({city:"Kabul",sort:"distance"}),"GET"),[422],
 "distance sorting requires explicit location coordinates");
const nearby=ok(await request(q({city:"",sort:"distance",latitude:"34.55",
 longitude:"69.207",limit:"8"}),"GET"),[200],
 "opt-in geolocation distance sorting");
assert.ok(nearby.items.some(x=>x.clinic.id===clinic.id));
assert.ok(nearby.items.find(x=>x.clinic.id===clinic.id).distanceKm!==null);
const dateSearch=ok(await request(q({city:"Kabul",date}),"GET"),[200],
 "chosen date filter checks live provider schedules");
const selected=dateSearch.items.find(x=>x.clinic.id===clinic.id);
assert.ok(selected,"real Saturday hours should provide a PH13 selected-date result");
assert.ok(selected.nextSlot);
assert.ok(Date.parse(selected.nextSlot.startAt)>Date.now());
const sorted=ok(await request(q({city:"Kabul",sort:"soonest",date}),"GET"),[200],
 "soonest uses actual live schedule order");
assert.ok(sorted.items.some(x=>x.clinic.id===clinic.id));
const detail=ok(await request(base+"/clinics/"+clinic.id,"GET"),[200],
 "patient clinic page receives only reviewed public content and published hours");
assert.equal(detail.verifiedClinic,true);
assert.equal(detail.publicBookingsEnabled,true);
assert.ok(detail.hours.weekly.some(x=>x.isOpen));
assert.ok(!JSON.stringify(detail).includes("PH13-RETURN-2017"));
const dentistPublic=ok(await request(base+"/clinics/"+clinic.id+"/dentists/"+doctorId,"GET"),
 [200],"patient dentist profile with verified affiliation, qualifications and biography");
assert.equal(dentistPublic.dentist.verified,true);
assert.equal(dentistPublic.dentist.affiliationVerified,true);
assert.ok(dentistPublic.dentist.biography);
assert.ok(!JSON.stringify(dentistPublic).includes("PH13-RETURN-2017"));
assert.ok(!JSON.stringify(dentistPublic).includes("reviewed-proof.pdf"));
const serviceId=card.services.find(s=>s.name==="PH12 Public Dental Care")?.id;
assert.ok(serviceId);
const slots=ok(await request(base+"/clinics/"+clinic.id+"/availability?"+
 new URLSearchParams({date,serviceId,dentistId:doctorId}),"GET"),[200],
 "guest sees sanitized real appointment previews");
assert.ok(slots.slots.length>0,JSON.stringify(slots));
assert.equal(slots.publicBookingsEnabled,true);
assert.equal(slots.source,"live_clinic_schedule");
assert.ok(slots.slots.every(x=>Date.parse(x.startAt)>Date.now()));
assert.ok(slots.slots.every(x=>x.serviceId===serviceId&&x.dentistId===doctorId));
assert.ok(!JSON.stringify(slots).includes(p1.preferredName));
const noSlot=ok(await request(base+"/clinics/"+clinic.id+"/availability?"+
 new URLSearchParams({date,serviceId:"not-a-real-service"}),"GET"),[404],
 "unpublished service denied");
ok(await request(base+"/clinics/"+clinic.id+"/availability?date=2020-01-01","GET"),
 [422],"past dates fail closed");
ok(await request(base+"/clinics/"+clinic.id+"/dentists/not-a-verified-dentist","GET"),
 [404],"unpublished dentist denied");
const docChanged=ok(await request("/v1/listings/admin/dentists/"+doctorId+"/decision","POST",{
 action:"revoke",reason:"New independent review has revoked active professional verification"
},admin.session),[200],"moderator withdraws credential again");
assert.equal(docChanged.status,"revoked");
const invalid=ok(await request(q({city:"Kabul"}),"GET"),[200],
 "revocation immediately hides index hit without resynchronizing index");
assert.ok(!invalid.items.some(x=>x.clinic.id===clinic.id));
const hiddenFacets=ok(await request(base+"/facets","GET"),[200],"facets update to live eligibility");
assert.ok(!hiddenFacets.services.some(x=>x.name==="PH12 Public Dental Care"&&
 hiddenFacets.verifiedClinics===0));
ok(await request(base+"/clinics/"+clinic.id,"GET"),[404],"revocation disables direct page");
ok(await request(base+"/clinics/"+clinic.id+"/availability?date="+date,"GET"),
 [404],"revocation removes schedule from public");
console.log("PH13_INTEGRATION_OK — indexed approved search, exact city/name/dentist/service filters, real price/date/slots, verified-only profile, pagination, opt-in distance and revocation.");
