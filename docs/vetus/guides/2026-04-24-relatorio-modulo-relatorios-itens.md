# Relatório do Módulo Relatórios: Cobertura por Item

Data: 2026-04-24
Escopo: leitura consolidada do módulo `Relatórios` do Vetus, cobrindo item por item da árvore funcional solicitada:

- `Relatórios de Atendimentos`
- `Comandas/Vendas`
- `Produtos/Serviços Produzidos`
- `Produção`
- `Agenda`
- `Atendimento por Profissional`
- `Relatórios Personalizados`
- `Relatório de NF de Serviços Prestados`
- `Relatórios de Cadastros`
- `Serviços`
- `Clientes`
- `Animais`
- `Fornecedores`
- `Exclusão de Vendas e Comandas`
- `Relatórios de Estoques`
- `Estoque`
- `Movimentações no Estoque`
- `Entrada de NF`
- `Relatório de Produtos`

## 1. Síntese executiva

O módulo `Relatórios` do Vetus aparece no shell moderno como macroárea publicada, mas com baixa cobertura funcional direta na SPA observada.

Leitura consolidada:

- a árvore de navegação de `Relatórios` está claramente organizada no menu;
- as capturas do shell mostram majoritariamente estados de `página indisponível`;
- o legado mapeia com clareza os relatórios operacionais por URL;
- o módulo deve ser lido mais como `portfólio analítico legado organizado pelo shell` do que como suíte analítica beta madura.

Conclusão objetiva:

- `Relatórios` existe como domínio forte de ERP;
- a camada moderna ainda não o entrega de ponta a ponta;
- a principal fonte de verdade para esse módulo continua sendo o legado e o mapa estrutural do sistema.

## 2. Estrutura do módulo Relatórios

No menu expandido do shell, `Relatórios` aparece dividido em grupos como:

- `Relatórios Financeiros`
- `Relatórios de Atendimentos`
- `Relatórios Personalizados`
- `Relatórios de Cadastros`
- `Relatórios de Estoque`

Leitura arquitetural:

- o shell organiza a descoberta;
- o legado concentra a densidade funcional;
- a separação por grupo indica intenção de leitura analítica por área de negócio.

## 3. Estado geral de maturidade

### 3.1 O que o shell confirmou

As capturas disponíveis no acervo mostram:

- `relatorios-agenda-01.png`
- `relatorios-atendimento-01.png`
- `relatorios-atendimento-profissional-01.png`
- `relatorios-cadastros-01.png`
- `relatorios-estoque-01.png`
- `relatorios-financeiros-01.png`
- `relatorios-fluxo-caixa-01.png`
- `relatorios-producao-01.png`

Todas elas foram catalogadas como `indisponível`.

### 3.2 O que o legado confirmou

A análise estrutural do sistema registra os relatórios legados com URLs explícitas.

Esse é o principal nível de confirmação disponível para o domínio.

### 3.3 Leitura correta

O módulo `Relatórios` precisa ser documentado com honestidade:

- forte como arquitetura de informação;
- fraco como evidência SPA funcional;
- consistente como portfólio legado.

## 4. Relatórios de Atendimentos

### 4.1 Papel do grupo

`Relatórios de Atendimentos` consolida a camada analítica do fluxo assistencial/comercial de frente.

Pelo acervo, esse grupo abriga relatórios ligados a:

- `Comandas/Vendas`
- `Produtos/Serviços Produzidos`
- `Produção`
- `Agenda`
- `Atendimento por Profissional`

### 4.2 Leitura funcional

Esse agrupamento responde perguntas como:

- quanto foi atendido;
- quanto foi vendido ou comandado;
- quem produziu;
- em que período;
- qual profissional atendeu;
- qual carga operacional passou pela agenda.

## 5. Comandas/Vendas

### 5.1 Evidência estrutural

Rota legada documentada:

- `.../Relatorio/ComandasVendasRelatorio.htm`

### 5.2 Papel funcional

Esse relatório cruza produção transacional de:

- `comandas`
- `vendas`

### 5.3 Leitura de construção

Ele tende a responder:

- volume vendido;
- volume comandado;
- período de faturamento/produção;
- composição de operação comercial assistida.

### 5.4 Relação com outros módulos

Esse relatório conversa diretamente com:

- `Comanda`
- `Vendas`
- `Financeiro`
- possivelmente `Cliente`

### 5.5 Conclusão do item

`Comandas/Vendas` é um relatório de consolidação comercial-operacional do atendimento.

## 6. Produtos/Serviços Produzidos

