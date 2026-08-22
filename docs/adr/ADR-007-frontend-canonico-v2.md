# ADR-007 Frontend Canonico do V2 - Consolidação da Decisão

**Data**: 2026-03-26
**Status**: Aprovado; supersede a decisao de frontend do ADR-003
**Relacionado**: ADR-003, ENT-005, AUD-009-01
**Contexto**: Corrigido conflito entre ADR e docs vivas - `apps/spa` e o frontend canonico, nao `apps/web`

---

## Decisão

**`apps/spa` (`@cvg-his-v2/spa`) e o frontend canonico oficial do V2.**

Nenhum outro app de frontend sera considerado trilha ativa para evolucao do produto.

---

## Estado Real do Repositorio

### `apps/spa` — Canonico (ativo)

| Atributo         | Estado                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Pacote           | `@cvg-his-v2/spa`                                                                       |
| Framework        | Vue 3 + Vite + Vue Router (path routing)                                                 |
| Dependencias     | `@cvg-his-v2/shared-*`, design system via `@cvg-his-v2/design-system`                 |
| Build            | Compila e passa typecheck; cobertura de testes em expansao                              |
| Alvo arquitetura | Alinhado com `apps/*` + `packages/modules/*` + `packages/shared/*`                       |
| Funcionalidade   | Shell premium, navegacao por dominio, autenticacao, todos os modulos operacionais         |
| Testes          | Suite de testes unitarios e integracao em expansao (Sprint 1-2)                        |

### `apps/web` — Removido da trilha ativa

| Atributo         | Estado                                                        |
| ---------------- | ------------------------------------------------------------- |
| Pacote           | Nao presente no repositorio atual                             |
| Framework        | Nao aplicavel                                                  |
| Dependencias     | Nao aplicavel                                                  |
| Build            | Nao participa do build                                        |
| Alvo arquitetura | Referencia historica apenas                                    |
| Funcionalidade   | Nao aplicavel                                                  |
| Status           | **Removido** - `apps/spa` e a unica trilha de frontend ativa  |

---

## Justificativa

### 1. Aderencia a arquitetura alvo

`apps/spa` usa exclusivamente pacotes `@cvg-his-v2/*` e segue o padrao `apps/*` -> `packages/modules/*` -> `packages/shared/*` definido em ADR-003 e `112-target-architecture.md`.

`apps/web` foi congelado como referencia historica durante a janela de transicao `web -> spa`.

### 2. Shell premium e experiencia enterprise

`apps/spa` entrega:
- navegacao por dominio com shell premium
- layout responsivo com componentes Vue do design system
- autenticacao baseada na API V2
- navegacao assistencial, administrativa e operacional completa
- command palette, favoritos, recentes

### 3. Coerencia com roadmap

O plano enterprise define `apps/spa` como frontend oficial desde Sprint 1 do plano de implementacao premium enterprise (0194-PLANO-DE-SPRINTS-IMPLEMENTACAO-PREMIUM-ENTERPRISE.md).

---

## Classificacao das Trilhas

| App            | Classificacao           | Justificativa                                                                                                                                                    |
| -------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/spa`     | **Canonico**            | Trilha oficial de frontend do V2. Evolui com a arquitetura modular e recebe premiumizacao.                                                                        |
| `apps/web`     | **Legado (congelado)**  | Frontend transitorio congelado. Mantido apenas como referencia historica. Nao recebe desenvolvimento ativo.                                                   |

---

## Estrategia para `apps/web`

1. **Nao deletar** - contem implementacao util como referencia historica
2. **Nao evoluir** - nenhum desenvolvimento novo neste diretorio
3. **Congelado** - excluido do pipeline oficial de features (filtro `@cvg-his-v2/*` ainda compila por compatibilidade)
4. **Manutencao residual** - apenas correcoes criticas se necessario

---

## Implementacao

1. `apps/spa` e o frontend canonico conforme documentado em `114-frontend-architecture.md`
2. `apps/web` mantido como legado congelado conforme `apps/web/README.md`
3. Docs e backlog atualizados para remover ambiguidade
4. ADR-007 reflete decisao corrigida
