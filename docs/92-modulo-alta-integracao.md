# Módulo Alta — Integração

## Visão Geral

O módulo Alta se integra com múltiplos módulos do CVG-HIS-V2 para garantir fluxo clínico coerente e rastreabilidade completa.

## Integrações

### Encounters (Atendimentos)

- **Vinculação**: Todo Discharge deve ter um encounterId válido
- **Validação**: O paciente do encounter deve corresponder ao patientId informado
- **Encerramento**: A alta encerra logicamente o atendimento
- **Fluxo**: Atendimento → Alta

### Patients (Pacientes)

- **Dados**: ID do paciente obrigatório
- **Validação**: Paciente deve existir
- **Exibição**: Nome do paciente nas listagens

### Owners (Tutores)

- **Dados**: ID do tutor obrigatório
- **Validação**: Tutor deve existir
- **Exibição**: Nome do tutor nas listagens

### Medical Records (Prontuário)

- **Timeline**: Registrar evento de alta no timeline
- **Tipo de Evento**: `discharge_created`
- **Resumo**: Descrição do desfecho

### Prescriptions (Prescrições)

- **Referência**: Campo medicationsAtDischarge
- **Fluxo**: Prescrição → Execução → Alta

### Exams (Exames)

- **Referência**: Pode ser mencionado em clinicalSummary
- **Fluxo**: Exames → Resultados → Alta

### Inpatient (Internação)

- **Vinculação**: Opcional, via hospitalizationId
- **Encerramento**: Alta pode encerrar internação ativa
- **Fluxo**: Internação → Execuções → Alta → Encerramento Internação

## Fluxo Clínico Integrado

```
1. Atendimento ativo
   ↓
2. Prontuário preenchido
   ↓
3. Prescrições criadas
   ↓
4. Exames solicitados
   ↓
5. (Se aplicável) Internação
   ↓
6. Execuções registradas
   ↓
7. ALTA / DESFECHO
   ↓
8. Atendimento encerrado
```

## Eventos de Timeline

Ao criar/modificar alta:

1. `discharge_created` - Alta registrada
2. `discharge_updated` - Alta atualizada

## Validações de Coerência

- Paciente do atendimento = patientId
- Tutor do atendimento = ownerId (se fornecido)
- Se internação, hospitalizationId deve existir
- Outcome 'deceased' implica dischargeType 'death'
