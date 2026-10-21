import {getWallets} from '@wallet-standard/app';
export type StandardWallet=ReturnType<ReturnType<typeof getWallets>['get']>[number];
export async function api(path:string,body?:unknown){const res=await fetch('/api/v1'+path,{credentials:'include',method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw new Error(data.message||'Request failed');return data;}
export async function authenticate(wallet:StandardWallet){
 const features=wallet.features as any;const connected=await features['standard:connect'].connect();const account=connected.accounts.find((a:any)=>a.chains.includes('solana:devnet')||a.chains.some((c:string)=>c.startsWith('solana:')));if(!account)throw new Error('No compatible Solana account');
 const challenge=await api('/auth/challenge',{publicKey:account.address});let signed;
 if(features['solana:signIn']) [signed]=await features['solana:signIn'].signIn(challenge.input);
 else if(features['solana:signMessage']) [signed]=await features['solana:signMessage'].signMessage({account,message:new TextEncoder().encode(challenge.message)});
 else throw new Error('This wallet does not support signing login messages');
 if(new TextDecoder().decode(signed.signedMessage)!==challenge.message)throw new Error('Wallet changed the login challenge. Authentication rejected.');
 if(signed.account&&signed.account.address!==account.address)throw new Error('Wallet account changed. Connect again.');
 const signature=btoa(String.fromCharCode(...signed.signature));await api('/auth/verify',{id:challenge.id,publicKey:account.address,signature});return account;
}
