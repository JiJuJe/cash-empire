-- Public game chat. Kept separate from player progress and payments.
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 200),
  created_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_messages_recent_idx ON chat_messages(created_at_ms DESC, id DESC);
CREATE INDEX IF NOT EXISTS chat_messages_user_recent_idx ON chat_messages(user_id, created_at_ms DESC);
