# Triple-A — 12 Release Gate

**Status:** IMPLEMENTED (MA-03-R3) / BLOCKED UNTIL EVIDENCE

Os comandos canônicos são `pnpm release:triple-a` e `pnpm rc:evidence:triple-a`. O
script escreve `artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json`, separa modo
advisory de strict e só emite `TRIPLE-A VERIFIED` quando todos os critérios
passarem no mesmo SHA. O `QUALITY_BAR_V1.json` é uma referência congelada de
thresholds e proveniência; seus estados históricos não são reciclados como
falhas do candidato atual. O campo `source_prompt` é a fonte de identidade do
prompt para o gate: o script resolve esse caminho dentro do repositório e
compara seu SHA-256 com `source_prompt_sha256`, falhando fechado se a fonte
faltar ou divergir.

O workflow de release roda uma garantia strict de pré-publicação antes do
primeiro `push: true`. Essa etapa bloqueia o candidato usando os checks locais,
políticas e security evidence disponíveis, mas não certifica imagens, deploy,
recuperação, E2E ou autoridade humana. Após a publicação, o gate strict exige
manifest por digest, security evidence e evidência externa vinculada ao SHA.
As três imagens só recebem PASS de attestation depois de o próprio `gh
attestation verify` confirmar repository, workflow, branch, digest e SHA; um
envelope JSON autoassinado genérico permanece `PARTIAL`.

A avaliação do quality bar registra a fase no artefato (`prepublication` ou
`postpublication`). Critérios que dependem de publicação, ambiente alvo,
recuperação, E2E, UAT ou autoridade são `NOT_APPLICABLE` no pré-gate e ficam
fora do denominador e dos P0 abertos; isso não os converte em PASS. O pré-gate
exige o envelope CI completo do mesmo SHA, com reconsulta autenticada do run e
dos jobs, além dos checks locais e da security evidence. O gate pós-publicação
continua avaliando todos os critérios e thresholds congelados.

Todo envelope externo também precisa estar dentro da política de frescor: sete
dias fixos, definidos pelo gate (um parâmetro de ambiente não pode ampliar a
janela) e no máximo cinco minutos à frente do relógio
do verificador. Evidência expirada ou com timestamp futuro falha fechado antes de
ser considerada para score; o vínculo ao SHA continua obrigatório.

No estado local atual, o gate continua honestamente bloqueado sem manifest,
security evidence, CI, testes críticos, E2E, recovery, performance e deploy
target vinculados ao candidato. Nenhum modo advisory autoriza publicação.

## Contrato de expiração de pontos PROD-052

O guard local validate:loyalty-expiration-contract valida o contrato
comparativo em docs/engineering/loyalty-expiration-contract-prod-052.json e
seu documento de decisão. A checagem está integrada ao CI e ao release gate,
mas o resultado é apenas evidência local de implementação do contrato.

O contrato permanece PROPOSED_PENDING_AUTHORITY: C1-C6 e R1-R6 exigem decisão
de Product/Financeiro com validade e evidência. A política atual do código para
expiresAt é registrada como observação, não como violação ou decisão. PROD-052
não altera saldos, migrations, relógio, ordem de consumo, legado ou restituição;
a implementação depende de PROD-053. Sem autoridade, crítica fresh e provas
de API/DB concorrentes, reconciliação de ledger e dataset legado, o item não
promove DONE e não altera o estado BLOCKED / Triplo AAA NOT PROVEN.

## Matriz comportamental PROD-027

O guard validate:behavioral-parity-contract valida a preparação contratual da
matriz de 11 áreas e do inventário atual de módulos. A checagem está integrada
ao CI e ao release gate, mas não certifica paridade, UAT ou comportamento.

A fonte narrativa registra 45 módulos; o worktree observado contém 46 e marca
workflows como delta PENDING_AUTHORITY. O contrato preserva os quatro estados
verified apenas como VERIFIED_MANIFEST_ONLY, mantém as sete áreas bloqueadas,
exige cinco dimensões comportamentais por área e explicita COM-001 a COM-004
para pacotes, cotações, vendas/comanda e serviços.

PROD-003 continua dependência integral. O gate local permite somente
CONTRACT_ONLY_PREPARATION: nenhum runtime, fixture, dado, provider, PHI,
aceite Product/QA ou promoção de PROD-027/DONE/Triplo AAA é autorizado.

