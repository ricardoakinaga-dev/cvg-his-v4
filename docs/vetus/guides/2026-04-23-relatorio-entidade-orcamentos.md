# Relatório da Entidade Orçamentos

Data-base da inspeção: 23 de abril de 2026

Escopo:

- análise específica da entidade `orçamentos`;
- foco na etapa anterior à conversão em `comanda`, `venda` ou `pacote`;
- inspeção somente leitura, sem incluir orçamento, sem aprovar e sem converter.

Evidências principais:

- [orcamentos-lista.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-50-42-311Z-orcamentos/screenshots/orcamentos-lista.png)
- [orcamentos-lista.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-50-42-311Z-orcamentos/orcamentos-lista.json)
- [orcamentos-lista-pos-pesquisa.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-50-42-311Z-orcamentos/screenshots/orcamentos-lista-pos-pesquisa.png)
- [orcamentos-lista-pos-pesquisa.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-50-42-311Z-orcamentos/orcamentos-lista-pos-pesquisa.json)
- [orcamentos-detalhe.png](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-50-42-311Z-orcamentos/screenshots/orcamentos-detalhe.png)
- [orcamentos-detalhe.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-50-42-311Z-orcamentos/orcamentos-detalhe.json)
- [network.json](/root/cvg-his-v2/docs/vetus/inspection/2026-04-23T23-50-42-311Z-orcamentos/network.json)
- [2026-04-23-relatorio-entidade-comanda.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-entidade-comanda.md)
- [2026-04-23-relatorio-entidade-vendas.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-entidade-vendas.md)
- [2026-04-23-relatorio-entidade-pacotes.md](/root/cvg-his-v2/docs/vetus/guides/2026-04-23-relatorio-entidade-pacotes.md)
- [04-ESPECIFICACAO-APIS.md](/root/cvg-his-v2/docs/vetus/guides/04-ESPECIFICACAO-APIS.md:1105)

Nota de segurança:

- não houve inclusão de item;
- não houve aprovação nem conversão;
- não houve qualquer persistência no ERP.

## 1. Síntese executiva

`Orçamentos` hoje continua operacional no legado.

O módulo abriu em:

- `https://erp.vetus.com.br/Sistema/Atendimento/Orcamentos.htm`

Leitura principal:

- orçamento é a camada comercial anterior à execução;
- ele é ligado a `cliente` e `data`;
- aceita composição de `serviços`, `produtos` e `outros`;
- funciona como etapa anterior à transformação em entidades transacionais posteriores.

Essa é a conclusão central da rodada:

- `orçamento` ainda não é a execução;
- ele prepara a composição econômica que depois tende a virar `comanda`, `venda` ou outro objeto comercial.

## 2. Arquitetura do módulo

### 2.1 Superfície atual confirmada

Rota operacional confirmada:

- `Sistema/Atendimento/Orcamentos.htm`

Fluxo de acesso confirmado:

1. redirecionamento via shell beta;
2. autenticação e emissão de token;
3. seleção de empresa;
4. abertura da tela legacy.

Stack confirmada:

- `JSF`
- `PrimeFaces`
- `javax.faces.ViewState`
- Ajax parcial por `PrimeFaces.ab(...)`

Leitura:

- o orçamento ainda vive no legado de atendimento;
- o beta atua como autenticador/orquestrador, não como editor nativo do módulo.

### 2.2 Superfície beta

Nesta rodada, não apareceu uma rota beta operacional equivalente.

O histórico anterior do projeto já apontava:

- `Orçamentos beta` indisponível no shell base;
- `Orçamentos legacy` como captura preservada e rota funcional.

Conclusão prática:

- o orçamento, hoje, deve ser tratado como domínio ainda legado.

## 3. Estrutura da listagem

A listagem ficou bem confirmada.

Elementos visíveis:

- ação `Incluir`
- filtros por:
  - `ID`
  - `Cliente`
  - `Data`
- ação `Pesquisar`

Tabela confirmada:

- `Id`
- `Cliente`
- `Data`
- `Abrir`

Leitura:

- a fila de orçamentos é simples e fortemente comercial;
- não aparece `animal` na listagem;
- a preocupação principal aqui é localizar o documento comercial pelo cliente e pela data.

## 4. Estrutura interna confirmada pelo HTML

Mesmo com a ficha completa não ficando toda exposta no resumo textual, o HTML do estado aberto revelou a estrutura operacional do orçamento.

Blocos confirmados:

- diálogo `Inclusão de Serviço`
- diálogo `Inclusão de Produto`
- diálogo `Inserir Outros`

Campos confirmados para `serviço`:

- `Descrição do Serviço`
- ação `Incluir Serviço`

Campos confirmados para `produto`:

- `Quantidade`
- `Pesquisar Cod. Barras`
- `Ou Descrição do Produto`
- ação `Incluir Produto`

Campos confirmados para `outros`:

- `Descrição`
- `Valor`
- ação `Incluir`

Leitura:

- o orçamento aceita composição heterogênea;
- ele não trabalha só com serviços;
- ele também não é restrito a catálogo formal de produto ou serviço, já que existe o bloco `outros`.

