# 0144 — BLOCO 3 CONTINUIDADE ESTRUTURAL HANDLERS ASSINCRONOS POR DOMINIO — 2026-04-10

## Objetivo

Avancar o BLOCO 3 a partir do novo patamar de modularizacao do servidor, focando agora em estruturar melhor os handlers assincronos por dominio e clarear o wiring do worker e do runtime para consumo operacional do backbone.

## Estado de Entrada

- `server.ts` ja modularizado nos dominios `health`, `payments` e `webhooks`
- event bus com `retry`, `DLQ`, `reprocess`, `stats`, `pending` e inspecao individual
- webhooks com `retest`, estatisticas e inspecao de delivery
- PIX com `intent`, `confirm` e reflexo em billing

## Problema Estrutural Atual

O backbone operacional esta mais maduro, mas os consumers/handlers assincronos ainda estao pouco explicitados por dominio. O proximo ganho estrutural e separar melhor esses pontos de consumo para:

- aumentar legibilidade
- facilitar manutencao
- preparar entrada de provedores externos reais
- reduzir acoplamento entre runtime e processamento assincrono

## Fonte de Verdade Obrigatoria

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/0114-PIX-INTEGRATION.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0131-BLOCO-3-PLANO-EXECUCAO-CODIGO-OPERABILIDADE-E-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/0139-BLOCO-3-CONTINUIDADE-DIAGNOSTICO-E-ADMINISTRACAO-OPERACIONAL-2026-04-10.md`
- `docs/Enterprise/0143-SNAPSHOT-EXECUTIVO-PROGRAMA-POS-EXTRACAO-PAYMENTS-WEBHOOKS-2026-04-10.md`

## Escopo Permitido

- mapear subscriptions e consumers atuais
- criar handlers assincronos explicitos por dominio
- mover pelo menos um recorte real do wiring assincrono para modulo proprio
- melhorar clareza do worker e do runtime nesse caminho
- atualizar docs executivos

## Escopo Proibido

- nao redesenhar todo o event bus
- nao trocar provider financeiro real nesta rodada
- nao reabrir refatoracao ampla do servidor HTTP
- nao abrir nova frente de frontend

## Ordem Obrigatoria de Execucao

### F1. Mapear o consumo assincrono atual

- localizar subscriptions e consumers em `apps/api/src/runtime.ts`
- localizar wiring relevante em `apps/worker/src/`
- classificar os pontos atuais por dominio

### F2. Escolher o recorte mais seguro

- selecionar o dominio mais pronto para extracao modular
- priorizar um recorte que aumente clareza sem alterar comportamento

### F3. Extrair handlers/consumers por dominio

- criar modulo dedicado para os handlers escolhidos
- reduzir o acoplamento direto no runtime/worker
- preservar logs, audit trail e efeitos de dominio existentes

### F4. Revalidar

- validar `worker` e `api`
- validar testes dos modulos afetados
- atualizar docs executivos com o novo arranjo

## Criterio de Aceite

So considerar esta rodada concluida se houver evidencia objetiva de:

- pelo menos um recorte assincrono extraido por dominio
- runtime/worker mais legiveis nesse caminho
- typecheck/build/testes relevantes passando
- docs refletindo o novo arranjo

## Validacoes Minimas Obrigatorias

- `pnpm --filter @cvg-his-v2/worker typecheck`
- `pnpm --filter @cvg-his-v2/worker build`
- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/api build`
- `pnpm --filter @cvg-his-v2/module-event-bus test`
- `pnpm --filter @cvg-his-v2/module-webhooks test`
- `pnpm --filter @cvg-his-v2/module-pix test`
- `pnpm --filter @cvg-his-v2/module-billing test`

## Entregaveis Obrigatorios

- novo modulo de handlers/consumers assincronos por dominio
- wiring mais claro no `runtime` ou `worker`
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
- handlers/consumers extraidos

### Validações Executadas

- comando
- `PASS` / `FAIL`
- observacao curta

### Arquivos Alterados

- listar arquivos criados e modificados

### Decisao Final

- `BLOCO 3 AVANCOU ESTRUTURALMENTE`
- ou `BLOCO 3 SEM AVANCO ESTRUTURAL SUFICIENTE`