## Histórico desta correção

A revisão independente de MA-03-R1 emitiu `REJECT` com dois achados materiais
locais: (a) a autenticação era vinculada ao caminho do envelope, não aos bytes
efetivamente consumidos, permitindo a troca do arquivo entre a leitura e a
verificação; (b) a camada semântica aceitava `status=PASS` autodeclarado e
artefato irrelevante com hash correto. O reparo MA-03-R2:

- vincula o digest autenticado pelo verificador ao digest dos bytes lidos uma
  única vez;
- exige medições, unidades e réguas de comparação pertencentes ao gate, com a
  política de suficiência ainda `PENDING_AUTHORITY`;
- torna a suíte de testes hermética (diretórios temporários privados) e
  adiciona regressão que impede nova escrita no artefato canônico;
- alinha o gerador de pacote à avaliação canônica do gate.

A remoção da promoção por `TRIPLE_A_VERIFY_TARGET_EVIDENCE` (MA-03-R1)
permanece válida e coberta por teste.

## Contrato de confiança de evidência operacional (v3)

Esta versão substitui o contrato v2. Nenhuma variável de ambiente promove
envelope a `PASS`: o `PASS` operacional depende de integridade, autenticidade
confirmada por verificador externo e suficiência aprovada.

### Quatro camadas distintas

| Camada | O que prova | Quem/o que decide | Onde |
| --- | --- | --- | --- |
| 1. Integridade dos bytes | arquivos existem, não são simbólicos, não estão vazios e batem com os digests declarados; `observed_at`/`verified_at` são coerentes | gate (mecânico) | `validateExternalEvidenceEnvelope`, `validateOperationalEvidenceEnvelope` |
| 2. Autenticidade e procedência | a declaração veio de workflow confiável, no SHA do candidato, branch `main`, e o digest do subject autenticado é exatamente o dos bytes consumidos | `gh attestation verify` + parser estrito da saída documentada | `verifyOperationalEvidenceAttestation`, `parseAttestationVerificationOutput` |
| 3. Suficiência operacional | medições, unidades, alvo aprovado e réguas de comparação definidos pela política do gate | política fixada em código (`OPERATIONAL_EVIDENCE_POLICY`) | `validateOperationalEvidenceEnvelope` |
| 4. Aceite humano | autorização de release/certificação | autoridade humana (registro de autoridade) | fora deste gate; MA-35 |

As camadas são reportadas separadamente no campo `layers` de cada check
(`integrity`, `authenticity`, `sufficiency`). Um critério só é `PASS` quando
todas as camadas aplicáveis estão `PASS`; assinatura válida não basta.

### Vinculação de bytes

`envEvidence` lê o envelope **uma única vez**, calcula `sha256` desse buffer e
parseia o JSON a partir do mesmo buffer. O verificador recebe `envelopeSha256`
e, após confirmar repo/workflow/ref/SHA via flags do `gh`, compara o digest do
subject presente na saída JSON documentada com esse valor. O `gh` recebe
somente o caminho do envelope e calcula o digest do arquivo que ele efetivamente
observou; esse digest é comparado ao digest dos bytes lidos uma única vez, de
modo que um arquivo trocado entre a leitura e a verificação não pode ser
consumido sob a attestation original. Qualquer diferença (arquivo trocado,
subject ambíguo, digest errado) resulta em `FAIL`; saída vazia, não-JSON, sem
subject ou com status irreconhecível é rejeitada. Nenhum conteúdo do envelope é
executado.

Os artefatos referenciados são lidos uma vez cada: o digest é calculado sobre o
mesmo buffer que a validação consumiu, e arquivo vazio ou digest divergente
falha fechado. O gate não retém o conteúdo; consumidores a jusante devem
revalidar o digest declarado.

### Envelope operacional v3

`schema_version: 3`, `evidence_type: "cvg-his-operational-evidence"`,
`status: "PASS"`, `commit_sha` igual ao candidato, `observed_at` e
`verified_at` ISO-8601 com timezone e:

- `target.environment` e `target.reference` não vazios (vínculo ao alvo);
- `producer.kind`, `producer.run_id` e `producer.workflow` não vazios;
- `verification.method` exatamente `github-artifact-attestation` e
  `verification.verifier_id` exatamente `gh-attestation-verify`;
