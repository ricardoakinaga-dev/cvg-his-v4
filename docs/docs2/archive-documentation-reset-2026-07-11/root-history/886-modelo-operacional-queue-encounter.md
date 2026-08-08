# 886 - Modelo Operacional de Queue e Encounter

Data: 2026-04-28
Status: especificacao conceitual para validacao do responsavel
Origem: `docs/880-plano-executivo-ux-operacional.md`, `docs/881-roadmap-ux-operacional.md`, `docs/882-backlog-ux-operacional.md`, `docs/2026-04-28-mapa-auditoria-fluxos-ux-operacional.md`

## 0. Guardrail

Este documento nao autoriza implementacao.

Ele nao define contrato tecnico final, schema de banco, contrato de API, componente, migration, rota ou tela. Ele formaliza o modelo operacional candidato para orientar PRD, SPEC tecnica e validacao futura.

Todo item DEV relacionado a `Queue` e `Encounter` permanece bloqueado ate existir PRD/SPEC aprovado e autorizacao explicita do responsavel.

Atualizacao HOFF-028 em 2026-05-02: permissoes tecnicas do handoff foram aprovadas como governanca configuravel em `/access-control`. Este modelo pode sugerir setor, responsavel e proximo passo, mas nao autoriza acao por nome de setor, cargo, profissao, grupo ou template.

Atualizacao HOFF-029 em 2026-05-02: a migration futura do handoff deve ampliar `ClinicalHandoff` em tabelas proprias, sem persistir `handoffStatus` em `Queue` ou `Encounter` e sem alterar rotinas financeiras como side effect.

## 0.1 Resumo operacional do modelo

`Queue` e o sistema operacional do hospital para o trabalho imediato.

Ela representa o trabalho vivo: o que chegou, o que esta esperando, o que esta em atendimento, o que foi enviado para exame, o que voltou para recepcao, o que aguarda cobranca, o que esta pendente e o que foi fechado.

A Agenda e a coluna dorsal temporal do hospital. Ela organiza trabalho futuro, distribui demanda por profissional/setor e alimenta a `Queue` quando o paciente chega ou quando o procedimento agendado precisa ser executado.

`Encounter` e o processo em execucao dentro dessa esteira.

Cada item ativo deve ser tratado como um caso vivo, nao como uma linha de cadastro. Um caso vivo tem localizacao operacional, responsavel, estado, origem, pendencias e proximo passo.

O sistema nao deve ser pensado primeiro como CRUD. CRUD e infraestrutura administrativa. A operacao real e fluxo:

- entrada;
- atribuicao;
- atendimento;
- encaminhamento;
- pendencia;
- retorno;
- cobranca;
- fechamento.

Toda UI operacional depende deste modelo. Recepcao, prontuario, laboratorio, internacao, comanda, financeiro, dashboards e cabecalho contextual devem conseguir responder as mesmas perguntas basicas: onde o caso esta, quem e dono agora, qual estado ele tem e o que acontece depois.

Autorizacao nao nasce da `Queue` nem do `Encounter`. A liberacao de acoes deve vir de permissoes efetivas por rotina. Permissoes de handoff nao substituem permissoes proprias de Billing, CounterSales, prontuario, agenda, documentos, relatorios, caixa, pagamentos ou auditoria global.

Persistencia futura do handoff tambem nao deve nascer por alteracao silenciosa da `Queue` ou do `Encounter`. Pendencias e eventos devem pertencer a tabelas de handoff, com `accountId`, RLS e vinculos explicitos.

Este documento ainda nao define schema, API ou state machine final. Ele define o contrato operacional minimo que a SPEC tecnica futura devera respeitar.

## 1. Objetivo

Formalizar a `Queue` como esteira operacional central do hospital veterinario e o `Encounter` como item operacional rastreavel dentro dessa esteira.

O objetivo e permitir que recepcao, veterinario, financeiro, laboratorio, imagem, internacao e coordenacao entendam rapidamente:

