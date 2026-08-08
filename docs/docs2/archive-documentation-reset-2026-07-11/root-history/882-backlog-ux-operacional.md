# 882 - Backlog de UX Operacional

Data: 2026-04-28
Status: rascunho priorizado; estado real atualizado em `897-estado-real-ux-operacional-2026-05-01.md`
Roadmap: `docs/881-roadmap-ux-operacional.md`

## 0.0 Trilha documental oficial

Esta e a numeracao oficial da frente de UX operacional:

- `880-plano-executivo-ux-operacional.md`
- `881-roadmap-ux-operacional.md`
- `882-backlog-ux-operacional.md`
- `883-auditoria-ui-atual-ux-operacional.md`
- `884-brief-visual-operacional.md`
- `885-spec-cabecalho-contextual.md`
- `886-modelo-operacional-queue-encounter.md`
- `887-prd-jornada-recepcao.md`
- `888-prd-jornada-veterinario-clinico.md`
- `889-roadmap-fluxos-especializados.md`
- `890-plano-validacao-operacional.md`
- `891-spec-handoff-clinico-recepcao.md`
- `896-spec-billing-persistente.md`
- `897-estado-real-ux-operacional-2026-05-01.md`
- `898-walkthrough-operacional-fluxo-principal-2026-05-01.md`

Documentos filhos futuros da frente de handoff clinico:

- `892-state-machine-handoff-operacional.md`
- `893-prd-inbox-recepcao-finalizacao.md`
- `894-spec-api-handoff-clinico.md`
- `895-backlog-handoff-clinico.md`

Documentos antigos ou concorrentes nao substituem esta trilha. DEV permanece bloqueado mesmo quando um documento for aprovado.

## 0.1 Nota de estado real em 2026-05-01

A inspeção registrada em `897-estado-real-ux-operacional-2026-05-01.md` confirma que este backlog ficou defasado em relação ao código atual.

Leitura corrigida:

- o programa não está mais em discovery puro;
- `Início`, `Recepção`, `Agenda`, `Esteira`, `Atendimento`, `Prontuário`, `Comandas` e `Billing` já possuem BUILD parcial;
- a fase real é validação operacional do fluxo principal, com lacunas estruturais ainda abertas;
- `Handoff clínico real`, `Inbox de recepção`, API `/clinical-handoffs` e state machine persistida continuam não implementados;
- `Billing Persistente` foi tecnicamente validado para a fatia EP-BILL-1 e não deve continuar como frente principal neste momento.

Este backlog deve ser reclassificado antes de nova BUILD ampla. Até essa reclassificação, os itens DEV abaixo continuam úteis como marcadores, mas não representam fielmente tudo que já foi construído.

## 0.2 Nota de walkthrough operacional em 2026-05-01

O walkthrough registrado em `898-walkthrough-operacional-fluxo-principal-2026-05-01.md` confirmou e depois fechou um bloqueio P0 antes de qualquer fatia real de handoff:

- `Início`, `Agenda`, `Recepção` e check-in da `Esteira` carregaram no runtime HTTP/SPA.
- A ação `Abrir triagem` a partir de uma entrada chamada falhava com `Invalid queue entry status transition`.
- A causa provável é sincronização duplicada/idempotente entre `Queue` e `Encounter`: `attachEncounter(...)` já coloca a fila em `in_triage`, e `syncQueueWithEncounter(..., 'in_triage')` tenta aplicar `in_triage -> in_triage`.
- O P0 foi corrigido com sync idempotente e o walkthrough passou até `Atendimento -> Prontuário -> Comanda/Billing`.
- Próximo item lógico imediato: `HOFF-MIN-1`, envio mínimo para recepção com ACK, sem inbox completa e sem automação financeira.

## 0. Resumo executivo

Este backlog organiza a execucao futura da UX operacional do `cvg-his-v2`.

Os itens P0 e P1 sao principalmente documentacao, auditoria, discovery e desenho de fluxo. Eles existem para reduzir ambiguidade antes de qualquer BUILD.

Os itens DEV sao apenas marcadores futuros. Nenhum item DEV deste documento autoriza implementacao, alteracao de codigo, componente, rota, migration ou tela.

BUILD so pode ocorrer depois de PRD/SPEC aprovados e autorizacao explicita do responsavel.

