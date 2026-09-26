-- One-time response to exploited progress. Existing accounts and paid assets stay intact.
-- Incrementing both counters retires in-flight updates and obsolete browser outboxes.
-- Keep booster inventory/equipment/slots and the click receipt ledger; the latter
-- prevents an old click checkpoint from being credited twice after the reset.
UPDATE progress SET
  balance = CASE WHEN balance > 0 OR lifetime_cash > 0 OR run_earned > 0
    OR total_clicks > 0 OR playtime_ms > 0 OR rebirths > 0
    OR businesses_purchased > 0 OR businesses_json <> '{}' THEN 1000000 ELSE 0 END,
  lifetime_cash = 0,
  run_earned = 0,
  rebirths = 0,
  empire_points = 0,
  empire_spent = 0,
  total_clicks = 0,
  last_click_ms = 0,
  last_accrual_ms = unixepoch() * 1000,
  last_golden_ms = unixepoch() * 1000,
  rate_per_second = 0,
  offline_cap_seconds = 36000,
  businesses_json = '{}',
  upgrades_json = '[]',
  prestige_json = '[]',
  playtime_ms = 0,
  last_heartbeat_ms = 0,
  next_drop_playtime_ms = 600000,
  pending_drop_until_ms = 0,
  rush_until_ms = 0,
  offline_efficiency = 0.5,
  pending_bill_tier = NULL,
  pending_bill_until_ms = 0,
  bill_claims_json = '{}',
  rush_multiplier = 7,
  achievements_json = '[]',
  highest_rate = 0,
  businesses_purchased = 0,
  progress_epoch = progress_epoch + 1,
  rebirth_era = rebirth_era + 1,
  version = version + 1;
