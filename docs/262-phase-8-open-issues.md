# Phase 8 Open Issues

Data atualizacao: 2026-03-25

## Pendencias Conhecidas

### Billing

| Pendencia           | Prioridade | Impacto               |
| ------------------- | ---------- | --------------------- |
| Pagamento e baixa   | Alta       | Fechamento financeiro |
| Caixa e conciliacao | Media      | Operacao diaria       |
| Notas fiscais       | Media      | Compliance            |
| Contas a receber    | Media      | Gestao financeira     |

### Inventory

| Pendencia                     | Prioridade | Dependencias  |
| ----------------------------- | ---------- | ------------- |
| Catalogo completo de itens    | Alta       | Operacao      |
| Entrada de estoque            | Media      | Reposicao     |
| Transferencias entre unidades | Baixa      | Multi-unidade |
| Lotes e validades             | Baixa      | Controle      |

### Notifications

| Pendencia        | Prioridade | Dependencias     |
| ---------------- | ---------- | ---------------- |
| Fila persistente | Media      | Confiabilidade   |
| Email            | Media      | Comunicacao      |
| SMS              | Baixa      | Alertas criticos |
| WhatsApp         | Baixa      | Conveniencia     |

### Integracao

| Pendencia                               | Prioridade | Dependencias |
| --------------------------------------- | ---------- | ------------ |
| Conciliacao automatica consumo-cobranca | Media      | Fase 9+      |
| Vinculo prescricao-consumo              | Media      | Fase 9+      |

## Riscos Identificados

### Risco 1: Persistencia em Memoria

**Probabilidade**: Media
**Impacto**: Alto
**Descricao**: Modulos administrativos em memoria nao sobrevivem a restart
**Mitigacao**: Implementar persistencia real na Fase 9+

### Risco 2: Billing Basico

**Probabilidade**: Baixa
**Impacto**: Medio
**Descricao**: Funcionalidade atual cobre apenas orcamento, sem fechamento financeiro
**Mitigacao**: Roadmap inclui evolucao de billing

### Risco 3: Fila Simples de Notifications

**Probabilidade**: Baixa
**Impacto**: Medio
**Descricao**: Worker atual processa fila simples, sem persistencia ou canais reais
**Mitigacao**: Evoluir para fila persistente quando necessario

### Risco 4: Sem Conciliacao

**Probabilidade**: Media
**Impacto**: Baixo
**Descricao**: Consumo assistencial nao gera cobranca automaticamente
**Mitigacao**: Integracao futura entre modules

## Pontos a Resolver na Fase 9

### Migracao Controlada

- [ ] Mapear dominios legados para V2
- [ ] Definir estrategia de migracao de dados
- [ ] Estabelecer convivio assistido legado-V2
- [ ] Validar equivalencia funcional

### Continuidade

- [ ] Manter segregacao clinico/administrativo
- [ ] Preservar auditing de operacoes
- [ ] Garantir rastreabilidade de migracao

## Checklist de Entrada Fase 9

- [x] Ler `docs/270-phase-9-progress.md`
- [x] Ler `docs/124-migration-strategy.md`
- [x] Ler `docs/280-legacy-to-v2-map.md`
- [x] Verificar que nao ha divida da Fase 8
- [x] Confirmar que modulos administrativos funcionam

## Dependencias

A Fase 9 depende de:

- Fase 8 completa (OK)
- Modulos administrativos funcionais (OK)
- Fases 3-7 completas (OK)
- Documentacao de migracao (OK)

## Proximos Passos Apos Fase 8

1. Executar Fase 9 - Migracao Controlada
2. Mapear legado para V2
3. Definir ondas de migracao
4. Estabelecer criterios de saneamento
5. Implementar ferramentas de consistencia

## Checklist de Saida Fase 8

- [x] billing com orcamento e itens
- [x] inventory com consumo rastreavel
- [x] notifications com fila simples
- [x] segregacao clinico/administrativo
- [x] permissions de finance/inventory
- [x] integracao web/api/worker
- [x] auditoria de operacoes
- [x] typecheck passando
- [x] build passando
- [x] testes passando
- [x] documentacao atualizada
- [x] partial checklists criados
