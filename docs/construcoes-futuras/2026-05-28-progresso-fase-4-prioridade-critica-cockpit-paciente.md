# Progresso Fase 4 - Prioridade critica no cockpit do paciente

Data: 2026-05-28

## Objetivo

Avancar a pendencia de usar criticidade dos itens da timeline/cockpit para ordenar a proxima acao operacional, evitando que pendencias financeiras comuns sejam priorizadas acima de risco clinico.

## Entregue

- A proxima acao do `Cockpit 360 do paciente` passou a priorizar triagem critica antes de cobranca.
- Exames pendentes do atendimento entram antes de cobranca comum quando nao ha triagem critica.
- A regra preserva as acoes anteriores como fallback:
  - resolver cobranca;
  - continuar atendimento;
  - ver agenda;
  - ver preventivo;
  - agendar proximo contato.
- O teste do detalhe do paciente cobre a prioridade `Priorizar triagem critica` com atalho para a triagem existente.

## Evidencias tecnicas

- `apps/spa/src/pages/patients/PatientDetailPage.vue`
- `apps/spa/src/pages/patients/__tests__/PatientDetailPage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/patients/__tests__/PatientDetailPage.test.ts` - 4/4 testes passando.

## Impacto no Premium Enterprise

O cockpit passa a refletir decisao operacional por risco, nao apenas por existencia de pendencia financeira. Isso aproxima a experiencia do padrao Premium Enterprise, onde a proxima acao precisa respeitar criticidade clinica, laboratorio pendente e depois pendencias administrativas.

## Proximos passos recomendados

- Aplicar a mesma hierarquia de criticidade no cockpit do tutor, agregando risco dos pacientes vinculados.
- Cobrir o fluxo Busca Mestre -> cockpit 360 -> triagem/esteira com E2E.
- Cobrir a hierarquia com E2E de triagem critica -> cockpit -> triagem.
