# 0327 - Plano de Acao dos Gaps Prioritarios - 2026-04-15

**Data UTC:** `2026-04-15`  
**Base:** `0326-RELATORIO-AUDITORIA-ATUAL-WORKSPACE-2026-04-15.md`  
**Objetivo:** transformar os gaps atuais em frentes executaveis com ordem clara e criterio de saida

---

## 1. Objetivo do plano

Este plano existe para:

- recuperar a confiabilidade do workspace;
- fechar os gaps que ainda bloqueiam release;
- aumentar a maturidade operacional do projeto sem inflar documento.

Regra central:

- **nao abrir novas frentes amplas enquanto `typecheck`, `build` e `coverage` nao voltarem a ficar confiaveis**.

---

## 2. Frentes de acao

### Frente A - Recuperacao imediata de gates

**Objetivo:** voltar o monorepo para estado defensavel de entrega

Itens:

1. corrigir a quebra de branded type em `packages/shared/types`
2. rerodar `pnpm typecheck`
3. rerodar `pnpm build`
4. rerodar `pnpm test:coverage`
5. registrar baseline nova de gates

Criterio de saida:

- `typecheck` verde
- `build` verde
- `coverage` verde no threshold atual

### Frente B - Higiene operacional do workspace

**Objetivo:** reduzir o risco de regressao e drift interno

Itens:

1. separar alteracoes de documento, infraestrutura e dominio em lotes coerentes
2. identificar arquivos novos nao rastreados que deveriam estar no fluxo oficial
3. reduzir volume de alteracoes simultaneas no worktree
4. definir baseline clara para proxima rodada de release

Criterio de saida:

- worktree menos ruidoso
- alteracoes agrupadas por responsabilidade
- menor risco de regressao cruzada

### Frente C - Reducao de risco estrutural da API

**Objetivo:** continuar a retirada de responsabilidade de `server.ts`

Itens:

1. extrair blocos administrativos restantes para `apps/api/src/routes/*`
2. mover bootstrap/residuos de wiring para helpers e runtime dedicados
3. proteger extracoes com testes focados
4. reduzir acoplamento entre rotas, auth e runtime

Criterio de saida:

- `server.ts` abaixo de `2500` linhas
- novos dominios operando fora do monolito
- cobertura minima nos recortes novos

### Frente D - Profundidade ERP administrativa

**Objetivo:** fechar o gap entre baseline funcional e profundidade enterprise

Itens:

1. aprofundar fiscal com operacoes de backoffice reais
2. ampliar financeiro administrativo e conciliacao
3. consolidar relatorios administrativos por dominio
4. endurecer contratos e persistencia das trilhas fiscais/financeiras

Criterio de saida:

- fiscal com operacao alem de leitura/catalogo
- financeiro administrativo com jornada mais completa
- menor dependencia de fluxos rasos ou parciais

### Frente E - Rollout seguro e runtime intermediario

**Objetivo:** usar melhor o que ja existe de feature flags, Redis e segredos

Itens:

1. expandir consumo real de feature flags em fluxos criticos
2. ampliar uso governado do runtime distribuido alem do auth limiter
3. consolidar provider de segredos no bootstrap de ambiente
4. instrumentar melhor fallback e decisao operacional

Criterio de saida:

- mais flags governando comportamento real
- rollout mais seguro por ambiente
- menor dependencia de toggle manual ad hoc

### Frente F - Validacao operacional de plataforma

**Objetivo:** transformar artefatos de plataforma em trilha usavel

Itens:

1. validar charts Helm em dry-run/template real
2. alinhar values por ambiente
3. definir smoke deploy e rollback minimo
4. conectar runbooks com o que o codigo realmente suporta

Criterio de saida:

- Helm deixa de ser apenas artefato no repositorio
- trilha de plataforma fica verificavel

---

## 3. Priorizacao

| Ordem | Frente | Prioridade | Motivo |
|---|---|---|---|
| 1 | Recuperacao de gates | `P0` | bloqueia release e invalida score operacional |
| 2 | Higiene do workspace | `P0` | reduz risco de regressao durante estabilizacao |
| 3 | Reducao de risco da API | `P1` | principal hotspot tecnico remanescente |
| 4 | Profundidade ERP administrativa | `P1` | principal gap funcional enterprise |
| 5 | Rollout seguro / runtime | `P1` | melhora seguranca de evolucao |
| 6 | Validacao de plataforma | `P2` | importante, mas nao deve preceder estabilizacao |

---

## 4. Indicadores de sucesso

| Indicador | Baseline atual | Meta |
|---|---:|---:|
| `pnpm typecheck` | fail | pass |
| `pnpm build` | fail | pass |
| `pnpm test:coverage` | fail | pass |
| `server.ts` | `3119` linhas | `<2500` |
| worktree | `205` entradas | reduzir materialmente |
| coverage global lines | `17.12%` | `>=20%` curto prazo |
| profundidade fiscal/financeira | parcial | jornada administrativa defensavel |

---

## 5. Regra de execucao

A ordem recomendada de trabalho e:

1. estabilizar gates
2. limpar o risco operacional do workspace
3. recortar a API
4. aprofundar ERP administrativo
5. expandir rollout/plataforma

Se a ordem for invertida, o risco e reabrir regressao antes de consolidar a base.

