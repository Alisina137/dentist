import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const app=read("apps/mobile/App.tsx");
const patient=read("apps/mobile/native-patient.tsx");
const auth=read("apps/mobile/native-auth.tsx");
const reviews=read("apps/mobile/native-reviews.tsx");
const family=read("apps/mobile/native-family.tsx");
const records=read("apps/mobile/native-records.tsx");
const support=read("apps/mobile/native-support.tsx");
const published=read("apps/mobile/native-public-reviews.tsx");
const journeys=read("apps/mobile/native-journeys.tsx");
const ci=read(".github/workflows/ci.yml");
const integration=read("tests/phase16-integration.mjs");

test("Patient E: guest bookmarks cannot silently become a signed-in patient's saved list",()=>{
 assert.ok(app.includes('const favorites=favoriteSnapshot?.patientId===patientId?favoriteSnapshot.rows:[]'));
 assert.ok(app.includes('if(active)setFavoriteSnapshot({patientId,rows:current.favorites})'));
 assert.ok(!app.includes('Promise.allSettled(missing.map(clinicId=>native.request('),
  "legacy guest-to-account auto-migration is a privacy/cross-account bug");
 assert.ok(!app.includes('const missing=savedIds.filter(clinicId=>'));
 assert.ok(app.includes('setFavoriteSnapshot(null)'));
 assert.ok(app.includes('if(viewIdentity!==identityKey)return <SafeAreaView'),
  "the screen must gate stale private content during session switches");
});

test("Patient E: Saved and Reviews data are scoped to the current verified user even after fetch failures",()=>{
 for(const marker of [
  'const user=auth.account?.registered?auth.account.user.id:null',
  'const current=snapshot?.user===user?snapshot:null',
  'setSnapshot({user,rows:[],error:"",loading:true})',
  'setSnapshot({user,rows:[],error:patientError(e,locale),loading:false})',
  'return()=>{alive=false}',
  'onRefreshSettled?:()=>void'
 ])assert.ok(patient.includes(marker),marker);
 for(const marker of [
  'const user=auth.account?.registered?auth.account.user.id:null',
  'const current=snapshot?.user===user?snapshot:null',
  'setSelected(null);setMode(null)',
  'setHeadline("");setFeedback("");setRating(5)',
  'setSnapshot({user,eligible:[],mine:[],notices:[],loading:true,error:""})',
  'if(mounted)setSnapshot({user,eligible:[],mine:[],notices:[]',
  'return()=>{mounted=false}',
  '!loading&&!loadError&&view==="eligible"',
  '!loading&&!loadError&&view==="mine"',
  '!loading&&!loadError&&view==="updates"'
 ])assert.ok(reviews.includes(marker),marker);
 assert.ok(!reviews.includes("AsyncStorage")&&!reviews.includes("SecureStore"),
  "private reviews must not be serialized into ordinary device storage");
 assert.ok(auth.includes('sessionGeneration.current++'));
 assert.ok(auth.includes('if(sessionGeneration.current!==revision||activeToken.current!==currentToken)'));
});

test("Patient E: pull refresh ends with current primary data request rather than health probe",()=>{
 for(const marker of [
  'setRefreshVersion(x=>x+1)',
  'const onRefreshSettled=useCallback(()=>setPullRefreshing(false),[])',
  'onRefreshSettled={pullRefreshing?onRefreshSettled:undefined}',
  'if(!facets.loading&&!result.loading)onRefreshSettled?.()',
  'if(!results.loading)onRefreshSettled?.()',
  'if(!state.loading)onRefreshSettled?.()',
  'onRefresh={pullToRefresh}',
  'refreshing={pullRefreshing}',
  '16500',
 ])assert.ok(app.includes(marker),marker);
 assert.ok(!app.includes('void checkApi().finally(()=>setPullRefreshing(false))'),
  "connectivity checks do not establish whether screen data is up to date");
 for(const marker of [
  'if((!patientId||active&&!loading)&&onRefreshSettled)onRefreshSettled()',
  'if((!user||current&&!loading)&&onRefreshSettled)onRefreshSettled()'
 ])assert.ok(patient.includes(marker),marker);
 assert.ok(app.includes('tab+":"+accountSection'),"Account sections must not lose their navigation identity");
 assert.ok(app.includes('BackHandler.addEventListener("hardwareBackPress"'));
});

