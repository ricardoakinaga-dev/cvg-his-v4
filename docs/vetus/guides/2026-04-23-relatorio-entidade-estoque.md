# Relatório do Domínio Estoque

Data-base da inspeção: 23 de abril de 2026

Escopo:

- análise específica do domínio `estoque`;
- foco em produto, custo, entrada, saldo, transferência, compra e movimentação;
- comparação entre cadastros `beta` e operações `legacy`;
- inspeção somente leitura, sem inclusão de produto, sem entrada de nota, sem estocagem e sem transferência.

Evidências principais:

- [estoque-beta-produtos.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/screenshots/estoque-beta-produtos.png)
- [estoque-beta-produtos.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/estoque-beta-produtos.json)
- [estoque-beta-estoques.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/screenshots/estoque-beta-estoques.png)
- [estoque-beta-estoques.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/estoque-beta-estoques.json)
- [estoque-beta-fornecedores-despesas.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/screenshots/estoque-beta-fornecedores-despesas.png)
- [estoque-beta-fornecedores-despesas.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/estoque-beta-fornecedores-despesas.json)
- [estoque-beta-fabricantes.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/screenshots/estoque-beta-fabricantes.png)
- [estoque-beta-grupos-produto.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/screenshots/estoque-beta-grupos-produto.png)
- [estoque-legacy-consulta-precos.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/screenshots/estoque-legacy-consulta-precos.png)
- [estoque-legacy-consulta-precos.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/estoque-legacy-consulta-precos.json)
- [estoque-legacy-entrada-nota-fiscal.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/screenshots/estoque-legacy-entrada-nota-fiscal.png)
- [estoque-legacy-entrada-nota-fiscal.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/estoque-legacy-entrada-nota-fiscal.json)
- [estoque-legacy-transacao-estoque.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/screenshots/estoque-legacy-transacao-estoque.png)
- [estoque-legacy-transacao-estoque.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/estoque-legacy-transacao-estoque.json)
- [estoque-legacy-transferencia-estoques.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/screenshots/estoque-legacy-transferencia-estoques.png)
- [estoque-legacy-transferencia-estoques.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/estoque-legacy-transferencia-estoques.json)
- [estoque-legacy-compras.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/screenshots/estoque-legacy-compras.png)
- [estoque-legacy-compras.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/estoque-legacy-compras.json)
- [network.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-41-46-292Z-estoque/network.json)
- [2026-04-23-relatorio-entidade-vendas.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-entidade-vendas.md)
- [2026-04-23-relatorio-entidade-financeiro.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-entidade-financeiro.md)

Nota de segurança:

- a rodada foi somente leitura;
- não houve cadastro, compra, entrada de nota, estocagem manual nem transferência entre estoques;
- a leitura foi feita por interface visível, markup e rede.

## 1. Síntese executiva

O domínio `estoque` no Vetus está dividido em duas camadas bastante nítidas.

No `beta`, ficam os cadastros mestres e as listas operacionais modernas:

- `Produtos`
- `Estoques`
- `Fornecedores e Despesas`
- `Fabricantes`
- `Grupos de Produto`

No `legacy`, permanecem as operações de movimentação:

- `Consulta de Preços`
- `Entrada de Nota Fiscal`
- `Transação no Estoque`
- `Transferência entre Estoques`
- `Compras`

Leitura objetiva:

- o `beta` organiza o cadastro e a visão de catálogo;
- o `legacy` continua responsável pelas entradas e movimentos que alteram saldo.

## 2. Arquitetura do domínio

### 2.1 Superfície beta

Rotas confirmadas:

- `/produtos`
- `/estoques`
- `/fornecedores-e-despesas`
- `/fabricantes`
- `/grupos-de-produto`

APIs confirmadas na rede:

- `GET https://dorylus.vetus.com.br/products/dashboard?size=10&page=0&active=true&sort=id,desc`
- `GET https://dorylus.vetus.com.br/stock?size=10&page=0&search=`
- `GET https://dorylus.vetus.com.br/provider?size=10&page=0&search=&sort=id,desc&name=&contact=&telephone=`
- `GET https://dorylus.vetus.com.br/manufacturer?size=10&page=0&search=`
- `GET https://dorylus.vetus.com.br/product-group?size=10&page=0&search=`

