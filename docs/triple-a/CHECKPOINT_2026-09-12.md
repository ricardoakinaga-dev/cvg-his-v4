# Checkpoint — merge seguro e auditoria

**Registrado em:** `2026-09-12T11:56:59Z`
**Repositório:** `https://github.com/ricardoakinaga-dev/cvg-his-v4`
**Commit inicial do checkpoint:** `f2fd6556` (`[skip ci]`)

## Estado do Git

- Branch ativa: `main`.
- SHA documental corrente: `00683b312506733ff350c2a104cec04d0dc98bd8`.
- O estado auditado foi publicado em `main` por commits documentais com
  `[skip ci]`; este SHA está sincronizado com `origin/main`.
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

## Validações concluídas

- `pnpm docs:validate`: passou.
- Prettier e `git diff --check`: passaram.
- Reprodução local do k6, inclusive com watcher de diagnóstico de 5 s e
  `GOMAXPROCS=1`: `9/9` SLOs, erros `0%`, disponibilidade `100%`.
- A execução local não substitui a prova no runner hospedado.
- O gate estrito local completo no snapshot `c1059e6c` terminou `BLOCKED`, com
  `score=55`, `critical_score=57`, `open_p0=15`, `claim=NOT PROVEN` e
  `publication_allowed=false`. Artefatos de release ignorados e antigos são
  rejeitados por vínculo de SHA; não foram promovidos como evidência atual.

## CI para retomar

Run atual: [CI #151](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34690210769)

No último polling, o run tinha:

- Passado: Typecheck, SAST, Secret Scan, Dependency Audit, Lint, OpenAPI,
  Repository Guards, Coverage, Build, API Contract, Unit, Windows, Integration,
  E2E SPA e Visual.
- Falhado: `Performance (k6 SLOs)` — benchmark exit `99`, parser exit `1`.
- Artefato: `performance-k6-report`, digest
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

Depois, abrir o run #151 acima para consultar os logs e o artefato de Performance.
A documentação corrente já registra o estado terminal; novos registros
documentais devem usar `[skip ci]` para não iniciar uma cadeia de CI desnecessária.
