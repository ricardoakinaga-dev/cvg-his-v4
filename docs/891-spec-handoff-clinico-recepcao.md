# 891 - SPEC Handoff Clínico para Recepção

Data: 2026-04-29
Status: rascunho para validação
Origem: `docs/880-plano-executivo-ux-operacional.md`, `docs/886-modelo-operacional-queue-encounter.md`, `docs/887-prd-jornada-recepcao.md`, `docs/888-prd-jornada-veterinario-clinico.md`, `docs/890-plano-validacao-operacional.md`

## 0. Status

- Rascunho para validação.
- Não autoriza implementação.
- Depende de aprovação de regra operacional e técnica.
- Não define schema final, contrato de API, migration, rota, componente ou tela final.
- Qualquer BUILD futuro depende de PRD/SPEC aprovado e autorização explícita do responsável.
- Alinhado em 2026-05-01 à decisão de governança neutra: nomes como recepção, clínica, financeiro e coordenação são templates conversacionais/operacionais, não regra de autorização.
- `HOFF-001` fechado em 2026-05-01: fronteira entre pré-handoff, `HOFF-MIN-1` e handoff completo aprovada neste documento.
- `HOFF-002` fechado em 2026-05-01 em conjunto com o `892`: separação entre `clinicalStatus`, `operationalStatus`, `billingStatus` e `handoffStatus` aprovada conceitualmente.
- `HOFF-003` fechado em 2026-05-01: handoff completo será entidade própria `ClinicalHandoff`, integrada a `Encounter`, `Queue` e eventos auditáveis, sem virar apenas campo de outro agregado.
- `HOFF-004` fechado em 2026-05-01: recepção/finalização operacional é checkpoint padrão antes de financeiro; financeiro direto fica fora da próxima fatia e só pode existir futuramente como exceção explícita.
- `HOFF-005` e `HOFF-006` fechados em 2026-05-01: próxima fatia aprovada inclui pendência, devolução clínica, reenvio para recepção e envio financeiro explícito após ACK.
- `HOFF-008` e `HOFF-009` fechados em 2026-05-01: bloqueios e pendências críticas aprovados para impedir avanço inseguro a financeiro/conclusão futura.
- `HOFF-011` e `HOFF-012` fechados em 2026-05-01: recepção/finalização passa a ter jornada de conferência aprovada e financeiro passa a receber somente encaminhamento explícito, sem automação financeira.
- `HOFF-023` fechado em 2026-05-01: eventos auditáveis da próxima fatia aprovados sem substituir a entidade ativa nem carregar conteúdo clínico/financeiro sensível.
- `HOFF-013` e `HOFF-016` fechados em 2026-05-01: inbox da recepção, filtros visuais, campos, ações por estado, estados vazios e estados sem permissão aprovados para a próxima fatia.
- `HOFF-014` e `HOFF-015` fechados em 2026-05-01: resumo mínimo e devolução clínica aprovados para envio/reenvio seguro, sem exigir prontuário completo e sem permitir edição clínica pela recepção.
- `HOFF-024` fechado em 2026-05-01: filtros de listagem da inbox/API aprovados como consulta operacional com paginação, ordenação, validação e autorização neutra.
- `HOFF-017` fechado em 2026-05-02: SLA/alerta de atraso aprovado como leitura derivada por tempo aguardando, sem virar estado, bloqueio automático ou autorização.
- `HOFF-018` fechado em 2026-05-02: critérios de finalização operacional futura aprovados para `completed`, sem liberar conclusão automática, cancelamento ou BUILD.
- `HOFF-019` fechado em 2026-05-02: checklist operacional aprovado para validar handoff por papel, transição, bloqueio, permissão e evidência antes de BUILD.
- `HOFF-020` fechado em 2026-05-02: entidade/schema futuro de `ClinicalHandoff` aprovado como tabela base, pendências estruturadas e eventos auditáveis, sem migration agora.
- `HOFF-025` fechado em 2026-05-02: impacto na Queue aprovado como leitura/overlay derivado de `ClinicalHandoff`, sem novos status persistidos de Queue e sem side effects automáticos.
- `HOFF-026` fechado em 2026-05-02: impacto no Encounter aprovado como âncora contextual e timeline resumida, sem absorver `handoffStatus` e sem usar `closed` como conclusão de handoff.
- `HOFF-027` fechado em 2026-05-02: impacto em Billing/CounterSales aprovado como encaminhamento contextual e checagem de duplicidade, sem criação ou movimentação financeira automática.
- `HOFF-028` fechado em 2026-05-02: permissões técnicas do handoff aprovadas como códigos configuráveis no `/access-control`, sem autorização hardcoded por nome de setor, cargo, profissão, grupo ou template.
- `HOFF-029` fechado em 2026-05-02: estratégia de migration futura aprovada como evolução aditiva e reversível do `HOFF-MIN-1`, sem criar migration agora.
- `HOFF-030` fechado em 2026-05-02: plano de testes unitários da state machine/service aprovado antes de qualquer BUILD da próxima fatia.
- `HOFF-031` fechado em 2026-05-02: plano de testes de API, rotas, contratos de erro e permissões por endpoint aprovado, sem implementar testes agora.
- `HOFF-032` fechado em 2026-05-02: matriz de transições válidas e inválidas da state machine aprovada para orientar testes e impedir BUILD ambíguo.
- `HOFF-033` fechado em 2026-05-02: validação UX por papel aprovada como walkthrough operacional antes de BUILD, usando papéis apenas como templates e mantendo autorização por permissão efetiva.
- `HOFF-034` fechado em 2026-05-02: smoke visual da inbox, Encounter e Queue aprovado como validação pré-BUILD quando houver superfície aplicável, sem criar UI nova.
- `HOFF-035` fechado em 2026-05-02: auditoria/eventos da próxima fatia aprovados como trilha append-only validável, sem substituir `ClinicalHandoff` nem carregar conteúdo sensível.
- `HOFF-036` fechado em 2026-05-02: rollback e mitigação aprovados para a próxima fatia, preservando `HOFF-MIN-1` e impedindo BUILD sem reversão operacional clara.
- `HOFF-037` fechado em 2026-05-02: validação com operação aprovada e fase de planejamento pré-BUILD encerrada; BUILD continua dependente de autorização explícita.

## 1. Objetivo

O handoff clínico é o ato formal de devolver um atendimento da clínica para recepção/financeiro com contexto suficiente para finalização operacional.

Ele deve transformar a conclusão clínica em um pacote operacional compreensível para recepção, financeiro e coordenação, sem exigir que a recepção interprete o prontuário inteiro para descobrir o que precisa fazer.

O objetivo desta SPEC é definir o comportamento candidato do handoff real entre Veterinário -> Recepção, incluindo estados, payload conceitual, regras operacionais, exceções, permissões e impactos futuros.

Esta SPEC ainda não autoriza implementação. Ela prepara a validação de regra operacional e técnica para documentos posteriores.

## 2. Problema atual

Antes do `HOFF-MIN-1`, existia apenas um pré-handoff visual no `Encounter`.

Após o `HOFF-MIN-1`, o sistema passou a possuir um handoff clínico mínimo persistido, com envio para recepção, confirmação de recebimento e trilha de timeline/auditoria. Esse mínimo ainda não representa o handoff completo descrito nesta SPEC.

Gaps remanescentes:

- a `Queue` não tem estado persistente específico de `pronto_para_recepcao`, `aguardando_cobranca` ou `pendencia_clinica/financeira`;
- a recepção possui apenas inbox mínima de handoffs, ainda sem devolução clínica, conclusão/cancelamento, SLA ou dono operacional amplo;
- o caso pode ficar sem dono operacional claro depois do ACK se a próxima ação exigir financeiro, pendência clínica, documento, tutor ou coordenação;
- billing, orçamento, prescrições e exames aparecem como satélites, não como pacote único de handoff;
- fechamento clínico e fechamento operacional ainda podem ser confundidos;
- já existe confirmação formal de recebimento pela recepção, mas não existe devolução, cancelamento, conclusão ou encerramento operacional do handoff;
- existe trilha auditável mínima para envio e recebimento, mas não para devolução, envio ao financeiro, pendência, cancelamento ou conclusão.

