# Checkpoint — merge seguro e auditoria

**Registrado em:** `2026-09-12T11:32:02Z`
**Repositório:** `https://github.com/ricardoakinaga-dev/cvg-his-v4`

## Estado do Git

- Branch ativa: `main`.
- `HEAD == origin/main`: `fecb70cad2f7c25fb08c09262547ecac51fc049c`.
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

## Validações concluídas

- `pnpm docs:validate`: passou.
- Prettier e `git diff --check`: passaram.
- Reprodução local do k6, inclusive com watcher de diagnóstico de 5 s e
  `GOMAXPROCS=1`: `9/9` SLOs, erros `0%`, disponibilidade `100%`.
- A execução local não substitui a prova no runner hospedado.

## CI para retomar

Run atual: [CI #151](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34690210769)

No último polling, o run tinha:

- Passado: Typecheck, SAST, Secret Scan, Dependency Audit, Lint, OpenAPI,
  Repository Guards, Coverage, Build, API Contract, Unit, Windows e Visual.
- Falhado: `Performance (k6 SLOs)`.
- Ainda executando: Integration Tests e E2E Tests (SPA).

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

Depois, abrir o run #151 acima e registrar os estados finais de Integration e
E2E. Se a documentação for atualizada com esse resultado, use um commit
documental com `[skip ci]` para não iniciar uma cadeia de CI desnecessária.