- quem e responsavel agora;
- onde o caso esta;
- qual e o proximo setor;
- qual e o proximo responsavel;
- quais pendencias impedem avancar;
- qual acao move a jornada global.

## 2. Definicao de Queue

`Queue` e a representacao viva do trabalho operacional do hospital.

Ela nao deve ser entendida apenas como lista de espera. Ela deve funcionar como esteira central que acompanha entradas, atendimentos, exames, orcamentos, cobrancas, pendencias, retornos e fechamentos.

A `Queue` deve responder:

- o que acabou de chegar;
- o que esta aguardando atendimento;
- o que esta em atendimento;
- o que foi enviado para exames;
- o que voltou para recepcao;
- o que aguarda orcamento, aprovacao ou cobranca;
- o que esta atrasado, critico ou sem dono claro.

## 2.0 Agenda operacional e relacao com Queue

A Agenda deve ser tratada como camada operacional integrada, nao como calendario isolado.

Ela responde:

- o que esta marcado para acontecer;
- quando deve acontecer;
- com qual profissional ou setor;
- qual tutor e animal estao vinculados;
- qual tipo de procedimento foi agendado;
- qual estado do agendamento;
- qual historico/log de alteracoes existe;
- quando o agendamento deve virar item da `Queue`.

Fluxo conceitual:

1. Contato chega por WhatsApp, telefone ou presencialmente.
2. Recepcao busca ou cadastra tutor.
3. Recepcao busca ou cadastra animal, quando houver.
4. Recepcao agenda consulta, exame ou procedimento.
5. Agenda registra profissional, setor, data/hora completa, notas, labels e estado.
6. No dia do agendamento, quando o paciente chega, o item passa para a `Queue`.
7. O profissional executa o atendimento/procedimento.
8. O caso volta para recepcao para registro, lancamento, cobranca e fechamento quando aplicavel.

Estados candidatos de agendamento, ainda nao tecnicos:

- `pendente`;
- `confirmado`;
- `cancelado`;
- `excluido`.

Labels/setores candidatos:

- `clinica`;
- `ultrassom`;
- `raio_x`;
- `laboratorio`;
- `especialidade`;
- agenda do profissional cadastrado no sistema.

Campos candidatos de agendamento, nao contrato tecnico final:

- `appointmentId`;
- `ownerId` / `tutorId`;
- `patientId`;
- `scheduledFor`;
- `scheduledEndAt`;
- `professionalId`;
- `specialtyId`;
- `sector`;
- `label`;
- `appointmentType`;
- `appointmentStatus`;
- `notes`;
- `createdBy`;
- `updatedBy`;
- `createdAt`;
- `updatedAt`;
- `auditLog`.

Regras candidatas:

- agendamento deve permitir acesso rapido ao cadastro do cliente;
- agendamento deve permitir acesso rapido ao prontuario do animal;
- agendamento deve registrar alteracoes relevantes em log;
- agendamento confirmado deve conseguir alimentar a `Queue` no check-in;
- item de agenda nao deve virar `Encounter` clinico ativo antes da regra de criacao ser validada;
- no check-in, o sistema deve decidir se cria novo `Encounter`, reabre/vincula caso anterior ou cria item operacional relacionado.

Perguntas para SPEC futura:

- agendamento pendente aparece na `Queue` ou apenas na Agenda?
- quando um agendamento confirmado vira item da `Queue`?
- ausencia/no-show sera estado proprio ou cancelamento?
- exclusao deve existir ou deve ser cancelamento com auditoria?
- exame agendado sem consulta clinica exige `Encounter` antes do dia?
- consulta com especialista deve aparecer na Queue geral, na agenda do profissional ou nas duas visoes?

## 2.1 Contrato operacional do sistema

As regras abaixo sao nao negociaveis para o modelo operacional, embora a forma tecnica final ainda dependa de SPEC futura.

Todo item ativo deve ter:

- `currentSector`;
- `currentResponsible`;
- `operationalStatus`.

Todo item ativo deve responder:

- onde esta;
- quem e responsavel;
- qual e o proximo passo.

Nao pode existir:

