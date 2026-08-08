# Relatório da Entidade Agenda

Data-base da inspeção: 23 de abril de 2026

Escopo:

- análise específica da entidade `agenda` no beta autenticado;
- inspeção somente leitura da rota `/agenda`;
- foco em estrutura, filtros, dimensões de agendamento, relação com cliente/animal/profissional/serviço e papel operacional na jornada;
- sem criação de agendamento, sem edição, sem confirmação de mudança de horário e sem qualquer persistência no ERP.

Evidências principais:

- [agenda-geral.png](../inspection/2026-04-23T23-03-08-343Z-agenda/screenshots/agenda-geral.png)
- [agenda-filtros.png](../inspection/2026-04-23T23-03-08-343Z-agenda/screenshots/agenda-filtros.png)
- [agenda-mês.png](../inspection/2026-04-23T23-03-08-343Z-agenda/screenshots/agenda-mês.png)
- [agenda-semana.png](../inspection/2026-04-23T23-03-08-343Z-agenda/screenshots/agenda-semana.png)
- [agenda-dia.png](../inspection/2026-04-23T23-03-08-343Z-agenda/screenshots/agenda-dia.png)
- [agenda-geral.json](../inspection/2026-04-23T23-03-08-343Z-agenda/agenda-geral.json)
- [network.json](../inspection/2026-04-23T23-03-08-343Z-agenda/network.json)
- [2026-04-23-relatorio-completo-cadastros-clientes-animais.md](../guides/2026-04-23-relatorio-completo-cadastros-clientes-animais.md)
- [2026-04-23-relatorio-fluxos-detalhe-comanda-agenda-financeiro.md](../guides/2026-04-23-relatorio-fluxos-detalhe-comanda-agenda-financeiro.md)

Nota de segurança:

- este relatório evita reproduzir nomes reais e outros dados identificáveis vistos nas capturas;
- quando necessário, descreve a forma estrutural do agendamento e o papel das entidades, não o conteúdo sensível dos registros exibidos.

## 1. Síntese executiva

A `agenda` é a principal camada temporal e de alocação operacional do beta.

Ela organiza o trabalho a partir de uma grade de tempo e profissionais, não a partir de uma simples lista de atendimentos.

Leitura arquitetural:

- `cliente` representa o vínculo relacional e econômico;
- `animal` representa o paciente;
- `serviço` representa o que será executado;
- `profissional` representa quem assume ou recebe a alocação;
- `agenda` representa quando, com quem e em qual combinação operacional esse atendimento deve acontecer.

Em termos de produto, a agenda faz a ponte entre:

- cadastro e intenção de atendimento;
- disponibilidade e ocupação operacional;
- atendimento planejado e execução posterior em módulos como `comanda` e `atendimento`.

## 2. Papel da entidade no sistema

A inspeção confirma que a agenda não é tratada como um módulo auxiliar.

Ela aparece como uma superfície central do domínio assistencial e operacional porque concentra ao mesmo tempo:

- navegação temporal;
- filtros por entidade;
- grade por profissional;
- disponibilidade;
- status do compromisso;
- marcadores operacionais;
- ponto de entrada para criar agendamento.

Isso a coloca em posição de coordenação entre:

- recepção;
- equipe clínica;
- serviços especializados;
- acompanhamento do cliente;
- preparação da execução operacional.

## 3. Backend confirmado

Rota observada:

- `/agenda`

Chamadas específicas confirmadas no recorte de rede:

- `GET /service?active=true&hasSchedule=true`
- `GET /professional/basic`
- `GET /schedule?startDateTime=2026-04-23T00:00:00&endDateTime=2026-04-23T23:59:00`
- `GET /agenda/marcadores`
- `GET /schedule/profissional/disponibilidades?diaDaSemana=FRIDAY&profissionalIds=120,29,115,141,38,143,14,150,156,137,130`

Chamadas auxiliares do shell também apareceram:

- `GET /users/47/access-groups`
- `GET /menu`
- `GET /notificacoes/contagens/47`

No recorte salvo em [network.json](../inspection/2026-04-23T23-03-08-343Z-agenda/network.json), as respostas observadas para as chamadas da agenda ficaram em `200`, e o login inicial ficou em `201`.

Leitura dessas chamadas:

- `service?active=true&hasSchedule=true` restringe a agenda a serviços agendáveis;
- `professional/basic` abastece a dimensão de profissionais/recursos;
- `schedule` entrega os compromissos no intervalo consultado;
- `agenda/marcadores` indica taxonomia adicional para classificação visual ou operacional;
- `schedule/profissional/disponibilidades` mostra que a agenda consulta ocupação e oferta de horário por profissional.

Isso confirma que a agenda é montada por composição de múltiplos domínios, e não por uma tabela isolada.

## 4. Estrutura da tela

