import EmbeddedPostgres from 'embedded-postgres';
import {existsSync,mkdirSync} from 'node:fs';
mkdirSync('.runtime',{recursive:true});
const pg=new EmbeddedPostgres({databaseDir:process.cwd()+'/.runtime/postgres',user:'abyss',password:'abyss',port:5432,persistent:true,onLog:()=>{},onError:console.error});
if(!existsSync('.runtime/postgres/PG_VERSION')) await pg.initialise();
await pg.start();
try{await pg.createDatabase('abyss');}catch{}
console.log('Local PostgreSQL ready on port 5432');
process.on('SIGTERM',async()=>{await pg.stop();process.exit();});process.on('SIGINT',async()=>{await pg.stop();process.exit();});
setInterval(()=>{},60000);
