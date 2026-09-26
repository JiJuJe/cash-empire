import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

test('V2 completion migration clears gameplay currency and claims but keeps crate receipts',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    for(const name of ['0001_leaderboard_store.sql','0002_google_accounts.sql','0003_playtime_boosters.sql','0004_cloud_click_streams.sql','0005_admin_moderation.sql','0006_store_cosmetics_bills.sql','0008_reset_rebirth_once.sql','0009_achievement_crates.sql','0010_free_crates.sql','0011_diamonds.sql','0012_business_revenue.sql'])
      db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
    db.prepare("INSERT INTO users(id,username,created_at_ms) VALUES('u','Player',1)").run();
    db.prepare("INSERT INTO progress(user_id,last_accrual_ms,diamonds,achievement_claims_json,business_revenue_json,crate_inventory_json,free_crate_claims_json,booster_inventory_json) VALUES('u',1,500,'[\"earn-1\"]','{\"collector\":900}','{\"iron\":2}','{\"wood\":\"2026-09-27\"}','{\"coinPurse\":3}')").run();
    db.exec(readFileSync(new URL('../migrations/0013_global_reset_v2_extras.sql',import.meta.url),'utf8'));
    const row=db.prepare('SELECT * FROM progress WHERE user_id=\'u\'').get();
    assert.deepEqual([row.diamonds,row.achievement_claims_json,row.business_revenue_json],[0,'[]','{}']);
    assert.deepEqual([row.crate_inventory_json,row.free_crate_claims_json,row.booster_inventory_json],['{"iron":2}','{"wood":"2026-09-27"}','{"coinPurse":3}']);
  }finally{db.close()}
});
