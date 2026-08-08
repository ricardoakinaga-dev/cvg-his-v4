# 895 - Backlog Handoff Clínico

Data: 2026-04-29
Status: rascunho priorizado para validação
Origem: `docs/891-spec-handoff-clinico-recepcao.md`, `docs/892-state-machine-handoff-operacional.md`, `docs/893-prd-inbox-recepcao-finalizacao.md`, `docs/894-spec-api-handoff-clinico.md`

## 0. Status

Rascunho priorizado para validação.

Não autoriza implementação. DEV permanece bloqueado.

Este backlog organiza trabalho futuro de discovery, validação, UX, API, QA e BUILD. Itens DEV são marcadores futuros e não autorizam código, migration, rota, componente, schema ou alteração de backend.

Atualização em 2026-05-01:

- O walkthrough operacional `898` encontrou e fechou o bloqueio P0 antes do handoff: `Abrir triagem` falhava com `Invalid queue entry status transition`.
- O fluxo principal foi reexecutado até `Atendimento -> Prontuário -> Comanda/Billing`.
- A primeira fatia candidata agora é `HOFF-MIN-1`: envio mínimo para recepção com ACK, sem inbox completa e sem automação financeira.

Atualização posterior em 2026-05-01:

- `HOFF-MIN-1` foi implementado como fatia mínima: entidade/summary `ClinicalHandoff`, service/state machine mínima, API `/clinical-handoffs`, envio clínico para recepção, ACK da recepção, timeline/auditoria e UI em `EncounterDetailPage` + `ReceptionGatewayPage`.
- O escopo respeitou o guardrail: não cria Billing, CounterSales/comanda, cobrança, inbox completa, devolução clínica, envio ao financeiro ou automação operacional.
- Persistência inicial ficou no boundary de service/repository com repositório em memória conectado ao runtime.

Atualização de persistência em 2026-05-01:

- A fatia SQL de `clinical_handoffs` foi implementada: migration `0045_clinical_handoffs`, schema Drizzle, `DatabaseClinicalHandoffRepository` e bootstrap usando repository SQL quando a tabela existir.
- A validação real de banco cobriu migration registrada, RLS por `account_id`, bloqueio de leitura entre contas e hidratação após recriar serviços mantendo `sent_to_reception -> acknowledged_by_reception`.
- O escopo segue sem inbox completa, sem automação financeira e sem criação automática de cobrança/comanda.

Atualização de inbox mínima em 2026-05-01:

- `ReceptionGatewayPage` passou de lista/preview para inbox mínima de handoffs: contadores de aguardando ACK, alta/crítica e recebidos; filtro simples `Aguardando`/`Recebidos`; ação de ACK; atalhos para Atendimento, Paciente e Tutor.
- O atalho financeiro foi removido dessa área para preservar o guardrail: handoff não cria nem induz cobrança/comanda automaticamente.
- Continua fora do escopo: inbox completa, SLA, devolução clínica, dono operacional amplo, conclusão/cancelamento de handoff e automação financeira.

Atualização de escopo em 2026-05-01:

- A decisão `899` separa fluxo operacional de autorização: handoff modela a jornada; RH/governança define quem pode executar cada rotina.
- Não devemos codificar no handoff regras fixas como "recepção pode fechar cobrança"; essas capacidades devem vir de usuários, grupos, equipes, setores e permissões.
- Antes de expandir o pós-atendimento, o ponto lógico é validar se RH/governança suporta a customização necessária de permissões por usuário, grupo e setor, sem depender do nome do cargo, profissão, setor ou grupo.
- Profissional cadastrado continua sendo identidade operacional/assistencial para agenda, receitas, relatórios e prontuários; autorização fina continua em usuário/grupo/setor/permissão.
- O doc `900` registra templates conversacionais para manter a conversa humana organizada sem criar autorização nominal.

Validação em 2026-05-01:

- `RH-VAL-1` concluído.
- `/access-control` validado com grupo pré-configurado editável, novo grupo, vínculo usuário-grupo-setor, grants `allow`/`deny`/`inherit`, permissão efetiva por rotina e bloqueio de endpoint protegido.
- A rota foi endurecida contra escrita cross-account em vínculos, grants e atualização de grupo/setor.

Alinhamento HOFF-GOV-1 em 2026-05-01:

- `891`, `892`, `893` e `894` foram alinhados à governança neutra de acesso.
- Nomes como clínica, recepção, financeiro, caixa, gestor e coordenação ficaram documentados como templates conversacionais/operacionais, não como autorização.
- Permissões iniciais do handoff passaram a ser códigos técnicos configuráveis, como `clinical_handoff.read`, `clinical_handoff.send`, `clinical_handoff.acknowledge`, `clinical_handoff.return`, `clinical_handoff.complete` e `clinical_handoff.cancel`.
- A próxima expansão da inbox/pós-atendimento deve consultar permissão efetiva no `/access-control`, sem `if` por nome de setor, cargo, grupo ou profissão.

Fechamento HOFF-001/HOFF-002 em 2026-05-01:

- `HOFF-001` aprovado: pré-handoff é contexto visual/operacional; `HOFF-MIN-1` é handoff mínimo persistido com envio e ACK; handoff completo continua futuro e bloqueado.
- `HOFF-002` aprovado: `clinicalStatus`, `operationalStatus`, `billingStatus` e `handoffStatus` são dimensões separadas.
- `pronto_para_recepcao` não é `clinicalStatus`; no estágio atual é leitura operacional derivada de `handoffStatus = sent_to_reception`, sem nova sincronização obrigatória com `Queue`.
- A aprovação não libera novos endpoints, migrations, automação financeira, devolução clínica, conclusão/cancelamento de handoff ou inbox completa.

