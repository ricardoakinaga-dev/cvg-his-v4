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

## Rollback

- preservar estado do legado antes do corte
- manter plano de retorno do proxy
- nao reaproveitar parcialmente runtime de stacks diferentes
- isolar banco novo se o cutover for abortado

## Encerramento da janela

- registrar evidencias do cutover
- salvar logs e estado final
- registrar qualquer divergencia entre docs e ambiente
- atualizar a trilha viva se houver ajuste operacional real
