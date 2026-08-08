# Progresso RC - Restore Drill Real Local

Data: 2026-05-28

## Objetivo

Reduzir o risco operacional de backup/restore antes do Release Candidate final, saindo de validacao apenas estatica para um restore drill real local com Postgres descartavel e storage restaurado.

## Entrega

- Criado `infra/scripts/create-restore-drill-fixture.mjs`.
- Criado `infra/scripts/run-restore-drill-fixture.mjs`.
- Criado o comando `pnpm ops:restore:fixture`.
- Criado o comando `pnpm ops:restore:drill:fixture`.
- O readiness passou a verificar a existencia do comando de drill real local.

## Evidencia executada

Bundle gerado:

```text
/tmp/cvg-his-v2-backup-fixtures/fixture-20260528T125959Z-1403284
```

Comando executado:

```bash
pnpm ops:restore:drill:v2 /tmp/cvg-his-v2-backup-fixtures/fixture-20260528T125959Z-1403284 --report-dir /tmp/cvg-his-v2-restore-drills/fixture-20260528T125959Z-1403284-rc-evidence
```

Resultado:

- checksums validados;
- TOC do dump validado com `pg_restore -l`;
- globals restaurados;
- dump restaurado em Postgres descartavel;
- storage restaurado e comparado com a listagem original;
- `restore-drill-report.json` gerado.

Resumo do relatorio:

```json
{
  "completedAt": "20260528T130011Z",
  "restoreDatabase": "cvg_his_v2_restore_drill",
  "publicTablesRestored": 2,
  "restoredStorageFiles": 2,
  "checksumVerification": "passed",
  "storageListingMatch": true
}
```

Artefato:

```text
/tmp/cvg-his-v2-restore-drills/fixture-20260528T125959Z-1403284-rc-evidence/restore-drill-report.json
```

## Impacto no RC

O produto passa a ter uma prova local real de recuperacao, usando o mesmo script operacional `restore-drill-v2.sh` que deve ser usado em homolog/staging.

Isso nao substitui a evidencia final em ambiente alvo, mas reduz a pendencia de backup/restore de "apenas estatica" para "drill real local aprovado".
