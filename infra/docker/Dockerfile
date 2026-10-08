FROM oven/bun:1.3.14 AS builder
WORKDIR /app

COPY . .
RUN --mount=type=secret,id=web_env,target=/app/.env --mount=type=cache,target=/root/.bun/install/cache bun install

# prisma/generated is gitignored; the build imports it. generate never connects, but prisma.config.ts requires DATABASE_URL to be set.
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder bun run --cwd packages/db db:generate

ENV NODE_ENV=production
RUN --mount=type=secret,id=web_env,target=/app/.env cd apps/web && bun run build
ENV DATABASE_URL=

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app

ENV HOST=0.0.0.0
ENV PORT=3001
EXPOSE 3001

# SSR chunks require workspace dependencies at runtime
WORKDIR /app/apps/web
CMD ["node", ".output/server/index.mjs"]
