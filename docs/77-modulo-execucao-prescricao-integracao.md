# Modulo Execucao de Prescricao / Enfermagem — Integração

## 1. Visão Geral

Este documento descreve as integrações do módulo Execução de Prescrição / Enfermagem com os módulos Prescrições, Internação, Prontuário, Atendimentos, Pacientes e Tutores.

## 2. Integração com Prescrições

### 2.1 Dependências

- `prescriptionId` → `prescriptions.id` (obrigatório)
- `prescriptionItemId` → `prescription_items.id` (obrigatório)

### 2.2 Validações

- Prescrição deve existir
- Prescrição deve estar ativa
- Item deve existir
- Item deve pertencer à prescrição
- Item deve estar ativo/não cancelado

### 2.3 Dados Recuperados

- Dados da prescrição para contexto
- Dados do item prescrito para contexto
- Status da prescrição
- Status do item

### 2.4 Fluxos

1. Selecionar prescrição ativa
2. Selecionar item da prescrição
3. Criar execução vinculada ao item
4. Atualizar execução
5. Visualizar histórico de execuções da prescrição

## 3. Integração com Atendimentos

### 3.1 Dependências

- `encounterId` → `encounters.id` (obrigatório)

### 3.2 Validações

- Atendimento deve existir
- Atendimento deve estar coerente com a prescrição
- Atendimento deve estar aberto/ativo

### 3.3 Dados Recuperados

- Dados do atendimento para contexto
- Status do atendimento
- Tipo do atendimento

### 3.4 Fluxos

1. Atendimento vinculado à prescrição
2. Execução vinculada ao atendimento
3. Coerência garantida entre prescrição e atendimento

## 4. Integração com Pacientes

### 4.1 Dependências

- `patientId` → `patients.id` (obrigatório)

### 4.2 Validações

- Paciente deve existir
- Paciente deve ser coerente com o atendimento
- Paciente deve ser coerente com a prescrição

### 4.3 Dados Recuperados

- Dados do paciente para contexto
- Nome do paciente
- Espécie do paciente
- Raça do paciente

### 4.4 Fluxos

1. Paciente vinculado ao atendimento
2. Execução vinculada ao paciente
3. Coerência garantida entre atendimento e paciente

## 5. Integração com Tutores

### 5.1 Dependências

- `ownerId` → `owners.id` (obrigatório)

### 5.2 Validações

- Tutor deve existir
- Tutor deve ser coerente com o paciente
- Tutor deve ser coerente com o atendimento

### 5.3 Dados Recuperados

- Dados do tutor para contexto
- Nome do tutor
- Contato do tutor

### 5.4 Fluxos

1. Tutor vinculado ao paciente
2. Execução vinculada ao tutor
3. Coerência garantida entre paciente e tutor

## 6. Integração com Internação

### 6.1 Dependências

- `hospitalizationId` → `hospitalizations.id` (opcional)

### 6.2 Validações

- Quando informado, internação deve existir
- Internação deve ser coerente com o atendimento
- Internação deve estar ativa

### 6.3 Dados Recuperados

- Dados da internação para contexto
- Status da internação
- Leito da internação
- Setor da internação

### 6.4 Fluxos

1. Internação vinculada ao atendimento (opcional)
2. Execução vinculada à internação (opcional)
3. Coerência garantida entre atendimento e internação

## 7. Integração com Prontuário

### 7.1 Dependências

- Vinculação opcional com `clinical_entries`

### 7.2 Fluxos

1. Execução pode gerar entrada no prontuário
2. Prontuário pode referenciar execuções
3. Histórico clínico integrado

## 8. Regras de Integração

### 8.1 Coerência Obrigatória

- `prescriptionId` deve ser válido
- `prescriptionItemId` deve ser válido e coerente com a prescrição
- `encounterId` deve ser válido e coerente com a prescrição
- `patientId` deve ser válido e coerente com o atendimento
- `ownerId` deve ser válido e coerente com o paciente
- `hospitalizationId` (se informado) deve ser válido e coerente com o atendimento

### 8.2 Fluxo Principal

- Não depender de digitação manual de IDs
- Usar contexto de entidades salvas
- Permitir criação a partir do contexto da prescrição
- Permitir criação a partir do contexto da internação

### 8.3 Fallback Técnico

- Fallback técnico apenas se estritamente necessário
- Nunca como UX principal
- Documentar quando usado

## 9. Dados Compartilhados

### 9.1 Dados do Paciente

- Nome
- Espécie
- Raça
- Data de nascimento
- Peso

### 9.2 Dados do Tutor

- Nome
- Telefone
- Email
- Endereço

### 9.3 Dados do Atendimento

- Tipo
- Status
- Data de abertura
- Data de fechamento

### 9.4 Dados da Prescrição

- Status
- Data de criação
- Itens prescritos

### 9.5 Dados da Internação

- Status
- Leito
- Setor
- Data de entrada
- Data de saída

## 10. Pontos de Atenção

### 10.1 Riscos

- Incoerência entre entidades
- Dados desatualizados
- Falha de validação
- Perda de contexto

### 10.2 Mitigações

- Validação rigorosa no backend
- Validação no frontend
- Sincronização automática de dados
- Logs de integração
