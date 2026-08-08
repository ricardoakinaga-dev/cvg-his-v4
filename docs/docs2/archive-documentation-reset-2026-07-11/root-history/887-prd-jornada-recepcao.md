# 887 - PRD da Jornada da Recepcao

Data: 2026-04-28
Status: PRD de produto para validacao, sem autorizacao de BUILD
Origem: `docs/880-plano-executivo-ux-operacional.md`, `docs/881-roadmap-ux-operacional.md`, `docs/882-backlog-ux-operacional.md`, `docs/883-auditoria-ui-atual-ux-operacional.md`, `docs/886-modelo-operacional-queue-encounter.md`

## 0. Guardrail

Este PRD nao autoriza implementacao.

Ele nao define tela final, componente, rota, migration, API, schema ou regra tecnica final. Ele descreve a jornada operacional desejada para validacao do responsavel.

Todo item DEV da recepcao permanece bloqueado ate SPEC aprovada e autorizacao explicita.

## 0.1 Resumo operacional da recepcao

A recepcao e o gateway operacional do sistema.

Tudo que entra no hospital passa por ela ou precisa ser reconciliado por ela: cliente novo, paciente conhecido, retorno, emergencia, orcamento, venda de produto, venda de servico, finalizacao pos-clinica, cobranca e pendencia.

Erro na recepcao quebra todo o fluxo. Uma entrada mal classificada, sem dono, sem prioridade, sem proximo setor ou sem rastreabilidade gera retrabalho para veterinario, financeiro, laboratorio, internacao e coordenacao.

Agenda tambem e responsabilidade operacional da recepcao. Quando o cliente entra em contato por WhatsApp, telefone ou presencialmente para marcar consulta, coleta, ultrassom, raio-x ou atendimento com especialista, a recepcao deve transformar essa demanda em compromisso rastreavel, com tutor, animal, profissional/setor, data/hora completa, notas, estado e log.

O objetivo desta jornada e transformar cada entrada relevante em item rastreavel:

- `Encounter`, quando ha fluxo operacional/clinico/comercial que precisa atravessar setores; ou
- venda avulsa controlada, quando for produto sem necessidade de atendimento, fila ou acompanhamento.

A recepcao nao deve ser apenas cadastro de tutor/animal. Ela deve classificar a entrada, definir prioridade, atribuir responsabilidade inicial, enviar para a `Queue` quando aplicavel e garantir que o caso tenha proximo passo claro.

Quando a demanda for futura, a recepcao deve operar pela Agenda. Quando o paciente chegar para o procedimento agendado, a Agenda deve alimentar a `Queue`.

## 1. Resumo

A recepcao deve operar como porta de entrada, roteamento e fechamento da jornada hospitalar.

Ela precisa buscar ou cadastrar rapidamente tutor e animal, abrir entrada com ou sem animal, lidar com retorno, orcamento, venda de balcao, finalizacao pos-clinica, cobranca e pendencias.

A experiencia alvo deve reduzir troca de telas, evitar cadastro completo prematuro e transformar cada caso relevante em `Encounter` rastreavel na `Queue`.

## 2. Usuarios

Usuarios principais:

- recepcionista;
- caixa;
- auxiliar administrativo;
- gestor de atendimento.

Usuarios impactados:

- veterinario;
- financeiro;
- laboratorio/imagem;
- internacao;
- coordenacao.

## 2.1 Contrato operacional da recepcao

As regras abaixo sao obrigatorias para qualquer SPEC funcional futura da recepcao.

Toda entrada relevante deve virar:

- `Encounter`; ou
- venda avulsa controlada.

Recepcao deve sempre definir:

- tipo de entrada;
- prioridade;
- setor atual;
- responsavel atual;
- status operacional inicial;
- proximo setor ou motivo para permanecer na recepcao.

Recepcao nao pode:

- deixar item ativo sem dono;
- deixar item ativo sem status;
- enviar item sem proximo destino;
- criar caso operacional sem origem;
- iniciar fluxo clinico sem indicar se ha animal presente;
- misturar venda de produto avulsa com venda de servico;
- enviar para veterinario sem motivo ou prioridade;
- receber retorno da clinica sem pendencias, orientacao ou proximo passo quando houver finalizacao operacional.

Regras de interpretacao:

- `tipo de entrada` responde que tipo de trabalho chegou.
- `prioridade` responde a urgencia operacional.
- `setor atual` responde onde o item esta.
- `responsavel atual` responde quem deve agir agora.
- `proximo setor` responde para onde o item deve ir.
- `status operacional` responde em que etapa do fluxo o item esta.

Se a recepcao nao consegue responder esses pontos em ate poucos segundos, o fluxo esta incompleto.

## 3. Objetivos de produto

- Abrir atendimento simples em ate 60 segundos.
- Permitir busca ampla antes de cadastrar novamente.
- Diferenciar entrada com animal, sem animal, retorno, orcamento e venda.
- Criar ou atualizar `Encounter` como item operacional da `Queue`.
- Criar ou atualizar agendamento como compromisso operacional futuro.
- Deixar claro responsavel atual, proximo responsavel, setor atual e proximo setor.
- Receber casos de volta da clinica com pendencias explicitas.
- Conectar orcamento, comanda, cobranca e fechamento sem comunicacao informal.

## 4. Fora de escopo

- Implementar tela de recepcao rapida.
- Alterar cadastro de tutor ou animal.
- Alterar financeiro, comanda ou caixa.
- Criar novo modelo de banco.
- Criar rotas.
- Criar componentes.
- Definir API final.
- Resolver fluxos especializados de internacao, laboratorio ou imagem.

## 5. Conceitos operacionais

### 5.0 Tipos de entrada

Tipo de entrada e classificacao obrigatoria para qualquer demanda recebida pela recepcao.

Enum operacional candidato, ainda nao tecnico:

- `atendimento_com_animal`;
- `atendimento_sem_animal`;
- `retorno`;
- `orcamento`;
- `venda_produto`;
- `venda_servico`;
- `emergencia`;
- `agendamento_consulta`;
- `agendamento_exame`;
- `agendamento_especialidade`.

Regras:

- uma entrada deve ter exatamente um tipo principal;
- o tipo principal orienta criacao de `Encounter`, comanda, venda avulsa, prioridade e proximo setor;
- tipos secundarios podem existir futuramente como qualificadores, mas nao devem substituir o tipo principal;
- `emergencia` tem precedencia operacional sobre classificacoes comerciais ou administrativas;
- `venda_produto` so fica fora de `Encounter` quando for venda avulsa controlada e nao exigir acompanhamento;
- `venda_servico` exige rastreabilidade operacional e nao deve ser tratada como venda avulsa simples;
- agendamentos organizam trabalho futuro e devem alimentar a `Queue` no momento de chegada/check-in.

Tabela de decisao inicial:

| Tipo de entrada | Gera Encounter? | Proximo setor candidato | Observacao |
| --- | --- | --- | --- |
| `atendimento_com_animal` | Sim | Clinica | Fluxo padrao de atendimento |
| `atendimento_sem_animal` | Depende da relevancia operacional | Recepcao, financeiro ou clinica | Exige regra de relevancia |
| `retorno` | Sim | Clinica, recepcao ou financeiro | Pode vincular caso anterior |
| `orcamento` | Depende de rastreabilidade | Recepcao ou financeiro | Pode virar atendimento/comanda |
| `venda_produto` | Nao, quando avulsa controlada | Financeiro/caixa ou fechamento | Pode vincular a comanda se houver atendimento |
| `venda_servico` | Sim | Recepcao, clinica ou financeiro | Servico exige rastreabilidade |
| `emergencia` | Sim | Clinica imediata | Pode aceitar cadastro minimo incompleto |
| `agendamento_consulta` | Nao necessariamente no ato | Agenda, depois Queue | Vira Encounter no check-in ou conforme regra aprovada |
| `agendamento_exame` | Depende do tipo de exame | Agenda do setor/profissional | Coleta, ultrassom e RX precisam regra propria |
| `agendamento_especialidade` | Nao necessariamente no ato | Agenda do especialista | Deve indicar profissional, especialidade e horario |

