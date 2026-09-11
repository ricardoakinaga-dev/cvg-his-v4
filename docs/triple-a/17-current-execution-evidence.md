# Evidência de execução corrente — State of Art

Observado em `2026-09-11T22:45:00Z` no checkout
`3054d6388becd9a262b2cd45fadbabc086c1ed75`, com `HEAD`, `origin/main` e
`origin/HEAD` coincidentes. O worktree ficou limpo após as execuções; os
artefatos de gate permanecem ignorados pelo Git.

## Validações locais do candidato

| Escopo | Resultado |
| --- | --- |
| Gate estrito | `BLOCKED`, score `55`, critical `57`, open P0 `15`, `publication_allowed=false` |
| Checks agregados | Documentation, namespaces, migration source, OpenAPI, RLS estático, deploy surface, Helm estático, supply-chain pins, dependências, schema clínico, secrets, complexidade, typecheck, lint e build: PASS |
| Suíte workspace | `pnpm test` terminou com exit 0; o relatório do gate registra a suíte API com `592 pass`, `0 fail` |
| Integração PostgreSQL | `pnpm test:critical`: `66` arquivos e `615` testes aprovados; banco efêmero removido |
| Processos críticos | `pnpm test:critical:process`: `11/11` cenários não-skipped aprovados com Redis local pinned; bancos efêmeros removidos |
| E2E clínico | `2/2` jornadas canônicas aprovadas em PostgreSQL/Redis local com o usuário seed real |

As provas locais exercitam migrações `0000`–`0169`, seed, RLS, concorrência,
idempotência, leases/fencing, outbox, pagamentos, laboratório, worker,
SIGKILL/restart, webhook e workflow task. São evidências bounded da sessão e
não equivalem a CI verde, target produtivo, UAT ou aprovação humana.

## CI remoto no SHA documentado

O [CI #129](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34650926250)
do SHA funcional `68600d6a` terminou `failure` com 15/16 jobs aprovados; apenas
Performance falhou. A reconciliação está em
[critic-performance-assurance-20260911.md](./critic-performance-assurance-20260911.md).

O commit documental atual `3054d638` também foi executado pelo [CI #130](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34653388064),
que terminou `failure` com o mesmo padrão: os checks de código passaram e
`Performance (k6 SLOs)` falhou no [job 103443316221](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34653388064/job/103443316221).
Nenhuma métrica de artefato inacessível foi inventada e nenhum threshold foi
relaxado.

## Gate estrito

`TRIPLE_A_RUN_TESTS=1 pnpm release:triple-a` executou documentação, validações
estáticas, typecheck, lint, build e a suíte workspace no SHA acima. O JSON
`artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` registrou `CMD-17 Unit tests`
como PASS, mas os critérios externos continuam `NOT_RUN`; por isso o gate
permaneceu bloqueado e não autoriza publicação.

## Limitações

Continuam sem prova no boundary de release: CI terminal verde, manifest e
security evidence de publicação completos, backup/restore, RLS runtime no
target, workflow PostgreSQL de release, worker crash recovery como envelope
externo, E2E/visual de CI, integridade de auditoria, deploy/rollback,
attestation, soak 24/72h, observabilidade no target, branch protection, UAT
humano e autoridade de release. O claim `TRIPLE-A VERIFIED` permanece proibido.
