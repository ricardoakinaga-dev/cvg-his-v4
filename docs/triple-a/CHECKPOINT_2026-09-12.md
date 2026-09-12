# Checkpoint — merge seguro e auditoria

**Registrado em:** `2026-09-12T12:55:00Z`
**Repositório:** `https://github.com/ricardoakinaga-dev/cvg-his-v4`
**Commit base do checkpoint:** `9955b8b5efc96f7127b4599c1ee99de40c3ed3aa`

## Estado do Git

- Branch ativa: `main`.
- SHA corrente antes deste registro: `27790299e779bbbd186e5b93c101ad3b6547bace`.
- O estado auditado foi publicado em `main` por fast-forward e está sincronizado
  com `origin/main`; a reancoragem documental aponta todos os snapshots correntes
  para o candidato de assurance `0d475dee358eab9621e5497db9929b7010ed09eb`.
- Worktree limpo no momento do checkpoint.
- Nenhum force-push foi usado.
- Rollback remoto preservado em `origin/fix/state-of-art-ci-assurance`:
  `fe5406c23c515585629060e0dc01b91f2d113d65`.
- A branch de rollback é ancestral de `main`; por isso não houve merge commit
  nem conflito: a integração foi um fast-forward seguro.

## Commits relevantes

1. `553078be` — limita o scheduler do k6 com `GOMAXPROCS=1` no CI.
2. `4b49c4ef` — vincula os snapshots de assurance à correção do workflow.
3. `fecb70ca` — reconcilia os snapshots com o CI terminal mais recente e registra
   o estado bloqueado sem relaxar thresholds.
4. `00683b31` — vincula o gate estrito documentado ao snapshot local completo
   `c1059e6c`, mantendo a decisão `BLOCKED / NOT PROVEN`.
5. `0d475dee` — permite a reconciliação do baseline canônico sem transferir
   evidência entre candidatos.
6. `9955b8b5` — reancora os oito documentos correntes no candidato de assurance
   e registra o CI exato.

## Validações concluídas

- `pnpm docs:validate`: passou.
- Guard de snapshot corrente: passou, com todos os documentos vinculados ao
  candidato declarado.
- Prettier e `git diff --check`: passaram.
- Reprodução local do k6, inclusive com watcher de diagnóstico de 5 s e
  `GOMAXPROCS=1`: `9/9` SLOs, erros `0%`, disponibilidade `100%`.
- A execução local não substitui a prova no runner hospedado.
- O gate estrito local completo no snapshot `c1059e6c` terminou `BLOCKED`, com
  `score=55`, `critical_score=57`, `open_p0=15`, `claim=NOT PROVEN` e
  `publication_allowed=false`. Artefatos de release ignorados e antigos são
  rejeitados por vínculo de SHA; não foram promovidos como evidência atual.

## CI para retomar

Run atual: [CI #153](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34693263252),
no SHA exato `9955b8b5`; terminou `failure`.

No último polling, o run tinha:

- Passado: `15/16` jobs — Typecheck, SAST, Secret Scan, Dependency Audit, Lint,
  OpenAPI, Repository Guards, Coverage, Build, API Contract, Unit, Windows,
  Integration, E2E SPA e Visual.
- Falhado: `Performance (k6 SLOs)` — `Run k6 benchmark` exit `99` e `Check SLO
  results` exit `1`.
- Artefato: `performance-k6-report`, digest
  `sha256:d2ca8e3123e7b98125dde6fd5222fac42901ebf3ca80ab215ecc603bc68438ab`.

O [CI #151](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34690210769)
continua histórico: terminou com `15/16` jobs e falha exclusiva de
`Performance (k6 SLOs)`; o artefato `performance-k6-report` tem digest
`sha256:84b09a10162af819504fe8e269a84d498f1927aee9189af553ff3f8086390afa`.

O run anterior [CI #150](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34688526421)
terminou com `15/16` jobs verdes e a mesma falha exclusiva de Performance/k6.
O veredito permanece **BLOCKED / NOT PROVEN**; não declarar `main green` ou
`TRIPLE-A VERIFIED` enquanto o SLO remoto continuar falhando.

## Retomada

Após reabrir o aplicativo:

```bash
cd /home/ricardo/cvg-his-v4
git status --short --branch
git log --oneline -4 --decorate
pnpm docs:validate
```

Depois, abrir o run #153 acima para consultar os logs do único job falho. O
veredito permanece **BLOCKED / NOT PROVEN** até que a Performance/k6 e todos os
gates obrigatórios e provas externas estejam concluídos.
