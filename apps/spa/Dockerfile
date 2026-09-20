FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS builder

RUN npm install -g pnpm@10.33.0

WORKDIR /app

ARG VITE_DISABLE_PWA=1
ARG VITE_API_BASE_URL=
ARG VITE_APP_NAME="CVG HIS V2"
ENV VITE_DISABLE_PWA=${VITE_DISABLE_PWA}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra

RUN pnpm install --frozen-lockfile --prod=false
# Vite imports this build-only helper graph even when evidence collection is disabled.
COPY scripts/lib/vue-specialized-build-evidence.mjs scripts/lib/vue-specialized-build-evidence.d.mts scripts/lib/vue-specialized-evidence.mjs scripts/lib/root-contained-path.mjs ./scripts/lib/
RUN find . -name 'tsconfig.tsbuildinfo' -delete
RUN pnpm --filter @cvg-his-v2/spa run build

FROM nginx:1.30.5-alpine3.24@sha256:a5f2157a0302eb0c5e300415effb63a9e70ed1eb9c107283819bf6d149ab607c AS runner

ENV NODE_ENV=production

WORKDIR /usr/share/nginx/html

# Keep runtime state writable without making configuration or served assets mutable.
RUN rm -f /etc/nginx/conf.d/default.conf \
  && sed -i 's!^pid .*;!pid /tmp/nginx.pid;!' /etc/nginx/nginx.conf \
  && mkdir -p /var/cache/nginx \
  && chown -R nginx:nginx /var/cache/nginx

# Render the canonical chart-owned nginx template for Docker Compose. Helm
# mounts the same template with its release-scoped API Service name.
COPY infra/helm/cvg-his-v2/files/spa-nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i \
    -e 's!__API_RESOLVER__!resolver 127.0.0.11 valid=10s ipv6=off;!' \
    -e 's!__API_UPSTREAM__!cvg-his-v2-api:3001 resolve!' \
    /etc/nginx/conf.d/default.conf

# Copy SPA build output
COPY --from=builder /app/apps/spa/dist .

RUN chmod -R a-w /usr/share/nginx/html /etc/nginx/conf.d /etc/nginx/nginx.conf

USER nginx

EXPOSE 3002

HEALTHCHECK --interval=5s --timeout=3s --retries=20 --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3002/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
