# Relatório master de usabilidade Playwright — CVG-HIS V4

Data da execução: 2 de setembro de 2026 (America/Sao_Paulo)  
Projeto: `cvg-his-v4`  
Ferramenta obrigatória: Playwright 1.58.2 com Chrome for Testing 145.0.7632.6  
Viewports principais: desktop `1440x900` e mobile `390x844`

## Veredito executivo

**Resultado: aprovação condicionada; o sistema não deve ser considerado homologado para produção com base apenas nesta execução.**

Foram definidos **369 casos Playwright**, dos quais 363 chegaram a ser executados e 6 foram pulados por dependerem de PostgreSQL. O runner registrou 354 aprovações técnicas, 9 falhas e 6 casos pulados. Dentro das 286 navegações da auditoria não bloqueante, todas as rotas abriram e puderam ser avaliadas, mas nenhuma das 286 renderizações ficou integralmente conforme: o shell expõe dois landmarks `<main>` em todas as telas, e subconjuntos apresentam falha de API, alvo pequeno, campo sem rótulo ou overflow.

O bloqueio mais importante do ambiente foi a ausência de Docker/PostgreSQL. A API entrou em modo de repositório em memória, enquanto partes do sistema continuaram exigindo a fonte persistente em `127.0.0.1:5433`. Isso impede certificar persistência real, isolamento de tenant, concorrência, relatórios completos e alguns fluxos clínicos.

## Escopo e método

Todos os resultados de usabilidade foram obtidos com Playwright, abrindo e operando a SPA em um navegador real. A auditoria master percorreu os itens existentes na navegação da aplicação, realizou login pelo formulário e testou cada rota em desktop e mobile.

Em cada renderização foram verificados:

- resposta do documento, URL final, redirecionamento indevido para login e 404;
- presença e visibilidade do conteúdo principal e de um heading;
- erros JavaScript não tratados e respostas HTTP `4xx/5xx` da própria aplicação;
- botões, links, campos e tabelas realmente visíveis no viewport;
- nomes acessíveis, rótulos de formulário e cabeçalhos de tabela;
- alvos interativos menores que `24x24px`;
- overflow horizontal global;
- foco obtido pela primeira navegação com `Tab`;
- regressão visual em tema claro/escuro e desktop/mobile;
- cadastros e autenticação de perfis operacionais;
- criação, busca, filtragem e relacionamento de dados fictícios.

Alguns testes funcionais existentes usam chamadas Playwright de API apenas para preparar dados; a validação do comportamento continua acontecendo pela interface. O cenário já existente de tutor/animal e os novos cenários de contas/profissionais possuem fluxos de criação inteiramente pela UI.

## Resultado consolidado

| Conjunto                                 |   Casos | Aprovados pelo runner | Falharam | Pulados | Interpretação                                                                               |
| ---------------------------------------- | ------: | --------------------: | -------: | ------: | ------------------------------------------------------------------------------------------- |
| Suíte funcional SPA existente            |      43 |                    29 |        8 |       6 | Fluxos de negócio, formulários, exports e navegação                                         |
| Contas, perfis e profissionais fictícios |      12 |                    12 |        0 |       0 | Cadastros via UI, tabelas, filtros e login por papel                                        |
| Auditoria master das rotas               |     286 |                   286 |        0 |       0 | Coleta não bloqueante; internamente 286/286 renderizações têm ao menos uma não conformidade |
| Regressão visual                         |      28 |                    27 |        1 |       0 | Desktop/mobile e temas claro/escuro                                                         |
| **Total**                                | **369** |               **354** |    **9** |   **6** | **363 casos efetivamente executados**                                                       |

O `passed` do runner na auditoria master significa que o Playwright conseguiu concluir a coleta daquela rota. A classificação de usabilidade está no JSON e não é mascarada: **286 registros internos estão como `failed`**.

### Volume inspecionado na matriz de rotas

| Métrica                                      |                        Resultado |
| -------------------------------------------- | -------------------------------: |
| Rotas únicas                                 |                              143 |
| Renderizações desktop + mobile               |                              286 |
| Botões visíveis observados                   |                            2.761 |
| Links visíveis observados                    |                            2.575 |
| Campos visíveis observados                   |                              992 |
| Tabelas visíveis observadas                  |                               50 |
| Renderizações com erro HTTP interno          | 66, referentes a 33 rotas únicas |
| Erros JavaScript não tratados                |                                0 |
| Redirecionamentos inesperados para login/404 |                                0 |

