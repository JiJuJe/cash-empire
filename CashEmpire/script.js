"use strict";
(() => {
  const SAVE_KEY = "cash-empire-save-v1";
  const PRICE_GROWTH = 1.15;
  const OFFLINE_CAP = 10 * 3600;
  const BUSINESS = [
    {id:"collector",name:"Cash Collector",icon:"✋",cost:10,income:.1},
    {id:"lemonade",name:"Lemonade Stand",icon:"🍋",cost:15,income:.2},
    {id:"newspaper",name:"Newspaper Route",icon:"🗞",cost:100,income:1},
    {id:"vending",name:"Vending Machine",icon:"🥤",cost:1000,income:8},
    {id:"shop",name:"Small Shop",icon:"🏪",cost:12000,income:47},
    {id:"restaurant",name:"Restaurant",icon:"🍽",cost:130000,income:260},
    {id:"supermarket",name:"Supermarket",icon:"🛒",cost:1400000,income:1400},
    {id:"factory",name:"Factory",icon:"⚙",cost:20000000,income:9000},
    {id:"bank",name:"Bank",icon:"🏦",cost:330000000,income:55000},
    {id:"corporation",name:"Corporation",icon:"🏢",cost:7000000000,income:420000},
    {id:"exchange",name:"Stock Exchange",icon:"📈",cost:170000000000,income:3500000},
    {id:"mega",name:"Mega Corporation",icon:"🌆",cost:4500000000000,income:30000000},
    {id:"global",name:"Global Empire",icon:"🌍",cost:140000000000000,income:300000000},
    {id:"moon",name:"Moon Bank",icon:"🌙",cost:5000000000000000,income:4000000000},
    {id:"galactic",name:"Galactic Corporation",icon:"🪐",cost:250000000000000000,income:60000000000},
    {id:"multiverse",name:"Money Multiverse",icon:"✧",cost:10000000000000000000,income:1000000000000}
  ];
  const CLICK_UPGRADES = [
    {id:"wallet",name:"Better Wallet",icon:"👛",cost:50,mult:2,unlock:25,description:"Click income ×2"},
    {id:"fingers",name:"Fast Fingers",icon:"⚡",cost:500,mult:2,unlock:250,description:"Click income ×2"},
    {id:"goldWallet",name:"Golden Wallet",icon:"💛",cost:10000,mult:3,unlock:5000,description:"Click income ×3"},
    {id:"diamond",name:"Diamond Hands",icon:"💎",cost:1000000,mult:5,unlock:500000,description:"Click income ×5"},
    {id:"magnet",name:"Money Magnet",icon:"🧲",cost:100000000,mult:10,unlock:50000000,description:"Click income ×10"},
    {id:"quantum",name:"Quantum Purse",icon:"⚛",cost:10000000000,mult:10,unlock:5000000000,description:"Click income ×10"},
    {id:"cosmic",name:"Cosmic Grip",icon:"✦",cost:1000000000000,mult:20,unlock:500000000000,description:"Click income ×20"},
    {id:"infinite",name:"Infinite Pocket",icon:"∞",cost:1000000000000000,mult:50,unlock:500000000000000,description:"Click income ×50"}
  ];
  const MILESTONES = [
    {count:10,mult:2},{count:25,mult:2},{count:50,mult:2},{count:100,mult:3},{count:200,mult:4}
  ];
  const PRESTIGE = [
    {id:"investor",name:"Investor",icon:"📊",cost:5,description:"Businesses produce +10%."},
    {id:"compound",name:"Compound Interest",icon:"🪙",cost:12,description:"Each Empire Point gives +1.5% instead of +1%."},
    {id:"automation",name:"Automation",icon:"🤖",cost:20,description:"Start each rebirth with 10 Cash Collectors and 5 Lemonade Stands."},
    {id:"lucky",name:"Lucky Investor",icon:"🍀",cost:25,description:"Golden Bills appear 30% more often."},
    {id:"executive",name:"Executive",icon:"💼",cost:35,description:"Permanent click income ×2."},
    {id:"nightshift",name:"Night Shift",icon:"🌙",cost:50,description:"Offline earning cap rises from 10 to 16 hours."}
  ];
  const SUFFIXES = ["","thousand","million","billion","trillion","quadrillion","quintillion","sextillion","septillion","octillion","nonillion","decillion","undecillion","duodecillion","tredecillion","quattuordecillion","quindecillion","sexdecillion","septendecillion","octodecillion","novemdecillion","vigintillion"];
  const $ = id => document.getElementById(id);
  const moneyEl = $("balance"), rateEl = $("rate"), pileEl = $("moneyPile");
  const defaultState = () => ({
    version:1,money:0,runEarned:0,lifetime:0,
    businesses:Object.fromEntries(BUSINESS.map(b => [b.id,0])),
    upgrades:[],achievements:[],prestigeUpgrades:[],
    empireTotal:0,empireSpent:0,rebirths:0,
    totalClicks:0,businessesPurchased:0,goldenClicked:0,
    highestRate:0,totalPlaytime:0,lastPlayed:Date.now(),
    settings:{sound:true,animations:true,particles:true,compact:true,light:false}
  });
  let state = defaultState();
  let buyAmount = "1",activeTab = "upgrades",sessionStart = Date.now(),lastTick = Date.now();
  let goldenExpires = 0,goldenNext = Date.now() + randomBillDelay(),buff = null;
  let audioContext = null,renderTimer = 0,achievementTimer = 0,pileTimer = 0;
  const has = id => state.upgrades.includes(id);
  const hasPrestige = id => state.prestigeUpgrades.includes(id);
  const safeNumber = (value,fallback=0) => Number.isFinite(value) && value >= 0 ? Math.min(value,1e300) : fallback;
  function format(value,decimals=0) {
    if (!Number.isFinite(value)) return "∞";
    const sign = value < 0 ? "-" : "";
    let n = Math.abs(value);
    if (n < 1000 || !state.settings.compact) {
      if (!state.settings.compact && n >= 1000 && n < 1e15) return sign + n.toLocaleString("en-US",{maximumFractionDigits:decimals});
      if (n < 1000) return sign + n.toLocaleString("en-US",{maximumFractionDigits:decimals});
    }
    const tier = Math.min(Math.floor(Math.log10(n)/3),SUFFIXES.length-1);
    if (tier <= 0) return sign + n.toLocaleString("en-US",{maximumFractionDigits:decimals});
    const scaled = n / Math.pow(1000,tier);
    const digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
    return sign + scaled.toFixed(digits).replace(/\.?0+$/,"") + " " + SUFFIXES[tier];
  }
  const euro = (n,d=0) => "€" + format(n,d);
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
    return buyAmount === "max" ? max : Math.min(Number(buyAmount),max);
  }
  function displayedQuantity(b) {
    return buyAmount === "max" ? maxAffordable(b,state.businesses[b.id],state.money) : Number(buyAmount);
  }
  function prestigeBonus() {
    return 1 + state.empireTotal * (hasPrestige("compound") ? .015 : .01);
  }
  function businessMultiplier(b) {
    return MILESTONES.reduce((value,m) => value * (has(b.id+"-"+m.count) ? m.mult : 1),1);
  }
  function baseRate() {
    let rate=0;
    for (const b of BUSINESS) rate += state.businesses[b.id] * b.income * businessMultiplier(b);
    return rate * prestigeBonus() * (hasPrestige("investor") ? 1.1 : 1);
  }
  function currentRate() {
    return baseRate() * (buff && buff.type === "income" && buff.until > Date.now() ? buff.mult : 1);
  }
  function clickValue() {
    let value=1;
    for (const u of CLICK_UPGRADES) if (has(u.id)) value*=u.mult;
    value *= prestigeBonus() * (hasPrestige("executive") ? 2 : 1);
    if (buff && buff.type === "click" && buff.until > Date.now()) value*=buff.mult;
    return value;
  }
  function addMoney(value) {
    if (!Number.isFinite(value) || value <= 0) return;
    state.money = Math.min(1e300,state.money+value);
    state.runEarned = Math.min(1e300,state.runEarned+value);
    state.lifetime = Math.min(1e300,state.lifetime+value);
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
      note.style.setProperty("--dy",(Math.random()*90-70)+"px");
      layer.append(note);setTimeout(() => note.remove(),750);
    }
  }
  function toast(message,achievement=false) {
    const node=document.createElement("div");node.className="toast"+(achievement?" achievement-toast":"");node.textContent=message;
    $("toastStack").append(node);setTimeout(() => node.remove(),3500);
  }
  const ACHIEVEMENTS = [];
  function achievement(id,name,description,icon,test) {ACHIEVEMENTS.push({id,name,description,icon,test});}
  [
    [1,"First Euro"],[100,"Pocket Money"],[10000,"Getting Serious"],[1000000,"Millionaire"],
    [1000000000,"Billionaire"],[1000000000000,"Trillionaire"],[1e15,"Quadrillionaire"],
    [1e18,"Quintillionaire"],[1e21,"Sextillionaire"]
  ].forEach(([n,name]) => achievement("earn-"+n,name,"Earn "+euro(n)+" total","💶",s=>s.lifetime>=n));
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
  function updatePile() {
    const n=state.lifetime;
    const stage=n>=1e9?4:n>=1e6?3:n>=10000?2:n>=100?1:0;
    pileEl.className="money-pile stage-"+stage+(pileEl.classList.contains("popped")?" popped":"");
    const ring=$("collectorRing"),count=Math.min(16,state.businesses.collector);
    if(ring.childElementCount!==count) {
      ring.replaceChildren();
      for(let i=0;i<count;i++){
        const item=document.createElement("span");item.className="collector";item.textContent="€";
        item.style.setProperty("--angle",(i*360/count)+"deg");
        item.style.setProperty("--delay",(-i*.17)+"s");
        ring.append(item);
      }
    }
  }
  function renderTop() {
    moneyEl.textContent=euro(state.money,state.money<100?1:0);
    rateEl.textContent=euro(currentRate(),currentRate()<10?1:0)+" / second";
    $("lifetime").textContent=euro(state.lifetime);
    $("perClick").textContent=euro(clickValue(),clickValue()<10?1:0);
    $("buffBar").textContent=buff&&buff.until>Date.now() ? (buff.type==="income"?"Income":"Clicks")+" ×"+buff.mult+" · "+duration((buff.until-Date.now())/1000)+" left" : "";
    updatePile();
  }
  function allUpgrades() {
    const result=[];
    for(const u of CLICK_UPGRADES) if(!has(u.id)&&state.lifetime>=u.unlock) result.push(u);
    for(const b of BUSINESS) for(const m of MILESTONES) {
      const id=b.id+"-"+m.count;
      if(!has(id)&&state.businesses[b.id]>=m.count)
        result.push({id,name:b.name+" "+m.count,icon:b.icon,cost:Math.ceil(b.cost*m.count*(m.count===10?4:m.count===25?5:m.count===50?6:m.count===100?8:10)),mult:m.mult,description:b.name+" income ×"+m.mult});
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
      const icon=document.createElement("div");icon.className="upgrade-icon";icon.textContent=u.icon;
      const info=document.createElement("div");info.className="upgrade-info";
      const title=document.createElement("strong");title.textContent=u.name;
      const desc=document.createElement("p");desc.textContent=u.description;
      info.append(title,desc);
      card.append(icon,info,makeButton(euro(u.cost),state.money<u.cost,()=>buyUpgrade(u)));
      list.append(card);
    }
  }
  function buyUpgrade(u) {
    if(has(u.id)||state.money<u.cost)return;
    state.money-=u.cost;state.upgrades.push(u.id);playTone(880);toast(u.name+" purchased");
    afterAction();
  }
  function renderBusinesses() {
    const list=$("businessList");list.replaceChildren();
    for(const b of BUSINESS) {
      const owned=state.businesses[b.id],want=displayedQuantity(b),quantity=selectedQuantity(b);
      const price=totalCost(b,owned,want);
      const card=document.createElement("div");
      card.className="business-card"+(quantity>0?" available":owned===0?" locked":"");
      const icon=document.createElement("div");icon.className="business-icon";icon.textContent=b.icon;
      const info=document.createElement("div");info.className="business-info";
      const title=document.createElement("strong");title.textContent=b.name;
      const detail=document.createElement("p");
      detail.textContent=euro(b.income*businessMultiplier(b)*prestigeBonus()*(hasPrestige("investor")?1.1:1),b.income<10?1:0)+"/sec each";
      const count=document.createElement("span");count.className="business-owned";count.textContent="OWNED "+format(owned);
      info.append(title,detail,count);
      const button=makeButton("BUY "+(buyAmount==="max"?"MAX":"×"+want),quantity===0,()=>buyBusiness(b));
      const cost=document.createElement("small");cost.textContent=euro(price);
      button.append(cost);card.append(icon,info,button);list.append(card);
    }
  }
  function buyBusiness(b) {
    const quantity=selectedQuantity(b);if(quantity<=0)return;
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
    for(const [key,label] of [["sound","Sound"],["animations","Animations"],["particles","Particles"],["compact","Compact numbers"],["light","Light UI"]]) {
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
      const icon=document.createElement("div");icon.className="upgrade-icon";icon.textContent=p.icon;
      const info=document.createElement("div");info.className="upgrade-info";
      const name=document.createElement("strong");name.textContent=p.name;
      const desc=document.createElement("p");desc.textContent=p.description;
      info.append(name,desc);
      card.append(icon,info,makeButton(owned?"OWNED":format(p.cost)+" points",owned||pointsAvailable()<p.cost,()=>buyPrestige(p)));
      tree.append(card);
    }
  }
  function buyPrestige(p) {
    if(hasPrestige(p.id)||pointsAvailable()<p.cost)return;
    state.empireSpent+=p.cost;state.prestigeUpgrades.push(p.id);toast(p.name+" invested");playTone(940);afterAction();
  }
  function afterAction() {
    checkAchievements();renderTop();renderCurrent();save();
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
  function closeModal() {$("modalBackdrop").hidden=true;}
  function save() {
    try {state.lastPlayed=Date.now();localStorage.setItem(SAVE_KEY,JSON.stringify(state));}
    catch (_) {toast("Browser storage is unavailable. Export your save to keep progress.");}
  }
  function normalize(raw) {
    if(!raw || typeof raw!=="object" || raw.version!==1)throw Error("Invalid save version.");
    const s=defaultState();
    for(const key of ["money","runEarned","lifetime","empireTotal","empireSpent","rebirths","totalClicks","businessesPurchased","goldenClicked","highestRate","totalPlaytime","lastPlayed"])
      s[key]=safeNumber(raw[key],s[key]);
    for(const b of BUSINESS) s.businesses[b.id]=Math.floor(safeNumber(raw.businesses?.[b.id]));
    const validUpgrades=new Set([...CLICK_UPGRADES.map(u=>u.id),...BUSINESS.flatMap(b=>MILESTONES.map(m=>b.id+"-"+m.count))]);
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
          {label:"Replace Save",action:()=>{state=imported;state.lastPlayed=Date.now();buff=null;goldenExpires=0;$("goldenBill").hidden=true;applySettings();save();afterAction();toast("Save imported");}}
        ]);
      } catch(_){toast("That save code is invalid.");}
    }}]);
  }
  function resetGame() {
    modal("Reset Game","This permanently erases the Cash Empire save in this browser. Export it first if you want a backup.",[
      {label:"Cancel",action:()=>{}},
      {label:"Erase Progress",action:()=>{state=defaultState();buff=null;goldenExpires=0;$("goldenBill").hidden=true;sessionStart=Date.now();applySettings();save();afterAction();toast("Game reset");}}
    ]);
  }
  function rebirth() {
    const gain=pointsGain();if(gain<=0)return;
    modal("Confirm Rebirth","You will gain "+format(gain)+" Empire Points. Cash, businesses, and regular upgrades reset. Achievements, lifetime earnings, Empire Points, and investments remain.",[
      {label:"Cancel",action:()=>{}},
      {label:"Rebirth",action:()=>{
        const keep={lifetime:state.lifetime,achievements:state.achievements,prestigeUpgrades:state.prestigeUpgrades,
          empireTotal:state.empireTotal+gain,empireSpent:state.empireSpent,rebirths:state.rebirths+1,
          totalClicks:state.totalClicks,businessesPurchased:state.businessesPurchased,goldenClicked:state.goldenClicked,
          highestRate:state.highestRate,totalPlaytime:state.totalPlaytime,settings:state.settings};
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
    const roll=Math.random();
    if(roll<.32){buff={type:"income",mult:7,until:Date.now()+30000};toast("Golden Bill: income ×7 for 30 seconds!");}
    else if(roll<.65){const prize=Math.max(100,baseRate()*180,clickValue()*50);addMoney(prize);toast("Golden Bill: +"+euro(prize)+"!");}
    else if(roll<.88){buff={type:"click",mult:20,until:Date.now()+15000};toast("Golden Bill: clicks ×20 for 15 seconds!");}
    else {buff={type:"income",mult:12,until:Date.now()+15000};toast("Golden Bill: businesses ×12 for 15 seconds!");}
    playTone(1200);afterAction();
  }
  function applyOffline() {
    const away=Math.max(0,Math.min(Date.now()-state.lastPlayed,7*24*3600000));
    if(away<60000)return;
    const capped=Math.min(away/1000,(hasPrestige("nightshift")?16*3600:OFFLINE_CAP));
    const earned=baseRate()*capped;
    if(earned>0){
      addMoney(earned);
      const wrap=document.createElement("div"),p=document.createElement("p");
      p.textContent="You were away for "+duration(away/1000)+". Your businesses earned "+euro(earned)+". Offline earnings are capped at "+(hasPrestige("nightshift")?16:10)+" hours.";
      wrap.append(p);modal("Welcome Back",wrap,[{label:"Collect",action:()=>{}}]);
    }
  }
  function applySettings() {
    document.documentElement.classList.toggle("light",state.settings.light);
    document.documentElement.classList.toggle("reduce-motion",!state.settings.animations);
  }
  function tick() {
    const now=Date.now(),elapsed=Math.max(0,(now-lastTick)/1000);lastTick=now;
    if(elapsed>0){
      const productive=Math.min(elapsed,hasPrestige("nightshift")?16*3600:OFFLINE_CAP);
      addMoney(currentRate()*productive);
      state.totalPlaytime+=Math.min(elapsed,productive);
    }
    if(buff&&now>=buff.until){buff=null;toast("Bonus ended");}
    if(goldenExpires&&now>=goldenExpires){goldenExpires=0;$("goldenBill").hidden=true;goldenNext=now+randomBillDelay()*(hasPrestige("lucky")?.7:1);}
    if(!goldenExpires&&now>=goldenNext)spawnGolden();
    state.highestRate=Math.max(state.highestRate,currentRate());
    renderTop();
    if(now-renderTimer>600){renderCurrent();renderTimer=now;}
    if(now-achievementTimer>1000){checkAchievements();achievementTimer=now;}
  }
  function init() {
    load();applySettings();applyOffline();
    pileEl.addEventListener("click",event=>{const value=clickValue();addMoney(value);state.totalClicks++;effect(value,event);playTone();checkAchievements();renderTop();save();});
    $("goldenBill").addEventListener("click",claimGolden);
    document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
    document.querySelectorAll(".buy-option").forEach(b=>b.addEventListener("click",()=>{
      buyAmount=b.dataset.buy;document.querySelectorAll(".buy-option").forEach(x=>x.classList.toggle("active",x===b));renderBusinesses();
    }));
    $("mobileStore").addEventListener("click",()=>$("storeColumn").scrollIntoView({behavior:state.settings.animations?"smooth":"instant"}));
    $("exportSave").addEventListener("click",exportSave);
    $("importSave").addEventListener("click",importSave);
    $("resetGame").addEventListener("click",resetGame);
    $("rebirthButton").addEventListener("click",rebirth);
    $("modalClose").addEventListener("click",closeModal);
    $("modalBackdrop").addEventListener("click",event=>{if(event.target===$("modalBackdrop"))closeModal();});
    document.addEventListener("keydown",event=>{if(event.key==="Escape")closeModal();});
    window.addEventListener("pagehide",save);
    document.addEventListener("visibilitychange",()=>{if(document.hidden)save();});
    renderTop();renderCurrent();checkAchievements();setInterval(tick,100);
    setInterval(save,10000);
  }
  window.CashEmpireMath={totalCost,maxAffordable,format,configs:BUSINESS};
  init();
})();