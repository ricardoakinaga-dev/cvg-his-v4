# Checkpoint — merge seguro e auditoria

**Registrado em:** `2026-09-12T14:29:00Z`
**Repositório:** `https://github.com/ricardoakinaga-dev/cvg-his-v4`
**Código integrado:** `6010b98320e37139b530cfb2a22b041ca18b6401`

## Estado do Git

- Branch ativa: `main`; o código foi publicado por fast-forward, sem force-push.
- `main` e `origin/main` apontam para o commit funcional que contém o envelope de eventos e o crosswalk validado; este checkpoint documental será publicado em seguida.
- O rollback remoto continua preservado em `origin/fix/state-of-art-ci-assurance@fe5406c23c515585629060e0dc01b91f2d113d65`, ancestral do código integrado.
- A árvore de trabalho estava limpa antes desta atualização documental.

## Mudanças validadas

- `DsDatePicker` e `DsTimePicker` expõem dialog/grid/list semantics, `aria-expanded`/`aria-controls`, foco roving, setas, Escape e restauração de foco.
- Alvos de toque dos pickers, shell móvel e toast PWA respeitam `--touch-min` de 44 px; seleção usa token de ação com contraste adequado.
- Toast PWA/offline ganhou nomes acessíveis, live regions, foco visível e limpeza do timer de auto-dismiss.
- O release generator emite `sbom.cdx.json` e `enterprise-release-manifest.json` como aliases byte-identical, inclui ambos no checksum e o gate verifica a integridade dos aliases.
- O outbox agora publica e verifica envelope versionado com `eventId`, `schemaVersion`, `actor`, `correlationId`, `causationId`, `occurredAt` e `sourceModule`; a migração `0170` compatibiliza registros legados.
- O crosswalk `18-master-prompt-crosswalk.json` liga as 61 fases do prompt congelado às 76 linhas da matriz, validando hashes e requisitos explícitos.
- Evidência local adicional: barramento de eventos `28/28` testes; crosswalk `5/5` testes; `pnpm validate:prompt-traceability` passou.
- Evidência local: design system `53/53` testes; PWA `2/2`; manifesto `3/3`; typecheck do design system e SPA; build PWA da SPA com `814` módulos; `pnpm docs:validate` e `git diff --check` passaram.

## CI e decisão

O [CI #159](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34698297705) pertence ao candidato anterior `6462323f` e não é promovido para este candidato. Um novo CI será acompanhado após a publicação do commit documental deste checkpoint.

O estado de release continua **BLOCKED / NOT PROVEN**: permanecem sem prova target, recovery/restore, UAT, attestation, governança, deploy/rollback, performance remota, cobertura visual global, SCA avançada e autoridade de release. Não declarar `main green` ou `TRIPLE-A VERIFIED` antes das evidências externas exigidas pelo quality bar.

## Retomada após fechar o aplicativo

```bash
cd /home/ricardo/cvg-his-v4
git status --short --branch
git log --oneline -5 --decorate
pnpm docs:validate
git diff --check
```

Depois, abrir o CI do candidato `6010b983` e conferir o resultado terminal no SHA exato. Só aceitar merge/release quando todos os jobs obrigatórios e as provas externas exigidas pelo quality bar estiverem presentes.
