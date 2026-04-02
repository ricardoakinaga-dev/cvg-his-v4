# Módulo Alta — Plano de Implementação

## Fases de Implementação

### Fase 1: Preparação

- [ ] Verificar existência de documentação
- [ ] Criar documentação em /docs (se não existir)
- [ ] Revisar contratos

### Fase 2: Banco de Dados

- [ ] Criar tabela `discharges` no schema
- [ ] Adicionar campos conforme contrato
- [ ] Criar migration
- [ ] Adicionar relacionamentos

### Fase 3: Backend

- [ ] Criar DischargesService
- [ ] Implementar rotas API:
  - [ ] POST /discharges
  - [ ] GET /discharges
  - [ ] GET /discharges/:id
  - [ ] PATCH /discharges/:id
- [ ] Adicionar validações
- [ ] Integrar com Medical Records
- [ ] Adicionar auditoria

### Fase 4: Frontend

- [ ] Criar página discharges.ts
- [ ] Implementar listagem
- [ ] Implementar formulário
- [ ] Implementar detalhe
- [ ] Adicionar rotas
- [ ] Adicionar ao menu

### Fase 5: Integração

- [ ] Vincular com Encounters
- [ ] Vincular com Patients
- [ ] Vincular com Owners
- [ ] Encerrar atendimento ao dar alta
- [ ] Encerrar internação quando aplicável

### Fase 6: Validação

- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Typecheck
- [ ] Build

### Fase 7: Auditoria

- [ ] Verificar todas as funcionalidades
- [ ] Documentar pendências
- [ ] Confirmar pronto para auditoria

## Prioridades

### Alta Prioridade

1. Schema de banco
2. API CRUD básica
3. Validações obrigatórias
4. Frontend funcional
5. Encerramento de atendimento

### Média Prioridade

1. Encerramento de internação
2. Timeline médico
3. Filtros avançados

### Baixa Prioridade

1. Relatórios
2. Exportação

## Riscos Identificados

- Integração com encerramento de encounter pode afetar outros fluxos
- Duplicidade deve ser rigorosamente verificada
- Consistency com módulos existentes

## Dependências

- Encounters (obrigatório)
- Patients (obrigatório)
- Owners (obrigatório)
- Medical Records (recomendado)
- Inpatient (opcional)