As quantidades de controles representam observações por tela e viewport, não elementos únicos do código-fonte.

## Dados fictícios e papéis testados

Os seguintes registros foram criados e validados navegando pela interface:

- tutor no padrão `Tutor UI <timestamp>`;
- animal canino no padrão `Paciente UI <timestamp>`, com raça Golden Retriever e vínculo ao tutor;
- conta de administrador;
- conta de veterinário;
- conta de enfermeiro;
- conta de recepção;
- cadastro profissional de médico-veterinário;
- cadastro profissional de enfermeiro veterinário.

As quatro contas foram encontradas na tabela de usuários com filtro, e cada uma autenticou em um `BrowserContext` novo. Foram abertas as superfícies de Usuários, Atendimentos, Triagem e Recepção conforme o papel. Os dois profissionais foram localizados na tabela da equipe.

Como o backend executou em memória, esses dados eram sintéticos e efêmeros; foram descartados quando o processo da API terminou. Nenhum dado real de tutor, animal ou funcionário foi usado.

## Fluxos aprovados

Entre os fluxos que passaram, destacam-se:

- login real pela SPA e mensagem de erro para credenciais inválidas;
- criação de tutor e animal pela interface, busca nas listas e validação do vínculo;
- validação de campos obrigatórios nos formulários de tutor e animal;
- criação, visualização de cockpit e cancelamento de agendamento;
- CRUD de webhook;
- importação Vetus com validação, execução e desfazimento;
- exibição de fidelidade, tabela de preço e job de PDV;
- listas e detalhes de internação dentro do que o modo em memória suporta;
- Busca Mestre 360 para cenários suportados e leitura em viewport mobile;
- dashboard executivo, motor de relatórios e parte dos workbenches enterprise;
- exports de cadastros de clientes e pacientes;
- quatro testes de acessibilidade e teclado do assistente de configuração;
- 12 cenários novos de contas, papéis, profissionais e tabelas.

## Falhas funcionais e riscos

| Severidade                | Achado                                                           | Evidência/impacto                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bloqueador de homologação | PostgreSQL de teste indisponível e Docker ausente                | Conexões a `127.0.0.1:5433` foram recusadas. Seis casos foram pulados e não há comprovação de persistência real ou isolamento de tenant.                                                 |
| P1                        | Adaptador atômico de prontuário indisponível                     | A criação de prontuário/ordem retornou `500`, quebrando persistência assistencial, prontuário no fluxo crítico, Busca Mestre com exames e walkthrough operacional.                       |
| P1                        | 33 rotas fazem requisições que terminam em `400`, `500` ou `503` | Catálogos, estoque, financeiro, dashboards e relatórios exibem superfície parcial ou alerta. Todas falharam nos dois viewports.                                                          |
| P1                        | Export de agenda e estoque não conclui                           | Dois cenários aguardaram download por 90 segundos e expiraram, sem conclusão útil para o usuário.                                                                                        |
| P1                        | Saldo do faturamento não atualiza após quitação                  | O fluxo esperava `R$ 0,00` após registrar recebimento e a interface não exibiu o novo saldo.                                                                                             |
| P1                        | Relatório de exclusão de vendas/comandas sem fonte persistente   | A execução não gerou `reportId`; o relatório exige fonte de vendas de balcão baseada em banco.                                                                                           |
| P2                        | Perfis restritos disparam acessos secundários sem permissão      | Durante login/navegação de veterinário e enfermagem foram observados `403` em cargas globais/secundárias. A página principal abriu, mas há sobrebusca e risco de alertas desnecessários. |

Os seis casos pulados por ausência de banco cobrem relatórios persistidos de estoque, compras, produtos, notas, movimentações e serviços. As provas dedicadas de matriz de acesso e isolamento entre tenants também exigem uma execução com banco real para homologação.

## Acessibilidade e semântica

### Dois landmarks principais em todo o shell

As 286 renderizações apresentaram **dois landmarks `main` concorrentes**, totalizando 572 observações. O shell possui um `<main>` externo e um `role="main"` interno. Isso torna a navegação por landmarks ambígua para leitores de tela.

Recomendação: manter somente um landmark principal por documento. O contêiner interno pode ser `section` sem `role="main"`, preservando `id="main-content"` como destino do skip link.

### Campos sem rótulo identificável

Foram observados 7 campos sem `label`, `aria-label`, `aria-labelledby` ou `title` em 5 renderizações:

- desktop: busca em `/patients`, `/owners` e `/staff`;
- desktop: busca e seletores de perfil/status em `/users`;
- mobile: busca em `/owners`.

