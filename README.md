# ABYSS OCEAN 2.0
A TypeScript pnpm monorepo with Next.js, Phaser, authoritative Colyseus rooms, NestJS, PostgreSQL/Prisma, and optional Redis/BullMQ Devnet verification. All collectible rarity is cosmetic. Fish ownership survives death.

## Local development
Requires Node 24+, pnpm 11.25+, and PostgreSQL 17+; Redis 7+ is required only for enabled Devnet checkout.

```sh
cp .env.example .env
# Replace SESSION_SECRET with at least 32 random characters.
pnpm install
pnpm db:generate
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed
pnpm dev
```
Open http://localhost:3000. API/Colyseus use port 3001. Connect a Wallet Standard-compatible Solana wallet; sign the login challenge. In the catalog, simulate acquisition, complete the explicitly labeled mock checkout, choose your fish, and enter Living Ocean or PvP Arena. Keyboard: WASD/arrows, Space to boost. Touch: hold the screen to steer, use Boost. Evolve at 25/55/100 biomass; specialize in swift, armored or hunter. Fish at least 25% larger can eat prey after universal five-second immunity. Armored level-2 prey require a 45% size advantage. Hunter gets wider camera vision.

Without Docker, `pnpm db:local` runs the development-only embedded PostgreSQL package on port 5432 with persistent data in `.runtime/postgres`. Keep that process running, then migrate/seed in another terminal. Do not use embedded Postgres as production infrastructure.

## Checks
With database and API running:
```sh
pnpm check
pnpm test
pnpm test:e2e
pnpm build
node --import tsx scripts/load.ts
```
Playwright defaults to `/usr/bin/chromium`; set CHROMIUM_PATH for your installed browser. For the separately verified container stack, build API/web images named abyss-ocean-api:verify and abyss-ocean-web:verify, then run `docker compose --env-file .env -p abyss-verify -f deploy/compose.verify.yaml up -d`; use DATABASE_URL pointing to localhost:15432 for the database tests.

Browser tests register an isolated test wallet and sign challenges with ephemeral test keys, without adding any server authentication bypass. Tests create development records; use an isolated local database. Unit Devnet tests mock every RPC call. No live Devnet transactions run in the normal test suite.

## Devnet sandbox
Disabled by default. Set `ENABLE_DEVNET_CHECKOUT=true` only in a development/staging environment, `SOLANA_NETWORK=devnet`, `REDIS_URL`, and a dedicated `DEVNET_TEST_TREASURY_PUBLIC_KEY`. Keep `ENABLE_MAINNET=false` and `ENABLE_REAL_PAYMENTS=false`. Open a fish details page and choose Devnet test checkout. The explicit transaction button creates one transfer and a unique order memo. The verifier accepts finalized transactions only. Status polling and manual retry never grant duplicate fish. Browser submission persists the public signature locally for recovery after canceled navigation; it never stores private keys. A rejected wallet prompt does not fulfill an order. For a real Devnet smoke test, use test funds only and verify the resulting signature, order record and one owned fish; this has not been run in the supplied environment.

## Containers and Railway staging
`docker compose up --build` starts PostgreSQL, Redis, a one-shot migration/seed, API and web. Compose defaults are local development credentials. Configure secrets and persistent database backups for remote staging. Docker builds in a managed proxy environment can pass the public CA with `--secret id=proxy_ca,src=...`.

Railway has separate API and web services plus PostgreSQL and Redis. Use the config files in `deploy/` as each service's custom configuration path. The API uses deploy/Dockerfile.api; the web uses the root Dockerfile. API requires a single replica, persistent PostgreSQL, Redis for Devnet, a strong SESSION_SECRET and APP_ORIGIN set to the web HTTPS origin. Set APP_ENV=staging, testing flags explicitly, and the DATABASE_URL/REDIS_URL service references. Set web build variables API_INTERNAL_URL to the API HTTP origin and NEXT_PUBLIC_GAME_URL to the API `wss://` public domain. Both are required at build time; changing them requires rebuilding the web app. API respects Railway PORT. Expose websocket upgrades. Test health, login, mock acquisition and two-player gameplay after deploying. Do not claim production readiness from a successful build alone.

Railway deployment was attempted through the connected app but project creation was rejected with “Deploys have been paused temporarily.” No game domain exists yet. The selected source repository is https://github.com/nguyenvietkhanh/abyss-ocean. See docs/DEPLOYMENT-STATUS.md, docs/TEST-REPORT.md and docs/KNOWN-LIMITATIONS.md for verified status.

## Structure
- `apps/api/src`: auth, REST, ownership fulfillment, Colyseus rooms, Devnet worker.
- `apps/web/app`: responsive dashboard, Wallet Standard client and Phaser renderer.
- `packages/core/src`: presentation-independent rules, simulation, catalog and Devnet verification.
- `prisma`: models, SQL migration and idempotent catalog seed.
- `tests`: unit, real PostgreSQL integration, realtime integration and Playwright.
- `docs`: architecture, execution gates, API, security and actual verification report.

Schema migrations run as checked-in SQL through a transactional pg runner with a migration ledger; Prisma uses the JavaScript PostgreSQL adapter. The SQL includes partial indexes, checks and an immutable-owner trigger that are not representable in Prisma's schema language. Do not use `prisma db push` to replace these constraints.