- item ativo sem dono;
- item ativo sem estado;
- item ativo sem destino possivel;
- item ativo sem setor atual;
- item operacional sem origem rastreavel;
- item em pendencia sem responsavel pela pendencia.

Regras de interpretacao:

- `currentSector` responde onde o caso esta agora.
- `currentResponsible` responde quem deve agir agora.
- `operationalStatus` responde em que estado o caso esta.
- `nextSector` ou proximo passo recomendado responde para onde o caso pode ir.
- `handoffReason`, quando houver troca de setor, responde por que o caso foi enviado ou devolvido.

Estados finais como `fechado` e `cancelado` podem nao ter responsavel ativo, mas devem preservar rastreabilidade de quem fechou ou cancelou e quando isso ocorreu.

Se uma UI nao consegue responder essas perguntas a partir do modelo, a UI esta incompleta ou o modelo ainda nao foi especificado o suficiente.

## 2.2 Invariantes operacionais

Invariantes sao regras que nao devem ser quebradas por tela, fluxo, rotina manual ou automacao futura.

| Invariante | Regra operacional | Excecao candidata a validar |
| --- | --- | --- |
| Um `Encounter` ativo nao pode estar em dois setores simultaneamente | Deve existir um unico `currentSector` dominante | Fluxos derivados podem ter subitens tecnicos, mas o item principal precisa de setor atual claro |
| Um item ativo nao pode ter dois responsaveis primarios | Deve existir um unico `currentResponsible` dominante | Equipe pode ser responsavel, mas deve aparecer como equipe, nao como multipla pessoa primaria |
| Um item fechado nao pode voltar ao fluxo sem reabertura formal | Reentrada exige evento explicito de reabertura ou novo Encounter | Retorno clinico pode gerar novo item, conforme regra aprovada |
| Um item cancelado nao pode seguir para cobranca sem revisao formal | Cancelamento encerra a jornada ativa | Cobranca residual deve ser tratada como pendencia financeira separada |
| Um item em cobranca deve ter origem rastreavel | Financeiro precisa saber se veio de consulta, exame, produto, servico, internacao ou orcamento | Venda avulsa deve declarar origem comercial |
| Um item sem tutor so pode existir em estado especifico | Exemplo candidato: emergencia ou entrada incompleta | Regras finais dependem de validacao do responsavel |
| Um item sem animal so pode existir em fluxo permitido | Exemplo candidato: orcamento, venda de balcao, retorno administrativo ou entrada sem animal | Atendimento clinico com animal ausente precisa regra propria |
| Um agendamento deve ter data/hora completa | Sem timestamp completo nao existe compromisso operacional confiavel | Lista de espera sem horario deve ser fluxo separado |
| Pendencia ativa deve ter dono | Toda pendencia deve ter responsavel atual ou setor dono | Pendencia externa com tutor deve ter setor interno acompanhando |
| Mudanca de setor deve registrar motivo | Handoff sem motivo gera perda de contexto | Motivo pode ser padronizado em SPEC futura |
| SLA deve partir de marco operacional definido | Espera precisa ter origem temporal clara | Tempos finais ainda serao definidos |

Regras negativas:

- nao usar `Queue` apenas como lista visual;
- nao usar `Encounter` apenas como prontuario;
- nao permitir fluxo ativo sem proximo passo possivel;
- nao tratar Agenda e Queue como modulos desconectados;
- nao permitir financeiro operar item sem origem;
- nao permitir laboratorio liberar resultado sem retorno ao responsavel clinico definido;
- nao permitir recepcao receber caso da clinica sem pendencias ou orientacao minima quando houver finalizacao operacional.

## 2.3 Impacto do Handoff na Queue - HOFF-025

Decisão operacional aprovada em 2026-05-02:

- `ClinicalHandoff` é a fonte do `handoffStatus`;
- `Queue` continua sendo esteira de trabalho vivo, com state machine própria;
- a próxima fatia não adiciona novos estados persistidos de Queue para handoff;
- termos como `pronto_para_recepcao`, `aguardando_finalizacao`, `pendente_handoff` e `aguardando_financeiro` ficam como leitura visual/operacional derivada, não como status técnico aprovado;
- a Queue pode mostrar badge, alerta, link e resumo derivados do handoff quando houver vínculo por `queueEntryId`;
- handoff sem `queueEntryId` continua válido se houver `Encounter` rastreável;
- ações de Queue não devem criar ou alterar handoff por inferência;
- ações de handoff não devem concluir, cancelar, reabrir ou mover Queue automaticamente;
- divergências entre Queue terminal e handoff ativo devem gerar alerta ou pendência operacional, não correção silenciosa.

Consequência para SPEC futura:

- qualquer campo de integração na Queue deve ser de leitura ou projeção derivada;
- qualquer sincronização persistida de `operationalStatus` exige SPEC própria, migration própria e aprovação explícita;
- não usar Queue como substituto da inbox de recepção/finalização;
- não usar inbox como substituto da state machine de Queue.

## 3. Definicao de Encounter

`Encounter` e o item operacional que percorre a `Queue`.

Ele nao deve ser tratado apenas como prontuario ou registro clinico. Ele e a unidade de trabalho que conecta tutor, animal, atendimento, prontuario, exames, comanda, orcamento, financeiro, internacao e retorno para recepcao.

Um `Encounter` pode nascer de:

- entrada presencial com animal;
- entrada presencial sem animal;
- retorno;
- atendimento agendado;
- atendimento espontaneo;
- urgencia ou emergencia;
- orcamento por WhatsApp, telefone ou conversa presencial;
- venda de servico que exige rastreabilidade operacional;
- encaminhamento de outro setor.

## 3.1 Impacto do Handoff no Encounter - HOFF-026

Decisao operacional aprovada em 2026-05-02:

- `Encounter` e a ancora obrigatoria do handoff, com tutor, paciente, origem, atendimento, `appointmentId`, `queueEntryId` quando houver e timeline;
- `ClinicalHandoff` continua sendo a fonte do `handoffStatus`;
- o status tecnico atual do Encounter permanece separado: `reception`, `in_triage`, `in_care`, `observation` e `closed`;
- a proxima fatia nao adiciona `handoffStatus`, `handoffStatusDerivado` ou estados de pos-atendimento diretamente em Encounter;
- envio/reenvio de handoff exige Encounter valido, da mesma conta e nao fechado;
- `closeEncounter` nao deve ser usado como substituto de handoff, ACK, devolucao, envio ao financeiro ou conclusao operacional;
- completar handoff futuramente nao fecha Encounter automaticamente;
- fechar Encounter nao completa, cancela ou resolve handoff automaticamente;
- eventos resumidos de handoff podem aparecer na timeline do Encounter, mas a timeline nao substitui eventos auditaveis do handoff.

Consequencia para SPEC futura:

- telas de Encounter podem mostrar bloco de handoff ativo, historico resumido, CTA autorizada e alerta de consistencia;
- qualquer inconsistencia entre Encounter fechado e handoff ativo deve ser alerta ou pendencia operacional;
- qualquer bloqueio futuro de fechamento com handoff ativo exige SPEC propria e aprovacao explicita;
- Encounter nao deve virar inbox de recepcao/finalizacao;
- Encounter nao deve criar cobranca, comanda, baixa, exame, prescricao ou documento a partir do handoff por inferencia.

## 4. Campos candidatos

Esta lista e candidata e nao representa contrato tecnico final.

### 4.1 Identidade operacional

| Campo candidato | Descricao operacional | Validacao pendente |
| --- | --- | --- |
| `queueItemId` | Identificador do item na esteira operacional | Confirmar se e entidade separada ou visao do Encounter |
| `encounterId` | Identificador do atendimento operacional/clinico | Confirmar relacao com prontuario e atendimento existente |
| `originChannel` | Origem: recepcao, agenda, WhatsApp, telefone, retorno, emergencia | Validar vocabulario final |
| `originReason` | Motivo operacional de entrada | Validar obrigatoriedade por tipo de entrada |
| `createdAt` | Horario de entrada operacional | Confirmar criterio de SLA |
| `updatedAt` | Ultima movimentacao relevante | Confirmar uso em ordenacao |

