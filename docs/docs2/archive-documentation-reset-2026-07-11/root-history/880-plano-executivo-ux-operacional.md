# 880 - Plano Executivo de UX Operacional

Data: 2026-04-28
Status: rascunho executivo para validacao
Fonte base: `docs/2026-04-28-mapa-auditoria-fluxos-ux-operacional.md`

## 0. Resumo executivo

O `cvg-his-v2` deve evoluir para funcionar como uma esteira operacional integrada do hospital veterinario, e nao como um conjunto de telas isoladas.

A `Queue` deve ser tratada como centro da operacao imediata: a representacao viva do que esta entrando, aguardando, sendo atendido, voltando para recepcao, indo para exames, virando orcamento, entrando em cobranca ou sendo fechado.

A Agenda deve ser tratada como coluna dorsal temporal da operacao. Ela concentra demandas futuras, distribui trabalho por profissional/setor e, no momento correto, alimenta a `Queue` para execucao do atendimento, exame ou procedimento.

O `Encounter` deve ser tratado como unidade operacional da fila, nao apenas como registro clinico. Ele deve carregar contexto suficiente para recepcao, veterinario, laboratorio, internacao, financeiro e coordenacao entenderem o caso sem depender de comunicacao informal.

O handoff clinico para recepcao deve ser tratado como frente propria da UX operacional. Ele e a devolucao formal do atendimento da clinica para recepcao/financeiro, com resumo, pendencias, proximo responsavel e origem de cobranca visiveis. O pre-handoff visual atual no `Encounter` ajuda a conferencia, mas nao substitui handoff real persistido, state machine, confirmacao de recebimento ou trilha auditavel.

As jornadas devem ser separadas por papel operacional. Recepcao, veterinario clinico, internacao, laboratorio, imagem, cirurgia, especialidades e financeiro nao trabalham da mesma forma e nao devem receber a mesma experiencia de tela.

O objetivo desta frente e reduzir:

- confusao operacional;
- excesso de botoes;
- cabecalhos carregados;
- fragmentacao entre modulos;
- perda de contexto entre recepcao, clinica, exames, comanda e cobranca.

Este documento ainda e uma diretriz executiva. Ele nao e PRD final, nao e SPEC tecnica, nao define contrato de API, nao define schema de banco e nao autoriza implementacao.

## 1. Objetivo

Reorientar a experiencia do `cvg-his-v2` para uso operacional real, separando jornadas por colaborador e reduzindo a interface atual, que esta visualmente carregada e pouco clara em pontos criticos.

O foco desta frente nao e criar novos modulos isolados. O foco e fazer o ERP funcionar como uma ferramenta integrada de trabalho diario.

## 2. Decisao de produto

O sistema deve ser desenhado por jornada, nao por tela.

O sistema nao deve ser organizado primeiro por CRUD. CRUD e uma necessidade tecnica e administrativa, mas nao e a forma como a operacao pensa durante o dia.

O sistema deve ser organizado por responsabilidade operacional:

- quem precisa agir agora;
- o que ja foi feito;
- o que esta pendente;
- quem e o responsavel atual;
- qual e o proximo passo;
- para qual setor o caso deve ir.

Cada usuario deve enxergar rapidamente:

- o que precisa fazer agora;
- o que ja foi concluido;
- o que esta bloqueado;
- o que foi enviado para outro setor;
- o que voltou para sua responsabilidade.

Telas devem servir a jornada, nao o contrario. Uma tela tecnicamente correta, mas desconectada do fluxo global, nao resolve o problema operacional.

Jornadas prioritarias:

1. Recepcao.
2. Veterinario clinico.
3. Internacao.
4. Financeiro/comanda.
5. Laboratorio e exames.

## 3. Direcao visual

Direcao desejada:

- mais alema, sobria, precisa e funcional;
- menos ludica, menos arredondada, menos decorativa;
- menos emojis e botoes simultaneos;
- mais hierarquia, trilha, contexto e proximos passos;
- premium discreto, pela organizacao e pela ergonomia.

## 4. Decisoes estruturais

### 4.1 Queue como centro operacional

A `Queue` deve ser a esteira central da operacao. Ela nao deve ser apenas uma lista de espera.

A `Queue` e a representacao do trabalho vivo do hospital. Ela deve mostrar o que esta acontecendo agora e permitir leitura rapida da situacao operacional.

Cada item da `Queue` deve ter:

- dono atual;
- setor atual;
- proximo destino;
- status operacional;
- origem;
- horario relevante;
- motivo do atendimento ou demanda.

Ela deve representar:

- entrada;
- aguardando recepcao;
- aguardando atendimento;
- em atendimento;
- aguardando exames;
- aguardando orcamento;
- aguardando aprovacao;
- aguardando finalizacao clinica;
- aguardando cobranca;
- em cobranca;
- fechado;
- cancelado;
- encaminhado para setor especializado.

