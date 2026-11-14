-- PH13: indexed, approved-only discovery projection. This table NEVER contains PHI.
-- A search hit is a CANDIDATE; public reads also revalidate current verification and subscriptions.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE clinic_public_search_index (
 clinic_id text PRIMARY KEY REFERENCES clinics(id),
 approved_version integer NOT NULL CHECK(approved_version>0),
 clinic_name text NOT NULL,
 city text NOT NULL,
 province text NOT NULL,
 search_text text NOT NULL,
 specialties text[] NOT NULL DEFAULT '{}',
 services text[] NOT NULL DEFAULT '{}',
 dentist_names text[] NOT NULL DEFAULT '{}',
 min_fee_afn integer NOT NULL CHECK(min_fee_afn>=0),
 latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(clinic_id,approved_version) REFERENCES clinic_listing_versions(clinic_id,version)
);
CREATE INDEX public_search_text_gin ON clinic_public_search_index
 USING gin(search_text gin_trgm_ops);
CREATE INDEX public_search_name_gin ON clinic_public_search_index
 USING gin(clinic_name gin_trgm_ops);
CREATE INDEX public_search_city_idx ON clinic_public_search_index(lower(city),min_fee_afn,clinic_id);
CREATE INDEX public_search_province_idx ON clinic_public_search_index(lower(province),clinic_id);
CREATE INDEX public_search_specialties_gin ON clinic_public_search_index USING gin(specialties);
CREATE INDEX public_search_services_gin ON clinic_public_search_index USING gin(services);
CREATE INDEX public_search_fee_idx ON clinic_public_search_index(min_fee_afn,clinic_id);