### 4.2 Tutor e animal

| Campo candidato | Descricao operacional | Validacao pendente |
| --- | --- | --- |
| `ownerId` / `tutorId` | Tutor vinculado ao caso | Validar casos sem cadastro completo |
| `ownerDisplayName` | Nome operacional do tutor | Confirmar fonte canonica |
| `ownerPhone` | Telefone para busca/contato rapido | Validar privacidade e exibicao |
| `patientId` | Animal vinculado, quando existir | Validar entrada sem animal |
| `patientDisplayName` | Nome operacional do animal | Confirmar fonte canonica |
| `patientSpecies` | Especie para contexto minimo | Validar se deve aparecer na fila |
| `patientCode` | Codigo interno, quando existir | Validar busca operacional |

### 4.3 Responsabilidade e setor

| Campo candidato | Descricao operacional | Validacao pendente |
| --- | --- | --- |
| `currentSector` | Setor atual dono da execucao | Definir lista final de setores |
| `currentResponsibleType` | Pessoa, equipe ou setor | Aprovar modelo de responsabilidade |
| `currentResponsibleId` | Responsavel atual, quando individualizado | Definir fallback quando for equipe |
| `currentResponsibleLabel` | Nome exibido do responsavel atual | Confirmar regra visual |
| `nextSector` | Proximo setor esperado | Validar transicoes por status |
| `nextResponsibleType` | Pessoa, equipe ou setor no proximo passo | Aprovar modelo |
| `nextResponsibleId` | Proximo responsavel, quando conhecido | Validar obrigatoriedade |
| `handoffReason` | Motivo de envio/devolucao entre setores | Definir vocabulario e obrigatoriedade |

### 4.4 Estado, prioridade e SLA

| Campo candidato | Descricao operacional | Validacao pendente |
| --- | --- | --- |
| `operationalStatus` | Estado principal da jornada | Definir state machine final |
| `clinicalStatus` | Situacao clinica resumida, quando aplicavel | Validar responsavel pela atualizacao |
| `billingStatus` | Situacao financeira resumida | Validar integracao com comanda/financeiro |
| `priority` | Rotina, retorno, urgencia, emergencia | Aprovar labels e ordenacao |
| `waitingSince` | Inicio da espera atual | Definir reinicio por transicao |
| `slaTargetAt` | Marco de SLA operacional | Aprovar tempos por prioridade |
| `isOverdue` | Indicador de atraso | Definir regra visual |
| `escalationReason` | Motivo de escalonamento | Validar uso pela coordenacao |

### 4.5 Conteudo minimo de contexto

| Campo candidato | Descricao operacional | Validacao pendente |
| --- | --- | --- |
| `chiefComplaint` | Queixa principal ou motivo clinico | Validar quando e obrigatorio |
| `visitType` | Consulta, retorno, vacina, exame, orcamento, venda de servico | Validar taxonomia |
| `summary` | Resumo curto para a fila | Definir limite e origem |
| `openPendencies` | Pendencias clinicas, financeiras, documentais ou operacionais | Validar estrutura |
| `recommendedNextActions` | Proximas acoes sugeridas | Validar fonte e prioridade |
| `lastMovementAt` | Ultima movimentacao entre setores | Confirmar uso em auditoria |

## 5. Estados candidatos

Estados candidatos, ainda sem transicoes finais:

| Estado candidato | Descricao operacional | Responsavel atual tipico | Proximo destino tipico |
| --- | --- | --- | --- |
| `entrada_incompleta` | Registro iniciado, dados minimos insuficientes | Recepcao | Recepcao |
| `aguardando_recepcao` | Item precisa de triagem administrativa ou confirmacao | Recepcao | Clinica, financeiro ou cancelamento |
| `aguardando_atendimento` | Animal/caso pronto para veterinario | Recepcao ou fila clinica | Veterinario |
| `em_atendimento` | Veterinario assumiu o caso | Veterinario | Recepcao, exames, internacao |
| `aguardando_exames` | Exame solicitado e ainda nao concluido | Laboratorio/imagem | Veterinario ou recepcao |
| `em_exame` | Setor tecnico executando exame | Laboratorio/imagem | Veterinario |
| `aguardando_resultado` | Coleta/execucao concluida, laudo pendente | Laboratorio/imagem | Veterinario |
| `aguardando_orcamento` | Precisa montar ou revisar orcamento | Recepcao, veterinario ou financeiro | Tutor/aprovacao |
| `aguardando_aprovacao` | Orcamento ou conduta depende de aceite do tutor | Recepcao ou veterinario | Atendimento, financeiro ou cancelamento |
| `aguardando_finalizacao_clinica` | Atendimento precisa de conclusao clinica | Veterinario | Recepcao |
| `aguardando_cobranca` | Clinica concluiu e recepcao/caixa deve cobrar | Recepcao/financeiro | Financeiro |
| `em_cobranca` | Pagamento em andamento | Financeiro/caixa | Fechamento |
| `pendente` | Ha bloqueio operacional conhecido | Setor responsavel pela pendencia | Variavel |
| `encaminhado_setor_especializado` | Caso movido para internacao, cirurgia, imagem ou especialidade | Setor especializado | Recepcao, clinica ou financeiro |
| `fechado` | Jornada operacional encerrada | Nenhum responsavel ativo | Nenhum |
| `cancelado` | Jornada interrompida ou aberta por engano | Responsavel pelo cancelamento | Nenhum |

## 6. Responsabilidade atual e proxima

Cada item da `Queue` deve ter dono operacional claro.

Responsabilidade pode ser:

- pessoa;
- equipe;
- setor.

Regras candidatas:

- nenhum item ativo deve ficar sem `currentSector`;
- nenhum item ativo deve ficar sem responsabilidade atual visivel;
- quando o proximo passo for previsivel, `nextSector` deve ser exibido;
- quando houver devolucao entre setores, o motivo deve acompanhar o item;
- coordenacao deve conseguir filtrar itens sem responsavel individual;
- recepcao deve enxergar tudo que voltou para finalizacao, cobranca, orientacao ou pendencia.

### 6.1 Regras deterministicas de responsabilidade

`currentResponsible` e obrigatorio para todos os estados ativos.

Regras:

- se houver pessoa explicitamente responsavel, a pessoa e o responsavel primario;
- se nao houver pessoa, mas houver equipe responsavel, a equipe e o responsavel primario;
- se nao houver pessoa nem equipe, o setor atual assume a responsabilidade primaria;
- se o responsavel for equipe, deve existir fallback visual claro para o setor dono;
- se o responsavel for setor, a UI deve deixar claro que ainda nao ha pessoa individualizada;
- nenhum item ativo pode aparecer como "sem responsavel";
- nenhum item ativo pode exibir duas pessoas como responsaveis primarias;
- participantes secundarios podem existir, mas nao substituem o responsavel primario.

Logica conceitual:

```text
responsavel = pessoa || equipe || setor
```

Interpretacao:

- `pessoa` tem precedencia quando uma pessoa assumiu o caso;
- `equipe` tem precedencia quando o trabalho foi atribuido a um grupo;
- `setor` e fallback obrigatorio quando nao existe atribuicao individual ou por equipe;
- se nenhum dos tres puder ser determinado, o item viola o contrato operacional.

### 6.2 Responsabilidade por estado

