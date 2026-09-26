-- Track authoritative production by business without changing existing balances.
ALTER TABLE progress ADD COLUMN business_revenue_json TEXT NOT NULL DEFAULT '{}';
