# 893 - PRD Inbox da Recepção para Finalização

Data: 2026-04-29
Status: rascunho para validação
Origem: `docs/887-prd-jornada-recepcao.md`, `docs/888-prd-jornada-veterinario-clinico.md`, `docs/891-spec-handoff-clinico-recepcao.md`, `docs/892-state-machine-handoff-operacional.md`

## 0. Status

- Rascunho para validação.
- Não autoriza implementação.
- Depende da aprovação do 891 e 892.
- Não define schema final, contrato de API, rota, componente ou UI final.
- Qualquer BUILD futuro depende de SPEC técnica aprovada e autorização explícita do responsável.
- Alinhado em 2026-05-01 à governança neutra de acesso: a inbox organiza trabalho operacional, mas não decide autorização por nome de setor, cargo, grupo ou profissão.
- `HOFF-001` e `HOFF-002` fechados em 2026-05-01: a inbox mínima atual pertence ao `HOFF-MIN-1`; a inbox completa depende de decisões futuras de entidade/transição.
- `HOFF-003` fechado em 2026-05-01: a inbox deve operar sobre `ClinicalHandoff` como entidade própria.
- `HOFF-004` fechado em 2026-05-01: recepção/finalização operacional é checkpoint padrão antes de financeiro.
- `HOFF-005` e `HOFF-006` fechados em 2026-05-01: próxima fatia da inbox cobre pendência, devolução clínica e envio financeiro explícito após ACK.
- `HOFF-008` e `HOFF-009` fechados em 2026-05-01: a inbox deve bloquear avanço quando houver pendência crítica aberta.
- `HOFF-011` e `HOFF-012` fechados em 2026-05-01: jornada da recepção/finalização e jornada do financeiro foram detalhadas sem liberar automação financeira, conclusão operacional ou inbox completa.
- `HOFF-023` fechado em 2026-05-01: o campo "Último evento" deve usar eventos auditáveis aprovados, sem substituir a entidade ativa ou pendências estruturadas.
- `HOFF-013` e `HOFF-016` fechados em 2026-05-01: inbox da próxima fatia, filtros, campos, estados vazios e estados sem permissão foram definidos sem liberar `completed`, `cancelled`, `in_billing`, SLA amplo ou automação financeira.
- `HOFF-014` e `HOFF-015` fechados em 2026-05-01: resumo mínimo e devolução clínica foram definidos para orientar o que a inbox deve exigir, bloquear e mostrar no reenvio.
- `HOFF-024` fechado em 2026-05-01: filtros visuais da inbox foram mapeados para filtros de API/listagem, com paginação, ordenação, validações e sem usar filtros como autorização.
- `HOFF-017` fechado em 2026-05-02: SLA/alerta de atraso definido como camada operacional derivada, com limiares candidatos por grupo de inbox e sem gerar transição automática.
- `HOFF-018` fechado em 2026-05-02: critérios de finalização operacional futura definidos para `completed`, sem liberar conclusão na próxima fatia nem automação financeira.
- `HOFF-019` fechado em 2026-05-02: checklist operacional definido para validar a inbox/handoff por papel, transição, bloqueio, permissão e evidência antes de BUILD.
- `HOFF-020` fechado em 2026-05-02: inbox futura deve ler `ClinicalHandoff` como entidade base, pendências estruturadas e eventos auditáveis, sem inferir estado por tela ou módulo relacionado.
- `HOFF-025` fechado em 2026-05-02: Queue pode mostrar contexto derivado do handoff, mas a inbox continua baseada em `ClinicalHandoff` e não em status visual da Queue.
- `HOFF-026` fechado em 2026-05-02: Encounter é contexto e navegação da inbox, mas não fonte da listagem, do `handoffStatus` ou da finalização operacional.
- `HOFF-027` fechado em 2026-05-02: Billing/CounterSales aparecem na inbox como contexto, links e alertas de duplicidade, sem criação ou movimentação financeira automática.
- `HOFF-028` fechado em 2026-05-02: estados e ações da inbox devem usar permissões técnicas efetivas de `clinical_handoff.*` e permissões próprias das rotinas relacionadas.
- `HOFF-029` fechado em 2026-05-02: origem de dados futura da inbox aprovada para migration aditiva em `clinical_handoffs`, `clinical_handoff_pendings` e `clinical_handoff_events`, sem construir a inbox completa agora.
- `HOFF-030` fechado em 2026-05-02: plano unitário de service/state machine aprovado para garantir que a inbox futura só reflita estados persistidos e ações aceitas pelo domínio.
- `HOFF-031` fechado em 2026-05-02: plano de testes de API aprovado para garantir que ações da inbox chamem endpoints protegidos, com erros previsíveis e sem automação financeira.
- `HOFF-032` fechado em 2026-05-02: matriz de transições aprovada para limitar ações da inbox a estados permitidos e bloquear ações indevidas por estado.
- `HOFF-033` fechado em 2026-05-02: validação UX por papel aprovada para testar a inbox e o pós-atendimento com clínica, recepção, financeiro e coordenação antes de BUILD.
- `HOFF-034` fechado em 2026-05-02: smoke visual aprovado para validar inbox, Encounter e Queue em desktop/mobile quando aplicável, antes de BUILD.
- `HOFF-035` fechado em 2026-05-02: auditoria/eventos aprovados para validar que cada ação mutável da inbox gera trilha mínima, privada e append-only.
- `HOFF-036` fechado em 2026-05-02: rollback/mitigação aprovados para permitir retorno à inbox mínima sem perder handoffs enviados/recebidos.
- `HOFF-037` fechado em 2026-05-02: validação com operação aprovada; fase de planejamento pré-BUILD da inbox/handoff encerrada.

## 1. Objetivo

A Inbox da Recepção para Finalização é a visão operacional para receber casos devolvidos da clínica via handoff, conferir pendências e conduzir finalização, cobrança, entrega de orientações e encerramento operacional.

Ela deve permitir que a recepção entenda rapidamente o que chegou da clínica, o que precisa ser feito, quem é responsável agora e qual próximo passo move a jornada.

O objetivo deste PRD é definir o comportamento de produto candidato da inbox, sem autorizar implementação.

Fronteira aprovada:

- inbox mínima atual: lista handoffs enviados à recepção, separa aguardando ACK e recebidos, permite ACK e atalhos para entidades relacionadas;
- próxima fatia da inbox: adiciona pendência com dono, resolver pendência, devolução clínica, reenvio para recepção e encaminhamento explícito ao financeiro;
- inbox completa futura: adiciona conclusão/cancelamento, SLA amplo, decisão do tutor, integração profunda com Billing/CounterSales e fechamento operacional;
- a inbox completa deve partir de `ClinicalHandoff` como recurso próprio e manter recepção/finalização como checkpoint antes de financeiro.

## 2. Problema

Hoje a recepção não tem fila própria formal de `aguardando finalização`.

