FROM node:22-bookworm-slim AS builder

RUN npm install -g pnpm@10.33.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra

RUN pnpm install --no-frozen-lockfile --prod=false
RUN find . -name 'tsconfig.tsbuildinfo' -delete
RUN pnpm build

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=3s --retries=20 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

CMD ["node", "apps/api/dist/index.js"]