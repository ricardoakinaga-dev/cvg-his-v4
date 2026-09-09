FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS builder

RUN npm install -g pnpm@10.33.0

WORKDIR /app

ARG VITE_DISABLE_PWA=1
ARG VITE_API_BASE_URL=
ARG VITE_APP_NAME="CVG HIS V2"
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

FROM nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10 AS runner

ENV NODE_ENV=production

WORKDIR /usr/share/nginx/html

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY apps/spa/nginx.conf /etc/nginx/conf.d/default.conf

# Copy SPA build output
COPY --from=builder /app/apps/spa/dist .

RUN chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/conf.d

USER nginx

EXPOSE 3002

HEALTHCHECK --interval=5s --timeout=3s --retries=20 --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3002/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
