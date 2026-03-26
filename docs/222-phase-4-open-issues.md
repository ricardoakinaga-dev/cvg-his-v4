# Phase 4 Open Issues

**Data atualizacao**: 2026-03-25
**Fase**: 4 - Cadastro Mestre
**Status**: ABERTA para Fase 5

---

## Pendencias Conhecidas

### Persistencia

| Pendencia                                | Prioridade | Impacto                                 |
| ---------------------------------------- | ---------- | --------------------------------------- |
| Substituir memoria por persistencia real | Alta       | Escalabilidade, sobrevivencia a restart |
| Historico detalhado de alteracoes        | Media      | Rastreabilidade de mudancas             |

### Qualidade de Dados

| Pendencia                             | Prioridade | Dependencias |
| ------------------------------------- | ---------- | ------------ |
| Normalizacao de documentos (CPF/CNPJ) | Media      | Fase 4+      |
| Deduplicacao assistida                | Media      | Fase 4+      |
| Fluxo formal de conciliacao           | Media      | Fase 4+      |
| Validacao de contato                  | Baixa      | Fase 4+      |

### UI/UX

| Pendencia                            | Prioridade | Dependencias |
| ------------------------------------ | ---------- | ------------ |
| Edicao assistida de cadastros        | Baixa      | Fase 4+      |
| Listagens mais orientadas a operacao | Baixa      | Fase 4+      |

---

## Riscos Identificados

### Risco 1: Persistencia em Memoria

**Probabilidade**: Media
**Impacto**: Alto
**Descricao**: Owners, patients e links em memoria nao sobrevivem a restart e nao suportam concorrencia
**Mitigacao**: Documentar como limitada ate implementacao de banco real

### Risco 2: Identificacao de Duplicidade Simplificada

**Probabilidade**: Media
**Impacto**: Baixo
**Descricao**: Duplicidade detectada por heuristica simples, pode ter falsos positivos/negativos
**Mitigacao**: Conflito inicial para revisao manual, merge futuro formalizado

### Risco 3: Dados Cadastrais Basicos

**Probabilidade**: Baixa
**Impacto**: Baixo
**Descricao**: birthDateApproximate e baseWeightKg capturados sem semantica clinica aprofundada
**Mitigacao**: Campos evoluem conforme necessidade das fases de atendimento

---

## Pontos a Resolver na Fase 5

### Atendimento e Episodio Clinico

- [ ] Conectar cadastro mestre a episodios operacionais
- [ ] Manter separation of concerns: cadastro != atendimento
- [ ] Integrar scheduling com owners/patients existentes
- [ ] Reaproveitar permissions de cadastro para abertura de encounter

### Continuidade

- [ ] Autor do encounter derivado do usuario autenticado
- [ ] Vinculo encounter -> patient -> owner mantem rastreabilidade
- [ ] Permissoes de Fase 3 e 4 como camada obrigatoria

---

## Checklist de Entrada Fase 5

- [ ] Ler `docs/230-phase-5-progress.md`
- [ ] Ler `docs/104-clinical-workflows.md`
- [ ] Ler `docs/105-operational-workflows.md`
- [ ] Verificar que nao ha divida da Fase 4
- [ ] Confirmar que owners/patients funcionam

---

## Dependencias

A Fase 5 depende de:

- Fase 4 completa (OK)
- Cadastro mestre funcional (OK)
- Identity da Fase 3 (OK)

---

## Checklist de Saida Fase 4

### Modulos

- [x] owners com CRUD completo
- [x] patients com CRUD completo
- [x] vinculo tutor-paciente

### Integracao

- [x] apps/api com rotas de cadastro
- [x] apps/web com formularios
- [x] busca agregada

### Permissions

- [x] owners.read/manage
- [x] patients.read/manage

### Auditoria

- [x] create/update de owners
- [x] create/update de patients
- [x] criacao de vinculos

### Validacoes

- [x] typecheck passando
- [x] build passando
- [x] testes passando (8/8)

### Documentacao

- [x] 220-phase-4-progress.md atualizado
- [x] 221-phase-4-validation.md atualizado
- [x] 222-phase-4-open-issues.md atualizado
- [x] phase-4-partial-01-checklist.md criado
- [x] phase-4-partial-02-checklist.md criado
- [x] phase-4-partial-03-checklist.md criado
