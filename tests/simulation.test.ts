import {describe,it,expect} from 'vitest';import {Simulation,SpatialGrid} from '../packages/core/src/simulation';import {catalog} from '../packages/core/src/catalog';
describe('Phase 2 authoritative survival',()=>{
 it('every rarity starts equally',()=>{const s=new Simulation(()=>0.5,0);for(const f of catalog){const p=s.spawn(f.id,'x',f.appearance.color);expect([p.biomass,p.hp,p.stamina,p.immuneUntil]).toEqual([10,100,100,5000]);}});
 it('normalizes movement and ignores non-finite input',()=>{const s=new Simulation(()=>0.5,0),p=s.spawn('a','a','red'),x=p.x;s.input('a',1000,0,false);s.tick(.1);expect(p.x-x).toBeCloseTo(18);s.input('a',NaN,0,true);expect(p.input.x).toBe(1);});
 it('collects food once and evolves server-side',()=>{const s=new Simulation(()=>0.5,0),p=s.spawn('a','a','red');s.foods.set(1,{id:1,x:p.x,y:p.y,value:50});s.tick(.05);expect(p.biomass).toBe(60);expect(p.level).toBe(3);s.tick(.05);expect(p.biomass).toBe(60);});
 it('immunity protects then predation ends run; respawn resets progress',()=>{const s=new Simulation(()=>0.5,0),a=s.spawn('a','a','red'),b=s.spawn('b','b','blue');a.biomass=100;s.tick(.1);expect(b.alive).toBe(true);s.now=5100;s.tick(.1);expect(b.alive).toBe(false);expect(s.deaths).toHaveLength(1);expect(s.spawn('b','b','blue').biomass).toBe(10);});
 it('larger fish move slower and boosts consume stamina',()=>{const s=new Simulation(()=>.5,0),a=s.spawn('a','a','red'),b=s.spawn('b','b','blue');b.biomass=100;b.y+=200;const x=a.x;s.input('a',1,0,true);s.input('b',1,0,false);s.tick(.1);expect(a.x-x).toBeGreaterThan(b.x-x);expect(a.stamina).toBeLessThan(100);});
 it('spatial queries cover neighboring buckets',()=>{const g=new SpatialGrid<{x:number;y:number}>();g.insert({x:121,y:121});expect(g.near(119,119,10)).toHaveLength(1);});
});
