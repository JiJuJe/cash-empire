import test from "node:test";
import assert from "node:assert/strict";
import worker,{testing,createSessionToken} from "../worker/index.mjs";

const businesses=Object.fromEntries(["collector","lemonade","newspaper","vending","shop","restaurant","supermarket","factory","bank","corporation","exchange","mega","global","moon","galactic","multiverse"].map(id=>[id,0]));
const progress=(overrides={})=>({
  userId:"testuser123",balance:1000,lifetime:1000,runEarned:1000,rebirths:0,
  empirePoints:0,empireSpent:0,totalClicks:0,lastClickMs:0,lastAccrualMs:100000,
  businesses:{...businesses},upgrades:[],prestige:[],version:0,...overrides
});

test("server applies validated clicks, prices, and passive income",()=>{
  const base=progress();
  assert.equal(testing.applyAction(base,{type:"click"},100000,false).balance,1001);
  assert.equal(testing.applyAction(base,{type:"click"},100000,true).balance,1002);
  assert.throws(()=>testing.applyAction(base,{type:"buy_business",businessId:"collector",quantity:0},100000,false));
  const bought=testing.applyAction(base,{type:"buy_business",businessId:"collector",quantity:1},100000,false);
  assert.equal(bought.balance,990);
  assert.equal(bought.businesses.collector,1);
  const automated=testing.applyAction(progress({businesses:{...businesses,collector:10}}),{type:"click"},3700000,false);
  assert.equal(automated.balance,4601);
  assert.throws(()=>testing.applyAction(testing.applyAction(base,{type:"click"},100000,false),{type:"click"},100020,false));
});

test("rebirth and entitlement cannot change pre-existing balance",()=>{
  const reborn=testing.applyAction(progress({runEarned:10000000}),{type:"rebirth"},100000,false);
  assert.equal(reborn.rebirths,1);
  assert.equal(reborn.empirePoints,1);
  assert.equal(reborn.balance,0);
  const premium=testing.applyAction(progress(),{type:"click"},100000,true);
  assert.equal(premium.balance,1002);
  assert.equal(testing.businessRate(progress({businesses:{...businesses,collector:10}}),true),2);
});

test("malformed names and client-supplied totals are rejected",async()=>{
  assert.equal(testing.sanitizeUsername("<script>"),null);
  assert.equal(testing.sanitizeUsername("  Good Player  "),"Good Player");
  const fakeDb={};
  const response=await worker.fetch(new Request("https://game.example/api/progress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lifetimeCash:999999999999})}),{DB:fakeDb});
  assert.equal(response.status,400);
});

test("guest Store cannot claim an entitlement or checkout",async()=>{
  const status=await worker.fetch(new Request("https://game.example/api/store/status"),{});
  assert.deepEqual(await status.json(),{authenticated:false,paymentsAvailable:false,entitlements:{double_money:false}});
  const checkout=await worker.fetch(new Request("https://game.example/api/store/checkout",{method:"POST"}),{DB:{}});
  assert.equal(checkout.status,503);
});

test("session token and webhook signature are cryptographically checked",async()=>{
  const token=await createSessionToken("testuser123","a-long-test-secret",Date.now()+60000);
  assert.match(token,/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
  const raw='{"id":"evt_test"}',timestamp=Math.floor(Date.now()/1000);
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode("whsec_test"),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const bytes=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(timestamp+"."+raw)));
  const signature=[...bytes].map(byte=>byte.toString(16).padStart(2,"0")).join("");
  assert.equal(await testing.verifyStripeSignature(raw,"t="+timestamp+",v1="+signature,"whsec_test"),true);
  assert.equal(await testing.verifyStripeSignature(raw+"x","t="+timestamp+",v1="+signature,"whsec_test"),false);
});

test("entitlement requires a valid signed session and D1 row",async()=>{
  const secret="another-long-test-secret";
  const token=await createSessionToken("testuser123",secret,Date.now()+60000);
  const db={prepare(sql){return {
    bind(){return this},
    async run(){return {meta:{changes:1}}},
    async first(){
      if(sql.includes("FROM users"))return {id:"testuser123",username:"Tester"};
      if(sql.includes("FROM entitlements"))return {owned:1};
      if(sql.includes("SELECT count FROM api_rate_limits"))return {count:1};
      return null;
    }
  }}};
  const makeRequest=value=>new Request("https://game.example/api/store/status",{headers:{Cookie:"ce_session="+value}});
  const valid=await worker.fetch(makeRequest(token),{DB:db,SESSION_SECRET:secret});
  assert.equal((await valid.json()).entitlements.double_money,true);
  const forged=token.slice(0,-1)+(token.endsWith("0")?"1":"0");
  const invalid=await worker.fetch(makeRequest(forged),{DB:db,SESSION_SECRET:secret});
  assert.equal((await invalid.json()).entitlements.double_money,false);
});
