---
document_status: historical
document_kind: baseline
effective_date: 2026-09-20
owner: Engenharia e Liderança técnica CVG-HIS
review_cycle: on-candidate-change-or-material-evidence
candidate_sha: be2dc76a765438aedbc3aa31138905b8f3e78e46
overall_score: 53
verdict: FAIL_BLOCKED
superseded_by: docs/2026-09-20-auditoria-scorecard-8c1feddb.md
---

# Auditoria e scorecard do sistema — `be2dc76a`

[Plano vigente](2026-09-20-plano-executivo-nova-rodada-melhorias.md) ·
[Roadmap](2026-09-20-roadmap-nova-rodada-melhorias.md) ·
[Backlog](2026-09-20-backlog-nova-rodada-melhorias.md) ·
[Quality Bar](triple-a/QUALITY_BAR_V1.json)

## Veredito executivo

**Nota ponderada: 53/100. Veredito: `FAIL / BLOCKED`.**

O sistema tem uma base de engenharia relevante: lint, typecheck, build, contratos
de produção e tracing passam; a API expõe 430 paths e a camada de dados possui
RLS estático em 171/172 tabelas tenant-scoped, com uma exceção documentada. A
suíte crítica PostgreSQL foi executada em banco efêmero real, aplicando as
migrações `0000–0177` e exercitando concorrência, idempotência e isolamento.

Isso ainda não forma um candidato publicável. Quatro gates locais estão
vermelhos: regressão adversarial da supply chain, política de dependências,
scanner de segredos e backup/restore documental. A identidade atual aponta para
`6e365f4c`, mas o registro P0 e os snapshots ainda apontam para `ec092d77`.
As evidências OCI/Trivy anteriores são stale para o candidato atual. O `HEAD`
está 30 commits à frente de `origin/main`; não há CI/release encadeado no SHA,
target aprovado, restore real, UAT ou autoridades de go/no-go.

Uma nota não promove release: qualquer P0 ou gate requerido reprovado prevalece
sobre a média.

## Escopo e régua de notas

Auditoria brownfield T4/cross-system sobre o `HEAD`
`be2dc76a765438aedbc3aa31138905b8f3e78e46`, em worktree isolada quando os
comandos poderiam gerar arquivos. A fotografia inicial estava limpa e teve
sentinela SHA-256 `037d1f8b0ff8f8510c5e5479a65087b87414e4bbc2baece213784a3408cc7bff`.

Escala congelada: 0 = ausente; 25 = esqueleto ou falhas graves; 50 = útil mas
parcial; 70 = forte localmente, sem target/autoridade; 85 = prova atual no
candidato com CI/runtime; 100 = ponta a ponta no target e aceite da autoridade.
Um gate requerido em `FAIL` limita a dimensão a 49; dependência externa
`BLOCKED` limita a 74; evidência stale limita a 59.

| Dimensão | Peso | Nota | Estado | Justificativa principal |
| --- | ---: | ---: | --- | --- |
| S01 Produto e cobertura funcional | 15% | 44 | REJECT | apenas 4/11 áreas por manifesto; sete bloqueadas, fluxos P0 parciais e sem UAT atual |
| S02 Backend, API e contratos | 12% | 66 | REJECT | base transacional forte; upload diverge no ingress e OpenAPI-runtime só compara auth crítico |
| S03 Frontend, UX e acessibilidade | 8% | 59 | REJECT | boa base/testes anteriores; browser, visual, acessibilidade e UAT do SHA não foram renovados |
| S04 Dados, migrações e isolamento | 12% | 74 | REJECT | 171/172 com RLS e suíte PostgreSQL crítica verde; sem restore ou mixed-version no target |
| S05 Segurança, privacidade e segredos | 12% | 42 | REJECT | gate de segredos falha e `/metrics` público agrega dados operacionais cross-tenant |
| S06 Arquitetura e manutenibilidade | 8% | 52 | REJECT | direção modular útil, mas hotspots de 2k–8k linhas e estado gigante concentram risco |
| S07 Testes e engenharia de qualidade | 10% | 47 | REJECT | suíte ampla; mutation harness e backup gate falham e coverage exclui superfícies de alto risco |
| S08 Supply chain, CI e release | 10% | 45 | REJECT | validador principal passa, mas quatro gates CI falham e não há CI/release exatos |
| S09 Runtime, confiabilidade e operações | 7% | 68 | REJECT | contratos locais fortes; artefato de deploy, restore, game-day e target não foram provados |
| S10 Documentação, controle e rastreabilidade | 3% | 42 | REJECT | `check_state.py` 11/11; P0 registry e snapshots divergem do candidato |
| S11 Governança, UAT e aceite | 3% | 30 | REJECT | protocolos são fail-closed, mas há zero decisões de autoridade e nenhum UAT atual |

