-- Additive second currency. Existing money, crates, and purchases are unchanged.
ALTER TABLE progress ADD COLUMN diamonds INTEGER NOT NULL DEFAULT 0;

-- Credit achievements already claimed in V2 once, without changing cash or claims.
WITH rewards(id, amount) AS (VALUES
  ('earn-1',10),('earn-100',20),('earn-10000',40),('earn-1000000',80),('earn-1000000000',160),
  ('earn-1000000000000',320),('earn-1000000000000000',640),('earn-1000000000000000000',1280),('earn-1e+21',2560),
  ('click-1',10),('click-10',20),('click-100',40),('click-1000',80),('click-10000',160),('click-100000',320),
  ('business-1',15),('business-10',30),('business-50',60),('business-250',120),('business-1000',240),('business-5000',480),
  ('rate-1',15),('rate-10',30),('rate-100',60),('rate-1000',120),('rate-10000',240),('rate-1000000',480),('rate-1000000000',960),('rate-1000000000000',1920),
  ('gold-1',20),('gold-5',40),('gold-25',80),('gold-100',160),
  ('rebirth-1',50),('rebirth-5',100),('rebirth-20',200),('rebirth-100',400),
  ('upgrade-1',10),('upgrade-5',20),('upgrade-20',40),('upgrade-50',80),
  ('collector-1',10),('collector-10',20),('collector-100',40),('collector-500',80),
  ('empire-1',40),('empire-10',80),('empire-100',160)
)
UPDATE progress SET diamonds=COALESCE((
  SELECT SUM(rewards.amount) FROM (
    SELECT DISTINCT value FROM json_each(CASE WHEN json_valid(progress.achievement_claims_json) THEN progress.achievement_claims_json ELSE '[]' END)
  ) AS claimed JOIN rewards ON rewards.id=claimed.value
),0);