### 5.1 Entrada

Entrada e o ato operacional de receber uma demanda na recepcao. Ela pode ou nao ter animal presente.

### 5.2 Encounter

`Encounter` e o item operacional que acompanha a demanda pela `Queue`. Pode ter componente clinico, financeiro, comercial ou administrativo.

### 5.3 Queue

`Queue` e a esteira central que mostra onde o caso esta, quem e dono atual e qual e o proximo passo.

### 5.4 Comanda

Comanda e o agrupador financeiro quando ha atendimento, servico, produto vinculado, exame, procedimento, internacao ou cobranca.

### 5.5 Agendamento

Agendamento e o compromisso operacional futuro criado pela recepcao a partir de contato por WhatsApp, telefone ou presencial.

Um agendamento deve conter, em nivel conceitual:

- tutor;
- animal, quando aplicavel;
- tipo de agendamento;
- profissional ou especialista;
- setor;
- data e hora completas;
- status;
- labels;
- notas;
- log de criacao e alteracoes.

Estados candidatos:

- `pendente`;
- `confirmado`;
- `cancelado`;
- `excluido`.

Labels/setores candidatos:

- clinica;
- ultrassom;
- raio-x;
- laboratorio/coleta;
- especialidade;
- agenda do profissional.

Regras candidatas:

- agendamento deve permitir acesso rapido ao cadastro do cliente;
- agendamento deve permitir acesso rapido ao prontuario do animal;
- agendamento deve registrar log de mudancas;
- agendamento confirmado deve alimentar a `Queue` quando o paciente chega;
- agendamento nao deve se perder como calendario isolado sem continuidade operacional.

### 5.6 Regra de criacao de Encounter

`Encounter` deve ser criado quando a entrada precisar de rastreabilidade operacional alem de uma venda avulsa controlada.

Regra deterministica conceitual:

```text
criarEncounter =
  atendimento_com_animal ||
  atendimento_sem_animal_relevante ||
  retorno ||
  orcamento_rastreavel ||
  venda_servico ||
  emergencia ||
  checkin_de_agendamento_operacional
```

Definicoes operacionais:

| Termo | Definicao |
| --- | --- |
| `atendimento_com_animal` | Tutor e animal presentes ou animal representado para atendimento clinico, vacina, exame, procedimento ou triagem |
| `atendimento_sem_animal_relevante` | Demanda sem animal que depende de prontuario, orientacao clinica, decisao de veterinario, pendencia ou acompanhamento |
| `retorno` | Continuidade de caso anterior, com ou sem animal, que precisa de historico e proximo passo |
| `orcamento_rastreavel` | Orcamento que pode virar atendimento, comanda, aprovacao, agendamento ou decisao clinica/comercial |
| `venda_servico` | Venda de servico que exige execucao, agenda, atendimento, lead operacional ou comanda rastreavel |
| `emergencia` | Entrada critica que deve gerar rastreabilidade mesmo com cadastro incompleto |
| `checkin_de_agendamento_operacional` | Chegada de paciente/tutor para consulta, exame ou procedimento previamente agendado |

Regra de nao criacao de `Encounter`:

```text
naoCriarEncounter =
  venda_produto_avulsa_controlada &&
  sem_vinculo_clinico &&
  sem_servico &&
  sem_pendencia &&
  sem_necessidade_de_acompanhamento
```

Quando nao criar `Encounter`, a recepcao ainda deve garantir venda avulsa controlada, origem comercial, responsavel pelo caixa e fechamento financeiro rastreavel.

Casos que exigem decisao do responsavel antes de SPEC:

