# Rotas e Integrações da Tela de Detalhe do Cliente/Tutor

## Rota frontend

| Item | Valor |
|---|---|
| Rota atual | `/owners/:id` |
| Nome da rota | `OwnerDetail` |
| Componente/page | `apps/spa/src/pages/owners/OwnerDetailPage.vue` |
| Definição | `apps/spa/src/router/routes.ts` |
| Meta | título `Detalhes do Cliente`, breadcrumb `Detalhes`, parent `Clientes` |
| URL de referência | `/owners/owner_maria_silva` |

## Chamadas feitas pela page

| Chamada | Serviço frontend | Endpoint | Uso na tela | Observação |
|---|---|---|---|---|
| Tutor por ID | `ownerService.getById(id)` | `GET /owners/:id` | Header, cadastro, contatos, financeiro básico | Fonte principal do tutor |
| Pets do tutor | `patientService.list({ ownerId })` | `GET /patients?ownerId=:id` | Animais cadastrados e contadores | Contextualizada corretamente |
| Agenda | `appointmentService.list()` | `GET /appointments` | Agenda vinculada, próximo atendimento | Busca global e filtra no frontend |
| Atendimentos | `encounterService.list()` | `GET /encounters` | Últimos atendimentos, CRM e alertas | Busca global e filtra no frontend |
| Summary | `ownerService.getSummary(id)` | `GET /owners/:id/summary` | Resumo técnico | Parcial; só total de pets e atendimentos |
| Financeiro | `billingService.list()` | `GET /billing` | Comandas, pendências e totais | Busca global e filtra no frontend |
| Orçamentos | `quoteService.list()` | `GET /quotes` | Orçamentos, pacotes, CRM | Busca global e filtra no frontend |
| Criar orçamento-base | `quoteService.create({ ownerId, notes })` | `POST /quotes` | Ação `Gerar orçamento-base` | Ação real sem confirmação |
| Criar orçamento de pacote | `quoteService.create({ ownerId, notes })` | `POST /quotes` | Ação `Criar orçamento` | Ação real sem confirmação |

## Endpoints backend diretamente relacionados

### Owners

Arquivo: `apps/api/src/routes/owners-routes.ts`.

- `GET /owners`: lista tutores, requer `owners.read`.
- `POST /owners`: cria tutor, requer `owners.manage`.
- `GET /owners/:id/summary`: retorna tutor, pets resumidos e total de atendimentos, requer `owners.read`.
- `GET /owners/:id`: retorna tutor por ID, requer `owners.read`.
- `PATCH /owners/:id`: atualiza tutor, requer `owners.manage`.
- `DELETE /owners/:id`: soft delete via status `inactive`, requer `owners.manage`.

Observações:

- ABAC por `x-sector-code` existe em owners quando o header é enviado.
- A tela atual não mostra permissão de ação; precisa validação se o shell oculta ações sem `owners.manage`.
- `GET /owners/:id/summary` é limitado e não substitui o carregamento de módulos relacionados.

### Patients

Arquivo: `apps/api/src/routes/patients-routes.ts`.

- `GET /patients?ownerId=:id`: lista pets do tutor, requer `patients.read`.
- `GET /patients/:id`: abre ficha do pet, requer `patients.read`.
- `POST /patients`: cria pet, requer `patients.manage`.
- `GET /owner-patient-links?ownerId=:id`: lista vínculos, requer `patients.read`.

Observações:

- A tela usa `primaryOwnerId`, não usa links secundários/financeiros.
- Dependência com vínculos secundários precisa validação.

### Appointments / Scheduling

Serviço frontend chama:

- `GET /appointments`.
- Links visuais apontam para `/appointments/new?ownerId=:id` e `/appointments`.

Observações:

- A tela filtra agenda no frontend.
- Não há link por item para `/appointments/:id` ou drawer de detalhe nesta tela.
- A rota de criação recebe `ownerId`, mas sem `patientId`.

### Encounters

Serviço frontend chama:

- `GET /encounters`.

Links esperados, mas ausentes:

- Abrir atendimento existente.
- Iniciar novo atendimento contextualizado por pet.

Observações:

- A tela filtra atendimentos no frontend.
- Não há endpoint agregador de histórico recente por owner usado pela tela.

### Billing / Comandas

Serviço frontend chama:

- `GET /billing`.

Links atuais:

- `/counter-sales`.
- `/billing`.

Observações:

- `Abrir Nova Comanda` e `Abrir Comanda` não passam `ownerId` nem `patientId`.
- A tela calcula totais em frontend a partir de lista global.
- Precisa validação se `/counter-sales?ownerId=...` já é suportado em todas as entradas.

### Quotes / Pacotes

Serviço frontend chama:

- `GET /quotes`.
- `POST /quotes`.

Observações:

- Criação de orçamento é ação real.
- Pacotes sugeridos não usam endpoint de pacotes; são inferências locais.
- `Pacotes` no hub aponta para `/packages`, precisa validação de rota e filtro por owner.

### Documents / Attachments

Estado atual da tela:

- Não há bloco de documentos/anexos.
- Há serviço `attachments.ts` no frontend e módulo de attachments no backend, mas a page não usa.

Necessidade:

- Mapear endpoint correto por entidade `owner` antes de implementar bloco.
- Marcar como precisa validação.

### Inpatient / Hospitalization

Estado atual da tela:

