# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
RUN --mount=type=secret,id=proxy_ca NODE_USE_ENV_PROXY=1 sh -c 'if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; pnpm install --frozen-lockfile'
COPY . .
RUN pnpm db:generate
FROM node:24-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base --chown=node:node /app /app
USER node
EXPOSE 3001
CMD ["node","--env-file-if-exists=.env","--import","tsx","apps/api/src/main.ts"]
FROM base AS web-build
ARG NEXT_PUBLIC_GAME_URL=ws://localhost:3001
ARG API_INTERNAL_URL=http://api:3001
ENV NEXT_PUBLIC_GAME_URL=$NEXT_PUBLIC_GAME_URL API_INTERNAL_URL=$API_INTERNAL_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec next build apps/web
FROM node:24-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
ARG API_INTERNAL_URL=http://api:3001
ENV API_INTERNAL_URL=$API_INTERNAL_URL
COPY --from=web-build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next","start","apps/web","--hostname","0.0.0.0"]
