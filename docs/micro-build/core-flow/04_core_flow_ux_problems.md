# Problemas de UX do fluxo principal

## UUID e dados tecnicos expostos

| Problema | Local | Impacto |
| --- | --- | --- |
| Tutor mostra `owner.id` quando nao ha ID legado | `OwnersListPage.vue`, `OwnerDetailPage.vue` | Usuario final ve UUID como identidade do cliente |
| Paciente mostra `patient.id` na lista | `PatientsListPage.vue` | ID tecnico disputa com nome do animal |
| Agenda mostra fallback `Tutor xxx` / `Paciente xxx` | `AppointmentsListPage.vue` | Em falha de cache, operador nao identifica pessoa/pet |
| Detalhe de agenda mostra `appointment.id` no subtitulo | `AppointmentDetailPage.vue` | ID tecnico como informacao operacional |
| Prontuario lista mostra `encounterId.slice(0, 8)` | `MedicalRecordsListPage.vue` | Atendimento nao tem numero amigavel |
| Prontuario tem secao "Timeline tecnica e IDs" | `MedicalRecordsDetailPage.vue` | Exibe `medicalRecordId`, `encounterId`, `patientId`, `owner.id` completos |
| Comanda mostra `selectedSale.id`, `openedByUserId`, `accountId` | `CounterSalesPage.vue` | Dados internos aparecem para recepcao/caixa |
| Impressao de comanda inclui ids de atendimento completos | `CounterSalesPage.vue` | Documento operacional pode expor UUIDs desnecessarios |

## Acoes perigosas sem confirmacao suficiente

| Acao | Local | Estado atual | Risco |
| --- | --- | --- | --- |
| Cancelar/no-show agendamento pelo cockpit | `AppointmentsListPage.vue` + `AppointmentDetailsDrawer.vue` | Handler executa cancelamento | Cancelar agendamento errado |
| Iniciar atendimento do detalhe de agenda | `AppointmentDetailPage.vue` | POST direto | Criar/reusar atendimento sem confirmar contexto |
| Transicionar status de atendimento | `EncounterDetailPage.vue` | Clique em opcao executa | Status clinico errado |
| Fechar financeiro de atendimento | `EncounterDetailPage.vue` | Modal simples, sem resumo de pendencias | Fechar cobranca antes da revisao |
| Adicionar pagamento em comanda | `CounterSalesPage.vue` | Envia direto | Pagamento na comanda errada |
| Remover item de comanda | `CounterSalesPage.vue` | Envia DELETE direto | Perda de item sem confirmacao |
| Fechar comanda | `CounterSalesPage.vue` | POST direto | Fechamento acidental e efeitos em estoque/caixa |
| Cancelar comanda | `CounterSalesPage.vue` | POST direto | Cancelamento financeiro acidental |
| Reabrir comanda | `CounterSalesPage.vue` | POST direto | Reversao financeira sem confirmacao |
| Atualizar status de billing para quitado | `BillingDetailPage.vue` | Modal simples | Marcacao financeira incorreta |

## Confusao de nomenclatura

- "Comanda" aponta ora para `/counter-sales`, ora para `/billing/:encounterId`.
- "Faturamento" e "Contas a receber" aparecem como Billing, mas a operacao de atendimento usa "Comanda" como rotulo.
- "Novo Faturamento" em `/billing` sugere criacao solta, mas o modelo real de billing exige `encounterId`.
- "Abrir Nova Comanda" em paciente/tutor nao deixa claro se a comanda sera vinculada ao atendimento ou apenas ao tutor.

## Estados vazios e loading

Pontos positivos:

- Telas principais possuem `DsAlert` para erro.
- Detalhes de tutor, paciente, atendimento, prontuario e billing possuem skeleton/loading.
- Listas possuem empty states.

Gaps:

- Alguns estados vazios nao oferecem acao contextual preservando IDs. Ex.: pet sem agenda deveria oferecer criar agendamento com `ownerId` e `patientId`.
- Erros de carregamento parcial em `PatientDetailPage.vue` sao agregados como warnings, mas podem ocultar ausencia de billing/prontuario.
- `AppointmentDetailPage.vue` mostra "Carregando ou agendamento nao encontrado" sem distinguir loading, erro e not found.
- `CounterSalesPage.vue` seleciona primeira comanda quando nao ha contexto; isso pode distrair o usuario do tutor/pet desejado.

## Problemas de navegacao operacional

- Nao ha trilha persistente de "voltar para tutor/pet/atendimento" em agenda, billing e comanda.
- A agenda tem drawer e pagina de detalhe; as acoes disponiveis nao sao totalmente equivalentes.
- O pet mostra muitos modulos, mas algumas acoes abrem modulos globais em vez de contexto filtrado.
- CounterSales tenta reconstruir contexto por tutor, listando todos os pets e o atendimento mais recente de cada pet; isso nao garante que a cobranca pertence ao atendimento em curso.

## Riscos de regra de negocio

| Risco | Motivo |
| --- | --- |
| Agenda para paciente errado | Fluxo por tutor sem pet definido |
| Atendimento errado reaproveitado | `/appointments/:id/start-encounter` reutiliza atendimento ativo por paciente |
| Cobranca sem paciente | CounterSales aceita apenas `ownerId` |
| Cobranca sem atendimento | CounterSales nao aceita `encounterId` |
| Fechamento financeiro antes do prontuario | Nao ha bloqueio/aviso forte entre etapas |
| Itens financeiros removidos sem trilha visual | DELETE de item sem confirmacao na UI |
| Usuario final orientado por UUID | Fallbacks tecnicos aparecem como nome |

## Padrao UX recomendado para microconstrucao futura

- Toda acao de transicao deve mostrar um resumo curto: Tutor, Pet, Agendamento, Atendimento, Total quando houver.
- Toda acao destrutiva/financeira deve usar modal de confirmacao com consequencia clara.
- UUID deve ficar restrito a "detalhes tecnicos" recolhido e nunca ser titulo principal.
- Botoes devem usar o destino canonico: atendimento clinico para prontuario, atendimento financeiro para billing/comanda, tutor/pet para cadastro.
- Quando um contexto estiver incompleto, a tela deve pedir selecao guiada em vez de abrir uma superficie global.
