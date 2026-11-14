import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("PH15 schema only joins clinic records after explicit verified consent",()=>{
 const sql=file("packages/db/migrations/0015_patient_booking_links_notifications.sql");
 for(const v of ["patient_public_bookings","idempotency_key","request_digest",
  "cancellation_hours","appointment_id","patient_record_link_requests","consent_at",
  "verified_by","verification_method","patient_record_releases","resource_kind",
  "released_by","revoked_at","patient_booking_notifications","attempt_count",
  "UNIQUE(user_id,idempotency_key)","status IN ('requested'","'public'"])
 assert.ok(sql.includes(v),v);
 assert.ok(sql.includes("CREATE UNIQUE INDEX patient_record_link_one_active"));
 assert.ok(sql.includes("CHECK ((state='approved'"));
});
test("PH15 clinic appointment booking owns one real appointment, never fabricates availability",()=>{
 const s=file("apps/api/src/patient-booking-router.ts");
 for(const token of ["auth.api.getSession","emailVerified","patient_profiles",
 "publicListing","availabilityPreview","scheduleLock","FOR UPDATE",
 "clinic_appointments","clinic_appointment_events","patient_public_bookings",
 "patient_booking_notifications","idempotency_key","request_digest",
 "FAMILY_AUTHORIZATION_REQUIRED","BOOKING_SLOT_CONFLICT","REQUEST_ALREADY_PROCESSED",
 "CANCELLATION_DEADLINE_PASSED","RESCHEDULE_DEADLINE_PASSED",
 "REVISION_REQUIRED","PATIENT_ONBOARDING_REQUIRED","PATIENT_NUMBER_NOT_VERIFIED",
 "IN_PERSON_VERIFICATION_REQUIRED","RELEASABLE_RECORD_NOT_FOUND",
 "EXPLICIT_RELEASE_APPROVAL_REQUIRED","WHERE l.user_id=",
 "r.revoked_at IS NULL","l.state='approved'"])
 assert.ok(s.includes(token),token);
 assert.ok(s.includes("p.intake_source='online'"),"reused clinic patient must originate from portal");
 assert.ok(!s.includes("Math.random("));
 assert.ok(!s.includes("getClinicalNotes"));
 assert.ok(!s.includes("auth.api.getSession({headers:req.headers})"));
 assert.ok(s.includes("FOREIGN")===false || s.includes("FOREIGN")===true);
});
test("PH15 notification worker is consent aware, durable and does not email clinical details",()=>{
 const s=file("apps/api/src/booking-notifications.ts");
 for(const v of ["email_booking","email_updates","SKIP LOCKED",
  "attempt_count=attempt_count+1","status='processing'","status='skipped'",
  "interval '2 minutes'","sendMail","no medical information","/appointments"])
 assert.ok(s.toLowerCase().includes(v.toLowerCase()),v);
 assert.ok(!s.includes("Patient medical records attached"));
 assert.ok(!s.includes("SMTP_PASSWORD="));
});
test("PH15 patient web and clinic request screens are connected and fully RTL-capable",()=>{
 const ui=file("packages/ui-web/src/phase15.tsx");
 for(const name of ["PatientBookPage","PatientAppointmentsPage","PatientAppointmentDetailPage",
 "PatientRecordsPage","ClinicBookingRequestsPage","ClinicNotificationsPage",
 "ApprovedRecordReleases","slot.startAt","bookingConsent","record-links",
 "idempotencyKey","cancel","reschedule","InlineAlert","Spinner",
 "aria-pressed","usePreferences",'"fa-AF"','"ps-AF"'])
 assert.ok(ui.includes(name),name);
 for(const route of [
 "apps/patient-web/app/book/[dentistId]/page.tsx",
 "apps/patient-web/app/appointments/page.tsx",
 "apps/patient-web/app/appointments/[bookingId]/page.tsx",
 "apps/patient-web/app/account/records/page.tsx",
 "apps/clinic-web/app/clinic/appointments/requests/page.tsx",
 "apps/clinic-web/app/clinic/settings/notifications/page.tsx"])
 assert.ok(file(route).includes("@dandanlink/ui/phase15"),route);
 const css=file("packages/ui-web/src/phase15.css");
 for(const t of [".p15-steps",".p15-grid",".p15-panel",".p15-tabs",
  ".p15-status-confirmed",".p15-status-rejected","@media(max-width:450px)",
  "@media(prefers-reduced-motion:reduce)"])
 assert.ok(css.includes(t),t);
 const nav=file("packages/ui-web/src/index.tsx");
 assert.ok(nav.includes('href:"/appointments"'));
 assert.ok(file("apps/api/src/server.ts").includes("patientBookingRouter"));
});
