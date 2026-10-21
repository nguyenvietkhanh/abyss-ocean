import {PrismaClient,Prisma} from '@prisma/client';
import {BadRequestException,NotFoundException} from '@nestjs/common';
export async function fulfill(db:PrismaClient,orderId:string,userId:string,mode:string,transaction?:{signature:string;slot:number}) {
 return db.$transaction(async tx=>{
  const rows=await tx.$queryRaw<{id:string}[]>`SELECT id FROM "FishAcquisitionOrder" WHERE id = ${orderId} FOR UPDATE`;
  const order=await tx.fishAcquisitionOrder.findUnique({where:{id:orderId},include:{fish:true}});
  if(!rows.length||!order||order.userId!==userId) throw new NotFoundException('Order not found');
  if(order.mode!==mode)throw new BadRequestException('Wrong checkout mode');
  if(order.fish)return {order,fish:order.fish};
  if(order.status!=='PENDING'||(mode==='MOCK'&&order.expiresAt<=new Date())) throw new BadRequestException('Order expired or ineligible');
  if(mode==='DEVNET'&&!transaction)throw new BadRequestException('Verified transaction required');
  if(transaction)await tx.devnetTransaction.create({data:{orderId,signature:transaction.signature,slot:BigInt(transaction.slot),status:'FINALIZED'}});
  const fish=await tx.ownedFish.create({data:{ownerId:userId,speciesId:order.speciesId,appearanceId:order.appearanceId,acquisitionSource:mode,orderId}});
  const updated=await tx.fishAcquisitionOrder.update({where:{id:orderId},data:{status:'FULFILLED',fulfilledAt:new Date()}});
  await tx.auditLog.create({data:{actorId:userId,entityId:orderId,action:'FISH_FULFILLED',data:{fishId:fish.id,mode}}});
  return {order:updated,fish};
 });
}
