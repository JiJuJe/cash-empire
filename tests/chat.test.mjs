import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import worker from "../worker/index.mjs";

test("global chat is public, named, rate limited, and isolated from progress",async()=>{
  const db=new DatabaseSync(":memory:");
  for(const name of ["0001_leaderboard_store","0002_google_accounts","0005_admin_moderation","0016_global_chat"])
    db.exec(readFileSync(new URL(`../migrations/${name}.sql`,import.meta.url),"utf8"));
  const now=Date.now(),token="a".repeat(43);
  const hash=Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))).toString("hex");
  db.prepare("INSERT INTO users(id,username,created_at_ms,username_set) VALUES('u1','Dot',?,1)").run(now);
  db.prepare("INSERT INTO sessions(token_hash,user_id,created_at_ms,expires_at_ms) VALUES(?,'u1',?,?)").run(hash,now,now+60000);
  const env={DB:{prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}}}}}}};
  const origin="https://clickthecash.online",cookie=`__Host-ce_session=${token}`;
  const post=(message,headers={})=>worker.fetch(new Request(origin+"/api/chat",{method:"POST",headers:{Cookie:cookie,Origin:origin,"Content-Type":"application/json",...headers},body:JSON.stringify({message})}),env);
  assert.equal((await post(" Hello  everyone ")).status,201);
  assert.equal((await post("Again")).status,429);
  assert.equal((await post("<script>alert(1)</script>",{Origin:"https://evil.example"})).status,403);
  const publicResult=await worker.fetch(new Request(origin+"/api/chat"),env);
  assert.equal(publicResult.status,200);
  assert.deepEqual((await publicResult.json()).messages.map(({username,body})=>({username,body})),[{username:"Dot",body:"Hello everyone"}]);
  db.prepare("UPDATE users SET username='NewDot' WHERE id='u1'").run();
  assert.equal((await (await worker.fetch(new Request(origin+"/api/chat"),env)).json()).messages[0].username,"NewDot");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM progress").get().count,0);
  db.close();
});
