-- Additive moderation and administration state. Existing users, progress and payments remain intact.
CREATE TABLE IF NOT EXISTS admin_users (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('owner','admin','moderator')),
  created_at_ms INTEGER NOT NULL,
  created_by TEXT REFERENCES users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_single_owner_idx ON admin_users(role) WHERE role='owner';
CREATE TABLE IF NOT EXISTS moderation_state (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  suspended_until_ms INTEGER NOT NULL DEFAULT 0,
  suspension_reason TEXT,
  banned_at_ms INTEGER,
  banned_by TEXT REFERENCES users(id),
  ban_reason TEXT,
  ban_note TEXT,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_boosts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK(kind IN ('total','click','business','luck')),
  multiplier REAL NOT NULL CHECK(multiplier > 1 AND multiplier <= 100),
  starts_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER,
  created_by TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  removed_at_ms INTEGER,
  removed_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS admin_boosts_active_idx ON admin_boosts(user_id,removed_at_ms,expires_at_ms);
CREATE TABLE IF NOT EXISTS admin_progress_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at_ms INTEGER NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  progress_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_snapshots_user_idx ON admin_progress_snapshots(user_id,created_at_ms DESC);
CREATE TABLE IF NOT EXISTS admin_audit (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  target_user_id TEXT REFERENCES users(id),
  action_type TEXT NOT NULL,
  details_json TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_audit_recent_idx ON admin_audit(created_at_ms DESC);

-- Invalidate pre-reset browser actions without erasing identities or payment records.
ALTER TABLE progress ADD COLUMN progress_epoch INTEGER NOT NULL DEFAULT 0;
