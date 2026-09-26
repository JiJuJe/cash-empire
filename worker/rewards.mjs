import {BOOSTERS} from './boosters.mjs';
import {COSMETIC_BY_ID} from './store-catalog.mjs';

export const ACHIEVEMENT_TARGETS={
  earn:[1,100,1e4,1e6,1e9,1e12,1e15,1e18,1e21],
  click:[1,10,100,1000,10000,100000],
  business:[1,10,50,250,1000,5000],
  rate:[1,10,100,1000,10000,1000000,1e9,1e12],
  gold:[1,5,25,100],rebirth:[1,5,20,100],
  upgrade:[1,5,20,50],collector:[1,10,100,500],empire:[1,10,100]
};
export function achievementReward(id){
  const match=/^([a-z]+)-([\d.e+]+)$/.exec(id);
  if(!match)return null;
  const targets=ACHIEVEMENT_TARGETS[match[1]];
  const index=targets?.indexOf(Number(match[2]))??-1;
  if(index<0)return null;
  const base={earn:25,click:20,business:100,rate:75,gold:500,rebirth:2500,upgrade:150,collector:60,empire:1000}[match[1]];
  return Math.min(1e25,Math.round(base*Math.pow(8,index)));
}

const cosmeticIds=[
  'emerald_pile','emerald_click','diamond_pile','diamond_click',
  'pink_diamond_pile','obsidian_pile','neon_click','black_gold_cards',
  'vault_background','cosmic_pile','luxury_cards'
].filter(id=>COSMETIC_BY_ID.has(id));
const tier=(id,name,cashPrice,priceCents,weights,cashRange,boosterRarities,cosmetics,nextCrate)=>({
  id,name,cashPrice,priceCents,weights,cashRange,boosterRarities,
  cosmetics:cosmetics.filter(item=>cosmeticIds.includes(item)),nextCrate
});
export const CRATES=[
  tier('wood','Wood Crate',25000,50,{cash:55,booster:30,cosmetic:12,crate:3},[5000,40000],['common','rare'],['emerald_pile','emerald_click','neon_click'],'iron'),
  tier('iron','Iron Crate',2500000,100,{cash:35,booster:40,cosmetic:20,crate:5},[200000,4000000],['rare','epic','legendary'],['diamond_pile','diamond_click','black_gold_cards','vault_background'],'royal'),
  tier('royal','Royal Crate',100000000,300,{cash:20,booster:40,cosmetic:32,crate:8},[10000000,180000000],['epic','legendary','mythic'],['pink_diamond_pile','obsidian_pile','cosmic_pile','luxury_cards'],'royal')
];
export const CRATE_BY_ID=new Map(CRATES.map(crate=>[crate.id,crate]));
export function publicCrates(){return CRATES.map(({id,name,cashPrice,priceCents,weights,cashRange,boosterRarities,cosmetics,nextCrate})=>({id,name,cashPrice,priceCents,weights,cashRange,boosterRarities,cosmetics:cosmetics.map(id=>({id,name:COSMETIC_BY_ID.get(id)?.name||id})),nextCrate}));}
export function rollCrate(crate,random=Math.random){
  let pick=Math.max(0,Math.min(.999999999,random()))*100;
  let kind='cash';
  for(const [key,weight] of Object.entries(crate.weights)){pick-=weight;if(pick<0){kind=key;break;}}
  if(kind==='cash'){
    const [min,max]=crate.cashRange;
    return {kind,amount:Math.round(min+(max-min)*random())};
  }
  if(kind==='booster'){
    const pool=BOOSTERS.filter(item=>crate.boosterRarities.includes(item.rarity));
    const item=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
    return {kind,id:item.id,name:item.name,rarity:item.rarity};
  }
  if(kind==='cosmetic'){
    const id=crate.cosmetics[Math.min(crate.cosmetics.length-1,Math.floor(random()*crate.cosmetics.length))];
    return {kind,id,name:COSMETIC_BY_ID.get(id)?.name||id};
  }
  return {kind:'crate',id:crate.nextCrate,name:CRATE_BY_ID.get(crate.nextCrate).name};
}