Casos finalizados clinicamente aparecem por inferência visual, navegação manual ou leitura de módulos relacionados. Isso cria risco operacional porque:

- pendências clínicas, financeiras e documentais não têm dono claro;
- a recepção pode não saber se precisa orientar, cobrar, entregar receita, agendar retorno, aguardar exame ou devolver à clínica;
- tutor pode sair sem orientação, cobrança, receita ou documento;
- financeiro pode cobrar sem origem clara ou deixar saldo aberto;
- veterinário pode considerar a parte clínica concluída, mas o caso ainda não estar operacionalmente fechado;
- o handoff visual atual não cria retorno operacional real, não muda estado persistido, não confirma recebimento e não gera trilha auditável.

## 3. Templates operacionais de conversa

Os nomes abaixo são templates conversacionais para descrever necessidades do fluxo.

Eles podem inspirar grupos pré-configurados editáveis, mas não concedem permissão sozinhos. A autorização real deve vir do `/access-control`, com usuário, grupo de acesso, setor organizacional, rotina, permissão e grants `Herdar`, `Conceder` ou `Negar`.

| Papel | Necessidade principal |
| --- | --- |
| Recepcionista | Receber casos da clínica, orientar tutor, conferir pendências e encaminhar próximos passos. |
| Caixa/financeiro | Cobrar com origem clara, registrar pagamento, tratar pendência financeira e devolver quando faltar contexto. |
| Veterinário | Enviar caso com resumo e receber devolução quando houver pendência clínica ou informação insuficiente. |
| Coordenação | Auditar gargalos, casos parados, devoluções, cancelamentos e tempo até finalização. |

## 4. Escopo funcional candidato

A inbox deve permitir:

- listar casos enviados pela clínica;
- filtrar por status;
- ver tutor/paciente;
- ver veterinário/origem;
- ver motivo/queixa;
- ver resumo clínico;
- ver pendências;
- ver prescrições/receitas;
- ver exames solicitados/pendentes;
- ver orçamento/cobrança;
- assumir item;
- encaminhar para financeiro;
- devolver para clínica;
- marcar pendência;
- resolver pendência;
- marcar finalizado operacionalmente.

Regras de interpretação:

- a inbox não substitui prontuário, Billing, CounterSales, exames ou prescrições;
- a inbox organiza o trabalho da recepção a partir do handoff;
- a inbox deve mostrar links e contexto suficientes para agir sem transformar a recepção em módulo clínico;
- nenhuma ação deve criar cobrança, comanda, exame, prescrição ou orçamento automaticamente.

## 5. Fora de escopo

- Implementar agora.
- Criar API final.
- Criar schema.
- Criar rota.
- Criar componente.
- Calcular cobrança.
- Criar comanda automaticamente.
- Criar cobrança automaticamente.
- Substituir Billing.
- Substituir CounterSales.
- Definir regra fiscal.
- Resolver todos os fluxos especializados.
- Alterar state machine sem aprovação do 892.

## 6. Jornada alvo da recepção

1. Recepção abre Inbox de Finalização.
2. Vê casos prontos para recepção.
3. Assume ou confirma recebimento.
4. Confere resumo clínico.
5. Confere receitas, exames, orientações e pendências.
6. Encaminha cobrança ou orçamento quando necessário, após conferência operacional.
7. Recebe confirmação financeira.
8. Finaliza operacionalmente ou devolve para clínica.

Variações gerais, com escopo imediato limitado pelas decisões HOFF:

- se houver pendência clínica, recepção devolve para clínica com motivo;
- se houver decisão do tutor pendente, `waiting_owner_decision` fica como variação futura fora desta fatia;
- se houver cobrança pendente, recepção/finalização operacional encaminha para financeiro após conferir serviços, documentos, orientações e pendências;
- se houver exame pendente, recepção acompanha ou encaminha conforme regra aprovada;
- se não houver pendência crítica, recepção pode encaminhar ao financeiro ou preparar fechamento futuro conforme regra aprovada; `completed` continua fora desta fatia.

## 6.1 Jornada aprovada da recepção/finalização - HOFF-011

Esta jornada descreve o trabalho operacional após o handoff chegar à recepção. Ela não concede permissão por nome de setor e não autoriza criação automática de cobrança, comanda, prescrição, exame, orçamento ou baixa.

Entrada da jornada:

- handoff em `sent_to_reception`;
- usuário autenticado com permissão efetiva para ler e, quando executar, assumir ou alterar handoff;
- `accountId` compatível entre usuário, handoff e entidades relacionadas.

Passo a passo aprovado:

1. Recepção abre a inbox mínima ou futura visão de finalização.
2. Filtra casos ativos por `sent_to_reception`, prioridade, atraso, tutor/paciente ou responsável.
3. Confirma recebimento, gerando `acknowledged_by_reception`, `acknowledgedBy` e `acknowledgedAt`.
4. Confere resumo clínico-operacional e instruções para recepção.
5. Confere tutor, paciente, atendimento, origem, documentos, prescrições, exames, retornos, serviços realizados e pendências.
6. Classifica cada bloqueio como pendência estruturada, com tipo, motivo, dono e criticidade.
7. Quando a pendência é crítica, mantém o caso em `waiting_pending_resolution` ou devolve para clínica se a resolução exigir complemento assistencial.
8. Quando a pendência não é crítica, registra dono e justificativa auditável antes de permitir avanço.
9. Quando a conferência operacional está suficiente e há origem financeira rastreável, encaminha explicitamente para financeiro com `sent_to_finance`.

Checklist mínimo da recepção/finalização:

| Item | Resultado esperado |
| --- | --- |
| Identificação | Tutor, paciente e atendimento conferidos. |
| Resumo | Resumo clínico-operacional compreensível sem leitura integral do prontuário. |
| Orientação | Orientações ao tutor, retorno, medicação, restrições ou próximos passos conferidos. |
| Documentos | Receita, relatório, termo, laudo ou assinatura pendente identificados. |
| Diagnóstico/exames | Exames pendentes, resultados ou laudos com dono e impacto operacional. |
| Serviços/itens | Origem financeira rastreável ou pendência `billing_origin` registrada. |
| Pendências | Toda pendência tem tipo, motivo, dono e criticidade. |
| Próximo passo | Devolver à clínica, manter pendência, encaminhar ao financeiro ou acompanhar. |

Ações permitidas conceitualmente nesta jornada:

- ACK/assumir;
- marcar pendência;
- resolver ou justificar pendência;
- devolver à clínica com motivo e destino;
- reenviar para recepção após complemento;
- encaminhar ao financeiro sem criar cobrança automaticamente.

Ações fora desta jornada:

- editar prontuário pela inbox;
- lançar cobrança ou comanda automaticamente;
- concluir handoff como `completed`;
- cancelar handoff;
- iniciar `in_billing` como estado do handoff;
- substituir Billing, CounterSales, exames, prescrições ou agenda.

## 6.2 Jornada aprovada do financeiro - HOFF-012

