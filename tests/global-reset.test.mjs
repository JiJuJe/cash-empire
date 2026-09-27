import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

const migration=name=>readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8');

test('one-time global reset clears exploited gameplay and preserves identity, boosters and purchases',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    for(const name of ['0001_leaderboard_store.sql','0002_google_accounts.sql','0003_playtime_boosters.sql',
      '0004_cloud_click_streams.sql','0005_admin_moderation.sql','0006_store_cosmetics_bills.sql',
      '0007_backfill_bill_claims.sql','0008_reset_rebirth_once.sql'])db.exec(migration(name));
    db.exec("INSERT INTO users(id,username,created_at_ms) VALUES('played','Played',1),('new','Newcomer',2)");
    db.exec("INSERT INTO progress(user_id,last_accrual_ms,balance,lifetime_cash,run_earned,rebirths,empire_points,empire_spent,total_clicks,playtime_ms,businesses_json,upgrades_json,prestige_json,booster_inventory_json,booster_equipped_json,booster_slots_unlocked,click_streams_json,bill_claims_json,achievements_json,highest_rate,businesses_purchased,version) VALUES('played',1,999999999,9000000000,500000000,4,50,20,1000,100000,'{\"collector\":7}','[\"wallet\"]','[\"investor\"]','{\"coinPurse\":2}','[\"coinPurse\"]',2,'{\"stream-123456\":1000}','{\"golden\":5}','[\"earn-1\"]',10000,7,8)");
    db.exec("INSERT INTO progress(user_id,last_accrual_ms) VALUES('new',1)");
    db.exec("INSERT INTO purchases(id,user_id,product_id,provider,provider_session_id,amount_cents,currency,status,created_at_ms) VALUES('purchase-1','played','double_money','stripe','session-1',200,'eur','paid',1)");
    db.exec("INSERT INTO entitlements(user_id,entitlement,source_purchase_id,granted_at_ms) VALUES('played','double_money','purchase-1',1)");
    db.exec("INSERT INTO admin_users(user_id,role,created_at_ms) VALUES('played','owner',1)");
    db.exec("INSERT INTO admin_boosts(id,user_id,kind,multiplier,starts_at_ms,created_by,reason) VALUES('boost-1','played','total',2,1,'played','test')");
    const before=db.prepare("SELECT * FROM progress WHERE user_id='played'").get();
    db.exec(migration('0008a_global_progress_reset_once.sql'));
    const after=db.prepare("SELECT * FROM progress WHERE user_id='played'").get();
    const untouched=['user_id','booster_inventory_json','booster_equipped_json','booster_slots_unlocked','click_streams_json'];
    for(const key of untouched)assert.equal(after[key],before[key],key);
    assert.equal(after.balance,1000000);assert.equal(after.lifetime_cash,0);assert.equal(after.run_earned,0);
    assert.equal(after.rebirths,0);assert.equal(after.empire_points,0);assert.equal(after.empire_spent,0);
    assert.equal(after.total_clicks,0);assert.equal(after.playtime_ms,0);assert.equal(after.highest_rate,0);
    assert.equal(after.businesses_purchased,0);assert.equal(after.rate_per_second,0);
    assert.equal(after.businesses_json,'{}');assert.equal(after.upgrades_json,'[]');assert.equal(after.prestige_json,'[]');
    assert.equal(after.bill_claims_json,'{}');assert.equal(after.achievements_json,'[]');
    assert.equal(after.progress_epoch,before.progress_epoch+1);assert.equal(after.rebirth_era,before.rebirth_era+1);
    assert.equal(after.version,before.version+1);assert.ok(after.last_accrual_ms>before.last_accrual_ms);
    assert.equal(db.prepare("SELECT balance FROM progress WHERE user_id='new'").get().balance,0);
    assert.equal(db.prepare("SELECT count(*) AS n FROM users").get().n,2);
    assert.equal(db.prepare("SELECT count(*) AS n FROM entitlements").get().n,1);
    assert.equal(db.prepare("SELECT count(*) AS n FROM admin_boosts").get().n,1);
    assert.equal(db.prepare("SELECT count(*) AS n FROM admin_users").get().n,1);
  }finally{db.close()}
});

test('old browser saves get the one-time starter grant without losing boosters',()=>{
  const script=readFileSync(new URL('../CashEmpire/script.js',import.meta.url),'utf8');
  const source=script.match(/  function migratePreResetSave\(raw\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(source);
  const fresh=()=>({version:1,globalResetVersion:2,money:0,lifetime:0,totalClicks:0,
    boosterInventory:{},equippedBoosters:[],boosterSlotsUnlocked:1,settings:{sound:true}});
  const migrate=Function('defaultState',source+';return migratePreResetSave')(fresh);
  const old={version:1,money:900000000,lifetime:1000000000,totalClicks:5,businesses:{collector:7},
    boosterInventory:{coinPurse:2},equippedBoosters:['coinPurse'],boosterSlotsUnlocked:2,settings:{sound:false}};
  const reset=migrate(old);
  assert.equal(reset.money,1000000);assert.equal(reset.lifetime,0);assert.equal(reset.totalClicks,0);
  assert.deepEqual(reset.boosterInventory,old.boosterInventory);
  assert.deepEqual(reset.equippedBoosters,old.equippedBoosters);
  assert.equal(reset.boosterSlotsUnlocked,2);assert.equal(reset.settings.sound,false);
  assert.equal(migrate(reset),reset);
  assert.equal(migrate({version:1,money:0,businesses:{}}).money,0);
});