Placeholder não foi aceito como rótulo, pois desaparece durante a digitação e não substitui um nome programático.

### Alvos pequenos

Foram registradas 90 ocorrências de controles menores que `24x24px`, distribuídas por 77 renderizações. Os padrões mais comuns foram links de breadcrumb, botão `×` para fechar alerta e links compactos como `Abrir`/`Abrir Esteira`.

Recomendação: aumentar a caixa clicável com padding sem necessariamente aumentar o texto ou o ícone.

### Resultados positivos de acessibilidade

- nenhum botão ou link visível ficou sem nome na coleta refinada;
- todas as telas expuseram ao menos um heading;
- a primeira tecla `Tab` sempre levou a um elemento visível;
- não foram encontrados cabeçalhos de tabela vazios entre as tabelas visíveis;
- os quatro cenários Axe/teclado do assistente de configuração passaram.

## Responsividade

Foram detectados 10 overflows horizontais globais:

| Modo    | Rota                                   | Excesso |
| ------- | -------------------------------------- | ------: |
| Desktop | `/finance/card-accounts`               |    24px |
| Desktop | `/cards`                               |     5px |
| Mobile  | `/finance/accounts-payable`            |     9px |
| Mobile  | `/finance/split`                       |   355px |
| Mobile  | `/finance/card-machines`               |   265px |
| Mobile  | `/finance/split/simulator`             |   264px |
| Mobile  | `/finance/payment-enablement`          |   460px |
| Mobile  | `/payment-methods`                     |   324px |
| Mobile  | `/banks`                               |   438px |
| Mobile  | `/reports/deleted-sales-counter-sales` |    15px |

Os overflows de 264–460px nas rotas financeiras mobile são graves: parte relevante do conteúdo pode ficar fora do viewport. Os excessos de 5–24px também devem ser corrigidos, mas têm prioridade menor.

## Design e regressão visual

Dos 28 snapshots Playwright, **27 passaram**. A cobertura incluiu login; listas de tutores, animais, atendimentos, internação e faturamento; agenda; detalhes de tutor, animal, atendimento, faturamento e agendamento; recepção; esteira; comandas; dashboard; tema escuro; mobile claro e mobile escuro.

A única falha visual foi `medical record detail page` em desktop escuro, com 81.354 pixels diferentes e razão aproximada de 9%. A imagem atual não mostrou um layout clínico alterado: mostrou uma tela quase vazia com o alerta **“Prontuário não encontrado para este identificador.”**. Portanto, a causa primária é a indisponibilidade da persistência atômica, não uma simples mudança de CSS. O baseline não deve ser atualizado para aceitar essa tela de erro.

## Tabelas, planilhas e exports

Foram observadas 50 renderizações com tabelas visíveis na matriz master. Além da inspeção estrutural:

- a tabela de usuários foi filtrada e apresentou exatamente os quatro perfis fictícios;
- a tabela de profissionais apresentou o veterinário e o enfermeiro cadastrados;
- exports de cadastros de clientes e pacientes passaram;
- o motor enterprise e workbenches suportados carregaram;
- os exports de agenda e estoque falharam por timeout;
- relatórios de estoque/serviços dependentes de PostgreSQL não puderam ser certificados;
- nenhuma tabela visível apresentou `<th>` vazio na auditoria.

## Rotas com falhas HTTP internas

Cada rota abaixo falhou tanto em desktop quanto em mobile, totalizando 66 renderizações afetadas.

