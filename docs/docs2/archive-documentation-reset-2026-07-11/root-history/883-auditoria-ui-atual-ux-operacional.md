# 883 - Auditoria UI Atual de UX Operacional

Data: 2026-04-28
Status: auditoria documental inicial, pendente walkthrough visual aprovado
Origem: `docs/2026-04-28-mapa-auditoria-fluxos-ux-operacional.md`, `docs/880-plano-executivo-ux-operacional.md`, `docs/881-roadmap-ux-operacional.md`, `docs/882-backlog-ux-operacional.md`

## 0. Guardrail

Este documento nao autoriza implementacao.

Esta auditoria nao executou build, nao iniciou servidor, nao instalou dependencias e nao alterou codigo. Ela consolida achados documentais e hipoteses operacionais para orientar validacao visual futura.

Toda recomendacao marcada como BUILD futuro permanece bloqueada ate PRD/SPEC aprovado e autorizacao explicita do responsavel.

Agentes nao devem alterar codigo, criar componentes, editar rotas, criar migrations ou implementar telas com base neste documento.

## 0.1 Resumo executivo da auditoria

O `cvg-his-v2` ja possui superficie ampla de ERP hospitalar, mas a experiencia atual tende a ser orientada por modulos e telas isoladas, e nao por jornadas reais da operacao veterinaria.

A auditoria identifica excesso de acoes simultaneas, excesso de cards, headers carregados e CTAs que muitas vezes parecem resolver a tela local, mas nao movem a jornada global. Isso aumenta carga cognitiva em pontos criticos como recepcao, fila, prontuario, exames, comanda e financeiro.

As lacunas mais relevantes sao a falta de clareza sobre:

- responsavel atual;
- proximo passo;
- estado operacional;
- setor atual;
- proximo setor;
- origem da cobranca;
- pendencias clinicas, financeiras e documentais.

A principal ruptura de produto e transformar o sistema em uma esteira operacional via `Queue` + `Encounter`. A `Queue` deve representar o trabalho vivo do hospital, e o `Encounter` deve carregar o item operacional que atravessa recepcao, clinica, exames, internacao, comanda e financeiro.

Nenhuma recomendacao deste documento autoriza implementacao. A auditoria serve para gerar discovery, PRD, SPEC, validacao operacional e backlog futuro. BUILD permanece bloqueado.

## 1. Objetivo

Listar telas criticas e problemas provaveis de UI/UX que impedem o `cvg-his-v2` de operar como esteira hospitalar integrada.

O foco desta auditoria:

- excesso de botoes;
- excesso de cards;
- headers carregados;
- CTAs ruins ou genericas;
- telas sem proximo passo claro;
- telas sem responsavel atual;
- fragmentacao entre recepcao, clinica, financeiro, exames e internacao.

## 2. Metodo

Camadas usadas nesta auditoria:

| Camada | Pergunta |
| --- | --- |
| Jornada | A tela move o caso para a proxima etapa operacional? |
| Responsabilidade | O usuario sabe quem e dono atual do item? |
| Proximo passo | Existe CTA primaria clara? |
| Densidade | A tela ajuda uso diario ou dispersa informacao? |
| Visual | A tela parece ERP hospitalar sobrio ou interface decorativa? |

Limitacao: esta versao ainda nao contem screenshots novos. A validacao final deve incluir walkthrough read-only e evidencias visuais por tela.

## 3. Priorizacao

| Prioridade | Criterio |
| --- | --- |
| P0 | Afeta porta de entrada, seguranca clinica, cobranca ou continuidade operacional |
| P1 | Gera retrabalho frequente ou perda de contexto entre setores |
| P2 | Afeta clareza visual, mas nao bloqueia fluxo critico |
| P3 | Refinamento visual ou copy |

## 3.1 Criticidade operacional

| Nivel | Definicao |
| --- | --- |
| Critico | Pode causar erro clinico, perda financeira ou quebra do fluxo |
| Alto | Gera retrabalho constante ou perda de contexto |
| Medio | Reduz eficiencia |
| Baixo | Refinamento |

## 4. Telas criticas auditadas

### 4.1 Recepcao / entrada operacional

