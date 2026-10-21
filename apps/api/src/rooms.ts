import {ARENA_DURATION_MS,arenaRemaining} from '../../../packages/core/src/arena';
import {Room,Client,type AuthContext} from '@colyseus/core';import {randomUUID} from 'node:crypto';
import {Simulation,Specialization} from '../../../packages/core/src/simulation';import {auth,db,settings,tickets} from './controller';
export class OceanRoom extends Room {
 static expectedMode='ocean';
 sim=new Simulation();mode='ocean';runIds=new Map<string,string>();identities=new Map<string,{userId:string;fishId:string;publicKey:string;sessionId:string}>();busy=new Set<string>();lastInput=new Map<string,number>();pending:Promise<unknown>=Promise.resolve();createdAt=Date.now();duration=ARENA_DURATION_MS;finished=false;matchId='';
 onCreate(options:any){
  this.mode=this.roomName==='arena'?'arena':'ocean';this.maxClients=settings.ROOM_CAPACITY;this.autoDispose=this.mode==='arena';
  if(this.mode==='arena'){this.matchId=randomUUID();this.pending=db.arenaMatch.create({data:{id:this.matchId}});}
  if(this.mode==='arena')this.clock.setTimeout(()=>{void this.lock();},15000);
  this.setSimulationInterval(dt=>this.step(dt),1000/settings.SIMULATION_HZ);
  this.clock.setInterval(()=>this.broadcast('snapshot',{...this.sim.snapshot(),mode:this.mode,remainingMs:this.mode==='arena'?arenaRemaining(this.createdAt,Date.now()):null,finished:this.finished,matchId:this.matchId}),1000/settings.NETWORK_HZ);
  this.clock.setInterval(()=>{void this.validateSessions();},5000);
  this.clock.setInterval(()=>{for(const [id,p]of this.sim.players){const runId=this.runIds.get(id);if(runId&&p.alive)this.persist(()=>db.fishSurvivalRun.updateMany({where:{id:runId,endedAt:null},data:{biomass:p.biomass}}));}},10000);
  this.onMessage('input',(client,data)=>{if(!data||typeof data.x!=='number'||typeof data.y!=='number'||typeof data.boost!=='boolean')return;const now=Date.now();if(now-(this.lastInput.get(client.sessionId)||0)<25)return;this.lastInput.set(client.sessionId,now);this.sim.input(client.sessionId,data.x,data.y,data.boost);});
  this.onMessage('specialize',(client,data)=>{if(['swift','armored','hunter'].includes(data))this.sim.specialize(client.sessionId,data as Specialization);});
  this.onMessage('respawn',client=>{void this.respawn(client);});
 }
 persist(fn:()=>Promise<unknown>){this.pending=this.pending.then(fn).catch(e=>{console.error(JSON.stringify({event:'room_persistence_error',room:this.roomId,error:e.message}));this.finished=true;this.broadcast('error','Persistence unavailable. Please reconnect.');});}
 static async onAuth(token:string,options:any,request:AuthContext){
  if(request.headers.origin!==settings.APP_ORIGIN)throw new Error('Origin rejected');
  if(typeof options.ticket!=='string')throw new Error('Authentication required');const key=auth.ticketHash(options.ticket),ticket=tickets.get(key);tickets.delete(key);
  if(!ticket||ticket.expires<Date.now()||ticket.mode!==this.expectedMode)throw new Error('Join ticket expired');
  const session=await db.session.findUnique({where:{id:ticket.sessionId}});if(!session||session.expiresAt<new Date()||session.userId!==ticket.userId)throw new Error('Session expired');
  return ticket;
 }
 async onJoin(client:Client,options:any,identity:any){
  const session=identity&&await db.session.findUnique({where:{id:identity.sessionId}});
  if(this.finished||!session||session.expiresAt<new Date()||identity.expires<Date.now())throw new Error('Session or seat expired');
  if(this.mode==='arena'&&[...this.identities.values()].some(p=>p.userId===identity.userId)){client.leave(4001,'Already in this arena');return;}
  this.identities.set(client.sessionId,identity);
  try{await this.startRun(client.sessionId);client.send('welcome',{id:client.sessionId,mode:this.mode,matchId:this.matchId});}catch(e){this.identities.delete(client.sessionId);client.send('error','Fish already active or unavailable');client.leave(4002);}
 }
 async startRun(id:string){
  const owner=this.identities.get(id)!;
  const fish=await db.ownedFish.findFirst({where:{id:owner.fishId,ownerId:owner.userId,status:'OWNED'},include:{species:true}});if(!fish)throw new Error('Fish ownership required');
  const run=await db.fishSurvivalRun.create({data:{userId:owner.userId,fishId:fish.id,roomId:this.roomId,mode:this.mode}});
  this.runIds.set(id,run.id);const color=(fish.species.appearance as {color:string}).color;this.sim.spawn(id,owner.publicKey.slice(0,4)+'…'+owner.publicKey.slice(-4),color);
 }
 async respawn(client:Client){const id=client.sessionId;if(this.finished||this.busy.has(id)||this.sim.players.get(id)?.alive)return;this.busy.add(id);try{await this.pending;await this.startRun(id);}catch{client.send('error','Respawn unavailable. Please reconnect.');}finally{this.busy.delete(id);}}
 step(dt:number){if(this.finished)return;if(this.mode==='arena'&&Date.now()-this.createdAt>=this.duration){this.finished=true;void this.endArena().catch(e=>{console.error(JSON.stringify({event:'arena_finalize_error',matchId:this.matchId,error:e.message}));this.broadcast('error','Match results are temporarily unavailable. Your fish remains owned.');});return;}
  this.sim.tick(dt/1000);
  for(const death of this.sim.deaths){const runId=this.runIds.get(death.prey);this.runIds.delete(death.prey);if(runId)this.persist(()=>db.$transaction(async tx=>{await tx.fishSurvivalRun.update({where:{id:runId},data:{endedAt:new Date(),cause:'EATEN',biomass:death.biomass}});await tx.gameEvent.create({data:{runId,type:'DEATH',data:{predator:death.predator}}});}));const client=this.clients.find(c=>c.sessionId===death.prey);client?.send('death',{message:'Your fish is safe in your collection. Respawn to start with 10 biomass.'});}
 }
 async validateSessions(){for(const [id,identity]of this.identities){try{const s=await db.session.findUnique({where:{id:identity.sessionId}});if(!s||s.expiresAt<new Date())this.clients.find(c=>c.sessionId===id)?.leave(4003,'Session expired');}catch{this.clients.find(c=>c.sessionId===id)?.leave(4003,'Session unavailable');}}}
 async endRun(id:string,cause:string){const runId=this.runIds.get(id);this.runIds.delete(id);const p=this.sim.players.get(id);if(runId)await db.fishSurvivalRun.updateMany({where:{id:runId,endedAt:null},data:{endedAt:new Date(),cause,biomass:p?.biomass||10}});}
 async endArena(){await this.lock();await this.pending;const ranks=[...this.sim.players.values()].sort((a,b)=>b.biomass-a.biomass);await db.$transaction(async tx=>{await tx.arenaMatch.update({where:{id:this.matchId},data:{endedAt:new Date()}});for(let i=0;i<ranks.length;i++){const p=ranks[i],identity=this.identities.get(p.id);if(!identity)continue;await tx.arenaParticipant.upsert({where:{matchId_userId:{matchId:this.matchId,userId:identity.userId}},create:{matchId:this.matchId,userId:identity.userId,biomass:p.biomass,rank:i+1},update:{biomass:p.biomass,rank:i+1}});await tx.playerAchievement.upsert({where:{userId_code:{userId:identity.userId,code:'ARENA_EXPLORER'}},create:{userId:identity.userId,code:'ARENA_EXPLORER'},update:{}});await tx.pearlLedger.upsert({where:{reference:`arena:${this.matchId}:${identity.userId}`},create:{userId:identity.userId,amount:10,reason:'Arena participation — cosmetic only',reference:`arena:${this.matchId}:${identity.userId}`},update:{}});}});for(const id of this.runIds.keys())await this.endRun(id,'ARENA_ENDED');this.broadcast('matchEnded',{matchId:this.matchId});}
 async onLeave(client:Client,consented:boolean){const p=this.sim.players.get(client.sessionId);if(p)p.input={x:0,y:0,boost:false};try{if(consented||this.finished)throw new Error('Leave');await this.allowReconnection(client,15);}catch{await this.pending;await this.endRun(client.sessionId,'DISCONNECTED');this.identities.delete(client.sessionId);this.sim.players.delete(client.sessionId);this.lastInput.delete(client.sessionId);}}
 async onDispose(){await this.pending;for(const id of this.runIds.keys())await this.endRun(id,'ROOM_CLOSED');}
}
export class ArenaRoom extends OceanRoom {static expectedMode='arena';}
