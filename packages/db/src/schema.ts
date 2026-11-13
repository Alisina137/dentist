import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
