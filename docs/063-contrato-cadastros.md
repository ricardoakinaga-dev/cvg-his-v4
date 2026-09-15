# PROD-063 — Contrato de tutores, pacientes e cadastros

Status: `IMPLEMENTED_LOCALLY / REVIEW_REQUIRED / BLOCKED`. O contrato
normativo está em `docs/engineering/registry-contract-prod-063.json` e é
validado por `scripts/validate-prod-063-registry-contract.mjs`.

## O que foi endurecido localmente

- corpos de owner, patient, vínculo e merge agora passam por uma fronteira
  explícita, com tipos, enums, objetos aninhados, números finitos e patch não
  vazio validados antes da mutação;
- duplicidade de owner é comparada somente dentro da mesma conta e também no
  update;
- duplicidade de patient é comparada somente dentro da mesma conta e também no
  update;
- listas de owners/patients respeitam `page`, `pageSize`/`limit` e, quando
  paginadas, retornam `total` calculado antes do slice.

Essas mudanças seguem o DTO atualmente usado pelo runtime/OpenAPI
(`documentId`, `contacts`, `primaryOwnerId`). Existe uma superfície concorrente
em `packages/contracts` (`document`, `phoneMain`, `ownerId`); ela permanece
explicitamente aberta para decisão de API/Product e não foi silenciosamente
reconciliada.

## Invariantes que continuam obrigatórios

O serviço mantém tenant, owner primário ativo, relacionamento primário único,
links autorizados, soft-delete, merge auditável e filtros de leitura. Testes
locais cobrem bons e maus casos sintéticos e a rota continua filtrando o
`accountId` do principal.

## Limites do aceite

O contrato não prova concorrência de writers, unicidade no PostgreSQL, RLS,
atomicidade entre patient/link/merge, ligação de catálogos auxiliares,
importação/reconciliação Vetus, UAT, paridade comportamental ou aceite do dono
de domínio. `PROD-024`, `PROD-027` e `PROD-055` continuam dependências integrais;
Product, QA, API e o dono de cadastros ainda precisam decidir o wire contract,
chaves de duplicidade, relações `authorized/spouse`, arquivamento e importação.

Portanto, PROD-063 não é `DONE`, não promove dependências e não altera o
veredito `BLOCKED / NOT PROVEN` do release ou do Triplo AAA.