Esta jornada começa somente depois da conferência operacional da recepção/finalização. O financeiro recebe um caso encaminhado, não uma cobrança criada automaticamente.

Entrada da jornada:

- handoff em `sent_to_finance`;
- ACK prévio da recepção/finalização;
- conferência operacional registrada;
- origem financeira rastreável;
- nenhuma pendência crítica aberta;
- permissão efetiva para ler handoff e operar a rotina financeira aplicável.

Passo a passo aprovado:

1. Financeiro abre a visão, filtro ou fila de casos encaminhados ao financeiro.
2. Confere tutor, paciente, atendimento, origem financeira, observações e pendências não críticas.
3. Abre a rotina financeira correta por link/contexto, como Billing ou CounterSales, quando tiver permissão.
4. Executa cobrança, ajuste, negociação ou conferência manual dentro da rotina financeira própria.
5. Se faltar origem financeira, registra pendência `billing_origin` ou devolve para finalização operacional, sem criar item automaticamente.
6. Se houver divergência clínica/documental, devolve para a finalização operacional ou clínica conforme o tipo da pendência.
7. Mantém rastreabilidade entre handoff e rotina financeira sem transformar o handoff em módulo de cobrança.

Regras para evitar automação indevida:

- `sent_to_finance` não cria `billing_record`, item de billing, comanda, pagamento, baixa, parcela ou nota.
- O financeiro não deve receber caso por caminho direto clínica -> financeiro nesta fase.
- Financeiro não conclui handoff como `completed` nesta fatia.
- Qualquer cobrança real deve acontecer nas rotinas financeiras existentes, com permissão própria.
- Se a cobrança já existir, o handoff deve apontar contexto/origem e evitar duplicidade.
- Se a origem financeira não for rastreável, o caso volta para pendência, não para cobrança forçada.

Saídas conceituais da jornada financeira nesta fase:

| Situação | Saída operacional |
| --- | --- |
| Origem clara e sem pendência crítica | Operar cobrança manualmente na rotina financeira adequada. |
| Origem financeira insuficiente | Marcar `billing_origin` e manter/devolver para resolução. |
| Divergência de serviço realizado | Pendência crítica até origem ficar rastreável. |
| Pendência clínica/documental descoberta | Devolver para finalização/clínica com motivo. |
| Pagamento parcial ou negociação | Registrar na rotina financeira própria; handoff apenas referencia contexto futuro. |

## 7. Estados visíveis na inbox - HOFF-013

Estados aprovados para a próxima fatia da inbox:

| Estado | Grupo visual | Leitura para recepção | CTA primária candidata |
| --- | --- | --- | --- |
| `sent_to_reception` | Aguardando recebimento | Caso enviado pela clínica e aguardando confirmação da recepção. | Assumir |
| `acknowledged_by_reception` | Em finalização | Recepção assumiu e precisa conferir contexto, pendências e próximo passo. | Conferir |
| `waiting_pending_resolution` | Pendências | Há pendência com dono bloqueando ou orientando o próximo passo. | Resolver pendência |
| `returned_to_clinic` | Devolvidos | Caso devolvido à clínica; aparece para acompanhamento, não como item principal de finalização. | Acompanhar |
| `sent_to_finance` | Enviado ao financeiro | Caso encaminhado ao financeiro, sem cobrança automática criada pelo handoff. | Acompanhar financeiro |

Estados fora da próxima fatia:

| Estado | Tratamento |
| --- | --- |
| `draft` | Pertence ao preparo clínico futuro; não entra como item de recepção. |
| `ready_to_send` | Aceito tecnicamente, mas fluxo completo de ready/preparo ainda depende de HOFF-010/HOFF-014. |
| `waiting_owner_decision` | Adiado; decisão do tutor fica fora da próxima fatia da inbox. |
| `in_billing` | Adiado; cobrança em andamento continua nas rotinas financeiras próprias. |
| `completed` | Critérios aprovados em HOFF-018; continua sem BUILD nesta fatia. |
| `cancelled` | Adiado; cancelamento depende de regra própria, motivo, reversão e auditoria. |

Estados como `draft` e `ready_to_send` pertencem ao preparo clínico e normalmente não devem ser itens principais da inbox de recepção, salvo visão de coordenação.

## 7.1 Filtros e agrupamentos aprovados - HOFF-013

A inbox da próxima fatia deve ser operacional e densa. Filtros visuais aprovados:

| Filtro | Opções candidatas | Observação |
| --- | --- | --- |
| Status/grupo | Aguardando recebimento, Em finalização, Pendências, Devolvidos, Enviado ao financeiro | Mapeia `handoffStatus`; não libera API final. |
| Criticidade | Todas, Críticas, Não críticas | Usa pendências estruturadas. |
| Tipo de pendência | Clínica, Documentação, Origem financeira, Orientação ao tutor, Diagnóstico, Dono operacional, Rastreabilidade | Usa tipos de HOFF-009. |
| Responsável atual | Pessoa, equipe ou setor | Roteamento operacional, não autorização. |
| Prioridade | Alta, Média, Baixa | Deve ser legível sem depender só de cor. |
| Atraso | Sem atraso, Em atenção, Atrasado | SLA/alerta detalhado em HOFF-017; continua sem SLA amplo de inbox completa. |
| Origem | Agenda, recepção, retorno, emergência, outro | Origem operacional do handoff. |
| Busca | Tutor, paciente, atendimento, handoff | Busca operacional; não deve expor dados fora de permissão. |

Agrupamentos aprovados:

- agrupamento primário por status/grupo;
- ordenação padrão por criticidade, atraso, prioridade e chegada;
- pendências críticas aparecem antes de ações financeiras;
- itens devolvidos e enviados ao financeiro ficam em acompanhamento, sem competir com trabalho ativo principal.

Detalhamento HOFF-024 aprovado:

| Filtro visual | Query/API candidata |
| --- | --- |
| Status/grupo | `inboxGroup` ou `handoffStatus` |
| Criticidade | `criticality` |
| Tipo de pendência | `pendingType` e, quando necessário, `pendingStatus` |
| Responsável atual | `responsibleType` + `responsibleId` |
| Prioridade | `priority` |
| Atraso | `ageBucket` ou janela `waitingSinceFrom`/`waitingSinceTo` |
| Origem | `originChannel` |
| Busca | `q` |

Regras de UI para filtros:

- manter filtros aplicados ao recarregar a lista ou tentar novamente após erro;
- mostrar estado "sem resultado no filtro" sem apagar o recorte escolhido;
- não usar filtro como permissão; a listagem depende de `clinical_handoff.read` e da resposta do `/access-control`;
- não inventar contadores fora da resposta permitida pela API;
- tratar valores inválidos de filtro como erro de consulta, não como lista vazia silenciosa.

## 7.2 SLA e alerta de atraso - HOFF-017

O SLA da inbox é um alerta operacional derivado de tempo aguardando. Ele não é novo estado da state machine, não autoriza ação, não bloqueia sozinho e não cria automação financeira, clínica ou documental.

