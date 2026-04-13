# 0147 — BLOCO 3 CONTINUIDADE ESTRUTURAL CONSUMER REGISTRY E PADRONIZACAO — 2026-04-10

## Objetivo

Avancar o BLOCO 3 consolidando o padrao emergente de consumers por dominio em um `consumer registry` ou estrutura equivalente, reduzindo o wiring manual no runtime e preparando a expansao segura de novos dominios assincronos.

## Estado de Entrada

- `BillingEventHandlers` ja criado
- `WebhooksEventHandlers` ja criado
- `runtime.ts` ja mais claro, mas ainda responsavel pelo registro manual dos consumers
- backbone assincrono operacional e diagnosticavel

## Problema Estrutural Atual

O padrao de consumers por dominio ja existe, mas ainda esta em estado inicial. Sem um registry ou padrao central equivalente, o custo de adicionar novos dominios continuará crescendo e o wiring do runtime seguirá manual demais.

O proximo ganho estrutural e transformar:

- consumers isolados

em:

- consumers organizados por um padrao central claro

## Fonte de Verdade Obrigatoria

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0143-SNAPSHOT-EXECUTIVO-PROGRAMA-POS-EXTRACAO-PAYMENTS-WEBHOOKS-2026-04-10.md`
- `docs/Enterprise/0144-BLOCO-3-CONTINUIDADE-ESTRUTURAL-HANDLERS-ASSINCRONOS-POR-DOMINIO-2026-04-10.md`
- `docs/Enterprise/0146-SNAPSHOT-EXECUTIVO-PROGRAMA-POS-CONSUMERS-POR-DOMINIO-2026-04-10.md`

## Escopo Permitido

- criar `consumer registry` ou padrao central equivalente
- registrar `billing` e `webhooks` por esse novo padrao
- reduzir wiring manual no `runtime.ts`
- padronizar interfaces/minimo contrato dos consumers
- atualizar docs executivos

## Escopo Proibido

- nao redesenhar o event bus
- nao alterar contratos de dominio
- nao introduzir novos dominios grandes sem necessidade
- nao reabrir refatoracao ampla do server HTTP

## Ordem Obrigatoria de Execucao

### F1. Mapear o padrao atual

- revisar como `BillingEventHandlers` e `WebhooksEventHandlers` sao instanciados e registrados
- identificar o menor padrao comum entre eles

### F2. Criar o registry/padrao central

- criar uma estrutura clara para registro de consumers
- padronizar a forma de expor handlers pelos consumers existentes
- reduzir codigo manual no `runtime.ts`

### F3. Migrar consumers existentes

- adaptar `billing`
- adaptar `webhooks`
- garantir que o comportamento final permaneça igual

### F4. Revalidar e documentar

- validar `api`, `worker` e modulos centrais afetados
- atualizar `0100-EXECUTION-TRACKER.md`
- atualizar `0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md` se o arranjo estrutural mudar materialmente
- atualizar `0117-EVENT-BUS.md` com o novo padrao

## Criterio de Aceite

So considerar esta rodada concluida se houver evidencia objetiva de:

- registry ou padrao central criado
- `billing` e `webhooks` registrados por ele
- `runtime.ts` com wiring mais enxuto
- validacoes tecnicas passando
- docs refletindo o novo arranjo

## Validacoes Minimas Obrigatorias

- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/api build`
- `pnpm --filter @cvg-his-v2/worker typecheck`
- `pnpm --filter @cvg-his-v2/worker build`
- `pnpm --filter @cvg-his-v2/module-event-bus test`
- `pnpm --filter @cvg-his-v2/module-webhooks test`
- `pnpm --filter @cvg-his-v2/module-pix test`
- `pnpm --filter @cvg-his-v2/module-billing test`

## Entregaveis Obrigatorios

- `consumer registry` ou estrutura equivalente
- consumers existentes migrados
- runtime simplificado
- docs executivos atualizados
- relatorio final com arquivos alterados, comandos executados e resultados reais

## Formato de Saida Obrigatorio

### Resumo Executivo

- 3 a 6 linhas
- decisao final:
  - `BLOCO 3 AVANCOU ESTRUTURALMENTE`
  - ou `BLOCO 3 SEM AVANCO ESTRUTURAL SUFICIENTE`

### Estrutura Criada

- registry/padrao criado
- consumers migrados

### Validações Executadas

- comando
- `PASS` / `FAIL`
- observacao curta

### Arquivos Alterados

- listar arquivos criados e modificados

### Decisao Final

- `BLOCO 3 AVANCOU ESTRUTURALMENTE`
- ou `BLOCO 3 SEM AVANCO ESTRUTURAL SUFICIENTE`
