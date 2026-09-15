# PROD-062 — inventário de verificadores por família

**Estado:** IMPLEMENTED LOCALLY / REVIEW_REQUIRED / BLOCKED  
**Candidato observado:** `324099e5a54537ca1349f3310639c3a12afbae36` + worktree local  
**Escopo:** preparação contratual local; nenhuma evidência externa foi criada, promovida ou aceita.

PROD-062 fecha a lacuna em que critérios de testes, RLS, recuperação, UAT,
deploy, proteção de branch e autoridade eram encaminhados ao envelope externo
genérico. Cada critério agora tem um contrato explícito, uma família, dimensões
gate-owned e uma rota canônica em
`scripts/run-triple-a-release-gate.mjs`. O gerador de pacote usa a mesma rota;
ele não mantém uma segunda regra de aprovação.

Como correção adjacente de soundness, o membro de security evidence também
exige frescor e digest do SBOM e permanece `PARTIAL` sem proveniência
independente; um relatório mínimo ou stale falha fechado. O pacote inclui
`observability.json` e o encaminha pela política operacional canônica.

## Inventário contratual

| Critério | Família | Produtor/issuer exigido | Dimensões e medições obrigatórias |
|---|---|---|---|
| `CRITICAL-TESTS` | `tests` | `github-actions-workflow` / `github-actions-workflow` | `execution.test_pass_ratio` (ratio), `scope.required_case_ratio` (ratio), `failures.failed_case_count` (count) |
| `E2E` | `tests` | `github-actions-workflow` / `github-actions-workflow` | `journeys.journey_pass_ratio` (ratio), `accessibility.required_accessibility_case_ratio` (ratio), `visual.visual_regression_failure_count` (count) |
| `WORKFLOW-POSTGRES` | `tests` | `github-actions-workflow` / `github-actions-workflow` | `database.integration_pass_ratio` (ratio), `transactions.rollback_failure_count` (count), `persistence.restart_failure_count` (count) |
| `WORKER-CRASH` | `tests` | `github-actions-workflow` / `github-actions-workflow` | `recovery.takeover_success_ratio` (ratio), `fencing.fencing_violation_count` (count), `delivery.unresolved_dlq_count` (count) |
| `CLINICAL-E2E` | `tests` | `github-actions-workflow` / `github-actions-workflow` | `safety.invariant_pass_ratio` (ratio), `negative.critical_violation_count` (count), `workflow.clinical_task_success_ratio` (ratio) |
| `AUDIT-INTEGRITY` | `tests` | `github-actions-workflow` / `github-actions-workflow` | `chain.append_only_pass_ratio` (ratio), `tamper.tamper_detection_failure_count` (count), `reconciliation.audit_gap_count` (count) |
| `RLS-RUNTIME` | `rls` | `github-actions-workflow` / `github-actions-workflow` | `isolation.cross_tenant_leak_count` (count), `authorization.unauthorized_access_count` (count), `force_rls.force_rls_failure_count` (count) |
| `BACKUP-DRILL` | `backup` | `github-actions-workflow` / `github-actions-workflow` | `restore.restore_success_ratio` (ratio), `integrity.integrity_failure_count` (count), `objectives.rto_seconds` (seconds) |
| `HOSPITAL-UAT` | `uat` | `human-uat` / `human-uat` | `tasks.task_success_ratio` (ratio), `safety.critical_blocker_count` (count), `profiles.accepted_profile_ratio` (ratio) |
| `DEPLOY-TARGET` | `deploy` | `github-actions-workflow` / `github-actions-workflow` | `readiness.readiness_success_ratio` (ratio), `identity.digest_mismatch_count` (count), `recovery.rollback_success_ratio` (ratio) |
| `HELM-TARGET` | `deploy` | `github-actions-workflow` / `github-actions-workflow` | `render.template_success_ratio` (ratio), `identity.digest_mismatch_count` (count), `target.target_binding_failure_count` (count) |
| `BRANCH-PROTECTION` | `protection` | `github-api` / `github-api` | `enforcement.required_checks_ratio` (ratio), `bypass.unauthorized_bypass_count` (count), `binding.head_sha_mismatch_count` (count) |
| `RELEASE-AUTHORITY` | `authority` | `human-authority` / `human-authority` | `decision.approval_ratio` (ratio), `scope.candidate_binding_ratio` (ratio), `exceptions.unresolved_exception_count` (count) |

