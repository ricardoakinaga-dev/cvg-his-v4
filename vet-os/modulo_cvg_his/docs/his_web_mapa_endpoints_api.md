# Mapa de Contratos de Endpoint (`apps/his-api`)

Este documento lista todos os endpoints identificados na API, seus contratos (input/output) e padrões.

## 1. Padrões Gerais
- **Framework**: Fastify + Zod.
- **Prefixo Global**: Nenhum (Rotas montadas na raiz ou com prefixos de módulo em `routes/index.ts`).
- **Autenticação**: **Gateway Offloaded / Trust-Based**.
  - A API **NÃO** valida tokens `Bearer`.
  - A identidade é extraída dos headers: `x-account-id`, `x-user-id`, `x-role`, `x-unit-id`.
  - **Login**: Não existe endpoint de login na API. O token é gerenciado externamente.
- **Paginação**: Query params `page` (default 1) e `pageSize` (default 20).
- **Respostas de Erro**: `{ message: string }` (com status correspondente 404, 409, 422).

## 2. Endpoints por Recurso

### Auth / RBAC / System
| Método | Rota | Descrição | Input (Body/Query) | Output |
|---|---|---|---|---|
| `GET` | `/admin/test` | Teste de permissão admin | - | `{ ok: true, permission: string }` |
| `GET` | `/audit/test` | Teste de permissão audit | - | `{ ok: true, permission: string }` |
| `GET` | `/rbac/catalog` | Lista permissões e roles | - | `{ permissions: [], rolePermissions: {} }` |
| `POST` | `/system/ping-job` | Teste de fila (Admin) | - | `{ ok: true, jobId: string }` |

### Owners (Tutores)
*Prefixo: `/owners`*

| Método | Rota | Descrição | Input | Output |
|---|---|---|---|---|
| `POST` | `/` | Criar owner | `CreateOwnerBodySchema` | `Owner` (201) |
| `GET` | `/` | Listar owners | `q`, `page`, `pageSize` | `{ data: Owner[], total, page }` |
| `GET` | `/:id` | Obter owner | - | `Owner` |
| `PATCH` | `/:id` | Atualizar owner | `UpdateOwnerBodySchema` | `Owner` |
| `GET` | `/:id/summary` | Resumo completo | - | `OwnerSummaryResponse` |

### Patients (Pacientes)
*Prefixo: `/patients`*

| Método | Rota | Descrição | Input | Output |
|---|---|---|---|---|
| `POST` | `/` | Criar paciente | `CreatePatientBodySchema` | `Patient` (201) |
| `GET` | `/` | Listar pacientes | `ownerId`, `q`, `page`... | `{ data: Patient[], total... }` |
| `GET` | `/:id` | Obter paciente | - | `Patient` |
| `PATCH` | `/:id` | Atualizar paciente | `UpdatePatientBodySchema` | `Patient` |
| `GET` | `/:id/summary` | Prontuário Resumido | - | `PatientSummaryResponse` |

### Encounters (Atendimentos)
*Prefixo: `/encounters`*

| Método | Rota | Descrição | Input | Output |
|---|---|---|---|---|
| `POST` | `/` | Iniciar atendimento | `EncounterCreateSchema` | `Encounter` (201) |
| `GET` | `/` | Listar atendimentos | `patientId`, `page`... | `{ data: Encounter[], total... }` |
| `GET` | `/:id` | Obter detalhes | - | `Encounter` |
| `POST` | `/:id/close` | Encerrar atendimento | `EncounterCloseSchema` | `Encounter` |
| `GET` | `/:id/timeline` | Linha do tempo completa | - | `EncounterTimelineResponse` |

### Clinical Notes (Prontuário/SOAP)
*Sem prefixo global, rotas mistas*

| Método | Rota | Descrição | Input | Output |
|---|---|---|---|---|
| `POST` | `/encounters/:id/notes` | Criar nota (Draft) | `NoteCreateBodySchema` | `ClinicalNote` (201) |
| `GET` | `/notes/:id` | Ler nota | - | `ClinicalNote` |
| `PATCH` | `/notes/:id` | Atualizar rascunho | `NoteUpdateBodySchema` | `ClinicalNote` |
| `POST` | `/notes/:id/version` | Versionar nota | `NoteUpdateBodySchema` | `{ note, event }` |
| `POST` | `/notes/:id/sign` | Assinar nota | - | `{ note, event }` |
| `GET` | `/soap-templates` | Templates de texto | - | `{ data: SoapTemplate[] }` |

