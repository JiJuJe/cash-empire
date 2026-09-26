import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),wealth=require('../CashEmpire/wealth-progression.js');
test('wealth scenes progress from early clicks through seventeen late stages',()=>{
  assert.equal(wealth.stage(0,0),0);
  assert.equal(wealth.stage(0,10),1);
  assert.equal(wealth.stage(0,1000),3);
  assert.equal(wealth.stage(0,1e7),7);
  assert.equal(wealth.stage(0,1e9),9);
  assert.equal(wealth.stage(0,1e26),17);
  assert.equal(wealth.thresholds.lifetime.length,18);
});
test('highest historical rate and lifetime keep the visual stage after Rebirth',()=>{
  const highest=wealth.stage(1e12,1e6);
  assert.ok(highest>=15);
  assert.equal(wealth.stage(1e12,1e6),highest);
  assert.ok(wealth.stage(0,1e18)>=14);
});
