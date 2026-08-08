# Progresso Fase 2 - F2-01 Pacotes: nucleo de dominio real

Data: 2026-05-28

## Objetivo

Iniciar a transformacao de `Pacotes` de uma tela derivada de orcamentos para um dominio proprio, conforme o roadmap Premium Enterprise:

- regras;
- vigencia;
- saldo;
- consumo;
- renovacao;
- auditoria minima de uso.

## Entregue neste incremento

- Criado o pacote workspace `@cvg-his-v2/module-packages`.
- Criado `PackagesService` com estado de dominio independente de orcamentos.
- O novo dominio suporta:
  - criacao de pacote por tutor e paciente;
  - numeracao propria `PKG-000001`;
  - itens de pacote por produto ou servico;
  - janela global de vigencia;
  - janela individual por item;
  - ativacao somente quando ha itens;
  - consumo de saldo por quantidade;
  - bloqueio de consumo fora da vigencia;
  - bloqueio de consumo acima do saldo disponivel;
  - conclusao automatica quando todo saldo e consumido;
  - cancelamento com regra de conflito para pacote concluido;
  - renovacao preservando composicao e criando linhagem via `renewedFromPackageId`;
  - isolamento por `accountId`.

## Arquivos criados

- `packages/modules/packages/package.json`
- `packages/modules/packages/tsconfig.json`
- `packages/modules/packages/src/index.ts`
- `packages/modules/packages/src/packages.test.ts`

## Validacao executada

- `pnpm install`
  - Resultado: workspace atualizado para incluir `@cvg-his-v2/module-packages`.
- `pnpm --filter @cvg-his-v2/module-packages build`
  - Resultado: aprovado.
- `pnpm --filter @cvg-his-v2/module-packages typecheck`
  - Resultado: aprovado.
- `pnpm --filter @cvg-his-v2/module-packages test`
  - Resultado: 5 testes aprovados.

## Impacto no roadmap Premium Enterprise

Este incremento cria a base tecnica do F2-01. Antes, a tela `Pacotes` era derivada principalmente de `quotes`, confirmando a lacuna apontada no relatorio Vetus. Agora existe um nucleo de dominio proprio que pode ser conectado a API, persistencia, auditoria e SPA sem depender semanticamente de orcamentos.

## Pendencias recomendadas para completar F2-01

- Criar tabelas/migrations para `customer_packages`, `package_items` e `package_consumptions`.
- Implementar repositorio PostgreSQL com RLS/multi-tenant.
- Expor rotas HTTP dedicadas:
  - `GET /packages`;
  - `POST /packages`;
  - `POST /packages/{packageId}/items`;
  - `POST /packages/{packageId}/activate`;
  - `POST /package-items/{packageItemId}/consume`;
  - `POST /packages/{packageId}/renew`;
  - `POST /packages/{packageId}/cancel`.
- Migrar a SPA `PackagesPage` para consumir o dominio real em vez de `quotes`.
- Integrar consumo com agenda, atendimento/comanda e financeiro.
- Registrar eventos de auditoria para ativacao, consumo, renovacao e cancelamento.
