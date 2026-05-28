# Progresso Fase 2 - F2-01 Pacotes: API e contrato HTTP

Data: 2026-05-28

## Objetivo

Conectar o novo dominio real de pacotes a superficie HTTP da API, com contrato OpenAPI, auditoria operacional e testes de rota.

## Entregue neste incremento

- A API agora depende de `@cvg-his-v2/module-packages`.
- O runtime da API instancia `PackagesService`.
- As rotas comerciais passaram a expor endpoints dedicados de pacotes:
  - `GET /packages`
  - `POST /packages`
  - `GET /packages/{packageId}`
  - `POST /packages/{packageId}/items`
  - `POST /packages/{packageId}/activate`
  - `POST /packages/{packageId}/renew`
  - `POST /packages/{packageId}/cancel`
  - `POST /package-items/{packageItemId}/consume`
- Alias em portugues suportados no handler:
  - `/pacotes`
  - `/pacotes/{packageId}`
  - `/pacote-itens/{packageItemId}/consume`
- As operacoes relevantes registram auditoria:
  - `create_package`
  - `add_package_item`
  - `activate_package`
  - `consume_package_item`
  - `renew_package`
  - `cancel_package`
- O OpenAPI documenta os novos caminhos e schemas:
  - `CustomerPackage`
  - `CustomerPackageDetail`
  - `PackageItem`
  - `PackageConsumption`
  - `PackageBalanceItem`
  - `CreatePackageRequest`
  - `AddPackageItemRequest`
  - `ConsumePackageItemRequest`
  - `RenewPackageRequest`
- O teste de rotas comerciais cobre ciclo de pacote com criacao, item, ativacao, consumo, renovacao, listagem e auditoria.

## Arquivos alterados

- `apps/api/package.json`
- `apps/api/src/runtime.ts`
- `apps/api/src/server.ts`
- `apps/api/src/routes/commercial-routes.ts`
- `apps/api/src/routes/commercial-routes.test.ts`
- `apps/api/src/openapi.yaml`
- `pnpm-lock.yaml`

## Validacao executada

- `pnpm validate:openapi`
  - Resultado: aprovado.
  - OpenAPI: 254 paths, 36 tags, 261 schemas.
- `pnpm --filter @cvg-his-v2/module-packages build`
  - Resultado: aprovado.
- `pnpm --filter @cvg-his-v2/api build`
  - Resultado: aprovado.
- `node --test dist/routes/commercial-routes.test.js`
  - Resultado: 5 testes aprovados.
- `pnpm --filter @cvg-his-v2/module-packages test`
  - Resultado: 5 testes aprovados.
- `pnpm --filter @cvg-his-v2/api typecheck`
  - Resultado: aprovado.

## Impacto no roadmap Premium Enterprise

Este incremento fortalece o F2-01 porque pacotes deixam de existir apenas como servico em memoria isolado. Agora ha contrato HTTP documentado, rota testada e trilha de auditoria para operacoes centrais.

## Pendencias recomendadas para completar F2-01

- Persistir pacotes em PostgreSQL com migrations e RLS.
- Migrar a SPA `PackagesPage` para consumir `/packages` em vez de derivar pacotes de `quotes`.
- Integrar consumo de pacote com agenda, atendimento, comanda e faturamento.
- Incluir permissao especifica de pacote quando RBAC/ABAC for revisado na Fase 3.
