FROM node:22-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS builder

RUN npm install -g pnpm@10.34.5

WORKDIR /app

ARG VITE_DISABLE_PWA=1
ARG VITE_API_BASE_URL
ARG VITE_APP_NAME=CVG\ HIS\ V2
ENV VITE_DISABLE_PWA=${VITE_DISABLE_PWA}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY infra ./infra

RUN pnpm install --frozen-lockfile --prod=false
RUN find . -name 'tsconfig.tsbuildinfo' -delete
RUN pnpm --filter @cvg-his-v2/spa run build

FROM nginxinc/nginx-unprivileged:1.31-alpine@sha256:334d92979f15aaecd5dd50af5105e1230e2bb70765d45b1e2f964e7c5eda81c3 AS runner

ENV NODE_ENV=production

WORKDIR /usr/share/nginx/html

# Copy custom nginx config
COPY --chown=101:101 apps/spa/nginx.conf /etc/nginx/conf.d/default.conf

# Copy SPA build output
COPY --from=builder --chown=101:101 /app/apps/spa/dist .

USER 101:101

EXPOSE 3002

HEALTHCHECK --interval=5s --timeout=3s --retries=20 --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3002/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
