import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const assetRoot=fileURLToPath(new URL('../site-assets/',import.meta.url));
const guild='1541287033337675826',adminRole='1541289675862573206';
const defaults=['open','available','available','delivering','available','open'];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.json':'application/json; charset=utf-8'};
const publicAssets=new Set(['/style.css','/login.js','/assets/logo.webp','/assets/banner.webp','/assets/nox-atmosphere.svg','/assets/cairo.ttf']);
const security={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' https://cdn.discordapp.com; frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
export function createApp({redis,discordFetch=(...args)=>fetch(...args)}){
 return async function handle(request){
  const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{...security,'Content-Type':'application/json; charset=utf-8'}});
  const redirect=(target,cookies=[])=>{const headers=new Headers({...security,Location:target});for(const cookie of cookies)headers.append('Set-Cookie',cookie);return new Response(null,{status:302,headers});};
  const url=new URL(request.url),route=url.pathname;
  const origin=(process.env.PUBLIC_URL||'').replace(/\/$/,'');
  if(!/^https:\/\/[^/]+$/.test(origin))return json(503,{error:'Set PUBLIC_URL to the production HTTPS address in Vercel Settings.'});
  const key=value=>(process.env.REDIS_PREFIX||'nox:production:')+value;
  const cookie=(name)=>request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';
  const ready=Boolean(process.env.DISCORD_CLIENT_ID&&process.env.DISCORD_CLIENT_SECRET);
  const clearState=state=>`oauth_${state}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
  const authError=(reason,state)=>redirect('/login?error='+reason,state?[clearState(state)]:[]);
  const discord=async(endpoint,authorization)=>discordFetch('https://discord.com/api/v10'+endpoint,{headers:{Authorization:authorization},signal:AbortSignal.timeout(8000)});
  async function currentMembership(profile){
   if(!profile||!/^\d{17,20}$/.test(profile.userId)||!process.env.DISCORD_BOT_TOKEN)return {admin:false,roles:[],unavailable:true};
   try{const r=await discord('/guilds/'+guild+'/members/'+profile.userId,'Bot '+process.env.DISCORD_BOT_TOKEN);if(r.status===404)return {admin:false,roles:[]};if(!r.ok)throw Error();const member=await r.json();if(member.user?.id!==profile.userId||!Array.isArray(member.roles)||member.roles.some(v=>typeof v!=='string'))throw Error();return {admin:member.roles.includes(adminRole),roles:member.roles};}catch{return {admin:false,roles:[],unavailable:true};}
  }
  async function highestRole(ids){
   if(!ids.length||!process.env.DISCORD_BOT_TOKEN)return null;
   try{let roles=JSON.parse(await redis('GET',key('roles'))||'null');if(!roles){const r=await discord('/guilds/'+guild+'/roles','Bot '+process.env.DISCORD_BOT_TOKEN);if(!r.ok)return null;roles=await r.json();if(!Array.isArray(roles))return null;await redis('SET',key('roles'),JSON.stringify(roles),'EX',60);}const r=roles.filter(r=>r.id!==guild&&ids.includes(r.id)).sort((a,b)=>b.position-a.position||(BigInt(a.id)<BigInt(b.id)?-1:1))[0];if(!r)return null;const color=r.colors?.primary_color||r.color||0;return {id:r.id,name:r.name,color:color?'#'+Number(color).toString(16).padStart(6,'0'):'#b8c8bc'};}catch{return null;}
  }
  try{
   if(url.origin!==origin&&request.method==='GET')return redirect(origin+route+url.search);
   if(['POST','PUT','DELETE'].includes(request.method)&&request.headers.get('origin')!==origin)return json(403,{error:'Invalid origin'});
   if(route==='/api/login')return json(403,{error:'Local administrator login is disabled on cloud hosting'});
   // Login artwork is public; all store HTML and product assets remain authenticated.
   if(request.method==='GET'&&(route==='/login'||publicAssets.has(route))){
    const relative=route==='/login'?'login.html':route.slice(1);
    const data=await readFile(path.join(assetRoot,relative));return new Response(data,{headers:{...security,'Content-Type':mime[path.extname(relative)]||'application/octet-stream'}});
   }
   if(route==='/auth/discord'&&request.method==='GET'){
    if(!ready)return authError('discord');
    const state=randomBytes(24).toString('hex');await redis('SET',key('oauth:'+state),'1','EX',600);
    const query=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,redirect_uri:origin+'/auth/callback',response_type:'code',scope:'identify guilds.members.read',state});
    return redirect('https://discord.com/oauth2/authorize?'+query,[`oauth_${state}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`]);
   }
   if(route==='/auth/callback'&&request.method==='GET'){
    const state=url.searchParams.get('state');if(!state||!/^[a-f0-9]{48}$/.test(state)||cookie('oauth_'+state)!==state)return authError('expired');
    if(await redis('GETDEL',key('oauth:'+state))!=='1')return authError('expired',state);
    if(url.searchParams.has('error'))return authError('cancelled',state);
    if(url.searchParams.get('iss')&&url.searchParams.get('iss')!=='https://discord.com')return authError('expired',state);
    const code=url.searchParams.get('code');if(!code||!ready)return authError('discord',state);
    const tokenResponse=await discordFetch('https://discord.com/api/oauth2/token',{method:'POST',body:new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:origin+'/auth/callback'}),signal:AbortSignal.timeout(8000)});
    if(!tokenResponse.ok)return authError('discord',state);const token=await tokenResponse.json();
    const userResponse=await discord('/users/@me','Bearer '+token.access_token);if(!userResponse.ok)return authError('discord',state);const user=await userResponse.json();if(!/^\d{17,20}$/.test(user.id))return authError('discord',state);
    const avatar=user.avatar?`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_')?'gif':'png'}?size=128`:`https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id)>>22n)%6n)}.png`;
    const sid=randomBytes(32).toString('hex');await redis('SET',key('session:'+sid),JSON.stringify({userId:user.id,name:user.global_name||user.username,avatar}),'EX',28800);
    return redirect('/',[clearState(state),`sid=${sid}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`]);
   }
   const sid=cookie('sid');const profile=/^[a-f0-9]{64}$/.test(sid)?JSON.parse(await redis('GET',key('session:'+sid))||'null'):null;
   if(route==='/api/me'){
    const membership=profile?await currentMembership(profile):{admin:false,roles:[]};return json(200,{user:profile?.name||null,avatar:profile?.avatar||null,admin:membership.admin,role:profile?await highestRole(membership.roles):null,local:false,discord:ready});
   }
   if(!profile)return route.startsWith('/api/')?json(401,{error:'Sign in required'}):redirect('/login');
   if(route==='/api/logout'&&request.method==='POST'){await redis('DEL',key('session:'+sid));return new Response(JSON.stringify({ok:true}),{headers:{...security,'Content-Type':'application/json','Set-Cookie':'sid=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'}});}
   if(route==='/api/status'&&request.method==='GET')return json(200,{statuses:JSON.parse(await redis('GET',key('statuses'))||'null')||defaults});
   if(route==='/api/status'&&request.method==='PUT'){
    if(Number(request.headers.get('content-length'))>4096)return json(413,{error:'Request too large'});const text=await request.text();if(text.length>4096)return json(413,{error:'Request too large'});let data;try{data=JSON.parse(text);}catch{return json(400,{error:'Invalid JSON'});}
    if(!Array.isArray(data.statuses)||data.statuses.length!==6||data.statuses.some(v=>!['open','available','delivering','closed','maintenance'].includes(v)))return json(400,{error:'Invalid statuses'});
    const membership=await currentMembership(profile);if(!membership.admin)return json(membership.unavailable?503:403,{error:membership.unavailable?'Unable to verify Discord permissions; no changes saved':'Administrator role required'});
    await redis('SET',key('statuses'),JSON.stringify(data.statuses));return json(200,{ok:true});
   }
   if(route==='/api/members'&&request.method==='GET'){
    const cached=await redis('GET',key('member-count'));if(cached)return json(200,JSON.parse(cached));
    const r=await discordFetch('https://discord.com/api/v10/invites/cfw0?with_counts=true',{signal:AbortSignal.timeout(8000)});if(!r.ok)return json(503,{error:'Discord count unavailable'});const d=await r.json();if(d.guild?.id!==guild||!Number.isInteger(d.approximate_member_count)||!Number.isInteger(d.approximate_presence_count))return json(503,{error:'Discord count unavailable'});
    const counts={members:d.approximate_member_count,online:d.approximate_presence_count,updatedAt:new Date().toISOString(),approximate:true,stale:false};await redis('SET',key('member-count'),JSON.stringify(counts),'EX',60);return json(200,counts);
   }
   if(route.startsWith('/api/')||request.method!=='GET')return json(404,{error:'Not found'});
   const relative=route==='/'?'index.html':decodeURIComponent(route).replace(/^\//,'');const file=path.resolve(assetRoot,relative);
   if(!file.startsWith(assetRoot)||relative.includes('..')||relative.includes('\\'))return json(403,{error:'Forbidden'});
   try{const data=await readFile(file);return new Response(data,{headers:{...security,'Content-Type':mime[path.extname(file)]||'application/octet-stream'}});}catch{return json(404,{error:'Not found'});}
  }catch{return route.startsWith('/auth/')?authError('connection'):json(503,{error:'Service unavailable. Check storage and Discord configuration.'});}
 };
}
