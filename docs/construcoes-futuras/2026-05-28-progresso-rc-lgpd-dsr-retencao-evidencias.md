# Progresso RC - LGPD, DSR, retencao e evidencias

## Objetivo

Fechar a lacuna de F3-04 para o CVG-HIS v4 Premium Enterprise: exportacao LGPD com providers reais do runtime, evidencia de retencao por tipo de dado e conclusao de DSR de eliminacao/anonimizacao com disposicao operacional auditavel.

## Entregue

- `LgpdService` passou a aceitar `dataProviders` server-side e registrar:
  - quantidade total de providers;
  - providers coletados;
  - providers com falha;
  - evidencia por fonte (`providerEvidence`);
  - politica de retencao por tipo de dado (`retentionEvidence`).
- O runtime conectou providers reais aos servicos existentes:
  - tutores: `OwnersService`;
  - pacientes: `PatientsService`;
  - atendimentos e timeline: `EncountersService`;
  - financeiro: `BillingService`;
  - laboratorio: `LaboratoryService`;
  - anexos: `AttachmentsService`.
- DSRs de `data_deletion` e `data_anonymization` agora concluem com `retention_window_enforced`, plano operacional por tipo de dado, sinalizacao de anonimizacao obrigatoria e elegibilidade de expurgo fisico.
- A SPA de LGPD passou a exibir detalhe da DSR com evidencia de retencao por tipo de dado.
- Foi adicionado o gate `pnpm governance:lgpd`, que gera `artifacts/lgpd-governance/lgpd-governance-evidence.json` e falha se providers, retencao, rota protegida, UI ou testes regredirem.

## Validacoes locais

- `pnpm governance:lgpd`
- `pnpm --filter @cvg-his-v2/module-lgpd exec vitest run src/lgpd.test.ts`
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/lgpd/__tests__/LgpdHubPage.test.ts`
- `pnpm readiness:enterprise`
- `pnpm rc:evidence`

## Status

LGPD/DSR deixa de ser apenas superficie basica e passa a ter exportacao operacional conectada ao runtime, politica de retencao explicita e evidencia automatizada para Release Candidate.
