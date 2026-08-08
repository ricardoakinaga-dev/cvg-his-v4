# Relatório do Domínio Financeiro

Data-base da inspeção: 23 de abril de 2026

Escopo:

- análise específica do domínio `financeiro`;
- comparação entre a superfície `beta` e os módulos `legacy` efetivamente operacionais;
- foco em estrutura, títulos financeiros, caixa, pagamentos, transações de cartão, formas de pagamento e reflexo de `comanda` e `vendas`;
- inspeção somente leitura, sem baixa, sem fechamento de gaveta, sem geração de conta e sem qualquer persistência no ERP.

Evidências principais:

- [financeiro-beta-dashboard.png](../inspection/2026-04-23T23-34-19-051Z-financeiro/screenshots/financeiro-beta-dashboard.png)
- [financeiro-beta-dashboard.json](../inspection/2026-04-23T23-34-19-051Z-financeiro/financeiro-beta-dashboard.json)
- [financeiro-legacy-gaveta.png](../inspection/2026-04-23T23-34-19-051Z-financeiro/screenshots/financeiro-legacy-gaveta.png)
- [financeiro-legacy-gaveta.json](../inspection/2026-04-23T23-34-19-051Z-financeiro/financeiro-legacy-gaveta.json)
- [financeiro-legacy-contas-receber.png](../inspection/2026-04-23T23-34-19-051Z-financeiro/screenshots/financeiro-legacy-contas-receber.png)
- [financeiro-legacy-contas-receber.json](../inspection/2026-04-23T23-34-19-051Z-financeiro/financeiro-legacy-contas-receber.json)
- [financeiro-legacy-contas-pagar.png](../inspection/2026-04-23T23-34-19-051Z-financeiro/screenshots/financeiro-legacy-contas-pagar.png)
- [financeiro-legacy-contas-pagar.json](../inspection/2026-04-23T23-34-19-051Z-financeiro/financeiro-legacy-contas-pagar.json)
- [financeiro-legacy-transacoes.png](../inspection/2026-04-23T23-34-19-051Z-financeiro/screenshots/financeiro-legacy-transacoes.png)
- [financeiro-legacy-transacoes.json](../inspection/2026-04-23T23-34-19-051Z-financeiro/financeiro-legacy-transacoes.json)
- [financeiro-legacy-formas-pagamento.png](../inspection/2026-04-23T23-34-19-051Z-financeiro/screenshots/financeiro-legacy-formas-pagamento.png)
- [financeiro-legacy-formas-pagamento.json](../inspection/2026-04-23T23-34-19-051Z-financeiro/financeiro-legacy-formas-pagamento.json)
- [network.json](../inspection/2026-04-23T23-34-19-051Z-financeiro/network.json)
- [2026-04-23-relatorio-entidade-comanda.md](../guides/2026-04-23-relatorio-entidade-comanda.md)
- [2026-04-23-relatorio-entidade-vendas.md](../guides/2026-04-23-relatorio-entidade-vendas.md)

Nota de segurança:

- este relatório evita reproduzir dados sensíveis além do estritamente necessário para leitura estrutural;
- a análise foi feita por observação de markup, campos, headers, textos visíveis e rede;
- não houve baixa de conta, geração de conta, inclusão de transação, fechamento de gaveta nem mudança de cadastro.

## 1. Síntese executiva

O domínio `financeiro` no Vetus é claramente híbrido.

No `beta`, existe uma camada de síntese gerencial centrada no `Dashboard Financeiro`.

No `legacy`, continuam concentradas as superfícies operacionais que realmente executam o financeiro:

- `Gaveta`
- `Contas a Receber`
- `Contas a Pagar`
- `Transações de Cartão`
- `Formas de Pagamento`

Leitura objetiva:

- o `beta` resume e monitora;
- o `legacy` registra, baixa, classifica, fecha e administra.

Isso é coerente com o restante do produto:

- `agenda` e `comanda` produzem evento operacional;
- `vendas` e `comandas` geram efeito econômico;
- `financeiro` consolida, liquida e controla o reflexo monetário.

## 2. Arquitetura do domínio

### 2.1 Superfície beta

Rota confirmada:

- `/dashboard-financeiro`

Backend confirmado na rede:

- `GET https://dorylus.vetus.com.br/dashboard`

O `beta` usa arquitetura SPA moderna já observada nas outras telas:

- shell em `erp-beta.vetus.com.br`;
- bundles JS/CSS versionados;
- consumo de backend `dorylus.vetus.com.br`;
- componentes orientados a cards, gráficos e indicadores.

