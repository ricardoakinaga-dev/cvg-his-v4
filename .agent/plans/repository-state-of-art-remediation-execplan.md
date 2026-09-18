# Remediação do repositório para ERP State of Art — ExecPlan

<!-- engineering-framework: active_action_id=TRIPLE-A-RELEASE-CONTROL:CI-282-ROOT-CAUSE-REVIEW -->

## Purpose / Big Picture

Corrigir os GAPs da auditoria de 12/09/2026 em ordem de risco, produzir evidência atual nas fronteiras reais e manter o release bloqueado até que a régua Triple-A 97/95/zero-P0 e as autoridades externas sejam satisfeitas. O resultado observável imediato é um programa rastreável com correções locais P0 integradas e testadas; o resultado terminal exige target, UAT e decisão externa.

## Progress

- [x] (2026-09-12T00:00:00-03:00) Auditoria do HEAD `31fde3c4dc8daa658e46c2fd4fe415cfaeae2e44` concluída com 69/100 e FAIL.
- [x] (2026-09-12T00:00:00-03:00) Relatório, roadmap e backlog de remediação publicados em `docs/`.
- [x] (2026-09-12T14:43:35-03:00) Integrados e aprovados por críticos frescos os slices de OpenAPI/auth, supply chain/release, pacote visual e higiene do typecheck; regressão ampla passou após eliminar uma corrida temporal do outbox.
- [x] (2026-09-12T19:33:34Z) MA-02/REM-006: identidade de `oidc.ts` atualizada por refresh reproduzível; `manifestRevision`, `sourceSetSha256` e `collectionCommit` separados; contrato cobre mutação não registrada e preview do manifesto anterior preservada; coverage anterior segue STALE.
- [x] (2026-09-12T19:34:00Z) MA-03/DEEP-02: intake de `OBSERVABILITY-EVIDENCE`, `SOAK` e `ROLLBACK`; OPS-001 e PERF-001 ligados a produtores reais; seções `soak`/`rollback` do artefato final exportam status e referências; testes sintéticos positivos e negativos no caminho público.
- [x] (2026-09-12T19:34:30Z) MA-01: controlador legado arquivado com digest; state/backlog/log/verification reconciliados; gate T4 `IMPLEMENTATION_READY` criado para a frente local; checker canônico aprovou os registros correntes.
- [x] (2026-09-12T19:43:43Z) MA-04 (Agente 2): entrega local conferida e handoff registrado em `docs/2026-09-12-ma04-status-e-proxima-tarefa.md`; duas fixtures de evidência sintaticamente inválidas identificadas; rework `MA-04-R1` proposto com aceite próprio, sem autoaprovação. O controle `.agent` permaneceu com o Lead.
- [x] (2026-09-12T19:52:20Z) Crítica fresca read-only executada (I1, sem shell): nenhuma fabricação/threshold reduzido; achados materiais tratados — verificação de alvo agora alcança PASS sob flag autorizada, painel de coverage recebeu nota de reconciliação e o refresh de identidade ganhou teste da semântica preserve/append; gate v2 supersede v1.
- [x] (2026-09-12T20:15:29Z) Revisão independente read-only MA-01/02/03 executada com shell: MA-01 `APPROVE` local (digests do arquivo e fingerprints de gate conferem; checker canônico PASS 11/11; docs:validate PASS); MA-02 `APPROVE` no escopo original (identidade reproduzível, mutação não registrada rejeitada, preservação append verificada) com três follow-ups registrados; MA-03 `REJECT` por promoção de critério via flag sem autenticidade, reproduzido de forma adversarial. Pareceres registrados no ledger.
- [x] (2026-09-12T20:30:00Z) MA-03-R1: removida a promoção por `TRIPLE_A_VERIFY_TARGET_EVIDENCE`; envelopes operacionais v2 exigem attestation verificada por `gh` contra workflow fixado em código, vínculo de alvo e dimensões por critério; known-bads (flag isolada, produtor bem-formado não confiável, raiz de confiança no envelope, artefato irrelevante, SHA/tipo/janela errados, verificador rejeitado/indisponível) e known-good simulado isolado cobertos no caminho público; gate r3 revalida o escopo local e o release permanece `BLOCKED`/`NOT PROVEN`.
- [x] (2026-09-12T21:10:00Z) MA-03-R2: revisão independente de R1 deu `REJECT` material (autenticação vinculada ao caminho e não aos bytes consumidos; `status=PASS` autodeclarado aceito com artefato irrelevante; suíte sobrescrevia o artefato canônico). Reparo vincula o digest autenticado aos bytes lidos uma única vez, exige medições/unidades e política de suficiência fixada no gate (`PENDING_AUTHORITY`, sem inventar alvos/limiares), torna a suíte hermética com regressão do artefato canônico e alinha o gerador à avaliação canônica. 41/41 gate, 6/6 pacote, `docs:validate`, `git diff --check` e eslint limpos; artefato canônico `ea4a3d3c…` byte-idêntico; release segue `BLOCKED`/`NOT PROVEN`. Evidência: `artifacts/remediation/MA-03-R2/attempt-1/`.
- [x] (2026-09-12T21:18:49Z) MA-03-R2 reconciliação de identidade: a divergência entre os cinco hashes do handoff e as fontes atuais foi comprovada como **alteração posterior** (endurecimento pós-registro em `attempt-2`, evento `EVT-TRIPLE-A-MA03R2-HARDENING-20260912`), não erro de transcrição; `attempt-1` foi preservado e seus `SHA256SUMS` verificam. A versão endurecida (`e80864f3`/`dc7be7bb`/`6cfcf376`/`c4e3dedb`/`93a18d4b`) foi reexecutada com outputs exclusivos: 42/42 gate, 6/6 pacote, matriz CLI 12/12, coerência gate/gerador, controle negativo de falha sem tocar o canônico; sem drift em 13 arquivos; canônico `ea4a3d3c…` inalterado. Snapshot neutro para revisão: `artifacts/remediation/MA-03-R2/attempt-3-reconciliation/` (`RECONCILIATION.md`, `REVIEW_PACKET.md`).
- [x] (2026-09-12T21:45:00Z) Parecer independente I1 de MA-03-R2: `REJECT` material por dois defeitos locais do contrato de suficiência — **R2-F1** dimensão duplicada sobrescreve medição reprovada (`measurementsById.set`) e transforma FAIL em PASS; **R2-F2** guarda `spec.min === null && spec.max === null` deixa `undefined` escapar e política `APPROVED` sem limites pode retornar PASS. Registrado em `docs/2026-09-12-ma03-r2-parecer-independente.md` e em `.agent/verification.jsonl#VER-MA03-R2-INDEPENDENT-REVIEW-REJECT-20260912`; não foi bypass do CLI com a política real `PENDING_AUTHORITY`.
- [x] (2026-09-12T21:45:10Z) MA-03-R3 ativado como rework estreito de R2-F1/F2, com ownership/allowlist e janela registrados em `.agent` (`EVT-TRIPLE-A-MA03R3-ACTIVATED-20260912`) e baseline idêntico ao parecer (`e80864f3`/`dc7be7bb`/`6cfcf376`/`c4e3dedb`/`28f9e9bc`; canônico `ea4a3d3c…`; Quality Bar `26ff154d…`; manifest `--check` exit 0).
- [x] (2026-09-12T21:50:28Z) MA-03-R3 implementado e verificado: duplicatas de dimensão rejeitadas antes de qualquer sobrescrita (também sob política pendente) e política aprovada passa a exigir ao menos um limite numérico finito, com `null`/`undefined` como lado ausente e rejeição de tipos inválidos/`NaN`/`±Infinity`/intervalo invertido, preservando limites unilaterais e fronteiras inclusivas. Probe do parecer antes (PASS indevido) → depois (FAIL) nos dois casos; gate 53/53, pacote 7/7, matriz CLI 13/13 (com duplicata), coerência gate/gerador, controle negativo de falha, `docs:validate`, `git diff --check`, eslint e manifest `--check` limpos; canônico `ea4a3d3c…` e Quality Bar `26ff154d…` inalterados; fingerprints finais `6a630d44`/`75dca13a`/`6cfcf376`/`f24d43ec`/`c20155a3`. Evidência: `artifacts/remediation/MA-03-R3/attempt-1-20260912T2144Z/`.
- [x] (2026-09-12T22:49:00Z) Parecer independente I1 de MA-03-R3 obtido (APPROVE local) e **integrado**: 48/48 conteúdos de `raw-evidence.json` conferidos por sha256 e 8/8 hashes do parecer batem no worktree (canônico `ea4a3d3c…`, Quality Bar `26ff154d…`); ponteiro substituído por `MA-02-F-NATIVE` em state/backlog/ExecPlan/ledgers; release BLOCKED e `PENDING_AUTHORITY` preservados.
- [x] (2026-09-12T22:49:00Z) MA-02-F-NATIVE implementado: descoberta AST canônica extraída em `discoverNativeTestSources` e reutilizada por validação e refresh; `nativeTests` reconciliados na revisão 3 (worker 11→12, API 71→73), `executionInputs` 2116→2119 (`530835b4…`); `--check` detecta divergência sem escrever, refresh é idempotente (segunda execução noop) e o manifesto anterior foi preservado byte a byte; testes 5/5, 11/11, 6/6 e eslint focado limpos; falha pré-existente de `run-native-critical-coverage.test.mjs` registrada como limitação. Evidência: `artifacts/remediation/MA-02-F-NATIVE/attempt-20260912T2210Z/`; status IMPLEMENTED / REVIEW REQUIRED.
- [x] (2026-09-12T23:15:00Z) MA-02-F-NATIVE-R1 implementado: obrigação de inventário nativo derivada de `requiredShards`; `--check` rejeita ausência integral de `nativeTests` (antes exit 0/PASS, depois exit 1/FAIL), null/array/string, shard obrigatório ausente/vazio, omissões, duplicatas, shard errado e entradas fora de `executionInputs`; formato legado sem obrigação nativa aceito e testado; testes 13/13, 7/7 e 5/5; `critical-source-identity` `d2136513…`→`475a2e9f…`; manifesto revisão 3 inalterado. Evidência: `artifacts/remediation/MA-02-F-NATIVE-R1/attempt-20260912T2310Z/`.
- [x] (2026-09-13) MA-02-F-NATIVE-R1 revisado e supersedido pelas rodadas F-DISPATCH/rev27; histórico preservado nos registros abaixo. Release permaneceu BLOCKED.
- [x] (2026-09-13T17:39:00Z) PROD-003-R1 DONE e aceito (2 runs PASS, I1 APPROVE); tarefa ativa PROD-004 com acao PROD-004:PROD-004-R1-START e gate de entrada; release BLOCKED.
- [x] (2026-09-13T15:52:00Z) PROD-001-R1 DONE e aceito (checker 11/11, semantica I1, gate R1); tarefa ativa PROD-003 com acao PROD-003:PROD-003-R1-START e gate de entrada; release BLOCKED.
- [x] (2026-09-13T15:45:00Z) PROD-001-R1 em execucao: recovery de retomada pos-reauditoria (FAIL/NO-GO, CP-01-06); 47 PROD representados no backlog canonico (001-005 BLOCKED c/ R1, 006-047 TODO) + 5 macro historicos; narrativa rev12/246 e 194 especializadas; acao unica PROD-003-R1 a seguir; release BLOCKED.
- [x] (2026-09-13T13:30:02Z) PROD-001 em execucao: reconciliacao do controle canonicopos-auditoria 13/09 (63/100, FAIL/BLOCKED); marcador e primeiro passo alinhados a `MA05-D5-AND-COVERAGE`; backlog kind corrigido para IMPLEMENT; vinculos PROD-001-047 registrados sem concluir implementacao; release permanece BLOCKED.
- [x] (2026-09-14T00:08:00Z) PROD-001-R2 DONE: reconciliacao 14/09 aceita (checker 11/11, docs:validate, DAG 70, gate R2 supersede R1, critica I1 REJECT tratada + re-revisao focada APPROVE, VER + REVIEW registrados); handoff a PROD-002 002-L; release BLOCKED.
- [x] (2026-09-15T13:51:07Z) PROD-048-R1 verificado localmente: scanner redacting-first encontrou 28/28 candidatos estruturais para revisão em 67 arquivos; testes 4/4, lint, identidade de fontes e SHA256SUMS conferem. Locke REJECT foi preservado como STALE; Lorentz/Averroes não produziram crítica fresh. Sem alterar documentos ou publicar valores; card estacionado BLOCKED aguardando Segurança/DPO.
- [x] (2026-09-15T14:23:20Z) PROD-049-R1 implementado localmente: matriz com cinco contextos, precedência Compose/Helm, runbook, target/owner e oito decisões PENDING_AUTHORITY; testes good/bad 2/2, validadores, guards, docs e SHA256SUMS PASS. Helm v3.15.4, target externo e crítica fresh current permanecem pendentes; nenhum deploy ou serviço iniciado.
- [x] (2026-09-15T14:37:00Z) PROD-049-R1 estacionado BLOCKED: duas tentativas fresh independentes (Peirce/Avicenna) foram encerradas sem veredito; checks locais e pacote hash-bound permanecem, mas Platform/Release e a validação Helm executável continuam pendentes.
- [x] (2026-09-15T14:41:30Z) PROD-019-R1 despachado como frente P0 independente: contrato SSO/identidade será especificado em opções revisáveis, sem provider real, sem associação por email e sem alteração funcional antes de autoridade Produto/Segurança.
- [x] (2026-09-15T15:02:20Z) PROD-019-R1 estacionado BLOCKED: contrato local, validador good/bad 7/7, lint, docs, guards e SHA256SUMS PASS; crítica fresh independente (Epicurus) excedeu 120 s e foi encerrada sem veredito. Product/Security, provider, integração e sessão ERP continuam pendentes.
- [x] (2026-09-15T15:10:10Z) PROD-052-R1 despachado como frente P1 independente: contrato comparativo de expiração de pontos e expiresAt será especificado sem alterar saldos, migrations ou decidir a política de Produto/Financeiro.
- [x] (2026-09-15T15:25:05Z) PROD-052-R1 estacionado BLOCKED: contrato, validador good/bad 8/8, release-gate 53/53, docs, guards, deploy checks e SHA local PASS; crítica fresh independente permaneceu indisponível e Product/Financeiro ainda precisam decidir C1-C6/R1-R6.
- [x] (2026-09-15T15:30:10Z) PROD-027-R1 despachado como preparação contratual explícita apesar da dependência integral PROD-003 BLOCKED: somente matriz/taxonomia/inventário documental, sem jornadas, fixtures, UAT ou alegação de paridade.
- [x] (2026-09-15T15:55:41Z) PROD-027-R1 implementado localmente: contrato, inventário, cenários, invariantes, tracks comerciais, guard good/bad 9/9, lint, docs, release-gate, deploy checks, SHA e checker PASS; a crítica fresh de Erdos permaneceu running por três janelas e foi encerrada sem veredito. Card estacionado BLOCKED aguardando revisão fresh atual/substituto autorizado, Product/QA/domínio e PROD-003.

