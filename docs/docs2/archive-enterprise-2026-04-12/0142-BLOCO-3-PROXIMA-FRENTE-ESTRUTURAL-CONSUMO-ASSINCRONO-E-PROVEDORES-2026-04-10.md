# 0142 — BLOCO 3 PROXIMA FRENTE ESTRUTURAL CONSUMO ASSINCRONO E PROVEDORES — 2026-04-10

## Objetivo

Avancar a proxima frente estrutural do BLOCO 3 sobre a base ja consolidada de event bus, webhooks e PIX, focando agora em consumo assincrono mais explicito e preparo para provedores externos reais.

## Estado de Entrada

- event bus com `retry`, `DLQ`, `inspect`, `reprocess`, `stats` e `pending`
- webhooks com `retest`, inspeção individual e estatisticas de deliveries
- PIX com `intent`, `confirm` e reflexo em billing
- `server.ts` com modularizacao iniciada

## Problema Estrutural Atual

A base operacional existe, mas a topologia de consumo ainda esta concentrada demais e com pouca explicitude por dominio. O proximo ganho estrutural nao e mais inspecao; e tornar o consumo mais legivel, extensivel e preparado para provedores externos reais.

## Fonte de Verdade Obrigatoria

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/0114-PIX-INTEGRATION.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0131-BLOCO-3-PLANO-EXECUCAO-CODIGO-OPERABILIDADE-E-INTEGRACOES-2026-04-10.md`
- `docs/Enterprise/0139-BLOCO-3-CONTINUIDADE-DIAGNOSTICO-E-ADMINISTRACAO-OPERACIONAL-2026-04-10.md`
- `docs/Enterprise/0141-SNAPSHOT-EXECUTIVO-PROGRAMA-POS-DIAGNOSTICO-OPERACIONAL-INTEGRACOES-2026-04-10.md`

## Escopo Permitido

- explicitar consumers/handlers assincronos por dominio
- melhorar o wiring do worker para consumo estruturado
- preparar integracao com provedores externos reais sem ativar provider final em producao
- adicionar testes e docs para o novo arranjo

## Escopo Proibido

- nao redesenhar o event bus do zero
- nao trocar provider financeiro final nesta rodada
- nao reabrir frontend/backend gap
- nao reescrever o worker inteiro sem necessidade

## Ordem Obrigatoria de Execucao

### F1. Mapear o consumo atual

- localizar no worker e no runtime todos os subscriptions e handlers assincronos atuais
- classificar por dominio: `payments`, `webhooks`, `billing`, outros
- identificar o recorte mais seguro para extrair handlers explicitos

### F2. Estruturar handlers por dominio

- criar estrutura dedicada para handlers/consumers assincronos
- mover pelo menos o dominio mais pronto para essa estrutura
- preservar o comportamento atual de processamento

### F3. Endurecer o consumo operacional

- garantir que o worker continue executando o ciclo de consumo de forma clara
- melhorar logs/nomes/diagnosticos no caminho do consumo, se necessario
- garantir que o arranjo facilite a entrada futura de provedores externos reais

### F4. Validar e documentar

- rodar testes de `event-bus`, `webhooks`, `pix`, `billing` se afetados
- validar `typecheck`/`build` de `api` e `worker`
- atualizar tracker e plano mestre com o novo arranjo

## Criterio de Aceite

So considerar esta rodada concluida se houver evidencia objetiva de:

- consumo assincrono mais explicito no codigo
- pelo menos um recorte estrutural real no worker/handlers
- validacoes tecnicas passando
- documentacao refletindo o novo arranjo

## Validacoes Minimas Obrigatorias

- `pnpm --filter @cvg-his-v2/worker typecheck`
- `pnpm --filter @cvg-his-v2/worker build`
- `pnpm --filter @cvg-his-v2/module-event-bus test`
- `pnpm --filter @cvg-his-v2/module-webhooks test`
- `pnpm --filter @cvg-his-v2/module-pix test`
- `pnpm --filter @cvg-his-v2/module-billing test`

## Entregaveis Obrigatorios

- novos handlers/consumers ou modulo equivalente
- wiring do worker mais claro
- docs executivos atualizados
- relatorio final com arquivos alterados, comandos executados e resultados reais

## Formato de Saida Obrigatorio

### Resumo Executivo

- 3 a 6 linhas
- decisao final:
  - `BLOCO 3 AVANCOU ESTRUTURALMENTE`
  - ou `BLOCO 3 SEM AVANCO ESTRUTURAL SUFICIENTE`

### Estrutura de Consumo

- recorte escolhido
- handlers/consumers criados ou reorganizados

### Validações Executadas

- comando
- `PASS` / `FAIL`
- observacao curta

### Arquivos Alterados

- listar arquivos criados e modificados

### Decisao Final

- `BLOCO 3 AVANCOU ESTRUTURALMENTE`
- ou `BLOCO 3 SEM AVANCO ESTRUTURAL SUFICIENTE`
