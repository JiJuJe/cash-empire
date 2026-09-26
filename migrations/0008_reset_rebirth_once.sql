-- One-time Rebirth reset. The era rejects old queued Rebirth and prestige actions.
-- Incrementing version prevents in-flight writes from restoring pre-reset values.
ALTER TABLE progress ADD COLUMN rebirth_era INTEGER NOT NULL DEFAULT 1;
UPDATE progress SET
  rebirths = 0,
  empire_points = 0,
  empire_spent = 0,
  prestige_json = '[]',
  version = version + 1;
