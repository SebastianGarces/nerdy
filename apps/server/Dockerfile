FROM oven/bun:1 AS base
WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY packages/pipeline/package.json packages/pipeline/
COPY apps/server/package.json apps/server/
RUN bun install

COPY packages/pipeline packages/pipeline
COPY apps/server apps/server

EXPOSE 3001
CMD ["bun", "apps/server/src/index.ts"]
