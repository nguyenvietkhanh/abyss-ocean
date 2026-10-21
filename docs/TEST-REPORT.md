# Verification report — 2026-10-21

## Successful checks

| Check | Actual result |
|---|---|
| `pnpm build` | Passed: Prisma JavaScript client generation, strict root TypeScript check and optimized Next.js 15.5.12 production build |
| API Docker build | Passed; final image runs as UID 1000 and reads Prisma/pg dependencies |
| Web Docker build | Passed; optimized Next build inside container and non-root runtime |
| Isolated Docker Compose stack | PostgreSQL 17 healthy; Redis 7, NestJS/Colyseus API and Next.js web running; migration/seed exited successfully |
| Web proxy `/api/v1/health` | HTTP 200, status ok, network devnet, Devnet checkout false, mock checkout true |
| Vitest against Docker PostgreSQL/API | **37 passed across 9 files**, 7.78 seconds |
| Playwright against Docker web/API | **3 passed**, 15.2 seconds, Chromium |
| Simulation benchmark | 50 simulated fish, 2,000 ticks at configured 20 Hz; p95 0.276 ms, p99 0.391 ms in the earlier local measurement |

The successful container run used `deploy/compose.verify.yaml` with a separate project `abyss-verify`, isolated volumes and PostgreSQL on host port 15432. The ordinary local database was preserved. Actual test command: `DATABASE_URL=postgresql://abyss:abyss@localhost:15432/abyss ./node_modules/.bin/vitest run`, followed by `./node_modules/.bin/playwright test`.

## Coverage
- Ed25519 valid/invalid signatures, challenge expiry, one-time consumption, wallet/account mismatch and opaque session hashing.
- Atomic concurrent mock fulfillment, one fish per order, duplicate Devnet signature constraints and database rollback.
- Ownership checks, missing ownership, concurrent spawn leases, death preserving inventory and respawn at 10 biomass.
- Equal rarity stats, normalized movement, food collection, growth/evolution, immunity, predation, boost stamina, mobility tradeoffs and spatial bucket queries.
- Five-minute arena timer and progression reset.
- Mocked Devnet finalized verification, wrong network/payer/recipient/amount/time/memo/signature/instruction shape, pending/failure and RPC outages.
- Two actual Colyseus clients synchronizing movement; invalid joins; fish already active; reconnecting the same fish without another run.
- Actual API process restart against an isolated PostgreSQL database: stale run closed, inventory retained, persisted session usable after another restart.
- Browser catalog filtering/no-wallet state; cryptographically signed test-wallet login; mock checkout; owned collection; playable Phaser canvas; desktop input; wallet switching/logout; mobile layout and visible boost control.

## Failures found and corrected
- Selection was lost across page transitions; selection now defaults to an owned fish.
- A mobile browser test navigated before login finished; it now waits for authenticated navigation.
- A long-lived terminal-managed test API became unresponsive; restarting with file-backed logs produced repeatable full-suite passes.
- Initial container files were not readable by the non-root runtime; separate runtime stages now copy with node ownership.
- Docker's VFS build layers filled the workspace; obsolete ABYSS images and unused build cache were removed while retaining data volumes. Final stack then started successfully.
- Restricted-environment generation attempted native engine downloads; Prisma uses its JavaScript engine configuration and a generation-only datasource URL when no runtime database is supplied. Real migrations use the configured PostgreSQL URL.

## Not verified
No live Devnet transfer, third-party wallet extension certification, 50-client network capacity test, full five-minute browser arena completion, independent penetration test, or Railway deployment succeeded. See KNOWN-LIMITATIONS.md. Repository publication and Railway state are reported separately in DEPLOYMENT-STATUS.md.