### Internação (Inpatient, Wards, Beds)

**Wards** (*Prefixo: `/wards`*)
| Método | Rota | Descrição | Input | Output |
|---|---|---|---|---|
| `GET` | `/` | Listar alas | - | `{ data: Ward[] }` |
| `POST` | `/` | Criar ala | `WardCreateSchema` | `Ward` |
| `PATCH` | `/:id` | Editar ala | `WardUpdateSchema` | `Ward` |

**Beds** (*Prefixo: `/beds`*)
| Método | Rota | Descrição | Input | Output |
|---|---|---|---|---|
| `GET` | `/` | Listar leitos | `wardId`, `q` | `{ data: Bed[] }` |
| `POST` | `/` | Criar leito | `BedCreateSchema` | `Bed` |
| `PATCH` | `/:id` | Editar leito | `BedUpdateSchema` | `Bed` |
| `GET` | `/map` | Mapa de leitos (gráfico) | `wardId` | `BedMapResponse` |

**Inpatient Stays** (*Prefixo: `/inpatient`*)
| Método | Rota | Descrição | Input | Output |
|---|---|---|---|---|
| `POST` | `/admit` | Internar paciente | `InpatientAdmitSchema` | `Stay` |
| `GET` | `/stays` | Listar internações | `status`, `wardId` | `{ data: Stay[] }` |
| `GET` | `/stays/:id` | Detalhes da internação | - | `Stay` |
| `POST` | `/stays/:id/transfer` | Transferir de leito | `InpatientTransferSchema` | `Stay` |
| `POST` | `/stays/:id/discharge` | Alta médica | `InpatientDischargeSchema` | `Stay` |

**Handovers** (*Prefixo: `/handovers`*)
| Método | Rota | Descrição | Input | Output |
|---|---|---|---|---|
| `POST` | `/draft` | Criar rascunho | `HandoverDraftSchema` | `Handover` |
| `POST` | `/:id/publish` | Publicar plantão | `HandoverPublishSchema` | `Handover` |
| `GET` | `/latest` | Último publicado | `wardId` | `Handover` |
| `GET` | `/:id/document` | PDF/Doc gerado | - | `Document` |

### Farmácia / Prescrições
*Prefixos variados*

| Método | Rota | Prefixo | Input | Output |
|---|---|---|---|---|
| `POST` | `/` | `/medication-orders` | `MedicationOrderCreate` | `Order` |
| `GET` | `/` | `/medication-orders` | `encounterId`, `stayId` | `{ data: Order[] }` |
| `PATCH` | `/:id` | `/medication-orders` | `MedicationOrderUpdate` | `Order` |
| `POST` | `/:id/stop` | `/medication-orders` | `MedicationOrderStop` | `Order` |
| `POST` | `/` | `/medication-administrations` | `MedAdministrationCreate` | `Administration` |
| `GET` | `/` | `/medication-logs` | `stayId` | `MedicationLogsResponse` |

### Outros (Search, Alerts, Protocols, Documents)

| Método | Rota | Descrição | Input | Output |
|---|---|---|---|---|
| `GET` | `/search` | Busca global | `q` | `{ owners: [], patients: [] }` |
| `GET` | `/alerts` | Alertas sistêmicos | `stayId` | `Alert[]` |
| `POST` | `/documents` | Upload metadata | `DocumentCreateSchema` | `Document` |
| `POST` | `/encounters/:id/documents` | Anexar doc | `{ documentId }` | `Relation` |
| `GET` | `/protocols` | Listar protocolos | - | `{ data: Protocol[] }` |
| `POST` | `/protocols` | Criar protocolo | `ProtocolCreateSchema` | `Protocol` |

## 3. Observações Críticas
1.  **Swagger/OpenAPI**: NÃO encontrado. A documentação deve ser baseada nos Schemas Zod exportados de `@cvg-his/domain`.
2.  **Segurança**: A API confia cegamente nos headers `x-account-id` etc. Em produção, é CRUCIAL ter um Gateway (Kong/Nginx) que limpe esses headers do tráfego externo e/ou valide o JWT antes de encaminhar.
3.  **Client-Side**: O frontend está injetando esses headers manualmente via sessão simulada (`src/lib/auth.ts` no web). Isso deve ser mantido durante a integração.
