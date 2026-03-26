# ADR-007 Frontend Canonico do V2 - Consolidação da Decisão

**Data**: 2026-03-26
**Status**: Aprovado
**Relacionado**: ADR-003, ENT-005, AUD-009-01
**Contexto**: Fechamento de ENT-005 - definição explícita e verificável do frontend oficial do V2

---

## Decisão

**`apps/web` (`@cvg-his-v2/web`) e o frontend canonico oficial do V2.**

Nenhum outro app de frontend sera considerado trilha ativa para evolucao do produto.

---

## Estado Real do Repositorio

### `apps/web` — Canonico (ativo)

| Atributo         | Estado                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Pacote           | `@cvg-his-v2/web`                                                                        |
| Framework        | Node.js HTTP server com HTML inline                                                      |
| Dependencias     | `@cvg-his-v2/shared-auth-sdk`, `@cvg-his-v2/shared-config`, `@cvg-his-v2/shared-logging` |
| Build            | Compila e passa typecheck                                                                |
| Alvo arquitetura | Alinhado com `apps/*` + `packages/modules/*` + `packages/shared/*`                       |
| Testes           | Sem automacao frontend dedicada ainda; `ENT-007` devera adicionar smoke e2e oficial      |

### `apps/his-web` — Legado (arquivado)

| Atributo         | Estado                                                        |
| ---------------- | ------------------------------------------------------------- |
| Pacote           | `@cvg-his/his-web`                                            |
| Framework        | Next.js 14 + React 18 + TanStack Query                        |
| Dependencias     | `@cvg-his/contracts`, `@cvg-his/rbac` (pacotes legados)       |
| Build            | Excluido do gate oficial (`@cvg-his-v2/*` filter)             |
| Alvo arquitetura | Desalinhado - usa namespace `@cvg-his/*` legado               |
| Funcionalidade   | Dashboard, login, CRUD completo, medicação, handover, billing |
| Dockerfile       | Presente mas referenciando stack legado                       |

---

## Justificativa

### 1. Aderencia a arquitetura alvo

`apps/web` usa exclusivamente pacotes `@cvg-his-v2/*` e segue o padrao `apps/*` -> `packages/modules/*` -> `packages/shared/*` definido em ADR-003 e `112-target-architecture.md`.

`apps/his-web` depende de `@cvg-his/contracts` e `@cvg-his/rbac`, pacotes do namespace legado que nao fazem parte da arquitetura V2.

### 2. Proximidade do backend canonico

`apps/web` consome `@cvg-his-v2/shared-auth-sdk` e conversa diretamente com a API V2 (`apps/api`). Nao ha camada de adaptacao ou proxy intermedio.

`apps/his-web` tem contratos proprio (`openapi-lite.ts`) e tipos definidos localmente, criando risco de drift com a API V2.

### 3. Risco de manutencao

Manter `apps/his-web` como trilha ativa significaria:

- manter pacotes legados (`@cvg-his/contracts`, `@cvg-his/rbac`) indefinidamente
- aceitar dualidade de contratos de API
- impedir consolidacao da arquitetura modular

### 4. Coerencia com roadmap

O plano enterprise (`902-enterprise-acceleration-plan.md`) define ENT-005 como fechamento da trilha oficial e ENT-006 como consolidacao de fluxos. A decisao de que `apps/web` e o canonico ja esta documentada e precisa apenas de formalizacao.

---

## Classificacao das Trilhas

| App            | Classificacao           | Justificativa                                                                                                                                                    |
| -------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`     | **Canonico**            | Trilha oficial de frontend do V2. Evolui com a arquitetura modular.                                                                                              |
| `apps/his-web` | **Legado (referência)** | Arquivado. Mantido apenas como referencia de implementacao (componentes, hooks, paginas) para migracao futura para `apps/web`. Nao recebe desenvolvimento ativo. |

---

## Estrategia para `apps/his-web`

1. **Nao deletar** - contem implementacao util como referencia para ENT-006
2. **Nao evoluir** - nenhum desenvolvimento novo neste diretorio
3. **Referencia** - componentes, hooks e padroes de UX podem ser adaptados para `apps/web` em ENT-006
4. **Congelado** - excluido do pipeline oficial (ja acontece via filtro `@cvg-his-v2/*`)

---

## Impacto em ENT-006

A consolidacao de fluxos (ENT-006) devera:

- ~~construir UI real em `apps/web` (ou migrar `apps/web` para framework mais adequado)~~
- ~~adaptar componentes e padroes visuais de `apps/his-web` como referencia~~
- ~~conectar `apps/web` diretamente a API V2 usando contratos `@cvg-his-v2/shared-contracts`~~

**ENT-006 concluido**: `apps/web` reestruturado de monolito de 830 linhas para server, styles, api-client e paginas dedicadas com SPA hash routing. Decisao tecnica: evoluir base atual (Node.js HTTP + HTML inline) ao inves de adicionar framework UI. Risco zero de pipeline, velocidade maxima de implementacao. Framework pode ser introduzido em iteracao futura sem prejuizo.

### Estrutura final de `apps/web`

```
apps/web/src/
  index.ts              - Servidor HTTP + roteador de paginas
  styles.ts             - CSS base compartilhado
  pages/
    api-client.ts       - Script client-side para comunicacao com API
    login.ts            - Pagina de login com autenticacao
    dashboard.ts        - Dashboard com KPIs e atendimentos recentes
    owners.ts           - CRUD de tutores com busca e detalhe
    patients.ts         - CRUD de pacientes e vinculos owner-patient
    encounters.ts       - Fila, atendimentos e triagem (3 abas)
    medical-records.ts  - Prontuario com entries, timeline e anexos (3 abas)
```

---

## Implementacao

1. Manter ADR-003 como decisao original
2. Esta ADR (ADR-007) formaliza o fechamento operacional da decisao
3. Atualizar docs, backlog e onboarding para remover ambiguidade
4. Marcar ENT-005 como concluido
