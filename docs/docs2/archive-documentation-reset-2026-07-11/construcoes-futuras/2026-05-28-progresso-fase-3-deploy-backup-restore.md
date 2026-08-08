# Progresso Fase 3 - F3-07/F3-08 Deploy, backup e restore

## Objetivo

Fortalecer a operacao enterprise do CVG-HIS v4 com validacao reproduzivel de deploy, Helm, backup e restore, sem depender de execucao destrutiva ou de Docker/Helm disponiveis no ambiente local.

## Entregas realizadas

- Criado o gate `pnpm ops:backup:check`.
- Criado o validador `infra/scripts/validate-backup-restore.mjs`.
- O gate valida estaticamente que a superficie viva de backup/restore possui:
  - `backup-v2.sh` com `set -Eeuo pipefail`;
  - bundle com `database`, `storage` e `meta`;
  - `pg_dump` em formato custom comprimido;
  - captura de `pg_dumpall --globals-only`;
  - manifesto `meta/manifest.json`;
  - `restore-hints.txt`;
  - `SHA256SUMS`;
  - politica de retencao configuravel;
  - `restore-drill-v2.sh` com Postgres descartavel;
  - validacao de checksum e TOC do dump;
  - restauracao de globals, banco e storage;
  - relatorio `restore-drill-report.json`;
  - scripts expostos no `package.json`;
  - docs vivas ainda apontando deploy/checklist e backup/restore como criterio de saida.
- Validada a sintaxe shell dos scripts:
  - `infra/scripts/backup-v2.sh`;
  - `infra/scripts/restore-drill-v2.sh`.
- Reexecutados os gates existentes de deploy:
  - `pnpm deploy:check`;
  - `pnpm validate:helm`.

## Validacoes executadas

- `pnpm ops:backup:check` - passou.
- `bash -n infra/scripts/backup-v2.sh` - passou.
- `bash -n infra/scripts/restore-drill-v2.sh` - passou.
- `pnpm deploy:check` - passou.
- `pnpm validate:helm` - passou em modo estatico porque o binario `helm` nao esta instalado no ambiente.

## Atualizacao RC

Os incrementos posteriores adicionaram:

- `pnpm ops:restore:drill:fixture`, com fixture real restaurado em Postgres descartavel;
- `pnpm deploy:rehearsal:local`, com rehearsal local de cutover via Docker Compose isolado;
- artefatos documentados em `2026-05-28-progresso-rc-restore-drill-real-local.md` e `2026-05-28-progresso-rc-cutover-rehearsal-local.md`;
- agregacao em `pnpm readiness:enterprise` e `pnpm rc:evidence`.

## Resultado operacional

F3-07 e F3-08 ficam atendidos como criterio tecnico local de Release Candidate. A conclusao final ainda depende das tres evidencias externas rastreadas pelo pacote RC:

- CI remoto verde;
- restore drill real em homolog/staging;
- deploy/cutover validado no ambiente alvo.
