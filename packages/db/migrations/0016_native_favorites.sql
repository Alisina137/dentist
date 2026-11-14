-- PH16: account-scoped favorite clinics/dentists; no private clinical data.
-- A favorite is not a record access grant. Listing eligibility is rechecked on each API read.
CREATE TABLE patient_favorites (
 id text PRIMARY KEY,
 user_id text NOT NULL REFERENCES patient_profiles(user_id) ON DELETE CASCADE,
 clinic_id text NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
 dentist_id text REFERENCES clinic_memberships(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX patient_favorites_clinic_unique ON patient_favorites(user_id,clinic_id)
 WHERE dentist_id IS NULL;
CREATE UNIQUE INDEX patient_favorites_dentist_unique ON patient_favorites(user_id,clinic_id,dentist_id)
 WHERE dentist_id IS NOT NULL;
CREATE INDEX patient_favorites_owner_idx ON patient_favorites(user_id,created_at DESC);
