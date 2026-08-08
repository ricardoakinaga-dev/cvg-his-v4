# Progresso Fase 2 - F2-01 Pacotes: SPA consumindo dominio real

Data: 2026-05-28

## Objetivo

Migrar a tela `Pacotes` da SPA para consumir a API real `/packages`, reduzindo a dependencia de `quotes` que havia sido apontada como lacuna no relatorio Vetus.

## Entregue neste incremento

- Criado o servico SPA `packagesService`.
- A tela `PackagesPage` passou a consumir `packagesService.list()` em vez de montar pacotes a partir de `quoteService.list()` e `quoteService.get()`.
- A tela agora trabalha com os status reais do dominio:
  - `draft`;
  - `active`;
  - `completed`;
  - `cancelled`;
  - `expired`.
- A experiencia operacional passou a expor saldo por pacote/item:
  - sessoes compradas;
  - sessoes consumidas;
  - sessoes disponiveis;
  - validade por item.
- Os testes da tela foram migrados para mockar `@/services/packages`, cobrindo a nova fonte real de dados.

## Arquivos alterados

- `apps/spa/src/services/packages.ts`
- `apps/spa/src/pages/sales/PackagesPage.vue`
- `apps/spa/src/pages/sales/__tests__/PackagesPage.test.ts`

## Validacao executada

- `pnpm exec vitest run src/pages/sales/__tests__/PackagesPage.test.ts --pool=forks`
  - Resultado: 1 arquivo de teste, 3 testes aprovados.
- `pnpm --filter @cvg-his-v2/spa typecheck`
  - Resultado: aprovado.
- `pnpm --filter @cvg-his-v2/spa build`
  - Resultado: aprovado.

## Impacto no roadmap Premium Enterprise

Este incremento completa a primeira conexao ponta a ponta do F2-01:

- dominio real de pacotes no backend;
- rotas HTTP e contrato OpenAPI;
- tela principal da SPA consumindo o dominio real.

Isso remove a principal contradicao registrada no relatorio Vetus: a tela de pacotes nao depende mais semanticamente de orcamentos para representar contratos de consumo futuro.

## Pendencias recomendadas para completar F2-01

- Persistir pacotes em PostgreSQL com migrations/RLS.
- Adicionar criacao/ativacao/consumo/renovacao diretamente pela SPA.
- Integrar consumo com agenda, atendimento, comanda e faturamento.
- Criar relatorio financeiro especifico de pacotes usando a nova fonte.