- `verification.verified: true`, com `verified_at` não anterior a `observed_at`
  além da tolerância de relógio;
- `artifacts[]` com caminho local, não simbólico, dentro do repositório, não
  vazio e `sha256:<64 hex>` conferido byte a byte;
- `results.outcome: "PASS"` e `results.dimensions[]` cobrindo exatamente as
  dimensões obrigatórias do critério, cada uma com `status: "PASS"`, `artifact`
  apontando para um item declarado em `artifacts[]` e `measurements[]` com
  `{ name, value, unit }`, valores numéricos finitos, nomes únicos e unidades
  exatamente as exigidas pela política.

### Política de suficiência (fixada no gate)

A tabela abaixo é o intake congelado dos produtores MA-23/25/28. A coluna de
régua está `PENDING_AUTHORITY`: os limites numéricos e os alvos aprovados são
decisão de autoridade e **não foram inventados** pelo gate. Enquanto a política
de um critério não estiver `APPROVED`, o melhor resultado é `PARTIAL`.

| Critério (variável) | Dimensão | Medição obrigatória | Unidade | Régua |
| --- | --- | --- | --- | --- |
| `OBSERVABILITY-EVIDENCE` (`TRIPLE_A_OBSERVABILITY_EVIDENCE`) | `slo` | `slo_compliance_ratio` | `ratio` | pendente de autoridade |
| | `alerts` | `alert_delivery_seconds` | `seconds` | pendente de autoridade |
| | `tracing` | `trace_coverage_ratio` | `ratio` | pendente de autoridade |
| | `retention` | `retention_days` | `days` | pendente de autoridade |
| | `oncall` | `oncall_ack_seconds` | `seconds` | pendente de autoridade |
| `PERFORMANCE` (`TRIPLE_A_PERFORMANCE_EVIDENCE`) | `targets` | `p95_latency_ms` | `ms` | pendente de autoridade |
| | `percentiles` | `p99_latency_ms` | `ms` | pendente de autoridade |
| | `saturation` | `cpu_saturation_ratio` | `ratio` | pendente de autoridade |
| `SOAK` (`TRIPLE_A_SOAK_EVIDENCE`) | `duration` | `duration_hours` | `hours` | pendente de autoridade |
| | `stability` | `error_budget_burn_ratio` | `ratio` | pendente de autoridade |
| | `thresholds` | `p95_latency_ms` | `ms` | pendente de autoridade |
| `ROLLBACK` (`TRIPLE_A_ROLLBACK_EVIDENCE`) | `application_rollback` | `rollback_duration_seconds` | `seconds` | pendente de autoridade |
| | `data_consistency` | `consistency_check_failures` | `count` | pendente de autoridade |

Regras da camada 3:

- a régua pertence ao gate, nunca ao produtor; campos de threshold enviados
  pelo envelope não são usados;
- IDs de dimensão duplicados são rejeitados antes de qualquer mapa ou
  sobrescrita: não existe first-wins, last-wins nem deduplicação silenciosa, e
  uma dimensão reprovada não pode ser substituída por uma duplicata aprovada;
- com política `APPROVED`, o `target.environment` precisa pertencer a
  `expected_targets` e cada medição é comparada a `min`/`max` da tabela;
- política `APPROVED` exige, por medição obrigatória, **ao menos um limite
  numérico finito**: `null` e `undefined` significam lado ausente; limite
  presente com tipo inválido, `NaN` ou `±Infinity` falha; `min > max` falha;
  limites unilaterais válidos e fronteiras inclusivas são preservados;
- política `APPROVED` sem alvo ou sem régua para uma medição obrigatória é
  configuração inválida e falha fechado;
- `status: "PASS"` sem medição não satisfaz o critério.

### Verificador externo

O comando executado é:

```text
gh attestation verify <envelope> --repo <GITHUB_REPOSITORY>
  --signer-workflow <repo>/<workflow fixado em código>
  --source-ref main --source-digest <SHA candidato>
  --predicate-type https://slsa.dev/provenance/v1 --format json
```

O parse segue o contrato documentado do `gh attestation verify --format json`:
array com uma entrada por attestation verificada, cada uma com
`verificationResult.statement.subject[]`; os digests `sha256` dos subjects
precisam ser válidos e únicos, e o digest único precisa ser igual a
`envelopeSha256`. Saída vazia, malformada, sem subject, com mais de um digest ou
com digest diferente falha fechado. Verificador indisponível (`ENOENT`) é
`PARTIAL`; rejeição ou saída inválida é `FAIL`.

