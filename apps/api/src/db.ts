import {PrismaClient} from '@prisma/client';import {PrismaPg} from '@prisma/adapter-pg';
export function database(url=process.env.DATABASE_URL){return new PrismaClient({adapter:new PrismaPg({connectionString:url})});}