Isso é importante porque mostra que orçamento é uma entidade de negociação/composição comercial, não apenas uma prévia rígida do catálogo.

## 5. Composição do orçamento

A estrutura interna da página deixa isso claro:

- orçamento pode ter `serviços`;
- orçamento pode ter `produtos`;
- orçamento pode ter itens manuais em `outros`.

Leitura:

- o orçamento é uma cesta comercial flexível;
- ele consegue representar um atendimento planejado com múltiplas naturezas de item;
- isso o torna um bom ponto de pré-venda para clínicas que combinam serviço clínico, produto físico e ajustes não catalogados.

## 6. Relação com cliente e animal

### 6.1 Cliente

O vínculo com `cliente` é explícito e central:

- filtro `Cliente`
- coluna `Cliente`

Leitura:

- o orçamento nasce no nível do cliente;
- ele é um documento comercial do titular econômico.

### 6.2 Animal

O `animal` não apareceu explicitamente na listagem capturada.

Isso não prova ausência do vínculo no domínio, mas mostra que:

- a superfície de entrada do orçamento é menos centrada em paciente do que `agenda`, `comanda` e `pacotes`;
- o foco inicial é negociação/composição comercial.

Inferência prudente:

- o vínculo com animal pode existir mais adiante ou indiretamente, mas não foi confirmado diretamente nesta rodada.

## 7. Relação com comanda, venda e pacote

Essa é a pergunta central da rodada.

### 7.1 O que ficou confirmado diretamente

O orçamento é uma composição anterior de itens.

Pelo HTML, ele organiza:

- serviços;
- produtos;
- outros valores.

Isso o posiciona antes das entidades que efetivamente executam ou faturam.

### 7.2 O que fica fortemente sugerido pelo conjunto do projeto

Nos materiais internos já existentes do projeto, a malha de APIs para `quotes` prevê:

- `POST /quotes/{id}/approve`
- `POST /quotes/{id}/convert`

Isso é evidência documental do próprio repositório, não da UI desta rodada.

Leitura combinada:

- orçamento é a entidade de pré-aprovação;
- aprovação e conversão são passos posteriores do ciclo;
- a conversão tende a produzir entidades executáveis/comerciais posteriores.

### 7.3 Interpretação funcional

`Comanda`:

- melhor para execução do atendimento.

`Venda`:

- melhor para transação comercial imediata.

`Pacote`:

- melhor para recorrência e consumo futuro.

`Orçamento`:

- melhor para negociação anterior à decisão.

Conclusão:

- o orçamento fecha a etapa de proposta;
- comanda, venda e pacote fecham a etapa de execução/comercialização.

## 8. Relação com preço e total

A UI aberta não deixou um bloco de totalização explícito visível no resumo textual, mas o HTML revelou um alvo de atualização:

- `formPrincipal:valorOrcamento`

Isso é um sinal técnico importante.

Leitura:

- o orçamento mantém valor consolidado;
- esse valor é recalculado quando entram `serviços`, `produtos` e `outros`;
- logo, a composição do orçamento impacta um total comercial próprio.

## 9. Papel do orçamento na jornada

Com base no que foi confirmado, a jornada pode ser lida assim:

1. o usuário monta uma proposta para um cliente;
2. adiciona serviços, produtos e itens livres;
3. o sistema consolida valor do orçamento;
4. o orçamento fica em fila consultável;
5. depois ele pode ser aprovado/converter para uma entidade operacional/comercial posterior.

Essa leitura fecha bem a lacuna entre:

- intenção comercial;
- composição de itens;
- conversão em execução.

## 10. Diferença entre orçamento e outras entidades já inspecionadas

`Orçamento`:

- proposta;
- composição flexível;
- cliente como pivô;
- etapa anterior à execução.

`Comanda`:

- execução operacional do atendimento;
- cliente + animal + itens + consumo.

`Venda`:

- transação comercial direta;
- produto + pagamento + fechamento.

`Pacote`:

- contrato recorrente de serviços futuros;
- cliente + animal + sessões + pagamento.

Leitura:

- orçamento é a camada de negociação;
- as outras entidades são camadas de materialização.

## 11. Limitações da inspeção

- o clique em `Abrir` foi capturado como abertura de estado, mas a ficha completa não ficou totalmente legível na síntese textual da página;
- a análise detalhada do interior da ficha dependeu do HTML renderizado, não apenas do texto visível;
- não houve ação de aprovação nem conversão, então essa parte fica como inferência sustentada por documentação interna do projeto, não por execução direta no ERP.

## 12. Conclusão

`Orçamentos` é a entidade que fecha a pré-venda no Vetus.

Ela continua operacional no legado e cumpre um papel claro:

- montar proposta;
- agregar serviços;
- agregar produtos;
- agregar itens livres;
- consolidar valor antes da execução.

A leitura arquitetural mais importante da rodada é:

- orçamento antecede a operação;
- ele é o buffer entre negociação e realização;
- é justamente o ponto onde uma intenção comercial pode, depois, virar `comanda`, `venda` ou `pacote`.