Risco operacional:

- recepção pode não saber se deve orientar tutor, cobrar, agendar retorno, aguardar exame, entregar receita, internar, devolver para clínica ou fechar;
- financeiro pode cobrar sem origem clara ou deixar item pendente;
- veterinário pode finalizar sem resumo operacional mínimo;
- coordenação não consegue medir tempo entre finalização clínica e ação da recepção.

## 3. Conceitos

| Conceito | Definição operacional |
| --- | --- |
| `Encounter` | Unidade operacional do atendimento. Conecta tutor, animal, prontuário, exames, prescrições, orçamento, billing, Queue e fechamento. Não deve ser tratado apenas como prontuário. |
| `Queue item` | Item vivo da esteira operacional. Deve indicar estado, setor atual, responsável atual, próximo setor, prioridade, origem e pendências. |
| Handoff clínico | Evento formal em que a clínica devolve o caso para recepção/financeiro com resumo, instruções e pendências. |
| Pendência | Item operacional ainda não resolvido, com tipo, dono, origem e impacto no avanço do fluxo. |
| Responsável atual | Pessoa, equipe ou setor que deve agir agora. Não pode ficar indefinido em item ativo. |
| Próximo setor | Setor esperado após a ação atual. Exemplos: recepção, financeiro, laboratório, imagem, internação, clínica. |
| Recepção | Setor que recebe, orienta, agenda, confere documentos, encaminha, cobra ou fecha a jornada conforme contexto. |
| Financeiro | Setor ou função que cobra, registra pagamento, trata pendência financeira e fecha cobrança. |
| Finalização clínica | Momento em que o veterinário conclui a parte clínica ou define que há pendência clínica explícita. Não equivale a fechamento operacional. |
| Fechamento operacional | Encerramento do caso após orientação, pendências, cobrança, documentos, exames e próximos passos estarem resolvidos ou formalmente pendentes. |
| Template conversacional | Nome humano usado para entendimento do fluxo, como recepção, clínica ou financeiro. Não concede acesso sozinho. |
| Permissão efetiva | Resultado calculado pela governança de acesso a partir de usuário, grupos, setores, rotina e grants `Herdar`, `Conceder` ou `Negar`. |

## 3.1 Fronteira aprovada - HOFF-001

Esta SPEC passa a separar três camadas:

| Camada | Estado aprovado | O que é | O que não é |
| --- | --- | --- | --- |
| Pré-handoff | Existente como UX/contexto | Blocos, links e contexto em Atendimento/Prontuário/Comanda que ajudam o usuário a preparar a próxima ação. | Não é entidade persistida de handoff, não gera ACK, não muda dono operacional e não move cobrança. |
| `HOFF-MIN-1` | Implementado | Entidade `ClinicalHandoff` mínima com envio para recepção, status `sent_to_reception`, ACK `acknowledged_by_reception`, persistência SQL, listagem e timeline/auditoria. | Não é inbox completa, não devolve para clínica, não envia para financeiro, não conclui/cancela handoff, não cria cobrança/comanda e não resolve todos os estados da `Queue`. |
| Handoff completo | Futuro, ainda bloqueado | State machine ampliada com pendências, dono operacional, devolução, envio ao financeiro, conclusão/cancelamento e integração mais clara com `Queue`, `Encounter`, Billing e auditoria. | Não está autorizado por este fechamento de HOFF-001/HOFF-002. |

Decisão: o `HOFF-MIN-1` é uma primeira fatia real e persistida, mas a SPEC completa continua candidata. Qualquer expansão deve partir das decisões P0/P1 do backlog e de autorização explícita.

## 4. Estados candidatos

Estados candidatos para discussão em state machine futura:

- `em_atendimento`;
- `aguardando_finalizacao_clinica`;
- `pronto_para_recepcao`;
- `aguardando_cobranca`;
- `em_cobranca`;
- `pendente_clinico`;
- `pendente_financeiro`;
- `fechado_operacionalmente`;
- `cancelado`.

Os nomes finais dependem da `892-state-machine-handoff-operacional.md`.

Decisão aprovada para o 892:

- `pronto_para_recepcao` não deve ser `clinicalStatus`;
- no estágio atual, ele deve ser tratado como leitura operacional derivada do `handoffStatus = sent_to_reception`;
- só deve virar `operationalStatus` próprio se uma etapa futura aprovar sincronização formal com `Queue`/`Encounter`;
- se a operação precisar separar "clínica concluída" de "devolvido para recepção", os nomes devem ficar em dimensões diferentes: `clinicalStatus` para conclusão clínica e `handoffStatus`/`operationalStatus` para movimentação operacional.

Esta decisão fecha a ambiguidade conceitual sem autorizar novos campos, migrations ou transições.

Regras de leitura:

- `em_atendimento`: clínica ainda está conduzindo o caso.
- `aguardando_finalizacao_clinica`: atendimento precisa de conclusão clínica antes de ir para recepção.
- `pronto_para_recepcao`: clínica concluiu e recepção deve assumir a próxima ação.
- `aguardando_cobranca`: recepção/financeiro precisa cobrar ou validar valores.
- `em_cobranca`: pagamento ou negociação está em andamento.
- `pendente_clinico`: caso precisa voltar para clínica por pendência clínica.
- `pendente_financeiro`: caso está bloqueado por pagamento, negociação, cobrança parcial ou saída sem pagamento.
- `fechado_operacionalmente`: caso encerrado após validação final.
- `cancelado`: jornada encerrada por desistência, erro, cancelamento formal ou motivo aprovado.

## 5. Payload candidato de handoff

Esta tabela é um payload candidato para modelagem futura. Não é contrato final de API, schema, migration ou DTO.

| Campo candidato | Tipo conceitual | Obrigatoriedade candidata | Finalidade operacional |
| --- | --- | --- | --- |
| `handoffId` | identificador | Sim | Identificar o handoff de forma única. |
| `encounterId` | identificador | Sim | Vincular ao atendimento clínico. |
| `queueItemId` | identificador | Sim candidato | Vincular à esteira operacional quando existir item de Queue. |
| `appointmentId` | identificador opcional | Condicional | Preservar origem quando o atendimento nasceu de Agenda ou retorno agendado. |
| `ownerId` | identificador | Sim | Identificar tutor/responsável. |
| `patientId` | identificador | Sim candidato | Identificar animal/paciente quando aplicável. |
| `originChannel` | enum/texto controlado | Sim candidato | Indicar origem operacional: recepção, agenda, WhatsApp, telefone, retorno, emergência ou outro canal validado. |
| `fromSector` | enum/setor | Sim | Setor que envia o handoff, normalmente clínica. |
| `toSector` | enum/setor | Sim | Setor destino, normalmente recepção ou financeiro. |
| `fromResponsibleId` | identificador | Sim | Profissional ou usuário que enviou. |
| `toResponsibleType` | enum | Sim | Pessoa, equipe ou setor. |
| `toResponsibleId` | identificador opcional | Condicional | Responsável destino quando houver pessoa/equipe específica. |
| `clinicalSummary` | texto curto | Sim | Resumo clínico-operacional para recepção. |
| `receptionInstructions` | texto/lista | Sim | O que a recepção deve fazer agora. |
| `pendingExams` | lista | Condicional | Exames solicitados, pendentes ou aguardando resultado. |
| `pendingPrescriptions` | lista | Condicional | Receitas/prescrições a entregar, imprimir ou orientar. |
| `pendingBilling` | lista/status | Condicional | Itens cobraveis, saldo, cobrança parcial ou pendência. |
| `pendingQuotes` | lista/status | Condicional | Orçamentos a aprovar, revisar ou comunicar ao tutor. |
| `requiredDocuments` | lista | Condicional | Documentos, termos, receitas, laudos ou anexos necessários. |
| `priority` | enum | Sim candidato | Prioridade operacional do handoff. |
| `createdBy` | identificador | Sim | Usuário que criou/enviou o handoff. |
| `createdAt` | data/hora | Sim | Momento do envio. |
| `acknowledgedBy` | identificador | Condicional | Usuário da recepção/financeiro que recebeu. |
| `acknowledgedAt` | data/hora | Condicional | Momento de confirmação de recebimento. |
| `status` | enum | Sim | Estado do handoff: enviado, recebido, devolvido, cancelado, fechado ou pendente. |