| Campo | Registro |
| --- | --- |
| URL/tela | `/owners`, `/patients`, `/appointments`, `/queue` |
| Problema | Entrada do cliente tende a se dividir entre cadastros, agenda e fila, sem uma superficie unica de recepcao rapida. |
| Tipo de problema | Fragmentacao de fluxo; sistema orientado por modulo; falta de esteira operacional. |
| Sintoma operacional | Recepcao precisa procurar tutor, animal, agenda e fila em locais diferentes antes de colocar o caso para andar. |
| Impacto operacional | Recepcao pode gastar tempo navegando entre tutor, animal, agenda, fila e comanda antes de colocar o caso em atendimento. |
| Descricao visual | Experiencia provavel de telas isoladas por entidade, com header de pagina e acoes locais que nao explicam a jornada completa. |
| Regra violada | Toda tela operacional deve indicar proximo passo; entrada deve gerar ou atualizar item rastreavel na `Queue`. |
| Prioridade | P0 |
| Criticidade | Critico |
| Acao recomendada (nivel) | PRD: criar PRD da jornada da recepcao cobrindo UX-030 a UX-039 antes de qualquer BUILD. |
| Backlog relacionado | UX-030, UX-031, UX-032, UX-036, UX-037, UX-039, UX-DEV-003 bloqueado |
| Recomendacao | Definir PRD da jornada da recepcao (UX-030 a UX-039) antes de BUILD. A futura especificacao deve priorizar busca ampla, cadastro minimo, criacao de `Encounter` e envio para `Queue`. |

### 4.2 Queue / fila operacional

| Campo | Registro |
| --- | --- |
| URL/tela | `/queue` |
| Problema | A fila precisa deixar de ser lista de espera e passar a representar a esteira operacional completa. |
| Tipo de problema | Falta de dono; falta de estado operacional; Queue ainda nao central como esteira. |
| Sintoma operacional | Equipes podem ver casos na fila sem saber quem deve agir agora, para onde enviar e o que esta bloqueado. |
| Impacto operacional | Sem responsavel atual, proximo setor e status claro, cada area depende de comunicacao informal para saber o que fazer. |
| Descricao visual | Risco de cards/linhas com informacao insuficiente para decisao: tutor, animal e horario podem aparecer sem dono, pendencia e proximo passo. |
| Regra violada | Todo item operacional deve ter dono atual, estado operacional, setor atual e proximo passo. |
| Prioridade | P0 |
| Criticidade | Critico |
| Acao recomendada (nivel) | SPEC: formalizar modelo operacional de `Queue` e `Encounter`, estados, filtros, responsaveis e SLA. |
| Backlog relacionado | UX-020, UX-021, UX-022, UX-023, UX-024, UX-025, UX-026, UX-027, UX-029, UX-DEV-002 bloqueado |
| Recomendacao | Usar `886-modelo-operacional-queue-encounter.md` como base. Antes de BUILD, validar estados, filtros, responsavel atual, proximo responsavel, prioridade, SLA e transicoes candidatas. |

### 4.3 Prontuario / atendimento clinico

| Campo | Registro |
| --- | --- |
| URL/tela | `/medical-records`, `/encounters`, `/triage` |
| Problema | Prontuario pode concentrar informacao clinica, historico e acoes sem separar etapa atual, conduta e proximo passo. |
| Tipo de problema | Excesso de informacao; excesso de CTA; falta de continuidade da jornada clinica. |
| Sintoma operacional | Veterinario precisa decidir entre muitas acoes clinicas e administrativas sem uma trilha clara do atendimento ativo. |
| Impacto operacional | Veterinario pode perder tempo entre modulos para anamnese, exame fisico, exames, prescricao, receita, orcamento e devolucao para recepcao. |
| Descricao visual | Risco de header carregado, muitos cards clinicos simultaneos e acoes concorrentes como salvar, prescrever, solicitar exame e cobrar. |
| Regra violada | A tela clinica deve ter cockpit orientado por atendimento, CTA primaria unica e retorno explicito para recepcao. |
| Prioridade | P0 |
| Criticidade | Critico |
| Acao recomendada (nivel) | PRD: criar PRD da jornada do veterinario clinico cobrindo UX-040 a UX-049. |
| Backlog relacionado | UX-040, UX-041, UX-042, UX-043, UX-044, UX-045, UX-046, UX-047, UX-049, UX-DEV-004 bloqueado |
| Recomendacao | Criar PRD do cockpit clinico (UX-040 a UX-049). Header contextual deve destacar trilha, paciente, status, pendencias e CTA de devolucao/continuidade. |

### 4.4 Prescricoes e execucoes

