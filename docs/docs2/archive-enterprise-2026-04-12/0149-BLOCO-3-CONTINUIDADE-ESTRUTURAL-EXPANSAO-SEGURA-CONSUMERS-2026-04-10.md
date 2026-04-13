# 0149 — BLOCO 3 CONTINUIDADE ESTRUTURAL EXPANSAO SEGURA CONSUMERS — 2026-04-10

## Objetivo

Avancar o BLOCO 3 a partir do `consumer registry` ja estabelecido, preparando a expansao segura de novos dominios consumidores e endurecendo o padrao arquitetural para que novas entradas assincronas nao reintroduzam wiring manual ou acoplamento disperso.

## Estado de Entrada

- `consumer registry` ativo em `apps/api/src/consumers/index.ts`
- `payments`, `billing` e `webhooks` registrados por padrao central
- `runtime.ts` mais enxuto no registro de consumers
- backbone assincrono operacional, diagnosticavel e reprocessavel

## Problema Estrutural Atual

O registry existe, mas ainda esta no primeiro ciclo de adocao. O proximo ganho estrutural e transformar essa base em um padrao pronto para escalar:

- com contrato claro para novos consumers
- com testes mais explicitos do registry
- com onboarding previsivel de dominios futuros

## Fonte de Verdade Obrigatoria

- `docs/Enterprise/0100-EXECUTION-TRACKER.md`
- `docs/Enterprise/0117-EVENT-BUS.md`
- `docs/Enterprise/0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md`
- `docs/Enterprise/0146-SNAPSHOT-EXECUTIVO-PROGRAMA-POS-CONSUMERS-POR-DOMINIO-2026-04-10.md`
- `docs/Enterprise/0147-BLOCO-3-CONTINUIDADE-ESTRUTURAL-CONSUMER-REGISTRY-E-PADRONIZACAO-2026-04-10.md`
- `docs/Enterprise/0148-SNAPSHOT-EXECUTIVO-PROGRAMA-POS-CONSUMER-REGISTRY-2026-04-10.md`

## Escopo Permitido

- endurecer contrato minimo do registry
- adicionar testes do registry e/ou do padrao de registro
- migrar mais um dominio consumidor se houver candidato seguro e claro
- melhorar legibilidade do bootstrap de consumers
- atualizar docs executivos

## Escopo Proibido

- nao redesenhar o event bus
- nao trocar provedores externos reais nesta rodada
- nao reabrir frontend/backend gap
- nao iniciar refatoracao ampla do worker fora do escopo do registry

## Ordem Obrigatoria de Execucao

### F1. Revisar o contrato atual do registry

- verificar se o contrato `DomainConsumer` esta suficiente
- identificar lacunas de padronizacao, testes ou extensibilidade

### F2. Endurecer o padrao central

- melhorar a tipagem/contrato se necessario
- adicionar testes direcionados ao registry
- garantir que o registro de consumers seja previsivel e facil de expandir

### F3. Expandir com seguranca

- avaliar se existe mais um dominio consumidor pronto para entrar no registry
- se houver, migrar esse dominio
- se nao houver, fortalecer apenas a infraestrutura do padrao

### F4. Revalidar e documentar

- validar `api`, `worker` e modulos centrais afetados
- atualizar `0100-EXECUTION-TRACKER.md`
- atualizar `0117-EVENT-BUS.md`
- atualizar `0119-PLANO-MESTRE-EXECUCAO-INTEGRAL-BLOCO-3-2026-04-10.md` se o padrao estrutural mudar materialmente

## Criterio de Aceite

So considerar esta rodada concluida se houver evidencia objetiva de:

- registry mais forte ou mais bem testado
- onboarding de consumers mais previsivel
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

## Entregaveis Obrigatorios

- registry endurecido ou ampliado
- testes do padrao central
- possivel novo dominio migrado, se houver recorte seguro
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
- quais consumers foram afetados

### Validações Executadas

- comando
- `PASS` / `FAIL`
- observacao curta

### Arquivos Alterados

- listar arquivos criados e modificados

### Decisao Final

- `BLOCO 3 AVANCOU ESTRUTURALMENTE`
- ou `BLOCO 3 SEM AVANCO ESTRUTURAL SUFICIENTE`
