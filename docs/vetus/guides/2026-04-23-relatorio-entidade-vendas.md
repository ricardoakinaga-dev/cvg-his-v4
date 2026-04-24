# Relatório da Entidade Vendas

Data-base da inspeção: 23 de abril de 2026

Escopo:

- análise específica do módulo `vendas`;
- comparação entre `Vendas (beta)` e `Vendas` legacy;
- foco em estrutura do módulo, relação com `comanda`, relação com `cliente` e `animal`, itens, totais, descontos, formas de pagamento, status, fechamento e impacto fiscal/financeiro;
- inspeção somente leitura, sem criação de venda, sem inclusão de item e sem persistência no ERP.

Evidências principais:

- [vendas-beta-lista.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-26-06-167Z-vendas/screenshots/vendas-beta-lista.png)
- [vendas-beta-lista.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-26-06-167Z-vendas/vendas-beta-lista.json)
- [vendas-legacy-lista.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-26-06-167Z-vendas/screenshots/vendas-legacy-lista.png)
- [vendas-legacy-lista.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-26-06-167Z-vendas/vendas-legacy-lista.json)
- [vendas-legacy-lista.html](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-26-06-167Z-vendas/vendas-legacy-lista.html)
- [estado-vendas-legacy.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-26-06-167Z-vendas/estado-vendas-legacy.json)
- [network.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-26-06-167Z-vendas/network.json)
- [2026-04-23-relatorio-entidade-comanda.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-entidade-comanda.md)
- [2026-04-23-relatorio-entidade-servico.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-entidade-servico.md)
- [2026-04-23-relatorio-fluxos-detalhe-comanda-agenda-financeiro.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-fluxos-detalhe-comanda-agenda-financeiro.md)

Nota de segurança:

- este relatório evita reproduzir dados sensíveis do ambiente;
- a leitura foi feita a partir de estrutura, markup, rede e estados visíveis das telas;
- não houve inclusão de item, escolha de cliente, gravação ou exclusão.

## 1. Síntese executiva

O módulo `vendas` hoje existe em duas superfícies com maturidades muito diferentes.

`Vendas (beta)`:

- funciona como listagem moderna de vendas abertas;
- tem filtro, ordenação e CTA de criação;
- consome backend beta dedicado;
- ainda não expõe, nesta passagem, a profundidade operacional do legado.

`Vendas` legacy:

- é a superfície operacional completa;
- abre diretamente em modo de manutenção da venda;
- concentra cliente, itens, descontos, pagamentos, impressão, exclusão e detalhes internos;
- continua sendo a referência principal para a execução transacional da entidade.

Leitura de produto:

- o beta já representa o índice e a porta de entrada;
- o legado ainda concentra a jornada completa da venda.

## 2. Diferenças entre Vendas legada e Vendas (beta)

Essa é a principal conclusão da rodada.

### 2.1 Vendas (beta)

Rota:

- `/vendas`

Heading confirmado:

- `Venda de Produtos`

Elementos confirmados:

- `Filtrar`
- ordenação
- `Nova Venda`
- busca com placeholder `Busque por ID, ID no PDV, Nome ou CPF do Cliente`

Backend confirmado no recorte de rede:

- `GET /vendas?page=1&size=20&status=ABERTA&ordenacao=data:desc`

Leitura:

- a tela está orientada a listagem;
- trabalha com noção explícita de `status=ABERTA`;
- sugere paginação e ordenação server-side;
- mostra um índice operacional das vendas abertas.

No estado capturado, o beta exibiu empty state:

- `Você ainda não tem vendas cadastradas`

### 2.2 Vendas legada

Rota:

- `https://erp.vetus.com.br/Sistema/Atendimento/Vendas.htm`

Acesso confirmado por SSO híbrido:

1. tentativa de abrir `Vendas.htm`;
2. redirecionamento para `erp-beta.vetus.com.br/login?returnUrl=...`;
3. emissão de `accessToken` para `erp.vetus.com.br/NewLogin.htm?...`;
4. seleção de empresa;
5. entrega final de `Vendas.htm`.

Leitura:

- o legado ainda é a superfície principal de edição/fechamento;
- o beta atua como autenticador e shell de navegação.

### 2.3 Diferença estrutural

`Vendas (beta)`:

- índice/listagem;
- UX de busca e gestão de fila;
- linguagem SPA moderna.

`Vendas` legacy:

- ficha transacional completa;
- UX de operação detalhada;
- stack `JSF + PrimeFaces` com `ViewState`, postback e Ajax parcial.

Conclusão objetiva:

- elas não são equivalentes;
- hoje o beta não substitui integralmente o legado.

## 3. Estrutura do módulo

### 3.1 Estrutura do beta

A superfície beta é enxuta.

O que ficou confirmado:

- título `Venda de Produtos`;
- filtro;
- ordenação;
- busca textual;
- paginação implícita;
- CTA `Nova Venda`;
- listagem de vendas abertas.

Não apareceram nesta passada:

- abas internas;
- campos de pagamento;
- composição de itens;
- painel de totalização.

Isso reforça que o beta está num estágio mais indexador do que editor.

### 3.2 Estrutura do legacy

A superfície legacy é uma ficha completa de venda.

Blocos confirmados:

- cabeçalho da venda;
- abas `Produtos Vendidos`, `Observações`, `Pagamentos`, `Detalhes`;
- grade de itens;
- bloco de totalização;
- barra de ações;
- diálogo de inclusão de produto;
- diálogo de exclusão;
- diálogo de QR code / copiar URL;
- impressão.

Leitura:

- a venda no legado é tratada como entidade transacional de ponta a ponta;
- a tela cobre criação, edição, composição, totalização, fechamento, impressão e exclusão.

## 4. Relação com cliente e animal

### 4.1 Cliente

Relação com cliente confirmada diretamente no legacy:

- campo `Cliente`
- campo `CPF/CNPJ`

No beta, a busca também confirma esse vínculo:

- placeholder aceita `Nome ou CPF do Cliente`

Leitura:

- a venda é claramente ancorada no cliente;
- o cliente é o titular relacional e econômico da transação.

### 4.2 Animal

Não apareceu campo explícito de `animal` na tela de venda capturada.

Isso é uma diferença relevante em relação à `comanda`.

Leitura:

- a venda parece ser menos centrada em paciente e mais centrada em cliente + produto;
- quando há relação clínica direta com animal, essa jornada tende a ser melhor representada pela `comanda`, não pela venda.

Inferência sustentada pelos módulos já inspecionados:

- `comanda` é a entidade que conecta cliente e animal no contexto assistencial;
- `venda` parece atender principalmente transação comercial de produtos.

## 5. Relação com comanda

Não apareceu campo explícito de referência a `comanda` na tela de venda legacy capturada.

Mesmo assim, a relação entre os domínios é forte por contexto:

- ambos vivem em `Atendimento`;
- ambos alimentam relatórios conjuntos `Comandas/Vendas`;
- ambos repercutem em faturamento e financeiro;
- ambos têm exclusão conjunta em `Exclusão de Vendas e Comandas`.

Leitura:

- `comanda` e `venda` são entidades irmãs no domínio transacional;
- a `comanda` é mais híbrida entre atendimento e cobrança;
- a `venda` é mais comercial e orientada a produto.

Resumo prático:

- comanda: atendimento + cliente + animal + serviços/produtos;
- venda: cliente + produto + pagamento + fechamento comercial.

## 6. Itens da venda

Essa parte ficou muito bem exposta no legacy.

A aba `Produtos Vendidos` confirma:

- coluna `Produto`
- coluna `Profissional`
- coluna `Quantidade`
- coluna `Valor Unitário`
- coluna `Valor Descontado`
- coluna `Valor Total`
- ação `Editar`
- ação `Excluir`

O rodapé da grade confirma:

- CTA `Incluir Produto`

No estado capturado:

- `Nenhum produto vendido`

Ainda assim, a modelagem já está clara.

Leitura:

- o item de venda é granular;
- cada item pode carregar profissional associado;
- cada item possui quantidade, preço unitário, valor descontado e valor total;
- desconto não é apenas global; existe também no nível do item.

## 7. Totais e descontos

