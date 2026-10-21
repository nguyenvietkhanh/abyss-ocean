import { z } from 'zod';
export function config(env: Record<string,string|undefined> = process.env) {
 const c = z.object({
 APP_ENV:z.enum(['development','test','staging','production']).default('development'),
 APP_ORIGIN:z.string().url().default('http://localhost:3000'),
 SOLANA_NETWORK:z.literal('devnet').default('devnet'),
 SOLANA_RPC_URL:z.string().url().default('https://api.devnet.solana.com'),
 ENABLE_MAINNET:z.literal('false').default('false'),
 ENABLE_REAL_PAYMENTS:z.literal('false').default('false'),
 ENABLE_MOCK_CHECKOUT:z.enum(['true','false']).default('false'),
 ENABLE_DEVNET_CHECKOUT:z.enum(['true','false']).default('false'),
 SESSION_SECRET:z.string().min(32), DATABASE_URL:z.string().min(1),
 FISH_STARTER_PRICE_LAMPORTS:z.coerce.bigint().positive().default(300000000n),
 DEVNET_TEST_TREASURY_PUBLIC_KEY:z.string().default(''),
 SIMULATION_HZ:z.coerce.number().int().min(5).max(60).default(20),
 NETWORK_HZ:z.coerce.number().int().min(1).max(30).default(10),
 ROOM_CAPACITY:z.coerce.number().int().min(2).max(50).default(50)
 }).parse(env);
 if (/mainnet/i.test(c.SOLANA_RPC_URL)) throw new Error('Mainnet is prohibited');
 if(c.APP_ENV === 'production' && (c.ENABLE_MOCK_CHECKOUT === 'true' || c.ENABLE_DEVNET_CHECKOUT === 'true')) throw new Error('Testing checkout prohibited in production');
 if(c.ENABLE_DEVNET_CHECKOUT === 'true' && !c.DEVNET_TEST_TREASURY_PUBLIC_KEY) throw new Error('Dedicated Devnet treasury required');
 return c;
}