## Surprises & Discoveries

- Observation: o estado `.agent` ainda identifica `e8d7eaec`, enquanto o repositório está em `31fde3c4`.
  Evidence: `.agent/state.json`; `git rev-parse HEAD`.
  Impact: a evidência anterior permanece histórica e o ponteiro precisa de reconciliação.
- Observation: o run `.gauntlet` `frontend-premium-20260907` é ativo, mas seu estado contém campos e fase rejeitados pelo helper atual.
  Evidence: `gauntlet_state.py validate --repo .`.
  Impact: preservar os arquivos, não sobrescrever o run e tratar a recuperação do controller como GAP-GOV-01.
- Observation: a régua visual exige browser, screenshots e crítico fresco; leitura de fonte não pode aprovar UX.
  Evidence: `design-director/references/visual-qa.md`.
  Impact: o lane visual atual é diagnóstico; aprovação continua bloqueada até render atual.
- Observation: o controlador `.agent` legado falhava em 50 verificações canônicas (transições, enums, referências e ausência do gate T4), todas de história anterior ao contrato atual.
  Evidence: `python3 /home/ricardo/.agents/skills/engineering-framework/scripts/check_state.py /home/ricardo/cvg-his-v4` antes da migração; `.agent/archive/20260912-controller-migration/manifest.json`.
  Impact: a história foi preservada byte a byte no arquivo e os registros correntes reiniciaram com RECOVERY, sem reescrever resultados antigos como sucesso.
