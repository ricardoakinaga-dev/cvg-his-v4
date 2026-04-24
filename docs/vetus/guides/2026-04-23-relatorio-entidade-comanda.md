# Relatório da Entidade Comanda

Data-base da inspeção: 23 de abril de 2026

Escopo:

- análise específica da entidade `comanda` no beta autenticado;
- inspeção somente leitura da listagem e do detalhe;
- identificação de estrutura, campos, ciclo de vida, relação com cliente/animal, itens, status e impacto financeiro;
- uso complementar de captura histórica para ilustrar uma comanda preenchida, sem depender de escrita no ERP.

Evidências principais:

- [comandas-lista-expandida.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T22-58-13-495Z-comandas/screenshots/comandas-lista-expandida.png)
- [comandas-detalhe-expandido.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T22-58-13-495Z-comandas/screenshots/comandas-detalhe-expandido.png)
- [comandas-detalhe-expandido.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T22-58-13-495Z-comandas/comandas-detalhe-expandido.json)
- [network.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T22-58-13-495Z-comandas/network.json)
- [comandas-03-detalhe-comanda.png](/root/cvg-his-v2/docs/vetus/screenshots/comandas-03-detalhe-comanda.png)
- [11-modulo-comandas.md](/root/cvg-his-v2/docs/vetus/guides/11-modulo-comandas.md)

Nota de segurança:

- este relatório evita reproduzir nomes reais e outros dados identificáveis observados nas telas;
- quando necessário, descreve a estrutura e o comportamento da entidade, não o conteúdo sensível do registro inspecionado.

## 1. Síntese executiva

A `comanda` é a principal entidade transacional do beta.

Ela conecta diretamente:

- cliente;
- animal;
- produtos;
- serviços;
- histórico de esteira/encaminhamento;
- totalização financeira;
- fechamento operacional.

Leitura arquitetural:

- `cliente` é o titular econômico;
- `animal` é o contexto assistencial;
- `comanda` é o contêiner operacional onde esses dois mundos se encontram;
- o impacto financeiro é calculado dentro da comanda e consolidado fora dela no cliente e no financeiro global.

Em termos de produto, a comanda é o elo que transforma:

- cadastro em operação;
- operação em cobrança;
- cobrança em resultado financeiro.

## 2. Papel da entidade no sistema

A análise do beta atual confirma que a comanda não é apenas um registro de venda.

Ela atua simultaneamente como:

- unidade de atendimento;
- unidade de cobrança;
- unidade de vínculo cliente-animal;
- unidade de composição de itens;
- unidade de estado operacional;
- unidade de trilha/esteira.

Isso fica evidente porque o detalhe da comanda reúne, na mesma tela:

- animal vinculado;
- cliente responsável;
- produtos;
- serviços;
- observações;
- histórico de esteira;
- resumo da conta;
- ações de finalização e exclusão.

## 3. Backend confirmado

### 3.1 Listagem

Na listagem de comandas foi confirmada:

- `GET /commands/page-query`

Isso sugere paginação e busca orientadas a consulta resumida da entidade.

### 3.2 Detalhe

No detalhe de uma comanda existente foram confirmadas:

- `GET /commands/{id}`
- `GET /clients/{id}`
- `GET /attendance/command/{id}`
- `GET /runningMachines/page-query?commandId={id}&page=0&size=100`
- `GET /company-sector?companyId=1`
- `GET /notificacoes/contagens/47`

Sem respostas `>= 400` no recorte de rede do detalhe.

Leitura dessas chamadas:

- `commands/{id}` entrega o núcleo da comanda;
- `clients/{id}` abastece a contextualização do responsável;
- `attendance/command/{id}` indica que a comanda possui ligação explícita com o domínio de atendimento;
- `runningMachines/page-query` sugere vínculo com esteira operacional;
- `company-sector` sugere necessidade de informação organizacional/setorial no detalhe.

## 4. Estrutura da listagem

Rota:

- `/comandas`

Evidência principal:

- [comandas-lista-expandida.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T22-58-13-495Z-comandas/screenshots/comandas-lista-expandida.png)

### 4.1 Componentes principais

Elementos confirmados:

- campo de busca com placeholder `Buscar por Nome, CPF, E-mail ou ID`;
- botão `Filtrar`;
- CTA `Abrir Nova Comanda`;
- paginação;
- cards por comanda;
- expansões `Informações do cliente` e `Serviços / Produtos`.

### 4.2 Campos expostos na listagem

Cada card de comanda expõe pelo menos:

- status;
- ID da comanda;
- data/hora de abertura;
- data/hora de fechamento, quando houver;
- cliente;
- valor total;
- ação `Ver comanda`.

### 4.3 Estados observados

