# Evidência de execução corrente — State of Art

Observado em `2026-09-11T20:19:59Z` no checkout
`68bea151102c01ee54a3c782b5cf4b1c3ad631f5`, com `origin/main` coincidente e
worktree limpo antes do próximo parecer documental. O código funcional desse
snapshot está no pai `b77539c9891eef89cbbe8160bf6e30a0fb369d48`.

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

O [CI #127](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34641292826)
terminou `failure` com 15/16 jobs aprovados. Unit, Integration, E2E SPA,
Visual, API Contract, segurança, typecheck, lint, build e Windows passaram. O
job [Performance](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34641292826/job/103404419012)
falhou. Os annotations públicos só informam exit code; logs e artefatos
detalhados exigem credencial administrativa. Thresholds não foram alteradas.

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
