import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import worker,{testing} from "../worker/index.mjs";
import {validateUsername} from "../worker/auth.mjs";

const businesses=Object.fromEntries(["collector","lemonade","newspaper","vending","shop","restaurant","supermarket","factory","bank","corporation","exchange","mega","global","moon","galactic","multiverse"].map(id=>[id,0]));
const progress=(overrides={})=>({
  userId:"testuser123",balance:1000,lifetime:1000,runEarned:1000,rebirths:0,
  empirePoints:0,empireSpent:0,totalClicks:0,lastClickMs:0,lastAccrualMs:100000,lastGoldenMs:0,
  businesses:{...businesses},upgrades:[],prestige:[],version:0,...overrides
});

test("server batches clicks, validates prices, and halves offline passive income",()=>{
  const base=progress();
  assert.equal(testing.applyAction(base,{type:"click_batch",count:1},100000,false).balance,1001);
  assert.equal(testing.applyAction(base,{type:"click_batch",count:1},100000,true).balance,1002);
  assert.throws(()=>testing.applyAction(base,{type:"click_batch",count:200},100000,false));
  assert.throws(()=>testing.applyAction(base,{type:"buy_business",businessId:"collector",quantity:0},100000,false));
  const bought=testing.applyAction(base,{type:"buy_business",businessId:"collector",quantity:1},100000,false);
  assert.equal(bought.balance,990);
  assert.equal(bought.businesses.collector,1);
  const automated=testing.applyAction(progress({businesses:{...businesses,collector:10}}),{type:"click_batch",count:1},3700000,false);
  assert.equal(automated.balance,2801);
  assert.equal(automated.lifetime,2801);
  const regular=testing.applyAction(progress({businesses:{...businesses,collector:10}}),{type:"click_batch",count:1},110000,false);
  assert.equal(regular.balance,1011);
});

test("60 seconds of manual click batches survive interleaved purchases without weakening the click rate",()=>{
  let state=progress({balance:100000,lifetime:100000,runEarned:100000});
  for(let batch=0;batch<30;batch++){
    const now=100000+batch*2000;
    state=testing.applyAction(state,{type:"click_batch",count:24},now,false);
    state=testing.applyAction(state,{type:"buy_business",businessId:"collector",quantity:1},now+1000,false);
  }
  assert.equal(state.totalClicks,720);
  assert.equal(state.businesses.collector,30);
  assert.throws(()=>testing.applyAction(state,{type:"click_batch",count:37},160000,false),/Invalid click batch/);
  const fresh=testing.applyAction(progress(),{type:"click_batch",count:24},100000,false);
  assert.throws(()=>testing.applyAction(fresh,{type:"click_batch",count:24},100100,false),/Invalid click batch/);
  assert.equal(testing.applyAction(fresh,{type:"click_batch",count:24},102000,false).totalClicks,48);
});

test("two minutes of clicking, purchases and upgrades preserve legitimate batches",()=>{
  let state=progress({balance:1e12,lifetime:1e12,runEarned:1e12});
  for(let batch=0;batch<48;batch++){
    const now=200000+batch*2500;
    state=testing.applyAction(state,{type:"click_batch",count:24},now,false);
    const business=batch===0?"lemonade":batch===1?"newspaper":"collector";
    const quantity=batch===0?10:batch===1?100:1;
    state=testing.applyAction(state,{type:"buy_business",businessId:business,quantity},now+100,false);
    if(batch===2)state=testing.applyAction(state,{type:"buy_upgrade",upgradeId:"wallet"},now+200,false);
    if(batch===4)state=testing.applyAction(state,{type:"golden"},now+300,false);
  }
  assert.equal(state.totalClicks,48*24);
  assert.equal(state.businesses.collector,46);
  assert.equal(state.businesses.lemonade,10);
  assert.equal(state.businesses.newspaper,100);
  assert.ok(state.upgrades.includes("wallet"));
  assert.ok(state.lifetime>1e12);
});

test("rebirth, golden reward, and entitlement use server-calculated values",()=>{
  const reborn=testing.applyAction(progress({runEarned:10000000}),{type:"rebirth"},100000,false);
  assert.equal(reborn.rebirths,1);
  assert.equal(reborn.empirePoints,1);
  assert.equal(reborn.balance,0);
  const premium=testing.applyAction(progress(),{type:"click_batch",count:1},100000,true);
  assert.equal(premium.balance,1002);
  assert.equal(testing.businessRate(progress({businesses:{...businesses,collector:10}}),true),2);
  const gold=testing.applyAction(progress(),{type:"golden"},200000,false);
  assert.equal(gold.balance,1100);
  assert.throws(()=>testing.applyAction(gold,{type:"golden"},201000,false));
});

