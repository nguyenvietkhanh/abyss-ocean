import {database} from '../apps/api/src/db';
import {catalog} from '../packages/core/src/catalog';
const db=database();
for(const s of catalog){const {priceLamports,...data}=s; await db.fishSpecies.upsert({where:{id:s.id},create:data,update:data});await db.fishCatalogPrice.upsert({where:{speciesId_version:{speciesId:s.id,version:1}},create:{speciesId:s.id,version:1,lamports:BigInt(s.id==='reef-dart'?(process.env.FISH_STARTER_PRICE_LAMPORTS||priceLamports):priceLamports)},update:{}});}
await db.$disconnect();
