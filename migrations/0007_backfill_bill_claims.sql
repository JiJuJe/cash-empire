-- Preserve Golden Bill claims recorded before the rarity system existed.
-- Counting all idempotent golden actions and taking the larger value also keeps
-- any claims already made after 0006, so this backfill can run without a reset.
UPDATE progress
SET bill_claims_json = json_set(
  bill_claims_json,
  '$.golden',
  (SELECT COUNT(*) FROM progress_actions
   WHERE progress_actions.user_id = progress.user_id
     AND progress_actions.action_type = 'golden')
)
WHERE CAST(COALESCE(json_extract(bill_claims_json, '$.golden'), 0) AS INTEGER) <
  (SELECT COUNT(*) FROM progress_actions
   WHERE progress_actions.user_id = progress.user_id
     AND progress_actions.action_type = 'golden');
