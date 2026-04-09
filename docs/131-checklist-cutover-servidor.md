# 131 - Checklist de Cutover no Servidor

**Status:** vivo
**Data de validacao:** 2026-03-31

## Pre-cutover

- validar que o repositorio esta na revisao correta
- validar que `pnpm typecheck` e `pnpm build` passaram
- validar que as migrations oficiais foram aplicadas
- validar `.env.v2` e segredos
- validar storage de anexos
- validar acessos ao PostgreSQL e Redis
- validar portas publicadas do compose e proxy reverso

## Banco

- confirmar `DATABASE_URL` do ambiente
- aplicar migration Drizzle `0000_` via `tsx packages/db/src/migrate.ts`
- executar seed Drizzle via `tsx packages/db/src/seed.ts` (com ADMIN_EMAIL/ADMIN_PASSWORD)
- validar tabelas e constraints essenciais
- confirmar que nao ha divergencia de schema entre o ambiente e a politica oficial

## Aplicacao

- subir `apps/api`
- subir `apps/web`
- subir `apps/worker`
- confirmar que a stack ativa usa `docker-compose.v2.yml`
- confirmar que os servicos ativos sao `cvg-his-v2-api`, `cvg-his-v2-web` e `cvg-his-v2-worker`
- confirmar que nao existe reutilizacao operacional de `cvg-his-api`, `cvg-his-web`, `cvg-his-worker` ou qualquer trilha `apps/his-*`
- verificar healthchecks da API
- verificar homepage do Web
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
  - API externa `3000` -> interna `3001`
  - Web externa `3001` -> interna `3000`

## Rollback

- preservar estado do legado antes do corte
- manter plano de retorno do proxy
- nao reaproveitar parcialmente runtime de stacks diferentes
- isolar banco novo se o cutover for abortado

## Comando recomendado de subida limpa

```bash
docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans
docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker
docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker
```

## Encerramento da janela

- registrar evidencias do cutover
- salvar logs e estado final
- registrar qualquer divergencia entre docs e ambiente
- atualizar a trilha viva se houver ajuste operacional real
