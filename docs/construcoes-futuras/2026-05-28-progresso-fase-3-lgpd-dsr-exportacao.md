# Progresso Fase 3 - F3-04 LGPD, DSR e exportacao

## Objetivo

Validar e fortalecer a superficie LGPD para o CVG-HIS v4 Premium Enterprise, cobrindo consentimento, logs, exportacao de dados pessoais e eliminacao/anonimizacao quando aplicavel.

## Entregas realizadas

- A listagem `GET /lgpd/requests` agora suporta leitura geral de DSRs da conta autenticada quando nenhum filtro e informado.
- O repositório de DSR passou a expor `findByAccount(accountId)` para governanca operacional.
- Atualizacao de status de DSR passou a ser escopada por `accountId`, reduzindo risco de alteracao cross-tenant por ID.
- `POST /lgpd/requests/complete` passou a:
  - carregar a solicitacao pelo `accountId`;
  - gerar resultado padrao quando `resultJson` nao e enviado;
  - auditar conclusao com evento `dsr_completed`.
- `POST /lgpd/requests/reject` passou a auditar rejeicao com evento `dsr_rejected`.
- `POST /lgpd/export` deixou de aceitar providers arbitrarios no payload e passou a gerar exportacao auditavel com evidencias server-side:
  - consentimentos do titular;
  - historico de DSRs do titular;
  - metadados da exportacao;
  - contadores de evidencia.
- Exportacoes pessoais agora registram auditoria `personal_data_exported`.
- Solicitacoes de `data_deletion` e `data_anonymization` concluidas sem resultado manual recebem evidencia de eliminacao com retencao legal:
  - `disposition: manual_erasure_review_required`;
  - `clinicalRetentionRequired` quando o titular e paciente;
  - mensagem operacional sobre retencao clinica/financeira.
- O OpenAPI foi atualizado para documentar:
  - listagem geral de DSRs;
  - tipos reais de DSR (`data_export`, `data_deletion`, `data_anonymization`, etc.);
  - schema `PersonalDataExport`.

## Arquivos principais

- `packages/modules/lgpd/src/service.ts`
- `packages/modules/lgpd/src/repositories/dsr-repository.interface.ts`
- `packages/modules/lgpd/src/repositories/database-dsr.repository.ts`
- `packages/modules/lgpd/src/lgpd.test.ts`
- `apps/api/src/routes/lgpd-routes.ts`
- `apps/api/src/routes/lgpd-routes.test.ts`
- `apps/api/src/openapi.yaml`

## Validacoes executadas

- `pnpm --filter @cvg-his-v2/module-lgpd build` - passou.
- `pnpm --filter @cvg-his-v2/module-lgpd exec vitest run src/lgpd.test.ts` - 27/27 testes passando.
- `pnpm --filter @cvg-his-v2/api build` - passou.
- `node --test apps/api/dist/routes/lgpd-routes.test.js` - 2/2 testes passando.
- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/lgpd/__tests__/LgpdHubPage.test.ts` - 5/5 testes passando.
- `pnpm --filter @cvg-his-v2/spa exec vue-tsc --noEmit` - passou.
- `pnpm validate:openapi` - OpenAPI valido com 287 paths e 327 schemas.
- `pnpm validate:rls` - 91/91 tabelas tenant protegidas.
- `pnpm-lock.yaml` preserva `vue-component-type-helpers@3.2.7`.

## Atualizacao RC

O incremento posterior `2026-05-28-progresso-rc-lgpd-dsr-retencao-evidencias.md` conectou providers server-side reais de tutores, pacientes, atendimentos, financeiro, laboratorio e anexos ao `LgpdService`; adicionou evidencia de retencao por tipo de dado; gerou plano de anonimizacao/expurgo condicionado a janela legal; exibiu essa evidencia no detalhe da DSR; e criou o gate `pnpm governance:lgpd`.

## Impacto Enterprise

F3-04 fica atendido como criterio tecnico local de Release Candidate. A validacao final ainda depende das evidencias externas gerais do RC.
