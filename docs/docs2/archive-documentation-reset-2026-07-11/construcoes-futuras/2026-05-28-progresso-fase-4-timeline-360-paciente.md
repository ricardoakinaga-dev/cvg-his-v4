# Progresso Fase 4 - Timeline 360 do paciente

Data: 2026-05-28

## Objetivo

Avancar a pendencia recorrente de `F4-03 - Criar cockpit do paciente/tutor`: criar uma timeline unificada com eventos de agenda, atendimento, financeiro, exames, preventivo e mensagens.

## Entregue

- A tela de detalhe do paciente ganhou a secao `Timeline 360 unificada`.
- A timeline consolida fontes reais ja carregadas pela pagina:
  - eventos operacionais do atendimento;
  - eventos do prontuario;
  - agenda futura;
  - comandas/financeiro do paciente;
  - pedidos/resultados laboratoriais;
  - eventos preventivos proximos;
  - mensagens contextuais sugeridas.
- Cada item exibe origem, titulo, descricao, data e atalho quando existe destino operacional interno.
- A timeline foi posicionada entre o cockpit 360 e os acordeoes, funcionando como leitura longitudinal antes do detalhe por modulo.

## Evidencias tecnicas

- `apps/spa/src/pages/patients/PatientDetailPage.vue`
- `apps/spa/src/pages/patients/__tests__/PatientDetailPage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/patients/__tests__/PatientDetailPage.test.ts` - 4/4 testes passando.

## Impacto no Premium Enterprise

A ficha do paciente passa a ter uma leitura longitudinal real, unindo sinais clinicos, operacionais, financeiros e de relacionamento em uma unica trilha. Isso reduz a dependencia de abrir cada acordeao para entender o contexto recente ou proximo do animal.

## Proximos passos recomendados

- Cobrir o fluxo com teste visual/E2E em dev server.