Evidência principal:

- [agenda-geral.png](../inspection/2026-04-23T23-03-08-343Z-agenda/screenshots/agenda-geral.png)

Elementos principais confirmados:

- breadcrumb e título `Agenda`;
- CTA `Criar agendamento`;
- calendário lateral para navegação por data;
- navegação temporal com avanço/retrocesso e ação `Hoje`;
- alternância de visualização `Mês`, `Semana` e `Dia`;
- painel lateral de filtros;
- grade principal de horários;
- legenda de status e marcadores no rodapé visual da tela.

Leitura:

- a tela foi desenhada para operação contínua;
- o operador escolhe recorte temporal, refina o conjunto por filtros e então lê a ocupação em uma grade central;
- a agenda combina visão tática de curto prazo com capacidade de navegação por horizonte maior.

## 5. Estrutura dos filtros

Evidência principal:

- [agenda-filtros.png](../inspection/2026-04-23T23-03-08-343Z-agenda/screenshots/agenda-filtros.png)

Filtros confirmados:

- `Status`
- `Profissional`
- `Serviço`
- `Cliente`
- `Marcador`

Elementos visíveis de interação:

- ação `Limpar filtros` em cada bloco;
- campo de pesquisa para profissional;
- campo de pesquisa para cliente;
- seletor de serviço;
- seletor de marcador;
- calendário lateral acoplado ao filtro temporal.

Leitura funcional dos filtros:

- `Status` permite isolar o estágio do compromisso;
- `Profissional` reorganiza a leitura por recurso humano ou agenda individual;
- `Serviço` foca o tipo de execução prometida;
- `Cliente` traz o recorte relacional/comercial;
- `Marcador` adiciona classificação operacional transversal.

Esses filtros mostram que a agenda foi pensada para consulta em múltiplos eixos, não apenas por data.

## 6. Dimensões de agendamento

A inspeção da grade e do texto da tela confirma pelo menos as seguintes dimensões estruturais.

### 6.1 Dimensão temporal

Confirmada por:

- data ativa;
- navegação por período;
- modos `Mês`, `Semana` e `Dia`;
- faixas horárias na grade;
- referência a `dia inteiro`.

Isso mostra que a agenda suporta leitura tanto macro quanto micro:

- mês para visão de volume e distribuição;
- semana para coordenação intermediária;
- dia para operação detalhada.

### 6.2 Dimensão profissional

Confirmada por:

- colunas com profissionais nominais;
- coluna `Sem profissional`;
- consulta backend `professional/basic`;
- consulta de disponibilidades por lista de `profissionalIds`.

Leitura:

- o profissional é uma dimensão primária da grade;
- a coluna `Sem profissional` mostra que o modelo aceita compromissos ainda não atribuídos;
- disponibilidade não é inferida apenas pela ocupação; ela é consultada explicitamente.

### 6.3 Dimensão serviço

Confirmada por:

- filtro de serviço;
- backend `service?active=true&hasSchedule=true`;
- texto dos cards/agendamentos exibindo o serviço associado.

Isso indica que:

- nem todo serviço do sistema necessariamente entra na agenda;
- existe uma distinção entre serviços cadastrados e serviços agendáveis;
- o tipo de serviço influencia diretamente a leitura operacional da agenda.

### 6.4 Dimensão cliente

Confirmada por:

- filtro `Cliente`;
- presença do nome do tutor/responsável na descrição do agendamento;
- integração já vista com o detalhe de clientes.

Leitura:

- o cliente participa da agenda como titular relacional do compromisso;
- essa dimensão ajuda recepção, confirmação e acompanhamento financeiro/comercial da jornada.

### 6.5 Dimensão animal

Confirmada por:

- presença do nome do animal na descrição dos agendamentos;
- integração já vista com o detalhe de animais;
- coexistência de animal e cliente no mesmo bloco de compromisso.

Leitura:

- o animal é o sujeito assistencial do agendamento;
- ele convive com o cliente no mesmo registro porque o domínio clínico e o domínio relacional não são a mesma coisa.

### 6.6 Dimensão status

Legenda visual confirmada:

- `Folga`
- `Aberto`
- `Confirmado`
- `Executado`
- `Cancelado`
- `Não compareceu`
- `Vacina`
- `Vermífugo`
- `Retorno`

Leitura:

- parte dessa legenda representa estado do compromisso;
- parte representa tipo de marcador ou categoria assistencial;
- a UI mistura leitura de ciclo de vida com sinalização clínica/operacional.

Esse desenho é útil porque reduz a necessidade de abrir cada compromisso para entender o contexto.

### 6.7 Dimensão disponibilidade

Confirmada por:

- chamada `schedule/profissional/disponibilidades`;
- representação explícita de agenda por profissional;
- presença visual de confirmação para mudança de horário.

