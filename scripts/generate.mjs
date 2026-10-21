import {spawnSync} from 'node:child_process';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
// Prisma reads datasource syntax during generation, but never connects here.
const env={...process.env,DATABASE_URL:process.env.DATABASE_URL||'postgresql://unused:unused@localhost:5432/schema_generation'};
const result=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'generate'],{env,stdio:'inherit'});
if(result.error)throw result.error;process.exit(result.status??1);
