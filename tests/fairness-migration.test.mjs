import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readdirSync,readFileSync} from "node:fs";

test("Dot fairness migration copies gameplay, preserves purchases and Dot's items, and leaves source unchanged",()=>{
  const db=new DatabaseSync(":memory:");
  try{
    const migrations=readdirSync(new URL("../migrations/",import.meta.url)).filter(name=>name.endsWith(".sql")&&name<"0019_");
    migrations.splice(migrations.indexOf("0008a_global_progress_reset_once.sql"),1);
    migrations.splice(migrations.indexOf("0008_reset_rebirth_once.sql")+1,0,"0008a_global_progress_reset_once.sql");
    for(const name of migrations)
      db.exec(readFileSync(new URL("../migrations/"+name,import.meta.url),"utf8"));
    db.exec("INSERT INTO users(id,username,created_at_ms) VALUES('owner','Owner',1),('dot-id','Dot',1),('source-id','vleriongoat',1)");
    db.exec("INSERT INTO admin_users(user_id,role,created_at_ms) VALUES('owner','owner',1)");
    db.exec("INSERT INTO progress(user_id,last_accrual_ms,balance,lifetime_cash,run_earned,diamonds,businesses_json,upgrades_json,booster_inventory_json,booster_equipped_json,booster_slots_unlocked,reward_cosmetics_json,crate_inventory_json,achievement_claims_json,version) VALUES('dot-id',1,100000000,200000000,180000000,1292,'{\"collector\":99}','[\"wallet\"]','{\"coinPurse\":2}','[\"coinPurse\"]',4,'[\"diamond_pile\"]','{\"royal\":2}','[\"earn-1\"]',7)");
    db.exec("INSERT INTO progress(user_id,last_accrual_ms,balance,lifetime_cash,run_earned,diamonds,businesses_json,upgrades_json,achievement_claims_json,rate_per_second,version) VALUES('source-id',1,400000000,800000000,700000000,375,'{\"collector\":12}','[\"fingers\"]','[\"click-1\"]',1000,3)");
    const dotBefore=db.prepare("SELECT * FROM progress WHERE user_id='dot-id'").get();
    const sourceBefore=db.prepare("SELECT * FROM progress WHERE user_id='source-id'").get();
    db.exec(readFileSync(new URL("../migrations/0019_dot_fairness_progress_copy_once.sql",import.meta.url),"utf8"));
    const dot=db.prepare("SELECT * FROM progress WHERE user_id='dot-id'").get();
    const source=db.prepare("SELECT * FROM progress WHERE user_id='source-id'").get();
    assert.deepEqual(source,sourceBefore);
    for(const key of ["balance","lifetime_cash","run_earned","businesses_json","upgrades_json","rebirths","empire_points","playtime_ms","achievements_json","quest_daily_json"])
      assert.deepEqual(dot[key],source[key],key);
    for(const key of ["diamonds","booster_inventory_json","booster_equipped_json","booster_slots_unlocked","reward_cosmetics_json","crate_inventory_json"])
      assert.deepEqual(dot[key],dotBefore[key],key);
    assert.deepEqual(JSON.parse(dot.achievement_claims_json).sort(),["click-1","earn-1"]);
    assert.equal(dot.rate_per_second,1000*2*1.65*1.55/1.75);
    assert.equal(dot.progress_epoch,dotBefore.progress_epoch+1);
    assert.equal(dot.rebirth_era,dotBefore.rebirth_era+1);
    assert.equal(dot.version,dotBefore.version+1);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM admin_progress_snapshots WHERE user_id='dot-id'").get().count,1);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM admin_audit WHERE target_user_id='dot-id' AND action_type='COPY_PROGRESS_FOR_FAIRNESS'").get().count,1);
  }finally{db.close();}
});
