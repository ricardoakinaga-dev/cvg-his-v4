# Phase 2 Open Issues

**Data atualizacao**: 2026-03-25
**Fase**: 2 - Fundacao do Monorepo
**Status**: ABERTA para Fase 3

---

## Pendencias Conhecidas

### Decisoes para Fases Futuras

| Pendencia                               | Prioridade | Impacto                   |
| --------------------------------------- | ---------- | ------------------------- |
| HTTP nativo vs framework na API         | Media      | Arquitetura de transporte |
| Estrategia de fila real do worker       | Media      | Processamento assincrono  |
| Particionamento de database             | Baixa      | Persistencia              |
| Turbo como runner principal ou baseline | Baixa      | Pipeline CI/CD            |

### Infraestrutura

| Pendencia                                 | Prioridade | Dependencias |
| ----------------------------------------- | ---------- | ------------ |
| Docker compose para desenvolvimento local | Media      | Fase 3+      |
| Configuracao de banco de dados            | Media      | Fase 3+      |
| Setup de observabilidade                  | Baixa      | Fase 4+      |

---

## Riscos Identificados

### Risco 1: Derivacao Arquitetural

**Probabilidade**: Media
**Impacto**: Alto
**Mitigacao**: Manter `/docs` como fonte de verdade, verificar 101-bounded-contexts.md antes de cada fase

### Risco 2: Shared Packages Acumulando Regra de Negocio

**Probabilidade**: Baixa
**Impacto**: Medio
**Mitigacao**: Documentacao clara de responsabilidade em cada package.json

### Risco 3: Mistura com Apps Legados

**Probabilidade**: Baixa
**Impacto**: Alto
**Mitigacao**: Limites claros em 101-bounded-contexts.md, apps legados em `apps/his-*`

### Risco 4: Complexidade Prematura

**Probabilidade**: Media
**Impacto**: Medio
**Mitigacao**: Manter HTTP nativo ate que framework seja necessario

---

## Pontos a Resolver na Fase 3

### Core de Identidade, Acesso e Governanca

- [ ] Wiring de `auth`, `users`, `staff`, `access-control` e `audit`
- [ ] Definicao de contracts internos para eventos e policies
- [ ] Adapter de persistencia in-memory (evitando complexidade de DB prematura)
- [ ] Session management stateful com revogacao
- [ ] Policy enforcement centralizado no backend
- [ ] Audit trail append-only

### Checklist de Entrada Fase 3

- [ ] Ler `docs/210-phase-3-progress.md`
- [ ] Ler `docs/108-authentication-strategy.md`
- [ ] Ler `docs/109-authorization-strategy.md`
- [ ] Ler `docs/107-roles-and-permissions.md`
- [ ] Ler `docs/110-audit-trail-strategy.md`
- [ ] Verificar que nao ha divida da Fase 2

---

## Dependencias

A Fase 3 depende de:

- Fase 2 completa (OK)
- Documentacao de seguranca em `/docs` (OK)
- Workspace funcional (OK)

---

## Proximos Passos Apos Fase 2

1. Executar Fase 3 - Core de Identidade, Acesso e Governanca
2. Implementar modulos: auth, users, staff, access-control, audit
3. Criar shared contracts para sessao e policies
4. Adicionar seed data para validacao local

---

## Checklist de Saida Fase 2

### Baseline Tecnico

- [x] package.json com scripts
- [x] turbo.json com tasks
- [x] tsconfig.base.json configurado
- [x] pnpm-workspace.yaml com includes

### Shared Foundation

- [x] 9 packages implementados
- [x] Uso real confirmado em modulos
- [x] Estrutura padrao seguida

### Apps

- [x] apps/api com health endpoint
- [x] apps/web com skeleton
- [x] apps/worker com runner

### Infra

- [x] infra/docker/README.md
- [x] infra/db/README.md
- [x] infra/observability/README.md
- [x] infra/scripts/bootstrap-local.mjs
- [x] infra/scripts/check-health.mjs

### Validacoes

- [x] typecheck passando
- [x] build passando
- [x] testes passando (8/8)

### Documentacao

- [x] 200-phase-2-progress.md atualizado
- [x] 201-phase-2-validation.md atualizado
- [x] 202-phase-2-open-issues.md atualizado
- [x] phase-2-partial-01-checklist.md criado
- [x] phase-2-partial-02-checklist.md criado
- [x] phase-2-partial-03-checklist.md criado
