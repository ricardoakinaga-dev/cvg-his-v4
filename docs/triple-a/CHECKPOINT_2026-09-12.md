# Checkpoint — merge seguro e auditoria

**Registrado em:** `2026-09-12T14:01:26Z`
**Repositório:** `https://github.com/ricardoakinaga-dev/cvg-his-v4`
**Código integrado:** `9b77215290d3c3c0e3ebf237aa9e295ac2ebf5d4`

## Estado do Git

- Branch ativa: `main`; o código foi publicado por fast-forward, sem force-push.
- `main` e `origin/main` apontam para o commit que contém este checkpoint; o código funcional integrado é `9b772152`.
- O rollback remoto continua preservado em `origin/fix/state-of-art-ci-assurance@fe5406c23c515585629060e0dc01b91f2d113d65`, ancestral do código integrado.
- A árvore de trabalho estava limpa antes desta atualização documental.

## Mudanças validadas

- `DsDatePicker` e `DsTimePicker` agora expõem dialog/grid/list semantics, `aria-expanded`/`aria-controls`, foco roving, setas, Escape e restauração de foco.
- Alvos de toque dos pickers, shell móvel e toast PWA respeitam `--touch-min` de 44 px; seleção usa token de ação com contraste adequado.
- Toast PWA/offline ganhou nomes acessíveis, live regions, foco visível e limpeza do timer de auto-dismiss.
- Evidência local: design system `53/53` testes; PWA `2/2`; typecheck do design system e SPA; build PWA da SPA com `814` módulos; `pnpm docs:validate` e `git diff --check` passaram.

## CI e decisão

O [CI #158](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34698026588) foi disparado para o SHA integrado e estava **pendente** no momento do checkpoint. O [CI #157](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34697258502) é o run anterior do candidato `72cfcfb8`.

O estado de release continua **BLOCKED / NOT PROVEN**: permanecem sem prova target, recovery/restore, UAT, attestation, governança, deploy/rollback, performance remota, cobertura visual global e autoridade de release. Não declarar `main green` ou `TRIPLE-A VERIFIED` antes das evidências externas exigidas pelo quality bar.

## Retomada após fechar o aplicativo

```bash
cd /home/ricardo/cvg-his-v4
git status --short --branch
git log --oneline -5 --decorate
pnpm docs:validate
git diff --check
```

Depois, abrir o [CI #158](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34698026588) e conferir o resultado terminal no SHA `9b772152`. Só aceitar merge/release quando o SHA exato estiver com todos os jobs obrigatórios verdes e as provas externas exigidas pelo quality bar estiverem presentes.
