import test from 'node:test';
import assert from 'node:assert/strict';
import {testing} from '../worker/index.mjs';
const businesses=Object.fromEntries(['collector','lemonade','newspaper','vending','shop','restaurant','supermarket','factory','bank','corporation','exchange','mega','global','moon','galactic','multiverse'].map(id=>[id,0]));
const base=tier=>({userId:'u',balance:0,lifetime:0,runEarned:0,rebirths:0,empirePoints:0,empireSpent:0,totalClicks:0,lastAccrualMs:100000,lastGoldenMs:0,businesses:{...businesses},upgrades:[],prestige:[],version:0,pendingBillTier:tier,pendingBillUntilMs:210000});
test('bill rarity table follows the configured weights and luck stays valid',()=>{
  for(const [value,tier] of [[0,'golden'],[.9,'emerald'],[.98,'diamond'],[.995,'pink_diamond'],[.999,'obsidian']])assert.equal(testing.rollBillTier(()=>value).id,tier);
  for(const luck of [0,1,10,1e9])for(const value of [0,.25,.75,.99,.9999])assert.ok(testing.BILL_TIERS.includes(testing.rollBillTier(()=>value,luck)));
});
test('server-selected tiers control cash, rush length, and persistent claim counts',()=>{
  for(const tier of testing.BILL_TIERS){
    const cash=testing.applyAction(base(tier.id),{type:'golden'},200000,false,()=>.7);
    assert.equal(cash.event.type,'billCash');assert.equal(cash.event.tier,tier.id);
    assert.equal(cash.event.amount,610*tier.cash);
    assert.equal(cash.billClaims[tier.id],1);
    assert.equal(cash.pendingBillTier,null);
    const rush=testing.applyAction(base(tier.id),{type:'golden'},200000,false,()=>0);
    assert.equal(rush.event.multiplier,tier.rush);assert.equal(rush.rushUntilMs,200000+tier.seconds*1000);
    const clicked=testing.applyAction(rush,{type:'click_batch',count:1},200001,false);
    assert.equal(clicked.balance,tier.rush);
    assert.throws(()=>testing.applyAction(cash,{type:'golden'},200001,false),/not ready/);
  }
});
test('expired or absent bills cannot be claimed, and heartbeat creates a server-owned tier',()=>{
  assert.throws(()=>testing.applyAction(base(null),{type:'golden'},200000,false),/not ready/);
  assert.throws(()=>testing.applyAction({...base('obsidian'),pendingBillUntilMs:199999},{type:'golden'},200000,false),/not ready/);
  const state=base(null);testing.heartbeatState(state,200000,true,()=>0);
  assert.equal(state.pendingBillTier,'golden');assert.equal(state.pendingBillUntilMs,220000);
});