## 1. Legenda

Prioridade:

- P0: decisao ou base obrigatoria.
- P1: alto impacto operacional.
- P2: melhoria importante.
- P3: refinamento.

Tipo:

- DOC: documentacao/especificacao.
- UX: desenho de fluxo.
- UI: desenho visual/interface.
- QA: auditoria/verificacao.
- DEV: implementacao futura, somente com aprovacao.

Status possiveis:

- Aberto.
- Em analise.
- Em especificacao.
- Aguardando aprovacao.
- Aprovado.
- Bloqueado.
- Concluido.
- Cancelado.

Observacoes:

- `Aprovado` nao significa autorizado para codigo.
- DEV so muda de `Bloqueado` apos aprovacao explicita do responsavel.
- Itens de documentacao podem ser aprovados sem liberar BUILD.

## 2. P0 - Decisoes de base

P0 e base de decisao. Nao e execucao.

| ID     | Tipo | Item                                                          | Resultado esperado                              | Dependencia    | Status |
| ------ | ---- | ------------------------------------------------------------- | ----------------------------------------------- | -------------- | ------ |
| UX-001 | DOC  | Aprovar `Queue` como esteira central                          | Decisao formal registrada                       | Nenhuma        | Aberto |
| UX-002 | DOC  | Aprovar `Encounter` como item da fila                         | Modelo conceitual fechado                       | UX-001         | Aberto |
| UX-003 | DOC  | Aprovar busca por ID, telefone, RG, CPF, tutor e animal       | Escopo de busca definido                        | Nenhuma        | Aberto |
| UX-004 | DOC  | Aprovar regras de produto, servico, comanda e lead            | Regras comerciais claras                        | Nenhuma        | Aberto |
| UX-005 | DOC  | Aprovar orcamento isolado                                     | Orcamento fora do atendimento presencial aceito | Nenhuma        | Aberto |
| UX-006 | DOC  | Aprovar cabecalho contextual                                  | Padrao de header fechado                        | Nenhuma        | Aberto |
| UX-007 | DOC  | Aprovar responsabilidade operacional por setor/pessoa/equipe  | Modelo de dono atual validado                   | UX-001, UX-002 | Aberto |
| UX-008 | DOC  | Aprovar necessidade de state machine para `Queue`/`Encounter` | Decisao de state machine registrada             | UX-001, UX-002 | Aberto |
| UX-009 | DOC  | Aprovar guardrail de nao implementacao sem PRD/SPEC           | Bloqueio formal de BUILD prematuro              | Nenhuma        | Aberto |

## 2.1 Regra de dependencia e bloqueio

- P0 precisa ser concluido antes de qualquer especificacao executavel.
- `Queue`/Agenda/`Encounter` precisam de modelo operacional formal antes de DEV.
- Cabecalho contextual precisa de SPEC antes de DEV.
- Jornada da recepcao precisa de PRD antes de DEV.
- Jornada veterinaria precisa de PRD antes de DEV.
- Fluxos especializados nao podem ser implementados sem desenho proprio.
- Todo item DEV fica com status `Bloqueado`.

## 3. P1 - Brief visual e header

| ID     | Tipo | Item                                                | Resultado esperado                                        | Dependencia     | Status |
| ------ | ---- | --------------------------------------------------- | --------------------------------------------------------- | --------------- | ------ |
| UX-010 | UX   | Especificar cabecalho contextual                    | Trilha esquerda, contexto minimo, proximos passos direita | UX-006          | Aberto |
| UX-011 | UI   | Definir regra de reducao de botoes                  | Menos acoes simultaneas no header                         | UX-010          | Aberto |
| UX-012 | UI   | Definir padrao visual sobrio                        | Paleta, raio, sombra, icones e densidade                  | Nenhuma         | Aberto |
| UX-013 | UX   | Definir regra de CTA primaria global                | CTA move a jornada, nao a tela isolada                    | UX-010          | Aberto |
| UX-014 | QA   | Auditar headers atuais                              | Lista de telas carregadas/confusas                        | UX-010          | Aberto |
| UX-015 | QA   | Auditar uso de emojis em navegacao e acoes          | Matriz para remocao gradual                               | UX-012          | Aberto |
| UX-016 | UI   | Definir hierarquia visual por tipo de pagina        | Regra para recepcao, clinica, financeiro e cadastros      | UX-012          | Aberto |
| UX-017 | UX   | Definir padrao de breadcrumbs/trilha operacional    | Trilha clicavel por jornada                               | UX-010          | Aberto |
| UX-018 | UX   | Definir politica de ocultacao de acoes irrelevantes | Acoes aparecem por contexto e papel                       | UX-010, UX-013  | Aberto |
| UX-019 | QA   | Criar checklist de validacao do header contextual   | Checklist para auditar header por tela                    | UX-010 a UX-018 | Aberto |

