FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS builder

RUN npm install -g pnpm@10.33.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra

RUN pnpm install --frozen-lockfile --prod=false
# Vite imports this build-only helper graph even when evidence collection is disabled.
COPY scripts/lib/vue-specialized-build-evidence.mjs scripts/lib/vue-specialized-build-evidence.d.mts scripts/lib/vue-specialized-evidence.mjs scripts/lib/root-contained-path.mjs ./scripts/lib/
RUN find . -name 'tsconfig.tsbuildinfo' -delete
RUN pnpm build \
  && pnpm --filter @cvg-his-v2/worker deploy --prod /prod/worker \
  && cp apps/worker/package.json /prod/worker/package.json \
  && find /prod/worker -type f \( -name '*.ts' -o -name '*.map' -o -name '*.test.js' -o -name '*.spec.js' \) -delete

FROM node:22.23.2-alpine3.24@sha256:b6f26b36c8ff49624cfdac716b8ea1138d606df02586a77d364bb5536a634f85 AS runner

ENV NODE_ENV=production
ENV WORKER_HEALTH_PORT=3002

WORKDIR /app

RUN corepack disable \
  && rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack \
    /usr/local/lib/node_modules/pnpm \
    /usr/local/bin/pnpm \
    /usr/local/bin/yarn \
    /usr/local/bin/yarnpkg \
    /opt/yarn-v1.22.22

COPY --from=builder /prod/worker ./

RUN mkdir -p /srv/cvg-his-v2/storage \
  && chown -R node:node /srv/cvg-his-v2/storage \
  && chmod -R a-w /app

USER node

EXPOSE 3002

HEALTHCHECK --interval=10s --timeout=3s --retries=20 \
  CMD wget -qO- "http://127.0.0.1:${WORKER_HEALTH_PORT}/ready" >/dev/null || exit 1

CMD ["node", "dist/index.js"]
