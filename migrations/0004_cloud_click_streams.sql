-- One cumulative receipt per browser stream makes click checkpoints idempotent
-- without adding a progress_actions row per checkpoint.
ALTER TABLE progress ADD COLUMN click_streams_json TEXT NOT NULL DEFAULT '{}';