Regras candidatas do payload:

- campos obrigatórios finais dependem da state machine e do schema aprovados;
- texto livre deve ser suficiente para orientação, mas pendências críticas devem ser estruturadas;
- pendência sem dono não deve ser considerada válida;
- campos financeiros devem apontar origem, mas não devem executar cobrança automaticamente;
- campos de exame e prescrição devem referenciar itens existentes ou pendências declaradas, não criar registros automaticamente.

## 5.2 Resumo mínimo aprovado - HOFF-014

O resumo mínimo é o pacote operacional que permite enviar ou reenviar um handoff para recepção sem obrigar a recepção a interpretar o prontuário completo.

Campos obrigatórios para envio/reenvio:

| Campo | Regra |
| --- | --- |
| `encounterId` | Atendimento ativo e pertencente à conta. |
| `ownerId` | Tutor/responsável, exceto emergência ou fluxo sem tutor aprovado. |
| `patientId` | Paciente/animal, exceto atendimento sem animal aprovado. |
| `clinicalSummary` | Resumo clínico-operacional curto, suficiente para orientar continuidade. |
| `receptionInstructions` | O que a recepção/finalização deve fazer agora. |
| `toResponsibleType` | Pessoa, equipe ou setor destino. |
| `toResponsibleId` | Dono operacional destino quando houver pessoa/equipe/setor definido. |
| `priority` | Prioridade operacional. |
| `pendingDeclaration` | Indicação explícita se há pendências ou se não há pendências conhecidas. |
| `financialOriginStatus` | `not_applicable`, `clear`, `pending_review` ou `unknown`. |

Campos condicionais:

| Campo | Quando exigir |
| --- | --- |
| `pendingExams` | Quando houver exame solicitado, pendente, em análise ou relevante para alta/orientação/cobrança. |
| `pendingPrescriptions` | Quando houver receita/prescrição a entregar, imprimir, orientar ou revisar. |
| `requiredDocuments` | Quando houver termo, laudo, relatório, receita, autorização ou assinatura pendente. |
| `pendingBilling` | Quando houver serviço/item cobravel, divergência de lançamento ou cobrança a revisar. |
| `pendingQuotes` | Quando houver orçamento a comunicar, aprovar ou revisar. |
| `returnResponse` | Quando o envio for reenvio após `returned_to_clinic`. |

Regras:

- `clinicalSummary` não deve copiar o prontuário inteiro.
- `receptionInstructions` deve ser operacional, não uma evolução clínica longa.
- ausência de pendência deve ser declarada; silêncio não significa "sem pendência".
- pendência crítica deve ser estruturada com tipo, motivo, dono e criticidade.
- origem financeira desconhecida deve virar `financialOriginStatus = unknown` ou pendência `billing_origin`.
- atendimento de emergência pode usar resumo mínimo inicial, mas deve registrar pendência de complemento quando faltar documentação relevante.
- reenvio após devolução clínica exige resposta ao motivo da devolução.
- resumo mínimo não cria exame, prescrição, documento, orçamento, cobrança ou comanda.

## 5.3 Devolução clínica aprovada - HOFF-015

A devolução clínica é a transição que devolve o caso da recepção/finalização para a clínica quando falta informação assistencial, documentação clínica ou reavaliação necessária para orientar, cobrar com segurança ou continuar o atendimento.

Motivos controlados aprovados:

| `returnType` | Quando usar |
| --- | --- |
| `summary_missing` | Resumo insuficiente para orientar tutor, liberar paciente ou justificar serviço. |
| `documentation_needed` | Falta documento, receita, relatório, termo, laudo ou assinatura clínica. |
| `prescription_clarification` | Receita/prescrição precisa ser entregue, corrigida, impressa ou esclarecida. |
| `diagnostic_clarification` | Exame, laudo, resultado ou conduta diagnóstica precisa de complemento. |
| `reassessment_needed` | Caso exige reavaliação clínica antes de avançar. |
| `billing_origin_clinical` | Origem de serviço/procedimento depende de confirmação clínica. |
| `other` | Exceção justificada, com motivo textual obrigatório. |

Campos obrigatórios:

- `returnType`;
- `reason`;
- `toResponsibleType`;
- `toResponsibleId`;
- `relatedPendingId`, quando a devolução nasce de pendência já registrada;
- `note`, quando `returnType = other` ou quando o motivo precisar de contexto adicional.

Regras:

- só pode devolver após ACK da recepção/finalização;
- devolução puramente financeira não deve ir para clínica; deve virar pendência financeira/origem;
- recepção não edita prontuário por meio da devolução;
- clínica responde complementando documentação/conduta na rotina própria e reenviando o handoff;
- reenvio deve atualizar `clinicalSummary` ou `receptionInstructions` quando o motivo exigir;
- devolução deve gerar evento auditável e preservar motivo/destino;
- devolução não conclui, cancela, cobra, cria comanda ou abre `in_billing`.

## 5.1 Modelo estrutural aprovado - HOFF-003

O handoff completo deve evoluir como **entidade própria `ClinicalHandoff`**, preservando a direção já iniciada no `HOFF-MIN-1`.

Decisão:

- `ClinicalHandoff` é a fonte de verdade do handoff e do `handoffStatus`;
- `Encounter` é o contexto clínico/operacional obrigatório, não o lugar principal da state machine de handoff;
- `Queue` é a fonte do trabalho vivo e pode receber leitura/sincronização derivada, mas não deve ser a única fonte do handoff;
- eventos auditáveis registram transições e motivos, mas não substituem a entidade;
- Billing/CounterSales recebem contexto futuro, mas não são criados nem movimentados automaticamente pelo handoff.

Consequência prática:

- o modelo final é uma combinação controlada: entidade própria + vínculo obrigatório com `Encounter` + vínculo opcional/derivado com `Queue` + eventos auditáveis;
- não criar campos soltos em `Encounter` ou `Queue` como substituto da entidade;
- não usar evento auditável puro como fonte operacional única, porque a recepção precisa listar, filtrar, assumir e acompanhar itens ativos.

## 6. Regras operacionais candidatas

- Veterinário não deve finalizar handoff sem resumo mínimo.
- Recepção deve confirmar recebimento.
- Handoff não deve fechar cobrança automaticamente.
- Handoff não deve criar comanda automaticamente.
- Handoff não deve criar orçamento automaticamente.
- Handoff não deve criar prescrição, receita ou pedido de exame automaticamente.
- Handoff deve preservar trilha auditável.
- Pendências devem ter dono.
- Pendências devem indicar setor responsável ou responsável individual.
- Cancelamento/desistência precisam motivo.
- Devolução para clínica precisa motivo e responsável destino.
- Handoff financeiro não substitui fluxo de cobrança.
- Fechamento clínico não deve ser confundido com fechamento operacional.
- Recepção não deve precisar abrir prontuário completo para entender a próxima ação.
- Caso sem animal só pode seguir se o tipo de fluxo permitir.
- Caso em emergência pode aceitar resumo mínimo inicial, mas deve registrar pendência de complemento quando aplicável.

