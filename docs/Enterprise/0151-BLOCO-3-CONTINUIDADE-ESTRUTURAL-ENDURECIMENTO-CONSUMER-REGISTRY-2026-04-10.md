# 0151 — BLOCO 3 CONTINUIDADE ESTRUTURAL ENDURECIMENTO CONSUMER REGISTRY — 2026-04-10

## Objetivo

Avancar o BLOCO 3 fortalecendo o `consumer registry` como plataforma de expansao segura para novos dominios assincronos, com foco em contrato minimo, onboarding previsivel e testes de arquitetura do padrao.

## Estado de Entrada

- `PaymentsEventHandlers`, `BillingEventHandlers` e `WebhooksEventHandlers` ativos
- `consumer registry` central criado em `apps/api/src/consumers/index.ts`
- `runtime.ts` com wiring simplificado
- backbone assincrono operacional e mais legivel

## Problema Estrutural Atual

O registry ja funciona, mas ainda precisa ser endurecido para suportar crescimento futuro sem ambiguidade:

- contrato minimo mais explicito
- onboarding de novos consumers mais previsivel
- testes que garantam o comportamento do padrao central
- menor risco de regressao arquitetural em expansoes futuras

## Fonte de Verdade Obrigatoria

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0148-SNAPSHOT-EXECUTIVO-PROGRAMA-POS-CONSUMER-REGISTRY-2026-04-10.md`
- `docs/Enterprise/0149-BLOCO-3-CONTINUIDADE-ESTRUTURAL-EXPANSAO-SEGURA-CONSUMERS-2026-04-10.md`
- `docs/Enterprise/0150-SNAPSHOT-EXECUTIVO-PROGRAMA-POS-CONSUMERS-PAYMENTS-BILLING-2026-04-10.md`

## Escopo Permitido

- endurecer `DomainConsumer` e contratos relacionados
- criar testes do registry e do onboarding padrao
- melhorar naming, tipagem e ergonomia do padrao central
- adicionar documentacao operacional do onboarding de novos consumers
- atualizar docs executivos

## Escopo Proibido

- nao redesenhar o event bus
- nao introduzir novo provider externo real nesta rodada
- nao abrir novo dominio grande se nao for necessario para provar o padrao
- nao reabrir frontend/backend gap

## Ordem Obrigatoria de Execucao

### F1. Revisar o contrato atual

- inspecionar `DomainConsumer`
- identificar lacunas de tipagem, naming e previsibilidade
- definir o menor endurecimento necessario

### F2. Endurecer o registry

- ajustar contrato/tipagem/interface se necessario
- tornar o onboarding de consumers mais explicito
- reduzir ambiguidade no padrao de registro

### F3. Testar a arquitetura

- criar testes direcionados ao `consumer registry`
- validar registro e composicao dos consumers existentes
- garantir que o padrao de onboarding esta coberto

### F4. Documentar o padrao

- atualizar `0117-EVENT-BUS.md` com o padrao de onboarding de consumers
- atualizar `0100-EXECUTION-TRACKER.md`
- atualizar `0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md` se houver evolucao estrutural relevante

## Criterio de Aceite

So considerar esta rodada concluida se houver evidencia objetiva de:

- `consumer registry` mais explicito e robusto
- onboarding de novos consumers mais previsivel
- testes do registry cobrindo a arquitetura minima
- validacoes tecnicas passando
- docs refletindo o novo patamar

## Validacoes Minimas Obrigatorias

- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/api build`
- `pnpm --filter @cvg-his-v2/worker typecheck`
- `pnpm --filter @cvg-his-v2/worker build`
- `pnpm --filter @cvg-his-v2/module-event-bus test`
- `pnpm --filter @cvg-his-v2/module-webhooks test`
- `pnpm --filter @cvg-his-v2/module-pix test`
- `pnpm --filter @cvg-his-v2/module-billing test`
- testes do `consumer registry`

## Entregaveis Obrigatorios

- registry endurecido
- testes de arquitetura do registry
- docs executivos atualizados
- relatorio final com arquivos alterados, comandos executados e resultados reais

## Formato de Saida Obrigatorio

### Resumo Executivo

- 3 a 6 linhas
- decisao final:
  - `BLOCO 3 AVANCOU ESTRUTURALMENTE`
  - ou `BLOCO 3 SEM AVANCO ESTRUTURAL SUFICIENTE`

### Estrutura Fortalecida

- o que mudou no registry
- o que mudou no onboarding
- que testes foram adicionados

### Validações Executadas

- comando
- `PASS` / `FAIL`
- observacao curta

### Arquivos Alterados

- listar arquivos criados e modificados

### Decisao Final

- `BLOCO 3 AVANCOU ESTRUTURALMENTE`
- ou `BLOCO 3 SEM AVANCO ESTRUTURAL SUFICIENTE`
