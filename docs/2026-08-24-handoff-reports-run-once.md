# Handoff — relatórios agendados no worker `run-once` — 2026-08-24

## Estado atual

O caminho one-shot do worker agora executa o job de relatórios agendados dentro
do contexto tenant/account correto. Antes, `run-once` cobria notificações,
outbox e webhooks, mas não chamava `runScheduledReportsTick`; além disso, o
tick de notificações acessava o banco sem `runWithTenantContext`.

Implementação:

- `apps/worker/src/run-once.ts` envolve notificações, outbox, webhooks e
  relatórios em contexto da conta;
- cria `ReportsService` com `bootstrap.reportRepository` e as fontes de
  relatório persistentes;
- usa `WORKER_REPORTS_USER_ID` como ator do relatório, com fallback somente para
  a conta configurada;
- `apps/worker/src/report-delivery-provider.ts` aceita
  `REPORT_EMAIL_ENDPOINT` somente em `test`/`development`, com URL validada;
  ambientes production-like rejeitam o override e usam o endpoint fixo do
  Resend.
- com `WORKER_REPORTS_RETRY_FAILED=1`, um `run-once` de operação hidrata
  deliveries `failed` do PostgreSQL e reprocessa cada linha preservando o
  artefato e o `Idempotency-Key`; o loop contínuo não ativa esse replay sem uma
  política de lease/backoff própria;
- a migration `0143_reports_delivery_leases.sql` adiciona lease distribuído
  account-scoped (`claim_token`, `claim_until`, `claim_worker_id`) e o worker
  reivindica deliveries falhas com `FOR UPDATE SKIP LOCKED`; a gravação final
  exige o token vigente e funciona como fence contra worker stale.
- `packages/modules/reports/src/index.ts` persiste a identidade da entrega como
  `failed` antes da chamada externa. Se o worker morrer enquanto a requisição
  estiver em voo, a linha continua descoberta pelo replay e mantém a mesma
  chave idempotente.

## Evidência fresca

O teste de processo
`tests/integration/process/worker-run-once-reports.test.ts` passou 5/5 em um
PostgreSQL efêmero, com dois processos one-shot reais:

1. agenda vencida sem destinatário: execução persistida e recorrência avançada;
2. agenda vencida com destinatário: receptor HTTP local recebeu o artefato,
   chave idempotente e tag de delivery; a linha PostgreSQL ficou `sent` com
   `execution_id` e `export_id`.
3. falha/reprocessamento: o primeiro processo recebeu HTTP 503 e persistiu
   `failed`; o segundo, com o flag explícito, recebeu HTTP 200 e convergiu a
   mesma linha para `sent`, com a mesma chave idempotente.
4. recuperação após interrupção: o primeiro processo recebeu a requisição no
   receptor local, foi encerrado com `SIGKILL` enquanto a resposta estava em
   voo e deixou a linha retryable; o segundo reprocessou a mesma identidade e
   persistiu `sent`.
5. concorrência de retry: dois processos one-shot iniciados juntos disputaram
   uma única delivery falha; somente um claim chamou o provider, e a linha
   convergiu para `sent` com a identidade idempotente estável.

Também passaram:

- provider unitário: 4/4;
- worker package: compilação e todos os testes declarados pelo package script;
- module-reports: 11/11, incluindo persistência, claim concorrente, falha,
  retry e isolamento;
- migration unitária: 2/2, verificando o contrato de colunas, índice parcial e
  estado válido do lease;
- persistência PostgreSQL de relatórios: 2/2, incluindo competição de claim,
  takeover após expiração, fence do token antigo e retry com o token novo.

Os REDs foram reais e instrutivos: primeiro o processo falhou com `Tenant
context is not available`; depois, o cenário SIGKILL não deixou nenhuma linha
persistida enquanto a entrega ainda estava em voo. As correções foram feitas no
runtime, não nos testes.

## Limites e próxima sequência

Esta é uma prova bounded de bootstrap/execução/entrega, não uma homologação do
Resend nem um gate global do ERP. O lease distribuído está comprovado somente
no PostgreSQL efêmero e usa janela padrão de 120 s; takeover após expiração,
provider idempotente externo, cluster/Secrets, Redis, DR/RPO e paridade Vetus
continuam sem homologação. A recuperação SIGKILL é bounded ao receptor local e
mantém o contrato at-least-once; o replay segue deliberadamente one-shot e
explícito. A próxima auditoria deve atacar o maior gap restante do plano,
preservando a evidência de webhook já implementada.

Artefato técnico: `.agent/artifacts/CVG-002C6-reports-run-once-2026-08-24.md`.
