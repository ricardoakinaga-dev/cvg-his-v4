# 892 - State Machine Handoff Operacional

Data: 2026-04-29
Status: rascunho para validação
Origem: `docs/880-plano-executivo-ux-operacional.md`, `docs/886-modelo-operacional-queue-encounter.md`, `docs/887-prd-jornada-recepcao.md`, `docs/888-prd-jornada-veterinario-clinico.md`, `docs/891-spec-handoff-clinico-recepcao.md`

## 0. Status

- Rascunho para validação.
- Não autoriza implementação.
- Depende de aprovação de produto, operação e técnica.
- Não define schema final, contrato de API, migration, rota, componente ou UI final.
- Qualquer BUILD futuro depende de SPEC técnica aprovada e autorização explícita do responsável.
- Alinhado em 2026-05-01 à governança neutra de acesso: a state machine define fluxo, não matriz fixa de quem pode executar cada ação.
- `HOFF-001` e `HOFF-002` fechados em 2026-05-01: fronteira do handoff e separação das dimensões de status aprovadas conceitualmente, sem liberar novas transições.
- `HOFF-003` fechado em 2026-05-01: `ClinicalHandoff` é a entidade própria da state machine; `Encounter`, `Queue` e eventos auditáveis são integrações.
- `HOFF-004` fechado em 2026-05-01: recepção/finalização operacional é checkpoint padrão antes de financeiro; caminho direto ao financeiro não entra na próxima fatia.
- `HOFF-005` e `HOFF-006` fechados em 2026-05-01: próxima fatia aprovada cobre pós-ACK da recepção com pendência, devolução clínica e envio explícito ao financeiro; conclusão/cancelamento/billing completo ficam fora.
- `HOFF-008` e `HOFF-009` fechados em 2026-05-01: bloqueios e pendências críticas definidos para a próxima fatia, sem liberar conclusão/cancelamento.
- `HOFF-011` e `HOFF-012` fechados em 2026-05-01: jornadas de recepção/finalização e financeiro detalhadas sem liberar `completed`, `in_billing` ou automação financeira.
- `HOFF-023` fechado em 2026-05-01: eventos auditáveis da próxima fatia definidos para envio/ACK, pendência, resolução, devolução clínica e envio ao financeiro.
- `HOFF-014` e `HOFF-015` fechados em 2026-05-01: resumo mínimo e devolução clínica definidos para envio/reenvio, retorno clínico e bloqueios de documentação/conduta.
- `HOFF-017` fechado em 2026-05-02: SLA/alerta de atraso definido como leitura derivada da permanência no estado, sem criar transição automática.
- `HOFF-018` fechado em 2026-05-02: critérios de finalização operacional futura definidos para `completed`, sem liberar BUILD, cancelamento ou automação financeira.
- `HOFF-019` fechado em 2026-05-02: checklist operacional definido para validar estados, transições, bloqueios, permissões e auditoria antes de BUILD.
- `HOFF-020` fechado em 2026-05-02: entidade/schema futuro confirmado com `ClinicalHandoff` como fonte da state machine e pendências/eventos como tabelas auxiliares.
- `HOFF-025` fechado em 2026-05-02: Queue deve refletir handoff apenas como leitura operacional derivada nesta fase, sem assumir `handoffStatus` nem receber novos estados persistidos.
- `HOFF-026` fechado em 2026-05-02: Encounter permanece âncora clínica/operacional e timeline contextual, sem absorver `handoffStatus` ou usar `closed` como conclusão de handoff.
- `HOFF-027` fechado em 2026-05-02: Billing/CounterSales recebem apenas contexto e links; nenhuma transição de handoff cria cobrança, comanda, pagamento, baixa ou estado financeiro automático.
- `HOFF-028` fechado em 2026-05-02: permissões técnicas por transição aprovadas como validação efetiva via `/access-control`, sem regra nominal por setor, cargo, profissão, grupo ou template.
- `HOFF-029` fechado em 2026-05-02: migration futura aprovada como ampliação segura da state machine persistida, mantendo `ClinicalHandoff` como fonte e `Queue`/`Encounter` como leitura/contexto.
- `HOFF-030` fechado em 2026-05-02: plano unitário de service/state machine aprovado para proteger transições, bloqueios, eventos e ausência de side effects antes de BUILD.
- `HOFF-031` fechado em 2026-05-02: plano de testes de API aprovado para validar rotas, payloads, erros, permissões por endpoint e ausência de side effects HTTP.
- `HOFF-032` fechado em 2026-05-02: matriz de transições válidas e inválidas aprovada para a próxima fatia, sem liberar `completed`, `cancelled`, `in_billing` ou `reopen`.
- `HOFF-033` fechado em 2026-05-02: validação UX por papel aprovada para confirmar que estados, CTAs, bloqueios e permissões fazem sentido para cada jornada antes de BUILD.
- `HOFF-034` fechado em 2026-05-02: smoke visual pré-BUILD aprovado para verificar representação da state machine em inbox, Encounter e Queue quando aplicável.
- `HOFF-035` fechado em 2026-05-02: auditoria/eventos aprovados para validar trilha append-only, correlação, payload mínimo, privacidade e ausência de side effects.
- `HOFF-036` fechado em 2026-05-02: rollback/mitigação aprovados para manter a state machine reversível operacionalmente e compatível com `HOFF-MIN-1`.
- `HOFF-037` fechado em 2026-05-02: validação operacional final aprovada; state machine candidata está pronta para decisão explícita de BUILD, sem liberar DEV automaticamente.

## 1. Objetivo

Este documento propõe uma state machine operacional candidata para o handoff clínico real entre clínica, recepção e financeiro.

O objetivo é definir estados, transições, atores, pré-condições, bloqueios e eventos auditáveis para que o atendimento clínico possa ser devolvido à recepção/financeiro com responsabilidade clara, rastreabilidade e próximo passo operacional.

Esta state machine ainda é conceitual. Ela não autoriza alteração de código, banco, API, rotas, componentes ou regra financeira.

## 2. Princípios

- Nenhum item ativo pode ficar sem dono.
- `Queue` é a fonte de trabalho vivo.
- `Encounter` é a unidade clínica/operacional que dá contexto ao handoff.
- Handoff precisa ser auditável.
- Recepção precisa confirmar recebimento.
- Cobrança não deve ser automática.
- Comanda não deve ser criada automaticamente pelo handoff.
- Estados clínicos e operacionais não devem ser confundidos.
- Fechamento clínico não equivale a fechamento operacional.
- Pendência sem dono é inválida.
- Cancelamento e devolução precisam motivo.
- Financeiro precisa saber origem da cobrança antes de cobrar.
- O fluxo pode sugerir próximo setor, próximo responsável e próxima ação, mas autorização vem da permissão efetiva configurada em `/access-control`.

## 2.1 Governança de acesso

A state machine usa nomes como clínica, recepção, financeiro, caixa, gestor e coordenação apenas como templates operacionais para facilitar entendimento do fluxo.

Esses nomes não concedem permissão sozinhos e não devem virar condição hardcoded em backend ou frontend.

A liberação de uma transição deve depender de:

- usuário autenticado;
- conta/tenant;
- rotina protegida;
- permissão técnica da ação;
- grupos de acesso;
- setores organizacionais;
- grants `Herdar`, `Conceder` ou `Negar`;
- permissão efetiva calculada pela governança.

Estados e transições continuam sendo regras de fluxo. A pergunta "quem pode executar" pertence à matriz configurável de acesso.

## 2.2 Fronteira aprovada - HOFF-001

A state machine deve ser lida em três níveis:

| Nível | Situação | Papel na arquitetura |
| --- | --- | --- |
| Pré-handoff | Existente em UI/contexto | Ajuda a preparar ação, mas não é fonte de verdade operacional. |
| `HOFF-MIN-1` | Implementado | Fonte persistida mínima para envio à recepção e ACK. Estados efetivamente operacionais: `sent_to_reception` e `acknowledged_by_reception`. |
| Handoff completo | Futuro | State machine ampliada com `draft`, `ready_to_send`, devolução, pendências, financeiro, conclusão, cancelamento e integrações. |

O fechamento de `HOFF-001` aprova essa fronteira. Ele não autoriza implementar os estados futuros nem transformar a inbox mínima em inbox completa.

## 2.3 Modelo estrutural aprovado - HOFF-003

A state machine do handoff deve pertencer a uma entidade própria `ClinicalHandoff`.

Papéis de cada agregado:

| Componente | Papel aprovado | Não deve fazer |
| --- | --- | --- |
| `ClinicalHandoff` | Fonte de verdade do `handoffStatus`, destino atual, ACK, devolução, pendências operacionais do handoff e conclusão/cancelamento futuros. | Não cria cobrança/comanda automaticamente. |
| `Encounter` | Contexto clínico-operacional obrigatório e histórico/timeline do atendimento. | Não deve usar `closed` ou status clínico como substituto de handoff. |
| `Queue` | Fila de trabalho vivo e possível leitura/sincronização operacional derivada. | Não deve ser a única fonte do handoff nem inferir handoff visualmente. |
| Eventos auditáveis | Registro append-only de transições, ator, motivo e timestamp. | Não devem substituir a entidade ativa que a recepção precisa listar e assumir. |
| Billing/CounterSales | Destinos operacionais futuros com origem rastreável. | Não devem ser criados ou movimentados automaticamente pelo handoff. |

Consequência: o modelo aprovado é **entidade própria + integrações**, não extensão pura de `Queue`, extensão pura de `Encounter` ou evento puro.

## 2.4 Regra recepção vs financeiro - HOFF-004

Para a próxima evolução do handoff completo, todo caso enviado pela clínica deve passar pela recepção/finalização operacional antes de ir ao financeiro.

Motivo operacional:

- a recepção/finalização confere orientações ao tutor, documentos, prescrições, exames, retornos, serviços realizados, lançamentos e pendências;
- a cobrança depende de origem clara e conferência operacional para evitar duplicidade ou item faltante;
- a recepção pode resolver pendências administrativas sem exigir retorno ao clínico quando não envolver escrita clínica;
- o financeiro deve receber um caso encaminhado explicitamente, não inferido por conclusão clínica.

Caminho direto ao financeiro:

- não aprovado para a próxima fatia;
- pode ser reavaliado futuramente como exceção configurável, auditada e permitida por permissão efetiva;
- deve exigir ausência de pendências clínicas, documentais, orientação, exame, prescrição, retorno ou conferência de serviços;
- mesmo se aprovado no futuro, não pode criar cobrança/comanda automaticamente.

## 3. Separação de estados

O fluxo precisa separar quatro dimensões de estado para evitar ambiguidade:

| Dimensão | Finalidade | Exemplo candidato | Observação |
| --- | --- | --- | --- |
| `clinicalStatus` | Organizar raciocínio e conclusão clínica | `em_avaliacao`, `finalizado_clinicamente` | Ajuda o veterinário, mas não move sozinho a operação. |
| `operationalStatus` | Indicar onde o caso está na esteira | `em_atendimento`, `aguardando_cobranca` | Move a `Queue` e define setor/responsável. |
| `billingStatus` | Indicar situação financeira | `pending`, `partial`, `paid` | Não deve substituir handoff ou fechamento operacional. |
| `handoffStatus` | Controlar devolução formal da clínica para recepção/financeiro | `sent_to_reception`, `acknowledged_by_reception` | Registra envio, recebimento, devolução, cobrança e conclusão. |

Decisão aprovada em `HOFF-002`:

- `clinicalStatus` organiza conclusão, pendência e documentação clínica. Ele não move a fila, não cobra e não conclui operação.
- `operationalStatus` organiza a posição do caso na esteira e o próximo dono operacional. Ele não substitui prontuário nem cobrança.
- `billingStatus` organiza a situação financeira. Ele não deve ser usado para concluir atendimento, fechar prontuário ou representar handoff.
- `handoffStatus` organiza a devolução formal entre clínica, recepção, financeiro ou outro destino operacional. Ele registra envio, recebimento e transições de handoff.
- `pronto_para_recepcao` não é `clinicalStatus`. No estágio atual, deve ser leitura operacional derivada de `handoffStatus = sent_to_reception`; HOFF-025 e HOFF-026 não aprovam persistir essa leitura em `Queue` ou `Encounter`.

## 4. Estados candidatos do handoffStatus

Status da decisão:

- aprovados para o `HOFF-MIN-1`: `sent_to_reception` e `acknowledged_by_reception`;
- aceito como tipo/schema atual, mas sem fluxo ativo de criação: `ready_to_send`;
- aprovados para a próxima fatia após ACK: `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`;
- candidatos futuros, ainda não autorizados para BUILD: `draft`, fluxo completo de `ready_to_send`, `in_billing`, `waiting_owner_decision`, `completed` e `cancelled`.

Decisão HOFF-005:

| Status | Decisão | Motivo |
| --- | --- | --- |
| `sent_to_reception` | Mantido/aprovado | Já existe no `HOFF-MIN-1`; representa handoff enviado e aguardando ACK. |
| `acknowledged_by_reception` | Mantido/aprovado | Já existe no `HOFF-MIN-1`; representa recepção/finalização assumindo o caso. |
| `waiting_pending_resolution` | Aprovado para próxima fatia | Permite registrar que há pendência operacional, documental, financeira ou clínica sem concluir nem cobrar automaticamente. |
| `returned_to_clinic` | Aprovado para próxima fatia | Permite devolver para complemento clínico com motivo e destino, sem editar prontuário pela recepção. |
| `sent_to_finance` | Aprovado para próxima fatia | Permite encaminhamento explícito ao financeiro após ACK e conferência operacional, sem criar cobrança/comanda automaticamente. |
| `ready_to_send` | Adiado | Valor técnico existente, mas fluxo de rascunho/preparo ainda depende da jornada clínica `HOFF-010`. |
| `draft` | Adiado | Depende de UX/API de preparação clínica e salvamento parcial. |
| `waiting_owner_decision` | Adiado | Depende de definição de pendências críticas e regra de decisão do tutor. |
| `in_billing` | Adiado | Deve ser detalhado com Billing/CounterSales para evitar duplicidade e automação indevida. |
| `completed` | Critérios aprovados para futuro | Depende de ACK, conferência operacional, ausência de pendência crítica aberta, tratamento financeiro explícito quando aplicável e auditoria. Não liberado para BUILD nesta decisão. |
| `cancelled` | Adiado | Depende de regra de cancelamento, motivo, reversão e auditoria antes de liberar como ação. |

| Estado | Definição operacional | Dono operacional típico | Próximo passo típico |
| --- | --- | --- | --- |
| `draft` | Handoff ainda em montagem ou pré-conferência. | Veterinário/equipe clínica | Completar resumo e pendências. |
| `ready_to_send` | Handoff tem dados mínimos para envio. | Veterinário/equipe clínica | Enviar para recepção. |
| `sent_to_reception` | Handoff enviado, aguardando confirmação de recebimento. | Recepção como setor destino | Recepção confirmar recebimento. |
| `acknowledged_by_reception` | Recepção confirmou que assumiu o caso. | Recepção | Orientar, conferir pendências, enviar ao financeiro ou devolver à clínica. |
| `returned_to_clinic` | Recepção devolveu o caso para clínica com motivo. | Clínica/veterinário | Corrigir, complementar ou reavaliar. |
| `sent_to_finance` | Caso encaminhado ao financeiro/caixa para cobrança ou fechamento financeiro após checkpoint operacional. | Financeiro/caixa | Iniciar cobrança. |
| `in_billing` | Cobrança ou negociação está em andamento. | Financeiro/caixa | Concluir, marcar pendência ou devolver. |
| `waiting_owner_decision` | Tutor precisa aprovar orçamento, conduta, cobrança ou encaminhamento. | Setor que acompanha o tutor | Registrar decisão e avançar. |
| `waiting_pending_resolution` | Existe pendência clínica, financeira, documental ou operacional bloqueando avanço. | Dono da pendência | Resolver, devolver ou encaminhar. |
| `completed` | Handoff concluído e caso pronto para fechamento operacional ou já fechado conforme regra aprovada. | Recepção/financeiro/gestão | Encerrar ou arquivar. |
| `cancelled` | Handoff cancelado por erro, desistência, fluxo indevido ou decisão formal. | Responsável pelo cancelamento | Preservar auditoria e motivo. |

## 5. Estados operacionais relacionados

Relação candidata com a `Queue` e o modelo operacional:

| Estado operacional relacionado | Relação com handoff | Observação |
| --- | --- | --- |
| `em_atendimento` | Caso ainda está sob responsabilidade clínica. | Handoff pode estar em `draft`. |
| `aguardando_finalizacao_clinica` | Falta conclusão clínica antes de enviar. | Pode bloquear `ready_to_send`. |
| `pronto_para_recepcao` | Caso pode aparecer para recepção assumir. | HOFF-025: leitura visual derivada de `sent_to_reception`, não status persistido da Queue nesta fase. |
| `aguardando_cobranca` | Recepção/financeiro precisa cobrar ou validar valores. | HOFF-025: leitura visual derivada de conferência/`sent_to_finance`, não transição automática da Queue. |
| `em_cobranca` | Financeiro está operando cobrança. | Relacionado a `in_billing`. |
| `pendente_clinico` | Bloqueio exige retorno à clínica. | Relacionado a `returned_to_clinic` ou `waiting_pending_resolution`. |
| `pendente_financeiro` | Bloqueio financeiro impede conclusão. | Relacionado a `waiting_pending_resolution` ou `in_billing`. |
| `fechado_operacionalmente` | Jornada encerrada. | Relacionado a `completed`. |

