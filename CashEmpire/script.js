"use strict";
(() => {
  const SAVE_KEY = "cash-empire-save-v1";
  const MUSIC_KEY = "cash-empire-music-v1";
  const PRICE_GROWTH = 1.15;
  const OFFLINE_CAP = 10 * 3600;
  const BUSINESS = [
    {id:"collector",name:"Cash Collector",image:"assets/cash-collector.png",cost:10,income:0.1},
    {id:"lemonade",name:"Lemonade Stand",image:"assets/lemonade-stand.png",cost:15,income:0.2},
    {id:"newspaper",name:"Newspaper Route",image:"assets/newspaper-route.png",cost:100,income:1},
    {id:"vending",name:"Vending Machine",image:"assets/vending-machine.png",cost:1000,income:8},
    {id:"shop",name:"Small Shop",image:"assets/small-shop.png",cost:12000,income:47},
    {id:"restaurant",name:"Restaurant",image:"assets/restaurant.png",cost:130000,income:260},
    {id:"supermarket",name:"Supermarket",image:"assets/supermarket.png",cost:1400000,income:1400},
    {id:"factory",name:"Factory",image:"assets/factory.png",cost:20000000,income:9000},
    {id:"bank",name:"Bank",image:"assets/bank.png",cost:330000000,income:55000},
    {id:"corporation",name:"Corporation",image:"assets/corporation.png",cost:7000000000,income:420000},
    {id:"exchange",name:"Stock Exchange",image:"assets/stock-exchange.png",cost:170000000000,income:3500000},
    {id:"mega",name:"Mega Corporation",image:"assets/mega-corporation.png",cost:4500000000000,income:30000000},
    {id:"global",name:"Global Empire",image:"assets/global-empire.png",cost:140000000000000,income:300000000},
    {id:"moon",name:"Moon Bank",image:"assets/moon-bank.png",cost:5000000000000000,income:4000000000},
    {id:"galactic",name:"Galactic Corporation",image:"assets/galactic-corporation.png",cost:250000000000000000,income:60000000000},
    {id:"multiverse",name:"Money Multiverse",image:"assets/money-multiverse.png",cost:10000000000000000000,income:1000000000000}
  ];
    const CLICK_UPGRADES = [
    {id:"wallet",name:"Better Wallet",image:"assets/ui/double-money.png",icon:"👛",cost:50,mult:2,unlock:25,description:"Click income ×2"},
    {id:"fingers",name:"Fast Fingers",icon:"⚡",cost:500,mult:2,unlock:250,description:"Click income ×2"},
    {id:"goldWallet",name:"Golden Wallet",icon:"💛",cost:10000,mult:3,unlock:5000,description:"Click income ×3"},
    {id:"diamond",name:"Diamond Hands",image:"assets/upgrade-diamond-hands.png",cost:1000000,mult:5,unlock:500000,description:"Click income ×5"},
    {id:"magnet",name:"Money Magnet",image:"assets/ui/money-magnet.png",icon:"🧲",cost:100000000,mult:10,unlock:50000000,description:"Click income ×10"},
    {id:"quantum",name:"Quantum Purse",icon:"⚛",cost:10000000000,mult:10,unlock:5000000000,description:"Click income ×10"},
    {id:"cosmic",name:"Cosmic Grip",icon:"✦",cost:1000000000000,mult:20,unlock:500000000000,description:"Click income ×20"},
    {id:"infinite",name:"Infinite Pocket",icon:"∞",cost:1000000000000000,mult:50,unlock:500000000000000,description:"Click income ×50"}
  ];
  const SPECIAL_UPGRADES = [
    {id:"marketSense",name:"Market Sense",icon:"◈",cost:300,unlock:100,description:"All businesses produce +1%.",effect:"total",mult:1.01},
    {id:"tapTraining",name:"Tap Training",icon:"✦",cost:2500,unlock:1000,description:"Click value +25%.",effect:"click",mult:1.25},
    {id:"vendingDining",name:"Lunch Rush",image:"assets/upgrade-lunch-rush.png",cost:250000,requires:{vending:5,restaurant:1},description:"Vending Machines boost Restaurants ×1.5.",effect:"restaurant",mult:1.5},
    {id:"restaurantSupply",name:"Supply Chain",icon:"◉",cost:3000000,requires:{restaurant:10,supermarket:1},description:"Restaurants boost Supermarkets ×1.5.",effect:"supermarket",mult:1.5},
    {id:"cashflow",name:"Cashflow Forecast",image:"assets/ui/cashflow-forecast.png",icon:"▣",cost:50000000,unlock:20000000,description:"All businesses produce +5%.",effect:"total",mult:1.05},
    {id:"bankingNetwork",name:"Banking Network",icon:"⌁",cost:10000000000,requires:{bank:5,corporation:1},description:"Banks boost Corporations ×2.",effect:"corporation",mult:2},
    {id:"precisionTap",name:"Executive Touch",icon:"◆",cost:50000000000,unlock:10000000000,description:"Click value ×2.",effect:"click",mult:2}
  ];
  const MILESTONES = [
    {count:10,mult:2},{count:25,mult:2},{count:50,mult:2},{count:100,mult:3},{count:200,mult:4}
  ];
  const EARLY_PRESTIGE=[
    ["starterCapital","Starter Capital",1,"Start every Rebirth with $250."],
    ["quickCollectors","Quick Collectors",2,"Start every Rebirth with 5 Cash Collectors."],
    ["clickTraining","Click Training",3,"Permanent +10% click income."],
    ["businessNetwork","Business Network",4,"Permanent +10% business income."],
    ["goldenRadar","Golden Radar",5,"Golden Bills appear 10% more often."],
    ["offlineOffice","Offline Office",6,"Offline efficiency increases to 60%."],
    ["bulkBuyer","Bulk Buyer",7,"Businesses cost 3% less."],
    ["empireMomentum","Empire Momentum",8,"Permanent +15% total earnings."],
    ["goldenReserve","Golden Reserve",9,"Golden Bill cash rewards +25%."],
    ["rebirthMastery","Rebirth Mastery",10,"Future Rebirths give +15% Empire Points."]
  ].map(([id,name,cost,description])=>({id,name,cost,description,icon:"✦",image:id==="starterCapital"?"assets/ui/first-dollar.png":undefined,early:true}));
  const BOOSTERS=[
    ["coinPurse","Coin Purse","common","total",.04,"+4% total earnings"],
    ["fastHands","Fast Hands","common","click",.10,"+10% click earnings"],
    ["smallSponsor","Small Sponsor","common","business",.08,"+8% business earnings"],
    ["nightOwl","Night Owl","common","offline",.12,"+12% offline earnings"],
    ["dealHunter","Deal Hunter","common","discount",.02,"Businesses cost 2% less"],
    ["luckyCoin","Lucky Coin","common","goldenCash",.15,"Golden Bill cash rewards +15%"],
    ["richInvestor","Rich Investor","rare","total",.15,"+15% total earnings"],
    ["bigSponsor","Big Sponsor","rare","business",.20,"+20% business earnings"],
    ["clickPro","Click Pro","rare","click",.30,"+30% click earnings"],
    ["goldenScout","Golden Scout","rare","goldenFrequency",.20,"Golden Bills appear 20% more often"],
    ["smartManager","Smart Manager","rare","discount",.04,"Businesses cost 4% less"],
    ["ventureCapitalist","Venture Capitalist","epic","total",.25,"+25% total earnings"],
    ["marketGenius","Market Genius","epic","business",.35,"+35% business earnings"],
    ["rebirthStrategist","Rebirth Strategist","epic","rebirthPoints",.20,"+20% Empire Points from Rebirth"],
    ["goldenTouch","Golden Touch","epic","goldenCash",.35,"Golden Bill cash rewards +35%"],
    ["billionaireMentor","Billionaire Mentor","legendary","total",.40,"+40% total earnings"],
    ["empireArchitect","Empire Architect","legendary","business",.55,"+55% business earnings"],
    ["goldenEmperor","Golden Emperor","legendary","goldenCash",.70,"Golden Bill cash rewards +70%"],
    ["moneyKing","Money King","mythic","total",.60,"+60% total earnings"],
    ["infiniteSponsor","Infinite Sponsor","mythic","business",.75,"+75% business earnings"]
  ].map(([id,name,rarity,effect,value,description])=>({id,name,rarity,effect,value,description}));
  const SLOT_PRICES={2:10000000,3:1000000000,4:100000000000};
  const DROP_INTERVAL_MS=600000;
  const PRESTIGE = [...EARLY_PRESTIGE,
    {id:"investor",name:"Investor",icon:"📊",cost:5,description:"Businesses produce +10%."},
    {id:"compound",name:"Compound Interest",image:"assets/upgrade-compound-interest.png",cost:12,description:"Each Empire Point gives +1.5% instead of +1%."},
    {id:"automation",name:"Automation",image:"assets/upgrade-automation.png",cost:20,description:"Start each rebirth with 10 Cash Collectors and 5 Lemonade Stands."},
    {id:"lucky",name:"Lucky Investor",image:"assets/upgrade-lucky-investor.png",cost:25,description:"Golden Bills appear 30% more often."},
    {id:"executive",name:"Executive",image:"assets/upgrade-executive.png",cost:35,description:"Permanent click income ×2."},
    {id:"nightshift",name:"Night Shift",image:"assets/upgrade-night-shift.png",cost:50,description:"Offline earning cap rises from 10 to 16 hours."}
  ];
  const SUFFIXES = ["","thousand","million","billion","trillion","quadrillion","quintillion","sextillion","septillion","octillion","nonillion","decillion","undecillion","duodecillion","tredecillion","quattuordecillion","quindecillion","sexdecillion","septendecillion","octodecillion","novemdecillion","vigintillion"];
  const $ = id => document.getElementById(id);
  const moneyEl = $("balance"), rateEl = $("rate"), pileEl = $("moneyPile");
  const defaultState = () => ({
    version:1,money:0,runEarned:0,lifetime:0,
    businesses:Object.fromEntries(BUSINESS.map(b => [b.id,0])),
    businessRevenue:Object.fromEntries(BUSINESS.map(b => [b.id,0])),
    upgrades:[],achievements:[],prestigeUpgrades:[],
    empireTotal:0,empireSpent:0,rebirths:0,
    totalClicks:0,businessesPurchased:0,goldenClicked:0,
    highestRate:0,totalPlaytime:0,lastPlayed:Date.now(),
    boosterInventory:{},equippedBoosters:[],boosterSlotsUnlocked:1,premiumBoosterSlots:[],
    nextDropPlaytimeMs:DROP_INTERVAL_MS,pendingDropUntilMs:0,rushUntilMs:0,
    settings:{sound:true,animations:true,particles:true,compact:false,light:false,fitScreen:false}
  });
  let state = defaultState();
  let premiumMultiplier = 1;
  let premiumStatus = {authenticated:false,paymentsAvailable:false,owned:false};
  let account={authenticated:false,username:null,needsUsername:false};
  const CLOUD_FLUSH_MS=180000,CLOUD_OUTBOX_PREFIX="cash-empire-cloud-outbox-v3:",OLD_OUTBOX_V2="cash-empire-cloud-outbox-v2:",LEGACY_CLOUD_OUTBOX_PREFIX="cash-empire-cloud-outbox-v1:",LEGACY_CLOUD_LAST_BATCH_PREFIX="cash-empire-cloud-last-batch-v1:",CLOUD_STREAM_PREFIX="cash-empire-click-stream-v3:",CLOUD_ACCOUNT_CACHE="cash-empire-cloud-account-v1",CLOUD_USER_ID_CACHE="cash-empire-cloud-user-id-v1";
  let cloudMode=false,pendingClicks=0,cloudQueue=Promise.resolve(),cloudBusy=false,cloudOutbox=[],cloudAdminBoosts=[];
  let cloudClickStream={id:"",total:0,acked:0},cloudClickDue=false,cloudUnavailable=false,cloudServerBalance=0,cloudGeneration=0;
  let cloudRetryTimer=0,cloudClickTimer=0,cloudRetryCount=0;
  let lastCloudSync=Date.now(),pendingAccountRefresh=false;
  const CLOUD_CHOICE="cash-empire-cloud-choice-v1",LOCAL_BACKUP="cash-empire-local-backup-v1";
  let featureMode = null;
  let buyAmount = "1",activeTab = "upgrades",sessionActiveSeconds=0,lastTick = Date.now(),lastHeartbeatSent=0,heartbeatBusy=false;
  let goldenExpires = 0,goldenNext = Date.now() + 250000,buff = null;
  let audioContext = null,renderTimer = 0,achievementTimer = 0,pileTimer = 0,lastClickSave = 0,ambientNext=Date.now()+7000;
  let musicMuted = false, musicVolume = 30, musicStarted = false;
  const businessRows=new Map();
  let tooltipBusinessId=null,tickerIndex=0,tickerNext=Date.now()+11000;
  const has = id => state.upgrades.includes(id);
  const hasPrestige = id => state.prestigeUpgrades.includes(id);
  const safeNumber = (value,fallback=0) => Number.isFinite(value) && value >= 0 ? Math.min(value,1e300) : fallback;
  function format(value,decimals=0) {
    if(!Number.isFinite(value))return "∞";
    const sign=value<0?"-":"",n=Math.abs(value);
    if(n<1000000000000 || (!state.settings.compact && n<1000000000000000))
      return sign+n.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:decimals});
    const tier=Math.min(Math.floor(Math.log10(n)/3),SUFFIXES.length-1);
    const scaled=n/Math.pow(1000,tier);
    const digits=scaled<10?2:scaled<100?1:0;
    const rounded=scaled.toFixed(digits).replace(/\.?0+$/,"");
    return sign+rounded+" "+SUFFIXES[tier];
  }
  const euro=(n,d=0)=>"$"+format(n,d);
  function duration(seconds) {
    seconds = Math.max(0,Math.floor(seconds));
    const h = Math.floor(seconds/3600),m = Math.floor(seconds%3600/60),s = seconds%60;
    return h ? h+"h "+m+"m" : m ? m+"m "+s+"s" : s+"s";
  }
  function boosterBonus(effect) {
    return state.equippedBoosters.reduce((sum,id)=>{
      const b=BOOSTERS.find(item=>item.id===id);
      return sum+(b?.effect===effect&&state.boosterInventory[id]>0?b.value:0);
    },0);
  }
  function adminMultiplier(kind){if(!cloudMode)return 1;return Math.min(1e12,cloudAdminBoosts.reduce((n,b)=>n*(b.kind===kind&&(b.expiresAtMs===null||b.expiresAtMs>Date.now())?b.multiplier:1),1));}
  function totalMultiplier(){return (1+state.rebirths*.1)*prestigeBonus()*(hasPrestige("empireMomentum")?1.15:1)*(1+boosterBonus("total"))*adminMultiplier("total");}
  function priceFactor(){return Math.max(.75,1-(hasPrestige("bulkBuyer")?.03:0)-boosterBonus("discount"));}
  function totalCost(b,owned,quantity) {
    if (quantity <= 0) return 0;
    const start = b.cost * Math.pow(PRICE_GROWTH,owned);
    return start * Math.expm1(quantity * Math.log(PRICE_GROWTH)) / (PRICE_GROWTH-1)*priceFactor();
  }
  function maxAffordable(b,owned,budget) {
    if (budget < totalCost(b,owned,1)) return 0;
    let low = 0,high = 1;
    while (high < 100000 && totalCost(b,owned,high) <= budget) {low=high;high*=2;}
    high = Math.min(high,100000);
    while (low < high) {
      const mid = Math.ceil((low+high)/2);
      if (totalCost(b,owned,mid) <= budget) low=mid;
      else high=mid-1;
    }
    return low;
  }
  function estimatedAvailableMoney(){
    if(!cloudMode)return state.money;
    const legacy=cloudOutbox.reduce((sum,op)=>sum+(op.type==="legacy_clicks"?op.entries.reduce((n,x)=>n+x.count,0):0),0);
    const pending=legacy+Math.max(0,cloudClickStream.total-cloudClickStream.acked)+pendingClicks;
    return Math.max(state.money,cloudServerBalance+Math.min(1e300,pending*clickValue()));
  }
  function selectedQuantity(b) {
    const max = maxAffordable(b,state.businesses[b.id],estimatedAvailableMoney());
    return buyAmount === "max" ? (cloudMode?Math.min(max,100):max) : (Number(buyAmount) <= max ? Number(buyAmount) : 0);
  }
  function displayedQuantity(b) {
    return buyAmount === "max" ? (cloudMode?Math.min(100,maxAffordable(b,state.businesses[b.id],estimatedAvailableMoney())):maxAffordable(b,state.businesses[b.id],estimatedAvailableMoney())) : Number(buyAmount);
  }
  function prestigeBonus() {
    return 1 + state.empireTotal * (hasPrestige("compound") ? .015 : .01);
  }
  function businessMultiplier(b) {
    return MILESTONES.reduce((value,m) => value * (has(b.id+"-"+m.count) ? m.mult : 1),1);
  }
  function businessUnitRate(b) {
    let rate=b.income*businessMultiplier(b)*totalMultiplier()*(hasPrestige("investor")?1.1:1)*(hasPrestige("businessNetwork")?1.1:1)*(1+boosterBonus("business"))*adminMultiplier("business");
    for(const u of SPECIAL_UPGRADES)if(has(u.id)&&(u.effect==="total"||u.effect===b.id))rate*=u.mult;
    return rate * premiumMultiplier;
  }
  function businessTotalRate(b) {return state.businesses[b.id]*businessUnitRate(b);}
  function baseRate() {return BUSINESS.reduce((sum,b)=>sum+businessTotalRate(b),0);}
  function currentRate() {
    const boost=buff&&buff.until>Date.now()&&(buff.type==="income"||buff.type==="goldrush")?buff.mult:1;
    return baseRate()*boost;
  }
  function clickValue() {
    let value=1;
    for(const u of CLICK_UPGRADES)if(has(u.id))value*=u.mult;
    for(const u of SPECIAL_UPGRADES)if(u.effect==="click"&&has(u.id))value*=u.mult;
    value*=totalMultiplier()*(hasPrestige("executive")?2:1)*(hasPrestige("clickTraining")?1.1:1)*(1+boosterBonus("click"))*adminMultiplier("click");
    if(buff&&buff.until>Date.now()&&(buff.type==="click"||buff.type==="goldrush"))value*=buff.clickMult||buff.mult;
    return value * premiumMultiplier;
  }
  function earnBusinesses(seconds,withBuff=true) {
    const boost=withBuff&&buff&&buff.until>Date.now()&&(buff.type==="income"||buff.type==="goldrush")?buff.mult:1;
    let total=0;
    for(const b of BUSINESS){
      const earned=businessTotalRate(b)*seconds*boost;
      if(earned>0){state.businessRevenue[b.id]=Math.min(1e300,state.businessRevenue[b.id]+earned);total+=earned;}
    }
    addMoney(total);
    return total;
  }
  function addMoney(value) {
    if (!Number.isFinite(value) || value <= 0) return;
    state.money = Math.min(1e300,state.money+value);
    state.runEarned = Math.min(1e300,state.runEarned+value);
    state.lifetime = Math.min(1e300,state.lifetime+value);
  }
  function saveMusicPreferences() {
    try { localStorage.setItem(MUSIC_KEY, JSON.stringify({muted:musicMuted,volume:musicVolume})); }
    catch (_) { /* Music preferences can still work for this session. */ }
  }
  function updateMusicControls() {
    const audio=$("backgroundMusic"),button=$("musicMute"),slider=$("musicVolume");
    audio.volume=musicVolume/100;
    audio.muted=musicMuted;
    button.textContent=musicMuted?"OFF":"ON";
    button.setAttribute("aria-pressed",String(musicMuted));
    button.setAttribute("aria-label",musicMuted?"Unmute background music":"Mute background music");
    slider.value=String(musicVolume);
    $("musicVolumeValue").textContent=musicVolume+"%";
  }
  function startMusic() {
    if(musicMuted||musicVolume===0)return;
    const audio=$("backgroundMusic");
    if(musicStarted&&!audio.paused)return;
    const result=audio.play();
    if(result&&typeof result.then==="function")result.then(()=>{musicStarted=true;}).catch(()=>{});
  }
  function setupMusic() {
    try {
      const saved=JSON.parse(localStorage.getItem(MUSIC_KEY)||"null");
      if(saved&&typeof saved==="object"){
        if(typeof saved.muted==="boolean")musicMuted=saved.muted;
        if(Number.isFinite(saved.volume))musicVolume=Math.max(0,Math.min(100,Math.round(saved.volume)));
      }
    } catch (_) { /* Ignore unavailable storage or malformed music preferences. */ }
    updateMusicControls();
    $("musicMute").addEventListener("click",()=>{
      musicMuted=!musicMuted;
      updateMusicControls();saveMusicPreferences();
      if(!musicMuted)startMusic();
    });
    $("musicVolume").addEventListener("input",event=>{
      musicVolume=Number(event.target.value);
      updateMusicControls();saveMusicPreferences();
      startMusic();
    });
    const firstInteraction=event=>{
      if(event.target instanceof Element&&event.target.closest("#musicMute"))return;
      startMusic();
      document.removeEventListener("pointerdown",firstInteraction,true);
      document.removeEventListener("keydown",firstInteraction,true);
    };
    document.addEventListener("pointerdown",firstInteraction,true);
    document.addEventListener("keydown",firstInteraction,true);
  }
  function playTone(frequency=660) {
    if (!state.settings.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
      oscillator.type="sine";oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(.035,audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.085);
      oscillator.connect(gain);gain.connect(audioContext.destination);
      oscillator.start();oscillator.stop(audioContext.currentTime+.09);
    } catch (_) {}
  }
  function effect(value,event) {
    if (!state.settings.animations) return;
    clearTimeout(pileTimer);pileEl.classList.remove("popped");
    void pileEl.offsetWidth;pileEl.classList.add("popped");
    pileTimer=setTimeout(() => pileEl.classList.remove("popped"),140);
    const zone=$("pileZone"),rect=zone.getBoundingClientRect();
    const x=event ? event.clientX-rect.left : rect.width/2;
    const y=event ? event.clientY-rect.top : rect.height/2;
    const layer=$("effectLayer"),label=document.createElement("span");
    label.className="float-cash";label.textContent="+"+euro(value, value < 10 ? 1 : 0);
    label.style.setProperty("--x",x+"px");label.style.setProperty("--y",y+"px");
    label.style.setProperty("--dx",(Math.random()*50-25)+"px");layer.append(label);
    setTimeout(() => label.remove(),850);
    if (state.settings.particles) for(let i=0;i<3;i++) {
      const note=document.createElement("span");note.className="particle-note";note.textContent="▰";
      note.style.setProperty("--x",x+"px");note.style.setProperty("--y",y+"px");
      note.style.setProperty("--dx",(Math.random()*130-65)+"px");
      note.style.setProperty("--dy",(35+Math.random()*90)+"px");
      $("particleLayer").append(note);setTimeout(() => note.remove(),750);
    }
  }
  const recentToasts=new Map();
  function toast(message,achievement=false) {
    const stack=$("toastStack"),now=Date.now();
    const existing=[...stack.children].find(node=>node.textContent===message);
    if(existing){clearTimeout(existing.dismissTimer);existing.dismissTimer=setTimeout(()=>existing.remove(),3500);return;}
    if(!achievement&&now-(recentToasts.get(message)||0)<8000)return;
    recentToasts.set(message,now);
    if(recentToasts.size>30)for(const [key,time] of recentToasts)if(now-time>8000)recentToasts.delete(key);
    if(stack.children.length>=3){clearTimeout(stack.firstElementChild.dismissTimer);stack.firstElementChild.remove();}
    const node=document.createElement("div");node.className="toast"+(achievement?" achievement-toast":"");node.textContent=message;
    stack.append(node);node.dismissTimer=setTimeout(()=>node.remove(),3500);
  }
  const ACHIEVEMENT_ART = {"earn-1":"first-dollar","click-1":"first-tap","business-1":"business-owner","rate-1":"first-dividend","gold-1":"golden-opportunity","rebirth-1":"new-beginning","upgrade-1":"smart-purchase","collector-1":"helping-hand","empire-1":"empire-point"};
  const ACHIEVEMENTS = [];
  function achievement(id,name,description,icon,test) {ACHIEVEMENTS.push({id,name,description,icon,image:ACHIEVEMENT_ART[id]?"assets/ui/"+ACHIEVEMENT_ART[id]+".png":undefined,test});}
  [
    [1,"First Dollar"],[100,"Pocket Money"],[10000,"Getting Serious"],[1000000,"Millionaire"],
    [1000000000,"Billionaire"],[1000000000000,"Trillionaire"],[1e15,"Quadrillionaire"],
    [1e18,"Quintillionaire"],[1e21,"Sextillionaire"]
  ].forEach(([n,name]) => achievement("earn-"+n,name,"Earn "+euro(n)+" total","💵",s=>s.lifetime>=n));
  [1,10,100,1000,10000,100000].forEach((n,i) => achievement("click-"+n,["First Tap","Cash Habit","Busy Hands","Click Addict","Tap Tycoon","Human Machine"][i],"Click the pile "+format(n)+" times","👆",s=>s.totalClicks>=n));
  [1,10,50,250,1000,5000].forEach((n,i) => achievement("business-"+n,["Business Owner","Local Mogul","Entrepreneur","Empire Builder","Market Leader","Everywhere at Once"][i],"Own "+format(n)+" businesses","🏢",s=>sumBusinesses(s)>=n));
  [1,10,100,1000,10000,1000000,1e9,1e12].forEach((n,i) => achievement("rate-"+n,["First Dividend","Steady Stream","Money River","Cash Current","Golden Pipeline","Wealth Engine","Planet Economy","Universal Economy"][i],"Reach "+euro(n)+" per second","📈",s=>currentRate()>=n));
  [1,5,25,100].forEach((n,i)=>achievement("gold-"+n,["Golden Opportunity","Bill Hunter","Lucky Streak","Golden Legend"][i],"Claim "+n+" Golden Bills","✨",s=>s.goldenClicked>=n));
  [1,5,20,100].forEach((n,i)=>achievement("rebirth-"+n,["New Beginning","Second Nature","Eternal Founder","Rebirth Legend"][i],"Rebirth "+n+" times","✦",s=>s.rebirths>=n));
  [1,5,20,50].forEach((n,i)=>achievement("upgrade-"+n,["Smart Purchase","Growing Ideas","Upgrade Expert","Master Planner"][i],"Buy "+n+" upgrades","💡",s=>s.upgrades.length>=n));
  [1,10,100,500].forEach((n,i)=>achievement("collector-"+n,["A Helping Hand","Collection Crew","Cash Brigade","Collector Army"][i],"Own "+n+" Cash Collectors","✋",s=>s.businesses.collector>=n));
  [1,10,100].forEach((n,i)=>achievement("empire-"+n,["First Empire Point","Invested Future","Point Power"][i],"Earn "+n+" Empire Points","🪙",s=>s.empireTotal>=n));
  function sumBusinesses(s=state) {return Object.values(s.businesses).reduce((a,b)=>a+b,0);}
  function checkAchievements() {
    let changed=false;
    for (const a of ACHIEVEMENTS) if (!state.achievements.includes(a.id) && a.test(state)) {
      state.achievements.push(a.id);toast("Achievement: "+a.name,true);changed=true;
    }
    if(changed) save();
  }
  const WEALTH_SCENES = [
    [["coin",39,58,-12,1],["coin",56,60,11,1],["coin",49,43,4,1]],
    [["coin",28,61,-14,1],["coin",43,67,8,1],["coin",60,67,-8,1],["coin",73,58,12,1],["coin",36,45,8,1],["coin",53,42,-11,1],["coin",65,42,6,1]],
    [["bill",48,42,-14,1],["coin",27,65,-12,1],["coin",42,69,9,1],["coin",58,67,-8,1],["coin",73,60,13,1],["coin",37,48,5,1]],
    [["bill",35,40,-18,1],["bill",61,39,16,1],["bill",48,57,-3,1],["coin",32,72,-8,1],["coin",65,72,10,1]],
    [["stack",31,52,-11,1],["stack",67,53,10,1],["bill",50,34,-5,1],["bill",49,68,5,1],["coin",28,76,5,1],["coin",72,76,-6,1]],
    [["stack",29,57,-13,1],["stack",68,57,12,1],["stack",50,35,0,1],["stack",50,68,2,1],["bill",33,28,-15,1],["bill",67,29,14,1],["coin",25,79,0,1],["coin",76,79,0,1]],
    [["stack",28,58,-12,1],["stack",69,58,10,1],["stack",49,42,0,1],["stack",50,72,0,1],["gem",29,30,-15,1],["gem",69,27,12,1],["gem",51,20,0,1],["coin",75,77,0,1]],
    [["stack",26,61,-12,1],["stack",71,61,11,1],["stack",49,48,0,1],["stack",49,74,0,1],["gem",27,31,-12,1],["gem",73,30,10,1],["crypto",49,24,0,1],["crypto",25,78,-11,.85],["crypto",76,78,11,.85]]
  ];
  function buildWealthArt() {
    pileEl.replaceChildren();
    for(const [stage,pieces] of WEALTH_SCENES.entries()){
      const scene=document.createElement("span");
      scene.className="wealth-scene scene-"+stage;
      scene.setAttribute("aria-hidden","true");
      for(const [type,x,y,rotation,scale] of pieces){
        const piece=document.createElement("span");
        piece.className="wealth-piece piece-"+type;
        piece.textContent=type==="coin"||type==="bill"?"$":type==="crypto"?"₿":"";
        piece.style.setProperty("--x",x+"%");
        piece.style.setProperty("--y",y+"%");
        piece.style.setProperty("--rot",rotation+"deg");
        piece.style.setProperty("--scale",scale);
        scene.append(piece);
      }
      pileEl.append(scene);
    }
  }
  function getWealthVisualTier(rate) {return rate>=100000?4:rate>=10000?3:rate>=1000?2:rate>=100?1:0;}
  function updatePile() {
    const tier=getWealthVisualTier(currentRate());
    const stage=tier===0?Math.min(3,state.lifetime<10?0:state.lifetime<100?1:state.lifetime<1000?2:3):tier===1?5:tier===2?6:7;
    document.documentElement.dataset.wealthTier=String(tier);
    document.documentElement.classList.toggle("diamond-theme",tier>=2);
    document.documentElement.classList.toggle("luxury-tier",tier>=3);
    document.documentElement.classList.toggle("ultimate-tier",tier>=4);
    pileEl.className="money-pile wealth-"+stage+(pileEl.classList.contains("popped")?" popped":"");
  }
  function renderTop() {
    moneyEl.textContent=euro(state.money,state.money<100?1:0);
    rateEl.textContent=euro(currentRate(),currentRate()<10?1:0)+" / second";
    $("lifetime").textContent=euro(state.lifetime);
    $("perClick").textContent=euro(clickValue(),clickValue()<10?1:0)+" / click";
    const active=buff&&buff.until>Date.now();
    const rush=active?"GOLD RUSH ×7 · 00:"+String(Math.max(0,Math.ceil((buff.until-Date.now())/1000))).padStart(2,"0"):"";
    const admin=cloudMode?cloudAdminBoosts.filter(b=>b.expiresAtMs===null||b.expiresAtMs>Date.now()).map(b=>"ADMIN "+b.kind.toUpperCase()+" ×"+b.multiplier).join(" · "):"";
    $("buffBar").textContent=[rush,admin].filter(Boolean).join(" · ");
    updatePile();
  }
  function compactGroup(amount) {
    if(amount<1000)return String(amount);
    const units=["","k","m","b","t","q"],tier=Math.min(Math.floor(Math.log10(amount)/3),units.length-1);
    const value=amount/Math.pow(1000,tier);
    return (value<10?value.toFixed(1).replace(/\.0$/,""):value.toFixed(0))+units[tier];
  }
  function renderOwned() {
    const list=$("ownedBusinessList"),total=sumBusinesses();
    $("ownedTotal").textContent=total.toLocaleString("en-US")+" owned";
    list.replaceChildren();
    if(!total){
      const starter=document.createElement("div");
      starter.className="world-starter";
      const badge=document.createElement("span");badge.className="eyebrow";badge.textContent="YOUR EMPIRE STARTS HERE";
      const title=document.createElement("h3");title.textContent="Fill the world with your businesses";
      const description=document.createElement("p");description.textContent="Buy a generator in the market. Every business you own will appear in this world.";
      const previews=document.createElement("div");previews.className="starter-previews";
      for(const b of BUSINESS.slice(0,4)){
        const preview=document.createElement("div");preview.className="starter-preview";
        const image=document.createElement("img");image.src=b.image;image.alt="";image.loading="lazy";
        const name=document.createElement("strong");name.textContent=b.name;
        preview.append(image,name);previews.append(preview);
      }
      starter.append(badge,title,description,previews);list.append(starter);
      return;
    }
    for(const b of BUSINESS){
      const owned=state.businesses[b.id];
      if(!owned)continue;
      const row=document.createElement("div");
      row.className="owned-row"+(owned>30?" dense":owned>10?" medium":"");
      const head=document.createElement("div");head.className="owned-row-head";
      const image=document.createElement("img");image.src=b.image;image.alt="";image.loading="lazy";
      const title=document.createElement("div");title.className="owned-row-title";
      const name=document.createElement("strong");name.textContent=b.name;
      const rate=document.createElement("small");rate.textContent=euro(businessTotalRate(b),businessTotalRate(b)<10?1:0)+" / second";
      title.append(name,rate);
      const amount=document.createElement("span");amount.className="owned-quantity";amount.textContent="×"+owned.toLocaleString("en-US");
      head.append(image,title,amount);
      const copies=document.createElement("div");copies.className="owned-copies";
      const visible=Math.min(16,owned),base=Math.floor(owned/visible),extra=owned%visible;
      for(let i=0;i<visible;i++){
        const copy=document.createElement("span");copy.className="owned-copy";
        copy.style.setProperty("--delay",((i%7)*-.28)+"s");
        const icon=document.createElement("img");icon.src=b.image;icon.alt="";icon.loading="lazy";
        copy.append(icon);
        const group=base+(i<extra?1:0);
        if(group>1){
          const badge=document.createElement("span");badge.className="copy-group";badge.textContent="×"+compactGroup(group);copy.append(badge);
        }
        copies.append(copy);
      }
      row.append(head,copies);list.append(row);
    }
    const next=BUSINESS.find(b=>state.businesses[b.id]===0);
    if(next){
      const preview=document.createElement("div");preview.className="world-next";
      const image=document.createElement("img");image.src=next.image;image.alt="";
      const copy=document.createElement("div");
      const label=document.createElement("span");label.className="eyebrow";label.textContent="NEXT OPPORTUNITY";
      const name=document.createElement("strong");name.textContent=next.name;
      copy.append(label,name);preview.append(image,copy);list.append(preview);
    }
  }
  function allUpgrades() {
    const result=[];
    for(const u of CLICK_UPGRADES)if(!has(u.id)&&state.lifetime>=u.unlock)result.push(u);
    for(const u of SPECIAL_UPGRADES){
      const earned=state.lifetime>=(u.unlock||0);
      const owned=!u.requires||Object.entries(u.requires).every(([id,count])=>state.businesses[id]>=count);
      if(!has(u.id)&&earned&&owned)result.push(u);
    }
    for(const b of BUSINESS)for(const m of MILESTONES){
      const id=b.id+"-"+m.count;
      if(!has(id)&&state.businesses[b.id]>=m.count)
        result.push({id,name:b.name+" "+m.count,image:b.image,cost:Math.ceil(b.cost*m.count*(m.count===10?4:m.count===25?5:m.count===50?6:m.count===100?8:10)),mult:m.mult,description:b.name+" output ×"+m.mult});
    }
    return result.sort((a,b)=>a.cost-b.cost);
  }
  function makeButton(label,disabled,handler) {
    const b=document.createElement("button");b.type="button";b.textContent=label;b.disabled=disabled;b.addEventListener("click",handler);return b;
  }
  function setArtIcon(container,image,fallback) {
    if(!image){container.textContent=fallback||"✦";return;}
    const art=document.createElement("img");art.src=image;art.alt="";art.decoding="async";
    art.addEventListener("error",()=>{art.remove();container.textContent=fallback||"✦";},{once:true});
    container.append(art);
  }
  function renderUpgrades() {
    const list=$("upgradeList"),upgrades=allUpgrades();
    $("upgradeCount").textContent=upgrades.length+" available";
    list.replaceChildren();
    if(!upgrades.length){const empty=document.createElement("div");empty.className="empty-state";empty.textContent="Keep earning. Your next upgrade is on its way.";list.append(empty);return;}
    for(const u of upgrades) {
      const card=document.createElement("div");card.className="upgrade-card"+(estimatedAvailableMoney()>=u.cost?" affordable":"");
      const icon=document.createElement("div");icon.className="upgrade-icon";
      setArtIcon(icon,u.image,u.icon);
      const info=document.createElement("div");info.className="upgrade-info";
      const title=document.createElement("strong");title.textContent=u.name;
      const desc=document.createElement("p");desc.textContent=u.description;
      info.append(title,desc);
      card.append(icon,info,makeButton(euro(u.cost),estimatedAvailableMoney()<u.cost,()=>buyUpgrade(u)));
      list.append(card);
    }
  }
  function buyUpgrade(u) {
    if(cloudMode){queueCloudAction({type:"buy_upgrade",upgradeId:u.id});return;}
    if(has(u.id)||state.money<u.cost)return;
    state.money-=u.cost;state.upgrades.push(u.id);playTone(880);toast(u.name+" purchased");
    afterAction();
  }
  function tooltipRow(label,value) {
    const row=document.createElement("div");row.className="tooltip-stat";
    const name=document.createElement("span");name.textContent=label;
    const amount=document.createElement("strong");amount.textContent=value;
    row.append(name,amount);return row;
  }
  function showBusinessTooltip(b,card) {
    tooltipBusinessId=b.id;
    const tip=$("businessTooltip");tip.replaceChildren();
    const head=document.createElement("div");head.className="tooltip-head";
    const art=document.createElement("img");art.src=b.image;art.alt="";
    const title=document.createElement("strong");title.textContent=b.name;
    head.append(art,title);tip.append(head);
    const owned=state.businesses[b.id],total=currentRate();
    tip.append(
      tooltipRow("Owned",owned.toLocaleString("en-US")),
      tooltipRow("One produces",euro(businessUnitRate(b),2)+"/sec"),
      tooltipRow("All produce",euro(businessTotalRate(b),2)+"/sec"),
      tooltipRow("Lifetime produced",euro(state.businessRevenue[b.id])),
      tooltipRow("Share of income",total?format(businessTotalRate(b)/total*100,1)+"%":"0%")
    );
    tip.hidden=false;
    const rect=card.getBoundingClientRect();
    const pageWidth=window.innerWidth||1200,pageHeight=window.innerHeight||800;
    const left=rect.left>=300?rect.left-290:rect.right+10;
    tip.style.left=Math.max(8,Math.min(left,pageWidth-288))+"px";
    tip.style.top=Math.max(8,Math.min(rect.top,pageHeight-(tip.offsetHeight||265)-8))+"px";
  }
  function hideBusinessTooltip() {$("businessTooltip").hidden=true;tooltipBusinessId=null;}
  function renderBusinesses() {
    const list=$("businessList");
    for(const b of BUSINESS){
      let row=businessRows.get(b.id);
      if(!row){
        const card=document.createElement("div");card.className="business-card";
        const imageBox=document.createElement("div");imageBox.className="business-image";
        const image=document.createElement("img");image.src=b.image;image.alt="";image.loading="lazy";image.decoding="async";imageBox.append(image);
        const info=document.createElement("div");info.className="business-info";info.tabIndex=0;info.setAttribute("aria-label",b.name+" details");
        const title=document.createElement("strong");title.textContent=b.name;
        const detail=document.createElement("p");
        const count=document.createElement("span");count.className="business-owned";
        info.append(title,detail,count);
        const button=document.createElement("button");button.type="button";
        const label=document.createElement("span"),cost=document.createElement("small");button.append(label,cost);
        button.addEventListener("click",()=>buyBusiness(b));
        card.append(imageBox,info,button);list.append(card);
        card.addEventListener("mouseenter",()=>showBusinessTooltip(b,card));
        card.addEventListener("mouseleave",hideBusinessTooltip);
        info.addEventListener("focus",()=>showBusinessTooltip(b,card));
        info.addEventListener("blur",hideBusinessTooltip);
        row={card,detail,count,button,label,cost};
        businessRows.set(b.id,row);
      }
      const owned=state.businesses[b.id],want=displayedQuantity(b),quantity=selectedQuantity(b);
      const price=totalCost(b,owned,want||1);
      row.card.className="business-card"+(quantity>0?" available":owned===0?" locked":"");
      row.detail.hidden=owned===0;
      row.count.hidden=owned===0;
      if(owned){
        row.detail.textContent=euro(businessUnitRate(b),b.income<10?2:0)+"/sec each";
        row.count.textContent="OWNED "+owned.toLocaleString("en-US");
      }
      row.label.textContent="BUY ×"+want;
      row.cost.textContent=euro(price);
      row.button.disabled=quantity===0;
    }
    if(tooltipBusinessId){
      const active=BUSINESS.find(b=>b.id===tooltipBusinessId);
      if(active)showBusinessTooltip(active,businessRows.get(active.id).card);
    }
  }
  function buyBusiness(b) {
    const quantity=selectedQuantity(b);if(quantity<=0)return;
    if(cloudMode){queueCloudAction({type:"buy_business",businessId:b.id,quantity});return;}
    const cost=totalCost(b,state.businesses[b.id],quantity);
    if(cost>state.money*(1+1e-12))return;
    state.money=Math.max(0,state.money-cost);state.businesses[b.id]+=quantity;
    state.businessesPurchased+=quantity;playTone(520);afterAction();
  }
  function renderStats() {
    const values=[
      ["Total clicks",format(state.totalClicks)],["Lifetime money earned",euro(state.lifetime)],
      ["Current money",euro(state.money)],["Money per second",euro(currentRate(),1)],
      ["Highest money per second",euro(state.highestRate,1)],["Businesses purchased",format(state.businessesPurchased)],
      ["Golden Bills clicked",format(state.goldenClicked)],["Achievements unlocked",state.achievements.length+" / "+ACHIEVEMENTS.length],
      ["Rebirths",format(state.rebirths)],["Total playtime",duration(state.totalPlaytime)],
      ["Current session",duration(sessionActiveSeconds)],["Empire Points",format(state.empireTotal)]
    ];
    const grid=$("statsGrid");grid.replaceChildren();
    for(const [label,value] of values) {
      const cell=document.createElement("div");cell.className="stat";
      const span=document.createElement("span");span.textContent=label;
      const strong=document.createElement("strong");strong.textContent=value;
      cell.append(span,strong);grid.append(cell);
    }
    const settings=$("settingsList");settings.replaceChildren();
    for(const [key,label] of [["sound","Sound"],["animations","Animations"],["particles","Particles"],["compact","Compact numbers"],["light","Light UI"],["fitScreen","Fit screen"]]) {
      const button=document.createElement("button");button.type="button";button.className="setting";
      const name=document.createElement("span");name.textContent=label;
      const status=document.createElement("strong");status.textContent=state.settings[key]?"ON":"OFF";
      button.append(name,status);button.addEventListener("click",()=>{state.settings[key]=!state.settings[key];applySettings();save();renderStats();});
      settings.append(button);
    }
  }
  function renderAchievements() {
    $("achievementCount").textContent=state.achievements.length+" / "+ACHIEVEMENTS.length;
    const grid=$("achievementGrid");grid.replaceChildren();
    for(const a of ACHIEVEMENTS) {
      const unlocked=state.achievements.includes(a.id),card=document.createElement("div");
      card.className="achievement"+(unlocked?"":" locked");
      const icon=document.createElement("div");icon.className="achievement-icon";setArtIcon(icon,a.image,unlocked?a.icon:"?");
      const name=document.createElement("strong");name.textContent=unlocked?a.name:"Hidden achievement";
      const desc=document.createElement("p");desc.textContent=a.description;
      card.append(icon,name,desc);grid.append(card);
    }
  }
  function pointsAvailable() {return Math.max(0,state.empireTotal-state.empireSpent);}
  function pointsGain() {return state.runEarned<1000000?0:Math.floor(Math.sqrt(state.runEarned/1000000)*(1+(hasPrestige("rebirthMastery")?.15:0)+boosterBonus("rebirthPoints")));}
  function renderPrestige() {
    const gain=pointsGain();
    $("pointsOwned").textContent=format(pointsAvailable());
    $("pointsGain").textContent="+"+format(gain);
    const pointRate=hasPrestige("compound")?.015:.01;
    const after=(1+(state.rebirths+1)*.1)*(1+(state.empireTotal+gain)*pointRate);
    $("rebirthBonus").textContent="+"+format((after-1)*100,1)+"%";
    const nextTarget=Math.max(1000000,Math.ceil(Math.pow(gain+1,2)*1000000/Math.pow(1+(hasPrestige("rebirthMastery")?.15:0)+boosterBonus("rebirthPoints"),2)));
    $("rebirthNext").textContent=gain?"Rebirth now to bank your points. Next point near "+euro(nextTarget)+" this run.":"First point at $1,000,000 earned this run.";
    $("rebirthButton").disabled=gain<=0;
    for(const [target,upgrades] of [["earlyPrestigeTree",PRESTIGE.filter(p=>p.early)],["prestigeTree",PRESTIGE.filter(p=>!p.early)]]){
      const tree=$(target);tree.replaceChildren();
      for(const p of upgrades){
        const owned=hasPrestige(p.id),card=document.createElement("div");card.className="investment-card";
        const icon=document.createElement("div");icon.className="upgrade-icon";
        setArtIcon(icon,p.image,p.icon);
        const info=document.createElement("div");info.className="upgrade-info";
        const name=document.createElement("strong");name.textContent=p.name;
        const desc=document.createElement("p");desc.textContent=p.description;
        info.append(name,desc);
        card.append(icon,info,makeButton(owned?"OWNED":format(p.cost)+" points",owned||pointsAvailable()<p.cost,()=>buyPrestige(p)));
        tree.append(card);
      }
    }
  }
  function boosterSlotOpen(slot){return slot<=state.boosterSlotsUnlocked||state.premiumBoosterSlots.includes(slot);}
  function buyBoosterSlot(slot){
    if(slot!==state.boosterSlotsUnlocked+1||slot>4||state.money<SLOT_PRICES[slot])return;
    if(cloudMode){queueCloudAction({type:"unlock_slot",slot});return;}
    state.money-=SLOT_PRICES[slot];state.boosterSlotsUnlocked=slot;afterAction();
  }
  function equipBooster(id){
    const slot=Array.from({length:6},(_,i)=>i+1).find(n=>boosterSlotOpen(n)&&!state.equippedBoosters[n-1]);
    if(!slot||!state.boosterInventory[id]||state.equippedBoosters.includes(id))return;
    if(cloudMode){queueCloudAction({type:"equip_booster",slot,boosterId:id});return;}
    state.equippedBoosters[slot-1]=id;afterAction();
  }
  function unequipBooster(slot){
    if(!state.equippedBoosters[slot-1])return;
    if(cloudMode){queueCloudAction({type:"unequip_booster",slot});return;}
    state.equippedBoosters[slot-1]=null;afterAction();
  }
  function renderBoosters(){
    const slots=$("boosterSlots"),inventory=$("boosterInventory");slots.replaceChildren();inventory.replaceChildren();
    for(let slot=1;slot<=6;slot++){
      const open=boosterSlotOpen(slot),id=state.equippedBoosters[slot-1],booster=BOOSTERS.find(b=>b.id===id);
      const card=featureElement("div","booster-slot"+(open?"":" locked"));
      card.append(featureElement("strong","","Slot "+slot),featureElement("span","",booster?booster.name:open?"Empty":slot>=5?"Premium · Coming soon":"Locked"));
      if(booster)card.append(makeButton("Unequip",false,()=>unequipBooster(slot)));
      else if(!open&&slot<=4)card.append(makeButton(slot===state.boosterSlotsUnlocked+1?euro(SLOT_PRICES[slot]):"Unlock previous",slot!==state.boosterSlotsUnlocked+1||state.money<SLOT_PRICES[slot],()=>buyBoosterSlot(slot)));
      slots.append(card);
    }
    for(const b of BOOSTERS){
      const count=Number(state.boosterInventory[b.id])||0,card=featureElement("div","booster-card "+b.rarity+(count?"":" locked"));
      card.append(featureElement("div","booster-art",b.rarity==="mythic"?"✦":"◆"));
      const info=featureElement("div","booster-info");
      info.append(featureElement("strong","",b.name+" · "+count),featureElement("small","",b.rarity.toUpperCase()),featureElement("p","",b.description));
      const canEquip=count>0&&!state.equippedBoosters.includes(b.id)&&Array.from({length:6},(_,i)=>i+1).some(n=>boosterSlotOpen(n)&&!state.equippedBoosters[n-1]);
      card.append(info,makeButton(state.equippedBoosters.includes(b.id)?"Equipped":"Equip",!canEquip,()=>equipBooster(b.id)));
      inventory.append(card);
    }
  }
  function buyPrestige(p) {
    if(cloudMode){queueCloudAction({type:"buy_prestige",upgradeId:p.id});return;}
    if(hasPrestige(p.id)||pointsAvailable()<p.cost)return;
    state.empireSpent+=p.cost;state.prestigeUpgrades.push(p.id);toast(p.name+" invested");playTone(940);afterAction();
  }
  function afterAction() {
    checkAchievements();renderTop();renderOwned();renderCurrent();save();
  }
  function renderCurrent() {
    if(activeTab==="upgrades")renderUpgrades();
    else if(activeTab==="stats")renderStats();
    else if(activeTab==="achievements")renderAchievements();
    else if(activeTab==="boosters")renderBoosters();
    else renderPrestige();
    renderBusinesses();
  }
  function switchTab(tab) {
    activeTab=tab;
    document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
    document.querySelectorAll(".tab-panel").forEach(p=>{const on=p.id==="tab-"+tab;p.hidden=!on;p.classList.toggle("active",on);});
    renderCurrent();
  }
  function modal(title,body,actions) {
    $("modalTitle").textContent=title;
    const container=$("modalBody");container.replaceChildren();
    if(typeof body==="string"){const p=document.createElement("p");p.textContent=body;container.append(p);} else container.append(body);
    const buttons=$("modalActions");buttons.replaceChildren();
    for(const a of actions) buttons.append(makeButton(a.label,false,()=>{if(a.close!==false)closeModal();a.action?.();}));
    $("modalBackdrop").hidden=false;
  }
  function closeModal() {$("modalBackdrop").hidden=true;if(pendingAccountRefresh){pendingAccountRefresh=false;refreshAccount();}}
  function featureElement(tag,className,textValue) {
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(textValue!==undefined)node.textContent=textValue;
    return node;
  }
  function openFeature(name) {
    featureMode=name;
    $("featureModal").className="feature-modal"+(name==="store"?" store-view":name==="leaderboard"?" leaderboard-view":"");
    $("featureBackdrop").hidden=false;
    if(name==="leaderboard")renderLeaderboard();
    else {renderPremiumStore();refreshPremiumStatus().then(()=>{renderTop();renderOwned();renderCurrent();});}
  }
  function closeFeature() {
    featureMode=null;
    $("featureBackdrop").hidden=true;
  }
  async function apiJson(path,options={}) {
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),path==="/api/progress/action"?12000:6000);
    try {
      const response=await fetch(path,{credentials:"same-origin",cache:"no-store",...options,signal:controller.signal});
      let data;
      try{data=await response.json();}catch(_){throw Error("Service unavailable.");}
      if(!response.ok){const error=Error(typeof data.error==="string"?data.error:"Service unavailable.");error.status=response.status;throw error;}
      return data;
    } finally {clearTimeout(timeout);}
  }
  async function refreshPremiumStatus() {
    try {
      const data=await apiJson("/api/store/status");
      premiumStatus={
        authenticated:data.authenticated===true,
        paymentsAvailable:data.paymentsAvailable===true,
        owned:data.authenticated===true&&data.entitlements?.double_money===true
      };
      premiumMultiplier=premiumStatus.owned?2:1;
    } catch (_) {
      premiumStatus={authenticated:false,paymentsAvailable:false,owned:false};
      premiumMultiplier=1;
    }
    if(featureMode==="store")renderPremiumStore();
    return premiumStatus;
  }
  function featureHeader(title,buttonLabel,handler) {
    const header=featureElement("div","feature-header");
    const titleBox=featureElement("div");
    const heading=featureElement("h2","",title);heading.id="featureTitle";
    titleBox.append(featureElement("span","eyebrow","ClickTheCash"),heading);
    header.append(titleBox);
    if(buttonLabel)header.append(makeButton(buttonLabel,false,handler));
    return header;
  }
  function leaderboardRow(entry,isPersonal=false) {
    const row=featureElement("div","leaderboard-row"+(entry.isSelf?" is-me":"")+(isPersonal?" personal-rank":""));
    const rank=featureElement("span","rank","#"+entry.rank);
    const name=featureElement("span","username",entry.username);
    const cash=featureElement("span","cash",euro(entry.lifetimeCash));
    const rebirths=featureElement("span","rebirths",format(entry.rebirths)+" rebirths");
    row.append(rank,name,cash,rebirths);
    return row;
  }
  async function renderLeaderboard() {
    const body=$("featureBody");body.className="feature-body";body.replaceChildren();
    body.append(featureHeader("Leaderboard","Refresh",renderLeaderboard));
    const status=featureElement("div","feature-message","Loading the Top 30...");
    body.append(status);
    try {
      const data=await apiJson("/api/leaderboard");
      if(featureMode!=="leaderboard")return;
      status.remove();
      const players=Array.isArray(data.players)?data.players.slice(0,30):[];
      if(!players.length){
        body.append(featureElement("div","feature-message","No players yet. Be the first!"));
      } else {
        const list=featureElement("div","leaderboard-list");
        const heading=featureElement("div","leaderboard-row leaderboard-head");
        for(const label of ["Rank","Username","Lifetime Cash","Rebirths"])heading.append(featureElement("span","",label));
        list.append(heading);
        for(const player of players){
          if(!Number.isInteger(player.rank)||player.rank<1||player.rank>30||typeof player.username!=="string")continue;
          list.append(leaderboardRow(player));
        }
        body.append(list);
      }
      if(data.me&&Number.isInteger(data.me.rank)&&data.me.rank>30){
        const own=leaderboardRow({...data.me,isSelf:true},true);
        body.append(own);
      }
      if(!data.authenticated)body.append(featureElement("p","premium-note","Sign in with Google to join the leaderboard."));
    else if(account.needsUsername)body.append(featureElement("p","premium-note","Choose a username to join the leaderboard."));
    } catch (_) {
      if(featureMode!=="leaderboard")return;
      status.className="feature-message error";
      status.textContent="Leaderboard is unavailable right now.";
      status.append(makeButton("Try again",false,renderLeaderboard));
    }
  }
  async function beginPremiumCheckout(button,note) {
    if(premiumStatus.owned)return;
    if(!premiumStatus.authenticated){
      note.textContent="Sign in with Google to purchase.";
      window.location.assign("/api/auth/google/start");
      return;
    }
    if(!premiumStatus.paymentsAvailable){note.textContent="Payments coming soon";return;}
    button.disabled=true;
    note.textContent="Opening secure checkout...";
    try {
      const data=await apiJson("/api/store/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      if(typeof data.checkoutUrl!=="string"||!data.checkoutUrl.startsWith("https://checkout.stripe.com/"))throw Error("Checkout is unavailable.");
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      note.textContent=error.message||"Payments are not available yet.";
      button.disabled=false;
    }
  }
  function renderPremiumStore() {
    const body=$("featureBody");body.className="feature-body";body.replaceChildren();
    body.append(featureHeader("Store"));
    const card=featureElement("div","premium-card");
    const icon=featureElement("div","premium-icon","2×");
    const info=featureElement("div","premium-info");
    info.append(featureElement("strong","","2x Money"),featureElement("p","","Permanent 2x money earned."),featureElement("div","premium-price","€2.00"));
    const buy=makeButton(premiumStatus.owned?"Owned ✓":!premiumStatus.authenticated?"Sign in to purchase":account.needsUsername?"Choose username":!premiumStatus.paymentsAvailable?"Payments coming soon":"Buy",premiumStatus.owned||premiumStatus.authenticated&&!account.needsUsername&&!premiumStatus.paymentsAvailable,()=>account.needsUsername?showUsernamePrompt():beginPremiumCheckout(buy,note));
    buy.className="premium-buy";
    const note=featureElement("p","premium-note",premiumStatus.owned?"Your account owns this permanent upgrade.":!premiumStatus.authenticated?"Sign in with Google to purchase.":premiumStatus.paymentsAvailable?"Secure checkout opens after you press Buy.":"Payments coming soon");
    card.append(icon,info,buy);body.append(card,note);
    if(premiumStatus.owned)body.append(featureElement("div","premium-state","2x Money is active for this signed-in account."));
  }

  function renderAccountControls(){
    $("googleSignIn").hidden=account.authenticated;
    $("accountButton").hidden=!account.authenticated;
    $("accountButton").textContent=(account.username||"Choose username")+" ▼";
    $("accountUsername").textContent=account.username||"Choose username";
  }
  let accountBlocked=false;
  async function refreshAdminAccess(){
    $("adminLink").hidden=true;if(!account.authenticated||account.moderation)return;
    try{const role=await apiJson("/api/admin/me");$("adminLink").hidden=!role.role;}catch(_){}
  }
  function showAccountNotice(info){const el=$("accountNotice");el.hidden=!info;el.textContent=info?info.message+(info.expiresAtMs?" Expires "+new Date(info.expiresAtMs).toLocaleString()+".":"")+(info.reason?" Reason: "+info.reason:""):"";}
  async function refreshAccount(){
    let data;try{data=await apiJson("/api/account");}
    catch(_){
      if(localStorage.getItem(CLOUD_CHOICE)==="cloud"){
        cloudMode=true;account={authenticated:false,username:localStorage.getItem(CLOUD_ACCOUNT_CACHE),needsUsername:false};
        if(account.username){restoreCloudOutbox();loadCloudStream();}cloudUnavailable=true;renderCloudStatus();scheduleCloudRetry();
      }else account={authenticated:false,username:null,needsUsername:false};
      renderAccountControls();return;
    }
    if(cloudMode&&account.username&&data.authenticated===true&&data.username&&data.username!==account.username)stagePendingClicks();
    if(data.authenticated&&data.userId){
      try{const priorId=localStorage.getItem(CLOUD_USER_ID_CACHE),priorName=localStorage.getItem(CLOUD_ACCOUNT_CACHE);
      if(priorId===data.userId&&priorName&&typeof data.username==="string"&&priorName!==data.username){
        for(const prefix of [CLOUD_OUTBOX_PREFIX,CLOUD_STREAM_PREFIX,"cash-empire-progress-epoch-v1:"]){const oldKey=prefix+priorName,newKey=prefix+data.username,raw=localStorage.getItem(oldKey);if(raw!==null&&localStorage.getItem(newKey)===null){localStorage.setItem(newKey,raw);localStorage.removeItem(oldKey);}}
      }
      localStorage.setItem(CLOUD_USER_ID_CACHE,data.userId);}catch(_){cloudUnavailable=true;renderCloudStatus();}
    }
    account={authenticated:data.authenticated===true,username:typeof data.username==="string"?data.username:localStorage.getItem(CLOUD_ACCOUNT_CACHE),needsUsername:data.needsUsername===true};
    account.moderation=data.moderation||null;showAccountNotice(account.moderation);
    renderAccountControls();refreshAdminAccess();
    if(account.moderation)return;
    if(account.needsUsername)showUsernamePrompt();
    else if(account.authenticated){
      const choice=localStorage.getItem(CLOUD_CHOICE);
      if(choice==="cloud"||(!choice&&state.lifetime===0&&state.money===0))await activateCloud(false);
      else if(!choice)offerCloudChoice();
    }else if(localStorage.getItem(CLOUD_CHOICE)==="cloud"){cloudMode=true;cloudUnavailable=true;renderCloudStatus();}
  }
  function showUsernamePrompt(){
    const wrap=featureElement("div","username-form");
    const intro=featureElement("p","","Choose a public name for the leaderboard. Your Google account details stay private.");
    const input=document.createElement("input");input.type="text";input.maxLength=40;input.autocomplete="off";input.spellcheck=false;input.placeholder="CashKing92";input.setAttribute("aria-label","Username");
    const feedback=featureElement("p","username-feedback","3–20 letters, numbers or underscores.");
    wrap.append(intro,input,feedback);
    let timer=0,valid=false;
    input.addEventListener("input",()=>{
      valid=false;clearTimeout(timer);
      const value=input.value.normalize("NFKC");
      if(value.length<3){feedback.textContent="Username too short";return;}
      if(value.length>20){feedback.textContent="Username too long";return;}
      if(!/^[A-Za-z0-9_]+$/.test(value)){feedback.textContent="Invalid characters";return;}
      feedback.textContent="Checking...";
      timer=setTimeout(async()=>{
        try{
          const data=await apiJson("/api/username/check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:value})});
          if(input.value!==value)return;
          valid=data.available===true;feedback.textContent=data.message||"That username is not allowed";
        }catch(_){feedback.textContent="Username check unavailable. Try again.";}
      },350);
    });
    modal("Choose your username",wrap,[{label:"Save username",close:false,action:async()=>{
      if(!valid){feedback.textContent="Choose an available username first.";return;}
      try{
        const data=await apiJson("/api/username",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:input.value})});
        account.username=data.username;account.needsUsername=false;renderAccountControls();closeModal();refreshPremiumStatus();
        const choice=localStorage.getItem(CLOUD_CHOICE);
        if(choice==="cloud"||(!choice&&state.lifetime===0&&state.money===0))await activateCloud(false);
        else if(!choice)offerCloudChoice();
      }catch(error){valid=false;feedback.textContent=error.message||"That username is not allowed";}
    }}]);
    input.focus();
  }
  function offerCloudChoice(){
    modal("Your saved game","Your browser save is safe. The leaderboard uses a new server-verified run so edited local saves cannot set global scores. Choose how to play.",[
      {label:"Keep local game",action:()=>{localStorage.setItem(CLOUD_CHOICE,"local");}},
      {label:"Start verified run",action:()=>activateCloud(true)}
    ]);
  }
  function applyCloudSnapshot(data,reset=false){
    if(Number.isSafeInteger(data.progressEpoch)&&data.progressEpoch>=0&&cloudMode){
      const key="cash-empire-progress-epoch-v1:"+(account.username||"unknown");
      try{const previous=localStorage.getItem(key),changed=(previous!==null&&Number(previous)!==data.progressEpoch)||(previous===null&&data.progressEpoch>0);
        if(changed){cloudOutbox=[];pendingClicks=0;cloudClickDue=false;clearTimeout(cloudClickTimer);cloudClickTimer=0;cloudClickStream={id:crypto.randomUUID(),total:0,acked:0};localStorage.setItem(cloudOutboxKey(),"[]");localStorage.setItem(cloudStreamKey(),JSON.stringify(cloudClickStream));toast("Admin reset: old pending gameplay actions were retired.");}
        localStorage.setItem(key,String(data.progressEpoch));cloudGeneration=data.progressEpoch;
      }catch(_){cloudUnavailable=true;renderCloudStatus();}
    }
    if(reset){const settings=state.settings,achievements=state.achievements;state=defaultState();state.settings=settings;state.achievements=achievements;}
    cloudAdminBoosts=Array.isArray(data.adminBoosts)?data.adminBoosts:[];
    cloudServerBalance=safeNumber(data.balance);
    state.money=cloudServerBalance;
    state.lifetime=safeNumber(data.lifetimeCash);
    state.runEarned=safeNumber(data.runEarned);
    state.rebirths=safeNumber(data.rebirths);
    state.empireTotal=safeNumber(data.empirePoints);
    state.empireSpent=safeNumber(data.empireSpent);
    state.totalClicks=safeNumber(data.totalClicks);
    state.totalPlaytime=safeNumber(data.totalPlaytime);
    for(const b of BUSINESS)state.businesses[b.id]=Math.floor(safeNumber(data.businesses?.[b.id]));
    state.upgrades=Array.isArray(data.upgrades)?data.upgrades:[];
    state.prestigeUpgrades=Array.isArray(data.prestigeUpgrades)?data.prestigeUpgrades:[];
    state.boosterInventory=data.boosterInventory&&typeof data.boosterInventory==="object"?data.boosterInventory:{};
    state.equippedBoosters=Array.isArray(data.equippedBoosters)?data.equippedBoosters:[];
    state.boosterSlotsUnlocked=Math.max(1,Math.min(4,Number(data.boosterSlotsUnlocked)||1));
    state.premiumBoosterSlots=Array.isArray(data.premiumBoosterSlots)?data.premiumBoosterSlots:[];
    state.pendingDropUntilMs=safeNumber(data.pendingDropUntilMs);
    state.rushUntilMs=safeNumber(data.rushUntilMs);
    buff=state.rushUntilMs>Date.now()?{type:"goldrush",mult:7,until:state.rushUntilMs}:null;
    applySettings();updateDropDisplay();
    if(data.event?.type==="goldenCash")toast("Golden Bill: +"+euro(data.event.amount)+"!");
    if(data.event?.type==="goldRush"){toast("GOLD RUSH! All earnings ×7 for 30 seconds!");setTicker("GOLD RUSH · Everything turns gold for 30 seconds.");}
    if(data.event?.type==="boosterDrop"){
      const found=BOOSTERS.find(b=>b.id===data.event.boosterId);
      if(found)toast("Booster found: "+found.name+" ("+found.rarity+")!");
    }
    state.lastPlayed=Date.now();
    checkAchievements();renderTop();renderOwned();renderCurrent();save();
  }
  function cloudOutboxKey(){return CLOUD_OUTBOX_PREFIX+(account.username||"unknown");}
  function cloudStreamKey(){return CLOUD_STREAM_PREFIX+(account.username||"unknown");}
  function oldOutboxKey(prefix){return prefix+(account.username||"unknown");}
  function cloudPending(){return pendingClicks>0||cloudClickStream.total>cloudClickStream.acked||cloudOutbox.length>0;}
  function renderCloudStatus(){
    const el=$("cloudSyncStatus");el.hidden=!cloudMode;if(!cloudMode)return;
    el.className="cloud-sync-status"+(cloudUnavailable?" queued":cloudBusy||cloudPending()?" syncing":"");
    el.textContent=cloudUnavailable?"Cloud temporarily unavailable — progress queued locally":cloudBusy||cloudPending()?"Syncing...":"Synced";
    el.title=el.textContent;
  }
  function persistCloudOutbox(){
    try{localStorage.setItem(cloudOutboxKey(),JSON.stringify(cloudOutbox));renderCloudStatus();return true;}
    catch(_){cloudUnavailable=true;renderCloudStatus();toast("Browser storage is unavailable. Cloud actions cannot be safely queued.");return false;}
  }
  function loadCloudStream(){
    try{
      const raw=localStorage.getItem(cloudStreamKey());
      if(raw){const value=JSON.parse(raw);if(!value||!/^[A-Za-z0-9_-]{12,80}$/.test(value.id)||!Number.isSafeInteger(value.total)||!Number.isSafeInteger(value.acked)||value.acked>value.total)throw Error("Invalid click stream");cloudClickStream=value;}
      else {cloudClickStream={id:crypto.randomUUID(),total:0,acked:0};localStorage.setItem(cloudStreamKey(),JSON.stringify(cloudClickStream));}
      return true;
    }catch(_){cloudUnavailable=true;renderCloudStatus();toast("Saved cloud clicks need recovery. Your browser data was kept.");return false;}
  }
  function persistCloudStream(){
    try{localStorage.setItem(cloudStreamKey(),JSON.stringify(cloudClickStream));renderCloudStatus();return true;}
    catch(_){cloudUnavailable=true;renderCloudStatus();toast("Browser storage is unavailable. Cloud clicks remain in this tab.");return false;}
  }
  function restoreCloudOutbox(){
    try{
      const migrated=localStorage.getItem(cloudOutboxKey());
      if(migrated!==null){const actions=JSON.parse(migrated);if(!Array.isArray(actions))throw Error("Invalid migrated queue");cloudOutbox=actions;return true;}
      const read=key=>{const raw=localStorage.getItem(key);if(raw===null)return [];const parsed=JSON.parse(raw);if(!Array.isArray(parsed))throw Error("Invalid old queue");return parsed;};
      const oldest=read(oldOutboxKey(LEGACY_CLOUD_OUTBOX_PREFIX));
      const newer=read(oldOutboxKey(OLD_OUTBOX_V2));
      const compact=window.ClickTheCashQueue.compactLegacy([...oldest,...newer]);
      // Commit the complete compact queue before removing either old copy.
      localStorage.setItem(cloudOutboxKey(),JSON.stringify(compact));
      cloudOutbox=compact;
      localStorage.removeItem(oldOutboxKey(LEGACY_CLOUD_OUTBOX_PREFIX));
      localStorage.removeItem(oldOutboxKey(OLD_OUTBOX_V2));
      localStorage.removeItem(oldOutboxKey(LEGACY_CLOUD_LAST_BATCH_PREFIX));
      return true;
    }catch(_){cloudUnavailable=true;renderCloudStatus();toast("Old cloud actions were kept in your browser. Sync will resume after recovery.");return false;}
  }
  function stagePendingClicks(){
    if(!cloudMode||pendingClicks<=0)return true;
    const previous=cloudClickStream.total,next=previous+pendingClicks;
    if(!Number.isSafeInteger(next)){cloudUnavailable=true;renderCloudStatus();return false;}
    cloudClickStream.total=next;
    if(!persistCloudStream()){cloudClickStream.total=previous;return false;}
    pendingClicks=0;return true;
  }
  function scheduleClickFlush(){
    if(cloudClickTimer||!cloudMode)return;
    const rush=buff&&buff.type==="goldrush"&&buff.until>Date.now();
    cloudClickTimer=setTimeout(()=>{cloudClickTimer=0;if(!stagePendingClicks())return;cloudClickDue=true;startCloudDrain();},rush?5000:CLOUD_FLUSH_MS);
  }
  async function activateCloud(backup){
    if(!account.authenticated||account.needsUsername)return;
    if(backup&&!localStorage.getItem(LOCAL_BACKUP))localStorage.setItem(LOCAL_BACKUP,JSON.stringify(state));
    localStorage.setItem(CLOUD_CHOICE,"cloud");localStorage.setItem(CLOUD_ACCOUNT_CACHE,account.username);
    cloudMode=true;renderCloudStatus();
    const queueReady=restoreCloudOutbox(),streamReady=loadCloudStream();
    if(!queueReady||!streamReady)return;
    try{
      const data=await apiJson("/api/progress/snapshot");
      buff=null;goldenExpires=0;$("goldenBill").hidden=true;
      applyCloudSnapshot(data,true);
      cloudUnavailable=false;cloudClickDue=cloudClickStream.total>cloudClickStream.acked;renderCloudStatus();startCloudDrain();lastHeartbeatSent=0;sendHeartbeat(true);
      toast("Verified cloud run active");
    }catch(_){cloudUnavailable=true;renderCloudStatus();toast("Cloud temporarily unavailable. Your progress is queued locally.");scheduleCloudRetry();}
  }
  async function postCloudAction(action){
    return apiJson("/api/progress/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...action,generation:cloudGeneration})});
  }
  async function resyncCloud(){
    if(!cloudMode)return;
    try{const data=await apiJson("/api/progress/snapshot");if(cloudMode)applyCloudSnapshot(data);cloudUnavailable=false;renderCloudStatus();}
    catch(_){cloudUnavailable=true;renderCloudStatus();}
  }
  function scheduleCloudRetry(){
    if(cloudRetryTimer||!cloudMode)return;
    cloudRetryCount=Math.min(cloudRetryCount+1,9);
    const delay=Math.min(300000,2000*Math.pow(2,cloudRetryCount-1));
    cloudRetryTimer=setTimeout(()=>{cloudRetryTimer=0;if(!account.authenticated)refreshAccount();else startCloudDrain();},delay);
    cloudUnavailable=true;renderCloudStatus();
  }
  function acknowledgeClickTotal(total){
    if(total>cloudClickStream.acked){cloudClickStream.acked=total;persistCloudStream();}
  }
  function startCloudDrain(){
    if(!cloudMode||!account.authenticated||cloudBusy||cloudRetryTimer)return cloudQueue;
    cloudBusy=true;renderCloudStatus();
    cloudQueue=(async()=>{
      while(cloudMode){
        if(!stagePendingClicks())break;
        let plan=window.ClickTheCashQueue.planNext(cloudOutbox,cloudClickStream);
        let request,consume=0,acked=0;
        if(plan){
          request=plan.request;consume=plan.consume;acked=plan.ackedTotal;
          if(acked-cloudClickStream.acked>1000000){
            const legacy=request.clicks?.find(part=>part.legacy);
            if(legacy){request={type:"click_checkpoint",clicks:[legacy]};consume=1;acked=0;}
            else {request={type:"click_checkpoint",clicks:[{streamId:cloudClickStream.id,total:cloudClickStream.acked+1000000}]};consume=0;acked=request.clicks[0].total;}
          }
        }else if(cloudClickDue&&cloudClickStream.total>cloudClickStream.acked){
          acked=Math.min(cloudClickStream.total,cloudClickStream.acked+1000000);
          request={type:"click_checkpoint",clicks:[{streamId:cloudClickStream.id,total:acked}]};
        }else break;
        try{
          const data=await postCloudAction(request);
          acknowledgeClickTotal(acked);
          if(consume){cloudOutbox.splice(0,consume);persistCloudOutbox();}
          if(request.type==="click_checkpoint"&&cloudClickStream.total<=cloudClickStream.acked)cloudClickDue=false;
          if(cloudMode)applyCloudSnapshot(data);
          cloudRetryCount=0;cloudUnavailable=false;lastCloudSync=Date.now();renderCloudStatus();
        }catch(error){
          if(error.status===409){const before=cloudGeneration;await resyncCloud();if(cloudGeneration!==before){cloudUnavailable=false;continue;}scheduleCloudRetry();break;}
          const permanent=error.status===400||error.status===422;
          if(permanent&&request.type!=="click_checkpoint"&&request.clicks?.length){
            try{
              const data=await postCloudAction({type:"click_checkpoint",clicks:request.clicks});
              acknowledgeClickTotal(acked);
              if(plan&&cloudOutbox[0]?.type==="legacy_clicks"){cloudOutbox.shift();persistCloudOutbox();}
              if(cloudMode)applyCloudSnapshot(data);
              continue; // Retry the important action after preserving all valid clicks.
            }catch(_){scheduleCloudRetry();break;}
          }
          if(permanent&&request.type!=="click_checkpoint"){
            cloudOutbox.splice(0,consume);persistCloudOutbox();
            toast(error.message||"A cloud action was rejected. Your clicks were kept.");
            await resyncCloud();continue;
          }
          scheduleCloudRetry();break;
        }
      }
    })().finally(()=>{cloudBusy=false;renderCloudStatus();if(cloudMode&&cloudOutbox.length&&!cloudRetryTimer&&!cloudUnavailable)queueMicrotask(startCloudDrain);});
    return cloudQueue;
  }
  function queueCloudAction(action){
    if(!cloudMode)return cloudQueue;
    if(accountBlocked||account.moderation){toast("This account cannot use verified gameplay right now.");return cloudQueue;}
    if(!account.username){toast("Cloud account is reconnecting. Please try again shortly.");return cloudQueue;}
    if(!stagePendingClicks())return cloudQueue;
    clearTimeout(cloudClickTimer);cloudClickTimer=0;
    if(action){
      cloudOutbox.push({actionId:crypto.randomUUID(),...action,clickTotal:cloudClickStream.total});
      if(!persistCloudOutbox())return cloudQueue;
    }else cloudClickDue=true;
    return startCloudDrain();
  }
  async function signOut(){
    $("accountMenu").hidden=true;
    if(cloudMode){
      queueCloudAction(null);await cloudQueue;
      if(cloudPending()||cloudUnavailable){toast("Cloud sync is pending. Try signing out when connected.");return;}
      await sendHeartbeat(false);
    }
    try{await apiJson("/api/auth/signout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});}
    catch(_){toast("Sign out failed. Try again.");return;}
    cloudMode=false;cloudAdminBoosts=[];pendingClicks=0;localStorage.setItem(CLOUD_CHOICE,"local");localStorage.removeItem(CLOUD_ACCOUNT_CACHE);localStorage.removeItem(CLOUD_USER_ID_CACHE);renderCloudStatus();
    account={authenticated:false,username:null,needsUsername:false};renderAccountControls();
    await refreshPremiumStatus();renderTop();renderCurrent();toast("Signed out");
  }
  function showAccountDetails(){
    if(account.needsUsername){showUsernamePrompt();return;}
    const body=featureElement("div","account-details");
    body.append(featureElement("p","","Username: "+account.username),featureElement("p","",cloudMode?"Verified cloud run active. Your browser save is also kept locally.":"Local game active. Your leaderboard progress is separate."));
    if(localStorage.getItem(LOCAL_BACKUP))body.append(featureElement("p","","Your previous local save is backed up in this browser."));
    const actions=[{label:"Close",action:()=>{}}];
    if(!cloudMode)actions.push({label:"Use verified cloud run",action:()=>offerCloudChoice()});
    if(localStorage.getItem(LOCAL_BACKUP))actions.push({label:"Restore browser save",action:()=>modal("Restore browser save","This switches to your saved local game. Your verified cloud run stays on your account.",[
      {label:"Cancel",action:()=>{}},
      {label:"Restore",action:()=>{try{const restored=normalize(JSON.parse(localStorage.getItem(LOCAL_BACKUP)));cloudMode=false;pendingClicks=0;localStorage.setItem(CLOUD_CHOICE,"local");state=restored;save();renderTop();renderOwned();renderCurrent();toast("Browser save restored");}catch(_){toast("Browser backup cannot be read.");}}}
    ])});
    modal("Account",body,actions);
  }

  function save() {
    try {state.lastPlayed=Date.now();localStorage.setItem(SAVE_KEY,JSON.stringify(state));}
    catch (_) {toast("Browser storage is unavailable. Export your save to keep progress.");}
  }
  function normalize(raw) {
    if(!raw || typeof raw!=="object" || raw.version!==1)throw Error("Invalid save version.");
    const s=defaultState();
    for(const key of ["money","runEarned","lifetime","empireTotal","empireSpent","rebirths","totalClicks","businessesPurchased","goldenClicked","highestRate","totalPlaytime","lastPlayed"])
      s[key]=safeNumber(raw[key],s[key]);
    for(const b of BUSINESS){s.businesses[b.id]=Math.floor(safeNumber(raw.businesses?.[b.id]));s.businessRevenue[b.id]=safeNumber(raw.businessRevenue?.[b.id]);}
    const validUpgrades=new Set([...CLICK_UPGRADES.map(u=>u.id),...SPECIAL_UPGRADES.map(u=>u.id),...BUSINESS.flatMap(b=>MILESTONES.map(m=>b.id+"-"+m.count))]);
    s.upgrades=Array.isArray(raw.upgrades)?[...new Set(raw.upgrades.filter(x=>validUpgrades.has(x)))]:[];
    const validAchievements=new Set(ACHIEVEMENTS.map(a=>a.id));
    s.achievements=Array.isArray(raw.achievements)?[...new Set(raw.achievements.filter(x=>validAchievements.has(x)))]:[];
    const validPrestige=new Set(PRESTIGE.map(p=>p.id));
    s.prestigeUpgrades=Array.isArray(raw.prestigeUpgrades)?[...new Set(raw.prestigeUpgrades.filter(x=>validPrestige.has(x)))]:[];
    s.empireSpent=Math.min(s.empireTotal,s.empireSpent);
    for(const key of Object.keys(s.settings))if(typeof raw.settings?.[key]==="boolean")s.settings[key]=raw.settings[key];
    const validBoosters=new Set(BOOSTERS.map(b=>b.id));
    for(const [id,count] of Object.entries(raw.boosterInventory||{}))if(validBoosters.has(id))s.boosterInventory[id]=Math.min(1000000,Math.floor(safeNumber(count)));
    const seen=new Set();s.equippedBoosters=Array.from({length:6},(_,i)=>{const id=raw.equippedBoosters?.[i];if(!validBoosters.has(id)||!s.boosterInventory[id]||seen.has(id))return null;seen.add(id);return id;});
    s.boosterSlotsUnlocked=Math.max(1,Math.min(4,Math.floor(safeNumber(raw.boosterSlotsUnlocked,1))));
    s.premiumBoosterSlots=[];
    s.nextDropPlaytimeMs=Math.max(DROP_INTERVAL_MS,safeNumber(raw.nextDropPlaytimeMs,(Math.floor(s.totalPlaytime*1000/DROP_INTERVAL_MS)+1)*DROP_INTERVAL_MS));
    s.pendingDropUntilMs=safeNumber(raw.pendingDropUntilMs);s.rushUntilMs=safeNumber(raw.rushUntilMs);
    return s;
  }
  function load() {
    try {const text=localStorage.getItem(SAVE_KEY);if(text)state=normalize(JSON.parse(text));
      if(state.rushUntilMs>Date.now())buff={type:"goldrush",mult:7,until:state.rushUntilMs};}
    catch (_) {state=defaultState();toast("Saved data could not be read. A fresh game has started.");}
  }
  function exportSave() {
    save();
    const code=btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    const wrap=document.createElement("div"),intro=document.createElement("p"),area=document.createElement("textarea");
    intro.textContent="Copy this code and keep it somewhere safe.";area.value=code;area.readOnly=true;area.setAttribute("aria-label","Export save code");
    wrap.append(intro,area);
    modal("Export Save",wrap,[{label:"Copy Code",close:false,action:async()=>{try{await navigator.clipboard.writeText(code);toast("Save code copied");}catch(_){area.select();toast("Select and copy the code");}}},{label:"Done",action:()=>{}}]);
  }
  function importSave() {
    const wrap=document.createElement("div"),intro=document.createElement("p"),area=document.createElement("textarea");
    intro.textContent="Paste a ClickTheCash save code. Importing replaces your current progress.";
    area.placeholder="Paste save code here";area.setAttribute("aria-label","Import save code");
    wrap.append(intro,area);
    modal("Import Save",wrap,[{label:"Cancel",action:()=>{}},{label:"Import",close:false,action:()=>{
      try {
        const raw=JSON.parse(decodeURIComponent(escape(atob(area.value.trim()))));
        const imported=normalize(raw);
        modal("Confirm Import","Replace this browser's current game with the imported save?",[
          {label:"Cancel",action:()=>{}},
          {label:"Replace Save",action:()=>{cloudMode=false;localStorage.setItem(CLOUD_CHOICE,"local");state=imported;state.lastPlayed=Date.now();buff=null;goldenExpires=0;$("goldenBill").hidden=true;applySettings();save();afterAction();toast("Save imported");}}
        ]);
      } catch(_){toast("That save code is invalid.");}
    }}]);
  }
  function resetGame() {
    modal("Reset Game","This permanently erases the ClickTheCash save in this browser. Export it first if you want a backup.",[
      {label:"Cancel",action:()=>{}},
      {label:"Erase Progress",action:()=>{cloudMode=false;localStorage.setItem(CLOUD_CHOICE,"local");state=defaultState();buff=null;goldenExpires=0;$("goldenBill").hidden=true;sessionActiveSeconds=0;applySettings();save();afterAction();toast("Game reset");}}
    ]);
  }
  function rebirth() {
    const gain=pointsGain();if(gain<=0)return;
    modal("Confirm Rebirth","You will gain "+format(gain)+" Empire Points. Cash, businesses, and regular upgrades reset. Achievements, lifetime earnings, Empire Points, and investments remain.",[
      {label:"Cancel",action:()=>{}},
      {label:"Rebirth",action:()=>{
        if(cloudMode){queueCloudAction({type:"rebirth"});return;}
        const keep={lifetime:state.lifetime,achievements:state.achievements,prestigeUpgrades:state.prestigeUpgrades,
          empireTotal:state.empireTotal+gain,empireSpent:state.empireSpent,rebirths:state.rebirths+1,
          totalClicks:state.totalClicks,businessesPurchased:state.businessesPurchased,goldenClicked:state.goldenClicked,
          highestRate:state.highestRate,totalPlaytime:state.totalPlaytime,businessRevenue:state.businessRevenue,settings:state.settings,
          boosterInventory:state.boosterInventory,equippedBoosters:state.equippedBoosters,boosterSlotsUnlocked:state.boosterSlotsUnlocked,
          premiumBoosterSlots:state.premiumBoosterSlots,nextDropPlaytimeMs:state.nextDropPlaytimeMs,pendingDropUntilMs:state.pendingDropUntilMs};
        state=Object.assign(defaultState(),keep);
        if(hasPrestige("starterCapital"))state.money=250;
        if(hasPrestige("quickCollectors"))state.businesses.collector=5;
        if(hasPrestige("automation")){state.businesses.collector=10;state.businesses.lemonade=5;}
        buff=null;goldenExpires=0;$("goldenBill").hidden=true;goldenNext=Date.now()+randomBillDelay();
        playTone(1000);toast("Reborn with "+format(gain)+" Empire Points");afterAction();
      }}
    ]);
  }
  function goldenFrequency(){return 1+(hasPrestige("goldenRadar")?.1:0)+(hasPrestige("lucky")?.3:0)+boosterBonus("goldenFrequency");}
  function randomBillDelay() {return (180+Math.random()*180)*1000/goldenFrequency();}
  function spawnGolden() {
    goldenExpires=Date.now()+12000;
    const bill=$("goldenBill");bill.hidden=false;
    bill.style.left=(15+Math.random()*65)+"%";bill.style.top=(15+Math.random()*55)+"%";
    updateEventCountdowns();
  }
  function updateEventCountdowns(){
    $("goldenCountdown").textContent=String(Math.max(0,Math.ceil((goldenExpires-Date.now())/1000)));
    $("dropCountdown").textContent=String(Math.max(0,Math.ceil((state.pendingDropUntilMs-Date.now())/1000)));
  }
  function updateDropDisplay(){
    const box=$("boosterDrop"),active=state.pendingDropUntilMs>Date.now();box.hidden=!active;
    if(active){box.style.left="68%";box.style.top="18%";updateEventCountdowns();}
  }
  function goldBurst(element){
    if(!state.settings.animations||!state.settings.particles)return;
    const layer=$("burstLayer"),zone=$("pileZone").getBoundingClientRect(),rect=element.getBoundingClientRect();
    const x=rect.left-zone.left+rect.width/2,y=rect.top-zone.top+rect.height/2;
    for(let i=0;i<12;i++){
      const spark=document.createElement("i");spark.className="gold-spark";
      const angle=i*Math.PI/6,dist=35+Math.random()*42;
      spark.style.left=x+"px";spark.style.top=y+"px";
      spark.style.setProperty("--dx",Math.cos(angle)*dist+"px");spark.style.setProperty("--dy",Math.sin(angle)*dist+"px");
      layer.append(spark);setTimeout(()=>spark.remove(),750);
    }
  }
  function claimGolden() {
    if(!goldenExpires || Date.now()>goldenExpires)return;
    goldBurst($("goldenBill"));goldenExpires=0;$("goldenBill").hidden=true;goldenNext=Date.now()+randomBillDelay();
    state.goldenClicked++;
    if(cloudMode){queueCloudAction({type:"golden"});return;}
    if(Math.random()<.35){
      state.rushUntilMs=Date.now()+30000;buff={type:"goldrush",mult:7,until:state.rushUntilMs};
      toast("GOLD RUSH! All earnings ×7 for 30 seconds!");setTicker("GOLD RUSH · Everything turns gold for 30 seconds.");
    }else{
      const base=Math.max(500,baseRate()*180,clickValue()*100);
      const prize=base*(.8+Math.random()*.6)*(1+(hasPrestige("goldenReserve")?.25:0)+boosterBonus("goldenCash"));
      addMoney(prize);toast("Golden Bill: +"+euro(prize)+"!");
    }
    applySettings();playTone(1200);afterAction();
  }
  function rollLocalBooster(){
    let chance=Math.random()*100,rarity="common";
    for(const [name,weight] of [["common",55],["rare",28],["epic",12],["legendary",4],["mythic",1]]){chance-=weight;if(chance<0){rarity=name;break;}}
    const pool=BOOSTERS.filter(b=>b.rarity===rarity);
    return pool[Math.floor(Math.random()*pool.length)];
  }
  function claimBoosterDrop(){
    if(!state.pendingDropUntilMs||Date.now()>state.pendingDropUntilMs)return;
    goldBurst($("boosterDrop"));state.pendingDropUntilMs=0;updateDropDisplay();
    if(cloudMode){queueCloudAction({type:"claim_booster_drop"});return;}
    const booster=rollLocalBooster();state.boosterInventory[booster.id]=(state.boosterInventory[booster.id]||0)+1;
    toast("Booster found: "+booster.name+" ("+booster.rarity+")!");afterAction();
  }
  function applyOffline() {
    const away=Math.max(0,Math.min(Date.now()-state.lastPlayed,7*24*3600000));
    if(away<60000)return;
    const capped=Math.min(away/1000,(hasPrestige("nightshift")?16*3600:OFFLINE_CAP));
    const production=baseRate();
    const earned=earnBusinesses(capped*(hasPrestige("offlineOffice")?.6:.5)*(1+boosterBonus("offline")),false);
    save();
    if(earned>0){
      const wrap=document.createElement("div"),p=document.createElement("p");
      p.textContent="You were away for "+duration(away/1000)+". Production: "+euro(production,1)+"/sec. Offline efficiency: "+format((hasPrestige("offlineOffice")?.6:.5)*(1+boosterBonus("offline"))*100)+"%. You earned "+euro(earned)+". The time cap is "+(hasPrestige("nightshift")?16:10)+" hours.";
      pendingAccountRefresh=true;wrap.append(p);modal("Welcome Back",wrap,[{label:"Collect",action:()=>{}}]);
      return true;
    }
  }
  function updateFitScreen(){
    if(!state.settings.fitScreen || window.innerWidth>900){document.documentElement.style.removeProperty("--fit-viewport-height");return;}
    const height=window.visualViewport?.height||window.innerHeight;
    document.documentElement.style.setProperty("--fit-viewport-height",Math.round(height)+"px");
  }
  function applySettings() {
    document.documentElement.classList.toggle("light",state.settings.light);
    document.documentElement.classList.toggle("fit-screen",state.settings.fitScreen);
    updateFitScreen();
    const fit=$("fitScreen");if(fit){fit.textContent="Fit screen: "+(state.settings.fitScreen?"ON":"OFF");fit.setAttribute("aria-pressed",String(state.settings.fitScreen));}
    document.documentElement.classList.toggle("reduce-motion",!state.settings.animations);
    document.documentElement.classList.toggle("gold-rush",Boolean(buff&&buff.type==="goldrush"&&buff.until>Date.now()));
  }
  const MARKET_NEWS=[
    "Local entrepreneur discovers that small change adds up.",
    "Lemonade futures remain refreshingly optimistic.",
    "Cash Collectors request more pockets.",
    "Analysts predict a promising day for your empire.",
    "Rumor: a golden bill has been spotted nearby.",
    "Your next big business could be one purchase away.",
    "The market opens early for ambitious clickers."
  ];
  function setTicker(message) {
    const el=$("tickerText");
    el.textContent=message;
    el.classList.remove("ticker-pop");
    void el.offsetWidth;
    el.classList.add("ticker-pop");
  }
  function rotateTicker() {
    tickerIndex=(tickerIndex+1)%MARKET_NEWS.length;
    if(!(buff&&buff.type==="goldrush"&&buff.until>Date.now()))setTicker(MARKET_NEWS[tickerIndex]);
    tickerNext=Date.now()+11500;
  }
  function spawnAmbientBill() {
    ambientNext=Date.now()+2500+Math.random()*3500;
    if(!state.settings.animations||!state.settings.particles)return;
    const layer=$("particleLayer");
    if(layer.children.length>=8)return;
    const bill=document.createElement("span");
    bill.className="ambient-bill";
    bill.style.setProperty("--x",(5+Math.random()*90)+"%");
    bill.style.setProperty("--y","-18px");
    bill.style.setProperty("--rot",(Math.random()*70-35)+"deg");
    layer.append(bill);
    setTimeout(()=>bill.remove(),5100);
  }
  async function sendHeartbeat(active=true){
    if(!cloudMode||heartbeatBusy||(active&&document.hidden))return;
    heartbeatBusy=true;lastHeartbeatSent=Date.now();
    try{
      const data=await apiJson("/api/progress/heartbeat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({active})});
      if(active&&cloudMode){
        if(!cloudPending())applyCloudSnapshot(data);
        else {state.totalPlaytime=safeNumber(data.totalPlaytime,state.totalPlaytime);state.pendingDropUntilMs=safeNumber(data.pendingDropUntilMs);updateDropDisplay();}
      }
      if(!cloudRetryTimer&&!cloudOutbox.length)cloudUnavailable=false;renderCloudStatus();
    }catch(_){cloudUnavailable=true;renderCloudStatus();}
    finally{heartbeatBusy=false;}
  }
  function pauseHeartbeat(){
    if(!cloudMode)return;
    fetch("/api/progress/heartbeat",{method:"POST",credentials:"same-origin",keepalive:true,
      headers:{"Content-Type":"application/json"},body:JSON.stringify({active:false})}).catch(()=>{});
  }
  function tick() {
    const now=Date.now(),elapsed=Math.max(0,(now-lastTick)/1000);lastTick=now;
    if(elapsed>0){
      const productive=Math.min(elapsed,hasPrestige("nightshift")?16*3600:OFFLINE_CAP);
      const efficiency=elapsed>60||document.hidden?(hasPrestige("offlineOffice")?.6:.5)*(1+boosterBonus("offline")):1;
      earnBusinesses(productive*efficiency,!document.hidden);
      if(!document.hidden){
        const active=Math.min(elapsed,5);state.totalPlaytime+=active;sessionActiveSeconds+=active;
        if(!cloudMode&&state.totalPlaytime*1000>=state.nextDropPlaytimeMs){
          state.nextDropPlaytimeMs+=DROP_INTERVAL_MS;
          if(!state.pendingDropUntilMs&&Math.random()<.08){state.pendingDropUntilMs=now+20000;updateDropDisplay();toast("BOOSTER DROP! Claim it before it disappears.");}
          save();
        }
      }
    }
    if(buff&&now>=buff.until){buff=null;state.rushUntilMs=0;applySettings();toast("Gold Rush ended");}
    if(goldenExpires&&now>=goldenExpires){goldenExpires=0;$("goldenBill").hidden=true;goldenNext=now+randomBillDelay();}
    if(!goldenExpires&&!document.hidden&&now>=goldenNext)spawnGolden();
    if(state.pendingDropUntilMs&&now>=state.pendingDropUntilMs){state.pendingDropUntilMs=0;updateDropDisplay();save();}
    if(goldenExpires||state.pendingDropUntilMs)updateEventCountdowns();
    state.highestRate=Math.max(state.highestRate,currentRate());
    if(now>=ambientNext)spawnAmbientBill();
    if(now>=tickerNext)rotateTicker();
    if(cloudMode&&!document.hidden&&now-lastHeartbeatSent>=60000)sendHeartbeat(true);
    renderTop();
    if(now-renderTimer>1000){renderCurrent();renderTimer=now;}
    if(now-achievementTimer>1000){checkAchievements();achievementTimer=now;}
  }
  async function init() {
    setupMusic();buildWealthArt();load();goldenNext=Date.now()+randomBillDelay();applySettings();renderTop();renderOwned();
    await refreshPremiumStatus();
    if(!applyOffline())await refreshAccount();
    if(new URLSearchParams(location.search).has("account_banned")){accountBlocked=true;showAccountNotice({message:"This account has been banned."});}
    pileEl.addEventListener("click",event=>{if(accountBlocked||account.moderation){toast("This account cannot use verified gameplay right now.");return;}if(cloudMode&&!account.username){toast("Cloud account is reconnecting. Please try again shortly.");return;}const value=clickValue();addMoney(value);state.totalClicks++;if(cloudMode){pendingClicks++;scheduleClickFlush();renderCloudStatus();}effect(value,event);playTone();checkAchievements();renderTop();if(Date.now()-lastClickSave>2000){if(cloudMode)stagePendingClicks();save();lastClickSave=Date.now();}});
    $("goldenBill").addEventListener("click",claimGolden);
    $("goldenBillArt").addEventListener("error",()=>$("goldenBill").classList.add("asset-failed"),{once:true});
    $("boosterDrop").addEventListener("click",claimBoosterDrop);
    document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>b.dataset.feature?openFeature(b.dataset.feature):switchTab(b.dataset.tab)));
    document.querySelectorAll(".buy-option").forEach(b=>b.addEventListener("click",()=>{
      buyAmount=b.dataset.buy;document.querySelectorAll(".buy-option").forEach(x=>x.classList.toggle("active",x===b));renderBusinesses();
    }));
    $("exportSave").addEventListener("click",exportSave);
    $("importSave").addEventListener("click",importSave);
    $("resetGame").addEventListener("click",resetGame);
    $("fitScreen").addEventListener("click",()=>{state.settings.fitScreen=!state.settings.fitScreen;applySettings();save();});
    window.addEventListener("resize",updateFitScreen);
    window.addEventListener("orientationchange",updateFitScreen);
    window.visualViewport?.addEventListener("resize",updateFitScreen);
    $("accountButton").addEventListener("click",()=>{$("accountMenu").hidden=!$("accountMenu").hidden;});
    $("accountDetails").addEventListener("click",()=>{ $("accountMenu").hidden=true;showAccountDetails();});
    $("signOut").addEventListener("click",signOut);
    $("rebirthButton").addEventListener("click",rebirth);
    $("modalClose").addEventListener("click",closeModal);
    $("featureClose").addEventListener("click",closeFeature);
    $("featureBackdrop").addEventListener("click",event=>{if(event.target===$("featureBackdrop"))closeFeature();});
    $("modalBackdrop").addEventListener("click",event=>{if(event.target===$("modalBackdrop"))closeModal();});
    document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeModal();closeFeature();}});
    window.addEventListener("online",()=>{
      if(!cloudMode)return;
      cloudRetryCount=0;clearTimeout(cloudRetryTimer);cloudRetryTimer=0;
      if(!account.authenticated)refreshAccount();else {cloudClickDue=true;startCloudDrain();sendHeartbeat(true);}
    });
    window.addEventListener("pagehide",()=>{save();pauseHeartbeat();if(cloudMode)queueCloudAction(null);});
    document.addEventListener("visibilitychange",()=>{
      if(document.hidden){save();pauseHeartbeat();if(cloudMode)queueCloudAction(null);}
      else {const now=Date.now(),away=Math.max(0,(now-lastTick)/1000);if(away>0&&!cloudMode)earnBusinesses(Math.min(away,OFFLINE_CAP)*(hasPrestige("offlineOffice")?.6:.5)*(1+boosterBonus("offline")),false);lastTick=now;if(cloudMode)sendHeartbeat(true);}
    });
    renderTop();renderOwned();renderCurrent();updateDropDisplay();checkAchievements();rotateTicker();setInterval(tick,100);
    setInterval(save,10000);
  }
  window.CashEmpireMath={totalCost,maxAffordable,format,businessUnitRate,earnBusinesses,getWealthVisualTier,configs:BUSINESS};
  init();
})();