import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function load(path,mocks={},dev=true){
 const exports={},module={exports};
 const code=ts.transpileModule(read(path),{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX
 }}).outputText;
 new Function("require","exports","module","__DEV__",code)(
  key=>{if(key in mocks)return mocks[key];throw Error("unexpected dep "+key)},exports,module,dev);
 return module.exports;
}
const model=load("apps/mobile/native-clinic-phase20-model.ts");
const apiError=class ApiError extends Error{
 constructor(status,code){super(code);this.status=status;this.code=code}
};
const picker={getDocumentAsync:async()=>({canceled:true})};
let fileBytes;
class File{constructor(uri){this.uri=uri}async bytes(){return fileBytes}}
const nativeHeaders=()=>({Accept:"application/json","ngrok-skip-browser-warning":"1"});
const transport={nativeApiHeaders:nativeHeaders,nativeJsonResponse:async res=>{
 if(res.headers.get("content-type")!=="application/json")throw new apiError(502,"NON_JSON");
 const json=await res.json();
 if(!res.ok)throw new apiError(res.status,json.code||"REQUEST_FAILED");
 return json;
}};
const evidence=load("apps/mobile/native-clinic-evidence.ts",{
 "expo-document-picker":picker,"expo-file-system":{File},
 "./api-transport":transport,"./api-error":{ApiError:apiError}
});

const clinicId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const base={
 clinic:{id:clinicId,status:"draft",revision:2,displayName:"Clinic",
  legalName:"Clinical Ltd",plannedDentistCount:4,selectedPlanId:"plan-1"},
 documents:[],history:[],effectiveStatus:"unsubscribed",plan:null
};
const pdf=new Uint8Array([37,80,68,70,45,49,46,55,10,30,20,10,10,21,10]);
const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
const jpeg=new Uint8Array([255,216,255,224,9,8,7,6,5,4,3,2]);

