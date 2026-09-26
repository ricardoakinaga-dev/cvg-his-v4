---
document_status: preparation
document_kind: target-certification-runbook
effective_date: 2026-09-22
owner: Platform, Data/DBA, Security, SRE and Operations
---

# Runbook de preparação do target — REM-022 a REM-025 e REM-030

Este documento é o pacote local de preparação da Fase 3 da remediação integral.
Ele congela o contrato de execução para os cartões de target sem afirmar que
qualquer prova de target foi executada. O estado corrente dos cinco cartões
continua `BLOCKED` até que `REM-021` seja concluída e as autoridades forneçam
ambiente, credenciais, limites e autorização vinculados ao candidato.

## Limites de segurança

- Esta preparação é somente leitura sobre o target: não abre conexão, não usa
  credencial, não faz deploy, não restaura, não executa rollback, não inicia
  carga e não interrompe worker.
- A execução posterior exige ambiente descartável ou formalmente aprovado,
  dados sintéticos, candidato congelado e registro `CONFIRMED` em
  `.agent/authority.jsonl` para o escopo exato.
- O worktree compartilhado está dirty por design. Nenhuma evidência target pode
  apontar para este estado; a execução deve registrar o SHA congelado de
  `REM-018/021`, o estado limpo e os digests que forem usados.
- Um comando local ou uma fixture PostgreSQL descartável é evidência de
  preparação/rehearsal, nunca prova de target, RPO/RTO, SLO ou release.

## Pré-condições comuns para a execução futura

Antes de qualquer comando que atravesse o boundary externo, registrar todos os
itens abaixo no ticket/authority record e anexar a cópia redigida ao pacote de
evidência:

| Pré-condição                                    | Dono mínimo               | Evidência necessária                          |
| ----------------------------------------------- | ------------------------- | --------------------------------------------- |
| candidato e imagem por SHA/digest congelados    | Release/Lead              | `candidate_sha`, manifests e identidade limpa |
| target descartável ou janela aprovada           | Operations/SRE            | ambiente, namespace, região e janela          |
| credenciais de teste por canal seguro           | Security/DBA              | identificadores de secret, nunca o valor      |
| tenant/fixture sintético e plano de limpeza     | Data/Clinical             | IDs, contagens antes/depois e cleanup         |
| limites RPO/RTO/SLO e perfil de carga aprovados | Operations/SRE/Product    | decisão vinculada ao run                      |
| owners presentes para decisão/reversão          | Release/Operations        | nomes/funções e canal de escalonamento        |
| autorização `CONFIRMED` para cada mutação       | autoridade correspondente | registro com escopo, expiração e compensação  |

Se uma pré-condição estiver ausente, o resultado é `BLOCKED` ou `NOT_RUN`; não
é permitido converter um script existente em aceite por documentação.

## Matriz executável preparada

### REM-022 — RLS/FORCE RLS no target

Invariante: uma principal de runtime sem `BYPASSRLS`, com contexto da conta A,
não pode ler, inserir, atualizar ou excluir fatos da conta B; o contexto
ausente deve falhar fechado. O catálogo deve mostrar `relrowsecurity` e
`relforcerowsecurity` verdadeiros nas relações cobertas.

Preparação local e descartável já disponível:

```text
pnpm validate:rls
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 pnpm exec vitest run \
  tests/integration/rls/force-rls-catalog.test.ts \
  tests/integration/rls/rls-isolation.test.ts \
  tests/integration/rls/rls-access-governance.test.ts \
  tests/integration/rls/runtime-role-sensitive-acl.test.ts \
  --config vitest.integration.config.ts
```

O pacote local cobre o checker de migrations, o papel sem `BYPASSRLS`,
isolamento de leitura/escrita e a ACL sensível. No target, repetir somente em
um banco descartável aprovado e anexar: catálogo de roles, `pg_class`,
`pg_policies`, privilégios, casos A/B de leitura e DML, contexto ausente,
checksum do candidato, cleanup e resultado redigido. Known-bads obrigatórios:
`BYPASSRLS=true`, política sem `WITH CHECK`, contexto A consultando B e
identificador de B enviado pela aplicação.

### REM-023 — recovery do worker

Invariante: após crash/restart, um job pode ser redeliverado, mas uma única
materialização de efeito durável é aceita; lease, owner, token e versão
precisam coincidir. Um worker stale não pode concluir o claim de outro worker.

Preparação local e descartável já disponível:

```text
pnpm test:critical:process
REQUIRE_TEST_DB=1 TEST_DB_EPHEMERAL=1 pnpm exec vitest run \
  tests/integration/process/worker-runtime-entrypoint.test.ts \
  tests/integration/process/worker-run-once-reports.test.ts \
  tests/integration/process/workflow-task-sigkill.test.ts \
  --config vitest.integration.config.ts
```

