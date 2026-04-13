# BLOCO 3 — CONTINUIDADE: PIX -> BILLING

**Data:** 10/04/2026
**Status:** PRONTO PARA EXECUCAO
**Escopo:** proxima rodada executavel do BLOCO 3 focada exclusivamente no reflexo de confirmacao PIX no faturamento
**Objetivo:** fechar o vinculo de dominio entre `payment.pix.confirmed` e a liquidacao real do billing

---

## 1. Estado de Entrada

Estado formal do programa:

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `BLOCO 3 EM EXECUCAO`

Estado consolidado da rodada anterior:

- intent PIX implementada
- confirmacao PIX implementada
- evento `payment.pix.confirmed` publicado no outbox/event bus
- trilha financeira PIX avancou com fechamento financeiro real

Gap remanescente objetivo:

- a confirmacao PIX ainda nao move automaticamente o billing correspondente para `status='settled'`

Conclusao:

**A proxima rodada deve fechar o reflexo de dominio `PIX -> Billing`.**

---

## 2. Missao Desta Continuidade

Executar exclusivamente o fechamento do encadeamento:

1. confirmacao PIX
2. evento `payment.pix.confirmed`
3. handler/consumer de dominio
4. `BillingService.updateStatus(..., { status: 'settled' })`

Esta rodada deve transformar o evento financeiro em efeito real no modulo de billing.

---

## 3. Fonte de Verdade Obrigatoria

O executor deve usar obrigatoriamente:

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0114-PIX-INTEGRATION.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/0124-BLOCO-3-CONTINUIDADE-FECHAMENTO-FINANCEIRO-PIX-2026-04-10.md`
- `docs/Enterprise/0118-BLOCO-3-PLANO-CONSTRUCAO-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`

Se a execucao mostrar estado diferente da documentacao:

- a execucao vence;
- os docs devem ser corrigidos no mesmo lote.

---

## 4. Escopo Permitido

Esta continuidade pode atuar em:

- `packages/modules/pix/**`
- `packages/modules/billing/**`
- `packages/modules/event-bus/**`
- `apps/api/**`
- `apps/worker/**`
- testes de runtime, integracao e contrato ligados a esse fluxo
- documentacao operacional e tracker ligados a esta rodada

---

## 5. Escopo Proibido

Nao abrir nesta rodada:

- novos meios de pagamento;
- integracao irreversivel com provedor final;
- redesign de frontend;
- remediacoes de Bloco 1 ou 2 sem evidência nova;
- expansoes fora do fluxo `PIX -> Billing`.

---

## 6. Frentes Obrigatorias Desta Rodada

### F1. Mapear o vinculo PIX -> Billing

Objetivo:

- identificar com precisao como localizar o billing record correto a partir da confirmacao PIX.

Entregas esperadas:

- relacao clara entre intent/evento PIX e entidade de billing;
- criterio objetivo para localizar o encounter ou billing correspondente;
- nenhuma inferencia ambigua escondida no codigo.

### F2. Implementar o handler de reflexo financeiro

Objetivo:

- consumir `payment.pix.confirmed` e refletir a liquidacao no billing.

Entregas esperadas:

- handler ou consumer explicito;
- chamada a `BillingService.updateStatus(..., { status: 'settled' })` ou equivalente canonico;
- comportamento idempotente ou seguro o suficiente para replay/retry;
- integracao coerente com event bus/outbox.

### F3. Validar o fluxo ponta a ponta

Objetivo:

- provar por teste real que o evento financeiro gera efeito no faturamento.

Entregas esperadas:

- teste de modulo, integracao ou runtime cobrindo o fluxo;
- evidência objetiva de que billing muda para `settled`;
- docs ajustados ao estado real.

---

## 7. Ordem Obrigatoria de Execucao

1. ler os docs de fonte de verdade
2. mapear o vinculo entre intent/evento PIX e billing
3. implementar o handler/consumer de reflexo
4. integrar com `BillingService.updateStatus`
5. validar o fluxo ponta a ponta
6. atualizar tracker e docs
7. emitir o estado final da rodada

---

## 8. Validacoes Minimas Obrigatorias

O executor deve usar validacao real sempre que possivel:

- `pnpm typecheck`
- `pnpm build`
- testes do modulo `pix`, se afetado
- testes do modulo `billing`, se afetado
- testes do event bus/worker, se afetados
- pelo menos 1 validacao objetiva do fluxo `PIX -> Billing`

---

## 9. Criterio de Saida Desta Rodada

Esta rodada sera considerada bem-sucedida se houver evidência objetiva de:

- `payment.pix.confirmed` gera reflexo real no billing;
- o billing correspondente vai para `settled`;
- o fluxo esta validado por teste real;
- documentacao coerente com o estado executado.

---

## 10. Resultado Esperado do Executor

Ao final, o executor deve devolver:

- como o vinculo PIX -> Billing foi modelado;
- o que foi implementado no handler/consumer;
- quais testes provaram o reflexo no faturamento;
- arquivos alterados;
- comandos executados;
- resultados reais;
- docs atualizados;
- decisao final:
  - `PIX -> BILLING FECHADO`
  - ou `PIX -> BILLING AINDA PENDENTE`
