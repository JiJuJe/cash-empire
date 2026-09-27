-- One paid receipt grants one extra completed quest round. Receipts survive
-- page reloads and calendar rollover; replayed webhooks cannot duplicate them.
CREATE TABLE IF NOT EXISTS quest_refreshes (
  purchase_id TEXT PRIMARY KEY REFERENCES store_purchases(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK(kind IN ('daily','weekly')),
  created_at_ms INTEGER NOT NULL,
  consumed_at_ms INTEGER
);
CREATE INDEX IF NOT EXISTS quest_refreshes_available_idx ON quest_refreshes(user_id,kind,consumed_at_ms,created_at_ms);