No target, o run deve capturar o job id redigido, claim/lease antes e depois,
evento de crash, redelivery, retries/DLQ, efeito durável e contagem final.
Interromper o worker somente dentro da janela aprovada e nunca em tráfego real
sem plano de recuperação. Known-bads: concluir com token stale, duplicar efeito
após redelivery, ignorar fencing ou aceitar tarefa manual no runner.

### REM-024 — restore/rollback e RPO/RTO

Invariante: o conjunto de banco, globals, storage, auditoria, outbox e
idempotência restaurado é compatível com o candidato e mantém isolamento de
tenant. O tempo observado deve ser comparado aos limites aprovados, não aos
defaults da política.

Preparação local e fixtures existentes:

```text
pnpm ops:backup:check
RESTORE_FIXTURE_PROFILE=representative pnpm ops:restore:drill:fixture:representative
pnpm test:migration-harness
pnpm ops:install-upgrade:drill
```

Esses comandos são rehearsals locais/descartáveis. No target, anexar backup id,
manifest, `SHA256SUMS`, TOC, versão de schema, início/fim, RPO/RTO observado,
contagens e grafo clínico sintético, checks de RLS, resultado do rollback e
cleanup. Known-bads: checksum/TOC inválido, versão incompatível, bundle parcial,
storage ausente quando declarado obrigatório, rollback sem autoridade ou
tráfego aceito antes das probes.

### REM-025 — carga, soak e SLO

Invariante: o perfil aprovado permanece dentro dos limites de latência, erro,
fila e saturação e os alertas respondem no canal esperado; nenhum benchmark
local é apresentado como capacidade de produção.

Preparação local e contrato congelado:

```text
pnpm benchmark:k6:parse
pnpm test:critical:soak
```

O perfil `operational-minimum-v1` é o rehearsal de regressão; o perfil
`endurance-2h-v1` só vale no ambiente protegido `performance-certification`,
com `BENCHMARK-DESCARTAVEL`, tenant sintético, credenciais em secrets e
aprovação de Produto/Operações. O relatório deve registrar p50/p95/p99, erro,
fila, CPU/memória/conexões, SLO, alertas, volume inicial/final, margem e
aprovadores. Known-bads: threshold reduzido, `continue-on-error`, tenant real,
perfil sem aprovação ou alerta não entregue.

### REM-030 — migrations no target

Invariante: install, upgrade, mixed-version, lock e rollback/forward compatibility
preservam dados e checksum; migration destrutiva não é executada sem plano,
backup e autoridade.

Preparação local e harnesses existentes:

```text
pnpm validate:migration-source
pnpm test:migration-harness
pnpm ops:install-upgrade:drill
```

No target, anexar candidato, versão anterior, migration target, lock wait,
interrupção/restart, contagens antes/depois, checksums, compatibilidade entre
versões e plano de compensação. O run deve falhar fechado para target
desconhecido, checksum divergente, lock não observado ou rollback não
autorizado. Known-bads: executar migration fora da fonte canônica, pular
migration, reordenar arquivo, liberar tráfego durante schema incompatível ou
perder dados pré-upgrade.

## Envelope mínimo de evidência target

Cada REM deve produzir um envelope separado, ligado ao mesmo candidato:

```json
{
  "schema_version": 1,
  "task": "REM-022",
  "status": "PASS|FAIL|BLOCKED|NOT_RUN",
  "candidate_sha": "<sha>",
  "target": {
    "environment": "<approved-target>",
    "namespace": "<redacted>",
    "run_id": "<provider-run-id>"
  },
  "authority": {
    "record": ".agent/authority.jsonl#<id>",
    "scope": "<exact-scope>"
  },
  "started_at": "<timestamp>",
  "completed_at": "<timestamp>",
  "results": {},
  "artifacts": [],
  "limitations": []
}
```

Não inserir URLs com secrets, tokens, PII, passwords ou dumps completos nos
artifacts. `PASS` é reservado para a observação no boundary correto; fixtures,
static validators e rehearsals locais devem permanecer identificados como
`PREPARED`, `BOUNDED_PASS`, `NOT_RUN` ou `BLOCKED`.

## Stop conditions e revalidação

Parar o run e preservar evidência em caso de vazamento cross-tenant, efeito
duplicado, checksum divergente, perda de dados, RPO/RTO/SLO fora do limite,
alerta ausente, credencial fora do canal, candidate SHA divergente ou autoridade
expirada. Qualquer mudança em código, migrations, imagem, política, perfil ou
target invalida o envelope afetado e exige novo run.

O verificador local `pnpm validate:remediation-target-pack` confirma a presença
dos cartões, scripts, fixtures, políticas e guardas deste runbook. Ele é um
checker de preparação e não abre conexão com banco, provider, cluster ou
serviço externo.
