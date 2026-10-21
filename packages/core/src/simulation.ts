import {BASE_STATS} from './catalog';
export type Specialization='swift'|'armored'|'hunter';
export type Fish={id:string;name:string;color:string;x:number;y:number;angle:number;biomass:number;hp:number;stamina:number;level:number;immuneUntil:number;alive:boolean;input:{x:number;y:number;boost:boolean};specialization:Specialization;kills:number};
export type Food={id:number;x:number;y:number;value:number};
export const evolution=(biomass:number)=>biomass>=100?4:biomass>=55?3:biomass>=25?2:1;
export const radius=(biomass:number)=>12+Math.sqrt(biomass)*2.5;
export class SpatialGrid<T extends {x:number;y:number}> {
 cells=new Map<string,T[]>();constructor(public size=120){}
 insert(v:T){const key=`${Math.floor(v.x/this.size)},${Math.floor(v.y/this.size)}`;const cell=this.cells.get(key)||[];cell.push(v);this.cells.set(key,cell);}
 near(x:number,y:number,r:number){const found:T[]=[];for(let a=Math.floor((x-r)/this.size);a<=Math.floor((x+r)/this.size);a++)for(let b=Math.floor((y-r)/this.size);b<=Math.floor((y+r)/this.size);b++)found.push(...(this.cells.get(`${a},${b}`)||[]));return found;}
}
export class Simulation {
 width=3000;height=2200;players=new Map<string,Fish>();foods=new Map<number,Food>();now=0;nextFood=0;deaths:{prey:string;predator:string;biomass:number}[]=[];
 constructor(public random= Math.random,public foodTarget=260){this.refill();}
 spawn(id:string,name:string,color:string){const fish:Fish={id,name,color,x:100+this.random()*(this.width-200),y:100+this.random()*(this.height-200),angle:0,biomass:BASE_STATS.biomass,hp:BASE_STATS.hp,stamina:BASE_STATS.stamina,level:1,immuneUntil:this.now+BASE_STATS.immunityMs,alive:true,input:{x:0,y:0,boost:false},specialization:'swift',kills:0};this.players.set(id,fish);return fish;}
 input(id:string,x:number,y:number,boost:boolean){const p=this.players.get(id);if(!p?.alive||!Number.isFinite(x)||!Number.isFinite(y))return;const n=Math.max(1,Math.hypot(x,y));p.input={x:x/n,y:y/n,boost};}
 specialize(id:string,s:Specialization){const p=this.players.get(id);if(p&&p.level>=2)p.specialization=s;}
 refill(){while(this.foods.size<this.foodTarget){const id=this.nextFood++;this.foods.set(id,{id,x:40+this.random()*(this.width-80),y:40+this.random()*(this.height-80),value:1.5});}}
 tick(dt:number){dt=Math.min(0.1,Math.max(0,dt));this.now+=dt*1000;this.deaths=[];
 const foodGrid=new SpatialGrid<Food>();for(const f of this.foods.values())foodGrid.insert(f);
 const fishGrid=new SpatialGrid<Fish>();
 for(const p of this.players.values()){
  if(!p.alive)continue;const boost=p.input.boost&&p.stamina>1;const specialized=p.level>=2;const speed=BASE_STATS.speed/(1+Math.max(0,p.biomass-10)*0.005)*(boost?(specialized&&p.specialization==='swift'?1.95:1.65):1)*(specialized&&p.specialization==='armored'?0.9:1);
  p.stamina=Math.min(100,Math.max(0,p.stamina+(boost?-28:16)*dt));p.x=Math.max(25,Math.min(this.width-25,p.x+p.input.x*speed*dt));p.y=Math.max(25,Math.min(this.height-25,p.y+p.input.y*speed*dt));if(Math.hypot(p.input.x,p.input.y)>0.01)p.angle=Math.atan2(p.input.y,p.input.x);
  for(const food of foodGrid.near(p.x,p.y,radius(p.biomass))){if(this.foods.has(food.id)&&Math.hypot(p.x-food.x,p.y-food.y)<radius(p.biomass)){this.foods.delete(food.id);p.biomass+=food.value;}}
  p.level=evolution(p.biomass);fishGrid.insert(p);
 }
 for(const predator of this.players.values()){
  if(!predator.alive||predator.immuneUntil>this.now)continue;
  for(const prey of fishGrid.near(predator.x,predator.y,radius(predator.biomass))){
   const ratio=prey.level>=2&&prey.specialization==='armored'?1.45:1.25;
   if(prey.id===predator.id||!prey.alive||prey.immuneUntil>this.now||predator.biomass<prey.biomass*ratio)continue;
   if(Math.hypot(predator.x-prey.x,predator.y-prey.y)<radius(predator.biomass)*0.75){prey.alive=false;prey.hp=0;predator.biomass+=prey.biomass*0.5;predator.kills++;predator.level=evolution(predator.biomass);this.deaths.push({prey:prey.id,predator:predator.id,biomass:prey.biomass});}
  }
 }this.refill();
 }
 snapshot(){return {width:this.width,height:this.height,time:this.now,players:[...this.players.values()].map(({input,...p})=>p),food:[...this.foods.values()],scoreboard:[...this.players.values()].filter(p=>p.alive).sort((a,b)=>b.biomass-a.biomass).slice(0,10).map(p=>({id:p.id,name:p.name,biomass:p.biomass,kills:p.kills}))};}
}
