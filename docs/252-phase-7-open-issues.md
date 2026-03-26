# Phase 7 Open Issues

Data atualizacao: 2026-03-25

## Pendencias Conhecidas

### Persistencia

| Pendencia                            | Prioridade | Impacto       |
| ------------------------------------ | ---------- | ------------- |
| Persistir internacao em banco real   | Alta       | Sobrevivencia |
| Persistir cirurgia em banco real     | Alta       | Sobrevivencia |
| Persistir diagnosticos em banco real | Alta       | Sobrevivencia |

### Internacao

| Pendencia                    | Prioridade | Dependencias |
| ---------------------------- | ---------- | ------------ |
| Alta formal com destinação   | Media      | Fase 7+      |
| Transferencia entre unidades | Baixa      | Fase 7+      |
| Sinais vitais estruturados   | Media      | Fase 7+      |
| Prescricao de internacao     | Alta       | Fase 7+      |

### Cirurgia

| Pendencia               | Prioridade | Dependencias |
| ----------------------- | ---------- | ------------ |
| Agendamento de cirurgia | Alta       | Fase 7+      |
| Equipe cirurgica        | Media      | Fase 7+      |
| Anestesia               | Media      | Fase 7+      |
| Materiais cirurgicos    | Baixa      | Fase 7+      |
| Notas pre-operatorias   | Media      | Fase 7+      |

### Diagnosticos

| Pendencia                      | Prioridade | Dependencias |
| ------------------------------ | ---------- | ------------ |
| Catalogo de exames             | Alta       | Fase 7+      |
| Integracao laboratorio externo | Media      | Fase 8+      |
| Validacao de resultados        | Media      | Fase 7+      |
| Valores de referencia          | Baixa      | Fase 7+      |

## Riscos Identificados

### Risco 1: Internacao em Memoria

**Probabilidade**: Media
**Impacto**: Alto
**Descricao**: Internacao atual e funcional e rastreavel, mas usa armazenamento em memoria
**Mitigacao**: Implementar persistencia real quando infraestrutura estiver pronta

### Risco 2: Cirurgia Sem Agendamento

**Probabilidade**: Media
**Impacto**: Medio
**Descricao**: Cirurgia pode ser solicitada mas nao ha agendamento formal
**Mitigacao**: Implementar modulo de agendamento cirurgico

### Risco 3: Diagnosticos Sem Catalogo

**Probabilidade**: Alta
**Impacto**: Medio
**Descricao**: Exames sao registrados livremente, sem catalogo estruturado
**Mitigacao**: Implementar catalogo de exames

### Risco 4: Sem Integracao Laboratorio

**Probabilidade**: Media
**Impacto**: Medio
**Descricao**: Resultados sao inseridos manualmente
**Mitigacao**: Modelar interface para integracao futura

## Pontos a Resolver na Fase 8

### Administrativo

- [ ] Integrar billing com operacao assistencial
- [ ] Consumos de estoque vinculados a procedimento
- [ ] Notificacoes para status de internacao/cirurgia

### Continuidade

- [ ] Vinculo encounter -> operacao -> cobranca
- [ ] Permissoes de Fase 3-7 como base
- [ ] Auditoria de operacoes assistenciais

## Checklist de Entrada Fase 8

- [x] Ler `docs/250-phase-7-progress.md`
- [x] Verificar que nao ha divida da Fase 7
- [x] Confirmar que operacao avancada funciona
- [x] Confirmar continuidade do caso clinico

## Dependencias

A Fase 8 depende de:

- Fase 7 completa (OK)
- Operacao assistencial funcional (OK)
- Prontuario da Fase 6 (OK)
- Encounter da Fase 5 (OK)
- Cadastro mestre da Fase 4 (OK)

## Proximos Passos Apos Fase 7

1. Executar Fase 8 - Administrativo
2. Implementar modulos: billing, inventory, notifications
3. Integrar com operacao assistencial
4. Manter segregacao clinico/administrativo

## Checklist de Saida Fase 7

- [x] internacao implementada
- [x] cirurgia implementada
- [x] diagnosticos implementados
- [x] continuidade do caso clinico preservada
- [x] timeline clinica integrada
- [x] attachments para diagnosticos
- [x] permissions aplicadas
- [x] typecheck passando
- [x] build passando
- [x] testes passando
- [x] documentacao atualizada
- [x] partial checklists criados