| Campo | Registro |
| --- | --- |
| URL/tela | `/prescriptions`, `/prescription-executions` |
| Problema | Prescricao para casa, medicacao aplicada e execucao assistencial podem parecer fluxos separados sem contexto do `Encounter`. |
| Tipo de problema | Fragmentacao clinica; falta de rastreabilidade; fluxo quebrado entre conduta e execucao. |
| Sintoma operacional | Equipe pode nao distinguir claramente o que foi aplicado no atendimento, prescrito para casa ou pendente de execucao. |
| Impacto operacional | Risco de duplicidade, baixa rastreabilidade e dificuldade de saber o que foi aplicado, prescrito, pendente ou cobrado. |
| Descricao visual | Risco de tabelas/cards por modulo com CTAs locais, sem indicar se a acao pertence ao atendimento ativo. |
| Regra violada | Acoes clinicas devem nascer do atendimento ativo e carregar contexto de `Encounter`. |
| Prioridade | P1 |
| Criticidade | Alto |
| Acao recomendada (nivel) | PRD: separar medicacao aplicada, prescricao para casa e execucao assistencial no PRD veterinario. |
| Backlog relacionado | UX-041, UX-043, UX-044, UX-048, UX-049, UX-DEV-004 bloqueado |
| Recomendacao | Detalhar no PRD do veterinario clinico (UX-041, UX-043, UX-044) a separacao entre aplicado no atendimento, prescrito para casa e execucao interna. BUILD bloqueado ate regra aprovada. |

### 4.5 Diagnosticos, pedidos e resultados de exames

| Campo | Registro |
| --- | --- |
| URL/tela | `/diagnostics`, `/exam-orders`, `/exam-results`, `/laboratory/orders`, `/laboratory/results` |
| Problema | Exames podem aparecer como modulo tecnico isolado, sem linha de status ponta a ponta. |
| Tipo de problema | Fluxo isolado; falta de rastreabilidade; estado operacional incompleto. |
| Sintoma operacional | Veterinario, laboratorio e recepcao podem consultar telas diferentes para entender se o exame foi pedido, coletado, analisado ou liberado. |
| Impacto operacional | Veterinario, laboratorio e recepcao podem nao saber se o exame foi solicitado, coletado, em analise, liberado ou pendente de cobranca. |
| Descricao visual | Risco de excesso de cards por tipo de exame e falta de CTA primaria por etapa tecnica. |
| Regra violada | Todo pedido deve ser rastreavel da origem ao resultado, com estado operacional visivel. |
| Prioridade | P1 |
| Criticidade | Alto |
| Acao recomendada (nivel) | Discovery/SPEC: mapear fluxo laboratorio e imagem antes de BUILD especializado. |
| Backlog relacionado | UX-042, UX-050, UX-051, UX-052, UX-055, UX-056 |
| Recomendacao | Criar discovery de laboratorio/imagem ligado a UX-051 e UX-052. Header contextual deve mostrar origem, etapa tecnica, responsavel e retorno ao responsavel clinico. |

### 4.6 Internacao

| Campo | Registro |
| --- | --- |
| URL/tela | `/inpatient`, `/inpatient/board`, `/beds`, `/sectors`, `/discharges` |
| Problema | Mapa de internacao pode ser visualmente rico, mas insuficiente como painel de comando se nao mostrar pendencias, responsavel e proxima medicacao. |
| Tipo de problema | Densidade mal orientada; falta de dono; falta de prioridade assistencial. |
| Sintoma operacional | Equipe pode enxergar leitos, mas nao identificar rapidamente pendencias, riscos e proximas acoes por paciente. |
| Impacto operacional | Risco assistencial por baixa visibilidade de pendencias, prescricoes, evolucao, alta e status do leito. |
| Descricao visual | Risco de cards grandes por leito, sinais visuais decorativos e pouca densidade operacional. |
| Regra violada | Painel operacional deve destacar pendencia, responsavel, criticidade e proxima acao, nao apenas status visual. |
| Prioridade | P1 |
| Criticidade | Alto |
| Acao recomendada (nivel) | PRD futuro: mapear internacao como fluxo especializado antes de BUILD. |
| Backlog relacionado | UX-050, UX-055, UX-056 |
| Recomendacao | Criar PRD futuro de internacao vinculado a UX-050, definindo estados proprios e retorno para recepcao/financeiro, sem isolar do `Encounter`. |

### 4.7 Comanda e caixa

