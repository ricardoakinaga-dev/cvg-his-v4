# Próxima onda de implementação estrutural — pós Fase A

Data: 2026-04-22
Status: proposta de execução após checkpoint da Fase A

## 1. Objetivo

Sair da camada de alinhamento estrutural superficial e começar a materializar rotinas ainda vazias ou sub-representadas no contrato final, priorizando profundidade real de domínio.

## 2. Princípio de priorização

A partir deste ponto, a prioridade não deve ser mais “onde falta breadcrumb”, e sim:
- onde a árvore oficial já existe, mas a superfície ainda não existe ou está rasa;
- onde há maior impacto semântico no produto;
- onde o menu já promete capacidade que ainda não está explicitada no SPA.

## 3. Onda 1 — Financeiro > Cadastros

Motivo:
- `navigation.ts` já expõe `Financeiro > Cadastros`, mas a seção ainda está vazia;
- isso enfraquece a credibilidade do domínio financeiro como bloco ERP.

Prioridades sugeridas:
1. Formas de Pagamento
2. Bancos
3. Centros de Custo
4. Cartões
5. Custos e Despesas

Entrega mínima recomendada:
- landing page ou list pages simples por rotina-chave;
- placeholders específicos, se necessário, mas não vazios genéricos;
- breadcrumbs consistentes desde o início.

Arquivos prováveis:
- novas páginas em `apps/spa/src/pages/finance/` ou `apps/spa/src/pages/financial-catalogs/`
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`
- testes de rota e páginas

## 4. Onda 2 — RH > Comissões / Cadastros

Motivo:
- RH já tem `Usuários`, mas ainda não tem profundidade suficiente em `Comissões` e `Cadastros`;
- o benchmark Vetus deixa claro que esse domínio existe e é relevante.

Prioridades sugeridas:
1. Regras de Comissão
2. Cálculo de Comissões
3. Folgas
4. Grupos de Acesso ou cadastros auxiliares de RH

Entrega mínima recomendada:
- pelo menos uma landing page de Comissões;
- uma list page simples para regras;
- placeholders específicos e honestos para o que ainda não estiver pronto.

Arquivos prováveis:
- novas páginas em `apps/spa/src/pages/rh/` ou reaproveitamento controlado de `users/staff`
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`

## 5. Onda 3 — Estoque > Cadastrados adicionais

Motivo:
- Estoque está semanticamente forte em Controles e Produtos, mas ainda não fecha o bloco de cadastros do benchmark.

Prioridades sugeridas:
1. Fornecedores
2. Fabricantes
3. Grupos de Produto
4. Estoques

Entrega mínima recomendada:
- list pages básicas;
- integração progressiva com Produtos e Inventory;
- breadcrumbs explícitos desde o primeiro commit.

Arquivos prováveis:
- novas páginas em `apps/spa/src/pages/inventory/` ou `apps/spa/src/pages/catalogs/`
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`

## 6. Onda 4 — Relatórios por domínio

Motivo:
- `Hubs Administrativos` ainda é uma landing page genérica;
- a árvore oficial já pede relatórios por macrodomínio.

Prioridades sugeridas:
1. Relatórios Financeiros
2. Relatórios de Agenda
3. Relatórios de Atendimento
4. Relatórios de Cadastros
5. Relatórios de Estoque
6. Relatórios de Produção

Entrega mínima recomendada:
- quebrar o hub em entradas por domínio;
- manter a página atual apenas como agregador executivo;
- criar rotas explícitas por categoria.

## 7. Onda 5 — Segunda camada de breadcrumbs e acabamento de domínio

Depois das ondas acima, revisar páginas ainda pendentes de breadcrumb explícito por blocos:
- encounters
- inpatient
- laboratory restantes
- clinical
- triage
- users detail/form
- notifications
- webhooks
- enterprise

Essa onda deve vir depois porque seu valor aumenta quando a estrutura dos domínios já estiver mais madura.

## 8. Ordem recomendada de execução

### Sequência curta mais segura
1. Financeiro > Cadastros
2. RH > Comissões / Cadastros
3. Estoque > Cadastrados adicionais
4. Relatórios por domínio
5. Segunda camada de breadcrumbs e acabamento

### Sequência alternativa se quiser fechar ERP antes de analytics
1. Financeiro > Cadastros
2. Estoque > Cadastrados adicionais
3. RH > Comissões / Cadastros
4. Relatórios por domínio

## 9. Recomendações de implementação

- cada nova rotina já deve nascer com:
  - route meta coerente,
  - breadcrumb explícito,
  - `AppPageHeader` consistente,
  - estado vazio específico;
- evitar reintroduzir hubs genéricos;
- preferir list pages simples e honestas a páginas grandiosas mas vagas;
- toda rotina nova deve entrar junto com teste estrutural básico.

## 10. Próximo passo recomendado imediatamente

Se a equipe quiser seguir com maior retorno estrutural, o próximo passo ideal é:

### abrir Financeiro > Cadastros
Começando por:
1. Formas de Pagamento
2. Bancos
3. Centros de Custo

Porque:
- aproveita o trabalho já feito em Financeiro;
- fecha a maior seção vazia que hoje aparece no contrato;
- aumenta a sensação de domínio ERP maduro rapidamente.

## 11. Commit lógico sugerido

```bash
git add docs/2026-04-22-proxima-onda-implementacao-estrutural-vetus-cvg-his-v2.md
git commit -m "docs: define next structural implementation wave after phase a"
```