| Caso | Pergunta obrigatoria |
| --- | --- |
| Tutor sem cadastro comprando produto | Permitir venda avulsa anonima ou exigir cadastro minimo? |
| Orcamento por WhatsApp sem animal definido | Criar lead operacional, `Encounter` ou registro comercial separado? |
| Retorno sem animal presente | Sempre criar `Encounter` ou vincular ao anterior? |
| Orientacao clinica rapida na recepcao | Exige veterinario e `Encounter`? |
| Servico vendido para execucao futura | Gera `Encounter`, agendamento ou comanda pendente? |
| Agendamento de exame sem consulta | Gera Encounter no ato, no check-in ou somente pedido tecnico? |
| Cancelamento de agendamento | Cancelamento mantem log e motivo obrigatorio? |

## 6. Subjornadas da recepcao

### 6.1 Entrada com animal

Historia:

Tutor chega com animal para consulta, retorno, vacina, exame, urgencia ou atendimento espontaneo.

Fluxo alvo:

1. Recepcao busca por ID, telefone, CPF/RG, tutor, animal ou codigo interno.
2. Sistema mostra possiveis duplicidades.
3. Recepcao confirma tutor e animal existentes ou cria cadastro minimo.
4. Recepcao informa motivo da entrada, prioridade e origem.
5. Sistema cria ou atualiza `Encounter`.
6. Caso entra na `Queue` com setor atual `Recepcao` e proximo setor candidato `Clinica`.
7. Recepcao envia para atendimento ou mantem pendente com motivo claro.

Campos minimos candidatos:

- tutor ou contato minimo;
- animal ou marcador de cadastro incompleto;
- motivo;
- prioridade;
- tipo de entrada;
- responsavel atual;
- proximo setor.

Lacunas:

- quais campos sao obrigatorios em urgencia;
- quando abrir comanda automaticamente;
- como tratar animal sem cadastro completo;
- quando permitir entrada sem CPF/RG.

Perguntas obrigatorias para SPEC:

- Quais campos minimos sao obrigatorios para `atendimento_com_animal` comum?
- Quais campos minimos sao obrigatorios para `emergencia`?
- Em que condicoes comanda nasce automaticamente na entrada?
- Qual pendencia deve ser exibida quando animal ou tutor estiver incompleto?

### 6.2 Entrada sem animal

Historia:

Tutor chega sem animal para orientacao, retirada, conversa sobre caso, aprovacao, orcamento, compra vinculada ou retorno administrativo.

Fluxo alvo:

1. Recepcao busca tutor e possivel animal relacionado.
2. Recepcao seleciona motivo sem forcar atendimento clinico presencial.
3. Sistema permite criar pendencia, orcamento, comanda, venda ou retorno administrativo.
4. Quando houver relacao com caso clinico, vincular a `Encounter` existente ou criar `Encounter` operacional.
5. Proximo setor pode ser recepcao, financeiro, veterinario, laboratorio ou nenhum.

Lacunas:

- quando entrada sem animal deve gerar `Encounter`;
- quando deve apenas gerar venda de balcao;
- como exibir esse item na `Queue`;
- como evitar confundir retorno administrativo com atendimento clinico.

Perguntas obrigatorias para SPEC:

- O que torna uma entrada sem animal operacionalmente relevante?
- Quando entrada sem animal deve gerar `Encounter`?
- Quando entrada sem animal deve ser apenas venda avulsa controlada?
- Qual label deve diferenciar retorno administrativo de atendimento clinico?

### 6.3 Retorno

Historia:

Tutor retorna para revisao, orientacao, retirada de resultado, continuidade ou ajuste de conduta.

Fluxo alvo:

1. Recepcao identifica atendimento anterior.
2. Sistema mostra contexto minimo do caso anterior.
3. Recepcao escolhe retorno com animal ou sem animal.
4. Sistema cria nova entrada ou reativa acompanhamento conforme regra aprovada.
5. Proximo passo pode ser veterinario, financeiro, laboratorio, recepcao ou fechamento.

