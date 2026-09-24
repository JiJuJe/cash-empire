-- Add Google identity and revocable sessions without discarding existing progress.
ALTER TABLE users ADD COLUMN google_subject TEXT;
ALTER TABLE users ADD COLUMN username_normalized TEXT;
ALTER TABLE users ADD COLUMN username_set INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_seen_at_ms INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_subject_idx ON users(google_subject);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_normalized_idx ON users(username_normalized);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id, expires_at_ms);
CREATE VIEW IF NOT EXISTS player_progress AS SELECT * FROM progress;
ALTER TABLE progress ADD COLUMN last_golden_ms INTEGER NOT NULL DEFAULT 0;
