# 897 - Estado Real da UX Operacional

Status: auditoria de estado real em 2026-05-01; walkthrough operacional registrado em `898-walkthrough-operacional-fluxo-principal-2026-05-01.md`

Origem: leitura dos documentos `880` a `896` e inspeção do código atual em SPA, API, módulos, migrations e testes.

## 1. Conclusão executiva

O plano de UX operacional não está mais em discovery puro. O repositório já tem BUILD parcial em produção de código para a jornada operacional principal.

Estado real confirmado:

- `Início`, `Recepção`, `Agenda`, `Esteira`, `Atendimento`, `Prontuário`, `Comandas` e `Billing` já têm superfícies implementadas.
- O fluxo principal está em fase de otimização e validação operacional, não em fase de testes micro de um item isolado.
- `Billing Persistente` tem validação técnica suficiente para não continuar como frente dominante neste momento.
- `HOFF-MIN-1` agora existe como handoff clínico mínimo: envio para recepção, ACK, timeline/auditoria, persistência SQL e UI nos pontos operacionais. Ainda não há inbox completa, automação financeira ou modelo operacional amplo com `currentSector`, `currentResponsible` e `operationalStatus`.

Classificação de fase real:

**Fase 8 - Validação operacional, com BUILD parcial já executado nas frentes de jornada.**

Isso substitui a leitura antiga de que todo DEV ainda estaria bloqueado. O bloqueio permanece válido apenas para frentes ainda não implementadas ou ainda sem decisão, especialmente handoff real e inbox de recepção.

## 2. Evidências de implementação confirmadas

| Frente                 | Evidência no código                                                                                                                                                                                                | Estado real                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Header contextual      | `apps/spa/src/components/AppPageHeader.vue` suporta breadcrumb estruturado, contexto, próximos passos, CTA primária e ações secundárias.                                                                           | Implementado como componente base. Ainda não aplicado de forma uniforme em todas as telas. |
| Início                 | `apps/spa/src/pages/DashboardPage.vue` mostra atalhos, indicadores do plantão, comandas abertas, agenda/lembretes e aniversariantes.                                                                               | Implementado parcialmente como dashboard operacional.                                      |
| Recepção               | `apps/spa/src/pages/reception/ReceptionGatewayPage.vue` existe e busca tutor/paciente, direciona para cadastro, agenda, esteira, orçamento, comanda e atendimento.                                                 | Implementado como gateway operacional.                                                     |
| Agenda                 | `apps/spa/src/pages/appointments/AppointmentsListPage.vue` usa visão dia/semana/mês, filtros, check-in, no-show, abertura de atendimento e ponte com esteira.                                                      | Implementado e integrado com Scheduling/Queue.                                             |
| Esteira                | `apps/spa/src/pages/scheduling/QueuePage.vue`, `apps/spa/src/services/scheduling.ts` e `apps/api/src/routes/scheduling-routes.ts` cobrem listagem, check-in, chamada, start-care e no-show.                        | Implementado com state machine simples da fila.                                            |
| Scheduling persistente | `packages/modules/scheduling/src/index.ts` e `packages/modules/scheduling/src/repositories/database-scheduling.repository.ts` persistem appointments e queue entries.                                              | Implementado com persistência e hidratação.                                                |
| Atendimento/Encounter  | `packages/modules/encounters/src/index.ts` tem estados `reception`, `in_triage`, `in_care`, `observation`, `closed`; `apps/spa/src/pages/encounters/EncounterDetailPage.vue` tem cockpit e pré-handoff visual.     | Implementado como atendimento operacional básico.                                          |
| Prontuário             | `apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue` tem ficha clínica estruturada: queixa, anamnese, exame físico, parâmetros, diagnóstico, plano, prescrição, conduta e complementos.               | Implementado como cockpit clínico/prontuário.                                              |
| Comandas               | `apps/spa/src/pages/sales/CounterSalesPage.vue` recebe contexto por URL e preserva abertura manual.                                                                                                                | Implementado como workbench comercial/financeiro assistido.                                |
| Billing persistente    | `packages/db/migrations/0044_billing_records_items.sql`, `packages/modules/billing/src/index.ts`, `apps/api/src/routes/billing-routes.ts` e testes de integração cobrem records/items, RLS, hidratação e API real. | Implementado e tecnicamente validado para a fatia EP-BILL-1.                               |
| Handoff mínimo         | `packages/modules/encounters/src/index.ts`, `/clinical-handoffs`, `EncounterDetailPage.vue` e `ReceptionGatewayPage.vue` cobrem envio mínimo, ACK e persistência SQL.                                              | Implementado como HOFF-MIN-1, sem inbox completa e sem automação financeira.               |

## 3. O que ainda não está realmente implementado