Campos visuais aprovados:

| Campo | Uso na inbox |
| --- | --- |
| `waitingSince` | Marco de início da espera no estado/grupo atual. |
| `waitingMinutes` | Tempo decorrido calculado para leitura operacional. |
| `ageBucket` | `normal`, `attention` ou `overdue`. |
| `slaLabel` | Texto curto: `No prazo`, `Em atenção`, `Atrasado`. |
| `slaBreachedAt` | Horário em que o item entrou em atraso, quando aplicável. |
| `slaReason` | Motivo derivado: aguardando ACK, finalização, pendência, devolução ou financeiro. |

Limiar candidato por grupo:

| Grupo visual | `attention` após | `overdue` após | Observação |
| --- | --- | --- | --- |
| Aguardando recebimento | 15 min | 30 min | Foco em assumir rapidamente o handoff. |
| Em finalização | 30 min | 60 min | Foco em conferência operacional. |
| Pendência crítica | 30 min | 60 min | Continua priorizada antes de ação financeira. |
| Pendência não crítica | 120 min | 240 min | Pode seguir com justificativa quando regra permitir. |
| Devolvidos | 60 min | 120 min | Alerta de acompanhamento até reenvio. |
| Enviado ao financeiro | 60 min | 120 min | Acompanhamento sem cobrança automática. |

Regras aprovadas:

- os limiares acima são defaults candidatos e devem ser configuráveis futuramente pela operação;
- prioridade alta pode reduzir o limiar efetivo, mas a regra exata de configuração fica para BUILD/SPEC final;
- pendência crítica atrasada deve aparecer acima de pendência não crítica;
- atraso não substitui pendência crítica, permissão efetiva ou bloqueio de origem financeira;
- item atrasado deve preservar CTA primária única do estado atual;
- alerta de atraso não permite concluir, cancelar, devolver ou enviar ao financeiro fora da state machine aprovada;
- a UI deve permitir filtrar `normal`, `attention` e `overdue` sem depender apenas de cor;
- itens atrasados devem aparecer nos contadores/facets somente dentro do recorte que o usuário tem permissão de ler.

## 7.3 Finalização operacional futura - HOFF-018

Finalizar operacionalmente significa encerrar o handoff como trabalho ativo após conferência, pendências e encaminhamento financeiro/documental. Não significa fechar prontuário, baixar cobrança, fechar comanda, concluir Queue ou cancelar atendimento.

Critérios aprovados para exibir/permitir conclusão futura:

| Critério | Regra |
| --- | --- |
| ACK | Recepção/finalização já assumiu o handoff. |
| Estado permitido | Apenas `acknowledged_by_reception`, `waiting_pending_resolution` ou `sent_to_finance` podem ser candidatos. |
| Conferência operacional | Checklist mínimo registrado. |
| Pendência crítica | Nenhuma pendência crítica aberta. |
| Pendência não crítica | Só pode permanecer com dono, justificativa e marcação de não bloqueante. |
| Origem financeira | Deve estar como não aplicável, sem cobrança, enviada/confirmada no financeiro ou resolvida em rotina financeira própria. |
| Duplicidade financeira | Risco conhecido de duplicidade conferido. |
| Documentos/orientações | Receitas, exames, documentos, retornos e orientações entregues, encaminhados ou justificados. |
| Auditoria | Exige `completionType`, motivo/resolução, observação e ator. |

Tipos candidatos de finalização:

- `no_financial_action_required`: não havia ação financeira pendente;
- `financial_resolved`: rotina financeira própria registrou resolução ou baixa manual;
- `sent_to_finance_confirmed`: financeiro recebeu e assumiu o caso, sem concluir cobrança pelo handoff;
- `non_blocking_pending_accepted`: pendência residual justificada como não bloqueante;
- `administrative_closure`: encerramento administrativo auditável, sem substituir cancelamento.

Bloqueios de UI:

- não mostrar ação de finalizar antes de ACK;
- não permitir finalizar item devolvido à clínica;
- não permitir finalizar com pendência crítica aberta;
- não permitir finalizar quando falta origem financeira rastreável;
- não permitir finalizar por atraso/SLA;
- não permitir finalizar como atalho para cobrança, comanda ou baixa.

Depois de `completed`, o item sai da inbox ativa e permanece em consulta histórica/auditoria. A inbox ativa da próxima fatia ainda não implementa essa conclusão sem autorização explícita de BUILD.

## 7.4 Checklist operacional - HOFF-019

Antes de qualquer BUILD da inbox/pós-atendimento, a validação operacional deve percorrer os cenários abaixo e registrar evidência.

| Cenário | Critério de aceite |
| --- | --- |
| Envio clínico | Resumo mínimo, destino, prioridade, pendências e origem financeira estão claros. |
| Reenvio após devolução | Motivo anterior foi respondido e o item volta para `sent_to_reception`. |
| ACK | Recepção assume explicitamente e o dono atual fica rastreável. |
| Conferência | Tutor, paciente, atendimento, documentos, prescrições, exames, retornos, serviços e origem financeira aparecem no contexto. |
| Pendência crítica | Bloqueia envio ao financeiro e conclusão futura. |
| Pendência não crítica | Tem dono, motivo e justificativa de não bloqueio. |
| Devolução clínica | Exige tipo, motivo, destino e não edita prontuário pela inbox. |
| Envio ao financeiro | Exige ACK, conferência, origem rastreável e não cria cobrança/comanda. |
| SLA/atraso | `normal`, `attention` e `overdue` aparecem sem disparar transição automática. |
| Finalização futura | `completed` só aparece como critério futuro, sem BUILD ou automação nesta fatia. |
| Sem permissão | Conteúdo/ação respeita `/access-control`, sem regra por nome de setor, cargo, profissão ou grupo. |

Resultado por item:

- `Aprovado`: critério claro e sem bloqueio.
- `Bloqueado`: falha P0/P1 que impede BUILD.
- `Ajustar`: melhoria necessária antes ou durante a próxima fatia.
- `Não se aplica`: cenário fora do recorte validado, com justificativa.

## 7.5 Origem dos dados da inbox - HOFF-020

A inbox futura deve consumir dados do modelo de handoff em três camadas:

| Camada | Uso na inbox |
| --- | --- |
| `clinical_handoffs` | Lista principal, estado atual, responsável atual, prioridade, origem, tutor, paciente, atendimento, SLA e próximo passo. |
| `clinical_handoff_pendings` | Contagem de pendências, criticidade, tipo, dono, bloqueio financeiro e resolução. |
| `clinical_handoff_events` | Último evento, timeline, histórico e auditoria. |

Regras:

- a inbox não deve inferir estado ativo apenas por `Encounter`, `Queue`, Billing ou CounterSales;
- pendência crítica deve vir de pendência estruturada, não de texto livre;
- último evento não substitui o estado atual;
- filtros, contadores e alertas devem respeitar `accountId` e permissão efetiva;
- dados financeiros aparecem como contexto/resultado rastreável, sem criação automática de cobrança/comanda.