O bloco inferior do legacy confirma quatro agregados principais:

- `Valor da Venda`
- `Desconto`
- `Valor descontado`
- `Valor Final`

No estado capturado todos estavam em `0,00`, mas a lógica estrutural é clara.

Leitura:

- existe subtotal bruto;
- existe desconto informado;
- existe cálculo derivado de valor abatido;
- existe total final consolidado.

Isso mostra que a venda tem:

- desconto global;
- desconto por item;
- cálculo financeiro explícito antes do fechamento.

## 8. Formas de pagamento

A aba `Pagamentos` confirmou uma tabela com:

- `Forma de Pagamento`
- `Valor`

No estado capturado:

- `Nenhuma pagamento para esta venda`

Leitura:

- a venda admite múltiplos pagamentos ou, no mínimo, pagamentos estruturados em linhas;
- forma de pagamento é parte nativa da entidade;
- o módulo não delega totalmente a quitação para outra tela.

Isso aproxima a venda de um fechamento comercial completo, não apenas de um pedido.

## 9. Status e fechamento

### 9.1 Beta

O beta explicita status na própria chamada:

- `status=ABERTA`

Isso confirma que o índice beta está orientado por estado da venda.

### 9.2 Legacy

No legacy não apareceu badge textual de status na ficha aberta.

Mas o comportamento operacional de fechamento está claro pelas ações:

- `Salvar`
- `Fechar`
- `Pesquisar`
- `Imprimir`
- `Excluir Venda`

Leitura:

- o estado da venda no legado é inferido mais pela fase operacional da ficha do que por um badge visual explícito;
- `Fechar` atua como marco de encerramento da operação da tela;
- `Imprimir` e QR code indicam fase posterior de materialização/comunicação da venda.

Conclusão:

- no beta, status é critério de listagem;
- no legado, fechamento é ação transacional da própria ficha.

## 10. Impacto fiscal e financeiro

A venda toca diretamente o domínio financeiro.

Evidências diretas:

- aba `Pagamentos`;
- totalização com `Valor Final`;
- ação `Imprimir`;
- alerta de maquininha e impressão;
- QR code com ação `Copiar URL`.

Leitura:

- a venda gera obrigação de cobrança;
- a venda pode ser materializada em impressão ou fluxo digital;
- a venda se conecta a formas de pagamento e operacionalização de recebimento.

Também há evidências indiretas fortes no ecossistema:

- menu de `Formas de Pagamento`;
- `Habilitar Pagamento`;
- `Pagamento Dashboard`;
- `Contas Adm. Cartão`;
- `Transações de Cartão`;
- relatórios `Comandas/Vendas`.

Portanto, a venda não é só um lançamento interno. Ela é uma entidade de faturamento efetivo.

## 11. Construção técnica

### 11.1 Beta

Construção alinhada ao restante do shell:

- SPA;
- chamada XHR dedicada para listagem;
- filtros e busca orientados a endpoint `/vendas`.

### 11.2 Legacy

Construção confirmada:

- `JSF`
- `PrimeFaces`
- `PrimeFaces.ab(...)`
- `javax.faces.ViewState`
- recursos `primefaces-extensions`
- `qrcode.js`

Leitura:

- o legado concentra mais complexidade operacional;
- por isso ainda depende de uma ficha rica com múltiplos componentes server-driven.

## 12. Conclusão

O módulo `vendas` está claramente dividido entre duas superfícies:

- beta para índice e gestão de vendas abertas;
- legado para operação transacional completa.

A venda é uma entidade:

- ancorada no cliente;
- orientada a produtos;
- com profissional por item;
- com desconto em múltiplos níveis;
- com pagamentos estruturados;
- com fechamento operacional;
- com repercussão financeira direta.

A diferença mais importante para `comanda` é conceitual:

- `comanda` é mais forte no atendimento e no vínculo cliente-animal;
- `venda` é mais forte na transação comercial e no fechamento de produtos.

Em resumo, `venda` hoje funciona como a entidade comercial/faturável do domínio de atendimento, enquanto o beta ainda expõe principalmente a camada de índice dessa operação e o legado continua sustentando a execução completa.
