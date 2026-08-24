# Handoff — PIX settlement sob role runtime — 2026-08-24

## Estado para a próxima sessão

O gate local de ACL/RLS do settlement PIX está **GREEN bounded**. O processo
real conecta como a role worker reconciliada (`LOGIN NOINHERIT NOBYPASSRLS`),
liquida A e B isoladamente, rejeita mutações proibidas e sobrevive à matriz de
SIGKILL/takeover/stale fencing/replay. O ERP e os gates globais continuam
`IN_PROGRESS/PARTIAL`.

Leia primeiro este handoff e o artefato
[`../.agent/artifacts/CVG-002C6-pix-runtime-role-2026-08-24.md`](../.agent/artifacts/CVG-002C6-pix-runtime-role-2026-08-24.md),
depois o handoff laboratorial e o estado/backlog.

## O que mudou

- O teste de processo PIX deixou de usar a URL administrativa `postgres` e
  cria roles descartáveis reconciliadas para o worker/API.
- O fixture expõe `current_user` no canal de controle; o teste verifica
  `NOBYPASSRLS`, isolamento A/B, ACL negativa worker/API, quatro checkpoints
  SIGKILL e stale-owner alive.
- A política de runtime agora concede apenas o helper necessário ao trigger
  deferred de `encounter_non_cash_receipts`; a migration `0124` fixa seu
  `search_path` canônico.

## Evidência

- RED administrativo: `/tmp/pix-runtime-role-red.log`, exit 1.
- RED de grant: `/tmp/pix-runtime-role-function-red.log`, exit 1.
- GREEN focal: `/tmp/pix-runtime-role-green4.log`, 2/2, exit 0.
- GREEN integral: `/tmp/pix-runtime-role-full-green.log`, 8/8, exit 0,
  142,33 s.
- Grants: `tests/unit/infra/runtime-role-grants.test.ts`, 11/11.
- Typecheck: `pnpm typecheck`, 70/70.
- Helm: imagem pinada `alpine/helm:3.15.4`, lint/template dev/staging/prod,
  exit 0.

## Próxima ação

1. Manter a evidência deste handoff nos ledgers: a regressão fresca de
   `pnpm test:critical:process` terminou `6/6`, incluindo PIX `8/8`, após a
   migration 0124 e a expansão do teste PIX.
2. Manter a decisão Helm explícita: o host não tem o binário, mas o runner
   pinado comprovou `lint/template`; ainda falta validação contra cluster/Secrets
   reais.
3. Atacar o maior gap funcional restante: executor HTTP durável de webhooks
   com claim tenant-scoped, retry/backoff real, DLQ terminal, lease/token/version
   fencing, RLS A/B e takeover após SIGKILL.
4. Preservar os gaps globais de WebAuthn durável, auditoria de actor, RLS/FORCE
   RLS global, Redis/provider, DR/RPO, migration checksum/CI deploy, SPA/E2E,
   paridade Vetus, WCAG, coverage, operações e release.

## Publicação

Esta documentação acompanha o patch de policy/migration/teste. A regressão
crítica completa foi executada em seis bancos efêmeros distintos e terminou
com exit 0; o runner de Helm pinado (`alpine/helm:3.15.4`) também passou
`lint/template` para dev/staging/prod. Isso não cobre cluster/Secrets reais,
provider, produção ou release. Mantenha
`packages/design-system/tsconfig.vue.tsbuildinfo` fora do stage. Ao abrir
outra sessão, faça `git fetch` e confirme `HEAD ==
origin/agent/sync-v4-full-program`.
