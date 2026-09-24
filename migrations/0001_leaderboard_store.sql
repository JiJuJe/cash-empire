-- Cash Empire account data. Create users and sessions only through a trusted auth flow.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE CHECK(length(username) BETWEEN 3 AND 24),
  created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance REAL NOT NULL DEFAULT 0 CHECK(balance >= 0),
  lifetime_cash REAL NOT NULL DEFAULT 0 CHECK(lifetime_cash >= 0),
  run_earned REAL NOT NULL DEFAULT 0 CHECK(run_earned >= 0),
  rebirths INTEGER NOT NULL DEFAULT 0 CHECK(rebirths >= 0),
  empire_points INTEGER NOT NULL DEFAULT 0 CHECK(empire_points >= 0),
  empire_spent INTEGER NOT NULL DEFAULT 0 CHECK(empire_spent >= 0),
  total_clicks INTEGER NOT NULL DEFAULT 0 CHECK(total_clicks >= 0),
  last_click_ms INTEGER NOT NULL DEFAULT 0,
  last_accrual_ms INTEGER NOT NULL,
  rate_per_second REAL NOT NULL DEFAULT 0 CHECK(rate_per_second >= 0),
  offline_cap_seconds INTEGER NOT NULL DEFAULT 36000,
  businesses_json TEXT NOT NULL DEFAULT '{}',
  upgrades_json TEXT NOT NULL DEFAULT '[]',
  prestige_json TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS progress_lifetime_idx ON progress(lifetime_cash DESC, user_id);

CREATE TABLE IF NOT EXISTS progress_actions (
  action_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS progress_actions_user_idx ON progress_actions(user_id, created_at_ms);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL CHECK(product_id = 'double_money'),
  provider TEXT NOT NULL CHECK(provider = 'stripe'),
  provider_session_id TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL CHECK(amount_cents = 200),
  currency TEXT NOT NULL CHECK(currency = 'eur'),
  status TEXT NOT NULL CHECK(status IN ('pending','paid','failed')),
  created_at_ms INTEGER NOT NULL,
  paid_at_ms INTEGER
);
CREATE INDEX IF NOT EXISTS purchases_user_idx ON purchases(user_id);

CREATE TABLE IF NOT EXISTS entitlements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entitlement TEXT NOT NULL CHECK(entitlement = 'double_money'),
  source_purchase_id TEXT NOT NULL REFERENCES purchases(id),
  granted_at_ms INTEGER NOT NULL,
  revoked_at_ms INTEGER,
  PRIMARY KEY(user_id, entitlement)
);

CREATE TABLE IF NOT EXISTS payment_events (
  provider_event_id TEXT PRIMARY KEY,
  received_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key TEXT PRIMARY KEY,
  window_start_ms INTEGER NOT NULL,
  count INTEGER NOT NULL
);
