# 131 - Checklist de Cutover no Servidor

**Status:** vivo
**Data de validacao:** 2026-08-15

## Pre-cutover

- validar que o repositorio esta na revisao correta
- validar que `pnpm typecheck` e `pnpm build` passaram
- validar que as migrations oficiais foram aplicadas
- validar `.env.v2` e segredos
- validar storage de anexos
- validar acessos ao PostgreSQL e Redis
- validar portas publicadas do compose e proxy reverso

## Banco

- confirmar `DATABASE_ADMIN_URL` para migrations e `DATABASE_URL` para a role restrita de runtime
- aplicar toda a cadeia Drizzle via `tsx packages/db/src/migrate.ts`
- executar seed Drizzle via `tsx packages/db/src/seed.ts` (com ADMIN_EMAIL/ADMIN_PASSWORD)
- executar `DATABASE_ADMIN_URL="$DATABASE_ADMIN_URL" DATABASE_URL="$DATABASE_URL" pnpm validate:database-role`
- validar tabelas e constraints essenciais
- confirmar que nao ha divergencia de schema entre o ambiente e a politica oficial

## Aplicacao

- subir `apps/api`
- subir `apps/worker`
- subir `apps/spa`
- confirmar que a stack ativa usa `docker-compose.v2.yml`
- confirmar que os servicos ativos sao `cvg-his-v2-api`, `cvg-his-v2-worker` e `cvg-his-v2-spa`
- confirmar que nao existe reutilizacao operacional de `cvg-his-api`, `cvg-his-web`, `cvg-his-worker` ou qualquer trilha `apps/his-*`
- verificar healthchecks da API
- verificar homepage da SPA
- verificar logs iniciais do worker

## Validacao funcional minima

- login
- dashboard
- cadastro de tutor
- cadastro de paciente
- abertura de atendimento
- triagem
- prontuario
- internacao ou alta, conforme escopo da janela

## Proxy e publicacao

- confirmar destino do dominio principal
- confirmar destino do dominio tecnico da API, se existir
- validar portas externas reais antes do reload do proxy
- validar portas publicadas do V2:
  - API externa `3003` -> interna `3001`
  - SPA externa `3002` -> interna `3002`

## Rollback

- preservar estado do legado antes do corte
- manter plano de retorno do proxy
- nao reaproveitar parcialmente runtime de stacks diferentes
- isolar banco novo se o cutover for abortado

## Comando recomendado de subida limpa

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans
pnpm deploy:check
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis
DATABASE_ADMIN_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB npx tsx packages/db/src/migrate.ts
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa
```

## Encerramento da janela

- registrar evidencias do cutover
- salvar logs e estado final
- registrar qualquer divergencia entre docs e ambiente
- atualizar a trilha viva se houver ajuste operacional real
