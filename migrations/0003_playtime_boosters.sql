-- Add persistent active playtime, Golden Rush and gameplay booster state.
-- Defaults preserve every existing progress row and all existing purchases.
ALTER TABLE progress ADD COLUMN playtime_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE progress ADD COLUMN last_heartbeat_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE progress ADD COLUMN booster_inventory_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE progress ADD COLUMN booster_equipped_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE progress ADD COLUMN booster_slots_unlocked INTEGER NOT NULL DEFAULT 1;
ALTER TABLE progress ADD COLUMN next_drop_playtime_ms INTEGER NOT NULL DEFAULT 600000;
ALTER TABLE progress ADD COLUMN pending_drop_until_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE progress ADD COLUMN rush_until_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE progress ADD COLUMN offline_efficiency REAL NOT NULL DEFAULT 0.5;
CREATE TABLE IF NOT EXISTS booster_slot_entitlements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK(slot_number IN (5,6)),
  provider_reference TEXT NOT NULL UNIQUE,
  granted_at_ms INTEGER NOT NULL,
  PRIMARY KEY(user_id,slot_number)
);
