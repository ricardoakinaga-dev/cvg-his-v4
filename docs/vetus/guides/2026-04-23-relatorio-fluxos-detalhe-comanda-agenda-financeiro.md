# Relatório dos Fluxos Detalhe -> Comanda -> Agenda -> Financeiro

Data-base da inspeção: 23 de abril de 2026

Escopo:

- análise somente leitura dos encadeamentos funcionais entre os módulos de `clientes` e `animais` e as superfícies de `comandas`, `agenda` e `financeiro`;
- uso prioritário de evidência autenticada do beta atual;
- sem criação de comanda, sem agendamento, sem edição e sem qualquer persistência no ERP.

Evidências principais:

- [clientes-detalhe-expandido.png](../inspection/2026-04-23T22-48-13-795Z-cadastros/screenshots/clientes-detalhe-expandido.png)
- [animais-detalhe-expandido.png](../inspection/2026-04-23T22-48-13-795Z-cadastros/screenshots/animais-detalhe-expandido.png)
- [comandas.png](../inspection/2026-04-23T22-00-01-706Z/screenshots/-comandas.png)
- [agenda.png](../inspection/2026-04-23T22-00-01-706Z/screenshots/-agenda.png)
- [dashboard-financeiro.png](../inspection/2026-04-23T22-00-01-706Z/screenshots/-dashboard-financeiro.png)
- [clientes-detalhe-expandido.json](../inspection/2026-04-23T22-48-13-795Z-cadastros/clientes-detalhe-expandido.json)
- [animais-detalhe-expandido.json](../inspection/2026-04-23T22-48-13-795Z-cadastros/animais-detalhe-expandido.json)
- [artifacts.json](../inspection/2026-04-23T22-00-01-706Z/artifacts.json)

## 1. Síntese executiva

Os fluxos `detalhe -> comanda -> agenda -> financeiro` já existem de forma nítida no beta, mas com papéis diferentes a partir de `clientes` e de `animais`.

Resumo objetivo:

- no fluxo iniciado por `clientes`, o detalhe do tutor é o cockpit de relacionamento e consolidado financeiro;
- no fluxo iniciado por `animais`, o detalhe do paciente é a porta clínica e assistencial, com ponte para comandas e agenda;
- `comandas` funciona como ponto de transação operacional entre cadastro, atendimento e valor monetário;
- `agenda` funciona como camada de organização temporal e alocação por profissional;
- `financeiro` agrega e consolida o resultado dessas operações em indicadores e dashboards.

Leitura estrutural:

- `cliente` ancora a visão econômica e de vínculo;
- `animal` ancora a visão clínica e de atendimento;
- `comanda` é o objeto de execução/comercialização;
- `agenda` organiza a ocorrência futura ou corrente;
- `financeiro` consolida a repercussão monetária.

## 2. Visão geral do encadeamento

Fluxo macro confirmado:

1. usuário entra no detalhe de cliente ou animal;
2. a interface expõe atalhos explícitos para comandas e agenda;
3. os detalhes mostram resumos já calculados de operação e situação financeira;
4. as rotas especializadas de comandas, agenda e dashboard financeiro completam a jornada.

Esse desenho evita saltos cegos de navegação.

O usuário consegue:

- partir do cadastro;
- enxergar o estado operacional resumido;
- decidir se navega para a execução em `comandas`;
- validar agenda;
- e chegar ao impacto financeiro.

## 3. Fluxo iniciado em Clientes

### 3.1 Ponto de partida: detalhe do cliente

Rota observada:

- `/cadastro/clientes/detalhes/7716`

No detalhe do cliente, a coluna direita já materializa quase toda a jornada subsequente:

- `Animais Cadastrados`
- `Agenda`
- `Comandas e Vendas`
- `Orçamentos`
- `Situação Financeira`
- `Pacotes`
- `Resgate de Pontos`
- `Live Animal e Live Lab`

Isso significa que o módulo de clientes não apenas referencia os demais fluxos. Ele antecipa o estado deles.

### 3.2 Detalhe -> Comanda

Evidências diretas:

- botão `Abrir Nova Comanda` no topo do detalhe do cliente;
- botão `Abrir Comanda` dentro do bloco `Animais Cadastrados`;
- bloco `Comandas e Vendas` com resumos quantitativos e monetários.

