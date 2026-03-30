# Modulo Pacientes — Contrato de Dados

## 1. Entidade de negocio

Nome: `Patient`

## 2. Campos obrigatorios

| Campo     | Tipo            | Obrigatorio | Regra                           |
| --------- | --------------- | ----------- | ------------------------------- |
| id        | string          | sim         | identificador unico             |
| accountId | string          | sim         | segregacao multi-tenant         |
| name      | string          | sim         | nome do paciente                |
| species   | string          | sim         | especie (canine, feline, other) |
| tutorId   | string          | sim         | vinculo com tutor/owner         |
| status    | enum            | sim         | active, inactive, deceased      |
| createdAt | string datetime | sim         | auditoria                       |
| updatedAt | string datetime | sim         | auditoria                       |

## 3. Campos clinicos essenciais

| Campo        | Tipo    | Obrigatorio | Regra                      |
| ------------ | ------- | ----------- | -------------------------- |
| breed        | string  | opcional    | raca                       |
| sex          | enum    | sim         | male, female, unknown      |
| neutered     | boolean | opcional    | castrado                   |
| birthDate    | string  | opcional    | data de nascimento (ISO)   |
| estimatedAge | string  | opcional    | idade estimada alternativa |
| weight       | number  | opcional    | peso em kg                 |
| coat         | string  | opcional    | pelagem                    |
| microchip    | string  | opcional    | numero do microchip        |

## 4. Campos medicos iniciais

| Campo           | Tipo   | Obrigatorio | Regra                         |
| --------------- | ------ | ----------- | ----------------------------- |
| alerts          | array  | opcional    | alertas clinicos estruturados |
| notes           | string | opcional    | observacoes gerais            |
| behavioralNotes | string | opcional    | notas comportamentais         |

## 5. Campos administrativos

| Campo           | Tipo   | Obrigatorio | Regra                  |
| --------------- | ------ | ----------- | ---------------------- |
| createdByUserId | string | opcional    | autoria de criacao     |
| updatedByUserId | string | opcional    | autoria de atualizacao |

## 6. Estrutura de alerta

```json
{
  "type": "allergy",
  "label": "Alergia a dipirona",
  "severity": "high"
}
```

Tipos aceitos: allergy, aggression, anesthesia_risk, chronic_condition, other.
Severidades: low, medium, high.

## 7. Payloads

### Create

```json
{
  "name": "Rex",
  "species": "canine",
  "breed": "Labrador",
  "sex": "male",
  "neutered": true,
  "birthDate": "2020-03-15",
  "weight": 28.5,
  "coat": "curto dourado",
  "microchip": "123456789",
  "primaryOwnerId": "owner_xxx",
  "alerts": [{ "type": "allergy", "label": "Alergia a dipirona", "severity": "high" }],
  "notes": "Paciente calmo.",
  "behavioralNotes": "Medroso com barulhos altos."
}
```

### Update

PATCH parcial aceito. Campos ausentes preservam valor atual.

### List Response

```json
{
  "items": [],
  "total": 0
}
```

### Detail Response

Retorna entidade expandida com dados do tutor vinculado.

## 8. Regras de consistencia

- birthDate e estimatedAge sao mutuamente exclusivos mas ambos opcionais;
- se birthDate for informada, calcular estimatedAge derivado;
- peso aceita apenas valores positivos;
- tutorId deve referenciar tutor valido e ativo.
