# Microbacklog priorizado do fluxo principal

## P0 - Fluxo quebrado ou acao perigosa

### CF-P0-001 - Definir destino financeiro canonico do atendimento

- Descricao: decidir se "Comanda" do atendimento usa `/billing/:encounterId` ou se `/counter-sales` passara a persistir `patientId` e `encounterId`.
- Etapa do fluxo: Atendimento -> Cobranca.
- Arquivo provavel: `EncounterDetailPage.vue`, `MedicalRecordsDetailPage.vue`, `CounterSalesPage.vue`, `counter-sales-routes.ts`, `packages/modules/counter-sales/src/index.ts`.
- Risco: alto; sem essa decisao, a cobranca segue sem rastreabilidade clinica.
- Dependencias: nenhuma.
- Criterio de aceite: uma unica acao principal de cobranca preserva `ownerId`, `patientId`, `encounterId` sem redigitacao.
- Checklist: abrir atendimento; clicar cobranca; confirmar tutor/pet/atendimento; adicionar item; voltar ao atendimento.

### CF-P0-002 - Corrigir links de comanda que descartam contexto

- Descricao: mapear e substituir links `/counter-sales` soltos por links com `ownerId` e, quando disponivel, `patientId`/`encounterId`.
- Etapa do fluxo: Cliente, Pet, Atendimento, Cobranca.
- Arquivo provavel: `OwnersListPage.vue`, `PatientDetailPage.vue`, `PatientsListPage.vue`, `AppointmentsListPage.vue`.
- Risco: alto; lancamento financeiro em contexto errado.
- Dependencias: CF-P0-001.
- Criterio de aceite: nenhum botao "Abrir comanda" sai de tutor/pet/atendimento sem levar contexto minimo.
- Checklist: tutor -> comanda; pet -> comanda; atendimento -> comanda; validar URL e dados exibidos.

### CF-P0-003 - Confirmar acoes financeiras perigosas

- Descricao: adicionar confirmacao antes de fechar, cancelar, reabrir comanda, remover item e registrar pagamento.
- Etapa do fluxo: Cobranca.
- Arquivo provavel: `apps/spa/src/pages/sales/CounterSalesPage.vue`.
- Risco: alto; perda financeira/acidental.
- Dependencias: nenhuma.
- Criterio de aceite: toda acao financeira irreversivel ou sensivel mostra resumo da comanda e exige confirmacao.
- Checklist: tentar remover item; registrar pagamento; fechar; cancelar; reabrir.

### CF-P0-004 - Resolver rota inexistente `/billing/new`

- Descricao: remover, redirecionar ou contextualizar "Novo Faturamento" para exigir `encounterId`.
- Etapa do fluxo: Cobranca.
- Arquivo provavel: `apps/spa/src/pages/billing/BillingListPage.vue`, `apps/spa/src/router/routes.ts`.
- Risco: alto; rota ambigua pode abrir detalhe invalido.
- Dependencias: CF-P0-001.
- Criterio de aceite: nao existe caminho de novo faturamento sem atendimento.
- Checklist: clicar "Novo Faturamento"; validar que pede atendimento ou remove acao.

### CF-P0-005 - Proteger iniciar atendimento a partir da agenda

- Descricao: antes de `start-encounter`, mostrar tutor, pet, agendamento e se sera criado ou reutilizado atendimento.
- Etapa do fluxo: Agenda -> Atendimento.
- Arquivo provavel: `AppointmentDetailPage.vue`, `AppointmentsListPage.vue`, `AppointmentDetailsDrawer.vue`.
- Risco: alto; atendimento errado pode ser reutilizado.
- Dependencias: nenhuma.
- Criterio de aceite: usuario confirma contexto antes do POST.
- Checklist: agendamento sem atendimento; agendamento com atendimento ativo do paciente; cancelar confirmacao.

## P1 - Perda de contexto entre telas

### CF-P1-001 - Preservar `appointmentId` em `/encounters/new`

- Descricao: aceitar `appointmentId` no formulario de atendimento e enviar ao backend quando aplicavel.
- Etapa do fluxo: Agenda -> Atendimento.
- Arquivo provavel: `EncounterFormPage.vue`, `encounterService`, `encounters` backend.
- Risco: medio/alto.
- Dependencias: contrato de `CreateEncounterRequest` aceitar `appointmentId`.
- Criterio de aceite: atendimento manual originado da agenda preserva `appointmentId`.
- Checklist: abrir `/encounters/new?appointmentId=...&patientId=...&ownerId=...`; salvar; verificar detalhe.

### CF-P1-002 - Linkar agendamentos na ficha do pet

- Descricao: tornar cada agendamento listado no pet um link para `/appointments/:id`.
- Etapa do fluxo: Pet -> Agenda.
- Arquivo provavel: `PatientDetailPage.vue`.
- Risco: medio.
- Dependencias: nenhuma.
- Criterio de aceite: usuario abre o agendamento exato a partir da ficha do pet.
- Checklist: pet com agenda futura; clicar item; validar `appointmentId`.

### CF-P1-003 - Padronizar `returnTo`/origem de navegacao

- Descricao: incluir retorno contextual entre tutor, pet, agenda, atendimento, prontuario e cobranca.
- Etapa do fluxo: todas.
- Arquivo provavel: paginas de owners/patients/appointments/encounters/medical-records/billing/counter-sales.
- Risco: medio.
- Dependencias: definicao simples de query `returnTo` ou estado de rota.
- Criterio de aceite: usuario volta para tutor/pet sem perder contexto.
- Checklist: tutor -> pet -> agenda -> atendimento -> billing/comanda -> voltar.