### Raiz de confiança

A raiz é a attestation GitHub OIDC verificada por `gh attestation verify` contra
o repositório, o workflow assinante, `main` e o SHA do candidato. A lista de
workflows assinantes aceitos é a constante de código
`TRUSTED_OPERATIONAL_SIGNER_WORKFLOWS` (hoje apenas
`.github/workflows/release-artifacts.yml`). Essa lista:

- nunca é lida do envelope, do ambiente do candidato ou de configuração
  fornecida pelo candidato;
- só muda por decisão autorizada de CI-CONFIG, registrada como alteração de
  contrato de confiança.

A raiz externa continua pendente de demonstração: o código do gate, a política
e a lista de workflows vivem no próprio candidato, e o workflow de release faz
checkout do SHA candidato. Branch governance, review obrigatório, integridade
do runner/PATH e integridade do `gh` são pré-condições externas ainda `NOT
PROVEN`; nenhum PASS local certifica essas proteções.

### Ligação, validade e abuso

- **Candidato**: `commit_sha` obrigatório; qualquer alteração de SHA exige nova
  attestation e novo envelope.
- **Bytes**: o digest autenticado tem de ser o dos bytes consumidos; troca de
  arquivo após a leitura, subject ambíguo ou digest divergente falham.
- **Alvo**: `target.environment`/`target.reference` obrigatórios; com política
  aprovada, o ambiente precisa constar dos alvos aprovados.
- **Tipo/escopo**: `evidence_type` e `schema_version` exatos; dimensões têm de
  corresponder ao critério — um envelope de `SOAK` não satisfaz
  `OBSERVABILITY-EVIDENCE`.
- **Conteúdo**: cada artefato referenciado é digest-bound e não vazio; cada
  dimensão obrigatória deve apontar para um artefato declarado e carregar as
  medições exigidas.
- **Janela de validade**: máximo de sete dias, gate-owned e não ampliável por
  ambiente, e no
  máximo cinco minutos à frente do relógio do verificador, para `observed_at` e
  `verified_at`, com `verified_at` não anterior à observação.
- **Escopo errado/legado**: envelope v1/v2 nos critérios operacionais falha
  fechado (`FAIL`).
- **Replay**: reutilizar envelope antigo falha por SHA/janela; reexecutar o
  mesmo envelope válido dentro da janela ainda passa pela attestation, que é
  vinculada ao SHA e ao alvo declarado. Não há garantia de unicidade por
  tentativa; essa é uma limitação conhecida.
- **Revogação**: não há CRL neste contrato. A revogação efetiva é o produtor
  emitir evidência substituta e o gate revalidar; revogar uma attestation
  publicada é uma ação externa/humana ainda sem procedimento definido.
- **Política**: uma mudança de política de suficiência reavalia todos os
  envelopes na próxima execução, mas não há vínculo de versão da política na
  attestation; evidência antiga precisa ser recertificada quando a régua mudar.

### Mecânico versus humano

Mecânico: digests, bytes, frescor, SHA, tipo, dimensões, medições, unidades,
alvo aprovado, réguas e resultado do verificador. Humano: aprovação da política
de suficiência (alvos e thresholds), escolha dos produtores/assinantes
permitidos, anchor fora do GitHub, revogação, aceite final de release e
certificação (`FINAL-001`, autoridade de release).

### Testes e fixtures

A suíte `tests/unit/infra/triple-a-release-gate.test.ts` é hermética: cada teste
roda com `TRIPLE_A_RELEASE_OUTPUT_DIR` e `TRIPLE_A_FINAL_ARTIFACT_DIR` em
diretórios temporários exclusivos, o ambiente `TRIPLE_A_*` é restaurado em
`afterEach` (inclusive quando o teste falha) e há regressão que compara o
artefato canônico antes/depois da suíte, garantindo que um artefato preexistente
permaneça byte-idêntico e que nenhum artefato seja criado onde não existia.
Fixtures sintéticas provam apenas o contrato do gate e jamais contam como
homologação operacional. O verificador simulado usado nos testes é injetado
como parâmetro de função, não é acessível por CLI, variável de ambiente ou
configuração, e o motivo registrado no critério explicita
`test-simulated-verifier`. O caminho de produção usa exclusivamente
`gh attestation verify`.