Os nomes, unidades, conjunto exato de dimensões e versão do contrato são
definidos pelo código, não pelo produtor do envelope. A lista pública de
requisitos é `FAMILY_EVIDENCE_REQUIREMENTS`; a política inicial de cada
critério permanece `PENDING_AUTHORITY`.

## Invariantes de aceitação

O validador `validateFamilyEvidenceEnvelope` exige, em ordem fail-closed:

- arquivo local seguro, leitura única e digest SHA-256 dos bytes consumidos;
- `evidence_type=cvg-his-family-evidence`, schema/contrato `1`, `criterion_id`
  e `family` exatamente correspondentes;
- `status=PASS`, `results.outcome=PASS`, dimensões e medições completas, sem
  IDs duplicados, valores não finitos, unidade divergente ou campos de
  limite/threshold dentro da medição;
- produtor e issuer exatos para a família, método
  `github-artifact-attestation`, id `gh-attestation-verify`, workflow na raiz
  confiável `.github/workflows/release-artifacts.yml`, e `subject_sha256`
  verificado igual ao digest dos bytes consumidos;
- `observed_at` e `verified_at` frescos e coerentes, além de `target.environment`
  e `target.reference` obrigatórios;
- alvos, limites, thresholds e política somente da política pertencente ao
  gate. Declarações equivalentes inseridas pelo produtor são rejeitadas;
- política `APPROVED` com decisão, referência, timestamp fresco, alvo aprovado
  e ao menos um limite numérico finito por medição. `PENDING_AUTHORITY` resulta
  em `PARTIAL`, nunca em `PASS`;
- `RELEASE-AUTHORITY` com registro humano `APPROVED`, aprovador, papel,
  referência e `approved_at` fresco e posterior à observação.

A flag legada `TRIPLE_A_VERIFY_TARGET_EVIDENCE=1` não altera essa decisão.
Sem o verificador confiável, o resultado é `PARTIAL`; divergência de hash,
issuer, alvo, status, contrato, medição, frescor ou autoridade resulta em
`FAIL`.

## Integração do pacote

`scripts/generate-triple-a-evidence-package.mjs` preserva
`declared_status` separado de `verified_status` e encaminha os 13 critérios
para o validador canônico. Um envelope `cvg-his-external-evidence` v1, ainda
que bem-formado e autodeclarado `PASS`, não é uma evidência familiar válida e
falha fechado. Companheiros ausentes continuam sendo reportados como não
provados; uma fonte presente, mas inválida, não é substituída por fallback.

## Evidência local e limites

Os testes `tests/unit/infra/prod-062-family-evidence.test.ts` cobrem um
conjunto bom sintético para os 13 critérios e controles ruins para hash, issuer,
target, status, limite declarado, autoridade, frescor, duplicidade, byte
mismatch e ausência de verificador. Eles injetam explicitamente um verificador
simulado e uma política aprovada de teste; isso prova o contrato, não uma
attestation real.

O pacote R1 correspondente registra os comandos e hashes em
`artifacts/state-of-art/PROD-062/attempt-20260915T161317Z-R1/`. Permanecem
bloqueados PROD-010, a coleta de coverage/integração real, providers e
workflows remotos, branch protection efetiva, target, Helm/cluster, backup e
restore autorizados, UAT hospitalar, autoridade de release, crítica fresh e
qualquer certificação Triplo AAA. Nenhum resultado deste inventário autoriza
`DONE`, deploy, uso de PHI ou promoção do release.
