import test from 'node:test';
import assert from 'node:assert/strict';
import {achievementReward,CRATES,rollCrate,publicCrates} from '../worker/rewards.mjs';
import {PRODUCT_BY_ID} from '../worker/store-catalog.mjs';

test('three crate previews match server odds and checkout prices',()=>{
  const previews=publicCrates();
  assert.deepEqual(previews.map(c=>c.id),['wood','iron','royal']);
  for(const crate of CRATES){
    assert.equal(Object.values(crate.weights).reduce((a,b)=>a+b,0),100);
    assert.equal(crate.priceCents,PRODUCT_BY_ID.get('crate_'+crate.id).priceCents);
    assert.ok(crate.cosmetics.length>0);
    assert.ok(crate.cashRange[1]>crate.cashRange[0]);
  }
});
test('server rolls each crate reward category without client supplied loot',()=>{
  const crate=CRATES[0];
  const sequence=(...values)=>{let i=0;return ()=>values[i++];};
  assert.equal(rollCrate(crate,sequence(.1,.5)).kind,'cash');
  assert.equal(rollCrate(crate,sequence(.6,.2)).kind,'booster');
  assert.equal(rollCrate(crate,sequence(.9,.2)).kind,'cosmetic');
  assert.deepEqual(rollCrate(crate,sequence(.99)),{kind:'crate',id:'iron',name:'Iron Crate'});
});
test('harder achievements pay more and unknown IDs have no reward',()=>{
  assert.ok(achievementReward('earn-100')>achievementReward('earn-1'));
  assert.ok(achievementReward('click-1000')>achievementReward('click-10'));
  assert.equal(achievementReward('made-up-1'),null);
});
