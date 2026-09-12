# Triple-A — 11 Security

**Status:** PARTIAL / EXTERNAL ASSURANCE OPEN

Autorização API, contexto de tenant, RLS estático, redaction, secret scanning,
webhook/idempotência e matriz de testes de segurança estão implementados e
verificados em escopos locais. Os workflows executam Secret Scan, SAST e
Dependency Audit.

Fontes: [`docs/security/SECURITY_TEST_MATRIX.md`](../security/SECURITY_TEST_MATRIX.md),
`packages/security`, `packages/tenant-context`, `packages/secrets`,
`.semgrep.yml` e `.secretlintrc.json`.

O último CI terminal histórico confirmou os jobs de segurança, mas a execução
vinculada ao novo snapshot ainda está pendente. A prova de roles/RLS no target,
attestation, revisão humana independente, providers e governança de branch
continua ausente; nenhum claim `TRIPLE-A VERIFIED` é autorizado.

## Atualização de logging — 2026-09-12T13:02:52Z

No SHA `6010b98320e37139b530cfb2a22b041ca18b6401`, o logger compartilhado passou
a redigir recursivamente chaves sensíveis e seus valores, mensagens com tokens,
e-mails e CPF, erros estruturados, objetos aninhados, valores profundos e
referências circulares. Os testes do pacote `@cvg-his-v2/shared-logging`
passaram `16/16`; essa prova é local e não substitui CI, target ou attestation.

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

## Atualização do candidato funcional — 2026-09-12T02:53:43Z

A implementação foi avaliada no SHA funcional `1e0077a3d8f7a10ea5e53d7d9f8f0fdee2dca689`. O [CI #137](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34667412200) terminou verde com 16/16 jobs, mas o gate local estrito permaneceu `BLOCKED`, score `54`, critical `54`, `16` P0 e claim `NOT PROVEN`. O pacote `artifacts/triple-a` continua fail-closed; provas de target, autoridade humana, UAT e produção só serão promovidas com envelopes vinculados e verificáveis.
