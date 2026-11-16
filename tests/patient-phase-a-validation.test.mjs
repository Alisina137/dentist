import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";

const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const auth=file("apps/mobile/native-auth.tsx");
const app=file("apps/mobile/App.tsx");
const patient=file("apps/mobile/native-patient.tsx");
const reviews=file("apps/mobile/native-reviews.tsx");
const errors=file("apps/mobile/patient-errors.ts");

test("Patient A: native sessions fail closed for stale sign-in, restore and 401",()=>{
 for(const clause of [
  'const sessionGeneration=useRef(0)',
  'const activeToken=useRef<string|null>(null)',
  'sessionGeneration.current++',
  'activeToken.current=null',
  'setToken(null);setAccount(null)',
  'if(sessionGeneration.current!==revision)return;',
  'if(sessionGeneration.current!==revision||activeToken.current!==currentToken)',
  'sessionGeneration.current===revision&&activeToken.current===currentToken',
  'await SecureStore.deleteItemAsync(TOKEN_KEY)',
  'await SecureStore.setItemAsync(TOKEN_KEY,newToken)',
  'const profile=await accountFor(newToken)',
  'PATIENT_ONBOARDING_REQUIRED',
  'if(!user?.emailVerified)',
  'if(response.data?.twoFactorRedirect)',
  'if(oldToken)',
  'await clear();'
 ])assert.ok(auth.includes(clause),clause);
 assert.ok(!auth.includes("AsyncStorage"),"private bearer session must not persist in general storage");
 assert.ok(!auth.includes("console.log("),"never log private token");
});

test("Patient A: navigation and favorites suppress every stale account frame",()=>{
 for(const clause of [
  'const identityKey=native.account?.user.id||null',
  'const [viewIdentity,setViewIdentity]=useState<string|null>(identityKey)',
  'const previousIdentity=useRef<string|null>(identityKey)',
  'if(previousIdentity.current!==identityKey)',
  'setRoute(null);setAccountSection("profile");setTab("account")',
  'if(viewIdentity!==identityKey)return <SafeAreaView',
  'const favorites=favoriteSnapshot?.patientId===patientId?favoriteSnapshot.rows:[]',
  'if(!patientId){setFavoriteSnapshot(null);return;}',
  'if(active)setFavoriteSnapshot({patientId,rows:current.favorites})',
  '":"+refreshVersion+":"+(identityKey||"guest")'
 ])assert.ok(app.includes(clause),clause);
 const acct=patient.slice(patient.indexOf("export function NativeAccountArea("),
  patient.indexOf("function NativePatientNotifications("));
 for(const clause of [
  'const patientId=auth.account?.registered?auth.account.user.id:null',
  'setPrefs(null);setFamily(null)',
  'setChild("");setBirth("");setGuardian(false)',
  'if(!patientId)return;',
  'if(live){setPrefs(p);setFamily(f)',
  'return()=>{live=false}'
 ])assert.ok(acct.includes(clause),clause);
});

test("Patient A: recovery is native, truthful and localized",()=>{
 for(const clause of [
  '"/api/auth/request-password-reset"',
  'redirectTo:WEB+"/reset-password"',
  'throw new ApiError(0,"PATIENT_WEB_REQUIRED")',
  '"/api/auth/send-verification-email"',
  'resendVerification:(email:string)=>Promise<void>',
  'requestPasswordReset:(email:string)=>Promise<void>',
  'if(response.data?.twoFactorRedirect)'
 ])assert.ok(auth.includes(clause),clause);
 for(const clause of [
  'mode==="recover"',
  'await auth.requestPasswordReset(email)',
  'await auth.resendVerification(email)',
  'setNotice(patientText(locale,"resetSent"))',
  'setNotice(patientText(locale,"verifySent"))',
  'patientError(e,locale)'
 ])assert.ok(patient.includes(clause),clause);
 assert.ok(app.includes('onOpenProfile={()=>setAccountSection("profile")}'),
  "guest opens native sign-in rather than broken web link");
 assert.ok(!app.includes('ui.t("webMissing")}</TextLine>'),
  "never expose Expo config keys to patients");
 for(const clause of ["slotTaken","deadline","publicationChanged","session","network"])
  assert.ok(errors.includes(clause),clause);
 for(const snippet of ["patientError(e,locale)","setError(patientError(e,locale))"])
  assert.ok(reviews.includes(snippet),snippet);
});

