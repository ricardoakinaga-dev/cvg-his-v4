# Triple-A — Final Report

## Resultado

O prompt fonte foi preservado byte-a-byte em
[`MASTER_PROMPT.md`](./MASTER_PROMPT.md). O candidato implementa o control
plane durável de workflows clínicos dentro do monólito modular: migrations com
RLS/constraints, idempotência com fingerprint, API, fila SPA, worker com
lease/fencing/heartbeat, retry/DLQ/replay, auditoria e sincronização com altas.

Também foram fechados os controles de release: política de dependências,
pinagem imutável de actions/bases, gate pré-publicação bloqueante, manifest por
digest e verificação independente das três imagens com `gh attestation verify`.

## Atualização do candidato corrente — 2026-09-10T08:23:05Z

- Candidato: `a4a5658aa66200a70be709e986152fe61ffc0fe5`; `origin/main` coincide e o worktree estava limpo antes desta atualização documental.
- O contrato crítico local passou `24/24` e `pnpm lint` passou. A execução local completa de `pnpm test` não foi promovida a PASS porque o banco descartável falhou na preparação de permissões (`permission denied for table tenants/accounts`).
- CI #58 ([run 34454422885](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885)) permanece em execução. O run #57 foi cancelado pela concorrência após este candidato ser publicado, portanto seus failures parciais não são evidência do SHA atual.
- O gate estrito com execução externa pulada permanece `BLOCKED / NOT PROVEN`, com `score=43`, `critical_score=23`, `open_p0=27` e `publication_allowed=false`.

## Verificação do candidato

- Código candidato: `e793345ab71441298bdb2cb2de2755dc5921b115`
- `pnpm test`: PASS; 68 projetos, incluindo SPA (212 arquivos/1.867 testes), API (580 testes) e módulo de workflows (8 testes).
- `pnpm build`: PASS.
- `pnpm lint` e `pnpm typecheck`: PASS.
- Schema clínico, migration source, RLS (170/171 tabelas protegidas), OpenAPI (421 paths), dependências, supply chain, documentação e complexidade: PASS.
- Gate strict executado no mesmo SHA: `BLOCKED`, score `38`, critical score `25`, `open_p0=21`, claim `NOT PROVEN`, `publication_allowed=false`.

## Veredito

`NOT PROVEN`. O código e os controles locais estão implementados e passam nas
verificações disponíveis, mas não há neste ambiente evidência verificável de
CI remoto/branch protection, images publicadas e attested, PostgreSQL/RLS em
execução, testes críticos/E2E/UAT, performance/soak, backup/restore/RPO-RTO,
deploy/rollback ou autoridade humana. Portanto o repositório não declara
`TRIPLE-A VERIFIED`.

## Limitações relevantes

O artefato detalhado é gerado em
`artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` e permanece ignorado por
ser evidência gerada. O gate deve ser reexecutado no ambiente de release com
o SHA publicado e todos os envelopes externos independentes.

## Atualização do candidato de fechamento externo — 2026-09-09

- Candidato publicado: `b429e1bb410bb8d374f4b8a043308461497b7bca`.
- O prompt externo permanece preservado em
  [`MASTER_PROMPT_EXTERNAL_CLOSURE.md`](./MASTER_PROMPT_EXTERNAL_CLOSURE.md),
  SHA-256 `d89a249f9b0b13e0da6fb9e4ee3c0e4728c11760fd435d325d48a9b8d1b5ed59`.
- Foram adicionados contratos verificáveis para PostgreSQL/RLS/concurrency,
  crash recovery/fencing, roles de banco, UAT hospitalar, críticos finais e
  gate fail-closed; o CI SAST foi corrigido após a execução pública expor o
  ruleset Registry inexistente e a permissão SARIF ausente.
- Gate strict no SHA publicado: `BLOCKED`, score `43`, critical `23`,
  `open_p0=27`, claim `NOT PROVEN`. O UAT gerado está `NOT_PROVEN/no-go`.
- A execução CI `34404434195` foi disparada para esse SHA e estava pendente no
  fechamento deste relatório. Runtime PostgreSQL, E2E/UAT humano, DR,
  performance, deploy/rollback, branch protection e autoridade humana não são
  inferidos a partir dos artefatos locais.

## Atualização do candidato corrente — `dcb731a196b499db246c5c53884c40547ec9e028`

- O candidato corrente está publicado em `main` e o worktree local está limpo.
- O commit corrige o escopo de `WORKER_ACCOUNT_IDS` no fixture de bootstrap
  production-like, permitindo que o teste alcance a validação específica do
  schema de entrega do worker.
- O gate strict local permanece `BLOCKED`, score `43`, critical `23`,
  `open_p0=27`, claim `NOT PROVEN`.
- O CI público `34418126020` / run 38 foi observado no SHA corrente: Secret
  Scan e Dependency Audit passaram, SAST passou durante a observação,
  Typecheck estava em execução e os demais jobs aguardavam dependências. O
  resultado final ainda não foi inferido.
- O baseline corrente em
  [`14-external-evidence-baseline.md`](./14-external-evidence-baseline.md)
  foi atualizado para esse SHA. PostgreSQL/RLS runtime, browser/E2E/UAT,
  recovery, performance/soak, deploy/rollback, attestations, governança de
  branch e autoridade humana continuam sem evidência externa suficiente.

## Atualização terminal — CI #58 e candidato local `0dc4809b`

- O run [34454422885](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885), no SHA `a4a5658aa66200a70be709e986152fe61ffc0fe5`, terminou `failure`. Passaram Typecheck, Dependency Audit, Secret Scan, SAST, Coverage, Repository Guards, Lint, OpenAPI, Build e API Contract; falharam Unit, E2E, Visual, Integration, Windows Critical Process Runner e Performance.
- O E2E finalizou `387 passed / 35 failed` em 422 testes. O detalhamento está no `EXECUTION_LOG.md`; inclui cinco falhas funcionais e 29 snapshots visuais. A validação de evidência de usabilidade também falhou com `invalid result totals`, corretamente, porque houve resultados inesperados.
- O candidato local `0dc4809b3e06c8334667f39bf51c33e33c3c0f9` agrega as correções de timezone, concorrência de billing, argumentos Windows, baselines visuais reais e capacidade do pool de performance. As correções funcionais do E2E ainda estão em integração.
- Gate strict local: `BLOCKED`, score `68`, crítico `54`, `open_p0=16`, `claim=NOT PROVEN`, `publication_allowed=false`. O relatório não declara `TRIPLE-A VERIFIED`, não autoriza deploy e não trata o CI #58 como verde.
