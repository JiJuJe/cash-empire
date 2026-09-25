const encoder=new TextEncoder();
const DAY=86400000;
const SESSION_MS=30*DAY;
const FLOW_MS=10*60000;
const PROD="https://clickthecash.online";
const RESERVED=new Set(["admin","administrator","mod","moderator","owner","developer","support","system","official","clickthecash","cloudflare","staff","helpdesk","security","google","stripe"]);
const BLOCKED=[
  "badword","fuck","fucking","shit","bitch","cunt","dick","pussy","porn","sex","nude",
  "rape","rapist","kill","murder","terror","nazi","hitler","racist","scam","phish",
  "fraud","giveaway","freecash","free_money","password","creditcard","suicide",
  "nigger","faggot","retard","whitepower","heil","isis","pedo","childporn","groomer","bombthreat"
];
const json=(value,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const bytesToHex=a=>Array.from(a,b=>b.toString(16).padStart(2,"0")).join("");
const base64url=a=>btoa(String.fromCharCode(...a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const randomToken=()=>base64url(crypto.getRandomValues(new Uint8Array(32)));
const digest=async value=>bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(value))));
function siteUrl(env){
  const url=new URL(env.PUBLIC_SITE_URL||PROD);
  if(url.protocol!=="https:"&&url.hostname!=="localhost"&&url.hostname!=="127.0.0.1")throw Error("Invalid site origin");
  return url.origin;
}
function cookieValue(request,name){
  return (request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1)||null;
}
function sessionCookie(request,token,maxAge){
  const secure=new URL(request.url).protocol==="https:";
  return `${secure?"__Host-ce_session":"ce_dev_session"}=${token}; Path=/; HttpOnly; SameSite=Lax${secure?"; Secure":""}; Max-Age=${maxAge}`;
}
function flowCookie(request,token,maxAge){
  const secure=new URL(request.url).protocol==="https:"?"; Secure":"";
  return `ce_oauth_flow=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}
function sameOrigin(request){
  if(request.headers.get("Origin")!==new URL(request.url).origin)return false;
  const type=request.headers.get("Content-Type")||"";
  return type.toLowerCase().startsWith("application/json");
}
async function bodyJson(request){
  if(Number(request.headers.get("Content-Length")||0)>1024)throw Error("Request too large");
  const raw=await request.text();
  if(raw.length>1024)throw Error("Request too large");
  return JSON.parse(raw);
}
async function hmac(secret,message){
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(message))));
}
function equal(a,b){
  if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;
  let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);
  return n===0;
}
function decode64(v){
  if(!/^[A-Za-z0-9_-]+$/.test(v))throw Error("Invalid token");
  const s=atob(v.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-v.length%4)%4));
  return Uint8Array.from(s,c=>c.charCodeAt(0));
}
function decodeJson64(v){return JSON.parse(new TextDecoder().decode(decode64(v)));}
function moderationKey(value){
  return value.toLowerCase().replace(/[013457@$!|]/g,c=>({0:"o",1:"i",3:"e",4:"a",5:"s",7:"t","@":"a","$":"s","!":"i","|":"i"}[c]))
    .replace(/[^a-z]/g,"").replace(/(.)\1{2,}/g,"$1");
}
export function validateUsername(input){
  if(typeof input!=="string")return {ok:false,message:"Invalid characters"};
  const value=input.normalize("NFKC");
  if(/[\p{Cc}\p{Cf}\p{Z}\s]/u.test(value))return {ok:false,message:"Invalid characters"};
  if(value.length<3)return {ok:false,message:"Username too short"};
  if(value.length>20)return {ok:false,message:"Username too long"};
  if(!/^[A-Za-z0-9_]+$/.test(value))return {ok:false,message:"Invalid characters"};
  const normalized=value.toLowerCase();
  const skeleton=moderationKey(value);
  if(/k{3,}/.test(normalized)||RESERVED.has(normalized)||RESERVED.has(skeleton)||[...RESERVED].some(x=>skeleton.startsWith(x))||
     BLOCKED.some(x=>skeleton.includes(moderationKey(x))))return {ok:false,message:"That username is not allowed"};
  return {ok:true,username:value,normalized};
}
async function throttle(env,request,key,max=15){
  const ip=request.headers.get("CF-Connecting-IP")||"unknown";
  const start=Math.floor(Date.now()/60000)*60000;
  await env.DB.prepare(`INSERT INTO api_rate_limits(key,window_start_ms,count) VALUES(?,?,1)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start_ms=excluded.window_start_ms THEN count+1 ELSE 1 END,window_start_ms=excluded.window_start_ms`)
    .bind(key+":"+ip,start).run();
  const row=await env.DB.prepare("SELECT count FROM api_rate_limits WHERE key=?").bind(key+":"+ip).first();
  return row.count<=max;
}
export async function readSession(request,env){
  if(!env.DB)return null;
  const token=cookieValue(request,new URL(request.url).protocol==="https:"?"__Host-ce_session":"ce_dev_session");
  if(!token||!/^[A-Za-z0-9_-]{40,60}$/.test(token))return null;
  const row=await env.DB.prepare(`SELECT u.id,u.username,u.username_set,s.expires_at_ms
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`).bind(await digest(token)).first();
  return row&&row.expires_at_ms>Date.now()?row:null;
}
async function verifyGoogleIdToken(token,env,nonce){
  if(typeof token!=="string"||token.length>10000)throw Error("Invalid ID token");
  const parts=token.split(".");
  if(parts.length!==3)throw Error("Invalid ID token");
  const header=decodeJson64(parts[0]),claims=decodeJson64(parts[1]);
  if(header.alg!=="RS256"||typeof header.kid!=="string")throw Error("Invalid signing algorithm");
  const certs=await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if(!certs.ok)throw Error("Google key service unavailable");
  const jwks=await certs.json();
  const jwk=jwks.keys?.find(k=>k.kid===header.kid&&k.kty==="RSA"&&k.use==="sig");
  if(!jwk)throw Error("Unknown Google key");
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode64(parts[2]),encoder.encode(parts[0]+"."+parts[1]));
  const now=Math.floor(Date.now()/1000);
  if(!valid||!["https://accounts.google.com","accounts.google.com"].includes(claims.iss)||
     claims.aud!==env.GOOGLE_CLIENT_ID||claims.nonce!==nonce||!Number.isInteger(claims.exp)||claims.exp<=now||
     !Number.isInteger(claims.iat)||claims.iat>now+60||typeof claims.sub!=="string"||claims.sub.length<3||claims.sub.length>255)
    throw Error("Invalid Google identity");
  return claims.sub;
}
async function googleStart(request,env){
  if(!env.DB||!env.SESSION_SECRET||!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET)return json({error:"Google sign in is not configured."},503);
  if(!await throttle(env,request,"google-start",12))return json({error:"Try again shortly."},429);
  const state=randomToken(),nonce=randomToken(),verifier=randomToken(),iat=Date.now();
  const flow=base64url(encoder.encode(JSON.stringify({state,nonce,verifier,iat})));
  const signed=flow+"."+await hmac(env.SESSION_SECRET,flow);
  const redirect=siteUrl(env)+"/api/auth/google/callback";
  const challenge=base64url(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(verifier))));
  const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
  for(const [key,value] of Object.entries({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:redirect,response_type:"code",scope:"openid email",state,nonce,code_challenge:challenge,code_challenge_method:"S256",prompt:"select_account"}))url.searchParams.set(key,value);
  return new Response(null,{status:302,headers:{Location:url.href,"Set-Cookie":flowCookie(request,signed,600),"Cache-Control":"no-store"}});
}
async function googleCallback(request,env){
  const url=new URL(request.url),cookie=cookieValue(request,"ce_oauth_flow");
  if(!cookie||!env.SESSION_SECRET)return json({error:"Sign in expired. Please try again."},400);
  const [flow,sig]=cookie.split(".");
  if(!flow||!sig||!equal(sig,await hmac(env.SESSION_SECRET,flow)))return json({error:"Sign in expired. Please try again."},400);
  let claims;
  try{claims=decodeJson64(flow);}catch(_){return json({error:"Sign in expired. Please try again."},400);}
  if(!equal(claims.state,url.searchParams.get("state"))||Date.now()-claims.iat>FLOW_MS||Date.now()<claims.iat||
     typeof claims.verifier!=="string"||typeof claims.nonce!=="string")return json({error:"Sign in expired. Please try again."},400);
  const code=url.searchParams.get("code");
  if(!code||code.length>4096)return json({error:"Sign in was cancelled."},400);
  const redirect=siteUrl(env)+"/api/auth/google/callback";
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:redirect,grant_type:"authorization_code",code_verifier:claims.verifier})});
  if(!response.ok)return json({error:"Google sign in could not be completed."},502);
  const token=await response.json();
  const subject=await verifyGoogleIdToken(token.id_token,env,claims.nonce);
  let user=await env.DB.prepare("SELECT id FROM users WHERE google_subject=?").bind(subject).first();
  const now=Date.now();
  if(!user){
    const id=crypto.randomUUID(),placeholder="pending_"+id.slice(0,12);
    try{await env.DB.prepare("INSERT INTO users(id,username,created_at_ms,google_subject,username_set,last_seen_at_ms) VALUES(?,?,?,?,0,?)")
      .bind(id,placeholder,now,subject,now).run();user={id};}
    catch(_){user=await env.DB.prepare("SELECT id FROM users WHERE google_subject=?").bind(subject).first();}
  }
  if(!user)throw Error("Account creation failed");
  await env.DB.prepare("UPDATE users SET last_seen_at_ms=? WHERE id=?").bind(now,user.id).run();
  const session=randomToken();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at_ms < ?").bind(now).run();
  await env.DB.prepare("INSERT INTO sessions(token_hash,user_id,created_at_ms,expires_at_ms) VALUES(?,?,?,?)")
    .bind(await digest(session),user.id,now,now+SESSION_MS).run();
  const headers=new Headers({Location:siteUrl(env)+"/?signed_in=1","Cache-Control":"no-store"});
  headers.append("Set-Cookie",sessionCookie(request,session,Math.floor(SESSION_MS/1000)));
  headers.append("Set-Cookie",flowCookie(request,"",0));
  return new Response(null,{status:302,headers});
}
async function usernameRoute(request,env,user,checkOnly){
  if(!user)return json({error:"Sign in required."},401);
  if(!sameOrigin(request))return json({error:"Invalid request origin."},403);
  if(!await throttle(env,request,(checkOnly?"username-check:":"username-set:")+user.id,checkOnly?60:8))return json({error:"Try again shortly."},429);
  let body;
  try{body=await bodyJson(request);}catch(_){return json({error:"Invalid request."},400);}
  if(!body||Object.keys(body).length!==1||!Object.hasOwn(body,"username"))return json({error:"Invalid request."},400);
  const result=validateUsername(body.username);
  if(!result.ok)return json({available:false,message:result.message},checkOnly?200:400);
  const match=await env.DB.prepare("SELECT id FROM users WHERE username_normalized=?").bind(result.normalized).first();
  if(match&&match.id!==user.id)return json({available:false,message:"Username already taken"},checkOnly?200:409);
  if(checkOnly)return json({available:true,message:"Username available"});
  if(user.username_set)return json({error:"Username already chosen."},409);
  try{await env.DB.prepare("UPDATE users SET username=?,username_normalized=?,username_set=1 WHERE id=? AND username_set=0")
    .bind(result.username,result.normalized,user.id).run();}
  catch(_){return json({available:false,message:"Username already taken"},409);}
  return json({username:result.username});
}
export async function handleAuthRequest(request,env){
  const path=new URL(request.url).pathname;
  if(path==="/api/auth/google/start"&&request.method==="GET")return googleStart(request,env);
  if(path==="/api/auth/google/callback"&&request.method==="GET")return googleCallback(request,env);
  if(path==="/api/account"&&request.method==="GET"){
    const user=await readSession(request,env);
    return json({authenticated:Boolean(user),username:user?.username_set?user.username:null,needsUsername:Boolean(user&&!user.username_set)});
  }
  if(path==="/api/auth/signout"&&request.method==="POST"){
    if(!sameOrigin(request))return json({error:"Invalid request origin."},403);
    const token=cookieValue(request,new URL(request.url).protocol==="https:"?"__Host-ce_session":"ce_dev_session");
    if(token)await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(token)).run();
    return new Response(JSON.stringify({signedOut:true}),{headers:{"Content-Type":"application/json","Set-Cookie":sessionCookie(request,"",0),"Cache-Control":"no-store"}});
  }
  if(path==="/api/username/check"&&request.method==="POST")return usernameRoute(request,env,await readSession(request,env),true);
  if(path==="/api/username"&&request.method==="POST")return usernameRoute(request,env,await readSession(request,env),false);
  return null;
}
export const authTesting={moderationKey,verifyGoogleIdToken};
