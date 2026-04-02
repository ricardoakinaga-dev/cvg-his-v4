# Phase 3 Open Issues

**Data atualizacao**: 2026-03-25
**Fase**: 3 - Identidade, Acesso e Governanca
**Status**: ABERTA para Fase 4

---

## Pendencias Conhecidas

### Infraestrutura

| Pendencia                                                             | Prioridade | Impacto        |
| --------------------------------------------------------------------- | ---------- | -------------- |
| Substituir armazenamento em memoria por persistencia real             | Alta       | Escalabilidade |
| Expandir catalogo de roles/permissions para perfis clinicos completos | Media      | Cobertura      |
| Decidir estrategia de cookie vs bearer token                          | Media      | Seguranca      |
| Fechar politica de expiracao em ambiente distribuido                  | Media      | Seguranca      |

### Funcional

| Pendencia                                  | Prioridade | Dependencias |
| ------------------------------------------ | ---------- | ------------ |
| Endpoints de criacao/manutencao para staff | Baixa      | Fase 4+      |
| Auditoria com exportacao e retencao        | Baixa      | Fase 4+      |
| Device binding para tokens                 | Baixa      | Fase 6+      |

---

## Riscos Identificados

### Risco 1: Sessao em Memoria

**Probabilidade**: Media
**Impacto**: Medio
**Descricao**: Sessoes em memoria nao sobrevivem a restart e nao escalam horizontalmente
**Mitigacao**: Documentar como limitada ate Fase com banco real

### Risco 2: Sem Protecoes Complementares de Token

**Probabilidade**: Baixa
**Impacto**: Medio
**Descricao**: Refresh token funciona como base mas carece de device binding, MFA
**Mitigacao**: Roadmap inclui MFA para fases futuras

### Risco 3: Permissions Incompletas

**Probabilidade**: Media
**Impacto**: Baixo
**Descricao**: Catalogo cobre core identitario mas precisa expandir para dominio clinico
**Mitigacao**: Adicionar permissions na Fase 4+ conforme necessidade

### Risco 4: Auditoria Nao Persistida

**Probabilidade**: Media
**Impacto**: Alto
**Descricao**: Auditoria em memoria pode ser perdida em restart
**Mitigacao**: Implementar persistencia na Fase 4+

---

## Pontos a Resolver na Fase 4

### Cadastro Mestre

- [ ] Integrar owners/patients com base de identidade existente
- [ ] Reaproveitar enforcement de access-control para novos recursos
- [ ] Manter autoria de cadastro vinculada a user/staff
- [ ] Auditoria de operacoes cadastrais

### Persistencia

- [ ] Decidir se persiste em memoria ou DB real
- [ ] Implementar seed data para validacao
- [ ] Manter runtime testavel sem dependencia de banco

---

## Checklist de Entrada Fase 4

- [ ] Ler `docs/220-phase-4-progress.md`
- [ ] Ler `docs/100-domain-map.md` ( Owners e Patients )
- [ ] Ler `docs/119-aggregate-design.md` ( Owner Aggregate, Patient Aggregate )
- [ ] Verificar que nao ha divida da Fase 3
- [ ] Confirmar que auth/access-control/audit funcionam

---

## Dependencias

A Fase 4 depende de:

- Fase 3 completa (OK)
- Base de identidade em funcionamento (OK)
- Enforcement backend ativo (OK)

---

## Proximos Passos Apos Fase 3

1. Executar Fase 4 - Cadastro Mestre
2. Implementar modulos: owners, patients
3. Criar vinculo tutor-paciente
4. Integrar com identity existente

---

## Checklist de Saida Fase 3

### Modulos

- [x] auth com login, refresh, logout
- [x] users com CRUD basico
- [x] staff com vinculo institucional
- [x] access-control com enforcement
- [x] audit append-only

### Integracao

- [x] apps/api com rotas de auth
- [x] apps/web com fluxo de login
- [x] Policy enforcement centralizado

### Validacoes

- [x] typecheck passando
- [x] build passando
- [x] testes passando (8/8)

### Documentacao

- [x] 210-phase-3-progress.md atualizado
- [x] 211-phase-3-validation.md atualizado
- [x] 212-phase-3-open-issues.md atualizado
- [x] phase-3-partial-01-checklist.md criado
- [x] phase-3-partial-02-checklist.md criado
- [x] phase-3-partial-03-checklist.md criado