### 6.1 Evidência estrutural

Rota legada documentada:

- `.../Relatorio/ProdutosEServicosProduzidos.htm`

### 6.2 Papel funcional

Esse relatório mede produção por item entregue ou executado, misturando:

- `produtos`
- `serviços`

### 6.3 Leitura de construção

Ele é importante porque atravessa a fronteira entre:

- atendimento clínico;
- venda;
- estoque;
- produtividade operacional.

### 6.4 Relação com outros módulos

Conecta:

- `Serviços`
- `Produtos`
- `Comandas`
- `Vendas`
- `Produção`

### 6.5 Conclusão do item

É um relatório de output operacional, e não apenas de cadastro ou financeiro.

## 7. Produção

### 7.1 Evidência estrutural

Rota legada documentada:

- `.../Relatorio/ProducaoRelatorio.htm`

### 7.2 Evidência visual

- `relatorios-producao-01.png` aparece como indisponível no shell.

### 7.3 Papel funcional

`Produção` tende a ser o relatório mais sintético de produtividade da operação.

### 7.4 Leitura de construção

Ele provavelmente consolida:

- produção por profissional;
- produção por período;
- produção por serviço ou atendimento;
- reflexos assistenciais/comerciais.

### 7.5 Conclusão do item

`Produção` funciona como camada gerencial do que foi efetivamente executado no ERP.

## 8. Agenda

### 8.1 Evidência visual

- `relatorios-agenda-01.png` foi catalogado como indisponível.

### 8.2 Papel funcional inferido

Mesmo sem a URL explícita listada na tabela legacy, o agrupamento do menu e a presença da captura indicam um relatório dedicado à agenda.

### 8.3 Leitura de construção

Esse relatório provavelmente mede:

- agendamentos por período;
- ocupação da grade;
- comparecimento/cancelamento;
- distribuição por profissional e serviço.

### 8.4 Relação com outros módulos

Conecta-se a:

- `Agenda`
- `Profissionais`
- `Serviços`
- `Atendimento`

### 8.5 Conclusão do item

`Agenda` dentro de `Relatórios` fecha a leitura analítica do módulo operacional de marcação.

## 9. Atendimento por Profissional

### 9.1 Evidência estrutural

Rota legada documentada:

- `.../Relatorio/AtendimentoPorProfissional.htm`

### 9.2 Evidência visual

- `relatorios-atendimento-profissional-01.png` foi catalogado como indisponível no shell.

### 9.3 Papel funcional

Esse relatório mede a produção assistencial segmentada por executor.

### 9.4 Leitura de construção

Ele provavelmente responde:

- quantos atendimentos cada profissional realizou;
- qual foi a carga por período;
- qual o peso produtivo individual dentro da operação.

### 9.5 Relação com outros módulos

Conecta:

- `Profissionais`
- `Agenda`
- `Atendimento`
- `Comissões`, indiretamente

### 9.6 Conclusão do item

É o ponto mais explícito onde `Relatórios` toca diretamente o domínio humano-produtivo do ERP.

## 10. Relatórios Personalizados

### 10.1 Papel do grupo

`Relatórios Personalizados` representa a camada de relatórios dinâmicos ou parametrizados.

### 10.2 Evidência estrutural

O acervo registra ao menos um relatório deste grupo com executor dinâmico:

- `.../Relatorio/RelatoriosDinamicosExecutor.htm?id=1`

### 10.3 Leitura de construção

Esse grupo sugere:

- relatórios configuráveis;
- execução parametrizada;
- catálogo menos rígido que os relatórios legados fixos.

### 10.4 Conclusão do grupo

`Relatórios Personalizados` funciona como guarda-chuva de relatórios não puramente fixos, provavelmente orientados por template ou executor dinâmico.

## 11. Relatório de NF de Serviços Prestados

### 11.1 Evidência estrutural

Rota legada documentada:

- `.../Relatorio/RelatoriosDinamicosExecutor.htm?id=1`

### 11.2 Papel funcional

Esse relatório trata a dimensão fiscal dos serviços executados.

### 11.3 Leitura de construção

Ele conecta:

- `Serviços`
- execução comercial/assistencial;
- documento fiscal;
- obrigação tributária.

### 11.4 Relação com outros módulos

Conversa com:

- `Serviços`
- `Fiscal`
- `Vendas/Comandas`
- possivelmente `Financeiro`

### 11.5 Conclusão do item

É um relatório fiscal-especializado dentro do bloco de personalizados.