| Campo | Registro |
| --- | --- |
| URL/tela | `/counter-sales`, `/sales`, `/billing`, `/cash` |
| Problema | Financeiro pode ser percebido como modulo separado da origem clinica ou operacional dos itens. |
| Tipo de problema | Falta de origem da cobranca; fragmentacao financeiro-clinica; risco de fechamento incompleto. |
| Sintoma operacional | Caixa pode cobrar sem entender de onde vieram os itens, quais pendencias existem e se a clinica realmente finalizou. |
| Impacto operacional | Itens cobraveis podem ser esquecidos, cobrados em duplicidade ou fechados sem pendencias clinicas e documentais visiveis. |
| Descricao visual | Risco de CTAs focadas em venda/caixa sem trilha de origem: atendimento, exame, internacao, produto de balcao ou servico. |
| Regra violada | Cobranca deve exibir origem, pendencias, status financeiro e proximo passo antes de fechamento. |
| Prioridade | P0 |
| Criticidade | Critico |
| Acao recomendada (nivel) | PRD/SPEC: detalhar finalizacao pos-clinica e cobranca na jornada da recepcao. |
| Backlog relacionado | UX-034, UX-035, UX-036, UX-038, UX-039, UX-064, UX-DEV-003 bloqueado |
| Recomendacao | Cabecalho contextual deve exibir origem da cobranca e pendencias. PRD da recepcao deve detalhar finalizacao pos-clinica, cobranca, venda de balcao e pendencias (UX-034 a UX-039). |

### 4.8 Venda de balcao

| Campo | Registro |
| --- | --- |
| URL/tela | `/counter-sales` |
| Problema | Venda de produto e venda de servico podem receber o mesmo tratamento visual e operacional. |
| Tipo de problema | Regra operacional ambigua; CTA generica; risco de fluxo incorreto. |
| Sintoma operacional | Recepcao pode tratar produto avulso como atendimento ou vender servico sem rastreabilidade operacional. |
| Impacto operacional | Produto avulso pode ser obrigado a fluxo clinico; servico pode ser vendido sem rastreabilidade de atendimento ou lead. |
| Descricao visual | Risco de CTA generica de venda, sem perguntar se o caso deve gerar `Encounter`, comanda de atendimento ou venda avulsa. |
| Regra violada | Produto de balcao e servico devem ter tratamentos operacionais diferentes. |
| Prioridade | P1 |
| Criticidade | Alto |
| Acao recomendada (nivel) | PRD: especificar venda de produto, venda de servico e venda vinculada a comanda. |
| Backlog relacionado | UX-034, UX-035, UX-038, UX-039 |
| Recomendacao | PRD da recepcao deve separar venda de produto de balcao (UX-034), venda de servico (UX-035) e venda vinculada a comanda aberta. |

### 4.9 Orcamentos

| Campo | Registro |
| --- | --- |
| URL/tela | Orcamento em recepcao, atendimento clinico, comanda ou modulo comercial a confirmar |
| Problema | Orcamento pode estar preso ao atendimento presencial ou ao financeiro, sem fluxo isolado para WhatsApp, telefone ou conversa sem animal. |
| Tipo de problema | Fluxo comercial quebrado; dependencia indevida de atendimento presencial; falta de rastreabilidade. |
| Sintoma operacional | Equipe pode montar orcamentos fora do fluxo ou depender de comunicacao informal para transformar aprovacao em atendimento/comanda. |
| Impacto operacional | Perda de oportunidade comercial e baixa rastreabilidade de aprovacoes que viram atendimento, comanda ou agendamento. |
| Descricao visual | Risco de orcamento aparecer como acao secundaria escondida ou como fluxo financeiro pesado para uma decisao rapida. |
| Regra violada | Orcamento pode existir como jornada operacional propria e deve ter origem, responsavel e destino. |
| Prioridade | P1 |
| Criticidade | Alto |
| Acao recomendada (nivel) | Discovery/PRD: validar orcamento isolado e orcamento clinico antes de SPEC. |
| Backlog relacionado | UX-005, UX-033, UX-045, UX-038 |
| Recomendacao | Validar regra de orcamento isolado no PRD da recepcao (UX-033) e orcamento clinico no PRD veterinario (UX-045). |

### 4.10 Agenda