| Frente planejada                                | O que existe                                                                                                 | Lacuna real                                                                                                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modelo operacional `Queue`/`Encounter` completo | Queue tem `status`, `priority`, `appointmentId`, `encounterId`; Encounter tem `status`.                      | Não há `currentSector`, `currentResponsible`, `nextSector`, `operationalStatus`, `clinicalStatus` e `billingStatus` persistidos como no modelo do doc `886`. A UI infere setor/responsável em parte. |
| Handoff clínico para recepção                   | `HOFF-MIN-1` permite envio e ACK com resumo mínimo persistido.                                               | Falta devolução clínica, conclusão operacional, envio ao financeiro e regras de pendência crítica.                                                                                                   |
| Inbox da recepção para finalização              | Recepção mostra funil da esteira e inbox mínima com aguardando ACK, alta/crítica, recebidos e ACK manual.    | Ainda não há inbox completa com filtros avançados, SLA, dono da pendência, devolução, conclusão e visão financeira controlada.                                                                       |
| API de handoff                                  | `/clinical-handoffs`, `/clinical-handoffs/send-to-reception` e `/clinical-handoffs/:id/acknowledge` existem. | A API ainda é a fatia mínima; endpoints futuros de ready, return-to-clinic, send-to-finance, complete e cancel permanecem fora do escopo.                                                            |
| Decisões HOFF P0                                | Docs `891` a `895` registram decisões pendentes.                                                             | Ainda falta aprovar entidade, estados, transições, permissões, recepção vs financeiro direto e bloqueios.                                                                                            |
| Validação operacional formal                    | Há muitos testes unitários e de integração por tela/módulo.                                                  | Falta registro único de walkthrough operacional por papel conforme doc `890`.                                                                                                                        |

## 4. Estado dos documentos 880 a 896

| Documento                                   | Leitura atual após inspeção                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `880-plano-executivo-ux-operacional.md`     | Continua válido como direção macro. Precisa ser lido como plano já em execução, não apenas pré-BUILD.                          |
| `881-roadmap-ux-operacional.md`             | A sequência conceitual permanece útil, mas o status "BUILD ainda não autorizado" ficou defasado para frentes já construídas.   |
| `882-backlog-ux-operacional.md`             | Precisa de atualização de status. Muitos itens `Aberto/Bloqueado` já têm implementação parcial no código.                      |
| `883-auditoria-ui-atual-ux-operacional.md`  | Continua útil para lacunas P0/P1, principalmente fila, prontuário, comanda/caixa e headers.                                    |
| `884-brief-visual-operacional.md`           | Continua válido. Parte da UI já segue o header contextual, mas ainda há inconsistências visuais.                               |
| `885-spec-cabecalho-contextual.md`          | Implementação base existe em `AppPageHeader.vue`; falta auditoria de aplicação uniforme.                                       |
| `886-modelo-operacional-queue-encounter.md` | Parcialmente atendido pela Queue atual. Campos centrais de dono/status operacional ainda não existem como persistência formal. |
| `887-prd-jornada-recepcao.md`               | Parcialmente implementado via `/reception`. Falta validar fluxo com dados reais/controlados e ligar finalização pós-clínica.   |
| `888-prd-jornada-veterinario-clinico.md`    | Parcialmente implementado por `EncounterDetailPage` e `MedicalRecordsDetailPage`. Falta handoff real.                          |
| `889-roadmap-fluxos-especializados.md`      | Ainda permanece majoritariamente futuro.                                                                                       |
| `890-plano-validacao-operacional.md`        | Deve virar o guia imediato. Estamos exatamente na fase de walkthrough operacional por papel.                                   |
| `891-spec-handoff-clinico-recepcao.md`      | Continua válido. A primeira fatia real (`HOFF-MIN-1`) foi implementada, mas sem cobrir o handoff completo descrito.            |
| `892-state-machine-handoff-operacional.md`  | Parcialmente atendido apenas por `sent_to_reception` e `acknowledged_by_reception`. Estados futuros seguem candidatos.         |
| `893-prd-inbox-recepcao-finalizacao.md`     | Ainda não implementado como inbox completa. A recepção recebeu apenas lista mínima para ACK.                                   |
| `894-spec-api-handoff-clinico.md`           | Parcialmente implementado nos endpoints mínimos de listagem, envio e ACK.                                                      |
| `895-backlog-handoff-clinico.md`            | Atualizado com `HOFF-MIN-1` parcial/concluído conforme itens DEV mínimos.                                                      |
| `896-spec-billing-persistente.md`           | EP-BILL-1 está tecnicamente validado. Não deve continuar consumindo a fase atual, salvo regressão no fluxo operacional.        |

## 5. Ponto exato em que estamos

Estamos no ponto entre:

1. **Fluxo operacional principal parcialmente construído**
2. **Validação operacional real por papel**
3. **Preparação para decidir/construir handoff clínico real**

O foco correto agora não é adicionar mais testes isolados de Billing.

O foco correto é validar se a jornada existente funciona para operação:

`Início -> Recepção -> Agenda/Esteira -> Atendimento -> Prontuário -> Pré-handoff -> Comanda/Billing`

Durante essa validação, Billing entra apenas como checkpoint de fluxo:

- existe origem rastreável da cobrança?
- a cobrança não nasce automaticamente sem ação explícita?
- a recepção entende a pendência financeira?
- a comanda/faturamento não substitui handoff clínico?

## 6. Próximo passo lógico recomendado

Atualização após o walkthrough `898`:

**O bloqueio P0 da passagem `Esteira -> Atendimento` foi corrigido e o walkthrough completo passou até `Prontuário -> Comanda/Billing`.**

Bloqueio encontrado e fechado:

- `Abrir triagem` a partir de uma entrada chamada falhava com `Invalid queue entry status transition`;
- a causa provável é sincronização duplicada entre `attachEncounter(...)` e `syncQueueWithEncounter(..., 'in_triage')`;
- a correção tornou a sincronização `Queue <-> Encounter` idempotente para estados de encounter;
- a travessia completa alcançou `Atendimento -> Prontuário -> Comanda/Billing`.

Próximo passo documental/técnico antes de construir nova fatia:

**`HOFF-MIN-1` foi validado no walkthrough operacional: Atendimento -> Enviar para recepção -> Recepção -> Confirmar recebimento.**

Depois da validação operacional, a fatia de persistência também foi fechada:

- migration `0045_clinical_handoffs` criada;
- RLS por `account_id` validado;
- `DatabaseClinicalHandoffRepository` criado;
- bootstrap usa repository SQL quando a tabela existir;
- teste real confirmou hidratação após restart mantendo o ACK.

Próximo passo lógico de construção:

**Inbox mínima de handoffs da recepção implementada sem automação financeira.**

Escopo fechado nesta fatia:

- contadores de handoff aguardando ACK, alta/crítica e recebidos;
- filtro simples `Aguardando`/`Recebidos`;
- ACK manual preservado;
- atalhos operacionais para Atendimento, Paciente e Tutor;
- remoção de atalho de Cobrança/Billing nessa área.

Próximo passo lógico:

**Validar RH/governança de acesso antes de expandir o pós-atendimento.**

Motivo:

- a discussão de "quem pode fazer" pertence a usuários, grupos, equipes, setores e permissões;
- o handoff deve definir jornada operacional, não matriz fixa por setor;
- permissões precisam ser customizáveis por usuário, grupo e setor, sem depender do nome do cargo, profissão ou grupo;
- profissional cadastrado deve ser usado para assinatura/identidade em agenda, receitas, relatórios e prontuários, sem substituir a governança de acesso;
- grupos pré-configurados podem acelerar implantação, mas devem continuar editáveis e sujeitos a `allow`/`deny` por usuário, grupo e setor;
- a decisão de escopo está registrada em `899-decisao-escopo-fluxo-vs-rh-governanca.md`.

Validação RH-VAL-1 concluída em 2026-05-01:

- matriz `Herdar`/`Conceder`/`Negar` validada em usuário, grupo e setor;
- grupo pré-configurado editável e novo grupo criado pela operação validados;
- permissão efetiva por rotina validada;
- bloqueio de endpoint protegido sem permissão efetiva validado;
- escrita cross-account bloqueada em vínculo, grant e atualização de grupo;
- `docs/900-templates-conversacionais-governanca-acesso.md` passa a ser a linguagem de conversa.

Alinhamento HOFF-GOV-1 concluído em 2026-05-01:

- `891`, `892`, `893` e `894` agora tratam clínica, recepção, financeiro, caixa, gestor e coordenação como templates conversacionais/operacionais;
- permissões do handoff foram documentadas como códigos técnicos configuráveis, não como papel nominal;
- a próxima expansão da inbox/pós-atendimento deve consultar permissão efetiva no `/access-control`.

Fechamento HOFF-001/HOFF-002 concluído em 2026-05-01:

- pré-handoff ficou definido como contexto visual/operacional sem fonte de verdade própria;
- `HOFF-MIN-1` ficou definido como handoff mínimo persistido com envio para recepção e ACK;
- handoff completo continua futuro e bloqueado;
- `clinicalStatus`, `operationalStatus`, `billingStatus` e `handoffStatus` ficaram separados conceitualmente;
- `pronto_para_recepcao` não é `clinicalStatus`; no estágio atual é leitura operacional derivada de `handoffStatus = sent_to_reception`.

Fechamento HOFF-003/HOFF-004 concluído em 2026-05-01:

- `ClinicalHandoff` ficou aprovado como entidade própria do handoff completo;
- `Encounter` permanece contexto clínico/operacional obrigatório;
- `Queue` pode refletir leitura/sincronização derivada, mas não substitui o handoff;
- eventos auditáveis registram transições, mas não são a fonte operacional única;
- recepção/finalização operacional ficou aprovada como checkpoint padrão antes de financeiro;
- caminho direto clínica -> financeiro não está aprovado para a próxima fatia.

