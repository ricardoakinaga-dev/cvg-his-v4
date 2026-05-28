# Progresso RC - Governanca de Acesso RBAC/ABAC

Data: 2026-05-28

## Objetivo

Fechar a pendencia interna da F3-01: usar a matriz RBAC/ABAC como base de revisao requisito-a-requisito dos modulos criticos e cruzar permissoes com rotas protegidas, RLS e auditoria.

## Entrega

- Criado `scripts/generate-access-governance-evidence.mjs`.
- Criado o comando `pnpm governance:access`.
- O readiness passou a exigir `pnpm governance:access`.
- O pacote `pnpm rc:evidence` passou a executar `pnpm governance:access`.
- O comando gera `artifacts/access-governance/access-governance-evidence.json`.

## Cobertura validada

O gate verifica:

- catalogo de permissoes por modulo critico;
- roles centrais (`admin`, `reception`, `nurse`, `veterinarian`, `finance`, `inventory`, `auditor`);
- motor ABAC versionado;
- servico `getModulePermissionMatrix`;
- endpoint `GET /access-control/module-permission-matrix`;
- auditoria da leitura da matriz com risco medio;
- contrato OpenAPI;
- SPA de governanca consumindo a matriz oficial;
- testes de rota e SPA;
- rotas criticas protegidas por `requirePrincipal`;
- existencia do gate RLS para cruzamento multi-tenant.

## Evidencia executada

Comando:

```bash
pnpm governance:access
```

Resultado:

- Score: `100/100`;
- PASS: `53`;
- FAIL: `0`.

## Impacto no RC

F3-01 deixa de ser apenas matriz visual/auditavel e passa a ter gate objetivo para os modulos criticos. A governanca de acesso entra no pacote de evidencias do Release Candidate.
