# Auditoria independente — workflow clínico

## Reconciliação do candidato vigente — 2026-09-12

O texto abaixo é histórico. No SHA
`c7336ac0f6a909c10d07797c36814f0b321c6d5`, os contratos e jornadas canônicas
passam localmente e o E2E clínico do CI #135 passou; PostgreSQL/worker crash,
efeitos duráveis e target continuam sem envelope externo `PASS`.

**SHA auditado:** `b77539c9891eef89cbbe8160bf6e30a0fb369d48`
**Escopo:** fases 7–13 e P0s 4–7 do prompt State of Art
**Resultado:** `INCOMPLETE / NOT PROVEN`

No candidato `68600d6a`, a fronteira HTTP passou a rejeitar `executionMode=worker`
quando o tipo não está em uma allow-list imutável. Isso fecha o caminho de
produção para tarefas sem handler registrado; não cria um handler clínico nem
prova o efeito durável, retry/DLQ ou crash recovery de um worker aprovado.

O código possui repositório PostgreSQL, idempotência, eventos append-only,
claims concorrentes, leases, fencing, retry, DLQ e replay. A auditoria não
tratou código ou configuração como prova de runtime: `localhost:5433` recusou
a conexão, `pg_isready` não está disponível e Docker retornou `permission
denied`.

Validações executadas pelo crítico:

- `pnpm validate:clinical-workflow` — PASS;
- `node --test scripts/validate-clinical-workflow-schema.test.mjs` — PASS `1/1`;
- `node scripts/check-migration-source-of-truth.mjs` — PASS;
- testes unitários de workflows — PASS `14/14`, limitados a memória/doubles.

As suítes PostgreSQL e SIGKILL não foram executadas neste ambiente. O teste de
crash recovery atual prova reclaim/fencing da task, mas o fixture não executa
um efeito material com ledger/outbox idempotente; por isso não prova ausência
de efeito duplicado após crash. O crítico também apontou que todos os erros
seguem a política retryable até o limite, que a classificação retryable/permanent
não é persistida e que faltam gauges explícitos de profundidade/idade da fila,
DLQ e heartbeat.

Este relatório é evidência independente de lacunas, não aprovação. O gate deve
continuar bloqueado até a execução PostgreSQL/processual no SHA exato e até um
teste de efeito durável demonstrar exatamente um efeito material após
SIGKILL/reclaim.