O total é a soma ponderada arredondada. A pontuação mede maturidade observada;
o veredito mede satisfação dos gates. A Quality Bar Triplo AAA continua exigindo
total ≥97, dimensões críticas ≥95, zero P0 e todos os aceites obrigatórios.

## Achados prioritários

### AUD21-01 — controles candidate-bound divergentes — P0 crítico

[`CURRENT_CANDIDATE_IDENTITY.json`](triple-a/CURRENT_CANDIDATE_IDENTITY.json)
identifica `6e365f4c`, enquanto
[`P0_REGISTRY.json`](triple-a/P0_REGISTRY.json) e os snapshots correntes ainda
identificam `ec092d77`. `validate:candidate-identity` passou na fotografia
inicial limpa, mas
`validate:p0-registry` falha com cinco divergências e `docs:validate` rejeita o
snapshot stale. O commit `be2dc76a` é documental e permitido pela identidade,
mas não torna a prova antiga atual.

Aceite: após corrigir os gates internos, congelar um único SHA e regenerar
identity, registry, snapshots e evidência sem transformar `NOT_PROVEN` em
`PASS`.

### AUD21-02 — mutation harness da supply chain regrediu — P0 alto

O validador principal passa com contagens `131/13/15/0/6/4`, mas
`node --test scripts/validate-supply-chain.test.mjs` termina em 16 PASS/1 FAIL.
A mutação 65 usa `hashFiles('scripts/**-parity-audit.mjs')`; agora existe
`scripts/lib/vetus-parity-audit.mjs`, então a mutação deixou de representar
condição estaticamente falsa.
É uma regressão do oracle/harness e invalida a alegação anterior de 17/17.

Aceite: fixture impossível e independente da árvore real, known-bad que falha
pelo finding esperado e suíte 17/17 no SHA congelado.

### AUD21-03 — gates de dependência e segredos falham — P0 alto

[`package.json`](../package.json) declara `pnpm@10.33.0`, enquanto
[`validate-dependency-policy.mjs`](../scripts/validate-dependency-policy.mjs)
exige `pnpm@10.0.0`. O secretlint reporta sete URLs PostgreSQL sintéticas em
fixtures, testes, validador e workflow. Não há indicação de credencial real,
mas o gate corporativo está vermelho e não pode ser ignorado.

Aceite: alinhar a versão canônica; remover, construir dinamicamente ou permitir
fixtures sintéticas por regra estreita e revisada, mantendo um known-bad que
prova a detecção de segredo real.

### AUD21-04 — backup/restore perdeu vínculo com a documentação vigente — P0 alto

`ops:backup:check` encontrou 2 PASS/2 FAIL: o checker procura critérios antigos
de roadmap/backlog e a mutação de roadmap não altera mais o documento atual.
Os scripts operacionais existem, mas não há drill real atual nem RPO/RTO
aprovados. A documentação desta auditoria restaura o critério explícito; isso
não substitui o restore em target.

### AUD21-05 — evidência OCI/Trivy não pertence ao candidato atual — P0 crítico

Os pacotes OCI/Trivy preservados foram produzidos antes de mudanças materiais e
registram SHA/fonte anterior ou worktree não congelada. Portanto, o resultado
histórico de 0 HIGH/CRITICAL é informativo, não transferível. Não há attestation,
manifesto ou release encadeado para `be2dc76a`.

### AUD21-06 — Helm obrigatório e target não provados — P1 alto

O validador estático de Helm passa para dev/staging/prod, inclusive os bindings
Vault por `secretKeyRef`; `REQUIRE_HELM=1` falha porque o binário Helm 3.15.4
não está instalado no ambiente de auditoria. Não houve credencial real, deploy,
readiness, rollback, restore ou soak no target aprovado.

### AUD21-07 — cobertura funcional e autoridade incompletas — P1 alto