### 4.1.1 Estados operacionais candidatos

Lista inicial, ainda nao definitiva:

- `draft` / `entrada_incompleta`;
- `aguardando_recepcao`;
- `aguardando_atendimento`;
- `em_atendimento`;
- `aguardando_exames`;
- `aguardando_orcamento`;
- `aguardando_aprovacao`;
- `aguardando_finalizacao_clinica`;
- `aguardando_cobranca`;
- `em_cobranca`;
- `fechado`;
- `cancelado`;
- `encaminhado_setor_especializado`.

Os nomes finais, transicoes permitidas, regras de bloqueio e efeitos colaterais devem ser validados em SPEC proprio. Esta lista serve apenas como base executiva para discovery e modelagem.

### 4.2 Encounter como item da Queue

O `Encounter` deve ser tratado como item operacional da fila.

Ele nao deve ser visto apenas como prontuario ou registro clinico. Ele tambem e uma unidade operacional rastreavel, que conecta recepcao, atendimento, documentos, exames, orcamento, comanda, internacao, prescricao e financeiro.

Um `Encounter` pode originar:

- exames;
- orcamento;
- comanda;
- internacao;
- prescricao;
- receita;
- encaminhamento;
- retorno;
- cobranca;
- comunicacao com tutor.

Todo `Encounter` precisa ter contexto minimo suficiente para qualquer setor entender o caso sem depender de conversa paralela.

Campos candidatos para analise, nao contrato tecnico final:

- `queueItemId`;
- `encounterId`;
- `ownerId` / `tutorId`;
- `patientId`;
- `currentSector`;
- `currentOwner`;
- `nextResponsibleSector`;
- `originChannel`;
- `reason` / `chiefComplaint`;
- `priority`;
- `operationalStatus`;
- `clinicalStatus`;
- `billingStatus`;
- `createdAt`;
- `updatedAt`.

Um item deve carregar, no minimo:

- setor/esteira;
- origem;
- responsavel que enviou;
- tutor;
- animal, quando existir;
- horario;
- motivo do atendimento;
- status;
- proxima responsabilidade.

Os campos finais devem ser definidos em SPEC tecnica propria, depois da validacao do modelo operacional.

### 4.3 Busca operacional ampla

A busca deve aceitar:

- ID;
- telefone;
- RG;
- CPF;
- nome do tutor;
- nome do animal;
- codigo interno do paciente, quando existir.

### 4.4 Comanda e venda

Regras propostas:

- Comanda de retorno pode existir com ou sem animal presente.
- Venda de produto de balcao pode ser desconectada da comanda de atendimento.
- Venda de servico deve abrir comanda de atendimento ou lead operacional rastreavel.
- Venda de balcao com comanda aberta pode gerar historico e lead para o hospital.

### 4.5 Orcamento

Orcamento nao deve depender sempre do atendimento presencial.

Deve ser possivel criar orcamento por:

- WhatsApp;
- telefone;
- conversa presencial sem animal;
- atendimento clinico;
- retorno de caso.

O orcamento pode virar atendimento, comanda ou agendamento depois.

### 4.6 Agenda como coluna dorsal temporal

A Agenda nao deve ser apenas calendario. Ela deve ser a camada que organiza trabalho futuro e distribui demanda para a operacao.

Ela deve cobrir situacoes em que o cliente entra em contato por WhatsApp, telefone ou presencialmente, com ou sem animal, para marcar:

- consulta;
- retorno;
- coleta de exame de sangue;
- ultrassom;
- raio-x;
- procedimento;
- atendimento com especialista.

A Agenda deve permitir:

- cadastro ou selecao de tutor;
- cadastro ou selecao de animal;
- selecao do tipo de agendamento;
- definicao do profissional ou especialista responsavel;
- definicao do setor, como clinica, ultrassom, raio-x, laboratorio ou especialidade;
- timestamp completo do agendamento;
- notas de agendamento;
- labels operacionais;
- log de criacao, confirmacao, cancelamento, exclusao e alteracoes;
- estados como `pendente`, `confirmado`, `cancelado` e `excluido`;
- acesso rapido ao cadastro do cliente;
- acesso rapido ao prontuario do animal;
- conversao do agendamento em item da `Queue` quando o paciente chegar.

Regra executiva:

- a `Queue` organiza o agora;
- a Agenda organiza o futuro;
- no dia e horario do atendimento, a Agenda deve alimentar a `Queue`;
- Agenda e `Queue` devem operar juntas, nao como modulos desconectados.

## 5. Cabecalho contextual

O cabecalho das paginas principais deve deixar de ser uma area cheia de botoes.

Modelo alvo:

- esquerda: trilha clicavel da jornada, exemplo `Inicio > Cliente > Animal > Atendimento > Anamnese`;
- centro ou segunda linha: contexto minimo, quando necessario;
- direita: proximos passos sugeridos, exemplo `Receita`, `Exames`, `Internacao`, `Orcamento`, `Enviar para recepcao`.

Regra executiva:

- o cabecalho deve dizer onde o usuario esta e para onde ele pode ir;
- nao deve tentar mostrar todas as acoes possiveis ao mesmo tempo;
- proximos passos devem ser contextuais;
- a CTA primaria deve mover a jornada global.

## 6. Jornada da recepcao

Fluxo base:

1. Buscar ou cadastrar tutor.
2. Buscar ou cadastrar animal, quando houver animal.
3. Criar entrada, retorno, orcamento, venda, atendimento ou agendamento.
4. Quando for agendamento, definir tipo, setor, profissional, data/hora completa, notas e estado inicial.
5. Abrir comanda quando o caso exigir.
6. Criar ou atualizar `Encounter` como item da `Queue` quando houver execucao operacional imediata ou no momento de chegada do paciente agendado.
7. Enviar para esteira correta.
8. Receber de volta da clinica ou setor.
9. Conferir orcamento, itens, documentos e pendencias.
10. Lancar comanda.
11. Cobrar.
12. Registrar venda de balcao, se houver.
13. Fechar comanda.

## 7. Jornada do veterinario clinico

Fluxo base:

1. Pegar ficha na `Queue`.
2. Abrir prontuario.
3. Registrar anamnese e ficha de atendimento.
4. Gerar desdobramentos clinicos:
   - exame;
   - guia;
   - coleta;
   - medicacao aplicada;
   - prescricao;
   - receita;
   - orcamento;
   - internacao;
   - encaminhamento.
5. Enviar para recepcao ou setor especializado.

## 8. Fluxos especializados

Nao devem ser derivados cegamente do atendimento clinico comum.

Precisam de desenho proprio:

- internacao;
- cirurgia;
- ultrassom;
- raio-x;
- especialidades;
- exames laboratoriais.

Cada fluxo pode ter fila, tela de trabalho e estados proprios. Isso nao significa que pode virar um sistema isolado.

Todos os fluxos especializados devem manter vinculo, quando aplicavel, com:

- tutor;
- paciente;
- `Encounter`;
- `Queue`;
- prontuario;
- financeiro/comanda;
- recepcao.

Cada fluxo deve ter:

- status proprios;
- fila ou etapa propria;
- tela de trabalho propria;
- retorno claro para recepcao, prontuario ou financeiro;
- rastreabilidade de origem e destino.

## 8.1 Handoff clinico para recepcao

O handoff clinico e uma frente futura obrigatoria para fechar a continuidade entre veterinario, recepcao, financeiro, exames, prescricoes e fechamento operacional.

O objetivo nao e apenas adicionar um botao `Enviar para recepcao`. O objetivo e garantir que, ao concluir a parte clinica, o caso volte para recepcao com:

- resumo clinico-operacional;
- pendencias clinicas;
- pendencias financeiras;
- exames solicitados ou pendentes;
- prescricoes/receitas a entregar;
- orientacao ao tutor;
- proximo setor;
- responsavel atual ou setor dono;
- origem clara de itens cobraveis.

O pre-handoff visual atual no `Encounter` e apenas preparacao. Ele nao altera estado, nao envia o caso automaticamente, nao cria handoff persistido, nao atualiza `Queue`, nao confirma recebimento pela recepcao e nao autoriza BUILD.

Antes de qualquer implementacao, a frente de handoff depende de:

- SPEC de produto validada;
- state machine aprovada;
- decisao se o handoff sera entidade propria, evento, estado da `Queue`, extensao do `Encounter` ou combinacao;
- definicao de inbox/visao de recepcao;
- API futura aprovada;
- backlog faseado aprovado.

## 9. Criterio de sucesso

A frente sera considerada bem desenhada quando:

- recepcao souber sempre qual e o proximo caso a resolver;
- veterinario souber sempre onde esta no atendimento;
- `Queue` representar o trabalho real;
- cabecalho contextual reduzir confusao;
- comanda, orcamento e atendimento estiverem conectados;
- CTAs moverem a jornada global, nao apenas telas isoladas;
- nenhum item critico ficar sem dono;
- usuario entender o proximo passo em poucos segundos;
- recepcao conseguir operar o dia pela `Queue`;
- recepcao conseguir operar agenda e `Queue` como uma linha continua de trabalho;
- veterinario conseguir registrar atendimento sem navegar por modulos desconectados;
- financeiro souber exatamente o que cobrar e de onde veio a cobranca.

## 10. Guardrail

