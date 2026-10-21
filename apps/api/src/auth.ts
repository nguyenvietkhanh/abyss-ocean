import {createHash,createHmac,randomBytes} from 'node:crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {PrismaClient} from '@prisma/client';
import {UnauthorizedException} from '@nestjs/common';
export const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export class AuthService {
 constructor(public db:PrismaClient,public origin:string,public secret:string){}
 async challenge(publicKey:string){
  try {if(bs58.decode(publicKey).length!==32) throw 0;}catch{throw new UnauthorizedException('Invalid wallet address');}
  const nonce=randomBytes(24).toString('hex'), issuedAt=new Date(), expiresAt=new Date(Date.now()+300000),domain=new URL(this.origin).host;
  const input={domain,address:publicKey,statement:'Sign in to ABYSS OCEAN. No transaction or spending permission.',uri:this.origin,version:'1',nonce,issuedAt:issuedAt.toISOString(),expirationTime:expiresAt.toISOString()};
  const message=`${domain} wants you to sign in with your Solana account:\n${publicKey}\n\n${input.statement}\n\nURI: ${this.origin}\nVersion: 1\nNonce: ${nonce}\nIssued At: ${input.issuedAt}\nExpiration Time: ${input.expirationTime}`;
  const row=await this.db.authChallenge.create({data:{publicKey,nonce,message,domain,expiresAt}});return {id:row.id,message,input};
 }
 async verify(id:string,publicKey:string,signature:string){
  const challenge=await this.db.authChallenge.findUnique({where:{id}});
  if(!challenge||challenge.publicKey!==publicKey||challenge.usedAt||challenge.expiresAt<=new Date()||challenge.domain!==new URL(this.origin).host||challenge.createdAt>new Date()) throw new UnauthorizedException('Invalid or expired login challenge');
  let valid=false;try{valid=nacl.sign.detached.verify(Buffer.from(challenge.message),Buffer.from(signature,'base64'),bs58.decode(publicKey));}catch{}
  if(!valid)throw new UnauthorizedException('Invalid wallet signature');
  const token=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+86400000);
  const session=await this.db.$transaction(async tx=>{
   const consumed=await tx.authChallenge.updateMany({where:{id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});
   if(consumed.count!==1) throw new UnauthorizedException('Challenge already used');
   const wallet=await tx.walletAccount.upsert({where:{publicKey},create:{publicKey,user:{create:{}}},update:{}});
   return tx.session.create({data:{id:digest(token),userId:wallet.userId,publicKey,expiresAt}});
  });return {token,session};
 }
 async session(token?:string){if(!token)throw new UnauthorizedException('Connect and authenticate your wallet');const s=await this.db.session.findUnique({where:{id:digest(token)},include:{user:true}});if(!s||s.expiresAt<new Date())throw new UnauthorizedException('Session expired');return s;}
 ticketHash(value:string){return createHmac('sha256',this.secret).update(value).digest('hex');}
}