Os nomes finais ainda serão validados. Esta tabela não substitui a state machine geral da `Queue`/`Encounter`.

## 6. Tabela de transições candidatas

Na tabela abaixo, a coluna "Ator operacional" é template conversacional. A autorização real deve ser validada por permissão técnica efetiva antes da transição.

Transição implementada hoje: `sent_to_reception` -> `acknowledged_by_reception`.

Decisão HOFF-006 para a próxima fatia:

- manter transição implementada `sent_to_reception -> acknowledged_by_reception`;
- aprovar transições pós-ACK para pendência, devolução clínica e envio financeiro explícito;
- bloquear transições de conclusão, cancelamento, billing completo e financeiro direto sem ACK.

| De | Para | Ator operacional | Pré-condições | Resultado |
| --- | --- | --- | --- | --- |
| `sent_to_reception` | `acknowledged_by_reception` | Recepção/finalização operacional | Item recebido na visão de recepção, usuário autenticado, permissão efetiva e sem cancelamento pendente | Recepção confirma recebimento e assume responsabilidade operacional. |
| `acknowledged_by_reception` | `waiting_pending_resolution` | Recepção/finalização operacional | Há pendência clínica, financeira, documental ou operacional; tipo, dono e motivo informados | Caso permanece ativo com dono da pendência. |
| `waiting_pending_resolution` | `acknowledged_by_reception` | Dono da pendência ou finalização operacional | Pendência resolvida, justificada ou marcada como não bloqueante | Caso volta para conferência operacional da recepção. |
| `acknowledged_by_reception` | `returned_to_clinic` | Recepção/finalização operacional | Motivo obrigatório, pendência clínica ou informação insuficiente, destino clínico informado | Caso volta à clínica com motivo e responsável/setor destino. |
| `waiting_pending_resolution` | `returned_to_clinic` | Recepção/finalização operacional | Pendência clínica exige complemento ou reavaliação; motivo e destino informados | Caso retorna para clínica com motivo. |
| `returned_to_clinic` | `sent_to_reception` | Clínica ou coordenação operacional | Complemento realizado, motivo respondido e resumo/instrução atualizados | Caso é reenviado para recepção e volta a aguardar ACK. |
| `acknowledged_by_reception` | `sent_to_finance` | Recepção/finalização operacional | Conferência operacional concluída, origem financeira clara, sem pendência clínica/documental bloqueante | Caso segue para financeiro sem criar cobrança automaticamente. |
| `waiting_pending_resolution` | `sent_to_finance` | Recepção/finalização operacional | Pendências resolvidas ou não bloqueantes, origem financeira clara | Caso segue para financeiro sem criar cobrança automaticamente. |

Transições explicitamente não aprovadas nesta fatia:

| De | Para | Motivo |
| --- | --- | --- |
| `sent_to_reception` | `sent_to_finance` | Precisa ACK e conferência operacional antes do financeiro. |
| `sent_to_reception` | `returned_to_clinic` | Recepção deve assumir/ACK antes de devolver formalmente. |
| `acknowledged_by_reception` | `completed` | Critério futuro aprovado em HOFF-018, mas não liberado para BUILD nesta fatia; exige conferência operacional, sem pendência crítica e sem financeiro pendente. |
| `waiting_pending_resolution` | `completed` | Critério futuro aprovado em HOFF-018 apenas quando toda pendência crítica estiver resolvida e pendências não críticas estiverem justificadas com dono. |
| `sent_to_finance` | `completed` | Critério futuro aprovado em HOFF-018 apenas após retorno/resultado financeiro manual rastreável, sem criar cobrança pelo handoff. |
| `sent_to_finance` | `in_billing` | Integração com Billing/CounterSales ainda não aprovada. |
| `in_billing` | `completed` | Conclusão financeira/operacional ainda depende de regra futura. |
| Qualquer ativo | `cancelled` | Cancelamento depende de regra de motivo, reversão e auditoria específica. |
| `draft` | `ready_to_send` | Fluxo de rascunho clínico ainda depende de jornada clínica/API futuras. |
| `ready_to_send` | `sent_to_reception` | Fluxo completo de preparo ainda não entra na próxima fatia; o envio mínimo atual permanece como atalho controlado. |

## 7. Pré-condições candidatas

Pré-condições mínimas para envio real:

- `Encounter` ativo.
- Paciente/tutor identificados, exceto fluxo aprovado de atendimento sem animal.
- Resumo clínico mínimo.
- Pendências declaradas.
- Destino definido.
- Responsável atual conhecido.
- Próximo setor definido.
- Permissão efetiva válida para a ação solicitada.
- Origem do caso rastreável.
- Itens financeiros, quando existirem, com origem clara.
- Exames/prescrições/orçamentos vinculados ou declarados como pendência.
- Motivo obrigatório quando houver devolução, cancelamento ou exceção.

## 8. Bloqueios candidatos

Decisão HOFF-008:

Bloqueios gerais, válidos para qualquer transição mutável:

- `accountId` do handoff, usuário e entidades relacionadas deve bater.
- Usuário deve estar autenticado e ter permissão efetiva para a ação.
- Estado atual deve permitir a transição solicitada.
- Ação repetida deve ser idempotente quando o resultado já foi atingido, ou retornar conflito previsível quando houver risco operacional.
- Toda transição mutável deve gerar evento auditável com ator, estado anterior, novo estado e timestamp.
- Nenhuma transição pode criar cobrança, comanda, exame, prescrição, orçamento ou baixa financeira automaticamente.

Bloqueios para envio/reenviar à recepção:

- Não enviar sem `Encounter` ativo.
- Não enviar se o `Encounter` estiver fechado.
- Não enviar sem paciente, exceto fluxo aprovado para atendimento sem animal.
- Não enviar sem tutor/responsável, exceto emergência com regra aprovada.
- Não enviar sem resumo clínico-operacional mínimo.
- Não enviar sem instrução operacional para recepção.
- Não enviar sem destino operacional.
- Não reenviar após devolução clínica sem responder ao motivo da devolução.
- Não tratar silêncio sobre pendências como ausência de pendência; deve haver declaração explícita.
- Não enviar com origem financeira desconhecida sem pendência `billing_origin` ou status operacional equivalente.
- Não enviar duplicado quando já existe handoff ativo para o mesmo atendimento.
- Não usar `closed` como substituto de handoff.

Bloqueios para ACK:

- Só pode confirmar recebimento a partir de `sent_to_reception`.
- Não pode ACK fora da conta.
- Não pode ACK sem permissão efetiva.
- ACK deve registrar `acknowledgedBy` e `acknowledgedAt`.

Bloqueios para pendência:

- Não permitir pendência sem tipo.
- Não permitir pendência sem motivo.
- Não permitir pendência sem dono operacional.
- Pendência crítica deve bloquear envio ao financeiro até resolução ou justificativa formal como não bloqueante.
- Pendência clínica crítica deve apontar retorno/devolução clínica ou responsável clínico.

Bloqueios para devolução clínica:

- Não permitir devolução sem ACK prévio.
- Não permitir devolução sem motivo.
- Não permitir devolução sem destino clínico, responsável ou setor destino.
- Não permitir devolução sem `returnType` controlado.
- Não permitir devolução de pendência clínica já registrada sem `relatedPendingId`, quando houver pendência ativa.
- Não usar devolução clínica para resolver pendência puramente financeira.
- Recepção/finalização não deve editar prontuário por meio da devolução; deve devolver contexto.

Bloqueios para envio ao financeiro:

- Não permitir envio ao financeiro sem ACK.
- Não permitir envio ao financeiro com pendência crítica aberta.
- Não permitir envio ao financeiro sem conferência operacional registrada.
- Não permitir envio ao financeiro sem origem financeira rastreável.
- Não permitir envio ao financeiro quando houver risco conhecido de duplicidade de cobrança/comanda.
- Não permitir envio ao financeiro por caminho direto clínica -> financeiro nesta fase.

Bloqueios para conclusão/cancelamento futuros, ainda fora da próxima fatia:

- Não concluir com pendência crítica aberta.
- Não concluir sem recepção/finalização ou financeiro assumir conforme regra futura.
- Não cancelar sem motivo.
- Não cancelar sem preservar auditoria e impacto operacional.

## 8.2 Finalização operacional futura - HOFF-018

`completed` representa o encerramento operacional do handoff, não o fechamento clínico do prontuário, não o status financeiro do Billing e não o fechamento da Queue.

Pré-condições aprovadas para conclusão futura:

- handoff pertence à conta atual e está em estado permitido;
- usuário possui permissão efetiva `clinical_handoff.complete`;
- ACK de recepção/finalização já foi registrado;
- conferência operacional foi registrada;
- resumo mínimo, tutor/paciente quando aplicáveis, atendimento e destino operacional estão rastreáveis;
- não existe pendência crítica aberta;
- pendências não críticas, se existirem, têm dono, justificativa e não bloqueiam fechamento;
- origem financeira está clara como `not_applicable`, `no_charge`, `sent_to_finance_confirmed` ou `resolved_in_finance`;
- risco conhecido de duplicidade financeira foi conferido;
- documentos, prescrições, exames, retornos e orientações foram entregues, encaminhados ou marcados como pendência não bloqueante;
- finalização possui motivo/resolução e observação auditável.

Estados de origem candidatos:

| De | Para | Critério |
| --- | --- | --- |
| `acknowledged_by_reception` | `completed` | Não há pendência crítica nem necessidade financeira pendente. |
| `waiting_pending_resolution` | `completed` | Pendências críticas resolvidas e pendências restantes justificadas como não bloqueantes. |
| `sent_to_finance` | `completed` | Financeiro registrou resultado manual rastreável ou confirmou que a ação financeira própria foi concluída/encaminhada. |

Estados que não podem concluir diretamente:

- `sent_to_reception`, porque falta ACK;
- `returned_to_clinic`, porque falta resposta/reenvio clínico;
- `draft` e `ready_to_send`, porque ainda pertencem ao preparo;
- `in_billing`, porque Billing/CounterSales ainda não está definido como parte da state machine;
- `cancelled`, porque já é terminal por outro motivo.

Efeitos permitidos futuramente:

- alterar `handoffStatus` para `completed`;
- registrar `completedBy`, `completedAt`, `completionType`, `completionReason` e evento auditável;
- retirar item das listas ativas e manter consulta histórica/auditável.

Efeitos proibidos:

- criar cobrança, comanda, pagamento, baixa, parcela, nota, prescrição, exame ou documento;
- editar prontuário, relatório, laudo ou receita;
- fechar `Encounter`, `Queue`, Billing ou CounterSales por inferência;
- concluir automaticamente por SLA, ausência de pendência visível ou passagem de tempo.

## 8.1 Pendências críticas - HOFF-009

Pendência crítica é qualquer item que impede avanço para financeiro ou conclusão operacional futura porque afeta segurança clínica, orientação ao tutor, documentação obrigatória, rastreabilidade financeira ou continuidade do atendimento.

Tipos aprovados para a próxima fatia:

| Tipo | Quando é crítica | Próximo passo padrão |
| --- | --- | --- |
| `clinical` | Falta informação clínica mínima para orientar tutor, liberar paciente, entregar prescrição ou justificar serviço realizado. | `returned_to_clinic` ou dono clínico em `waiting_pending_resolution`. |
| `documentation` | Falta documento, termo, receita, laudo, relatório ou assinatura necessária para orientar, entregar ou cobrar com segurança. | Resolver pendência documental ou devolver à origem responsável. |
| `billing_origin` | Serviços/itens realizados não estão claros, há divergência de lançamento ou risco de cobrança duplicada. | Manter em `waiting_pending_resolution` até origem financeira ficar rastreável. |
| `owner_guidance` | Tutor ainda não recebeu orientação necessária para alta, retorno, medicação, exame, internação ou restrição. | Resolver na recepção/finalização ou devolver à clínica quando envolver conteúdo assistencial. |
| `diagnostic` | Exame/laudo/resultado pendente bloqueia conduta, alta, orientação ou cobrança segura. | Encaminhar ao dono diagnóstico ou devolver à clínica conforme impacto. |
| `operational_owner` | Não há dono operacional atual para resolver a próxima ação. | Atribuir pessoa, equipe ou setor antes de avançar. |
| `accountability` | Falta ator, destino, motivo ou evento auditável de uma transição sensível. | Bloquear transição até rastreabilidade mínima existir. |

Pendências não críticas:

- retorno futuro apenas sugerido, sem bloquear orientação/cobrança;
- exame ou documento opcional que não altera conduta, cobrança ou segurança;
- observação administrativa sem impacto em pagamento, entrega, alta ou continuidade;
- pendência já resolvida e registrada como não bloqueante por usuário autorizado.

Regras de criticidade:

- pendência crítica aberta bloqueia `sent_to_finance`;
- pendência não crítica pode acompanhar o handoff, desde que tenha dono e justificativa;
- mudança de crítica para não crítica exige resolução ou justificativa auditável;
- pendência clínica crítica não deve ser resolvida por edição da recepção em conteúdo de prontuário;
- pendência financeira/origem de cobrança não cria comanda nem billing automaticamente.

## 8.2 Jornadas de recepção e financeiro - HOFF-011/HOFF-012

Decisão HOFF-011:

A recepção/finalização é o checkpoint operacional obrigatório entre a clínica e o financeiro nesta fase.

Fluxo aprovado da recepção/finalização:

1. Receber item em `sent_to_reception`.
2. Confirmar ACK, movendo para `acknowledged_by_reception`.
3. Conferir resumo, instruções, tutor, paciente, atendimento e origem.
4. Conferir documentos, prescrições, exames, retornos, serviços realizados, lançamentos esperados e pendências.
5. Registrar pendências com tipo, motivo, dono e criticidade quando houver bloqueio.
6. Devolver para clínica quando a pendência exigir complemento assistencial ou documentação clínica.
7. Manter em `waiting_pending_resolution` quando houver dono operacional resolvendo pendência.
8. Encaminhar para `sent_to_finance` somente após conferência operacional, origem financeira rastreável e ausência de pendência crítica.

Não entra no HOFF-011:

- conclusão `completed`;
- cancelamento;
- criação ou edição automática de comanda/cobrança;
- edição de prontuário pela recepção;
- abertura de fluxo direto clínica -> financeiro.

Decisão HOFF-012:

O financeiro recebe um encaminhamento operacional em `sent_to_finance`, não uma cobrança criada automaticamente.

Fluxo aprovado do financeiro:

1. Receber item em `sent_to_finance`.
2. Conferir contexto do atendimento, tutor, paciente, origem financeira e pendências não críticas.
3. Abrir a rotina financeira adequada por ação explícita, se houver permissão efetiva.
4. Operar cobrança, negociação, ajuste ou conferência dentro de Billing/CounterSales/rotina própria, não dentro do handoff.
5. Se faltar origem financeira rastreável, registrar pendência `billing_origin` ou devolver para finalização operacional.
6. Se houver risco de duplicidade, bloquear avanço financeiro até resolução.

Não entra no HOFF-012:

- criar `billing_record`, item de billing, comanda, pagamento, baixa, parcela ou nota a partir do handoff;
- mover automaticamente para `in_billing`;
- concluir handoff como `completed`;
- liberar caminho direto clínica -> financeiro;
- usar `billingStatus` como substituto de `handoffStatus`.

## 8.3 Resumo mínimo e devolução clínica - HOFF-014/HOFF-015

Resumo mínimo aprovado para envio/reenvio:

- `encounterId`, tutor e paciente quando aplicáveis;
- `clinicalSummary` curto e operacional;
- `receptionInstructions`;
- destino operacional (`toResponsibleType` e `toResponsibleId`);
- prioridade;
- declaração explícita de pendências;
- status de origem financeira (`not_applicable`, `clear`, `pending_review` ou `unknown`);
- exames, prescrições, documentos, billing e orçamentos quando condicionais;
- resposta ao motivo quando o caso volta de `returned_to_clinic`.

Regras:

- resumo mínimo não é prontuário completo;
- pendência crítica precisa tipo, motivo, dono e criticidade;
- origem financeira desconhecida bloqueia envio ao financeiro até ficar rastreável;
- emergência pode seguir com resumo inicial, desde que registre pendência de complemento;
- reenvio a partir de `returned_to_clinic` só volta para `sent_to_reception` se o motivo da devolução foi respondido.

Devolução clínica aprovada:

Motivos controlados:

- `summary_missing`;
- `documentation_needed`;
- `prescription_clarification`;
- `diagnostic_clarification`;
- `reassessment_needed`;
- `billing_origin_clinical`;
- `other`.

Regras:

- devolução exige ACK, motivo, `returnType`, destino e responsável/setor clínico;
- `other` exige observação textual;
- devolução originada de pendência ativa deve apontar `relatedPendingId`;
- devolução não serve para pendência puramente financeira;
- recepção não edita prontuário;
- clínica responde em rotina própria e reenvia com resumo/instrução atualizados;
- devolução não cria cobrança, comanda, exame, prescrição, documento, pagamento ou baixa.

## 9. Eventos auditáveis

Decisão HOFF-023:

Eventos aprovados para a próxima fatia e candidatos futuros:

- `clinical_handoff.sent_to_reception`;
- `clinical_handoff.acknowledged`;
- `clinical_handoff.pending_marked`;
- `clinical_handoff.pending_resolved`;
- `clinical_handoff.returned_to_clinic`;
- `clinical_handoff.sent_to_finance`;
- `clinical_handoff.completed`, aprovado apenas como candidato futuro em HOFF-018.