Decisão HOFF-029 para dados da inbox:

- a migration futura deve manter a inbox mínima atual funcionando enquanto adiciona dados da próxima fatia;
- `clinical_handoffs` deve ganhar campos suficientes para listagem ativa, dono operacional, atraso, origem financeira e controle de concorrência;
- `clinical_handoff_pendings` deve sustentar contadores, filtros por criticidade/tipo/status e bloqueio de envio financeiro;
- `clinical_handoff_events` deve sustentar "último evento" e timeline auditável, mas não deve virar fonte do estado atual;
- registros vindos da `0045` devem aparecer como handoffs mínimos, sem pendências estruturadas e sem evento inventado de devolução, financeiro ou conclusão;
- nenhum campo de migration deve liberar, por si só, ação financeira, comanda, baixa, prontuário ou edição clínica.

## 7.6 Relação com Queue - HOFF-025

A inbox da recepção/finalização não deve depender da Queue como fonte de verdade do handoff.

Regras aprovadas:

- a inbox lista `ClinicalHandoff`;
- `queueEntryId` é contexto opcional para abrir a esteira, entender origem e manter rastreabilidade;
- a Queue pode exibir links, badges e alertas derivados do handoff;
- a Queue não decide quais handoffs aparecem na inbox;
- a inbox não deve criar, completar, cancelar ou mover item de Queue automaticamente;
- filtros por Queue são recortes de consulta, não autorização e não fonte de estado;
- se não houver `queueEntryId`, o handoff ainda aparece na inbox quando houver `Encounter` válido;
- divergência entre Queue terminal e handoff ativo deve aparecer como alerta operacional ou pendência, não ser corrigida automaticamente.

Campos derivados que a UI pode mostrar quando vier da Queue:

| Campo visual | Uso |
| --- | --- |
| `queueEntryId` | Link para a Esteira. |
| `queueStatus` | Contexto da posição atual na esteira, sem substituir `handoffStatus`. |
| `queuePriority` | Contexto adicional; prioridade do handoff continua própria. |
| `activeHandoffBadge` | Sinal visual de handoff ativo na Queue. |
| `queueConsistencyAlert` | Indica Queue terminal com handoff ainda ativo ou vínculo ausente inesperado. |

## 7.7 Relação com Encounter - HOFF-026

A inbox deve usar Encounter como contexto clínico-operacional, não como fonte primária do handoff.

Regras aprovadas:

- a inbox lista `ClinicalHandoff`, não Encounter;
- `encounterId` é obrigatório para rastreabilidade, navegação e contexto;
- status do Encounter não substitui `handoffStatus`;
- Encounter fechado não remove handoff da inbox automaticamente;
- handoff concluído futuramente não fecha Encounter automaticamente;
- eventos da timeline do Encounter são resumo contextual, não auditoria completa do handoff;
- divergência entre Encounter fechado e handoff ativo deve aparecer como alerta operacional ou pendência;
- filtros por atendimento são recortes de consulta, não autorização e não fonte de estado.

Campos derivados que a UI pode mostrar quando vier do Encounter:

| Campo visual | Uso |
| --- | --- |
| `encounterId` | Link para atendimento/prontuário operacional. |
| `encounterStatus` | Contexto do atendimento, sem substituir `handoffStatus`. |
| `encounterOrigin` | Origem operacional do caso. |
| `encounterClosedAt` | Alerta quando existir handoff ativo em atendimento fechado. |
| `encounterTimelineLink` | Navegação para histórico resumido. |

## 7.8 Relação com Billing/CounterSales - HOFF-027

A inbox pode orientar a finalização financeira, mas não executa rotina financeira automaticamente.

Regras aprovadas:

- a inbox mostra contexto financeiro, origem, pendências e links para rotinas próprias;
- `sent_to_finance` encaminha caso, não cria cobrança/comanda;
- nenhuma ação da inbox cria `billing_record`, item de Billing, item de Encounter Billing, comanda, venda, recebível, pagamento, baixa, parcela, nota, PIX, cartão ou movimento de caixa;
- abrir Billing, CounterSales, recebíveis ou pagamentos deve ser ação explícita em tela/rota própria e com permissão efetiva da rotina;
- duplicidade financeira deve aparecer como alerta ou bloqueio antes de envio ao financeiro;
- falta de origem financeira rastreável vira pendência `billing_origin`;
- resultado financeiro pode ser exibido como contexto quando existir, mas não substitui `handoffStatus`.

Campos derivados que a UI pode mostrar:

| Campo visual | Uso |
| --- | --- |
| `financialOriginStatus` | Indica se a origem financeira está clara, pendente ou desconhecida. |
| `billingRecordId` | Link para Billing existente, quando houver. |
| `counterSaleId` | Link para comanda existente, quando houver. |
| `receivableStatus` | Contexto de recebível existente, sem baixar automaticamente. |
| `financialDuplicateAlert` | Alerta de possível cobrança/comanda duplicada. |
| `billingOriginPending` | Pendência que bloqueia envio financeiro até resolução ou justificativa. |

## 8. Campos visíveis por item - HOFF-013

| Campo | Finalidade na inbox |
| --- | --- |
| `handoffId` | Identificar o handoff. |
| `encounterId` | Abrir atendimento e manter rastreabilidade. |
| `queueItemId` | Relacionar com a esteira operacional, quando existir. |
| Tutor | Identificar responsável pelo animal e contato. |
| Paciente | Identificar animal/paciente. |
| Veterinário | Entender origem clínica e responsável pelo envio. |
| Origem | Indicar se veio de recepção, agenda, retorno, emergência ou outro canal. |
| Prioridade | Ordenar e sinalizar urgência operacional. |
| Status | Mostrar estado do handoff. |
| Resumo clínico | Permitir entender o caso sem ler o prontuário inteiro. |
| Pendências | Mostrar bloqueios clínicos, financeiros, documentais ou operacionais. |
| Cobrança | Exibir se há saldo, item cobravel, orçamento ou pendência financeira. |
| Último evento | Mostrar última movimentação relevante. |
| Tempo aguardando | Identificar atraso ou gargalo. |
| Responsável atual | Mostrar pessoa, equipe ou setor dono. |
| Próximo passo | Indicar ação recomendada para a recepção. |

Campos mínimos por densidade operacional:

| Área do item | Campos |
| --- | --- |
| Identidade | tutor, paciente, atendimento, prioridade. |
| Estado | status/grupo, tempo aguardando, último evento. |
| Contexto clínico-operacional | resumo curto, instruções de recepção, origem. |
| Pendências | quantidade, criticidade, tipo principal, dono atual. |
| Financeiro contextual | origem financeira rastreável, pendência `billing_origin`, referência existente quando houver. |
| Ações | CTA primária por estado e ações secundárias permitidas. |

Campos que não devem aparecer completos na lista:

- prontuário completo;
- receita completa;
- laudo completo;
- valores sensíveis detalhados;
- dados pessoais desnecessários;
- conteúdo financeiro que pertence a Billing/CounterSales.

Regra HOFF-023 para "Último evento":

- deve vir da trilha auditável aprovada;
- deve mostrar tipo, data/hora e ator de forma operacional;
- não deve depender de leitura de prontuário completo;
- não deve exibir conteúdo clínico/financeiro sensível desnecessário;
- não substitui o estado ativo do handoff nem a lista de pendências.

Regra HOFF-014 para resumo mínimo na inbox:

- item sem `clinicalSummary` suficiente deve aparecer como dado incompleto;
- item sem `receptionInstructions` deve bloquear envio/reenvio;
- pendências precisam estar declaradas explicitamente;
- origem financeira desconhecida deve aparecer como pendência ou alerta operacional;
- reenvio após devolução deve mostrar resposta ao motivo da devolução.

## 9. Ações candidatas

Na próxima fatia:

- Assumir recebimento.
- Abrir atendimento.
- Abrir prontuário.
- Abrir prescrições/receitas.
- Abrir exames.
- Abrir orçamento.
- Abrir faturamento.
- Marcar pendência.
- Resolver pendência.
- Encaminhar financeiro.
- Devolver clínica.

Fora da próxima fatia:

- Marcar aguardando tutor.
- Finalizar operacionalmente.
- Cancelar com motivo.

Regras candidatas de ação:

- ação visível na inbox não significa ação liberada;
- toda ação mutável deve validar permissão efetiva antes de executar;
- `assumir recebimento` deve registrar quem assumiu e quando;
- `marcar pendência` exige tipo, motivo, dono e se bloqueia financeiro;
- `resolver pendência` exige resolução ou justificativa;
- `encaminhar financeiro` não deve criar cobrança automaticamente;
- `encaminhar financeiro` deve exigir ACK e conferência operacional pela recepção/finalização;
- `encaminhar financeiro` deve ficar bloqueado com pendência crítica aberta;
- `devolver clínica` exige motivo;
- `finalizar operacionalmente` não deve ser permitido com pendência crítica aberta;
- `cancelar com motivo` exige permissão e auditoria;
- ações financeiras devem respeitar permissão técnica configurável;
- ações clínicas devem devolver contexto ao fluxo assistencial, não editar prontuário por meio da inbox.

## 9.1 Ações por estado - HOFF-013

| Estado | Ação primária | Ações secundárias candidatas | Bloqueios principais |
| --- | --- | --- | --- |
| `sent_to_reception` | Assumir | Abrir atendimento, abrir paciente, abrir tutor | Sem permissão de ACK; conta divergente; estado inválido. |
| `acknowledged_by_reception` | Conferir | Marcar pendência, devolver clínica, enviar financeiro, abrir rotinas relacionadas | Pendência crítica; ausência de origem financeira; ausência de permissão efetiva. |
| `waiting_pending_resolution` | Resolver pendência | Devolver clínica, acompanhar dono, enviar financeiro se não houver crítica | Pendência crítica aberta; pendência sem dono; resolução sem justificativa. |
| `returned_to_clinic` | Acompanhar | Abrir atendimento, ver motivo, aguardar reenvio | Recepção não edita prontuário nem força reenvio. |
| `sent_to_finance` | Acompanhar financeiro | Abrir Billing/CounterSales quando permitido | Não cria cobrança automática; rotina financeira exige permissão própria. |

Regras:

- CTA primária deve ser única por item.
- Ação visível não significa ação autorizada.
- A ação deve ser bloqueada, ocultada ou convertida em leitura conforme permissão efetiva e regra de UX de HOFF-016.
- A inbox não deve oferecer `completed` ou `cancel` nesta fatia.

Regra HOFF-015 para devolução clínica:

- ação Devolver clínica deve exigir tipo controlado, motivo e destino;
- quando houver pendência relacionada, a UI deve preservar o vínculo com `pendingId`;
- devolução não deve aparecer como solução para pendência puramente financeira;
- item devolvido fica em acompanhamento até reenvio pela clínica;
- recepção não deve editar prontuário, prescrição, laudo ou relatório pela inbox.

## 10. Regras de UX

- CTA primária única por item.
- Pendências críticas visíveis.
- Pendência crítica deve aparecer antes de ações financeiras.
- Ação financeira deve indicar bloqueio quando faltar origem de cobrança, conferência operacional ou resolução de pendência crítica.
- Próximo passo claro.
- Itens antigos devem alertar.
- Recepção não deve precisar navegar por módulos soltos.
- Ações financeiras devem respeitar permissão efetiva configurável.
- Itens sem permissão devem aparecer bloqueados, ocultos ou somente leitura conforme padrão de UX aprovado, sem depender de nome de setor.
- Não esconder pendência clínica.
- Status e prioridade devem ser legíveis sem depender apenas de cor.
- Filtros principais devem incluir status, responsável, prioridade, atraso e origem.
- Itens concluídos ou cancelados devem ficar acessíveis para auditoria, mas não competir com trabalho ativo.
- A inbox deve ser densa, sóbria e operacional, sem cards decorativos.

## 10.1 Estados vazios e sem permissão - HOFF-016

Estados vazios aprovados:

| Estado de tela | Quando aparece | Comportamento |
| --- | --- | --- |
| Carregando | Consulta em andamento | Mostrar estrutura estável da inbox sem alterar layout. |
| Sem handoffs ativos | Não há item em `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` ou `sent_to_finance` | Mensagem curta e sem ação que crie handoff artificial. |
| Sem resultado no filtro | Existem itens, mas filtro atual não retorna linhas | Permitir limpar filtros. |
| Sem pendência crítica | Filtro de críticas sem resultado | Indicar que não há críticas no recorte atual. |
| Erro de carregamento | Falha de API/rede/permissão inesperada | Permitir tentar novamente e não perder filtros locais. |
| Dados incompletos | Item veio sem tutor/paciente/resumo obrigatório | Mostrar marcador de dado ausente e bloquear ação dependente. |

Estados sem permissão aprovados:

| Situação | Tratamento |
| --- | --- |
| Sem `clinical_handoff.read` | Não listar dados; mostrar estado de acesso negado sem expor conteúdo. |
| Tem leitura, sem permissão de ação | Item aparece em modo leitura; CTA mutável fica indisponível ou ausente. |
| Sem permissão de ACK | `sent_to_reception` aparece sem botão Assumir; mostrar que ação exige permissão efetiva. |
| Sem permissão de devolução | Ação Devolver clínica fica indisponível; não esconder pendência clínica. |
| Sem permissão financeira | Ação Enviar financeiro ou abrir rotina financeira fica indisponível; não criar atalho alternativo. |
| Sem permissão de prontuário | Link para prontuário fica indisponível; inbox continua mostrando somente resumo permitido do handoff. |

Regras de permissão:

- autorização real vem do `/access-control`;
- não usar nome de setor, cargo, profissão ou grupo como condição de UI;
- `deny` efetivo deve aparecer como ação indisponível ou conteúdo não listado conforme regra da rotina;
- a UI deve preservar o trabalho visível quando o usuário tem leitura, mas não deve expor dados de rotina sem permissão;
- estados sem permissão não devem sugerir que o usuário troque de papel nominal; devem indicar necessidade de permissão efetiva da rotina.

## 10.2 Permissões técnicas da inbox - HOFF-028

A inbox pode organizar o trabalho por grupos visuais, mas cada ação depende da permissão técnica efetiva:

| Área da inbox | Permissão exigida | Comportamento sem permissão |
| --- | --- | --- |
| Listagem e detalhe do handoff | `clinical_handoff.read` | Não listar dados do handoff. |
| Envio/reenvio para recepção | `clinical_handoff.send` | Ocultar ou desabilitar ação de envio/reenvio. |
| Confirmar recebimento | `clinical_handoff.acknowledge` | Mostrar item em leitura quando houver `read`, sem botão de ACK. |
| Registrar pendência | `clinical_handoff.mark_pending` | Não permitir criação de pendência operacional. |
| Resolver pendência | `clinical_handoff.resolve_pending` | Mostrar pendência permitida em leitura, sem ação de resolver. |
| Devolver para clínica | `clinical_handoff.return` | Desabilitar devolução, sem esconder a pendência clínica. |
| Enviar ao financeiro | `clinical_handoff.send_to_finance` | Desabilitar encaminhamento financeiro e manter pendência/bloqueio visível. |
| Abrir Billing ou cobrança | Permissão própria de Billing | Link ou ação financeira indisponível; handoff não cria alternativa automática. |
| Abrir CounterSales/comanda | Permissão própria de CounterSales | Link ou ação comercial indisponível; handoff não cria comanda. |
| Abrir prontuário/documentação clínica | Permissão própria da rotina clínica/documental | Inbox mostra apenas resumo permitido do handoff. |

Nomes como recepção, clínica, financeiro, caixa e coordenação permanecem úteis para conversa, filtros e templates pré-configurados editáveis. Eles não devem virar `if` de autorização na UI.

## 10.3 Validação UX por papel - HOFF-033

Antes de qualquer BUILD da próxima fatia, a inbox deve passar por walkthrough UX com dados controlados e permissões efetivas configuradas no `/access-control`.

| Template operacional | Jornada que precisa ser validada | Aceite UX |
| --- | --- | --- |
| Clínica | Envia handoff, recebe devolução, entende motivo, complementa documentação permitida e reenvia. | CTA principal clara, resumo mínimo visível e nenhuma obrigação de operar cobrança. |
| Recepção/finalização | Recebe item, confirma ACK, revisa resumo, identifica pendências, devolve quando necessário e encaminha ao financeiro. | Próximo passo em poucos segundos, pendência crítica evidente e nenhuma edição clínica pela inbox. |
| Financeiro/caixa | Recebe contexto financeiro rastreável e abre rotina financeira/comercial própria quando permitido. | Origem da cobrança clara, risco de duplicidade visível e nenhuma criação automática de Billing/CounterSales. |
| Coordenação | Acompanha gargalos, atraso, devoluções, pendências e estados sem permissão. | Visão auditável sem executar transição indevida e sem expor dados sem permissão. |

Estados obrigatórios por jornada:

- caminho feliz;
- sem permissão de leitura;
- leitura sem ação;
- dados incompletos;
- filtro sem resultado;
- sem handoffs ativos;
- erro de carregamento;
- item atrasado.

Cada evidência deve registrar tela/rota, estado inicial, permissão efetiva, ação esperada, resultado `Aprovado`, `Bloqueado`, `Ajustar` ou `Não se aplica` e risco residual.

## 10.4 Smoke visual - HOFF-034

Antes de qualquer BUILD da próxima fatia, a experiência visual candidata deve ser validada por smoke em inbox, Encounter e Queue quando a superfície estiver disponível.

Checklist da inbox:

- lista com itens ativos não fica em branco;
- filtros de status/grupo, pendência, atraso, prioridade e busca cabem sem quebrar a operação;
- item mostra tutor/paciente/atendimento, status, pendência, atraso, próximo passo e CTA primária;
- estados `sent_to_reception`, `acknowledged_by_reception`, `waiting_pending_resolution`, `returned_to_clinic` e `sent_to_finance` têm leitura visual distinta;
- estados vazio, filtro sem resultado, erro, dados incompletos e sem permissão preservam layout estável;
- ação financeira não aparece como cobrança criada e ação clínica não aparece como edição de prontuário.

Checklist de Encounter:

- resumo/timeline de handoff é legível sem competir com prontuário;
- envio/reenvio aparece apenas quando permitido pelo estado e permissão;
- devolução clínica aparece como alerta operacional com motivo, sem abrir edição clínica indevida;
- links para comanda, Billing, prontuário ou documento respeitam permissões próprias.

Checklist de Queue:

- badge/overlay de handoff é claramente derivado e não parece novo status persistido;
- item com handoff ativo mostra link/contexto sem mover a fila;
- inconsistência entre Queue terminal e handoff ativo aparece como alerta, não como autocorreção;
- visual não cria ACK, pendência, devolução ou envio financeiro.

Viewports e evidência:

- validar desktop operacional, largura intermediária e mobile quando aplicável;
- registrar rota, viewport, massa de dados, permissão efetiva, estado visual e resultado;
- falhas de tela em branco, overflow horizontal, sobreposição, CTA errada ou exposição de dado sem permissão são bloqueios antes de BUILD.

## 10.5 Auditoria/eventos - HOFF-035

A inbox deve ser validada contra a trilha auditável antes de BUILD.

Critérios por ação:

| Ação da inbox | Evento esperado | Evidência esperada |
| --- | --- | --- |
| Assumir/ACK | `clinical_handoff.acknowledged` | Timeline mostra recebimento, ator, data/hora e estado assumido. |
| Marcar pendência | `clinical_handoff.pending_marked` | Pendência aparece com dono, motivo, criticidade e vínculo ao evento. |
| Resolver pendência | `clinical_handoff.pending_resolved` | Pendência muda de status e timeline preserva resolução/justificativa. |
| Devolver clínica | `clinical_handoff.returned_to_clinic` | Motivo e destino ficam visíveis sem expor prontuário completo. |
| Enviar financeiro | `clinical_handoff.sent_to_finance` | Origem financeira e conferência aparecem como contexto, não como cobrança criada. |

Regras:

- ações bloqueadas por permissão, estado, payload, conta ou conflito não devem aparecer como sucesso na timeline operacional;
- leituras, filtros, badges e alertas de SLA não criam evento de handoff;
- timeline da inbox pode resumir eventos, mas não substitui a fonte auditável;
- eventos não devem expor dados de prontuário, documento, cobrança, valor sensível ou PII sem necessidade;
- cada evidência deve registrar tela/rota, ação, evento esperado, ator/permissão efetiva, resultado e risco residual.