test("Patient E: booking controls have spoken labels, correct checked/selected semantics",()=>{
 const wizard=patient.slice(patient.indexOf("export function NativeBookingWizard("),
  patient.indexOf("export function NativeSaved("));
 for(const marker of [
  'accessibilityState={{selected:i===step,disabled:i>step}}',
  'accessibilityLabel={(i+1)+". "+label}',
  'accessibilityState={{checked:day===d}}',
  'accessibilityLabel={formatDay(d,locale,calendar)}',
  'accessibilityState={{checked:time===item.startAt}}',
  'accessibilityLabel={formatDate(item.startAt,locale,calendar)}',
  'accessibilityState={{checked:person==="self"}}',
  'accessibilityState={{checked:person===member.id}}',
  'accessibilityLabel={member.displayName}',
  'accessibilityRole="progressbar" accessibilityLabel={t.loadingData}',
  'idempotencyKey:key',
  'if(isSlotConflict(e))'
 ])assert.ok(wizard.includes(marker),marker);
 assert.ok(app.includes('accessibilityState={{selected:tab===value}}'));
 assert.ok(app.includes('accessibilityRole="tab"'));
 assert.ok(app.includes('edges={["top","bottom","left","right"]}'));
 assert.ok(app.includes('AccessibilityInfo.isReduceMotionEnabled()'));
});

test("Patient E: verified account data, booking and records remain server-owned and uncacheable",()=>{
 for(const source of [patient,reviews,family,records,support,journeys]){
  assert.ok(!source.includes("AsyncStorage"),"no private data in AsyncStorage");
  assert.ok(!source.includes("localStorage"),"no private data in LocalStorage");
 }
 assert.ok(auth.includes("expo-secure-store"));
 assert.ok(records.includes('auth.request<Records>("/v1/booking/records")'));
 assert.ok(records.includes("identityProofAcknowledged:true"));
 assert.ok(records.includes("explicitConsent:true"));
 assert.ok(journeys.includes('snapshot?.user===user&&snapshot.bookingId===bookingId?snapshot:null'));
 assert.ok(published.includes('data.source!=="verified_completed_visits"'));
 assert.ok(support.includes('snapshot?.user===user?snapshot:null'));
 assert.ok(app.includes('NativeAuthProvider'));
 assert.ok(app.includes('NativeBookingWizard'));
});

test("Patient E: integration acceptance covers two independently authenticated users in real PostgreSQL",()=>{
 for(const marker of [
  "PATIENT_PHASE_E_JOURNEY_OK",
  '"patient A reads own family"',
  '"patient B family remains empty"',
  '"another patient may not remove A\'s dependent"',
  '"adult must independently acknowledge authorization"',
  '"adult B explicitly accepts caregiver authority"',
  '"B can revoke caregiver delegation independently"',
  '"unverified patient number grants no records"',
  '"B cannot enumerate A\'s link"',
  '"B cannot read A support conversation"',
  '"B cannot reply to A support ticket"',
  '"clinical data blocked from patient support chat"',
  '"guest cannot fetch private "',
  "assert.equal(release.nativeBookingEnabled,true)"
 ])assert.ok(integration.includes(marker),marker);
 assert.ok(ci.includes("node tests/phase16-integration.mjs"));
 assert.ok(ci.includes("node tests/phase18-integration.mjs"));
 assert.ok(ci.includes("node tests/phase17-integration.mjs"));
 assert.ok(ci.includes("NODE_ENV=test node scripts/verify-test-backup-restore.mjs"));
 assert.ok(ci.includes("--platform android"));
 assert.ok(ci.includes("--platform ios"));
 assert.ok(ci.includes("pnpm typecheck"));
 assert.ok(ci.includes("pnpm test"));
});

test("Patient E: three locales and session-scoped async cleanup required across private patient features",()=>{
 for(const src of [family,records,support,published,reviews]){
  assert.ok(src.includes('"fa-AF"'),"Dari localization");
  assert.ok(src.includes('"ps-AF"'),"Pashto localization");
  assert.ok(src.includes('locale==="en"'),"English LTR navigation");
 }
 for(const src of [family,records,support,journeys]){
  assert.ok(src.includes("return()=>{live=false}")||
    src.includes("return()=>{active=false}"),"cancel async requests on unmount");
 }
 assert.ok(app.includes("flexDirection:ui.flow"));
 assert.ok(app.includes('keyboardShouldPersistTaps="handled"'));
 assert.ok(patient.includes('direction:locale==="en"?"ltr":"rtl"'));
});
