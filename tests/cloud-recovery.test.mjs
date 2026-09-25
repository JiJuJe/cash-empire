import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),queue=require('../CashEmpire/cloud-outbox.js');
const origin='https://clickthecash.online';
function d1(db){return {prepare(sql){let args=[];return {sql,get args(){return args},bind(...v){args=v;return this},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}}},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}}}},async batch(stmts){db.exec('BEGIN');try{const r=stmts.map(x=>({meta:{changes:db.prepare(x.sql).run(...x.args).changes}}));db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}};}
async function setup(){
  const db=new DatabaseSync(':memory:');
  for(const file of ['0001_leaderboard_store.sql','0002_google_accounts.sql','0003_playtime_boosters.sql','0004_cloud_click_streams.sql'])db.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
  db.prepare("INSERT INTO users(id,username,created_at_ms,username_normalized,username_set) VALUES('u','CloudPlayer',1,'cloudplayer',1)").run();
  const token='T'.repeat(43),hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at_ms,expires_at_ms) VALUES(?,?,?,?)').run(hash,'u',Date.now(),Date.now()+3600000);
  db.prepare('INSERT INTO progress(user_id,last_accrual_ms,balance,lifetime_cash,run_earned,total_clicks) VALUES(?,?,?,?,?,?)').run('u',Date.now(),1,1,1,1);
  db.prepare("INSERT INTO progress_actions(action_id,user_id,action_type,created_at_ms) VALUES('old-click-000000','u','click_batch',1)").run();
  let limitCalls=0;const env={DB:d1(db),GAME_API_LIMITER:{async limit(){limitCalls++;return {success:true}}}};
  const headers={Cookie:'__Host-ce_session='+token,Origin:origin,'Content-Type':'application/json'};
  const post=body=>worker.fetch(new Request(origin+'/api/progress/action',{method:'POST',headers,body:JSON.stringify(body)}),env);
  const get=path=>worker.fetch(new Request(origin+path,{headers:{Cookie:headers.Cookie}}),env);
  return {db,env,post,get,limitCalls:()=>limitCalls};
}
test('1000 legacy batches and BUY are atomic, retriable, and need no per-click action rows',async()=>{
  const x=await setup();try{
    const old=Array.from({length:1000},(_,i)=>({actionId:'old-click-'+String(i).padStart(6,'0'),type:'click_batch',count:1}));
    const buy={actionId:'buy-business-000001',type:'buy_business',businessId:'collector',quantity:1};
    const plan=queue.planNext(queue.compactLegacy([...old,buy]),{id:'device-stream-0001',total:0,acked:0});
    const first=await x.post(plan.request);assert.equal(first.status,200);const snap=await first.json();
    assert.equal(snap.totalClicks,1000);assert.equal(snap.businesses.collector,1);assert.ok(snap.balance>=990&&snap.balance<991);
    assert.equal(x.db.prepare('SELECT COUNT(*) AS n FROM progress_actions').get().n,2);
    const replay=await x.post(plan.request);assert.equal(replay.status,200);assert.equal((await replay.json()).totalClicks,1000);
    assert.equal(x.db.prepare('SELECT COUNT(*) AS n FROM progress_actions').get().n,2);
    const checkpoint={type:'click_checkpoint',clicks:[{streamId:'device-stream-0001',total:50000}]};
    assert.equal((await x.post(checkpoint)).status,200);
    const repeat=await x.post(checkpoint);assert.equal(repeat.status,200);assert.equal((await repeat.json()).totalClicks,51000);
    assert.equal(x.db.prepare('SELECT COUNT(*) AS n FROM progress_actions').get().n,2);
    assert.ok(x.limitCalls()>0);
  }finally{x.db.close()}
});
test('snapshot, account, leaderboard and store status do not write D1',async()=>{
  const x=await setup();try{
    const before=x.db.prepare('SELECT version FROM progress WHERE user_id=\'u\'').get().version;
    for(const path of ['/api/progress/snapshot','/api/account','/api/leaderboard','/api/store/status'])assert.equal((await x.get(path)).status,200);
    assert.equal(x.db.prepare('SELECT version FROM progress WHERE user_id=\'u\'').get().version,before);
    assert.equal(x.db.prepare('SELECT COUNT(*) AS n FROM api_rate_limits').get().n,0);
  }finally{x.db.close()}
});
test('two devices share one D1 run and independently retry cumulative checkpoints',async()=>{
  const x=await setup();try{
    const first={type:'click_checkpoint',clicks:[{streamId:'device-one-00001',total:100}]};
    const second={type:'click_checkpoint',clicks:[{streamId:'device-two-00002',total:250}]};
    await x.post(first);await x.post(second);await x.post(first);
    const snapshot=await (await x.get('/api/progress/snapshot')).json();
    assert.equal(snapshot.totalClicks,351);assert.ok(snapshot.balance>=351);
    assert.equal(x.db.prepare('SELECT COUNT(*) AS n FROM progress_actions').get().n,1);
  }finally{x.db.close()}
});

test('pending click checkpoints buy upgrades and Rebirth before resetting the run',async()=>{
  const x=await setup();try{
    const upgrade={actionId:'upgrade-wallet-0001',type:'buy_upgrade',upgradeId:'wallet',clicks:[{streamId:'upgrade-stream-0001',total:100}]};
    const bought=await x.post(upgrade);assert.equal(bought.status,200);const upgraded=await bought.json();
    assert.ok(upgraded.upgrades.includes('wallet'));assert.equal(upgraded.totalClicks,101);
    x.db.prepare("UPDATE progress SET run_earned=1000000,lifetime_cash=1000000,balance=1000000 WHERE user_id='u'").run();
    const rebirth={actionId:'rebirth-action-0001',type:'rebirth',clicks:[{streamId:'upgrade-stream-0001',total:101}]};
    const first=await x.post(rebirth);assert.equal(first.status,200);const after=await first.json();
    assert.equal(after.rebirths,1);assert.equal(after.empirePoints,1);assert.equal(after.totalClicks,102);
    const retry=await x.post(rebirth);assert.equal(retry.status,200);assert.equal((await retry.json()).rebirths,1);
  }finally{x.db.close()}
});