| Campo | Registro |
| --- | --- |
| URL/tela | `/appointments` |
| Problema | Agenda pode organizar horarios, mas nao necessariamente conduzir check-in, `Encounter` e `Queue`. |
| Tipo de problema | Continuidade de jornada incompleta; modulo desconectado da esteira. |
| Sintoma operacional | Atendimento agendado pode exigir nova acao manual para virar entrada operacional. |
| Impacto operacional | Atendimento agendado pode exigir repeticao de cadastro ou entrada manual na fila. |
| Descricao visual | Risco de tela orientada a calendario com CTA local, sem continuidade clara para recepcao e fila. |
| Regra violada | Agendamento que chega deve virar entrada operacional rastreavel sem recadastro desnecessario. |
| Prioridade | P1 |
| Criticidade | Alto |
| Acao recomendada (nivel) | PRD: mapear check-in e entrada a partir de agendamento na jornada da recepcao. |
| Backlog relacionado | UX-030, UX-031, UX-036, UX-039 |
| Recomendacao | Recepcao deve tratar agendamento como origem possivel da entrada operacional. Validar check-in e continuidade para `Queue` no PRD da recepcao (UX-030, UX-036). |

### 4.11 Clientes e animais

| Campo | Registro |
| --- | --- |
| URL/tela | `/owners`, `/patients` |
| Problema | Cadastros completos podem competir com entrada rapida. |
| Tipo de problema | CRUD isolado; excesso de campos; friccao de entrada. |
| Sintoma operacional | Recepcao pode atrasar o atendimento tentando completar cadastro antes de resolver o caso. |
| Impacto operacional | Recepcao pode atrasar atendimento ao preencher campos nao essenciais antes de resolver a chegada. |
| Descricao visual | Risco de formularios ou listas administrativas sem modo de cadastro minimo progressivo. |
| Regra violada | Entrada operacional deve permitir cadastro minimo progressivo quando permitido por regra. |
| Prioridade | P1 |
| Criticidade | Alto |
| Acao recomendada (nivel) | PRD/SPEC: diferenciar cadastro minimo operacional de cadastro administrativo completo. |
| Backlog relacionado | UX-030, UX-031, UX-039 |
| Recomendacao | PRD da recepcao deve diferenciar cadastro minimo operacional de cadastro administrativo completo, com busca ampla e prevencao de duplicidade (UX-030, UX-031). |

### 4.12 Navegacao e shell

| Campo | Registro |
| --- | --- |
| URL/tela | Shell global, navegacao lateral, topbar |
| Problema | Menu com muitos itens, emojis, labels longos e grupos amplos pode reforcar navegacao por modulo isolado. |
| Tipo de problema | Navegacao por modulo; excesso visual; linguagem operacional inconsistente. |
| Sintoma operacional | Usuario procura telas em uma arvore grande, em vez de seguir uma jornada de trabalho. |
| Impacto operacional | Usuario procura telas em vez de seguir jornada. Acoes recorrentes ficam dispersas. |
| Descricao visual | Conforme mapa de auditoria, ha risco de excesso de emojis, gradientes, brilho, glassmorphism, pills e decoracao. |
| Regra violada | Navegacao operacional deve priorizar jornada, clareza e sobriedade visual. |
| Prioridade | P2 |
| Criticidade | Medio |
| Acao recomendada (nivel) | Discovery/SPEC: criar brief visual operacional e checklist de navegacao antes de BUILD visual. |
| Backlog relacionado | UX-012, UX-015, UX-016, UX-060, UX-DEV-005 bloqueado |
| Recomendacao | Criar brief visual operacional ligado a UX-012, UX-015, UX-016 e UX-060 antes de BUILD visual. Reduzir decoracao e priorizar atalhos de jornada somente quando autorizado. |

### 4.13 Headers de paginas principais

| Campo | Registro |
| --- | --- |
| URL/tela | Headers em fila, recepcao, prontuario, comanda, financeiro, laboratorio e internacao |
| Problema | Header pode concentrar breadcrumbs, contexto, varias acoes e botoes simultaneos. |
| Tipo de problema | Header carregado; excesso de CTA; ausencia de hierarquia de proximo passo. |
| Sintoma operacional | Usuario nao sabe se deve salvar, avancar, cobrar, voltar, imprimir ou enviar para outro setor. |
| Impacto operacional | Usuario nao identifica a CTA primaria nem o proximo passo da jornada. |
| Descricao visual | Area superior possivelmente carregada, com acoes concorrentes e pouca separacao entre localizacao, contexto e proximo passo. |
| Regra violada | Header deve separar trilha, contexto minimo, CTA primaria e proximos passos. |
| Prioridade | P0 |
| Criticidade | Critico |
| Acao recomendada (nivel) | SPEC: especificar cabecalho contextual e matriz de visibilidade por papel antes de BUILD. |
| Backlog relacionado | UX-010, UX-011, UX-013, UX-014, UX-017, UX-018, UX-019, UX-061, UX-DEV-001 bloqueado |
| Recomendacao | Usar `885-spec-cabecalho-contextual.md` como base para UX-010 a UX-019. Nenhuma alteracao em componente sem SPEC aprovada e autorizacao explicita. |

