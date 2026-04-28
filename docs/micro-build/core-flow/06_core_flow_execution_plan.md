# Plano de execucao de microconstrucao

Este plano respeita a ordem solicitada e parte do principio de mudancas pequenas, verificaveis e sem refatoracao ampla.

## FASE 0 - Auditoria e mapa do fluxo

Status: concluida nesta pasta.

Entregas:

- `00_core_flow_audit.md`
- `01_core_flow_route_map.md`
- `02_core_flow_context_ids.md`
- `03_core_flow_broken_links.md`
- `04_core_flow_ux_problems.md`
- `05_core_flow_micro_backlog.md`
- `06_core_flow_execution_plan.md`
- `07_core_flow_validation_checklist.md`

Saida esperada:

- Mapa de telas, rotas, services, endpoints, IDs, permissoes e riscos.

## FASE 1 - Preservar contexto entre Cliente -> Pet

Objetivo:

- Garantir que toda saida do tutor para pet mantenha `ownerId`.

Microtarefas:

- CF-P0-002 parcialmente: corrigir links soltos de comanda no contexto de cliente.
- CF-P1-004: agendar a partir de pet listado no tutor com `ownerId` e `patientId`.
- CF-P3-003: empty state de tutor sem pet deve criar pet com `ownerId`.

Validacao:

- Abrir `/owners/:id`.
- Clicar "Cadastrar Novo Animal".
- Confirmar que `/patients/new?ownerId=:ownerId` preenche tutor.
- Salvar pet e voltar para `/patients/:id` ou `/owners/:id` sem redigitar ID.

## FASE 2 - Preservar contexto entre Pet -> Agenda

Objetivo:

- Todo agendamento iniciado no pet deve levar `ownerId` e `patientId`.

Microtarefas:

- CF-P1-002: linkar agendamentos da ficha do pet.
- CF-P1-004: garantir pet especifico em acoes de agenda dentro do tutor.
- Revisar `AppointmentQuickCreateForm` para bloquear paciente fora do tutor quando ambos vierem por query.

Validacao:

- Abrir pet a partir do tutor.
- Clicar "Agendar".
- Confirmar tutor e paciente preenchidos.
- Criar agendamento e abrir `/appointments/:id`.

## FASE 3 - Preservar contexto entre Agenda -> Atendimento

Objetivo:

- Converter agenda em atendimento preservando `appointmentId`, `ownerId`, `patientId` e gerando `encounterId` correto.

Microtarefas:

- CF-P0-005: confirmacao antes de iniciar atendimento.
- CF-P1-001: suportar `appointmentId` em `/encounters/new` se o caminho manual existir.
- Ajustar feedback quando backend reutilizar atendimento ativo.

Validacao:

- Criar agendamento.
- Abrir detalhe.
- Iniciar atendimento.
- Confirmar que atendimento mostra pet/tutor corretos e origem agenda.
- Validar que o agendamento nao fica em estado ambiguo.

## FASE 4 - Organizar Prontuario Clinico

Objetivo:

- Consolidar o prontuario como etapa clinica do atendimento, sem UUID como identidade primaria.

Microtarefas:

- CF-P2-001: remover UUID como titulo/fallback.
- CF-P2-004: resumo fixo tutor/pet/atendimento.
- Revisar bloco "Timeline tecnica e IDs" para ficar recolhido e nao aparecer como informacao operacional.

Validacao:

- Abrir `/medical-records/:encounterId`.
- Registrar anamnese, exame fisico, avaliacao, plano, prescricao e conduta.
- Voltar ao atendimento mantendo `encounterId`.

## FASE 5 - Preservar contexto entre Atendimento -> Cobranca

Objetivo:

- Garantir cobranca/comanda vinculada ao atendimento correto.

Decisao obrigatoria antes da implementacao:

- Caminho A: usar Billing por atendimento como cobranca principal (`/billing/:encounterId`).
- Caminho B: expandir Comandas para persistir `patientId` e `encounterId`.

Microtarefas:

- CF-P0-001: decidir destino canonico.
- CF-P0-002: corrigir links de comanda.
- CF-P0-003: confirmacoes financeiras.
- CF-P0-004: resolver `/billing/new`.
- CF-P1-005: selecionar/criar comanda por contexto completo.

Validacao:

- A partir de `/encounters/:id`, abrir cobranca.
- Ver tutor, pet e atendimento.
- Adicionar item.
- Ver total.
- Alterar status aberto/pago/cancelado conforme modelo escolhido.
- Voltar ao atendimento e tutor/pet.

## FASE 6 - Validacao ponta a ponta

Objetivo:

- Executar o caso real completo sem redigitar IDs.

Roteiro:

1. Abrir tutor.
2. Criar ou selecionar pet.
3. Criar agendamento para esse pet.
4. Abrir atendimento vinculado.
5. Registrar prontuario clinico basico.
6. Criar cobranca/comanda vinculada.
7. Voltar para tutor/pet com contexto preservado.

Evidencias esperadas:

- URLs com IDs corretos quando tecnicamente necessario.
- UI exibindo nomes de tutor/pet, nao UUID.
- Nenhuma acao financeira sem confirmacao.
- Nenhuma criacao acidental de cobranca/orcamento.

## FASE 7 - Testes e responsividade

Objetivo:

- Cobrir regressao dos links e validar uso operacional em desktop/mobile.

Testes sugeridos:

- Unit/component tests para leitura de query params em `PatientFormPage`, `AppointmentFormPage`, `EncounterFormPage`, `CounterSalesPage`.
- Tests de navegacao para links contextuais em owner/patient/appointment/encounter.
- Tests de service para payload de comanda/billing conforme decisao da fase 5.
- E2E ou teste de fluxo com mock API para a cadeia completa.
- Screenshot/checagem visual em larguras mobile e desktop para blocos de contexto.

Gates:

- `pnpm test` ou suite equivalente do workspace.
- Testes SPA dos arquivos alterados.
- Testes API dos endpoints alterados, se houver.
- Validacao manual do roteiro ponta a ponta.