- Observation: o intake genérico de evidência externa do gate devolve `PARTIAL` mesmo para envelope válido, por exigir verificação independente no alvo.
  Evidence: `scripts/run-triple-a-release-gate.mjs`; `artifacts/remediation/MA-03/attempt-1/artifact-inspection.log`.
  Impact: `OPS-001`, `SOAK` e `ROLLBACK` agora são produzíveis, mas permanecem `PARTIAL` até verificação no alvo; não há atalho para PASS local.

## Decision Log

- Decision: usar o modo multi-workstream com dois implementadores de arquivos disjuntos e um scout visual read-only.
  Context: OpenAPI, workflow de release e diagnóstico visual não compartilham arquivos nem contratos mutáveis.
  Alternatives: execução totalmente sequencial.
  Reason: reduz tempo do caminho crítico sem permitir escritores concorrentes nos controles compartilhados.
  Consequences: o lead inspeciona diffs, executa regressão integrada e críticos frescos não aprovam o próprio trabalho.
  Date/Author: 2026-09-12 / lead.
- Decision: não alterar SLO, RPO/RTO, exposição operacional ou comportamento de produto sem owner/autoridade.
  Context: esses valores mudam risco e operação do sistema.
  Alternatives: inferir metas técnicas locais.
  Reason: a auditoria identificou ausência de aprovação e evidência target.
  Consequences: correções locais avançam; gates externos continuam `BLOCKED / NOT PROVEN`.
  Date/Author: 2026-09-12 / lead.
- Decision: separar identidade de fonte, revisão do manifesto e commit de coleta, sem SHA autorreferente.
  Context: o manifesto congelava hashes por arquivo com um `head` histórico; a política admitia confusão entre identidade da fonte e commit do manifesto.
  Alternatives: substituir apenas o hash de `oidc.ts` e o `head`, sem contrato de conjunto.
  Reason: identidade verificável exige digest do conjunto de fontes e trilha de refresh auditável.
  Consequences: `manifestRevision`, `sourceSetSha256` e `collectionCommit` são distintos; o refresh preserva os bytes anteriores e a coverage antiga permanece STALE.
  Date/Author: 2026-09-12 / lead.
- Decision: migrar o controlador legado para o contrato canônico preservando os bytes originais.
  Context: 50 falhas canônicas históricas, todas anteriores ao contrato de runtime atual, bloqueavam a recuperação de controle sem indicar defeito no produto.
  Alternatives: reescrever os ledgers históricos ou ignorar o checker.
  Reason: a regra é preservar história com procedência e validar o controle corrente.
  Consequences: `.agent/archive/20260912-controller-migration/manifest.json` guarda os SHA-256 dos arquivos anteriores; o gate T4 `IMPLEMENTATION_READY` passa a governar a frente local.
  Date/Author: 2026-09-12 / lead.
- Decision: criar um caminho autorizado e explícito para PASS de envelope operacional (`TRIPLE_A_VERIFY_TARGET_EVIDENCE=1`).
  Context: a crítica independente mostrou que todo envelope genérico permanecia `PARTIAL`, tornando `OPS-001`/`FINAL-001` estruturalmente inalcançáveis mesmo com verificação de alvo legítima.
  Alternatives: deixar o caminho permanentemente `PARTIAL` ou autoaprovar envelopes no intake.
  Reason: o default precisa continuar fail-closed, mas a verificação de alvo autorizada deve poder satisfazer o critério — como CI e attestations já fazem.
  Consequences: sem a flag, `PARTIAL`; com a flag, envelope validado vira `PASS`; teste sintético cobre os dois caminhos e o gate v2 supersede o v1.
  Date/Author: 2026-09-12 / lead.
- Decision: registrar o parecer crítico como I1 estático com execução pendente, sem promover APPROVE.
  Context: a sessão fresca de crítica não dispunha de ferramenta de execução e não pôde reproduzir os comandos focados; ela retornou BLOCKED por limitação de instrumento.
  Alternatives: aceitar a leitura estática como aprovação final ou descartar o parecer.
  Reason: separação entre implementação e aceitação; parecer sem execução não é aprovação válida.
  Consequences: o estado da frente permanece `IMPLEMENTED / REVIEW REQUIRED`; a ação ativa continua a revisão fresca com execução.
  Date/Author: 2026-09-12 / lead.
- Decision: confirmar Agente 2 como owner do rework MA-04-R1, sem editar seus arquivos nem ampliar escopo.
  Context: o handoff do Agente 2 registrou entrega MA-04 e duas fixtures de evidência inválidas; o pacote está `IMPLEMENTED / REVIEW REQUIRED`.
  Alternatives: o Lead absorver o rework ou declarar MA-04 encerrado.
  Reason: ownership disjunto preservado e builder não autoaprova.
  Consequences: MA-04-R1 deve ocorrer em nova tentativa com allowlist, janela de testes sem install concorrente e crítico fresco com execução; MA-08/MA-05 não estão liberados por essa entrega.
  Date/Author: 2026-09-12 / lead.
- Decision: superseder a promoção por `TRIPLE_A_VERIFY_TARGET_EVIDENCE` e exigir attestation externa mais conteúdo por critério para PASS operacional (MA-03-R1).
  Context: a revisão independente reproduziu que um envelope declarado pelo próprio candidato, com produtor/verificador arbitrários e artefato irrelevante, virava `PASS` de critério sob a flag; estrutura e integridade não provam autenticidade, independência nem resultado operacional.
  Alternatives: comparação textual produtor×verificador, allowlist dentro do envelope, `verified=true`/`CONFIRMED` autodeclarado, nova flag equivalente ou chave confiável vinda do candidato — todas rejeitadas por não criarem raiz de confiança.
  Reason: a raiz existente e reexecutável do projeto é a attestation GitHub OIDC verificada por `gh attestation verify`; o contrato v2 separa integridade, autenticidade, adequação semântica e aceite humano, e o PASS exige as três primeiras camadas.
  Consequences: a flag foi removida do código; envelopes operacionais v2 exigem `github-artifact-attestation`/`gh-attestation-verify`, workflow assinante fixado em `TRUSTED_OPERATIONAL_SIGNER_WORKFLOWS`, vínculo de alvo e dimensões obrigatórias por critério; sem verificação confiável o resultado é `PARTIAL`/`FAIL`, nunca `PASS`; a escolha dos produtores MA-23/25/28 e o anchor fora do GitHub permanecem pendentes de autoridade.
  Date/Author: 2026-09-12 / lead.
- Decision: registrar os pareceres independentes e o rework sem converter `IMPLEMENTATION_READY` em aprovação de produto.
  Context: MA-01 e MA-02 receberam `APPROVE` no escopo original; MA-03 recebeu `REJECT` material e foi reparado como MA-03-R1.
  Alternatives: autoatribuir `APPROVE` ao reparo ou reabrir MA-01/MA-02.
  Reason: aceitação exige crítico fresco distinto do autor; o gate local permanece habilitador de BUILD, não certificação.
  Consequences: gate r3 revalida o escopo local; a próxima ação é revisão fresca de MA-03-R1; release segue `BLOCKED`/`NOT PROVEN`.
  Date/Author: 2026-09-12 / lead.

## Deferred Findings

Registrados sem conclusão e sem bloquear o aceite original de MA-02 já concedido:

- MA-02-F1 (Medium): cross-validar `manifestRevision` com a última entrada de `scopeHistory` e a cadeia `previousSourceSetSha256`/manifesto preservado; hoje `--check` aceita revisão 1 convivendo com 32 entradas históricas.
- MA-02-F2 (Medium): tratar inclusão de novos testes/execution inputs com verificação de completude inventário↔manifesto; `applyRefresh` fixa `added/removed` vazios e não há detector de arquivo crítico novo.
- MA-02-F3 (Low): impedir que o CLI de refresh execute `main()` no import; o teste unitário dispara um `mode:noop` real ao importar o módulo.
- MA-03-F1 (decisão pendente de autoridade): definir quais workflows podem produzir/attestar cada evidência operacional (MA-23/25/28) e o anchor para evidência fora do GitHub Actions; enquanto pendente, o PASS operacional real permanece `PARTIAL`.
- MA-03-F2 (decisão pendente de autoridade): política de revogação de attestation publicada; hoje a mitigação é emitir evidência substituta e revalidar.
- Ambiente: registros anteriores declaram `node 22`, não verificável nos logs; a execução de MA-03-R1 em 12/09/2026 usou `node v24.20.0` e `vitest 4.1.11`. O install do MA-06 em 19:37 UTC atualizou `vitest 3.2.7 → 4.1.11`; registros antigos permanecem históricos e não foram reescritos.

## Outcomes & Retrospective

A primeira onda local foi integrada sem baixar a régua: API-01 e CICD-01 receberam `APPROVE` independente, o pacote visual recebeu `APPROVE` como infraestrutura de evidência (não como aprovação da UI), typecheck/lint e a regressão ampla passaram. Uma falha intermitente do outbox revelou duas leituras de relógio no mesmo evento; a captura única de `createdAt` estabilizou 3/3 repetições e a suíte completa subsequente. O programa permanece bloqueado por evidência exata do candidato, PostgreSQL/browser, k6, recuperação, target, UAT e autoridades externas.

A frente MA-01/02/03 fechou os três defeitos locais de aprovação: a identidade das fontes críticas voltou a ser verificável e passou a detectar mutação não registrada; o agregador passou a ter produtor legítimo para observabilidade, soak e rollback; e o controlador persistente foi reconciliado sob o contrato canônico, com a história legada preservada. Isso não eleva a nota do ERP nem autoriza release: coverage real, CI exato, target, UAT e autoridade continuam pendentes e são os próximos bloqueios materiais.

A revisão independente com shell aprovou MA-01 e MA-02 no escopo original e rejeitou MA-03: a promoção por flag permitia que declaração do próprio candidato virasse PASS de critério. O reparo MA-03-R1 removeu o atalho e passou a exigir attestation externa reexecutável mais conteúdo adequado ao critério; o known-bad foi reproduzido antes e depois e o release continua bloqueado. A lição operacional: integridade de arquivos, autenticidade de procedência, adequação semântica e aceite humano são camadas distintas e não podem ser colapsadas em uma flag.

## Context and Orientation

O repositório é um monorepo pnpm com API em `apps/api`, SPA em `apps/spa`, worker em `apps/worker`, módulos em `packages`, CI em `.github/workflows` e controles T4 em `.agent`. A auditoria corrente é `docs/2026-09-12-auditoria-repositorio-cvg-his-v4.md`; o roadmap e o backlog documental adjacentes definem marcos e cobertura de GAPs. `.agent/backlog.json` é a fonte operacional de status.

## Mapas de controle

O despacho desta frente (MA-01–MA-03) mapeia pacotes do roadmap, compromissos REM e itens operacionais sem criar um segundo backlog. O roadmap `docs/2026-09-12-roadmap-backlog-multiagente-release-triplo-aaa.md` define os 35 pacotes; a coluna operacional aponta o item de `.agent/backlog.json` que carrega o status.

| Pacote | REM | Item operacional | Estado real desta frente |
| --- | --- | --- | --- |
| MA-01 | REM-001/002 | `TRIPLE-A-BASELINE` + `TRIPLE-A-RELEASE-CONTROL` | APPROVE local na revisão independente; controles reconciliados |
| MA-02 | REM-006 (parcial) | `TRIPLE-A-RELEASE-CONTROL` | APPROVE no escopo original; follow-ups MA-02-F1..F3 registrados; coverage real é MA-05 |
| MA-03 | REM-012/028 (parcial) | `TRIPLE-A-RELEASE-CONTROL` | REJECT independente de R1 e de R2; R3 fechou R2-F1/R2-F2 (dimensão duplicada e política aprovada sem limites) preservando bytes vinculados, suficiência `PENDING_AUTHORITY`, testes herméticos e gerador canônico; `IMPLEMENTED / REVIEW REQUIRED`; produtores MA-23/25/28 e raiz de confiança pendentes |
| MA-04 | REM-003 | `TRIPLE-A-RELEASE-CONTROL` | IMPLEMENTED / REVIEW REQUIRED; rework de evidência MA-04-R1 pendente (Agente 2) |
| MA-05 | REM-006 | `TRIPLE-A-RELEASE-CONTROL` | não iniciado; depende de MA-02/04/06/11 |
| MA-06 | REM-013 | `TRIPLE-A-SUPPLY-CHAIN` | não iniciado; owner Agente 3 |
| MA-07 | REM-006/012 | `TRIPLE-A-RELEASE-CONTROL` | não iniciado; locks CI-CONFIG |
| MA-33 | REM-026/027 | `TRIPLE-A-SUPPLY-CHAIN` | não iniciado; owner Agente 3 |

MA-10, MA-11, MA-12 e demais pacotes permanecem no roadmap sem ativação nesta frente; MA-11 exige alocação explícita de ambiente e recursos.

## Scope and Constraints

- In scope: documentação, contratos, testes, código/configuração local, integração e verificações seguras de todos os GAPs listados.
- Out of scope sem nova autoridade: deploy de produção, mutação de branch rules, credenciais/providers reais, PHI, drills destrutivos em infraestrutura compartilhada e certificação final.
- Applicable instructions: skills `gauntlet-loop`, `orchestrate`, `engineering-framework` e `design-director`, mais documentos de governança citados em `.agent/state.json`.
- Requirements/decisions: auditoria, roadmap, backlog, `docs/triple-a/MASTER_PROMPT_STATE_OF_ART.md` e Quality Bar existente.
- Tier/risk/blast radius: `T4_CRITICAL`, `CRITICAL`, `CROSS_SYSTEM` por dados clínicos/financeiros, segurança e release.
- Authorization constraints: somente mudanças locais e verificações reversíveis; decisões humanas/externas permanecem bloqueantes.

## Architecture and Interfaces

Preservar o monólito modular API/SPA/worker, isolamento tenant/RLS, transações, idempotência, autenticação, contratos HTTP e publicação por digest. Os primeiros slices atacam duas fronteiras estáveis: `auth runtime ↔ OpenAPI` e `gate/scan ↔ push de imagem`. Mudanças de hotspots serão incrementais, por domínio, depois de contratos e cobertura crítica estabilizados.

## Milestones

### Milestone 1 — Baseline e controles reconciliados

- Outcome: documentos e ponteiros descrevem o candidato atual sem apagar histórico; o controlador canônico governa a frente local e o manifesto de fontes críticas é verificável.
- Scope/dependencies: MA-01/MA-02; docs, `.agent`, manifesto de identidade e controlador legado.
- Demonstration: `pnpm docs:validate` PASS; checker canônico PASS; `node --test scripts/critical-source-manifest.test.mjs` PASS com mutação não registrada rejeitada; `--check` reproduzível do refresh.
- Acceptance/evidence: REM-001/002/006 (parcial); evidências em `.agent/verification.jsonl`, `artifacts/remediation/MA-01/`, `artifacts/remediation/MA-02/`; REM-006 não é encerrado sem MA-05.

### Milestone 2 — Contratos e release fail-closed

