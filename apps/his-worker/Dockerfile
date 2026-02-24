FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN corepack pnpm install --frozen-lockfile

ENV NODE_ENV=production

CMD ["sh", "-lc", "corepack pnpm --filter @cvg-his/his-worker start"]
