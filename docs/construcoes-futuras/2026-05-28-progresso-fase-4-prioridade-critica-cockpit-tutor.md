# Progresso Fase 4 - Prioridade critica no cockpit do tutor

Data: 2026-05-28

## Objetivo

Aplicar no `Cockpit 360 tutor/paciente` a mesma logica de prioridade por criticidade iniciada no cockpit do paciente, usando sinais agregados dos pacientes vinculados.

## Entregue

- A proxima acao do paciente dentro do cockpit do tutor passou a priorizar exames laboratoriais pendentes antes de cobranca comum.
- Quando um paciente possui exame pendente, o CTA contextual passa a direcionar para `/laboratory/orders`.
- Cobranca, atendimento ativo, agenda e novo agendamento continuam como fallbacks.
- O resumo executivo do tutor passa a refletir a acao critica mais importante entre os pacientes vinculados.

## Evidencias tecnicas

- `apps/spa/src/pages/owners/OwnerDetailPage.vue`
- `apps/spa/src/pages/owners/__tests__/OwnerDetailPage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/owners/__tests__/OwnerDetailPage.test.ts` - 2/2 testes passando.

## Impacto no Premium Enterprise

O cockpit do tutor deixa de priorizar automaticamente pendencia financeira quando ha sinal clinico/laboratorial mais urgente. Isso melhora a decisao de recepcao e atendimento em relacionamentos multi-paciente, mantendo o foco em risco operacional antes de cobranca comum.

## Proximos passos recomendados

- Enriquecer a prioridade do tutor com triagem critica quando essa fonte estiver carregada no hub.
- Cobrir o fluxo Busca Mestre -> cockpit 360 -> triagem/esteira com E2E.
- Cobrir o fluxo tutor -> exame pendente -> laboratorio com E2E em dev server.