Regras negativas:

- não usar handoff como texto livre sem estado;
- não usar `closed` como substituto de `pronto_para_recepcao`;
- não esconder pendência financeira dentro de observação clínica;
- não permitir item ativo sem próximo setor;
- não permitir caso devolvido sem rastreabilidade de quem enviou e quem recebeu.

## 6.1 Bloqueios e pendências críticas aprovados - HOFF-008/HOFF-009

Bloqueios mínimos:

- não enviar ou reenviar sem `Encounter` ativo, resumo mínimo, instrução operacional, destino e rastreabilidade;
- não confirmar ACK fora de `sent_to_reception`;
- não registrar pendência sem tipo, motivo e dono;
- não devolver para clínica sem ACK, motivo e destino clínico;
- não enviar ao financeiro sem ACK, conferência operacional, origem financeira rastreável e ausência de pendência crítica aberta;
- não criar cobrança, comanda, baixa, exame, prescrição ou orçamento automaticamente a partir do handoff.

Pendências críticas aprovadas:

| Tipo | Bloqueia financeiro quando |
| --- | --- |
| `clinical` | falta informação assistencial mínima para orientar, liberar, entregar prescrição ou justificar serviço. |
| `documentation` | falta documento, termo, receita, laudo, relatório ou assinatura obrigatória. |
| `billing_origin` | serviços/itens realizados não estão claros ou há risco de cobrança duplicada. |
| `owner_guidance` | tutor não recebeu orientação necessária para continuidade, alta, medicação, exame ou retorno. |
| `diagnostic` | exame/laudo/resultado pendente altera conduta, alta, orientação ou cobrança segura. |
| `operational_owner` | não existe dono operacional da próxima ação. |
| `accountability` | falta ator, destino, motivo ou evento auditável em transição sensível. |

Pendência não crítica pode acompanhar o caso, desde que tenha dono e justificativa auditável.

## 7. Fluxo alvo

1. Veterinário conclui atendimento clínico.
2. Sistema mostra resumo de handoff.
3. Veterinário confirma envio para recepção.
4. A visão operacional da `Queue`, quando aplicável, exibe sinal derivado do handoff, sem mudar status persistido por inferência.
5. Recepção recebe item em fila própria ou visão filtrada.
6. Recepção confere prescrições, exames, orçamento e cobrança.
7. Financeiro cobra/fecha quando aplicável.
8. Caso é fechado operacionalmente.

Regras de transição candidatas:

- se houver saldo ou item cobravel, próximo setor candidato é recepção/financeiro;
- se houver exame pendente sem resultado, próximo setor pode ser laboratório/imagem ou recepção acompanhando;
- se houver receita a entregar, recepção deve receber instrução explícita;
- se houver necessidade de internação, próximo setor deve ser internação, com recepção ciente quando houver cobrança/orientação;
- se o tutor não aprovar orçamento, o handoff deve registrar decisão e próximo passo;
- se houver pendência clínica, o caso não deve aparecer como pronto para fechamento.

Estados/transições aprovados para a próxima fatia:

- `sent_to_reception -> acknowledged_by_reception`;
- `acknowledged_by_reception -> waiting_pending_resolution`;
- `waiting_pending_resolution -> acknowledged_by_reception`;
- `acknowledged_by_reception -> returned_to_clinic`;
- `waiting_pending_resolution -> returned_to_clinic`;
- `returned_to_clinic -> sent_to_reception`;
- `acknowledged_by_reception -> sent_to_finance`;
- `waiting_pending_resolution -> sent_to_finance`.

Ficam fora da próxima fatia:

- rascunho/preparo completo `draft -> ready_to_send`;
- decisão do tutor `waiting_owner_decision`;
- cobrança em andamento `in_billing`;
- conclusão operacional `completed`;
- cancelamento `cancelled`.

## 7.1 Impacto na Queue - HOFF-025

Decisão HOFF-025:

- a `Queue` continua sendo a esteira de trabalho vivo, com state machine própria;
- `ClinicalHandoff` continua sendo a fonte do `handoffStatus`;
- a próxima fatia não cria novos status persistidos de Queue como `pronto_para_recepcao`, `aguardando_finalizacao`, `pendente_handoff` ou `aguardando_financeiro`;
- nomes como `pronto_para_recepcao` podem existir como rótulo visual, filtro ou agrupamento derivado, mas não como transição da Queue nesta fase;
- `queueEntryId` é vínculo de contexto quando o atendimento nasceu ou passou pela Queue; handoff sem Queue vinculada continua válido se tiver `Encounter`;
- endpoints de Queue, como chamar, iniciar triagem/atendimento, observação, concluir ou cancelar, não devem criar handoff, ACK, pendência, devolução ou envio financeiro automaticamente;
- endpoints de handoff não devem concluir, cancelar ou reabrir item de Queue automaticamente;
- inconsistências entre Queue e handoff devem aparecer como alerta operacional ou pendência, não como correção silenciosa.

Leitura operacional permitida:

| Campo/indicador derivado | Fonte primária | Uso permitido |
| --- | --- | --- |
| Handoff ativo | `ClinicalHandoff` por `encounterId`/`queueEntryId` | Badge, link ou resumo na Queue. |
| Grupo da inbox | `handoffStatus` | Atalho visual para recepção/finalização. |
| Pendência crítica | `clinical_handoff_pendings` futura | Alerta e bloqueio de avanço financeiro via handoff. |
| Atraso | `waitingSince`/SLA derivado | Ordenação, destaque e filtro visual. |
| Responsável atual do handoff | `ClinicalHandoff`/pendência | Contexto operacional, sem conceder permissão. |

Fora desta decisão:

- alterar a migration de `scheduling_queue_entries`;
- adicionar novos estados à state machine atual da Queue;
- mover `handoffStatus` para Queue;
- criar sincronização bidirecional automática;
- criar cobrança, comanda, pagamento, exame, prescrição ou fechamento por ação da Queue;
- liberar BUILD de integração Queue/Encounter sem autorização explícita.

## 7.2 Impacto no Encounter - HOFF-026

Decisão HOFF-026:

- `Encounter` é o contexto clínico-operacional obrigatório do handoff;
- `ClinicalHandoff` continua sendo a fonte do `handoffStatus`;
- a próxima fatia não adiciona `handoffStatus` persistido dentro de `Encounter`;
- os status atuais do Encounter, como `reception`, `in_triage`, `in_care`, `observation` e `closed`, não substituem estados do handoff;
- envio ou reenvio de handoff exige `Encounter` válido, da mesma conta e não fechado;
- handoff sem `Encounter` não é válido nesta frente;
- `closeEncounter` não deve ser usado como substituto de envio para recepção, ACK, devolução, envio ao financeiro, conclusão ou cancelamento do handoff;
- completar handoff futuramente não fecha Encounter automaticamente;
- fechar Encounter não completa, cancela ou resolve handoff automaticamente;
- timeline do Encounter pode exibir eventos resumidos de handoff, mas não substitui `clinical_handoff_events`.

Leitura operacional permitida em tela de Encounter:

| Campo/indicador derivado | Fonte primária | Uso permitido |
| --- | --- | --- |
| Handoff ativo | `ClinicalHandoff` por `encounterId` | Bloco contextual, CTA e navegação. |
| Estado do handoff | `ClinicalHandoff.handoffStatus` | Badge e orientação de próximo passo. |
| Pendências do handoff | `clinical_handoff_pendings` futura | Alerta e checklist contextual. |
| Últimos eventos | `clinical_handoff_events` futura e timeline resumida | Histórico operacional sem substituir auditoria. |
| Consistência Encounter/Handoff | Comparação de status | Alerta quando Encounter estiver fechado com handoff ativo. |

Fora desta decisão:

- alterar schema de `encounters`;
- adicionar novos status ao Encounter;
- mover `handoffStatus` para Encounter;
- usar `closed` como `completed`;
- bloquear `closeEncounter` por handoff ativo sem SPEC própria;
- liberar conclusão, cancelamento, automação financeira ou BUILD de integração ampla.

Decisão aprovada - HOFF-004:

- para a próxima evolução, todo handoff clínico concluído deve passar pela recepção/finalização operacional antes de seguir para financeiro;
- recepção/finalização operacional é o ponto de conferência de documentos, orientações, pendências, serviços realizados, lançamentos e encaminhamento de cobrança;
- financeiro só deve receber o caso depois de ACK e conferência operacional, por transição explícita futura como `sent_to_finance`;
- não aprovar caminho direto clínica -> financeiro nesta fase.

Jornada aprovada da recepção/finalização - HOFF-011:

- receber o caso somente via `sent_to_reception`;
- confirmar ACK antes de qualquer devolução, pendência ou envio ao financeiro;
- conferir tutor, paciente, atendimento, resumo, instruções, documentos, prescrições, exames, retornos, serviços realizados e origem financeira;
- registrar pendências com tipo, motivo, dono e criticidade;
- manter pendência crítica em `waiting_pending_resolution` ou devolver à clínica quando a resolução exigir complemento assistencial;
- permitir que pendência não crítica siga apenas com dono e justificativa auditável;
- encaminhar ao financeiro somente quando houver conferência operacional registrada, origem financeira rastreável e nenhuma pendência crítica aberta;
- não editar prontuário, não criar comanda/cobrança e não concluir/cancelar handoff nesta fatia.

Jornada aprovada do financeiro - HOFF-012:

- receber caso somente em `sent_to_finance`;
- tratar `sent_to_finance` como encaminhamento operacional, não como criação automática de cobrança;
- conferir contexto, origem financeira e pendências não críticas antes de operar;
- abrir Billing, CounterSales ou rotina financeira própria apenas por ação explícita e permissão efetiva da rotina;
- devolver ou marcar pendência `billing_origin` quando faltar origem rastreável ou houver risco de duplicidade;
- não receber caso por caminho direto clínica -> financeiro nesta fase;
- não usar handoff para lançar pagamento, baixa, parcela, nota, comanda ou cobrança automaticamente;
- não concluir handoff como `completed` nesta fatia.

## 7.3 Impacto em Billing/CounterSales - HOFF-027

Decisão HOFF-027:

- `sent_to_finance` é encaminhamento operacional rastreável, não criação de cobrança;
- handoff não cria `billing_record`, `billing_item`, `encounter_billing_item`, comanda, venda, recebível, pagamento, baixa, parcela, nota, PIX, cartão ou movimento de caixa;
- handoff não chama `POST /billing/estimate`, `POST /billing/items`, `PATCH /billing/:encounterId/status`, `POST /encounters/:encounterId/billing-items`, `POST /encounters/:encounterId/financial-close`, `POST /financial/receivables/:id/settle`, `POST /counter-sales`, `POST /counter-sales/:id/items`, `POST /counter-sales/:id/payments` ou `POST /counter-sales/:id/close` como side effect;
- Billing, Encounter Financial e CounterSales continuam rotinas próprias, por ação explícita e permissão efetiva própria;
- ausência de origem financeira rastreável deve virar pendência `billing_origin`, não tentativa de cobrança;
- risco de duplicidade financeira deve bloquear `send-to-finance` ou exigir justificativa auditável antes de seguir;
- um handoff pode carregar referências contextuais para cobrança/comanda existente, mas não altera esses recursos;
- se a operação optar por abrir comanda, cobrança ou recebível, isso deve acontecer na rotina financeira/comercial correta, com usuário, permissão, auditoria e validação próprias.

Leitura financeira permitida no handoff:

| Campo/indicador derivado | Fonte primária | Uso permitido |
| --- | --- | --- |
| Origem financeira | Resumo mínimo, conferência operacional e itens relacionados | Determinar se pode encaminhar ao financeiro. |
| `financialOriginStatus` | Handoff/conferência | `not_applicable`, `clear`, `pending_review` ou `unknown`. |
| Cobrança existente | Billing/Encounter Financial | Link e alerta de duplicidade. |
| Comanda existente | CounterSales | Link e alerta de duplicidade. |
| Pendência `billing_origin` | Pendência estruturada futura | Bloquear financeiro até resolução ou justificativa. |

Fora desta decisão:

- criar integração automática handoff -> Billing;
- criar integração automática handoff -> CounterSales/comanda;
- criar integração automática handoff -> recebíveis/pagamentos;
- liberar `in_billing`;
- liberar `completed`;
- definir conciliação financeira, fiscal ou de caixa.

Exceção futura possível, mas fora da próxima fatia:

- fluxo direto ao financeiro pode ser discutido depois se não houver pendência clínica, documental, orientação ao tutor, prescrição, exame, retorno ou conferência de serviços;
- mesmo nesse caso, precisa permissão efetiva, auditoria, origem de cobrança clara e regra aprovada para evitar duplicidade;
- enquanto essa exceção não existir como regra formal, a recepção/finalização operacional continua sendo checkpoint obrigatório.

## 8. Exceções

| Exceção | Tratamento operacional candidato |
| --- | --- |
| Tutor desistiu antes da cobrança | Registrar motivo, responsável e pendências residuais. Não fechar como pago. |
| Tutor saiu sem pagar | Gerar pendência financeira com dono e origem rastreável. |
| Exame ficou pendente | Handoff deve indicar exame, prioridade, setor responsável e se bloqueia fechamento. |
| Receita não foi entregue | Pendência documental/orientação para recepção. |
| Orçamento aguardando aprovação | Status deve indicar aprovação pendente e responsável por contato. |
| Cobrança parcial | Caso pode ficar em pendência financeira conforme regra aprovada. |
| Retorno sem animal | Exige tipo de fluxo permitido e instrução clara para recepção. |
| Atendimento sem animal | Deve declarar se há `Encounter`, venda avulsa, orientação ou pendência administrativa. |
| Erro de envio para recepção | Deve permitir cancelamento ou correção com auditoria. |
| Caso precisa voltar para veterinário | Recepção deve devolver para clínica com motivo e responsável destino. |

## 9. Permissões

Permissões técnicas aprovadas em HOFF-028, alinhadas à governança neutra:

- esta SPEC não define autorização por cargo, profissão, setor nominal ou grupo nominal;
- os nomes "veterinário", "recepção", "financeiro", "caixa", "gestor" e "coordenação" são templates conversacionais para descrever o fluxo;
- a autorização real deve ser decidida pelo `/access-control`, usando usuário, grupo de acesso, setor organizacional, rotina, permissão e grants `Herdar`, `Conceder` ou `Negar`;
- a UI pode usar templates pré-configurados editáveis para facilitar implantação, mas não deve transformar o nome do template em `if` de permissão;
- endpoint, service e componente devem consultar permissão efetiva da rotina antes de liberar a ação.

