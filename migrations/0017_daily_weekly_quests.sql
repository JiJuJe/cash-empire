-- Additive per-player quest counters and claim receipts. Existing progress is preserved.
ALTER TABLE progress ADD COLUMN quest_daily_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE progress ADD COLUMN quest_weekly_json TEXT NOT NULL DEFAULT '{}';