Estados confirmados visualmente:

- `Aberta`
- `Fechada`

Diferença operacional visível:

- comanda aberta aparece sem fechamento;
- comanda fechada exibe horário/data de fechamento e valor já consolidado.

Isso mostra que a listagem já expressa estágio do ciclo de vida, não apenas catálogo de registros.

## 5. Estrutura da tela de detalhe

Rota observada:

- `/comandas/31514`

Evidência principal:

- [comandas-detalhe-expandido.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T22-58-13-495Z-comandas/screenshots/comandas-detalhe-expandido.png)

O detalhe usa um layout em duas grandes áreas:

- coluna principal à esquerda para composição e histórico da comanda;
- painel lateral à direita para status, metadados e fechamento.

### 5.1 Blocos da coluna principal

Blocos confirmados:

- `Animais Vinculados na Comanda`
- `Produtos`
- `Serviços`
- `Observações Gerais`
- `Histórico de Esteira`
- `Resumo da Conta`

### 5.2 Blocos do painel lateral

Blocos confirmados:

- status visual da comanda;
- ID da comanda;
- abertura;
- usuário que abriu;
- empresa;
- cliente;
- `Ver Informações de Contato`;
- `Ver Cadastro do Cliente`;
- total a pagar;
- `Finalizar Comanda`;
- `Excluir Comanda`.

Leitura:

- a tela foi desenhada para uso operacional contínuo;
- à esquerda o operador monta/acompanha a comanda;
- à direita ele valida contexto e decide o fechamento.

## 6. Relação com cliente e animal

Essa é uma das características mais fortes da entidade.

### 6.1 Vínculo com animal

O bloco `Animais Vinculados na Comanda` mostra:

- quantidade de animais vinculados;
- cartão do animal;
- espécie/raça/faixa etária contextual;
- ação `Prontuário`;
- ação `Incluir Animal`.

O bloco `Serviços` também reapresenta o animal no contexto da execução.

Isso mostra que:

- a comanda tem associação explícita com um ou mais animais;
- o animal não é apenas referência textual;
- ele participa da composição funcional da comanda.

### 6.2 Vínculo com cliente

O painel lateral mostra:

- cliente responsável;
- expansão de contato;
- botão `Ver Cadastro do Cliente`.

Isso mostra que:

- a comanda pertence economicamente ao cliente;
- o cliente é a âncora de relacionamento e cobrança;
- a UI permite voltar ao cadastro do cliente sem perder a cadeia operacional.

### 6.3 Conclusão relacional

Modelo funcional mais provável:

- `Cliente` 1:N `Comandas`
- `Comanda` N:1+ `Animais` vinculados

Em termos de domínio:

- a cobrança é do cliente;
- o atendimento é contextualizado por animal;
- a comanda materializa essa dupla.

## 7. Campos e informações observadas

### 7.1 Metadados da comanda

Campos confirmados:

- status;
- ID da comanda;
- data/hora de abertura;
- usuário que abriu;
- empresa/unidade;
- cliente;
- contato do cliente;
- total a pagar.

### 7.2 Campos operacionais da composição

Campos confirmados:

- campo de código de barras para produto;
- textarea de observações gerais;
- total de produtos;
- total de serviços;
- botões de inclusão de produto, serviço, animal, despesa extra e desconto.

Campos confirmados nos itens em captura histórica:

- descrição do item;
- valor unitário;
- quantidade;
- vendedor/operador;
- data/hora associada;
- ações de editar e excluir.

### 7.3 Campos de trilha operacional

No `Histórico de Esteira` apareceram:

- urgência/status de fila;
- horário de entrada;
- setor anterior;
- setor receptor;
- enviado por;
- ação para ver mais informações.

Isso mostra que a comanda não é só financeira. Ela também participa de um fluxo interno de execução.

## 8. Itens: produtos, serviços, descontos e despesas

### 8.1 Produtos

No estado atual inspecionado, a comanda aberta estava vazia em produtos.

Mesmo assim, a estrutura confirma:

- input para código de barras;
- total da seção;
- CTA `Adicionar Produtos`.

No acervo histórico, uma comanda preenchida confirma:

- múltiplos itens de produto;
- valor individual por item;
- quantidade controlável;
- vendedor associado;
- edição e exclusão por item.

### 8.2 Serviços

A seção de serviços confirma:

- total próprio da seção;
- vínculo do serviço ao animal;
- CTA `Incluir Serviços`;
- acesso `Ver Detalhes do Animal`.

Leitura:

- serviços não são itens genéricos;
- eles são associados ao animal dentro da comanda.

### 8.3 Desconto e despesa extra

No `Resumo da Conta` há ações explícitas:

- `Incluir Despesa Extra`
- `Incluir Desconto`

Isso mostra que a comanda já suporta ajustes monetários fora da simples soma de itens.

Consequência:

- o total a pagar é resultado de composição;
- não é apenas soma linear de produtos e serviços.

## 9. Status e ciclo de vida

Estados confirmados:

- `Aberta`
- `Fechada`

Sinais de transição observados:

- presença do botão `Finalizar Comanda` no detalhe;
- presença de `Excluir Comanda`;
- presença de `Encaminhar Esteira`;
- presença de abertura e, quando aplicável, fechamento na listagem.

### 9.1 Ciclo de vida inferido

Com base nas telas, o ciclo de vida mínimo parece ser:

1. criação/abertura da comanda;
2. vínculo com cliente;
3. vínculo com um ou mais animais;
4. composição de produtos e serviços;
5. registro de observações e trilha de esteira;
6. eventual aplicação de despesa extra ou desconto;
7. totalização financeira;
8. finalização;
9. aparecimento como `Fechada` na listagem.

### 9.2 Papel da esteira no ciclo

O botão `Encaminhar Esteira` e o bloco `Histórico de Esteira` indicam que a comanda pode circular por estágios internos.

Isso sugere um ciclo não apenas comercial, mas operacional:

- abrir;
- encaminhar;
- executar;
- consolidar;
- finalizar.

## 10. Impacto financeiro

### 10.1 Dentro da própria comanda

O impacto financeiro aparece diretamente em:

- total de produtos;
- total de serviços;
- valor da comanda;
- total a pagar;
- descontos;
- despesas extras.

Ou seja, a comanda já é um mini-ledger operacional.

### 10.2 Na listagem

O valor total da comanda já é exposto na listagem.

Isso permite:

- priorização visual por valor;
- leitura rápida de tickets fechados e abertos;
- identificação de comandas abertas ainda zeradas ou incompletas.

### 10.3 No sistema como um todo

A comanda também repercute em outros lugares:

- no detalhe do cliente, em `Comandas e Vendas`;
- no detalhe do cliente, em `Situação Financeira`;
- no dashboard financeiro, como parte do consolidado econômico.

Conclusão:

- a comanda é a origem imediata do valor operacional;
- o cliente é o nível de consolidação relacional;
- o financeiro agrega o resultado de múltiplas comandas.

## 11. Ações disponíveis

Na inspeção do beta atual, foram confirmadas estas ações:

- abrir nova comanda;
- ver comanda;
- filtrar;
- incluir animal;
- abrir prontuário do animal;
- adicionar produtos;
- incluir serviços;
- ver detalhes do animal;
- registrar observações;
- ver informações de contato do cliente;
- ver cadastro do cliente;
- incluir despesa extra;
- incluir desconto;
- encaminhar esteira;
- imprimir;
- finalizar comanda;
- excluir comanda;
- voltar para listagem.

Essas ações colocam a comanda como área de trabalho completa, não só tela de consulta.

## 12. Qualidade do desenho da entidade

Pontos fortes:

- ótima costura entre atendimento e cobrança;
- animal e cliente aparecem com papéis claros;
- composição de itens é explícita;
- resumo financeiro é visível e contínuo;
- esteira operacional está embutida na própria entidade;
- o painel lateral organiza bem status e fechamento.

Tradeoffs:

- a tela é densa e exige usuário frequente;
- parte das ações é potencialmente destrutiva e precisa boa governança de permissão;
- a sobreposição do widget NPS atrapalha a leitura inferior em algumas capturas.

## 13. Conclusão

A entidade `comanda` é o principal núcleo transacional do beta.

Ela resolve, numa só estrutura:

- vínculo com cliente;
- vínculo com animal;
- inclusão de produtos;
- inclusão de serviços;
- observações;
- esteira operacional;
- cálculo financeiro;
- fechamento.

Se fosse necessário escolher a entidade mais importante para entender a lógica do sistema, seria a comanda.

Ela é o ponto em que:

- o cadastro vira operação;
- a operação vira valor;
- e o valor passa a compor o financeiro do cliente e do sistema.

## 14. Verificação

Confirmações usadas neste relatório:

- listagem de comandas com status `Aberta` e `Fechada`;
- detalhe atual de uma comanda aberta em `/comandas/31514`;
- endpoints do detalhe:
  - `GET /commands/31514`
  - `GET /clients/7675`
  - `GET /attendance/command/31514`
  - `GET /runningMachines/page-query?commandId=31514&page=0&size=100`
  - `GET /company-sector?companyId=1`
- nenhuma resposta `>= 400` no recorte de rede do detalhe;
- confirmação visual de composição com itens em captura histórica complementar.