| Ação operacional | Permissão técnica aprovada | Template operacional usual | Observação |
| --- | --- | --- | --- |
| Ler handoff | `clinical_handoff.read` | Clínica, recepção, financeiro, coordenação | Acesso depende de conta e permissão efetiva. |
| Criar/preparar handoff | `clinical_handoff.write` | Clínica | Deve exigir `Encounter` ativo e dados mínimos. |
| Enviar para recepção | `clinical_handoff.send` | Clínica/coordenação | Deve exigir resumo mínimo, destino e próximo dono operacional. |
| Receber/assumir handoff | `clinical_handoff.acknowledge` | Recepção/finalização operacional | Deve registrar `acknowledgedBy` e `acknowledgedAt`. |
| Registrar pendência | `clinical_handoff.mark_pending` | Finalização operacional, financeiro ou coordenação | Deve exigir tipo, motivo, dono e criticidade. |
| Resolver pendência | `clinical_handoff.resolve_pending` | Dono da pendência, finalização operacional ou coordenação | Deve exigir pendência ativa e resolução auditável. |
| Devolver para clínica | `clinical_handoff.return` | Finalização operacional, financeiro ou coordenação | Deve exigir motivo e próximo responsável/setor. |
| Enviar ao financeiro | `clinical_handoff.send_to_finance` | Finalização operacional ou coordenação | Encaminha contexto; não cria cobrança, comanda, baixa ou pagamento. |
| Fechar operacionalmente | `clinical_handoff.complete` | Finalização operacional, financeiro ou coordenação | Aprovada como permissão futura; não entra na próxima fatia de BUILD. |
| Cancelar handoff | `clinical_handoff.cancel` | Governança/coordenação operacional | Aprovada como permissão futura; não entra na próxima fatia de BUILD. |

Regras aprovadas:

- `deny` efetivo bloqueia a ação mesmo quando outro vínculo concede acesso;
- `inherit` não concede ação sozinho;
- ausência de permissão efetiva equivale a negar;
- filtros, setor responsável, dono operacional e template visual não concedem permissão;
- permissões de handoff não liberam rotinas relacionadas. Billing, CounterSales, prontuário, agenda, documentos, relatórios, auditoria global e financeiro continuam exigindo permissões próprias;
- `clinical_handoff.reopen` não fica aprovado para a próxima fatia. Se necessário, deve ter SPEC futura própria.

Perguntas que permanecem fora do HOFF-028:

- a confirmação de recebimento pode ser atribuída a setor/equipe ou precisa pessoa nominal?
- a correção de handoff enviado por outro usuário será governada por permissão própria ou pela mesma permissão de escrita?

## 10. Impacto em UX

Impactos futuros esperados:

- `Encounter` precisa de ação real `Enviar para recepção`, somente quando state machine e backend estiverem aprovados.
- `Queue` precisa visão `aguardando recepção/finalização`.
- Recepção precisa inbox operacional para casos devolvidos pela clínica.
- Header contextual deve mostrar próximo responsável e próximo setor.
- Pré-handoff visual atual é apenas preparação, não handoff real.
- Recepção deve enxergar instruções em linguagem operacional, não apenas texto clínico.
- Financeiro deve ver origem da cobrança e pendências antes de fechar.
- Casos com pendência devem aparecer filtráveis por setor, prioridade e atraso.

Direção de UI futura:

- CTA primária única por estado;
- ações financeiras como apoio quando o usuário estiver no cockpit clínico;
- pendências agrupadas por tipo e dono;
- confirmação de recebimento visível na recepção;
- histórico de envio, recebimento, devolução, cancelamento e fechamento.

Decisão HOFF-013/HOFF-016:

- a próxima fatia da inbox organiza `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`;
- filtros visuais aprovados: status/grupo, criticidade, tipo de pendência, responsável atual, prioridade, atraso, origem e busca operacional;
- campos mínimos por item: identidade, estado, contexto clínico-operacional, pendências, financeiro contextual e ações;
- estados vazios aprovados: carregando, sem handoffs ativos, sem resultado no filtro, sem pendência crítica, erro de carregamento e dados incompletos;
- estados sem permissão aprovados: sem leitura, leitura sem ação, sem ACK, sem devolução, sem ação financeira e sem acesso ao prontuário;
- a inbox não deve expor dados de rotinas sem permissão efetiva e não deve usar nome de setor/cargo/grupo como autorização;
- `completed`, `cancelled`, `in_billing`, SLA amplo e automação financeira continuam fora da próxima fatia.

Decisão HOFF-024:

- filtros de listagem aprovados: `handoffStatus`, `inboxGroup`, `criticality`, `pendingType`, `pendingStatus`, responsável atual, prioridade, origem, tutor, paciente, atendimento, Queue, busca, datas, atraso visual e origem financeira;
- filtros visuais da inbox mapeiam para query params explícitos da API, sem uso como autorização;
- listagem exige `clinical_handoff.read`, respeita `accountId`, rejeita parâmetros/valores inválidos e não produz side effects;
- ordenação padrão prioriza pendência crítica, atraso, prioridade, chegada mais antiga e atualização recente como desempate;
- limiares de atraso foram tratados em `HOFF-017`, sem liberar SLA amplo de inbox completa.

Decisão HOFF-017:

- SLA/alerta de atraso é camada derivada da listagem e da inbox, não novo `handoffStatus`;
- campos aprovados: `waitingSince`, `waitingMinutes`, `ageBucket`, `slaLabel`, `slaBreachedAt` e `slaReason`;
- buckets aprovados: `normal`, `attention` e `overdue`;
- limiares candidatos: aguardando ACK 15/30 min, em finalização 30/60 min, pendência crítica 30/60 min, pendência não crítica 120/240 min, devolvido 60/120 min e enviado ao financeiro 60/120 min;
- limiares devem ser configuráveis futuramente e não hardcoded por setor/cargo/grupo;
- atraso não concede permissão, não bloqueia sozinho e não dispara envio, devolução, cobrança, comanda, conclusão ou cancelamento automático;
- `completed`, `cancelled`, `in_billing`, automação financeira e inbox completa continuam fora da próxima fatia.

Decisão HOFF-018:

- `completed` é encerramento operacional do handoff, não fechamento clínico, financeiro, de Queue ou de prontuário;
- estados candidatos de origem futura: `acknowledged_by_reception`, `waiting_pending_resolution` e `sent_to_finance`;
- conclusão exige ACK, conferência operacional, permissão efetiva `clinical_handoff.complete`, ausência de pendência crítica aberta e auditoria;
- pendência não crítica só pode permanecer com dono, justificativa e marcação de não bloqueante;
- origem financeira precisa estar rastreável como sem ação necessária, enviada/assumida pelo financeiro ou resolvida em rotina financeira própria;
- conclusão não cria cobrança, comanda, baixa, pagamento, nota, exame, prescrição, documento ou edição clínica;
- `completed` deve sair da inbox ativa e permanecer em histórico/auditoria quando houver BUILD futuro autorizado;
- cancelamento permanece fora desta decisão.

Decisão HOFF-019:

- validação operacional deve cobrir envio clínico, ACK, conferência da recepção, pendência, devolução clínica, envio ao financeiro, SLA/atraso, conclusão futura e governança de acesso;
- cada cenário deve registrar resultado, evidência, papel executor, tela/rota, bloqueio, prioridade e decisão pendente quando houver;
- falhas P0/P1 bloqueiam BUILD;
- checklist não substitui testes técnicos futuros, mas define o aceite operacional mínimo para escolher a próxima fatia;
- nenhuma validação pode depender de permissão hardcoded por nome de setor, cargo, profissão ou grupo.

Decisão HOFF-033:

- validação UX por papel deve ocorrer antes de qualquer BUILD da próxima fatia;
- papéis como clínica, recepção, financeiro e coordenação são templates operacionais para organizar o walkthrough, não autorização fixa;
- cenário clínico valida preparo/envio, retorno da recepção, resposta ao motivo e reenvio, sem forçar a clínica a executar cobrança;
- cenário recepção/finalização valida ACK, leitura de resumo, marcação/resolução de pendência, devolução clínica e envio ao financeiro, sem editar prontuário e sem criar cobrança/comanda automática;
- cenário financeiro/caixa valida recebimento de contexto em `sent_to_finance`, abertura manual das rotinas financeiras próprias quando houver permissão e bloqueio de duplicidade/origem ausente;
- cenário coordenação valida visão de gargalos, atraso, pendências, devoluções, estados sem permissão e trilha auditável, sem side effect operacional;
- cada cenário deve cobrir caminho feliz, sem permissão, dados incompletos, estado vazio, erro de carregamento e CTA primária esperada por estado;
- resultado permitido: `Aprovado`, `Bloqueado`, `Ajustar` ou `Não se aplica`, com evidência, rota/tela, permissão efetiva esperada e risco.

