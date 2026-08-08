DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'access_user_permissions_effect_chk') THEN
    ALTER TABLE access_user_permissions
      ADD CONSTRAINT access_user_permissions_effect_chk CHECK (effect IN ('allow', 'deny'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'access_team_permissions_effect_chk') THEN
    ALTER TABLE access_team_permissions
      ADD CONSTRAINT access_team_permissions_effect_chk CHECK (effect IN ('allow', 'deny'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'access_sector_permissions_effect_chk') THEN
    ALTER TABLE access_sector_permissions
      ADD CONSTRAINT access_sector_permissions_effect_chk CHECK (effect IN ('allow', 'deny'));
  END IF;
END $$;