test("Phase 20: owner readiness always comes from real API status and evidence",()=>{
 assert.equal(model.validateClinicReview(base,clinicId),true);
 let state=model.nativeClinicReadiness(base);
 assert.deepEqual(state.checks.map(x=>x.state),
  ["complete","complete","action","action","action"]);
 assert.equal(state.canSubmit,false);
 const withLicense={...base,documents:[{id:"doc1",kind:"clinic_license",
  fileName:"clinic.pdf",sizeBytes:pdf.length}]};
 state=model.nativeClinicReadiness(withLicense);
 assert.equal(state.canSubmit,true);
 const underReview={...withLicense,clinic:{...base.clinic,status:"pending"}};
 state=model.nativeClinicReadiness(underReview);
 assert.equal(state.canEdit,false);assert.equal(state.canSubmit,false);
 assert.equal(state.checks[4].state,"waiting");
 const approved={...underReview,clinic:{...underReview.clinic,status:"approved"}};
 state=model.nativeClinicReadiness(approved);
 assert.equal(state.approved,true);assert.equal(state.complete,5);
 assert.equal(model.nativeClinicReadiness({...withLicense,clinic:{...base.clinic,status:"rejected"}}).canEdit,true);
 assert.equal(model.validateClinicReview(withLicense,"other-tenant"),false);
 assert.equal(model.validateClinicReview({...base,documents:[{fileName:"x.pdf",sizeBytes:20}]},clinicId),false);
 assert.equal(model.validateClinicReview({...base,clinic:{...base.clinic,status:"fake_approved"}},clinicId),false);
});
test("Phase 20: doctor draft validation and optimistic revision tracking",()=>{
 const profile={...model.blankDentistDraft,displayName:"Dr A",
  professionalLicense:"LIC-203",experienceYears:"15"};
 assert.deepEqual(model.dentistDraftIssues(profile),[]);
 assert.deepEqual(model.dentistDraftPayload(profile,3),{
  displayName:"Dr A",professionalLicense:"LIC-203",specialty:null,qualifications:null,
  experienceYears:15,biography:null,draftVersion:3
 });
 assert.deepEqual(model.dentistDraftIssues({...profile,experienceYears:"500"}),["experienceYears"]);
 assert.ok(model.dentistDraftIssues({...profile,displayName:"A"}).includes("displayName"));
 assert.deepEqual(model.credentialFormIssues("License","N. 123",
  "2030-04-30","2026-11-17"),[]);
 assert.ok(model.credentialFormIssues("L","n","2030-02-31","2026-11-17").length===3);
 assert.ok(model.credentialFormIssues("License","N. 123","2025-11-01","2026-11-17").includes("validUntil"));
});
test("Phase 20: document magic bytes and untrusted filename are checked, not extension",()=>{
 assert.equal(evidence.detectEvidenceMime(pdf),"application/pdf");
 assert.equal(evidence.detectEvidenceMime(png),"image/png");
 assert.equal(evidence.detectEvidenceMime(jpeg),"image/jpeg");
 assert.equal(evidence.detectEvidenceMime(new Uint8Array(20)),null);
 assert.equal(evidence.evidenceFileName("../../Clinic Name<.pdf","application/pdf"),
  "Clinic_Name.pdf");
 assert.equal(evidence.evidenceFileName("X\\\\../bad.png","image/png"),"X__bad.png");
 assert.equal(evidence.validEvidence(pdf,pdf.length,2097152),true);
 assert.equal(evidence.validEvidence(pdf,pdf.length+1,2097152),false);
 assert.equal(evidence.validEvidence(new Uint8Array(8),8,2097152),false);
 assert.equal(evidence.validEvidence(pdf,pdf.length,8),false);
});
test("Phase 20: native picker rejects oversized/unsafe and respects cancel",async()=>{
 assert.equal(await evidence.pickClinicEvidence(),null);
 fileBytes=pdf;
 picker.getDocumentAsync=async()=>({canceled:false,assets:[{
  uri:"file:///private/secret.pdf",name:"clinic.PDF",size:pdf.length
 }]});
 const file=await evidence.pickClinicEvidence();
 assert.equal(file.mime,"application/pdf");
 assert.equal(file.name,"clinic.pdf");
 assert.equal(file.size,pdf.length);
 picker.getDocumentAsync=async()=>({canceled:false,assets:[{
  uri:"file:///private/secret.pdf",name:"clinic.PDF",size:2097153
 }]});
 await assert.rejects(evidence.pickClinicEvidence(),e=>e.code==="INVALID_FILE_SIZE");
});
test("Phase 20: base64 credential document is exact and limited to 1.5 MB",()=>{
 assert.equal(evidence.evidenceBase64(pdf),Buffer.from(pdf).toString("base64"));
 const obj=evidence.credentialEvidence({name:"cert.pdf",mime:"application/pdf",
  bytes:pdf,size:pdf.length});
 assert.equal(obj.contentBase64,Buffer.from(pdf).toString("base64"));
 assert.equal(obj.fileName,"cert.pdf");
 assert.throws(()=>evidence.credentialEvidence({name:"wrong",mime:"application/pdf",
  bytes:new Uint8Array([1,2,3,4,5,6,7,8]),size:8}));
});
test("Phase 20: license upload is raw octet-stream with bearer; never URL or query token",async()=>{
 const original=global.fetch;
 const headers=[];
 global.fetch=async(url,init)=>{
  headers.push({url,init});
  return new Response(JSON.stringify({id:"doc-id",kind:"clinic_license",
   fileName:"clinic.pdf",sizeBytes:pdf.length}),{
   status:201,headers:{"content-type":"application/json"}
  });
 };
 try{
  const out=await evidence.uploadClinicLicense("https://a.ngrok-free.dev",clinicId,
   "SECRET_SESSION_BEARER",{name:"clinic.pdf",mime:"application/pdf",bytes:pdf,size:pdf.length});
  assert.equal(out.id,"doc-id");
  assert.equal(headers.length,1);
  assert.equal(headers[0].init.method,"POST");
  assert.equal(headers[0].init.headers["Content-Type"],"application/octet-stream");
  assert.equal(headers[0].init.headers.Authorization,"Bearer SECRET_SESSION_BEARER");
  assert.ok(!headers[0].url.includes("SECRET_SESSION_BEARER"));
  assert.equal(headers[0].init.headers["x-document-kind"],"clinic_license");
  assert.ok(headers[0].init.body instanceof Blob);
  assert.equal(headers[0].init.body.size,pdf.length);
 }finally{global.fetch=original}
});
test("Phase 20: clinic mobile only uses owner-only /v1/clinics/:id evidence and role-gated staff",()=>{
 const app=read("apps/mobile/native-clinic.tsx");
 const ui=read("apps/mobile/native-clinic-phase20.tsx");
 const api=read("apps/api/src/phase02.ts");
 const staff=read("apps/api/src/staff-management.ts");
 const listing=read("apps/api/src/listing-router.ts");
 const pkg=read("apps/mobile/package.json");
 const lock=read("pnpm-lock.yaml");
 assert.match(app,/NativeClinicPhase20/);
 assert.match(app,/active\.role==="owner"/);
 assert.match(app,/NativeDentistPhase20/);
 assert.match(app,/NativeInviteAcceptance/);
 assert.match(app,/phase20Request/);
 assert.match(ui,/pickClinicEvidence/);
 assert.match(ui,/uploadClinicLicense/);
 assert.match(ui,/credentialEvidence/);
 assert.match(ui,/attested:true/);
 assert.match(ui,/canSubmit/);
 assert.match(ui,/request\("/);
 assert.match(api,/owner\(req\)/);
 assert.match(api,/clinic_license/);
 assert.match(staff,/draftVersion/);
 assert.match(listing,/CREDENTIAL_SUBMISSION_DENIED/);
 assert.match(pkg,/"expo-document-picker": "~57\.0\.3"/);
 assert.match(pkg,/"expo-file-system": "~57\.0\.7"/);
 assert.match(lock,/expo-document-picker@57\.0\.3/);
 assert.doesNotMatch(ui,/AsyncStorage\.setItem/);
 assert.doesNotMatch(ui,/PH19_PILOT_RELEASE_ENABLED/);
});
