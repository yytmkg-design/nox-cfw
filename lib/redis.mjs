export async function redis(...command){
 const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
 if(!url?.startsWith('https://')||!token)throw Error('Storage is not configured');
 const response=await fetch(url.replace(/\/$/,''),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Storage unavailable');
 const data=await response.json();if(data.error)throw Error('Storage command failed');return data.result;
}
