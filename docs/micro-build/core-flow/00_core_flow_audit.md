# Auditoria do fluxo operacional principal

Data da auditoria: 2026-04-28

Escopo: Cliente/Tutor -> Pet/Paciente -> Agenda -> Atendimento -> Cobranca/Comanda.

Restricao aplicada: esta entrega nao altera codigo, API ou banco. O objetivo e mapear o estado atual e preparar microconstrucao.

## Veredito executivo

O fluxo existe parcialmente e permite navegar por boa parte da jornada, mas ainda nao esta pronto para uso real ponta a ponta em hospital veterinario sem risco operacional.

Pontos fortes confirmados:

- Cliente e Pet possuem telas dedicadas, listagem, detalhe e edicao.
- Criacao de pet a partir do tutor preserva `ownerId`.
- Pet para Agenda e Pet para Atendimento preservam `patientId` e `ownerId` em alguns atalhos.
- Agenda cria agendamento com `ownerId` e `patientId`, abre detalhe e possui acao para iniciar atendimento.
- Atendimento abre prontuario por `encounterId` e o prontuario cobre anamnese, exame fisico, avaliacao, plano, prescricao e conduta.
- Existe faturamento por atendimento em `/billing/:encounterId`.
- Existe Comandas em `/counter-sales`, com itens, pagamentos e status `open`, `closed`, `cancelled`.

Bloqueios para aceite final:

- A comanda comercial (`/counter-sales`) nao preserva `patientId` nem `encounterId` no modelo/backend; usa `ownerId` como ancora e infere pacientes/atendimentos do tutor.
- Alguns atalhos para comanda descartam contexto, principalmente de lista de clientes, lista/detalhe de pacientes e agenda.
- O botao principal de comanda no Atendimento aponta para `/counter-sales?encounterId=...&patientId=...&ownerId=...`, mas a tela so usa `ownerId` para selecionar comanda existente e abrir modal; `patientId` e `encounterId` nao entram na criacao.
- A tela de Billing por atendimento existe, mas na navegacao de Atendimento e Prontuario ela aparece misturada com o termo "Comanda", gerando dois caminhos financeiros concorrentes.
- Existem UUIDs exibidos como informacao primaria ou fallback para usuario final.
- Ha acoes perigosas sem confirmacao em Comandas: fechar, cancelar, reabrir, remover item e registrar pagamento.
- O detalhe do agendamento usa `confirm()` nativo para cancelar, mas iniciar atendimento nao pede confirmacao e pode criar/reusar atendimento.

## Etapa 1 - Cliente / Tutor

| Item | Mapeamento |
| --- | --- |
| Tela envolvida | Lista de Clientes, Detalhe do Cliente, Formulario de Cliente |
| Arquivo frontend provavel | `apps/spa/src/pages/owners/OwnersListPage.vue`, `OwnerDetailPage.vue`, `OwnerFormPage.vue` |
| Rota frontend | `/owners`, `/owners/:id`, `/owners/new`, `/owners/:id/edit` |
| Botoes/acoes existentes | Detalhes, Abrir comanda, Cadastrar Novo Animal, Agendar, Editar, Voltar, WhatsApp externo, Historico financeiro/orcamentos/pacotes |
| Query params usados | `ownerId` em `/patients/new?ownerId=...`, `/patients?ownerId=...`, `/appointments/new?ownerId=...`, `/counter-sales?ownerId=...`; opcional `patientId` em `counterSalesPath(ownerId, patientId)` |
| Servicos frontend chamados | `ownerService.listPage`, `ownerService.getById`, `ownerService.getSummary`, `ownerService.create`, `ownerService.update`, `patientService.list`, `appointmentService.list`, `encounterService.list`, `billingService.list`, `quoteService` |
| Endpoints backend chamados | `GET /owners`, `GET /owners/:id`, `GET /owners/:id/summary`, `POST /owners`, `PATCH /owners/:id`, `GET /patients?ownerId=...`, `GET /appointments`, `GET /encounters`, `GET /billing` |
| IDs a preservar | `ownerId` obrigatorio; `patientId` quando acao nasce em pet vinculado; nao ha `appointmentId`, `encounterId`, `medicalRecordId`, `billingId` nesta etapa |
| Permissoes necessarias | `owners.read`, `owners.manage`, `patients.read`, `scheduling.read`, `encounters.read`, `billing.read`, `counter_sale.read/write` para comanda |
| Problemas encontrados | Lista de clientes abre comanda sem `ownerId`; lista de animais dentro do card tambem abre `/counter-sales` sem contexto; "Agendar" a partir do tutor preserva apenas `ownerId`, exigindo escolha manual de pet |
| Perda de contexto | `OwnersListPage.vue` usa `to="/counter-sales"` em mais de um botao; `OwnerDetailPage.vue` preserva contexto melhor via `counterSalesPath` |
| UUID visivel | Lista mostra `owner.id` quando nao ha `legacyVetusId`; detalhe mostra `owner.id` no subtitulo; busca menciona ID |
| Acao perigosa | Nenhuma escrita destrutiva direta nesta tela; abrir comanda pode induzir criacao sem contexto completo |
| Estados vazios/loading/error | Lista tem `DsAlert` erro e empty state; detalhe tem skeleton e erro; formulario tem alertas de erro/sucesso |
| Riscos de regra | Agendar sem `patientId` a partir do tutor pode criar agenda com pet errado; comanda sem paciente/atendimento quebra rastreabilidade assistencial |

