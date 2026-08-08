# Progresso Fase 4 - Busca Mestre com ordenacao por prioridade 360

Data: 2026-05-28

## Objetivo

Fechar a pendencia de ordenar explicitamente os resultados de pacientes da `Busca Mestre` pela severidade da `Prioridade 360`.

## Entregue

- A tabela de pacientes da `Busca Mestre` passou a usar uma lista derivada ordenada por severidade.
- A ordem aplicada e:
  - exames pendentes;
  - preventivo vencido;
  - pendencia financeira;
  - atencao clinica cadastral;
  - sem alerta.
- Em empate de severidade, os pacientes sao ordenados alfabeticamente por nome.
- O filtro `Filtrar prioridade 360` continua usando a mesma lista ordenada, exibindo apenas prioridades ativas.
- O teste da Busca Mestre cobre uma lista retornada fora de ordem pela API e valida a exibicao ordenada por severidade.
- Incremento posterior adicionou o bloco `Resumo Prioridade 360`, agregando a quantidade de pacientes por severidade no topo da busca.
- Incremento posterior tornou o resumo acionavel para aplicar filtro por severidade especifica.

## Evidencias tecnicas

- `apps/spa/src/pages/master-search/MasterSearchPage.vue`
- `apps/spa/src/pages/master-search/__tests__/MasterSearchPage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/master-search/__tests__/MasterSearchPage.test.ts` - 7/7 testes passando.

## Impacto no Premium Enterprise

A Busca Mestre passa a funcionar como uma fila de triagem operacional: os pacientes de maior risco/contexto aparecem antes dos registros sem alerta, mesmo quando a API retorna resultados em outra ordem.

## Proximos passos recomendados

- Rodar a jornada 360 E2E em ambiente com PostgreSQL de teste ativo para validar persistencia real.
- Avaliar sincronizacao server-side da preferencia de filtro caso a operacao precise preservar o mesmo recorte entre dispositivos.
