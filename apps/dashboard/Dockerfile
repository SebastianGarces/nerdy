FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/pipeline/package.json packages/pipeline/
COPY apps/dashboard/package.json apps/dashboard/
RUN bun install --frozen-lockfile

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY packages/pipeline packages/pipeline
COPY apps/dashboard apps/dashboard
COPY package.json tsconfig.json ./
WORKDIR /app/apps/dashboard
RUN npx next build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/dashboard/.next/standalone ./
COPY --from=builder /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public
EXPOSE 3000
CMD ["node", "apps/dashboard/server.js"]
