# Progresso - Fase 1 Esteira de Atendimento - Conclusão Operacional

Data: 2026-05-28

## Escopo

Incremento da F1-05 do roadmap Premium Enterprise, focado em fechar a lacuna da conclusão operacional da esteira de atendimento.

## Implementado

- API:
  - Nova rota `POST /queue/{queueEntryId}/complete`.
  - A rota usa o domínio real `SchedulingService.completeQueueEntry`.
  - Auditoria operacional com ação `complete_queue_entry`.
  - OpenAPI atualizado para documentar o novo endpoint.
- SPA:
  - Novo service `completeQueueEntry`.
  - A tela `Esteira de Atendimento` agora exibe ação `Concluir` para entradas em `in_care` ou `observation`.
  - A ação conclui a entrada, recarrega a fila e exibe mensagem de sucesso.
  - Erros de transição são exibidos na tela.
- Testes:
  - Fluxo de rota da API cobre check-in, chamar, iniciar atendimento, concluir e no-show em entrada separada.
  - Testes da SPA cobrem conclusão bem-sucedida e erro de conclusão.

## Arquivos alterados

- `apps/api/src/routes/scheduling-routes.ts`
- `apps/api/src/routes/scheduling-routes.test.ts`
- `apps/api/src/openapi.yaml`
- `apps/spa/src/services/scheduling.ts`
- `apps/spa/src/pages/scheduling/QueuePage.vue`
- `apps/spa/src/pages/scheduling/__tests__/QueuePage.test.ts`

## Validações

- `pnpm --filter @cvg-his-v2/api build`
  - Aprovado.
- `node --test apps/api/dist/routes/scheduling-routes.test.js`
  - 7 testes aprovados.
- `pnpm validate:openapi`
  - Aprovado.
  - 247 paths, 36 tags, 252 schemas.
- `pnpm exec vitest run src/pages/scheduling/__tests__/QueuePage.test.ts --pool=forks`
  - 1 arquivo aprovado.
  - 31 testes aprovados.
- `pnpm --filter @cvg-his-v2/spa typecheck`
  - Aprovado.
- `pnpm --filter @cvg-his-v2/spa build`
  - Aprovado.

## Impacto no roadmap

A F1-05 passa a cobrir melhor o fluxo completo da esteira:

- Entrada por check-in.
- Chamada.
- Abertura de triagem.
- Entrada em atendimento.
- Conclusão operacional.
- No-show/cancelamento.
- Vínculo com prontuário, cobrança e comanda.

Ainda restam melhorias futuras para paridade total, como handoff operacional mais rico por setor, SLA por etapa e telemetria executiva por profissional/unidade.