### 4.14 Relatorios e dashboards operacionais

| Campo | Registro |
| --- | --- |
| URL/tela | Relatorios administrativos, dashboards e hubs |
| Problema | Dashboards podem mostrar muitos cards sem indicar acao operacional. |
| Tipo de problema | Excesso de cards; metricas sem acao; monitoramento desconectado da fila. |
| Sintoma operacional | Gestao visualiza numeros, mas nao chega rapidamente aos itens parados, atrasados ou sem responsavel. |
| Impacto operacional | Gestao enxerga dados, mas nao necessariamente gargalos, responsaveis ou itens parados. |
| Descricao visual | Risco de cards decorativos e metricas sem proxima acao. |
| Regra violada | Indicador operacional deve permitir drill-down para fila, pendencia, responsavel ou proxima acao. |
| Prioridade | P2 |
| Criticidade | Medio |
| Acao recomendada (nivel) | Discovery/SPEC: definir padrao de dashboard operacional acionavel antes de redesign. |
| Backlog relacionado | UX-063, UX-064, UX-066, UX-068, UX-069 |
| Recomendacao | Relatorios devem diferenciar monitoramento de operacao. Cards devem levar a filas, pendencias ou listas acionaveis, conforme UX-063, UX-064, UX-066, UX-068 e UX-069. |

## 5. Matriz de problemas transversais

| Problema | Evidencia esperada no walkthrough | Risco | Recomendacao |
| --- | --- | --- | --- |
| Excesso de botoes | Mais de uma CTA primaria visual por tela | Erro operacional e indecisao | Aplicar SPEC do cabecalho contextual (UX-010 a UX-019) |
| Excesso de cards | Muitos blocos competindo no primeiro viewport | Perda de leitura rapida | Priorizar listas, tabelas e resumos compactos (UX-063, UX-066) |
| Header carregado | Breadcrumb, contexto e acoes misturados | Carga cognitiva | Separar trilha, contexto e proximos passos (UX-010, UX-017, UX-018) |
| CTA generica | `Salvar`, `Novo`, `Adicionar` sem efeito operacional claro | Usuario nao sabe impacto | Label deve indicar resultado da jornada (UX-013, UX-064) |
| Sem proximo passo | Tela termina sem acao de continuidade | Caso fica parado | Toda tela operacional precisa CTA de proximo setor/estado (UX-013, UX-068) |
| Sem responsavel atual | Fila ou item nao mostra dono | Itens sem dono e retrabalho | Exigir responsavel atual e proximo responsavel no modelo (UX-025, UX-069) |
| Modulos isolados | Clinica, exame, comanda e cobranca desconectados | Perda clinica/financeira | `Encounter` deve carregar contexto entre setores (UX-002, UX-021, UX-055) |
| Visual decorativo | Emojis, gradientes e cards grandes em area operacional | Percepcao pouco adulta e menor produtividade | Brief visual sobrio antes de BUILD (UX-012, UX-015, UX-060) |

## 5.1 Consolidacao dos principais problemas

### Problemas estruturais

- Sistema orientado por modulo, nao por jornada.
- Falta de esteira operacional central para recepcao, clinica, exames, financeiro e internacao.
- `Queue` ainda nao formalizada como centro operacional.
- `Encounter` ainda nao consolidado como item rastreavel que atravessa setores.
- Responsavel atual, proximo responsavel, setor atual e proximo setor ainda nao aparecem como linguagem comum da operacao.

### Problemas de UI

- Excesso de botoes no header e em areas de acao.
- Excesso de cards em telas operacionais que deveriam favorecer leitura rapida.
- Header carregado, misturando localizacao, contexto e acoes.
- Uso potencial de elementos decorativos em areas de produtividade diaria.
- Hierarquia visual insuficiente entre CTA primaria, secundaria e informacao de suporte.

### Problemas de fluxo

- Ausencia de proximo passo claro.
- Falta de dono operacional do item.
- CTAs genericas que nao indicam resultado operacional.
- Transicoes entre recepcao, clinica, exames, comanda e financeiro dependentes de interpretacao.
- Telas CRUD isoladas competindo com jornadas reais de trabalho.

