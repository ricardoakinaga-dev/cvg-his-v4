# Plano Executivo — Alinhamento CVG-HIS V2 com benchmark Vetus

Data: 2026-04-22
Origem do benchmark: `/root/cvg-his-v2/docs/vetus`
Escopo de inspeção do código atual:
- `apps/spa/src/layouts/AppLayout.vue`
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`
- `apps/spa/src/stores/app.ts`
- `apps/spa/src/pages/DashboardPage.vue`
- `apps/spa/src/pages/appointments/AppointmentsListPage.vue`
- `apps/spa/src/pages/sales/CounterSalesPage.vue`
- `apps/spa/src/pages/products/ProductsListPage.vue`
- `apps/spa/src/pages/laboratory/LaboratoryHubPage.vue`
- `apps/spa/src/pages/users/UsersListPage.vue`
- `apps/spa/src/pages/commercial-reports/CommercialReportsPage.vue`
- `apps/spa/src/pages/PlaceholderPage.vue`

## 1. Resumo executivo

Após leitura dos guias e inspeção visual das evidências do Vetus, o CVG-HIS V2 já possui uma base SPA mais ampla do que o benchmark em alguns domínios, porém ainda não reproduz com fidelidade a arquitetura de navegação, a hierarquia do menu e a linguagem operacional que tornam o Vetus consistente.

O ponto mais importante não é “copiar telas”; é reconstruir três camadas do produto:

1. Shell operacional
   - topbar
   - sidebar
   - breadcrumbs
   - busca
   - contexto de empresa
   - CTA contextual

2. Taxonomia de produto
   - domínio > subdomínio > rotina
   - coerência entre menu, rotas, páginas e serviços

3. Maturidade por macrodomínio
   - elevar o que já está bom
   - fechar lacunas dos módulos que o menu promete
   - evitar hubs genéricos onde o Vetus usa rotinas explícitas

Conclusão executiva:
- o shell atual é funcional, mas ainda não está Vetus-aligned o suficiente;
- o CVG-HIS V2 já tem módulos robustos para Agenda e Comandas, bons blocos em Estoque/Fiscal, RH e Laboratório, mas a navegação e a segmentação dos domínios ainda estão desalinhadas;
- o esforço correto é uma reestruturação controlada em fases, começando pelo shell e pela taxonomia, depois consolidando os módulos com maior valor operacional.

## 2. O que o benchmark Vetus estabelece

Base documental principal lida:
- `docs/vetus/guides/02-shell-estrutura-global.md`
- `docs/vetus/guides/03-shell-mapa-de-navegacao.md`
- `docs/vetus/guides/10-modulo-agenda.md`
- `docs/vetus/guides/11-modulo-comandas.md`
- `docs/vetus/guides/14-modulo-estoque-fiscal.md`
- `docs/vetus/guides/15-modulo-rh-marketing-relatorios.md`
- anexos `20` a `24`
- catálogo `16-catalogo-de-evidencias.md`

### 2.1 Padrões obrigatórios do shell Vetus

O benchmark mostra:
- topbar fixa e estável entre módulos;
- sidebar fixa com busca e contexto de empresa;
- grupos de primeiro nível:
  - Início
  - Atendimento
  - Laboratório
  - Estoque
  - Financeiro
  - Marketing
  - RH
  - Relatórios
- menu em 3 níveis:
  - domínio
  - subdomínio
  - rotina
- item expandido com destaque azul;
- subgrupos em faixa bege clara;
- CTA principal laranja no topo da página;
- conteúdo com fundo cinza-azulado leve e cards brancos;
- padrões recorrentes de breadcrumbs, filtros, cards, tabelas simples e ações outline.

### 2.2 Padrões funcionais do benchmark

Leituras mais importantes do acervo:
- Atendimento é o maior hub operacional;
- Agenda e Comandas são referências fortes de UX operacional;
- Estoque/Fiscal possui navegação densa e profunda;
- Financeiro é amplo e ERP-like, com vários subgrupos e rotinas;
- RH, Marketing e Relatórios existem no menu, mas parte significativa ainda depende de legado ou tem indisponibilidades no shell original;
- o grande problema do Vetus não é o shell, e sim a ponte entre menu, rota e destino final.

## 3. Diagnóstico do código atual do CVG-HIS V2

## 3.1 Pontos fortes já existentes

### Shell SPA funcional
`apps/spa/src/layouts/AppLayout.vue` já entrega:
- sidebar fixa com colapso;
- topbar fixa;
- busca no menu;
- navegação por grupos e seções;
- favoritos e recentes;
- command palette.

### Cobertura funcional maior que o benchmark em alguns domínios
`apps/spa/src/router/routes.ts` mostra cobertura relevante em:
- Agenda
- Pacientes/Tutores
- Atendimentos
- Internação
- Laboratório
- Estoque
- Fiscal
- Produtos
- Serviços
- Usuários
- Equipe
- Financeiro leve
- Relatórios administrativos
- Integrações/Governança

### Módulos com boa maturidade aparente
Pelo código lido, destacam-se:
- `pages/appointments/AppointmentsListPage.vue`
  - agenda cockpit consistente com mini calendário, filtros e views mês/semana/dia;
- `pages/sales/CounterSalesPage.vue`
  - comanda como workbench operacional denso, bom alinhamento com o benchmark;
- `pages/products/ProductsListPage.vue`
  - listagem objetiva e operacional;
- `pages/laboratory/LaboratoryHubPage.vue`
  - hub navegável e coerente;
- `pages/users/UsersListPage.vue`
  - RH/Usuários bem encaminhado;
- `pages/commercial-reports/CommercialReportsPage.vue`
  - visão executiva consolidada.

## 3.2 Gaps de aderência ao benchmark

### Gap A — Taxonomia do menu ainda não está Vetus-aligned
No código atual, `navigation.ts` já separa grupos, mas a modelagem ainda diverge do Vetus em pontos centrais:
- o Vetus trabalha fortemente com domínio > subdomínio > rotina;
- o CVG-HIS V2 mistura esse modelo com uma navegação mais “flat” dentro de cada grupo;
- subdomínios críticos do benchmark não estão explicitados na mesma profundidade.

Exemplos:
- Atendimento no benchmark:
  - Atendimentos
  - Internação
  - Cadastros
  - com rotinas como Agenda, Comandas, Vendas, Pacotes, Esteira, Vacinas, Orçamentos, Animais, Clientes, Serviços
- Atendimento atual:
  - está melhor em cobertura clínica, mas a taxonomia ainda não replica fielmente a árvore do produto benchmark.

- Financeiro no benchmark:
  - Gaveta
  - Controles
  - Maquininha de Cartão
  - Cadastros
  - e um conjunto amplo de rotinas
- Financeiro atual:
  - ainda está raso na navegação principal e não expõe a profundidade operacional prometida pelo benchmark.

- RH no benchmark:
  - Usuários
  - Comissões
  - Cadastros
- RH atual:
  - foca em Usuários e Equipe, mas ainda não reproduz o eixo de Comissões/Cadastros.

- Relatórios no benchmark:
  - várias rotinas explícitas por domínio
- Atual:
  - condensado em um hub único.

### Gap B — Shell visual ainda não espelha o comportamento Vetus
`AppLayout.vue` é funcional, mas não replica o padrão do benchmark com precisão:
- usa `details/summary` e múltiplos painéis auxiliares;
- adiciona “Console Enterprise”, Favoritos e Recentes na sidebar principal;
- isso aumenta poder, mas afasta o comportamento operacional simples e previsível do Vetus;
- a topbar atual é útil, porém não reproduz completamente:
  - empresa em destaque estrutural;
  - suporte e WhatsApp no mesmo padrão do benchmark;
  - breadcrumbs visíveis como parte constante da área principal;
  - CTA contextual mais marcante na anatomia da página.

### Gap C — excesso de superfícies utilitárias fora do benchmark
Favoritos, Recentes e Console Enterprise são úteis, porém hoje competem com o menu principal.
Resultado:
- sidebar mais densa que o benchmark;
- perda de clareza da árvore operacional principal;
- menor legibilidade para recepção, financeiro e operação assistencial.

### Gap D — inconsistência entre macrodomínios maduros e hubs genéricos
O CVG-HIS V2 tem páginas fortes, mas ainda convive com assimetrias:
- alguns módulos são “cockpits” ricos;
- outros ainda são hubs genéricos ou listagens isoladas;
- a experiência entre módulos ainda não parece parte de um mesmo sistema operacional.

### Gap E — arquitetura de rotas ainda precisa refletir melhor a arquitetura de informação
O benchmark mostra que o menu comunica o produto. No estado atual, parte da estrutura de rotas já existe, mas ainda não está organizada para contar essa história com a mesma clareza.

## 4. Avaliação executiva por macrodomínio

### 4.1 Shell e navegação
Status: médio

Pronto:
- base SPA sólida;
- menu funcional;
- topbar e busca existentes.

Falta:
- aderência visual ao benchmark;
- árvore em 3 níveis consistente;
- disciplina da informação na sidebar.

### 4.2 Atendimento
Status: alto potencial / bom estágio

Pronto:
- Agenda está bem adiantada;
- Comandas é um dos melhores módulos atuais;
- Pacientes, Tutores, Atendimentos, Triagem, Prontuário e Internação já existem.

Falta:
- reorganizar a taxonomia no padrão Vetus;
- explicitar rotinas comerciais e assistenciais na árvore certa;
- decidir estratégia para Pacotes, Esteiras, Vacinas, Orçamentos e Vendas no mesmo mapa mental.

### 4.3 Laboratório
Status: bom

Pronto:
- hub, pedidos, resultados, equipamentos, tipos e referências já estão estruturados.

Falta:
- reforçar a navegação por subdomínio conforme o benchmark;
- aproximar a exposição de Hemograma, Urina e Bioquímico da leitura do acervo;
- garantir fluxo operacional fim a fim.

### 4.4 Estoque/Fiscal
Status: bom

Pronto:
- inventário e fiscal possuem boa massa de rotas;
- há capacidade real acima do benchmark em alguns pontos.

Falta:
- reorganização de menu no padrão Vetus;
- explicitar mais rotinas de cadastros e fiscal em árvore consistente;
- melhorar previsibilidade entre listagem, detalhe e configuração.

### 4.5 Financeiro
Status: médio/baixo relativo ao benchmark

Pronto:
- Caixa, PIX, Billing e relatórios administrativos existem.

Falta:
- profundidade de navegação;
- exposições explícitas de contas a pagar/receber, transações, bancos, formas de pagamento, centros de custo e afins na camada principal;
- alinhamento com o benchmark ERP-like.

### 4.6 RH
Status: médio/bom

Pronto:
- Usuários e Equipe já têm superfície clara.

Falta:
- Comissões e Cadastros na mesma disciplina do benchmark;
- melhor acoplamento entre RH e governança de acesso sem misturar domínios.

### 4.7 Marketing
Status: baixo

Pronto:
- notificações e WhatsApp operacional.

Falta:
- árvore coerente para campanhas, e-mail e SMS;
- decisão clara se Marketing será módulo operacional próprio ou suíte de comunicação.

### 4.8 Relatórios
Status: médio

Pronto:
- hub executivo já existe.

Falta:
- decompor por domínio operacional;
- transformar “hub único” em navegação útil por Agenda, Atendimento, Cadastros, Estoque e Financeiro.

## 5. Direção estratégica recomendada

A recomendação é executar em 4 frentes paralelas e coordenadas.

### Frente 1 — Refatoração do shell
Objetivo:
- alinhar layout base ao benchmark Vetus sem perder ganhos modernos do CVG-HIS V2.

Decisões:
- manter command palette, favoritos e recentes, mas retirar esses blocos da competição visual com o menu principal;
- tornar o shell claramente dominado pela árvore operacional;
- padronizar topbar, breadcrumbs e cabeçalhos de página.

### Frente 2 — Replatform da taxonomia
Objetivo:
- reconstruir a navegação como arquitetura de produto.

Decisões:
- menu deve refletir domínio > subdomínio > rotina;
- rotas devem nascer da taxonomia, e não o inverso;
- subgrupos devem existir mesmo quando a rotina ainda estiver em evolução, desde que o estado do produto fique explícito.

### Frente 3 — Consolidação dos módulos de maior valor
Prioridade alta:
- Atendimento
- Estoque/Fiscal
- Financeiro
- RH
- Relatórios

### Frente 4 — Governança de consistência
Objetivo:
- impedir regressão entre design, rotas, navegação e páginas.

Necessário:
- contrato de navegação único;
- inventário de rotas por domínio;
- critérios de pronto por módulo;
- testes de navegação e smoke tests visuais.

## 6. Sequência executiva recomendada

### Fase 1 — Fundamentos
- redesenhar shell;
- refatorar navegação;
- definir taxonomia final;
- mapear rotas-alvo por domínio.

### Fase 2 — Atendimento como referência de qualidade
- usar Agenda e Comandas como referência visual e comportamental;
- fechar lacunas de árvore e consistência nesse domínio.

### Fase 3 — Densidade ERP
- Estoque/Fiscal;
- Financeiro;
- RH.

### Fase 4 — Camadas satélite
- Marketing;
- Relatórios;
- integrações com legado, se ainda houver.

## 7. Critérios de sucesso

O programa será bem-sucedido quando:
- o shell do CVG-HIS V2 for imediatamente reconhecível como Vetus-aligned;
- qualquer usuário conseguir localizar uma rotina pelo mapa domínio > subdomínio > rotina;
- não houver contradição entre menu, rota e página entregue;
- Agenda e Comandas deixarem de ser exceções e passarem a ser o padrão de qualidade do produto;
- Financeiro, RH e Relatórios deixarem de depender de hubs genéricos para navegação principal;
- os domínios em construção tenham estados explícitos e não ambíguos.

## 8. Decisão executiva final

A melhor estratégia não é um redesign cosmético. É uma refatoração de produto em camadas:

1. refazer shell e navegação;
2. reorganizar árvore de informação;
3. consolidar módulos críticos na sequência operacional correta;
4. institucionalizar critérios de consistência.

Se essa ordem for respeitada, o CVG-HIS V2 pode superar o benchmark Vetus em robustez sem perder a familiaridade operacional que o benchmark oferece.