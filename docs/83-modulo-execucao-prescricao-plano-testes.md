# Modulo Execucao de Prescricao / Enfermagem — Plano de Testes

## 1. Visão Geral

Este documento descreve o plano de testes do módulo Execução de Prescrição / Enfermagem.

## 2. Estratégia de Testes

### 2.1 Tipos de Teste

- Testes unitários
- Testes de integração
- Testes de API
- Testes de frontend

### 2.2 Cobertura

- Criação de execução
- Atualização de execução
- Listagem de execução
- Detalhe de execução
- Eventos operacionais
- Validações
- Integrações

## 3. Testes de Criação

### 3.1 Teste: Criar execução com sucesso

- Dados válidos de prescrição, item, atendimento, paciente, tutor
- Execução criada com sucesso
- Status correto
- Campos obrigatórios preenchidos
- Evento `created` registrado

### 3.2 Teste: Criar execução com internação

- Dados válidos incluindo internação
- Execução criada com sucesso
- Vínculo com internação correto

### 3.3 Teste: Criar execução sem prescrição

- Tentar criar sem prescrição
- Erro retornado
- Execução não criada

### 3.4 Teste: Criar execução com prescrição inexistente

- Tentar criar com prescrição inexistente
- Erro retornado
- Execução não criada

### 3.5 Teste: Criar execução com item incoerente

- Tentar criar com item que não pertence à prescrição
- Erro retornado
- Execução não criada

### 3.6 Teste: Criar execução com atendimento incoerente

- Tentar criar com atendimento incoerente com prescrição
- Erro retornado
- Execução não criada

### 3.7 Teste: Criar execução com paciente incoerente

- Tentar criar com paciente incoerente com atendimento
- Erro retornado
- Execução não criada

### 3.8 Teste: Criar execução com tutor incoerente

- Tentar criar com tutor incoerente com paciente
- Erro retornado
- Execução não criada

### 3.9 Teste: Criar execução com internação incoerente

- Tentar criar com internação incoerente com atendimento
- Erro retornado
- Execução não criada

## 4. Testes de Atualização

### 4.1 Teste: Atualizar execução com sucesso

- Execução existente
- Dados válidos para atualização
- Execução atualizada com sucesso
- Campos atualizados corretamente
- Evento registrado

### 4.2 Teste: Atualizar status para administered

- Execução pendente
- Atualizar para administered
- Status atualizado
- Campos obrigatórios preenchidos
- Evento `administered` registrado

### 4.3 Teste: Atualizar status para not_administered

- Execução pendente
- Atualizar para not_administered
- Status atualizado
- Campos obrigatórios preenchidos
- Evento `not_administered` registrado

### 4.4 Teste: Atualizar status para delayed

- Execução pendente
- Atualizar para delayed
- Status atualizado
- Campos obrigatórios preenchidos
- Evento `delayed` registrado

### 4.5 Teste: Atualizar status para suspended

- Execução pendente
- Atualizar para suspended
- Status atualizado
- Campos obrigatórios preenchidos
- Evento `suspended` registrado

### 4.6 Teste: Atualizar status para cancelled

- Execução pendente
- Atualizar para cancelled
- Status atualizado
- Campos obrigatórios preenchidos
- Evento `cancelled` registrado

### 4.7 Teste: Atualizar execução inexistente

- Tentar atualizar execução inexistente
- Erro retornado
- Nenhuma alteração

### 4.8 Teste: Atualizar com dados inválidos

- Execução existente
- Dados inválidos
- Erro retornado
- Nenhuma alteração

## 5. Testes de Listagem

### 5.1 Teste: Listar execuções com sucesso

- Execuções existentes
- Listagem retorna execuções
- Paginação funciona
- Ordenação funciona

### 5.2 Teste: Listar execuções vazias

- Nenhuma execução existente
- Listagem retorna lista vazia

### 5.3 Teste: Filtrar execuções por status

- Execuções com diferentes status
- Filtro por status funciona
- Apenas execuções do status selecionado retornadas

### 5.4 Teste: Filtrar execuções por período

- Execuções em diferentes períodos
- Filtro por período funciona
- Apenas execuções do período selecionado retornadas

### 5.5 Teste: Filtrar execuções por prescrição

- Execuções de diferentes prescrições
- Filtro por prescrição funciona
- Apenas execuções da prescrição selecionada retornadas

### 5.6 Teste: Filtrar execuções por paciente

- Execuções de diferentes pacientes
- Filtro por paciente funciona
- Apenas execuções do paciente selecionado retornadas

### 5.7 Teste: Buscar execuções por texto

- Execuções com diferentes textos
- Busca por texto funciona
- Execuções correspondentes retornadas

## 6. Testes de Detalhe

### 6.1 Teste: Detalhar execução com sucesso