Lacunas:

- quando retorno abre novo `Encounter`;
- quando retorno reaproveita atendimento anterior;
- se retorno sempre gera comanda;
- qual prazo diferencia retorno de nova consulta.

Perguntas obrigatorias para SPEC:

- Qual prazo diferencia retorno de nova consulta?
- Retorno sem animal gera novo `Encounter` ou continuidade do anterior?
- Quando retorno deve abrir comanda?
- Quem decide se retorno volta para veterinario ou segue para recepcao/financeiro?

### 6.4 Orcamento

Historia:

Orcamento pode nascer por WhatsApp, telefone, conversa presencial, indicacao clinica ou retorno.

Fluxo alvo:

1. Recepcao identifica tutor e animal, quando houver.
2. Recepcao registra origem do orcamento.
3. Sistema permite montar orcamento sem exigir atendimento presencial.
4. Orcamento pode virar atendimento, agendamento, comanda ou pendencia de aprovacao.
5. Status de aprovacao fica visivel na `Queue` quando houver acompanhamento operacional.

Lacunas:

- se orcamento sem tutor cadastrado e permitido;
- quando orcamento gera comanda;
- quem aprova desconto ou alteracao de valor;
- como tratar aprovacao parcial.

Perguntas obrigatorias para SPEC:

- Orcamento sem tutor cadastrado e permitido?
- Quando orcamento vira `Encounter`?
- Quando orcamento vira comanda?
- Quem tem autoridade para alterar valor, desconto ou aprovar excecao?
- Como aprovacao parcial altera proximo setor?

### 6.5 Venda de balcao

Historia:

Tutor ou cliente compra produto no balcao, com ou sem vinculo com atendimento.

Fluxo alvo:

1. Recepcao identifica se e produto avulso, produto vinculado a atendimento ou servico.
2. Produto avulso pode seguir fluxo de venda sem atendimento clinico.
3. Produto vinculado pode ser associado a comanda ou historico quando fizer sentido.
4. Venda de servico deve gerar comanda de atendimento ou lead operacional rastreavel.

Lacunas:

- quando venda avulsa exige cadastro;
- se venda com cliente anonimo sera permitida;
- como vincular produto a atendimento existente;
- quais servicos podem nascer na recepcao.

Perguntas obrigatorias para SPEC:

- Venda de produto avulsa pode ocorrer sem tutor identificado?
- Quais produtos exigem vinculo com tutor, animal ou atendimento?
- Quais servicos podem nascer diretamente na recepcao?
- Todo servico vendido deve gerar `Encounter` ou existe excecao?

### 6.6 Finalizacao pos-clinica

Historia:

Veterinario conclui atendimento e envia caso de volta para recepcao com pendencias.

Fluxo alvo:

1. Recepcao visualiza item retornado na `Queue`.
2. Header/contexto mostra tutor, animal, atendimento, status e pendencias.
3. Recepcao revisa orientacoes, documentos, orcamento, exames, receita e itens cobraveis.
4. Recepcao resolve pendencias administrativas.
5. Caso segue para cobranca, novo setor ou fechamento.

Lacunas:

- quais pendencias impedem cobranca;
- como recepcao confirma que tutor recebeu orientacao;
- quando veterinario precisa complementar informacao;
- quando item retorna para clinica.

Perguntas obrigatorias para SPEC:

- Quais pendencias clinicas bloqueiam cobranca?
- Quais pendencias documentais bloqueiam fechamento?
- Qual confirmacao minima a recepcao deve registrar ao orientar tutor?
- Quando item deve voltar obrigatoriamente para veterinario?

### 6.7 Cobranca

Historia:

Recepcao ou caixa realiza cobranca de itens gerados na jornada.

Fluxo alvo:

1. Sistema mostra origem dos itens: consulta, exame, produto, servico, internacao ou venda.
2. Sistema mostra pendencias antes do fechamento.
3. Usuario escolhe forma de pagamento e registra recebimento.
4. Status financeiro atualiza o `Encounter`.
5. Caso fecha ou fica como pendencia financeira.

