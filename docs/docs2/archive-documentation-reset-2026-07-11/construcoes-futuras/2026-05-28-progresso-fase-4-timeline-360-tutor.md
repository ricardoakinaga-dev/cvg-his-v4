# Progresso Fase 4 - Timeline 360 do tutor

Data: 2026-05-28

## Objetivo

Concluir a expansão do `F4-03 - Criar cockpit do paciente/tutor` com uma timeline 360 no detalhe do tutor, agregando eventos dos pacientes vinculados.

## Entregue

- A tela de detalhe do tutor ganhou a seção `Timeline 360 do tutor`.
- A timeline agrega fontes reais já carregadas no hub do tutor:
  - agenda dos pacientes;
  - atendimentos;
  - financeiro/comandas;
  - laboratório;
  - preventivo;
  - mensagens contextuais.
- Cada item mostra origem, paciente, título, descrição, data e atalho operacional interno quando disponível.
- A timeline foi posicionada logo após o cockpit 360, antes dos blocos cadastrais e operacionais, para apoiar decisão rápida no relacionamento tutor/paciente.

## Evidências técnicas

- `apps/spa/src/pages/owners/OwnerDetailPage.vue`
- `apps/spa/src/pages/owners/__tests__/OwnerDetailPage.test.ts`

## Validação executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/owners/__tests__/OwnerDetailPage.test.ts` - 2/2 testes passando.

## Impacto no Premium Enterprise

O tutor passa a ter visão longitudinal consolidada dos animais vinculados, reduzindo alternância entre agenda, paciente, comanda, laboratório, preventivo e mensageria. Isso fortalece a experiência Premium Enterprise de relacionamento 360 com decisão operacional orientada por contexto.

## Próximos passos recomendados

- Enriquecer a prioridade do tutor com triagem critica quando essa fonte estiver carregada no hub.
- Conectar a busca global aos itens da timeline para navegação federada por tutor/paciente.
- Cobrir o fluxo tutor -> timeline -> paciente/comanda/laboratório com E2E em dev server.
