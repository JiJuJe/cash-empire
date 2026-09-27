-- One-time owner-requested fairness correction. Replace Dot's gameplay statistics
-- with a snapshot of vleriongoat's progress. Keep Dot's identity, diamonds,
-- booster inventory/equipment/slots, cosmetics, crate inventory, free-crate
-- receipts, and all entitlement/payment tables. Never modify vleriongoat.
-- Preserve a full pre-change progress snapshot for recovery and audit.
INSERT INTO admin_progress_snapshots(id,user_id,created_at_ms,created_by,reason,progress_json)
SELECT lower(hex(randomblob(16))),p.user_id,unixepoch()*1000,
  (SELECT user_id FROM admin_users WHERE role='owner'),
  'Owner-requested fairness correction: copy vleriongoat gameplay stats to Dot; preserve paid items and cosmetics',
  json_object(
    'user_id', p.user_id,
    'balance', p.balance,
    'lifetime_cash', p.lifetime_cash,
    'run_earned', p.run_earned,
    'rebirths', p.rebirths,
    'empire_points', p.empire_points,
    'empire_spent', p.empire_spent,
    'total_clicks', p.total_clicks,
    'last_click_ms', p.last_click_ms,
    'last_accrual_ms', p.last_accrual_ms,
    'rate_per_second', p.rate_per_second,
    'offline_cap_seconds', p.offline_cap_seconds,
    'businesses_json', p.businesses_json,
    'upgrades_json', p.upgrades_json,
    'prestige_json', p.prestige_json,
    'version', p.version,
    'last_golden_ms', p.last_golden_ms,
    'playtime_ms', p.playtime_ms,
    'last_heartbeat_ms', p.last_heartbeat_ms,
    'booster_inventory_json', p.booster_inventory_json,
    'booster_equipped_json', p.booster_equipped_json,
    'booster_slots_unlocked', p.booster_slots_unlocked,
    'next_drop_playtime_ms', p.next_drop_playtime_ms,
    'pending_drop_until_ms', p.pending_drop_until_ms,
    'rush_until_ms', p.rush_until_ms,
    'offline_efficiency', p.offline_efficiency,
    'click_streams_json', p.click_streams_json,
    'progress_epoch', p.progress_epoch,
    'pending_bill_tier', p.pending_bill_tier,
    'pending_bill_until_ms', p.pending_bill_until_ms,
    'bill_claims_json', p.bill_claims_json,
    'rush_multiplier', p.rush_multiplier,
    'achievements_json', p.achievements_json,
    'highest_rate', p.highest_rate,
    'businesses_purchased', p.businesses_purchased,
    'rebirth_era', p.rebirth_era,
    'achievement_claims_json', p.achievement_claims_json,
    'crate_inventory_json', p.crate_inventory_json,
    'reward_cosmetics_json', p.reward_cosmetics_json,
    'free_crate_claims_json', p.free_crate_claims_json,
    'diamonds', p.diamonds,
    'business_revenue_json', p.business_revenue_json,
    'quest_daily_json', p.quest_daily_json,
    'quest_weekly_json', p.quest_weekly_json
  )
FROM progress AS p JOIN users AS u ON u.id=p.user_id
WHERE lower(u.username)='dot';

UPDATE progress AS dst
SET
  balance = src.balance,
  lifetime_cash = src.lifetime_cash,
  run_earned = src.run_earned,
  rebirths = src.rebirths,
  empire_points = src.empire_points,
  empire_spent = src.empire_spent,
  total_clicks = src.total_clicks,
  offline_cap_seconds = src.offline_cap_seconds,
  businesses_json = src.businesses_json,
  upgrades_json = src.upgrades_json,
  prestige_json = src.prestige_json,
  last_golden_ms = src.last_golden_ms,
  playtime_ms = src.playtime_ms,
  next_drop_playtime_ms = src.next_drop_playtime_ms,
  offline_efficiency = src.offline_efficiency,
  bill_claims_json = src.bill_claims_json,
  rush_multiplier = src.rush_multiplier,
  achievements_json = src.achievements_json,
  highest_rate = src.highest_rate,
  businesses_purchased = src.businesses_purchased,
  business_revenue_json = src.business_revenue_json,
  quest_daily_json = src.quest_daily_json,
  quest_weekly_json = src.quest_weekly_json,
  last_click_ms = 0,
  last_accrual_ms = unixepoch() * 1000,
  rate_per_second = src.rate_per_second * 2 * 1.65 * 1.55 / 1.75,
  last_heartbeat_ms = 0,
  pending_drop_until_ms = 0,
  rush_until_ms = 0,
  click_streams_json = '{}',
  progress_epoch = dst.progress_epoch + 1,
  pending_bill_tier = NULL,
  pending_bill_until_ms = 0,
  rebirth_era = dst.rebirth_era + 1,
  achievement_claims_json = (SELECT json_group_array(value) FROM (SELECT value FROM json_each(dst.achievement_claims_json) UNION SELECT value FROM json_each(src.achievement_claims_json))),
  version = dst.version + 1
FROM progress AS src
JOIN users AS su ON su.id=src.user_id
JOIN users AS du ON lower(du.username)='dot'
WHERE dst.user_id=du.id AND lower(su.username)='vleriongoat';

INSERT INTO admin_audit(id,actor_user_id,target_user_id,action_type,details_json,reason,created_at_ms)
SELECT lower(hex(randomblob(16))),
  (SELECT user_id FROM admin_users WHERE role='owner'), u.id,
  'COPY_PROGRESS_FOR_FAIRNESS',
  '{"template_username":"vleriongoat","preserved":["diamonds","boosters","cosmetics","crate_inventory","paid_entitlements"]}',
  'Owner-requested correction after overlapping paid and admin 2x bonuses',
  unixepoch()*1000
FROM users AS u WHERE lower(u.username)='dot';