Fechamento HOFF-003/HOFF-004 em 2026-05-01:

- `HOFF-003` aprovado: handoff completo será entidade própria `ClinicalHandoff`, integrada a `Encounter`, `Queue` e eventos auditáveis.
- `Encounter` permanece contexto clínico/operacional obrigatório; `Queue` pode refletir leitura/sincronização derivada; eventos auditáveis registram transições; nenhum deles substitui a entidade.
- `HOFF-004` aprovado: recepção/finalização operacional é checkpoint padrão antes de financeiro na próxima expansão.
- Caminho direto clínica -> financeiro não está aprovado para a próxima fatia; só pode ser reavaliado futuramente como exceção explícita, auditada, sem pendências e com permissão efetiva.
- A aprovação não libera código, migration, automação financeira, criação de cobrança/comanda, conclusão/cancelamento ou inbox completa.

Fechamento HOFF-005/HOFF-006 em 2026-05-01:

- `HOFF-005` aprovado: próxima fatia usa `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`.
- `ready_to_send` permanece aceito tecnicamente, mas o fluxo completo de rascunho/preparo fica adiado.
- `draft`, `waiting_owner_decision`, `in_billing`, `completed` e `cancelled` ficam fora da próxima fatia.
- `HOFF-006` aprovado: transições pós-ACK liberadas conceitualmente para marcar/resolver pendência, devolver à clínica, reenviar à recepção e encaminhar ao financeiro explicitamente.
- Transições diretas sem ACK, conclusão/cancelamento e integração Billing/CounterSales completa seguem bloqueadas.

Fechamento HOFF-008/HOFF-009 em 2026-05-01:

- `HOFF-008` aprovado: bloqueios gerais de conta, permissão, estado, auditoria, duplicidade e automação indevida.
- Bloqueios específicos definidos para envio/reenviar à recepção, ACK, pendência, devolução clínica e envio ao financeiro.
- `HOFF-009` aprovado: pendências críticas classificadas como `clinical`, `documentation`, `billing_origin`, `owner_guidance`, `diagnostic`, `operational_owner` e `accountability`.
- Pendência crítica aberta bloqueia envio ao financeiro e conclusão futura; pendência não crítica pode seguir com dono e justificativa auditável.
- A aprovação não libera conclusão/cancelamento, criação de cobrança/comanda ou integração Billing/CounterSales completa.

Fechamento HOFF-011/HOFF-012 em 2026-05-01:

- `HOFF-011` aprovado: recepção/finalização recebe via `sent_to_reception`, confirma ACK, confere resumo, tutor, paciente, documentos, prescrições, exames, retornos, serviços, origem financeira e pendências.
- Toda pendência da recepção/finalização deve ter tipo, motivo, dono e criticidade; pendência crítica mantém o caso em resolução ou devolução clínica.
- Recepção/finalização só encaminha ao financeiro quando houver conferência operacional registrada, origem financeira rastreável e nenhuma pendência crítica aberta.
- `HOFF-012` aprovado: financeiro recebe somente `sent_to_finance` como encaminhamento rastreável.
- `sent_to_finance` não cria `billing_record`, item de billing, comanda, pagamento, baixa, parcela, nota ou estado `in_billing`.
- Cobrança, negociação, baixa ou ajuste financeiro continuam nas rotinas próprias, com permissão efetiva própria.
- A aprovação não libera conclusão `completed`, cancelamento, financeiro direto clínica -> financeiro, automação financeira ou inbox completa.

Fechamento HOFF-021/HOFF-022 em 2026-05-01:

- `HOFF-021` aprovado: endpoints candidatos da próxima fatia são `mark-pending`, `resolve-pending`, `return-to-clinic` e `send-to-finance`.
- `HOFF-022` aprovado: payloads mínimos e opcionais dessas ações foram definidos no `894`, com request explícito, resposta previsível, erros candidatos e sem side effect financeiro automático.
- A aprovação é de contrato de ações; `HOFF-020` foi fechado posteriormente para schema/entidade futura, persistência de pendências e migration quando houver autorização.
- `mark-pending` cria pendência endereçável com `pendingId`, tipo, motivo, dono, criticidade e bloqueio financeiro.
- `resolve-pending` exige `pendingId` e resolução/justificativa; se restarem pendências críticas, o handoff continua em `waiting_pending_resolution`.
- `return-to-clinic` exige motivo e destino clínico; não edita prontuário.
- `send-to-finance` exige conferência operacional e origem financeira rastreável; não cria cobrança, comanda, pagamento, baixa, parcela, nota ou `in_billing`.
- A aprovação não libera implementação, migration, `completed`, `cancel`, `ready` completo, automação financeira, Billing/CounterSales completo ou inbox completa.

Fechamento HOFF-023 em 2026-05-01:

- Eventos auditáveis aprovados para a próxima fatia: `clinical_handoff.sent_to_reception`, `clinical_handoff.acknowledged`, `clinical_handoff.pending_marked`, `clinical_handoff.pending_resolved`, `clinical_handoff.returned_to_clinic` e `clinical_handoff.sent_to_finance`.
- Payload mínimo aprovado: `eventId`, `eventType`, `accountId`, `handoffId`, `encounterId`, `queueItemId` quando houver, ator, permissão efetiva usada, estado anterior, novo estado, motivo quando aplicável, `pendingId` quando aplicável, destino operacional quando houver, resumo mínimo, `occurredAt` e `requestId`/idempotência quando necessário.
- Eventos são append-only e não substituem `ClinicalHandoff`, pendências estruturadas, Billing ou CounterSales.
- Eventos não devem carregar prontuário completo, receita completa, laudo completo, valor sensível ou dados pessoais desnecessários.
- A aprovação não libera código, migration, `completed`, `cancel`, `billing_started`, automação financeira ou inbox completa.

Fechamento HOFF-013/HOFF-016 em 2026-05-01:

- `HOFF-013` aprovado: inbox da próxima fatia organiza `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`.
- Filtros visuais aprovados: status/grupo, criticidade, tipo de pendência, responsável atual, prioridade, atraso, origem e busca operacional.
- Campos mínimos aprovados: identidade, estado, contexto clínico-operacional, pendências, financeiro contextual e ações.
- Ações por estado aprovadas com CTA primária única: assumir, conferir, resolver pendência, acompanhar devolução e acompanhar financeiro.
- `HOFF-016` aprovado: estados vazios e sem permissão definidos para carregando, sem handoffs ativos, sem resultado, sem crítica, erro, dados incompletos, sem leitura e leitura sem ação.
- Estados sem permissão dependem de permissão efetiva no `/access-control`; não usam nome de setor, cargo, profissão ou grupo.
- A aprovação não libera implementação, API final, `completed`, `cancelled`, `in_billing`, SLA amplo ou automação financeira.

Fechamento HOFF-014/HOFF-015 em 2026-05-01:

- `HOFF-014` aprovado: resumo mínimo para envio/reenvio exige atendimento, tutor/paciente quando aplicáveis, `clinicalSummary`, `receptionInstructions`, destino operacional, prioridade, declaração explícita de pendências e status de origem financeira.
- Campos condicionais aprovados: exames, prescrições, documentos, billing, orçamentos e resposta à devolução quando o handoff volta de `returned_to_clinic`.
- Resumo mínimo não é prontuário completo e não cria exame, prescrição, documento, orçamento, cobrança ou comanda.
- `HOFF-015` aprovado: devolução clínica exige `returnType`, motivo, destino clínico e `relatedPendingId` quando nascer de pendência ativa.
- Motivos controlados aprovados: `summary_missing`, `documentation_needed`, `prescription_clarification`, `diagnostic_clarification`, `reassessment_needed`, `billing_origin_clinical` e `other`.
- Devolução clínica não resolve pendência puramente financeira e não permite edição de prontuário pela recepção.
- A aprovação não libera implementação, API final, `completed`, `cancelled`, `in_billing`, automação financeira ou inbox completa.

Fechamento HOFF-024 em 2026-05-01:

- `HOFF-024` aprovado: filtros de listagem da inbox/API mapeados entre UI e query params.
- Filtros aprovados incluem status/grupo, criticidade, tipo/status de pendência, responsável atual, prioridade, origem, tutor, paciente, atendimento, Queue, busca, datas, atraso visual e origem financeira.
- Paginação aprovada com `limit` máximo 100 e `offset`; ordenação candidata por pendência crítica, atraso, prioridade, chegada e atualização.
- Listagem exige `clinical_handoff.read`, respeita `accountId`, rejeita parâmetro ou valor inválido e não usa filtro como autorização.
- `ageBucket` fica aprovado como filtro visual candidato e os limiares de SLA/atraso foram encaminhados para `HOFF-017`.
- A aprovação não libera implementação, API final, `completed`, `cancelled`, `in_billing`, automação financeira, SLA amplo ou inbox completa.

Fechamento HOFF-017 em 2026-05-02:

- `HOFF-017` aprovado: SLA/alerta de atraso definido como leitura operacional derivada de `waitingSince`.
- Buckets aprovados: `normal`, `attention` e `overdue`.
- Campos candidatos aprovados: `waitingSince`, `waitingMinutes`, `ageBucket`, `slaLabel`, `slaBreachedAt` e `slaReason`.
- Limiar candidato: aguardando ACK 15/30 min, em finalização 30/60 min, pendência crítica 30/60 min, pendência não crítica 120/240 min, devolvido 60/120 min e enviado ao financeiro 60/120 min.
- Limiar deve ser configurável futuramente e não virar regra hardcoded por setor, cargo, grupo ou profissão.
- Atraso não muda `handoffStatus`, não concede permissão, não bloqueia sozinho e não dispara devolução, financeiro, cobrança, comanda, conclusão ou cancelamento automático.
- A aprovação não libera implementação, API final, `completed`, `cancelled`, `in_billing`, automação financeira ou inbox completa.

Fechamento HOFF-018 em 2026-05-02:

- `HOFF-018` aprovado: critérios de finalização operacional futura definidos para `completed`.
- `completed` encerra o handoff operacional, mas não fecha prontuário, Encounter, Queue, Billing, CounterSales ou comanda.
- Estados candidatos de origem futura: `acknowledged_by_reception`, `waiting_pending_resolution` e `sent_to_finance`.
- Critérios obrigatórios: ACK, conferência operacional, permissão efetiva `clinical_handoff.complete`, ausência de pendência crítica aberta, origem financeira tratada e auditoria.
- Pendência residual só pode permanecer como não bloqueante, com dono, motivo e justificativa.
- Payload candidato inclui `completionType`, `completionReason`, `operationalReview`, `financialOutcome`, pendências residuais, observação e idempotência.
- A conclusão não cria cobrança, comanda, pagamento, baixa, nota, exame, prescrição, documento ou edição clínica.
- A aprovação não libera implementação, API final, cancelamento, `in_billing`, automação financeira ou inbox completa.

