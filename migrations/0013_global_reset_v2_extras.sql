-- Complete the one-time exploited-progress reset for V2 gameplay fields.
-- Keep crate inventory, free-claim receipts, boosters, cosmetics and paid entitlements.
UPDATE progress SET
  diamonds = 0,
  achievement_claims_json = '[]',
  business_revenue_json = '{}';
