import 'reflect-metadata';import {Module} from '@nestjs/common';import {NestFactory} from '@nestjs/core';
import {Server} from '@colyseus/core';import {WebSocketTransport} from '@colyseus/ws-transport';
import cookieParser from 'cookie-parser';import helmet from 'helmet';import {rateLimit} from 'express-rate-limit';
import {ApiController,db,settings} from './controller';import {OceanRoom,ArenaRoom} from './rooms';
@Module({controllers:[ApiController]}) class AppModule {}
const app=await NestFactory.create(AppModule,{logger:['error','warn','log']});
if(settings.APP_ENV==='staging'||settings.APP_ENV==='production')app.getHttpAdapter().getInstance().set('trust proxy',1);
app.use(helmet());app.use(cookieParser());app.use(rateLimit({windowMs:60000,limit:180,standardHeaders:'draft-8',legacyHeaders:false}));
app.enableCors({origin:settings.APP_ORIGIN,credentials:true,methods:['GET','POST']});
await db.$connect();
// Single simulation process: close stale leases before accepting joins.
await db.fishSurvivalRun.updateMany({where:{endedAt:null},data:{endedAt:new Date(),cause:'SERVER_RESTART'}});
await db.arenaMatch.updateMany({where:{endedAt:null},data:{endedAt:new Date()}});
await app.init();const http=app.getHttpServer();
const game=new Server({transport:new WebSocketTransport({server:http,maxPayload:4096})});
game.define('ocean',OceanRoom);game.define('arena',ArenaRoom);
await import('./devnet');
await app.listen(Number(process.env.PORT||process.env.API_PORT||3001),'0.0.0.0');
console.log('ABYSS OCEAN API and authoritative rooms ready');
process.on('SIGTERM',async()=>{const deadline=setTimeout(()=>process.exit(1),10000);deadline.unref();try{await game.gracefullyShutdown(false);await app.close();await db.$disconnect();clearTimeout(deadline);process.exit(0);}catch{process.exit(1);}});