| Estado candidato | Responsavel obrigatorio | Regra |
| --- | --- | --- |
| `entrada_incompleta` | Recepcao, pessoa da recepcao ou equipe de recepcao | Nao pode ficar sem setor dono |
| `aguardando_recepcao` | Recepcao | Deve indicar pendencia ou acao esperada |
| `aguardando_atendimento` | Fila clinica, equipe clinica ou veterinario atribuido | Se nao houver veterinario, setor/equipe assume |
| `em_atendimento` | Veterinario ou equipe clinica | Pessoa preferencial quando ficha foi assumida |
| `aguardando_exames` | Laboratorio/imagem ou equipe tecnica | Deve indicar pedido de origem |
| `em_exame` | Laboratorio/imagem ou tecnico responsavel | Deve indicar etapa tecnica |
| `aguardando_resultado` | Laboratorio/imagem | Deve indicar responsavel por liberar ou revisar |
| `aguardando_orcamento` | Recepcao, veterinario ou financeiro | Deve indicar quem monta ou revisa |
| `aguardando_aprovacao` | Setor que acompanha tutor | Deve indicar quem cobra retorno da aprovacao |
| `aguardando_finalizacao_clinica` | Veterinario/equipe clinica | Nao deve ser responsabilidade da recepcao ainda |
| `aguardando_cobranca` | Recepcao/financeiro | Deve ter origem de cobranca |
| `em_cobranca` | Financeiro/caixa | Deve indicar operador, equipe ou setor |
| `pendente` | Dono da pendencia | Pendencia sem dono e invalida |
| `encaminhado_setor_especializado` | Setor especializado | Deve indicar setor destino |
| `fechado` | Sem responsavel ativo | Deve preservar responsavel do fechamento |
| `cancelado` | Sem responsavel ativo | Deve preservar responsavel do cancelamento |

### 6.3 Casos invalidos

Casos que devem ser tratados como erro de modelagem operacional em PRD/SPEC futura:

- item ativo sem `currentSector`;
- item ativo sem `currentResponsible`;
- item ativo sem `operationalStatus`;
- item em `em_atendimento` sem veterinario, equipe clinica ou setor clinico responsavel;
- item em `aguardando_cobranca` sem origem rastreavel;
- item em `pendente` sem dono da pendencia;
- item fechado que volta para fila sem reabertura formal;
- item cancelado que continua aparecendo como ativo;
- item em laboratorio sem retorno previsto para clinica, recepcao ou financeiro.

## 7. Setor atual e proximo setor

Setores candidatos:

- Recepcao;
- Clinica;
- Laboratorio;
- Imagem;
- Internacao;
- Cirurgia;
- Especialidades;
- Financeiro/caixa;
- Estoque, quando houver consumo ou venda;
- Coordenacao, quando houver escalonamento.

Exemplos de leitura operacional:

| Situacao | Setor atual | Proximo setor |
| --- | --- | --- |
| Tutor chegou para consulta | Recepcao | Clinica |
| Veterinario assumiu ficha | Clinica | Recepcao, laboratorio ou internacao |
| Exame solicitado | Laboratorio/imagem | Clinica |
| Consulta finalizada com itens cobraveis | Recepcao | Financeiro/caixa |
| Pagamento em andamento | Financeiro/caixa | Fechamento |
| Caso precisa internar | Internacao | Recepcao, clinica ou financeiro |

## 8. Dependencias por area

### 8.1 Recepcao

Dependencias:

- busca ampla por tutor, animal, telefone, CPF/RG, ID e codigo interno;
- cadastro minimo progressivo;
- criacao de entrada com ou sem animal;
- criacao ou atualizacao de `Encounter`;
- criacao ou atualizacao de agendamento;
- envio para `Queue`;
- recebimento de volta da clinica;
- visibilidade de pendencias, orcamento, comanda e cobranca.

Lacunas para validacao:

- quais dados minimos permitem abrir uma entrada emergencial;
- quando comanda deve nascer automaticamente;
- como tratar retorno sem animal presente;
- como evitar duplicidade de tutor/animal sem travar a entrada.

### 8.2 Veterinario

Dependencias:

- pegar ficha da `Queue`;
- abrir prontuario no contexto do `Encounter`;
- registrar anamnese, exame fisico, parametros, suspeita, conduta e terapeutica;
- solicitar exames e prescrever sem perder contexto;
- indicar orcamento ou itens cobraveis;
- devolver para recepcao com pendencias claras.

Lacunas para validacao:

- campos clinicos minimos antes de devolver para recepcao;
- quando permitir rascunho;
- quando bloquear fechamento clinico;
- como separar medicacao aplicada de prescricao para casa.

### 8.3 Financeiro e comanda

Dependencias:

- receber itens cobraveis originados na recepcao, clinica, exames, internacao ou venda de balcao;
- distinguir produto de balcao, servico, procedimento, exame e atendimento;
- mostrar status financeiro do `Encounter`;
- bloquear ou alertar fechamento com pendencias criticas;
- registrar cobranca parcial, pagamento pendente ou cancelamento.

Decisao HOFF-027 em 2026-05-02:

- handoff encaminha contexto financeiro, mas nao cria cobranca, comanda, recebivel, pagamento, baixa, parcela, nota ou movimento de caixa;
- `sent_to_finance` nao e `in_billing`;
- Billing, Encounter Financial e CounterSales continuam rotinas proprias;
- qualquer abertura de comanda, criacao de item, baixa, pagamento ou fechamento financeiro exige acao explicita, permissao propria e auditoria da rotina financeira/comercial;
- falta de origem financeira deve virar pendencia `billing_origin`;
- risco de duplicidade entre Billing, Encounter Billing, CounterSales e recebiveis deve bloquear ou exigir justificativa auditavel.

Lacunas para validacao:

- quem pode ajustar valores indicados pela clinica;
- como tratar aprovacao parcial de orcamento;
- quando uma pendencia financeira impede fechamento operacional;
- como conciliar venda avulsa sem `Encounter`.

### 8.4 Exames, laboratorio e imagem

Dependencias:

- pedido nascer do atendimento ou de fluxo autorizado;
- fila tecnica por etapa;
- coleta, execucao, laudo e liberacao;
- retorno para prontuario e responsavel clinico;
- sinalizacao para recepcao quando houver cobranca ou orientacao.

Lacunas para validacao:

- se todo exame exige `Encounter` ativo;
- quem recebe resultado critico;
- como lidar com exame solicitado e nao realizado;
- como cobrar exame cancelado, coletado ou refeito.

### 8.5 Internacao

Dependencias:

- admissao a partir de atendimento, encaminhamento ou emergencia;
- leito/setor responsavel;
- evolucao, prescricao, execucao e alta vinculadas;
- retorno para recepcao e financeiro no momento correto;
- status proprio sem virar sistema isolado.

Lacunas para validacao:

- quando internacao abre novo `Encounter` ou continua o atual;
- como tratar transferencia de leito/setor;
- quais pendencias impedem alta;
- como a comanda acumula consumo assistencial.

## 9. Transicoes a especificar futuramente

Este documento nao define a state machine final.

A SPEC futura deve responder:

- quem pode mover cada estado;
- quais transicoes sao permitidas;
- quais transicoes sao bloqueadas;
- quais campos sao obrigatorios antes de cada transicao;
- quais eventos geram auditoria;
- quais mudancas notificam outro setor;
- quais estados aparecem para cada papel;
- como cancelamento, desistencias e atendimentos abertos por engano sao tratados.

## 10. Criterios de aceite conceitual

O modelo conceitual sera considerado pronto para SPEC tecnica quando:

- `Queue` estiver aprovada como esteira central;
- `Encounter` estiver aprovado como item operacional da fila;
- campos candidatos forem aceitos, descartados ou marcados para discovery;
- estados candidatos forem revisados pelo responsavel;
- responsabilidades por pessoa, equipe e setor forem aprovadas;
- dependencias com recepcao, veterinario, financeiro, exames e internacao estiverem claras;
- lacunas criticas tiverem dono de validacao;
- DEV permanecer bloqueado.

## 11. Proximos passos

1. Validar se `Queue` e `Encounter` devem ser entidades separadas ou camadas operacionais sobre estruturas existentes.
2. Validar lista de setores e papeis.
3. Validar estados candidatos e nomes operacionais em portugues.
4. Criar SPEC tecnica somente apos aprovacao deste modelo.
5. Manter `UX-DEV-002` bloqueado ate autorizacao explicita.
