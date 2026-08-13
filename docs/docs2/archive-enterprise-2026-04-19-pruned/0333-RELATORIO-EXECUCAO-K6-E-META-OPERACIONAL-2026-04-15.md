# 0333 - Relatorio de Execucao K6 e Meta Operacional - 2026-04-15

**Data UTC:** `2026-04-15`  
**Gap:** `GAP-205`  
**Objetivo:** revalidar a trilha de benchmark `k6`, remover fragilidades de execucao e explicitar a meta operacional minima

---

## 1. Estado real encontrado

- a suite `benchmarks/k6/api-benchmark.js` existe e gera `benchmarks/k6/results/performance-report.json`
- o parser `benchmarks/k6/parse-results.js` nao interpretava o formato real do campo `slo`
- o job `.github/workflows/ci.yml` escrevia/consumia o artefato de forma fragil e sem garantia de resumo util em falha
- o runtime database-backed do benchmark nao garantia fixture minima de autenticacao e RBAC, o que podia derrubar o benchmark em `401/403` antes de medir performance

---

## 2. Correcoes aplicadas

- `benchmarks/k6/seed-benchmark-fixtures.ts`
  - novo script para preparar fixture minima de benchmark em runtime com banco
  - garante permissoes, roles e usuarios `admin`, `vet`, `finance`, `inventory`
- `benchmarks/k6/api-benchmark.js`
  - perfil operacional minimo passou a ser nomeado e gravado no relatorio como `operational-minimum-v1`
- `benchmarks/k6/parse-results.js`
  - parser alinhado ao JSON real do relatorio
  - suporte a saida Markdown para `GITHUB_STEP_SUMMARY`
  - exit code coerente com `allPassed`
- `.github/workflows/ci.yml`
  - benchmark de CI mantido em runtime controlado/in-memory para nao acoplar a trilha de performance ao gap estrutural atual do schema de sessoes
  - `PIX_MOCK_MODE=true` para benchmark controlado sem dependencia de credencial externa
  - `k6 run` simplificado para usar o `handleSummary` oficial da suite
  - upload do `performance-report.json` como artefato rastreavel
- `package.json`
  - scripts `benchmark:k6:seed`, `benchmark:k6`, `benchmark:k6:parse`

---

## 3. Meta Operacional Minima

**Perfil oficial:** `operational-minimum-v1`

**Cenario minimo exigido:**

- ramp-up `30s` ate `5 VUs`
- carga sustentada `1m` em `30 VUs`
- pico `30s` em `60 VUs`
- retorno controlado `30s` em `30 VUs`
- cool-down `1m` em `5 VUs`

**SLOs minimos para considerar o ambiente operacionalmente aceitavel:**

- `api_latency_ms.p95 < 200ms`
- `api_latency_ms.p99 < 500ms`
- `api_errors.rate < 0.001`
- `auth_latency_ms.p95 < 300ms`
- `query_latency_ms.p95 < 150ms`
- `write_latency_ms.p95 < 300ms`
- `billing_latency_ms.p95 < 250ms`
- `inventory_latency_ms.p95 < 200ms`

**Regra de uso:**

- ambiente local: serve para validar executabilidade da suite e detectar regressao grossa
- staging: ambiente minimo para gate operacional real
- release: so sobe se o relatorio de staging do perfil `operational-minimum-v1` vier com `allPassed=true`

---

## 4. Evidencia de revalidacao no dia

### 4.1 Runtime local controlado

- API iniciada em modo controlado com `PIX_MOCK_MODE=true`
- benchmark executado contra runtime local em memoria para comprovar executabilidade da suite sem dependencia externa de gateway
- alvo usado na revalidacao local: `http://127.0.0.1:3012`
- baseline observado no perfil `operational-minimum-v1`:
  - `api_latency_ms.p95 = 527.37ms`
  - `api_latency_ms.p99 = 961.19ms`
  - `auth_latency_ms.p95 = 578.50ms`
  - `query_latency_ms.p95 = 574ms`
  - `api_errors.rate = 0.77`
  - resumo final: `0/8` SLOs aprovados
- conclusao objetiva: a suite esta executavel, mas o baseline local atual esta muito abaixo da meta minima e nao pode ser usado como evidência de readiness
- observacao operacional: na rerodada local via container `grafana/k6`, o `handleSummary` nao conseguiu gravar `benchmarks/k6/results/performance-report.json` por permissao de bind mount; isso nao afeta o runner de CI com `k6` instalado no host

### 4.2 Runtime database-backed

- durante a tentativa de rerodada com banco, foi identificado que o benchmark precisava de fixture minima de autenticacao/RBAC
- o ajuste foi incorporado ao repositório via `benchmarks/k6/seed-benchmark-fixtures.ts`, fechando a causa estrutural de fixture em vez de manter workaround manual
- na mesma trilha surgiu um gap separado de runtime/schema: o bootstrap database-backed ainda falha por dependencia da relacao `sessions`, portanto o gate de CI ficou propositalmente desacoplado desse ponto e manteve benchmark controlado em memoria

### 4.3 Evidencia obrigatoria a partir deste gap

Para considerar uma execucao valida de performance, a trilha precisa conter:

1. comando executado
2. alvo (`TARGET`) e perfil (`operational-minimum-v1`)
3. `benchmarks/k6/results/performance-report.json`
4. saida de `pnpm benchmark:k6:parse`
5. status final `allPassed=true/false`

---

## 5. Comandos canonicos

```bash
DATABASE_URL="<test-database-url>" \
pnpm benchmark:k6:seed
```

```bash
TARGET=http://127.0.0.1:3001 \
ACCOUNT_ID=acc_cvg_demo \
k6 run benchmarks/k6/api-benchmark.js
```

```bash
pnpm benchmark:k6:parse
```

---

## 6. Fechamento do gap

`GAP-205` pode ser tratado como `DONE` porque deixou de ser apenas "suite escrita" e passou a ter:

- fixture minima repetivel
- parser coerente com o artefato real
- upload de evidencia em CI
- meta operacional minima nomeada e versionada
