# 0145 — BLOCO 3 CONTINUIDADE ESTRUTURAL CONSUMERS PAYMENTS BILLING — 2026-04-10

## Objetivo

Dar continuidade a explicitacao dos handlers/consumers assincronos por dominio no BLOCO 3, agora priorizando `payments` e `billing`, para uniformizar o backbone de consumo e reduzir ainda mais o acoplamento direto no runtime.

## Estado de Entrada

- `webhooks` ja extraido para consumer dedicado em `apps/api/src/consumers/webhooks.consumer.ts`
- `PIX -> BILLING` ja fechado por evento `payment.pix.confirmed`
- `server.ts` ja modularizado nos recortes `health`, `payments` e `webhooks`
- `runtime.ts` ainda concentra partes relevantes do consumo assincrono

## Problema Estrutural Atual

O caminho de `payments` e `billing` ainda representa um dos pontos de maior valor de dominio no backbone assincrono. Enquanto esse fluxo permanecer parcialmente embutido no runtime, a arquitetura continua menos uniforme do que poderia.

O objetivo desta rodada e tornar esse caminho:

- mais explicito
- mais coeso por dominio
- mais facil de manter
- mais pronto para evolucoes futuras de provider real e reconciliacao financeira

## Fonte de Verdade Obrigatoria

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0114-PIX-INTEGRATION.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0143-SNAPSHOT-EXECUTIVO-PROGRAMA-POS-EXTRACAO-PAYMENTS-WEBHOOKS-2026-04-10.md`
- `docs/Enterprise/0144-BLOCO-3-CONTINUIDADE-ESTRUTURAL-HANDLERS-ASSINCRONOS-POR-DOMINIO-2026-04-10.md`

## Escopo Permitido

- mapear o consumo assincrono atual de `payments` e `billing`
- extrair handlers/consumers dedicados desse dominio
- reduzir o wiring direto no `runtime.ts`
- preservar reflexo `payment.pix.confirmed -> billing settled`
- atualizar docs executivos no mesmo lote

## Escopo Proibido

- nao alterar o contrato funcional do fluxo PIX
- nao trocar provider financeiro real nesta rodada
- nao reabrir webhooks ou refatoracao ampla do worker
- nao redesenhar o event bus

## Ordem Obrigatoria de Execucao

### F1. Mapear o fluxo atual

- localizar no `runtime.ts` e pontos relacionados o consumo atual de eventos financeiros
- identificar quais efeitos pertencem a `payments` e quais pertencem a `billing`
- definir o recorte minimo seguro para extracao

### F2. Extrair consumer dedicado

- criar modulo dedicado em `apps/api/src/consumers/`
- mover o tratamento do fluxo financeiro assíncrono para esse modulo
- manter interfaces e comportamento atuais
- deixar o `runtime.ts` apenas com wiring claro do consumer

### F3. Revalidar o fluxo de dominio

- garantir que `payment.pix.confirmed` continue liquidando billing corretamente
- validar testes dos modulos afetados
- validar typecheck/build de `api`

### F4. Atualizar documentacao

- atualizar `0100-EXECUTION-TRACKER.md`
- atualizar `0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md` se o arranjo estrutural do consumo mudar materialmente
- registrar o novo padrao de consumers por dominio

## Criterio de Aceite

So considerar esta rodada concluida se houver evidencia objetiva de:

- consumer dedicado de `payments/billing` criado
- `runtime.ts` mais claro nesse caminho
- `payment.pix.confirmed -> billing settled` preservado
- `pnpm --filter @cvg-his-v2/api typecheck` PASS
- `pnpm --filter @cvg-his-v2/api build` PASS
- testes relevantes PASS

## Validacoes Minimas Obrigatorias

- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/api build`
- `pnpm --filter @cvg-his-v2/module-pix test`
- `pnpm --filter @cvg-his-v2/module-billing test`
- `pnpm --filter @cvg-his-v2/module-event-bus test`

## Entregaveis Obrigatorios

- novo consumer dedicado para `payments/billing`
- `runtime.ts` com wiring mais claro
- docs executivos atualizados
- relatorio final com arquivos alterados, comandos executados e resultados reais

## Formato de Saida Obrigatorio

### Resumo Executivo

- 3 a 6 linhas
- decisao final:
  - `BLOCO 3 AVANCOU ESTRUTURALMENTE`
  - ou `BLOCO 3 SEM AVANCO ESTRUTURAL SUFICIENTE`

### Recorte Escolhido

- dominio escolhido
- consumer extraido

### Validações Executadas

- comando
- `PASS` / `FAIL`
- observacao curta

### Arquivos Alterados

- listar arquivos criados e modificados

### Decisao Final

- `BLOCO 3 AVANCOU ESTRUTURALMENTE`
- ou `BLOCO 3 SEM AVANCO ESTRUTURAL SUFICIENTE`