## 12. Relatórios de Cadastros

### 12.1 Papel do grupo

`Relatórios de Cadastros` organiza a leitura analítica dos cadastros mestres.

Pelo itemário solicitado e pela arquitetura do sistema, este grupo inclui:

- `Serviços`
- `Clientes`
- `Animais`
- `Fornecedores`

### 12.2 Leitura funcional

Esse grupo não mede apenas operação.

Ele apoia:

- qualidade de base cadastral;
- consulta gerencial;
- inventário de entidades mestres;
- saneamento e visão administrativa.

## 13. Serviços

### 13.1 Evidência estrutural e contextual

O acervo confirma a entidade `Serviços` como cadastro legado forte e sua relação direta com relatórios, inclusive o de NF de serviços prestados.

### 13.2 Papel funcional do relatório

O relatório de `Serviços` tende a responder:

- quais serviços existem;
- quais estão ativos;
- como estão classificados;
- quais serviços compõem a base operacional/comercial.

### 13.3 Relação com outros módulos

Conecta:

- `Cadastro de Serviços`
- `Agenda`
- `Comanda`
- `NF de Serviços Prestados`

### 13.4 Conclusão do item

`Serviços` no grupo de relatórios de cadastro funciona como inventário e apoio analítico da oferta operacional do ERP.

## 14. Clientes

### 14.1 Evidência contextual

O módulo de `Clientes` já foi confirmado como beta funcional em relatórios próprios.

### 14.2 Papel funcional do relatório

O relatório de `Clientes` tende a servir para:

- consulta de base ativa;
- leitura de perfil cadastral;
- apoio comercial e administrativo;
- exportações/listagens gerenciais.

### 14.3 Relação com outros módulos

Conecta:

- `Clientes`
- `Financeiro`
- `Agenda`
- `Comandas/Vendas`

### 14.4 Conclusão do item

`Clientes` no bloco de relatórios de cadastro funciona como visão analítica da base de tutores/clientes.

## 15. Animais

### 15.1 Evidência contextual

O módulo de `Animais` já foi confirmado como beta funcional em relatórios próprios.

### 15.2 Papel funcional do relatório

O relatório de `Animais` tende a responder:

- base de pacientes cadastrados;
- espécie/raça/idade;
- distribuição e apoio assistencial.

### 15.3 Relação com outros módulos

Conecta:

- `Animais`
- `Agenda`
- `Vacinas`
- `Atendimento`
- `Internação`

### 15.4 Conclusão do item

`Animais` em `Relatórios de Cadastros` fornece visão gerencial da base de pacientes.

## 16. Fornecedores

### 16.1 Evidência estrutural

Rota legada documentada:

- `.../Relatorio/FornecedoresRelatorio.htm`

### 16.2 Evidência contextual

O domínio `Fornecedores e Despesas` já foi observado no módulo de estoque.

### 16.3 Papel funcional

Esse relatório apoia:

- leitura cadastral de fornecedores;
- gestão de suprimentos;
- apoio administrativo e fiscal.

### 16.4 Relação com outros módulos

Conecta:

- `Fornecedores`
- `Compras`
- `Entrada de NF`
- `Estoque`

### 16.5 Conclusão do item

`Fornecedores` fecha a dimensão analítica do cadastro mestre voltado a suprimentos.

## 17. Exclusão de Vendas e Comandas

### 17.1 Evidência estrutural

Rota legada documentada:

- `.../Relatorio/ExclusaoVendaComandaRelatorio.htm`

### 17.2 Papel funcional

Esse é um relatório de controle e auditoria operacional.

### 17.3 Leitura de construção

Ele não mede produção normal.

Ele mede exceção, reversão e risco operacional, ajudando a responder:

- o que foi excluído;
- quando;
- possivelmente por quem;
- em qual contexto transacional.

### 17.4 Relação com outros módulos

Conecta:

- `Vendas`
- `Comandas`
- `Auditoria`
- `Financeiro`

### 17.5 Conclusão do item

É um dos relatórios mais claramente orientados a controle interno do portfólio.

## 18. Relatórios de Estoques

### 18.1 Papel do grupo

`Relatórios de Estoques` consolida a visão analítica do domínio material e fiscal-operacional de suprimentos.

Pelo itemário solicitado, o grupo cobre:

- `Estoque`
- `Movimentações no Estoque`
- `Entrada de NF`
- `Relatório de Produtos`

### 18.2 Leitura funcional

Esse agrupamento responde perguntas sobre:

- saldo;
- fluxo;
- entrada formal;
- catálogo de itens.