- Não há bloco de internação no detalhe do tutor.
- A dependência existe indiretamente pelos pets e atendimentos.

Necessidade:

- Exibir apenas resumo por pet ou histórico recente se houver endpoint consolidado.
- Precisa validação para não duplicar cockpit do paciente.

### CRM / Comunicação

Estado atual:

- `crmStage`, `contextualMessages` e `packageRecommendations` são computados localmente.
- WhatsApp usa link `https://wa.me/{numero}`.
- `Hub WhatsApp` aponta para `/notifications/whatsapp`.

Riscos:

- Comunicação pode parecer enviada pelo sistema quando é apenas link externo.
- Consentimento, preferências e auditoria de envio não são visíveis.
- Precisa validação com módulos de WhatsApp, SMS e e-mail.

## Services, hooks e stores envolvidos

| Camada | Arquivo | Papel |
|---|---|---|
| Page | `OwnerDetailPage.vue` | Orquestra todos os dados e ações |
| Owners service | `apps/spa/src/services/owner.ts` | CRUD e summary do tutor |
| Patients service | `apps/spa/src/services/patient.ts` | Lista pets por owner |
| Appointments service | `apps/spa/src/services/appointment.ts` | Lista agenda global |
| Encounters service | `apps/spa/src/services/encounter.ts` | Lista atendimentos globais |
| Billing service | `apps/spa/src/services/billing.ts` | Lista financeiro global |
| Quotes service | `apps/spa/src/services/quotes.ts` | Lista/cria orçamentos |
| API client | `apps/spa/src/services/api.ts` | Base `/api`, auth e erros |
| Tipos owner | `apps/spa/src/types/owner.ts` | Contrato frontend |
| Tipos shared | `packages/shared/types/src/index.ts` | Contrato canônico |
| Contracts | `packages/shared/contracts/src/index.ts` | Payloads backend |

Não foram identificados stores dedicados para owners nesta tela. O estado fica local na page.

## Permissões necessárias

| Ação | Permissão provável |
|---|---|
| Ver tutor | `owners.read` |
| Editar tutor | `owners.manage` |
| Criar tutor | `owners.manage` |
| Ver pets | `patients.read` |
| Criar pet | `patients.manage` |
| Ver agenda | permissão de scheduling/appointments, precisa validação |
| Criar agendamento | permissão de scheduling/appointments manage, precisa validação |
| Ver atendimentos | permissão de encounters read, precisa validação |
| Iniciar atendimento | permissão de encounters manage, precisa validação |
| Ver financeiro | permissão de billing read, precisa validação |
| Criar comanda | permissão de counter-sales/billing manage, precisa validação |
| Criar orçamento | permissão de quotes manage, precisa validação |
| Ver auditoria | `audit.read` |
| Enviar WhatsApp/SMS/e-mail | permissão de notifications, precisa validação |

## Inconsistências frontend/backend

- A page usa muitos endpoints globais e filtra no cliente; isso pode vazar custo operacional e gerar lentidão em bases grandes.
- `ownerSummary` existe no backend, mas é pouco usado e limitado.
- `loyaltyPoints` é calculado localmente mesmo existindo serviço comercial de fidelidade em `commercial.ts`.
- `packageRecommendations` é totalmente local; não há origem backend.
- `crmStage` é local; não há contrato de CRM.
- Histórico, financeiro, documentos e auditoria não têm agregador por tutor na tela.
- A rota de comanda não recebe contexto em ações importantes.

## Matriz de dependências por módulo

| Módulo | Uso atual na tela | Arquivos/serviços | Problema | Próximo passo |
|---|---|---|---|---|
| Pets / Patients | Lista pets vinculados e abre ficha | `patientService.list({ ownerId })`, `/patients?ownerId=...` | Não usa vínculos secundários/financeiros | Validar `owner-patient-links` quando houver múltiplos vínculos |
| Appointments / Scheduling | Mostra agenda futura | `appointmentService.list()`, `/appointments` | Lista global filtrada no frontend | OWNER-P2-001 |
| Encounters | Mostra atendimentos recentes/ativos | `encounterService.list()`, `/encounters` | Lista global filtrada no frontend | OWNER-P2-001 |
| Invoices / Billing / Comandas | Mostra pendências e totais | `billingService.list()`, `/billing`, links `/counter-sales` | Lista global e links sem contexto | OWNER-P2-002 e OWNER-P0-001 |
| Quotes / Packages | Lista/cria orçamentos e simula pacotes | `quoteService.list/create`, `/quotes` | Pacotes são inferências locais | OWNER-P0-003 e OWNER-P2-004 |
| Hospitalization / Inpatient | Não aparece diretamente | Módulo existe, sem uso nesta page | Dependência indireta por pet/atendimento | Precisa validação antes de expor resumo |
| Documents / Attachments | Ausente | `attachments.ts` existe, sem uso nesta page | Fluxo esperado incompleto | OWNER-P2-006 |
| CRM / Comunicação | CRM, templates e WhatsApp locais | computeds locais, `/notifications/whatsapp` | Sem contrato/consentimento visível | OWNER-P0-004 e OWNER-P2-004 |
| Audit / Logs | Ausente como bloco | `/audit/events` existe em access-control routes | Rastreabilidade não aparece na tela | OWNER-P2-007 |
| Access Control | Backend exige permissões | `owners.read`, `owners.manage`, demais precisam validação | Botões não mostram checagem local clara | OWNER-P2-008 |
