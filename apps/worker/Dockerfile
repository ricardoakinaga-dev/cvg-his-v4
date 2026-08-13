FROM node:22-bookworm-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436 AS builder

RUN npm install -g pnpm@10.34.5

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile --prod=false
RUN find . -name 'tsconfig.tsbuildinfo' -delete
RUN pnpm --filter @cvg-his-v2/worker... run build
RUN pnpm --filter @cvg-his-v2/worker deploy --prod /runtime/worker

FROM gcr.io/distroless/nodejs22-debian13:nonroot@sha256:939d6f1671529d230f50b563578e9b5d206af58f038b10ebd7e1233023d4e167 AS runner

ENV NODE_ENV=production
ENV WORKER_HEALTH_PORT=3002

WORKDIR /app

COPY --from=builder --chown=nonroot:nonroot /runtime/worker ./

USER nonroot

EXPOSE 3002

HEALTHCHECK --interval=10s --timeout=3s --retries=20 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:'+(process.env.WORKER_HEALTH_PORT||'3002')+'/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

ENTRYPOINT ["/nodejs/bin/node"]
CMD ["dist/index.js"]
