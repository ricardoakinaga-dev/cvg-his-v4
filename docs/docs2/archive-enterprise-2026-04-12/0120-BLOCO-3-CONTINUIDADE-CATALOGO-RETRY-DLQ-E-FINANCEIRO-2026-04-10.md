# BLOCO 3 — CONTINUIDADE: CATALOGO DE EVENTOS, RETRY/DLQ E FECHAMENTO FINANCEIRO

**Data:** 10/04/2026
**Status:** PRONTO PARA EXECUCAO
**Escopo:** proxima rodada executavel do BLOCO 3
**Objetivo:** fechar os tres itens pendentes mais importantes da rodada atual de integracoes

---

## 1. Ponto Oficial do Programa

Estado formal de entrada:

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `BLOCO 3 EM EXECUCAO`

Estado consolidado da rodada anterior:

- Event bus com outbox materializado
- webhooks e API premium com superficie externa real
- primeira trilha executavel de PIX aberta

Pendencias centrais remanescentes:

1. catalogo completo de eventos
2. consumo avancado com retry/DLQ
3. integracao financeira final

---

## 2. Missao Desta Continuidade

Executar a proxima rodada do BLOCO 3 com foco exclusivo em transformar a camada inicial ja aberta em integracao mais completa, auditavel e resiliente.

Esta rodada deve:

1. consolidar o catalogo de eventos do bloco;
2. endurecer o consumo assincrono com retry e DLQ;
3. avancar a trilha financeira para um estado mais proximo de integracao final.

---

## 3. Fonte de Verdade Obrigatoria

O executor deve usar obrigatoriamente:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/0114-PIX-INTEGRATION.md`
- `docs/Enterprise/0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/1050-API-PREMIUM-OPENAPI.md`
- `docs/Enterprise/203-BACKLOG-ONDA-3.md`

Se a execucao mostrar estado diferente da documentacao:

- a execucao vence;
- os docs devem ser corrigidos no mesmo lote.

---

## 4. Escopo Permitido

Esta continuidade pode atuar em:

- `packages/modules/event-bus/**`
- `apps/api/**`
- `apps/worker/**`
- modulos ligados a webhooks e pagamentos
- contratos OpenAPI de integracao
- testes de runtime, integracao e contrato associados
- documentacao operacional e tracker ligados a esta rodada

---

## 5. Escopo Proibido

Nao abrir nesta rodada:

- remediacoes de Bloco 1 ou 2 sem evidência nova;
- redesign de frontend;
- nova frente ampla de compliance;
- expansao ampla de IA/ML;
- integracao irreversivel com provedor final de pagamentos sem camada de abstracao segura.

---

## 6. Frentes Obrigatorias Desta Rodada

### F1. Catalogo Completo de Eventos

Objetivo:

- tornar explicito e rastreavel o conjunto de eventos produzidos e consumidos no BLOCO 3.

Entregas esperadas:

- lista canonica dos eventos ativos desta etapa;
- nome, origem, payload minimo e consumidor esperado;
- alinhamento entre codigo, docs e runtime;
- registro no doc de event bus e no tracker.

### F2. Retry e DLQ

Objetivo:

- endurecer o consumo assincrono para que falhas nao virem perda silenciosa.

Entregas esperadas:

- estrategia clara de retry;
- criterio de exaustao;
- destino explicito de falha definitiva (DLQ ou equivalente);
- visibilidade operacional minima;
- testes cobrindo sucesso, retry e falha terminal.

### F3. Fechamento Financeiro da Trilha Inicial

Objetivo:

- avancar de intent local de PIX para uma trilha financeira mais completa e segura.

Entregas esperadas:

- consolidacao da abstracao de gateway;
- fluxo financeiro inicial mais completo do que apenas criar intent;
- eventos financeiros coerentes com o backbone assincrono;
- contrato externo e/ou runtime atualizados se necessario;
- validacao objetiva do fluxo financeiro implementado.

---

## 7. Ordem Obrigatoria de Execucao

1. ler os docs de fonte de verdade
2. consolidar o catalogo de eventos
3. implementar retry/DLQ
4. avancar o fluxo financeiro inicial
5. validar o que foi alterado
6. atualizar tracker e docs
7. emitir o estado final desta rodada

---

## 8. Validacoes Minimas Obrigatorias

O executor deve usar validacao real sempre que possivel:

- `pnpm typecheck`
- `pnpm build`
- testes dos modulos alterados
- testes do event bus
- testes do worker, se afetado
- testes de runtime/contrato da API, se afetada
- `pnpm validate:openapi`, se houver mudanca contratual

Se o fluxo financeiro evoluir:

- incluir pelo menos 1 validacao objetiva do novo fluxo

---

## 9. Criterio de Saida Desta Rodada

Esta rodada sera considerada bem-sucedida se houver evidência objetiva de:

- catalogo de eventos fechado e coerente;
- retry/DLQ implementado com cobertura minima real;
- trilha financeira avancada alem da intent inicial;
- documentacao coerente com o estado executado.

Nao e necessario encerrar o BLOCO 3 inteiro.
E necessario avancar o BLOCO 3 de forma clara, resiliente e verificavel.

---

## 10. Resultado Esperado do Executor

Ao final, o executor deve devolver:

- o catalogo de eventos consolidado;
- o que foi implementado em retry/DLQ;
- o que foi implementado na trilha financeira;
- arquivos alterados;
- comandos executados;
- resultados reais;
- docs atualizados;
- decisao final:
  - `BLOCO 3 AVANCOU`
  - ou `BLOCO 3 SEM AVANCO SUFICIENTE`