Este plano ainda nao autoriza implementacao.

Este documento:

- nao autoriza codigo;
- nao autoriza migration;
- nao autoriza componente;
- nao autoriza alteracao de rota;
- nao autoriza tela nova;
- nao define contrato tecnico final;
- nao substitui PRD;
- nao substitui SPEC.

Ele orienta discovery, auditoria, PRD, SPEC, roadmap e backlog. Codigo so deve ser alterado apos aprovacao explicita do responsavel em etapa futura.

Este documento deve gerar documentos filhos. Proximos documentos recomendados:

- `881-roadmap-ux-operacional.md`;
- `882-backlog-ux-operacional.md`;
- `883-auditoria-ui-atual-ux-operacional.md`;
- `884-brief-visual-operacional.md`;
- `885-spec-cabecalho-contextual.md`;
- `886-modelo-operacional-queue-encounter.md`;
- `887-prd-jornada-recepcao.md`;
- `888-prd-jornada-veterinario-clinico.md`;
- `889-roadmap-fluxos-especializados.md`;
- `890-plano-validacao-operacional.md`;
- `891-spec-handoff-clinico-recepcao.md`;
- `892-state-machine-handoff-operacional.md`;
- `893-prd-inbox-recepcao-finalizacao.md`;
- `894-spec-api-handoff-clinico.md`;
- `895-backlog-handoff-clinico.md`.

## 11. Responsabilidade operacional

Cada item operacional deve ter um responsavel atual.

A responsabilidade pode estar em:

- pessoa;
- equipe;
- setor.

O sistema deve evitar itens "sem dono". Quando um setor envia para outro, o proximo responsavel deve ficar explicito.

A recepcao precisa enxergar o que voltou da clinica, exames, internacao ou financeiro. A coordenacao precisa conseguir identificar gargalos e itens parados.

| Situacao | Responsavel atual | Proximo responsavel provavel |
| --- | --- | --- |
| Entrada recem-criada | Recepcao | Veterinario ou financeiro |
| Atendimento em andamento | Veterinario | Recepcao, exames ou internacao |
| Exame solicitado | Laboratorio/imagem | Veterinario ou recepcao |
| Atendimento finalizado | Recepcao | Financeiro |
| Comanda em cobranca | Financeiro/caixa | Fechamento |

## 12. Regras de transicao a definir em SPEC

Este documento nao define a maquina de estados final.

A SPEC futura deve responder:

- quem pode mover um item de um estado para outro;
- quais campos sao obrigatorios antes da transicao;
- quais transicoes sao bloqueadas;
- como lidar com cancelamento;
- como lidar com desistenca do tutor;
- como lidar com atendimento sem animal;
- como lidar com orcamento sem atendimento;
- como lidar com venda de balcao;
- como lidar com retorno clinico;
- como lidar com cobranca parcial ou pendente.

Exemplos de perguntas que a SPEC deve resolver:

- pode cobrar antes do veterinario finalizar?
- pode fechar comanda com pendencia clinica?
- pode criar orcamento sem tutor cadastrado?
- pode abrir atendimento sem paciente?
- pode enviar para exames sem `Encounter` ativo?

## 13. Excecoes operacionais

Casos que precisam ser previstos em PRD/SPEC:

- tutor sem CPF/RG;
- animal ainda nao cadastrado;
- atendimento emergencial com cadastro incompleto;
- cliente desiste antes da consulta;
- cliente desiste apos orcamento;
- venda avulsa sem animal;
- orcamento feito por WhatsApp;
- retorno sem animal presente;
- erro de cadastro duplicado;
- atendimento aberto por engano;
- comanda aberta sem fechamento;
- exame solicitado e nao realizado;
- pagamento pendente.

Cada excecao devera virar regra, fluxo, criterio de aceite ou caso de teste em PRD/SPEC proprio.

## 14. Prioridade, urgencia e SLA

A `Queue` precisa diferenciar:

- rotina;
- retorno;
- urgencia;
- emergencia.

Itens antigos devem gerar alerta. Prioridade deve influenciar ordenacao. SLA operacional deve ser visivel para recepcao e coordenacao.

Este documento nao define os tempos finais de SLA.

Campos candidatos para analise, nao contrato tecnico final:

- `priority`;
- `urgencyLevel`;
- `waitingSince`;
- `slaTargetAt`;
- `isOverdue`;
- `escalationReason`.

## 15. Proximos artefatos recomendados

1. Documento formal da `Queue` e `Encounter`.
2. Documento formal da Agenda operacional integrada a `Queue`.
3. Maquina de estados operacional.
4. PRD por jornada.
5. SPEC tecnica de dados e API.
6. Backlog por fases.
7. Auditoria de telas atuais.
8. Plano de microconstrucao.