## 5.2 Impacto por setor

| Setor | Problema principal | Impacto |
| --- | --- | --- |
| Recepcao | Fragmentacao de entrada | Lentidao, duplicidade de cadastro e erro de roteamento |
| Veterinario | Prontuario desorganizado | Perda de foco clinico e risco de pendencia sem retorno |
| Financeiro | Falta de origem da cobranca | Erro financeiro, item esquecido ou cobranca duplicada |
| Laboratorio | Fluxo isolado | Perda de rastreabilidade entre pedido, coleta, resultado e prontuario |
| Internacao | Pendencias pouco visiveis | Risco assistencial e baixa previsibilidade de alta |
| Coordenacao | Falta de dono e SLA | Dificuldade de identificar gargalos e itens parados |

## 6. Recomendacoes por tipo

### 6.1 Discovery

- Validar fluxo real de recepcao em 60 segundos, cobrindo UX-030 a UX-039.
- Validar como veterinario trabalha a partir da ficha, cobrindo UX-040 a UX-049.
- Validar origem e retorno de exames, cobrindo UX-051, UX-052, UX-055 e UX-056.
- Validar onde orcamento nasce e como vira comanda, cobrindo UX-005, UX-033 e UX-045.
- Validar quando atendimento sem animal deve existir, cobrindo UX-032 e UX-038.
- Validar quais telas atuais sao cadastros administrativos e quais devem virar jornadas operacionais, cobrindo UX-016 e UX-068.

### 6.2 PRD

- Criar PRD da jornada da recepcao cobrindo entrada com animal, entrada sem animal, retorno, orcamento, venda de balcao, finalizacao pos-clinica, cobranca e pendencia (UX-030 a UX-039).
- Criar PRD da jornada do veterinario clinico cobrindo pegar ficha, prontuario, anamnese, exame fisico, parametros vitais, suspeita diagnostica, exames, terapeutica, prescricao/receita, orcamento, encaminhamento e retorno para recepcao (UX-040 a UX-049).
- Criar PRD futuro de internacao com estados proprios, responsavel, pendencias, leito, alta e retorno financeiro (UX-050).
- Criar PRD futuro de laboratorio/imagem com pedido, coleta, analise, laudo e retorno ao prontuario (UX-051, UX-052).
- Criar PRD futuro financeiro/comanda integrado com origem da cobranca, pendencias e fechamento (UX-034, UX-035, UX-036, UX-038).

### 6.3 SPEC

- Especificar cabecalho contextual com trilha, contexto minimo, CTA primaria, CTAs secundarias e visibilidade por papel (UX-010 a UX-019).
- Formalizar modelo operacional de `Queue` e `Encounter`, com campos candidatos, estados, responsabilidades e dependencias (UX-020 a UX-029).
- Criar state machine operacional para transicoes, bloqueios, excecoes, cancelamento e SLA (UX-020, UX-023, UX-027, UX-028).
- Especificar regras de responsabilidade atual e proximo responsavel (UX-007, UX-025, UX-069).
- Especificar regras de CTA primaria por papel e por estado operacional (UX-013, UX-018, UX-064).

### 6.4 BUILD futuro bloqueado

Nenhuma das recomendacoes acima libera BUILD.

Itens DEV correspondentes devem permanecer com status `Bloqueado` no backlog ate aprovacao explicita.

### 6.5 Mapeamento com backlog

| Frente | Itens de backlog | Saida documental esperada | DEV relacionado |
| --- | --- | --- | --- |
| Fundacao Queue/Encounter | UX-001, UX-002, UX-007, UX-008, UX-020 a UX-029 | Modelo operacional e state machine candidata | UX-DEV-002 bloqueado |
| Cabecalho contextual | UX-010 a UX-019, UX-061, UX-064 | SPEC do cabecalho contextual | UX-DEV-001 bloqueado |
| Recepcao | UX-030 a UX-039 | PRD da jornada da recepcao | UX-DEV-003 bloqueado |
| Veterinario clinico | UX-040 a UX-049 | PRD da jornada do veterinario clinico | UX-DEV-004 bloqueado |
| Fluxos especializados | UX-050 a UX-056 | Roadmap/PRD por fluxo especializado | DEV futuro ainda nao liberado |
| Auditoria visual transversal | UX-060 a UX-069 | Brief visual, matriz de componentes e checklist visual | UX-DEV-005 bloqueado |
| Financeiro/comanda | UX-034, UX-035, UX-036, UX-038, UX-064 | PRD/SPEC de finalizacao e cobranca | DEV futuro bloqueado |
| Laboratorio/exames | UX-042, UX-051, UX-052, UX-055, UX-056 | PRD/SPEC de fluxo tecnico e retorno ao prontuario | DEV futuro bloqueado |