- Outcome: auth crítica está no OpenAPI; scan precede a publicação de quarentena e nenhum tag/manifesto/pacote de release é consumível antes do gate final; o agregador tem produtores definidos para observabilidade, soak e rollback.
- Scope/dependencies: MA-03/MA-04; REM-003/004/012/028; arquivos disjuntos.
- Demonstration: validators e testes known-bad focados; fixtures sintéticas do agregador.
- Acceptance/evidence: nenhum endpoint crítico omitido; somente quarentena pode ser publicada antes do gate; nenhum artefato consumível antes do PASS; `OPS-001`, `SOAK` e `ROLLBACK` com intake e mapeamento verificados em `artifacts/remediation/MA-03/`.

### Milestone 3 — Dados, produto e operação comprovados

- Outcome: REM-005–011 e REM-013–029 produzem evidência de runtime/target nas fronteiras aplicáveis.
- Scope/dependencies: sequência M2–M5 do roadmap.
- Demonstration: PostgreSQL, browser, k6, recovery, provider sandbox, Helm/container e observabilidade.
- Acceptance/evidence: zero skip crítico, zero Critical/High e evidência no mesmo SHA/digest.

### Milestone 4 — Recertificação e decisão

- Outcome: o candidato é aprovado ou honestamente bloqueado por condições externas restantes.
- Scope/dependencies: todos os marcos anteriores.
- Demonstration: gate Triple-A completo e críticas independentes frescas.
- Acceptance/evidence: >=97, críticas >=95, P0=0 e autoridade formal.

## Plan of Work

A frente executável corrente é `TRIPLE-A-RELEASE-CONTROL:CI-282-ROOT-CAUSE-REVIEW`; `PROD-062:PROD-062-FRESH-CRITIC-AUTHORITY-20260915` permanece aguardando revisão fresh e autoridade após preparação local enquanto PROD-010 permanece BLOCKED. O CI #282 terminou FAILURE no candidato documental `0d230b65`: Critical Coverage Gate e Performance/k6 falharam, e a matriz visual local registrou 29/29 no Chromium contra 0/29 em Firefox e WebKit. O rerun remoto foi concluído sem alterar thresholds, denominador, escopo ou trust root; o próximo slice único é inspecionar artefatos e logs candidate-bound para separar defeito determinístico de infraestrutura/runner. PROD-027 continua em espera por crítica fresh e Product/QA/domínio; PROD-019, PROD-048, PROD-049 e PROD-052 aguardam suas autoridades; D1/S3 de PROD-014 aguardam QA/release. Cada slice segue `BUILD → focused test → critic → fix → regression → integrate`, e o release continua bloqueado.

## Concrete Steps

From `/home/ricardo/cvg-his-v4`:

1. [TRIPLE-A-RELEASE-CONTROL:CI-282-ROOT-CAUSE-REVIEW] Inspecionar os artefatos e logs candidate-bound do CI #282; separar falha determinística de infraestrutura/runner e decidir um único rework, sem alterar thresholds, denominador, escopo ou identidade.
2. [PROD-062:PROD-062-FAMILY-VERIFIERS-20260915] [CONCLUÍDO LOCALMENTE] Implementar e testar os contratos criterion-specific por família, atualizar o gerador para usar o mesmo validador e produzir pacote local digest-bound; preservar PROD-010, thresholds, trust root e bloqueio externo.
3. [PROD-027:PROD-027-PRODUCT-QA-DOMAIN-OWNER-20260915] Obter crítica independente fresh atual ou substituto autorizado e decisão formal de Product/QA/donos de domínio; preservar PROD-003 como dependência integral e não alegar paridade.
4. [PROD-048:PROD-048-DPO-OWNER-20260915] Obter owner Segurança/DPO e decisão restrita sobre os 28 digests/localizações, exemplos sintéticos, ACL, retenção, restauração e destino durável; não expor valores.
5. [PROD-014:PROD-014-D1-20260915] Após S1/S2 aprovados condicionalmente por críticas fresh, obter decisão QA/release sobre a semântica normativa das identidades duplas antes da coleta final; ausência mantém S3 bloqueada.
6. [PROD-014:PROD-014-S3] Congelar inputs, refresh do manifesto, recolher/promover os cinco shards, renovar SQL/Vue, rodar checker e crítica fresca.
7. [PROD-002:PROD-002-R1] Em trilha administrativa, obter retenção/ACL/restauração externa; [PROD-061:R2-INCIDENT] obter ACK, auditoria de efeitos e encerramento do incidente de DB.
8. Manter o release bloqueado; promoção, CI remoto, target, UAT, providers e operação exigem os cartões/autoridades do roadmap vigente.

## Validation and Acceptance

| Criterion | Required | Procedure/environment | Expected observation | Evidence destination |
| --- | --- | --- | --- | --- |
| QB-AAA-01 | Yes | gate estrito no SHA candidato | global>=97, critical>=95, P0=0 | artefato Triple-A corrente |
| QB-DOCS-01 | Yes | estrutura documental no worktree; `pnpm docs:validate` após commit candidato | estrutura PASS agora; snapshot stale bloqueia até poder ser vinculado ao SHA candidato | `.agent/verification.jsonl` |
| QB-API-01 | Yes | OpenAPI validator + known-bad + runtime contract | equivalência auth crítica | `.agent/verification.jsonl` |
| QB-CICD-01 | Yes | supply-chain validator + workflow tests | scan antes da quarentena; manifesto/pacote somente após o gate | `.agent/verification.jsonl` |
| QB-UX-01 | Yes | Playwright/render/inspection/critic | matriz atual sem Critical/High | pacote visual SHA-bound |
| QB-OPS-01 | Yes | k6/restore/game day/soak no target | metas aprovadas observadas | pacote operacional target |
| QB-CTRL-01 | Yes | checker canônico do controlador + fixtures de histórico | controle corrente PASS; história legada preservada com digest | `.agent/verification.jsonl`; `artifacts/remediation/MA-01/` |
| QB-IDENT-01 | Yes | `node --test scripts/critical-source-manifest.test.mjs`; `--check` do refresh | identidade PASS; mutação não registrada rejeitada; coverage antiga STALE | `artifacts/remediation/MA-02/` |
| QB-GATE-01 | Yes | testes de intake + execução diagnóstica do agregador | envelope válido aceito; ausência/SHA/digest/procedência bloqueiam; soak/rollback exportam referências | `artifacts/remediation/MA-03/` |

## Risks and Human Decisions

| Risk/decision | Evidence/confidence | Controls | Residual/authority | Trigger |
| --- | --- | --- | --- | --- |
| Publicação ou deploy indevido | workflow audit, alta | local-only, fail-closed, sem push | autoridade de release | antes de registry/deploy |
| Alterar SLO/RPO/RTO sem negócio | auditoria, alta | thresholds congelados | OPS/Produto | antes de benchmark/drill final |
| Evidência de outro SHA | histórico `.agent`, alta | hash/digest e freshness | lead/QA | qualquer mudança material |
| UI aprovada por fonte | visual QA contract, alta | screenshots + crítico fresco | UX/Produto/UAT | após render atual |

## Idempotence and Recovery

Antes de retomar, ler `.agent/state.json`, este plano, `.agent/backlog.json`, tails dos ledgers e `git status`. Não repetir push, deploy, migration ou provider call por ausência de log. Os validators locais e testes são reexecutáveis; recursos de banco/browser devem usar identidade descartável e cleanup verificado. Em falha parcial, preservar diff/log, diagnosticar e avançar somente o próximo passo singular.

## Artifacts and Evidence