Fechamento HOFF-019 em 2026-05-02:

- `HOFF-019` aprovado: checklist operacional definido para validar o handoff por papel, transição, bloqueio e auditoria.
- Checklist cobre preparação clínica, envio/reenvio, ACK, inbox da recepção, pendências, devolução clínica, envio ao financeiro, SLA/atraso, finalização futura e permissões.
- Validação deve confirmar que nomes como clínica, recepção, financeiro e coordenação continuam templates operacionais, não autorização hardcoded.
- Cada item validado deve registrar resultado `Aprovado`, `Bloqueado`, `Ajustar` ou `Não se aplica`, com evidência e prioridade quando houver falha.
- P0/P1 devem bloquear BUILD; P2/P3 podem entrar no backlog desde que não gerem risco clínico, financeiro, jurídico ou operacional.
- A aprovação não libera implementação, API final, `completed`, cancelamento, `in_billing`, automação financeira ou inbox completa.

Checklist operacional aprovado:

| Frente | Deve validar |
| --- | --- |
| Clínica | Resumo mínimo, pendências declaradas, origem financeira, destino, prioridade e resposta à devolução. |
| Recepção/finalização | ACK, conferência operacional, pendências, responsável atual, devolução clínica, envio financeiro e estados sem permissão. |
| Financeiro | Encaminhamento explícito, origem rastreável, ausência de cobrança automática, risco de duplicidade e retorno/resultado manual. |
| Coordenação | Filtros, SLA/atraso, histórico, eventos auditáveis, gargalos e itens sem dono. |
| Governança | Permissão efetiva por rotina, grants, conta/tenant e ausência de regra por nome de setor/cargo/grupo/profissão. |

Fechamento HOFF-020 em 2026-05-02:

- `HOFF-020` aprovado: entidade/schema futuro de `ClinicalHandoff` validado conceitualmente.
- Modelo aprovado em três camadas: `clinical_handoffs`, `clinical_handoff_pendings` e `clinical_handoff_events`.
- A migration atual `0045_clinical_handoffs` permanece como HOFF-MIN-1, cobrindo envio, ACK, RLS e hidratação mínima.
- Schema futuro deve manter `ClinicalHandoff` como fonte do `handoffStatus`; `Encounter`, `Queue`, Billing e eventos não substituem a entidade.
- Pendências estruturadas devem conter tipo, status, criticidade, bloqueio financeiro, dono, motivo, resolução e vínculo opcional com devolução.
- Eventos auditáveis devem ser append-only, com ator, permissão efetiva, estado anterior/novo, motivo, `pendingId` quando aplicável, idempotência e payload mínimo.
- Migração futura deve preservar RLS por `accountId`, índices por status/dono/pendência/tempo, controle de concorrência e bloqueio cross-account.
- A aprovação não libera migration, alteração de schema, endpoint novo, automação financeira, `completed`, cancelamento, `in_billing` ou inbox completa.

Fechamento HOFF-025 em 2026-05-02:

- `HOFF-025` aprovado: impacto na Queue definido como leitura/overlay operacional derivado de `ClinicalHandoff`.
- A Queue mantém state machine própria; no estado real atual, não entram novos status persistidos como `pronto_para_recepcao`, `aguardando_finalizacao`, `pendente_handoff` ou `aguardando_financeiro`.
- `ClinicalHandoff` continua fonte do `handoffStatus`; Queue pode mostrar badge, link, grupo de inbox, atraso, pendência crítica e responsável atual derivados.
- Endpoints de Queue não criam handoff, ACK, pendência, devolução, envio financeiro, cobrança ou comanda.
- Endpoints de handoff não concluem, cancelam, reabrem ou movem Queue automaticamente.
- Divergência entre Queue terminal e handoff ativo deve virar alerta operacional ou pendência, não autocorreção silenciosa.
- A aprovação não libera alteração de `scheduling_queue_entries`, endpoint novo, migration, sincronização bidirecional, automação financeira, `completed`, cancelamento ou BUILD de integração.

Fechamento HOFF-026 em 2026-05-02:

- `HOFF-026` aprovado: impacto no Encounter definido como âncora contextual obrigatória, timeline resumida e leitura derivada de handoff.
- Encounter mantém status próprio; no estado real atual, não entram novos status persistidos de handoff no Encounter.
- `ClinicalHandoff` continua fonte do `handoffStatus`; Encounter fornece tutor, paciente, origem, atendimento, agenda, Queue quando houver e navegação.
- Envio/reenvio de handoff exige Encounter válido, da mesma conta e não fechado.
- `closeEncounter` não cria ACK, devolução, envio financeiro, conclusão, cancelamento, cobrança ou comanda.
- Completar handoff futuramente não fecha Encounter automaticamente.
- Divergência entre Encounter fechado e handoff ativo deve virar alerta operacional ou pendência, não autocorreção silenciosa.
- A aprovação não libera alteração de `encounters`, endpoint novo, migration, automação financeira, `completed`, cancelamento ou BUILD de integração.

Fechamento HOFF-027 em 2026-05-02:

- `HOFF-027` aprovado: impacto em Billing/CounterSales definido como contexto financeiro, links e proteção contra duplicidade.
- `sent_to_finance` é encaminhamento operacional rastreável, não criação de cobrança, comanda, recebível, pagamento, baixa, parcela, nota ou movimento de caixa.
- Handoff não chama rotas de Billing, Encounter Billing, Encounter Financial, receivables, payments ou CounterSales como side effect.
- Billing/CounterSales continuam rotinas próprias, por ação explícita e permissão efetiva própria.
- Falta de origem financeira rastreável vira pendência `billing_origin`.
- Risco de duplicidade financeira bloqueia avanço ou exige justificativa auditável em contrato futuro.
- A aprovação não libera `in_billing`, `completed`, automação financeira, endpoint novo, migration, integração com gateway de pagamento ou BUILD de integração.

Fechamento HOFF-028 em 2026-05-02:

- `HOFF-028` aprovado: permissões técnicas por endpoint e ação de handoff foram fechadas como códigos configuráveis em `/access-control`.
- `HOFF-007` fica atendido por esta decisão: a matriz aprovada é técnica, não nominal.
- Permissões aprovadas: `clinical_handoff.read`, `clinical_handoff.write`, `clinical_handoff.send`, `clinical_handoff.acknowledge`, `clinical_handoff.mark_pending`, `clinical_handoff.resolve_pending`, `clinical_handoff.return`, `clinical_handoff.send_to_finance`, `clinical_handoff.complete` e `clinical_handoff.cancel`.
- `complete` e `cancel` são permissões aprovadas para contrato futuro, mas não liberam BUILD de conclusão ou cancelamento.
- `clinical_handoff.reopen` não entra na próxima fatia e depende de SPEC futura se necessário.
- Nomes como clínica, recepção, financeiro, caixa e coordenação seguem como templates conversacionais/editáveis, sem virar autorização hardcoded.
- Permissões de handoff não substituem permissões de Billing, CounterSales, prontuário, agenda, documentos, relatórios, caixa, pagamentos ou auditoria global.
- A aprovação não libera endpoint novo, migration, alteração de catálogo, automação financeira, inbox completa, `completed`, `cancelled` ou BUILD.

Fechamento HOFF-029 em 2026-05-02:

- `HOFF-029` aprovado: migration futura deve ser nova, aditiva e compatível com a `0045_clinical_handoffs`, sem editar a migration baseline.
- A próxima migration futura deve ampliar `clinical_handoffs` com campos seguros para dono operacional, pendência declarada, origem financeira, atraso/SLA e controle de concorrência.
- A constraint de `handoff_status` deve aceitar somente estados aprovados para a próxima fatia, sem liberar `completed`, `cancelled`, `in_billing` ou `reopen`.
- `clinical_handoff_pendings` e `clinical_handoff_events` devem nascer como tabelas próprias, com `accountId`, RLS, índices, vínculos explícitos e eventos append-only.
- Backfill dos handoffs atuais deve preservar envio/ACK do `HOFF-MIN-1`, sem inventar pendências, eventos clínicos completos, financeiro, conclusão, cancelamento, cobrança ou comanda.
- Migration de handoff não altera Queue, Encounter, Billing, CounterSales, recebíveis, pagamentos, prontuário ou catálogo de permissões como side effect.
- A aprovação não libera arquivo SQL, alteração de schema, endpoint novo, automação financeira, inbox completa, `completed`, cancelamento ou BUILD.

Fechamento HOFF-030 em 2026-05-02:

- `HOFF-030` aprovado: plano de testes unitários de service/state machine definido antes de BUILD.
- Regressões mínimas obrigatórias: envio para recepção, ACK, ACK duplicado, resumo/instrução obrigatórios, duplicidade por atendimento, bloqueio de `Encounter` fechado, cross-account, hidratação e rollback em falha de repository.
- Próxima fatia deve ter unitários para `mark-pending`, `resolve-pending`, `return-to-clinic`, reenvio para recepção e `send-to-finance`.
- Testes negativos devem bloquear transições fora de estado, pendência crítica aberta, origem financeira ausente, risco de duplicidade financeira, devolução sem destino, financeiro direto sem ACK, `completed`, `cancelled`, `in_billing` e `reopen`.
- Cada teste de ação aceita deve validar estado final, evento append-only esperado e ausência de side effects em Queue, Encounter, Billing, CounterSales, comanda, pagamento, baixa, prontuário, exame, prescrição ou documento.
- `HOFF-030` não implementa testes; ele define o plano. Testes HTTP/API/permissões por rota ficam para `HOFF-031` e matriz exaustiva de transições para `HOFF-032`.
- A aprovação não libera código, endpoint novo, migration, automação financeira, inbox completa, `completed`, cancelamento ou BUILD.

Fechamento HOFF-031 em 2026-05-02:

- `HOFF-031` aprovado: plano de testes de API, rotas, contratos de erro e permissões por endpoint definido antes de BUILD.
- Superfície mínima atual a preservar: `GET /clinical-handoffs`, `GET /clinical-handoffs/:id`, `POST /clinical-handoffs/send-to-reception` e `POST /clinical-handoffs/:id/acknowledge`.
- Superfície futura a testar antes de implementação: `POST /clinical-handoffs/:id/send-to-reception`, `mark-pending`, `resolve-pending`, `return-to-clinic` e `send-to-finance`.
- Casos obrigatórios: sucesso, payload inválido, autenticação ausente, permissão insuficiente, recurso inexistente/cross-account, conflito de estado, auditoria HTTP e formato de erro previsível.
- Permissões futuras devem seguir `clinical_handoff.*`; o uso atual de `encounters.read/manage` fica registrado como compatibilidade temporária do `HOFF-MIN-1`.
- Testes de API devem confirmar que handoff não cria Billing, CounterSales, comanda, recebível, pagamento, baixa, nota, prontuário, exame, prescrição, documento, nem move Queue/Encounter por side effect.
- `HOFF-031` não implementa testes; ele define o plano. Matriz exaustiva de transições válidas/inválidas fica para `HOFF-032`.
- A aprovação não libera código, endpoint novo, migration, automação financeira, inbox completa, `completed`, cancelamento ou BUILD.

Fechamento HOFF-032 em 2026-05-02:

- `HOFF-032` aprovado: matriz de transições válidas e inválidas da state machine definida antes de BUILD.
- Transições válidas da próxima fatia: ACK, marcar pendência, resolver pendência, devolver à clínica a partir de ACK/pendência, reenviar após devolução e enviar ao financeiro a partir de ACK/pendência tratada.
- Transições bloqueadas: financeiro sem ACK, devolução sem ACK, pendência antes de ACK, reenvio fora de devolução, `sent_to_finance -> in_billing`, qualquer transição para `completed`/`cancelled` nesta fatia, `reopen` e fluxo completo `draft/ready_to_send`.
- Cada transição aceita exige conta, permissão efetiva, payload obrigatório, evento append-only e ausência de side effects.
- Cada transição recusada deve preservar estado, pendências, eventos e integrações relacionadas.
- A aprovação não libera código, endpoint novo, migration, automação financeira, inbox completa, `completed`, cancelamento ou BUILD.

## 1. Objetivo

Organizar discovery, validação, UX, API, QA e BUILD futuro do handoff clínico.

O objetivo é transformar a frente de handoff clínico em pacotes pequenos, rastreáveis e dependentes de aprovação, evitando implementação prematura de estado, API, inbox, persistência, billing ou integração com Queue/Encounter.

## 2. Legenda

Tipos:

- DOC: documentação, decisão ou especificação.
- UX: desenho de fluxo, jornada, regra operacional ou experiência.
- UI: desenho visual/interface.
- API: contrato técnico candidato, dados, endpoints, eventos ou permissões.
- QA: validação, teste, auditoria ou critério de aceite.
- DEV: implementação futura, somente com aprovação explícita.

Status:

- Aberto.
- Em análise.
- Em especificação.
- Aguardando aprovação.
- Aprovado.
- Bloqueado.
- Concluído.
- Cancelado.

Observações:

- `Aprovado` não significa autorização de código.
- DEV só pode sair de `Bloqueado` após aprovação explícita do responsável.
- BUILD só pode ocorrer quando critérios de liberação deste backlog forem cumpridos.

## 3. Dependências

Dependências obrigatórias antes de qualquer BUILD:

- aprovação de `891-spec-handoff-clinico-recepcao.md`;
- aprovação de `892-state-machine-handoff-operacional.md`;
- aprovação de `893-prd-inbox-recepcao-finalizacao.md`;
- aprovação de `894-spec-api-handoff-clinico.md`;
- decisão de entidade própria vs extensão `Queue`/`Encounter` vs evento auditável vs combinação; concluída em HOFF-003;
- decisão se todo handoff passa pela recepção ou se alguns casos podem ir direto ao financeiro; concluída em HOFF-004 para a próxima fase;
- permissões aprovadas;
- state machine aprovada;
- definição de pendência crítica;
- decisão de impacto em Billing/CounterSales;
- estratégia de rollback;
- estratégia de auditoria/eventos.

## 4. P0 - Decisões de base

| ID       | Tipo | Item                                        | Resultado esperado                                                                 | Dependência   | Status |
| -------- | ---- | ------------------------------------------- | ---------------------------------------------------------------------------------- | ------------- | ------ |
| HOFF-001 | DOC  | Validar objetivo do handoff                 | Fronteira entre pré-handoff, `HOFF-MIN-1` e handoff completo aprovada              | 891           | Aprovado |
| HOFF-002 | DOC  | Validar separação de statuses               | `clinicalStatus`, `operationalStatus`, `billingStatus` e `handoffStatus` aprovados | 892           | Aprovado |
| HOFF-003 | DOC  | Decidir entidade/evento/estado/combinação   | `ClinicalHandoff` como entidade própria com integrações aprovado                   | 891, 892, 894 | Aprovado |
| HOFF-004 | UX   | Decidir se todo handoff passa pela recepção | Recepção/finalização como checkpoint padrão antes de financeiro aprovada           | 891, 892      | Aprovado |
| HOFF-005 | UX   | Aprovar estados candidatos                  | Estados da próxima fatia pós-ACK aprovados                                         | 892           | Aprovado |
| HOFF-006 | UX   | Aprovar transições candidatas               | Transições pós-ACK de pendência, devolução e envio financeiro aprovadas            | 892           | Aprovado |
| HOFF-007 | DOC  | Aprovar permissões técnicas                 | Códigos técnicos e governança configurável validados                               | 891, 894      | Aprovado |
| HOFF-008 | UX   | Aprovar bloqueios candidatos                | Regras de bloqueio para transições da próxima fatia aprovadas                      | 892           | Aprovado |
| HOFF-009 | UX   | Definir pendências críticas                 | Tipos de pendência crítica e bloqueio financeiro aprovados                         | 887, 888, 891 | Aprovado |