O bloco `Comandas e Vendas` confirma que o detalhe do cliente já consome dados transacionais consolidados:

- quantidade total;
- quantidade em aberto;
- valor total.

Interpretação:

- a comanda pertence funcionalmente à jornada do cliente;
- o cliente pode possuir múltiplas comandas;
- a UI já expõe o impacto acumulado dessas comandas sem exigir ida prévia à listagem de comandas.

Leitura de domínio:

- `cliente` é o nível econômico agregado;
- `animal` é o contexto específico de consumo/atendimento;
- a comanda nasce em torno do atendimento, mas repercute e é consolidada na conta do cliente.

### 3.3 Detalhe -> Agenda

Evidências diretas:

- bloco `Agenda` dentro do detalhe do cliente;
- o bloco mostra:
  - próximo agendamento;
  - animais;
  - serviços;
  - profissionais;
  - unidade.

Isso é importante porque mostra que a agenda do cliente não é apenas uma lista de eventos.

Ela é modelada com pelo menos cinco dimensões:

- temporal;
- paciente;
- serviço;
- profissional;
- unidade.

Interpretação:

- a agenda é derivada do relacionamento do cliente com a clínica;
- o detalhe do cliente já atua como painel de consulta pré-agendamento/pós-agendamento;
- a navegação cliente -> agenda é de acompanhamento e contexto, não apenas de cadastro.

### 3.4 Detalhe -> Financeiro

Evidências diretas:

- bloco `Situação Financeira`;
- bloco `Comandas e Vendas`;
- bloco `Pacotes`;
- bloco `Resgate de Pontos`;
- bloco `Orçamentos`.

O bloco `Situação Financeira` já mostra:

- saldo em créditos;
- saldo devedor.

Isso confirma que o detalhe do cliente é também uma visão de conta.

Além disso:

- `Pacotes` indica compromissos comerciais ou créditos de uso;
- `Resgate de Pontos` indica fidelização;
- `Orçamentos` indica pipeline comercial ainda não convertido integralmente.

Conclusão do fluxo do cliente:

- o detalhe do cliente já é uma visão 360;
- ele parte do cadastro e chega ao financeiro sem sair da mesma tela;
- quando o usuário navega para outros módulos, ele navega para operação aprofundada, não para descobrir o estado do cliente.

## 4. Fluxo iniciado em Animais

### 4.1 Ponto de partida: detalhe do animal

Rota observada:

- `/cadastro/animais/detalhes/10115`

No detalhe do animal, a coluna direita é orientada para continuidade clínica:

- `Últimos Atendimentos`
- `Anamneses`
- `Vacinas e Vermífugos`
- `Agenda`
- `Exames`
- `Internação`
- `Receituário`
- `Gráfico de peso`
- `Imagens`
- `Histórico Clínico`

No bloco esquerdo, além da identidade do animal, há:

- vínculo explícito com o cliente;
- `Enviar Mensagem`;
- botão `Ver cadastro do cliente`;
- botão `Abrir Nova Comanda`.

### 4.2 Detalhe -> Comanda

Evidências diretas:

- botão `Abrir Nova Comanda` no topo do detalhe do animal;
- presença de atendimento/comanda existente em artefato coletado;
- botão `Ver Comanda` em registro de atendimento recente.

Isso mostra dois movimentos diferentes:

- criação de nova jornada comercial/assistencial a partir do animal;
- consulta de jornada já realizada por meio da comanda existente.

Leitura de domínio:

- o animal funciona como disparador operacional da comanda;
- a comanda é a entidade que traduz atendimento em registro transacional;
- a partir do animal, a comanda é contextualizada pelo paciente e depois repercute no cliente.

Esse é um bom desenho porque espelha a realidade operacional:

- o caso clínico começa no animal;
- a cobrança e o relacionamento costumam consolidar no cliente.

### 4.3 Detalhe -> Agenda

Evidência direta:

- bloco `Agenda` dentro do detalhe do animal.

Mesmo sem expandir o conteúdo completo de todos os subblocos, a existência dessa seção no detalhe do animal confirma:

- o animal é entidade agendável;
- a agenda pode ser lida diretamente a partir do paciente;
- o fluxo paciente -> agenda existe sem mediação obrigatória do cliente.

