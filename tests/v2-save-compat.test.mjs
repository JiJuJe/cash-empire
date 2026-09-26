import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../CashEmpire/script.js', import.meta.url), 'utf8');
const statement = (start, end) => {
  const from = source.indexOf(start);
  assert.ok(from >= 0, `${start} exists`);
  const to = source.indexOf(end, from);
  assert.ok(to > from, `${end} follows ${start}`);
  return source.slice(from, to);
};

test('V2 resets legacy guest progress once while preserving protected inventory', () => {
  assert.match(source, /SAVE_KEY = "cash-empire-save-v1"/);
  const code = [
    statement('  const BUSINESS = [', '  const CLICK_UPGRADES = ['),
    statement('  const CLICK_UPGRADES = [', '  const SPECIAL_UPGRADES = ['),
    statement('  const SPECIAL_UPGRADES = [', '  const MILESTONES = ['),
    statement('  const MILESTONES = [', '  const EARLY_PRESTIGE='),
    statement('  const EARLY_PRESTIGE=', '  const BOOSTERS='),
    statement('  const BOOSTERS=', '  const SLOT_PRICES='),
    statement('  const PRESTIGE =', '  const SUFFIXES ='),
    statement('  const defaultState =', '  let state ='),
    source.match(/^  const safeNumber =.*;$/m)?.[0] || '',
    statement('  function migratePreResetSave(raw)', '  function load()'),
    'globalThis.normalizeSave = normalize;'
  ].join('\n');
  const context = {Date, Math, Number, Object, Array, Set, Error};
  vm.runInNewContext(`const DROP_INTERVAL_MS=600000; const ACHIEVEMENTS=[{id:'click-1'},{id:'earn-100'}]; ${code}`, context);
  const legacy = {
    version: 1, money: 123456, runEarned: 789012, lifetime: 2345678,
    businesses: {collector: 46, lemonade: 32, bank: 3},
    businessRevenue: {collector: 1250, lemonade: 789},
    upgrades: ['wallet', 'marketSense'], achievements: ['click-1', 'earn-100'],
    rebirths: 4, empireTotal: 21, empireSpent: 5,
    prestigeUpgrades: ['starterCapital'], totalClicks: 1824,
    boosterInventory: {coinPurse: 2, richInvestor: 1},
    equippedBoosters: ['coinPurse', 'richInvestor'], boosterSlotsUnlocked: 2,
    settings: {animations: false, particles: false}
  };
  const result = context.normalizeSave(legacy);
  assert.equal(result.money, 1000000);
  for (const key of ['runEarned', 'lifetime', 'rebirths', 'empireTotal', 'empireSpent', 'totalClicks', 'diamonds'])
    assert.equal(result[key], 0, key);
  for (const key of ['collector', 'lemonade', 'bank'])
    assert.equal(result.businesses[key], 0, key);
  assert.equal(result.businessRevenue.collector, 0);
  assert.deepEqual(Array.from(result.upgrades), []);
  assert.deepEqual(Array.from(result.achievements), []);
  assert.deepEqual(Array.from(result.prestigeUpgrades), []);
  assert.equal(result.boosterInventory.coinPurse, 2);
  assert.equal(result.boosterInventory.richInvestor, 1);
  assert.deepEqual(Array.from(result.equippedBoosters.slice(0, 2)), legacy.equippedBoosters);
  assert.equal(result.settings.animations, false);
  assert.equal(result.settings.particles, false);
  assert.equal(result.globalResetVersion, 2);
  assert.equal(context.normalizeSave(result).money, 1000000);
});