## Etapa 2 - Pet / Paciente

| Item | Mapeamento |
| --- | --- |
| Tela envolvida | Lista de Animais, Detalhe do Animal, Formulario de Animal |
| Arquivo frontend provavel | `apps/spa/src/pages/patients/PatientsListPage.vue`, `PatientDetailPage.vue`, `PatientFormPage.vue` |
| Rota frontend | `/patients`, `/patients?ownerId=...`, `/patients/:id`, `/patients/new?ownerId=...`, `/patients/:id/edit` |
| Botoes/acoes existentes | Detalhes, Abrir comanda, Abrir atendimento, Agendar, Editar, Ver cadastro do cliente, Abrir prontuario, Adicionar anamnese, salvar historico clinico |
| Query params usados | `ownerId` para filtro/lista e prefill de formulario; `patientId` + `ownerId` para `/appointments/new` e `/encounters/new`; `entry=anamnesis` para prontuario |
| Servicos frontend chamados | `patientService.listPage`, `patientService.getById`, `patientService.getSummary`, `patientService.create/update`, `ownerService`, `appointmentService`, `encounterService`, `medicalRecordsService`, `billingService`, `laboratoryService`, `prescriptionsService` |
| Endpoints backend chamados | `GET /patients`, `GET /patients/:id`, `GET /patients/:id/summary`, `POST /patients`, `PATCH /patients/:id`, `GET /owners/:id`, `GET /appointments`, `GET /encounters`, `GET /medical-records`, `GET /billing`, `POST /medical-records/entries` |
| IDs a preservar | `ownerId`, `patientId`; `encounterId` quando ha atendimento focal; `medicalRecordId` vem do prontuario; `billingId` nao existe no caminho de comanda comercial |
| Permissoes necessarias | `patients.read/manage`, `owners.read`, `scheduling.read/manage`, `encounters.read/manage`, `medical-records.read/manage`, `billing.read`, `counter_sale.read/write` |
| Problemas encontrados | Botao principal do detalhe aponta para `/counter-sales` sem query; lista aponta `/counter-sales` sem query; dados de historico dependem de varias listas globais e filtros client-side |
| Perda de contexto | Comanda a partir de paciente perde `ownerId`, `patientId` e `encounterId`; prontuario so fica disponivel se houver `focalEncounter` |
| UUID visivel | Lista mostra `ID {{ patient.id }}`; fallback `Cliente ${ownerId.slice(...)}`; detalhe mostra `ID` numerico/legado, mas pode cair em UUID/fallback |
| Acao perigosa | "Excluir Cadastro" aparece desabilitado; salvar historico cria/atualiza entrada sem revisao formal; sem destruicao direta nesta tela |
| Estados vazios/loading/error | Skeleton no detalhe; empty states por modulo; alertas de erro/sucesso; lista tem empty state |
| Riscos de regra | Paciente pode iniciar atendimento sem origem/agendamento; foco de atendimento escolhe atendimento ativo mais recente, podendo nao ser o episodio desejado |

## Etapa 3 - Agenda