- `docs/2026-09-12-auditoria-repositorio-cvg-his-v4.md`: baseline 69/100 e GAPs; não é aprovação.
- `docs/2026-09-12-roadmap-erp-state-of-art-triplo-aaa.md`: marcos/dependências.
- `docs/2026-09-12-backlog-correcao-gaps-triplo-aaa.md`: contrato executivo REM-001–030.
- `.agent/verification.jsonl`: resultados atuais; evidência anterior ao diff não prova o candidato final.
- `artifacts/remediation/MA-01/attempt-1/`: checker, `docs:validate`, fixtures de snapshot e manifesto de migração do controlador.
- `artifacts/remediation/MA-02/attempt-1/`: reprodução, refresh, `--check`, contrato e manifesto anterior preservado com SHA-256.
- `artifacts/remediation/MA-03/attempt-1/`: testes sintéticos do intake, execução diagnóstica do agregador e inspeção do artefato exportado.
- `artifacts/remediation/MA-03-R2/attempt-1/`: preservação da reprodução R1 (`r1-critic-evidence/`), notas de evidência, matriz CLI adversarial de 12 casos, logs focais e fingerprints antes/depois; `REVIEW REQUIRED` (auto-evidência I0).
- `artifacts/remediation/MA-03-R2/attempt-2/`: endurecimento pós-registro (status de verificador irreconhecível → FAIL, restauração completa do ambiente, separação declared/verified, correções do doc) com logs próprios; `REVIEW REQUIRED`.
- `artifacts/remediation/MA-03-R2/attempt-3-reconciliation/`: reconciliação de identidade (classificação de alteração posterior, hashes antes/depois, reexecução focal/adversarial, controle negativo de falha, fingerprints e `REVIEW_PACKET.md` neutro para o crítico).
- `artifacts/remediation/MA-03-R3/attempt-1-20260912T2144Z/`: rework de suficiência R2-F1/R2-F2 com probe antes/depois, 53/53 gate, 7/7 pacote, matriz CLI 13/13 (inclui duplicata), controle negativo, fingerprints e `REVIEW_PACKET.md`; `REVIEW REQUIRED`.
- `artifacts/remediation/MA-01/attempt-1/critique-report.md`: parecer independente I1 read-only, limitações e achados materiais tratados.
- `artifacts/remediation/MA-02/attempt-1/refresh-unit.log`: teste da semântica preserve/append do refresh de identidade.
- `docs/engineering/critical-coverage-scope.json`: identidade, revisão e conjunto de fontes críticas após MA-02; coverage anterior permanece STALE.

Plan revision note, 2026-09-12: plano criado após auditoria independente do repositório e recuperação do controle persistente; substitui o ponteiro operacional antigo sem apagar o plano histórico.
Plan revision note, 2026-09-12 (MA-01/02/03): primeira frente local implementada e verificada; identificadores MA↔REM↔operacional mapeados; história legada do controlador preservada em `.agent/archive/20260912-controller-migration/`; próxima ação é a crítica fresca read-only.
Plan revision note, 2026-09-12 (MA-03-R1/R2): a crítica fresca de R1 emitiu `REJECT` material; o reparo R2 vincula autenticação aos bytes consumidos, separa suficiência (`PENDING_AUTHORITY`), torna a suíte hermética e alinha o gerador; a próxima ação passa a ser a crítica fresca read-only de R2.
Plan revision note, 2026-09-12 (MA-03-R2 reconciliação): a divergência de hashes do handoff foi comprovada como alteração posterior (attempt-2) com attempt-1 preservado; a versão endurecida foi reexecutada e estável, e o pacote neutro `attempt-3-reconciliation/REVIEW_PACKET.md` fica apontado para a revisão fresca, sem autoaprovação.
Plan revision note, 2026-09-12 (MA-03-R2 hardening): revisão pós-registro do R2 acrescenta veredito de verificador inválido como `FAIL`, remoção de todo `TRIPLE_A_*` criado no teste com prova de restauração do ambiente, separação `declared_status`/`verified_status`/`verification_layers` no pacote e correção do doc (incidente do artefato canônico e fonte oficial do `gh attestation verify`). Fingerprints finais do alvo da revisão: gate `e80864f3`, testes `dc7be7bb`, gerador `6cfcf376`, doc `93a18d4b`; `attempt-1` preservado e verificado por `SHA256SUMS`. A próxima ação permanece a crítica fresca read-only de MA-03-R2, agora sobre os hashes finais; MA-04 segue com aceite de integração separado e MA-08/MA-05 sem liberação automática.
Plan revision note, 2026-09-12 (INTEGRATE-R3 / MA-02-F-NATIVE): o APPROVE I1 de MA-03-R3 foi integrado após conferência de 48/48 conteúdos digest-bound e dos 8 hashes do parecer, sem recriar crítica; o inventário nativo foi reconciliado pelo tooling com descoberta AST compartilhada (revisão 3: worker 12, API 73, executionInputs 2119), preservando `files`/`sourceSetSha256`, `requiredShards`, `processTests`, thresholds 82/85 e as 193 fontes especializadas. A próxima ação é a revisão independente de MA-02-F-NATIVE; MA-05-S1 só é re-despachado após o aceite, com novo runId. Release permanece `BLOCKED` / `NOT PROVEN`.
Plan revision note, 2026-09-12 (MA-02-F-NATIVE-R1): o achado independente F-NATIVE-R1-01 foi reparado — a obrigação de inventário nativo passa a derivar de `requiredShards`, `--check` rejeita ausência integral e formatos inválidos de `nativeTests`, e a validação é sempre chamada (sem caminho divergente), preservando o formato legado sem obrigação nativa com contrato testado. Manifesto revisão 3 e invariantes de escopo permanecem; a próxima ação é a revisão independente de R1 e, após o aceite, MA-02-F-DISPATCH e congelamento do candidato de S1. Release `BLOCKED` / `NOT PROVEN`.
Plan revision note, 2026-09-13 (round 1 de reparos e shards): MA-02-F-DISPATCH reconciliou o inventario Vitest por descoberta AST fail-closed (manifesto revisao 4: vitestTests 322->328, executionInputs 2119->2123, files/sourceSet/thresholds e 193 fontes inalterados); o conversor V8 passou a decidir a semantica de endOffset pela versao instalada e a detectar estruturalmente o wrapper SSR do Vitest 4, com o wrapper de linha zero corrigido; a higiene de shard separa suites de banco (`*.integration.test.ts`) e injeta `REQUIRE_TEST_DB=1` na integracao, eliminando o skip silencioso; os contratos de medicao entraram no CI obrigatorio. Primeiros shards reais: `vitest-unit` publicado `passed` (`0af291c9`, 225 arquivos/2517 testes/0 skip) e `native-worker` candidato `passed` (`9567f566`), ambos bound ao manifesto `37bf7324` e HEAD `324099e5`. `vitest-integration`, `native-api` e `critical-process` ficam BLOCKED por ambiente (MA-11); 193 especializadas e 18 type-only permanecem. A proxima acao e a revisao independente fresca da rodada (`FRESH-REVIEW-MA05-ROUND1`); release `BLOCKED` / `NOT PROVEN`.
Plan revision note, 2026-09-13 (round 1 pos-critica): a critica independente da rodada atribuiu 6/10 e materializou quatro lacunas (binding stale de ci.yml nos shards por edicao pos-coleta, classificacao de shard fora de executionInputs, escopo SPA fora do fail-closed e digest incorreto no relatorio). A versao corrigida inclui apps/spa na descoberta e executa as 15 suites no shard unit (240 arquivos/2694 testes, `910bb7d0`), adiciona classificacao/include a executionInputs (manifesto revisao 5, 343 suites, 2126 inputs), recolhe os shards nativos (`1bb9fe57`) e regenera a identidade. A proxima acao e a critica fresca round 2; release `BLOCKED` / `NOT PROVEN`.
Plan revision note, 2026-09-13 (adjudicacao final da rodada 1): a adjudicacao independente executavel aprovou C1-C5 e atribuiu 9,5/10 a frente local (inventario Vitest fail-closed com 15 suites SPA executadas, conversor V8 version-aware com majors futuros fail-closed, higiene unit/integration, shards `97f7c3d2`/`25845202` bound ao manifesto revisao 5 com 4252/4252 hashes de input conferidos, pacotes de evidencia auto-contidos). A frente local fica ACEITA; release e certificacao continuam `BLOCKED` / `NOT PROVEN`. A proxima acao e resolver MA-11 (ambiente isolado e binarios) para os tres shards restantes e decidir D5/D7 sem reduzir thresholds.
Plan revision note, 2026-09-13 (rodada 2 - ambiente, 5/5 shards e D7): MA-11 foi atendido no escopo local com o runtime privado (PostgreSQL 16 e Redis 7) e banco efemero isolado por socket; 16 fontes executadas fora do inventario foram reconciliadas (manifesto revisao 6); o coletor de processo passou a registrar observacoes de PIDs mortos sem coverage, mantendo fail-closed para PIDs com coverage parcial; 4 dos 5 shards passaram (`ce596aaa`, `2c790337`, `4c181464`, `8c8ae65d`) e a integracao (`07fc4b29`) registrou 910/916 com 6 falhas pre-existentes de produto/dominio; a promocao D7 foi implementada (`promote-critical-shard.mjs`, 3/3 testes) e os tres candidatos nativos foram promovidos com verificacao completa. O checker agregado caiu de 264 para 243 erros (193 especializadas, 29 metricas, 18 type-only, 3 proveniencia), sem input hash mismatch. A proxima acao e corrigir as 6 falhas de integracao com donos de dominio e implementar D5; release `BLOCKED` / `NOT PROVEN`.
Plan revision note, 2026-09-13 (rodada 3 - integracao e gate funcional): as 6 falhas de integracao foram corrigidas na causa raiz (consumo duplicado do rate limit da API key resolvido com guard unico por request e delegacao do server ao helper; fixtures de outbox/worker alinhadas ao envelope canonico com buildEventEnvelopeMetadata; analisador do contrato SPA/OpenAPI estendido para spreads estaticos e transporte apiRequest). server.ts permaneceu dentro do budget de complexidade (8312<=8335). Apos refresh --source (manifesto revisao 8), os cinco shards foram recolhidos e promovidos: vitest-unit `31c65ef1` (240/2694), vitest-integration `4e119d54` (103/916), native-worker `b6f381b5`, native-api `600df454`, critical-process `080ed80f`. O checker agregado tem 240 erros, todos substantivos (193 especializadas, 29 metricas abaixo de 85, 18 type-only) e zero erros de vinculo. A proxima frente e D5 e a elevacao das metricas criticas; release `BLOCKED` / `NOT PROVEN`.
Plan revision note, 2026-09-13 (rodada 3 final - rev9): apos a limpeza de lint em server.ts/auth-helpers, o manifesto foi para a revisao 9 (`sourceSetSha256 0a5883cb`) e os cinco shards foram recolhidos e promovidos: vitest-unit `bdf8094e` (240/2694), vitest-integration `a5f4d64a` (103/916), native-worker `e073d5cf`, native-api `857d84ec`, critical-process `51d81f9d`. O checker agregado registra 240 erros, todos substantivos (193 fontes especializadas, 29 metricas abaixo de 85, 18 modulos type-only) e nenhum erro de vinculo. O gate funcional esta fechado; a proxima frente e D5 e a elevacao das metricas criticas. Release `BLOCKED` / `NOT PROVEN`.
Plan revision note, 2026-09-13 (PROD-001 - reconciliacao de controle): auditoria 13/09 (63/100, FAIL/BLOCKED, NOT PROVEN) publicada em docs/2026-09-13-relatorio-estado-atual-erp-cvg-his-v4.md com plano executivo, roadmap e backlog PROD-001-047; controle reconciliado (marcador e primeiro passo em MA05-D5-AND-COVERAGE; backlog kind BUILD corrigido para IMPLEMENT); mapa PROD para MA/REM conforme backlog (A01-012, MA-01-35, REM-001-030); nenhuma entrega de implementacao concluida por esta publicacao; proxima acao PROD-002 (identidade e retencao) e PROD-003 (harness); release `BLOCKED` / `NOT PROVEN`.