## 5. P1 - UX e operação

| ID       | Tipo | Item                            | Resultado esperado                                                  | Dependência         | Status |
| -------- | ---- | ------------------------------- | ------------------------------------------------------------------- | ------------------- | ------ |
| HOFF-010 | UX   | Detalhar jornada do veterinário | Fluxo preparar, revisar e enviar handoff definido                   | HOFF-001, HOFF-005  | Aberto |
| HOFF-011 | UX   | Detalhar jornada da recepção    | Fluxo receber, conferir e encaminhar definido sem concluir automaticamente | HOFF-004, 893       | Aprovado |
| HOFF-012 | UX   | Detalhar jornada do financeiro  | Fluxo receber encaminhamento e operar cobrança manualmente sem automação indevida | HOFF-004, HOFF-009  | Aprovado |
| HOFF-013 | UX   | Definir inbox da recepção       | Estados, filtros, campos e ações da inbox aprovados                 | 893                 | Aprovado |
| HOFF-014 | UX   | Definir resumo mínimo           | Campos mínimos para envio aprovados                                 | HOFF-008, HOFF-009  | Aprovado |
| HOFF-015 | UX   | Definir devolução clínica       | Motivos, responsáveis e retorno para veterinário definidos          | HOFF-006, HOFF-007  | Aprovado |
| HOFF-016 | UI   | Definir estados vazios          | Inbox sem itens, sem permissão e sem resultados especificada        | HOFF-013            | Aprovado |
| HOFF-017 | UX   | Definir SLA/alerta de atraso    | Tempo aguardando e alerta operacional definidos                     | HOFF-013            | Aprovado |
| HOFF-018 | UX   | Definir finalização operacional | Critérios para `completed` e fechamento operacional definidos       | HOFF-006, HOFF-009  | Aprovado |
| HOFF-019 | QA   | Criar checklist operacional     | Checklist por papel para validar handoff criado                     | HOFF-010 a HOFF-018 | Aprovado |

## 6. P1 - API e dados

| ID       | Tipo | Item                                    | Resultado esperado                                                | Dependência         | Status |
| -------- | ---- | --------------------------------------- | ----------------------------------------------------------------- | ------------------- | ------ |
| HOFF-020 | API  | Validar `ClinicalHandoff`               | Entidade própria detalhada em contrato/schema futuro              | HOFF-003, 894       | Aprovado |
| HOFF-021 | API  | Validar endpoints candidatos            | Recursos e ações da próxima fatia aprovados                       | HOFF-020, 894       | Aprovado |
| HOFF-022 | API  | Validar payloads candidatos             | Payloads mínimos, campos opcionais, respostas e erros aprovados   | HOFF-020, HOFF-021  | Aprovado |
| HOFF-023 | API  | Validar eventos auditáveis              | Eventos, payload mínimo e actor/timestamp aprovados               | HOFF-006, HOFF-021  | Aprovado |
| HOFF-024 | API  | Validar filtros de listagem             | Filtros da inbox e da API aprovados                               | HOFF-013, HOFF-021  | Aprovado |
| HOFF-025 | API  | Definir impacto na Queue                | Regras de leitura derivada da `Queue` aprovadas                   | HOFF-002, HOFF-006  | Aprovado |
| HOFF-026 | API  | Definir impacto no Encounter            | Relação com atendimento e fechamento clínico aprovada             | HOFF-002, HOFF-020  | Aprovado |
| HOFF-027 | API  | Definir impacto em Billing/CounterSales | Evitar duplicidade e automação indevida aprovado                  | HOFF-009, HOFF-012  | Aprovado |
| HOFF-028 | API  | Validar permissões técnicas             | Permissões por endpoint e integração com `/access-control` aprovadas | HOFF-007, HOFF-021  | Aprovado |
| HOFF-029 | API  | Definir migration futura                | Estratégia de dados/migration futura documentada                  | HOFF-020 a HOFF-028 | Aprovado |

## 7. P2 - QA e validação

| ID       | Tipo | Item                             | Resultado esperado                                                    | Dependência                  | Status |
| -------- | ---- | -------------------------------- | --------------------------------------------------------------------- | ---------------------------- | ------ |
| HOFF-030 | QA   | Planejar testes unitários        | Casos de service/state machine definidos                              | HOFF-020, HOFF-021           | Aprovado |
| HOFF-031 | QA   | Planejar testes de API           | Rotas, payloads, erros e permissões cobertos                          | HOFF-021, HOFF-022, HOFF-028 | Aprovado |
| HOFF-032 | QA   | Planejar testes de state machine | Transições válidas e inválidas cobertas                               | HOFF-005, HOFF-006           | Aprovado |
| HOFF-033 | QA   | Planejar UX por papel            | Veterinário, recepção, financeiro e coordenação validados             | HOFF-010 a HOFF-019          | Aprovado |
| HOFF-034 | QA   | Planejar smoke visual            | Inbox, Encounter e Queue validados em desktop/mobile quando aplicável | HOFF-013, HOFF-016           | Aprovado |
| HOFF-035 | QA   | Planejar auditoria/eventos       | Eventos auditáveis e trilha operacional validados                     | HOFF-023                     | Aprovado |
| HOFF-036 | QA   | Planejar rollback                | Estratégia de reversão e mitigação documentada                        | HOFF-029                     | Aprovado |
| HOFF-037 | QA   | Validar com operação             | Operação aprova critérios e riscos antes de BUILD                     | HOFF-030 a HOFF-036          | Aprovado |