| Item | Mapeamento |
| --- | --- |
| Tela envolvida | Cockpit Agenda, Formulario de Agendamento, Detalhe de Agendamento |
| Arquivo frontend provavel | `AppointmentsListPage.vue`, `AppointmentFormPage.vue`, `AppointmentDetailPage.vue`, `AppointmentQuickCreateForm.vue`, `AppointmentDetailsDrawer.vue` |
| Rota frontend | `/appointments`, `/appointments/new`, `/appointments/:id` |
| Botoes/acoes existentes | Criar agendamento, abrir formulario completo, abrir detalhe, check-in/fila, no-show, cancelar, iniciar atendimento, ver paciente, ver tutor |
| Query params usados | `ownerId`, `patientId`, `scheduledAt`, `durationMinutes`, `practitionerStaffId`, `visitType`, `serviceId`, `unit`, `specialty`, `resourceLabel`, `reason`, `appointmentId` |
| Servicos frontend chamados | `getSchedulingOverview`, `appointmentService.create`, `appointmentService.getById`, `appointmentService.cancel`, `appointmentService.startEncounter`, `checkInQueue`, `ownerService.getById`, `patientService.getById` |
| Endpoints backend chamados | `GET /scheduling/overview`, `GET /appointments`, `POST /appointments`, `GET /appointments/:id`, `POST /appointments/:id/cancel`, `POST /appointments/:id/start-encounter`, `GET /scheduling/availability`, `POST /scheduling/recommendations/duration`, `GET/POST /queue` |
| IDs a preservar | `ownerId`, `patientId`, `appointmentId`; ao iniciar atendimento gera/preserva `encounterId`; nao ha `medicalRecordId` direto |
| Permissoes necessarias | `scheduling.read`, `scheduling.manage`, `encounters.manage`, `owners.read`, `patients.read` |
| Problemas encontrados | `/appointments/new?ownerId=...` permite iniciar sem `patientId`; detalhe mostra `appointment.id` em subtitulo; cancelamento no cockpit nao tem confirmacao visivel no handler; abrir agenda por paciente lista eventos mas nao permite abrir detalhe diretamente no card do paciente |
| Perda de contexto | Agenda para comanda e fila podem perder contexto se usuario navegar por botoes globais `/counter-sales` e `/queue`; drawer sabe `appointmentId`, `ownerId`, `patientId`, mas a navegacao para atendimento so existe se `operational.encounterId` ja existe |
| UUID visivel | Fallback `Tutor ${ownerId.slice(0, 6)}`, `Paciente ${patientId.slice(0, 6)}`; detalhe mostra `Atendimento > Agenda • ${appointment.id}` |
| Acao perigosa | Cancelamento do detalhe tem `confirm()`; cancelamento/no-show pelo cockpit aparenta executar direto; iniciar atendimento executa POST sem confirmacao |
| Estados vazios/loading/error | Agenda tem acesso negado, loading spinner, agenda indisponivel, filtros; detalhe tem estado "Carregando ou agendamento nao encontrado" |
| Riscos de regra | Iniciar atendimento reaproveita atendimento ativo do paciente; se houver atendimento ativo nao relacionado ao agendamento, pode abrir o contexto errado |

## Etapa 4 - Atendimento

| Item | Mapeamento |
| --- | --- |
| Tela envolvida | Lista de Atendimentos, Abrir Atendimento, Detalhe do Atendimento |
| Arquivo frontend provavel | `EncountersListPage.vue`, `EncounterFormPage.vue`, `EncounterDetailPage.vue` |
| Rota frontend | `/encounters`, `/encounters/new?patientId=...&ownerId=...`, `/encounters/:id` |
| Botoes/acoes existentes | Abrir atendimento, ver, prontuario, receituario, cadastro do paciente, transicionar status, fechar atendimento, fechar financeiro, abrir orcamento, pedir exame, abrir comanda |
| Query params usados | `patientId`, `ownerId` para prefill do form; `encounterId`, `patientId`, `ownerId` no `workflowLink` para modulos auxiliares |
| Servicos frontend chamados | `encounterService.list/getById/create/transition/close/getTimeline/getSummary/getFinancialSummary/closeFinancial`, `attachmentService`, `patientService`, `entityCache` |
| Endpoints backend chamados | `GET /encounters`, `POST /encounters`, `GET /encounters/:id`, `GET /encounters/:id/timeline`, `GET /encounters/:id/summary`, `POST /encounters/:id/transition`, `POST /encounters/:id/close`, `GET /encounters/:encounterId/financial-summary`, `POST /encounters/:encounterId/financial-close` |
| IDs a preservar | `ownerId`, `patientId`, `appointmentId` se origem agenda, `encounterId`; prontuario por `encounterId`; financeiro por `encounterId` |
| Permissoes necessarias | `encounters.read`, `encounters.manage`, `medical-records.read/manage`, `billing.read/manage`, `counter_sale.read/write` |
| Problemas encontrados | Formulario le `ownerId`, mas confia no `patient.primaryOwnerId` quando paciente e carregado; nao le `appointmentId`; botao "Comanda" aponta para `/counter-sales` e nao para `/billing/:encounterId`; "Fechar Financeiro" esta separado da comanda comercial |
| Perda de contexto | Atendimento -> Comanda envia query completa, mas CounterSales ignora `patientId`/`encounterId` na persistencia; Atendimento -> Billing nao esta destacado como caminho principal |
| UUID visivel | Lista tem fallback `Paciente ${id.slice(0, 8)}...`; impressao/anexos podem exibir ids; workflow query carrega UUIDs na URL |
| Acao perigosa | Transicionar status executa ao clicar opcao; fechar financeiro executa sem segunda confirmacao; fechar atendimento usa modal com motivo, aceitavel |
| Estados vazios/loading/error | Skeleton no detalhe; timeline/anexos com loading e empty; lista com empty state |
| Riscos de regra | Fechamento financeiro pode ocorrer antes de revisar prontuario/comanda; atendimento pode ser aberto sem `appointmentId`, perdendo rastreabilidade da agenda |