| Rota                                   | Resposta observada                     |
| -------------------------------------- | -------------------------------------- |
| `/suppliers`                           | `503 /api/expenses-catalog`            |
| `/warehouses`                          | `503 /api/warehouses`                  |
| `/manufacturers`                       | `503 /api/manufacturers`               |
| `/product-groups`                      | `503 /api/product-groups`              |
| `/company-sectors`                     | `503 /api/company-sectors`             |
| `/measurement-units`                   | `503 /api/measurement-units`           |
| `/finance/advance-payments`            | `503 /api/finance/advance-payments`    |
| `/finance/cash-flow`                   | `503 /api/expenses-catalog`            |
| `/dashboards/multifilial`              | `500 /api/reports/administrative-hubs` |
| `/dashboards/financial`                | `500 /api/reports/administrative-hubs` |
| `/finance/timeline`                    | `503 /api/expenses-catalog`            |
| `/cost-centers`                        | `503 /api/cost-centers-catalog`        |
| `/expenses`                            | `503 /api/expenses-catalog`            |
| `/commission-calculations`             | `500 /api/reports/administrative-hubs` |
| `/reports/cash-drawer`                 | `500 /api/reports/administrative-hubs` |
| `/reports/financial`                   | `500 /api/reports/administrative-hubs` |
| `/reports/dre`                         | `500 /api/reports/administrative-hubs` |
| `/reports/packages`                    | `500 /api/reports/administrative-hubs` |
| `/reports/advance-payments`            | `400 /api/reports/executions`          |
| `/reports/sales`                       | `500 /api/reports/administrative-hubs` |
| `/reports/produced-items`              | `500 /api/reports/administrative-hubs` |
| `/reports/production`                  | `500 /api/reports/administrative-hubs` |
| `/reports/appointments`                | `400 /api/reports/executions`          |
| `/reports/professional-care`           | `400 /api/reports/executions`          |
| `/reports/nf`                          | `500 /api/reports/executions`          |
| `/reports/registers/services`          | `400 /api/reports/executions`          |
| `/reports/registers/suppliers`         | `400 /api/reports/executions`          |
| `/reports/deleted-sales-counter-sales` | `400 /api/reports/executions`          |
| `/reports/inventory`                   | `400 /api/reports/executions`          |
| `/reports/inventory-movements`         | `400 /api/reports/executions`          |
| `/reports/inventory-invoices`          | `400 /api/reports/executions`          |
| `/reports/inventory-products`          | `400 /api/reports/executions`          |
| `/administrative-reports`              | `500 /api/reports/administrative-hubs` |

A maior parte dessas respostas declara explicitamente que a fonte baseada em banco está indisponível. Ainda assim, do ponto de vista do usuário, a tela recebe falha. O reteste com PostgreSQL deve distinguir defeito de produto de limitação exclusiva deste ambiente.

## Cobertura nominal de navegação

Foram percorridas 143 rotas únicas. O menu possui 144 entradas por grupo, mas `/exam-orders` aparece em Atendimento e Laboratório e foi contado uma vez na lista única.

### Início (1)

`/`

### Atendimento (33)

`/reception`, `/appointments`, `/counter-sales`, `/sales`, `/packages`, `/queue`, `/exam-orders`, `/vaccines-dewormers`, `/quotes`, `/loyalty`, `/sales/beta`, `/inpatient`, `/inpatient/daily-charges`, `/patients`, `/owners`, `/services`, `/services/import`, `/vetus-imports`, `/responsibility-terms`, `/breeds`, `/species`, `/coat-colors`, `/customer-groups`, `/beds`, `/webhooks`, `/encounters`, `/medical-records`, `/triage`, `/prescriptions`, `/prescription-executions`, `/surgery`, `/discharges`, `/inpatient/board`

### Laboratório (12 rotas adicionais)

`/laboratory/orders`, `/laboratory/results`, `/laboratory/hemograms`, `/laboratory/urinalysis`, `/laboratory/biochemistry`, `/laboratory/equipment`, `/laboratory/report-types`, `/laboratory/hemogram-reference-values`, `/laboratory/biochemistry-reference-values`, `/laboratory`, `/exam-results`, `/diagnostics`

### Estoque (29)

`/inventory/price-consultation`, `/inventory/nf`, `/inventory/movements`, `/inventory/pharmacy`, `/inventory/validity`, `/inventory/audit`, `/inventory/price-audit`, `/inventory/transfers`, `/inventory/purchases`, `/inventory/price-adjustments`, `/inventory/data-collectors`, `/products`, `/products/import`, `/suppliers`, `/warehouses`, `/manufacturers`, `/product-groups`, `/company-sectors`, `/measurement-units`, `/tabelas-de-preco`, `/pontos-de-venda`, `/fiscal/icms`, `/fiscal/ipi`, `/fiscal/pis`, `/fiscal/cofins`, `/fiscal/cfop`, `/fiscal/nfse`, `/fiscal/icms-matrix`, `/fiscal/ibs-cbs`

### Financeiro (26)

`/cash`, `/billing`, `/finance/accounts-payable`, `/finance/reconciliation`, `/finance/advance-payments`, `/finance/card-accounts`, `/finance/cheques`, `/finance/cash-flow`, `/dashboards/curve-abc-clients`, `/dashboards/curve-abc`, `/dashboards/multifilial`, `/dashboards/financial`, `/finance/timeline`, `/finance/split`, `/finance/card-machines`, `/finance/split/simulator`, `/finance/card-transactions`, `/finance/split/export`, `/finance/payment-enablement`, `/finance/payments-dashboard`, `/payment-methods`, `/cost-centers`, `/expenses`, `/cards`, `/banks`, `/pix`

