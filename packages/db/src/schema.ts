import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/** Better Auth-owned tables. Do not accept roles from client signup payloads. */
export const user = pgTable("auth_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  locale: text("locale").notNull().default("fa-AF"),
  calendar: text("calendar").notNull().default("solar_hijri")
});

export const session = pgTable("auth_sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
}, (table) => [index("auth_sessions_user_idx").on(table.userId)]);

export const account = pgTable("auth_accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("auth_accounts_user_idx").on(table.userId)]);

export const verification = pgTable("auth_verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("auth_verifications_identifier_idx").on(table.identifier)]);

export const twoFactor = pgTable("auth_two_factors", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  verified: boolean("verified").notNull().default(false),
  failedVerificationCount: integer("failed_verification_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true })
}, (table) => [uniqueIndex("auth_two_factors_user_idx").on(table.userId)]);

/** Only a private, trusted operator command can grant this membership. */
export const platformAdmin = pgTable("platform_admins", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  grantedBy: text("granted_by"),
  revokedAt: timestamp("revoked_at", { withTimezone: true })
});

export const auditEvent = pgTable("audit_events", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  clinicId: text("clinic_id"),
  action: text("action").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id"),
  outcome: text("outcome").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("audit_events_actor_idx").on(table.actorId, table.createdAt)]);