## 10.6 Rollback e mitigação - HOFF-036

A inbox da próxima fatia só pode ir para BUILD se tiver retorno operacional claro para a inbox mínima.

Comportamento de rollback:

- ocultar ações novas: marcar pendência, resolver pendência, devolver clínica e enviar financeiro;
- manter listagem, detalhe, envio mínimo quando aplicável e ACK já existentes;
- manter handoffs em estados novos visíveis como itens que exigem tratamento manual, sem sumir da operação;
- mostrar aviso operacional quando uma ação estiver temporariamente indisponível;
- preservar links manuais para rotinas próprias quando o usuário tiver permissão;
- não criar cobrança, comanda, baixa, pagamento, documento ou edição clínica como alternativa automática.

Mitigações por risco:

| Risco | Mitigação UX |
| --- | --- |
| Inbox expandida instável | Voltar para lista mínima com filtros básicos e ACK. |
| Pendência crítica sem ação disponível | Exibir bloqueio e dono manual, sem enviar ao financeiro. |
| Devolução indisponível | Manter item em finalização e orientar complemento manual fora da ação nova. |
| Envio financeiro indisponível | Preservar origem financeira como contexto e bloquear automação. |
| Permissão nova mal configurada | Mostrar leitura segura ou acesso negado, sem sugerir troca de papel nominal. |
| Dados incompletos | Bloquear ação dependente e manter item recuperável. |

Critério:

- rollback não pode esconder item ativo;
- rollback não pode remover evidência/auditoria;
- rollback não pode depender de setor, cargo, grupo ou profissão hardcoded;
- rollback aprovado encerra HOFF-036 e deixa apenas HOFF-037 para validação final com operação.

## 10.7 Validação com operação - HOFF-037

HOFF-037 fecha o PRD da inbox para a próxima decisão.

Aceite operacional:

- recepção entende o que chegou, quem deve agir, qual pendência existe e qual CTA é segura;
- clínica recebe devolução com motivo claro e responde em rotina própria;
- financeiro recebe encaminhamento com origem rastreável, sem cobrança/comanda automática;
- coordenação consegue auditar gargalos, atrasos, pendências e devoluções;
- estados sem permissão, vazio, erro, dados incompletos e atraso foram considerados no plano;
- rollback para inbox mínima está definido;
- riscos conhecidos foram aceitos como planejados ou marcados como bloqueio de BUILD.

Decisão final desta fase:

- a fase de planejamento pré-BUILD está encerrada após HOFF-037;
- DEV da inbox expandida continua bloqueado até autorização explícita;
- não há novo item lógico `HOFF-038` nesta sequência.

## 11. Critérios de aceite do PRD

- Recepção entende o que chegou da clínica.
- Nenhum item fica sem dono.
- Pendências ficam visíveis.
- Próximo passo aparece em poucos segundos.
- Financeiro sabe o que cobrar.
- Veterinário consegue receber devolução quando necessário.
- Casos encaminhados ao financeiro não são confundidos com cobrança criada ou finalização.
- A inbox não cria cobrança, comanda, prescrição, exame ou orçamento automaticamente.
- Estados sem permissão não expõem dados indevidos nem liberam atalhos alternativos.
- Unitários de service/state machine protegem que ações da inbox não criem efeitos financeiros, clínicos ou de Queue por inferência.
- Testes de API devem validar que a inbox lida com 401/403/404/409/422 sem criar atalhos alternativos nem ocultar pendência crítica relevante.
- Ações da inbox devem seguir a matriz HOFF-032: assumir só em `sent_to_reception`, devolver/enviar financeiro só após ACK ou pendência tratada, e não oferecer `completed`, `cancelled`, `in_billing` ou `reopen` nesta fatia.
- DEV permanece bloqueado até SPEC/API/state machine aprovadas.

## 12. Métricas de sucesso

Métricas da próxima fatia:

- Tempo até recepção assumir.
- Tempo até encaminhamento financeiro.
- Número de casos devolvidos para clínica.
- Número de pendências abertas.
- Tempo médio em `sent_to_reception`.
- Tempo médio em `acknowledged_by_reception`.
- Tempo médio em `waiting_pending_resolution`.
- Quantidade de tentativas bloqueadas por falta de permissão.
- Quantidade de envios ao financeiro bloqueados por pendência crítica.

Métricas futuras, fora desta fatia:

- Casos finalizados sem cobrança pendente.
- Casos aguardando decisão do tutor.
- Tempo médio em `in_billing`.
- Quantidade de cancelamentos com motivo.
- Quantidade de casos concluídos com pendência crítica.

## 13. Dependências

- 891 aprovado.
- 892 aprovado.
- API handoff futura.
- `Queue` com status operacional.
- Permissões técnicas configuradas e validadas em `/access-control`.
- Billing/CounterSales integração futura.
- Definição de pendência crítica.
- Definição de responsável atual por pessoa, equipe ou setor.
- Definição de auditoria/eventos.
- Validação da fronteira entre finalização clínica, cobrança e fechamento operacional.

## 14. Riscos

| Risco | Impacto | Mitigação candidata |
| --- | --- | --- |
| Parecer resolvido sem fonte de verdade | Recepção acredita que assumiu sem estado persistido | Depender de API/state machine antes de BUILD. |
| Duplicar cobrança | Tutor pode ser cobrado duas vezes ou item pode aparecer em dois fluxos | Exigir origem de cobrança e integração futura com Billing/CounterSales. |
| Fechar caso com pendência clínica | Risco assistencial e retrabalho | Bloquear ou alertar pendência crítica conforme regra aprovada. |
| Sobrecarregar recepção | Inbox vira tela grande demais | Filtros, CTA única e agrupamento por status/prioridade. |
| Misturar billing clínico e venda balcão | Confusão financeira | Separar origem clínica, orçamento, venda avulsa e cobrança. |
| Devolver para clínica sem motivo | Perda de contexto | Motivo obrigatório e evento auditável. |
| Itens antigos ficarem invisíveis | Gargalos sem gestão | Alertas por tempo aguardando e filtros de atraso. |
| Enviar ao financeiro com pendência crítica | Cobrança insegura ou retrabalho | Bloquear envio financeiro até resolução/justificativa auditável. |

## 15. Próximos artefatos

- `894-spec-api-handoff-clinico.md`
- `895-backlog-handoff-clinico.md`

## 16. Guardrail final

Este PRD não autoriza BUILD.

Agentes não devem alterar código, backend, rotas, schema, migration, `Queue`, `Encounter`, Billing, CounterSales ou financeiro com base apenas neste documento.

Qualquer implementação futura exige:

- 891 aprovado;
- 892 aprovado;
- SPEC/API aprovada;
- validação de permissões técnicas na governança de acesso;
- validação de regra financeira;
- backlog faseado aprovado;
- autorização explícita do responsável.