Plan revision note, 2026-09-13 (PROD-001-R1 - retomada pos-reauditoria): reauditoria checkpoint FAIL/NO-GO incorporada (CP-01-06, R1 em 001-005); backlog 5->52 itens com transicoes UNKNOWN->BLOCKED declaradas p/ 001-005; tarefa ativa PROD-001 c/ acao PROD-001:PROD-001-R1-RECOVERY; gate R1 IMPLEMENTATION_READY criado (supersede R3) sem apagar historia; narrativa rev12/246; proxima acao PROD-003-R1. Release `BLOCKED` / `NOT PROVEN`.
Plan revision note, 2026-09-14 (PROD-001-R2 - reconciliacao 14/09): baseline passa a auditoria 14/09 (73/100 editorial, rev27/FAIL21, paridade 4/11); HEAD 324099e5 confere com candidato auditado e worktree preservado sem commit/revert; backlog operacional com 70 itens (5 macro + 65 PROD: 001 IN_PROGRESS R2, 002-005 BLOCKED c/ R1, 006-065 TODO; 048-065 origem BACKLOG-PROD-20260914); deps de 012/014/015/016/017/018/023/025/026/033/034/035/036/037/038/039/044/045 alinhadas ao canonico 14/09 com registro; gate de entrada R2 supersede R1; PROD-004-R1 segue NAO iniciado automaticamente. Release `BLOCKED` / `NOT PROVEN`.

## Deferred Findings (append-only; PROD-013)

- PROD-013-F2 (Low, hardening): a guarda de counters em type-only exige `statementMap` vazio (`checker:269`); classificação não reavalia type-only com `statementMap` completo. Endurecer em PROD-017/018 com teste de fabricação correspondente; não bloqueia 013-R2 (mutação type-only→runtime já detectada).
- PROD-013-F1/F3 (editorial): citações de linha e exit codes explicitados no REPORT de 013-R2 (matriz/contratos exit 0; checker exit 1 esperado).

Plan revision note, 2026-09-15 (checkpoint da sessão): 001-R2 reconciliado e encerrado; 002-L, 003-R2, 004-R2, 005-R2, 061, 010-R2, 011-R2, 012-R2 e 013-R2 aceitos no escopo com crítico I1 (falhas preservadas e narrativas corrigidas). PROD-014 em execução: baseline reproduzida (auth 70.53/84.31; roles-rls 87.82/73.28 no checker atual) e dupla representação do shard de processo documentada (diferença agregada de 221 counters em auth; instrumento sancionado intocado, decisão de semântica pendente de autoridade). Próxima ação única: S1 (testes unitários auth) -> S2 (cenários de processo) -> D1 (decisão QA/release) -> S3 (janela única de recoleta e checker). Checkpoint retomável em `docs/2026-09-15-checkpoint-state-of-art-triplo-aaa.md`. Release `BLOCKED` / `NOT PROVEN`.

Plan revision note, 2026-09-15 (PROD-014-S1): S1 implementado no candidato
local com negativas adicionais de `auth-helpers`, consumo/replay e fronteiras
de conta dos repositórios MFA in-memory, import TypeScript corrigido e pacote
de evidência `artifacts/state-of-art/PROD-014/attempt-20260915T122300Z-S1/`.
Auth 70/70, MFA 66/66, feature flags 61/61, auth-routes 47/47,
auth-helpers 7/7, setup-token 9/9, Vitest focal 258/258; `vitest-unit`
`5b8c12b1-0eef-4262-b88e-1e010dc6641a` passou com 241 arquivos e
`missingTests=[]`; known-bad da remoção de permissão falhou como esperado.
O checker agregado segue FAIL (37 erros; auth functions 71.94) e a crítica
fresh independente ficou `UNAVAILABLE_TIMEOUT_SHUTDOWN`; nenhum APPROVE, DONE
ou AAA foi inferido. A ação única continua S1 até crítica fresh válida; depois
S2 em stack privada, D1 e somente então S3.

Plan revision note, 2026-09-15 (PROD-014-S1 fresh critic): o crítico
independente `Copernicus` (`01a0a50d-9c2c-74e0-8ee7-815e2e0f973f`) concluiu
inspeção read-only e aprovou S1 apenas de forma condicionada; não apontou
defeito adicional inequívoco e não autorizou `DONE`, promoção ou AAA. A
reexecução corrente do checker segue `FAIL` (24 erros; Auth functions 72,28%).
O próximo passo singular passa a ser `PROD-014:PROD-014-S2-20260915` em
stack privada, sem usar `.env` ou recursos compartilhados; D1 e S3 continuam
posteriores e o release segue `BLOCKED`.

