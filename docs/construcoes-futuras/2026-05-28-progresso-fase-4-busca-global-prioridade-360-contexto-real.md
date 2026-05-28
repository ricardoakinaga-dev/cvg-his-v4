# Progresso Fase 4 - Busca Mestre com prioridade 360 de contexto real

Data: 2026-05-28

## Objetivo

Avancar `F4-04 - Otimizar busca global`, levando para a `Busca Mestre` a mesma hierarquia completa de prioridade 360 ja aplicada na recepcao.

## Entregue

- A `Busca Mestre` passou a carregar contexto 360 dos pacientes encontrados:
  - pedidos laboratoriais por `laboratoryService.listOrders({ patientId })`;
  - preventivos por `vaccinesDewormersService.list({ patientId, ownerId, includeExecuted: true })`;
  - billing por `billingService.list({ ownerId })`.
- A coluna `Prioridade 360` agora usa a hierarquia:
  - `Exames pendentes`;
  - `Preventivo vencido`;
  - `Pendência financeira`;
  - `Atenção clínica`;
  - `Sem alerta`.
- A pagina recebeu filtro operacional `Filtrar prioridade 360`, exibindo apenas pacientes com prioridade ativa e seus vinculos.
- Incremento posterior adicionou ordenacao explicita por severidade, mantendo exames pendentes acima de preventivo, financeiro, atencao clinica e sem alerta.
- Incremento posterior adicionou resumo agregado por severidade no topo da `Busca Mestre`.
- Incremento posterior tornou os itens do resumo acionaveis para filtrar uma severidade especifica.
- O carregamento de contexto 360 usa `Promise.allSettled`, preservando a busca federada mesmo se laboratorio, preventivo ou billing falharem.
- O teste da Busca Mestre cobre chamadas aos servicos de contexto, exibicao de `Exames pendentes`, acao `Abrir cockpit` e filtro de prioridade.

## Evidencias tecnicas

- `apps/spa/src/pages/master-search/MasterSearchPage.vue`
- `apps/spa/src/pages/master-search/__tests__/MasterSearchPage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/master-search/__tests__/MasterSearchPage.test.ts` - 6/6 testes passando.

## Impacto no Premium Enterprise

A busca federada deixa de ser apenas localizador multi-dominio e passa a operar como triagem transversal. Suporte, recepcao e gestao conseguem localizar o paciente e entender rapidamente se ha risco clinico, pendencia preventiva ou pendencia financeira antes de abrir o cockpit.

## Proximos passos recomendados

- Rodar a jornada 360 E2E em ambiente com PostgreSQL de teste ativo para validar persistencia real.