Decisão HOFF-020:

- `ClinicalHandoff` continua entidade própria e fonte do `handoffStatus`;
- `Encounter`, `Queue`, Billing e eventos não substituem a entidade;
- schema futuro deve evoluir em três camadas: `clinical_handoffs`, `clinical_handoff_pendings` e `clinical_handoff_events`;
- a migration atual `0045_clinical_handoffs` permanece como HOFF-MIN-1 e não deve ser tratada como schema completo;
- pendências críticas precisam ser estruturadas por tipo, dono, criticidade, status, motivo e resolução;
- eventos auditáveis são append-only e não carregam prontuário completo, receita completa, laudo completo, valor sensível ou PII desnecessária;
- migration futura precisa preservar RLS por `accountId`, idempotência, hidratação após restart e bloqueio cross-account;
- HOFF-020 não libera migration, endpoint novo, automação financeira, conclusão, cancelamento ou inbox completa.

## 11. Impacto técnico futuro

### 11.1 Frontend

- Tela de `Encounter` deve acionar envio real apenas após aprovação.
- Recepção deve ter inbox ou visão filtrada de handoffs recebidos.
- `Queue` e `Encounter` podem exibir leitura derivada do handoff, sem assumir `handoffStatus`.
- Header contextual deve refletir setor/responsável atual e próximo passo.
- Testes de UI devem cobrir não criação automática de cobrança/comanda.

Decisão HOFF-034:

- smoke visual é validação de evidência, não autorização de BUILD;
- aplica-se somente a superfícies existentes ou à PR futura explicitamente autorizada;
- deve cobrir inbox/recepção, Encounter e Queue em desktop e mobile quando a superfície estiver disponível;
- cada evidência deve registrar rota, viewport, estado visual, permissão efetiva, dado controlado, captura ou descrição objetiva e resultado;
- checks obrigatórios: tela não vazia, sem overflow horizontal, sem sobreposição, texto legível, CTA primária visível, estados vazios/erro/sem permissão estáveis e foco/teclado básico preservado;
- inbox deve mostrar filtros, linhas/itens, status, pendências, atraso e ações permitidas sem expor dados proibidos;
- Encounter deve mostrar contexto e timeline/resumo de handoff sem mover `handoffStatus` para Encounter;
- Queue deve mostrar badge/overlay/link derivado quando aplicável, sem alterar status persistido nem acionar handoff por inferência;
- smoke visual não cria cobrança, comanda, pagamento, baixa, prontuário, documento, exame, prescrição, evento ou transição.

### 11.2 Backend

- Manter serviço/recurso de handoff separado de `Encounter` e `Queue`, com vínculos explícitos.
- Validar transições permitidas.
- Garantir tenant/account isolation.
- Persistir auditoria de envio, recebimento, devolução, cancelamento e fechamento.

### 11.3 Schema

- Manter entidade própria de handoff aprovada em HOFF-020.
- Modelar pendências estruturadas com tipo, dono, status, origem e timestamps.
- Modelar vínculo com billing, quotes, prescriptions e diagnostics.
- Preservar histórico sem sobrescrever eventos anteriores.

### 11.4 API

- Definir contratos para criar/enviar handoff, confirmar recebimento, devolver para clínica, cancelar e fechar operacionalmente.
- Definir erros de validação para resumo ausente, pendência sem dono, estado inválido e permissão insuficiente.
- Não reutilizar endpoint de `close` como substituto de handoff.

Decisão HOFF-031:

- testes de API devem cobrir a superfície mínima atual: `GET /clinical-handoffs`, `GET /clinical-handoffs/:id`, `POST /clinical-handoffs/send-to-reception` e `POST /clinical-handoffs/:id/acknowledge`;
- testes futuros devem cobrir endpoints candidatos da próxima fatia: `mark-pending`, `resolve-pending`, `return-to-clinic`, `send-to-finance` e reenvio para recepção;
- cada rota deve validar autenticação, permissão efetiva, `accountId`, payload, status HTTP, formato de erro, auditoria e ausência de side effects proibidos;
- a suíte deve proteger a transição de permissões atuais ligadas a `encounters.*` para permissões técnicas `clinical_handoff.*`, sem hardcode por setor/cargo/grupo;
- erros 401/403/404 devem evitar vazamento cross-account;
- testes de API não substituem unitários de service (`HOFF-030`) nem matriz exaustiva de state machine (`HOFF-032`).

Decisão HOFF-032:

- transições válidas da próxima fatia: `sent_to_reception -> acknowledged_by_reception`, `acknowledged_by_reception -> waiting_pending_resolution`, `waiting_pending_resolution -> acknowledged_by_reception`, `acknowledged_by_reception -> returned_to_clinic`, `waiting_pending_resolution -> returned_to_clinic`, `returned_to_clinic -> sent_to_reception`, `acknowledged_by_reception -> sent_to_finance` e `waiting_pending_resolution -> sent_to_finance`;
- transições bloqueadas nesta fatia: financeiro sem ACK, devolução sem ACK, qualquer transição para `completed`, `cancelled`, `in_billing` ou `reopen`, e fluxo completo `draft/ready_to_send`;
- cada transição válida deve exigir conta, estado atual, permissão efetiva, payload obrigatório, evento auditável e ausência de side effects proibidos;
- cada transição inválida deve retornar erro de estado/conflito sem alterar `ClinicalHandoff`, pendências, eventos, Billing, CounterSales, Queue ou Encounter;
- critérios futuros de `completed` permanecem aprovados conceitualmente em HOFF-018, mas não entram na próxima matriz de BUILD.

### 11.5 Testes

Decisão HOFF-030:

- unitários devem nascer no service/state machine antes de qualquer implementação da próxima fatia;
- manter regressões do `HOFF-MIN-1`: envio para recepção, ACK único, resumo/instrução obrigatórios, bloqueio de duplicidade, bloqueio de `Encounter` fechado, isolamento por conta, hidratação e rollback em falha de repository;
- cobrir ações pós-ACK aprovadas: `mark-pending`, `resolve-pending`, `return-to-clinic`, reenvio para recepção e `send-to-finance`;
- cobrir bloqueios: transição fora de estado, pendência sem dono/motivo/tipo, pendência crítica aberta, origem financeira ausente, risco de duplicidade financeira, devolução sem destino e ACK duplicado;
- cobrir invariantes de segurança operacional: não fechar `Encounter`, não mover `Queue`, não criar Billing, CounterSales, comanda, cobrança, pagamento, baixa, exame, prescrição, documento ou prontuário;
- cobrir eventos como expectativa unitária de append-only quando a ação for aceita, sem carregar conteúdo clínico/financeiro sensível;
- permissões podem ser testadas no service via dependência fake quando houver guard de autorização no domínio. Rotas HTTP e erros 401/403 ficam para `HOFF-031`;
- matriz exaustiva de transições válidas/inválidas fica para `HOFF-032`, usando os casos unitários definidos aqui como base.

### 11.6 Auditoria/eventos

Eventos aprovados para a próxima fatia:

- `clinical_handoff.sent_to_reception`;
- `clinical_handoff.acknowledged`;
- `clinical_handoff.pending_marked`;
- `clinical_handoff.pending_resolved`;
- `clinical_handoff.returned_to_clinic`;
- `clinical_handoff.sent_to_finance`.

Regras aprovadas:

- cada evento deve registrar ator, conta, handoff, atendimento, estado anterior, novo estado e data/hora;
- eventos de pendência devem apontar `pendingId`;
- eventos de devolução devem registrar motivo e destino clínico;
- evento de envio ao financeiro deve registrar conferência operacional e origem financeira rastreável;
- eventos não substituem `ClinicalHandoff`, pendências estruturadas, Billing ou CounterSales;
- eventos não devem armazenar prontuário completo, documento completo, cobrança completa ou dados pessoais desnecessários.

