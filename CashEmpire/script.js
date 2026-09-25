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
    {id:"wallet",name:"Better Wallet",icon:"👛",cost:50,mult:2,unlock:25,description:"Click income ×2"},
    {id:"fingers",name:"Fast Fingers",icon:"⚡",cost:500,mult:2,unlock:250,description:"Click income ×2"},
    {id:"goldWallet",name:"Golden Wallet",icon:"💛",cost:10000,mult:3,unlock:5000,description:"Click income ×3"},
    {id:"diamond",name:"Diamond Hands",image:"assets/upgrade-diamond-hands.png",cost:1000000,mult:5,unlock:500000,description:"Click income ×5"},
    {id:"magnet",name:"Money Magnet",icon:"🧲",cost:100000000,mult:10,unlock:50000000,description:"Click income ×10"},
    {id:"quantum",name:"Quantum Purse",icon:"⚛",cost:10000000000,mult:10,unlock:5000000000,description:"Click income ×10"},
    {id:"cosmic",name:"Cosmic Grip",icon:"✦",cost:1000000000000,mult:20,unlock:500000000000,description:"Click income ×20"},
    {id:"infinite",name:"Infinite Pocket",icon:"∞",cost:1000000000000000,mult:50,unlock:500000000000000,description:"Click income ×50"}
  ];
  const SPECIAL_UPGRADES = [
    {id:"marketSense",name:"Market Sense",icon:"◈",cost:300,unlock:100,description:"All businesses produce +1%.",effect:"total",mult:1.01},
    {id:"tapTraining",name:"Tap Training",icon:"✦",cost:2500,unlock:1000,description:"Click value +25%.",effect:"click",mult:1.25},
    {id:"vendingDining",name:"Lunch Rush",image:"assets/upgrade-lunch-rush.png",cost:250000,requires:{vending:5,restaurant:1},description:"Vending Machines boost Restaurants ×1.5.",effect:"restaurant",mult:1.5},
    {id:"restaurantSupply",name:"Supply Chain",icon:"◉",cost:3000000,requires:{restaurant:10,supermarket:1},description:"Restaurants boost Supermarkets ×1.5.",effect:"supermarket",mult:1.5},
    {id:"cashflow",name:"Cashflow Forecast",icon:"▣",cost:50000000,unlock:20000000,description:"All businesses produce +5%.",effect:"total",mult:1.05},
    {id:"bankingNetwork",name:"Banking Network",icon:"⌁",cost:10000000000,requires:{bank:5,corporation:1},description:"Banks boost Corporations ×2.",effect:"corporation",mult:2},
    {id:"precisionTap",name:"Executive Touch",icon:"◆",cost:50000000000,unlock:10000000000,description:"Click value ×2.",effect:"click",mult:2}
  ];
  const MILESTONES = [
    {count:10,mult:2},{count:25,mult:2},{count:50,mult:2},{count:100,mult:3},{count:200,mult:4}
  ];
  const PRESTIGE = [
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
    settings:{sound:true,animations:true,particles:true,compact:false,light:false,fitScreen:false}
  });
  let state = defaultState();
  let premiumMultiplier = 1;
  let premiumStatus = {authenticated:false,paymentsAvailable:false,owned:false};
  let account={authenticated:false,username:null,needsUsername:false};
  const CLOUD_BATCH_SIZE=1000,CLOUD_FLUSH_MS=1500,CLOUD_OUTBOX_PREFIX="cash-empire-cloud-outbox-v2:",LEGACY_CLOUD_OUTBOX_PREFIX="cash-empire-cloud-outbox-v1:",LEGACY_CLOUD_LAST_BATCH_PREFIX="cash-empire-cloud-last-batch-v1:";
  let cloudMode=false,pendingClicks=0,cloudQueue=Promise.resolve(),cloudBusy=false,cloudOutbox=[];
  let cloudRetryTimer=0,cloudClickTimer=0,cloudRetryCount=0,cloudRetryStoppedAt=0,cloudSyncRequested=false;
  let lastCloudSync=Date.now(),pendingAccountRefresh=false;
  const CLOUD_CHOICE="cash-empire-cloud-choice-v1",LOCAL_BACKUP="cash-empire-local-backup-v1";
  let featureMode = null;
  let buyAmount = "1",activeTab = "upgrades",sessionStart = Date.now(),lastTick = Date.now();
  let goldenExpires = 0,goldenNext = Date.now() + randomBillDelay(),buff = null;
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
  function totalCost(b,owned,quantity) {
    if (quantity <= 0) return 0;
    const start = b.cost * Math.pow(PRICE_GROWTH,owned);
    return start * Math.expm1(quantity * Math.log(PRICE_GROWTH)) / (PRICE_GROWTH-1);
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
  function selectedQuantity(b) {
    const max = maxAffordable(b,state.businesses[b.id],state.money);
    return buyAmount === "max" ? (cloudMode?Math.min(max,100):max) : (Number(buyAmount) <= max ? Number(buyAmount) : 0);
  }
  function displayedQuantity(b) {
    return buyAmount === "max" ? (cloudMode?Math.min(100,maxAffordable(b,state.businesses[b.id],state.money)):maxAffordable(b,state.businesses[b.id],state.money)) : Number(buyAmount);
  }
  function prestigeBonus() {
    return 1 + state.empireTotal * (hasPrestige("compound") ? .015 : .01);
  }
  function businessMultiplier(b) {
    return MILESTONES.reduce((value,m) => value * (has(b.id+"-"+m.count) ? m.mult : 1),1);
  }
  function businessUnitRate(b) {
    let rate=b.income*businessMultiplier(b)*prestigeBonus()*(hasPrestige("investor")?1.1:1);
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
    value*=prestigeBonus()*(hasPrestige("executive")?2:1);
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
  const ACHIEVEMENTS = [];
  function achievement(id,name,description,icon,test) {ACHIEVEMENTS.push({id,name,description,icon,test});}
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
    $("buffBar").textContent=active?(buff.type==="goldrush"?"GOLD RUSH":buff.type==="income"?"INCOME BOOST":"CLICK BOOST")+" ×"+buff.mult+" · "+duration((buff.until-Date.now())/1000)+" left":"";
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
  function renderUpgrades() {
    const list=$("upgradeList"),upgrades=allUpgrades();
    $("upgradeCount").textContent=upgrades.length+" available";
    list.replaceChildren();
    if(!upgrades.length){const empty=document.createElement("div");empty.className="empty-state";empty.textContent="Keep earning. Your next upgrade is on its way.";list.append(empty);return;}
    for(const u of upgrades) {
      const card=document.createElement("div");card.className="upgrade-card"+(state.money>=u.cost?" affordable":"");
      const icon=document.createElement("div");icon.className="upgrade-icon";
      if(u.image){const art=document.createElement("img");art.src=u.image;art.alt="";art.width=39;art.height=39;icon.append(art);}else icon.textContent=u.icon;
      const info=document.createElement("div");info.className="upgrade-info";
      const title=document.createElement("strong");title.textContent=u.name;
      const desc=document.createElement("p");desc.textContent=u.description;
      info.append(title,desc);
      card.append(icon,info,makeButton(euro(u.cost),state.money<u.cost,()=>buyUpgrade(u)));
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
      ["Current session",duration((Date.now()-sessionStart)/1000)],["Empire Points",format(state.empireTotal)]
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
      const icon=document.createElement("div");icon.className="achievement-icon";icon.textContent=unlocked?a.icon:"?";
      const name=document.createElement("strong");name.textContent=unlocked?a.name:"Hidden achievement";
      const desc=document.createElement("p");desc.textContent=a.description;
      card.append(icon,name,desc);grid.append(card);
    }
  }
  function pointsAvailable() {return Math.max(0,state.empireTotal-state.empireSpent);}
  function potentialPoints() {return Math.floor(Math.sqrt(state.runEarned/10000000));}
  function pointsGain() {return Math.max(0,potentialPoints()-state.empireTotal);}
  function renderPrestige() {
    const gain=pointsGain();
    $("pointsOwned").textContent=format(pointsAvailable());
    $("pointsGain").textContent="+"+format(gain);
    const pointRate=hasPrestige("compound")?.015:.01;
    $("rebirthBonus").textContent="+"+format((state.empireTotal+gain)*pointRate*100,1)+"%";
    const nextTarget=Math.pow(state.empireTotal+1,2)*10000000;
    $("rebirthNext").textContent=gain ? "Rebirth now to bank your new points." : "Next point at "+euro(nextTarget)+" earned in this run.";
    $("rebirthButton").disabled=gain<=0;
    const tree=$("prestigeTree");tree.replaceChildren();
    for(const p of PRESTIGE) {
      const owned=hasPrestige(p.id),card=document.createElement("div");card.className="investment-card";
      const icon=document.createElement("div");icon.className="upgrade-icon";if(p.image){const art=document.createElement("img");art.src=p.image;art.alt="";icon.append(art);}else icon.textContent=p.icon;
      const info=document.createElement("div");info.className="upgrade-info";
      const name=document.createElement("strong");name.textContent=p.name;
      const desc=document.createElement("p");desc.textContent=p.description;
      info.append(name,desc);
      card.append(icon,info,makeButton(owned?"OWNED":format(p.cost)+" points",owned||pointsAvailable()<p.cost,()=>buyPrestige(p)));
      tree.append(card);
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
    $("featureModal").className="feature-modal"+(name==="store"?" store-view":"");
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
    const timeout=setTimeout(()=>controller.abort(),3500);
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
    titleBox.append(featureElement("span","eyebrow","CASH EMPIRE"),heading);
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
    const status=featureElement("div","feature-message","Loading the Top 100...");
    body.append(status);
    try {
      const data=await apiJson("/api/leaderboard");
      if(featureMode!=="leaderboard")return;
      status.remove();
      const players=Array.isArray(data.players)?data.players.slice(0,100):[];
      if(!players.length){
        body.append(featureElement("div","feature-message","No players yet. Be the first!"));
      } else {
        const list=featureElement("div","leaderboard-list");
        const heading=featureElement("div","leaderboard-row leaderboard-head");
        for(const label of ["Rank","Username","Lifetime Cash","Rebirths"])heading.append(featureElement("span","",label));
        list.append(heading);
        for(const player of players){
          if(!Number.isInteger(player.rank)||player.rank<1||player.rank>100||typeof player.username!=="string")continue;
          list.append(leaderboardRow(player));
        }
        body.append(list);
      }
      if(data.me&&Number.isInteger(data.me.rank)&&data.me.rank>100){
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
  async function refreshAccount(){
    try{
      const data=await apiJson("/api/account");
      account={authenticated:data.authenticated===true,username:typeof data.username==="string"?data.username:null,needsUsername:data.needsUsername===true};
    }catch(_){account={authenticated:false,username:null,needsUsername:false};}
    renderAccountControls();
    if(account.needsUsername)showUsernamePrompt();
    else if(account.authenticated){
      const choice=localStorage.getItem(CLOUD_CHOICE);
      if(choice==="cloud"||(!choice&&state.lifetime===0&&state.money===0))await activateCloud(false);
      else if(!choice)offerCloudChoice();
    }
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
    if(reset){const settings=state.settings;state=defaultState();state.settings=settings;}
    state.money=safeNumber(data.balance);
    state.lifetime=safeNumber(data.lifetimeCash);
    state.runEarned=safeNumber(data.runEarned);
    state.rebirths=safeNumber(data.rebirths);
    state.empireTotal=safeNumber(data.empirePoints);
    state.empireSpent=safeNumber(data.empireSpent);
    state.totalClicks=safeNumber(data.totalClicks);
    for(const b of BUSINESS)state.businesses[b.id]=Math.floor(safeNumber(data.businesses?.[b.id]));
    state.upgrades=Array.isArray(data.upgrades)?data.upgrades:[];
    state.prestigeUpgrades=Array.isArray(data.prestigeUpgrades)?data.prestigeUpgrades:[];
    state.lastPlayed=Date.now();
    checkAchievements();renderTop();renderOwned();renderCurrent();save();
  }
  function cloudOutboxKey(){return CLOUD_OUTBOX_PREFIX+(account.username||"unknown");}
  function legacyCloudOutboxKey(){return LEGACY_CLOUD_OUTBOX_PREFIX+(account.username||"unknown");}
  function legacyCloudLastBatchKey(){return LEGACY_CLOUD_LAST_BATCH_PREFIX+(account.username||"unknown");}
  function persistCloudOutbox(){
    try{
      if(cloudOutbox.length)localStorage.setItem(cloudOutboxKey(),JSON.stringify(cloudOutbox));
      else localStorage.removeItem(cloudOutboxKey());
    }catch(_){toast("Browser storage is unavailable. Cloud actions may not survive closing this tab.");}
  }
  function restoreCloudOutbox(){
    try{
      const current=localStorage.getItem(cloudOutboxKey());
      const legacy=localStorage.getItem(legacyCloudOutboxKey());
      const parse=text=>{try{return JSON.parse(text||"[]");}catch(_){return [];}};
      const currentActions=parse(current),legacyActions=parse(legacy);
      const saved=[...(Array.isArray(currentActions)?currentActions:[]),
        ...(Array.isArray(legacyActions)?legacyActions.filter(op=>op?.type!=="click_batch"):[])];
      const seen=new Set();
      cloudOutbox=saved.filter(op=>op&&typeof op==="object"&&
        /^[A-Za-z0-9_-]{12,80}$/.test(op.actionId)&&!seen.has(op.actionId)&&
        ["click_batch","golden","buy_business","buy_upgrade","buy_prestige","rebirth"].includes(op.type)&&
        (op.type!=="click_batch"||Number.isInteger(op.count)&&op.count>=1&&op.count<=CLOUD_BATCH_SIZE)&&
        (seen.add(op.actionId),true));
      // Write safe actions first; only then remove obsolete click queues and pacing data.
      if(cloudOutbox.length)localStorage.setItem(cloudOutboxKey(),JSON.stringify(cloudOutbox));
      else localStorage.removeItem(cloudOutboxKey());
      localStorage.removeItem(legacyCloudOutboxKey());
      localStorage.removeItem(legacyCloudLastBatchKey());
    }catch(_){cloudOutbox=[];}
  }
  function stagePendingClicks(){
    clearTimeout(cloudClickTimer);cloudClickTimer=0;
    if(!cloudMode||pendingClicks<=0)return;
    while(pendingClicks>0){
      const count=Math.min(CLOUD_BATCH_SIZE,pendingClicks);
      cloudOutbox.push({actionId:crypto.randomUUID(),type:"click_batch",count});
      pendingClicks-=count;
    }
    persistCloudOutbox();
  }
  function scheduleClickFlush(){
    if(cloudClickTimer||!cloudMode)return;
    cloudClickTimer=setTimeout(()=>{
      stagePendingClicks();
      if(cloudRetryStoppedAt&&Date.now()-cloudRetryStoppedAt>=15000){cloudRetryStoppedAt=0;cloudRetryCount=0;}
      startCloudDrain();
    },CLOUD_FLUSH_MS);
  }
  async function activateCloud(backup){
    if(!account.authenticated||account.needsUsername||cloudMode)return;
    try{
      if(backup&&!localStorage.getItem(LOCAL_BACKUP))localStorage.setItem(LOCAL_BACKUP,JSON.stringify(state));
      const data=await apiJson("/api/progress/snapshot");
      cloudMode=true;pendingClicks=0;buff=null;goldenExpires=0;$("goldenBill").hidden=true;applySettings();localStorage.setItem(CLOUD_CHOICE,"cloud");
      applyCloudSnapshot(data,true);restoreCloudOutbox();startCloudDrain();toast("Verified cloud run active");
    }catch(error){toast(error.message||"Cloud progress unavailable.");}
  }
  async function postCloudAction(action){
    return apiJson("/api/progress/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action)});
  }
  async function resyncCloud(){
    if(!cloudMode)return;
    try{const data=await apiJson("/api/progress/snapshot");if(cloudMode)applyCloudSnapshot(data);}
    catch(_){/* The next successful action or scheduled sync will refresh the view. */}
  }
  function startCloudDrain(){
    if(!cloudMode||cloudBusy||cloudRetryTimer||cloudRetryStoppedAt)return cloudQueue;
    cloudBusy=true;
    cloudQueue=(async()=>{
      while(cloudMode&&cloudOutbox.length){
        const action=cloudOutbox[0];
        try{
          const data=await postCloudAction(action);
          cloudOutbox.shift();persistCloudOutbox();
          if(cloudMode)applyCloudSnapshot(data);
          cloudRetryCount=0;cloudRetryStoppedAt=0;lastCloudSync=Date.now();
        }catch(error){
          if(error.status>=400&&error.status<500&&error.status!==409&&error.status!==429){
            cloudOutbox.shift();
            if(action.type==="click_batch"){
              cloudOutbox=cloudOutbox.filter(op=>op.type!=="click_batch");
              pendingClicks=0;clearTimeout(cloudClickTimer);cloudClickTimer=0;
            }
            persistCloudOutbox();await resyncCloud();
            toast(error.message||"Cloud action was rejected. Progress was refreshed.");
            cloudRetryCount=0;cloudRetryStoppedAt=0;lastCloudSync=Date.now();
            continue;
          }
          cloudRetryCount++;
          if(cloudRetryCount>=6){
            cloudRetryStoppedAt=Date.now();
            toast("Cloud sync paused. Your actions are saved in this browser and will retry when you reconnect.");
          }else{
            const delay=Math.min(15000,500*Math.pow(2,cloudRetryCount));
            cloudRetryTimer=setTimeout(()=>{cloudRetryTimer=0;startCloudDrain();},delay);
            if(cloudRetryCount===1)toast("Cloud sync paused. Reconnecting...");
          }
          break;
        }
      }
      if(cloudMode&&!cloudOutbox.length&&cloudSyncRequested){
        cloudSyncRequested=false;
        try{const data=await apiJson("/api/progress/snapshot");if(cloudMode)applyCloudSnapshot(data);}
        catch(_){/* A later scheduled sync will retry. */}
        lastCloudSync=Date.now();
      }
    })().finally(()=>{cloudBusy=false;if(cloudMode&&cloudOutbox.length&&!cloudRetryTimer)startCloudDrain();});
    return cloudQueue;
  }
  function queueCloudAction(action){
    if(!cloudMode)return cloudQueue;
    stagePendingClicks();
    if(action){
      cloudOutbox.push({actionId:crypto.randomUUID(),...action});
      persistCloudOutbox();
      if(cloudRetryStoppedAt){cloudRetryStoppedAt=0;cloudRetryCount=0;}
    }else if(!cloudOutbox.length&&Date.now()-lastCloudSync>30000)cloudSyncRequested=true;
    return startCloudDrain();
  }
  async function signOut(){
    $("accountMenu").hidden=true;
    if(cloudMode){
      queueCloudAction(null);await cloudQueue;
      if(cloudOutbox.length||pendingClicks){toast("Cloud sync is pending. Try signing out when connected.");return;}
    }
    try{await apiJson("/api/auth/signout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});}
    catch(_){toast("Sign out failed. Try again.");return;}
    cloudMode=false;pendingClicks=0;localStorage.setItem(CLOUD_CHOICE,"local");
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
    return s;
  }
  function load() {
    try {const text=localStorage.getItem(SAVE_KEY);if(text)state=normalize(JSON.parse(text));}
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
    intro.textContent="Paste a Cash Empire save code. Importing replaces your current progress.";
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
    modal("Reset Game","This permanently erases the Cash Empire save in this browser. Export it first if you want a backup.",[
      {label:"Cancel",action:()=>{}},
      {label:"Erase Progress",action:()=>{cloudMode=false;localStorage.setItem(CLOUD_CHOICE,"local");state=defaultState();buff=null;goldenExpires=0;$("goldenBill").hidden=true;sessionStart=Date.now();applySettings();save();afterAction();toast("Game reset");}}
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
          highestRate:state.highestRate,totalPlaytime:state.totalPlaytime,businessRevenue:state.businessRevenue,settings:state.settings};
        state=Object.assign(defaultState(),keep);
        if(hasPrestige("automation")){state.businesses.collector=10;state.businesses.lemonade=5;}
        buff=null;goldenExpires=0;$("goldenBill").hidden=true;goldenNext=Date.now()+randomBillDelay();
        playTone(1000);toast("Reborn with "+format(gain)+" Empire Points");afterAction();
      }}
    ]);
  }
  function randomBillDelay() {return (180+Math.random()*180)*1000;}
  function spawnGolden() {
    goldenExpires=Date.now()+12000;
    const bill=$("goldenBill");bill.hidden=false;
    bill.style.left=(15+Math.random()*65)+"%";bill.style.top=(15+Math.random()*55)+"%";
  }
  function claimGolden() {
    if(!goldenExpires || Date.now()>goldenExpires)return;
    goldenExpires=0;$("goldenBill").hidden=true;goldenNext=Date.now()+randomBillDelay()*(hasPrestige("lucky")?.7:1);
    state.goldenClicked++;
    if(cloudMode){queueCloudAction({type:"golden"});return;}
    const roll=Math.random();
    if(roll<.25){buff={type:"goldrush",mult:10,clickMult:10,until:Date.now()+30000};toast("GOLD RUSH! Income and clicks ×10 for 30 seconds!");setTicker("GOLD RUSH • Every move turns to gold for 30 seconds.");}
    else if(roll<.49){buff={type:"income",mult:7,until:Date.now()+30000};toast("Golden Bill: income ×7 for 30 seconds!");}
    else if(roll<.73){const prize=Math.max(100,baseRate()*180,clickValue()*50);addMoney(prize);toast("Golden Bill: +"+euro(prize)+"!");}
    else if(roll<.9){buff={type:"click",mult:20,until:Date.now()+15000};toast("Golden Bill: clicks ×20 for 15 seconds!");}
    else {buff={type:"income",mult:12,until:Date.now()+15000};toast("Golden Bill: businesses ×12 for 15 seconds!");}
    applySettings();
    playTone(1200);afterAction();
  }
  function applyOffline() {
    const away=Math.max(0,Math.min(Date.now()-state.lastPlayed,7*24*3600000));
    if(away<60000)return;
    const capped=Math.min(away/1000,(hasPrestige("nightshift")?16*3600:OFFLINE_CAP));
    const production=baseRate();
    const earned=earnBusinesses(capped*.5,false);
    save();
    if(earned>0){
      const wrap=document.createElement("div"),p=document.createElement("p");
      p.textContent="You were away for "+duration(away/1000)+". Production: "+euro(production,1)+"/sec. Offline efficiency: 50%. You earned "+euro(earned)+". The time cap is "+(hasPrestige("nightshift")?16:10)+" hours.";
      pendingAccountRefresh=true;wrap.append(p);modal("Welcome Back",wrap,[{label:"Collect",action:()=>{}}]);
      return true;
    }
  }
  function applySettings() {
    document.documentElement.classList.toggle("light",state.settings.light);
    document.documentElement.classList.toggle("fit-screen",state.settings.fitScreen);
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
  function tick() {
    const now=Date.now(),elapsed=Math.max(0,(now-lastTick)/1000);lastTick=now;
    if(elapsed>0){
      const productive=Math.min(elapsed,hasPrestige("nightshift")?16*3600:OFFLINE_CAP);
      earnBusinesses(productive*(elapsed>60?.5:1),true);
      state.totalPlaytime+=Math.min(elapsed,productive);
    }
    if(buff&&now>=buff.until){buff=null;applySettings();toast("Bonus ended");}
    if(goldenExpires&&now>=goldenExpires){goldenExpires=0;$("goldenBill").hidden=true;goldenNext=now+randomBillDelay()*(hasPrestige("lucky")?.7:1);}
    if(!goldenExpires&&now>=goldenNext)spawnGolden();
    state.highestRate=Math.max(state.highestRate,currentRate());
    if(now>=ambientNext)spawnAmbientBill();
    if(now>=tickerNext)rotateTicker();
    if(cloudMode&&!cloudBusy&&!cloudRetryTimer&&now-lastCloudSync>30000)queueCloudAction(null);
    renderTop();
    if(now-renderTimer>600){renderCurrent();renderTimer=now;}
    if(now-achievementTimer>1000){checkAchievements();achievementTimer=now;}
  }
  async function init() {
    setupMusic();buildWealthArt();load();applySettings();renderTop();renderOwned();
    await refreshPremiumStatus();
    if(!applyOffline())await refreshAccount();
    pileEl.addEventListener("click",event=>{const value=clickValue();addMoney(value);state.totalClicks++;if(cloudMode){pendingClicks++;scheduleClickFlush();}effect(value,event);playTone();checkAchievements();renderTop();if(Date.now()-lastClickSave>2000){save();lastClickSave=Date.now();}});
    $("goldenBill").addEventListener("click",claimGolden);
    document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>b.dataset.feature?openFeature(b.dataset.feature):switchTab(b.dataset.tab)));
    document.querySelectorAll(".buy-option").forEach(b=>b.addEventListener("click",()=>{
      buyAmount=b.dataset.buy;document.querySelectorAll(".buy-option").forEach(x=>x.classList.toggle("active",x===b));renderBusinesses();
    }));
    $("exportSave").addEventListener("click",exportSave);
    $("importSave").addEventListener("click",importSave);
    $("resetGame").addEventListener("click",resetGame);
    $("fitScreen").addEventListener("click",()=>{state.settings.fitScreen=!state.settings.fitScreen;applySettings();save();});
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
      if(cloudMode&&cloudOutbox.length){cloudRetryStoppedAt=0;cloudRetryCount=0;clearTimeout(cloudRetryTimer);cloudRetryTimer=0;startCloudDrain();}
    });
    window.addEventListener("pagehide",()=>{save();if(cloudMode)queueCloudAction(null);});
    document.addEventListener("visibilitychange",()=>{if(document.hidden){save();if(cloudMode)queueCloudAction(null);}});
    renderTop();renderOwned();renderCurrent();checkAchievements();rotateTicker();setInterval(tick,100);
    setInterval(save,10000);
  }
  window.CashEmpireMath={totalCost,maxAffordable,format,businessUnitRate,earnBusinesses,getWealthVisualTier,configs:BUSINESS};
  init();
})();