test("Patient A: booked-slot conflict rechecks real availability; network uncertainty preserves identity",()=>{
 const wizard=patient.slice(patient.indexOf("export function NativeBookingWizard("),
  patient.indexOf("export function NativeSaved("));
 for(const clause of [
  'if(isSlotConflict(e))',
  'setStep(2);setTime("");setSlots([]);setKey(uniqueActionKey())',
  'setRecoveryNotice(patientText(locale,"slotTaken"))',
  'setRetry(v=>v+1)',
  'setUncertain(true)',
  'patientText(locale,"uncertain")',
  'title={t.checkAppointments} onPress={onDone}',
  'idempotencyKey:key',
  'consent&&!!picked',
  'slotFor',
 ])if(clause!=="slotFor")assert.ok(wizard.includes(clause),clause);
 assert.ok(!wizard.includes('setError(e instanceof Error?e.message:t.offline)'),
  "network failures cannot imply a reservation was definitely not committed");
 const appts=patient.slice(patient.indexOf("export function NativeAppointments("),
  patient.indexOf("export function NativeBookingWizard("));
 for(const clause of [
  'const active=snapshot?.patientId===patientId?snapshot:null',
  'const error=active?.error||""',
  'if(e instanceof ApiError&&e.status===409)await refresh()',
  '!!actionError&&<ErrorBox message={actionError}/>',
  '{!loading&&!error&&current.map(b=><Block key={b.id}>'
 ])assert.ok(appts.includes(clause),clause);
});

test("Patient A: live typed errors are mapped across EN/Dari/Pashto and never reflected",()=>{
 const root=new URL("../",import.meta.url);
 const code=`import assert from "node:assert/strict";
 import {ApiError} from "./apps/mobile/api-error.ts";
 import {patientError,patientText,isSlotConflict} from "./apps/mobile/patient-errors.ts";
 const codes=[
  [409,"BOOKING_SLOT_CONFLICT","slotTaken"],
  [409,"BOOKING_CANNOT_RESCHEDULE","bookingChanged"],
  [409,"RESCHEDULE_DEADLINE_PASSED","deadline"],
  [409,"SERVICE_PUBLICATION_CHANGED","publicationChanged"],
  [0,"PATIENT_WEB_REQUIRED","missingWeb"],
  [403,"MFA_WEB_REQUIRED","mfaWeb"],
  [0,"NETWORK_UNAVAILABLE","network"],
  [429,"RATE_LIMITED","rateLimit"],
  [401,"AUTH_REQUIRED","signIn"]
 ];
 for(const lang of ["en","fa-AF","ps-AF"]){
  for(const [status,code,key] of codes)
   assert.equal(patientError(new ApiError(status,code),lang),patientText(lang,key));
  assert.equal(patientError(new ApiError(500,"SERVER_PRIVATE_SECRET_123"),lang),patientText(lang,"generic"));
  assert.ok(!patientError(new ApiError(500,"SERVER_PRIVATE_SECRET_123"),lang).includes("SECRET"));
 }
 assert.equal(isSlotConflict(new ApiError(409,"BOOKING_SLOT_CONFLICT")),true);
 assert.equal(isSlotConflict(new ApiError(409,"BOOKING_CANNOT_RESCHEDULE")),false);
 `;
 const run=spawnSync(process.execPath,["--import","tsx","--input-type=module","-e",code],
  {cwd:new URL("../",import.meta.url),encoding:"utf8",timeout:20000});
 assert.equal(run.status,0,(run.stderr||run.stdout).slice(0,1600));
});