O artefato final (`TRIPLE_A_RELEASE_EVIDENCE.json`) exporta `soak` e `rollback`
com o status e as referências dos critérios `SOAK` e `ROLLBACK`; a seção
`performance` permanece ligada a `PERFORMANCE`. Thresholds congelados (`97/95`,
zero P0) e os critérios da `QUALITY_BAR_V1.json` não são alterados por este
contrato.

### Gerador do pacote de evidência

`scripts/generate-triple-a-evidence-package.mjs` reutiliza a avaliação canônica
do gate para os membros operacionais (`performance.json`, `soak.json`,
`rollback.json`) e para `ci-evidence.json`, em vez de manter um segundo motor de
aprovação divergente. Envelopes v1 autodeclarados **não** são rotulados como
PASS verificado: operacionais v1 falham por contrato e genéricos válidos ficam
`PARTIAL`. O `index.json` continua `BLOCKED` enquanto qualquer membro não for
PASS, e `final-verdict.json`/`quality-scorecard.json` continuam exigindo a
decisão PASS do gate. O passo de pacote no workflow de release não recebe
credenciais nem evidências operacionais hoje; portanto ele permanece
`PARTIAL`/`BLOCKED` e não substitui a verificação do gate.

## Avaliação corrente no candidato `324099e5`

No candidato `324099e5a54537ca1349f3310639c3a12afbae36`, sem execução externa,
o gate local permanece `BLOCKED`/`NOT PROVEN`: as evidências operacionais
existem apenas como fixtures sintéticas, não há produtores MA-23/25/28, a
política de suficiência está `PENDING_AUTHORITY`, não há `gh`/attestations reais
e a autoridade de release é humana. O resultado é diagnóstico, fail-closed e
não autoriza publicação.

## MA-03-R2 — incidente, verificações e evidência (2026-09-12)

### Incidente de isolamento (registro obrigatório)

Durante a primeira execução da suíte de MA-03, o processo de teste sobrescreveu
o artefato canônico `artifacts/triple-a/TRIPLE_A_RELEASE_EVIDENCE.json`. O
revisor independente preservou os bytes anteriores
(`sha256 ea4a3d3c…75d01`) e a versão sobrescrita
(`sha256 48e946a1…`), restaurou os bytes originais e documentou o ocorrido. **O
fingerprint final igual ao inicial não prova ausência de mutação**: houve escrita
e restauração. A suíte passou a ser hermética (diretórios privados por teste,
limpeza de todo `TRIPLE_A_*` no `afterEach` e comparação do artefato canônico e
do ambiente antes/depois da suíte), e a regressão impediu nova escrita.

### Verificações executadas (MA-03-R2)

| Verificação | Resultado | Evidência vinculada à versão final |
| --- | --- | --- |
| Testes focais do gate (inclui known-bads de swap, dimensões, alvo, `verified_at`, veredito inválido) | 42/42 PASS | `attempt-5-evidence-rebind/logs/gate-tests-bound.log` (o log registra `sha256` de gate/testes/canônico antes e depois da execução e `[exit=0]`) |
| Testes do gerador de pacote (coerência gate↔pacote, v1 operacional, separação declarado/verificado) | 6/6 PASS | `attempt-5-evidence-rebind/logs/package-tests-bound.log` (hashes antes/depois e `[exit=0]`) |
| Isolamento, artefato canônico e controle negativo (teste que falha não toca o canônico; ambiente restaurado) | PASS; canônico `ea4a3d3c…` inalterado | `attempt-5-evidence-rebind/fingerprints/before.json` + `after.json`, `attempt-3-reconciliation/logs/negative-control-failure.log` e `fingerprints/pre.json`+`post.json` |
| Matriz adversarial pelo caminho público (CLI real + `gh` sintético preservado) | 12/12 MATCH | `attempt-5-evidence-rebind/logs/cli-matrix.log` (embute `gate_sha256`, `test_sha256`, `HEAD`, `canonical_sha256` antes/depois, hash do `gh` sintético e colunas expected/observed/verdict; payload de medição estável, sem digest do doc) |
| Coerência gate/gerador (`declared_status` vs `verified_status`) | declared=PASS, verified=PARTIAL/FAIL, `index = BLOCKED` | `attempt-3-reconciliation/logs/generator-coherence.log` (gerador inalterado desde então: `6cfcf376`) |
| `docs:validate`, `git diff --check`, eslint focado | limpos (`[exit=0]`) | `attempt-5-evidence-rebind/logs/docs-validate-bound.log`, `git-diff-check-bound.log`, `eslint-bound.log` |