Decisão HOFF-035:

- validação de auditoria deve confirmar um evento para cada ação mutável aceita da próxima fatia;
- ações recusadas por permissão, estado inválido, payload inválido, cross-account ou conflito não geram evento operacional de handoff;
- toda trilha deve permitir reconstruir quem fez, quando fez, com qual permissão efetiva, de qual estado para qual estado, por qual motivo e em qual conta;
- eventos devem ser append-only, ordenáveis por `occurredAt` e correlacionáveis por `requestId` ou `idempotencyKey` quando houver retry;
- `payloadSummary` deve conter apenas resumo mínimo e identificadores necessários, nunca prontuário completo, receita completa, laudo completo, valor sensível, cobrança completa ou PII desnecessária;
- timeline de Encounter e leitura de Queue podem consumir resumo dos eventos, mas não substituem a tabela/event stream de auditoria;
- falha em persistir evento no mesmo boundary transacional futuro deve rejeitar a transição, salvo mecanismo explícito de retry/compensação aprovado antes de BUILD;
- validação deve cobrir eventos existentes do `HOFF-MIN-1` e eventos futuros: envio, ACK, pendência marcada, pendência resolvida, devolução clínica e envio ao financeiro.

### 11.7 Migração

Decisão HOFF-029:

- qualquer migration real continua dependendo de autorização explícita de BUILD;
- a `0045_clinical_handoffs` permanece como baseline mínimo e não deve ser reescrita;
- a próxima migration futura deve ser aditiva e compatível com o código atual, ampliando `clinical_handoffs` sem quebrar envio/ACK existentes;
- constraints de status e rota devem ser trocadas de forma controlada para aceitar `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance`, sem autorizar `completed`, `cancelled`, `in_billing` ou `reopen`;
- `clinical_handoff_pendings` e `clinical_handoff_events` devem nascer como tabelas próprias, com `accountId`, RLS, índices e vínculos explícitos;
- backfill dos handoffs atuais deve preservar registros existentes, sem inventar pendências, eventos clínicos completos, cobrança, comanda ou conclusão;
- campos novos devem começar nullable/default seguro e só virar obrigatórios depois que service/API/UI escreverem o dado de forma consistente;
- rollback deve ser planejado antes do BUILD, com caminho para desativar a fatia sem perda de `HOFF-MIN-1`.

### 11.8 Rollback e mitigação - HOFF-036

HOFF-036 aprova o plano de reversão operacional da próxima fatia. Ele não autoriza BUILD, migration ou feature flag real agora.

Objetivo:

- permitir interromper a expansão de handoff sem perder envio/ACK atuais do `HOFF-MIN-1`;
- preservar leitura dos handoffs já existentes;
- impedir que erro em pendência, devolução, envio financeiro, eventos ou UI paralise recepção;
- manter Billing, CounterSales, Queue, Encounter e prontuário sem side effects automáticos.

Plano de rollback futuro:

| Área | Mitigação exigida antes de BUILD |
| --- | --- |
| UI/inbox | Chave operacional para ocultar ações novas e manter inbox mínima com listagem, detalhe e ACK. |
| API | Endpoints novos devem poder ser desativados sem afetar `GET`, envio mínimo e ACK atuais. |
| State machine | Estados novos devem ter tratamento de leitura segura mesmo se ações novas forem desabilitadas. |
| Migration | Alterações devem ser aditivas; rollback operacional não pode exigir apagar dados de handoff. |
| Eventos | Falha de evento deve rejeitar transição futura ou entrar em estratégia explícita de compensação aprovada. |
| Permissões | Grants novos devem poder ficar sem efeito sem bloquear permissões atuais de compatibilidade. |
| Queue/Encounter | Overlays e timelines devem poder ser removidos sem mudar status persistido. |

Critérios de bloqueio:

- rollback exige apagar ou reescrever `0045_clinical_handoffs`;
- desativar a fatia quebra envio para recepção ou ACK atual;
- estados novos ficam invisíveis ou irrecuperáveis para operação;
- eventos ficam parcialmente gravados sem trilha de reconciliação;
- ação nova cria cobrança, comanda, pagamento, baixa, prontuário, documento, exame ou prescrição;
- permissão nova bloqueia acesso mínimo existente sem rota de compatibilidade.

Saída aprovada:

- se a próxima fatia falhar, o sistema deve voltar ao comportamento mínimo atual: envio para recepção, listagem/detalhe, ACK e timeline/auditoria mínima;
- dados novos eventualmente gravados permanecem auditáveis e não devem ser apagados como primeira resposta;
- qualquer correção de dados deve ser procedimento explícito, rastreável e aprovado.

### 11.9 Validação com operação - HOFF-037

HOFF-037 encerra a fase de planejamento pré-BUILD da próxima fatia de handoff/inbox.

Aceite operacional aprovado:

- operação validou o recorte como fluxo, não como regra fixa de setor/cargo/grupo;
- escopo da próxima fatia permanece limitado a pendência, resolução, devolução clínica, reenvio e envio ao financeiro explícito;
- recepção/finalização continua como checkpoint padrão antes do financeiro;
- escrita clínica, Billing, CounterSales, pagamentos, documentos, exames e prescrições continuam em rotinas próprias com permissões próprias;
- não há autorização para `completed`, `cancelled`, `in_billing`, `reopen`, automação financeira, inbox completa ou fluxo completo de rascunho;
- rollback, auditoria, permissões, API, state machine, UX por papel e smoke visual foram definidos em nível suficiente para uma decisão de BUILD futuro;
- qualquer BUILD ainda exige autorização explícita do responsável, escopo pequeno, implementação reversível e verificação real.

Resultado final da fase:

- `HOFF-001` a `HOFF-037` ficam fechados para planejamento;
- não criar `HOFF-038` sem nova decisão explícita;
- próximos caminhos possíveis são: autorizar BUILD da primeira fatia pequena, pausar a frente ou reabrir item específico por bloqueio real identificado.

## 12. Fora de escopo

- Implementar agora.
- Definir schema final.
- Definir API final.
- Criar migration.
- Alterar rotas.
- Mudar financeiro.
- Unificar billing e counter-sales.
- Automatizar cobrança.
- Criar comanda automaticamente.
- Criar orçamento automaticamente.
- Criar prescrições automaticamente.
- Criar exames automaticamente.
- Criar bloqueio clínico final sem regra aprovada.
- Substituir o PRD da recepção ou do veterinário.

## 13. Critérios de aceite da SPEC

A SPEC estará pronta quando:

- estados forem aprovados;
- payload mínimo for validado;
- permissões técnicas forem validadas contra a matriz configurável de acesso;
- regras de transição forem aceitas;
- UX de recepção e veterinário for validada;
- riscos financeiros forem separados;
- exceções críticas tiverem tratamento definido;
- eventos de auditoria forem aprovados;
- fronteira entre finalização clínica e fechamento operacional estiver clara;
- próximos documentos técnicos estiverem priorizados.

## 14. Próximos documentos recomendados

- `892-state-machine-handoff-operacional.md`
- `893-prd-inbox-recepcao-finalizacao.md`
- `894-spec-api-handoff-clinico.md`
- `895-backlog-handoff-clinico.md`

## 15. Guardrail final

Este documento não autoriza BUILD.

Agentes não devem alterar código, backend, rotas, schema, migration, Queue, Encounter, Billing ou financeiro com base apenas nesta SPEC.

Qualquer implementação futura exige:

- aprovação da state machine;
- aprovação do payload mínimo;
- aprovação das permissões técnicas na governança de acesso;
- aprovação de UX por recepção e veterinário;
- SPEC técnica/API aprovada;
- autorização explícita do responsável.
