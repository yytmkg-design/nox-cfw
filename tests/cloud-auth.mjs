import assert from 'node:assert/strict';
import {createApp} from '../lib/app.mjs';
const memory=new Map();let now=0;
const redis=async(command,key,value,...args)=>{
 if(memory.get(key)?.expires<=now)memory.delete(key);
 if(command==='GET')return memory.get(key)?.value??null;
 if(command==='GETDEL'){const result=memory.get(key)?.value??null;memory.delete(key);return result;}
 if(command==='DEL'){memory.delete(key);return 1;}
 if(command==='SET'){const index=args.indexOf('EX');memory.set(key,{value,expires:index>=0?now+Number(args[index+1])*1000:Infinity});return 'OK';}
 throw Error('Unknown command');
};
Object.assign(process.env,{PUBLIC_URL:'https://nox.example',DISCORD_CLIENT_ID:'test',DISCORD_CLIENT_SECRET:'test',DISCORD_BOT_TOKEN:'test',REDIS_PREFIX:'test:'});
const id='123456789012345678',role='1541289675862573206';let mode='admin';
const answer=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
const discordFetch=async url=>{
 if(url.endsWith('/token'))return answer(200,{access_token:'test'});
 if(url.endsWith('/users/@me'))return answer(200,{id,username:'Test',avatar:null});
 if(url.endsWith('/members/'+id)){
  if(mode==='outage')throw Error('Timeout');
  if(mode==='left')return answer(404,{});
  return answer(200,{user:{id},roles:mode==='admin'?[role]:[]});
 }
 if(url.endsWith('/roles'))return answer(200,[{id:role,name:'Co Owner',position:5,color:65280}]);
 throw Error('Unexpected Discord request');
};
const app1=createApp({redis,discordFetch}),app2=createApp({redis,discordFetch});
const req=(url,method='GET',cookie='',body)=>new Request('https://nox.example'+url,{method,headers:{origin:'https://nox.example',cookie},...(body?{body:JSON.stringify(body)}:{})});
assert.equal((await app1(req('/'))).headers.get('location'),'/login');
assert.equal((await app1(req('/login'))).status,200);
assert.equal((await app1(req('/assets/nox-atmosphere.svg'))).status,200);
assert.equal((await app1(req('/site-assets/index.html'))).headers.get('location'),'/login');
const start=await app1(req('/auth/discord'));const state=new URL(start.headers.get('location')).searchParams.get('state');const oauth=start.headers.get('set-cookie').split(';')[0];
const callback='/auth/callback?code=test&state='+state;
const finish=await app2(req(callback,'GET',oauth));assert.equal(finish.headers.get('location'),'/');
const cookies=finish.headers.getSetCookie();const session=cookies.find(c=>c.startsWith('sid=')).split(';')[0];
assert.equal((await app1(req(callback,'GET',oauth))).headers.get('location'),'/login?error=expired');
assert.equal((await app1(req('/'))).headers.get('location'),'/login');
assert.equal((await app1(req('/','GET',session))).status,200);
const me=await (await app1(req('/api/me','GET',session))).json();assert.equal(me.admin,true);assert.equal(me.role.name,'Co Owner');
const data={statuses:['closed','available','available','delivering','available','open']};
assert.equal((await app2(req('/api/status','PUT',session,data))).status,200);
assert.deepEqual((await (await app1(req('/api/status','GET',session))).json()).statuses,data.statuses);
mode='removed';assert.equal((await app1(req('/api/status','PUT',session,data))).status,403);
mode='left';assert.equal((await app2(req('/api/status','PUT',session,data))).status,403);
mode='outage';assert.equal((await app1(req('/api/status','PUT',session,data))).status,503);
assert.equal((await app1(req('/api/login','POST','',{password:'anything'}))).status,403);
assert.equal((await app1(new Request('https://nox.example/api/status',{method:'PUT',headers:{origin:'https://attacker.example',cookie:session},body:JSON.stringify(data)}))).status,403);
assert.equal((await app2(req('/api/logout','POST',session))).status,200);
assert.equal((await app1(req('/api/status','GET',session))).status,401);
const broken=createApp({redis:async()=>{throw Error('Storage unavailable');},discordFetch});assert.equal((await broken(req('/api/status','PUT',session,data))).status,503);
console.log('PASS: cross-instance login, shared statuses, one-use OAuth state, live roles, revoked membership, outages, disabled local login, CSRF and shared logout.');