Eventos fora desta fatia:

- `clinical_handoff.created` para rascunho completo;
- `clinical_handoff.ready`;
- `clinical_handoff.billing_started`;
- `clinical_handoff.cancelled`.

Campos mínimos aprovados por evento:

- `eventId`;
- `eventType`;
- `accountId`;
- `handoffId`;
- `encounterId`;
- `queueItemId`, quando existir;
- `actor.userId`;
- `actor.professionalId`, quando houver vínculo;
- permissão efetiva usada;
- estado anterior;
- novo estado;
- motivo, quando aplicável;
- `pendingId`, quando envolver pendência;
- destino operacional, quando houver transferência;
- resumo mínimo do payload;
- `occurredAt`;
- `requestId` ou chave de idempotência quando houver retry.

Regras:

- eventos são append-only;
- eventos não substituem a entidade ativa `ClinicalHandoff`;
- eventos não substituem pendências estruturadas;
- eventos não podem carregar prontuário completo, receita completa, laudo completo, valores sensíveis ou dados pessoais desnecessários;
- toda transição mutável aprovada deve gerar evento no mesmo boundary transacional futuro;
- falha ao registrar evento deve impedir a confirmação da transição futura, salvo regra explícita de retry/compensação aprovada;
- nenhum evento cria Billing, CounterSales, pagamento, baixa, nota, exame, prescrição ou orçamento.

### 9.1 Validação de auditoria/eventos - HOFF-035

HOFF-035 aprova o plano de validação da trilha auditável da próxima fatia. Ele não implementa event store, não cria migration e não altera a state machine.

Eventos obrigatórios da próxima fatia:

| Ação aceita | Evento esperado | Critério de auditoria |
| --- | --- | --- |
| Enviar ou reenviar para recepção | `clinical_handoff.sent_to_reception` | Registra destino, resumo presente, instrução presente, ator, permissão e estado de origem. |
| Confirmar recebimento | `clinical_handoff.acknowledged` | Registra usuário que assumiu, data/hora, nota opcional e transição de `sent_to_reception`. |
| Marcar pendência | `clinical_handoff.pending_marked` | Registra `pendingId`, tipo, dono, criticidade, bloqueio financeiro e motivo. |
| Resolver pendência | `clinical_handoff.pending_resolved` | Registra `pendingId`, resolução, criticidade/bloqueio resultante e estado final. |
| Devolver para clínica | `clinical_handoff.returned_to_clinic` | Registra motivo, tipo de devolução, destino clínico e pendência relacionada quando houver. |
| Enviar ao financeiro | `clinical_handoff.sent_to_finance` | Registra conferência operacional, origem financeira rastreável e ausência/justificativa de pendência crítica. |

Casos que não geram evento operacional de handoff:

- 401/403 antes de autorização efetiva;
- cross-account ou recurso inexistente tratado como 404;
- payload inválido antes de transição;
- conflito de estado sem mudança;
- tentativa de `completed`, `cancelled`, `in_billing`, `billing_started` ou `reopen` nesta fatia;
- leitura, filtro, visualização de inbox, badge de Queue, timeline de Encounter e cálculo de SLA.

Critérios de aceite:

- evento aceito é append-only e não sobrescreve evento anterior;
- evento registra `accountId`, `handoffId`, `encounterId`, ator, permissão efetiva, `fromStatus`, `toStatus`, `occurredAt` e correlação;
- tentativa recusada preserva estado, pendências e eventos;
- ordem dos eventos permite reconstruir a sequência operacional sem consultar Billing/CounterSales como fonte;
- payload não armazena prontuário completo, documento completo, cobrança completa, valor sensível ou PII desnecessária;
- falha parcial entre estado e evento deve ser tratada como rejeição/transação futura antes de BUILD.

### 9.2 Rollback e mitigação - HOFF-036

HOFF-036 aprova como a state machine deve ser reversível operacionalmente antes de BUILD.

Princípios:

- rollback é desativação controlada da fatia nova, não deleção apressada de dados;
- `sent_to_reception` e `acknowledged_by_reception` do mínimo atual devem continuar funcionando;
- estados novos da próxima fatia devem ser legíveis mesmo se ações novas forem desligadas;
- `completed`, `cancelled`, `in_billing`, `reopen` e rascunho completo continuam fora do rollback porque não entram na fatia.

Matriz de mitigação:

| Falha | Mitigação |
| --- | --- |
| Ação `mark-pending` instável | Desativar ação; manter leitura de pendências já gravadas e permitir encaminhamento manual fora do handoff expandido. |
| Ação `resolve-pending` instável | Desativar ação; manter pendência visível e orientar operação a tratar pelo fluxo mínimo/manual. |
| Devolução clínica instável | Desativar devolução; recepção mantém ACK e registra bloqueio operacional sem mover estado. |
| Envio ao financeiro instável | Desativar `send-to-finance`; manter contexto financeiro como leitura e operar rotinas financeiras manualmente. |
| Eventos instáveis | Bloquear transições novas até evento transacional estar confiável. |
| UI da inbox instável | Voltar para inbox mínima/listagem simples sem ações novas. |
| Overlay Queue/Encounter inconsistente | Ocultar overlay/timeline derivada sem alterar `ClinicalHandoff`. |

Critério de aceite:

- nenhuma mitigação pode criar status persistido novo em Queue ou Encounter;
- nenhuma mitigação pode criar cobrança/comanda automática;
- operação deve conseguir identificar itens afetados e próximo passo manual;
- dados novos devem permanecer auditáveis;
- BUILD futuro só pode iniciar se a reversão estiver documentada, testável e autorizada.

### 9.3 Validação final com operação - HOFF-037

HOFF-037 fecha o plano da state machine antes de BUILD.

Critérios confirmados:

- estados da próxima fatia são suficientes para pendência, resolução, devolução clínica, reenvio e envio ao financeiro;
- transições bloqueadas continuam bloqueadas: financeiro sem ACK, devolução sem ACK, `completed`, `cancelled`, `in_billing`, `reopen` e rascunho completo;
- ações futuras dependem de permissão efetiva, estado válido, conta, payload, auditoria e ausência de side effects;
- Queue e Encounter continuam consumidores/contexto, não fonte de `handoffStatus`;
- Billing/CounterSales continuam rotinas próprias, sem criação automática;
- rollback mantém o mínimo atual funcionando;
- operação aceita que a próxima decisão não é novo planejamento, e sim autorização explícita de BUILD, pausa ou reabertura pontual por bloqueio real.

Encerramento:

- não há `HOFF-038` planejado;
- itens DEV permanecem bloqueados até autorização explícita do responsável.

## 9.7 Permissões técnicas - HOFF-028

A state machine aprovada continua separando fluxo de autorização. O estado informa se uma transição é possível; a permissão efetiva informa se o usuário pode executá-la.

Matriz aprovada para a próxima fatia conceitual:

| Transição/ação | Permissão técnica | Observação |
| --- | --- | --- |
| Listar ou consultar handoff | `clinical_handoff.read` | Não expõe dados fora do `accountId` nem dados de rotina relacionada sem permissão própria. |
| Criar/preparar rascunho operacional | `clinical_handoff.write` | Não autoriza edição clínica nem alteração de prontuário. |
| `returned_to_clinic` ou mínimo atual -> `sent_to_reception` | `clinical_handoff.send` | Exige resumo mínimo e validações de envio/reenvio. |
| `sent_to_reception` -> `acknowledged_by_reception` | `clinical_handoff.acknowledge` | Confirma recebimento; não concede permissões financeiras ou clínicas. |
| `acknowledged_by_reception` -> `waiting_pending_resolution` | `clinical_handoff.mark_pending` | Exige tipo, motivo, dono e criticidade. |
| Resolver pendência ativa | `clinical_handoff.resolve_pending` | Pode retornar a `acknowledged_by_reception` ou manter `waiting_pending_resolution`, conforme pendências restantes. |
| `acknowledged_by_reception` ou `waiting_pending_resolution` -> `returned_to_clinic` | `clinical_handoff.return` | Exige motivo e destino clínico. |
| `acknowledged_by_reception` ou `waiting_pending_resolution` -> `sent_to_finance` | `clinical_handoff.send_to_finance` | Encaminha contexto; não cria cobrança, comanda, pagamento, baixa ou `in_billing`. |
| Transição futura para `completed` | `clinical_handoff.complete` | Permissão aprovada como candidata futura, mas BUILD de conclusão segue bloqueado. |
| Transição futura para `cancelled` | `clinical_handoff.cancel` | Permissão aprovada como candidata futura, mas cancelamento segue fora da próxima fatia. |

Regras de autorização:

- toda transição mutável exige usuário autenticado, `accountId` válido, estado permitido e permissão efetiva `allow`;
- `deny` efetivo bloqueia a ação mesmo se outro grupo, setor ou vínculo conceder;
- `inherit` não autoriza ação sozinho;
- filtros, dono atual, setor destino, prioridade, SLA e template operacional não concedem permissão;
- o backend não deve testar nome de setor, cargo, profissão, grupo ou template conversacional;
- permissões do handoff não substituem permissões de Billing, CounterSales, prontuário, agenda, documentos, relatórios, caixa, pagamentos ou auditoria global.

## 10. Decisões pendentes

- Todo handoff passa pela recepção? Decidido para a próxima fase: sim, recepção/finalização operacional é checkpoint padrão.
- Quando pode ir direto ao financeiro? Não aprovado para a próxima fase; apenas exceção futura com regra própria.
- Quais pendências bloqueiam fechamento?
- Quais pendências bloqueiam fechamento? Decidido parcialmente em HOFF-009 para envio ao financeiro e conclusão futura.
- Quais campos mínimos são obrigatórios?
- Qual permissão técnica permite devolver para clínica? Decidido em HOFF-028: `clinical_handoff.return`.
- Handoff é entidade própria ou extensão de `Queue`/`Encounter`? Decidido: entidade própria `ClinicalHandoff` com integrações.
- Como evitar duplicidade de cobrança?
- Como tratar retorno sem animal?
- Como tratar atendimento sem animal?
- O fluxo permite confirmar recebimento por equipe/setor ou exige pessoa nominal?
- O fluxo permite conclusão financeira sem confirmação prévia de recepção? Não na próxima fase.
- Como representar handoff quando o caso segue para internação, imagem ou laboratório antes da cobrança?
- Quais estados entram na próxima fatia? Decidido em HOFF-005.
- Quais transições entram na próxima fatia? Decidido em HOFF-006.
- Quais bloqueios entram na próxima fatia? Decidido em HOFF-008.
- Quais pendências críticas entram na próxima fatia? Decidido em HOFF-009.

## 11. Impacto esperado por template operacional

Os títulos abaixo são templates conversacionais. Eles descrevem responsabilidades do fluxo e não substituem a governança configurável de acesso.

### Veterinário

- Passa a ter critério claro para preparar e enviar o handoff.
- Deixa de depender de conversa informal para explicar pendências à recepção.
- Continua sem operar cobrança final.
- Precisa registrar resumo mínimo, pendências e próximos passos.

### Recepção

- Passa a receber casos devolvidos com contexto e dono.
- Confirma recebimento e assume a etapa pós-clínica.
- Enxerga se deve orientar, cobrar, agendar, aguardar exame, devolver para clínica ou fechar.
- Reduz interpretação manual do prontuário.

### Financeiro

- Recebe cobrança com origem clínica/operacional mais clara.
- Não cria cobrança automaticamente por causa do handoff.
- Consegue diferenciar cobrança, pendência financeira, cobrança parcial e conclusão.
- Depende de regra futura para evitar duplicidade de cobrança.

### Coordenação

- Ganha rastreabilidade de gargalos entre clínica, recepção e financeiro.
- Pode auditar tempos entre envio, recebimento, cobrança e fechamento.
- Consegue identificar handoffs cancelados, devolvidos ou parados.
- Precisa validar permissões e exceções antes de BUILD.

## 11.1 SLA/alerta de atraso - HOFF-017

O SLA aprovado não altera a state machine.

Regras:

- `ageBucket` é derivado de `waitingSince` e do grupo visual atual;
- `normal`, `attention` e `overdue` não são estados de handoff;
- entrar em `attention` ou `overdue` não gera transição, evento mutável, cobrança, comanda, devolução, conclusão ou cancelamento automático;
- mudança de estado ou de dono operacional deve reiniciar ou recalcular `waitingSince` conforme regra futura de persistência;
- pendência crítica atrasada aumenta prioridade visual, mas continua dependendo das transições aprovadas para resolução, devolução ou envio ao financeiro;
- alertas de SLA devem respeitar permissão efetiva e `accountId`.

Limiar candidato:

| Grupo visual | `attention` após | `overdue` após |
| --- | --- | --- |
| `awaiting_ack` | 15 min | 30 min |
| `in_finalization` | 30 min | 60 min |
| `pending` crítica | 30 min | 60 min |
| `pending` não crítica | 120 min | 240 min |
| `returned` | 60 min | 120 min |
| `sent_to_finance` | 60 min | 120 min |

## 11.2 Checklist operacional - HOFF-019

Checklist mínimo da state machine:

| Área | Critério |
| --- | --- |
| Estados | Cada estado ativo aparece com dono, próximo passo e sem ambiguidade entre clínico, operacional e financeiro. |
| Transições | Apenas transições aprovadas aparecem como ação candidata. |
| Bloqueios | Pendência crítica bloqueia financeiro e conclusão futura. |
| Devolução | `returned_to_clinic` exige motivo, destino e mantém auditoria. |
| Reenvio | `returned_to_clinic -> sent_to_reception` exige resposta ao motivo e resumo atualizado. |
| Financeiro | `sent_to_finance` não cria Billing/CounterSales e exige origem rastreável. |
| Conclusão futura | `completed` exige critérios HOFF-018 e não aparece como BUILD liberado. |
| SLA | `attention`/`overdue` não geram transição automática. |
| Permissão | Toda ação mutável depende de permissão efetiva, conta e estado válido. |
| Auditoria | Toda transição mutável futura tem evento e payload mínimo definidos. |

Resultado esperado:

- `Aprovado`: regra clara e validável.
- `Bloqueado`: falha que impede BUILD.
- `Ajustar`: precisa refinamento antes da próxima fatia.
- `Não se aplica`: fora do recorte validado.

## 11.2.1 Plano unitário de state machine/service - HOFF-030

HOFF-030 aprova o plano de testes unitários, não a implementação dos testes.

Suíte mínima aprovada:

| Grupo | Casos unitários esperados |
| --- | --- |
| Regressão HOFF-MIN-1 | `sendToReception`, `acknowledge`, ACK duplicado, resumo/instrução obrigatórios, handoff duplicado por atendimento, `Encounter` fechado bloqueado e hidratação por repository. |
| Transições pós-ACK | `markPending`, `resolvePending`, `returnToClinic`, reenvio para recepção e `sendToFinance` nos estados permitidos. |
| Transições bloqueadas | `sent_to_reception -> sent_to_finance`, `sent_to_reception -> returned_to_clinic`, `sent_to_finance -> in_billing`, qualquer ativo -> `completed` ou `cancelled` nesta fatia, e `reopen`. |
| Pendências | Exigir tipo, motivo, dono, criticidade; bloquear envio financeiro com pendência crítica aberta; manter caso em `waiting_pending_resolution` quando ainda houver pendência bloqueante. |
| Devolução clínica | Exigir motivo, tipo e destino; permitir vínculo com pendência; não permitir resolver pendência puramente financeira por devolução clínica. |
| Envio ao financeiro | Exigir ACK, conferência operacional, origem financeira rastreável, ausência de pendência crítica e ausência de risco de duplicidade não tratado. |
| Eventos | Gerar evento append-only para transição aceita; não gerar evento de handoff para tentativa negada sem mudança de estado. |
| Side effects proibidos | Não fechar `Encounter`, não mover `Queue`, não criar Billing, CounterSales, comanda, recebível, pagamento, baixa, exame, prescrição, documento ou prontuário. |
| Persistência | Rollback em falha de repository, ordenação/listagem estável e compatibilidade dos registros mínimos atuais. |
| Conta/permissão | Bloquear cross-account no domínio quando aplicável; autorização efetiva pode ser testada com dependência fake de permissão quando o service passar a recebê-la. |

Critério de aceite:

- testes unitários devem falhar antes do BUILD quando a ação ainda não existir;
- cada teste deve validar estado final, evento esperado e ausência de side effects;
- testes de API, HTTP, contrato de erro e permissão por rota ficam para `HOFF-031`;
- cobertura exaustiva de matriz de transições fica para `HOFF-032`.

## 11.2.2 Plano de API/HTTP - HOFF-031

HOFF-031 aprova o plano de testes de API. Ele valida a borda HTTP da state machine, sem substituir os unitários de domínio.

Casos obrigatórios:

- rotas mínimas atuais devem continuar cobertas: listagem, detalhe, envio para recepção e ACK;
- rotas futuras da próxima fatia devem ser planejadas com testes antes de implementação: `mark-pending`, `resolve-pending`, `return-to-clinic`, `send-to-finance` e reenvio;
- cada rota mutável deve testar sucesso, payload inválido, estado inválido, permissão insuficiente, recurso inexistente/cross-account e ausência de side effects proibidos;
- permissões esperadas devem seguir a matriz `clinical_handoff.*` aprovada em HOFF-028. O uso atual de `encounters.read/manage` no mínimo existente deve ser tratado como compatibilidade temporária a ser protegida e revisada na próxima fatia;
- respostas de erro devem ser previsíveis e não revelar existência de recurso de outra conta;
- auditoria HTTP deve registrar ação aceita, ator, recurso, severidade e correlação, sem registrar evento operacional quando a ação falhar antes de mudar estado;
- testes de API devem verificar que nenhum endpoint de handoff chama Billing, CounterSales, Queue, fechamento de Encounter, pagamentos, baixa, comanda, exame, prescrição, documento ou prontuário como side effect.