## 19. Estoque

### 19.1 Evidência estrutural

Rota legada documentada:

- `.../Relatorio/EstoqueRelatorio.htm`

### 19.2 Evidência visual

- `relatorios-estoque-01.png` foi catalogado como indisponível no shell.

### 19.3 Papel funcional

Esse relatório tende a expor:

- posição de estoque;
- saldos;
- situação atual por item/local.

### 19.4 Relação com outros módulos

Conecta:

- `Produtos`
- `Estoques`
- `Compras`
- `Vendas/Comandas`

### 19.5 Conclusão do item

`Estoque` é o relatório-base de posição material do ERP.

## 20. Movimentações no Estoque

### 20.1 Evidência estrutural

Rota legada documentada:

- `.../Relatorio/MovimentacaoEstoqueRelatorio.htm`

### 20.2 Papel funcional

Esse relatório lê fluxo, não apenas saldo.

### 20.3 Leitura de construção

Ele tende a registrar:

- entradas;
- saídas;
- transferências;
- ajustes;
- trilha de alteração de saldo.

### 20.4 Relação com outros módulos

Conecta:

- `Transação no Estoque`
- `Transferência entre Estoques`
- `Entrada de NF`
- `Vendas/Comandas`

### 20.5 Conclusão do item

É o relatório analítico mais importante para rastreabilidade de materialidade.

## 21. Entrada de NF

### 21.1 Evidência estrutural

Rota legada documentada:

- `.../Relatorio/EntradaNotaFiscalRelatorio.htm`

### 21.2 Papel funcional

Esse relatório mede e documenta a entrada formal de nota fiscal no estoque.

### 21.3 Leitura de construção

Ele conecta:

- fornecedor;
- documento fiscal;
- entrada de item;
- reflexo no estoque.

### 21.4 Relação com outros módulos

Conecta:

- `Entrada de Nota Fiscal`
- `Fornecedores`
- `Estoque`
- `Fiscal`

### 21.5 Conclusão do item

`Entrada de NF` é a ponte analítica entre suprimento, documento e saldo.

## 22. Relatório de Produtos

### 22.1 Evidência disponível

O item `Relatório de Produtos` aparece no agrupamento solicitado e é coerente com a estrutura de `Relatórios de Estoque`, embora a tabela legacy disponível no acervo não o liste nominalmente como URL própria.

### 22.2 Leitura funcional

Esse relatório tende a servir para:

- inventário analítico de produtos;
- visão cadastral/comercial do catálogo;
- apoio a estoque e suprimentos.

### 22.3 Relação com outros módulos

Conecta:

- `Produtos`
- `Estoque`
- `Fabricantes`
- `Grupos de Produto`

### 22.4 Conclusão do item

`Relatório de Produtos` deve ser tratado como subitem plausível e coerente do grupo de estoque, mas com confirmação mais estrutural do que evidência de tela funcional nesta trilha.

## 23. Observação sobre itens não plenamente confirmados por UI

Os itens abaixo têm confirmação mais forte por:

- agrupamento de menu;
- mapeamento estrutural;
- coerência com os domínios já analisados;

do que por tela funcional aberta no shell observado:

- `Agenda` em Relatórios
- `Relatórios Personalizados`
- `Serviços`
- `Clientes`
- `Animais`
- `Relatório de Produtos`

Leitura:

- eles são altamente plausíveis e coerentes com a arquitetura do ERP;
- mas a trilha de evidência desta documentação é mais forte no legado e no menu do que na SPA funcional.

## 24. Conclusão final

O módulo `Relatórios` do Vetus é amplo, bem organizado e claramente separado por áreas analíticas, mas a cobertura funcional confirmada no shell moderno é fraca.

O que fica mais forte no acervo:

- `Relatórios de Atendimentos` consolidam a camada analítica da operação assistencial e comercial;
- `Relatórios de Cadastros` consolidam a leitura dos mestres administrativos;
- `Relatórios de Estoques` consolidam a rastreabilidade material e fiscal;
- `Relatórios Personalizados` e `NF de Serviços Prestados` sugerem uma camada mais dinâmica e especializada;
- `Exclusão de Vendas e Comandas` mostra preocupação explícita com controle interno e exceções.

Conclusão objetiva:

- o módulo `Relatórios` é forte como portfólio legado e arquitetura de informação;
- é fraco como suíte SPA comprovada nas evidências atuais;
- e deve ser lido como uma biblioteca analítica verticalizada ainda muito dependente do legado.
