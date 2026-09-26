import test from 'node:test';
import assert from 'node:assert/strict';
import {achievementReward,CRATES,freeCratePeriod,freeCrateStatus,rollCrate,publicCrates} from '../worker/rewards.mjs';
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
test('free crate periods reset at UTC day, Monday week, and month boundaries',()=>{
  const sunday=Date.parse('2026-09-27T23:59:59Z'),monday=Date.parse('2026-09-28T00:00:00Z');
  assert.equal(freeCratePeriod('wood',sunday).key,'2026-09-27');
  assert.equal(freeCratePeriod('wood',monday).key,'2026-09-28');
  assert.equal(freeCratePeriod('iron',sunday).key,'2026-09-21');
  assert.equal(freeCratePeriod('iron',monday).key,'2026-09-28');
  assert.equal(freeCratePeriod('royal',monday).key,'2026-09');
  assert.equal(freeCratePeriod('royal',Date.parse('2026-10-01T00:00:00Z')).key,'2026-10');
  assert.equal(freeCrateStatus({wood:'2026-09-27',iron:'2026-09-21',royal:'2026-09'},sunday).wood.claimed,true);
  assert.equal(freeCrateStatus({wood:'2026-09-27',iron:'2026-09-21',royal:'2026-09'},monday).wood.claimed,false);
});
