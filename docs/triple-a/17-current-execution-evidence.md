# Evidência de execução corrente — State of Art

Observado em `2026-09-11T19:39:53Z` no checkout
`b77539c9891eef89cbbe8160bf6e30a0fb369d48`, com `origin/main` coincidente e
worktree limpo após a coleta.

## Validações locais do candidato

| Escopo | Resultado |
| --- | --- |
| Gate estrito | `BLOCKED`, score `54`, critical `54`, open P0 `16`, `publication_allowed=false` |
| Checks locais | Docs, namespaces, migration source, OpenAPI, RLS estático, deploy surface, Helm estático, supply-chain pins, dependências, schema clínico, secrets, complexidade, typecheck, lint e build: PASS |
| Suíte workspace | `pnpm test:coverage`: 232 arquivos, 2.525 testes passados, 1 skipped; statements/lines `82,44%`, branches `82,29%`, functions `85,14%` |
| E2E clínico | `2/2` em PostgreSQL/Redis local; a instância local não é o target do CI |
| SPA focada | `32/32`; lint da SPA passou |
| Evidência frontend | suíte visual remota do CI #126 passou; testes existentes cobrem axe, 390×844 e 1280×720, mas UAT humano e aceite do hospital continuam ausentes |

## CI remoto no SHA exato

O [CI #126](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34635843119)
terminou `failure` com 14/16 jobs aprovados. Unit, Integration, E2E SPA,
Visual, API Contract, segurança, typecheck, lint e build passaram. Os jobs
[Performance](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34635843119/job/103387572819)
e [Critical Process Runner Windows](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34635843119/job/103387572845)
falharam. Os annotations públicos só informam exit code; logs e artefatos
detalhados exigem credencial administrativa. Thresholds e o contrato Windows
não foram enfraquecidos.

## Gate estrito

`pnpm release:triple-a` executou os checks locais e escreveu
`artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json` com `commit_sha` igual ao
SHA acima. O artefato é diagnóstico e ignorado pelo Git. Manifesto de release,
security evidence e todas as provas externas sem envelope atual permaneceram
falhos ou `NOT_RUN`; nenhum envelope foi promovido como certificação.

## Limitações

Continuam sem prova no mesmo boundary de release: CI terminal verde, logs
autenticados do benchmark, Windows nativo reproduzido, branch protection,
RLS runtime no alvo, workflow PostgreSQL de release, worker crash recovery,
deploy/rollback, restore/RPO/RTO, attestation, soak 24/72h, tracing/pool no
target, UAT humano e autoridade de release. O claim `TRIPLE-A VERIFIED`
permanece proibido.
