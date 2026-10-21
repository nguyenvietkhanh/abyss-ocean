import {Connection,PublicKey} from '@solana/web3.js';import {Queue,Worker} from 'bullmq';import IORedis from 'ioredis';
import {db,settings,setVerifier} from './controller';import {fulfill} from './acquisition';import {verifyDevnet} from '../../../packages/core/src/devnet';import {BadRequestException,NotFoundException} from '@nestjs/common';
let queue:Queue|undefined;
async function verify(id:string,userId:string,signature:string){
 const order=await db.fishAcquisitionOrder.findFirst({where:{id,userId},include:{fish:true,transaction:true}});if(!order||order.mode!=='DEVNET')throw new NotFoundException('Devnet order not found');
 if(order.fish){if(order.transaction?.signature!==signature)throw new BadRequestException('Order already linked to a different signature');return {status:'FULFILLED',fish:order.fish};}
 const collision=await db.devnetTransaction.findUnique({where:{signature}});if(collision&&collision.orderId!==id)throw new BadRequestException('Signature already used');
 const rpc=new Connection(settings.SOLANA_RPC_URL,'finalized');
 const result=await verifyDevnet(rpc,signature,order);
 if(result.status==='VERIFIED')return {status:'FULFILLED',...await fulfill(db,id,userId,'DEVNET',{signature,slot:result.slot!})};
 return result;
}
setVerifier(async(id,userId,signature)=>{
 try{const result=await verify(id,userId,signature);if(result.status==='PENDING'&&queue)await queue.add('verify',{id,userId,signature},{jobId:`${id}-${signature}`,attempts:8,backoff:{type:'exponential',delay:5000},removeOnComplete:true,removeOnFail:100});return result;}
 catch(e:any){if(e instanceof BadRequestException||e instanceof NotFoundException)throw e;if(queue)await queue.add('verify',{id,userId,signature},{jobId:`${id}-${signature}`,attempts:8,backoff:{type:'exponential',delay:5000},removeOnComplete:true,removeOnFail:100});throw e;}
});
if(settings.ENABLE_DEVNET_CHECKOUT==='true'){
 new PublicKey(settings.DEVNET_TEST_TREASURY_PUBLIC_KEY);
 if(!process.env.REDIS_URL)throw new Error('Redis is required for Devnet checkout');
 const connection=new IORedis(process.env.REDIS_URL,{maxRetriesPerRequest:null});
 queue=new Queue('devnet-verification',{connection:connection as any});
 const worker=new Worker('devnet-verification',async job=>{const {id,userId,signature}=job.data;const r=await verify(id,userId,signature);if(r.status==='PENDING')throw new Error('Awaiting finalized Devnet transaction');return r;},{connection:connection as any,concurrency:3});
 worker.on('failed',(job,error)=>console.warn(JSON.stringify({event:'devnet_retry',orderId:job?.data.id,error:error.message})));
}
