# Vetus ERP — Relatório da Rotina `Tabelas de Preço`

**Data:** 24/04/2026  
**Página-alvo:** `https://erp-beta.vetus.com.br/tabelas-de-preco`  
**Trilha:** gaps prioritários de `Estoque > Cadastros`

## 1. Base de evidência usada

Este relatório foi sustentado por evidência direta suficiente no acervo local:

- screenshot da rota beta: `docs/vetus/inspection/2026-04-23T22-00-01-706Z/screenshots/-tabelas-de-preco.png`;
- artefato estrutural da rota em `artifacts.json`, com:
  - heading `Tabelas de Preço`;
  - formulário com campo `Buscar por ID ou descrição`;
  - request `GET https://dorylus.vetus.com.br/tableprice`;
- relatório anterior de `Serviços`, que já provou relação entre serviço e diálogo `Tabela de Preço`;
- documentação de arquitetura que classifica o item como cadastro auxiliar de estoque com `múltiplas tabelas`.

## 2. Síntese executiva

`Tabelas de Preço` é uma rotina SPA de cadastro mestre comercial que organiza políticas de preço reutilizáveis no Vetus. A tela já aparece madura e coerente com o padrão beta:

- breadcrumb completo;
- busca simples;
- CTA de inclusão;
- cards/lista de tabelas existentes;
- ação de detalhamento por registro.

A principal conclusão é esta: o Vetus não trata preço como atributo único e rígido do produto/serviço. Ele trata preço como uma camada parametrizável por tabela, o que é decisivo para:

- campanhas e tabelas promocionais;
- faixas ou contextos comerciais distintos;
- diferenciação por canal/horário/regra;
- aplicação de valores alternativos em produtos e serviços.

## 3. Posicionamento da rotina no ERP

### 3.1 Breadcrumb confirmado

A captura da página mostra o breadcrumb:

- `Estoque`
- `Cadastros`
- `Tabelas de Preço`

Esse detalhe é importante porque esclarece a leitura correta do módulo:

- ele vive sob `Estoque`, não sob `Financeiro`;
- é um cadastro operacional/comercial, não mero relatório;
- ele sustenta precificação do catálogo.

### 3.2 Natureza do módulo

No planejamento do produto, `Tabelas de Preço` aparece em `Cadastros Auxiliares de Estoque` com a descrição:

- `Múltiplas tabelas`

Isso aparece em [01-PLANEJAMENTO-ERP-ENTERPRISE.md](../guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md).

## 4. Estrutura visual da tela

### 4.1 Cabeçalho

O topo da página mostra:

- título `Tabelas de Preço`;
- texto de ajuda:
  - `Quer cadastrar tabelas de preço de forma prática?`
  - link `Saiba Mais`

Esse texto revela que o produto entende a rotina como algo operacionalmente recorrente e potencialmente complexo o suficiente para exigir apoio contextual.

### 4.2 Campo de busca

A tela exibe um campo de busca com placeholder:

- `Buscar por ID ou descrição`

Isso mostra que a entidade é recuperável por:

- identificador numérico;
- nome/descrição da tabela.

### 4.3 CTA principal

No canto direito aparece o botão:

- `+ Incluir Nova Tabela`

Esse CTA confirma que a rotina é de manutenção ativa de cadastro e não apenas consulta.

## 5. Estrutura da listagem

### 5.1 Padrão de exibição

Os registros aparecem em cards/blocos horizontais, não em tabela densa. Cada bloco traz:

- `Descrição`;
- valor textual da descrição;
- `ID`;
- valor do ID;
- botão `Ver Detalhes`.

### 5.2 Registros concretos capturados

Na evidência visual aparecem pelo menos dois registros reais:

- `TABELA FINAL DE SEMANA` — `ID: 2`
- `TABELA MADRUGADA` — `ID: 1`

### 5.3 Leitura desses exemplos

Esses dois nomes são muito informativos porque mostram que a tabela de preço não é apenas uma abstração administrativa. Ela já aparece orientada a contexto comercial concreto:

- `FINAL DE SEMANA`
- `MADRUGADA`

Isso sugere fortemente uso por recorte operacional/temporal, como:

- horários;
- turnos;
- janelas promocionais;
- contexto específico de atendimento ou venda.

## 6. Backend confirmado

O artefato técnico da rota confirmou:

- `GET /tableprice`

Endpoint completo:

- `https://dorylus.vetus.com.br/tableprice`

