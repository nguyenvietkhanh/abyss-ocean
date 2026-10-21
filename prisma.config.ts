import {defineConfig} from 'prisma/config';
import {PrismaPg} from '@prisma/adapter-pg';
// Client generation uses WebAssembly/JavaScript; no native engine download is needed.
// Checked-in SQL migrations are applied by scripts/migrate.ts.
export default defineConfig({schema:'prisma/schema.prisma',experimental:{adapter:true},engine:'js',adapter:async()=>new PrismaPg({connectionString:process.env.DATABASE_URL})});
