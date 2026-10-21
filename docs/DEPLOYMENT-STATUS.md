# Deployment status — 2026-10-21

Local Next.js production build: successful. Source lives in `/workspace/abyss-ocean`.

Railway workspace is accessible via its connected app. The only existing project found was remarkable-purpose with its unrelated trade-meme service. No existing service was changed. Attempts to create an isolated abyss-ocean project returned `Deploys have been paused temporarily`; no new project/service/domain was created.

Railway documents this temporary capacity condition at https://docs.railway.com/deployments/reference#deployments-paused---limited-access. Do not assume the actual account plan from this error. No billing change was made.

The user selected a separate `abyss-ocean` repository. `nguyenvietkhanh/abyss-ocean` initially returned GitHub 404, then became accessible with write permission after the user created it. The main branch initially contained only a README. The source is being published to this selected repository. No other repository was modified.

Next action: once Railway accepts project creation again, provision private PostgreSQL and Redis, configure separate API/web services from this repo using deploy/railway-api.json and deploy/railway-web.json, generate domains, freeze APP_ORIGIN/NEXT_PUBLIC_GAME_URL/API_INTERNAL_URL, run migrations/seed and deploy. Verify HTTPS login, inventory, two-player websocket gameplay and respawn against the returned domains before reporting a live game URL.
