FROM node:22-bookworm-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .npmrc* ./
COPY apps/his-web ./apps/his-web
COPY packages ./packages
RUN echo "node-linker=hoisted" > .npmrc

ARG NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy
ENV NEXT_PUBLIC_HIS_API_BASE_URL=$NEXT_PUBLIC_HIS_API_BASE_URL
ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown
ENV NEXT_PUBLIC_GIT_SHA=$GIT_SHA
ENV NEXT_PUBLIC_BUILD_TIME=$BUILD_TIME
ENV NEXT_PUBLIC_BUILD_ID=${GIT_SHA:-unknown}

RUN pnpm install --frozen-lockfile --prod=false
RUN cd apps/his-web && node /app/node_modules/next/dist/bin/next build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV PATH="/app/node_modules/.bin:$PATH"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/his-web/public ./apps/his-web/public
COPY --from=builder /app/apps/his-web/.next ./apps/his-web/.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/his-web/package.json ./apps/his-web/package.json
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3000
WORKDIR /app/apps/his-web
CMD ["npm", "run", "start"]