## 11.2.3 Matriz de transições - HOFF-032

HOFF-032 aprova a matriz de transições para testes e validação. Ela não implementa código e não libera BUILD.

Transições válidas da próxima fatia:

| De | Para | Ação | Permissão | Pré-condições obrigatórias |
| --- | --- | --- | --- | --- |
| `sent_to_reception` | `acknowledged_by_reception` | `acknowledge` | `clinical_handoff.acknowledge` | Usuário autenticado, mesma conta, item aguardando ACK. |
| `acknowledged_by_reception` | `waiting_pending_resolution` | `mark-pending` | `clinical_handoff.mark_pending` | Tipo, motivo, dono, criticidade e bloqueio financeiro quando aplicável. |
| `waiting_pending_resolution` | `acknowledged_by_reception` | `resolve-pending` | `clinical_handoff.resolve_pending` | Pendência ativa resolvida ou justificada; nenhuma pendência crítica aberta restante. |
| `acknowledged_by_reception` | `returned_to_clinic` | `return-to-clinic` | `clinical_handoff.return` | Motivo, tipo, destino clínico e, quando houver, vínculo com pendência. |
| `waiting_pending_resolution` | `returned_to_clinic` | `return-to-clinic` | `clinical_handoff.return` | Pendência clínica/documental exige complemento; motivo e destino clínico informados. |
| `returned_to_clinic` | `sent_to_reception` | `send-to-reception` | `clinical_handoff.send` | Motivo anterior respondido, resumo/instrução atualizados e destino operacional informado. |
| `acknowledged_by_reception` | `sent_to_finance` | `send-to-finance` | `clinical_handoff.send_to_finance` | Conferência operacional, origem financeira rastreável, sem pendência crítica e sem duplicidade não tratada. |
| `waiting_pending_resolution` | `sent_to_finance` | `send-to-finance` | `clinical_handoff.send_to_finance` | Pendências críticas resolvidas; pendências restantes não bloqueantes justificadas; origem financeira rastreável. |

Transições bloqueadas na próxima fatia:

| De | Para | Erro esperado | Motivo |
| --- | --- | --- | --- |
| `sent_to_reception` | `sent_to_finance` | `HANDOFF_INVALID_STATE` | Precisa ACK e conferência operacional antes do financeiro. |
| `sent_to_reception` | `returned_to_clinic` | `HANDOFF_INVALID_STATE` | Recepção deve assumir antes de devolver formalmente. |
| `sent_to_reception` | `waiting_pending_resolution` | `HANDOFF_INVALID_STATE` | Pendência operacional nasce após ACK. |
| `returned_to_clinic` | `acknowledged_by_reception` | `HANDOFF_INVALID_STATE` | Deve reenviar para recepção e aguardar novo ACK. |
| `sent_to_finance` | `in_billing` | `HANDOFF_INVALID_STATE` | Billing/CounterSales continuam rotinas próprias. |
| Qualquer ativo | `completed` | `HANDOFF_INVALID_STATE` | Critérios futuros existem, mas BUILD de conclusão segue bloqueado. |
| Qualquer ativo | `cancelled` | `HANDOFF_INVALID_STATE` | Cancelamento depende de SPEC futura. |
| Qualquer estado | `reopen` | `HANDOFF_INVALID_STATE` | Reabertura não aprovada para a próxima fatia. |
| `draft` | `ready_to_send` | `HANDOFF_INVALID_STATE` | Fluxo completo de rascunho/preparo segue fora da próxima fatia. |

Invariantes de todos os testes da matriz:

- transição aceita gera evento append-only e atualiza somente o estado/dados do handoff necessários;
- transição negada não altera estado, pendência, evento, Queue, Encounter, Billing ou CounterSales;
- pendência crítica aberta bloqueia `send-to-finance`;
- ausência de origem financeira rastreável bloqueia `send-to-finance`;
- ausência de permissão efetiva bloqueia antes da mudança de estado;
- nenhuma transição cria cobrança, comanda, recebível, pagamento, baixa, nota, exame, prescrição, documento ou prontuário.

## 11.2.4 Validação UX por papel - HOFF-033

HOFF-033 aprova o roteiro de validação UX por papel antes de BUILD. Ele valida clareza operacional da state machine, não implementa UI e não concede permissão por papel nominal.

| Template operacional | Estados e ações a validar | Bloqueios esperados |
| --- | --- | --- |
| Clínica | Preparar e enviar handoff, receber devolução, responder motivo e reenviar para recepção. | Não assumir cobrança/comanda automática; não resolver pendência financeira por atalho clínico. |
| Recepção/finalização | Listar recebidos, confirmar ACK, conferir resumo, marcar/resolver pendência, devolver para clínica e enviar ao financeiro. | Não editar prontuário, prescrição, laudo ou relatório; não criar cobrança/comanda por handoff. |
| Financeiro/caixa | Receber contexto em `sent_to_finance`, abrir rotina financeira/comercial própria quando permitido e identificar origem ou duplicidade ausente. | Não mudar `handoffStatus` para `in_billing`; não criar baixa, pagamento ou comanda automática. |
| Coordenação | Monitorar atraso, pendências, devoluções, estados vazios, sem permissão e trilha auditável. | Não executar transição operacional por visão de auditoria sem permissão efetiva da rotina. |

Cada validação deve registrar:

- usuário/grupo/setor usados apenas como configuração de teste, sem regra hardcoded;
- permissão efetiva esperada para a rotina;
- estado inicial, ação visível, CTA primária e resultado esperado;
- evidência de caminho feliz, sem permissão, dados incompletos, estado vazio e erro;
- classificação `Aprovado`, `Bloqueado`, `Ajustar` ou `Não se aplica`.

## 11.2.5 Smoke visual - HOFF-034

HOFF-034 aprova o plano de smoke visual da representação da state machine antes de BUILD. Ele não cria telas, não implementa automação visual e não substitui testes unitários/API.

Superfícies:

| Superfície | O que validar visualmente | O que não pode acontecer |
| --- | --- | --- |
| Inbox/recepção | Lista ativa, filtros, grupos por status, pendência crítica, atraso, CTA única por estado, vazio, erro e sem permissão. | Oferecer `completed`, `cancelled`, `in_billing`, cobrança/comanda automática ou edição clínica. |
| Encounter | Resumo/timeline de handoff, ação de envio/reenvio quando permitida, alerta de devolução e links contextuais. | Persistir `handoffStatus` em Encounter, fechar atendimento por handoff ou editar prontuário por atalho operacional. |
| Queue | Badge/overlay/link derivado de handoff, alerta de inconsistência e leitura de pendência/dono quando houver vínculo. | Criar status persistido de Queue, mover fila, ACK, pendência, devolução ou financeiro por inferência visual. |

Viewports mínimos:

- desktop operacional: largura igual ou superior a 1366px;
- largura intermediária: cerca de 1024px quando a tela tiver grade/lista densa;
- mobile: cerca de 390px a 430px de largura quando a superfície for responsiva ou usada em plantão.

Critérios:

- sem tela em branco;
- sem overflow horizontal do body;
- sem texto sobreposto, truncamento crítico ou botão com texto ilegível;
- CTA primária visível e coerente com o estado;
- estados carregando, vazio, erro, sem permissão e dados incompletos não mudam a estrutura de forma brusca;
- status não depende apenas de cor;
- foco por teclado alcança filtros, lista e ações principais quando aplicável;
- resultado registrado como `Aprovado`, `Bloqueado`, `Ajustar` ou `Não se aplica`, com rota, viewport e evidência.

## 11.3 Entidade e persistência da state machine - HOFF-020

A state machine deve persistir em `ClinicalHandoff`, não em `Encounter`, `Queue`, Billing ou eventos isolados.

Regras aprovadas:

- `clinical_handoffs.handoffStatus` guarda o estado atual;
- `clinical_handoff_pendings` guarda pendências que influenciam bloqueios e transições;
- `clinical_handoff_events` guarda histórico append-only de ações e transições;
- `Queue` pode refletir leitura derivada, mas não decide a state machine;
- `Encounter` fornece contexto e timeline clínica/operacional, mas não substitui `handoffStatus`;
- eventos são consequência auditável de transição, não fonte operacional única;
- regras complexas de transição continuam no service/state machine;
- constraints SQL devem proteger integridade básica, conta, status permitido e referências;
- qualquer ampliação de status deve ocorrer por migration futura autorizada.

## 11.3.1 Migration futura da state machine - HOFF-029

