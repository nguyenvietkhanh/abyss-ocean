# REST and realtime API
All routes start `/api/v1`. JSON requests are validated with Zod; errors return `{message}` and an HTTP status. Mutations require `Origin` equal to `APP_ORIGIN`. Authentication uses the HttpOnly `abyss_session` cookie. Browser requests use the Next.js same-origin proxy. No bearer keys are stored in browser storage.

| Method | Route | Input / behavior |
|---|---|---|
| POST | /auth/challenge | `{publicKey}` → id, exact message, SIWS input; expires in five minutes |
| POST | /auth/verify | `{id,publicKey,signature}`; signature is base64 Ed25519 |
| GET | /auth/me | Authenticated identity and checkout flags |
| POST | /auth/logout | Revokes session and clears cookie |
| GET | /fish/catalog | Active species with latest integer-lamport price |
| GET | /fish/catalog/:speciesId | One active species |
| GET | /fish/inventory | Owned instances, species and active leases |
| GET | /fish/inventory/:fishId | Owner-scoped instance |
| POST | /orders | `{speciesId,mode:"MOCK"|"DEVNET"}`; freezes payer, recipient, price and memo intent |
| GET | /orders/:orderId | Owner-scoped status, fish and verified transaction |
| POST | /orders/:orderId/mock-complete | Authenticated development-only idempotent fulfillment |
| POST | /orders/:orderId/verify-devnet | `{signature}`; finalized verification or pending/failed result |
| POST | /game/join | `{fishId,mode:"ocean"|"arena"}` → one-use 30-second join ticket |
| POST | /arena/queue | Same input; mode defaults to arena |
| GET | /game/profile | Runs, achievements and cosmetic pearl balance |
| GET | /game/leaderboard | Top 20 survival runs; not financial rewards |
| GET | /arena/matches/:matchId | Match and ranked participants |
| GET | /admin | Administrator-only counters and bounded audit history |
| GET | /health | Database health and safe network flags |

Except catalog, login and health, routes require authentication. All inventory and order lookups enforce ownership. Colyseus `joinOrCreate("ocean"|"arena", {ticket})` consumes a ticket, checks the session and inserts a unique fish lease. Input `{x,y,boost}` is normalized and rate limited. `specialize` accepts swift, armored or hunter at level 2. `respawn` creates a fresh run only after death is persisted. Server messages: welcome, snapshot, death, error and matchEnded. Unconsented disconnects get a 15-second reconnection window. The server continues collision simulation during that window.