`readiness:enterprise` encontrou 33 PASS, 3 WARN e 1 FAIL; o FAIL é paridade
funcional, com 4/11 áreas verificadas. Relatórios, integrações, financeiro,
LGPD, identidade externa, UAT clínica e acessibilidade permanecem parciais ou
bloqueados. O indicador estrutural de 93/100 desse comando não é nota global.
Parte dos PASS verifica existência de arquivos, não execução. Compras e
transferências de estoque ainda declaram estado volátil perdido no reload e sem
efeito no saldo, portanto não podem ser tratadas como jornadas concluídas.

### AUD21-08 — hotspots e evidência excessiva — P1 médio

`apps/api/src/server.ts` tem 8.328 linhas, `apps/worker/src/runner.ts` 2.139 e
`scripts/validate-supply-chain.mjs` 3.607. `docs/` ocupa cerca de 2,4 GB e
`.gauntlet/state.json` cerca de 146 MB. Isso aumenta o custo de auditoria,
fingerprint, review e recuperação e merece decomposição posterior aos P0.
O coverage global também exclui `server.ts`, routes, repositories e módulos de
alto risco; o percentual agregado não representa toda a superfície crítica.

### AUD21-09 — métricas clínicas agregadas estão públicas — P0 alto

`/metrics` é respondido antes da autenticação e recalcula gauges percorrendo
contas para agregar internações, encontros, medicações e diagnósticos. O ingress
de produção publica a API inteira e o chart não contém `NetworkPolicy`. Isso
expõe contagens operacionais e permite amplificação de carga por scrapes.

Aceite: autenticação ou rede privada/mTLS, política de rede explícita, cache ou
coleta assíncrona bounded e teste negativo através do ingress.

### AUD21-10 — contrato de upload diverge do ingress — P1 médio

A API lê requisições de até 32 MiB e aceita arquivo decodificado até 25 MiB,
mas o ingress de produção limita o body a 10 MiB. O OpenAPI não declara
`maxLength` nem resposta 413. Um payload aceito pela aplicação falha antes de
alcançá-la no target.

Aceite: um único limite coerente em ingress, API e OpenAPI, com E2E positivo na
fronteira e negativo acima dela.

## Verificações executadas

| Verificação | Resultado observado |
| --- | --- |
| worktree/identidade Git | PASS: checkout inicial limpo; `HEAD=be2dc76a`; `origin/main` 30 commits atrás |
| lint, typecheck e build | PASS em worktree isolada |
| OpenAPI | PASS: 430 paths, 41 tags, 525 schemas |
| deploy/runtime/observabilidade | PASS nos validadores estáticos; produção e tracing 3/3 + 3/3 |
| RLS estático | PASS: 171/172 tabelas tenant-scoped, uma exceção documentada |
| suíte crítica PostgreSQL | PASS: banco efêmero real, migrações `0000–0177` e 11/11 testes de processo não pulados |
| supply-chain principal | PASS: 131/13/15/0/6/4 |
| regressão supply-chain | FAIL: 16/17, mutação 65 passou indevidamente |
| política de dependências | FAIL: pnpm 10.33.0 versus política 10.0.0 |
| secretlint/enterprise security | FAIL: sete findings em literais sintéticos |
| Helm | PASS estático; BLOCKED no modo obrigatório por binário 3.15.4 ausente |
| backup/restore gate | FAIL na fotografia de entrada: 2/4; documentação reconciliada nesta mudança |
| controlador `.agent` | PASS estrutural 11/11; não prova frescor do candidato |
| candidate identity | PASS antes da edição documental para `6e365f4c`; após a edição, guard bloqueia corretamente a worktree suja; CI/release nulos |
| P0 registry / docs completos | FAIL: cinco divergências e snapshot `ec092d77` stale |
| CI, release, target, restore, soak, UAT e autoridade | NOT RUN / BLOCKED |

## Decisão e próxima ação

Manter o release bloqueado. A ordem segura é: corrigir os quatro gates locais e
os achados `AUD21-09/10`; reexecutar regressões e suíte crítica; congelar um
único SHA; regenerar controles candidate-bound; obter CI/release sem rebuild;
só então produzir novas OCI, scans, attestations e provas de target, restore,
UAT e autoridade. O backlog e o roadmap vigentes detalham essa sequência.

Esta auditoria não executou push, release, deploy, rotação de segredo nem ação
externa. A nota 53/100 não autoriza produção nem o selo Triplo AAA.