## 8. DEV futuro - bloqueado

Itens abaixo não autorizam implementação. Todos permanecem `Bloqueado`.

| ID           | Tipo | Item                                  | Dependência                                        | Status               |
| ------------ | ---- | ------------------------------------- | -------------------------------------------------- | -------------------- |
| HOFF-DEV-001 | DEV  | Implementar persistência do handoff   | HOFF-020, HOFF-029 + aprovação explícita           | Concluído HOFF-MIN-1 |
| HOFF-DEV-002 | DEV  | Implementar service/state machine     | HOFF-005, HOFF-006, HOFF-030 + aprovação explícita | Parcial HOFF-MIN-1   |
| HOFF-DEV-003 | DEV  | Implementar endpoints da API          | HOFF-021, HOFF-022, HOFF-031 + aprovação explícita | Parcial HOFF-MIN-1   |
| HOFF-DEV-004 | DEV  | Integrar Queue/Encounter              | HOFF-025, HOFF-026 + aprovação explícita           | Bloqueado            |
| HOFF-DEV-005 | DEV  | Implementar Inbox Recepção            | HOFF-013, HOFF-034 + aprovação explícita           | Parcial inbox mínima |
| HOFF-DEV-006 | DEV  | Implementar ação Enviar para Recepção | HOFF-010, HOFF-021 + aprovação explícita           | Concluído HOFF-MIN-1 |
| HOFF-DEV-007 | DEV  | Implementar ACK/assumir recebimento   | HOFF-011, HOFF-021 + aprovação explícita           | Concluído HOFF-MIN-1 |
| HOFF-DEV-008 | DEV  | Implementar devolução clínica         | HOFF-015, HOFF-021 + aprovação explícita           | Bloqueado            |
| HOFF-DEV-009 | DEV  | Implementar eventos/auditoria         | HOFF-023, HOFF-035 + aprovação explícita           | Parcial HOFF-MIN-1   |
| HOFF-DEV-010 | DEV  | Implementar E2E do handoff            | HOFF-030 a HOFF-037 + aprovação explícita          | Parcial HOFF-MIN-1   |

## 9. Pacotes de execução

| Pacote   | Itens                       | Objetivo                | Saída esperada                                              |
| -------- | --------------------------- | ----------------------- | ----------------------------------------------------------- |
| Pacote A | HOFF-001 a HOFF-009         | Fechar decisões de base | Estado, transições, permissões e bloqueios aprovados        |
| Pacote B | HOFF-010 a HOFF-019         | Fechar UX e operação    | Jornadas, inbox, resumo mínimo e checklist aprovados        |
| Pacote C | HOFF-020 a HOFF-029         | Fechar API e dados      | Entidade/API/eventos/integrações/migration futura aprovados |
| Pacote D | HOFF-030 a HOFF-037         | Fechar QA e validação   | Plano de testes, validação e rollback aprovado              |
| Pacote E | HOFF-DEV-001 a HOFF-DEV-010 | BUILD futuro            | Permanece bloqueado até aprovação explícita                 |

## 10. Critérios para liberar BUILD

BUILD só pode ocorrer quando:

- 891-894 estiverem aprovados;
- HOFF-001 a HOFF-029 estiverem aprovados;
- QA estiver definido;
- migration estiver aprovada, se necessária;
- permissões estiverem aprovadas;
- riscos financeiros estiverem aceitos;
- rollback estiver definido;
- responsável tiver dado autorização explícita;
- escopo da fatia de BUILD estiver pequeno, verificável e reversível.

## 11. Riscos

| Risco                                   | Impacto                                        | Mitigação                                            |
| --------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Simular handoff só no frontend          | Falsa sensação de operação resolvida           | Exigir API/state machine antes de BUILD real         |
| Duplicar cobrança                       | Erro financeiro e retrabalho                   | Definir integração Billing/CounterSales antes de DEV |
| Item sem dono                           | Caso parado ou perdido                         | Responsável atual obrigatório                        |
| Recepção não confirmar                  | Handoff enviado sem responsabilidade assumida  | ACK obrigatório                                      |
| Veterinário fechar sem resumo           | Recepção sem contexto                          | Resumo mínimo obrigatório                            |
| Pendência crítica ignorada              | Risco clínico, financeiro ou documental        | Bloqueios aprovados antes de conclusão               |
| Misturar CounterSales/Billing sem regra | Confusão entre venda avulsa e cobrança clínica | Separar origem e fluxo financeiro                    |

## 12. Encerramento da fase

1. Manter `e2e/spa/operational-walkthrough.spec.ts` como guarda do fluxo principal.
2. Considerar `HOFF-001` a `HOFF-037` fechados para planejamento pré-BUILD.
3. Não criar `HOFF-038` sem autorização explícita do responsável.
4. Próxima decisão possível: autorizar BUILD de uma primeira fatia pequena, pausar a frente ou reabrir um item específico por bloqueio real.

## 13. Guardrail final

Este backlog não autoriza BUILD.

Agentes não devem alterar código, backend, rotas, schema, migration, `Queue`, `Encounter`, Billing, CounterSales ou financeiro com base apenas neste backlog.

Todos os itens DEV permanecem `Bloqueado` até autorização explícita do responsável.
