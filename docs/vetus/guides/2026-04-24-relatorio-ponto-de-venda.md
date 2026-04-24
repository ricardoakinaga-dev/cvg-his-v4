# Relatório: Ponto de Venda

Data: 2026-04-24  
Escopo: leitura estrutural e operacional da página `https://erp-beta.vetus.com.br/pontos-de-venda`, com foco em função, construção da tela, papel dentro do domínio comercial/estoque e limites do que foi comprovado nesta rodada.

## 1. Resumo executivo

O item `Ponto de Venda` existe no beta como rota SPA própria (`/pontos-de-venda`) e hoje se apresenta como uma superfície de `sincronização` entre o ERP Vetus e o sistema de PDV, não como a tela de caixa operacional em si. A evidência direta da UI mostra duas ações centrais: `Sincronizar Estoque` e `Sincronizar clientes`.

A leitura correta desta página é a de `ponte operacional` entre o núcleo de cadastro/estoque/clientes do ERP e um ambiente externo ou complementar de ponto de venda. Ou seja: o domínio `PDV` é maior do que esta tela, mas esta tela concentra a ativação manual das sincronizações mais sensíveis para o funcionamento do balcão.

## 2. Identificação e posicionamento

- Rota confirmada: `/pontos-de-venda`
- URL capturada: `https://erp-beta.vetus.com.br/pontos-de-venda`
- Tipo de superfície: `SPA beta`
- Posicionamento no menu: `Estoque > Cadastro > Ponto de Venda`
- Breadcrumb visível na tela: `Estoque > Cadastro > Pontos de venda`
- Título principal confirmado: `Pontos de venda`

O posicionamento no grupo `Estoque > Cadastro` já é um sinal importante: o sistema trata esta página menos como `frente de caixa` e mais como `cadastro/configuração/sincronização` de um subsistema comercial.

## 3. Estrutura visual comprovada da página

Pela captura disponível, a tela é extremamente enxuta e orientada a ação direta.

Elementos confirmados:

- título `Pontos de venda`
- texto explicativo `Selecione o tipo de sincronização com o Sistema de Pontos de Venda`
- botão `Sincronizar Estoque`
- botão `Sincronizar clientes`
- modal/feedback de sucesso com `Sincronização iniciada com sucesso!`
- mensagem informando processamento assíncrono/background
- estado final com heading `Sincronização finalizada`
- botão `Ok`

O artefato estrutural da rota marcou:

- `headings`: `Pontos de venda`, `Sincronização finalizada`
- `forms`: vazio
- `tables`: vazio
- `buttons`: `Sincronizar Estoque`, `Sincronizar clientes`, `Ok`

Isso confirma que a tela, nesta passada, não expôs:

- listagem de PDVs
- grade de terminais
- campos de parametrização detalhada
- configuração fiscal visível
- credenciais de integração visíveis
- histórico de sincronizações visível

## 4. Função operacional da página

O papel funcional desta página é sincronizar dados mestres críticos entre o ERP Vetus e o ecossistema de ponto de venda.

As duas sincronizações comprovadas indicam dois eixos fundamentais:

### 4.1. Sincronizar Estoque

Essa ação sugere propagação de dados necessários para operação comercial de balcão, com impacto provável em:

- catálogo de produtos
- saldo disponível
- preços correntes
- disponibilidade comercial
- possivelmente códigos de barras e metadados de venda

Mesmo sem o payload capturado nesta tela, a relação com o restante do domínio já mapeado é forte:

- `Produtos` é a base do item comercial
- `Estoques` controla saldo e origem física
- `Tabelas de Preço` altera a camada de preço
- `Vendas` consome esses dados no ato comercial

Assim, a sincronização de estoque deve ser lida como uma `replicação operacional` da verdade do ERP para o ambiente de PDV.

### 4.2. Sincronizar clientes

Essa ação sugere envio ou atualização da base de clientes para o sistema de PDV.

O vínculo provável inclui:

- identificação do cliente
- dados cadastrais mínimos
- associação comercial para emissão/venda
- aproveitamento de histórico, fidelização ou crédito, se a arquitetura do PDV suportar isso

No contexto Vetus, esse eixo é coerente com a centralidade da entidade `cliente` em:

- `vendas`
- `financeiro`
- `resgate de pontos`
- `pacotes`
- `marketing`

Ou seja, a página mostra que o PDV não trabalha apenas com item e preço; ele depende também da sincronização da base relacional de clientes.

## 5. Comportamento assíncrono comprovado

O trecho mais importante da própria UI é a mensagem:

- `Sincronização iniciada com sucesso!`
- `Isso pode demorar alguns minutos`
- `Você pode continuar a navegar pelo sistema e executar outras ações, pois o processo continuará em background até terminar`

Essa evidência é forte porque revela diretamente características arquiteturais da operação:

- a sincronização não é bloqueante
- há processamento assíncrono
- a ação do usuário dispara um job/tarefa de fundo
- o shell beta reconhece início e término do processo

