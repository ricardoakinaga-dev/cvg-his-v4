# Modulo Atendimentos — Contrato de Dados

## 1. Entidade

Nome tecnico: `Encounter`
Nome negocio: `Atendimento`

## 2. Campos obrigatorios

| Campo          | Tipo     | Regra                                                                              |
| -------------- | -------- | ---------------------------------------------------------------------------------- |
| id             | string   | identificador unico                                                                |
| accountId      | string   | segregacao multi-tenant                                                            |
| patientId      | string   | vinculo com paciente                                                               |
| ownerId        | string   | vinculo com tutor                                                                  |
| status         | enum     | open, in_progress, waiting, completed, cancelled                                   |
| attendanceType | enum     | consultation, emergency, return, hospitalization_entry, procedure, teleorientation |
| chiefComplaint | string   | motivo principal                                                                   |
| priority       | enum     | low, normal, high, critical                                                        |
| openedAt       | datetime | timestamp de abertura                                                              |
| createdAt      | datetime | auditoria                                                                          |
| updatedAt      | datetime | auditoria                                                                          |

## 3. Campos operacionais

| Campo                  | Tipo   | Regra                                                                             |
| ---------------------- | ------ | --------------------------------------------------------------------------------- |
| origin                 | enum   | reception, whatsapp, phone, walk_in, referral, internal_transfer                  |
| sector                 | enum   | reception, triage, consultation_room, emergency_room, hospitalization, diagnostic |
| responsibleUserId      | string | profissional responsavel                                                          |
| veterinarianUserId     | string | veterinario                                                                       |
| triageNotes            | string | notas de triagem                                                                  |
| administrativeNotes    | string | notas administrativas                                                             |
| clinicalAlertsSnapshot | jsonb  | snapshot de alertas do paciente no momento                                        |

## 4. Campos de tempo

| Campo       | Tipo     |
| ----------- | -------- |
| startedAt   | datetime |
| finishedAt  | datetime |
| cancelledAt | datetime |

## 5. Auditoria

| Campo           | Tipo   |
| --------------- | ------ |
| createdByUserId | string |
| updatedByUserId | string |

## 6. Campos opcionais

| Campo                      | Tipo   |
| -------------------------- | ------ |
| queueToken                 | string |
| referralSource             | string |
| weightAtAdmission          | number |
| temperatureAtAdmission     | number |
| heartRateAtAdmission       | number |
| respiratoryRateAtAdmission | number |
| mucosaStatus               | string |
| hydrationStatus            | string |

## 7. Estrutura de alerta snapshot

```json
{ "type": "allergy", "label": "Alergia a dipirona", "severity": "high" }
```

## 8. Payloads

### Create

```json
{
  "patientId": "patient_xxx",
  "ownerId": "owner_xxx",
  "attendanceType": "consultation",
  "chiefComplaint": "Vomitos ha 2 dias",
  "priority": "normal",
  "origin": "reception",
  "sector": "consultation_room",
  "triageNotes": "Paciente alerta"
}
```

### List Response

```json
{ "items": [], "total": 0 }
```