### 6.6 Checklist de validacao operacional

Aplicar a cada tela critica antes de qualquer recomendacao de BUILD:

- [ ] Tem responsavel atual?
- [ ] Tem proximo passo claro?
- [ ] Tem CTA primaria unica?
- [ ] Evita multiplas acoes concorrentes?
- [ ] Mostra estado operacional?
- [ ] Permite continuidade da jornada?
- [ ] Mostra setor atual e proximo setor quando aplicavel?
- [ ] Mostra origem do item ou da cobranca quando aplicavel?
- [ ] Evita cards decorativos em area operacional?
- [ ] Se houver bloqueio, explica o motivo operacional?

### 6.7 Antipadroes identificados

- Telas CRUD isoladas usadas como substituto de jornada.
- Botoes demais no header ou no primeiro viewport.
- CTA generica como `Salvar`, `Novo` ou `Adicionar` sem resultado operacional claro.
- Multiplas decisoes concorrentes na mesma tela.
- Falta de continuidade entre modulo atual e proximo setor.
- Fila sem responsavel atual.
- Prontuario sem devolucao operacional para recepcao.
- Exames sem status ponta a ponta.
- Comanda sem origem clinica/comercial clara.
- Cards demais para informacao que deveria ser tabela, lista ou estado operacional.

## 7. Lacunas que precisam de validacao do responsavel

- Quais telas sao usadas diariamente pela recepcao em maior volume?
- Qual fluxo real de check-in em emergencia?
- Quem decide que atendimento voltou para recepcao?
- Quem pode alterar orcamento indicado pelo veterinario?
- Quais pendencias impedem cobranca?
- Qual nivel de detalhe clinico pode aparecer para recepcao e financeiro?
- Quais areas especializadas entram primeiro depois de recepcao e clinica?
- Quais telas atuais devem ser preservadas como cadastro administrativo e quais devem virar jornada operacional?
- Qual vocabulario oficial para estados da `Queue`?
- Qual criterio define responsavel atual por pessoa, equipe ou setor?

## 8. Criterio de saida da auditoria

Esta auditoria estara pronta para alimentar backlog executavel quando:

- houver walkthrough read-only das telas P0 e P1;
- cada tela critica tiver screenshot ou descricao visual validada;
- problemas forem priorizados por impacto operacional;
- recomendacoes estiverem separadas entre discovery, PRD, SPEC e BUILD futuro;
- cada recomendacao tiver backlog relacionado;
- responsavel aprovar quais frentes seguem para especificacao;
- DEV permanecer bloqueado.

## 9. Proximos passos

1. Validar esta auditoria documental com o responsavel.
2. Rodar walkthrough read-only futuro quando autorizado.
3. Complementar com screenshots e contagem de cliques.
4. Usar esta auditoria como entrada dos PRDs `887` e `888`.
5. Atualizar backlog `882` somente se o responsavel aprovar mudanca de status documental.

## 9.1 Prioridade de ataque

Ordem recomendada para aprofundamento documental e validacao operacional:

1. Recepcao (P0): fechar PRD da jornada da recepcao e validar UX-030 a UX-039.
2. Queue (P0): formalizar estados, responsaveis, filtros, SLA e transicoes de UX-020 a UX-029.
3. Prontuario (P0): fechar PRD do veterinario clinico e validar UX-040 a UX-049.
4. Header (P0): fechar SPEC do cabecalho contextual e validar UX-010 a UX-019.
5. Financeiro (P0): validar origem da cobranca, pendencias e fechamento integrado.
6. Exames (P1): mapear laboratorio/imagem e retorno ao prontuario.
7. Internacao (P1): mapear estados proprios, pendencias e retorno operacional.

## 10. Guardrail final

Esta auditoria nao libera BUILD.

Ela serve para gerar PRD, SPEC, discovery, validacao operacional e backlog futuro. Qualquer implementacao exige aprovacao explicita do responsavel, criterio de aceite aprovado e documento tecnico adequado.

Agentes nao devem alterar codigo, criar componentes, alterar rotas, criar migrations, iniciar build, iniciar servidor ou implementar telas com base neste documento.

Todos os itens DEV permanecem bloqueados.
