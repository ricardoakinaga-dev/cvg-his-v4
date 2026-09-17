-- PR-FF-16: bind every override to the same tenant-owned feature flag.
-- The application predicate is defense in depth; this composite foreign key
-- makes a cross-account flag/override pair impossible at the database boundary.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM feature_flag_overrides o
    LEFT JOIN feature_flags f
      ON f.id = o.flag_id
     AND f.account_id = o.account_id
    WHERE f.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot add feature flag override tenant ownership while cross-account rows exist';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flags_id_account
  ON feature_flags (id, account_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_feature_flag_overrides_flag_account'
  ) THEN
    ALTER TABLE feature_flag_overrides
      ADD CONSTRAINT fk_feature_flag_overrides_flag_account
      FOREIGN KEY (flag_id, account_id)
      REFERENCES feature_flags (id, account_id)
      ON DELETE CASCADE;
  END IF;
END
$$;
