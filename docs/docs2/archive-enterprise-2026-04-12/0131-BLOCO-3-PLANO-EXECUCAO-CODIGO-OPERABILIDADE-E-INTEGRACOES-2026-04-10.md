# BLOCO 3 — PLANO DE EXECUCAO DE CODIGO: OPERABILIDADE E INTEGRACOES

**Data:** 10/04/2026
**Status:** PRONTO PARA EXECUCAO
**Escopo:** proxima rodada executavel do BLOCO 3 com implementacao direta de codigo
**Objetivo:** avancar o BLOCO 3 em operabilidade real, controles de integracao e robustez do backbone externo

---

## 1. Estado de Entrada

Estado formal consolidado:

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `BLOCO 3 EM EXECUCAO`
- `PIX -> BILLING FECHADO`
- `GAP FRONTEND/BACKEND REDUZIDO MATERIALMENTE`

Conclusao:

**A proxima rodada nao deve voltar para gap de produto.**
**A proxima rodada deve implementar codigo estrutural para tornar as integracoes mais operaveis, rastreaveis e controlaveis.**

---

## 2. Missao Desta Rodada

Implementar codigo real em tres frentes:

1. operabilidade do backbone de eventos;
2. operabilidade de webhooks externos;
3. endurecimento contratual e observabilidade basica das integracoes.

---

## 3. Fonte de Verdade Obrigatoria

O executor deve usar obrigatoriamente:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0129-SNAPSHOT-EXECUTIVO-PROGRAMA-POS-REVISAO-GAP-REMANESCENTE-2026-04-10.md`
- `docs/Enterprise/0130-BLOCO-3-CONTINUIDADE-EVOLUCAO-ESTRUTURAL-2026-04-10.md`
- `docs/Enterprise/1050-API-PREMIUM-OPENAPI.md`
- `docs/Enterprise/0114-PIX-INTEGRATION.md`

Se a execucao mostrar estado diferente da documentacao:

- a execucao vence;
- os docs devem ser corrigidos no mesmo lote.

---

## 4. Escopo Permitido

Esta rodada pode atuar em:

- `packages/modules/event-bus/**`
- `packages/modules/webhooks/**`
- `packages/modules/pix/**`
- `apps/api/**`
- `apps/worker/**`
- testes de modulo, runtime, integracao e contrato
- OpenAPI e runtime de integracoes
- documentacao operacional e tracker ligados a esta rodada

---

## 5. Escopo Proibido

Nao abrir nesta rodada:

- nova rodada ampla de frontend;
- remediacoes antigas de Bloco 1 ou 2 sem evidência nova;
- redesign de frontend;
- expansao ampla de ML, SOC2 ou LGPD fora do que tocar diretamente as integracoes.

---

## 6. Frentes Obrigatorias de Implementacao

### F1. Event Bus Operavel

Objetivo:

- deixar o backbone de eventos menos caixa-preta e mais operavel no runtime.

Entregas esperadas:

- endpoint, comando ou rotina administrativa para inspecionar eventos falhos/DLQ;
- capacidade minima de replay ou reprocessamento controlado quando fizer sentido;
- rastreabilidade clara de status, tentativa e erro;
- testes cobrindo o fluxo administrativo implementado.

### F2. Webhooks Operaveis

Objetivo:

- tornar a trilha de webhooks mais gerenciavel e previsivel.

Entregas esperadas:

- endpoint, comando ou fluxo para reenfileirar/retestar entrega de webhook;
- visibilidade melhor de tentativas, falhas e ultimo erro;
- integracao coerente com o event bus e com o estado persistido;
- testes cobrindo o fluxo principal.

### F3. Integracoes Mais Observaveis

Objetivo:

- melhorar o diagnostico operacional das integracoes sem abrir uma frente gigante de observabilidade.

Entregas esperadas:

- exposicao minima de sinais uteis no runtime para integracoes;
- logs/metadata/correlation mais acionaveis quando houver falha;
- contratos OpenAPI ajustados se novos endpoints administrativos forem expostos.

---

## 7. Ordem Obrigatoria de Execucao

1. ler os docs de fonte de verdade
2. identificar o principal gargalo operacional atual entre event-bus e webhooks
3. implementar a frente F1
4. implementar a frente F2
5. implementar a frente F3
6. validar tudo o que foi alterado
7. atualizar tracker e docs
8. emitir o estado final da rodada

---

## 8. Validacoes Minimas Obrigatorias

O executor deve usar validacao real sempre que possivel:

- `pnpm typecheck`
- `pnpm build`
- testes dos modulos alterados
- testes de `event-bus`
- testes de `webhooks`
- testes de API/runtime afetados
- `pnpm validate:openapi` se contratos mudarem

---

## 9. Criterio de Saida Desta Rodada

Esta rodada sera considerada bem-sucedida se houver evidência objetiva de:

- ganho estrutural real de operabilidade em `event-bus` e/ou `webhooks`;
- fluxo administrativo ou de replay/reteste implementado e testado;
- documentacao coerente com o estado executado.

Nao e necessario concluir todo o BLOCO 3.
E necessario avancar a capacidade operacional real da plataforma.

---

## 10. Resultado Esperado do Executor

Ao final, o executor deve devolver:

- qual gargalo operacional foi atacado;
- o que foi implementado em `event-bus`;
- o que foi implementado em `webhooks`;
- o que foi implementado em observabilidade/contrato;
- arquivos alterados;
- comandos executados;
- resultados reais;
- docs atualizados;
- decisao final:
  - `BLOCO 3 AVANCOU ESTRUTURALMENTE`
  - ou `BLOCO 3 SEM AVANCO ESTRUTURAL SUFICIENTE`
