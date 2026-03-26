# Phase 6 Open Issues

Data atualizacao: 2026-03-25

## Pendencias Conhecidas

### Persistencia

| Pendencia                                     | Prioridade | Impacto                  |
| --------------------------------------------- | ---------- | ------------------------ |
| Persistir prontuario e timeline em banco real | Alta       | Sobrevivencia, auditoria |
| Pipeline real de upload de anexos             | Media      | Funcionalidade completa  |

### Qualidade Clinica

| Pendencia                          | Prioridade | Dependencias |
| ---------------------------------- | ---------- | ------------ |
| Revisoes formais com versionamento | Media      | Fase 6+      |
| Assinatura forte de prontuario     | Media      | Fase 7+      |
| Sinais vitais estruturados         | Baixa      | Fase 7+      |
| Protocolos e templates             | Baixa      | Fase 7+      |

### UX

| Pendencia              | Prioridade | Dependencias |
| ---------------------- | ---------- | ------------ |
| Editor rico de entries | Baixa      | Fase 7+      |
| Visualizacao de anexos | Baixa      | Fase 7+      |

## Riscos Identificados

### Risco 1: Prontuario em Persistencia Transitoria

**Probabilidade**: Media
**Impacto**: Alto
**Descricao**: Prontuario atual e funcional, com repositories conectados via bootstrap/runtime e prova de re-instanciacao, mas ainda sem persistencia em banco real
**Mitigacao**: Evoluir a trilha transitoria para repositories de DB real quando a stack de persistencia definitiva for ativada

### Risco 2: Anexos Logicos

**Probabilidade**: Media
**Impacto**: Medio
**Descricao**: Anexos modelados logicamente, sem pipeline real de arquivo
**Mitigacao**: Modelar arquitetura de storage futuro

### Risco 3: Entries Textuais

**Probabilidade**: Baixa
**Impacto**: Medio
**Descricao**: Entries clinicas usam shape textual simples
**Mitigacao**: Adequado para base, evolui conforme maturacao

### Risco 4: Frontend Clinico Incompleto

**Probabilidade**: Media
**Impacto**: Baixo
**Descricao**: Frontend atual valida fluxo minimo, nao UX clinica final
**Mitigacao**: Evoluir UI conforme fluxo clinico amadurece

## Pontos a Resolver na Fase 7

### Operacao Assistencial Avancada

- [ ] Integrar inpatient, surgery e diagnostics ao prontuario
- [ ] Manter separation of concerns: especializacao != prontuario
- [ ] Eventos de continuidade clinica na timeline
- [ ] Permissoes para perfis de internacao e cirurgia

### Continuidade

- [ ] Vinculo encounter -> prontuario -> especialidades
- [ ] Permissoes de Fase 3-6 como base
- [ ] Auditoria de operacoes assistenciais

## Checklist de Entrada Fase 7

- [ ] Ler `docs/250-phase-7-progress.md`
- [ ] Ler `docs/106-patient-safety-rules.md`
- [ ] Verificar que nao ha divida da Fase 6
- [ ] Confirmar que prontuario funciona

## Dependencias

A Fase 7 depende de:

- Fase 6 completa (OK)
- Prontuario funcional (OK)
- Encounter da Fase 5 (OK)
- Cadastro mestre da Fase 4 (OK)

## Proximos Passos Apos Fase 6

1. Executar Fase 7 - Operacao Assistencial Avancada
2. Implementar modulos: inpatient, surgery, diagnostics
3. Integrar com encounter e prontuario
4. Criar eventos de continuidade clinica

## Nota de Reconciliacao

- A fase segue concluida no escopo funcional.
- `AUD-005-01` deve ser tratado como concluido no escopo transitorio atual.
- Persistencia em banco real, upload binario e versionamento clinico continuam como proximos passos.

## Checklist de Saida Fase 6

- [x] prontuario por encounter
- [x] entries clinicas tipadas
- [x] prescricao e conduta
- [x] anexos com metadados
- [x] timeline clinica
- [x] auditoria de mudancas
- [x] integracao web/api
- [x] permissions aplicadas
- [x] typecheck passando
- [x] build passando
- [x] testes passando
- [x] documentacao atualizada
