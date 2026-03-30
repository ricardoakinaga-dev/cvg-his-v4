# Módulo Tutores — Contrato de Dados

## 1. Objetivo

Este documento define o contrato de dados oficial do módulo Tutores para orientar banco, backend e frontend. O contrato deve suportar o estado operacional real do hospital veterinário, mantendo compatibilidade gradual com a estrutura técnica atual de `owners`.

## 2. Princípios do contrato

- separar DTO de entrada, entidade persistida e resposta para frontend;
- manter consistência entre campos exibidos e campos persistidos;
- permitir expansão futura sem quebrar contratos essenciais;
- suportar múltiplos contatos e endereço estruturado;
- preservar rastreabilidade mínima;
- evitar ambiguidade entre dados obrigatórios, opcionais e derivados.

## 3. Entidade de negócio

### 3.1 Nome de negócio

`Tutor`

### 3.2 Nome técnico transitório

`Owner`

Durante a evolução, o código pode manter `owners` por retrocompatibilidade, mas a documentação e a modelagem funcional devem convergir para `Tutor`.

## 4. Campos recomendados

### 4.1 Campos obrigatórios

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `id` | string | sim na persistência/resposta | identificador único |
| `accountId` | string | sim na persistência | segregação multi-tenant |
| `fullName` | string | sim | nome civil/organizacional principal |
| `document` | object \| null | condicionalmente obrigatório | exigido para operação regular, salvo exceções controladas |
| `primaryContactId` | string \| null | recomendado | referência ao contato principal |
| `contacts` | array | sim | pelo menos um contato válido em cadastro regular |
| `status` | enum | sim | `active`, `inactive`, `restricted`, `pending_review` |
| `origin` | enum | sim | origem de criação do cadastro |
| `financialResponsible` | boolean | sim | informa se o tutor responde financeiramente |
| `createdAt` | string datetime | sim | auditoria |
| `updatedAt` | string datetime | sim | auditoria |

### 4.2 Campos opcionais

| Campo | Tipo | Observação |
| --- | --- | --- |
| `displayName` | string | nome social, fantasia ou nome reduzido de exibição |
| `email` | string | pode coexistir com contatos estruturados por compatibilidade |
| `address` | object \| null | endereço principal estruturado |
| `administrativeNotes` | string \| null | observações administrativas, não clínicas |
| `preferredContactMethod` | enum \| null | método preferencial de contato |
| `preferredContactWindow` | string \| null | faixa de horário preferencial |
| `tags` | array string | categorização futura controlada |
| `inactiveReason` | string \| null | motivo de inativação |
| `lastVerifiedAt` | string datetime \| null | última revisão cadastral |
| `createdByUserId` | string \| null | auditoria |
| `updatedByUserId` | string \| null | auditoria |
| `version` | integer | controle de concorrência futura |

## 5. Estrutura recomendada da entidade Tutor

```json
{
  "id": "tutor_01H...",
  "accountId": "acc_01H...",
  "fullName": "Maria Helena de Souza",
  "displayName": "Maria Souza",
  "document": {
    "type": "cpf",
    "number": "12345678901",
    "normalizedNumber": "12345678901"
  },
  "contacts": [
    {
      "id": "contact_01",
      "label": "Celular principal",
      "type": "phone",
      "value": "+5511999999999",
      "normalizedValue": "5511999999999",
      "isPrimary": true,
      "isWhatsapp": true,
      "canReceiveClinicalMessages": true,
      "canReceiveFinancialMessages": true
    },
    {
      "id": "contact_02",
      "label": "E-mail principal",
      "type": "email",
      "value": "maria@example.com",
      "normalizedValue": "maria@example.com",
      "isPrimary": false,
      "canReceiveClinicalMessages": true,
      "canReceiveFinancialMessages": true
    }
  ],
  "primaryContactId": "contact_01",
  "preferredContactMethod": "whatsapp",
  "preferredContactWindow": "08:00-18:00",
  "address": {
    "street": "Rua Exemplo",
    "number": "123",
    "complement": "Apto 45",
    "district": "Centro",
    "city": "Guararema",
    "state": "SP",
    "postalCode": "08900000",
    "country": "BR",
    "normalizedPostalCode": "08900000"
  },
  "financialResponsible": true,
  "status": "active",
  "origin": "reception_manual",
  "administrativeNotes": "Contato preferencial por WhatsApp.",
  "inactiveReason": null,
  "lastVerifiedAt": "2026-03-28T10:00:00Z",
  "createdByUserId": "usr_01",
  "updatedByUserId": "usr_02",
  "createdAt": "2026-03-28T09:00:00Z",
  "updatedAt": "2026-03-28T10:00:00Z",
  "version": 3
}
```

## 6. Documento

### 6.1 Estrutura recomendada

```json
{
  "type": "cpf",
  "number": "123.456.789-01",
  "normalizedNumber": "12345678901"
}
```

### 6.2 Tipos aceitos

- `cpf`
- `cnpj`
- `rg`
- `passport`
- `other`

### 6.3 Regras

- `normalizedNumber` é usado para busca, deduplicação e indexação;
- número deve ser persistido preferencialmente em forma normalizada;
- máscara é responsabilidade do frontend;
- backend valida formato mínimo e coerência do tipo.

