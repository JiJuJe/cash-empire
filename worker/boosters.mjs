export const BOOSTERS=[
  ["coinPurse","Coin Purse","common","total",.04],
  ["fastHands","Fast Hands","common","click",.10],
  ["smallSponsor","Small Sponsor","common","business",.08],
  ["nightOwl","Night Owl","common","offline",.12],
  ["dealHunter","Deal Hunter","common","discount",.02],
  ["luckyCoin","Lucky Coin","common","goldenCash",.15],
  ["richInvestor","Rich Investor","rare","total",.15],
  ["bigSponsor","Big Sponsor","rare","business",.20],
  ["clickPro","Click Pro","rare","click",.30],
  ["goldenScout","Golden Scout","rare","goldenFrequency",.20],
  ["smartManager","Smart Manager","rare","discount",.04],
  ["ventureCapitalist","Venture Capitalist","epic","total",.25],
  ["marketGenius","Market Genius","epic","business",.35],
  ["rebirthStrategist","Rebirth Strategist","epic","rebirthPoints",.20],
  ["goldenTouch","Golden Touch","epic","goldenCash",.35],
  ["billionaireMentor","Billionaire Mentor","legendary","total",.40],
  ["empireArchitect","Empire Architect","legendary","business",.55],
  ["goldenEmperor","Golden Emperor","legendary","goldenCash",.70],
  ["moneyKing","Money King","mythic","total",.60],
  ["infiniteSponsor","Infinite Sponsor","mythic","business",.75]
].map(([id,name,rarity,effect,value])=>({id,name,rarity,effect,value}));
export const RARITY_WEIGHTS=[['common',55],['rare',28],['epic',12],['legendary',4],['mythic',1]];
export const EARLY_PRESTIGE={starterCapital:1,quickCollectors:2,clickTraining:3,businessNetwork:4,goldenRadar:5,offlineOffice:6,bulkBuyer:7,empireMomentum:8,goldenReserve:9,rebirthMastery:10};
export const SLOT_PRICES={2:10000000,3:1000000000,4:100000000000};
export const DROP_INTERVAL_MS=600000;
export function boosterBonus(state,effect){
  const equipped=Array.isArray(state.equipped)?state.equipped:[];
  const inventory=state.boosterInventory||{};
  return equipped.reduce((sum,id)=>{
    const b=BOOSTERS.find(item=>item.id===id);
    return sum+(b?.effect===effect&&inventory[id]>0?b.value:0);
  },0);
}
export function rollBooster(random=Math.random){
  let roll=random()*100,rarity='common';
  for(const [name,weight] of RARITY_WEIGHTS){roll-=weight;if(roll<0){rarity=name;break;}}
  const pool=BOOSTERS.filter(b=>b.rarity===rarity);
  return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
}
