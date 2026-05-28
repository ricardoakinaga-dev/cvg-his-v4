# Progresso Fase 4 - Cockpit 360 tutor/paciente

Data: 2026-05-28

## Objetivo

Avancar o item `F4-03 - Criar cockpit do paciente/tutor`, consolidando em uma unica leitura a jornada do tutor com seus pacientes, agenda, atendimentos, financeiro e proxima acao operacional.

## Entregue

- A tela de detalhe do tutor ganhou o bloco `Cockpit 360 tutor/paciente`.
- O cockpit usa dados reais ja carregados pelo hub do tutor:
  - pacientes vinculados;
  - agenda futura;
  - atendimentos ativos;
  - faturamento/comandas;
  - alertas clinicos do cadastro do paciente.
- A visao consolidada exibe:
  - resumo da jornada assistencial;
  - situacao financeira do relacionamento;
  - proxima acao executiva;
  - linha 360 por paciente com agenda, atendimento, financeiro e alertas.
- Cada paciente possui atalhos contextuais:
  - abrir cockpit do paciente;
  - resolver cobranca;
  - continuar atendimento;
  - ver agenda;
  - agendar proximo contato.
- Foi incluido estado vazio acionavel para tutor sem paciente vinculado.
- A responsividade foi ajustada para desktop e mobile.

## Evidencias tecnicas

- `apps/spa/src/pages/owners/OwnerDetailPage.vue`
- `apps/spa/src/pages/owners/__tests__/OwnerDetailPage.test.ts`

## Validacao executada

- `pnpm --dir apps/spa exec vitest run src/pages/owners/__tests__/OwnerDetailPage.test.ts --pool=forks` - 2/2 testes passando.
- `pnpm --filter @cvg-his-v2/spa typecheck` - passou.
- `git diff --check -- apps/spa/src/pages/owners/OwnerDetailPage.vue apps/spa/src/pages/owners/__tests__/OwnerDetailPage.test.ts` - passou.

## Impacto no Premium Enterprise

O detalhe do tutor passa a funcionar como cockpit 360 de relacionamento, reduzindo a necessidade de alternar entre cadastro, paciente, agenda, atendimento e financeiro para decidir a proxima acao.

Isso fortalece o posicionamento Premium Enterprise porque o sistema agora transforma dados ja existentes em uma leitura executiva e operacional orientada a acao, especialmente para recepcao, atendimento e financeiro.

## Proximos passos recomendados

- Enriquecer a prioridade do tutor com triagem critica quando essa fonte estiver carregada no hub.
- Ampliar os sinais de preventivo e laboratorio no cockpit do paciente com vencimento, criticidade e atalhos.
- Avancar `F4-04` com busca global premium usando os atalhos de tutor e paciente como destinos principais.
