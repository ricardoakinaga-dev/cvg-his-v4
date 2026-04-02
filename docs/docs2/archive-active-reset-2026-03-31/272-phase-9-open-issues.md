# Phase 9 Open Issues

Data atualizacao: 2026-03-25

## Pendencias Conhecidas

### Infraestrutura

| Pendencia                         | Prioridade | Impacto                |
| --------------------------------- | ---------- | ---------------------- |
| Extratores reais por fonte legada | Alta       | Execucao de migracao   |
| Ambiente de staging               | Alta       | Teste de reconciliacao |
| Armazenamento temporario          | Media      | Concistencia de dados  |

### Operacao

| Pendencia                      | Prioridade | Dependencias |
| ------------------------------ | ---------- | ------------ |
| Homologacao por onda           | Alta       | Staging      |
| Definicao de SLOs              | Media      | Operacao     |
| Participacao de usuarios-chave | Media      | Treinamento  |

### Qualidade

| Pendencia                             | Prioridade | Dependencias           |
| ------------------------------------- | ---------- | ---------------------- |
| Limites numericos de qualidade        | Media      | Estabelecer thresholds |
| Amostras para validacao de saneamento | Media      | Dados anonimos         |

## Riscos Identificados

### Risco 1: Heterogeneidade do Legado

**Probabilidade**: Media
**Impacto**: Medio
**Descricao**: Regras implicitas ainda nao documentadas podem aparecer durante extracao
**Mitigacao**: Extratores com log de divergencias, reconciliacao manual

### Risco 2: Sobreposicao Conceitual

**Probabilidade**: Media
**Impacto**: Medio
**Descricao**: billing, inventory e notifications legados podem ter sobreposicao com V2
**Mitigacao**: Migracao restrita, apenas funcional aderente

### Risco 3: Historico Clinico Antigo

**Probabilidade**: Media
**Impacto**: Alto
**Descricao**: Registros sem autoria ou timestamp confiavel podem precisar de migracao parcial
**Mitigacao**: Migracao parcial ou consulta legada para historico antigo

### Risco 4: Desligamento Precoce

**Probabilidade**: Baixa
**Impacto**: Alto
**Descricao**: Legado desativado sem capacidade de contingencia
**Mitigacao**: Criterios de desativacao rigorosos

## Dependencias para Execucao

| Dependencia             | Prioridade | Status   |
| ----------------------- | ---------- | -------- |
| Ambiente de staging     | Alta       | Pendente |
| Extratores legados      | Alta       | Pendente |
| Amostras anonimizadas   | Media      | Pendente |
| Homologacao operacional | Alta       | Pendente |

## Decisoes a Tomar Antes da Execucao

| Decisao                   | Opcoes                       |
| ------------------------- | ---------------------------- |
| Dominios full migracao    | W1: identidade, W2: cadastro |
| Dominios migracao parcial | W3: atendimento, W4: clinico |
| Dominios consulta legado  | W5: administrativo           |
| Historico clinico         | quanto migrar por onda       |
| Ferramenta de extracao    | custom scripts, ETL, etc     |

## Checklist de Execucao

### Pre-requisitos

- [ ] Ambiente de staging preparado
- [ ] Extratores implementados
- [ ] Samples de dados anonimizados
- [ ] Equipe treinada

### Onda 1 - Identidade

- [ ] Extrair usuarios ativos
- [ ] Validar consistencia
- [ ] Importar para V2
- [ ] Reconciliar com operacao

### Onda 2 - Cadastro

- [ ] Extrair owners
- [ ] Deduplicar
- [ ] Extrair patients
- [ ] Importar vinculos

### Ondas 3-5

- [ ] Conforme maturacao das ondas anteriores

## Checklist de Saida Fase 9

- [x] Mapeamento funcional completo
- [x] Plano de migracao de dados
- [x] Estrategia de rollout documentada
- [x] Estrategia de rollback documentada
- [x] Criterios de saneamento definidos
- [x] Criterios de desativacao do legado
- [x] partial checklists criados
- [x] documentacao de fase completa

## Conclusao

A Fase 9 documenta a estrategia de migracao. A execucao real depende de infraestrutura e homologacao operacional que estao fora do escopo de implementacao de codigo.

O plano esta pronto para ser executado quando os pre-requisitos estiverem disponiveis.