### CF-P1-004 - Usar `patientId` ao agendar a partir de um pet do tutor

- Descricao: em cards/listas de pets dentro do tutor, "Agendar" deve carregar tutor e pet.
- Etapa do fluxo: Cliente -> Pet -> Agenda.
- Arquivo provavel: `OwnerDetailPage.vue`, `OwnersListPage.vue`.
- Risco: medio.
- Dependencias: nenhuma.
- Criterio de aceite: agendamento iniciado em linha de pet abre form com tutor e pet preenchidos.
- Checklist: tutor com dois pets; agendar o segundo; validar paciente selecionado.

### CF-P1-005 - Selecionar comanda por contexto completo

- Descricao: quando entrar em `/counter-sales?ownerId&patientId&encounterId`, nao selecionar primeira comanda do tutor se ela nao corresponder ao atendimento.
- Etapa do fluxo: Atendimento -> Cobranca.
- Arquivo provavel: `CounterSalesPage.vue`.
- Risco: medio/alto.
- Dependencias: CF-P0-001.
- Criterio de aceite: a tela cria/seleciona comanda do atendimento correto ou informa que nao existe.
- Checklist: tutor com duas comandas; abrir atendimento especifico; validar selecao.

## P2 - UX/confusao visual

### CF-P2-001 - Remover UUID como informacao primaria

- Descricao: substituir fallbacks com UUID por "Nao carregado", numero amigavel ou nome resolvido.
- Etapa do fluxo: todas.
- Arquivo provavel: `AppointmentsListPage.vue`, `PatientsListPage.vue`, `EncountersListPage.vue`, `MedicalRecordsListPage.vue`, `BillingListPage.vue`, `CounterSalesPage.vue`.
- Risco: medio.
- Dependencias: estrategia de labels amigaveis.
- Criterio de aceite: nenhum titulo/card principal usa UUID.
- Checklist: simular lookup falho; validar fallback nao tecnico.

### CF-P2-002 - Separar "Comanda" e "Faturamento"

- Descricao: revisar textos para distinguir comanda comercial, billing por atendimento e contas a receber.
- Etapa do fluxo: Cobranca.
- Arquivo provavel: `EncounterDetailPage.vue`, `MedicalRecordsDetailPage.vue`, `BillingListPage.vue`, `CounterSalesPage.vue`.
- Risco: medio.
- Dependencias: CF-P0-001.
- Criterio de aceite: usuario entende qual tela esta abrindo e qual contexto sera usado.
- Checklist: revisar botoes de atendimento/prontuario/billing/comandas.

### CF-P2-003 - Melhorar not found/loading de agendamento

- Descricao: separar loading, erro e agendamento nao encontrado.
- Etapa do fluxo: Agenda.
- Arquivo provavel: `AppointmentDetailPage.vue`.
- Risco: baixo.
- Dependencias: nenhuma.
- Criterio de aceite: erro de API nao aparece como "carregando".
- Checklist: abrir id invalido; simular erro; abrir valido.

### CF-P2-004 - Exibir resumo fixo de contexto

- Descricao: em agenda, atendimento, prontuario e cobranca, mostrar bloco compacto com Tutor, Pet, Atendimento e Status.
- Etapa do fluxo: Agenda, Atendimento, Cobranca.
- Arquivo provavel: `AppointmentDetailPage.vue`, `EncounterDetailPage.vue`, `MedicalRecordsDetailPage.vue`, `BillingDetailPage.vue`, `CounterSalesPage.vue`.
- Risco: baixo/medio.
- Dependencias: dados carregados por service.
- Criterio de aceite: operador sabe em qual tutor/pet/episodio esta antes de agir.
- Checklist: navegar entre telas e conferir bloco.

## P3 - Polish, responsividade e textos

### CF-P3-001 - Reorganizar acoes rapidas por prioridade operacional

- Descricao: ordenar acoes como primarias, secundarias e historico, reduzindo excesso visual.
- Etapa do fluxo: Cliente, Pet, Atendimento, Cobranca.
- Arquivo provavel: detalhes de owner/patient/encounter/counter-sales.
- Risco: baixo.
- Dependencias: definicao de fluxo canonico.
- Criterio de aceite: a proxima acao natural fica evidente em cada etapa.
- Checklist: revisar desktop e mobile.

### CF-P3-002 - Padronizar breadcrumbs do fluxo

- Descricao: usar trilha coerente Cliente -> Pet -> Agenda -> Atendimento -> Cobranca.
- Etapa do fluxo: todas.
- Arquivo provavel: todas as paginas do fluxo.
- Risco: baixo.
- Dependencias: `returnTo`/contexto.
- Criterio de aceite: breadcrumbs refletem origem quando houver contexto.
- Checklist: navegar pelo fluxo completo.

### CF-P3-003 - Revisar textos de empty state com acao contextual

- Descricao: empty states devem sugerir a proxima acao preservando IDs.
- Etapa do fluxo: Cliente, Pet, Agenda, Atendimento, Cobranca.
- Arquivo provavel: listas e detalhes.
- Risco: baixo.
- Dependencias: links contextuais.
- Criterio de aceite: pet sem agenda oferece criar agenda do pet; atendimento sem billing oferece criar billing do atendimento.
- Checklist: validar cenarios vazios.
