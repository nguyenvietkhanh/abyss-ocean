import pg from 'pg';import {readFileSync} from 'node:fs';
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
await db.query('CREATE TABLE IF NOT EXISTS abyss_migrations (id text PRIMARY KEY)');
const id='202610210001_initial';if(!(await db.query('SELECT id FROM abyss_migrations WHERE id=$1',[id])).rowCount){await db.query('BEGIN');try{await db.query(readFileSync(`prisma/migrations/${id}/migration.sql`,'utf8'));await db.query('INSERT INTO abyss_migrations VALUES ($1)',[id]);await db.query('COMMIT');}catch(e){await db.query('ROLLBACK');throw e;}}
console.log('Migrations applied');await db.end();