## Etapa 5 - Cobranca / Comanda

| Item | Mapeamento |
| --- | --- |
| Tela envolvida | Faturamento por atendimento, Lista/Detalhe de Comandas comerciais |
| Arquivo frontend provavel | `BillingListPage.vue`, `BillingDetailPage.vue`, `CounterSalesPage.vue` |
| Rota frontend | `/billing`, `/billing/:encounterId`, `/counter-sales?ownerId=...&patientId=...&encounterId=...` |
| Botoes/acoes existentes | Novo Faturamento, Gerenciar, adicionar item, gerar estimativa, atualizar status; abrir nova comanda, adicionar produto/servico, remover item, registrar pagamento, fechar, cancelar, reabrir, imprimir |
| Query params usados | Billing: `encounterId` no service list; rota usa path param. CounterSales: le `ownerId`, `patientId`, `encounterId`, mas so usa `ownerId` para localizar/selecionar comanda e preencher busca do modal |
| Servicos frontend chamados | `billingService.list/getByEncounter/createEstimate/addItem/listItems/updateStatus`; `counterSalesService.list/getById/create/addItem/updateItem/removeItem/addPayment/close/cancel/reopen`; `ownerService`, `patientService`, `encounterService`, `medicalRecordsService`, `quoteService` |
| Endpoints backend chamados | `GET /billing`, `GET /billing/:encounterId`, `GET /billing/:encounterId/items`, `POST /billing/estimate`, `POST /billing/items`, `PATCH /billing/:encounterId/status`; `GET /counter-sales`, `POST /counter-sales`, `GET /counter-sales/:id`, `POST /counter-sales/:id/items`, `PATCH/DELETE /counter-sales/:id/items/:itemId`, `POST /counter-sales/:id/payments`, `POST /counter-sales/:id/close|cancel|reopen` |
| IDs a preservar | Billing preserva `encounterId`, `patientId`, `ownerId` dentro do record; CounterSales preserva apenas `ownerId`; nao ha `patientId`/`encounterId` no payload/modelo de comanda |
| Permissoes necessarias | `billing.read`, `billing.manage`, `counter_sale.read`, `counter_sale.write`, `owners.read`, `patients.read`, `encounters.read`, `medical-records.read` |
| Problemas encontrados | Dois conceitos concorrentes: `billing` por atendimento e `counter-sales` por tutor; CounterSales nao atende criterio de preservar `patientId`/`encounterId`; `BillingListPage` aponta para `/billing/new`, mas rota nao existe no mapa inspecionado |
| Perda de contexto | Atendimento/Pet/Tutor -> CounterSales perde paciente/atendimento na criacao; voltar para atendimento ou tutor depende de atalhos inferidos, nao do contexto original |
| UUID visivel | Billing mostra `encounterId.slice(...)`; CounterSales mostra `selectedSale.id`, `openedByUserId`, `accountId`; impressao inclui ids de atendimento completos |
| Acao perigosa | Remover item, registrar pagamento, fechar, cancelar e reabrir comanda sem confirmacao modal; gerar estimativa/status de billing sem confirmacao contextual forte |
| Estados vazios/loading/error | Billing tem skeleton/alert/empty items; CounterSales tem loading, empty, integration warnings, alertas operacionais |
| Riscos de regra | Cobranca pode ser aberta para tutor errado ou sem paciente; comanda pode ser cancelada/fechada acidentalmente; pagamento pode ser registrado na comanda errada |

## Conclusao de prontidao

O fluxo nao cumpre o criterio final. A construcao deve priorizar:

1. Definir caminho financeiro canonico para atendimento: Billing por `encounterId` ou Comanda com `encounterId`.
2. Corrigir todos os deep links para preservar `ownerId`, `patientId`, `appointmentId` e `encounterId`.
3. Impedir exibicao de UUID como nome principal.
4. Adicionar confirmacao nas acoes financeiras perigosas.
5. Validar ponta a ponta com um caso real: tutor -> pet -> agenda -> atendimento -> prontuario -> cobranca -> retorno ao tutor/pet.
