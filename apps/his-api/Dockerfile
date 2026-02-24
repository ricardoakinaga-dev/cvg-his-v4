# ==========================================
# apps/his-api/Dockerfile
# Monorepo pnpm — Produção
# ✅ copia o source do his-api
# ✅ inclui curl para healthcheck
# ✅ roda via npm start (tsx)
# ==========================================

# ==========================================
# 1) DEPS
# ==========================================
FROM node:22-bookworm-slim AS deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Configs do monorepo (cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./

# Copia manifests/workspace packages p/ resolver dependências
COPY apps/his-api/package.json ./apps/his-api/package.json
COPY packages ./packages

# Instala deps (inclui dev deps pq usamos tsx)
RUN pnpm install --frozen-lockfile --prod=false


# ==========================================
# 2) RUNNER
# ==========================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Build Stamp - Git SHA and Build Time
ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown
ENV GIT_SHA=$GIT_SHA
ENV BUILD_TIME=$BUILD_TIME
ENV BUILD_ID=$GIT_SHA

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:/app/node_modules/.bin:$PATH"

# Ferramentas p/ healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Usuário não-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nodeapi

# Copia node_modules e workspace base
COPY --from=deps /app /app

# ✅ AGORA copia o CÓDIGO FONTE real da API
# (isso garante /app/apps/his-api/src/* dentro da imagem)
COPY apps/his-api ./apps/his-api

# (packages já vieram do deps, mas ok manter explícito se quiser)
COPY packages ./packages

RUN chown -R nodeapi:nodejs /app
USER nodeapi

EXPOSE 3000
WORKDIR /app/apps/his-api

# Healthcheck (ajuste se seu endpoint for outro)
HEALTHCHECK --interval=10s --timeout=3s --retries=10 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

CMD ["npm", "run", "start"]