Comparação com o fluxo do cliente:

- no cliente, a agenda é um consolidado relacional;
- no animal, a agenda é um consolidado assistencial do paciente.

### 4.4 Detalhe -> Financeiro

No detalhe do animal não existe um bloco financeiro explícito equivalente ao do cliente.

Isso é um achado importante.

O desenho sugere:

- o animal é porta de entrada para atendimento e execução clínica;
- a comanda é a ponte de monetização;
- o financeiro não é consolidado no detalhe do animal, mas no detalhe do cliente e no dashboard financeiro.

Em outras palavras:

- `animal -> comanda -> cliente -> financeiro`

Esse é o fluxo econômico mais provável do sistema beta.

## 5. Superfície de Comandas

### 5.1 Rota e backend

Rota observada:

- `/comandas`

Backend confirmado:

- `GET /commands/page-query`

### 5.2 O que a tela mostra

Elementos confirmados:

- busca textual;
- botão `Filtrar`;
- botão `Abrir Nova Comanda`;
- cards por comanda;
- status;
- ID da comanda;
- abertura;
- fechamento;
- cliente;
- valor total;
- seções expansíveis:
  - `Informações do cliente`
  - `Serviços / Produtos`

Leitura funcional:

- a comanda já nasce como entidade operacional central;
- ela conecta:
  - cliente;
  - itens/serviços;
  - status;
  - temporalidade;
  - valor.

Isso a coloca como elo natural entre cadastro, atendimento e financeiro.

### 5.3 Papel da comanda nos dois fluxos

No fluxo de clientes:

- a comanda aparece como consolidado de conta;
- o cliente vê quantidade e valor total;
- a abertura de comanda é uma ação de continuidade comercial.

No fluxo de animais:

- a comanda aparece como continuidade do atendimento do paciente;
- o detalhe do animal aponta para comandas anteriores e para abertura de nova comanda;
- a comanda faz a ponte entre contexto clínico e cobrança.

## 6. Superfície de Agenda

### 6.1 Rota e backend

Rota observada:

- `/agenda`

Backend confirmado:

- `GET /service`
- `GET /professional/basic`
- `GET /schedule`
- `GET /agenda/marcadores`
- `GET /schedule/profissional/disponibilidades`

### 6.2 O que a tela mostra

Elementos confirmados:

- botão `Criar agendamento`;
- filtros;
- alternância entre `Mês`, `Semana` e `Dia`;
- grade por profissional;
- visão temporal detalhada;
- suporte a disponibilidade.

Leitura funcional:

- a agenda não é simples lista de compromissos;
- ela é uma malha de capacidade, disponibilidade e alocação;
- depende de serviço e profissional além da data.

### 6.3 Papel da agenda nos fluxos

No fluxo de clientes:

- a agenda aparece como compromisso do relacionamento do tutor com a clínica;
- o detalhe do cliente resume próximo agendamento e metadados correlatos.

No fluxo de animais:

- a agenda aparece como compromisso do paciente;
- ela se encaixa melhor no ciclo de atendimento e retorno.

Conclusão:

- `cliente` consulta a agenda em nível agregado;
- `animal` consulta a agenda em nível assistencial.

## 7. Superfície Financeira

### 7.1 Rota e backend

Rota observada:

- `/dashboard-financeiro`

Backend confirmado:

- `GET /dashboard`

### 7.2 O que a tela mostra

Elementos confirmados:

- visão institucional da unidade;
- entradas e saídas;
- contas a receber;
- contas a pagar;
- gráficos de receita;
- fluxo de caixa;
- visão de gaveta;
- consolidados de clientes, animais, estoque e serviços.

Leitura funcional:

- o financeiro do beta está na camada de consolidação, não de registro por entidade clínica;
- ele absorve os resultados da operação;
- a repercussão de comandas e atendimentos sobe para esse nível.

### 7.3 Papel do financeiro nos fluxos

No fluxo iniciado por clientes:

- o detalhe do cliente já antecipa parte da visão financeira:
  - saldo devedor;
  - créditos;
  - total de comandas e vendas;
  - pacotes;
  - pontos.

No fluxo iniciado por animais:

- a camada financeira não é mostrada diretamente;
- o caminho é indireto, via comanda e via cliente.