Os logs de `artifacts/remediation/MA-03-R2/attempt-2/` são históricos da revisão
intermediária (pré-reconciliação). A matriz de `attempt-3-reconciliation/` usava
o próprio doc como artefato de medição e ficou version-stale quando este doc foi
corrigido; a `attempt-5-evidence-rebind/` reapresenta a prova com payload
estável e binding explícito, sem alterar os hashes de código
(`e80864f3` gate, `dc7be7bb` testes, `6cfcf376` gerador, `c4e3dedb` testes do
gerador), o canônico (`ea4a3d3c`) e a Quality Bar (`26ff154d`). Qualquer nova
alteração nos arquivos julgados invalida esse vínculo.

### Formato do `gh attestation verify` (fonte oficial)

Confirmado no manual oficial em 2026-09-12
(https://cli.github.com/manual/gh_attestation_verify): com `--format json` a
saída é "a JSON array containing one entry per verified attestation"; cada item
contém `attestation` e `verificationResult`, e `verificationResult.statement`
contém o array `subject` que referencia os artefatos. O parser do gate usa
exatamente `verificationResult.statement.subject[].digest.sha256` e rejeita
array vazio, JSON inválido, subject ausente, digest inválido ou múltiplos
digests ambíguos. A raiz de confiança continua definida em código
(`TRUSTED_OPERATIONAL_SIGNER_WORKFLOWS`), nunca lida do envelope.

### Ajustes desta rodada

- Veredito de verificador com status irreconhecível passa a **FAIL** (saída
  inválida), distinto de indisponibilidade (`PARTIAL`).
- O pacote de evidência expõe `declared_status` (declaração do produtor) e
  `verified_status` (avaliação canônica do gate) separadamente, além de
  `verification_layers` quando aplicável; um PASS autodeclarado nunca é lido
  como PASS verificado.
- A suíte remove todo `TRIPLE_A_*` criado dentro do teste e compara o ambiente
  antes/depois do arquivo inteiro.

Limitações e decisões humanas permanecem: política de suficiência
`PENDING_AUTHORITY`, raiz de confiança de produtores MA-23/25/28, anchor fora do
GitHub, revogação e autoridade de release.

## MA-03-R3 — correção de suficiência (R2-F1/R2-F2, 2026-09-12)

O parecer independente de MA-03-R2
(`docs/2026-09-12-ma03-r2-parecer-independente.md`, I1, `REJECT`) reproduziu
dois defeitos locais no contrato de suficiência:

- **R2-F1:** a dimensão duplicada era gravada em `measurementsById` por
  sobrescrita, e a avaliação posterior usava o último valor; um `SOAK` com
  `duration` e `duration_hours=-1` reprovava o mínimo, mas acrescentar outra
  `duration` com valor `1` transformava o envelope em `PASS`.
- **R2-F2:** a guarda `spec.min === null && spec.max === null` deixava
  `undefined` escapar; clonar a política real, marcar `APPROVED` e preencher
  `expected_targets` permitia `PASS` sem qualquer limite numérico definido.

Correção em MA-03-R3 (rework estreito):

- IDs de dimensão duplicados falham **antes** de qualquer construção de mapa,
  independentemente do estado da política (`FAIL`, nunca `PARTIAL`/`PASS`);
- a configuração da política é validada antes da avaliação:
  `null`/`undefined` = lado ausente, ao menos um limite finito por medição,
  rejeição de string/booleano/objeto/`NaN`/`±Infinity`, rejeição de
  `min > max`, preservação de limites unilaterais e de fronteiras inclusivas;
- a política real de produção permanece `PENDING_AUTHORITY` (nenhum alvo ou
  limiar inventado) e continua `PARTIAL`;
- o gerador de pacote reutiliza a mesma avaliação canônica: os dois negativos
  não aparecem como `verified_status = PASS`, `declared_status` continua
  separado e `index` permanece `BLOCKED`.

Regressões executadas: dimensão reprovada seguida de aprovada, ordem inversa,
duplicatas idênticas e duplicata sob política pendente → `FAIL`; dimensões
únicas e válidas → `PASS`; os pares null/undefined sem limite, tipos inválidos,
`NaN`, `±Infinity` e intervalo invertido → `FAIL`; `min` unilateral, `max`
unilateral, intervalo válido e valor exatamente na fronteira → `PASS`; valor
fora da faixa → `FAIL`; política real pendente → `PARTIAL`.

## Matriz de ambiente e runtime

O gate também executa validate:environment-runtime para manter a precedência
Compose/Helm, runbooks, owners e alvos declarada no PROD-049. Esse check é
estrutural e fail-closed: staging/produção permanecem PENDING_AUTHORITY,
digests, provider de secrets, origens, migration, worker health e target não
são convertidos em PASS local. A matriz não substitui evidência de CI remoto,
Helm executável, cluster, smoke, UAT ou release owner.

Evidência da tentativa:
`artifacts/remediation/MA-03-R3/attempt-1-20260912T2144Z/` (`probe/probe.mjs`
antes/depois, `logs/gate-tests.log` 53/53, `logs/package-tests.log` 7/7,
`logs/cli-matrix.log` 13/13 com duplicata no CLI,
`logs/negative-control-failure.log`, fingerprints e `REVIEW_PACKET.md`).
A homologação real permanece `REVIEW REQUIRED` até crítico fresco independente;
o release segue `BLOCKED / NOT PROVEN`.

## Contrato de identidade corporativa PROD-019

O gate executa `pnpm validate:identity-contract` para verificar o contrato
revisável de identidade em
`docs/engineering/identity-contract-prod-019.json`, seu documento explicativo
e os controles good/bad. O check confirma que C1-C6 e R1-R6 continuam
`PENDING_AUTHORITY`, que issuer + sub é a chave externa e que email não cria
vínculo.

Esse check é local e contratual. Ele não escolhe provider, não valida
discovery/JWKS real, não cria sessão, não homologa browser/API/DB/tenant, não
promove PROD-020/021 e não prova Triple-A. Product e Security ainda precisam
assinar as decisões, após o que a integração e a evidência fresh devem ser
executadas no mesmo candidato.

## Verificadores por família — PROD-062

Os critérios anteriormente encaminhados ao envelope externo genérico agora
passam por contratos específicos de testes, RLS, backup, UAT, deploy, proteção
de branch e autoridade. O inventário de 13 critérios, dimensões, unidades e
invariantes está em
[`19-prod-062-family-verifier-inventory.md`](19-prod-062-family-verifier-inventory.md).

O validador exige bytes lidos uma única vez, digest do envelope, produtor e
workflow confiáveis, alvo, medições gate-owned, frescor, política aprovada e
autoridade quando aplicável. Envelope genérico v1, declaração de limite pelo
produtor, hash/issuer/target/status divergente ou autoridade falsa falha
fechado. A política de produção segue `PENDING_AUTHORITY` e a ausência de
verificador resulta em `PARTIAL`; nenhum flag local promove `PASS`.

O gerador de pacote reutiliza essa decisão canônica e mantém
`declared_status` separado de `verified_status`. A implementação e os
controles good/bad de R1 são locais/sintéticos; PROD-010, providers, targets,
UAT, CI remoto, autoridade de release e crítica fresh continuam necessários
para qualquer promoção.

## Contrato de cadastros — PROD-063

O gate também executa `pnpm validate:registry-contract` para manter verificável
o contrato local de tutores, pacientes, vínculos e cadastros auxiliares em
`docs/engineering/registry-contract-prod-063.json`. A rota agora valida o
DTO usado pelo runtime/OpenAPI antes da mutação, aplica duplicidade por conta
em create/update e retorna metadados de paginação quando solicitados.

Esse check não resolve a divergência histórica de `packages/contracts`, não
prova unicidade concorrente no PostgreSQL, RLS, atomicidade entre tabelas,
importação/paridade Vetus, UAT ou aceite de Product/QA/domínio. O contrato e
as recomendações permanecem `PENDING_AUTHORITY`; PROD-024, PROD-027 e
PROD-055 continuam dependências integrais e o release permanece bloqueado.