## 4. P1 - Queue operacional

| ID      | Tipo | Item                                       | Resultado esperado                                                | Dependencia       | Status |
| ------- | ---- | ------------------------------------------ | ----------------------------------------------------------------- | ----------------- | ------ |
| UX-020  | UX   | Modelar estados da `Queue`                 | Novo, aguardando, em atendimento, finalizacao, cobranca, fechado  | UX-001, UX-008    | Aberto |
| UX-021  | UX   | Modelar card/linha de `Encounter` na fila  | Origem, responsavel, tutor, animal, horario, motivo, status       | UX-002            | Aberto |
| UX-022  | UX   | Definir filtros da `Queue`                 | Setor, status, prioridade, responsavel, horario                   | UX-020, UX-021    | Aberto |
| UX-023  | UX   | Definir acoes por status                   | Pegar ficha, enviar, devolver, finalizar, cobrar                  | UX-020            | Aberto |
| UX-024  | QA   | Auditar tela atual de `Queue`              | Gaps frente ao modelo operacional                                 | UX-020, UX-021    | Aberto |
| UX-025  | UX   | Definir dono atual e proximo responsavel   | Responsabilidade operacional explicita                            | UX-007, UX-020    | Aberto |
| UX-026  | UX   | Definir prioridade e SLA visual            | Urgencia, atraso e risco visiveis                                 | UX-020, UX-025    | Aberto |
| UX-027  | UX   | Definir regras de transicao por status     | Transicoes permitidas e bloqueadas                                | UX-020, UX-023    | Aberto |
| UX-028  | UX   | Definir excecoes operacionais da fila      | Cancelamento, desistencias, retorno, sem animal                   | UX-027            | Aberto |
| UX-029  | QA   | Criar checklist de validacao da `Queue`    | Checklist para auditar fila operacional                           | UX-020 a UX-028   | Aberto |
| UX-029A | UX   | Modelar Agenda como coluna dorsal temporal | Agendamento integrado a Queue e Encounter                         | UX-001, UX-002    | Aberto |
| UX-029B | UX   | Definir estados de agendamento             | Pendente, confirmado, cancelado, excluido                         | UX-029A           | Aberto |
| UX-029C | UX   | Definir log e notas de agendamento         | Auditoria operacional de criacao, alteracao e cancelamento        | UX-029A           | Aberto |
| UX-029D | UX   | Definir agenda por setor/profissional      | Clinica, ultrassom, RX, laboratorio, especialidade e profissional | UX-029A           | Aberto |
| UX-029E | QA   | Criar checklist de validacao da Agenda     | Checklist para agenda alimentar Queue no check-in                 | UX-029A a UX-029D | Aberto |

## 5. P1 - Jornada da recepcao

Foco: entrada rapida, busca ampla, orcamento, venda, comanda, retorno da clinica e fechamento.