Plan revision note, 2026-09-15 (PROD-014-S2/D1): S2 executado em stack privada
com PostgreSQL socket-only, Redis, API/worker e 11 suites de processo (45
testes PASS; cleanup completo); tentativa inicial de `libpq` foi preservada.
O crítico fresh `Boyle` aprovou S2 apenas de forma condicionada e preservou os
findings `uncoveredObservations`/`skipIf`. O próximo passo singular é
`PROD-014:PROD-014-D1-20260915`: pedido de autoridade QA/release criado com as
opções merge normativo multiambiente (recomendada) ou unificação versionada.
Nenhuma decisão foi inferida; S3 e o release permanecem `BLOCKED`.

Plan revision note, 2026-09-15 (PROD-014-S2 post-checker): após a coleta real,
o checker corrente caiu para `FAIL19`, agora somente metric-only (mismatches de
input eliminados); Auth functions segue 72,28% e roles/RLS permanece acima de
85 em todas as métricas. O pedido D1 continua sem autoridade registrada, logo
S3 não pode iniciar e nenhuma promoção foi feita.

Plan revision note, 2026-09-15 (PROD-062 entry): a inspeção do gate confirmou que
`CRITICAL-TESTS`, `E2E`, `WORKFLOW-POSTGRES`, `RLS-RUNTIME`, `WORKER-CRASH`,
`CLINICAL-E2E`, `AUDIT-INTEGRITY`, `HOSPITAL-UAT`, `BACKUP-DRILL`,
`DEPLOY-TARGET`, `HELM-TARGET`, `BRANCH-PROTECTION` e `RELEASE-AUTHORITY`
seguiam pelo intake externo genérico e não tinham contrato específico de
medição/alvo por família. O gate de entrada
`.agent/gates/implementation-ready-prod-062-20260915.json` autoriza somente
`CONTRACT_ONLY_PREPARATION`; a dependência PROD-010, a régua 97/95/zero-P0,
o trust root e todas as autoridades permanecem preservados. Na entrada, a
ação seguinte era implementar os validadores locais, atualizar o gerador para
manter uma única avaliação e solicitar crítica fresh antes de qualquer
promoção; a revisão R1 abaixo registra a conclusão local e o novo WAIT.

Plan revision note, 2026-09-15 (PROD-062 R1): os 13 critérios foram
reencaminhados para contratos criterion-specific em sete famílias, com
dimensões/unidades gate-owned, digest dos bytes consumidos, produtor/workflow,
alvo, frescor e autoridade; o gerador agora inclui `observability.json` e usa
a avaliação canônica. A crítica preliminar de Ohm encontrou riscos de perfil
genérico, topologia ausente, security evidence autodeclarada e janela de
frescor ampliável; os quatro pontos locais foram endurecidos, mantendo a
limitação de que attestation do envelope não prova a verdade do runtime,
decisão humana ou estado remoto. Checks R1: 60/60 Vitest, 7/7 pacote, 5/5
security generator, lint/sintaxe/docs/matriz/deploy/diff e checker 11/11 PASS.
Turing foi solicitado como crítica fresh final, permaneceu running por quatro
janelas além de 120 segundos e foi encerrado sem veredito. PROD-010, trust
root, targets, limites, providers, UAT, restore, autoridade e release seguem
BLOCKED / NOT PROVEN.

Plan revision note, 2026-09-16 (candidate reconciliation): o controlador foi
avançado por evento RECOVERY append-only após o gate de preparação de PROD-063
ter sido observado fora da janela do estado anterior. A reconciliação não
promoveu PROD-063, não apagou limitações e não transferiu evidência histórica.
O candidato corrente será identificado por `CURRENT_CANDIDATE_IDENTITY.json`;
somente commits documentais podem suceder o SHA funcional sem regeneração.

Plan revision note, 2026-09-16 (visual candidate gate): os actual/expected/diff
foram inspecionados; os 29 baselines visuais atuais foram atualizados de forma
intencional e a execução subsequente sem `--update-snapshots` passou 29/29 casos
Chromium, com o caso especializado mantido como opt-in/skipped. O candidato
funcional `0ca1526a` permanece `BLOCKED / NOT PROVEN` no gate estrito `49/43/20`;
nenhuma prova local foi promovida para CI, target, UAT ou autoridade.

Plan revision note, 2026-09-16 (strict candidate gate): o controlador foi
reconciliado no candidato `0b19430e`; documentação, identidade e evidence graph
foram validados, o gate estrito exato retornou `BLOCKED / NOT PROVEN` `49/43/20`
e o checker canônico permaneceu `11/11` PASS. Nenhuma evidência externa,
autoridade humana ou claim de release foi inferida.

Plan revision note, 2026-09-16 (revision 33 fresh evidence): a inspeção de
branches confirmou que `origin/fix/state-of-art-ci-assurance` não possui
commits exclusivos e é ancestral de `main` (138 atrás, 0 à frente); nenhuma
resolução de conflito ou merge commit é necessária. O commit funcional
`2949fedf010febbe4bc71acd2071a2211b4688f3` corrigiu a paridade do contrato de
pacientes entre OpenAPI, parser/runtime e fixture de integração. O manifest
crítico foi reancorado em revision 33 sem alteração de fonte, threshold ou
aplicabilidade. A recoleta current passou unit, integração, native-worker,
native-api, critical-process, Vue especializado e SQL; o gate R05-010 continua
`FAIL/BLOCKED` por 19 métricas abaixo do limiar. A identidade documental será
gerada somente após o commit desta reconciliação; release e Triplo AAA seguem
`NOT PROVEN`.

Plan revision note, 2026-09-16 (session recovery and candidate binding): a
reconciliação determinística confirmou que o HEAD atual só acrescentou
controle/documentação após a coleta funcional. O próximo passo executável é
`TRIPLE-A-RELEASE-CONTROL:MA05-D5-AND-COVERAGE`: registrar o binding documental
fail-closed no manifesto, revalidar a coleta e atacar as 19 métricas críticas
sem reduzir thresholds, escopo ou aplicabilidade. PROD-062 permanece em espera
por crítica/autoridade externa; release continua `BLOCKED / NOT PROVEN`.

Plan revision note, 2026-09-17 (session recovery and CI #215): a evidência
terminal remota atualizou o diagnóstico: R05-010 está PASS no candidato
funcional `a4f2ef67`, enquanto o run agregado `#215` segue FAILURE por query e
inventory. A ação singular foi reancorada em
`TRIPLE-A-RELEASE-CONTROL:PERFORMANCE-SLO-REPRODUCTION` para separar causa de
medição, código e variância do runner; nenhum resultado histórico foi apagado
ou promovido e o release permanece `BLOCKED / NOT PROVEN`.

Plan revision note, 2026-09-17 (local baseline and fresh critic): o perfil
`operational-minimum-v1` passou 9/9 localmente com o mesmo pool e sem erro,
enquanto o crítico fresh não encontrou patch de baixo risco que justificasse
alterar a métrica ou a regra. A ação foi reancorada em
`TRIPLE-A-RELEASE-CONTROL:PERFORMANCE-CI-RERUN`; a diferença local/remota é
registrada como evidência limitada, não como prova conclusiva de variância.

Plan revision note, 2026-09-18 (CI #282 terminal and visual matrix): o rerun
remoto terminou `FAILURE` com `Critical Coverage Gate` e `Performance (k6 SLOs)`
rejeitados; os demais jobs observados passaram. A execução visual local
cross-browser passou somente no Chromium (`29/29`) e falhou em Firefox e WebKit
(`0/29` por engine) contra snapshots Chromium. O diagnóstico corrente passa a
ser `TRIPLE-A-RELEASE-CONTROL:CI-282-ROOT-CAUSE-REVIEW`; nenhum snapshot foi
atualizado, nenhum threshold foi reduzido e o release permanece
`BLOCKED / NOT PROVEN` até haver artefatos/logs autenticados e aceitação visual
independente.
