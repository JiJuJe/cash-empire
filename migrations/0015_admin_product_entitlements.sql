-- Owner gifts are separate from paid Stripe purchases and survive gameplay resets.
CREATE TABLE IF NOT EXISTS admin_product_entitlements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  grant_id TEXT NOT NULL UNIQUE,
  granted_at_ms INTEGER NOT NULL,
  PRIMARY KEY(user_id,product_id)
);
