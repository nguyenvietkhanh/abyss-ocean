# Initial PostgreSQL DDL generated from the checked-in Prisma scalar fields.
import re,os
s=open('prisma/schema.prisma').read(); models=re.findall(r'model (\w+) \{(.*?)\n\}',s,re.S); names={n for n,_ in models}; out=[];constraints=[]
for name,body in models:
 cols=[]
 for line in body.splitlines():
  a=line.strip().split()
  if len(a)<2:continue
  field,kind=a[:2];typ=kind.rstrip('?');nullable=kind.endswith('?')
  if typ in names or typ.endswith('[]') or field.startswith('@@'):continue
  sql={'String':'TEXT','Int':'INTEGER','BigInt':'BIGINT','Float':'DOUBLE PRECISION','Boolean':'BOOLEAN','DateTime':'TIMESTAMP(3)','Json':'JSONB'}[typ]
  col=f'"{field}" {sql}'+('' if nullable else ' NOT NULL')
  if '@id' in line:col+=' PRIMARY KEY'
  if '@unique' in line:col+=' UNIQUE'
  match=re.search(r'@default\((.*?)\)(?:\)|$)',line)
  if '@default(now())' in line:col+=' DEFAULT CURRENT_TIMESTAMP'
  elif '@default(uuid())' in line:col+=' DEFAULT gen_random_uuid()::text'
  elif '@default(' in line:
   v=re.search(r'@default\(([^)]+)\)',line).group(1);col+=' DEFAULT '+("'"+v[1:-1]+"'" if v.startswith('"') else v)
  cols.append(col)
 for fields in re.findall(r'@@unique\(\[([^]]+)\]\)',body):cols.append('UNIQUE ('+','.join('"'+f.strip()+'"' for f in fields.split(','))+')')
 out.append(f'CREATE TABLE "{name}" (\n  '+',\n  '.join(cols)+'\n);')
 for rel,fields,refs in re.findall(r'\w+\s+(\w+)\??\s+@relation\(fields:\[([^]]+)\], references:\[([^]]+)\]\)',body):
  constraints.append(f'ALTER TABLE "{name}" ADD FOREIGN KEY ("{fields}") REFERENCES "{rel}" ("{refs}") ON DELETE RESTRICT;')
 for i,fields in enumerate(re.findall(r'@@index\(\[([^]]+)\]\)',body)):
  constraints.append(f'CREATE INDEX "{name}_idx_{i}" ON "{name}" ('+','.join('"'+f.strip()+'"' for f in fields.split(','))+');')
os.makedirs('prisma/migrations/202610210001_initial',exist_ok=True)
open('prisma/migrations/202610210001_initial/migration.sql','w').write('\n'.join(out+constraints)+'''\nCREATE UNIQUE INDEX "one_active_run_per_fish" ON "FishSurvivalRun" ("fishId") WHERE "endedAt" IS NULL;
ALTER TABLE "FishCatalogPrice" ADD CHECK (lamports > 0);
ALTER TABLE "FishAcquisitionOrder" ADD CHECK ("priceLamports" > 0), ADD CHECK (mode IN ('MOCK','DEVNET')), ADD CHECK (status IN ('PENDING','FULFILLED','FAILED','EXPIRED'));
ALTER TABLE "OwnedFish" ADD CHECK (status IN ('OWNED','ARCHIVED'));
ALTER TABLE "User" ADD CHECK (role IN ('PLAYER','ADMIN'));
CREATE FUNCTION prevent_fish_owner_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."ownerId" <> OLD."ownerId" THEN RAISE EXCEPTION 'Fish ownership is immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER fish_owner_immutable BEFORE UPDATE ON "OwnedFish" FOR EACH ROW EXECUTE FUNCTION prevent_fish_owner_change();
''')
