import test from "node:test";
import assert from "node:assert/strict";
import {questPeriod,normalizeQuestState,refreshQuestState,applyQuestDelta,questSummary,claimQuest,DAILY_QUESTS,WEEKLY_QUESTS} from "../worker/quests.mjs";
import {testing} from "../worker/index.mjs";

const now=Date.parse("2026-09-27T12:00:00Z");
test("daily and weekly periods reset at UTC boundaries",()=>{
  assert.equal(DAILY_QUESTS.length,10);
  assert.equal(WEEKLY_QUESTS.length,12);
  assert.equal(questPeriod("daily",now).endsAtMs,Date.parse("2026-09-28T00:00:00Z"));
  assert.equal(questPeriod("weekly",now).endsAtMs,Date.parse("2026-09-28T00:00:00Z"));
  const old={key:questPeriod("daily",now).key,counters:{clicks:5000},claimed:["daily_tap_25"]};
  assert.equal(normalizeQuestState(old,"daily",now+86400000).counters.clicks,undefined);
});

test("each reward and completion can be claimed once, with harder rewards increasing",()=>{
  const state={daily:{},weekly:{}};
  applyQuestDelta(state,now,{clicks:100,businesses:5});
  const prizes=[];
  assert.equal(claimQuest(state,"daily","daily_tap_25",now,reward=>prizes.push(reward)).diamonds,2);
  assert.throws(()=>claimQuest(state,"daily","daily_tap_25",now,()=>{}),/unavailable/);
  assert.throws(()=>claimQuest(state,"daily","completion",now,()=>{}),/not complete/);
  applyQuestDelta(state,now,{clicks:10000,businesses:150,playtimeMs:900000,upgrades:4,golden:2,crates:2});
  for(const quest of DAILY_QUESTS)if(quest[0]!=="daily_tap_25")claimQuest(state,"daily",quest[0],now,reward=>prizes.push(reward));
  assert.equal(questSummary(state,now).daily.completionReady,true);
  const grand=claimQuest(state,"daily","completion",now,reward=>prizes.push(reward));
  assert.deepEqual(grand.crates,{wood:1});
  const renewed=refreshQuestState(state.daily,"daily",now);
  assert.equal(renewed.cycle,1);assert.deepEqual(renewed.claimed,[]);assert.deepEqual(renewed.counters,{});
  assert.throws(()=>refreshQuestState(renewed,"daily",now),/grand reward/);
  assert.throws(()=>claimQuest(state,"daily","completion",now,()=>{}),/not complete/);
  assert.ok(DAILY_QUESTS.at(-1)[6]>DAILY_QUESTS[0][6]);
  applyQuestDelta(state,now,{clicks:200000,businesses:500,playtimeMs:36000000,upgrades:10,golden:15,crates:15});
  for(const quest of WEEKLY_QUESTS)claimQuest(state,"weekly",quest[0],now,()=>{});
  assert.deepEqual(claimQuest(state,"weekly","completion",now,()=>{}).crates,{royal:1,wood:1});
});

test("server action rewards tasks without changing them on replay",()=>{
  const businesses=Object.fromEntries(["collector","lemonade","newspaper","vending","shop","restaurant","supermarket","factory","bank","corporation","exchange","mega","global","moon","galactic","multiverse"].map(id=>[id,0]));
  const base={userId:"test",balance:0,lifetime:0,runEarned:0,rebirths:0,empirePoints:0,empireSpent:0,totalClicks:0,lastAccrualMs:now,lastGoldenMs:0,businesses,upgrades:[],prestige:[],version:0};
  const clicked=testing.applyAction(base,{type:"click_batch",count:100},now,false);
  assert.equal(questSummary({daily:clicked.questDaily,weekly:clicked.questWeekly},now).daily.quests[0].progress,100);
  const claimed=testing.applyAction(clicked,{type:"claim_quest",period:"daily",questId:"daily_tap_25"},now,false);
  assert.equal(claimed.diamonds,2);
  assert.equal(claimed.balance,200);
  assert.throws(()=>testing.applyAction(claimed,{type:"claim_quest",period:"daily",questId:"daily_tap_25"},now,false),/unavailable/);
});
