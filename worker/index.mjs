import {readSession,handleAuthRequest} from "./auth.mjs";
import {BOOSTERS,EARLY_PRESTIGE,SLOT_PRICES,DROP_INTERVAL_MS,boosterBonus,rollBooster} from "./boosters.mjs";
const PRICE_GROWTH = 1.15;
const LIMIT = 1e300;
const BUSINESS = [
  ["collector",10,0.1],["lemonade",15,0.2],["newspaper",100,1],
  ["vending",1000,8],["shop",12000,47],["restaurant",130000,260],
  ["supermarket",1400000,1400],["factory",20000000,9000],
  ["bank",330000000,55000],["corporation",7000000000,420000],
  ["exchange",170000000000,3500000],["mega",4500000000000,30000000],
  ["global",140000000000000,300000000],["moon",5000000000000000,4000000000],
  ["galactic",250000000000000000,60000000000],
  ["multiverse",10000000000000000000,1000000000000]
].map(([id,cost,income])=>({id,cost,income}));
const CLICK_UPGRADES=[
  ["wallet",50,2,25],["fingers",500,2,250],["goldWallet",10000,3,5000],
  ["diamond",1000000,5,500000],["magnet",100000000,10,50000000],
  ["quantum",10000000000,10,5000000000],["cosmic",1000000000000,20,500000000000],
  ["infinite",1000000000000000,50,500000000000000]
].map(([id,cost,mult,unlock])=>({id,cost,mult,unlock}));
const SPECIAL=[
  {id:"marketSense",cost:300,unlock:100,mult:1.01,effect:"total"},
  {id:"tapTraining",cost:2500,unlock:1000,mult:1.25,effect:"click"},
  {id:"vendingDining",cost:250000,mult:1.5,effect:"restaurant",requires:{vending:5,restaurant:1}},
  {id:"restaurantSupply",cost:3000000,mult:1.5,effect:"supermarket",requires:{restaurant:10,supermarket:1}},
  {id:"cashflow",cost:50000000,unlock:20000000,mult:1.05,effect:"total"},
  {id:"bankingNetwork",cost:10000000000,mult:2,effect:"corporation",requires:{bank:5,corporation:1}},
  {id:"precisionTap",cost:50000000000,unlock:10000000000,mult:2,effect:"click"}
];
const MILESTONES=[[10,2,4],[25,2,5],[50,2,6],[100,3,8],[200,4,10]];
const PRESTIGE_COST={...EARLY_PRESTIGE,investor:5,compound:12,automation:20,lucky:25,executive:35,nightshift:50};
const capped=n=>Math.min(LIMIT,Math.max(0,n));
function sanitizeUsername(input){
  if(typeof input!=="string")return null;
  const name=input.trim().replace(/\s+/g," ");
  return /^[A-Za-z0-9 _-]{3,24}$/.test(name)?name:null;
}
function decodeJson(value,fallback){
  try{const parsed=JSON.parse(value);return parsed&&typeof parsed==="object"?parsed:fallback;}catch(_){return fallback;}
}
function loadProgress(row){
  const businesses=decodeJson(row.businesses_json,{});
  const upgrades=decodeJson(row.upgrades_json,[]);
  const prestige=decodeJson(row.prestige_json,[]);
  return {
    userId:row.user_id,balance:capped(row.balance),lifetime:capped(row.lifetime_cash),
    runEarned:capped(row.run_earned),rebirths:row.rebirths,empirePoints:row.empire_points,
    empireSpent:row.empire_spent,totalClicks:row.total_clicks,
    totalPlaytimeMs:Math.max(0,Number(row.playtime_ms)||0),lastHeartbeatMs:Math.max(0,Number(row.last_heartbeat_ms)||0),
    boosterInventory:decodeJson(row.booster_inventory_json||"{}",{}),equipped:decodeJson(row.booster_equipped_json||"[]",[]),
    slotsUnlocked:Math.max(1,Math.min(4,Number(row.booster_slots_unlocked)||1)),
    nextDropPlaytimeMs:Math.max(DROP_INTERVAL_MS,Number(row.next_drop_playtime_ms)||DROP_INTERVAL_MS),
    pendingDropUntilMs:Math.max(0,Number(row.pending_drop_until_ms)||0),rushUntilMs:Math.max(0,Number(row.rush_until_ms)||0),
    lastAccrualMs:row.last_accrual_ms,lastGoldenMs:row.last_golden_ms||0,businesses:BUSINESS.reduce((a,b)=>(a[b.id]=Math.max(0,Math.floor(businesses[b.id]||0)),a),{}),
    upgrades:Array.isArray(upgrades)?upgrades:[],prestige:Array.isArray(prestige)?prestige:[],
    version:row.version
  };
}
function normalizeExtras(s){
  s.totalPlaytimeMs=Math.max(0,Number(s.totalPlaytimeMs)||0);
  s.lastHeartbeatMs=Math.max(0,Number(s.lastHeartbeatMs)||0);
  s.nextDropPlaytimeMs=Math.max(DROP_INTERVAL_MS,Number(s.nextDropPlaytimeMs)||DROP_INTERVAL_MS);
  s.pendingDropUntilMs=Math.max(0,Number(s.pendingDropUntilMs)||0);
  s.rushUntilMs=Math.max(0,Number(s.rushUntilMs)||0);
  s.slotsUnlocked=Math.max(1,Math.min(4,Number(s.slotsUnlocked)||1));
  s.boosterInventory=s.boosterInventory&&typeof s.boosterInventory==="object"?s.boosterInventory:{};
  s.equipped=Array.isArray(s.equipped)?s.equipped.slice(0,6):[];
  s.premiumSlots=Array.isArray(s.premiumSlots)?s.premiumSlots:[];
  return s;
}
function bonus(s,type){return boosterBonus(s,type);}
function discount(s){return Math.max(.75,1-(s.prestige.includes("bulkBuyer")?.03:0)-bonus(s,"discount"));}
function totalCost(b,owned,count,priceFactor=1){
  if(count<=0)return 0;
  return b.cost*Math.pow(PRICE_GROWTH,owned)*Math.expm1(count*Math.log(PRICE_GROWTH))/(PRICE_GROWTH-1)*priceFactor;
}
function prestigeBonus(s){return 1+s.empirePoints*(s.prestige.includes("compound")?.015:.01);}
function totalBonus(s){return (1+s.rebirths*.1)*prestigeBonus(s)*(s.prestige.includes("empireMomentum")?1.15:1)*(1+bonus(s,"total"));}
function unitRate(s,b,entitled){
  let rate=b.income*totalBonus(s)*(s.prestige.includes("investor")?1.1:1)*(s.prestige.includes("businessNetwork")?1.1:1)*(1+bonus(s,"business"));
  for(const [count,mult] of MILESTONES)if(s.upgrades.includes(b.id+"-"+count))rate*=mult;
  for(const upgrade of SPECIAL)if(s.upgrades.includes(upgrade.id)&&(upgrade.effect==="total"||upgrade.effect===b.id))rate*=upgrade.mult;
  return rate*(entitled?2:1);
}
function businessRate(s,entitled){return BUSINESS.reduce((sum,b)=>sum+(s.businesses[b.id]||0)*unitRate(s,b,entitled),0);}
function clickRate(s,entitled){
  let value=totalBonus(s)*(s.prestige.includes("executive")?2:1)*(s.prestige.includes("clickTraining")?1.1:1)*(1+bonus(s,"click"));
  for(const upgrade of CLICK_UPGRADES)if(s.upgrades.includes(upgrade.id))value*=upgrade.mult;
  for(const upgrade of SPECIAL)if(upgrade.effect==="click"&&s.upgrades.includes(upgrade.id))value*=upgrade.mult;
  return value*(entitled?2:1);
}
function rebirthPoints(s){
  if(s.runEarned<1000000)return 0;
  const multiplier=1+(s.prestige.includes("rebirthMastery")?.15:0)+bonus(s,"rebirthPoints");
  return Math.floor(Math.sqrt(s.runEarned/1000000)*multiplier);
}
function award(s,amount){
  if(!Number.isFinite(amount)||amount<0)throw Error("Invalid production.");
  s.balance=capped(s.balance+amount);
  s.lifetime=capped(s.lifetime+amount);
  s.runEarned=capped(s.runEarned+amount);
}
function advance(s,now,entitled){
  const cap=s.prestige.includes("nightshift")?16*3600:10*3600;
  const start=s.lastAccrualMs;
  const elapsed=Math.min(cap,Math.max(0,(now-start)/1000));
  const offline=elapsed>60;
  const efficiency=offline?(s.prestige.includes("offlineOffice")?.6:.5)*(1+bonus(s,"offline")):1;
  const rushSeconds=!offline?Math.max(0,Math.min(now,s.rushUntilMs)-start)/1000:0;
  award(s,businessRate(s,entitled)*(elapsed+6*rushSeconds)*efficiency);
  s.lastAccrualMs=now;
}
function heartbeatState(s,now,active,random=Math.random){
  normalizeExtras(s);
  if(!active){s.lastHeartbeatMs=0;return;}
  const elapsed=now-s.lastHeartbeatMs;
  if(s.lastHeartbeatMs&&elapsed>0&&elapsed<=45000)s.totalPlaytimeMs+=Math.min(elapsed,35000);
  s.lastHeartbeatMs=now;
  if(s.pendingDropUntilMs&&now>=s.pendingDropUntilMs)s.pendingDropUntilMs=0;
  if(s.totalPlaytimeMs>=s.nextDropPlaytimeMs){
    s.nextDropPlaytimeMs+=DROP_INTERVAL_MS;
    if(!s.pendingDropUntilMs&&random()<.08)s.pendingDropUntilMs=now+20000;
  }
}
function upgradeFor(s,id){
  const click=CLICK_UPGRADES.find(u=>u.id===id);
  if(click)return s.lifetime>=click.unlock?click:null;
  const special=SPECIAL.find(u=>u.id===id);
  if(special){
    const meets=Object.entries(special.requires||{}).every(([business,count])=>s.businesses[business]>=count);
    return s.lifetime>=(special.unlock||0)&&meets?special:null;
  }
  for(const b of BUSINESS)for(const [count,mult,costFactor] of MILESTONES)
    if(id===b.id+"-"+count&&s.businesses[b.id]>=count)
      return {id,cost:Math.ceil(b.cost*count*costFactor),mult};
  return null;
}
const CLICK_BATCH_TECHNICAL_MAX=1000;
function applyAction(current,action,now,entitled,random=Math.random){
  const s=normalizeExtras(structuredClone(current));
  advance(s,now,entitled);
  if(action.type==="click_batch"){
    const count=action.count;
    if(!Number.isInteger(count)||count<1||count>CLICK_BATCH_TECHNICAL_MAX)
      throw Error("Invalid click batch.");
    award(s,clickRate(s,entitled)*count*(s.rushUntilMs>now?7:1));s.totalClicks+=count;
  }else if(action.type==="golden"){
    const frequency=1+(s.prestige.includes("goldenRadar")?.1:0)+(s.prestige.includes("lucky")?.3:0)+bonus(s,"goldenFrequency");
    if(now-s.lastGoldenMs<180000/frequency)throw Error("Golden Bill is not ready.");
    s.lastGoldenMs=now;
    if(random()<.35){
      s.rushUntilMs=now+30000;s.event={type:"goldRush",until:s.rushUntilMs};
    }else{
      const base=Math.max(500,businessRate(s,entitled)*180,clickRate(s,entitled)*100);
      const multiplier=.8+random()*.6;
      const amount=base*multiplier*(1+(s.prestige.includes("goldenReserve")?.25:0)+bonus(s,"goldenCash"));
      award(s,amount);s.event={type:"goldenCash",amount};
    }
  }else if(action.type==="buy_business"){
    const b=BUSINESS.find(x=>x.id===action.businessId);
    const quantity=action.quantity;
    if(!b||!Number.isInteger(quantity)||quantity<1||quantity>100)throw Error("Invalid business purchase.");
    const price=totalCost(b,s.businesses[b.id],quantity,discount(s));
    if(!Number.isFinite(price)||price>s.balance*(1+1e-12))throw Error("Not enough cash.");
    s.balance=capped(s.balance-price);s.businesses[b.id]+=quantity;
  }else if(action.type==="buy_upgrade"){
    const u=upgradeFor(s,action.upgradeId);
    if(!u||s.upgrades.includes(u.id)||u.cost>s.balance)throw Error("Upgrade unavailable.");
    s.balance=capped(s.balance-u.cost);s.upgrades.push(u.id);
  }else if(action.type==="buy_prestige"){
    const cost=PRESTIGE_COST[action.upgradeId];
    if(!cost||s.prestige.includes(action.upgradeId)||cost>s.empirePoints-s.empireSpent)throw Error("Investment unavailable.");
    s.empireSpent+=cost;s.prestige.push(action.upgradeId);
  }else if(action.type==="unlock_slot"){
    const next=s.slotsUnlocked+1;
    if(next>4||action.slot!==next||SLOT_PRICES[next]>s.balance)throw Error("Booster slot unavailable.");
    s.balance=capped(s.balance-SLOT_PRICES[next]);s.slotsUnlocked=next;
  }else if(action.type==="equip_booster"){
    const id=action.boosterId,slot=action.slot;
    if(!BOOSTERS.some(b=>b.id===id)||!Number.isInteger(slot)||slot<1||slot>6||
      !(slot<=s.slotsUnlocked||s.premiumSlots.includes(slot))||!(s.boosterInventory[id]>0)||s.equipped.includes(id))
      throw Error("Booster cannot be equipped.");
    s.equipped[slot-1]=id;
  }else if(action.type==="unequip_booster"){
    const slot=action.slot;
    if(!Number.isInteger(slot)||slot<1||slot>6||!s.equipped[slot-1])throw Error("Slot is empty.");
    s.equipped[slot-1]=null;
  }else if(action.type==="claim_booster_drop"){
    if(!s.pendingDropUntilMs||now>s.pendingDropUntilMs)throw Error("Booster Drop has expired.");
    const booster=rollBooster(random);
    s.boosterInventory[booster.id]=Math.min(1000000,(Number(s.boosterInventory[booster.id])||0)+1);
    s.pendingDropUntilMs=0;s.event={type:"boosterDrop",boosterId:booster.id,rarity:booster.rarity};
  }else if(action.type==="rebirth"){
    const gain=rebirthPoints(s);
    if(gain<1)throw Error("Rebirth unavailable.");
    s.empirePoints+=gain;s.rebirths++;s.balance=s.prestige.includes("starterCapital")?250:0;
    s.runEarned=0;s.upgrades=[];s.rushUntilMs=0;
    s.businesses=Object.fromEntries(BUSINESS.map(b=>[b.id,0]));
    if(s.prestige.includes("quickCollectors"))s.businesses.collector=5;
    if(s.prestige.includes("automation")){s.businesses.collector=10;s.businesses.lemonade=5;}
  }else throw Error("Unknown progress action.");
  if(!Number.isFinite(s.balance)||!Number.isFinite(s.lifetime))throw Error("Invalid progress.");
  return s;
}
class ApiError extends Error{constructor(status,message){super(message);this.status=status;}}
const json=(value,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
function fail(status,message){throw new ApiError(status,message);}
function requireDatabase(env){if(!env.DB)fail(503,"Leaderboard service is not configured.");}
function sameOrigin(request){
  const origin=request.headers.get("Origin");
  if(origin!==new URL(request.url).origin)fail(403,"Invalid request origin.");
}
async function readBody(request,allowed){
  if(!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json"))fail(415,"JSON required.");
  if(Number(request.headers.get("Content-Length")||0)>4096)fail(413,"Request too large.");
  const raw=await request.text();
  if(raw.length>4096)fail(413,"Request too large.");
  let body;
  try{body=JSON.parse(raw);}catch(_){fail(400,"Malformed JSON.");}
  if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(key=>!allowed.includes(key)))fail(400,"Unexpected fields.");
  return body;
}
async function rateLimit(env,request,route,max,windowMs=60000){
  const address=request.headers.get("CF-Connecting-IP")||"unknown";
  const key=route+":"+address;
  const start=Math.floor(Date.now()/windowMs)*windowMs;
  await env.DB.prepare(`INSERT INTO api_rate_limits(key,window_start_ms,count) VALUES(?,?,1)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start_ms=excluded.window_start_ms THEN count+1 ELSE 1 END,
    window_start_ms=excluded.window_start_ms`).bind(key,start).run();
  const row=await env.DB.prepare("SELECT count FROM api_rate_limits WHERE key=?").bind(key).first();
  if(row.count>max)fail(429,"Too many requests. Try again shortly.");
}
async function hmac(secret,message){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message)));
}
function constantEqual(a,b){
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  return diff===0;
}
function fromHex(value){
  if(!/^[a-f0-9]{64}$/i.test(value))return null;
  return Uint8Array.from(value.match(/../g),x=>parseInt(x,16));
}
async function sessionUser(request,env){return readSession(request,env);}
async function hasDoubleMoney(env,userId){
  if(!userId)return false;
  const row=await env.DB.prepare("SELECT 1 AS owned FROM entitlements WHERE user_id=? AND entitlement='double_money' AND revoked_at_ms IS NULL").bind(userId).first();
  return Boolean(row);
}
async function ensureProgress(env,userId,now){
  await env.DB.prepare("INSERT OR IGNORE INTO progress(user_id,last_accrual_ms) VALUES(?,?)").bind(userId,now).run();
  return env.DB.prepare("SELECT * FROM progress WHERE user_id=?").bind(userId).first();
}
const scoreSql=`WITH scores AS (
  SELECT u.id,u.username,p.rebirths,
    MIN(1e300,p.lifetime_cash+p.rate_per_second*MIN(MAX((? - p.last_accrual_ms)/1000.0,0),p.offline_cap_seconds)*CASE WHEN ?-p.last_accrual_ms>60000 THEN p.offline_efficiency ELSE 1 END) AS lifetime_cash
  FROM progress p JOIN users u ON u.id=p.user_id WHERE u.username_set=1
), ranked AS (
  SELECT id,username,rebirths,lifetime_cash,
    ROW_NUMBER() OVER (ORDER BY lifetime_cash DESC,rebirths DESC,id ASC) AS rank
  FROM scores
)`;
function leaderboardEntry(row,userId){
  return {rank:Number(row.rank),username:sanitizeUsername(row.username)||"Player",lifetimeCash:capped(row.lifetime_cash),rebirths:Math.max(0,Number(row.rebirths)||0),isSelf:row.id===userId};
}
async function getLeaderboard(request,env,user){
  await rateLimit(env,request,"leaderboard:"+(user?.id||"guest"),120);
  const now=Date.now();
  const top=await env.DB.prepare(scoreSql+" SELECT * FROM ranked WHERE rank<=30 ORDER BY rank").bind(now,now).all();
  const players=(top.results||[]).map(row=>leaderboardEntry(row,user?.id));
  let me=players.find(row=>row.isSelf)||null;
  if(user?.username_set&&!me){
    const row=await env.DB.prepare(scoreSql+" SELECT * FROM ranked WHERE id=?").bind(now,now,user.id).first();
    if(row)me=leaderboardEntry(row,user.id);
  }
  return json({players,me,authenticated:Boolean(user)});
}
function progressSummary(s,entitled){
  return {balance:s.balance,lifetimeCash:s.lifetime,runEarned:s.runEarned,rebirths:s.rebirths,
    ratePerSecond:businessRate(s,entitled)*(s.rushUntilMs>Date.now()?7:1),empirePoints:s.empirePoints,
    empireSpent:s.empireSpent,totalClicks:s.totalClicks,businesses:s.businesses,upgrades:s.upgrades,
    prestigeUpgrades:s.prestige,lastAccrualMs:s.lastAccrualMs,totalPlaytime:s.totalPlaytimeMs/1000,
    boosterInventory:s.boosterInventory,equippedBoosters:s.equipped,boosterSlotsUnlocked:s.slotsUnlocked,
    premiumBoosterSlots:s.premiumSlots||[],pendingDropUntilMs:s.pendingDropUntilMs,
    rushUntilMs:s.rushUntilMs,event:s.event||null};
}
function updateStatement(env,s,oldVersion,entitled){
  const rate=businessRate(s,entitled),cap=s.prestige.includes("nightshift")?57600:36000;
  return env.DB.prepare(`UPDATE progress SET balance=?,lifetime_cash=?,run_earned=?,rebirths=?,empire_points=?,empire_spent=?,
    total_clicks=?,last_accrual_ms=?,last_golden_ms=?,rate_per_second=?,offline_cap_seconds=?,
    businesses_json=?,upgrades_json=?,prestige_json=?,playtime_ms=?,last_heartbeat_ms=?,
    booster_inventory_json=?,booster_equipped_json=?,booster_slots_unlocked=?,next_drop_playtime_ms=?,
    pending_drop_until_ms=?,rush_until_ms=?,offline_efficiency=?,version=version+1 WHERE user_id=? AND version=?`).bind(
      s.balance,s.lifetime,s.runEarned,s.rebirths,s.empirePoints,s.empireSpent,
      s.totalClicks,s.lastAccrualMs,s.lastGoldenMs,rate,cap,
      JSON.stringify(s.businesses),JSON.stringify(s.upgrades),JSON.stringify(s.prestige),
      s.totalPlaytimeMs,s.lastHeartbeatMs,JSON.stringify(s.boosterInventory),JSON.stringify(s.equipped),
      s.slotsUnlocked,s.nextDropPlaytimeMs,s.pendingDropUntilMs,s.rushUntilMs,
      (s.prestige.includes("offlineOffice")?.6:.5)*(1+bonus(s,"offline")),s.userId,oldVersion
    );
}
async function premiumSlots(env,userId){
  const rows=await env.DB.prepare("SELECT slot_number FROM booster_slot_entitlements WHERE user_id=?").bind(userId).all();
  return (rows.results||[]).map(row=>Number(row.slot_number)).filter(slot=>slot===5||slot===6);
}
async function getProgress(env,user){
  if(!user||!user.username_set)fail(401,"Choose a username first.");
  const entitled=await hasDoubleMoney(env,user.id);
  for(let attempt=0;attempt<3;attempt++){
    const row=await ensureProgress(env,user.id,Date.now());
    const s=normalizeExtras(loadProgress(row)),version=s.version;
    s.premiumSlots=await premiumSlots(env,user.id);
    advance(s,Date.now(),entitled);
    const updated=await updateStatement(env,s,version,entitled).run();
    if(updated.meta?.changes===1)return json(progressSummary(s,entitled));
  }
  fail(409,"Progress changed. Retry.");
}
async function postProgress(request,env,user){
  if(!user||!user.username_set)fail(401,"Choose a username first.");
  sameOrigin(request);
  const action=await readBody(request,["actionId","type","businessId","quantity","upgradeId","count","slot","boosterId"]);
  if(typeof action.actionId!=="string"||!/^[A-Za-z0-9_-]{12,80}$/.test(action.actionId))fail(400,"Invalid action ID.");
  const allowed={click_batch:["actionId","type","count"],golden:["actionId","type"],buy_business:["actionId","type","businessId","quantity"],buy_upgrade:["actionId","type","upgradeId"],buy_prestige:["actionId","type","upgradeId"],rebirth:["actionId","type"],unlock_slot:["actionId","type","slot"],equip_booster:["actionId","type","slot","boosterId"],unequip_booster:["actionId","type","slot"],claim_booster_drop:["actionId","type"]};
  if(!Object.hasOwn(allowed,action.type)||Object.keys(action).some(key=>!allowed[action.type].includes(key)))fail(400,"Invalid action.");
  const bucket=action.type==="click_batch"?"progress-click:"+user.id:
    action.type==="buy_business"||action.type==="buy_upgrade"||action.type==="buy_prestige"||action.type==="unlock_slot"?"progress-purchase:"+user.id:
    "progress-special:"+user.id;
  await rateLimit(env,request,"progress-all:"+user.id,10000);
  await rateLimit(env,request,bucket,action.type==="click_batch"?6000:bucket.startsWith("progress-purchase:")?300:60);
  const prior=await env.DB.prepare("SELECT user_id,action_type FROM progress_actions WHERE action_id=?").bind(action.actionId).first();
  if(prior){
    if(prior.user_id!==user.id||prior.action_type!==action.type)fail(409,"Action ID conflict.");
    return getProgress(env,user);
  }
  const entitled=await hasDoubleMoney(env,user.id);
  const now=Date.now(),row=await ensureProgress(env,user.id,now),current=normalizeExtras(loadProgress(row));
  current.premiumSlots=await premiumSlots(env,user.id);
  let next;
  try{next=applyAction(current,action,now,entitled);}catch(error){fail(400,error.message);}
  try {
    const result=await env.DB.batch([
      updateStatement(env,next,current.version,entitled),
      env.DB.prepare(`INSERT INTO progress_actions(action_id,user_id,action_type,created_at_ms)
        SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM progress WHERE user_id=? AND version=?)`)
        .bind(action.actionId,user.id,action.type,now,user.id,current.version+1)
    ]);
    if(result[0].meta?.changes!==1)fail(409,"Progress changed. Retry.");
  } catch(error) {
    if(error instanceof ApiError)throw error;
    fail(409,"Duplicate or conflicting action.");
  }
  return json(progressSummary(next,entitled));
}
async function postHeartbeat(request,env,user){
  if(!user||!user.username_set)fail(401,"Choose a username first.");
  sameOrigin(request);
  const body=await readBody(request,["active"]);
  if(typeof body.active!=="boolean")fail(400,"Invalid heartbeat.");
  await rateLimit(env,request,"heartbeat:"+user.id,120);
  const entitled=await hasDoubleMoney(env,user.id);
  for(let attempt=0;attempt<3;attempt++){
    const now=Date.now(),row=await ensureProgress(env,user.id,now);
    const s=normalizeExtras(loadProgress(row));s.premiumSlots=await premiumSlots(env,user.id);
    advance(s,now,entitled);heartbeatState(s,now,body.active);
    const updated=await updateStatement(env,s,s.version,entitled).run();
    if(updated.meta?.changes===1)return json(progressSummary(s,entitled));
  }
  fail(409,"Progress changed. Retry.");
}
async function updateUsername(request,env,user){
  if(!user)fail(401,"Sign in required.");
  sameOrigin(request);
  await rateLimit(env,request,"username:"+user.id,10);
  const body=await readBody(request,["username"]);
  const name=sanitizeUsername(body.username);
  if(!name)fail(400,"Username must be 3–24 letters, numbers, spaces, underscores or hyphens.");
  try{await env.DB.prepare("UPDATE users SET username=? WHERE id=?").bind(name,user.id).run();}
  catch(_){fail(409,"Username is already taken.");}
  return json({username:name});
}
function paymentsConfigured(env){
  return Boolean(env.DB&&env.STRIPE_SECRET_KEY&&env.STRIPE_WEBHOOK_SECRET&&env.PUBLIC_SITE_URL);
}
async function storeStatus(request,env,user){
  if(env.DB)await rateLimit(env,request,"store-status:"+(user?.id||"guest"),120);
  const owned=user?await hasDoubleMoney(env,user.id):false;
  return json({authenticated:Boolean(user),paymentsAvailable:paymentsConfigured(env),entitlements:{double_money:owned}});
}
async function beginCheckout(request,env,user){
  if(!paymentsConfigured(env))fail(503,"Payments are not available yet.");
  if(!user||!user.username_set)fail(401,"Choose a username before buying 2x Money.");
  sameOrigin(request);
  await rateLimit(env,request,"checkout:"+user.id,5);
  await readBody(request,[]);
  if(await hasDoubleMoney(env,user.id))fail(409,"Already owned.");
  const site=new URL(env.PUBLIC_SITE_URL);
  if(site.protocol!=="https:")fail(503,"Payment configuration is invalid.");
  const purchaseId=crypto.randomUUID();
  const params=new URLSearchParams();
  params.set("mode","payment");
  params.set("client_reference_id",user.id);
  params.set("metadata[product_id]","double_money");
  params.set("metadata[purchase_id]",purchaseId);
  params.set("line_items[0][quantity]","1");
  params.set("line_items[0][price_data][currency]","eur");
  params.set("line_items[0][price_data][unit_amount]","200");
  params.set("line_items[0][price_data][product_data][name]","2x Money");
  params.set("success_url",new URL("?purchase=success",site).href);
  params.set("cancel_url",new URL("?purchase=cancel",site).href);
  const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{
    method:"POST",
    headers:{"Authorization":"Bearer "+env.STRIPE_SECRET_KEY,"Content-Type":"application/x-www-form-urlencoded","Idempotency-Key":purchaseId},
    body:params
  });
  if(!response.ok)fail(502,"Payments are not available yet.");
  const session=await response.json();
  if(typeof session.id!=="string"||typeof session.url!=="string"||!session.url.startsWith("https://checkout.stripe.com/"))fail(502,"Invalid checkout response.");
  await env.DB.prepare(`INSERT INTO purchases(id,user_id,product_id,provider,provider_session_id,amount_cents,currency,status,created_at_ms)
    VALUES(?,?,'double_money','stripe',?,200,'eur','pending',?)`).bind(purchaseId,user.id,session.id,Date.now()).run();
  return json({checkoutUrl:session.url});
}
async function verifyStripeSignature(raw,header,secret){
  if(typeof header!=="string"||raw.length>200000)return false;
  const fields=header.split(",").map(part=>part.trim().split("="));
  const timestamp=Number(fields.find(([key])=>key==="t")?.[1]);
  const signatures=fields.filter(([key])=>key==="v1").map(([,value])=>fromHex(value)).filter(Boolean);
  if(!Number.isSafeInteger(timestamp)||Math.abs(Date.now()/1000-timestamp)>300||!signatures.length)return false;
  const expected=await hmac(secret,timestamp+"."+raw);
  return signatures.some(signature=>constantEqual(signature,expected));
}
async function stripeWebhook(request,env){
  if(!paymentsConfigured(env))fail(503,"Payments are not available yet.");
  const raw=await request.text();
  if(!await verifyStripeSignature(raw,request.headers.get("Stripe-Signature"),env.STRIPE_WEBHOOK_SECRET))
    fail(400,"Invalid webhook signature.");
  let event;
  try{event=JSON.parse(raw);}catch(_){fail(400,"Malformed webhook.");}
  if(typeof event.id!=="string"||!/^evt_[A-Za-z0-9]+$/.test(event.id))fail(400,"Invalid event.");
  const session=event.data?.object;
  if(!["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type))
    return json({received:true});
  if(!session||session.payment_status!=="paid")return json({received:true});
  if(session.mode!=="payment"||session.currency!=="eur"||session.amount_total!==200||
     session.metadata?.product_id!=="double_money"||typeof session.id!=="string"||
     typeof session.client_reference_id!=="string")fail(400,"Invalid paid session.");
  const purchase=await env.DB.prepare("SELECT id,user_id FROM purchases WHERE provider_session_id=? AND user_id=? AND product_id='double_money'")
    .bind(session.id,session.client_reference_id).first();
  if(!purchase||session.metadata?.purchase_id!==purchase.id)fail(400,"Unknown checkout.");
  const seen=await env.DB.prepare("SELECT 1 AS seen FROM payment_events WHERE provider_event_id=?").bind(event.id).first();
  if(seen)return json({received:true});
  const now=Date.now();
  await ensureProgress(env,purchase.user_id,now);
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO payment_events(provider_event_id,received_at_ms) VALUES(?,?)").bind(event.id,now),
      env.DB.prepare("UPDATE purchases SET status='paid',paid_at_ms=? WHERE id=?").bind(now,purchase.id),
      env.DB.prepare(`UPDATE progress SET
        balance=MIN(1e300,balance+rate_per_second*MIN(MAX((?-last_accrual_ms)/1000.0,0),offline_cap_seconds)*offline_efficiency),
        lifetime_cash=MIN(1e300,lifetime_cash+rate_per_second*MIN(MAX((?-last_accrual_ms)/1000.0,0),offline_cap_seconds)*offline_efficiency),
        run_earned=MIN(1e300,run_earned+rate_per_second*MIN(MAX((?-last_accrual_ms)/1000.0,0),offline_cap_seconds)*offline_efficiency),
        last_accrual_ms=?,rate_per_second=MIN(1e300,rate_per_second*2),version=version+1
        WHERE user_id=? AND NOT EXISTS(SELECT 1 FROM entitlements WHERE user_id=? AND entitlement='double_money' AND revoked_at_ms IS NULL)`)
        .bind(now,now,now,now,purchase.user_id,purchase.user_id),
      env.DB.prepare(`INSERT INTO entitlements(user_id,entitlement,source_purchase_id,granted_at_ms)
        VALUES(?,'double_money',?,?)
        ON CONFLICT(user_id,entitlement) DO UPDATE SET source_purchase_id=excluded.source_purchase_id,
        granted_at_ms=excluded.granted_at_ms,revoked_at_ms=NULL`).bind(purchase.user_id,purchase.id,now)
    ]);
  } catch(error) {
    const duplicate=await env.DB.prepare("SELECT 1 AS seen FROM payment_events WHERE provider_event_id=?").bind(event.id).first();
    if(!duplicate)throw error;
  }
  return json({received:true});
}
export {sanitizeUsername};
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(!url.pathname.startsWith("/api/"))return env.ASSETS?env.ASSETS.fetch(request):new Response("Not found",{status:404});
    try{
      if(url.pathname==="/api/health"&&request.method==="GET")
        return json({ok:true,databaseConfigured:Boolean(env.DB),paymentsConfigured:paymentsConfigured(env)});
      if(url.pathname==="/api/store/status"&&request.method==="GET")
        return await storeStatus(request,env,await sessionUser(request,env));
      requireDatabase(env);
      const authResponse=await handleAuthRequest(request,env);
      if(authResponse)return authResponse;
      if(url.pathname==="/api/store/webhook"&&request.method==="POST")return await stripeWebhook(request,env);
      const user=await sessionUser(request,env);
      if(url.pathname==="/api/leaderboard"&&request.method==="GET")return await getLeaderboard(request,env,user);
      if(url.pathname==="/api/progress"&&request.method==="POST")
        fail(400,"Client-supplied cash, lifetime cash and rebirth totals are not accepted. Send server-validated actions.");
      if(url.pathname==="/api/progress/action"&&request.method==="POST")return await postProgress(request,env,user);
      if(url.pathname==="/api/progress/heartbeat"&&request.method==="POST")return await postHeartbeat(request,env,user);
      if(url.pathname==="/api/progress/snapshot"&&request.method==="GET")return await getProgress(env,user);
      if(url.pathname==="/api/profile/username"&&request.method==="POST")fail(410,"Use account username setup.");
      if(url.pathname==="/api/store/checkout"&&request.method==="POST")return await beginCheckout(request,env,user);
      return json({error:"Not found."},404);
    }catch(error){
      if(error instanceof ApiError)return json({error:error.message},error.status);
      console.error("ClickTheCash API error",error);
      return json({error:"Service unavailable."},503);
    }
  }
};
export const testing={sanitizeUsername,totalCost,applyAction,businessRate,clickRate,rebirthPoints,heartbeatState,advance,discount,verifyStripeSignature,loadProgress};
