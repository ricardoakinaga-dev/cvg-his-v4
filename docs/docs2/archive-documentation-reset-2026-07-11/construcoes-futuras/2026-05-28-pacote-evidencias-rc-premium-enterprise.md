# Pacote de Evidencias - RC Premium Enterprise

Data: 2026-05-28  
Comando: `pnpm rc:evidence`

## Resultado

- PASS: `11`
- WARN: `3`
- FAIL: `0`

Em modo estrito, sem evidencias externas:

- PASS: `11`
- WARN: `0`
- FAIL: `3`

Em modo estrito, com `RC_CI_URL`, `RC_BACKUP_DRILL_REPORT` e `RC_DEPLOY_EVIDENCE_URL` informados:

- PASS: `14`
- WARN: `0`
- FAIL: `0`

## Evidencias locais executadas

| Area | Evidencia | Status |
| --- | --- | --- |
| Readiness | `pnpm readiness:enterprise` com `Score: 97/100`, `43 PASS`, `3 WARN`, `0 FAIL` | PASS |
| Vetus | `pnpm vetus:parity` com `Score: 91/100` e nenhuma area abaixo da meta `88/100` | PASS |
| Governanca de acesso | `pnpm governance:access` validou RBAC/ABAC, matriz, rotas protegidas, OpenAPI, SPA, testes e RLS com `100/100` | PASS |
| Governanca de auditoria | `pnpm governance:audit` validou matriz critica de auditoria, cobertura operacional, OpenAPI, SPA, Dashboard e testes com `100/100` | PASS |
| Governanca LGPD | `pnpm governance:lgpd` validou providers reais, DSR, retencao, expurgo/anonimizacao, SPA e testes com `100/100` | PASS |
| Governanca de observabilidade | `pnpm governance:observability` validou SLOs, Prometheus, endpoints, OpenAPI, SPA, Dashboard e testes com `100/100` | PASS |
| Seguranca | `pnpm security:evidence` executou audit enterprise, validou Semgrep/SARIF no CI e gerou SBOM com 545 componentes | PASS |
| Backup/restore | `pnpm ops:backup:check` validou scripts, manifest, checksums, restore drill e documentacao viva | PASS |
| Restore drill local | `pnpm ops:restore:drill:v2` restaurou bundle fixture em Postgres descartavel, com 2 tabelas e 2 arquivos de storage | PASS |
| Deploy/cutover | `pnpm deploy:check` validou runtime canonico API/worker/SPA, portas, compose, proxy e docs de cutover | PASS |
| Cutover rehearsal local | `pnpm deploy:rehearsal:local` subiu Postgres/Redis em projeto Compose isolado e validou healthchecks | PASS |
| Helm | `pnpm validate:helm` passou em validacao estatica para dev, staging e prod; o binario `helm` nao estava instalado localmente | PASS |

## Evidencia no CI

O workflow `.github/workflows/ci.yml` passou a gerar o artefato:

```text
e2e/spa-report/enterprise-rc-evidence.md
```

O artefato e produzido pelo passo `Generate Enterprise RC evidence`, depois do gate E2E Enterprise. Em GitHub Actions, a variavel `RC_CI_URL` e preenchida com o link do proprio run:

```text
${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

Com isso, a evidencia de CI remoto deixa de depender de preenchimento manual quando o pipeline rodar.

## Evidencias externas ainda pendentes

| Area | Pendente | Como anexar no proximo gate |
| --- | --- | --- |
| CI remoto | GitHub Actions verde com `test:e2e:spa:enterprise` | O workflow ja preenche `RC_CI_URL` automaticamente; anexar o artefato gerado no run |
| Backup real | Restore drill real em homolog/staging | Usar o mesmo fluxo aprovado localmente: `pnpm ops:restore:drill:v2 <bundle-real>` e depois `RC_BACKUP_DRILL_REPORT=<path-ou-url> pnpm rc:evidence` |
| Deploy real | Checklist/evidencia de deploy/cutover no ambiente alvo | Executar `RC_DEPLOY_EVIDENCE_URL=<url-ou-path> pnpm rc:evidence` |

## Comando criado

```bash
pnpm rc:evidence
```

Modo estrito para promocao final:

```bash
pnpm rc:evidence:strict
```

No modo estrito, as evidencias externas ausentes viram `FAIL`.

O comando agrega os gates locais de release candidate e aceita evidencias externas por variaveis de ambiente:

```bash
RC_CI_URL=<url> \
RC_BACKUP_DRILL_REPORT=<path-ou-url> \
RC_DEPLOY_EVIDENCE_URL=<path-ou-url> \
pnpm rc:evidence
```

Quando as tres variaveis forem informadas com artefatos reais, o pacote de evidencias deixa de reportar avisos externos.

## Decisao

O requisito operacional de release candidate ganhou um pacote reexecutavel. O estado atual segue como **RC tecnico local aprovado**, com pendencias externas explicitamente rastreadas.
