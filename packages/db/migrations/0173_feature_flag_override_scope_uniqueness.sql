-- PR-FF-15: make override upserts atomic across nullable scope dimensions.
-- PostgreSQL 15+ NULLS NOT DISTINCT treats a missing wildcard dimension as a
-- real part of the key, preventing two concurrent writers from targeting the
-- same flag/environment/account/user scope.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM feature_flag_overrides
    GROUP BY flag_id, environment, account_id_override, user_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create uq_feature_flag_overrides_scope while duplicate override scopes exist';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flag_overrides_scope
  ON feature_flag_overrides (flag_id, environment, account_id_override, user_id)
  NULLS NOT DISTINCT;
