import {describe,it,expect} from 'vitest';
import {config} from '../packages/core/src/config';
import {catalog,BASE_STATS} from '../packages/core/src/catalog';
const base={DATABASE_URL:'postgresql://test',SESSION_SECRET:'x'.repeat(32)};
describe('Phase 1 configuration and catalog',()=>{
 it('defaults checkout off',()=>{expect(config(base).ENABLE_DEVNET_CHECKOUT).toBe('false');expect(config(base).ENABLE_MOCK_CHECKOUT).toBe('false');});
 it.each([{SOLANA_NETWORK:'mainnet-beta'},{ENABLE_MAINNET:'true'},{ENABLE_REAL_PAYMENTS:'true'},{SOLANA_RPC_URL:'https://mainnet.example.com'},{APP_ENV:'production',ENABLE_MOCK_CHECKOUT:'true'}])('rejects unsafe config %o',extra=>expect(()=>config({...base,...extra})).toThrow());
 it('defines five cosmetic rarities with integer prices and equal base stats',()=>{expect(catalog).toHaveLength(5);for(const fish of catalog){expect(BigInt(fish.priceLamports)>0n).toBe(true);expect(fish.metadata.cosmeticOnly).toBe(true);}expect(BASE_STATS.biomass).toBe(10);});
});
