# 894 - SPEC API Handoff Clínico

Data: 2026-04-29
Status: rascunho técnico para validação
Origem: `docs/891-spec-handoff-clinico-recepcao.md`, `docs/892-state-machine-handoff-operacional.md`, `docs/893-prd-inbox-recepcao-finalizacao.md`

## 0. Status

- Rascunho técnico para validação.
- Não autoriza implementação.
- Não é contrato final de API.
- Depende de aprovação do 891, 892 e 893.
- Não define schema final, migration, rota final, DTO final ou service final.
- Qualquer BUILD futuro depende de aprovação explícita do responsável.
- Alinhado em 2026-05-01 à governança neutra de acesso: endpoints candidatos devem validar permissão efetiva, não nome fixo de cargo, setor, grupo ou profissão.
- `HOFF-001` e `HOFF-002` fechados em 2026-05-01: API futura deve preservar a fronteira entre pré-handoff, `HOFF-MIN-1` e handoff completo, mantendo `handoffStatus` separado de status clínico, operacional e financeiro.
- `HOFF-003` fechado em 2026-05-01: API futura deve tratar `ClinicalHandoff` como recurso próprio, não como subcampo de `Encounter` ou `Queue`.
- `HOFF-004` fechado em 2026-05-01: API futura deve manter recepção/finalização operacional como checkpoint antes de `send-to-finance`; financeiro direto fica fora da próxima fatia.
- `HOFF-005` e `HOFF-006` fechados em 2026-05-01: próxima fatia da API cobre pós-ACK com pendência, devolução clínica, reenvio para recepção e envio financeiro explícito.
- `HOFF-008` e `HOFF-009` fechados em 2026-05-01: endpoints devem bloquear transições inseguras e representar pendências críticas com tipo, dono, motivo e criticidade.
- `HOFF-011` e `HOFF-012` fechados em 2026-05-01: contratos candidatos devem separar conferência da recepção/finalização de operação financeira manual, sem criar cobrança, comanda ou `in_billing` automaticamente.
- `HOFF-021` e `HOFF-022` fechados em 2026-05-01: endpoints e payloads candidatos das ações `mark-pending`, `resolve-pending`, `return-to-clinic` e `send-to-finance` foram aprovados conceitualmente para a próxima fatia, sem autorizar implementação.
- `HOFF-023` fechado em 2026-05-01: eventos auditáveis das ações aprovadas foram definidos com payload mínimo, ator, estado anterior/novo, timestamp e sem substituir a entidade `ClinicalHandoff`.
- `HOFF-014` e `HOFF-015` fechados em 2026-05-01: payloads de envio/reenvio devem respeitar resumo mínimo e devolução clínica deve usar motivo controlado, destino clínico e resposta auditável.
- `HOFF-024` fechado em 2026-05-01: filtros de listagem da inbox/API foram aprovados como contrato candidato de consulta, sem conceder autorização, sem side effects e sem liberar inbox completa.
- `HOFF-017` fechado em 2026-05-02: campos e limiares candidatos de SLA/atraso foram aprovados como leitura derivada da listagem, sem transição automática.
- `HOFF-018` fechado em 2026-05-02: contrato candidato de conclusão operacional futura foi detalhado com payload, pré-condições e erros, sem liberar implementação.
- `HOFF-019` fechado em 2026-05-02: checklist operacional aprovado para validar contratos candidatos por fluxo, erro, permissão, auditoria e ausência de side effects.
- `HOFF-020` fechado em 2026-05-02: entidade/schema futuro de `ClinicalHandoff` aprovado conceitualmente em três camadas: registro base, pendências estruturadas e eventos auditáveis, sem criar migration agora.
- `HOFF-025` fechado em 2026-05-02: impacto na Queue aprovado como leitura derivada e vínculo contextual, sem mover state machine de handoff para Queue e sem novos status persistidos.
- `HOFF-026` fechado em 2026-05-02: impacto no Encounter aprovado como âncora obrigatória, timeline resumida e leitura contextual, sem mover `handoffStatus` para Encounter.
- `HOFF-027` fechado em 2026-05-02: impacto em Billing/CounterSales aprovado como contexto financeiro e proteção contra duplicidade, sem side effects financeiros.
- `HOFF-028` fechado em 2026-05-02: permissões técnicas por endpoint aprovadas para validação futura via `/access-control`, mantendo permissões de rotinas relacionadas separadas.
- `HOFF-029` fechado em 2026-05-02: migration futura aprovada como plano técnico, sem criar arquivo SQL agora, preservando compatibilidade com `0045` e preparando pendências/eventos.
- `HOFF-030` fechado em 2026-05-02: plano de testes unitários de service/state machine aprovado como pré-requisito de BUILD, separando unitários de domínio dos testes de API/HTTP.
- `HOFF-031` fechado em 2026-05-02: plano de testes de API aprovado para rotas, payloads, erros, permissões por endpoint, auditoria HTTP e ausência de side effects.
- `HOFF-032` fechado em 2026-05-02: matriz de transições válidas e inválidas aprovada para parametrizar testes de state machine/API antes de BUILD.
- `HOFF-033` fechado em 2026-05-02: validação UX por papel aprovada como pré-BUILD, sem alterar contrato de API e sem autorizar endpoints novos.
- `HOFF-034` fechado em 2026-05-02: smoke visual aprovado como validação consumidora dos contratos candidatos, sem alterar API.
- `HOFF-035` fechado em 2026-05-02: validação de auditoria/eventos aprovada para contratos candidatos, sem criar endpoint, migration ou event store agora.
- `HOFF-036` fechado em 2026-05-02: rollback/mitigação aprovados para contratos candidatos, preservando compatibilidade do mínimo atual.
- `HOFF-037` fechado em 2026-05-02: validação final com operação aprovada; contratos candidatos ficam prontos para decisão de BUILD explícita.

## 1. Objetivo

Esta SPEC propõe recursos, endpoints, payloads e eventos candidatos para suportar handoff clínico real entre Veterinário, Recepção e Financeiro.

O objetivo é orientar a discussão técnica futura sobre dados, validações, permissões, eventos auditáveis e integrações necessárias para que o handoff deixe de ser visual/inferido e passe a ser uma operação rastreável.

Este documento ainda não deve ser tratado como contrato final de API.

## 2. Entidade candidata

`ClinicalHandoff` é a entidade aprovada para o handoff completo.

Ela deve continuar como recurso próprio da API, vinculado a `Encounter`, opcionalmente relacionado à `Queue` e acompanhado por eventos auditáveis.

Estado real após `HOFF-MIN-1`:

- já existe entidade persistida `ClinicalHandoff` mínima para envio à recepção e ACK;
- endpoints implementados cobrem listagem, envio para recepção e confirmação de recebimento;
- `ready_to_send` existe como valor técnico aceito em tipos/schema, mas não há fluxo ativo completo de rascunho/ready;
- devolução clínica, envio ao financeiro, conclusão e cancelamento continuam candidatos futuros.

Esta SPEC não deve retroceder o que já existe no `HOFF-MIN-1`, mas também não deve tratar a fatia mínima como API completa.

Decisão estrutural HOFF-003:

- manter `/clinical-handoffs` como superfície primária do recurso;
- `Encounter` fornece contexto e timeline, mas não deve absorver a state machine do handoff;
- `Queue` pode receber status/leitura derivada, mas não deve substituir o recurso de handoff;
- eventos auditáveis registram transições, mas não são a única fonte para inbox/listagem;
- Billing/CounterSales só recebem encaminhamento/contexto quando houver transição explícita e regra aprovada.

Campos candidatos:

| Campo | Finalidade candidata |
| --- | --- |
| `id` | Identificador único do handoff. |
| `accountId` | Isolamento por conta/tenant. |
| `encounterId` | Atendimento clínico relacionado. |
| `queueItemId` | Item de Queue relacionado, quando existir. |
| `appointmentId` | Agenda/retorno relacionado, quando aplicável. |
| `ownerId` | Tutor/responsável. |
| `patientId` | Animal/paciente. |
| `originChannel` | Origem operacional: recepção, agenda, WhatsApp, telefone, retorno, emergência ou outro canal validado. |
| `fromSector` | Setor remetente. |
| `toSector` | Setor destino. |
| `fromResponsibleId` | Responsável que envia. |
| `toResponsibleType` | Pessoa, equipe ou setor. |
| `toResponsibleId` | Responsável destino, quando houver. |
| `clinicalSummary` | Resumo clínico-operacional. |
| `receptionInstructions` | Instruções para recepção. |
| `pendingExams` | Exames pendentes ou aguardando resultado. |
| `pendingPrescriptions` | Prescrições/receitas a entregar, imprimir ou orientar. |
| `pendingBilling` | Pendências financeiras ou itens cobraveis. |
| `pendingQuotes` | Orçamentos pendentes de aprovação, revisão ou comunicação. |
| `requiredDocuments` | Documentos, termos, receitas, laudos ou anexos necessários. |
| `priority` | Prioridade operacional. |
| `handoffStatus` | Estado do handoff. |
| `operationalStatus` | Estado operacional relacionado à Queue/Encounter. |
| `createdBy` | Usuário criador. |
| `createdAt` | Data/hora de criação. |
| `updatedAt` | Data/hora de atualização. |
| `acknowledgedBy` | Usuário que confirmou recebimento. |
| `acknowledgedAt` | Data/hora de confirmação. |
| `completedBy` | Usuário que concluiu. |
| `completedAt` | Data/hora de conclusão. |
| `cancelledBy` | Usuário que cancelou. |
| `cancelledAt` | Data/hora de cancelamento. |
| `cancellationReason` | Motivo obrigatório de cancelamento. |

## 2.1 Entidade e schema futuro - HOFF-020

O estado real atual é a migration `0045_clinical_handoffs`, que cobre o `HOFF-MIN-1`: envio para recepção, ACK, persistência, RLS por `account_id` e índices básicos. Ela não deve ser tratada como schema completo do handoff.

Decisão HOFF-020:

- manter `ClinicalHandoff` como entidade própria;
- preservar `clinical_handoffs` como tabela base;
- não mover a state machine para `Encounter`, `Queue`, Billing ou eventos;
- adicionar pendências estruturadas em recurso próprio futuro;
- adicionar eventos auditáveis append-only em recurso próprio futuro;
- ampliar status, filtros, SLA e conclusão por migration futura, nunca por inferência visual;
- não criar Billing, CounterSales, comanda, pagamento, baixa, nota, exame, prescrição ou documento a partir do schema de handoff.

Camadas candidatas:

| Camada | Responsabilidade |
| --- | --- |
| `clinical_handoffs` | Identidade do handoff, vínculo com atendimento, rota operacional, resumo, estado atual, dono atual, prioridade, SLA derivável e marcadores de conclusão futura. |
| `clinical_handoff_pendings` | Pendências endereçáveis com tipo, dono, criticidade, status, motivo, resolução e vínculo opcional com devolução. |
| `clinical_handoff_events` | Trilha append-only de transições e ações, com ator, permissão efetiva, estado anterior/novo, motivo e payload mínimo. |

Campos mínimos futuros para `clinical_handoffs`:

| Campo | Regra candidata |
| --- | --- |
| `id`, `accountId` | Obrigatórios; RLS/tenant por `accountId`. |
| `encounterId` | Obrigatório; `Encounter` é contexto, não fonte do estado. |
| `queueItemId`, `appointmentId` | Opcionais; integração/leitura derivada. |
| `ownerId`, `patientId` | Obrigatórios salvo fluxo futuro aprovado de atendimento sem animal/tutor. |
| `handoffStatus` | Enum aprovado pela state machine; status completos exigem migration futura. |
| `currentResponsibleType`, `currentResponsibleId` | Dono operacional atual; não é autorização. |
| `originChannel`, `fromResponsibleId`, `toResponsibleType`, `toResponsibleId` | Roteamento e rastreabilidade. |
| `clinicalSummary`, `receptionInstructions` | Resumo mínimo; não substitui prontuário. |
| `pendingDeclaration`, `financialOriginStatus` | Obrigatórios para envio/reenvio seguro. |
| `priority`, `waitingSince` | Priorização e SLA/atraso derivado. |
| `acknowledgedBy`, `acknowledgedAt` | Obrigatórios quando estado for `acknowledged_by_reception` ou posterior. |
| `completedBy`, `completedAt`, `completionType`, `completionReason` | Somente para conclusão futura aprovada por HOFF-018. |
| `version`, `createdAt`, `updatedAt` | Controle de concorrência, idempotência e auditoria operacional. |

Campos mínimos futuros para `clinical_handoff_pendings`:

| Campo | Regra candidata |
| --- | --- |
| `id`, `accountId`, `handoffId` | Obrigatórios; `accountId` deve coincidir com o handoff. |
| `pendingType` | `clinical`, `documentation`, `billing_origin`, `owner_guidance`, `diagnostic`, `operational_owner` ou `accountability`. |
| `pendingStatus` | `open`, `resolved` ou `non_blocking_justified`. |
| `critical`, `blocksFinance` | Booleanos explícitos para bloqueio operacional. |
| `ownerType`, `ownerId` | Dono da pendência; roteamento, não autorização. |
| `reason` | Motivo obrigatório. |
| `resolution`, `resolvedBy`, `resolvedAt` | Obrigatórios ao resolver/justificar. |
| `relatedReturnId` | Opcional para vínculo com devolução clínica. |
| `createdBy`, `createdAt`, `updatedAt` | Auditoria mínima. |

Campos mínimos futuros para `clinical_handoff_events`:

| Campo | Regra candidata |
| --- | --- |
| `id`, `accountId`, `handoffId`, `encounterId` | Obrigatórios. |
| `eventType` | Um dos eventos aprovados em HOFF-023/HOFF-018. |
| `actorUserId`, `actorProfessionalId`, `permissionCode` | Ator e permissão efetiva usada. |
| `fromStatus`, `toStatus` | Estado anterior e novo quando houver transição. |
| `pendingId`, `reason`, `destinationType`, `destinationId` | Condicionais conforme ação. |
| `payloadSummary` | Snapshot mínimo sem prontuário, laudo, receita, valor sensível ou PII desnecessária. |
| `requestId`, `idempotencyKey`, `occurredAt` | Rastreabilidade e retry seguro. |

Constraints e índices candidatos:

- RLS em todas as tabelas por `accountId`;
- índice por `accountId + handoffStatus`;
- índice por `accountId + updatedAt`;
- índice por `accountId + waitingSince`;
- índice por `accountId + currentResponsibleType/currentResponsibleId`;
- índice por `accountId + pendingStatus + critical`;
- índice por `handoffId + occurredAt` para timeline;
- unicidade futura deve ser "um handoff ativo por atendimento", não necessariamente um handoff eterno por `encounterId`;
- check de status deve incluir somente estados aprovados para a fatia implementada;
- regras complexas de transição ficam no service/state machine, não apenas em constraint SQL.

## 2.2 Estratégia de migration futura - HOFF-029

HOFF-029 aprova a estratégia técnica de migration futura, mas não autoriza criar ou aplicar migration agora.

Princípios aprovados:

- a `0045_clinical_handoffs` é baseline e não deve ser editada retroativamente;
- a próxima migration deve ser nova, aditiva, reversível no plano operacional e compatível com o código atual;
- campos novos em `clinical_handoffs` devem começar nullable ou com default seguro;
- constraints só devem ser apertadas depois que service/API/UI passarem a preencher os campos de forma consistente;
- RLS por `accountId` é obrigatório em todas as tabelas novas;
- backfill não pode inventar pendência, evento clínico completo, cobrança, comanda, pagamento, baixa, conclusão ou cancelamento;
- nenhuma migration de handoff deve alterar `Queue`, `Encounter`, Billing, CounterSales, recebíveis, pagamentos ou prontuário por side effect.

Sequência futura aprovada:

1. Criar migration nova após `0045`, sem alterar o arquivo `0045`.
2. Ampliar `clinical_handoffs` com campos nullable/default seguro para dono operacional atual, declaração de pendência, origem financeira, `waitingSince`, `version` e marcadores de controle necessários à próxima fatia.
3. Trocar constraints de `handoff_status` para aceitar os estados aprovados da próxima fatia: `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`. `ready_to_send` pode continuar aceito tecnicamente enquanto existir no baseline, mas o fluxo completo de rascunho permanece fora do BUILD.
4. Ajustar constraints de rota que hoje fixam clinic->reception para permitir devolução clínica e envio ao financeiro como roteamento operacional, sem transformar setor em autorização.
5. Criar `clinical_handoff_pendings` com `accountId`, `handoffId`, tipo, status, criticidade, bloqueio financeiro, dono, motivo, resolução, ator e timestamps.
6. Criar `clinical_handoff_events` append-only com `accountId`, `handoffId`, `encounterId`, tipo, ator, permissão usada, estado anterior/novo, motivo, `pendingId`, payload mínimo, `requestId`/idempotência e `occurredAt`.
7. Adicionar índices para inbox ativa, status, dono operacional, atraso, pendência crítica, pendência por tipo/status e timeline.
8. Ativar RLS e políticas `USING`/`WITH CHECK` por `accountId` em todas as tabelas novas.
9. Backfill dos handoffs atuais apenas como registros existentes sem pendência estruturada; `waitingSince` pode ser derivado de `sentAt` ou `acknowledgedAt` conforme estado, sem criar evento retroativo de ação que não ocorreu.
10. Validar migration em banco efêmero/clone antes de qualquer BUILD: aplicação limpa, rollback operacional, RLS cross-account, hidratação após restart, índices principais e compatibilidade do HOFF-MIN-1.

Fora da migration da próxima fatia:

- criar `completed`, `cancelled`, `in_billing` ou `reopen` como fluxo ativo;
- criar cobrança, comanda, recebível, pagamento, baixa, nota ou movimento de caixa;
- alterar `scheduling_queue_entries`, `encounters`, Billing ou CounterSales para persistir estado de handoff;
- popular eventos com prontuário, laudo, receita, valor sensível ou PII desnecessária;
- alterar catálogo de permissões sem decisão própria de BUILD.

Critérios de aceite da migration futura:

- HOFF-MIN-1 continua funcionando com envio e ACK;
- registros existentes continuam legíveis;
- toda tabela nova tem `accountId`, RLS e índices mínimos;
- pendências críticas bloqueantes podem ser consultadas sem varrer texto livre;
- timeline usa eventos append-only sem substituir `handoffStatus`;
- rollback operacional consegue desativar endpoints novos mantendo os dados mínimos de `0045`;
- testes de migration/RLS/hidratação passam antes de liberar a fatia.

Esta decisão fecha HOFF-029 como plano de migration. Ela não autoriza SQL, schema, rota ou service.

Decisão HOFF-036 para API/dados:

- endpoints novos da próxima fatia devem ser desligáveis por configuração/flag operacional futura sem afetar rotas mínimas atuais;
- rotas mínimas preservadas: `GET /clinical-handoffs`, `GET /clinical-handoffs/:id`, `POST /clinical-handoffs/send-to-reception` e `POST /clinical-handoffs/:id/acknowledge`;
- migration futura deve ser aditiva, com campos novos nullable/default seguro até a escrita estar estabilizada;
- backfill não pode inventar pendência, devolução, envio financeiro, evento completo, cobrança ou comanda;
- se uma ação nova for desativada, a API deve retornar erro previsível e não executar side effect parcial;
- estados novos já gravados devem continuar legíveis e auditáveis;
- rollback operacional não deve exigir apagar dados como resposta padrão;
- qualquer rotina de correção de dados deve ser procedimento separado, autenticado, auditado e autorizado.

## 3. Recursos candidatos

Recursos candidatos, ainda não finais:

- `/clinical-handoffs`
- `/clinical-handoffs/:id`
- `/clinical-handoffs/:id/ready`
- `/clinical-handoffs/:id/send-to-reception`
- `/clinical-handoffs/:id/acknowledge`
- `/clinical-handoffs/:id/mark-pending`
- `/clinical-handoffs/:id/resolve-pending`
- `/clinical-handoffs/:id/return-to-clinic`
- `/clinical-handoffs/:id/send-to-finance`
- `/clinical-handoffs/:id/complete`
- `/clinical-handoffs/:id/cancel`

Regras de desenho:

- endpoints de ação devem validar estado atual antes de mudar estado;
- operações devem gerar evento auditável;
- payloads devem ser explícitos e evolutivos;
- nenhuma ação deve criar cobrança, comanda, prescrição, exame ou orçamento automaticamente.

Decisão HOFF-021:

Endpoints aprovados conceitualmente para a próxima fatia pós-ACK:

- `POST /clinical-handoffs/:id/mark-pending`;
- `POST /clinical-handoffs/:id/resolve-pending`;
- `POST /clinical-handoffs/:id/return-to-clinic`;
- `POST /clinical-handoffs/:id/send-to-finance`.

Escopo da aprovação:

- HOFF-021/HOFF-022 aprovam contrato de ações e payloads candidatos.
- HOFF-020 foi fechado posteriormente para detalhar schema/entidade futura, persistência de pendências e estratégia de migration quando houver autorização.
- Esta aprovação não exige nem autoriza alteração imediata de schema.

Endpoints mantidos como existentes ou já cobertos por `HOFF-MIN-1`:

- `GET /clinical-handoffs`;
- `GET /clinical-handoffs/:id`;
- envio para recepção;
- ACK/assumir recebimento.

