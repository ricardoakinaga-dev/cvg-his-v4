# Triple-A — 11 Security

**Status:** PARTIAL / EXTERNAL ASSURANCE OPEN

Autorização API, contexto de tenant, RLS estático, redaction, secret scanning,
webhook/idempotência e matriz de testes de segurança estão implementados e
verificados em escopos locais. Os workflows executam Secret Scan, SAST e
Dependency Audit.

Fontes: [`docs/security/SECURITY_TEST_MATRIX.md`](../security/SECURITY_TEST_MATRIX.md),
`packages/security`, `packages/tenant-context`, `packages/secrets`,
`.semgrep.yml` e `.secretlintrc.json`.

Os jobs públicos do CI `#135` passaram. A prova de roles/RLS no target,
attestation, revisão humana independente, providers e governança de branch
continua ausente; nenhum claim `TRIPLE-A VERIFIED` é autorizado.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| Problema           | Impedir auth bypass, cross-tenant, vazamento de segredo e adulteração de audit.                           |
| Estado anterior    | Guards e testes locais existiam, mas target/registry/branch governance não eram observáveis.              |
| Decisão            | Defesa em profundidade e gate fail-closed para evidência externa ausente.                                 |
| Implementação      | API authorization, tenant context, RLS, redaction, SAST, secrets e dependency audit.                      |
| Arquivos alterados | `packages/security`, `packages/tenant-context`, `packages/secrets`, `.semgrep.yml`, `.secretlintrc.json`. |
| Testes             | Secret scan, SAST, dependency audit, RLS estático e testes de segurança locais.                           |
| Evidências         | Jobs correspondentes verdes no CI #135.                                                                   |
| Riscos residuais   | RLS runtime target, attestation, assinatura, providers e branch protection.                               |
