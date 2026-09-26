-- Additive V2 rewards. Existing progress, entitlements, and purchases stay intact.
ALTER TABLE progress ADD COLUMN achievement_claims_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE progress ADD COLUMN crate_inventory_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE progress ADD COLUMN reward_cosmetics_json TEXT NOT NULL DEFAULT '[]';