### 6.1 O que isso sugere

O nome do endpoint reforça a leitura de entidade própria:

- não é um campo solto dentro de produto;
- não é um cálculo efêmero no front;
- existe uma coleção persistida de `tableprice`.

### 6.2 Consequência arquitetural

Isso indica uma modelagem mais próxima de:

- `PriceTable`
- e, em alguma camada relacional, associação com itens do catálogo.

Mesmo sem schema direto aberto nesta rodada, a semântica do endpoint e os cruzamentos com outros módulos apontam para isso com segurança razoável.

## 7. Relação com produtos

O planejamento já diz explicitamente que `Produtos` possuem:

- `Tabelas de preço`

Isso aparece em [01-PLANEJAMENTO-ERP-ENTERPRISE.md](../guides/01-PLANEJAMENTO-ERP-ENTERPRISE.md).

### 7.1 Interpretação

O produto não carrega apenas:

- custo;
- preço base;
- saldo.

Ele também pode ser submetido a tabelas alternativas de preço.

### 7.2 Papel comercial

Isso é crítico para operação porque permite:

- adaptar preço por campanha;
- separar tabela padrão de tabela diferenciada;
- aplicar lógica de canal ou janela;
- controlar política comercial sem reescrever cadastro inteiro do produto.

## 8. Relação com serviços

O relatório de `Serviços` já havia confirmado no legado um diálogo chamado:

- `Tabela de Preço`

Com campos:

- `Tabela`
- `Valor`
- ação `Salvar`

Isso aparece em [2026-04-23-relatorio-entidade-servico.md](../guides/2026-04-23-relatorio-entidade-servico.md).

### 8.1 Leitura estrutural

Com isso, a conexão fica forte:

- `Tabelas de Preço` não servem só para produto;
- elas também impactam `Serviços`.

### 8.2 Importância disso

Esse é um ponto central do Vetus como ERP clínico-comercial:

- produtos precisam de política de preço;
- serviços também precisam;
- a tabela de preço vira entidade transversal do catálogo, não apenas item do varejo.

## 9. Papel do módulo na operação

`Tabelas de Preço` cumpre um papel de governança comercial. Ele desacopla:

- cadastro do item;
- da política de preço aplicada ao item.

Isso melhora bastante a operação em cenários como:

- variação de preços por período;
- política de preço por unidade ou setor;
- campanhas sazonais;
- atendimento 24h com diferença por turno;
- diferenciação entre tabela padrão e tabela especial.

## 10. O que a tela provavelmente leva para o detalhe

Como a listagem expõe `Ver Detalhes`, o detalhe da tabela provavelmente concentra informações como:

- descrição da tabela;
- identificador;
- vínculo com produtos e/ou serviços;
- valores por item;
- edição da política.

Sem abrir o detalhe nesta rodada, essa parte deve ficar como inferência provável, não como prova direta.

## 11. Força da modelagem

Há três sinais de maturidade muito claros nessa rotina.

### 11.1 Entidade explícita

Existe uma página própria, um endpoint próprio e um cadastro próprio.

### 11.2 Integração transversal

A entidade conversa com:

- `Produtos`;
- `Serviços`;
- consulta de preços;
- operação comercial e atendimento.

### 11.3 Nome dos registros capturados

Os exemplos `FINAL DE SEMANA` e `MADRUGADA` mostram uso de negócio real, não cadastro artificial.

## 12. Limitações desta rodada

- Não houve abertura do `Ver Detalhes` nesta passada.
- Não houve leitura de formulário de criação/edição da tabela.
- Não houve prova direta da relação tabela -> item individual dentro da própria UI dessa rota.

Mesmo assim, a cobertura desta rotina ficou **forte** para a superfície principal da listagem e para o papel arquitetural da entidade.

## 13. Conclusão

`Tabelas de Preço` é uma rotina SPA madura do Vetus para governança de políticas comerciais reutilizáveis.  

Ela já está suficientemente comprovada como:

- entidade própria;
- cadastro operacional real;
- peça transversal entre `Estoque`, `Produtos` e `Serviços`;
- mecanismo de diferenciação de preço por contexto de negócio.

Entre os gaps remanescentes do ERP, esta rotina deixa de ser um ponto cego a partir desta rodada. O que ainda falta agora não é entender sua existência ou função, mas aprofundar o detalhe interno de cada tabela e a forma exata como ela se liga a itens individuais do catálogo.
