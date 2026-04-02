# Phase 5 Open Issues

**Data atualizacao**: 2026-03-25
**Fase**: 5 - Atendimento e Episodio Clinico
**Status**: ABERTA para Fase 6

---

## Pendencias Conhecidas

### Persistencia

| Pendencia                                    | Prioridade | Impacto                 |
| -------------------------------------------- | ---------- | ----------------------- |
| Persistir agenda, fila, triagem e encounters | Alta       | Sobrevivencia a restart |
| Historico de timeline persistido             | Media      | Auditoria operacional   |

### Operacao

| Pendencia                              | Prioridade | Dependencias |
| -------------------------------------- | ---------- | ------------ |
| Cancelamento/remarcacao de agendamento | Media      | Fase 5+      |
| No-show de paciente                    | Media      | Fase 5+      |
| Checklist de pendencias no fechamento  | Media      | Fase 6+      |
| Metricas de fila e tempo de espera     | Baixa      | Fase 5+      |

### Clinico

| Pendencia                           | Prioridade | Dependencias |
| ----------------------------------- | ---------- | ------------ |
| Sinais vitais detalhados na triagem | Baixa      | Fase 6+      |
| Protocolos assistenciais            | Baixa      | Fase 7+      |

---

## Riscos Identificados

### Risco 1: Fila em Memoria

**Probabilidade**: Media
**Impacto**: medio
**Descricao**: Fila atual e propositalmente simples e em memoria; nao cobre concorrencia distribuida
**Mitigacao**: Evoluir para armazenamento persistente quando necessario

### Risco 2: Triagem Inicial Simples

**Probabilidade**: Baixa
**Impacto**: medio
**Descricao**: Triagem atual e estruturada mas ainda nao trata sinais vitais detalhados ou protocolos
**Mitigacao**: Campos evoluem conforme maturacao do fluxo clinico

---

## Pontos a Resolver na Fase 6

### Prontuario Clinico

- [ ] Conectar encounter ao prontuario longitudinal
- [ ] Criar entries clinicas vinculadas ao encounter
- [ ] Manter autoria e rastreabilidade
- [ ] Anexar documentos/imagens

### Continuidade

- [ ] Separation of concerns: atendimento != prontuario
- [ ] Encounter como referencia para prontuario
- [ ] Permissoes de Fase 3-5 como base

---

## Checklist de Entrada Fase 6

- [ ] Ler `docs/240-phase-6-progress.md`
- [ ] Ler `docs/120-audit-model.md`
- [ ] Verificar que nao ha divida da Fase 5
- [ ] Confirmar que encounter funciona

---

## Dependencias

A Fase 6 depende de:

- Fase 5 completa (OK)
- Encounter funcional (OK)
- Cadastro mestre da Fase 4 (OK)
- Identity da Fase 3 (OK)

---

## Checklist de Saida Fase 5

### Modulos

- [x] encounters com lifecycle completo
- [x] scheduling com agenda e fila
- [x] triage inicial separada
- [x] timeline operacional

### Integracao

- [x] apps/api com rotas de atendimento
- [x] apps/web com formularios
- [x] timeline operacional

### Permissions

- [x] scheduling.read/manage
- [x] encounters.read/manage
- [x] triage.read/manage

### Auditoria

- [x] Eventos de timeline

### Validacoes

- [x] typecheck passando
- [x] build passando
- [x] testes passando (8/8)

### Documentacao

- [x] 230-phase-5-progress.md atualizado
- [x] 231-phase-5-validation.md atualizado
- [x] 232-phase-5-open-issues.md atualizado
- [x] phase-5-partial-01-checklist.md criado
- [x] phase-5-partial-02-checklist.md criado
- [x] phase-5-partial-03-checklist.md criado
