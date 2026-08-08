# Inspeção do ERP Vetus Beta

Data da inspeção: 23 de abril de 2026

Escopo desta fase:

- inspeção somente leitura do shell autenticado;
- mapeamento de rotas beta acessíveis pelo menu;
- inventário das rotas legacy embutidas no shell;
- identificação de integrações, chamadas de backend e conexões entre módulos;
- registro de evidências locais em `docs/vetus/inspection/2026-04-23T22-00-01-706Z`.

Restrições respeitadas:

- nenhuma ação de escrita foi executada dentro do ERP;
- nenhuma criação, edição ou exclusão de registro foi realizada;
- o único `POST` funcional observado foi o login em `dorylus.vetus.com.br/auth/v1/login`;
- dados reais presentes na tela foram deliberadamente redigidos neste documento.

## Evidências

- Artefatos brutos: [artifacts.json](../inspection/2026-04-23T22-00-01-706Z/artifacts.json)
- Shell autenticado: [03-shell-expanded.png](../inspection/2026-04-23T22-00-01-706Z/screenshots/03-shell-expanded.png)
- Home: [-inicio.png](../inspection/2026-04-23T22-00-01-706Z/screenshots/-inicio.png)
- Comandas: [-comandas.png](../inspection/2026-04-23T22-00-01-706Z/screenshots/-comandas.png)
- Dashboard financeiro: [-dashboard-financeiro.png](../inspection/2026-04-23T22-00-01-706Z/screenshots/-dashboard-financeiro.png)

## Veredito executivo

O ERP Vetus beta é uma SPA moderna que funciona como casca unificadora de um produto híbrido.

Confirmações objetivas:

- frontend SPA em Vue com Vue Router;
- design system e componentes fortemente baseados em PrimeVue;
- bundles empacotados em padrão webpack/Vue CLI com `chunk-vendors` e `app`;
- backend principal do shell beta concentrado em `dorylus.vetus.com.br`;
- menu híbrido que mistura rotas beta locais em `erp-beta.vetus.com.br` com links diretos para a aplicação legacy em `erp.vetus.com.br/Sistema/...`;
- proteção de borda via Cloudflare antes do carregamento do app.

Em termos de construção, o beta ainda não substitui o ERP inteiro. Ele já cobre um conjunto relevante de módulos, mas coexistindo com uma superfície legacy extensa.

## Arquitetura confirmada do frontend

Sinais confirmados no DOM e nos assets:

- `div id="app" data-v-app` confirma montagem de app Vue;
- classes `router-link-active` e `router-link-exact-active` confirmam Vue Router;
- classes `p-card`, `p-button`, `p-toast`, `p-autocomplete`, `p-paginator`, `p-inputtext` confirmam uso de PrimeVue ou stack equivalente;
- uso de ícones `material-symbols-outlined`, `primeicons` e `remixicon`;
- fontes via Google Fonts;
- CSS e JS versionados por hash:
  - `/js/chunk-vendors.ae2675a3.js`
  - `/js/app.20065a61.js`
  - `/css/chunk-vendors.3a8a9821.css`
  - `/css/app.5d31d72e.css`
  - chunks adicionais por tela, como `/js/7668.e0f39cb4.js`, `/js/7952.566dcdca.js`, `/js/8772.e6619cef.js`.

Conclusão de stack:

- Vue 3 ou variante muito próxima;
- Vue Router;
- PrimeVue;
- empacotamento estilo webpack/Vue CLI;
- code splitting por rota.

## Fluxo de autenticação

Fluxo observado:

1. acesso inicial bloqueado por Cloudflare;
2. após verificação, carregamento da tela `/login`;
3. formulário com três campos:
   - `data-testid="input-vetus-id"`
   - `data-testid="input-username"`
   - `data-testid="input-password"`
4. submissão do login via `POST https://dorylus.vetus.com.br/auth/v1/login`;
5. após autenticação, bootstrap da sessão com:
   - `GET /users/47/access-groups`
   - `GET /menu`
   - `GET /notificacoes/contagens/47`
6. redirecionamento para `https://erp-beta.vetus.com.br/inicio`.

Interpretação:

- o shell monta navegação e permissões a partir de backend;
- menu e grupos de acesso não estão hardcoded apenas no frontend;
- o backend já entrega uma visão permissionada da superfície funcional.

## Shell autenticado

Estrutura visual confirmada:

- topbar com busca global, notificações, suporte, WhatsApp e menu do usuário;
- seletor de empresa no topo do menu lateral;
- campo de busca próprio no menu lateral;
- menu lateral hierárquico com categorias expansíveis;
- rodapé institucional e links sociais;
- widget NPS/feedback embutido no shell.

Categorias de primeiro nível observadas:

- `Início`
- `Atendimento`
- `Laboratório`
- `Estoque`
- `Financeiro`
- `Marketing`
- `RH`
- `Relatórios`

Bootstrap funcional da home:

- cards de atalho para `Comandas`, `Clientes`, `Animais`, `Agenda`, `Produtos`, `Vendas`;
- bloco de comandas abertas;
- lembretes;
- aniversariantes;
- chamadas recorrentes para notificações e cards-resumo.

## Rotas beta confirmadas

Total de rotas beta internas percorridas com sucesso: `30`

Nenhuma rota percorrida retornou erro HTTP `>= 400`.

### Shell e home

- `/inicio`
  - função: dashboard inicial do shell
  - dados: `GET /commands/open`, `GET /home/reminder`, `GET /home/birthdays`
  - comportamento: atalhos operacionais, lembretes, aniversários, lista de comandas abertas

### Atendimento beta

- `/agenda`
  - heading: `Filtrar por...`, data corrente, `Mudar horário`
  - dados: `GET /service`, `GET /professional/basic`, `GET /schedule`, `GET /agenda/marcadores`, `GET /schedule/profissional/disponibilidades`
  - estrutura: filtros, calendário, visão mês/semana/dia, grade por profissional

- `/comandas`
  - heading: `Comandas`
  - dados: `GET /commands/page-query`
  - estrutura: busca textual, filtro, abertura de nova comanda, cards com status, cliente, total, detalhes e seções expansíveis

- `/pacotes`
  - heading: `Pacotes`
  - dados: `GET /packages/list`
  - estrutura: filtro, inclusão, pagamento, detalhes, observações, expansão de serviços

- `/vendas`
  - heading: `Venda de Produtos`
  - dados: `GET /vendas`
  - estrutura: filtro e criação de nova venda

### Cadastros beta

- `/cadastro/animais`
  - heading: `Animais`
  - dados: `GET /clients/page-query`, `GET /animals`, `GET /breed`
  - estrutura: busca avançada, ordenação, cadastro, detalhe, ação para abrir comanda, painel expansível do cliente

- `/cadastro/clientes`
  - heading: `Clientes`
  - dados: `GET /clients/page-query`
  - estrutura: filtro, cadastro, abertura de comanda, detalhes, painéis expansíveis de contato e animais

- `/cadastro/profissionais`
  - heading: `Profissionais`
  - dados: `GET /professional`
  - estrutura: inclusão, detalhe, contato, paginação

### Estoque e cadastro operacional beta

- `/estoques`
  - dados: `GET /stock`
  - estrutura: inclusão, detalhe, busca por ID/descrição

- `/fabricantes`
  - dados: `GET /manufacturer`
  - estrutura: inclusão e busca por ID/nome

- `/fornecedores-e-despesas`
  - dados: `GET /provider`
  - estrutura: busca avançada, ordenação, detalhe, inclusão

- `/grupos-de-produto`
  - dados: `GET /product-group`
  - estrutura: inclusão, detalhe, busca por ID/descrição

- `/produtos`
  - dados: `GET /products/dashboard`
  - estrutura: busca avançada, inclusão, ordenação, detalhe, paginação

- `/setores`
  - dados: `GET /sector`
  - estrutura: inclusão, detalhe, busca por ID/descrição

- `/tabelas-de-preco`
  - dados: `GET /tableprice`
  - estrutura: inclusão, detalhe, busca por ID/descrição

- `/unidades-de-medida`
  - dados: `GET /unit`
  - estrutura: inclusão, detalhe, busca por ID/descrição

- `/importar-dados-produtos`
  - dados próprios de backend não apareceram no recorte da navegação
  - estrutura: upload de importação, análise de importação, download de modelo

- `/importar-dados-servicos`
  - dados próprios de backend não apareceram no recorte da navegação
  - estrutura: upload de importação, análise de importação, download de modelo

- `/pontos-de-venda`
  - estrutura: botões explícitos de sincronização de estoque e clientes
  - observação: a tela confirma integração operacional, mas as chamadas específicas não ficaram evidentes no recorte de requests coletado