| ID      | Tipo | Item                                                | Resultado esperado                                                | Dependencia      | Status |
| ------- | ---- | --------------------------------------------------- | ----------------------------------------------------------------- | ---------------- | ------ |
| UX-030  | UX   | Mapear entrada de cliente novo                      | Tutor -> animal -> entrada -> Queue                               | UX-001, UX-002   | Aberto |
| UX-031  | UX   | Mapear busca operacional ampla                      | ID, telefone, RG, CPF, tutor, animal                              | UX-003           | Aberto |
| UX-032  | UX   | Mapear atendimento de retorno sem animal            | Comanda/orientacao/orcamento sem forcar animal presente           | UX-004, UX-005   | Aberto |
| UX-033  | UX   | Mapear orcamento por WhatsApp/telefone              | Orcamento isolado que pode virar atendimento/comanda              | UX-005           | Aberto |
| UX-034  | UX   | Mapear venda de produto de balcao                   | Venda pode ficar fora do atendimento                              | UX-004           | Aberto |
| UX-035  | UX   | Mapear venda de servico                             | Servico abre comanda/lead operacional                             | UX-004           | Aberto |
| UX-036  | UX   | Mapear finalizacao pos-veterinario                  | Recepcao pega item na Queue e fecha pendencias                    | UX-020 a UX-029  | Aberto |
| UX-037  | QA   | Auditar fluxo atual da recepcao                     | Gargalos, telas, cliques e botoes                                 | UX-030 a UX-036  | Aberto |
| UX-038  | UX   | Mapear pendencias operacionais antes de cobranca    | Pendencias clinicas, financeiras e documentais visiveis           | UX-036           | Aberto |
| UX-039  | QA   | Criar checklist de entrada rapida da recepcao       | Checklist de validacao da jornada da recepcao                     | UX-030 a UX-038  | Aberto |
| UX-039A | UX   | Mapear agendamento por WhatsApp/telefone/presencial | Tutor/animal -> agenda -> profissional/setor -> Queue no check-in | UX-029A, UX-031  | Aberto |
| UX-039B | UX   | Mapear agendamento de exames e especialidades       | Coleta, ultrassom, RX e especialista com horario e responsavel    | UX-029D, UX-039A | Aberto |

## 6. P1 - Jornada do veterinario clinico

O cockpit clinico deve incluir queixa principal, anamnese, exame fisico, parametros vitais, suspeita diagnostica, exames, terapeutica, prescricao, proximos passos e retorno para recepcao.

| ID     | Tipo | Item                                             | Resultado esperado                               | Dependencia     | Status |
| ------ | ---- | ------------------------------------------------ | ------------------------------------------------ | --------------- | ------ |
| UX-040 | UX   | Mapear pegar ficha na `Queue`                    | Entrada clara no atendimento clinico             | UX-020 a UX-029 | Aberto |
| UX-041 | UX   | Mapear cockpit clinico                           | Historico, anamnese, ficha, conduta e pendencias | UX-040          | Aberto |
| UX-042 | UX   | Mapear exames e guias                            | Pedido/coleta/guia a partir do prontuario        | UX-041          | Aberto |
| UX-043 | UX   | Mapear medicacao aplicada vs prescrita           | Separacao operacional clara                      | UX-041          | Aberto |
| UX-044 | UX   | Mapear receita                                   | Receita nasce da conduta                         | UX-041          | Aberto |
| UX-045 | UX   | Mapear orcamento clinico                         | Orcamento sem abrir financeiro completo          | UX-041, UX-005  | Aberto |
| UX-046 | UX   | Mapear enviar para recepcao                      | Pendencias enviadas junto com o item da Queue    | UX-040, UX-041  | Aberto |
| UX-047 | QA   | Auditar prontuario atual                         | Excesso de informacao, botoes e quebras de fluxo | UX-041          | Aberto |
| UX-048 | UX   | Mapear campos minimos obrigatorios do prontuario | Minimos por etapa clinica definidos              | UX-041          | Aberto |
| UX-049 | QA   | Criar checklist do cockpit clinico               | Checklist da jornada do veterinario              | UX-040 a UX-048 | Aberto |

## 7. P2 - Fluxos especializados

Regra: fluxos especializados nao podem virar sistemas isolados.

| ID     | Tipo | Item                                                                    | Resultado esperado                                     | Dependencia     | Status |
| ------ | ---- | ----------------------------------------------------------------------- | ------------------------------------------------------ | --------------- | ------ |
| UX-050 | UX   | Mapear internacao                                                       | Jornada propria, estados e retorno operacional         | UX-020 a UX-029 | Aberto |
| UX-051 | UX   | Mapear laboratorio                                                      | Pedido, coleta, analise, laudo e retorno ao prontuario | UX-020 a UX-029 | Aberto |
| UX-052 | UX   | Mapear ultrassom/RX                                                     | Agenda, execucao, laudo e retorno                      | UX-020 a UX-029 | Aberto |
| UX-053 | UX   | Mapear cirurgia                                                         | Pre-op, procedimento, recuperacao e financeiro         | UX-020 a UX-029 | Aberto |
| UX-054 | UX   | Mapear especialidades                                                   | Encaminhamento, consulta e retorno                     | UX-020 a UX-029 | Aberto |
| UX-055 | UX   | Definir vinculo minimo com Tutor, Animal, Encounter, Queue e Financeiro | Integracao minima por fluxo especializado              | UX-050 a UX-054 | Aberto |
| UX-056 | UX   | Criar padrao de retorno operacional para recepcao/prontuario/financeiro | Retorno padronizado e rastreavel                       | UX-055          | Aberto |