Mesmo sem o endpoint funcional explícito no recorte de rede, a experiência indica uma arquitetura baseada em `comando manual -> processamento background -> retorno de status`.

## 6. O que esta página é, e o que ela não é

### 6.1. O que esta página é

É uma página de `integração operacional` do PDV.

Mais precisamente, ela funciona como:

- painel simples de sincronização
- ponto de disparo manual de atualização
- superfície de manutenção entre ERP e PDV

### 6.2. O que esta página não comprova

Ela não comprova diretamente a existência, nesta mesma rota, de:

- caixa aberto
- leitura de código de barras
- inclusão de itens em carrinho
- recebimento/pagamento
- emissão fiscal no ato
- fechamento de venda no balcão

Essas capacidades pertencem ao domínio maior de `Ponto de Venda`, mas não aparecem diretamente nesta UI específica.

## 7. Relação com o domínio mais amplo de PDV

No acervo de planejamento do sistema, o domínio `PDV` aparece associado a capacidades como:

- leitura de código de barras
- busca rápida de produtos
- controle de estoque em tempo real
- cupom fiscal `NFC-e`
- cancelamento de vendas com auditoria

Essas capacidades devem ser lidas como características do `ecossistema PDV` do Vetus, e não como evidência direta desta tela particular.

Portanto, a interpretação tecnicamente correta é:

- a página `/pontos-de-venda` é a face administrativa/sincronizadora
- o `PDV operacional` provavelmente existe em outra superfície, fluxo ou sistema acoplado
- esta página existe para manter o PDV abastecido com dados confiáveis do ERP

## 8. Integrações e dependências inferidas

Com base na posição da tela e nos módulos já mapeados, o `Ponto de Venda` depende fortemente de:

- `Produtos`
- `Estoques`
- `Clientes`
- `Tabelas de Preço`
- possivelmente `Vendas`
- possivelmente camadas fiscais e financeiras posteriores

As conexões mais prováveis são:

1. `Produtos/Estoques/Tabelas de Preço` alimentam o catálogo comercial do PDV.
2. `Clientes` alimentam a identificação do comprador no balcão.
3. O PDV operacional executa a venda.
4. A venda retorna ou repercute em `Vendas`, `Financeiro` e possivelmente `Estoque`.

Nesta lógica, a página de PDV fica no meio da cadeia de consistência entre `cadastro mestre` e `execução comercial`.

## 9. Construção técnica observável

A rota foi capturada dentro do shell beta padrão do Vetus, com a mesma base tecnológica já observada em outras rotas SPA.

Indicadores técnicos visíveis:

- app carregada por bundles `app.*.js` e `chunk-vendors.*.js`
- stylesheets próprios do shell beta
- uso de armazenamento local com chaves como `company`, `vuex`, `accessGroup`, `user`, `accessToken`, `refreshToken`
- instrumentação de observabilidade/marketing como `Clarity`, `Hotjar`, `Google Tag Manager` e `InlineManual`

Isso reforça que a página pertence ao shell moderno do ERP, mesmo quando opera sobre uma capacidade ainda bastante enxuta.

## 10. Limites e gaps desta inspeção

Há uma limitação importante nesta rodada: o recorte salvo não expôs claramente os endpoints específicos disparados pelos botões de sincronização. A navegação principal da rota foi capturada, mas a chamada de backend responsável pela sincronização não ficou materializada de forma inequívoca no artefato consultado aqui.

Também não foi comprovado nesta passada:

- se existe cadastro de múltiplos PDVs
- se há vínculo por filial ou setor
- se a sincronização é total ou incremental
- se existem logs, fila, tentativas e reprocessamento
- se há parâmetros fiscais ou credenciais nesta mesma área

## 11. Conclusão

`Ponto de Venda`, no beta do Vetus, está comprovado como uma `página de sincronização administrativa` do ecossistema PDV. Ela não se apresenta como frente de caixa, mas como ponto de manutenção manual da coerência entre ERP e sistema de vendas de balcão.

As duas ações expostas, `Sincronizar Estoque` e `Sincronizar clientes`, revelam exatamente quais dados o Vetus considera indispensáveis para a operação do PDV: `catálogo/saldo/preço` e `base relacional de clientes`. Isso faz da página uma peça pequena na interface, mas estrutural na operação comercial, porque ela protege a integridade dos dados que sustentam a venda no balcão.

## 12. Evidências utilizadas

- captura estrutural da rota `/pontos-de-venda` no acervo `2026-04-23T22-00-01-706Z`
- screenshot `screenshots/-pontos-de-venda.png`
- inventário de rotas beta em `2026-04-23-inspecao-erp-beta-shell-rotas-integracoes.md`
- mapeamento macro do sistema em `01-PLANEJAMENTO-ERP-ENTERPRISE.md`
- malha geral SPA em `02-ANALISE-SISTEMA-VETUS.md`