### Financeiro e fiscal beta

- `/dashboard-financeiro`
  - dados: `GET /dashboard`
  - estrutura: visão sintética da empresa, entradas/saídas, contas a receber, contas a pagar vencidas, gráficos de receita, fluxo de caixa e gaveta

- `/cfop`
  - dados: `GET /tax/cfop`
  - estrutura: tabela fiscal com busca por código/nome e inclusão

- `/cofins`
  - dados: `GET /tax/cofins`
  - estrutura: tabela fiscal com busca por código/descrição e inclusão

- `/icms`
  - dados: `GET /tax/icms/`
  - estrutura: tabela fiscal com inclusão e busca

- `/ipi`
  - dados: `GET /tax/ipi/`
  - estrutura: tabela fiscal com inclusão e busca

- `/matriz-icms`
  - dados: `GET /tax/matrizestadoicms/`
  - estrutura: matriz fiscal por UF destino

- `/pacote-ibs-cbs`
  - dados: `GET /pacote-ibs-cbs/page-query`
  - estrutura: tabela IBS/CBS

- `/pis`
  - dados: `GET /tax/pis`
  - estrutura: tabela fiscal com inclusão e busca

- `/tabela-fiscal-nfse`
  - dados: `GET /tax/tabelanfse`
  - estrutura: tabela NFS-e com inclusão e busca

### Relatórios beta

- `/relatorios/auditoria/agendamentos`
  - estrutura: relatório com ação `Solicitar Excel`
  - dados próprios não ficaram evidentes no recorte inicial

- `/relatorios/estoque/produtos`
  - dados: `GET /sector`, `GET /product-group`, `GET /manufacturer`
  - estrutura: relatório de produtos com filtros de apoio e exportação via Excel

## Inventário do legado embutido no menu

Total de links legacy identificados no shell: `92`

Esses links apontam para `https://erp.vetus.com.br/Sistema/...` e demonstram que o beta ainda funciona como orquestrador de uma suíte híbrida, não como substituição integral.

Distribuição por grupo legacy:

- `Agenda`: 1
- `Atendimento`: 5
- `Cadastros`: 15
- `Comissoes`: 2
- `DashboardMultiFilial`: 1
- `Estoque`: 11
- `Financeiro`: 12
- `Grafico`: 3
- `Internacao`: 2
- `Laboratorio`: 9
- `Marketing`: 3
- `Relatorio`: 24
- `Usuarios`: 2
- `Vacina`: 2

Principais blocos legacy embutidos:

- Atendimento:
  - `Esteira`
  - `EsteiraExames`
  - `Orcamentos`
  - `PontuacaoResgate`
  - `Vendas`

- Vacina:
  - `Vacinas`
  - `VacinaLayoutEmail`

- Internação:
  - `Internacao`
  - `InternacaoBox`

- Cadastros:
  - `Bancos`
  - `Cartoes`
  - `CentrosDeCusto`
  - `CustosDespesas`
  - `FormasDePagamento`
  - `Servicos`
  - `Webhooks`
  - entre outros

- Laboratório:
  - `Exames`
  - `Laudos`
  - `Hemogramas`
  - `Urina`
  - `Bioquimico`
  - `Equipamentos`
  - `TiposDeLaudo`
  - referências de hemograma e bioquímico

- Estoque:
  - `Compras`
  - `ConsultaDePrecos`
  - `EntradaNotaFiscal`
  - `TransferenciaEntreEstoques`
  - `ValidadeDeProdutos`
  - `TransacaoNoEstoque`
  - auditorias

- Financeiro:
  - `ContasAPagar`
  - `ContasAReceber`
  - `ContasAReceberCartao`
  - `Gaveta`
  - `PagamentoAntecipado`
  - `SplitConfig`
  - `SplitSimulador`
  - `SplitExport`
  - `Transacoes`
  - `LinhaDoTempo`

- Relatórios:
  - agenda
  - animais
  - atendimento por profissional
  - comandas/vendas
  - contas pagas e recebidas
  - DRE
  - estoque
  - fluxo de caixa
  - fornecedores
  - gaveta
  - movimentação de estoque
  - produção
  - serviços
  - executor de relatórios dinâmicos

Leitura arquitetural:

- Laboratório, internação, grande parte do financeiro, marketing, comissões e usuários ainda aparecem como superfícies externalizadas no legado.
- Atendimento, estoque, fiscal e alguns relatórios já possuem cobertura beta relevante.

