FROM oven/bun:1 AS base
WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY packages/pipeline/package.json packages/pipeline/
COPY apps/dashboard/package.json apps/dashboard/
RUN bun install

COPY packages/pipeline packages/pipeline
COPY apps/dashboard apps/dashboard
COPY tsconfig.json ./

WORKDIR /app/apps/dashboard
RUN bun run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["bun", "run", "start"]