export const outboxEvent = pgTable("outbox_events", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  state: text("state").notNull().default("pending"),
  safePayload: text("safe_payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("outbox_events_pending_idx").on(table.state, table.availableAt)]);


/** PH02 practice tenancy: one owner per clinic until staff memberships ship in PH03. */
export const clinic = pgTable("clinics", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => user.id),
  legalName: text("legal_name").notNull(),
  displayName: text("display_name").notNull(),
  clinicType: text("clinic_type").notNull(),
  province: text("province").notNull(),
  city: text("city").notNull(),
  district: text("district"),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  licenseNumber: text("license_number"),
  timezone: text("timezone").notNull().default("Asia/Kabul"),
  status: text("status").notNull().default("draft"),
  selectedPlanId: text("selected_plan_id").references(() => planVersion.id),
  revision: integer("revision").notNull().default(1),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, table => [index("clinics_owner_idx").on(table.ownerUserId), uniqueIndex("clinics_license_idx").on(table.licenseNumber)]);

export const planVersion = pgTable("platform_plan_versions", {
  id: text("id").primaryKey(),
  planKey: text("plan_key").notNull(),
  version: integer("version").notNull(),
  label: text("label").notNull(),
  billingPeriod: text("billing_period").notNull(),
  priceAfn: integer("price_afn").notNull(),
  staffLimit: integer("staff_limit").notNull(),
  branchLimit: integer("branch_limit").notNull().default(1),
  trialDays: integer("trial_days").notNull().default(14),
  graceDays: integer("grace_days").notNull().default(7),
  entitlements: text("entitlements").notNull().default("core"),
  active: boolean("active").notNull().default(true),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, table => [uniqueIndex("plan_key_version_period_idx").on(table.planKey,table.version,table.billingPeriod)]);

export const clinicSubscription = pgTable("clinic_subscriptions", {
  id: text("id").primaryKey(),
  clinicId: text("clinic_id").notNull().unique().references(() => clinic.id),
  planVersionId: text("plan_version_id").notNull().references(() => planVersion.id),
  status: text("status").notNull().default("trialing"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
  pendingPlanVersionId: text("pending_plan_version_id").references(() => planVersion.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const platformInvoice = pgTable("platform_subscription_invoices", {
  id: text("id").primaryKey(),
  clinicId: text("clinic_id").notNull().references(() => clinic.id),
  planVersionId: text("plan_version_id").notNull().references(() => planVersion.id),
  amountAfn: integer("amount_afn").notNull(),
  status: text("status").notNull().default("awaiting"),
  evidenceReference: text("evidence_reference"),
  verifiedBy: text("verified_by").references(() => user.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  periodEndsAt: timestamp("period_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
},table=>[index("platform_invoice_clinic_idx").on(table.clinicId)]);

export const clinicEvidence = pgTable("clinic_evidence", {
  id: text("id").primaryKey(),
  clinicId: text("clinic_id").notNull().references(() => clinic.id),
  kind: text("kind").notNull(),
  fileName: text("file_name").notNull(),
  mime: text("mime").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  digest: text("digest").notNull(),
  content: text("content").notNull(),
  uploadedBy: text("uploaded_by").notNull().references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
},table=>[index("clinic_evidence_clinic_idx").on(table.clinicId)]);

export const clinicReview = pgTable("clinic_review_events", {
  id: text("id").primaryKey(),
  clinicId: text("clinic_id").notNull().references(() => clinic.id),
  actorId: text("actor_id").notNull().references(() => user.id),
  action: text("action").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
},table=>[index("clinic_review_clinic_idx").on(table.clinicId,table.createdAt)]);


/** Clinic role grants are tenant-local. No user global role can grant clinical access. */
export const clinicMembership = pgTable("clinic_memberships", {
  id: text("id").primaryKey(),
  clinicId: text("clinic_id").notNull().references(() => clinic.id),
  userId: text("user_id").notNull().references(() => user.id),
  role: text("role").notNull(),
  clinicianEnabled: boolean("clinician_enabled").notNull().default(false),
  status: text("status").notNull().default("active"),
  invitedBy: text("invited_by").references(() => user.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  reason: text("reason")
}, t => [
  uniqueIndex("clinic_membership_unique").on(t.clinicId, t.userId),
  index("clinic_membership_user_status_idx").on(t.userId, t.status),
  index("clinic_membership_clinic_status_idx").on(t.clinicId, t.status, t.role)
]);

export const clinicInvitation = pgTable("clinic_invitations", {
  id: text("id").primaryKey(),
  clinicId: text("clinic_id").notNull().references(() => clinic.id),
  email: text("email").notNull(),
  role: text("role").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionReason: text("resolution_reason"),
  invitedBy: text("invited_by").notNull().references(() => user.id),
  acceptedBy: text("accepted_by").references(() => user.id),
  resendCount: integer("resend_count").notNull().default(0)
}, t => [index("clinic_invite_clinic_status_idx").on(t.clinicId, t.status, t.createdAt)]);

export const dentistDraft = pgTable("clinic_dentist_drafts", {
  membershipId: text("membership_id").primaryKey().references(() => clinicMembership.id),
  clinicId: text("clinic_id").notNull().references(() => clinic.id),
  userId: text("user_id").notNull().references(() => user.id),
  displayName: text("display_name").notNull(),
  specialty: text("specialty"),
  qualifications: text("qualifications"),
  professionalLicense: text("professional_license"),
  experienceYears: integer("experience_years"),
  biography: text("biography"),
  draftVersion: integer("draft_version").notNull().default(1),
  verificationState: text("verification_state").notNull().default("unverified"),
  updatedBy: text("updated_by").references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, t => [index("dentist_drafts_clinic_idx").on(t.clinicId)]);


/** PH05 clinic-local demographic registry; never expose in patient marketplace APIs. */
export const clinicPatientCounter = pgTable("clinic_patient_counters", {
  clinicId: text("clinic_id").primaryKey().references(()=>clinic.id),
  nextNumber: integer("next_number").notNull().default(1)
});

export const clinicPatient = pgTable("clinic_patients", {
  id: text("id").primaryKey(),
  clinicId: text("clinic_id").notNull().references(()=>clinic.id),
  patientNumber: text("patient_number").notNull(),
  preferredName: text("preferred_name").notNull(),
  familyName: text("family_name"),
  normalizedName: text("normalized_name").notNull(),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  alternateContact: text("alternate_contact"),
  dateOfBirth: date("date_of_birth",{mode:"string"}),
  ageEstimate: integer("age_estimate"),
  dobIsEstimated: boolean("dob_is_estimated").notNull().default(false),
  province: text("province"),
  city: text("city"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  importSourceId: text("import_source_id"),
  status: text("status").notNull().default("active"),
  noticeAcknowledged: boolean("notice_acknowledged").notNull().default(false),
  noticeAcknowledgedAt: timestamp("notice_acknowledged_at",{withTimezone:true}),
  intakeSource: text("intake_source").notNull().default("frontdesk"),
  revision: integer("revision").notNull().default(1),
  createdBy: text("created_by").notNull().references(()=>user.id),
  updatedBy: text("updated_by").notNull().references(()=>user.id),
  createdAt: timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
  updatedAt: timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
  uniqueIndex("unique_clinic_patient_number").on(t.clinicId,t.patientNumber),
  uniqueIndex("unique_clinic_import_source").on(t.clinicId,t.importSourceId),
  index("clinic_patients_list_idx").on(t.clinicId,t.status,t.updatedAt,t.id),
  index("clinic_patients_search_idx").on(t.clinicId,t.normalizedName,t.phone),
  index("clinic_patients_phone_idx").on(t.clinicId,t.phone)
]);

/** Separate sensitive intake. Returned only to verified qualified clinical members. */
export const clinicPatientIntake = pgTable("clinic_patient_intakes", {
  patientId: text("patient_id").primaryKey().references(()=>clinicPatient.id),
  clinicId: text("clinic_id").notNull().references(()=>clinic.id),
  allergiesStatus: text("allergies_status").notNull().default("unknown"),
  allergiesNotes: text("allergies_notes"),
  medicationsStatus: text("medications_status").notNull().default("unknown"),
  medicationsNotes: text("medications_notes"),
  conditionsStatus: text("conditions_status").notNull().default("unknown"),
  conditionsNotes: text("conditions_notes"),
  sourceKind: text("source_kind").notNull().default("not_collected"),
  sourceDate: date("source_date",{mode:"string"}),
  revision: integer("revision").notNull().default(1),
  recordedBy: text("recorded_by").references(()=>user.id),
  updatedAt: timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("clinic_patient_intakes_clinic_idx").on(t.clinicId)]);

export const clinicPatientImportJob = pgTable("clinic_patient_import_jobs", {
  id: text("id").primaryKey(),
  clinicId: text("clinic_id").notNull().references(()=>clinic.id),
  createdBy: text("created_by").notNull().references(()=>user.id),
  digest: text("digest").notNull(),
  rowCount: integer("row_count").notNull(),
  state: text("state").notNull().default("processing"),
  created: integer("created").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  needsReview: integer("needs_review").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  createdAt: timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
  updatedAt: timestamp("updated_at",{withTimezone:true}).notNull().defaultNow(),
  completedAt: timestamp("completed_at",{withTimezone:true})
},t=>[index("patient_import_jobs_clinic_idx").on(t.clinicId,t.createdAt)]);

export const clinicPatientImportRow = pgTable("clinic_patient_import_rows", {
  jobId: text("job_id").notNull().references(()=>clinicPatientImportJob.id),
  rowNumber: integer("row_number").notNull(),
  result: text("result").notNull(),
  code: text("code").notNull(),
  patientId: text("patient_id").references(()=>clinicPatient.id)
},t=>[uniqueIndex("patient_import_row_unique").on(t.jobId,t.rowNumber)]);


/** PH04 tenant-private configurable services, operatory resources and schedule policies. */
export const clinicService = pgTable("clinic_services", {
  id:text("id").primaryKey(),
  clinicId:text("clinic_id").notNull().references(()=>clinic.id),
  name:text("name").notNull(), category:text("category").notNull(),
  description:text("description"),durationMinutes:integer("duration_minutes").notNull(),
  preparationMinutes:integer("preparation_minutes").notNull().default(0),
  basePriceAfn:integer("base_price_afn").notNull(),
  requiresChair:boolean("requires_chair").notNull().default(true),
  publicBooking:boolean("public_booking").notNull().default(false),
  active:boolean("active").notNull().default(true),
  version:integer("version").notNull().default(1),
  createdBy:text("created_by").notNull().references(()=>user.id),
  updatedBy:text("updated_by").notNull().references(()=>user.id),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
  updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
  uniqueIndex("clinic_services_clinic_name_key").on(t.clinicId,t.name),
  index("clinic_services_active_idx").on(t.clinicId,t.active,t.category,t.name)
]);

export const clinicServiceVersion = pgTable("clinic_service_versions", {
  serviceId:text("service_id").notNull().references(()=>clinicService.id),
  clinicId:text("clinic_id").notNull().references(()=>clinic.id),
  version:integer("version").notNull(),
  name:text("name").notNull(), category:text("category").notNull(),
  description:text("description"),
  durationMinutes:integer("duration_minutes").notNull(),
  preparationMinutes:integer("preparation_minutes").notNull(),
  basePriceAfn:integer("base_price_afn").notNull(),
  requiresChair:boolean("requires_chair").notNull(),
  publicBooking:boolean("public_booking").notNull(),
  active:boolean("active").notNull(),
  changedBy:text("changed_by").notNull().references(()=>user.id),
  changedAt:timestamp("changed_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
  uniqueIndex("service_history_unique").on(t.serviceId,t.version),
  index("clinic_service_versions_scope_idx").on(t.clinicId,t.serviceId)
]);

export const clinicResource = pgTable("clinic_resources", {
  id:text("id").primaryKey(),
  clinicId:text("clinic_id").notNull().references(()=>clinic.id),
  code:text("code").notNull(),label:text("label").notNull(),
  kind:text("kind").notNull().default("chair"),equipment:text("equipment"),
  active:boolean("active").notNull().default(true),
  revision:integer("revision").notNull().default(1),
  createdBy:text("created_by").notNull().references(()=>user.id),
  updatedBy:text("updated_by").notNull().references(()=>user.id),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
  updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
  uniqueIndex("clinic_resources_clinic_code_key").on(t.clinicId,t.code),
  index("clinic_resources_active_idx").on(t.clinicId,t.active)
]);

const clinicShiftColumns={
  clinicId:text("clinic_id").notNull().references(()=>clinic.id),
  weekday:integer("weekday").notNull(),isOpen:boolean("is_open").notNull().default(false),
  startMinute:integer("start_minute").notNull().default(540),
  endMinute:integer("end_minute").notNull().default(1020),
  breaks:jsonb("breaks").$type<{start:number,end:number}[]>().notNull().default([]),
  revision:integer("revision").notNull().default(1),
  updatedBy:text("updated_by").references(()=>user.id),
  updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
};
export const clinicWeeklyHour=pgTable("clinic_weekly_hours",clinicShiftColumns,t=>[
  uniqueIndex("clinic_weekly_hours_unique").on(t.clinicId,t.weekday)
]);
export const clinicProviderHour=pgTable("clinic_provider_hours",{
  ...clinicShiftColumns,
  membershipId:text("membership_id").notNull().references(()=>clinicMembership.id)
},t=>[
  uniqueIndex("clinic_provider_hours_unique").on(t.clinicId,t.membershipId,t.weekday),
  index("clinic_provider_hours_clinic_idx").on(t.clinicId,t.weekday)
]);
export const clinicResourceHour=pgTable("clinic_resource_hours",{
  ...clinicShiftColumns,
  resourceId:text("resource_id").notNull().references(()=>clinicResource.id)
},t=>[
  uniqueIndex("clinic_resource_hours_unique").on(t.clinicId,t.resourceId,t.weekday)
]);
export const clinicScheduleException=pgTable("clinic_schedule_exceptions",{
  id:text("id").primaryKey(),
  clinicId:text("clinic_id").notNull().references(()=>clinic.id),
  startDate:date("start_date",{mode:"string"}).notNull(),
  endDate:date("end_date",{mode:"string"}).notNull(),
  kind:text("kind").notNull(),
  startMinute:integer("start_minute"),endMinute:integer("end_minute"),
  reason:text("reason").notNull(),revision:integer("revision").notNull().default(1),
  createdBy:text("created_by").notNull().references(()=>user.id),
  createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("clinic_exception_date_idx").on(t.clinicId,t.startDate,t.endDate)]);


/** PH06 real clinic appointment calendar. Never expose in public or patient APIs. */
export const clinicAppointment = pgTable("clinic_appointments",{
 id:text("id").primaryKey(),
 clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 serviceId:text("service_id").notNull().references(()=>clinicService.id),
 providerMembershipId:text("provider_membership_id").notNull().references(()=>clinicMembership.id),
 resourceId:text("resource_id").references(()=>clinicResource.id),
 serviceVersion:integer("service_version").notNull(),
 serviceName:text("service_name").notNull(),
 serviceCategory:text("service_category").notNull(),
 servicePriceAfn:integer("service_price_afn").notNull(),
 serviceDurationMinutes:integer("service_duration_minutes").notNull(),
 preparationMinutes:integer("preparation_minutes").notNull(),
 startAt:timestamp("start_at",{withTimezone:true}).notNull(),
 endAt:timestamp("end_at",{withTimezone:true}).notNull(),
 status:text("status").notNull().default("confirmed"),
 source:text("source").notNull(),
 administrativeNote:text("administrative_note"),
 revision:integer("revision").notNull().default(1),
 arrivedAt:timestamp("arrived_at",{withTimezone:true}),
 startedAt:timestamp("started_at",{withTimezone:true}),
 completedAt:timestamp("completed_at",{withTimezone:true}),
 cancelledAt:timestamp("cancelled_at",{withTimezone:true}),
 noShowAt:timestamp("no_show_at",{withTimezone:true}),
 createdBy:text("created_by").notNull().references(()=>user.id),
 updatedBy:text("updated_by").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
 index("appointment_clinic_date_idx").on(t.clinicId,t.startAt),
 index("appointment_clinic_status_date_idx").on(t.clinicId,t.status,t.startAt),
 index("appointment_clinic_patient_idx").on(t.clinicId,t.patientId,t.startAt),
 index("appointment_provider_date_idx").on(t.clinicId,t.providerMembershipId,t.startAt),
 index("appointment_resource_date_idx").on(t.clinicId,t.resourceId,t.startAt)
]);
export const clinicAppointmentEvent = pgTable("clinic_appointment_events",{
 id:text("id").primaryKey(),
 clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 appointmentId:text("appointment_id").notNull().references(()=>clinicAppointment.id),
 action:text("action").notNull(),
 beforeStatus:text("before_status"),afterStatus:text("after_status").notNull(),
 beforeStartAt:timestamp("before_start_at",{withTimezone:true}),
 beforeEndAt:timestamp("before_end_at",{withTimezone:true}),
 afterStartAt:timestamp("after_start_at",{withTimezone:true}).notNull(),
 afterEndAt:timestamp("after_end_at",{withTimezone:true}).notNull(),
 reason:text("reason"),
 actorId:text("actor_id").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("appointment_event_timeline_idx").on(t.clinicId,t.appointmentId,t.createdAt,t.id)]);
export const clinicAppointmentAction=pgTable("clinic_appointment_actions",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 actorId:text("actor_id").notNull().references(()=>user.id),
 actionKey:text("action_key").notNull(),operation:text("operation").notNull(),
 requestDigest:text("request_digest").notNull(),
 appointmentId:text("appointment_id").notNull().references(()=>clinicAppointment.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
 uniqueIndex("clinic_appointment_actions_clinic_id_actor_id_action_key_key").on(t.clinicId,t.actorId,t.actionKey),
 index("appointment_action_date_idx").on(t.clinicId,t.createdAt)
]);


/** PH07 clinic-scoped encounters. Signed content is protected by a PostgreSQL trigger. */
export const clinicEncounter=pgTable("clinic_encounters",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 appointmentId:text("appointment_id").unique().references(()=>clinicAppointment.id),
 providerMembershipId:text("provider_membership_id").notNull().references(()=>clinicMembership.id),
 createdBy:text("created_by").notNull().references(()=>user.id),
 status:text("status").notNull().default("draft"),
 revision:integer("revision").notNull().default(1),reason:text("reason").notNull(),
 historySource:text("history_source"),historyDate:date("history_date",{mode:"string"}),
 findings:text("findings").notNull().default(""),assessment:text("assessment").notNull().default(""),
 performedProcedures:jsonb("performed_procedures").$type<{description:string;serviceId:string|null;toothIds:string[]}[]>().notNull().default([]),
 followUp:text("follow_up"),signedBy:text("signed_by").references(()=>user.id),
 signedAt:timestamp("signed_at",{withTimezone:true}),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
 index("clinic_encounter_patient_idx").on(t.clinicId,t.patientId,t.createdAt),
 index("clinic_encounter_provider_idx").on(t.clinicId,t.providerMembershipId,t.status,t.updatedAt),
 index("clinic_encounter_creator_idx").on(t.clinicId,t.createdBy,t.status,t.updatedAt)
]);

/** Append-only clinical chronology: draft revisions, signing and corrections. */
export const clinicEncounterVersion=pgTable("clinic_encounter_versions",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 encounterId:text("encounter_id").notNull().references(()=>clinicEncounter.id),
 revision:integer("revision").notNull(),action:text("action").notNull(),
 note:jsonb("note").$type<{reason:string;findings:string;assessment:string;historySource:string|null;
  historyDate:string|null;performedProcedures:{description:string;serviceId:string|null;toothIds:string[]}[];
  followUp:string|null}>().notNull(),
 correctionReason:text("correction_reason"),
 actorId:text("actor_id").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
 uniqueIndex("clinic_encounter_version_unique").on(t.encounterId,t.revision),
 index("clinic_encounter_versions_history_idx").on(t.clinicId,t.encounterId,t.revision)
]);

/** Encrypted volume / database at rest and a PH19 retention policy are deployment gates. */
export const clinicClinicalFile=pgTable("clinic_clinical_files",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 encounterId:text("encounter_id").references(()=>clinicEncounter.id),
 title:text("title").notNull(),kind:text("kind").notNull(),fileName:text("file_name").notNull(),
 mime:text("mime").notNull(),sizeBytes:integer("size_bytes").notNull(),sha256:text("sha256").notNull(),
 notes:text("notes"),scanStatus:text("scan_status").notNull().default("signature_verified"),
 uploadedBy:text("uploaded_by").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
 index("clinic_clinical_files_patient_idx").on(t.clinicId,t.patientId,t.createdAt),
 index("clinic_clinical_files_encounter_idx").on(t.clinicId,t.encounterId,t.createdAt)
]);


/** PH08 FDI chart. Clinical observations are immutable; the only permitted update
 * is a qualified clinician stamping a draft as validated (SQL trigger enforced).
 * "Current" is derived from the most recent VALIDATED date per tooth. */
export const clinicToothObservation=pgTable("clinic_tooth_observations",{
 id:text("id").primaryKey(),
 clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 encounterId:text("encounter_id").notNull().references(()=>clinicEncounter.id),
 providerMembershipId:text("provider_membership_id").notNull().references(()=>clinicMembership.id),
 toothCode:text("tooth_code").notNull(),
 dentition:text("dentition").notNull(),
 condition:text("condition").notNull(),
 surfaces:jsonb("surfaces").$type<string[]>().notNull().default([]),
 notes:text("notes"),
 observationDate:date("observation_date",{mode:"string"}).notNull(),
 status:text("status").notNull().default("draft"),
 recordedBy:text("recorded_by").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 validatedBy:text("validated_by").references(()=>user.id),
 validatedAt:timestamp("validated_at",{withTimezone:true}),
 actionKey:text("action_key").notNull(),requestDigest:text("request_digest").notNull()
},t=>[
 uniqueIndex("tooth_observation_unique_action").on(t.clinicId,t.recordedBy,t.actionKey),
 index("tooth_observation_current_idx").on(t.clinicId,t.patientId,t.dentition,t.toothCode,t.observationDate,t.validatedAt),
 index("tooth_observation_visit_idx").on(t.clinicId,t.patientId,t.encounterId,t.createdAt),
 index("tooth_observation_history_idx").on(t.clinicId,t.patientId,t.toothCode,t.observationDate,t.createdAt,t.id)
]);


/** PH09: clinician-owned, versioned treatment proposals. Estimates are AFN integer
 * snapshots, not invoices or ledger entries. */
export const clinicTreatmentPlan=pgTable("clinic_treatment_plans",{
 id:text("id").primaryKey(),
 clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 clinicianMembershipId:text("clinician_membership_id").notNull().references(()=>clinicMembership.id),
 title:text("title").notNull(),indication:text("indication").notNull(),
 expectedSessions:integer("expected_sessions").notNull(),
 durationMinutes:integer("duration_minutes"),notes:text("notes"),
 status:text("status").notNull().default("draft"),
 revision:integer("revision").notNull().default(1),
 version:integer("version").notNull().default(1),
 acceptedVersion:integer("accepted_version"),consentState:text("consent_state").notNull().default("none"),
 estimateTotalAfn:integer("estimate_total_afn").notNull().default(0),
 patientReleased:boolean("patient_released").notNull().default(false),
 createdBy:text("created_by").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
 index("clinic_treatment_plans_patient_idx").on(t.clinicId,t.patientId,t.status,t.updatedAt),
 index("clinic_treatment_plans_provider_idx").on(t.clinicId,t.clinicianMembershipId,t.status,t.updatedAt)
]);

type TreatmentPriceSnapshot={
 serviceId:string;serviceVersion:number;name:string;quantity:number;
 unitPriceAfn:number;discountAfn:number;totalAfn:number;
};
/** Append-only proposal snapshots; clinician re-approval/consent is version-specific. */
export const clinicTreatmentVersion=pgTable("clinic_treatment_versions",{
 planId:text("plan_id").notNull().references(()=>clinicTreatmentPlan.id),
 clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 version:integer("version").notNull(),
 title:text("title").notNull(),indication:text("indication").notNull(),
 expectedSessions:integer("expected_sessions").notNull(),durationMinutes:integer("duration_minutes"),
 notes:text("notes"),items:jsonb("items").$type<TreatmentPriceSnapshot[]>().notNull(),
 estimateTotalAfn:integer("estimate_total_afn").notNull(),revisionReason:text("revision_reason"),
 authorId:text("author_id").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
 uniqueIndex("clinic_treatment_version_unique").on(t.planId,t.version),
 index("clinic_treatment_versions_hist_idx").on(t.clinicId,t.patientId,t.planId,t.version)
]);

/** Current and historical stage instances are version-bound; performed evidence
 * must come from an assigned signed PH07 encounter before completion. */
export const clinicTreatmentStage=pgTable("clinic_treatment_stages",{
 id:text("id").primaryKey(),
 clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 planId:text("plan_id").notNull().references(()=>clinicTreatmentPlan.id),
 version:integer("version").notNull(),position:integer("position").notNull(),
 description:text("description").notNull(),
 toothCodes:jsonb("tooth_codes").$type<string[]>().notNull().default([]),
 expectedVisits:integer("expected_visits").notNull().default(1),
 dueDate:date("due_date",{mode:"string"}),status:text("status").notNull().default("pending"),
 startedAt:timestamp("started_at",{withTimezone:true}),
 startedBy:text("started_by").references(()=>user.id),
 completedAt:timestamp("completed_at",{withTimezone:true}),
 completedBy:text("completed_by").references(()=>user.id),
 linkedEncounterId:text("linked_encounter_id").references(()=>clinicEncounter.id),
 completionNote:text("completion_note")
},t=>[
 uniqueIndex("clinic_treatment_stage_order").on(t.planId,t.version,t.position),
 index("clinic_treatment_stages_current_idx").on(t.clinicId,t.patientId,t.planId,t.version,t.position)
]);

/** Witnessed in-person consent only. No inferred electronic signature or
 * unverified patient-app release. Consent and withdrawal rows are immutable. */
export const clinicTreatmentConsent=pgTable("clinic_treatment_consents",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 planId:text("plan_id").notNull().references(()=>clinicTreatmentPlan.id),
 version:integer("version").notNull(),action:text("action").notNull(),
 patientRole:text("patient_role").notNull(),personName:text("person_name").notNull(),
 relationship:text("relationship"),witnessName:text("witness_name").notNull(),
 scopeDescription:text("scope_description").notNull(),
 acknowledgedAt:timestamp("acknowledged_at",{withTimezone:true}).notNull(),
 reason:text("reason"),actorId:text("actor_id").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("clinic_treatment_consent_history_idx").on(t.clinicId,t.patientId,t.planId,t.createdAt)]);

/** Append-only lifecycle events for staged care, proposals and consent. */
export const clinicTreatmentEvent=pgTable("clinic_treatment_events",{
 id:text("id").primaryKey(),
 clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 planId:text("plan_id").notNull().references(()=>clinicTreatmentPlan.id),
 version:integer("version").notNull(),action:text("action").notNull(),
 stageId:text("stage_id").references(()=>clinicTreatmentStage.id),
 fromStatus:text("from_status"),toStatus:text("to_status"),
 reason:text("reason"),details:jsonb("details").$type<Record<string,unknown>>().notNull().default({}),
 actorId:text("actor_id").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("clinic_treatment_events_history_idx").on(t.clinicId,t.patientId,t.planId,t.createdAt)]);


/** PH10: patient billing ledger, entirely separate from platform subscription invoices. */
export const clinicInvoiceCounter=pgTable("clinic_invoice_counters",{
 clinicId:text("clinic_id").primaryKey().references(()=>clinic.id),
 nextNumber:integer("next_number").notNull().default(1)
});
export const clinicInvoice=pgTable("clinic_invoices",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 invoiceNumber:integer("invoice_number").notNull(),status:text("status").notNull().default("draft"),
 revision:integer("revision").notNull().default(1),version:integer("version").notNull().default(1),
 sourceType:text("source_type").notNull(),sourceId:text("source_id").notNull(),
 totalAfn:integer("total_afn").notNull(),dueDate:date("due_date",{mode:"string"}),
 issuedAt:timestamp("issued_at",{withTimezone:true}),voidedAt:timestamp("voided_at",{withTimezone:true}),
 voidReason:text("void_reason"),internalNote:text("internal_note"),
 createdBy:text("created_by").notNull().references(()=>user.id),
 issuedBy:text("issued_by").references(()=>user.id),voidedBy:text("voided_by").references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>[uniqueIndex("clinic_invoices_clinic_number_unique").on(t.clinicId,t.invoiceNumber),
 index("clinic_invoices_patient_idx").on(t.clinicId,t.patientId,t.createdAt),
 index("clinic_invoices_status_idx").on(t.clinicId,t.status,t.dueDate,t.issuedAt)]);

type ClinicInvoiceLine={serviceId:string;serviceVersion:number;name:string;quantity:number;
 unitPriceAfn:number;discountAfn:number;totalAfn:number};
/** Every draft revision creates a new immutable snapshot. Issued terms cannot change. */
export const clinicInvoiceVersion=pgTable("clinic_invoice_versions",{
 invoiceId:text("invoice_id").notNull().references(()=>clinicInvoice.id),
 clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 version:integer("version").notNull(),
 items:jsonb("items").$type<ClinicInvoiceLine[]>().notNull(),
 totalAfn:integer("total_afn").notNull(),
 note:text("note"),authorId:text("author_id").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[uniqueIndex("clinic_invoice_versions_unique").on(t.invoiceId,t.version),
 index("clinic_invoice_versions_history_idx").on(t.clinicId,t.patientId,t.invoiceId,t.version)]);

/** Append-only, idempotent payments and credits. Reversal is a compensating entry;
 * manual reversal is NOT a funds transfer or refund. */
export const clinicPaymentEntry=pgTable("clinic_payment_entries",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 invoiceId:text("invoice_id").notNull().references(()=>clinicInvoice.id),
 kind:text("kind").notNull(),amountAfn:integer("amount_afn").notNull(),
 method:text("method").notNull(),reference:text("reference"),note:text("note"),
 reversesEntryId:text("reverses_entry_id"),
 actionKey:text("action_key").notNull(),requestDigest:text("request_digest").notNull(),
 occurredAt:timestamp("occurred_at",{withTimezone:true}).notNull().defaultNow(),
 createdBy:text("created_by").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[uniqueIndex("clinic_payment_entries_action_unique").on(t.clinicId,t.createdBy,t.actionKey),
 index("clinic_payment_entries_invoice_idx").on(t.clinicId,t.invoiceId,t.createdAt),
 index("clinic_payment_entries_clinic_idx").on(t.clinicId,t.createdAt)]);

export const clinicInvoiceEvent=pgTable("clinic_invoice_events",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 patientId:text("patient_id").notNull().references(()=>clinicPatient.id),
 invoiceId:text("invoice_id").notNull().references(()=>clinicInvoice.id),
 action:text("action").notNull(),version:integer("version").notNull(),reason:text("reason"),
 actorId:text("actor_id").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("clinic_invoice_events_history_idx").on(t.clinicId,t.invoiceId,t.createdAt)]);


/** PH11: clinic operational costs; never linked to patient invoices or treatment. */
export const clinicExpenseCounter=pgTable("clinic_expense_counters",{
 clinicId:text("clinic_id").primaryKey().references(()=>clinic.id),
 nextNumber:integer("next_number").notNull().default(1)
});
export const clinicExpense=pgTable("clinic_expenses",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 expenseNumber:integer("expense_number").notNull(),
 revision:integer("revision").notNull().default(1),
 status:text("status").notNull().default("posted"),
 expenseDate:date("expense_date",{mode:"string"}).notNull(),
 category:text("category").notNull(),description:text("description").notNull(),
 amountAfn:integer("amount_afn").notNull(),paymentMethod:text("payment_method").notNull(),
 reference:text("reference"),attribution:text("attribution"),voidReason:text("void_reason"),
 createdBy:text("created_by").notNull().references(()=>user.id),
 updatedBy:text("updated_by").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
 uniqueIndex("clinic_expenses_clinic_number").on(t.clinicId,t.expenseNumber),
 index("clinic_expenses_period_idx").on(t.clinicId,t.expenseDate,t.id),
 index("clinic_expenses_category_idx").on(t.clinicId,t.status,t.category,t.expenseDate)
]);

/** Up to 1 MB of verified PDF/JPEG/PNG evidence per expense version. No public URLs. */
export const clinicExpenseReceipt=pgTable("clinic_expense_receipts",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 expenseId:text("expense_id").notNull().references(()=>clinicExpense.id),
 version:integer("version").notNull(),fileName:text("file_name").notNull(),
 mimeType:text("mime_type").notNull(),byteLength:integer("byte_length").notNull(),
 sha256Hex:text("sha256_hex").notNull(),
 // Drizzle schema tracks metadata; binary bytes are served by a guarded SQL route,
 // never exposed by the ordinary list/detail queries.
 uploadedBy:text("uploaded_by").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
 uniqueIndex("clinic_expense_receipts_version_unique").on(t.expenseId,t.version),
 index("clinic_expense_receipts_idx").on(t.clinicId,t.expenseId,t.version)
]);

/** Every correction or void creates an immutable historical copy, including provenance. */
export const clinicExpenseVersion=pgTable("clinic_expense_versions",{
 id:text("id").primaryKey(),expenseId:text("expense_id").notNull().references(()=>clinicExpense.id),
 clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 version:integer("version").notNull(),action:text("action").notNull(),
 expenseDate:date("expense_date",{mode:"string"}).notNull(),
 category:text("category").notNull(),description:text("description").notNull(),
 amountAfn:integer("amount_afn").notNull(),paymentMethod:text("payment_method").notNull(),
 reference:text("reference"),attribution:text("attribution"),
 receiptId:text("receipt_id").references(()=>clinicExpenseReceipt.id),
 correctionReason:text("correction_reason"),
 actorId:text("actor_id").notNull().references(()=>user.id),
 actionKey:text("action_key").notNull(),requestDigest:text("request_digest").notNull(),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[
 uniqueIndex("clinic_expense_versions_version_unique").on(t.expenseId,t.version),
 uniqueIndex("clinic_expense_versions_action_unique").on(t.clinicId,t.actorId,t.actionKey),
 index("clinic_expense_versions_hist_idx").on(t.clinicId,t.expenseId,t.version)
]);


/** PH12 public-facing listing revisions remain independent of sensitive clinical data. */
export const dentistCredentialCase=pgTable("clinic_dentist_credential_cases",{
 membershipId:text("membership_id").primaryKey().references(()=>clinicMembership.id),
 clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 status:text("status").notNull().default("unverified"),
 currentSubmissionId:text("current_submission_id"),
 approvedDraftVersion:integer("approved_draft_version"),
 validUntil:date("valid_until",{mode:"string"}),
 verifiedSnapshot:jsonb("verified_snapshot").$type<Record<string,unknown>>(),
 reviewedBy:text("reviewed_by").references(()=>user.id),
 reviewedAt:timestamp("reviewed_at",{withTimezone:true}),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("dentist_credential_cases_idx").on(t.clinicId,t.status)]);
export const dentistCredentialSubmission=pgTable("clinic_dentist_credential_submissions",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 membershipId:text("membership_id").notNull().references(()=>clinicMembership.id),
 draftVersion:integer("draft_version").notNull(),credentialType:text("credential_type").notNull(),
 credentialNumber:text("credential_number").notNull(),
 validUntil:date("valid_until",{mode:"string"}).notNull(),
 fileName:text("file_name").notNull(),mimeType:text("mime_type").notNull(),
 sizeBytes:integer("size_bytes").notNull(),sha256Hex:text("sha256_hex").notNull(),
 submittedBy:text("submitted_by").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("dentist_credential_submission_idx").on(t.clinicId,t.membershipId,t.createdAt)]);
export const dentistCredentialDecision=pgTable("clinic_dentist_credential_decisions",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 membershipId:text("membership_id").notNull().references(()=>clinicMembership.id),
 submissionId:text("submission_id").references(()=>dentistCredentialSubmission.id),
 decision:text("decision").notNull(),reason:text("reason").notNull(),
 reviewBasis:text("review_basis"),actorId:text("actor_id").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("dentist_credential_decisions_idx").on(t.clinicId,t.membershipId,t.createdAt)]);
export type ClinicListingProfile={
 description:string;specialties:string[];photoIds:{id:string;caption:string}[];
 dentistIds:string[];serviceIds:string[];bookingRules:{
 approvalMode:"manual"|"auto";minNoticeHours:number;horizonDays:number;
 cancellationHours:number;bufferMinutes:number};
 latitude:number|null;longitude:number|null;contactNote:string|null;
};
export const clinicListingHead=pgTable("clinic_listing_heads",{
 clinicId:text("clinic_id").primaryKey().references(()=>clinic.id),
 revision:integer("revision").notNull().default(0),
 draftVersion:integer("draft_version"),pendingVersion:integer("pending_version"),
 approvedVersion:integer("approved_version"),hidden:boolean("hidden").notNull().default(false),
 hiddenReason:text("hidden_reason"),hiddenBy:text("hidden_by").references(()=>user.id),
 hiddenAt:timestamp("hidden_at",{withTimezone:true}),
 publishedAt:timestamp("published_at",{withTimezone:true}),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
});
export const clinicListingVersion=pgTable("clinic_listing_versions",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 version:integer("version").notNull(),status:text("status").notNull(),
 profile:jsonb("profile").$type<ClinicListingProfile>().notNull(),
 submittedAt:timestamp("submitted_at",{withTimezone:true}),
 reviewedAt:timestamp("reviewed_at",{withTimezone:true}),
 reviewedBy:text("reviewed_by").references(()=>user.id),
 decisionReason:text("decision_reason"),
 createdBy:text("created_by").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[uniqueIndex("clinic_listing_versions_clinic_version").on(t.clinicId,t.version),
 index("clinic_listing_versions_idx").on(t.clinicId,t.status,t.version)]);
export const clinicListingPhoto=pgTable("clinic_listing_photos",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 mimeType:text("mime_type").notNull(),sizeBytes:integer("size_bytes").notNull(),
 fileName:text("file_name").notNull(),sha256Hex:text("sha256_hex").notNull(),
 rightsAttested:boolean("rights_attested").notNull().default(true),
 uploadedBy:text("uploaded_by").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("clinic_listing_photos_idx").on(t.clinicId,t.createdAt)]);
export const clinicListingEvent=pgTable("clinic_listing_events",{
 id:text("id").primaryKey(),clinicId:text("clinic_id").notNull().references(()=>clinic.id),
 version:integer("version"),action:text("action").notNull(),reason:text("reason"),
 actorId:text("actor_id").notNull().references(()=>user.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},t=>[index("clinic_listing_events_idx").on(t.clinicId,t.createdAt)]);