Fechamento HOFF-005/HOFF-006 concluído em 2026-05-01:

- próxima fatia aprovada: `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`;
- transições aprovadas: ACK, marcar pendência, resolver pendência, devolver à clínica, reenviar à recepção e encaminhar ao financeiro;
- fora da próxima fatia: `draft`, fluxo completo de `ready_to_send`, `waiting_owner_decision`, `in_billing`, `completed` e `cancelled`.

Fechamento HOFF-008/HOFF-009 concluído em 2026-05-01:

- bloqueios gerais definidos: conta, permissão efetiva, estado válido, auditoria, ausência de automação indevida e prevenção de duplicidade;
- bloqueios específicos definidos para envio/reenviar à recepção, ACK, pendência, devolução clínica e envio ao financeiro;
- pendências críticas definidas: `clinical`, `documentation`, `billing_origin`, `owner_guidance`, `diagnostic`, `operational_owner` e `accountability`;
- pendência crítica aberta bloqueia envio ao financeiro e conclusão futura.

Próximo passo lógico:

**`HOFF-011` e `HOFF-012` foram detalhados: jornada da recepção/finalização e jornada do financeiro sem automação indevida.**

Fechamento HOFF-011/HOFF-012 concluído em 2026-05-01:

- recepção/finalização recebe o caso em `sent_to_reception`, confirma ACK e confere resumo, tutor, paciente, documentos, prescrições, exames, retornos, serviços, origem financeira e pendências;
- pendências precisam ter tipo, motivo, dono e criticidade;
- recepção/finalização só envia ao financeiro quando houver conferência operacional, origem financeira rastreável e nenhuma pendência crítica aberta;
- financeiro recebe `sent_to_finance` como encaminhamento operacional, não como cobrança criada;
- cobrança, ajuste, negociação, pagamento, baixa, parcela, nota ou comanda continuam nas rotinas próprias e por ação explícita;
- continuam fora da fatia: `completed`, `in_billing`, cancelamento, financeiro direto clínica -> financeiro, inbox completa e automação financeira.

Próximo passo lógico:

**`HOFF-021` e `HOFF-022` foram fechados: contratos e payloads das ações aprovadas, principalmente pendência, resolução, devolução clínica e envio ao financeiro.**

Fechamento HOFF-021/HOFF-022 concluído em 2026-05-01:

- endpoints candidatos aprovados: `mark-pending`, `resolve-pending`, `return-to-clinic` e `send-to-finance`;
- `mark-pending` registra pendência com `pendingId`, tipo, motivo, dono, criticidade e bloqueio financeiro;
- `resolve-pending` exige `pendingId` e resolução/justificativa;
- `return-to-clinic` exige motivo e destino clínico, sem editar prontuário;
- `send-to-finance` exige conferência operacional e origem financeira rastreável;
- nenhuma ação cria cobrança, comanda, pagamento, baixa, parcela, nota ou `in_billing`;
- continua sem BUILD, migration, `completed`, `cancel`, inbox completa ou automação financeira.

Próximo passo lógico:

**`HOFF-023` foi fechado: eventos auditáveis das ações aprovadas, com payload mínimo, ator, estado anterior/novo e timestamp.**

Fechamento HOFF-023 concluído em 2026-05-01:

- eventos aprovados: `clinical_handoff.sent_to_reception`, `clinical_handoff.acknowledged`, `clinical_handoff.pending_marked`, `clinical_handoff.pending_resolved`, `clinical_handoff.returned_to_clinic` e `clinical_handoff.sent_to_finance`;
- payload mínimo inclui conta, handoff, atendimento, ator, permissão efetiva, estado anterior, novo estado, motivo quando aplicável, `pendingId` quando aplicável, destino operacional, resumo mínimo e `occurredAt`;
- eventos são append-only;
- eventos não substituem `ClinicalHandoff`, pendências estruturadas, Billing ou CounterSales;
- eventos não carregam prontuário completo, receita completa, laudo completo, valor sensível ou dados pessoais desnecessários;
- continua sem BUILD, migration, `completed`, `cancel`, `billing_started`, inbox completa ou automação financeira.

Próximo passo lógico:

**`HOFF-013` e `HOFF-016` foram fechados: inbox da recepção, filtros, campos, estados vazios e estados sem permissão.**

Fechamento HOFF-013/HOFF-016 concluído em 2026-05-01:

- inbox da próxima fatia organiza `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`;
- filtros visuais aprovados: status/grupo, criticidade, tipo de pendência, responsável atual, prioridade, atraso, origem e busca operacional;
- campos mínimos aprovados: identidade, estado, contexto clínico-operacional, pendências, financeiro contextual e ações;
- ações por estado aprovadas com CTA primária única;
- estados vazios aprovados: carregando, sem handoffs ativos, sem resultado no filtro, sem pendência crítica, erro de carregamento e dados incompletos;
- estados sem permissão aprovados: sem leitura, leitura sem ação, sem ACK, sem devolução, sem financeiro e sem prontuário;
- continua sem BUILD, API final, `completed`, `cancelled`, `in_billing`, SLA amplo ou automação financeira.

Próximo passo lógico:

**`HOFF-014` e `HOFF-015` foram fechados: resumo mínimo e devolução clínica.**

Fechamento HOFF-014/HOFF-015 concluído em 2026-05-01:

- resumo mínimo aprovado para envio/reenvio: atendimento, tutor/paciente quando aplicáveis, resumo clínico-operacional, instruções para recepção, destino operacional, prioridade, declaração de pendências e status de origem financeira;
- campos condicionais aprovados: exames, prescrições, documentos, billing, orçamentos e resposta à devolução;
- resumo mínimo não é prontuário completo e não cria exame, prescrição, documento, orçamento, cobrança ou comanda;
- devolução clínica exige tipo controlado, motivo, destino clínico e pendência relacionada quando houver;
- motivos aprovados: `summary_missing`, `documentation_needed`, `prescription_clarification`, `diagnostic_clarification`, `reassessment_needed`, `billing_origin_clinical` e `other`;
- devolução clínica não resolve pendência puramente financeira e não permite edição de prontuário pela recepção;
- continua sem BUILD, API final, `completed`, `cancelled`, `in_billing`, automação financeira ou inbox completa.

Próximo passo lógico:

**`HOFF-024` foi fechado: filtros de listagem da inbox/API.**

Fechamento HOFF-024 concluído em 2026-05-01:

- filtros da inbox mapeados para query/API: status/grupo, criticidade, pendência, responsável, prioridade, atraso, origem e busca;
- filtros técnicos aprovados também cobrem tutor, paciente, atendimento, Queue, datas, origem financeira, paginação e ordenação;
- listagem exige `clinical_handoff.read`, respeita `accountId` e não usa filtro como autorização;
- valores inválidos, intervalos invertidos, `limit` excessivo e parâmetros desconhecidos devem retornar erro explícito;
- continua sem BUILD, API final, SLA amplo, `completed`, `cancelled`, `in_billing`, automação financeira ou inbox completa.

Próximo passo lógico:

**`HOFF-017` foi fechado: SLA/alerta de atraso.**

Fechamento HOFF-017 concluído em 2026-05-02:

- SLA aprovado como leitura derivada de `waitingSince`, sem virar estado da state machine;
- buckets aprovados: `normal`, `attention` e `overdue`;
- limiares candidatos definidos por grupo: aguardando ACK 15/30 min, finalização 30/60 min, pendência crítica 30/60 min, pendência não crítica 120/240 min, devolvido 60/120 min e enviado ao financeiro 60/120 min;
- atraso não concede permissão, não bloqueia sozinho e não dispara devolução, financeiro, cobrança, comanda, conclusão ou cancelamento automático;
- continua sem BUILD, API final, `completed`, `cancelled`, `in_billing`, automação financeira ou inbox completa.

Próximo passo lógico:

**`HOFF-018` foi fechado: critérios de finalização operacional futura.**

Fechamento HOFF-018 concluído em 2026-05-02:

- `completed` definido como encerramento operacional futuro do handoff, não como fechamento clínico, financeiro, de Queue ou de prontuário;
- conclusão futura exige ACK, conferência operacional, permissão efetiva, ausência de pendência crítica, origem financeira tratada e auditoria;
- estados candidatos de origem futura: `acknowledged_by_reception`, `waiting_pending_resolution` e `sent_to_finance`;
- conclusão não cria cobrança, comanda, pagamento, baixa, nota, exame, prescrição, documento ou edição clínica;
- continua sem BUILD, API final, cancelamento, `in_billing`, automação financeira ou inbox completa.

Próximo passo lógico:

**`HOFF-019` foi fechado: checklist operacional.**

Fechamento HOFF-019 concluído em 2026-05-02:

- checklist operacional aprovado para validar handoff por papel, transição, bloqueio, permissão e auditoria;
- cenários cobrem clínica, recepção/finalização, financeiro, coordenação, governança de acesso, SLA, pendências, devolução e conclusão futura;
- cada item deve registrar `Aprovado`, `Bloqueado`, `Ajustar` ou `Não se aplica`;
- falhas P0/P1 bloqueiam BUILD;
- checklist não libera implementação, API final, `completed`, cancelamento, `in_billing`, automação financeira ou inbox completa.

Próximo passo lógico:

**`HOFF-020` foi fechado: entidade/schema futuro de `ClinicalHandoff`.**

Fechamento HOFF-020 concluído em 2026-05-02:

- modelo futuro aprovado em três camadas: `clinical_handoffs`, `clinical_handoff_pendings` e `clinical_handoff_events`;
- migration atual `0045_clinical_handoffs` permanece como HOFF-MIN-1, não como schema completo;
- `ClinicalHandoff` segue como fonte de verdade do `handoffStatus`;
- `Encounter`, `Queue`, Billing e eventos não substituem a entidade;
- pendências e eventos futuros devem preservar RLS por `accountId`, idempotência, auditoria e bloqueio cross-account;
- continua sem migration, alteração de schema, endpoint novo, automação financeira, `completed`, cancelamento, `in_billing` ou inbox completa.

Próximo passo lógico:

**`HOFF-025` foi fechado: impacto na Queue.**

Fechamento HOFF-025 concluído em 2026-05-02:

- Queue permanece como esteira operacional com state machine própria;
- não entram novos status persistidos de Queue para handoff nesta fase;
- `ClinicalHandoff` continua fonte do `handoffStatus`;
- Queue pode exibir overlay derivado, como badge, link, grupo de inbox, atraso, pendência crítica e responsável atual;
- ações de Queue não criam handoff, ACK, pendência, devolução, envio financeiro, cobrança ou comanda;
- ações de handoff não concluem, cancelam, reabrem ou movem Queue automaticamente;
- divergência entre Queue terminal e handoff ativo deve gerar alerta ou pendência, não autocorreção silenciosa.

Próximo passo lógico:

**`HOFF-026` foi fechado: impacto no Encounter.**

Fechamento HOFF-026 concluído em 2026-05-02:

- Encounter permanece como âncora clínica/operacional obrigatória do handoff;
- não entram novos status persistidos de handoff no Encounter nesta fase;
- `ClinicalHandoff` continua fonte do `handoffStatus`;
- envio/reenvio de handoff exige Encounter válido, da mesma conta e não fechado;
- `closeEncounter` não cria ACK, devolução, envio financeiro, conclusão, cancelamento, cobrança ou comanda;
- completar handoff futuramente não fecha Encounter automaticamente;
- divergência entre Encounter fechado e handoff ativo deve gerar alerta ou pendência, não autocorreção silenciosa.

Próximo passo lógico:

**`HOFF-027` foi fechado: impacto em Billing/CounterSales.**

Fechamento HOFF-027 concluído em 2026-05-02:

- `sent_to_finance` permanece encaminhamento operacional, não criação de cobrança;
- handoff não cria Billing, item de Billing, comanda, recebível, pagamento, baixa, parcela, nota ou movimento de caixa;
- handoff não chama rotas financeiras/comerciais como side effect;
- Billing/CounterSales continuam rotinas próprias, por ação explícita e permissão efetiva própria;
- falta de origem financeira rastreável vira pendência `billing_origin`;
- risco de duplicidade financeira deve bloquear avanço ou exigir justificativa auditável futura;
- decisão não libera `in_billing`, `completed`, automação financeira, endpoint novo, migration ou BUILD de integração.

Item executado no checkpoint seguinte:

**`HOFF-028`: permissões técnicas.**

Fechamento HOFF-028 concluído em 2026-05-02:

- permissões técnicas do handoff aprovadas como códigos configuráveis em `/access-control`;
- matriz aprovada: `clinical_handoff.read`, `clinical_handoff.write`, `clinical_handoff.send`, `clinical_handoff.acknowledge`, `clinical_handoff.mark_pending`, `clinical_handoff.resolve_pending`, `clinical_handoff.return`, `clinical_handoff.send_to_finance`, `clinical_handoff.complete` e `clinical_handoff.cancel`;
- `complete` e `cancel` permanecem permissões futuras, sem liberar conclusão/cancelamento na próxima fatia;
- `clinical_handoff.reopen` não foi aprovado para a próxima fatia;
- nomes como clínica, recepção, financeiro, caixa e coordenação continuam templates conversacionais/editáveis, não autorização hardcoded;
- permissões de handoff não liberam Billing, CounterSales, prontuário, agenda, documentos, relatórios, caixa, pagamentos ou auditoria global.

Item executado no checkpoint seguinte:

**`HOFF-029`: migration futura.**

Fechamento HOFF-029 concluído em 2026-05-02:

- migration futura aprovada como estratégia documental, sem criar SQL agora;
- `0045_clinical_handoffs` permanece baseline do `HOFF-MIN-1` e não deve ser editada;
- próxima migration deve ser aditiva, compatível e validada em banco efêmero/clone antes de BUILD;
- `clinical_handoffs` deve ser ampliada para estados/dono/origem financeira/SLA/concorrência da próxima fatia;
- `clinical_handoff_pendings` e `clinical_handoff_events` devem ser tabelas próprias com `accountId`, RLS e índices;
- backfill dos handoffs atuais não cria pendência, evento clínico completo, cobrança, comanda, financeiro, conclusão ou cancelamento;
- decisão não libera endpoint novo, schema real, migration aplicada, inbox completa, automação financeira, `completed` ou `cancelled`.