CREATE OR REPLACE FUNCTION refresh_clinic_public_search_index(target_clinic text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO clinic_public_search_index
 (clinic_id,approved_version,clinic_name,city,province,search_text,specialties,
  services,dentist_names,min_fee_afn,latitude,longitude,updated_at)
 SELECT c.id,v.version,c.display_name,c.city,c.province,
    lower(concat_ws(' ',c.display_name,c.city,c.province,
      array_to_string(ARRAY(SELECT jsonb_array_elements_text(v.profile->'specialties')),' '),
      (SELECT string_agg(concat_ws(' ',a->>'displayName',a->>'specialty'), ' ')
       FROM jsonb_array_elements(coalesce(v.approved_dentists,'[]'::jsonb)) a),
      (SELECT string_agg(concat_ws(' ',a->>'name',a->>'category'), ' ')
       FROM jsonb_array_elements(coalesce(v.approved_services,'[]'::jsonb)) a))),
    ARRAY(SELECT jsonb_array_elements_text(v.profile->'specialties')),
    ARRAY(SELECT a->>'name' FROM
      jsonb_array_elements(coalesce(v.approved_services,'[]'::jsonb)) a),
    ARRAY(SELECT a->>'displayName' FROM
      jsonb_array_elements(coalesce(v.approved_dentists,'[]'::jsonb)) a),
    (SELECT min((a->>'priceAfn')::integer) FROM
      jsonb_array_elements(coalesce(v.approved_services,'[]'::jsonb)) a),
    (v.profile->>'latitude')::double precision,(v.profile->>'longitude')::double precision,now()
 FROM clinic_listing_heads h
 JOIN clinic_listing_versions v ON v.clinic_id=h.clinic_id AND v.version=h.approved_version
 JOIN clinics c ON c.id=h.clinic_id
 WHERE h.clinic_id=target_clinic AND v.status='approved'
   AND jsonb_array_length(coalesce(v.approved_services,'[]'::jsonb))>0
   AND jsonb_array_length(coalesce(v.approved_dentists,'[]'::jsonb))>0
   AND v.profile->>'latitude' IS NOT NULL AND v.profile->>'longitude' IS NOT NULL
 ON CONFLICT(clinic_id) DO UPDATE SET
  approved_version=excluded.approved_version,
  clinic_name=excluded.clinic_name,city=excluded.city,province=excluded.province,
  search_text=excluded.search_text,specialties=excluded.specialties,
  services=excluded.services,dentist_names=excluded.dentist_names,
  min_fee_afn=excluded.min_fee_afn,latitude=excluded.latitude,
  longitude=excluded.longitude,updated_at=now();
 IF NOT FOUND THEN
  DELETE FROM clinic_public_search_index WHERE clinic_id=target_clinic;
 END IF;
END;
$$;

CREATE OR REPLACE FUNCTION clinic_public_search_head_changed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM refresh_clinic_public_search_index(NEW.clinic_id);
 RETURN NEW;
END;
$$;
CREATE TRIGGER refresh_public_search_on_publication
 AFTER INSERT OR UPDATE OF approved_version ON clinic_listing_heads
 FOR EACH ROW EXECUTE FUNCTION clinic_public_search_head_changed();

CREATE OR REPLACE FUNCTION clinic_public_search_identity_changed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM refresh_clinic_public_search_index(NEW.id);
 RETURN NEW;
END;
$$;
CREATE TRIGGER refresh_public_search_on_clinic_identity
 AFTER UPDATE OF display_name,city,province ON clinics
 FOR EACH ROW EXECUTE FUNCTION clinic_public_search_identity_changed();

SELECT refresh_clinic_public_search_index(clinic_id)
 FROM clinic_listing_heads WHERE approved_version IS NOT NULL;

-- A public-only security gate. No private patient/medical, payment or evidence tables.
-- Keep the live status conditions even if an earlier indexed snapshot remains.
CREATE VIEW eligible_clinic_public_search AS
 SELECT i.clinic_id,i.approved_version,i.clinic_name,i.city,i.province,
   i.search_text,i.specialties,i.services,i.dentist_names,
   i.min_fee_afn,i.latitude,i.longitude,h.published_at
 FROM clinic_public_search_index i
 JOIN clinic_listing_heads h ON h.clinic_id=i.clinic_id AND h.approved_version=i.approved_version
 JOIN clinic_listing_versions v ON v.clinic_id=i.clinic_id AND v.version=i.approved_version
 JOIN clinics c ON c.id=i.clinic_id
 JOIN clinic_subscriptions sub ON sub.clinic_id=i.clinic_id
 JOIN platform_plan_versions p ON p.id=sub.plan_version_id
 WHERE h.hidden=false AND v.status='approved' AND c.status='approved'
   AND c.city<>'' AND c.address<>'' AND c.phone<>''
   AND coalesce(jsonb_array_length(v.profile->'photoIds'),0)>0
   AND coalesce(jsonb_array_length(v.profile->'dentistIds'),0)>0
   AND coalesce(jsonb_array_length(v.profile->'serviceIds'),0)>0
   AND coalesce(jsonb_array_length(v.profile->'specialties'),0)>0
   AND coalesce(jsonb_array_length(v.approved_dentists),0)=jsonb_array_length(v.profile->'dentistIds')
   AND coalesce(jsonb_array_length(v.approved_services),0)=jsonb_array_length(v.profile->'serviceIds')
   AND ((sub.status='trialing' AND sub.trial_ends_at>now())
     OR (sub.status='active' AND sub.current_period_ends_at>now()-make_interval(days=>p.grace_days)))
   AND EXISTS(SELECT 1 FROM clinic_weekly_hours w WHERE w.clinic_id=i.clinic_id AND w.is_open=true)
   AND EXISTS(SELECT 1 FROM clinic_provider_hours ph WHERE ph.clinic_id=i.clinic_id
      AND ph.is_open=true AND EXISTS (
       SELECT 1 FROM clinic_memberships m WHERE m.id=ph.membership_id
         AND m.clinic_id=i.clinic_id AND m.status='active' AND
         (m.role='dentist' OR m.clinician_enabled)))
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v.approved_dentists) d
      LEFT JOIN clinic_memberships m ON m.clinic_id=i.clinic_id AND m.id=d->>'id'
      LEFT JOIN clinic_dentist_drafts draft ON draft.membership_id=m.id
      LEFT JOIN clinic_dentist_credential_cases cred ON cred.membership_id=m.id
        AND cred.clinic_id=i.clinic_id
      WHERE m.id IS NULL OR m.status<>'active' OR
        NOT (m.role='dentist' OR m.clinician_enabled) OR
        draft.membership_id IS NULL OR draft.draft_version IS DISTINCT FROM cred.approved_draft_version OR
        cred.status IS DISTINCT FROM 'verified' OR
        cred.valid_until IS NULL OR cred.valid_until<(now() AT TIME ZONE 'Asia/Kabul')::date OR
        d->>'displayName' IS DISTINCT FROM cred.verified_snapshot->>'displayName')
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v.approved_services) s
      LEFT JOIN clinic_services live ON live.clinic_id=i.clinic_id AND live.id=s->>'id'
      WHERE live.id IS NULL OR live.active IS DISTINCT FROM true OR
        live.public_booking IS DISTINCT FROM true OR
        live.version IS DISTINCT FROM (s->>'version')::integer OR
        live.base_price_afn IS DISTINCT FROM (s->>'priceAfn')::integer)
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v.approved_services) s
      JOIN clinic_services live ON live.clinic_id=i.clinic_id AND live.id=s->>'id'
      WHERE live.requires_chair AND NOT EXISTS
       (SELECT 1 FROM clinic_resources r WHERE r.clinic_id=i.clinic_id
        AND r.kind='chair' AND r.active=true));