Estratégia aprovada:

- não alterar a migration `0045_clinical_handoffs` retroativamente;
- criar migration futura nova, aditiva e compatível com os registros atuais;
- ampliar o check de `handoff_status` somente para estados aprovados da próxima fatia: `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`;
- manter `completed`, `cancelled`, `in_billing`, `ready_to_send` completo e `reopen` fora do BUILD da próxima fatia;
- substituir constraints rígidas de rota clinic->reception por campos de rota/dono operacional compatíveis com devolução e financeiro, sem usar setor como autorização;
- criar `clinical_handoff_pendings` para pendências endereçáveis, com `pendingStatus`, `critical`, `blocksFinance`, dono, motivo e resolução;
- criar `clinical_handoff_events` como histórico append-only, com ator, permissão efetiva, estado anterior/novo, motivo, `pendingId` quando houver e idempotência;
- aplicar RLS por `accountId` em todas as tabelas e bloquear cross-account em `WITH CHECK`;
- backfill deve preservar handoffs existentes como envio/ACK mínimos, sem gerar pendência, envio financeiro, conclusão, cancelamento, cobrança ou comanda;
- índices devem atender inbox ativa, pendências críticas, dono operacional, atraso e timeline, sem mover a fonte da state machine para `Queue` ou `Encounter`.

## 11.4 Impacto na Queue - HOFF-025

A Queue deve continuar com state machine própria. No estado real atual, os status técnicos da Queue são `waiting`, `called`, `in_triage`, `in_care`, `observation`, `completed` e `cancelled`. HOFF-025 não aprova adicionar novos status persistidos a essa lista.

Decisão:

- `handoffStatus` não deve ser persistido na Queue;
- a Queue pode exibir overlay derivado de `ClinicalHandoff`, como badge de handoff ativo, grupo de inbox, atraso, pendência crítica e responsável atual do handoff;
- `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance` não são estados de Queue;
- ações de Queue não devem inferir ações de handoff;
- ações de handoff não devem concluir, cancelar, reabrir ou mover Queue automaticamente;
- qualquer sincronização futura com `operationalStatus` deve ser contrato explícito e aditivo, não side effect escondido.

Mapeamento aprovado para a próxima fatia:

| Handoff | Como a Queue pode enxergar | O que a Queue não faz |
| --- | --- | --- |
| `sent_to_reception` | Badge/agrupamento "aguardando recepção" quando houver `queueEntryId`. | Não muda para novo status persistido. |
| `acknowledged_by_reception` | Indicador de recebido/assumido pela finalização. | Não conclui atendimento nem inicia cobrança. |
| `waiting_pending_resolution` | Alerta de pendência e dono operacional derivado. | Não resolve pendência nem bloqueia por regra própria sem handoff. |
| `returned_to_clinic` | Alerta de devolução clínica vinculado ao caso. | Não reabre prontuário nem move automaticamente para atendimento. |
| `sent_to_finance` | Indicador de encaminhamento financeiro rastreável. | Não cria cobrança, comanda, pagamento ou `in_billing`. |

Estados terminais de Queue:

- se a Queue estiver `completed` ou `cancelled` e houver handoff ativo, a UI/API futura deve sinalizar inconsistência ou pendência operacional;
- não deve haver autocorreção silenciosa do handoff;
- a decisão de finalizar ou cancelar handoff continua em transição própria, fora da próxima fatia.

## 11.5 Impacto no Encounter - HOFF-026

Encounter continua sendo contexto obrigatório da state machine, mas não a fonte do estado do handoff.

No estado real atual, os status técnicos do Encounter são `reception`, `in_triage`, `in_care`, `observation` e `closed`. HOFF-026 não aprova adicionar estados persistidos de handoff ao Encounter.

Decisão:

- `handoffStatus` não deve ser persistido no Encounter;
- `closed` não significa `completed`;
- `completed` futuro do handoff não fecha Encounter por inferência;
- `closeEncounter` não conclui, cancela, devolve, envia ao financeiro ou reconhece handoff;
- envio/reenvio de handoff exige Encounter válido, da mesma conta e não fechado;
- timeline do Encounter pode receber resumo de eventos de handoff, mas eventos auditáveis completos pertencem a `clinical_handoff_events` futura;
- tela de Encounter pode exibir handoff ativo, pendências e próximo passo como leitura derivada;
- inconsistência entre Encounter fechado e handoff ativo deve virar alerta ou pendência operacional, não autocorreção silenciosa.

Mapeamento aprovado para a próxima fatia:

| Situação do Encounter | Relação com handoff | Regra |
| --- | --- | --- |
| Aberto em atendimento/observação | Pode receber envio de handoff se demais bloqueios forem atendidos. | Ação explícita de handoff. |
| Fechado antes do envio | Não deve iniciar handoff novo nesta frente. | Exige reabertura formal ou novo fluxo futuro. |
| Fechado com handoff ativo | Inconsistência ou exceção operacional a sinalizar. | Não completar/cancelar handoff sozinho. |
| Handoff completado futuramente | Pode aparecer no histórico do Encounter. | Não fechar Encounter automaticamente. |
| Handoff devolvido à clínica | Pode aparecer como alerta no Encounter. | Não reabrir atendimento automaticamente. |

## 11.6 Impacto em Billing/CounterSales - HOFF-027

Billing, Encounter Financial e CounterSales continuam como rotinas próprias. A state machine de handoff não assume estado financeiro e não executa ação financeira por inferência.

Decisão:

- `billingStatus` não deve ser substituído por `handoffStatus`;
- `sent_to_finance` não é `in_billing`;
- `sent_to_finance` não cria `billing_record`, `billing_item`, `encounter_billing_item`, comanda, venda, recebível, pagamento, baixa, parcela, nota ou movimento de caixa;
- `in_billing` continua fora da próxima fatia;
- `completed` não pode ser usado como fechamento financeiro automático;
- transições de handoff podem exigir origem financeira clara e checagem de duplicidade;
- falta de origem financeira deve gerar pendência `billing_origin`;
- risco de duplicidade deve bloquear avanço ou exigir justificativa auditável;
- qualquer escrita em Billing/CounterSales/recebíveis/pagamentos deve ocorrer por rota própria, permissão própria e ação explícita.

Mapeamento aprovado para a próxima fatia:

| Handoff | Relação financeira permitida | O que não faz |
| --- | --- | --- |
| `acknowledged_by_reception` | Conferência operacional de serviços/origem financeira. | Não cria cobrança ou comanda. |
| `waiting_pending_resolution` | Pode conter pendência `billing_origin`. | Não tenta corrigir cobrança sozinho. |
| `sent_to_finance` | Encaminha contexto para rotina financeira. | Não inicia `in_billing`, pagamento ou baixa. |
| `returned_to_clinic` | Pode pedir confirmação clínica de origem cobravel. | Não edita item financeiro. |
| `completed` futuro | Pode exigir resultado financeiro tratado. | Não fecha Billing/CounterSales por inferência. |

## 12. Fora de escopo

- Implementação.
- Schema final.
- API final.
- UI final.
- Regras fiscais.
- Cálculo financeiro.
- Criação automática de comanda.
- Criação automática de cobrança.
- Criação automática de orçamento.
- Criação automática de prescrição.
- Criação automática de exame.
- Migration.
- Alteração de rotas.
- Alteração de componentes.
- Alteração de backend.

## 13. Critérios de aceite do documento

A state machine estará pronta para virar SPEC técnica quando:

- estados forem aprovados; HOFF-005 aprovado para a próxima fatia;
- transições forem aprovadas; HOFF-006 aprovado para a próxima fatia;
- atores forem definidos;
- pré-condições forem validadas;
- bloqueios forem aceitos; HOFF-008 aprovado para a próxima fatia;
- impacto em `Queue`/`Encounter`/Billing for documentado;
- eventos auditáveis forem aprovados;
- decisão sobre recepção vs financeiro direto for tomada; concluído em HOFF-004 para a próxima fase;
- decisão sobre entidade própria vs extensão de `Queue`/`Encounter` for tomada; concluído em HOFF-003;
- exceções críticas tiverem tratamento operacional aprovado.
- pendências críticas tiverem tratamento operacional aprovado; HOFF-009 aprovado para a próxima fatia.

## 14. Próximos artefatos

- `893-prd-inbox-recepcao-finalizacao.md`
- `894-spec-api-handoff-clinico.md`
- `895-backlog-handoff-clinico.md`

## 15. Guardrail final

Este documento não autoriza BUILD.

Agentes não devem alterar código, backend, rotas, schema, migration, `Queue`, `Encounter`, Billing ou financeiro com base apenas nesta state machine candidata.

Qualquer implementação futura exige:

- aprovação desta state machine;
- PRD da inbox da recepção;
- SPEC/API aprovada;
- validação de permissões;
- validação de regras financeiras;
- autorização explícita do responsável.
