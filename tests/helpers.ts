import nacl from 'tweetnacl';import bs58 from 'bs58';
export const ORIGIN='http://localhost:3000',API='http://localhost:3001/api/v1';
export async function player(){const keys=nacl.sign.keyPair(),publicKey=bs58.encode(keys.publicKey);let cookie='';
 const request=async(path:string,body?:unknown)=>{const r=await fetch(API+path,{signal:AbortSignal.timeout(8000),method:body===undefined?'GET':'POST',headers:{Origin:ORIGIN,...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];const data=await r.json();if(!r.ok)throw new Error(data.message);return data;};
 const challenge=await request('/auth/challenge',{publicKey});await request('/auth/verify',{id:challenge.id,publicKey,signature:Buffer.from(nacl.sign.detached(Buffer.from(challenge.message),keys.secretKey)).toString('base64')});
 const order=await request('/orders',{speciesId:'reef-dart',mode:'MOCK'});const {fish}=await request(`/orders/${order.id}/mock-complete`,{});return {keys,publicKey,request,fish,get cookie(){return cookie;}};
}