Lacunas:

- se cobranca parcial fecha ou mantem item aberto;
- como sinalizar desconto;
- quem pode cancelar item;
- como tratar pagamento pendente.

Perguntas obrigatorias para SPEC:

- Cobranca parcial mantem `Encounter` aberto ou cria pendencia financeira?
- Quem pode conceder desconto?
- Quem pode cancelar item de origem clinica?
- Pagamento pendente impede fechamento operacional ou apenas fechamento financeiro?

### 6.8 Pendencia

Historia:

Caso nao pode avancar por falta de dado, aprovacao, pagamento, documento, resultado ou decisao.

Fluxo alvo:

1. Sistema registra tipo de pendencia.
2. Pendencia tem responsavel atual e proximo passo.
3. Queue permite filtrar pendencias por setor, prioridade e atraso.
4. Resolucao da pendencia move o caso para proximo estado.

Tipos candidatos:

- cadastro incompleto;
- aguardando tutor;
- aguardando aprovacao;
- aguardando veterinario;
- aguardando exame;
- aguardando financeiro;
- pagamento pendente;
- documento pendente;
- duplicidade suspeita.

Lacunas:

- quais pendencias bloqueiam fechamento;
- quais podem ficar abertas apos fechamento financeiro;
- quais exigem escalonamento.

Perguntas obrigatorias para SPEC:

- Toda pendencia exige responsavel atual individual ou setor e suficiente?
- Quais pendencias bloqueiam envio para outro setor?
- Quais pendencias exigem SLA ou escalonamento?
- Quais pendencias podem permanecer apos fechamento financeiro?

### 6.9 Agendamento

Historia:

Cliente entra em contato por WhatsApp, telefone ou presencialmente sem necessariamente trazer o animal. Deseja marcar consulta, coleta de exame de sangue, ultrassom, raio-x ou atendimento com especialista.

Fluxo alvo:

1. Recepcao busca ou cadastra tutor.
2. Recepcao busca ou cadastra animal, quando aplicavel.
3. Recepcao seleciona tipo de agendamento: consulta, coleta, ultrassom, raio-x, especialidade ou outro procedimento.
4. Recepcao seleciona profissional, especialista ou setor responsavel.
5. Recepcao define timestamp completo do agendamento.
6. Recepcao adiciona notas de agendamento e labels operacionais.
7. Sistema registra estado inicial, preferencialmente `pendente` ou `confirmado`, conforme regra futura.
8. Sistema registra log do agendamento.
9. No dia do agendamento, ao chegar, paciente/tutor faz check-in.
10. Agendamento alimenta a `Queue`.
11. Veterinario/profissional executa atendimento ou procedimento.
12. Caso retorna para recepcao para registro, lancamento, cobranca e fechamento quando aplicavel.

Regras candidatas:

- agenda deve permitir acesso rapido ao cadastro do cliente;
- agenda deve permitir acesso rapido ao prontuario do animal;
- agenda deve permitir filtrar por clinica, ultrassom, raio-x, laboratorio, especialidade e profissional;
- agenda deve diferenciar pendente, confirmado, cancelado e excluido;
- agenda deve registrar log de alteracoes relevantes;
- agenda deve se conectar com `Queue` no check-in;
- agenda deve preservar notas operacionais visiveis para recepcao e profissional.

Perguntas para validacao:

- Qual e a diferenca operacional entre `pendente` e `confirmado`?
- `excluido` deve existir ou todo caso deve virar `cancelado` com log?
- Agendamento de exame exige pedido medico previo?
- Coleta de sangue pode ser agendada diretamente pela recepcao?
- Ultrassom/RX precisa sempre de profissional definido?
- Agenda do profissional e agenda do setor devem ser visoes da mesma agenda ou agendas separadas?

## 7. Dependencias

