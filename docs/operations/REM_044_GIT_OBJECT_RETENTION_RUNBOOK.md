# REM-044 — Retenção segura de refs e objetos Git

## Objetivo

Reduzir refs e objetos Git somente depois de preservar rollback, confirmar o
prazo de retenção aprovado e verificar que nenhum ref protegido ou evidência
necessária será removido. O estado gerado do Gauntlet permanece externalizado;
este runbook não autoriza `prune`, `gc`, remoção de refs ou alteração do
worktree.

## Fotografia observada em 2026-09-23

- `refs/heads/main` local e checkout: `ad2f0373f68635f2579253b013a4382219906921`.
- `origin/main` remoto e `refs/remotes/origin/main`: `570920de3d12d9a1043aa2c36102a89d39f04569`.
- O worktree compartilhado está dirty e contém trabalho do usuário; não pode
  ser resetado, limpo, trocado de checkout ou usado como alvo de reescrita.
- `.git`: 758 MiB; `git count-objects -vH` reportou 7.106 objetos soltos,
  27.849 em pack, 4 packs, 494,47 MiB em packs, 987 `prune-packable` e zero
  garbage.
- `git fsck --full --unreachable --no-reflogs` encontrou 696 objetos sem
  alcance direto: 310 blobs, 286 trees e 100 commits; nenhum blob sem alcance
  atingiu 100 MiB.
- `git reflog expire --dry-run --all --verbose` manteve 1.207 entradas.
- `git prune --dry-run --verbose` enumerou 111 objetos candidatos conforme a
  política/idade atual; nenhum foi removido.

## Retenção protegida

Manter até decisão explícita de owner/retention:

1. `/home/ricardo/cvg-his-v4-backups/20260921-remediacao-integral-rem001`,
   incluindo o bundle de todas as refs, patch do worktree, arquivo de não
   rastreados e hashes.
2. `/home/ricardo/cvg-his-v4-backups/20260923-remediacao-integral-rem002`,
   incluindo `rem-002-rewritten.bundle` e sua SHA-256.
3. `refs/heads/main`, porque é o checkout local dirty e ainda é o rollback
   operacional do worktree compartilhado.
4. `refs/remotes/origin/main`, `refs/remotes/origin/HEAD`, as tags de
   checkpoint e o ref `refs/codex/turn-diffs/...`; a ownership/retention de
   cada ref ainda não foi aprovada para remoção.

## Inventário e dry-run seguros

Executar e arquivar a saída antes de qualquer mutação:

```bash
git for-each-ref --format='%(refname) %(objecttype) %(objectname) %(creatordate:iso-strict)' \
  refs/heads refs/remotes refs/tags refs/codex
git count-objects -vH
git fsck --full --unreachable --no-reflogs
git prune --dry-run --verbose
git reflog expire --dry-run --all --verbose
```

O inventário de blobs deve ser executado por cada ref destinado a publicação,
com limite de `104857600` bytes. O caminho `.gauntlet/state.json` não pode
voltar ao intervalo publicável.

## Procedimento condicionado a nova autoridade

Somente com owner nomeado, prazo de retenção e autorização explícita para
REM-044:

1. Criar bundle fresco de todas as refs e verificar clone/sha antes da ação.
2. Congelar a lista exata de refs candidatas; não usar `git gc --prune=now`,
   `git prune` amplo, `git reset --hard`, `git clean` ou remoção por glob.
3. Remover somente refs explicitamente aprovadas com `git update-ref -d` e
   preservar o bundle pelo prazo aprovado.
4. Expirar reflogs apenas no escopo aprovado e executar uma compactação com
   retenção de cruft apropriada ao prazo; a versão instalada não aceita
   `git gc --dry-run` nem `git repack --dry-run`.
5. Repetir inventário, `fsck`, recuperação pelo bundle e medição de `.git`;
   qualquer divergência reabre o gate e interrompe a operação.

## Stop conditions

- Bundle, SHA-256, clone de recuperação ou prazo de retenção ausente.
- Ref protegido ou ownership desconhecida incluído no conjunto de remoção.
- Worktree dirty, checkout ativo ou mudança de remote durante a operação.
- Qualquer comando exigir checkout/reset/clean ou não tiver dry-run confiável.
- Novo blob gerado massivo, reintrodução de `.gauntlet/state.json` ou falha de
  recuperação.

Estado atual: preparação e inventário `PASS_WITH_CONDITIONS`; limpeza efetiva,
expiração de refs, expiração de reflogs e compactação permanecem não executadas.
