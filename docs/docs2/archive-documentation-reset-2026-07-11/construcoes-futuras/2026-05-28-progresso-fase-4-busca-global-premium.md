# Progresso Fase 4 - Busca global Premium

Data: 2026-05-28

## Objetivo

Avancar o item `F4-04 - Otimizar busca global`, ampliando a busca mestre para localizar tutor, paciente, produto, comanda e documento com atalhos operacionais.

## Entregue

- A pagina `Busca Mestre` passou a consultar tambem:
  - produtos via `productsService.list()`;
  - comandas via `counterSalesService.list()`.
- O placeholder e os contadores foram atualizados para refletir a busca por tutor, paciente, documento, produto, comanda e relacao.
- A busca agora exibe cinco grupos de resultado:
  - Tutores;
  - Pacientes;
  - Vinculos;
  - Produtos;
  - Comandas.
- Produtos exibem nome, codigo, preco, status e atalho para o detalhe do produto.
- Comandas exibem numero, tutor, status, saldo e atalho direto para operar a comanda.
- O total agregado de resultados agora considera todos os grupos.
- A acao `Limpar` remove tambem produtos e comandas.

## Evidencias tecnicas

- `apps/spa/src/pages/master-search/MasterSearchPage.vue`
- `apps/spa/src/pages/master-search/__tests__/MasterSearchPage.test.ts`
- `apps/spa/src/services/products.ts`
- `apps/spa/src/services/counterSales.ts`

## Validacao executada

- `pnpm --dir apps/spa exec vitest run src/pages/master-search/__tests__/MasterSearchPage.test.ts --pool=forks` - 4/4 testes passando.
- `pnpm --filter @cvg-his-v2/spa typecheck` - passou.
- `git diff --check -- apps/spa/src/pages/master-search/MasterSearchPage.vue apps/spa/src/pages/master-search/__tests__/MasterSearchPage.test.ts` - passou.

## Impacto no Premium Enterprise

A busca global deixa de ser apenas cadastral e passa a operar como entrada transversal para recepcao, estoque e caixa. Isso reduz friccao no atendimento porque a equipe consegue sair de um termo unico para o cockpit do tutor, ficha do paciente, produto ou comanda operacional.

O item `F4-04` fica iniciado com uma entrega concreta de produtividade: busca unificada com destinos diretamente acionaveis.

## Proximos passos recomendados

- Migrar a pagina para o contrato backend `/master-search` quando ele cobrir todos os dominios premium.
- Adicionar destaque de match por documento, telefone, microchip e numero de comanda.
- Incluir ordenacao por relevancia e historico recente de buscas.
- Expor atalho global de teclado com foco direto na busca mestre.