Isso confirma uma decisão arquitetural clara:

- consolidado econômico no nível do cliente e do dashboard;
- não no nível do paciente.

## 8. Mapa explícito dos fluxos

### 8.1 Fluxo do cliente

Fluxo confirmado:

1. abrir detalhe do cliente;
2. visualizar animais vinculados;
3. abrir comanda pelo cliente ou por animal vinculado;
4. consultar resumo de agenda diretamente no detalhe;
5. consultar situação financeira diretamente no detalhe;
6. aprofundar em `comandas` ou `dashboard-financeiro` quando necessário.

Representação:

- `Cliente detalhe -> Animais Cadastrados -> Abrir Comanda`
- `Cliente detalhe -> Agenda`
- `Cliente detalhe -> Comandas e Vendas`
- `Cliente detalhe -> Situação Financeira`
- `Cliente detalhe -> Dashboard Financeiro` como aprofundamento conceitual, não como botão explícito confirmado

### 8.2 Fluxo do animal

Fluxo confirmado:

1. abrir detalhe do animal;
2. consultar histórico/últimos atendimentos;
3. abrir nova comanda ou ver comanda existente;
4. consultar agenda do paciente;
5. navegar para cadastro do cliente;
6. dali atingir a camada financeira consolidada.

Representação:

- `Animal detalhe -> Abrir Nova Comanda`
- `Animal detalhe -> Ver Comanda`
- `Animal detalhe -> Agenda`
- `Animal detalhe -> Ver cadastro do cliente -> Situação Financeira`

## 9. Diferenças fundamentais entre os dois caminhos

### 9.1 Cliente

- visão de conta;
- visão relacional;
- agregação financeira;
- agregação de animais;
- consolidação comercial.

### 9.2 Animal

- visão de paciente;
- visão clínica;
- acesso a atendimento e histórico;
- agenda assistencial;
- transição para comanda.

### 9.3 Efeito no produto

O Vetus não modela `cliente` e `animal` como telas espelhadas. Ele dá a cada uma uma função distinta no fluxo.

Isso é um acerto.

Se fossem espelhadas:

- haveria redundância;
- pioraria a descoberta da informação;
- e confundiria a responsabilidade de cada entidade.

## 10. Limitações da inspeção

- Não cliquei em `Abrir Nova Comanda` nem em `Criar agendamento`, para evitar qualquer risco de gerar registros.
- O fluxo `detalhe -> comanda` foi confirmado por presença de botões, blocos e estrutura das rotas, mas não por submissão real de formulário.
- O fluxo `agenda -> financeiro` foi estabelecido pela costura funcional das telas e do domínio, não por um wizard explícito que percorra os dois módulos automaticamente.
- O dashboard financeiro foi analisado como consolidado operacional, não como livro razão completo de cada comanda individual.

## 11. Conclusão

Os fluxos entre detalhe, comanda, agenda e financeiro estão bem estruturados no beta e seguem uma lógica consistente:

- `cliente` organiza relacionamento e dinheiro;
- `animal` organiza paciente e atendimento;
- `comanda` organiza a transação;
- `agenda` organiza o tempo e a alocação;
- `financeiro` organiza a consolidação econômica.

Fluxo mais forte a partir de clientes:

- `detalhe do cliente -> comanda -> situação financeira`

Fluxo mais forte a partir de animais:

- `detalhe do animal -> comanda -> cliente -> financeiro`

O elo mais importante do sistema é a comanda. Ela é a ponte real entre o que acontece no cadastro e o que aparece no financeiro.

## 12. Verificação

Fatos confirmados usados neste relatório:

- rota `/comandas` com backend `GET /commands/page-query`;
- rota `/agenda` com backend `GET /service`, `GET /professional/basic`, `GET /schedule`, `GET /agenda/marcadores`, `GET /schedule/profissional/disponibilidades`;
- rota `/dashboard-financeiro` com backend `GET /dashboard`;
- detalhe expandido de cliente com blocos de agenda, comandas e situação financeira;
- detalhe expandido de animal com blocos de agenda, atendimento e acesso a comanda;
- ausência de bloco financeiro explícito no detalhe do animal, o que sustenta a leitura de consolidação no cliente.
