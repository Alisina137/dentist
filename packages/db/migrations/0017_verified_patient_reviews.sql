-- PH17: verified completed-visit reviews. No reviews fabricated and no patient names public.
-- One patient-portal booking => at most one review across all versions. Exclusion applies
-- equally to staff, pending, rejected and withdrawn records.
CREATE TABLE patient_visit_reviews (
 id text PRIMARY KEY,
 booking_id text NOT NULL UNIQUE REFERENCES patient_public_bookings(id),
 clinic_id text NOT NULL REFERENCES clinics(id),
 dentist_id text NOT NULL REFERENCES clinic_memberships(id),
 owner_user_id text NOT NULL REFERENCES patient_profiles(user_id),
 current_version integer NOT NULL DEFAULT 1 CHECK(current_version > 0),
 published_version integer CHECK(published_version > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 withdrawn_at timestamptz,
 CHECK (published_version IS NULL OR published_version <= current_version)
);
CREATE INDEX patient_reviews_owner_idx ON patient_visit_reviews(owner_user_id,created_at DESC);
CREATE INDEX patient_reviews_clinic_public_idx ON patient_visit_reviews(clinic_id,published_version);
CREATE INDEX patient_reviews_dentist_public_idx ON patient_visit_reviews(dentist_id,published_version);

CREATE TABLE patient_review_versions (
 id text PRIMARY KEY,
 review_id text NOT NULL REFERENCES patient_visit_reviews(id),
 version integer NOT NULL CHECK(version > 0),
 stars smallint NOT NULL CHECK(stars BETWEEN 1 AND 5),
 headline text NOT NULL CHECK(length(headline) BETWEEN 5 AND 100),
 feedback text NOT NULL CHECK(length(feedback) BETWEEN 20 AND 1200),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','published','rejected')),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 decided_by text REFERENCES auth_users(id),
 decided_at timestamptz,
 decision_category text CHECK(decision_category IN
  ('policy_compliant','personal_data','clinical_details','harassment','spam','unrelated')),
 decision_note text,
 UNIQUE(review_id,version),
 CHECK ((state='pending' AND decided_at IS NULL AND decided_by IS NULL)
  OR (state IN ('published','rejected') AND decided_at IS NOT NULL AND decided_by IS NOT NULL))
);
CREATE INDEX patient_review_versions_state_idx ON patient_review_versions(state,submitted_at);

-- Every change/decision is permanently traceable. A published prior version
-- remains visible until a new version receives explicit independent approval.
CREATE TABLE patient_review_events (
 id text PRIMARY KEY,
 review_id text NOT NULL REFERENCES patient_visit_reviews(id),
 version integer NOT NULL,
 actor_id text NOT NULL REFERENCES auth_users(id),
 action text NOT NULL CHECK(action IN (
  'submitted','edited','approved','rejected','withdrawn','reported',
  'report_dismissed','report_removed','appealed','appeal_upheld','appeal_overturned')),
 explanation text,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_review_events_review_idx ON patient_review_events(review_id,occurred_at);

CREATE TABLE patient_review_reports (
 id text PRIMARY KEY,
 review_id text NOT NULL REFERENCES patient_visit_reviews(id),
 version integer NOT NULL,
 reporter_user_id text NOT NULL REFERENCES auth_users(id),
 category text NOT NULL CHECK(category IN
  ('personal_data','clinical_details','harassment','spam','unrelated')),
 note text NOT NULL CHECK(length(note) BETWEEN 10 AND 500),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','dismissed','removed')),
 reported_at timestamptz NOT NULL DEFAULT now(),
 decided_by text REFERENCES auth_users(id),
 decided_at timestamptz,
 decision_reason text,
 UNIQUE(review_id,version,reporter_user_id)
);
CREATE INDEX patient_review_reports_queue_idx ON patient_review_reports(state,reported_at);

CREATE TABLE patient_review_appeals (
 id text PRIMARY KEY,
 review_id text NOT NULL REFERENCES patient_visit_reviews(id),
 version integer NOT NULL,
 owner_user_id text NOT NULL REFERENCES patient_profiles(user_id),
 reason text NOT NULL CHECK(length(reason) BETWEEN 20 AND 500),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','upheld','overturned')),
 created_at timestamptz NOT NULL DEFAULT now(),
 decided_by text REFERENCES auth_users(id),
 decided_at timestamptz,
 decision_reason text,
 UNIQUE(review_id,version)
);
CREATE INDEX patient_review_appeals_queue_idx ON patient_review_appeals(state,created_at);

-- In-app notice delivery is transactional and independent of optional SMTP.
-- Only code-based status, never patient names or clinical feedback.
CREATE TABLE patient_review_notices (
 id text PRIMARY KEY,
 review_id text NOT NULL REFERENCES patient_visit_reviews(id),
 owner_user_id text NOT NULL REFERENCES patient_profiles(user_id),
 code text NOT NULL CHECK(code IN
  ('submitted','published','rejected','report_removed','appeal_upheld','appeal_overturned')),
 created_at timestamptz NOT NULL DEFAULT now(),
 seen_at timestamptz
);
CREATE INDEX patient_review_notices_owner_idx ON patient_review_notices(owner_user_id,created_at DESC);
