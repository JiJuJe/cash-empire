-- One-time reset of Rebirth progression only. Preserve cash, businesses,
-- achievements, boosters, cosmetics, entitlements, and account identity.
-- Increment the Rebirth era so stale queued Rebirth/shop actions cannot replay.
UPDATE progress
SET rebirths = 0,
    empire_points = 0,
    empire_spent = 0,
    prestige_json = '[]',
    rebirth_era = rebirth_era + 1,
    version = version + 1;
