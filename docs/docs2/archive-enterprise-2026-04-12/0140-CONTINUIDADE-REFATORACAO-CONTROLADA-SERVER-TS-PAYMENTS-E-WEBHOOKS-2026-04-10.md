# 0140 — CONTINUIDADE REFATORACAO CONTROLADA SERVER.TS PAYMENTS E WEBHOOKS — 2026-04-10

## Objetivo

Dar continuidade ao fatiamento controlado de `apps/api/src/server.ts` usando o padrao ja validado em `apps/api/src/routes/health-routes.ts`, agora priorizando os dominios de `payments` e `webhooks`.

O objetivo desta rodada nao e reescrever o servidor inteiro. O objetivo e extrair, com seguranca, os blocos de roteamento mais coesos e de maior valor operacional, preservando:

- comportamento atual do runtime
- coerencia com OpenAPI
- testes existentes
- estabilidade do BLOCO 3

## Estado de Entrada

- `BLOCO 1 APROVADO`
- `BLOCO 2 APROVADO`
- `BLOCO 3 EM EXECUCAO`
- `PLANO 0133 EXECUTADO COM AVANCO REAL`
- primeiro corte de `server.ts` ja materializado em `apps/api/src/routes/health-routes.ts`
- `apps/api/src/server.ts` permanece grande e concentrando responsabilidades demais

## Fonte de Verdade Obrigatoria

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0133-PLANO-CORRECAO-RELATORIO-AVALIACAO-CONSTRUCAO-2026-04-10.md`
- `docs/Enterprise/0134-EXECUCAO-TECNICA-ITENS-VIVOS-PLANO-0133-2026-04-10.md`
- `docs/Enterprise/0137-PLANO-REFATORACAO-CONTROLADA-SERVER-TS-PAYMENTS-E-WEBHOOKS-2026-04-10.md`

## Escopo Permitido

- extrair rotas e handlers de `payments`
- extrair rotas e handlers de `webhooks`
- criar arquivos dedicados em `apps/api/src/routes/`
- ajustar imports e wiring de `server.ts`
- manter contratos, auditoria e publicacao de eventos existentes
- atualizar docs executivos afetados

## Escopo Proibido

- nao refatorar o servidor inteiro nesta rodada
- nao alterar comportamento funcional intencionalmente
- nao reabrir frentes de frontend, PIX, billing ou event-bus fora do necessario para manter coerencia
- nao mover dominios extras alem de `payments` e `webhooks`

## Ordem Obrigatoria de Execucao

### F1. Mapear o corte atual

- localizar no `server.ts` os blocos de `payments`
- localizar no `server.ts` os blocos de `webhooks`
- identificar dependencias compartilhadas que precisarao ser injetadas nos novos modulos
- definir a menor interface de contexto necessaria para extracao

### F2. Extrair `payments`

- criar um arquivo dedicado em `apps/api/src/routes/` para o dominio de `payments`
- mover somente os handlers coesos desse dominio
- preservar validacoes, audit log, event bus e response shapes
- ligar o novo modulo no fluxo principal do `server.ts`

### F3. Extrair `webhooks`

- criar um arquivo dedicado em `apps/api/src/routes/` para o dominio de `webhooks`
- mover somente os handlers coesos desse dominio
- preservar controles de deliveries, retest e contratos existentes
- ligar o novo modulo no fluxo principal do `server.ts`

### F4. Revalidar coerencia

- garantir que `server.ts` permaneça funcional apos os dois cortes
- validar typecheck e build da API
- validar testes relevantes de `module-webhooks`, `module-pix` e `module-billing` se tocados indiretamente
- validar que OpenAPI/runtime nao sofreram regressao de comportamento

### F5. Atualizar documentacao

- atualizar `0100-EXECUTION-TRACKER.md`
- atualizar `0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md` se o estado estrutural do servidor mudar materialmente
- registrar que o padrao de extracao modular foi ampliado de `health` para `payments` e `webhooks`

## Criterio de Aceite

So considerar esta rodada concluida se houver evidencia objetiva de:

- `payments` extraido para modulo proprio
- `webhooks` extraido para modulo proprio
- `apps/api/src/server.ts` menor e com menos responsabilidades diretas
- `pnpm --filter @cvg-his-v2/api typecheck` PASS
- `pnpm --filter @cvg-his-v2/api build` PASS
- testes relevantes PASS

## Validacoes Minimas Obrigatorias

- `pnpm --filter @cvg-his-v2/api typecheck`
- `pnpm --filter @cvg-his-v2/api build`
- `pnpm --filter @cvg-his-v2/module-webhooks test`
- `pnpm --filter @cvg-his-v2/module-pix test`
- `pnpm --filter @cvg-his-v2/module-billing test`

## Entregaveis Obrigatorios

- novos modulos de rotas em `apps/api/src/routes/`
- `server.ts` simplificado no recorte de `payments` e `webhooks`
- docs executivos atualizados
- relatorio final com arquivos alterados, comandos executados e resultados reais

## Formato de Saida Obrigatorio

### Resumo Executivo

- 3 a 6 linhas
- decisao final:
  - `REFATORACAO CONTROLADA DO SERVER AVANCOU`
  - ou `REFATORACAO CONTROLADA DO SERVER SEM AVANCO SUFICIENTE`

### Blocos Extraidos

- `payments`: `EXTRAIDO` ou `NAO EXTRAIDO`
- `webhooks`: `EXTRAIDO` ou `NAO EXTRAIDO`

### Validações Executadas

- comando
- `PASS` / `FAIL`
- observacao curta

### Arquivos Alterados

- listar arquivos criados e modificados

### Decisao Final

- `REFATORACAO CONTROLADA DO SERVER AVANCOU`
- ou `REFATORACAO CONTROLADA DO SERVER SEM AVANCO SUFICIENTE`