### Marketing (5)

`/marketing/sms`, `/marketing/campaigns`, `/marketing/vaccine-email`, `/marketing/sms-settings`, `/notifications/whatsapp`

### RH (7)

`/users`, `/access-control`, `/commission-calculations`, `/staff`, `/commission-rules`, `/time-off`, `/rh/professions`

### Relatórios (29)

`/reports/audit/appointments`, `/reports/cash-drawer`, `/reports/financial`, `/reports/dre`, `/reports/packages`, `/reports/accounts-receivable`, `/reports/received-accounts`, `/reports/accounts-payable`, `/reports/paid-accounts`, `/reports/cheques`, `/reports/advance-payments`, `/reports/sales`, `/reports/produced-items`, `/reports/production`, `/reports/appointments`, `/reports/professional-care`, `/reports/nf`, `/reports/registers/services`, `/reports/registers/owners`, `/reports/registers/patients`, `/reports/registers/suppliers`, `/reports/deleted-sales-counter-sales`, `/reports/inventory`, `/reports/inventory-movements`, `/reports/inventory-invoices`, `/reports/inventory-products`, `/reports`, `/reports/engine`, `/administrative-reports`

### Administração (1)

`/administration/settings`

## Artefatos e reprodutibilidade

Documentos executivos derivados desta auditoria:

- [Plano executivo de melhorias](./2026-09-02-plano-executivo-melhorias-usabilidade-playwright-cvg-his-v4.md);
- [Roadmap de melhorias](./2026-09-02-roadmap-melhorias-usabilidade-playwright-cvg-his-v4.md);
- [Backlog priorizado](./2026-09-02-backlog-priorizado-usabilidade-playwright-cvg-his-v4.md).

Arquivos adicionados:

- `e2e/spa/master-usability-audit.spec.ts`: matriz dinâmica das 143 rotas em desktop/mobile;
- `e2e/spa/master-roles-and-records.spec.ts`: 12 cenários de contas, papéis, profissionais e tabelas;
- `tmp/master-usability-audit.json`: evidência detalhada por rota, com contagens, problemas, amostras e respostas HTTP;
- este relatório em Markdown.

Comandos principais:

```bash
# Auditoria de todas as rotas em desktop e mobile
npx playwright test --config playwright-spa.config.ts \
  e2e/spa/master-usability-audit.spec.ts \
  --output tmp/playwright-master-results

# Cadastros e autenticação por papel
npx playwright test --config playwright-spa.config.ts \
  e2e/spa/master-roles-and-records.spec.ts

# Suíte funcional SPA, sem snapshots visuais
pnpm test:smoke

# Regressão visual
npx playwright test --config playwright-spa.config.ts \
  e2e/spa/visual/visual-regression.spec.ts
```

## Plano de correção e reteste

1. Disponibilizar Docker ou PostgreSQL de teste em `127.0.0.1:5433`, inicializar o schema e executar novamente toda a suíte em modo database.
2. Corrigir/injetar o adaptador atômico de prontuário e repetir fluxos assistenciais, internação, laboratório e o snapshot escuro do prontuário.
3. Tratar os endpoints de catálogos, hubs administrativos e execução de relatório; a UI deve apresentar estado vazio/indisponível claro e nunca ficar aguardando export indefinidamente.
4. Corrigir a atualização do saldo após recebimento no faturamento.
5. Remover o landmark `main` duplicado e adicionar rótulos programáticos aos sete campos observados.
6. Corrigir os oito overflows mobile, os dois desktop e ampliar os 90 alvos interativos observados.
7. Evitar cargas globais não autorizadas para perfis restritos ou tratar `403` sem ruído para o usuário.
8. Rodar novamente os 369 casos e exigir: zero falhas funcionais, zero rotas com `4xx/5xx` inesperado, zero overflow global, um único `main` e aprovação dos snapshots sem atualizar baseline de tela de erro.

## Conclusão

A aplicação tem boa amplitude de superfícies navegáveis, não apresentou crashes JavaScript na varredura e manteve 27 dos 28 contratos visuais. Cadastros básicos, contas por papel, tabelas e diversos fluxos operacionais funcionaram no navegador. Entretanto, persistência clínica, fontes de relatório, exports, saldo de faturamento, semântica do shell e responsividade financeira ainda impedem uma aprovação integral.
