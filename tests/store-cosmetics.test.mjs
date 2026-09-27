import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.mjs';
import {PRODUCTS} from '../worker/store-catalog.mjs';
const origin='https://clickthecash.online';
function d1(db){return {prepare(sql){let args=[];return {sql,get args(){return args},bind(...v){args=v;return this},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}}},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}}}},async batch(stmts){db.exec('BEGIN');try{const result=stmts.map(s=>({meta:{changes:db.prepare(s.sql).run(...s.args).changes}}));db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}};}
async function setup(){
  const db=new DatabaseSync(':memory:');
  for(const name of ['0001_leaderboard_store.sql','0002_google_accounts.sql','0003_playtime_boosters.sql','0004_cloud_click_streams.sql','0005_admin_moderation.sql','0006_store_cosmetics_bills.sql','0009_achievement_crates.sql','0010_free_crates.sql','0011_diamonds.sql','0012_business_revenue.sql','0015_admin_product_entitlements.sql'])db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
  db.prepare("INSERT INTO users(id,username,created_at_ms,username_normalized,username_set) VALUES('u','Buyer',1,'buyer',1)").run();
  const token='S'.repeat(43),hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at_ms,expires_at_ms) VALUES(?,?,?,?)').run(hash,'u',Date.now(),Date.now()+3600000);
  db.prepare("INSERT INTO progress(user_id,last_accrual_ms,balance) VALUES('u',?,1000)").run(Date.now());
  const env={DB:d1(db),PUBLIC_SITE_URL:origin,STRIPE_SECRET_KEY:'test-secret',STRIPE_WEBHOOK_SECRET:'webhook-test-secret',GAME_API_LIMITER:{async limit(){return {success:true}}}};
  const headers={Cookie:'__Host-ce_session='+token,Origin:origin,'Content-Type':'application/json'};
  const get=path=>worker.fetch(new Request(origin+path,{headers:{Cookie:headers.Cookie}}),env);
  const post=(path,body)=>worker.fetch(new Request(origin+path,{method:'POST',headers,body:JSON.stringify(body)}),env);
  let stripeCount=0;
  const stripeSessions=new Map();
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    const address=String(url);
    if(address==='https://api.stripe.com/v1/checkout/sessions'){
      stripeCount++;return Response.json({id:'cs_test_'+stripeCount,url:'https://checkout.stripe.com/c/pay/test_'+stripeCount});
    }
    if(address.startsWith('https://api.stripe.com/v1/checkout/sessions/'))return Response.json(stripeSessions.get(address.split('/').at(-1))||{payment_status:'unpaid'});
    return originalFetch(url,options);
  };
  const webhook=async(product,purchase,eventId='evt_test123',overrides={})=>{
    const session={id:purchase.provider_session_id,client_reference_id:'u',payment_status:'paid',mode:'payment',currency:'eur',amount_total:product.priceCents,metadata:{product_id:product.id,purchase_id:purchase.id,user_id:'u'},...overrides};
    const raw=JSON.stringify({id:eventId,type:'checkout.session.completed',data:{object:session}});
    const timestamp=Math.floor(Date.now()/1000),signature=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(timestamp+'.'+raw).digest('hex');
    return worker.fetch(new Request(origin+'/api/store/webhook',{method:'POST',headers:{'Stripe-Signature':`t=${timestamp},v1=${signature}`},body:raw}),env);
  };
  const setStripeSession=(product,purchase,paymentStatus='paid')=>stripeSessions.set(purchase.provider_session_id,{
    id:purchase.provider_session_id,client_reference_id:'u',payment_status:paymentStatus,mode:'payment',currency:'eur',amount_total:product.priceCents,
    metadata:{product_id:product.id,purchase_id:purchase.id,user_id:'u'}
  });
  return {db,env,get,post,webhook,setStripeSession,close(){globalThis.fetch=originalFetch;db.close()}};
}
test('all catalog prices are server selected and unknown products are rejected',async()=>{
  const x=await setup();try{
    assert.equal((await x.post('/api/store/checkout',{productId:'unknown'})).status,400);
    assert.equal((await x.post('/api/store/checkout',{productId:'emerald_style',priceCents:1})).status,400);
    for(const product of PRODUCTS){
      x.db.prepare('DELETE FROM api_rate_limits').run();
      const result=await x.post('/api/store/checkout',{productId:product.id});assert.equal(result.status,200,product.id);
      const row=x.db.prepare('SELECT * FROM store_purchases WHERE product_id=?').get(product.id);
      assert.equal(row.amount_cents,product.priceCents);
      assert.equal(row.currency,'eur');
    }
  }finally{x.close()}
});
test('achievement reward is claimed once and scales with difficulty',async()=>{
  const x=await setup();try{
    x.db.prepare("UPDATE progress SET lifetime_cash=100,achievements_json='[\"earn-1\",\"earn-100\"]' WHERE user_id='u'").run();
    const easy={actionId:'achievement-easy-0001',type:'claim_achievement',achievementId:'earn-1',generation:0};
    const hard={actionId:'achievement-hard-0001',type:'claim_achievement',achievementId:'earn-100',generation:0};
    assert.equal((await x.post('/api/progress/action',easy)).status,200);
    assert.equal((await x.post('/api/progress/action',easy)).status,200);
    assert.equal((await x.post('/api/progress/action',{...easy,actionId:'achievement-extra-0001'})).status,400);
    assert.equal((await x.post('/api/progress/action',hard)).status,200);
    const state=await (await x.get('/api/progress/snapshot')).json();
    assert.deepEqual(state.achievementClaims,['earn-1','earn-100']);
    assert.equal(state.balance,1000+25+200);
    assert.equal(state.diamonds,30);
    assert.equal((await x.post('/api/progress/action',{actionId:'achievement-forged-0001',type:'claim_achievement',achievementId:'earn-1000000000',generation:0})).status,400);
  }finally{x.close()}
});
test('diamond crate purchase and open use server inventory with replay protection',async()=>{
  const x=await setup();try{
    x.db.prepare("UPDATE progress SET balance=1000000,diamonds=1000 WHERE user_id='u'").run();
    const buy={actionId:'crate-buy-wood-0001',type:'buy_crate',crateId:'wood',generation:0};
    assert.equal((await x.post('/api/progress/action',buy)).status,200);
    assert.equal((await x.post('/api/progress/action',buy)).status,200);
    let state=await (await x.get('/api/progress/snapshot')).json();
    assert.equal(state.balance,1000000);assert.equal(state.diamonds,900);assert.equal(state.crateInventory.wood,1);
    const open={actionId:'crate-open-wood-0001',type:'open_crate',crateId:'wood',generation:0};
    assert.equal((await x.post('/api/progress/action',open)).status,200);
    assert.equal((await x.post('/api/progress/action',open)).status,200);
    state=await (await x.get('/api/progress/snapshot')).json();
    assert.equal(state.crateInventory.wood,0);
    assert.equal((await x.post('/api/progress/action',{...open,actionId:'crate-open-empty-0001'})).status,400);
    assert.equal((await x.post('/api/progress/action',{...buy,actionId:'crate-buy-forged-0001',crateId:'unknown'})).status,400);
  }finally{x.close()}
});
test('all crate tiers charge diamonds and reject a client-supplied diamond balance',async()=>{
  const x=await setup();try{
    x.db.prepare("UPDATE progress SET diamonds=1400,balance=7654321 WHERE user_id='u'").run();
    for(const [crateId,expected] of [['wood',1300],['iron',1000],['royal',0]]){
      assert.equal((await x.post('/api/progress/action',{actionId:'diamond-buy-'+crateId+'-0001',type:'buy_crate',crateId,generation:0})).status,200);
      const snapshot=await (await x.get('/api/progress/snapshot')).json();
      assert.equal(snapshot.diamonds,expected);
      assert.equal(snapshot.balance,7654321);
      assert.equal(snapshot.crateInventory[crateId],1);
    }
    assert.equal((await x.post('/api/progress/action',{actionId:'diamond-forgery-0001',type:'buy_crate',crateId:'wood',diamonds:1000,generation:0})).status,400);
    assert.equal((await x.post('/api/progress/action',{actionId:'diamond-empty-0001',type:'buy_crate',crateId:'wood',generation:0})).status,400);
  }finally{x.close()}
});
test('diamond migration credits existing claims once and preserves money and crates',()=>{
  const db=new DatabaseSync(':memory:');try{
    for(const name of ['0001_leaderboard_store.sql','0002_google_accounts.sql','0003_playtime_boosters.sql','0004_cloud_click_streams.sql','0005_admin_moderation.sql','0006_store_cosmetics_bills.sql','0009_achievement_crates.sql','0010_free_crates.sql'])db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
    db.prepare("INSERT INTO users(id,username,created_at_ms,username_normalized,username_set) VALUES('old','Old',1,'old',1)").run();
    db.prepare("INSERT INTO progress(user_id,last_accrual_ms,balance,achievement_claims_json,crate_inventory_json) VALUES('old',1,12345,?,?)")
      .run('["earn-1","earn-100","earn-1"]','{"iron":2}');
    db.exec(readFileSync(new URL('../migrations/0011_diamonds.sql',import.meta.url),'utf8'));
    const row=db.prepare("SELECT diamonds,balance,crate_inventory_json,achievement_claims_json FROM progress WHERE user_id='old'").get();
    assert.equal(row.diamonds,30);assert.equal(row.balance,12345);
    assert.deepEqual(JSON.parse(row.crate_inventory_json),{iron:2});
    assert.deepEqual(JSON.parse(row.achievement_claims_json),['earn-1','earn-100','earn-1']);
  }finally{db.close()}
});
test('free daily, weekly and monthly crates can each be claimed once per account period',async()=>{
  const x=await setup();try{
    for(const crateId of ['wood','iron','royal']){
      const action={actionId:'free-'+crateId+'-claim-0001',type:'claim_free_crate',crateId,generation:0};
      assert.equal((await x.post('/api/progress/action',action)).status,200);
      assert.equal((await x.post('/api/progress/action',action)).status,200);
      assert.equal((await x.post('/api/progress/action',{...action,actionId:'free-'+crateId+'-claim-0002'})).status,400);
    }
    const snapshot=await (await x.get('/api/progress/snapshot')).json();
    for(const crateId of ['wood','iron','royal']){
      assert.equal(snapshot.crateInventory[crateId],1);
      assert.equal(snapshot.freeCrateStatus[crateId].claimed,true);
    }
    assert.equal(snapshot.balance,1000);
    assert.equal((await x.post('/api/progress/action',{actionId:'free-fake-crate-0001',type:'claim_free_crate',crateId:'fake',generation:0})).status,400);
  }finally{x.close()}
});
test('paid repeatable crate is granted once per verified checkout and may be bought again',async()=>{
  const x=await setup();try{
    const product=PRODUCTS.find(p=>p.id==='crate_wood');assert.equal(product.priceCents,50);
    assert.equal((await x.post('/api/store/checkout',{productId:product.id})).status,200);
    const first=x.db.prepare("SELECT * FROM store_purchases WHERE product_id='crate_wood'").get();
    assert.equal((await x.webhook(product,first,'evt_cratefirst')).status,200);
    assert.equal((await x.webhook(product,first,'evt_cratereplay')).status,200);
    assert.equal(JSON.parse(x.db.prepare("SELECT crate_inventory_json FROM progress WHERE user_id='u'").get().crate_inventory_json).wood,1);
    assert.equal((await x.post('/api/store/checkout',{productId:product.id})).status,200);
    const second=x.db.prepare("SELECT * FROM store_purchases WHERE product_id='crate_wood' ORDER BY created_at_ms DESC, rowid DESC LIMIT 1").get();
    assert.notEqual(first.id,second.id);
    assert.equal((await x.webhook(product,second,'evt_cratesecond')).status,200);
    assert.equal(JSON.parse(x.db.prepare("SELECT crate_inventory_json FROM progress WHERE user_id='u'").get().crate_inventory_json).wood,2);
  }finally{x.close()}
});
test('a paid Royal Crate with a missed webhook is reconciled exactly once from Stripe',async()=>{
  const x=await setup();try{
    const product=PRODUCTS.find(p=>p.id==='crate_royal');
    assert.equal((await x.post('/api/store/checkout',{productId:product.id})).status,200);
    const purchase=x.db.prepare("SELECT * FROM store_purchases WHERE product_id='crate_royal'").get();
    x.setStripeSession(product,purchase,'unpaid');
    assert.equal((await x.get('/api/store/status')).status,200);
    assert.equal(x.db.prepare('SELECT status FROM store_purchases WHERE id=?').get(purchase.id).status,'pending');
    x.setStripeSession(product,purchase,'paid');
    assert.equal((await x.get('/api/store/status')).status,200);
    assert.equal(x.db.prepare('SELECT status FROM store_purchases WHERE id=?').get(purchase.id).status,'paid');
    assert.equal(JSON.parse(x.db.prepare("SELECT crate_inventory_json FROM progress WHERE user_id='u'").get().crate_inventory_json).royal,1);
    assert.equal((await x.get('/api/store/status')).status,200);
    assert.equal((await x.webhook(product,purchase,'evt_laterroyal')).status,200);
    assert.equal(JSON.parse(x.db.prepare("SELECT crate_inventory_json FROM progress WHERE user_id='u'").get().crate_inventory_json).royal,1);
  }finally{x.close()}
});
test('scheduled payment recovery delivers a paid crate even if its buyer does not reopen the game',async()=>{
  const x=await setup();try{
    const product=PRODUCTS.find(p=>p.id==='crate_royal');
    assert.equal((await x.post('/api/store/checkout',{productId:product.id})).status,200);
    const purchase=x.db.prepare("SELECT * FROM store_purchases WHERE product_id='crate_royal'").get();
    x.setStripeSession(product,purchase,'paid');
    let work;
    await worker.scheduled({},x.env,{waitUntil(promise){work=promise;}});
    await work;
    assert.equal(x.db.prepare('SELECT status FROM store_purchases WHERE id=?').get(purchase.id).status,'paid');
    assert.equal(JSON.parse(x.db.prepare("SELECT crate_inventory_json FROM progress WHERE user_id='u'").get().crate_inventory_json).royal,1);
  }finally{x.close()}
});
test('paid cosmetic purchase follows the account, equips securely, and webhook replay grants once',async()=>{
  const x=await setup();try{
    const before=await (await x.get('/api/cosmetics')).json();assert.deepEqual(before,{owned:[],loadout:{}});
    assert.equal((await x.post('/api/cosmetics/equip',{slot:'pile',cosmeticId:'emerald_pile'})).status,403);
    assert.equal((await x.post('/api/store/checkout',{productId:'emerald_style'})).status,200);
    const purchase=x.db.prepare("SELECT * FROM store_purchases WHERE product_id='emerald_style'").get();
    const product=PRODUCTS.find(p=>p.id==='emerald_style');
    assert.equal((await x.webhook(product,purchase)).status,200);
    assert.equal((await x.webhook(product,purchase)).status,200);
    assert.equal(x.db.prepare("SELECT COUNT(*) n FROM cosmetic_entitlements WHERE user_id='u'").get().n,4);
    assert.equal((await x.post('/api/store/checkout',{productId:'emerald_style'})).status,409);
    assert.equal((await x.post('/api/cosmetics/equip',{slot:'pile',cosmeticId:'emerald_pile'})).status,200);
    const secondDevice=await (await x.get('/api/cosmetics')).json();assert.equal(secondDevice.loadout.pile,'emerald_pile');
    assert.equal((await x.post('/api/cosmetics/equip',{slot:'click',cosmeticId:'emerald_pile'})).status,400);
    assert.equal((await x.post('/api/cosmetics/equip',{slot:'pile',cosmeticId:null})).status,200);
    assert.deepEqual((await (await x.get('/api/cosmetics')).json()).loadout,{});
  }finally{x.close()}
});
test('repeat checkout for a pending non-repeatable item reuses one Stripe session',async()=>{
  const x=await setup();try{
    const first=await (await x.post('/api/store/checkout',{productId:'diamond_style'})).json();
    const again=await (await x.post('/api/store/checkout',{productId:'diamond_style'})).json();
    assert.equal(again.checkoutUrl,first.checkoutUrl);
    assert.equal(x.db.prepare("SELECT COUNT(*) n FROM store_purchases WHERE product_id='diamond_style'").get().n,1);
  }finally{x.close()}
});
test('webhook rejects wrong amount, product, user, session and signature',async()=>{
  const x=await setup();try{
    await x.post('/api/store/checkout',{productId:'booster_slot_5'});
    const purchase=x.db.prepare("SELECT * FROM store_purchases WHERE product_id='booster_slot_5'").get();
    const product=PRODUCTS.find(p=>p.id==='booster_slot_5');
    for(const [id,override] of [['evt_badamount',{amount_total:1}],['evt_baduser',{client_reference_id:'other'}],['evt_badsession',{id:'cs_other'}],['evt_badproduct',{metadata:{product_id:'double_money',purchase_id:purchase.id,user_id:'u'}}]])
      assert.equal((await x.webhook(product,purchase,id,override)).status,400,id);
    assert.equal(x.db.prepare('SELECT COUNT(*) n FROM payment_events').get().n,0);
    const invalid=await worker.fetch(new Request(origin+'/api/store/webhook',{method:'POST',headers:{'Stripe-Signature':'t=1,v1=bad'},body:'{}'}),x.env);assert.equal(invalid.status,400);
    assert.equal((await x.webhook(product,purchase,'evt_validslot')).status,200);
    assert.equal(x.db.prepare("SELECT COUNT(*) n FROM booster_slot_entitlements WHERE user_id='u' AND slot_number=5").get().n,1);
  }finally{x.close()}
});
test('existing 2x entitlement and both premium slots grant once across webhook retries',async()=>{
  const x=await setup();try{
    x.db.prepare("UPDATE progress SET businesses_json=?,rate_per_second=1 WHERE user_id='u'").run(JSON.stringify({collector:10}));
    for(const id of ['double_money','booster_slot_5','booster_slot_6']){
      x.db.prepare('DELETE FROM api_rate_limits').run();
      assert.equal((await x.post('/api/store/checkout',{productId:id})).status,200);
      const product=PRODUCTS.find(p=>p.id===id),purchase=x.db.prepare('SELECT * FROM store_purchases WHERE product_id=?').get(id);
      assert.equal((await x.webhook(product,purchase,'evt_pay'+id.replaceAll('_',''))).status,200);
      assert.equal((await x.webhook(product,purchase,'evt_retry'+id.replaceAll('_',''))).status,200);
      assert.equal((await x.post('/api/store/checkout',{productId:id})).status,409);
    }
    assert.equal(x.db.prepare("SELECT COUNT(*) n FROM entitlements WHERE user_id='u' AND entitlement='double_money'").get().n,1);
    assert.equal(x.db.prepare("SELECT rate_per_second FROM progress WHERE user_id='u'").get().rate_per_second,2);
    assert.deepEqual(x.db.prepare("SELECT slot_number FROM booster_slot_entitlements WHERE user_id='u' ORDER BY slot_number").all().map(r=>r.slot_number),[5,6]);
    const status=await (await x.get('/api/store/status')).json();
    assert.equal(status.entitlements.double_money,true);assert.equal(status.entitlements.booster_slot_5,true);assert.equal(status.entitlements.booster_slot_6,true);
  }finally{x.close()}
});
