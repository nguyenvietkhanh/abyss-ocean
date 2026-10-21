import {it,expect} from 'vitest';
import {spawn,execFile} from 'node:child_process';import {promisify} from 'node:util';import {randomUUID} from 'node:crypto';import pg from 'pg';
import {database} from '../apps/api/src/db';import {digest} from '../apps/api/src/auth';
it('actual server restart closes stale runs, preserves fish and restores a persisted session',async()=>{
 const source=process.env.DATABASE_URL||'postgresql://abyss:abyss@localhost:5432/abyss';const url=new URL(source);const name='recovery_'+randomUUID().replaceAll('-','');const admin=new pg.Client({connectionString:source});await admin.connect();await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
 const connection=url.toString(),db=database(connection),token=randomUUID();let child:ReturnType<typeof spawn>|undefined;
 const env={...process.env,DATABASE_URL:connection,APP_ENV:'test',APP_ORIGIN:'http://localhost:3000',SESSION_SECRET:'recovery-test-session-secret-32-characters',API_PORT:'3002',PORT:'3002',ENABLE_DEVNET_CHECKOUT:'false',ENABLE_MOCK_CHECKOUT:'true'};
 const stop=async()=>{if(!child||child.exitCode!==null)return;const target=child;await new Promise<void>(resolve=>{const timeout=setTimeout(()=>target.kill('SIGKILL'),3000);target.once('exit',()=>{clearTimeout(timeout);resolve();});target.kill('SIGTERM');});};
 const start=async()=>{child=spawn(process.execPath,['--import','tsx','apps/api/src/main.ts'],{env,stdio:'ignore'});const deadline=Date.now()+10000;while(Date.now()<deadline){if(child.exitCode!==null)throw new Error('Recovery API exited');try{const r=await fetch('http://localhost:3002/api/v1/health',{signal:AbortSignal.timeout(300)});if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('Recovery API did not start');};
 try{
  await promisify(execFile)(process.execPath,['--import','tsx','scripts/migrate.ts'],{env});
  const user=await db.user.create({data:{}});await db.walletAccount.create({data:{userId:user.id,publicKey:'test-recovery-public-key'}});
  await db.session.create({data:{id:digest(token),userId:user.id,publicKey:'test-recovery-public-key',expiresAt:new Date(Date.now()+60000)}});
  await db.fishSpecies.create({data:{id:'test',displayName:'Test Fish',rarity:'Common',appearance:{color:'#49dfc5'},animationRef:'glide',metadata:{}}});
  const fish=await db.ownedFish.create({data:{ownerId:user.id,speciesId:'test',appearanceId:'test-v1',acquisitionSource:'MOCK'}});
  const run=await db.fishSurvivalRun.create({data:{userId:user.id,fishId:fish.id,roomId:'interrupted-process',mode:'ocean',biomass:83}});
  await start();const recovered=await db.fishSurvivalRun.findUniqueOrThrow({where:{id:run.id}});expect(recovered.cause).toBe('SERVER_RESTART');expect(recovered.endedAt).not.toBeNull();expect(await db.ownedFish.count({where:{id:fish.id,ownerId:user.id}})).toBe(1);
  await stop();await start();const me=await fetch('http://localhost:3002/api/v1/auth/me',{headers:{Cookie:`abyss_session=${token}`}});expect(me.status).toBe(200);expect((await me.json()).id).toBe(user.id);
 }finally{await stop();await db.$disconnect();await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);await admin.end();}
},30000);
