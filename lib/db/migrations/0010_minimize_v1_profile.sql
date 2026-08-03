-- Paid v1 does not use these legacy profile attributes. Remove any stored
-- user-supplied values before launch; keep neutral defaults only because the
-- existing columns remain non-null for forward-compatible schema evolution.
UPDATE "profiles"
SET
  "sex" = 'unspecified',
  "height_cm" = NULL,
  "target_date" = NULL,
  "activity_level" = 'moderate',
  "training_experience" = 'beginner',
  "updated_at" = now()
WHERE
  "sex" <> 'unspecified'
  OR "height_cm" IS NOT NULL
  OR "target_date" IS NOT NULL
  OR "activity_level" <> 'moderate'
  OR "training_experience" <> 'beginner';