- Execução existente
- Detalhe retorna dados completos
- Dados da prescrição incluídos
- Dados do item incluídos
- Dados do atendimento incluídos
- Dados do paciente incluídos
- Dados do tutor incluídos
- Dados da internação incluídos (se houver)
- Histórico de eventos incluído

### 6.2 Teste: Detalhar execução inexistente

- Tentar detalhar execução inexistente
- Erro retornado

## 7. Testes de Eventos

### 7.1 Teste: Registrar evento de criação

- Criar execução
- Evento `created` registrado
- Dados do evento corretos

### 7.2 Teste: Registrar evento de administração

- Administrar execução
- Evento `administered` registrado
- Dados do evento corretos

### 7.3 Teste: Registrar evento de não administração

- Não administrar execução
- Evento `not_administered` registrado
- Dados do evento corretos

### 7.4 Teste: Registrar evento de atraso

- Atrasar execução
- Evento `delayed` registrado
- Dados do evento corretos

### 7.5 Teste: Registrar evento de suspensão

- Suspender execução
- Evento `suspended` registrado
- Dados do evento corretos

### 7.6 Teste: Registrar evento de cancelamento

- Cancelar execução
- Evento `cancelled` registrado
- Dados do evento corretos

### 7.7 Teste: Registrar evento de checagem dupla

- Realizar checagem dupla
- Evento `double_checked` registrado
- Dados do evento corretos

### 7.8 Teste: Listar eventos por execução

- Execução com múltiplos eventos
- Listagem retorna todos os eventos
- Eventos em ordem cronológica

## 8. Testes de Validação

### 8.1 Teste: Validar prescrição obrigatória

- Tentar criar sem prescrição
- Erro de validação retornado

### 8.2 Teste: Validar item obrigatório

- Tentar criar sem item
- Erro de validação retornado

### 8.3 Teste: Validar atendimento obrigatório

- Tentar criar sem atendimento
- Erro de validação retornado

### 8.4 Teste: Validar paciente obrigatório

- Tentar criar sem paciente
- Erro de validação retornado

### 8.5 Teste: Validar tutor obrigatório

- Tentar criar sem tutor
- Erro de validação retornado

### 8.6 Teste: Validar status obrigatório

- Tentar criar sem status
- Erro de validação retornado

### 8.7 Teste: Validar scheduledFor obrigatório

- Tentar criar sem scheduledFor
- Erro de validação retornado

### 8.8 Teste: Validar coerência prescrição/item

- Tentar criar com item que não pertence à prescrição
- Erro de validação retornado

### 8.9 Teste: Validar coerência atendimento/prescrição

- Tentar criar com atendimento incoerente com prescrição
- Erro de validação retornado

### 8.10 Teste: Validar coerência paciente/atendimento

- Tentar criar com paciente incoerente com atendimento
- Erro de validação retornado

### 8.11 Teste: Validar coerência tutor/paciente

- Tentar criar com tutor incoerente com paciente
- Erro de validação retornado

### 8.12 Teste: Validar coerência internação/atendimento

- Tentar criar com internação incoerente com atendimento
- Erro de validação retornado

## 9. Testes de Integração

### 9.1 Teste: Integração com Prescrições

- Criar execução vinculada a prescrição
- Dados da prescrição recuperados
- Coerência validada

### 9.2 Teste: Integração com Atendimentos

- Criar execução vinculada a atendimento
- Dados do atendimento recuperados
- Coerência validada

### 9.3 Teste: Integração com Pacientes

- Criar execução vinculada a paciente
- Dados do paciente recuperados
- Coerência validada

### 9.4 Teste: Integração com Tutores

- Criar execução vinculada a tutor
- Dados do tutor recuperados
- Coerência validada

### 9.5 Teste: Integração com Internação

- Criar execução vinculada a internação
- Dados da internação recuperados
- Coerência validada

## 10. Testes de Histórico

### 10.1 Teste: Preservação de histórico

- Criar execução
- Atualizar execução múltiplas vezes
- Histórico preservado
- Eventos não deletados

### 10.2 Teste: Recuperação de histórico

- Execução com múltiplos eventos
- Recuperar histórico
- Todos os eventos retornados
- Ordem cronológica correta

### 10.3 Teste: Versionamento

- Criar execução
- Emendar execução
- Versão incrementada
- Supersedência registrada

## 11. Testes de Autoria

### 11.1 Teste: createdByUserId preenchido

- Criar execução
- createdByUserId preenchido corretamente

### 11.2 Teste: updatedByUserId preenchido

- Atualizar execução
- updatedByUserId preenchido corretamente

### 11.3 Teste: performerUserId preenchido

- Administrar execução
- performerUserId preenchido corretamente

## 12. Execução dos Testes

### 12.1 Comando de Execução

```bash
pnpm test
```

### 12.2 Critérios de Sucesso

- Todos os testes passam
- Cobertura mínima de 80%
- Sem erros de build
- Sem erros de typecheck
