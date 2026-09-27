const DAY=86400000;
const WEEK=7*DAY;
export const DAILY_QUESTS=[
  ["daily_tap_25","First taps","Click 25 times","clicks",25,"Very easy",2,100],
  ["daily_business_1","Open for business","Buy 1 business","businesses",1,"Very easy",2,150],
  ["daily_tap_200","Cash rhythm","Click 200 times","clicks",200,"Easy",4,500],
  ["daily_business_10","Growing portfolio","Buy 10 businesses","businesses",10,"Easy",4,750],
  ["daily_play_5","On the clock","Play actively for 5 minutes","playtimeMs",300000,"Medium",6,1500],
  ["daily_upgrade_2","Smart investments","Buy 2 upgrades","upgrades",2,"Medium",6,2000],
  ["daily_gold_1","Golden moment","Claim 1 Golden Bill","golden",1,"Hard",8,5000],
  ["daily_crate_1","Unbox a surprise","Open 1 crate","crates",1,"Hard",8,5000],
  ["daily_tap_3000","Tap marathon","Click 3,000 times","clicks",3000,"Very hard",12,15000],
  ["daily_business_100","Big expansion","Buy 100 businesses","businesses",100,"Very hard",12,20000]
];
export const WEEKLY_QUESTS=[
  ["weekly_tap_500","Warm up","Click 500 times","clicks",500,"Very easy",5,1000],
  ["weekly_business_25","First investments","Buy 25 businesses","businesses",25,"Easy",6,2000],
  ["weekly_play_1h","Dedicated player","Play actively for 1 hour","playtimeMs",3600000,"Medium",8,5000],
  ["weekly_upgrade_5","Build your strategy","Buy 5 upgrades","upgrades",5,"Medium",8,5000],
  ["weekly_gold_3","Golden streak","Claim 3 Golden Bills","golden",3,"Medium",8,6000],
  ["weekly_crate_3","Treasure hunter","Open 3 crates","crates",3,"Medium",8,6000],
  ["weekly_tap_10000","Ten thousand taps","Click 10,000 times","clicks",10000,"Hard",12,20000],
  ["weekly_business_250","Enterprise builder","Buy 250 businesses","businesses",250,"Hard",12,25000],
  ["weekly_play_5h","Long haul","Play actively for 5 hours","playtimeMs",18000000,"Hard",12,25000],
  ["weekly_gold_10","Golden collector","Claim 10 Golden Bills","golden",10,"Very hard",18,40000],
  ["weekly_crate_10","Master unboxer","Open 10 crates","crates",10,"Very hard",18,40000],
  ["weekly_tap_100000","Legendary fingers","Click 100,000 times","clicks",100000,"Very hard",20,50000]
];
export const QUEST_SETS={daily:DAILY_QUESTS,weekly:WEEKLY_QUESTS};
export function questPeriod(kind,now){
  if(kind==="daily"){
    const start=Math.floor(now/DAY)*DAY;
    return {key:new Date(start).toISOString().slice(0,10),endsAtMs:start+DAY};
  }
  const start=Math.floor((now-4*DAY)/WEEK)*WEEK+4*DAY;
  return {key:new Date(start).toISOString().slice(0,10),endsAtMs:start+WEEK};
}
function fresh(kind,now){return {key:questPeriod(kind,now).key,counters:{},claimed:[],completionClaimed:false};}
export function normalizeQuestState(value,kind,now){
  const period=questPeriod(kind,now);
  if(!value||value.key!==period.key)return fresh(kind,now);
  return {key:period.key,counters:value.counters&&typeof value.counters==="object"&&!Array.isArray(value.counters)?value.counters:{},
    claimed:Array.isArray(value.claimed)?value.claimed:[],completionClaimed:value.completionClaimed===true};
}
export function applyQuestDelta(state,now,delta){
  for(const kind of ["daily","weekly"]){
    const item=state[kind]=normalizeQuestState(state[kind],kind,now);
    for(const [field,change] of Object.entries(delta))if(Number.isFinite(change)&&change>0)
      item.counters[field]=Math.min(1e12,(Number(item.counters[field])||0)+change);
  }
}
export function questSummary(state,now){
  return Object.fromEntries(["daily","weekly"].map(kind=>{
    const period=questPeriod(kind,now),item=normalizeQuestState(state[kind],kind,now);
    const quests=QUEST_SETS[kind].map(([id,title,description,metric,target,difficulty,diamonds,cash])=>({
      id,title,description,metric,target,difficulty,diamonds,cash,
      progress:Math.min(target,Math.max(0,Math.floor(Number(item.counters[metric])||0))),
      claimed:item.claimed.includes(id)
    }));
    return [kind,{periodKey:period.key,endsAtMs:period.endsAtMs,quests,completionClaimed:item.completionClaimed,
      completionReady:quests.every(quest=>quest.claimed)}];
  }));
}
export function claimQuest(state,kind,id,now,award){
  const definitions=QUEST_SETS[kind];if(!definitions)throw Error("Unknown quest period.");
  const item=state[kind]=normalizeQuestState(state[kind],kind,now);
  if(id==="completion"){
    if(item.completionClaimed||definitions.some(quest=>!item.claimed.includes(quest[0])))throw Error("Quest series is not complete.");
    item.completionClaimed=true;
    const reward=kind==="daily"?{cash:250000,diamonds:40,crates:{wood:1}}:{cash:2000000,diamonds:150,crates:{royal:1,wood:1}};
    award(reward);return reward;
  }
  const quest=definitions.find(quest=>quest[0]===id);
  if(!quest||item.claimed.includes(id)||(Number(item.counters[quest[3]])||0)<quest[4])throw Error("Quest reward unavailable.");
  item.claimed.push(id);
  const reward={diamonds:quest[6],cash:quest[7],crates:{}};
  award(reward);return reward;
}
