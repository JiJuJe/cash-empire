import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

test('V2 launch reset clears gameplay once and retains protected inventory',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    for(const name of ['0001_leaderboard_store.sql','0002_google_accounts.sql','0003_playtime_boosters.sql','0004_cloud_click_streams.sql','0005_admin_moderation.sql','0006_store_cosmetics_bills.sql','0007_backfill_bill_claims.sql','0008_reset_rebirth_once.sql','0008a_global_progress_reset_once.sql','0009_achievement_crates.sql','0010_free_crates.sql','0011_diamonds.sql','0012_business_revenue.sql','0013_global_reset_v2_extras.sql'])
      db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
    db.prepare("INSERT INTO users(id,username,created_at_ms) VALUES('u','Player',1)").run();
    db.prepare("INSERT INTO progress(user_id,last_accrual_ms,balance,lifetime_cash,run_earned,rebirths,empire_points,diamonds,businesses_json,upgrades_json,total_clicks,booster_inventory_json,booster_equipped_json,crate_inventory_json,free_crate_claims_json,reward_cosmetics_json,click_streams_json) VALUES('u',1,7000000,8000000,3000000,2,3,120,'{\"collector\":5}','[\"wallet\"]',100,'{\"coinPurse\":3}','[\"coinPurse\"]','{\"iron\":2}','{\"wood\":\"2026-09-27\"}','[\"emerald_pile\"]','{\"stream\":44}')").run();
    const before=db.prepare("SELECT progress_epoch,rebirth_era,version FROM progress WHERE user_id='u'").get();
    db.exec(readFileSync(new URL('../migrations/0014_global_restart_after_v2_launch_once.sql',import.meta.url),'utf8'));
    const row=db.prepare("SELECT * FROM progress WHERE user_id='u'").get();
    assert.deepEqual([row.balance,row.lifetime_cash,row.run_earned,row.rebirths,row.empire_points,row.diamonds,row.total_clicks],[1000000,0,0,0,0,0,0]);
    assert.deepEqual([row.businesses_json,row.upgrades_json,row.achievement_claims_json],['{}','[]','[]']);
    assert.deepEqual([row.booster_inventory_json,row.booster_equipped_json,row.crate_inventory_json,row.free_crate_claims_json,row.reward_cosmetics_json,row.click_streams_json],['{"coinPurse":3}','["coinPurse"]','{"iron":2}','{"wood":"2026-09-27"}','["emerald_pile"]','{"stream":44}']);
    assert.equal(row.progress_epoch,before.progress_epoch+1);
    assert.equal(row.rebirth_era,before.rebirth_era+1);
    assert.equal(row.version,before.version+1);
  }finally{db.close()}
});