test("username validation rejects duplicates by normalization and obfuscation",()=>{
  assert.deepEqual(validateUsername("CashKing92"),{ok:true,username:"CashKing92",normalized:"cashking92"});
  assert.equal(validateUsername("cashking92").normalized,validateUsername("CASHKING92").normalized);
  for(const value of ["ad_min","ADMIN","ＡＤＭＩＮ","b4dw0rd","baaaadword","b.a.d.w.o.r.d","\u200bad_m_in","a b","a","a".repeat(21),"pоrn"]){
    assert.equal(validateUsername(value).ok,false,value);
  }
});

test("migration enforces Google identity and case-insensitive username uniqueness",()=>{
  const db=new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../migrations/0001_leaderboard_store.sql",import.meta.url),"utf8"));
  db.exec(readFileSync(new URL("../migrations/0002_google_accounts.sql",import.meta.url),"utf8"));
  db.prepare("INSERT INTO users(id,username,created_at_ms,google_subject,username_normalized,username_set) VALUES(?,?,?,?,?,1)")
    .run("one","CashKing",1,"google-one","cashking");
  assert.throws(()=>db.prepare("INSERT INTO users(id,username,created_at_ms,google_subject,username_normalized,username_set) VALUES(?,?,?,?,?,1)")
    .run("two","cashking",2,"google-two","cashking"));
  assert.throws(()=>db.prepare("INSERT INTO users(id,username,created_at_ms,google_subject,username_normalized,username_set) VALUES(?,?,?,?,?,1)")
    .run("three","OtherUser",3,"google-one","otheruser"));
  db.close();
});

test("client-supplied totals are refused",async()=>{
  const response=await worker.fetch(new Request("https://game.example/api/progress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lifetimeCash:999999999999})}),{DB:{}});
  assert.equal(response.status,400);
});

test("Store remains unavailable without a signed-in account or payment configuration",async()=>{
  const status=await worker.fetch(new Request("https://game.example/api/store/status"),{});
  assert.deepEqual(await status.json(),{authenticated:false,paymentsAvailable:false,entitlements:{double_money:false}});
  const checkout=await worker.fetch(new Request("https://game.example/api/store/checkout",{method:"POST"}),{DB:{}});
  assert.equal(checkout.status,503);
});

test("Google login is configured server-side and redirects with state, nonce and PKCE",async()=>{
  const unavailable=await worker.fetch(new Request("https://clickthecash.online/api/auth/google/start"),{DB:{}});
  assert.equal(unavailable.status,503);
  const db={prepare(){return {bind(){return this},async run(){return {meta:{changes:1}}},async first(){return {count:1}}}}};
  const response=await worker.fetch(new Request("https://clickthecash.online/api/auth/google/start"),{
    DB:db,SESSION_SECRET:"long-private-secret",GOOGLE_CLIENT_ID:"test-client",GOOGLE_CLIENT_SECRET:"test-secret",PUBLIC_SITE_URL:"https://clickthecash.online"
  });
  assert.equal(response.status,302);
  const location=new URL(response.headers.get("Location"));
  assert.equal(location.origin,"https://accounts.google.com");
  assert.equal(location.searchParams.get("redirect_uri"),"https://clickthecash.online/api/auth/google/callback");
  assert.ok(location.searchParams.get("state"));
  assert.ok(location.searchParams.get("nonce"));
  assert.equal(location.searchParams.get("code_challenge_method"),"S256");
  assert.match(response.headers.get("Set-Cookie"),/HttpOnly; SameSite=Lax; Secure/);
});

test("webhook signature rejects tampering",async()=>{
  const raw='{"id":"evt_test"}',timestamp=Math.floor(Date.now()/1000);
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode("whsec_test"),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const bytes=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(timestamp+"."+raw)));
  const signature=[...bytes].map(byte=>byte.toString(16).padStart(2,"0")).join("");
  assert.equal(await testing.verifyStripeSignature(raw,"t="+timestamp+",v1="+signature,"whsec_test"),true);
  assert.equal(await testing.verifyStripeSignature(raw+"x","t="+timestamp+",v1="+signature,"whsec_test"),false);
});
