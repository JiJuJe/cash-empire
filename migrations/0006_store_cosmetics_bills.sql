-- Additive account inventory and bill state. Existing purchase and entitlement tables remain intact.
CREATE TABLE IF NOT EXISTS store_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL,
  provider_session_id TEXT UNIQUE,
  checkout_url TEXT,
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  currency TEXT NOT NULL CHECK(currency = 'eur'),
  status TEXT NOT NULL CHECK(status IN ('pending','paid','failed')),
  created_at_ms INTEGER NOT NULL,
  paid_at_ms INTEGER
);
CREATE INDEX IF NOT EXISTS store_purchases_user_idx ON store_purchases(user_id, product_id, status);

CREATE TABLE IF NOT EXISTS store_entitlements (
  user_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL,
  source_purchase_id TEXT NOT NULL REFERENCES store_purchases(id),
  granted_at_ms INTEGER NOT NULL,
  PRIMARY KEY(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS cosmetic_entitlements (
  user_id TEXT NOT NULL REFERENCES users(id),
  cosmetic_id TEXT NOT NULL,
  source_purchase_id TEXT NOT NULL REFERENCES store_purchases(id),
  granted_at_ms INTEGER NOT NULL,
  PRIMARY KEY(user_id, cosmetic_id)
);

CREATE TABLE IF NOT EXISTS cosmetic_loadout (
  user_id TEXT NOT NULL REFERENCES users(id),
  slot TEXT NOT NULL CHECK(slot IN ('pile','click','background','cards','profile','tap')),
  cosmetic_id TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY(user_id, slot)
);

ALTER TABLE progress ADD COLUMN pending_bill_tier TEXT;
ALTER TABLE progress ADD COLUMN pending_bill_until_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE progress ADD COLUMN bill_claims_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE progress ADD COLUMN rush_multiplier INTEGER NOT NULL DEFAULT 7;
ALTER TABLE progress ADD COLUMN achievements_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE progress ADD COLUMN highest_rate REAL NOT NULL DEFAULT 0;
ALTER TABLE progress ADD COLUMN businesses_purchased INTEGER NOT NULL DEFAULT 0;