## 8. P2 - Auditoria visual transversal

| ID     | Tipo | Item                                                   | Resultado esperado                                   | Dependencia    | Status |
| ------ | ---- | ------------------------------------------------------ | ---------------------------------------------------- | -------------- | ------ |
| UX-060 | QA   | Auditar `AppLayout`                                    | Pontos de excesso visual no shell                    | UX-012         | Aberto |
| UX-061 | QA   | Auditar `AppPageHeader`                                | Padrao atual vs header contextual                    | UX-010         | Aberto |
| UX-062 | QA   | Auditar botoes por tela critica                        | Excesso e prioridade errada                          | UX-011, UX-013 | Aberto |
| UX-063 | QA   | Auditar cards e densidade                              | Onde ha card demais ou informacao dispersa           | UX-012, UX-016 | Aberto |
| UX-064 | QA   | Auditar CTAs                                           | CTAs que nao movem a jornada global                  | UX-013         | Aberto |
| UX-065 | QA   | Auditar excesso de abas                                | Abas redundantes ou sem funcao operacional clara     | UX-016         | Aberto |
| UX-066 | QA   | Auditar excesso de cards                               | Cards decorativos ou dispersivos identificados       | UX-012, UX-016 | Aberto |
| UX-067 | QA   | Auditar acoes duplicadas                               | Acoes repetidas em header, cards e menus             | UX-011, UX-018 | Aberto |
| UX-068 | QA   | Auditar telas sem proximo passo claro                  | Telas sem continuidade operacional identificadas     | UX-013         | Aberto |
| UX-069 | QA   | Auditar telas que nao deixam claro o responsavel atual | Falhas de responsabilidade operacional identificadas | UX-007, UX-025 | Aberto |

## 8.1 P1 - Handoff clinico para recepcao

Esta frente transforma o pre-handoff visual do `Encounter` em especificacao rastreavel para handoff real futuro entre veterinario, recepcao e financeiro.

Ela nao autoriza implementacao. O objetivo e reduzir ambiguidade antes de state machine, API, inbox de recepcao e backlog faseado.

| ID     | Tipo | Item                                                   | Resultado esperado                                               | Dependencia            | Status |
| ------ | ---- | ------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------- | ------ |
| UX-070 | DOC  | Validar SPEC do handoff clinico para recepcao          | `891-spec-handoff-clinico-recepcao.md` validado                  | UX-036, UX-046         | Aberto |
| UX-071 | UX   | Definir state machine do handoff operacional           | Estados, transicoes, bloqueios e efeitos colaterais definidos    | UX-070, UX-020, UX-027 | Aberto |
| UX-072 | UX   | Definir inbox de recepcao para finalizacao pos-clinica | Recepcao enxerga casos devolvidos com pendencias e proximo passo | UX-070, UX-036, UX-038 | Aberto |
| UX-073 | DOC  | Definir payload/API futura do handoff clinico          | Contratos candidatos, erros e auditoria documentados             | UX-070, UX-071         | Aberto |
| UX-074 | DOC  | Definir backlog faseado do handoff clinico             | Fases seguras para Discovery, PRD, SPEC, QA e BUILD futuro       | UX-070 a UX-073        | Aberto |

## 9. Pacotes de execucao documental

Estes pacotes devem gerar documentos filhos antes de qualquer implementacao.

### Pacote A - Fundacao

Inclui:

- UX-001 a UX-009.

Saida esperada:

- decisoes conceituais aprovadas;
- modelo base para documentos filhos.

### Pacote B - Header e linguagem visual

Inclui:

- UX-010 a UX-019;
- UX-060 a UX-064.

Saida esperada:

- SPEC do cabecalho contextual;
- brief visual operacional;
- auditoria visual inicial.

### Pacote C - Queue e Encounter

Inclui:

- UX-020 a UX-029.
- UX-029A a UX-029E.

Saida esperada:

- modelo operacional formal da `Queue` e do `Encounter`;
- modelo operacional da Agenda integrada;
- state machine candidata;
- checklist de validacao.

### Pacote D - Recepcao

Inclui:

- UX-030 a UX-039.
- UX-039A a UX-039B.

Saida esperada:

- PRD da jornada da recepcao, incluindo agendamento;
- checklist de entrada rapida e finalizacao.

### Pacote E - Veterinario clinico

Inclui:

- UX-040 a UX-049.

Saida esperada:

- PRD da jornada do veterinario clinico;
- checklist do cockpit clinico.

### Pacote F - Fluxos especializados

Inclui:

- UX-050 a UX-056.

Saida esperada:

- roadmap dos fluxos especializados;
- padrao de retorno operacional integrado.

### Pacote G - Handoff clinico para recepcao

Inclui:

- UX-070 a UX-074.

Saida esperada:

- SPEC do handoff clinico validada;
- state machine candidata;
- PRD da inbox de recepcao para finalizacao pos-clinica;
- SPEC/API futura do handoff;
- backlog faseado da frente de handoff.

## 10. DEV futuro - Somente apos aprovacao explicita

Estes itens nao autorizam codigo agora. Sao marcadores para execucao futura.

| ID         | Tipo | Item                                             | Dependencia                                        | Status    |
| ---------- | ---- | ------------------------------------------------ | -------------------------------------------------- | --------- |
| UX-DEV-001 | DEV  | Implementar cabecalho contextual                 | UX-010 a UX-019 + SPEC aprovada                    | Bloqueado |
| UX-DEV-002 | DEV  | Ajustar `Queue`/Agenda operacional               | UX-020 a UX-029E + modelo operacional aprovado     | Bloqueado |
| UX-DEV-003 | DEV  | Ajustar entrada rapida e agendamento da recepcao | UX-030 a UX-039B + PRD recepcao aprovado           | Bloqueado |
| UX-DEV-004 | DEV  | Ajustar cockpit clinico                          | UX-040 a UX-049 + PRD veterinario aprovado         | Bloqueado |
| UX-DEV-005 | DEV  | Aplicar visual sobrio no shell                   | UX-012 + UX-060 a UX-069 + brief visual aprovado   | Bloqueado |
| UX-DEV-006 | DEV  | Implementar handoff clinico real                 | UX-070 a UX-074 + SPEC/API/state machine aprovadas | Bloqueado |

## 11. Criterios de aceite deste backlog

O backlog sera considerado pronto quando:

- P0 estiver completo;
- dependencias estiverem explicitas;
- DEV estiver bloqueado;
- cada frente tiver documento filho esperado;
- cada fase tiver checklist de validacao;
- os itens estiverem pequenos o suficiente para agente executar sem ambiguidade.

## 12. Proxima acao recomendada

Ordem original recomendada:

1. Fechar P0.
2. Criar documento formal `Queue`/Agenda/`Encounter`.
3. Criar SPEC do cabecalho contextual.
4. Auditar UI atual.
5. Gerar PRD da recepcao.
6. Gerar PRD do veterinario clinico.
7. So depois avaliar desbloqueio de itens DEV, com PRD/SPEC aprovado e autorizacao explicita do responsavel.

Ordem corrigida apos inspeção do código em 2026-05-01:

1. Usar `897-estado-real-ux-operacional-2026-05-01.md` como snapshot atual.
2. Executar walkthrough operacional do `890` no fluxo `Início -> Recepção -> Agenda/Esteira -> Atendimento -> Prontuário -> Comanda/Billing`.
3. Registrar bloqueios P0/P1 encontrados no walkthrough.
4. Reclassificar este backlog com `Concluido`, `Parcial`, `Em validacao` e `Bloqueado`.
5. Se o fluxo atual estiver aceitável, fechar decisões P0 do handoff no `895`.
6. Só então construir a primeira fatia mínima de handoff real ou inbox de recepção.
