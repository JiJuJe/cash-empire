const ROLE_LEVEL={moderator:1,admin:2,owner:3};
const ID=/^[A-Za-z0-9_-]{12,80}$/;
const KINDS=new Set(["total","click","business","luck"]);
const MAX_MS=365*86400000;
const json=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const error=(status,message)=>json({error:message},status);
const safeReason=value=>typeof value==="string"&&value.trim().length>=3&&value.trim().length<=300?value.trim():null;
const exact=(body,keys)=>Object.keys(body).every(key=>keys.includes(key));
const roleLevel=role=>ROLE_LEVEL[role]||0;
export async function adminRole(env,user){
  if(!user)return null;
  const row=await env.DB.prepare("SELECT role FROM admin_users WHERE user_id=?").bind(user.id).first();
  return row?.role||null;
}
export async function moderationFor(env,userId){
  return env.DB.prepare("SELECT suspended_until_ms,suspension_reason,banned_at_ms,ban_reason FROM moderation_state WHERE user_id=?").bind(userId).first();
}
export function moderationMessage(row,now=Date.now()){
  if(row?.banned_at_ms)return {status:"banned",message:"This account has been banned.",reason:row.ban_reason||null};
  if(Number(row?.suspended_until_ms)>now)return {status:"suspended",message:"Your account is temporarily suspended.",expiresAtMs:row.suspended_until_ms,reason:row.suspension_reason||null};
  return null;
}
export async function adminBoosts(env,userId,since=0){
  const rows=await env.DB.prepare(`SELECT id,kind,multiplier,starts_at_ms,expires_at_ms,removed_at_ms,reason
    FROM admin_boosts WHERE user_id=? AND (expires_at_ms IS NULL OR expires_at_ms>?)
    AND (removed_at_ms IS NULL OR removed_at_ms>?) ORDER BY starts_at_ms ASC`).bind(userId,since,since).all();
  return rows.results||[];
}
export function boostMultiplier(boosts,kind,at=Date.now()){
  let multiplier=1;
  for(const boost of boosts||[])if(boost.kind===kind&&boost.starts_at_ms<=at&&
    (boost.expires_at_ms===null||boost.expires_at_ms>at)&&
    (boost.removed_at_ms===null||boost.removed_at_ms>at))multiplier*=boost.multiplier;
  return Math.min(multiplier,1e12);
}
function publicBoost(row){return {id:row.id,kind:row.kind,multiplier:row.multiplier,startsAtMs:row.starts_at_ms,expiresAtMs:row.expires_at_ms,removedAtMs:row.removed_at_ms,reason:row.reason};}
function publicUser(row){return {id:row.id,username:row.username,createdAtMs:row.created_at_ms,lastSeenAtMs:row.last_seen_at_ms||null};}
async function targetUser(env,id){return env.DB.prepare("SELECT id,username,username_set,created_at_ms,last_seen_at_ms FROM users WHERE id=?").bind(id).first();}
async function targetRole(env,id){const row=await env.DB.prepare("SELECT role FROM admin_users WHERE user_id=?").bind(id).first();return row?.role||null;}
function auditStatement(env,body,actor,target,type,details,reason,now,condition="1"){
  return env.DB.prepare(`INSERT INTO admin_audit(id,actor_user_id,target_user_id,action_type,details_json,reason,created_at_ms)
    SELECT ?,?,?,?,?,?,? WHERE ${condition}`).bind(body.actionId,actor.id,target,type,JSON.stringify(details),reason,now);
}
async function readBody(request){
  if(!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json"))return null;
  if(Number(request.headers.get("Content-Length")||0)>4096)return null;
  const raw=await request.text();if(raw.length>4096)return null;
  try{const body=JSON.parse(raw);return body&&typeof body==="object"&&!Array.isArray(body)?body:null;}catch(_){return null;}
}
function expiry(body,now){
  if(body.expiresAtMs!==undefined){if(!Number.isSafeInteger(body.expiresAtMs)||body.expiresAtMs<=now||body.expiresAtMs>now+MAX_MS)return null;return body.expiresAtMs;}
  if(!Number.isSafeInteger(body.durationMinutes)||body.durationMinutes<1||body.durationMinutes>525600)return null;
  return now+body.durationMinutes*60000;
}
function safeNumber(n,max){return typeof n==="number"&&Number.isFinite(n)&&n>0&&n<=max;}
function progressReset(env,userId,version,now){
  return env.DB.prepare(`UPDATE progress SET balance=0,lifetime_cash=0,run_earned=0,rebirths=0,empire_points=0,
    empire_spent=0,total_clicks=0,last_click_ms=0,last_golden_ms=0,last_accrual_ms=?,rate_per_second=0,
    offline_cap_seconds=36000,businesses_json='{}',upgrades_json='[]',prestige_json='[]',
    playtime_ms=0,last_heartbeat_ms=0,booster_inventory_json='{}',booster_equipped_json='[]',
    booster_slots_unlocked=1,next_drop_playtime_ms=600000,pending_drop_until_ms=0,rush_until_ms=0,
    offline_efficiency=0.5,progress_epoch=progress_epoch+1,version=version+1 WHERE user_id=? AND version=?`)
    .bind(now,userId,version);
}
const RESTORE_FIELDS=["balance","lifetime_cash","run_earned","rebirths","empire_points","empire_spent","total_clicks","last_click_ms","last_accrual_ms","last_golden_ms","rate_per_second","offline_cap_seconds","businesses_json","upgrades_json","prestige_json","playtime_ms","last_heartbeat_ms","booster_inventory_json","booster_equipped_json","booster_slots_unlocked","next_drop_playtime_ms","pending_drop_until_ms","rush_until_ms","offline_efficiency"];
export async function handleAdminRequest(request,env,user,api){
  const url=new URL(request.url),path=url.pathname;
  if(!path.startsWith("/api/admin/"))return null;
  if(!user)return error(403,"Admin access required.");
  const role=await adminRole(env,user);
  if(!role)return error(403,"Admin access required.");
  if(env.ADMIN_API_LIMITER){const result=await env.ADMIN_API_LIMITER.limit({key:user.id+":"+(request.headers.get("CF-Connecting-IP")||"unknown")});if(!result.success)return error(429,"Admin requests are temporarily limited.");}
  else await api.rateLimit(env,request,"admin:"+user.id,60);
  const level=roleLevel(role),now=Date.now();
  if(request.method==="GET"){
    if(path==="/api/admin/me")return json({role});
    if(path==="/api/admin/dashboard"){
      const row=await env.DB.prepare(`SELECT (SELECT count(*) FROM users) AS players,
        (SELECT count(*) FROM moderation_state WHERE banned_at_ms IS NOT NULL) AS banned,
        (SELECT count(*) FROM moderation_state WHERE suspended_until_ms>?) AS suspended,
        (SELECT count(*) FROM admin_boosts WHERE removed_at_ms IS NULL AND (expires_at_ms IS NULL OR expires_at_ms>?)) AS active_boosts`).bind(now,now).first();
      return json(row);
    }
    if(path==="/api/admin/players"){
      const q=(url.searchParams.get("q")||"").trim();if(q.length<2||q.length>64)return error(400,"Search needs 2–64 characters.");
      const id=ID.test(q)?q:"";
      const rows=await env.DB.prepare(`SELECT id,username,created_at_ms,last_seen_at_ms FROM users
        WHERE id=? OR username_normalized=? OR username_normalized LIKE ? ESCAPE '\\'
        ORDER BY CASE WHEN id=? THEN 0 WHEN username_normalized=? THEN 1 ELSE 2 END,username LIMIT 25`)
        .bind(id,q.toLowerCase(),"%"+q.toLowerCase().replace(/[\\%_]/g,"\\$&")+"%",id,q.toLowerCase()).all();
      return json({players:(rows.results||[]).map(publicUser)});
    }
    const match=path.match(/^\/api\/admin\/players\/([A-Za-z0-9_-]{12,80})$/);
    if(match){
      const target=await targetUser(env,match[1]);if(!target)return error(404,"Player not found.");
      const row=await env.DB.prepare("SELECT * FROM progress WHERE user_id=?").bind(target.id).first();
      const boosts=await adminBoosts(env,target.id,row?.last_accrual_ms||now);
      const active=boosts.filter(b=>!b.removed_at_ms&&(b.expires_at_ms===null||b.expires_at_ms>now));
      const moderation=await moderationFor(env,target.id);
      const entitlement=await api.hasDoubleMoney(env,target.id);
      const slots=await api.premiumSlots(env,target.id);
      let progress=null;
      if(row){const state=api.loadProgress(row);state.adminEffects=boosts;api.advance(state,now,entitlement);progress=api.progressSummary(state,entitlement);}
      const player=publicUser(target);player.lastSeenAtMs=Math.max(player.lastSeenAtMs||0,row?.last_accrual_ms||0)||null;
      return json({player,progress,moderation:moderationMessage(moderation,now)||{status:"active"},boosts:active.map(publicBoost),paidEntitlements:{doubleMoney:entitlement,premiumSlots:slots}});
    }
    if(path==="/api/admin/audit"){
      const auditFilter=level===3?"":"WHERE a.actor_user_id=?";
      const rows=await env.DB.prepare(`SELECT a.id,a.actor_user_id,a.target_user_id,a.action_type,a.details_json,a.reason,a.created_at_ms,
        u.username AS actor_username FROM admin_audit a JOIN users u ON u.id=a.actor_user_id ${auditFilter} ORDER BY a.created_at_ms DESC LIMIT 100`)
        .bind(...(level===3?[]:[user.id])).all();
      return json({entries:(rows.results||[]).map(r=>({id:r.id,actorUserId:r.actor_user_id,actorUsername:r.actor_username,targetUserId:r.target_user_id,type:r.action_type,details:JSON.parse(r.details_json),reason:r.reason,createdAtMs:r.created_at_ms}))});
    }
    if(path==="/api/admin/roles"&&level===3){const rows=await env.DB.prepare("SELECT a.user_id,a.role,u.username FROM admin_users a JOIN users u ON u.id=a.user_id ORDER BY a.created_at_ms").all();return json({roles:rows.results||[]});}
    return error(404,"Not found.");
  }
  if(request.method!=="POST"||path!=="/api/admin/actions")return error(404,"Not found.");
  if(request.headers.get("Origin")!==url.origin)return error(403,"Invalid request origin.");
  const body=await readBody(request);
  if(!body||!ID.test(body.actionId)||!ID.test(body.targetUserId)||typeof body.type!=="string")return error(400,"Invalid admin action.");
  const schemas={
    GRANT_MONEY:["actionId","targetUserId","type","amount","countTowardEarnings","reason"],
    ADD_TEMP_BOOST:["actionId","targetUserId","type","kind","multiplier","durationMinutes","expiresAtMs","reason"],
    ADD_PERMANENT_BOOST:["actionId","targetUserId","type","kind","multiplier","reason"],
    REMOVE_BOOST:["actionId","targetUserId","type","boostId","reason"],
    TIMEOUT:["actionId","targetUserId","type","durationMinutes","expiresAtMs","reason"],
    REMOVE_TIMEOUT:["actionId","targetUserId","type","reason"],
    BAN:["actionId","targetUserId","type","reason","note"],
    UNBAN:["actionId","targetUserId","type","reason"],
    MODERATE_USERNAME:["actionId","targetUserId","type","reason"],
    RESET_PROGRESS:["actionId","targetUserId","type","reason","typedConfirmation","finalConfirm"],
    RESTORE_PROGRESS:["actionId","targetUserId","type","reason","typedConfirmation","finalConfirm"],
    SET_ROLE:["actionId","targetUserId","type","role","reason"]
  };
  const required={GRANT_MONEY:2,ADD_TEMP_BOOST:2,ADD_PERMANENT_BOOST:3,REMOVE_BOOST:2,TIMEOUT:1,REMOVE_TIMEOUT:1,BAN:2,UNBAN:2,MODERATE_USERNAME:1,RESET_PROGRESS:3,RESTORE_PROGRESS:3,SET_ROLE:3};
  if(!schemas[body.type]||!exact(body,schemas[body.type])||level<required[body.type])return error(403,"Action not permitted.");
  const reason=safeReason(body.reason);
  if(!reason)return error(400,"A reason of 3–300 characters is required.");
  const target=await targetUser(env,body.targetUserId);
  if(!target)return error(404,"Player not found.");
  const otherRole=await targetRole(env,target.id);
  if(body.type!=="SET_ROLE"&&otherRole&&level<=roleLevel(otherRole))return error(403,"Cannot moderate a peer or higher role.");
  if(target.id===user.id)return error(403,"Cannot change your own account with admin actions.");
  const prior=await env.DB.prepare("SELECT action_type FROM admin_audit WHERE id=?").bind(body.actionId).first();
  if(prior)return prior.action_type===body.type?json({ok:true,duplicate:true}):error(409,"Action ID conflict.");
  const audit=(details,condition="1")=>auditStatement(env,body,user,target.id,body.type,details,reason,now,condition);
  try{
    if(body.type==="GRANT_MONEY"){
      if(!safeNumber(body.amount,1e300)||typeof body.countTowardEarnings!=="boolean")return error(400,"Invalid grant.");
      const row=await env.DB.prepare("SELECT * FROM progress WHERE user_id=?").bind(target.id).first();
      if(!row)return error(409,"Player has no cloud progress yet.");
      const current=api.loadProgress(row),entitled=await api.hasDoubleMoney(env,target.id);
      current.adminEffects=await adminBoosts(env,target.id,current.lastAccrualMs);api.advance(current,now,entitled);
      if(current.balance+body.amount>1e300||body.countTowardEarnings&&(current.lifetime+body.amount>1e300||current.runEarned+body.amount>1e300))return error(400,"Grant exceeds the game limit.");
      current.balance+=body.amount;
      if(body.countTowardEarnings){current.lifetime+=body.amount;current.runEarned+=body.amount;}
      const result=await env.DB.batch([api.updateStatement(env,current,row.version,entitled),audit({amount:body.amount,countTowardEarnings:body.countTowardEarnings},"changes()=1")]);
      if(result[0].meta?.changes!==1)return error(409,"Progress changed. Retry with a new action ID.");
    }else if(body.type==="RESET_PROGRESS"){
      if(body.typedConfirmation!=="RESET "+target.username||body.finalConfirm!==true)return error(400,"Reset confirmation does not match.");
      const row=await env.DB.prepare("SELECT * FROM progress WHERE user_id=?").bind(target.id).first();if(!row)return error(409,"Player has no cloud progress.");
      const snapshotId=crypto.randomUUID();
      const result=await env.DB.batch([progressReset(env,target.id,row.version,now),
        env.DB.prepare("INSERT INTO admin_progress_snapshots(id,user_id,created_at_ms,created_by,reason,progress_json) SELECT ?,?,?,?,?,? WHERE changes()=1")
          .bind(snapshotId,target.id,now,user.id,reason,JSON.stringify(row)),
        audit({snapshotId,previousVersion:row.version},"changes()=1")]);
      if(result[0].meta?.changes!==1)return error(409,"Progress changed. Retry with a new action ID.");
    }else if(body.type==="RESTORE_PROGRESS"){
      if(body.typedConfirmation!=="RESTORE "+target.username||body.finalConfirm!==true)return error(400,"Restore confirmation does not match.");
      const snapshot=await env.DB.prepare("SELECT * FROM admin_progress_snapshots WHERE user_id=? ORDER BY created_at_ms DESC LIMIT 1").bind(target.id).first();
      const row=await env.DB.prepare("SELECT version FROM progress WHERE user_id=?").bind(target.id).first();
      if(!snapshot||!row)return error(404,"No recovery snapshot.");
      const old=JSON.parse(snapshot.progress_json);
      const statement=env.DB.prepare("UPDATE progress SET "+RESTORE_FIELDS.map(k=>k+"=?").join(",")+",progress_epoch=progress_epoch+1,version=version+1 WHERE user_id=? AND version=?")
        .bind(...RESTORE_FIELDS.map(k=>k==="last_accrual_ms"?now:k==="last_heartbeat_ms"?0:old[k]),target.id,row.version);
      const result=await env.DB.batch([statement,audit({snapshotId:snapshot.id},"changes()=1")]);
      if(result[0].meta?.changes!==1)return error(409,"Progress changed. Retry with a new action ID.");
    }else if(body.type==="ADD_TEMP_BOOST"||body.type==="ADD_PERMANENT_BOOST"){
      if(!KINDS.has(body.kind)||!safeNumber(body.multiplier,100)||body.multiplier<=1)return error(400,"Invalid boost.");
      const expires=body.type==="ADD_TEMP_BOOST"?expiry(body,now):null;
      if(body.type==="ADD_TEMP_BOOST"&&!expires)return error(400,"Invalid boost expiry.");
      const id=crypto.randomUUID();
      await env.DB.batch([env.DB.prepare("INSERT INTO admin_boosts(id,user_id,kind,multiplier,starts_at_ms,expires_at_ms,created_by,reason) VALUES(?,?,?,?,?,?,?,?)")
        .bind(id,target.id,body.kind,body.multiplier,now,expires,user.id,reason),audit({boostId:id,kind:body.kind,multiplier:body.multiplier,expiresAtMs:expires})]);
    }else if(body.type==="REMOVE_BOOST"){
      if(!ID.test(body.boostId))return error(400,"Invalid boost ID.");
      const boost=await env.DB.prepare("SELECT * FROM admin_boosts WHERE id=? AND user_id=? AND removed_at_ms IS NULL").bind(body.boostId,target.id).first();
      if(!boost)return error(404,"Active boost not found.");
      if(boost.expires_at_ms===null&&level<3)return error(403,"Only owner can remove permanent boosts.");
      const result=await env.DB.batch([env.DB.prepare("UPDATE admin_boosts SET removed_at_ms=?,removed_by=? WHERE id=? AND removed_at_ms IS NULL")
        .bind(now,user.id,body.boostId),audit({boostId:body.boostId},"changes()=1")]);
      if(result[0].meta?.changes!==1)return error(409,"Boost already removed.");
    }else if(body.type==="TIMEOUT"||body.type==="REMOVE_TIMEOUT"||body.type==="BAN"||body.type==="UNBAN"){
      const until=body.type==="TIMEOUT"?expiry(body,now):0;
      if(body.type==="TIMEOUT"&&!until)return error(400,"Invalid suspension expiry.");
      const old=await moderationFor(env,target.id);
      if(body.type==="UNBAN"&&!old?.banned_at_ms)return error(409,"Account is not banned.");
      if(body.type==="REMOVE_TIMEOUT"&&!(old?.suspended_until_ms>now))return error(409,"No active timeout.");
      if(body.type==="BAN"&&body.note!==undefined&&(typeof body.note!=="string"||body.note.length>500))return error(400,"Invalid internal note.");
      const statements=[env.DB.prepare("INSERT OR IGNORE INTO moderation_state(user_id,updated_at_ms) VALUES(?,?)").bind(target.id,now)];
      if(body.type==="TIMEOUT")statements.push(env.DB.prepare("UPDATE moderation_state SET suspended_until_ms=?,suspension_reason=?,updated_at_ms=? WHERE user_id=?").bind(until,reason,now,target.id));
      if(body.type==="REMOVE_TIMEOUT")statements.push(env.DB.prepare("UPDATE moderation_state SET suspended_until_ms=0,suspension_reason=NULL,updated_at_ms=? WHERE user_id=?").bind(now,target.id));
      if(body.type==="BAN")statements.push(env.DB.prepare("UPDATE moderation_state SET banned_at_ms=?,banned_by=?,ban_reason=?,ban_note=?,updated_at_ms=? WHERE user_id=?").bind(now,user.id,reason,body.note||null,now,target.id),env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(target.id));
      if(body.type==="UNBAN")statements.push(env.DB.prepare("UPDATE moderation_state SET banned_at_ms=NULL,banned_by=NULL,ban_reason=NULL,ban_note=NULL,updated_at_ms=? WHERE user_id=?").bind(now,target.id));
      statements.push(audit({expiresAtMs:until||null}));await env.DB.batch(statements);
    }else if(body.type==="MODERATE_USERNAME"){
      let name;for(let attempt=0;attempt<5;attempt++){const candidate="Player_"+crypto.randomUUID().replace(/-/g,"").slice(0,12);const used=await env.DB.prepare("SELECT 1 AS used FROM users WHERE username_normalized=?").bind(candidate.toLowerCase()).first();if(!used){name=candidate;break;}}
      if(!name)return error(409,"Could not reserve a neutral username.");
      await env.DB.batch([env.DB.prepare("UPDATE users SET username=?,username_normalized=?,username_set=1 WHERE id=?")
        .bind(name,name.toLowerCase(),target.id),audit({oldUsername:target.username,newUsername:name})]);
    }else if(body.type==="SET_ROLE"){
      if(target.id===user.id||otherRole==="owner"||!["admin","moderator",null].includes(body.role))return error(403,"Invalid role change.");
      const statement=body.role===null?env.DB.prepare("DELETE FROM admin_users WHERE user_id=?").bind(target.id):
        env.DB.prepare("INSERT INTO admin_users(user_id,role,created_at_ms,created_by) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role")
          .bind(target.id,body.role,now,user.id);
      await env.DB.batch([statement,audit({oldRole:otherRole,newRole:body.role})]);
    }
    return json({ok:true});
  }catch(err){
    if(String(err.message||"").includes("UNIQUE constraint failed"))return error(409,"Duplicate or conflicting admin action.");
    console.error("Admin action failed",err);return error(503,"Admin action could not be completed.");
  }
}