## Backend e conexões de informação

Backend principal observado no beta:

- `https://dorylus.vetus.com.br`

Endpoints observados:

- `POST /auth/v1/login`
- `GET /users/47/access-groups`
- `GET /menu`
- `GET /notificacoes/contagens/47`
- `GET /commands/open`
- `GET /home/reminder`
- `GET /home/birthdays`
- `GET /service`
- `GET /professional/basic`
- `GET /schedule`
- `GET /agenda/marcadores`
- `GET /schedule/profissional/disponibilidades`
- `GET /clients/page-query`
- `GET /animals`
- `GET /breed`
- `GET /professional`
- `GET /commands/page-query`
- `GET /dashboard`
- `GET /stock`
- `GET /manufacturer`
- `GET /provider`
- `GET /product-group`
- `GET /products/dashboard`
- `GET /sector`
- `GET /tableprice`
- `GET /unit`
- `GET /tax/cfop`
- `GET /tax/cofins`
- `GET /tax/icms/`
- `GET /tax/ipi/`
- `GET /tax/matrizestadoicms/`
- `GET /tax/pis`
- `GET /tax/tabelanfse`
- `GET /pacote-ibs-cbs/page-query`
- `GET /packages/list`
- `GET /vendas`

Conexões de informação inferidas a partir das telas e requests:

- home consome comandas abertas, lembretes e aniversariantes;
- agenda depende de serviços, profissionais e disponibilidades;
- cadastro de animais conecta clientes e raças;
- comandas conectam cliente, itens e total financeiro;
- dashboard financeiro consome agregações operacionais da empresa;
- relatório de estoque reutiliza entidades de catálogo como setor, fabricante e grupo de produto;
- o menu permissionado depende de grupos de acesso do usuário autenticado.

## Integrações de terceiros observadas

- Cloudflare
  - borda e mitigação anti-bot

- Zendesk
  - suporte via `petlove-vetus.zendesk.com`

- WhatsApp
  - botão de contato direto

- Google Tag Manager / Google Analytics / DoubleClick
  - instrumentação de analytics e audiência

- Microsoft Clarity
  - captura comportamental

- Hotjar
  - mapas e telemetria de uso

- Inline Manual
  - camada de onboarding/contextual help

- Solucx
  - widget de NPS/feedback e chamadas a:
    - `survey.solucx.com.br`
    - `app-api.solucx.com.br`
    - `app-api.preview.solucx.com.br`
    - `temporal-count-service.gke-prd.solucx.com.br`

Leitura prática:

- o shell beta não é apenas operacional; ele já embute instrumentação de suporte, analytics, satisfação e onboarding.

## Achados relevantes

- A navegação beta já está operacional em atendimento, estoque, fiscal e parte de relatórios.
- O produto continua híbrido e depende fortemente de deep links para o legado.
- O backend `dorylus` atua como BFF/API operacional do beta.
- O menu vem do backend, o que indica controle centralizado de permissão e habilitação de módulos.
- O shell expõe dados operacionais reais logo na home e em listas, portanto qualquer futura automação de inspeção deve tratar redacão e segurança como requisito obrigatório.
- O dashboard financeiro beta já consolida métricas amplas de operação, sugerindo que esta área está mais avançada que outras no processo de migração.

## Planejamento sugerido para a próxima fase

1. Fazer uma segunda onda de inspeção focada exclusivamente nas rotas legacy em `erp.vetus.com.br/Sistema/...`, agrupando por domínio funcional.
2. Extrair um mapa de equivalência `beta -> legado` por módulo e por subrotina.
3. Identificar onde o beta já usa API `dorylus` própria e onde ainda apenas deep-linka para telas antigas.
4. Capturar contratos de payload por rota beta, com exemplos redigidos de resposta.
5. Priorizar os blocos ainda 100% legacy:
   - laboratório
   - internação
   - comissões
   - usuários/acessos
   - grande parte do financeiro transacional
   - marketing
   - relatórios legacy avançados

## Verificação da coleta

Resumo da execução confirmada:

- rotas beta percorridas: `30`
- requests capturados: `1291`
- responses capturadas: `1176`
- responses com erro `>= 400`: `0`

Isso confirma que a inspeção navegou com sucesso pelo shell e por um conjunto substancial das páginas beta acessíveis via menu.