Leitura:

- a agenda não apenas mostra o que já está marcado;
- ela também considera a malha de horários que pode receber ou bloquear realocação.

## 7. Forma de apresentação do compromisso

Na grade, cada agendamento expõe no mínimo uma composição deste tipo:

- faixa de horário;
- animal;
- cliente/tutor;
- serviço.

Em alguns casos, a própria descrição sugere combinação de serviços ou encadeamento dentro do mesmo intervalo.

Isso sugere que o compromisso na agenda é uma entidade composta ou, no mínimo, uma projeção enriquecida de múltiplas entidades de backend.

Leitura de modelagem:

- o frontend não mostra o agendamento como um ID frio;
- ele o projeta como unidade operacional legível para quem precisa reagendar, confirmar ou executar.

## 8. Relação com cliente, animal, profissional e serviço

Essa é a característica mais importante da agenda.

O mesmo compromisso agrega, numa única célula visível:

- `cliente` como responsável;
- `animal` como paciente;
- `serviço` como objeto de execução;
- `profissional` como eixo de alocação;
- `data/hora` como coordenada temporal.

Leitura de domínio:

- sem `cliente`, a clínica perde o vínculo relacional e comercial;
- sem `animal`, perde o contexto assistencial;
- sem `serviço`, perde o motivo e o escopo da reserva;
- sem `profissional`, perde a alocação real;
- sem `tempo`, perde a coordenação operacional.

A agenda existe justamente para fundir essas cinco dimensões numa superfície única de trabalho.

## 9. Papel operacional na jornada

Tomando como base os relatórios anteriores de `clientes`, `animais` e `comanda`, a agenda ocupa a etapa de planejamento e coordenação do atendimento.

Encadeamento funcional mais consistente:

1. cliente e animal existem como base cadastral;
2. a agenda organiza quando e com quem o serviço ocorrerá;
3. a execução do compromisso tende a repercutir em atendimento/comanda;
4. a comanda consolida itens e impacto financeiro;
5. o financeiro absorve o resultado econômico agregado.

Isso explica por que:

- o detalhe do cliente já resume agenda;
- o detalhe do animal também resume agenda;
- a agenda não substitui comanda;
- a comanda não substitui agenda.

Funções distintas:

- agenda planeja;
- comanda executa e cobra;
- cliente consolida a visão relacional/econômica;
- animal consolida a visão clínica/assistencial.

## 10. Indícios de regras de negócio

A superfície observada permite inferir algumas regras prováveis.

### 10.1 Só serviços agendáveis entram nessa malha

Base:

- `GET /service?active=true&hasSchedule=true`

Inferência:

- o cadastro de serviço possui ao menos um atributo que define elegibilidade para agendamento.

### 10.2 O profissional pode ser opcional em certos estágios

Base:

- coluna `Sem profissional`

Inferência:

- o sistema aceita criação ou manutenção de compromissos antes da atribuição final do executor.

### 10.3 Disponibilidade é uma entidade operacional explícita

Base:

- `GET /schedule/profissional/disponibilidades`

Inferência:

- o sistema distingue evento marcado de janela disponível, o que melhora remarcação e distribuição de carga.

### 10.4 Marcadores convivem com status

Base:

- chamada `/agenda/marcadores`
- legenda com estados e rótulos assistenciais

Inferência:

- a agenda usa tanto estados de fluxo quanto etiquetas de categorização rápida.

## 11. Limites da inspeção

Esta rodada não abriu a criação de agendamento nem salvou qualquer alteração.

Por isso, permanecem sem confirmação direta nesta fase:

- formulário completo de criação/edição;
- payload exato de persistência de agendamento;
- regras de validação no submit;
- regras de conflito de horário;
- relação detalhada entre agendamento executado e geração automática ou manual de comanda.

Ainda assim, a leitura estrutural do módulo já é sólida porque:

- a tela principal foi carregada integralmente;
- os filtros e a grade ficaram visíveis;
- o backend principal da agenda foi identificado;
- as dimensões do compromisso aparecem de forma explícita na UI e na rede.

## 12. Conclusão

A `agenda` do beta é um módulo de coordenação operacional multi-entidade.

Ela não funciona como simples calendário visual. Ela materializa uma malha de trabalho onde se cruzam:

- tempo;
- profissional;
- serviço;
- cliente;
- animal;
- disponibilidade;
- status;
- marcadores.

Essa modelagem é coerente com o restante do ERP observado até aqui:

- `clientes` e `animais` fornecem o contexto;
- `agenda` organiza a execução futura;
- `comanda` transforma execução em registro operacional e financeiro;
- `financeiro` consolida o efeito econômico.

Em resumo, a agenda é a superfície onde o ERP deixa de ser apenas cadastro e passa a operar capacidade, ocupação e sequência real de atendimento.
