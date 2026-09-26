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
  for(const name of ['0001_leaderboard_store.sql','0002_google_accounts.sql','0003_playtime_boosters.sql','0004_cloud_click_streams.sql','0005_admin_moderation.sql','0006_store_cosmetics_bills.sql'])db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
  db.prepare("INSERT INTO users(id,username,created_at_ms,username_normalized,username_set) VALUES('u','Buyer',1,'buyer',1)").run();
  const token='S'.repeat(43),hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,created_at_ms,expires_at_ms) VALUES(?,?,?,?)').run(hash,'u',Date.now(),Date.now()+3600000);
  db.prepare("INSERT INTO progress(user_id,last_accrual_ms,balance) VALUES('u',?,1000)").run(Date.now());
  const env={DB:d1(db),PUBLIC_SITE_URL:origin,STRIPE_SECRET_KEY:'test-secret',STRIPE_WEBHOOK_SECRET:'webhook-test-secret',GAME_API_LIMITER:{async limit(){return {success:true}}}};
  const headers={Cookie:'__Host-ce_session='+token,Origin:origin,'Content-Type':'application/json'};
  const get=path=>worker.fetch(new Request(origin+path,{headers:{Cookie:headers.Cookie}}),env);
  const post=(path,body)=>worker.fetch(new Request(origin+path,{method:'POST',headers,body:JSON.stringify(body)}),env);
  let stripeCount=0;
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{if(String(url)!=='https://api.stripe.com/v1/checkout/sessions')return originalFetch(url,options);stripeCount++;return Response.json({id:'cs_test_'+stripeCount,url:'https://checkout.stripe.com/c/pay/test_'+stripeCount});};
  const webhook=async(product,purchase,eventId='evt_test123',overrides={})=>{
    const session={id:purchase.provider_session_id,client_reference_id:'u',payment_status:'paid',mode:'payment',currency:'eur',amount_total:product.priceCents,metadata:{product_id:product.id,purchase_id:purchase.id,user_id:'u'},...overrides};
    const raw=JSON.stringify({id:eventId,type:'checkout.session.completed',data:{object:session}});
    const timestamp=Math.floor(Date.now()/1000),signature=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(timestamp+'.'+raw).digest('hex');
    return worker.fetch(new Request(origin+'/api/store/webhook',{method:'POST',headers:{'Stripe-Signature':`t=${timestamp},v1=${signature}`},body:raw}),env);
  };
  return {db,env,get,post,webhook,close(){globalThis.fetch=originalFetch;db.close()}};
}
test('all thirteen prices are server selected and unknown products are rejected',async()=>{
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
test('paid cosmetic purchase follows the account, equips securely, and webhook replay grants once',async()=>{
  const x=await setup();try{
    const before=await (await x.get('/api/cosmetics')).json();assert.deepEqual(before,{owned:[],loadout:{}});
    assert.equal((await x.post('/api/cosmetics/equip',{slot:'pile',cosmeticId:'emerald_pile'})).status,403);
    assert.equal((await x.post('/api/store/checkout',{productId:'emerald_style'})).status,200);
    const purchase=x.db.prepare("SELECT * FROM store_purchases WHERE product_id='emerald_style'").get();
    const product=PRODUCTS.find(p=>p.id==='emerald_style');
    assert.equal((await x.webhook(product,purchase)).status,200);
    assert.equal((await x.webhook(product,purchase)).status,200);
    assert.equal(x.db.prepare("SELECT COUNT(*) n FROM cosmetic_entitlements WHERE user_id='u'").get().n,5);
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
