-- Native clinic onboarding: owner's projected dentist count, not a verified roster.
-- Existing clinic records default to one planned dentist and remain usable.
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS planned_dentist_count integer NOT NULL DEFAULT 1;
ALTER TABLE clinics DROP CONSTRAINT IF EXISTS clinics_planned_dentist_count_range;
ALTER TABLE clinics ADD CONSTRAINT clinics_planned_dentist_count_range
 CHECK (planned_dentist_count BETWEEN 1 AND 500);
