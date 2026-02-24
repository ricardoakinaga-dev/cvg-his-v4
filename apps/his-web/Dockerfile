# ==========================================
# 1. BASE & DEPENDÊNCIAS (Com Hoisting)
# ==========================================
FROM node:22-bookworm-slim AS deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# 1. Configurações do Monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./

# 2. Configurações dos Apps
COPY apps/his-web/package.json ./apps/his-web/
# Se tiver packages compartilhados, descomente:
# COPY packages ./packages

# 3. TRUQUE DE MESTRE: Força estrutura plana (evita erro de symlink e binários perdidos)
RUN echo "node-linker=hoisted" > .npmrc

# 4. Instala dependências
RUN pnpm install --frozen-lockfile --prod=false

# ==========================================
# 2. BUILDER
# ==========================================
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Traz o node_modules plano do estágio anterior
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app .
COPY . .

# NEXT_PUBLIC_* vars are baked into the client bundle at build time.
ARG NEXT_PUBLIC_HIS_API_BASE_URL=/api/proxy
ENV NEXT_PUBLIC_HIS_API_BASE_URL=$NEXT_PUBLIC_HIS_API_BASE_URL

# Build Stamp - Git SHA and Build Time
ARG GIT_SHA=unknown
ARG BUILD_TIME=unknown
ENV NEXT_PUBLIC_GIT_SHA=$GIT_SHA
ENV NEXT_PUBLIC_BUILD_TIME=$BUILD_TIME
ENV NEXT_PUBLIC_BUILD_ID=${GIT_SHA:-unknown}

# Build do Next.js
RUN pnpm --filter @cvg-his/his-web build

# ==========================================
# 3. RUNNER (Produção)
# ==========================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
# O EasyPanel injeta a PORT, mas definimos 3000 como padrão
ENV PORT=3000

# ADICIONA O CAMINHO DOS BINÁRIOS AO PATH DO SISTEMA
# Isso resolve o erro "next: not found"
ENV PATH="/app/node_modules/.bin:$PATH"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia os artefatos
COPY --from=builder /app/apps/his-web/public ./apps/his-web/public
COPY --from=builder /app/apps/his-web/.next ./apps/his-web/.next
# Copia o node_modules HOISTED (com os binários reais dentro)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/his-web/package.json ./apps/his-web/package.json
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

# Executa de dentro da pasta do app
WORKDIR /app/apps/his-web

# Como adicionamos /app/node_modules/.bin ao PATH, agora o "npm start" vai achar o "next"
CMD ["npm", "run", "start"]
