# Onda estrutural — Financeiro > Cadastros remanescente

Data: 2026-04-22
Status: implementado
Escopo: materialização inicial de Cartões e Custos e Despesas no domínio Financeiro

## 1. Objetivo

Fechar a lacuna remanescente mais evidente do bloco `Financeiro > Cadastros`, complementando a primeira leva já entregue com:
- Formas de Pagamento
- Bancos
- Centros de Custo

Nesta onda, a meta foi completar o bloco com:
- Cartões
- Custos e Despesas

## 2. Referência Vetus utilizada

Base documental consultada:
- `docs/vetus/guides/21-anexo-financeiro.md`
- `docs/vetus/modulos/fin-05-contas-adm-cartao.png`
- `docs/vetus/modulos/fin-18-custos-despesas.png`

Leituras principais extraídas do benchmark:
- o financeiro do Vetus mistura camada SPA moderna com grande profundidade legacy;
- o legado evidencia `cartões`, `contas administrativas de cartão`, `custos e despesas` e outros cadastros auxiliares como partes reais do domínio ERP;
- telas legacy usam filtros simples, CTA claro e listagem/tabela objetiva.

## 3. Entregas implementadas

## 3.1 Navegação

Arquivo atualizado:
- `apps/spa/src/navigation.ts`

Seção `Financeiro > Cadastros` agora expõe:
- Formas de Pagamento
- Bancos
- Centros de Custo
- Cartões
- Custos e Despesas

## 3.2 Rotas

Arquivo atualizado:
- `apps/spa/src/router/routes.ts`

Rotas adicionadas:
- `/cards`
- `/expenses`

Metadados padronizados:
- `meta.title`
- `meta.breadcrumb`
- `meta.breadcrumbParent = 'Cadastros'`
- `meta.icon`

## 3.3 Novas páginas

Arquivos criados:
- `apps/spa/src/pages/finance/CardsPage.vue`
- `apps/spa/src/pages/finance/ExpensesPage.vue`

### Cartões
A página `CardsPage.vue` foi modelada como superfície inicial para:
- bandeiras;
- administradoras;
- cartões ativos/inativos;
- futura ligação com contas a receber e taxas.

Elementos entregues:
- `AppPageHeader` com breadcrumb explícito `Financeiro > Cadastros > Cartões`;
- `DsAlert` contextualizando a inspiração nas rotinas de cartão do legado Vetus;
- `DsStatCard` para leitura rápida de cartões ativos e contas a receber;
- busca simples por cartão, bandeira ou administradora;
- grid de cards com seed local.

### Custos e Despesas
A página `ExpensesPage.vue` foi modelada como superfície inicial para:
- cadastro administrativo de despesas;
- busca simples por id, nome e descrição;
- leitura tabular inspirada na rotina legacy observada.

Elementos entregues:
- `AppPageHeader` com breadcrumb explícito `Financeiro > Cadastros > Custos e Despesas`;
- `DsAlert` explicando o escopo da primeira materialização;
- `DsStatCard` para leitura de volume e tipo de gasto;
- filtros simples `Id`, `Nome`, `Descrição`;
- tabela leve com colunas `Id`, `Nome`, `Descrição`, `Abrir`.

## 3.4 Testes

Arquivos atualizados/criados:
- `apps/spa/src/navigation.test.ts`
- `apps/spa/src/router/routes.test.ts`
- `apps/spa/src/pages/finance/__tests__/FinanceCatalogPages.test.ts`

Cobertura adicionada:
- presença de `/cards` e `/expenses` na navegação oficial;
- convergência de `breadcrumbParent` em rotas financeiras;
- renderização inicial das superfícies de catálogo do bloco financeiro.

## 4. Validação executada

Comando executado:

```bash
cd apps/spa
npm test -- src/navigation.test.ts src/router/routes.test.ts src/pages/finance/__tests__/FinanceCatalogPages.test.ts
```

Resultado:
- `Test Files 3 passed (3)`
- `Tests 19 passed (19)`

## 5. Leitura executiva do impacto

Antes desta onda:
- `Financeiro > Cadastros` já existia semanticamente;
- mas ainda ficava incompleto como bloco ERP por faltar a camada de cartões e custos/despesas.

Depois desta onda:
- a seção passa a comunicar melhor a espinha dorsal de cadastro financeiro;
- o domínio fica mais coerente com o benchmark Vetus;
- o menu deixa de prometer menos do que deveria nesse subdomínio.

## 6. O que ainda não foi atacado nesta entrega

Fora do escopo propositalmente:
- CRUD completo com backend;
- liquidação real de cartões;
- contas a pagar/receber completas;
- fluxo de caixa, DRE e analytics financeiros profundos;
- integrações bancárias e conciliação.

A opção correta foi materializar primeiro a superfície estrutural do subdomínio, mantendo a expansão honesta e incremental.

## 7. Próximo passo recomendado

Com `Financeiro > Cadastros` agora bem mais fechado, as melhores próximas frentes passam a ser:

1. `Relatórios > Produção`
2. superfícies enterprise ainda rasas
- access-control
- api-client
- api-keys
- audit
- lgpd
- master-search

## 8. Conclusão

A onda `Financeiro > Cadastros remanescente` foi concluída com sucesso.

O bloco financeiro agora comunica com mais clareza sua profundidade ERP e fica preparado para futuras ondas com contas, conciliações e analytics, sem depender de novas correções taxonômicas antes disso.
