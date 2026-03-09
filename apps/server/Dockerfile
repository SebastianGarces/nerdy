FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/pipeline/package.json packages/pipeline/
COPY apps/server/package.json apps/server/
RUN bun install --frozen-lockfile

COPY packages/pipeline packages/pipeline
COPY apps/server apps/server

EXPOSE 3001
CMD ["bun", "apps/server/src/index.ts"]
