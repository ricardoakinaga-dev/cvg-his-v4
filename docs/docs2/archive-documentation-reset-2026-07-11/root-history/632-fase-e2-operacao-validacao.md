# 632 — Fase E2: Operacao e Regressao Guiada

**Data:** 2026-04-02
**Status:** Concluida
**Escopo:** persistencia da fila de scheduling, validacao objetiva do update de triage, regressao web ampliada e cobertura operacional HTTP da API

## 1. O que foi implementado

### 1. Persistir a fila de scheduling

- `SchedulingService` passou a reidratar queue entries do repositório.
- `SchedulingService` passou a oferecer leitura filtrada por `accountId` para appointments e queue.
- A API passou a listar `appointments` e `queue` já filtrando por conta do principal.
- `syncQueueWithEncounter` passou a ser aguardado na API para não deixar persistência de fila em background sem coordenação.
- A migration oficial ganhou a tabela `scheduling_queue_entries`.

### 2. Adicionar update controlado de triage

- O código já possuía `updateTriage` e `PATCH /triage/:id`; nesta fase o fluxo foi validado e protegido com cobertura HTTP dedicada.
- `apps/api/src/server.test.ts` agora cobre criação e update de triagem via API e confirma reflexo no status do encounter.
- A documentação viva foi corrigida para parar de tratar triage como imutável.

### 3. Expandir a automação web para regressão funcional guiada

- `apps/web/src/web.test.ts` foi ampliado para cobrir:
  - bootstrap HTML
  - servidor web respondendo em rotas principais
  - labels funcionais de rotas críticas
  - navegação administrativa principal
  - comportamento controlado do proxy `/api/*` quando o backend está indisponível

### 4. Fechar próximo bloco de cobertura operacional fora de E1

- `apps/api/src/server.test.ts` foi criado para cobrir endpoints HTTP reais de operação:
  - lifecycle da fila (`/queue/check-in`, `/queue`, `/queue/:id/call`)
  - update controlado de triage (`PATCH /triage/:id`)
- `apps/api/src/db-persistence.test.ts` ganhou cobertura de persistência da fila através de restart lógico do runtime.

## 2. Arquivos alterados

- `packages/modules/scheduling/src/index.ts`
- `packages/db/src/schema/index.ts`
- `packages/db/src/schema/scheduling_queue_entries.ts`
- `packages/db/migrations/0000_vengeful_pet_avengers.sql`
- `tests/integration/database/migration.test.ts`
- `tests/integration/foundational.test.ts`
- `apps/api/src/server.ts`
- `apps/api/src/server.test.ts`
- `apps/api/src/db-persistence.test.ts`
- `apps/api/package.json`
- `apps/web/src/web.test.ts`
- `docs/460-qualidade-testes-e-gates.md`
- `docs/504-modulo-scheduling.md`
- `docs/507-modulo-triage.md`
- `docs/560-pacote-final-prontidao-publicacao.md`
- `docs/592-veredito-global-operacional.md`
- `docs/593-backlog-residual-pos-fechamento-global.md`
- `docs/README.md`
- `docs/632-fase-e2-operacao-validacao.md`

## 3. Testes executados

- `pnpm --filter @cvg-his-v2/module-scheduling test`
- `pnpm --filter @cvg-his-v2/web test`
- `pnpm --filter @cvg-his-v2/api build`
- `pnpm --filter @cvg-his-v2/api test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`

## 4. Resultados

- `module-scheduling` — verde
- `apps/web` — verde com 5 testes de regressao guiada
- `apps/api` — verde com cobertura HTTP adicional
- `pnpm typecheck` — verde
- `pnpm build` — verde
- `pnpm test` — verde

## 5. Estado final dos itens desta fase

- **Fila de scheduling persistida:** fechado
- **Update controlado de triage:** fechado no codigo e agora protegido por teste HTTP
- **Automacao web expandida:** fechado no nivel de regressao guiada minima sustentavel
- **Bloco adicional de cobertura operacional:** fechado via testes HTTP/API e persistencia

## 6. Impacto qualitativo

- remove o principal risco operacional de restart no fluxo de recepcao/fila
- torna o update de triage evidenciado por teste de API, nao apenas por leitura de codigo
- melhora a seguranca de release do web e da API sem inflar cobertura artificial
- aumenta a coerencia entre codigo, migration, runtime, API e docs

## 7. Bloqueios remanescentes

- scheduling ainda sem validacao de conflito de horario
- triage ainda sem versionamento/diff clinico dedicado
- regressao web ainda nao e visual nem ponta a ponta profunda
- PDF server-side ainda depende de HTML inline
- observabilidade ainda sem stack externa

## 8. Proximo passo natural

1. Validacao de conflito de horario em `scheduling`
2. Versionamento clinico/diff de `triage`
3. Regressao web guiada mais profunda em fluxos assistenciais e administrativos
4. Geracao PDF dedicada e nao dependente de HTML inline
