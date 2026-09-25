import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import worker from "../worker/index.mjs";

const origin="https://clickthecash.online";
const encode=value=>Buffer.from(typeof value==="string"?value:JSON.stringify(value)).toString("base64url");
function d1(database){
  return {
    prepare(sql){
      let args=[];
      return {
        sql,get args(){return args},
        bind(...values){args=values;return this;},
        async run(){const result=database.prepare(sql).run(...args);return {meta:{changes:result.changes}};},
        async first(){return database.prepare(sql).get(...args)||null;},
        async all(){return {results:database.prepare(sql).all(...args)};}
      };
    },
    async batch(statements){
      database.exec("BEGIN");
      try{
        const results=statements.map(item=>({meta:{changes:database.prepare(item.sql).run(...item.args).changes}}));
        database.exec("COMMIT");return results;
      }catch(error){database.exec("ROLLBACK");throw error;}
    }
  };
}

test("Google callback creates a stable account, username is unique, and sign out revokes session",async()=>{
  const database=new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../migrations/0001_leaderboard_store.sql",import.meta.url),"utf8"));
  database.exec(readFileSync(new URL("../migrations/0002_google_accounts.sql",import.meta.url),"utf8"));
  database.exec(readFileSync(new URL("../migrations/0003_playtime_boosters.sql",import.meta.url),"utf8"));
  database.exec(readFileSync(new URL("../migrations/0004_cloud_click_streams.sql",import.meta.url),"utf8"));
  database.exec(readFileSync(new URL("../migrations/0005_admin_moderation.sql",import.meta.url),"utf8"));
  const keys=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
  const jwk={...await crypto.subtle.exportKey("jwk",keys.publicKey),kid:"test-key",use:"sig"};
  const env={DB:d1(database),SESSION_SECRET:"a-secret-long-enough-for-tests",GOOGLE_CLIENT_ID:"client-test",GOOGLE_CLIENT_SECRET:"secret-test",PUBLIC_SITE_URL:origin};
  let nonce,subject="google-subject-one";
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async input=>{
    const url=String(input);
    if(url==="https://oauth2.googleapis.com/token"){
      const header=encode({alg:"RS256",typ:"JWT",kid:"test-key"});
      const claims=encode({iss:"https://accounts.google.com",aud:env.GOOGLE_CLIENT_ID,nonce,sub:subject,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});
      const payload=header+"."+claims;
      const signature=Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",keys.privateKey,new TextEncoder().encode(payload))).toString("base64url");
      return Response.json({id_token:payload+"."+signature});
    }
    if(url==="https://www.googleapis.com/oauth2/v3/certs")return Response.json({keys:[jwk]});
    return originalFetch(input);
  };
  async function login(){
    const started=await worker.fetch(new Request(origin+"/api/auth/google/start"),env);
    assert.equal(started.status,302);
    const authorization=new URL(started.headers.get("Location"));
    nonce=authorization.searchParams.get("nonce");
    const flow=started.headers.get("Set-Cookie").split(";")[0];
    const callback=new URL(origin+"/api/auth/google/callback");
    callback.searchParams.set("state",authorization.searchParams.get("state"));
    callback.searchParams.set("code","test-code");
    const completed=await worker.fetch(new Request(callback,{headers:{Cookie:flow}}),env);
    assert.equal(completed.status,302);
    return completed.headers.getSetCookie().find(x=>x.startsWith("__Host-ce_session=")).split(";")[0];
  }
  try{
    const cookie=await login();
    const initial=await worker.fetch(new Request(origin+"/api/account",{headers:{Cookie:cookie}}),env);
    const initialAccount=await initial.json();assert.equal(initialAccount.authenticated,true);assert.equal(initialAccount.username,null);assert.equal(initialAccount.needsUsername,true);assert.match(initialAccount.userId,/^[0-9a-f-]{36}$/);
    const check=await worker.fetch(new Request(origin+"/api/username/check",{method:"POST",headers:{Cookie:cookie,Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({username:"CashKing92"})}),env);
    assert.equal((await check.json()).available,true);
    const chosen=await worker.fetch(new Request(origin+"/api/username",{method:"POST",headers:{Cookie:cookie,Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({username:"CashKing92"})}),env);
    assert.equal((await chosen.json()).username,"CashKing92");
    const userId=database.prepare("SELECT id FROM users WHERE google_subject=?").get(subject).id;
    const snapshot=await worker.fetch(new Request(origin+"/api/progress/snapshot",{headers:{Cookie:cookie}}),env);
    assert.equal((await snapshot.json()).balance,0);
    const action=(body,actionId=crypto.randomUUID())=>worker.fetch(new Request(origin+"/api/progress/action",{method:"POST",headers:{Cookie:cookie,Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({actionId,...body})}),env);
    const heartbeat=active=>worker.fetch(new Request(origin+"/api/progress/heartbeat",{method:"POST",headers:{Cookie:cookie,Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({active})}),env);
    assert.equal((await heartbeat(true)).status,200);
    database.prepare("UPDATE progress SET last_heartbeat_ms=? WHERE user_id=?").run(Date.now()-30000,userId);
    const activeTime=await (await heartbeat(true)).json();
    assert.ok(activeTime.totalPlaytime>=29&&activeTime.totalPlaytime<=35);
    await heartbeat(false);
    database.prepare("UPDATE progress SET pending_drop_until_ms=? WHERE user_id=?").run(Date.now()+20000,userId);
    const drop=await (await action({type:"claim_booster_drop"})).json();
    assert.equal(Object.values(drop.boosterInventory).reduce((a,b)=>a+b,0),1);
    const boosterId=Object.keys(drop.boosterInventory)[0];
    const clickId=crypto.randomUUID();
    const firstClick=await action({type:"click_batch",count:1},clickId);
    assert.equal((await firstClick.json()).balance,1);
    const repeated=await action({type:"click_batch",count:1},clickId);
    assert.equal(repeated.status,200);
    assert.equal((await repeated.json()).totalClicks,1);
    database.prepare("UPDATE progress SET last_accrual_ms=? WHERE user_id=?").run(Date.now()-1000,userId);
    const moreClicks=await action({type:"click_batch",count:10});
    assert.ok((await moreClicks.json()).balance>=11);
    const purchaseId=crypto.randomUUID();
    const purchased=await action({type:"buy_business",businessId:"collector",quantity:1},purchaseId);
    assert.equal((await purchased.json()).businesses.collector,1);
    const repeatedPurchase=await action({type:"buy_business",businessId:"collector",quantity:1},purchaseId);
    assert.equal(repeatedPurchase.status,200);
    assert.equal((await repeatedPurchase.json()).businesses.collector,1);
    const equipped=await (await action({type:"equip_booster",slot:1,boosterId})).json();
    assert.equal(equipped.equippedBoosters[0],boosterId);
    const signedOut=await worker.fetch(new Request(origin+"/api/auth/signout",{method:"POST",headers:{Cookie:cookie,Origin:origin,"Content-Type":"application/json"},body:"{}"}),env);
    assert.equal(signedOut.status,200);
    const afterSignout=await worker.fetch(new Request(origin+"/api/account",{headers:{Cookie:cookie}}),env);
    assert.equal((await afterSignout.json()).authenticated,false);
    const again=await login();
    const returning=await worker.fetch(new Request(origin+"/api/account",{headers:{Cookie:again}}),env);
    assert.deepEqual(await returning.json(),{authenticated:true,username:"CashKing92",needsUsername:false,userId});
    assert.equal(database.prepare("SELECT id FROM users WHERE google_subject=?").get(subject).id,userId);
    const resumed=await (await worker.fetch(new Request(origin+"/api/progress/snapshot",{headers:{Cookie:again}}),env)).json();
    assert.ok(resumed.totalPlaytime>=29);
    assert.equal(resumed.equippedBoosters[0],boosterId);
    assert.equal(resumed.boosterInventory[boosterId],1);
    subject="google-subject-two";
    const secondCookie=await login();
    const duplicate=await worker.fetch(new Request(origin+"/api/username/check",{method:"POST",headers:{Cookie:secondCookie,Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({username:"cashking92"})}),env);
    assert.deepEqual(await duplicate.json(),{available:false,message:"Username already taken"});
    const leaderboard=await worker.fetch(new Request(origin+"/api/leaderboard",{headers:{Cookie:secondCookie}}),env);
    const data=await leaderboard.json();
    assert.equal(data.players.length,1);
    assert.equal(data.players[0].username,"CashKing92");
    assert.equal(data.me,null);
    database.prepare("INSERT INTO moderation_state(user_id,banned_at_ms,banned_by,ban_reason,updated_at_ms) VALUES(?,?,?,?,?)").run(userId,Date.now(),userId,"Moderation test",Date.now());
    database.prepare("DELETE FROM sessions WHERE user_id=?").run(userId);
    assert.equal((await (await worker.fetch(new Request(origin+"/api/account",{headers:{Cookie:again}}),env)).json()).authenticated,false);
    subject="google-subject-one";
    const blockedStart=await worker.fetch(new Request(origin+"/api/auth/google/start"),env);
    const blockedUrl=new URL(blockedStart.headers.get("Location"));nonce=blockedUrl.searchParams.get("nonce");
    const blockedCallback=new URL(origin+"/api/auth/google/callback");blockedCallback.searchParams.set("state",blockedUrl.searchParams.get("state"));blockedCallback.searchParams.set("code","test-code");
    const blocked=await worker.fetch(new Request(blockedCallback,{headers:{Cookie:blockedStart.headers.get("Set-Cookie").split(";")[0]}}),env);
    assert.equal(blocked.status,302);assert.equal(new URL(blocked.headers.get("Location")).searchParams.get("account_banned"),"1");
    assert.equal(database.prepare("SELECT count(*) AS n FROM sessions WHERE user_id=?").get(userId).n,0);
  }finally{globalThis.fetch=originalFetch;database.close();}
});

test("leaderboard is public, ordered, limited to 30, and returns an outside player's rank",async()=>{
  const db=new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../migrations/0001_leaderboard_store.sql",import.meta.url),"utf8"));
  db.exec(readFileSync(new URL("../migrations/0002_google_accounts.sql",import.meta.url),"utf8"));
  db.exec(readFileSync(new URL("../migrations/0003_playtime_boosters.sql",import.meta.url),"utf8"));
  db.exec(readFileSync(new URL("../migrations/0004_cloud_click_streams.sql",import.meta.url),"utf8"));
  db.exec(readFileSync(new URL("../migrations/0005_admin_moderation.sql",import.meta.url),"utf8"));
  const now=Date.now();
  const user=db.prepare("INSERT INTO users(id,username,created_at_ms,username_normalized,username_set) VALUES(?,?,?,?,1)");
  const score=db.prepare("INSERT INTO progress(user_id,last_accrual_ms,lifetime_cash,rebirths) VALUES(?,?,?,?)");
  for(let i=1;i<=101;i++){
    const id="player"+String(i).padStart(3,"0");
    user.run(id,"Player_"+i,now,("Player_"+i).toLowerCase());
    score.run(id,now,i===1||i===2?500:500-i,i===2?5:0);
  }
  const token="A".repeat(43);
  const hash=Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))).toString("hex");
  db.prepare("INSERT INTO sessions(token_hash,user_id,created_at_ms,expires_at_ms) VALUES(?,?,?,?)")
    .run(hash,"player101",now,now+60000);
  const env={DB:d1(db)};
  const publicResult=await worker.fetch(new Request(origin+"/api/leaderboard"),env);
  const publicData=await publicResult.json();
  assert.equal(publicData.players.length,30);
  assert.equal(publicData.players[0].username,"Player_2");
  assert.equal(publicData.players[1].username,"Player_1");
  assert.equal(publicData.authenticated,false);
  const ownResult=await worker.fetch(new Request(origin+"/api/leaderboard",{headers:{Cookie:"__Host-ce_session="+token}}),env);
  const ownData=await ownResult.json();
  assert.equal(ownData.me.rank,101);
  assert.equal(ownData.me.isSelf,true);
  db.close();
});