Item executado no checkpoint seguinte:

**`HOFF-030`: plano de testes unitários da state machine/service.**

Fechamento HOFF-030 concluído em 2026-05-02:

- plano unitário de service/state machine aprovado, sem implementar testes agora;
- regressões do `HOFF-MIN-1` preservadas como obrigatórias: envio, ACK, validações mínimas, duplicidade, `Encounter` fechado, cross-account, hidratação e rollback;
- próxima fatia deve testar `mark-pending`, `resolve-pending`, `return-to-clinic`, reenvio para recepção e `send-to-finance`;
- testes negativos devem cobrir transição inválida, pendência crítica aberta, origem financeira ausente, duplicidade financeira, financeiro direto sem ACK, `completed`, `cancelled`, `in_billing` e `reopen`;
- cada ação aceita deve validar estado final, evento append-only e ausência de side effects financeiros, clínicos, de Queue e de Encounter;
- testes de API/HTTP/permissões por rota ficam para `HOFF-031`; matriz exaustiva de transições fica para `HOFF-032`;
- decisão não libera código, endpoint novo, migration, automação financeira, inbox completa ou BUILD.

Item executado no checkpoint seguinte:

**`HOFF-031`: plano de testes de API, rotas, contratos de erro e permissões por endpoint.**

Fechamento HOFF-031 concluído em 2026-05-02:

- plano de testes de API/HTTP aprovado, sem implementar testes agora;
- superfície mínima atual a preservar: listagem, detalhe, envio para recepção e ACK;
- superfície futura a testar antes de BUILD: reenvio, marcar pendência, resolver pendência, devolver à clínica e enviar ao financeiro;
- cada rota deve cobrir sucesso, payload inválido, ausência de autenticação, permissão insuficiente, cross-account/inexistente, conflito de estado, auditoria e formato de erro;
- permissões futuras seguem `clinical_handoff.*`; `encounters.read/manage` permanece compatibilidade temporária do mínimo atual;
- testes devem garantir ausência de side effects em Billing, CounterSales, comanda, pagamentos, Queue, Encounter, prontuário, exames, prescrições e documentos;
- decisão não libera código, endpoint novo, migration, automação financeira, inbox completa ou BUILD.

Item executado no checkpoint seguinte:

**`HOFF-032`: matriz de transições válidas e inválidas da state machine.**

Fechamento HOFF-032 concluído em 2026-05-02:

- matriz de transições válidas e inválidas aprovada como plano de validação, sem implementar testes agora;
- válidas: ACK, marcar pendência, resolver pendência, devolver à clínica a partir de ACK/pendência, reenviar após devolução e enviar ao financeiro a partir de ACK/pendência tratada;
- bloqueadas: financeiro sem ACK, devolução sem ACK, pendência antes de ACK, reenvio fora de devolução, `sent_to_finance -> in_billing`, `completed`, `cancelled`, `reopen` e fluxo completo `draft/ready_to_send`;
- cada transição aceita deve validar estado final, permissão, payload, evento e ausência de side effects;
- cada transição recusada deve preservar estado, pendências, eventos, Queue, Encounter, Billing e CounterSales;
- decisão não libera código, endpoint novo, migration, automação financeira, inbox completa ou BUILD.

Próximo passo lógico:

**Item executado no checkpoint seguinte: `HOFF-033`, validação UX por papel antes de BUILD.**

Fechamento HOFF-033 concluído em 2026-05-02:

- roteiro UX por papel aprovado sem BUILD;
- templates clínica, recepção, financeiro e coordenação organizam a conversa, mas não autorizam ação por nome;
- validação deve cobrir caminho feliz, sem permissão, leitura sem ação, dados incompletos, estados vazios, erro de carregamento e atraso;
- recepção valida ACK, conferência, pendência, devolução e envio ao financeiro sem editar prontuário nem criar cobrança/comanda;
- financeiro valida contexto rastreável e abertura manual de rotinas próprias, sem `in_billing` automático;
- coordenação valida gargalos, SLA, pendências e auditoria sem side effect;
- resultado de cada cenário deve ser `Aprovado`, `Bloqueado`, `Ajustar` ou `Não se aplica`.

Próximo passo lógico:

**Item executado no checkpoint seguinte: `HOFF-034`, smoke visual da inbox/Encounter/Queue quando aplicável.**

Fechamento HOFF-034 concluído em 2026-05-02:

- plano de smoke visual aprovado sem BUILD;
- escopo visual cobre inbox/recepção, Encounter e Queue quando houver superfície aplicável;
- viewports mínimos: desktop operacional, largura intermediária e mobile quando a tela for responsiva ou usada em plantão;
- checks obrigatórios: sem tela em branco, sem overflow horizontal, sem sobreposição, texto legível, CTA primária correta, estados vazio/erro/sem permissão estáveis e status não dependente só de cor;
- inbox valida filtros, itens, pendências, atraso, ações e estados `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`;
- Encounter valida resumo/timeline e ações contextuais sem assumir `handoffStatus`;
- Queue valida badge/overlay/link derivado sem criar status persistido ou transição por inferência;
- decisão não libera código, endpoint novo, migration, automação financeira, inbox completa ou BUILD.

Próximo passo lógico:

**Item executado no checkpoint seguinte: `HOFF-035`, auditoria/eventos da próxima fatia.**

Fechamento HOFF-035 concluído em 2026-05-02:

- plano de auditoria/eventos aprovado sem BUILD;
- cada ação mutável aceita da próxima fatia deve gerar um evento append-only;
- eventos obrigatórios: envio/reenvio, ACK, pendência marcada, pendência resolvida, devolução clínica e envio ao financeiro;
- ações recusadas por permissão, conta, payload, estado ou conflito não geram evento operacional de handoff;
- eventos devem registrar conta, handoff, atendimento, ator, permissão efetiva, estado anterior/novo, timestamp, correlação e payload mínimo;
- idempotência deve evitar duplicidade de evento em retry;
- payload não pode carregar prontuário completo, documento completo, cobrança completa, valor sensível ou PII desnecessária;
- timeline de Encounter e leitura de Queue podem consumir resumo, mas não substituem a fonte auditável;
- decisão não libera código, endpoint novo, migration, event store, automação financeira, inbox completa ou BUILD.

Próximo passo lógico:

**Item executado no checkpoint seguinte: `HOFF-036`, rollback e mitigação.**

Fechamento HOFF-036 concluído em 2026-05-02:

- rollback e mitigação aprovados sem BUILD;
- a próxima fatia deve poder ser desativada sem perder o mínimo atual de envio, listagem/detalhe, ACK e timeline/auditoria mínima;
- endpoints novos, ações novas e overlays visuais devem ser desligáveis sem afetar o `HOFF-MIN-1`;
- estados novos eventualmente gravados devem continuar legíveis, auditáveis e recuperáveis;
- rollback não pode apagar ou reescrever `0045_clinical_handoffs`;
- rollback não pode criar cobrança, comanda, pagamento, baixa, documento, exame, prescrição ou edição clínica;
- correção de dados, se necessária, deve ser procedimento explícito, auditado e autorizado;
- decisão não libera código, endpoint novo, migration, feature flag real, automação financeira, inbox completa ou BUILD.

Próximo passo lógico e final desta fase:

**Item executado no checkpoint seguinte: `HOFF-037`, validação com operação antes de BUILD.**

Fechamento HOFF-037 concluído em 2026-05-02:

- validação final com operação aprovada sem BUILD;
- operação aceitou o recorte como fluxo operacional, não como autorização nominal por setor/cargo/grupo;
- próxima fatia candidata fica limitada a pendência, resolução, devolução clínica, reenvio e envio ao financeiro explícito;
- continuam fora: `completed`, `cancelled`, `in_billing`, `reopen`, automação financeira, inbox completa e fluxo completo de rascunho;
- DEV continua bloqueado até autorização explícita do responsável;
- fase de planejamento pré-BUILD encerrada em `HOFF-037`;
- não criar `HOFF-038` sem nova autorização explícita.

Decisão pendente fora desta fase:

**Escolher entre autorizar BUILD da primeira fatia pequena, pausar a frente ou reabrir item específico por bloqueio real.**

## 7. Guardrail atualizado

Para evitar desorganização:

- não abrir nova bateria de testes micro de Billing agora;
- não implementar inbox completa antes de decidir a entidade/state machine de handoff;
- não criar cobrança/comanda automaticamente a partir de handoff;
- não tratar a lista mínima de HOFF-MIN-1 como inbox completa;
- não avançar fluxos especializados antes de fechar a continuidade clínica -> recepção.

## 8. Status recomendado para o programa

Nota operacional atual da frente de UX operacional: **74/100**.

Motivo:

- há base real construída e navegável;
- a jornada principal já tem superfícies conectadas;
- Billing persistente foi estabilizado;
- mas o coração operacional planejado ainda não está completo porque faltam dono atual amplo, inbox de recepção completa, state machine expandida, devolução clínica e validação formal por papel.

Marco OP-VAL-1:

**Executado em `898`; P0 de `Esteira -> Atendimento` corrigido; walkthrough completo aprovado.**

Novo critério de saída:

- manter `e2e/spa/operational-walkthrough.spec.ts` passando;
- registrar P1 de cleanup de agendamento como dívida secundária;
- validar RH/governança de acesso antes de ampliar a recepção para comanda, cobrança, documentos ou fechamento operacional;
- não criar automação financeira implícita.