## 7. Estratégia para múltiplos contatos

O módulo não deve depender apenas de `phone` e `email` soltos na entidade principal.

### 7.1 Estrutura recomendada

Cada contato deve conter:

- `id`
- `label`
- `type`: `phone`, `email`, `whatsapp`, `other`
- `value`
- `normalizedValue`
- `isPrimary`
- `isWhatsapp`
- `canReceiveClinicalMessages`
- `canReceiveFinancialMessages`
- `notes` opcional

### 7.2 Regras

- deve existir no máximo um contato principal por tutor;
- deve existir no máximo um e-mail principal por tutor;
- telefone e WhatsApp podem compartilhar o mesmo valor, mas não devem ser duplicados sem necessidade;
- contato inativo ou inválido não deve ser marcado como principal;
- em fase inicial, `contacts` pode ser persistido em `jsonb` se isso reduzir atrito de implantação.

## 8. Estratégia para endereço

O endereço deve ser estruturado e opcional no primeiro corte, porém suportado desde o contrato.

### 8.1 Estrutura recomendada

```json
{
  "street": "Rua Exemplo",
  "number": "123",
  "complement": "Casa 2",
  "district": "Centro",
  "city": "Guararema",
  "state": "SP",
  "postalCode": "08900000",
  "country": "BR",
  "normalizedPostalCode": "08900000"
}
```

### 8.2 Regras

- CEP deve ser normalizado;
- campos livres devem aceitar ausência controlada;
- não exigir geocodificação nesta fase;
- frontend não deve tratar endereço como um único campo textual.

## 9. Estratégia para status e origem de cadastro

### 9.1 Status

Valores permitidos:

- `active`
- `inactive`
- `restricted`
- `pending_review`

### 9.2 Origem

Valores permitidos:

- `reception_manual`
- `administrative_manual`
- `patient_flow_quick_create`
- `migration`
- `integration`

## 10. Campos de auditoria

Mínimo exigido:

- `createdAt`
- `updatedAt`
- `createdByUserId`
- `updatedByUserId`
- `version`
- `status`
- `inactiveReason`

Auditoria de trilha deve ser complementada por eventos em `audit_events`.

## 11. Relacionamento com Paciente

### 11.1 Estado atual observado

- `patients.ownerId` já existe;
- `owner_patient_links` já existe;
- frontend atual de pacientes já aceita `tutorId`/`ownerId` em cenários simples.

### 11.2 Estratégia recomendada

Manter duas camadas:

- vínculo principal direto no paciente (`primaryTutorId` ou compatível com `ownerId`);
- vínculos adicionais na tabela/link de associação.

### 11.3 Estrutura de vínculo recomendada

```json
{
  "id": "link_01",
  "tutorId": "tutor_01",
  "patientId": "patient_01",
  "relationship": "guardian",
  "isPrimary": true,
  "canAuthorizeCare": true,
  "canReceiveClinicalUpdates": true,
  "canReceiveFinancialCharges": true,
  "createdAt": "2026-03-28T10:00:00Z"
}
```

## 12. Payloads recomendados

### 12.1 Create

```json
{
  "fullName": "Maria Helena de Souza",
  "document": {
    "type": "cpf",
    "number": "123.456.789-01"
  },
  "contacts": [
    {
      "label": "Celular principal",
      "type": "phone",
      "value": "(11) 99999-9999",
      "isPrimary": true,
      "isWhatsapp": true,
      "canReceiveClinicalMessages": true,
      "canReceiveFinancialMessages": true
    }
  ],
  "email": "maria@example.com",
  "address": {
    "street": "Rua Exemplo",
    "number": "123",
    "district": "Centro",
    "city": "Guararema",
    "state": "SP",
    "postalCode": "08900-000"
  },
  "preferredContactMethod": "whatsapp",
  "financialResponsible": true,
  "origin": "reception_manual",
  "administrativeNotes": "Primeiro cadastro realizado na recepção."
}
```

### 12.2 Update

`PATCH` deve aceitar atualização parcial, mas validar consistência final:

```json
{
  "contacts": [
    {
      "id": "contact_01",
      "label": "Celular principal",
      "type": "phone",
      "value": "(11) 98888-7777",
      "isPrimary": true,
      "isWhatsapp": true
    }
  ],
  "preferredContactMethod": "phone",
  "administrativeNotes": "Telefone atualizado na recepção."
}
```

### 12.3 Detail response

Deve retornar entidade expandida para UI:

- dados do tutor;
- pacientes vinculados resumidos;
- metadados de auditoria mínima;
- contatos já normalizados;
- status e origem.

### 12.4 List response

Deve retornar envelope paginado:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 0,
  "totalPages": 0
}
```

## 13. Diferença entre entrada, persistência e resposta

### DTO de entrada

- aceita formato amigável ao frontend;
- pode conter máscara em documento/telefone/CEP;
- não deve exigir campos derivados.

### Entidade persistida

- armazena valores normalizados;
- mantém compatibilidade com banco;
- registra auditoria mínima;
- não depende de representação visual.

### Resposta para frontend

- devolve campos suficientes para exibição;
- preserva ids internos necessários para edição;
- pode incluir estruturas derivadas úteis, como pacientes vinculados resumidos;
- não deve expor detalhes internos sem uso.