Leitura:

- o estoque beta já tem backend dedicado;
- o modelo é claramente paginado e filtrável;
- a camada moderna cobre cadastros-chave para operação de produto.

### 2.2 Superfície legacy

Rotas confirmadas:

- `Sistema/Estoque/ConsultaDePrecos.htm`
- `Sistema/Estoque/EntradaNotaFiscal.htm`
- `Sistema/Estoque/TransacaoNoEstoque.htm`
- `Sistema/Estoque/TransferenciaEntreEstoques.htm`
- `Sistema/Estoque/Compras.htm`

Stack confirmada:

- `JSF`
- `PrimeFaces`
- `javax.faces.ViewState`
- postback/Ajax parcial

Leitura:

- o legado continua sendo a camada transacional de estoque;
- ele atua no nível de alteração concreta de quantidade, saldo e entrada documental.

## 3. Estrutura do beta

### 3.1 Produtos

Rota:

- `/produtos`

Elementos confirmados:

- título `Produtos`
- `Busca Avançada`
- `Incluir Novo Produto`
- busca por `ID, cód. de barras, descrição ou nome`
- paginação e contagem de resultados
- cards com:
  - `Nome`
  - `ID`
  - `Código de Barras`
  - `Valor de Venda`
  - `Descrição`
  - `Ver Detalhes`

Leitura:

- o produto é tratado como cadastro comercial e de estoque ao mesmo tempo;
- o valor de venda aparece diretamente na listagem;
- a presença de código de barras reforça uso em balcão, compra e movimentação.

### 3.2 Estoques

Rota:

- `/estoques`

Elementos confirmados:

- título `Estoques`
- `Incluir Novo Estoque`
- busca por `ID ou descrição`
- registros como:
  - `GELADEIRA VACINAS`
  - `FARMÁCIA`
  - `CENTRO CIRÚRGICO`
  - `LABORATÓRIO`
  - `RECEPÇÃO/ESCRITÓRIO`

Leitura:

- o conceito de estoque é físico/setorial;
- o sistema suporta múltiplos pontos de armazenagem internos;
- a modelagem vai além de “depósito único” e reflete a planta operacional da clínica.

### 3.3 Fornecedores e Despesas

Rota:

- `/fornecedores-e-despesas`

Elementos confirmados:

- título `Fornecedores e Despesas`
- `Busca Avançada`
- `Incluir Novo Registro`
- resultado paginado
- cards com:
  - `Descrição`
  - `Categoria`
  - `Contato`
  - `Ver Detalhes`

Leitura:

- fornecedor e despesa compartilham o mesmo cadastro mestre;
- isso liga compras, entrada de nota e financeiro;
- a categoria do registro é parte explícita do modelo.

### 3.4 Fabricantes

Rota:

- `/fabricantes`

Elementos confirmados:

- título `Fabricantes`
- `Incluir Novo Fabricante`
- busca por `ID ou nome`

No estado capturado:

- `Nenhum registro encontrado`

Leitura:

- fabricante é entidade de apoio do catálogo;
- ele existe como camada separada do fornecedor.

### 3.5 Grupos de Produto

Rota:

- `/grupos-de-produto`

Elementos confirmados:

- título `Grupos de Produto`
- `Incluir Novo Grupo`
- registros como:
  - `PRODUTOS DE LIMPEZA E COPA`
  - `FARMÁCIA`
  - `VACINAS`
  - `MEDICAMENTOS CONTROLADOS`
  - `MEDICAMENTOS`
  - `INSUMOS`

Leitura:

- o grupo de produto é classificação primária do catálogo;
- ele mistura natureza comercial e natureza regulatória;
- essa taxonomia afeta compra, estoque, venda e possivelmente fiscal.

## 4. Estrutura do legado operacional

### 4.1 Consulta de Preços

Rota:

- `ConsultaDePrecos.htm`

Blocos confirmados:

- `Consultar Produtos`
- `Consultar Serviços`
- campos:
  - `Código de Barras`
  - `Ou Descrição do Produto`
  - `Descrição`
  - `Apelido`
  - `Saldo em Estoque`
  - `Valor de Venda`

Leitura:

- essa tela é ponte entre estoque e preço;
- o sistema permite consultar produto e serviço no mesmo módulo;
- saldo e preço convivem na mesma superfície, aproximando operação de estoque e balcão.

### 4.2 Entrada de Nota Fiscal

Rota:

- `EntradaNotaFiscal.htm`

Colunas confirmadas:

- `Id`
- `Nota Fiscal`
- `Data da Entrada`
- `Fornecedor`
- `Abrir`

Campos adicionais confirmados:

- `Incluir Nota Fiscal`
- `Data da Entrada`
- `Fornecedor`
- `Pesquisar NFe fechadas`
- diálogo com:
  - `quantidade`
  - `código de barras`
  - `produto`
  - `valor unitário`
  - `unidade`

Leitura:

- a entrada fiscal é uma operação documental e quantitativa;
- fornecedor é eixo obrigatório;
- a entrada empurra item, quantidade e custo unitário para dentro do estoque.

### 4.3 Transação no Estoque

Rota:

- `TransacaoNoEstoque.htm`

Campos confirmados:

- `Estoque`
- `Código de Barras`
- `Produto`
- `Saldo Atual`
- `Quantidade a Estocar`
- `Observação`
- ação `Estocar Produto`

Leitura:

- essa é a operação manual de incremento de saldo;
- o estoque alvo é obrigatório;
- o sistema trata a transação como evento com observação justificável;
- é uma movimentação mais simples e direta que uma nota fiscal.

### 4.4 Transferência entre Estoques

Rota:

- `TransferenciaEntreEstoques.htm`

Campos confirmados:

- `Estoque Origem`
- `Estoque Destino`
- `Código de Barras`
- `Descrição Produto`
- `Saldo na Origem`
- `Saldo no Destino`
- `Quantidade a Transferir`
- ação `Efetuar Transferência`

Leitura:

- a clínica opera múltiplos estoques internos;
- a transferência é controlada com visibilidade dos dois saldos;
- isso confirma que o sistema não trata locais de armazenagem como simples etiquetas, mas como estoques autônomos.

### 4.5 Compras

Rota:

- `Compras.htm`

Elementos confirmados:

- `Incluir`
- `Fornecedor`
- `Data`
- `Pesquisar Compras Fechadas`
- tabela com:
  - `Fornecedor`
  - `Data`
  - `Abrir`

Leitura:

- compra é entidade própria, distinta da entrada de nota;
- ela se conecta a fornecedor e data;
- o domínio separa planejamento/registro de compra da efetiva entrada fiscal do item.

## 5. Produto, custo, saldo e movimentação

Essa é a principal cadeia confirmada pela rodada.

### 5.1 Produto

O produto aparece como entidade central do domínio.

Atributos confirmados na superfície:

- `ID`
- `nome`
- `descrição`
- `apelido`
- `código de barras`
- `valor de venda`

Leitura:

- o produto não é só item de estoque;
- ele também é item comercial pronto para uso em `vendas` e `comandas`.

### 5.2 Custo

O custo não aparece como campo explícito nomeado em todas as telas capturadas, mas a entrada de nota fiscal revela o ponto onde ele nasce:

- `valor unitário`
- `fornecedor`
- `quantidade`
- `unidade`

Inferência sustentada:

- o custo entra no sistema principalmente por compra/nota fiscal;
- o preço de venda é exibido depois na consulta e no cadastro do produto;
- portanto, estoque faz a ponte entre aquisição e monetização do item.

### 5.3 Saldo

O saldo aparece diretamente em mais de uma tela:

- `Saldo em Estoque` na consulta de preços
- `Saldo Atual` na transação no estoque
- `Saldo na Origem`
- `Saldo no Destino`

Leitura:

- o sistema modela saldo atual por estoque;
- a quantidade disponível é visível antes da ação operacional;
- a movimentação é pensada para evitar transferência ou estocagem cega.

### 5.4 Movimentação

Os tipos principais de movimentação confirmados foram:

- entrada por nota fiscal
- estocagem manual
- transferência entre estoques
- compra

Leitura:

- o domínio de estoque é mais maduro do que simples cadastro de produto;
- ele cobre aquisição, entrada, redistribuição e consulta operacional.

## 6. Relação com vendas, comanda e financeiro

O estoque fecha bem a cadeia inspecionada até aqui.

### 6.1 Relação com vendas

A relação com `vendas` é direta:

- o produto no beta já mostra `valor de venda`;
- `vendas` opera itens de produto e pagamento;
- logo, a venda consome o catálogo do estoque.

Leitura:

- estoque fornece o item comercial;
- vendas transforma o item em receita.

### 6.2 Relação com comanda

A relação com `comanda` também é estrutural:

- `comanda` já demonstrou composição de itens;
- consulta de preços no legado enxerga `produtos` e `serviços` no mesmo módulo;
- isso sugere uma ponte operacional forte entre catálogo de produto e execução em comanda.

Leitura:

- comanda consome item do domínio de estoque quando o atendimento envolve produto físico;
- o estoque entra no fluxo assistencial por trás da entidade transacional.

### 6.3 Relação com financeiro

A relação com `financeiro` aparece por dois lados:

- `fornecedores e despesas` conecta o cadastro de compras ao contas a pagar;
- `valor de venda` conecta o produto ao faturamento em vendas/comandas e depois ao financeiro.

Resumo:

- compra e entrada alimentam custo e obrigação financeira;
- venda e comanda alimentam receita;
- estoque é a ponte material entre os dois lados.

## 7. Modelo funcional inferido

Com base nas telas capturadas, o domínio de estoque pode ser lido assim:

1. cadastros beta estruturam produto, grupo, fabricante, fornecedor e estoque físico;
2. compras e nota fiscal no legado trazem o item para dentro da empresa;
3. transação no estoque e transferência entre estoques ajustam disponibilidade real;
4. consulta de preços expõe saldo e preço para operação comercial;
5. vendas e comandas consomem o item;
6. financeiro absorve o reflexo econômico da compra e da venda.

Essa cadeia é coerente com o ERP híbrido já observado.

## 8. Diferença entre estoque beta e estoque legacy

`Estoque beta`:

- catálogo e cadastro;
- listas modernas com paginação;
- busca, filtro e cards;
- backend API em `dorylus`.

`Estoque legacy`:

- operações que alteram saldo;
- compra;
- entrada documental;
- estocagem manual;
- transferência entre estoques;
- consulta operacional de preço/saldo.

Conclusão objetiva:

- o beta modela e organiza;
- o legado movimenta.

## 9. Limitações da inspeção

- o botão `Ver Detalhes` dos produtos não abriu uma ficha detalhada nesta passada;
- por isso, a leitura de produto ficou baseada na listagem e não no detalhe completo;
- as telas legadas de `compras` e `entrada de nota` apareceram vazias, mas mesmo assim revelaram estrutura suficiente de campos e tabelas;
- nenhuma operação foi confirmada por execução, apenas por superfície visível.

## 10. Conclusão

O domínio `estoque` do Vetus é a camada material que conecta aquisição, disponibilidade e venda.

O `beta` já cobre bem o cadastro mestre:

- produto
- grupo
- fabricante
- fornecedor
- estoque físico

Mas o `legacy` segue indispensável para a operação real:

- entrada de nota fiscal
- compra
- estocagem
- transferência
- consulta de preço e saldo

A leitura arquitetural mais importante desta rodada é:

- `produto` nasce como entidade de catálogo e venda;
- `estoque` físico é setorial e múltiplo;
- `compra` e `nota fiscal` alimentam quantidade e custo;
- `venda` e `comanda` consomem o item;
- `financeiro` fecha o reflexo monetário dessa cadeia.
