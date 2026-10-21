import {Controller,All,Req,Res,BadRequestException,ForbiddenException,NotFoundException} from '@nestjs/common';
import type {Request,Response} from 'express';
import {z} from 'zod';import {randomBytes} from 'node:crypto';
import {database} from './db';import {AuthService,digest} from './auth';import {config} from '../../../packages/core/src/config';import {fulfill} from './acquisition';
export const settings=config();export const db=database();export const auth=new AuthService(db,settings.APP_ORIGIN,settings.SESSION_SECRET);
export const json=(x:unknown)=>JSON.parse(JSON.stringify(x,(_,v)=>typeof v==='bigint'?v.toString():v));
const text=z.string().min(1).max(128);const object=z.object;
export const tickets=new Map<string,{sessionId:string;userId:string;publicKey:string;fishId:string;mode:string;expires:number}>();
export async function catalog(){return db.fishSpecies.findMany({where:{active:true},include:{prices:{orderBy:{version:'desc'},take:1}}});}
export let verifyOrder:(id:string,userId:string,signature:string)=>Promise<unknown>;
export function setVerifier(fn:typeof verifyOrder){verifyOrder=fn;}
@Controller('api/v1')
export class ApiController {
 @All('*path') async route(@Req() req:Request,@Res() res:Response){
 try{const path=req.path.replace('/api/v1',''),method=req.method;let result:unknown;
  if(method!=='GET'&&req.headers.origin!==settings.APP_ORIGIN)throw new ForbiddenException('Origin rejected');
  if(path==='/auth/challenge'&&method==='POST'){const b=object({publicKey:text}).strict().parse(req.body);result=await auth.challenge(b.publicKey);}
  else if(path==='/auth/verify'&&method==='POST'){
   const b=object({id:z.string().uuid(),publicKey:text,signature:z.string().max(200)}).strict().parse(req.body);const login=await auth.verify(b.id,b.publicKey,b.signature);
   if(req.cookies.abyss_session)await db.session.deleteMany({where:{id:digest(req.cookies.abyss_session)}});
   res.cookie('abyss_session',login.token,{httpOnly:true,secure:new URL(settings.APP_ORIGIN).protocol==='https:',sameSite:'strict',path:'/',maxAge:86400000});result={publicKey:login.session.publicKey};
  }
  else if(path==='/auth/logout'&&method==='POST'){if(req.cookies.abyss_session)await db.session.deleteMany({where:{id:digest(req.cookies.abyss_session)}});res.clearCookie('abyss_session',{path:'/'});result={ok:true};}
  else if(path==='/fish/catalog'&&method==='GET')result=await catalog();
  else if(path.startsWith('/fish/catalog/')&&method==='GET'){result=await db.fishSpecies.findFirst({where:{id:path.split('/').pop(),active:true},include:{prices:{orderBy:{version:'desc'},take:1}}});if(!result)throw new NotFoundException();}
  else if(path==='/health'&&method==='GET'){await db.$queryRaw`SELECT 1`;result={status:'ok',network:'devnet',devnetCheckout:settings.ENABLE_DEVNET_CHECKOUT==='true',mockCheckout:settings.ENABLE_MOCK_CHECKOUT==='true'};}
  else {
   const s=await auth.session(req.cookies.abyss_session);
   if(path==='/auth/me'&&method==='GET')result={id:s.userId,publicKey:s.publicKey,role:s.user.role,devnetCheckout:settings.ENABLE_DEVNET_CHECKOUT==='true',mockCheckout:settings.ENABLE_MOCK_CHECKOUT==='true'};
   else if(path==='/fish/inventory'&&method==='GET')result=await db.ownedFish.findMany({where:{ownerId:s.userId,status:'OWNED'},include:{species:true,runs:{where:{endedAt:null},select:{id:true,roomId:true}}},orderBy:{createdAt:'desc'}});
   else if(path.startsWith('/fish/inventory/')&&method==='GET'){result=await db.ownedFish.findFirst({where:{id:path.split('/').pop(),ownerId:s.userId},include:{species:true}});if(!result)throw new NotFoundException();}
   else if(path==='/orders'&&method==='POST'){
    const b=object({speciesId:text,mode:z.enum(['MOCK','DEVNET'])}).strict().parse(req.body);
    if(settings.APP_ENV==='production'||(b.mode==='MOCK'?settings.ENABLE_MOCK_CHECKOUT:settings.ENABLE_DEVNET_CHECKOUT)!=='true')throw new ForbiddenException('This testing checkout is disabled');
    const species=await db.fishSpecies.findFirst({where:{id:b.speciesId,active:true},include:{prices:{orderBy:{version:'desc'},take:1}}});if(!species?.prices[0])throw new BadRequestException('Fish unavailable');
    result=await db.fishAcquisitionOrder.create({data:{userId:s.userId,payer:s.publicKey,speciesId:species.id,appearanceId:`${species.id}-v${species.version}`,mode:b.mode,priceLamports:species.prices[0].lamports,destination:b.mode==='MOCK'?'MOCK_NO_TRANSACTION':settings.DEVNET_TEST_TREASURY_PUBLIC_KEY,expiresAt:new Date(Date.now()+900000)}});
   }
   else if(/^\/orders\/[^/]+$/.test(path)&&method==='GET'){result=await db.fishAcquisitionOrder.findFirst({where:{id:path.split('/')[2],userId:s.userId},include:{fish:true,transaction:true}});if(!result)throw new NotFoundException();}
   else if(/^\/orders\/[^/]+\/mock-complete$/.test(path)&&method==='POST'){
    if(settings.ENABLE_MOCK_CHECKOUT!=='true'||settings.APP_ENV==='production')throw new ForbiddenException('Mock checkout disabled');result=await fulfill(db,path.split('/')[2],s.userId,'MOCK');
   }
   else if(/^\/orders\/[^/]+\/verify-devnet$/.test(path)&&method==='POST'){
    if(settings.ENABLE_DEVNET_CHECKOUT!=='true'||settings.APP_ENV==='production')throw new ForbiddenException('Devnet checkout disabled');const b=object({signature:z.string().min(64).max(100)}).strict().parse(req.body);result=await verifyOrder(path.split('/')[2],s.userId,b.signature);
   }
   else if((path==='/game/join'||path==='/arena/queue')&&method==='POST'){
    const b=object({fishId:z.string().uuid(),mode:z.enum(['ocean','arena']).default(path==='/arena/queue'?'arena':'ocean')}).strict().parse(req.body);
    const fish=await db.ownedFish.findFirst({where:{id:b.fishId,ownerId:s.userId,status:'OWNED'}});if(!fish)throw new ForbiddenException('You do not own this fish');
    if(await db.fishSurvivalRun.findFirst({where:{fishId:b.fishId,endedAt:null}}))throw new BadRequestException('Fish already active in another room');
    if(tickets.size>10000)throw new BadRequestException('Server busy');for(const [key,t] of tickets)if(t.expires<Date.now())tickets.delete(key);
    const ticket=randomBytes(32).toString('hex');tickets.set(auth.ticketHash(ticket),{sessionId:s.id,userId:s.userId,publicKey:s.publicKey,fishId:b.fishId,mode:b.mode,expires:Date.now()+30000});result={ticket,room:b.mode,wsPath:'/'};
   }
   else if(path==='/game/profile'&&method==='GET'){
    const [runs,achievements,pearls]=await Promise.all([db.fishSurvivalRun.findMany({where:{userId:s.userId},orderBy:{startedAt:'desc'},take:30}),db.playerAchievement.findMany({where:{userId:s.userId}}),db.pearlLedger.aggregate({where:{userId:s.userId},_sum:{amount:true}})]);result={publicKey:s.publicKey,runs,achievements,pearls:pearls._sum.amount||0};
   }
   else if(path==='/game/leaderboard'&&method==='GET')result=await db.fishSurvivalRun.findMany({orderBy:{biomass:'desc'},take:20,select:{id:true,biomass:true,mode:true,startedAt:true,user:{select:{wallets:{select:{publicKey:true},take:1}}}}});
   else if(path.startsWith('/arena/matches/')&&method==='GET'){result=await db.arenaMatch.findUnique({where:{id:path.split('/').pop()},include:{participants:{orderBy:{rank:'asc'}}}});if(!result)throw new NotFoundException();}
   else if(path==='/admin'&&method==='GET'){if(s.user.role!=='ADMIN')throw new ForbiddenException('Administrator access required');result={users:await db.user.count(),fish:await db.ownedFish.count(),activeRuns:await db.fishSurvivalRun.count({where:{endedAt:null}}),audits:await db.auditLog.findMany({take:50,orderBy:{createdAt:'desc'}})};}
   else throw new NotFoundException('Endpoint not found');
  }res.json(json(result));
 }catch(e:any){const status=e instanceof z.ZodError?400:typeof e.getStatus==='function'?e.getStatus():e.code==='P2002'?409:503;res.status(status).json({message:status===503?'Service temporarily unavailable':e.message});if(status===503)console.error(JSON.stringify({event:'api_error',path:req.path,error:e.message}));}
 }
}