| Area | Dependencia |
| --- | --- |
| Queue | Estados, responsavel atual, proximo responsavel e filtros |
| Encounter | Criacao ou atualizacao do item operacional |
| Agenda | Compromissos futuros, profissional/setor, status, log e check-in |
| Tutor/animal | Busca ampla e cadastro minimo |
| Veterinario | Envio para atendimento e retorno pos-clinica |
| Financeiro | Comanda, cobranca, pendencias e fechamento |
| Exames | Status de pedido, resultado e cobranca |
| Internacao | Admissao, alta e retorno financeiro |

## 8. Regras candidatas de UX

- Recepcao deve ver proximo passo em ate 5 segundos.
- Cadastro completo nao deve bloquear entrada rapida quando houver regra de excecao aprovada.
- Uma tela operacional deve ter uma CTA primaria.
- Toda entrada ativa deve ter responsavel atual.
- Todo envio para outro setor deve registrar proximo setor.
- Pendencias devem ter dono e motivo.
- Venda de produto e venda de servico devem ter tratamentos diferentes.
- Orcamento nao deve depender sempre de animal presente.

## 9. Criterios de aceite

O PRD da recepcao sera considerado aprovado quando:

- entrada com animal estiver validada;
- entrada sem animal estiver validada;
- retorno estiver validado;
- orcamento isolado estiver validado;
- agendamento estiver validado;
- venda de balcao estiver separada de venda de servico;
- finalizacao pos-clinica tiver pendencias claras;
- cobranca tiver origem e bloqueios claros;
- pendencia tiver responsavel atual;
- dependencia com `Queue` e `Encounter` estiver aprovada;
- lacunas de regra tiverem dono;
- nenhum item DEV tiver sido liberado automaticamente.

### 9.1 Validacao UX por papel - HOFF-033

Para a recepcao/finalizacao, o walkthrough pre-BUILD deve validar:

- receber item de handoff e confirmar ACK;
- entender tutor, paciente, atendimento, resumo e proximo passo em poucos segundos;
- marcar pendencia operacional, resolver pendencia permitida, devolver para clinica e enviar ao financeiro quando as pre-condicoes existirem;
- bloquear edicao de prontuario, prescricao, laudo e relatorio pela inbox;
- bloquear criacao automatica de cobranca, comanda, baixa ou pagamento;
- tratar caminho feliz, sem permissao, leitura sem acao, dados incompletos, estado vazio, erro e atraso;
- registrar resultado `Aprovado`, `Bloqueado`, `Ajustar` ou `Nao se aplica` com evidencia e permissao efetiva.

## 10. Metricas candidatas

- tempo para abrir atendimento simples;
- quantidade de telas ate enviar para atendimento;
- quantidade de cadastros duplicados evitados;
- quantidade de itens retornados da clinica sem pendencia clara;
- tempo entre fim clinico e inicio de cobranca;
- quantidade de comandas fechadas com pendencia;
- quantidade de orcamentos que viram atendimento ou venda.

## 11. Riscos

| Risco | Impacto | Mitigacao documental |
| --- | --- | --- |
| Recepcao virar tela grande demais | Baixa produtividade | Separar entrada, fila e finalizacao por contexto |
| Cadastro minimo gerar dados ruins | Duplicidade e retrabalho | Busca ampla e revisao posterior |
| Comanda nascer cedo demais | Confusao financeira | Regra clara por tipo de entrada |
| Comanda nascer tarde demais | Perda de itens cobraveis | Pendencias e origem de itens |
| Orcamento isolado virar fluxo solto | Perda de rastreabilidade | Vínculo com tutor, animal ou lead operacional |

## 12. Proximos passos

1. Validar este PRD com responsavel operacional.
2. Confirmar regras de entrada sem animal, retorno e orcamento.
3. Cruzar com `885-spec-cabecalho-contextual.md`.
4. Criar SPEC funcional somente apos aprovacao.
5. Manter `UX-DEV-003` bloqueado.
