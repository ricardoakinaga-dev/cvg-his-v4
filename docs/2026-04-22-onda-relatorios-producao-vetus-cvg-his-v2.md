# Onda estrutural — Relatórios > Produção

Data: 2026-04-22
Status: implementado
Escopo: materialização inicial da trilha `Relatórios > Produção` no SPA

## 1. Objetivo

Fechar a lacuna restante da decomposição de `Relatórios por Domínio`, adicionando a seção `Produção` de forma honesta, alinhada ao benchmark Vetus e sem inventar uma cobertura analítica que o shell observado não entrega.

## 2. Referência Vetus utilizada

Base consultada:
- `docs/vetus/guides/15-modulo-rh-marketing-relatorios.md`
- `docs/vetus/guides/16-catalogo-de-evidencias.md`
- `docs/vetus/screenshots/relatorios-producao-01.png`

Leitura principal do benchmark:
- `Relatórios de Produção` aparece como rota prevista no acervo;
- nas capturas do shell observadas, a tela é majoritariamente indisponível;
- portanto, a melhor implementação para o SPA atual é uma superfície inicial explícita e honesta, não uma simulação de dashboard completo.

## 3. Entregas implementadas

## 3.1 Navegação

Arquivo atualizado:
- `apps/spa/src/navigation.ts`

Nova seção em `Relatórios`:
- `Produção`
  - `Relatórios de Produção` → `/reports/production`

## 3.2 Rotas

Arquivo atualizado:
- `apps/spa/src/router/routes.ts`

Nova rota criada:
- `/reports/production`

Metadados aplicados:
- `meta.title = 'Relatórios de Produção'`
- `meta.breadcrumb = 'Relatórios de Produção'`
- `meta.breadcrumbParent = 'Produção'`
- `meta.icon = '🏭'`

## 3.3 Página nova

Arquivo criado:
- `apps/spa/src/pages/reports/ProductionReportsPage.vue`

Elementos entregues:
- `AppPageHeader` com breadcrumb explícito `Relatórios > Produção > Relatórios de Produção`;
- `DsAlert` explicando que a rota existe no benchmark, mas aparece indisponível nas capturas do shell Vetus;
- `DsStatCard` para primeiras leituras de produção;
- bloco com visões iniciais:
  - Produção Assistencial
  - Produção por Profissional
  - Produção Executiva

A decisão foi deliberada:
- criar uma superfície útil e coerente com a taxonomia;
- sem fingir que já existe o dashboard analítico completo do domínio.

## 3.4 Hub de relatórios

Arquivo atualizado:
- `apps/spa/src/pages/reports/ReportsDomainHubPage.vue`

Melhoria entregue:
- a landing `Relatórios por Domínio` agora expõe também o card:
  - `Relatórios de Produção`

Com isso, o hub deixa de ter uma decomposição incompleta.

## 3.5 Testes

Arquivos atualizados/criados:
- `apps/spa/src/navigation.test.ts`
- `apps/spa/src/router/routes.test.ts`
- `apps/spa/src/pages/reports/__tests__/ReportsDomainPages.test.ts`

Cobertura adicionada:
- presença de `/reports/production` no mapa oficial de navegação;
- convergência do parent `Produção` na rota;
- renderização com breadcrumbs explícitos nas páginas do bloco de relatórios.

## 4. Validação executada

Comando executado:

```bash
cd apps/spa
npm test -- src/navigation.test.ts src/router/routes.test.ts src/pages/reports/__tests__/ReportsDomainPages.test.ts
```

Resultado:
- `Test Files 3 passed (3)`
- `Tests 21 passed (21)`

## 5. Leitura executiva do impacto

Antes desta onda:
- `Relatórios por Domínio` já existia;
- mas a decomposição ainda estava incompleta por faltar `Produção`.

Depois desta onda:
- o bloco de relatórios passa a cobrir:
  - Financeiro
  - Agenda
  - Atendimento
  - Cadastros
  - Estoque
  - Produção
- a taxonomia principal fica mais fechada;
- o próximo trabalho deixa de ser expansão do núcleo ERP e passa a tender para superfícies enterprise ainda rasas.

## 6. O que esta entrega não tenta fingir

Fora do escopo propositalmente:
- BI completo de produção;
- filtros reais por período, profissional, unidade ou especialidade;
- conexão com indicadores consolidados do hub executivo;
- dashboards e séries históricas reais.

Isso foi correto porque o benchmark não oferece evidência forte de tela funcional moderna nesse ponto.

## 7. Próximo passo recomendado

Com `Relatórios > Produção` materializado, a frente mais forte agora passa a ser:
- superfícies enterprise ainda rasas:
  - access-control
  - api-client
  - api-keys
  - audit
  - lgpd
  - master-search

## 8. Conclusão

A onda `Relatórios > Produção` foi concluída com sucesso e validada em teste.

Com isso, a decomposição principal de relatórios por domínio fica estruturalmente mais completa e o projeto pode avançar para o acabamento enterprise com menos dívida taxonômica no núcleo do ERP.