Endpoints fora desta aprovação:

- `ready` completo;
- `complete`;
- `cancel`;
- `in_billing`;
- criação automática de Billing/CounterSales;
- financeiro direto clínica -> financeiro.

## 4. Endpoints candidatos

Na tabela abaixo, a coluna "Ator" descreve template operacional de conversa. Ela não é regra de autorização. Toda rota mutável deve validar `accountId`, estado atual e permissão efetiva da ação no `/access-control`.

| Endpoint | Método | Ator | Objetivo | Payload candidato | Resposta candidata | Pré-condições | Erros candidatos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/clinical-handoffs` | `GET` | Recepção, veterinário, financeiro, coordenação | Listar handoffs por filtros | Query params | Lista paginável candidata | Permissão de leitura | `HANDOFF_UNAUTHORIZED` |
| `/clinical-handoffs` | `POST` | Veterinário/equipe clínica | Criar rascunho de handoff | Dados mínimos do caso | `ClinicalHandoff` em `draft` | `Encounter` válido, account válido | `HANDOFF_UNAUTHORIZED`, `HANDOFF_INVALID_STATE` |
| `/clinical-handoffs/:id` | `GET` | Usuário autorizado | Consultar detalhe do handoff | Nenhum | `ClinicalHandoff` | Handoff existente e conta válida | `HANDOFF_NOT_FOUND`, `HANDOFF_UNAUTHORIZED` |
| `/clinical-handoffs/:id/ready` | `POST` | Veterinário/equipe clínica | Marcar handoff como pronto para envio | Resumo, instruções, pendências | `ClinicalHandoff` em `ready_to_send` | Resumo mínimo, destino candidato | `HANDOFF_MISSING_SUMMARY`, `HANDOFF_MISSING_DESTINATION`, `HANDOFF_INVALID_STATE` |
| `/clinical-handoffs/:id/send-to-reception` | `POST` | Veterinário responsável/coordenador | Enviar ou reenviar para recepção | Resumo mínimo, destino, responsável, declaração de pendências e origem financeira | `ClinicalHandoff` em `sent_to_reception` | Resumo mínimo válido, permissão válida e resposta à devolução quando aplicável | `HANDOFF_MISSING_SUMMARY`, `HANDOFF_PENDING_DECLARATION_REQUIRED`, `HANDOFF_FINANCIAL_ORIGIN_STATUS_REQUIRED`, `HANDOFF_RETURN_RESPONSE_REQUIRED`, `HANDOFF_INVALID_STATE`, `HANDOFF_UNAUTHORIZED` |
| `/clinical-handoffs/:id/acknowledge` | `POST` | Recepção/caixa autorizado | Confirmar recebimento | Responsável receptor | `ClinicalHandoff` em `acknowledged_by_reception` | `sent_to_reception` | `HANDOFF_INVALID_STATE`, `HANDOFF_UNAUTHORIZED` |
| `/clinical-handoffs/:id/mark-pending` | `POST` | Recepção/finalização operacional | Registrar pendência operacional | Tipo, motivo, dono, criticidade e bloqueio financeiro | `ClinicalHandoff` em `waiting_pending_resolution`, pendência criada e evento | `acknowledged_by_reception` ou `waiting_pending_resolution` | `HANDOFF_PENDING_OWNER_REQUIRED`, `HANDOFF_PENDING_TYPE_REQUIRED`, `HANDOFF_PENDING_REASON_REQUIRED`, `HANDOFF_INVALID_STATE` |
| `/clinical-handoffs/:id/resolve-pending` | `POST` | Dono da pendência/finalização operacional | Resolver ou justificar pendência específica | `pendingId`, resolução, resultado e observação | `ClinicalHandoff` em `acknowledged_by_reception` quando não restar pendência crítica, ou permanece em `waiting_pending_resolution` | `waiting_pending_resolution`, pendência ativa existente | `HANDOFF_PENDING_NOT_FOUND`, `HANDOFF_PENDING_RESOLUTION_REQUIRED`, `HANDOFF_INVALID_STATE` |
| `/clinical-handoffs/:id/return-to-clinic` | `POST` | Recepção, financeiro ou gestor | Devolver para clínica com motivo e destino | Tipo controlado, motivo, destino clínico, pendência relacionada e observação | `ClinicalHandoff` em `returned_to_clinic` e evento | ACK prévio, motivo, tipo e destino clínico | `HANDOFF_MISSING_DESTINATION`, `HANDOFF_RETURN_TYPE_REQUIRED`, `HANDOFF_RETURN_REASON_REQUIRED`, `HANDOFF_INVALID_STATE`, `HANDOFF_UNAUTHORIZED` |
| `/clinical-handoffs/:id/send-to-finance` | `POST` | Recepção/financeiro autorizado | Encaminhar para cobrança manual | Conferência operacional, origem financeira, contexto de cobrança e observação | `ClinicalHandoff` em `sent_to_finance` e evento | Recepção assumiu, conferência operacional registrada, origem financeira rastreável e sem pendência crítica aberta | `HANDOFF_PENDING_BLOCKER`, `HANDOFF_OPERATIONAL_REVIEW_REQUIRED`, `HANDOFF_FINANCIAL_ORIGIN_REQUIRED`, `HANDOFF_FINANCIAL_DUPLICATE_RISK`, `HANDOFF_INVALID_STATE` |
| `/clinical-handoffs/:id/complete` | `POST` | Finalização, financeiro ou coordenação autorizada | Concluir handoff operacionalmente | Tipo de conclusão, conferência, resultado financeiro quando aplicável, pendências residuais e observação | `ClinicalHandoff` em `completed` e evento | HOFF-018: ACK, conferência operacional, sem pendência crítica, origem financeira tratada e permissão efetiva | `HANDOFF_COMPLETION_ACK_REQUIRED`, `HANDOFF_COMPLETION_REVIEW_REQUIRED`, `HANDOFF_PENDING_BLOCKER`, `HANDOFF_COMPLETION_FINANCIAL_REQUIRED`, `HANDOFF_ALREADY_COMPLETED` |
| `/clinical-handoffs/:id/cancel` | `POST` | Gestor/coordenador autorizado | Cancelar handoff | Motivo de cancelamento | `ClinicalHandoff` em `cancelled` | Motivo obrigatório, não concluído | `HANDOFF_CANCEL_REASON_REQUIRED`, `HANDOFF_ALREADY_COMPLETED` |

Escopo aprovado para a próxima fatia:

- manter `GET /clinical-handoffs`;
- manter envio/ACK já existentes;
- adicionar ações candidatas de pendência, resolução de pendência, devolução clínica, reenvio para recepção e envio ao financeiro;
- não implementar `complete`, `cancel`, `in_billing`, rascunho/ready completo ou financeiro direto nesta fatia.

## 5. Payloads candidatos

Os exemplos abaixo são candidatos. Não são contrato final.

### 5.1 Criar/rascunhar handoff

Futuro. Não existe como fluxo completo no `HOFF-MIN-1`.

```json
{
  "encounterId": "enc_123",
  "queueItemId": "queue_456",
  "appointmentId": "appt_789",
  "ownerId": "owner_123",
  "patientId": "patient_123",
  "originChannel": "reception",
  "fromSector": "clinic",
  "toSector": "reception",
  "priority": "medium"
}
```

### 5.2 Marcar ready

Futuro. O status `ready_to_send` é aceito tecnicamente, mas ainda não há jornada aprovada de rascunho/ready.

```json
{
  "clinicalSummary": "Paciente avaliado, medicado e liberado para orientação ao tutor.",
  "receptionInstructions": "Entregar receita, orientar retorno em 7 dias e conferir cobrança.",
  "pendingExams": [],
  "pendingPrescriptions": [
    {
      "prescriptionId": "rx_123",
      "action": "print_and_deliver"
    }
  ],
  "pendingBilling": [
    {
      "source": "clinical_service",
      "description": "Consulta clínica",
      "status": "pending_review"
    }
  ],
  "requiredDocuments": []
}
```

### 5.3 Enviar para recepção

```json
{
  "toSector": "reception",
  "toResponsibleType": "sector",
  "toResponsibleId": "reception",
  "clinicalSummary": "Paciente avaliado, medicado e liberado para orientação ao tutor.",
  "receptionInstructions": "Entregar receita, orientar retorno em 7 dias e conferir cobrança.",
  "priority": "medium",
  "pendingDeclaration": {
    "hasKnownPendingItems": true,
    "criticalPendingItems": 0
  },
  "financialOriginStatus": "pending_review",
  "pendingExams": [],
  "pendingPrescriptions": [
    {
      "prescriptionId": "rx_123",
      "action": "print_and_deliver"
    }
  ],
  "requiredDocuments": [],
  "returnResponse": null,
  "note": "Caso pronto para conferência de receita e cobrança."
}
```

Regras aprovadas em HOFF-014:

- `clinicalSummary`, `receptionInstructions`, `toResponsibleType`, `toResponsibleId`, `priority`, `pendingDeclaration` e `financialOriginStatus` são obrigatórios para envio/reenvio da próxima fatia.
- `financialOriginStatus` deve ser `not_applicable`, `clear`, `pending_review` ou `unknown`.
- `pendingDeclaration.hasKnownPendingItems = false` deve ser declaração explícita de ausência de pendência conhecida.
- `financialOriginStatus = unknown` deve gerar pendência ou bloquear avanço financeiro posterior.
- `returnResponse` é obrigatório quando o handoff está em `returned_to_clinic` e será reenviado.
- O payload não cria exame, prescrição, documento, orçamento, cobrança ou comanda.

### 5.4 Confirmar recebimento

```json
{
  "acknowledgedBy": "user_reception_123",
  "note": "Recepção assumiu orientação e cobrança."
}
```

### 5.5 Devolver para clínica

```json
{
  "returnType": "summary_missing",
  "reason": "Resumo clínico insuficiente para orientar tutor.",
  "toResponsibleType": "person",
  "toResponsibleId": "vet_123",
  "relatedPendingId": "pending_123",
  "note": "Favor complementar conduta e orientação de retorno."
}
```

Regras aprovadas em HOFF-021/HOFF-022:

- `reason` é obrigatório.
- `toResponsibleType` e `toResponsibleId` são obrigatórios.
- `returnType` deve ser controlado, por exemplo `summary_missing`, `documentation_needed`, `reassessment_needed`, `diagnostic_clarification` ou `other`.
- `relatedPendingId` é opcional, mas recomendado quando a devolução nasce de uma pendência já registrada.
- A ação não edita prontuário; ela devolve contexto para o fluxo assistencial.

Regras aprovadas em HOFF-015:

- `returnType` aprovado: `summary_missing`, `documentation_needed`, `prescription_clarification`, `diagnostic_clarification`, `reassessment_needed`, `billing_origin_clinical` ou `other`.
- `reason`, `toResponsibleType` e `toResponsibleId` são obrigatórios.
- `relatedPendingId` é obrigatório quando a devolução decorre de pendência ativa registrada.
- `note` é obrigatório quando `returnType = other`.
- devolução só é válida após ACK.
- devolução não deve ser usada para pendência puramente financeira.
- resposta futura da clínica deve ser enviada em `returnResponse` no reenvio para recepção.

### 5.6 Marcar pendência

```json
{
  "pendingType": "clinical",
  "reason": "Resumo insuficiente para orientar tutor.",
  "ownerType": "sector",
  "ownerId": "clinic",
  "critical": true,
  "blocksFinance": true,
  "note": "Necessário complementar orientação antes da cobrança."
}
```

Regras aprovadas em HOFF-021/HOFF-022:

- `pendingType` deve usar os tipos aprovados em HOFF-009.
- `reason`, `ownerType`, `ownerId` e `critical` são obrigatórios.
- `blocksFinance` deve ser `true` quando `critical = true`.
- `ownerType` deve ser controlado: `person`, `team` ou `sector`.
- A resposta deve expor `pendingId`, porque pendências precisam ser resolvidas de forma endereçável.
- Se já houver pendência ativa, a API pode adicionar outra pendência e manter `waiting_pending_resolution`; não deve sobrescrever pendência anterior sem evento.

### 5.7 Resolver pendência

```json
{
  "pendingId": "pending_123",
  "resolutionStatus": "resolved",
  "resolution": "Orientação complementada e receita conferida.",
  "criticalAfterResolution": false,
  "blocksFinanceAfterResolution": false,
  "note": "Pode seguir para conferência financeira."
}
```

Regras aprovadas em HOFF-021/HOFF-022:

- `pendingId` é obrigatório para evitar resolver a pendência errada.
- `resolutionStatus` deve ser `resolved` ou `non_blocking_justified`.
- `resolution` é obrigatório.
- Se `resolutionStatus = non_blocking_justified`, a justificativa deve explicar por que a pendência deixou de bloquear.
- Se ainda restar pendência crítica ativa, o handoff permanece em `waiting_pending_resolution`.
- Se não restar pendência crítica ativa, o handoff pode voltar para `acknowledged_by_reception`.

### 5.8 Enviar para financeiro

Futuro. Pela decisão HOFF-004, esta ação deve partir do caso já recebido/conferido pela recepção/finalização operacional. Não há caminho direto clínica -> financeiro na próxima fatia.

```json
{
  "toSector": "finance",
  "operationalReview": {
    "reviewedBy": "user_reception_123",
    "reviewedAt": "2026-05-01T16:30:00Z",
    "ownerGuidanceChecked": true,
    "documentsChecked": true,
    "prescriptionsChecked": true,
    "diagnosticsChecked": true,
    "servicesChecked": true,
    "pendingCriticalItems": 0
  },
  "financialOrigin": {
    "sourceType": "encounter",
    "sourceId": "enc_123",
    "description": "Consulta clínica e procedimentos conferidos pela finalização.",
    "duplicateRiskChecked": true
  },
  "billingContext": {
    "encounterId": "enc_123",
    "expectedAction": "review_and_charge",
    "existingBillingRecordId": null,
    "existingCounterSaleId": null
  },
  "note": "Receita entregue; cobrança pode ser conferida."
}
```

Regras do payload em HOFF-012:

- `operationalReview` comprova que a recepção/finalização fez a conferência mínima;
- `financialOrigin` informa de onde vem a cobrança esperada, mas não cria item financeiro;
- `billingContext.expectedAction` é instrução operacional, não comando de criação;
- se houver risco de duplicidade, a API deve rejeitar ou exigir pendência/resolução, não criar nova cobrança.

Regras aprovadas em HOFF-021/HOFF-022:

- `operationalReview` é obrigatório.
- `financialOrigin.sourceType`, `financialOrigin.sourceId` e `financialOrigin.description` são obrigatórios.
- `duplicateRiskChecked` deve existir para registrar que a recepção/finalização conferiu risco de duplicidade.
- `existingBillingRecordId` e `existingCounterSaleId` são opcionais e servem apenas como referência quando já existe origem financeira.
- A resposta não deve retornar item financeiro recém-criado, porque a ação não cria cobrança/comanda.
- Se houver pendência crítica aberta, retornar `HANDOFF_PENDING_BLOCKER`.
- Se faltar origem financeira, retornar `HANDOFF_FINANCIAL_ORIGIN_REQUIRED`.

### 5.8.1 Respostas das ações aprovadas - HOFF-021/HOFF-022

Formato candidato comum para ações mutáveis:

```json
{
  "handoff": {
    "id": "handoff_123",
    "encounterId": "enc_123",
    "handoffStatus": "waiting_pending_resolution",
    "updatedAt": "2026-05-01T16:31:00Z"
  },
  "pending": {
    "id": "pending_123",
    "pendingType": "clinical",
    "critical": true,
    "blocksFinance": true,
    "status": "open"
  },
  "event": {
    "id": "event_123",
    "type": "clinical_handoff.pending_marked",
    "occurredAt": "2026-05-01T16:31:00Z"
  }
}
```

Regras de resposta:

- `handoff` é obrigatório em toda ação aprovada.
- `pending` aparece em `mark-pending` e `resolve-pending`, e pode aparecer em `return-to-clinic` quando houver pendência relacionada.
- `event` é obrigatório como confirmação de auditoria conceitual.
- respostas não devem expor exceção interna, SQL ou detalhe sensível.
- respostas de erro devem manter o envelope `error`.

### 5.9 Concluir

Contrato candidato HOFF-018, ainda sem autorização de implementação:

```json
{
  "completionType": "financial_resolved",
  "completionReason": "Tutor orientado, receita entregue e cobrança resolvida na rotina financeira própria.",
  "operationalReview": {
    "ownerOrTutorOriented": true,
    "documentsHandled": true,
    "prescriptionsHandled": true,
    "examsHandled": true,
    "returnsHandled": true,
    "servicesChecked": true,
    "duplicateRiskChecked": true
  },
  "financialOutcome": {
    "status": "resolved_in_finance",
    "referenceId": "billing_123",
    "note": "Pagamento e baixa tratados fora do handoff."
  },
  "residualPendings": [
    {
      "pendingId": "pending_123",
      "status": "non_blocking_justified",
      "reason": "Retorno agendado e tutor orientado."
    }
  ],
  "note": "Encerramento operacional conferido pela recepção.",
  "idempotencyKey": "handoff-complete-123"
}
```

Valores candidatos de `completionType`:

- `no_financial_action_required`;
- `financial_resolved`;
- `sent_to_finance_confirmed`;
- `non_blocking_pending_accepted`;
- `administrative_closure`.

Valores candidatos de `financialOutcome.status`:

- `not_applicable`;
- `no_charge`;
- `sent_to_finance_confirmed`;
- `resolved_in_finance`;
- `manual_reference`.

Regras HOFF-018:

- `complete` não cria cobrança, comanda, pagamento, baixa, parcela, nota ou estado `in_billing`;
- `complete` não fecha prontuário, Encounter, Queue, Billing ou CounterSales por inferência;
- `complete` exige `clinical_handoff.complete` efetivo;
- `complete` exige ACK anterior;
- `complete` exige conferência operacional;
- `complete` não aceita pendência crítica aberta;
- `complete` só aceita pendência residual quando `non_blocking_justified`, com dono e motivo;
- `complete` deve gerar evento auditável futuro `clinical_handoff.completed`;
- `completed` deve sair da inbox ativa e continuar consultável no histórico.

### 5.10 Cancelar

```json
{
  "cancellationReason": "Handoff criado em atendimento incorreto."
}
```

## 6. Listagem e filtros

Decisão HOFF-024:

A listagem de handoffs deve servir à inbox operacional, coordenação e acompanhamento financeiro, sem conceder permissão por filtro. A autorização continua vindo de permissão efetiva e isolamento por `accountId`.

Regras aprovadas:

- `GET /clinical-handoffs` exige `clinical_handoff.read`;
- filtros são sempre aditivos;
- filtros por responsável, setor, grupo visual ou origem são roteamento operacional, não autorização;
- nenhum filtro deve expor dados de outra conta, rotina ou recurso sem permissão efetiva;
- a consulta não cria evento, cobrança, comanda, pendência ou transição;
- valores controlados inválidos devem retornar erro previsível, sem fallback silencioso;
- parâmetros desconhecidos devem ser rejeitados para evitar comportamento ambíguo;
- `completed`, `cancelled`, `in_billing` e automação por SLA continuam fora da próxima fatia.

Filtros aprovados para a próxima fatia:

| Query param | Valores/forma | Uso |
| --- | --- | --- |
| `handoffStatus` | Lista separada por vírgula: `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic`, `sent_to_finance` | Filtrar estados ativos da próxima fatia. |
| `inboxGroup` | `awaiting_ack`, `in_finalization`, `pending`, `returned`, `sent_to_finance` | Atalho de UI para grupos da inbox; mapeia `handoffStatus`. |
| `criticality` | `all`, `critical`, `non_critical` | Filtrar presença de pendência crítica aberta. |
| `pendingType` | `clinical`, `documentation`, `billing_origin`, `owner_guidance`, `diagnostic`, `operational_owner`, `accountability` | Filtrar tipo de pendência definido em HOFF-009. |
| `pendingStatus` | `open`, `resolved`, `non_blocking_justified` | Filtrar pendência estruturada quando existir. |
| `responsibleType` | `person`, `team`, `sector` | Tipo do dono operacional atual. |
| `responsibleId` | ID controlado pela conta | Dono operacional atual. |
| `priority` | `high`, `medium`, `low` | Prioridade operacional. |
| `originChannel` | `reception`, `appointment`, `return`, `emergency`, `phone`, `whatsapp`, `other` | Origem operacional do handoff. |
| `ownerId` | ID de tutor/responsável | Recorte por tutor. |
| `patientId` | ID de animal/paciente | Recorte por paciente. |
| `encounterId` | ID de atendimento | Recorte por atendimento. |
| `queueItemId` | ID de item de esteira | Recorte por Queue. |
| `q` | Texto com pelo menos 2 caracteres | Busca operacional por tutor, paciente, atendimento ou handoff, respeitando permissão. |
| `createdFrom`, `createdTo` | ISO 8601 | Janela de criação. |
| `updatedFrom`, `updatedTo` | ISO 8601 | Janela de atualização. |
| `waitingSinceFrom`, `waitingSinceTo` | ISO 8601 | Janela de tempo aguardando. |
| `ageBucket` | `normal`, `attention`, `overdue` | Filtro de atraso visual; limiares definidos em HOFF-017 como defaults candidatos configuráveis. |
| `hasFinancialOrigin` | `true`, `false` | Indica se há origem financeira rastreável informada. |
| `financialOriginStatus` | `not_applicable`, `clear`, `pending_review`, `unknown` | Filtra status operacional da origem financeira. |
| `limit` | Inteiro de 1 a 100; padrão 50 | Paginação. |
| `offset` | Inteiro >= 0; padrão 0 | Paginação. |
| `sortBy` | `priority`, `waitingSince`, `updatedAt`, `createdAt`, `handoffStatus` | Campo de ordenação. |
| `sortDirection` | `asc`, `desc` | Direção de ordenação. |

Mapeamento UI -> API:

| Filtro visual da inbox | API |
| --- | --- |
| Status/grupo | `inboxGroup` ou `handoffStatus` |
| Criticidade | `criticality` |
| Tipo de pendência | `pendingType` + `pendingStatus` quando necessário |
| Responsável atual | `responsibleType` + `responsibleId` |
| Prioridade | `priority` |
| Atraso | `ageBucket` ou janela `waitingSinceFrom`/`waitingSinceTo` |
| Origem | `originChannel` |
| Busca | `q` |

Ordenação padrão aprovada:

1. pendência crítica aberta primeiro;
2. `ageBucket = overdue` antes de `attention` e `normal`;
3. prioridade alta antes de média e baixa;
4. mais antigo em `waitingSince` primeiro;
5. atualização mais recente como desempate operacional.

Exemplo candidato:

```text
GET /clinical-handoffs?inboxGroup=pending&criticality=critical&priority=high&limit=50&offset=0
```

Resposta candidata:

```json
{
  "items": [
    {
      "id": "handoff_123",
      "encounterId": "enc_123",
      "ownerId": "owner_123",
      "patientId": "patient_123",
      "queueItemId": "queue_123",
      "handoffStatus": "waiting_pending_resolution",
      "inboxGroup": "pending",
      "priority": "high",
      "clinicalSummary": "Resumo curto para recepção.",
      "waitingSince": "2026-04-29T14:30:00Z",
      "ageBucket": "attention",
      "criticalPendingCount": 1,
      "pendingTypes": ["documentation"],
      "currentResponsible": {
        "type": "sector",
        "id": "sector_123"
      },
      "financialOriginStatus": "pending_review",
      "sla": {
        "waitingMinutes": 42,
        "ageBucket": "attention",
        "label": "Em atenção",
        "breachedAt": null,
        "reason": "pending_critical"
      },
      "lastEvent": {
        "type": "clinical_handoff.pending_marked",
        "occurredAt": "2026-04-29T14:50:00Z"
      },
      "nextStep": "resolve_pending"
    }
  ],
  "page": {
    "limit": 50,
    "offset": 0,
    "total": 1
  },
  "facets": {
    "inboxGroup": {
      "awaiting_ack": 2,
      "in_finalization": 4,
      "pending": 1,
      "returned": 0,
      "sent_to_finance": 3
    }
  }
}
```

`facets` é candidato para a inbox manter contadores sem consultas paralelas excessivas. A implementação futura pode omitir `facets` na primeira entrega se a UI conseguir operar com `items` e `page`, mas não deve inventar contadores a partir de dados fora da permissão efetiva.

Decisão HOFF-017 para API/listagem:

- `waitingSince` continua sendo o marco de espera do estado/grupo atual;
- `ageBucket` deve ser derivado como `normal`, `attention` ou `overdue`;
- resposta candidata pode incluir objeto `sla` com `waitingMinutes`, `ageBucket`, `label`, `breachedAt` e `reason`;
- motivos candidatos: `awaiting_ack`, `in_finalization`, `pending_critical`, `pending_non_critical`, `returned`, `sent_to_finance`;
- limiares candidatos: `awaiting_ack` 15/30 min, `in_finalization` 30/60 min, `pending_critical` 30/60 min, `pending_non_critical` 120/240 min, `returned` 60/120 min e `sent_to_finance` 60/120 min;
- o cálculo de SLA não deve gerar evento auditável mutável por si só;
- a API não deve criar cobrança, comanda, pendência, devolução, conclusão, cancelamento ou notificação obrigatória apenas porque um item ficou atrasado;
- filtros e facets de SLA devem respeitar `clinical_handoff.read`, `accountId` e o mesmo recorte de permissão da listagem.

## 7. Eventos auditáveis

Decisão HOFF-023:

Eventos auditáveis aprovados conceitualmente para a próxima fatia e candidatos futuros:

| Evento | Quando ocorre | De -> Para | Payload específico mínimo |
| --- | --- | --- | --- |
| `clinical_handoff.sent_to_reception` | Envio ou reenvio para recepção | estado atual permitido -> `sent_to_reception` | `toSector`, `toResponsibleType`, `toResponsibleId`, `summaryPresent`, `instructionsPresent` |
| `clinical_handoff.acknowledged` | Recepção confirma recebimento | `sent_to_reception` -> `acknowledged_by_reception` | `acknowledgedBy`, `acknowledgedAt`, `note` |
| `clinical_handoff.pending_marked` | Pendência é registrada | `acknowledged_by_reception` ou `waiting_pending_resolution` -> `waiting_pending_resolution` | `pendingId`, `pendingType`, `ownerType`, `ownerId`, `critical`, `blocksFinance`, `reason` |
| `clinical_handoff.pending_resolved` | Pendência é resolvida ou justificada como não bloqueante | `waiting_pending_resolution` -> `acknowledged_by_reception` ou permanece `waiting_pending_resolution` | `pendingId`, `resolutionStatus`, `criticalAfterResolution`, `blocksFinanceAfterResolution` |
| `clinical_handoff.returned_to_clinic` | Caso é devolvido para complemento clínico | `acknowledged_by_reception` ou `waiting_pending_resolution` -> `returned_to_clinic` | `returnType`, `reason`, `toResponsibleType`, `toResponsibleId`, `relatedPendingId` |
| `clinical_handoff.sent_to_finance` | Caso é encaminhado ao financeiro | `acknowledged_by_reception` ou `waiting_pending_resolution` -> `sent_to_finance` | `operationalReviewId` ou resumo de conferência, `financialOrigin`, `billingContext`, `pendingCriticalItems` |
| `clinical_handoff.completed` | Conclusão operacional futura aprovada por HOFF-018 | estado permitido -> `completed` | `completionType`, `completionReason`, `operationalReview`, `financialOutcome`, `residualPendings`, `completedBy`, `completedAt` |

Eventos mantidos como existentes ou legados do `HOFF-MIN-1`:

- `clinical_handoff.sent_to_reception`;
- `clinical_handoff.acknowledged`.

Eventos fora desta aprovação:

- `clinical_handoff.created` para rascunho completo;
- `clinical_handoff.ready`;
- `clinical_handoff.billing_started`;
- `clinical_handoff.cancelled`;
- qualquer evento de criação de cobrança, comanda, pagamento, baixa, parcela ou nota.

`clinical_handoff.completed` fica aprovado apenas como evento candidato futuro de HOFF-018. Ele não autoriza implementação nesta fatia.

Envelope comum aprovado:

```json
{
  "id": "event_123",
  "type": "clinical_handoff.pending_marked",
  "accountId": "acct_123",
  "handoffId": "handoff_123",
  "encounterId": "enc_123",
  "queueItemId": "queue_123",
  "actor": {
    "userId": "user_123",
    "professionalId": "staff_123",
    "permission": "clinical_handoff.write"
  },
  "fromStatus": "acknowledged_by_reception",
  "toStatus": "waiting_pending_resolution",
  "occurredAt": "2026-05-01T16:31:00Z",
  "reason": "Resumo insuficiente para orientar tutor.",
  "payloadSummary": {
    "pendingId": "pending_123",
    "pendingType": "clinical",
    "critical": true,
    "blocksFinance": true
  },
  "requestId": "req_123",
  "idempotencyKey": "handoff_123:pending_123:mark"
}
```

Regras dos eventos:

- evento é append-only e não substitui `ClinicalHandoff` como fonte operacional ativa;
- toda ação mutável aprovada deve gerar exatamente um evento principal quando altera estado ou pendência;
- evento deve guardar `accountId`, `handoffId`, `actor`, `fromStatus`, `toStatus` e `occurredAt`;
- `actor.userId` é obrigatório; `professionalId` é opcional e serve para responsabilidade assistencial quando houver vínculo;
- `permission` registra a permissão efetiva usada, mas não substitui validação no `/access-control`;
- `payloadSummary` deve ser mínimo e não deve armazenar prontuário completo, receita completa, laudo completo, valor sensível ou dados pessoais desnecessários;
- `requestId` ou `idempotencyKey` deve existir quando a ação puder ser repetida por retry;
- se a operação de estado e evento falhar parcialmente, a implementação futura deve tratar como transação ou rejeitar a ação;
- evento não cria cobrança, comanda, exame, prescrição, orçamento, pagamento, baixa, parcela ou nota.

Decisão HOFF-035 para contratos:

- endpoints mutáveis futuros devem retornar ou permitir consultar correlação do evento aceito sem obrigar a UI a inferir auditoria;
- resposta de sucesso pode incluir `eventId`, `lastEvent` ou correlação equivalente, desde que o contrato final escolha uma forma consistente;
- erros 401/403/404/409/422 não devem criar evento operacional de handoff;
- auditoria HTTP de tentativa negada, quando existir, é trilha técnica separada e não substitui `clinical_handoff_events`;
- idempotência deve impedir evento duplicado em retry da mesma ação;
- eventos devem ser consultáveis em timeline ou detalhe futuro por `handoffId`/`encounterId`, respeitando `accountId` e permissão efetiva;
- payload de evento deve ser estável e aditivo; campos novos devem ser opcionais/compatíveis antes de se tornarem obrigatórios em BUILD futuro.

## 8. Integrações

### Queue

- Pode refletir contexto derivado do handoff em etapa futura.
- Deve evitar item ativo sem dono.
- Não deve ser atualizada por inferência visual.
- Não é fonte primária do `handoffStatus`.

Decisão HOFF-025:

- `GET /clinical-handoffs` pode aceitar `queueItemId` como filtro de recorte operacional;
- respostas de handoff podem retornar `queueItemId`/`queueEntryId` quando houver vínculo;
- endpoints de handoff não devem chamar endpoints de Queue como side effect;
- endpoints de Queue não devem alterar `handoffStatus`;
- `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance` não viram status persistido de Queue;
- overlays candidatos da Queue, como badge de handoff ativo, grupo da inbox, pendência crítica e atraso, devem ser calculados a partir de `ClinicalHandoff`/pendências/eventos e respeitar permissão efetiva;
- divergência entre Queue terminal e handoff ativo deve retornar alerta/flag de consistência em leitura futura, não autocorreção.

Campos candidatos de leitura em uma integração futura de Queue:

| Campo | Origem | Regra |
| --- | --- | --- |
| `activeHandoffId` | `ClinicalHandoff` | Apenas leitura; não autoriza ação. |
| `activeHandoffStatus` | `ClinicalHandoff.handoffStatus` | Não substitui `QueueEntry.status`. |
| `activeHandoffInboxGroup` | Mapeamento aprovado em HOFF-024 | Facilita navegação para inbox. |
| `activeHandoffAgeBucket` | HOFF-017 | Destaque visual; não gera transição. |
| `activeHandoffCriticalPendingCount` | Pendências futuras | Alerta; bloqueio financeiro continua no handoff. |
| `handoffQueueConsistency` | Comparação Queue/Handoff | `ok`, `missing_queue_link`, `queue_terminal_with_active_handoff` ou valor equivalente futuro. |

### Encounter

- Deve ser origem clínica/operacional obrigatória do handoff.
- Não deve usar endpoint de `close` como substituto de handoff.
- Pode exibir histórico de handoffs relacionados.
- Não é fonte primária do `handoffStatus`.

Decisão HOFF-026:

- `encounterId` é obrigatório para criar/enviar handoff;
- o Encounter deve pertencer ao mesmo `accountId` do ator e do handoff;
- handoff novo ou reenvio não deve ser permitido com Encounter fechado nesta frente;
- respostas de handoff podem retornar `encounterId`, `appointmentId`, `queueEntryId`, tutor e paciente como contexto;
- endpoints de handoff não devem chamar `POST /encounters/:id/close` como side effect;
- endpoint de fechamento de Encounter não deve alterar `handoffStatus`;
- `closed` não equivale a `completed`;
- `completed` futuro do handoff não equivale a Encounter fechado;
- timeline do Encounter pode receber eventos resumidos de handoff para navegação, mas auditoria completa deve ficar em eventos próprios do handoff;
- inconsistência entre Encounter fechado e handoff ativo deve retornar alerta/flag de consistência em leitura futura, não autocorreção.

Campos candidatos de leitura em uma integração futura de Encounter:

| Campo | Origem | Regra |
| --- | --- | --- |
| `activeHandoffId` | `ClinicalHandoff` | Apenas leitura; não autoriza ação. |
| `activeHandoffStatus` | `ClinicalHandoff.handoffStatus` | Não substitui `Encounter.status`. |
| `activeHandoffInboxGroup` | Mapeamento aprovado em HOFF-024 | Facilita navegação para inbox. |
| `activeHandoffCriticalPendingCount` | Pendências futuras | Alerta contextual. |
| `handoffEncounterConsistency` | Comparação Encounter/Handoff | `ok`, `closed_with_active_handoff`, `missing_encounter` ou valor equivalente futuro. |

### Agenda

- Pode fornecer `appointmentId` e `originChannel`.
- Não deve transformar agendamento em handoff sem ação explícita.

### Billing

- Deve receber contexto de origem, mas não cobrança automática.
- Deve evitar duplicidade de itens cobraveis.
- Regras finais dependem de validação financeira.
- Na próxima fase, só deve receber encaminhamento após ACK e conferência operacional pela recepção/finalização.
- HOFF-012 aprovado: `sent_to_finance` é apenas encaminhamento rastreável; criação, ajuste, baixa, pagamento, parcela ou nota deve acontecer em rota financeira própria e por ação explícita.
- Falta de origem financeira rastreável deve retornar erro ou pendência `billing_origin`, não gerar cobrança tentativa.

Decisão HOFF-027:

- endpoints de handoff não devem chamar endpoints de Billing, Encounter Billing, Encounter Financial, receivables, payments ou CounterSales como side effect;
- `send-to-finance` não deve criar nem atualizar `billing_records`, `billing_items`, `encounter_billing_items`, `encounter_receivables`, `encounter_receivable_payments`, `payments`, `counter_sales`, `counter_sale_items` ou `counter_sale_payments`;
- `send-to-finance` deve retornar erro quando faltar origem financeira rastreável ou houver pendência crítica;
- risco de duplicidade com Billing/CounterSales existente deve retornar erro ou exigir justificativa auditável em contrato futuro;
- links/contextos financeiros na resposta são somente leitura;
- permissões financeiras continuam separadas de `clinical_handoff.*`.

Campos candidatos de leitura financeira:

| Campo | Origem | Regra |
| --- | --- | --- |
| `financialOriginStatus` | Handoff/conferência | Controla se pode enviar ao financeiro. |
| `billingRecordId` | Billing persistente | Link contextual, sem escrita. |
| `encounterBillingSummary` | Encounter Billing | Resumo opcional, sem criação. |
| `counterSaleId` | CounterSales | Link contextual, sem abertura automática. |
| `receivableStatus` | Encounter Financial | Contexto de recebível, sem baixa. |
| `financialDuplicateRisk` | Comparação de vínculos financeiros | Bloqueio ou alerta auditável. |

### CounterSales

- Não deve ser substituído pelo handoff.
- Venda avulsa deve permanecer separada de cobrança clínica quando aplicável.
- Abertura de comanda por contexto de handoff deve continuar manual e protegida por permissão da rotina de comanda.
- Comanda existente pode ser referenciada por link/contexto, mas não alterada por transição de handoff.

### MedicalRecords

- Pode fornecer resumo clínico, prescrições e pendências.
- Recepção não deve editar conteúdo clínico via handoff.

### Notifications/Audit

- Deve registrar eventos de mudança de estado.
- Pode notificar recepção, financeiro ou clínica conforme regra futura.
- Auditoria deve preservar ator, estado anterior, novo estado e motivo.

## 9. Permissões técnicas - HOFF-028

As permissões abaixo são códigos técnicos aprovados conceitualmente para a rotina de handoff.

Elas não ficam presas a nomes como recepção, clínica, financeiro, caixa ou gestor. Esses nomes são templates conversacionais e podem virar grupos pré-configurados editáveis, mas a operação deve poder criar novos grupos, alterar grupos existentes e usar grants `Herdar`, `Conceder` ou `Negar`.

- `clinical_handoff.read`
- `clinical_handoff.write`
- `clinical_handoff.send`
- `clinical_handoff.acknowledge`
- `clinical_handoff.mark_pending`
- `clinical_handoff.resolve_pending`
- `clinical_handoff.return`
- `clinical_handoff.send_to_finance`
- `clinical_handoff.complete`
- `clinical_handoff.cancel`

Matriz técnica aprovada:

| Permissão | Ação protegida | Template operacional usual |
| --- | --- | --- |
| `clinical_handoff.read` | Listar/consultar handoffs da conta | Clínica, recepção, financeiro, coordenação |
| `clinical_handoff.write` | Criar ou atualizar rascunho/summary operacional | Clínica |
| `clinical_handoff.send` | Enviar handoff para destino operacional | Clínica, coordenação operacional |
| `clinical_handoff.acknowledge` | Confirmar recebimento/assumir item | Recepção, finalização operacional |
| `clinical_handoff.mark_pending` | Registrar pendência operacional | Finalização operacional, financeiro, coordenação |
| `clinical_handoff.resolve_pending` | Resolver ou justificar pendência | Dono da pendência, finalização operacional, coordenação |
| `clinical_handoff.return` | Devolver para origem clínica com motivo | Finalização operacional, financeiro, coordenação |
| `clinical_handoff.send_to_finance` | Encaminhar contexto ao financeiro | Finalização operacional, coordenação |
| `clinical_handoff.complete` | Concluir handoff operacionalmente | Permissão futura; BUILD segue bloqueado |
| `clinical_handoff.cancel` | Cancelar handoff com motivo | Permissão futura; BUILD segue bloqueado |

Matriz por endpoint candidato:

| Endpoint | Método | Permissão exigida |
| --- | --- | --- |
| `/clinical-handoffs` | `GET` | `clinical_handoff.read` |
| `/clinical-handoffs/:id` | `GET` | `clinical_handoff.read` |
| `/clinical-handoffs` | `POST` | `clinical_handoff.write` |
| `/clinical-handoffs/:id/ready` | `POST` | `clinical_handoff.write` |
| `/clinical-handoffs/:id/send-to-reception` | `POST` | `clinical_handoff.send` |
| `/clinical-handoffs/:id/acknowledge` | `POST` | `clinical_handoff.acknowledge` |
| `/clinical-handoffs/:id/mark-pending` | `POST` | `clinical_handoff.mark_pending` |
| `/clinical-handoffs/:id/resolve-pending` | `POST` | `clinical_handoff.resolve_pending` |
| `/clinical-handoffs/:id/return-to-clinic` | `POST` | `clinical_handoff.return` |
| `/clinical-handoffs/:id/send-to-finance` | `POST` | `clinical_handoff.send_to_finance` |
| `/clinical-handoffs/:id/complete` | `POST` | `clinical_handoff.complete` |
| `/clinical-handoffs/:id/cancel` | `POST` | `clinical_handoff.cancel` |

Regras de autorização aprovadas:

- toda ação mutável exige permissão efetiva `allow` para o código técnico correspondente;
- `deny` efetivo deve bloquear a ação mesmo que outro grupo/setor conceda acesso, conforme regra aprovada da matriz;
- `inherit` não concede ação sozinho;
- o backend não deve testar nome de setor, grupo, profissão ou cargo;
- filtros por setor/responsável servem para roteamento operacional e listagem, não para autorização;
- endpoints devem rejeitar acesso fora do `accountId`;
- handoff não concede permissões de Billing, CounterSales, prontuário, agenda, documentos, relatórios, caixa, pagamentos ou auditoria global;
- eventos de handoff devem registrar `permissionCode` usado quando a ação for executada;
- tentativas negadas por permissão não devem criar evento de handoff, pois não há transição operacional. Auditoria de segurança global pode registrar a negação em mecanismo próprio futuro.

## 10. Validações candidatas

- `encounterId` obrigatório.
- `patientId` obrigatório, exceto fluxo aprovado de atendimento sem animal.
- `ownerId` obrigatório, exceto emergência com regra aprovada.
- Resumo mínimo obrigatório para envio.
- Destino obrigatório.
- Responsável atual ou setor dono obrigatório.
- Cancelamento exige motivo.
- Conclusão exige recepção/finalização operacional assumir; financeiro pode concluir apenas após encaminhamento explícito aprovado.
- Não permitir concluir com pendência crítica aberta.
- Não permitir concluir sem ACK prévio.
- Não permitir concluir sem conferência operacional registrada.
- Não permitir concluir com origem financeira pendente ou risco de duplicidade financeira sem tratamento.
- Não permitir concluir com pendência residual sem dono, motivo e justificativa de não bloqueio.
- Não permitir que `complete` crie cobrança, comanda, pagamento, baixa, parcela, nota, prontuário, exame, prescrição ou documento.
- Não permitir transição fora da state machine aprovada.
- Não permitir ação sem permissão efetiva.
- Não permitir acesso fora do `accountId`.
- Não permitir envio ao financeiro com pendência crítica aberta.
- Não permitir pendência sem tipo, motivo e dono.
- Não permitir resolver pendência sem `pendingId`.
- Não permitir resolver pendência inexistente, já resolvida ou de outra conta.
- Não permitir envio/reenvio sem `pendingDeclaration`.
- Não permitir envio/reenvio sem `financialOriginStatus`.
- Não permitir reenvio a partir de `returned_to_clinic` sem `returnResponse`.
- Não permitir devolução clínica sem motivo, `returnType` e destino.
- Não permitir `returnType = other` sem `note`.
- Não permitir devolução clínica por pendência puramente financeira.
- Não permitir transição financeira sem origem financeira rastreável.
- Não permitir `send-to-finance` sem conferência operacional da recepção/finalização.
- Não permitir `send-to-finance` quando houver risco conhecido de duplicidade financeira.
- Não permitir que `send-to-finance` crie cobrança, comanda, pagamento, baixa, parcela, nota ou estado `in_billing`.
- Não permitir que `mark-pending`, `resolve-pending`, `return-to-clinic` ou `send-to-finance` operem fora de `accountId`.
- Não permitir listagem sem `clinical_handoff.read`.
- Não permitir filtro com valor controlado fora da lista aprovada.
- Não permitir intervalo temporal invertido, como `createdFrom` posterior a `createdTo`.
- Não permitir `limit` acima de 100 ou paginação negativa.
- Não permitir `q` com menos de 2 caracteres.
- Não permitir parâmetro de listagem desconhecido sem erro explícito.
- Não permitir que filtros de setor, responsável, origem ou grupo visual sejam usados como substituto de autorização.
- Não permitir payload silenciosamente ambíguo; campos opcionais devem ser preservados ou ignorados de forma documentada, nunca usados para side effect não declarado.

## 11. Erros candidatos

| Código | Quando ocorre |
| --- | --- |
| `HANDOFF_NOT_FOUND` | Handoff não existe, não pertence à conta ou usuário não pode acessá-lo. |
| `HANDOFF_INVALID_STATE` | A transição solicitada não é válida para o estado atual. |
| `HANDOFF_MISSING_SUMMARY` | Envio/ready solicitado sem resumo clínico mínimo. |
| `HANDOFF_MISSING_DESTINATION` | Destino, setor ou responsável destino não foi informado quando obrigatório. |
| `HANDOFF_PENDING_DECLARATION_REQUIRED` | Envio/reenvio solicitado sem declaração explícita de pendências. |
| `HANDOFF_FINANCIAL_ORIGIN_STATUS_REQUIRED` | Envio/reenvio solicitado sem status de origem financeira. |
| `HANDOFF_RETURN_RESPONSE_REQUIRED` | Reenvio após devolução clínica solicitado sem resposta ao motivo de devolução. |
| `HANDOFF_PENDING_BLOCKER` | Há pendência crítica aberta bloqueando envio, cobrança ou conclusão. |
| `HANDOFF_COMPLETION_ACK_REQUIRED` | Conclusão solicitada antes de ACK da recepção/finalização. |
| `HANDOFF_COMPLETION_REVIEW_REQUIRED` | Conclusão solicitada sem conferência operacional mínima. |
| `HANDOFF_COMPLETION_FINANCIAL_REQUIRED` | Conclusão solicitada sem origem/resultado financeiro rastreável quando aplicável. |
| `HANDOFF_COMPLETION_RESIDUAL_PENDING_INVALID` | Pendência residual não crítica foi informada sem dono, motivo ou justificativa de não bloqueio. |
| `HANDOFF_PENDING_TYPE_REQUIRED` | Pendência foi registrada sem tipo controlado. |
| `HANDOFF_PENDING_REASON_REQUIRED` | Pendência foi registrada sem motivo operacional. |
| `HANDOFF_PENDING_OWNER_REQUIRED` | Pendência foi registrada sem dono operacional. |
| `HANDOFF_PENDING_NOT_FOUND` | Pendência informada não existe, não está ativa ou não pertence ao handoff/conta. |
| `HANDOFF_PENDING_RESOLUTION_REQUIRED` | Resolução de pendência foi solicitada sem resolução/justificativa. |
| `HANDOFF_RETURN_REASON_REQUIRED` | Devolução clínica solicitada sem motivo. |
| `HANDOFF_RETURN_TYPE_REQUIRED` | Devolução clínica solicitada sem tipo controlado de devolução. |
| `HANDOFF_OPERATIONAL_REVIEW_REQUIRED` | Envio ao financeiro solicitado sem conferência operacional registrada. |
| `HANDOFF_FINANCIAL_ORIGIN_REQUIRED` | Envio ao financeiro solicitado sem origem financeira rastreável. |
| `HANDOFF_FINANCIAL_DUPLICATE_RISK` | Envio ao financeiro solicitado com risco conhecido de duplicidade de cobrança/comanda. |
| `HANDOFF_UNAUTHORIZED` | Usuário não tem permissão para a ação. |
| `HANDOFF_FILTER_INVALID` | Listagem recebeu parâmetro desconhecido ou valor controlado inválido. |
| `HANDOFF_FILTER_RANGE_INVALID` | Listagem recebeu intervalo temporal, paginação ou limite inválido. |
| `HANDOFF_FILTER_QUERY_TOO_SHORT` | Busca textual foi enviada com menos de 2 caracteres. |
| `HANDOFF_FILTER_LIMIT_EXCEEDED` | `limit` solicitado excede o máximo aprovado. |
| `HANDOFF_ALREADY_COMPLETED` | Ação solicitada em handoff já concluído. |
| `HANDOFF_CANCEL_REASON_REQUIRED` | Cancelamento solicitado sem motivo. |

Formato candidato de erro:

```json
{
  "error": {
    "code": "HANDOFF_INVALID_STATE",
    "message": "Transição não permitida para o estado atual do handoff.",
    "details": {
      "handoffStatus": "completed"
    }
  }
}
```

## 12. Fora de escopo

- Implementar endpoints agora.
- Criar migrations agora.
- Definir schema final.
- Definir contrato final de API.
- Mexer em cálculo financeiro.
- Criar comanda automaticamente.
- Criar cobrança automaticamente.
- Substituir Billing/CounterSales.
- Criar UI final.
- Alterar rotas existentes.
- Alterar backend sem autorização.

## 13. Critérios de aceite da SPEC

A SPEC estará pronta para BUILD quando:

- entidade for aprovada;
- endpoints forem aprovados;
- permissões técnicas e integração com `/access-control` forem aprovadas;
- eventos forem aprovados;
- impactos em `Queue`/`Encounter`/Billing forem aceitos;
- testes esperados forem definidos;
- validações obrigatórias forem aceitas;
- erros candidatos forem aprovados;
- estratégia de migração/schema for definida em artefato próprio;
- autorização explícita do responsável for dada.

## 14. Testes futuros esperados

### 14.0 Plano unitário de service/state machine - HOFF-030

HOFF-030 define o recorte unitário antes de BUILD. Ele não implementa testes e não substitui `HOFF-031`/`HOFF-032`.

Unitários aprovados:

- manter regressão do mínimo atual: envio, ACK, ACK duplicado, resumo/instrução obrigatórios, duplicidade por `encounterId`, `Encounter` fechado, cross-account e hidratação;
- testar `mark-pending` com tipo, motivo, dono, criticidade, `blocksFinance`, evento e mudança para `waiting_pending_resolution`;
- testar `resolve-pending` com pendência ativa, resolução obrigatória, permanência em pendência quando ainda houver bloqueio e retorno a `acknowledged_by_reception` quando não houver pendência crítica;
- testar `return-to-clinic` com motivo, tipo, destino clínico, vínculo opcional com pendência e sem edição de prontuário;
- testar reenvio para recepção após `returned_to_clinic`, exigindo resposta ao motivo e resumo/instrução atualizados;
- testar `send-to-finance` com ACK, conferência operacional, origem financeira rastreável, ausência de pendência crítica e bloqueio por risco de duplicidade;
- testar bloqueios de `completed`, `cancelled`, `in_billing`, `reopen` e financeiro direto sem ACK na próxima fatia;
- testar eventos append-only e ausência de evento de handoff quando a ação falha;
- testar rollback em falha de repository e idempotência/conflito quando houver chave de requisição ou versão;
- testar que o service não chama Billing, CounterSales, Queue, Encounter close, pagamentos, baixa, comanda, exame, prescrição, documento ou prontuário como side effect.

Fica para `HOFF-031`:

- HTTP, rotas, contratos de erro, autenticação, autorização efetiva por endpoint e status codes.

### 14.1 Plano de API, rotas, erros e permissões - HOFF-031

HOFF-031 define o recorte dos testes de API antes de BUILD. Ele não implementa testes.

Superfície mínima atual a preservar:

| Rota atual | Método | Testes obrigatórios |
| --- | --- | --- |
| `/clinical-handoffs` | `GET` | Autenticação, permissão de leitura atual, filtros válidos, filtro inválido, isolamento por `accountId`, formato `{ items }` e auditoria de leitura. |
| `/clinical-handoffs/:id` | `GET` | Detalhe existente, `404` para inexistente/cross-account, autenticação, permissão de leitura e auditoria. |
| `/clinical-handoffs/send-to-reception` | `POST` | Sucesso `201`, payload obrigatório, `Encounter` fechado, duplicidade por atendimento, cross-account, persistência, timeline/auditoria e ausência de cobrança/comanda. |
| `/clinical-handoffs/:id/acknowledge` | `POST` | Sucesso `200`, corpo vazio aceito, nota opcional, ACK duplicado como conflito, cross-account, persistência, timeline/auditoria e ausência de automação financeira. |

Superfície futura a planejar antes de BUILD:

| Rota futura | Método | Permissão esperada |
| --- | --- | --- |
| `/clinical-handoffs/:id/send-to-reception` | `POST` | `clinical_handoff.send` |
| `/clinical-handoffs/:id/mark-pending` | `POST` | `clinical_handoff.mark_pending` |
| `/clinical-handoffs/:id/resolve-pending` | `POST` | `clinical_handoff.resolve_pending` |
| `/clinical-handoffs/:id/return-to-clinic` | `POST` | `clinical_handoff.return` |
| `/clinical-handoffs/:id/send-to-finance` | `POST` | `clinical_handoff.send_to_finance` |

Casos HTTP obrigatórios por rota mutável futura:

- `200` ou `201` no sucesso conforme contrato;
- `400` ou `422` para payload inválido/campo obrigatório ausente;
- `401` sem autenticação;
- `403` sem permissão efetiva da ação;
- `404` para recurso inexistente ou fora da conta, sem vazar existência cross-account;
- `409` para conflito de estado, ACK duplicado, duplicidade de handoff ou risco operacional concorrente;
- formato de erro consistente com `error.code`, `message` e `details` mínimo;
- auditoria HTTP somente quando a ação aceita mudar estado ou representar leitura relevante;
- nenhuma rota pode criar Billing, CounterSales, comanda, recebível, pagamento, baixa, nota, exame, prescrição, documento, prontuário ou mover Queue/Encounter por side effect.

Permissões:

- a próxima fatia deve testar a matriz `clinical_handoff.*` aprovada em HOFF-028;
- a API mínima atual ainda usa `encounters.read` e `encounters.manage`. Os testes devem documentar essa compatibilidade e impedir que ela seja confundida com o modelo final;
- nomes de setor, cargo, profissão, grupo ou template não podem aparecer como condição de autorização nos testes.

Fica para `HOFF-032`:

- matriz exaustiva de transições válidas/inválidas e cenários parametrizados de estado.

### 14.2 Matriz de transições para testes - HOFF-032

HOFF-032 aprova a matriz abaixo para parametrizar testes unitários e de API. Ela não implementa testes.

Transições aceitas:

| Ação | De | Para | Status HTTP esperado em API futura |
| --- | --- | --- | --- |
| `acknowledge` | `sent_to_reception` | `acknowledged_by_reception` | `200` |
| `mark-pending` | `acknowledged_by_reception` | `waiting_pending_resolution` | `200` ou `201` se retornar pendência criada |
| `resolve-pending` | `waiting_pending_resolution` | `acknowledged_by_reception` | `200` |
| `return-to-clinic` | `acknowledged_by_reception` | `returned_to_clinic` | `200` |
| `return-to-clinic` | `waiting_pending_resolution` | `returned_to_clinic` | `200` |
| `send-to-reception` | `returned_to_clinic` | `sent_to_reception` | `200` |
| `send-to-finance` | `acknowledged_by_reception` | `sent_to_finance` | `200` |
| `send-to-finance` | `waiting_pending_resolution` | `sent_to_finance` | `200` |

Transições recusadas:

| Ação | De | Para tentado | Erro candidato |
| --- | --- | --- | --- |
| `send-to-finance` | `sent_to_reception` | `sent_to_finance` | `HANDOFF_INVALID_STATE` |
| `return-to-clinic` | `sent_to_reception` | `returned_to_clinic` | `HANDOFF_INVALID_STATE` |
| `mark-pending` | `sent_to_reception` | `waiting_pending_resolution` | `HANDOFF_INVALID_STATE` |
| `acknowledge` | `acknowledged_by_reception` | `acknowledged_by_reception` | `HANDOFF_INVALID_STATE` ou conflito de ACK duplicado |
| `send-to-reception` | `acknowledged_by_reception` | `sent_to_reception` | `HANDOFF_INVALID_STATE` |
| `send-to-reception` | `sent_to_finance` | `sent_to_reception` | `HANDOFF_INVALID_STATE` |
| `complete` | qualquer ativo | `completed` | `HANDOFF_INVALID_STATE` nesta fatia |
| `cancel` | qualquer ativo | `cancelled` | `HANDOFF_INVALID_STATE` nesta fatia |
| `billing-started` | `sent_to_finance` | `in_billing` | `HANDOFF_INVALID_STATE` |
| `reopen` | qualquer estado | `reopen` | `HANDOFF_INVALID_STATE` |

Todo caso parametrizado deve validar:

- estado anterior e posterior;
- permissão exigida;
- payload mínimo;
- evento esperado quando aceito;
- nenhum evento quando recusado;
- ausência de side effects financeiros, clínicos, de Queue e de Encounter.

### 14.3 Validação UX por papel - HOFF-033

HOFF-033 não muda endpoints, payloads ou erros. Ele define a validação de UX que deve consumir os contratos candidatos antes de BUILD.

Regras para a API candidata durante o walkthrough:

- cada ação visível na UI deve apontar para permissão efetiva `clinical_handoff.*` ou permissão própria da rotina relacionada;
- estados sem permissão devem resultar em ausência de dados, leitura limitada ou ação indisponível conforme contrato da rotina, nunca por nome fixo de papel;
- caminho de recepção para financeiro deve terminar em `sent_to_finance` e contexto, sem `in_billing` automático;
- links para Billing, CounterSales, prontuário, documentos e relatórios dependem das permissões próprias dessas rotinas;
- falhas de payload, estado, conta ou permissão devem ser apresentáveis na UX sem vazar recurso cross-account;
- walkthrough aprovado não substitui os testes de API de `HOFF-031` nem a matriz de `HOFF-032`.

### 14.4 Smoke visual consumidor da API - HOFF-034

HOFF-034 não altera contrato de API. Ele define o que a UI precisa conseguir representar visualmente com respostas válidas, vazias, incompletas e de erro.

Casos visuais consumidores:

- listagem com itens ativos e paginação;
- listagem vazia;
- filtro sem resultado;
- erro 401/403 sem expor dados;
- 404/cross-account sem vazar existência;
- 409 de conflito de estado apresentado sem mudar tela para sucesso;
- 422 de payload inválido apresentado junto ao formulário/ação;
- resposta com dados incompletos marcando campos ausentes e bloqueando ação dependente;
- estados `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance` distinguíveis sem depender só de cor.

Critério técnico para BUILD futuro:

- a API futura deve permitir que a UI renderize esses estados sem inventar status local permanente;
- a UI não deve mascarar erro de permissão criando atalho alternativo;
- a UI não deve tratar `sent_to_finance` como Billing criado;
- a UI não deve tratar badge de Queue ou timeline de Encounter como fonte da state machine.

### 14.5 Plano de auditoria/eventos - HOFF-035

HOFF-035 define os testes candidatos para eventos e auditoria antes de BUILD. Ele não implementa testes agora.

Casos obrigatórios:

- ação aceita gera exatamente um evento principal com `eventType`, `accountId`, `handoffId`, `encounterId`, ator, permissão efetiva, `fromStatus`, `toStatus`, `occurredAt` e correlação;
- retry com mesma chave de idempotência não duplica evento;
- ação recusada por permissão, conta, payload ou estado não gera evento operacional de handoff;
- erro após persistir estado mas antes de evento deve ser tratado como transação/rejeição no desenho futuro;
- evento de pendência sempre referencia `pendingId`;
- evento de devolução sempre traz motivo e destino;
- evento de envio ao financeiro traz origem financeira/conferência sem criar Billing/CounterSales;
- timeline por handoff/Encounter retorna eventos ordenados, filtrados por conta e permissão;
- payload não inclui prontuário completo, receita completa, laudo completo, cobrança completa, valor sensível ou PII desnecessária.

### 14.6 Plano de rollback/mitigação - HOFF-036

HOFF-036 define os testes candidatos para reversão operacional antes de BUILD. Ele não implementa testes agora.

Casos obrigatórios:

- com ações novas desativadas, rotas mínimas atuais seguem funcionando;
- endpoint novo desativado retorna erro previsível sem mudar estado nem gerar evento operacional;
- registros em estados novos continuam consultáveis por leitura segura;
- UI/inbox consegue operar em modo mínimo com itens afetados visíveis;
- migration futura aplicada em banco efêmero permite hidratar registros antigos e novos;
- rollback operacional não apaga `clinical_handoffs` nem altera `0045`;
- eventos já gravados permanecem consultáveis;
- Queue, Encounter, Billing e CounterSales não sofrem alteração durante rollback;
- permissões novas sem grant não bloqueiam compatibilidade mínima atual.

### 14.7 Validação com operação - HOFF-037

HOFF-037 encerra o planejamento dos contratos candidatos.

Checklist final:

- rotas atuais mínimas seguem protegidas;
- rotas futuras, payloads, erros, permissões, eventos, filtros, rollback e side effects proibidos estão definidos;
- erros 401/403/404/409/422 têm comportamento esperado;
- endpoints novos não criam Billing, CounterSales, comanda, pagamento, baixa, nota, exame, prescrição, documento, prontuário, Queue ou Encounter por side effect;
- dados/eventos respeitam `accountId`, permissão efetiva e payload mínimo;
- migration futura permanece aditiva e não autorizada nesta fase;
- operação aceitou o pacote como base para decisão de BUILD futuro.

Encerramento:

- não há mais item de planejamento após HOFF-037;
- BUILD só começa por autorização explícita do responsável e deve escolher uma fatia pequena, reversível e verificável.

## 14.1 Checklist operacional para API futura - HOFF-019

Antes de BUILD, a API candidata deve ser validada contra o checklist abaixo:

| Frente | Critério |
| --- | --- |
| Leitura | `GET /clinical-handoffs` respeita `clinical_handoff.read`, `accountId`, filtros aprovados e não vaza dados. |
| Envio | `send-to-reception` exige resumo mínimo, destino, pendências declaradas e origem financeira. |
| ACK | `acknowledge` exige estado `sent_to_reception`, permissão efetiva e gera auditoria. |
| Pendência | `mark-pending` exige tipo, motivo, dono e criticidade. |
| Resolução | `resolve-pending` exige `pendingId`, resolução/justificativa e mantém pendência crítica como bloqueio quando necessário. |
| Devolução | `return-to-clinic` exige tipo, motivo, destino e não edita prontuário. |
| Financeiro | `send-to-finance` exige ACK, conferência, origem rastreável e não cria cobrança/comanda. |
| SLA | `ageBucket` e `sla` são derivados e não geram evento/transição. |
| Conclusão futura | `complete` só é contrato candidato HOFF-018, sem implementação automática. |
| Erros | Erros candidatos retornam envelope previsível e não expõem exceção interna. |
| Auditoria | Eventos aprovados registram ator, permissão efetiva, estado anterior/novo e motivo quando aplicável. |
| Side effects | Nenhuma rota do handoff cria Billing, CounterSales, pagamento, baixa, nota, exame, prescrição, documento ou edição clínica automaticamente. |
- Transições inválidas.
- Não criação automática de cobrança/comanda.

## 15. Próximo artefato

- `895-backlog-handoff-clinico.md`

## 16. Guardrail final

Este documento não autoriza BUILD.

Agentes não devem alterar código, backend, rotas, schema, migration, `Queue`, `Encounter`, Billing, CounterSales ou financeiro com base apenas nesta SPEC.

Qualquer implementação futura exige:

- 891 aprovado;
- 892 aprovado;
- 893 aprovado;
- esta SPEC aprovada;
- estratégia de dados aprovada;
- testes definidos;
- governança de acesso aprovada para as permissões técnicas;
- autorização explícita do responsável.
