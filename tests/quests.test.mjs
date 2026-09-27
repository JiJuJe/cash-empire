import test from "node:test";
import assert from "node:assert/strict";
import {questPeriod,normalizeQuestState,applyQuestDelta,questSummary,claimQuest,DAILY_QUESTS,WEEKLY_QUESTS} from "../worker/quests.mjs";
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
  applyQuestDelta(state,now,{clicks:25,businesses:1});
  const prizes=[];
  assert.equal(claimQuest(state,"daily","daily_tap_25",now,reward=>prizes.push(reward)).diamonds,2);
  assert.throws(()=>claimQuest(state,"daily","daily_tap_25",now,()=>{}),/unavailable/);
  assert.throws(()=>claimQuest(state,"daily","completion",now,()=>{}),/not complete/);
  applyQuestDelta(state,now,{clicks:3000,businesses:100,playtimeMs:300000,upgrades:2,golden:1,crates:1});
  for(const quest of DAILY_QUESTS)if(quest[0]!=="daily_tap_25")claimQuest(state,"daily",quest[0],now,reward=>prizes.push(reward));
  assert.equal(questSummary(state,now).daily.completionReady,true);
  const grand=claimQuest(state,"daily","completion",now,reward=>prizes.push(reward));
  assert.deepEqual(grand.crates,{wood:1});
  assert.throws(()=>claimQuest(state,"daily","completion",now,()=>{}),/not complete/);
  assert.ok(DAILY_QUESTS.at(-1)[6]>DAILY_QUESTS[0][6]);
  applyQuestDelta(state,now,{clicks:100000,businesses:250,playtimeMs:18000000,upgrades:5,golden:10,crates:10});
  for(const quest of WEEKLY_QUESTS)claimQuest(state,"weekly",quest[0],now,()=>{});
  assert.deepEqual(claimQuest(state,"weekly","completion",now,()=>{}).crates,{royal:1,wood:1});
});

test("server action rewards tasks without changing them on replay",()=>{
  const businesses=Object.fromEntries(["collector","lemonade","newspaper","vending","shop","restaurant","supermarket","factory","bank","corporation","exchange","mega","global","moon","galactic","multiverse"].map(id=>[id,0]));
  const base={userId:"test",balance:0,lifetime:0,runEarned:0,rebirths:0,empirePoints:0,empireSpent:0,totalClicks:0,lastAccrualMs:now,lastGoldenMs:0,businesses,upgrades:[],prestige:[],version:0};
  const clicked=testing.applyAction(base,{type:"click_batch",count:25},now,false);
  assert.equal(questSummary({daily:clicked.questDaily,weekly:clicked.questWeekly},now).daily.quests[0].progress,25);
  const claimed=testing.applyAction(clicked,{type:"claim_quest",period:"daily",questId:"daily_tap_25"},now,false);
  assert.equal(claimed.diamonds,2);
  assert.equal(claimed.balance,125);
  assert.throws(()=>testing.applyAction(claimed,{type:"claim_quest",period:"daily",questId:"daily_tap_25"},now,false),/unavailable/);
});