### 2.2 Superfície legacy

Rotas confirmadas:

- `https://erp.vetus.com.br/Sistema/Financeiro/Gaveta.htm`
- `https://erp.vetus.com.br/Sistema/Financeiro/ContasAReceber.htm`
- `https://erp.vetus.com.br/Sistema/Financeiro/ContasAPagar.htm`
- `https://erp.vetus.com.br/Sistema/Financeiro/Transacoes.htm`
- `https://erp.vetus.com.br/Sistema/Cadastros/FormasDePagamento.htm`

Fluxo de acesso confirmado:

1. shell beta;
2. redirecionamento para `login?returnUrl=...`;
3. emissão de `accessToken` para `NewLogin.htm`;
4. seleção de empresa;
5. entrega da tela final no legado.

Stack confirmada no legado:

- `JSF`
- `PrimeFaces`
- `javax.faces.ViewState`
- recursos `javax.faces.resource/...`
- postback e Ajax parcial server-side

Conclusão:

- o domínio financeiro ainda depende fortemente do legado para operação de verdade;
- o beta hoje é uma camada de supervisão e navegação.

## 3. Estrutura do módulo beta

O `Dashboard Financeiro` expõe uma visão executiva agregada da empresa.

Blocos confirmados na tela:

- `Entradas e saídas`
- `Recebidos`
- `Previsão`
- `A receber`
- `Pagos`
- `A pagar`
- `Arquivos`
- `Clientes`
- `Estoque`
- `Serviços`
- `SMS`
- `Gráfico de Receita`
- `Fluxo de Caixa`
- `Gráfico de Gaveta`
- `Contas a Pagar Vencidas`
- `Contas a Receber`

Leitura funcional:

- o beta não é uma tela transacional;
- ele consolida KPIs operacionais e financeiros numa superfície única;
- mistura indicadores econômicos com métricas de base instalada, estoque e serviços;
- serve como cockpit de gestão da unidade.

Isso sugere que o financeiro beta hoje está mais maduro como `dashboard` do que como suíte completa de execução.

## 4. Estrutura dos módulos legacy

### 4.1 Gaveta

Rota:

- `Financeiro/Gaveta.htm`

Blocos confirmados:

- `Último Fechamento`
- `Total de Entradas`
- `Total de Saídas`
- `Total em Gaveta`
- `Entrada de Gaveta`
- `Saída de Gaveta`
- `Fechar Gaveta`
- `Gaveta por Forma de Pagamento`
- `Extrato de Movimentações da Gaveta`

Colunas confirmadas:

- `Forma de Pagamento`
- `Valor`
- `Tipo`
- `Data e Hora`
- `Forma`
- `Origem`
- `Responsável`

Leitura:

- a `gaveta` é o caixa operacional consolidado;
- ela enxerga entrada e saída por instrumento de pagamento;
- mantém extrato cronológico de movimentações;
- é o ponto mais concreto de caixa efetivo dentro do domínio.

### 4.2 Contas a Receber

Rota:

- `Financeiro/ContasAReceber.htm`

Filtros confirmados:

- `Cliente`
- `Vencimento entre`
- `até`
- `Status`

Status confirmados:

- `A Receber`
- `Cancelada`
- `Recebida`

Colunas confirmadas:

- `Origem`
- `Cliente`
- `Emissão`
- `Vencimento`
- `Total`
- `Recebido`
- `A Receber`
- `Status`
- `Abrir`

Ações confirmadas:

- `Gerar Conta Avulsa`
- `Baixar contas em lote`

Leitura:

- aqui o sistema trata títulos de receita e não apenas recebimentos já liquidados;
- o domínio distingue valor total, valor já recebido e saldo a receber;
- a tela separa claramente `origem` do título e `titular` do crédito.

### 4.3 Contas a Pagar

Rota:

- `Financeiro/ContasAPagar.htm`

Filtros confirmados:

- `Fornecedor`
- `Vencimento de`
- `Até`
- `Status`

Status confirmados:

- `A Pagar`
- `Cancelada`
- `Paga`

Colunas confirmadas:

- `Fornecedor`
- `Emissão`
- `Vencimento`
- `Total`
- `Pago`
- `A Pagar`
- `Origem`
- `Status`
- `Abrir`

Ações confirmadas:

- `Gerar Conta Avulsa`
- `Baixar Contas Em Lote`

Leitura:

- essa é a imagem espelhada do contas a receber;
- o sistema trata obrigação, liquidação parcial ou total e saldo pendente;
- há vínculo explícito com `fornecedor` e com `origem` da despesa.

### 4.4 Transações de Cartão

Rota:

- `Financeiro/Transacoes.htm`

Filtros confirmados:

- `Data Inicial`
- `Data Final`
- `Status`

Status confirmados:

- `Não Definido`
- `Criada`
- `Enviada`
- `Expirada`
- `Rejeitada`
- `Cancelada`
- `Aprovada`
- `Capturado`
- `Pago`
- `Fechado`

Colunas confirmadas:

- `Cliente`
- `Data`
- `Parcelas`
- `Tipo`
- `Valor`
- `Líquido`
- `Status`
- `Ver`
- `Abrir`

Ações confirmadas:

- `Gerar Transação Avulsa`
- `Exportar Transações`
- `Consultar Transações`
- `Cancelar Transações`

Leitura:

- existe um subdomínio financeiro específico para adquirência/cartão;
- o sistema distingue valor bruto e valor líquido;
- acompanha o ciclo de autorização/captura/liquidação;
- a transação de cartão não é só uma forma de pagamento, mas uma entidade própria de acompanhamento.

### 4.5 Formas de Pagamento

Rota:

- `Cadastros/FormasDePagamento.htm`

Estrutura confirmada:

- `Cadastro de Forma de Pagamento`
- ação `Incluir`
- campo `Descrição`
- grade com `Id`, `Descrição`, `Descrição ECF`, `Abrir`

Leitura:

- instrumentos de pagamento são mantidos como cadastro mestre;
- o financeiro operacional consome esse catálogo;
- há ponte provável com frente de venda, caixa, impressão fiscal e integração de meios de pagamento.

## 5. Relação com comanda e vendas

A relação do financeiro com `comanda` ficou visível de forma direta na `gaveta`.

Na grade de extrato, a coluna `Origem` mostra entradas com origem:

- `Comanda`
- `ContasAReceber`

Isso é importante.

Leitura:

- `comanda` pode liquidar direto na gaveta;
- `contas a receber` também pode alimentar a gaveta após recebimento;
- o caixa não depende só da venda direta, ele absorve diferentes origens operacionais.

A relação com `vendas` é estrutural, mesmo sem uma linha explícita de `Venda` na amostra desta tela:

- `vendas` já demonstrou domínio de itens, totais e pagamentos;
- `formas de pagamento` e `transações de cartão` pertencem claramente ao mesmo ecossistema econômico;
- o financeiro é a camada onde o pagamento deixa de ser só atributo da venda e passa a ser evento liquidável, conciliável e auditável.

Resumo:

- `comanda` e `venda` geram obrigação econômica;
- `contas a receber` organiza o título;
- `gaveta` registra o efeito caixa;
- `transações` acompanham a via cartão;
- `formas de pagamento` fornecem o vocabulário operacional da liquidação.

## 6. Relação com cliente e animal

### 6.1 Cliente

A relação com `cliente` é explícita e forte.

Ela aparece em:

- `Contas a Receber`
- `Transações de Cartão`
- `Dashboard Financeiro` na lista de contas a receber

Leitura:

- o cliente é o titular econômico padrão da receita;
- o financeiro é orientado ao cliente, não ao paciente.

### 6.2 Animal

Nenhuma das telas financeiras capturadas trouxe `animal` como dimensão nativa.

Isso é coerente com os relatórios anteriores:

- o `animal` é central em `agenda`, `cadastro de animal` e `comanda`;
- no `financeiro`, a obrigação monetária sobe para o nível de `cliente`.

Conclusão:

- o vínculo clínico pode nascer no animal;
- o vínculo econômico é consolidado no cliente.

## 7. Instrumentos de pagamento e liquidação

A `gaveta` e o HTML legado deixam essa parte muito bem exposta.

Formas confirmadas na rodada:

- `DINHEIRO`
- `PIX`
- `BOLETO`
- `PETLOVE`
- `CARTAO DE DEBITO`
- `CARTAO DE CREDITO À VISTA`
- múltiplos parcelamentos de cartão
- `LINK DE PAGAMENTO`
- `DESCONTO OFERECIDO`

Leitura:

- o ERP trata meios de pagamento heterogêneos;
- algumas formas representam instrumento puro de liquidação;
- outras representam condição comercial, integração externa ou ajuste econômico.

Exemplo importante:

- `DESCONTO OFERECIDO` aparece junto da malha financeira como forma/categoria operacional, o que indica que desconto entra na leitura de caixa e composição de resultado, não só no preço da venda.

## 8. Títulos, saldos e estados

O financeiro do Vetus não trabalha só com pagamento instantâneo.

Há evidência de três camadas distintas:

1. título
2. liquidação
3. caixa

No `Contas a Receber`:

- `Total`
- `Recebido`
- `A Receber`

No `Contas a Pagar`:

- `Total`
- `Pago`
- `A Pagar`

No `Gaveta`:

- `Entradas`
- `Saídas`
- `Total em Gaveta`

Nas `Transações de Cartão`:

- `Valor`
- `Líquido`
- múltiplos `status`

Leitura:

- existe modelagem clara de saldo;
- o sistema distingue compromisso financeiro de caixa efetivo;
- também distingue aprovação operacional da transação de cartão de efetiva liquidação econômica.

## 9. Impacto fiscal e financeiro

O impacto financeiro é direto:

- acompanhamento de recebíveis;
- acompanhamento de obrigações;
- fechamento de caixa;
- segregação por forma de pagamento;
- transações de cartão com valor líquido;
- geração e baixa em lote de contas.

O impacto fiscal aparece menos explicitamente nesta rodada, mas há sinais fortes:

- `Descrição ECF` em `Formas de Pagamento`
- coexistência, já mapeada antes, com módulos fiscais beta como `CFOP`, `ICMS`, `IPI`, `PIS`, `COFINS`, `Tabela Fiscal NFS-e`

Leitura:

- o financeiro não é um módulo isolado;
- ele convive com uma malha fiscal e comercial maior;
- a categorização de forma de pagamento tem reflexo potencial em emissão e integração fiscal.

## 10. Diferença entre financeiro beta e financeiro legacy

Essa diferença é a principal conclusão prática da rodada.

`Financeiro beta`:

- painel executivo;
- indicadores consolidados;
- gráficos e listas sintéticas;
- backend API em `dorylus`;
- linguagem de cockpit.

`Financeiro legacy`:

- telas de trabalho;
- filtros de títulos;
- baixa e geração de contas;
- fechamento de gaveta;
- conciliação de cartão;
- cadastro de instrumentos financeiros;
- linguagem de manutenção operacional.

Conclusão objetiva:

- o beta mostra;
- o legado opera.

## 11. Modelo funcional inferido do domínio

Com base na inspeção desta rodada e nas anteriores, o domínio financeiro pode ser lido assim:

1. `agenda` e atendimento geram contexto operacional.
2. `comanda` e `vendas` formam a transação econômica de origem.
3. `contas a receber` e `contas a pagar` organizam títulos e saldos.
4. `transações de cartão` acompanham a esteira de adquirência.
5. `gaveta` registra o reflexo caixa das liquidações.
6. `dashboard-financeiro` resume o estado econômico da empresa.

Essa modelagem é coerente e relativamente madura.

## 12. Limitações da inspeção

- a rodada foi somente leitura;
- não foi aberta uma conta específica de `contas a receber` ou `contas a pagar` para não acionar edição ou baixa;
- não foi executado `fechar gaveta`;
- não foi criada `transação avulsa`;
- não foi incluída ou alterada `forma de pagamento`.

Também houve uma limitação natural de amostra:

- `contas a receber`, `contas a pagar`, `transações` e `formas de pagamento` apareceram vazios no estado capturado;
- a leitura estrutural, mesmo assim, ficou boa porque os campos, colunas, status e ações estavam visíveis;
- a `gaveta` foi a tela que mais revelou dados concretos de funcionamento do domínio.

## 13. Conclusão

O `financeiro` do Vetus é um domínio transversal e claramente organizado em camadas.

O `beta` já oferece uma visão gerencial consistente por meio do `Dashboard Financeiro`, consumindo API dedicada e expondo indicadores de recebidos, previstos, pendências, fluxo de caixa e gaveta.

Mas a operação financeira real continua no `legacy`, onde ficam:

- os títulos de receita e despesa;
- o caixa da unidade;
- o controle de formas de pagamento;
- a esteira de transações de cartão;
- as ações de baixa, geração e fechamento.

A leitura mais importante para a arquitetura funcional é:

- `cliente` é a âncora econômica;
- `animal` desaparece da superfície financeira;
- `comanda` e `vendas` alimentam o financeiro;
- `financeiro` é a camada de consolidação monetária do ERP.
