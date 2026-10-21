import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {database} from '../apps/api/src/db';
import nacl from 'tweetnacl';import bs58 from 'bs58';
import {AuthService} from '../apps/api/src/auth';
import {fulfill} from '../apps/api/src/acquisition';
const db=database(process.env.DATABASE_URL||'postgresql://abyss:abyss@localhost:5432/abyss');
const auth=new AuthService(db,'http://localhost:3000','s'.repeat(32));const key=nacl.sign.keyPair(),publicKey=bs58.encode(key.publicKey);
const sign=(msg:string)=>Buffer.from(nacl.sign.detached(Buffer.from(msg),key.secretKey)).toString('base64');
afterAll(()=>db.$disconnect());
describe('Phase 1 real PostgreSQL authentication and fulfillment',()=>{
 it('valid signature, replay denial and hashed session',async()=>{const c=await auth.challenge(publicKey);const s=await auth.verify(c.id,publicKey,sign(c.message));expect(s.session.id).not.toBe(s.token);expect((await auth.session(s.token)).publicKey).toBe(publicKey);await expect(auth.verify(c.id,publicKey,sign(c.message))).rejects.toThrow();});
 it('invalid signature and switching cannot consume a challenge',async()=>{const c=await auth.challenge(publicKey);await expect(auth.verify(c.id,publicKey,Buffer.alloc(64).toString('base64'))).rejects.toThrow();await expect(auth.verify(c.id,bs58.encode(nacl.sign.keyPair().publicKey),sign(c.message))).rejects.toThrow();expect((await db.authChallenge.findUnique({where:{id:c.id}}))?.usedAt).toBeNull();});
 it('expired challenge is rejected',async()=>{const c=await auth.challenge(publicKey);await db.authChallenge.update({where:{id:c.id},data:{expiresAt:new Date(0)}});await expect(auth.verify(c.id,publicKey,sign(c.message))).rejects.toThrow();});
 it('concurrent mock completion grants exactly one fish and audit',async()=>{const c=await auth.challenge(publicKey);const {session}=await auth.verify(c.id,publicKey,sign(c.message));const order=await db.fishAcquisitionOrder.create({data:{userId:session.userId,payer:publicKey,speciesId:'reef-dart',appearanceId:'reef-dart-v1',mode:'MOCK',priceLamports:300000000n,destination:'MOCK_NO_TRANSACTION',expiresAt:new Date(Date.now()+60000)}});const [a,b]=await Promise.all([fulfill(db,order.id,session.userId,'MOCK'),fulfill(db,order.id,session.userId,'MOCK')]);expect(a.fish.id).toBe(b.fish.id);expect(await db.ownedFish.count({where:{orderId:order.id}})).toBe(1);expect(await db.auditLog.count({where:{entityId:order.id}})).toBe(1);await expect(fulfill(db,order.id,'someone-else','MOCK')).rejects.toThrow();});
});
