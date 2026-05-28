# Progresso - Fase 1 Esteira de Exames - Laboratório

Data: 2026-05-28

## Escopo

Incremento da F1-06 do roadmap Premium Enterprise, focado em transformar a tela de pedidos laboratoriais em uma esteira operacional mínima de exames.

## Implementado

- A listagem de exames passou a exibir:
  - Status operacional do pedido.
  - Etapa da esteira.
  - Vínculo direto com paciente.
  - Vínculo direto com prontuário.
- A tela agora cobre visualmente as etapas:
  - `1. Pedido recebido`
  - `2. Aguardando resultado`
  - `3. Liberado ao prontuário`
- Ações operacionais adicionadas:
  - `Coletar` para pedidos em `requested`.
  - `Liberar resultado` para pedidos em `collected`.
- A liberação de resultado exige resumo clínico e usa o domínio real `laboratoryService.recordResult`.
- Mensagens de sucesso e erro foram adicionadas para coleta e liberação.

## Arquivos alterados

- `apps/spa/src/pages/laboratory/LaboratoryOrdersPage.vue`
- `apps/spa/src/pages/laboratory/__tests__/LaboratoryOrdersPage.test.ts`

## Validações

- `pnpm exec vitest run src/pages/laboratory/__tests__/LaboratoryOrdersPage.test.ts --pool=forks`
  - 1 arquivo aprovado.
  - 5 testes aprovados.
- `pnpm --filter @cvg-his-v2/spa typecheck`
  - Aprovado.
- `pnpm --filter @cvg-his-v2/spa build`
  - Aprovado.

## Impacto no roadmap

A F1-06 passa a ter uma esteira de exames mais explícita para a rotina Vetus:

- Pedido visível.
- Coleta operacional.
- Resultado/liberação.
- Vínculo ao paciente e ao prontuário.

Ainda restam melhorias futuras para paridade total, como SLA por exame, responsável técnico, assinatura/liberação formal, integração por equipamento e painel específico de coleta.
