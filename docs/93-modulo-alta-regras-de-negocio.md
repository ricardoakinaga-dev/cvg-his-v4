# Módulo Alta — Regras de Negócio

## Regras Obrigatórias

### 1. Existência de Atendimento

- Alta não existe sem atendimento válido
- encounterId deve referenciar atendimento existente
- Retornar erro 404 se atendimento não existir

### 2. Coerência de Paciente

- patientId deve corresponder ao patientId do encounter
- Validar antes de criar alta
- Retornar erro de validação se divergente

### 3. Unicidade por Atendimento

- Cada atendimento pode ter apenas **um** desfecho final
- Verificar duplicidade antes de criar
- Retornar erro se alta já existir para o encounter

### 4. Campos Obrigatórios

- `dischargeType` é obrigatório
- `outcome` é obrigatório
- `dischargedAt` é obrigatório (data/hora da alta)
- `encounterId` é obrigatório
- `patientId` é obrigatório

### 5. Consistência de Outcome/Type

- Se `outcome` = 'deceased', `dischargeType' deve ser 'death'
- Se `dischargeType` = 'death', `outcome` deve ser 'deceased'

### 6. Encerramento de Atendimento

- Ao criar alta, o atendimento deve ser encerrado
- Status do encounter → 'completed' ou similar
- Manter coerência com estado atual do sistema

### 7. Encerramento de Internação

- Se hospitalizationId presente, verificar internação
- Alta pode encerrar internação ativa
- Atualizar status da internação

### 8. Rastreabilidade

- Registrar usuário que criou (createdByUserId)
- Registrar usuário que atualizou (updatedByUserId)
- Manter versionNumber para controle
- Não implementar exclusão destrutiva

## Regras Opcionais

### Follow-up

- Se followUpRequired = true, followUpInstructions é recomendado
- Retornar aviso (não erro) se instruções vazias

### Medicações

- medicationsAtDischarge é opcional
- Formato livre (texto)

## Comportamento

### Create

1. Validar encounter existe
2. Validar paciente coerente
3. Verificar duplicidade
4. Preencher campos obrigatórios
5. Criar registro
6. Registrar evento timeline
7. Retornar sucesso

### Update

1. Verificar alta existe
2. Aplicar validações específicas
3. Atualizar registro
4. Incrementar versionNumber
5. Registrar evento timeline
6. Retornar atualizado

### Delete

- **NÃO IMPLEMENTAR** exclusão destrutiva
- Usar cancelamento se necessário (future)

## Erros Esperados

- 400: Dados inválidos
- 404: Alta ou encounter não encontrado
- 409: Duplicidade (alta já existe)
- 500: Erro interno
