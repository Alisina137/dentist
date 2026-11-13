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
