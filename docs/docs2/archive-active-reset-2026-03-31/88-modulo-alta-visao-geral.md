# Módulo Alta / Desfecho Clínico — Visão Geral

## Propósito

O módulo Alta / Desfecho Clínico representa o encerramento formal do caso clínico dentro do CVG-HIS-V2. Este módulo é responsável por:

- Registrar o desfecho final de um atendimento
- Documentar o diagnóstico, procedimentos e condutas realizadas
- Fornecer orientações de continuidade ao tutor
- Rastrear o encerramento do caso de forma não destrutiva

## Posição no Fluxo Clínico

```
Atendimento → Prontuário → Prescrição → Exames → Internação → Execução → Alta
```

A alta é o ponto final do ciclo clínico, encerrando formalmente o episódio de atendimento.

## Escopo

### Dentro do Escopo

- Registro formal de alta/desfecho
- Resumo clínico final
- Orientações de saída e continuidade
- Rastreabilidade do encerramento
- Integração com módulos clínicos existentes
- Validações de consistência
- Testes focados
- Preparação para auditoria

### Fora do Escopo

- Faturamento
- Documentos PDF completos
- Assinatura digital avançada
- Integração com sistemas externos
- Auditoria formal

## Conceitos Centrais

### Discharge (Alta)

Entidade principal que representa o encerramento de um atendimento. Contém:

- Dados do paciente e tutor
- Tipo de alta
- Outcome clínico
- Resumo e recomendações
- Informações de continuidade

### DischargeType (Tipo de Alta)

- `outpatient`: Alta ambulatorial
- `inpatient_discharge`: Alta de internação
- `transfer`: Transferência
- `death`: Óbito

### Outcome (Desfecho)

- `recovered`: Recuperado
- `improved`: Melhorado
- `unchanged`: Inalterado
- `worsened`: Piorado
- `deceased`: Óbito

## Integrações

O módulo Alta se integra com:

- **Encounters**: Vincula ao atendimento, encerrando-o logicamente
- **Patients**: Dados do paciente
- **Owners**: Dados do tutor/proprietário
- **MedicalRecords**: Registra evento de alta no timeline
- **Prescriptions**: Pode referenciar prescrições ativas
- **Exams**: Pode referenciar exames realizados
- **Inpatient**: Encerra internação quando aplicável

## Padrões Arquiteturais

- Persistência como fonte real de verdade
- Rastreabilidade completa (não destrutivo)
- Um desfecho por atendimento (impedir duplicidade)
- Integração com timeline clínico
- Validações de coerência
