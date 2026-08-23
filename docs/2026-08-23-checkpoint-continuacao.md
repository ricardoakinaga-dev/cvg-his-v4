# Checkpoint de continuidade — 23 de agosto de 2026

Este é o ponto de entrada para retomar o trabalho em outra sessão. O programa
continua ativo; este documento não é uma declaração de produção, paridade ou
release.

## Estado canônico

- Repositório: `/home/ricardo/cvg-his-v4`
- Branch: `agent/sync-v4-full-program`
- Tarefa ativa: `CVG-002B2B` — ingestão de recibos PIX sintéticos e aplicação
  durável pelo núcleo B1
- Estado: `IN_PROGRESS / PARTIAL`; próximo gate: `VERIFIED`
- Última implementação de código publicada: `35f68fd` (`feat: add pix
  settlement dlq operations`), com a correção de semântica multi-réplica em
  `1217882` (`fix: avoid replicated pix dlq metric double count`).
- A última reconciliação de ledger publicada está em `d525acc` (`docs: clarify
  replicated dlq review evidence`); esta onda documental estende essa base, e
  os checkpoints anteriores
  `8d226d0`, `3c76ce0`, `409efea` e `f0c38c3` continuam como histórico.
- O arquivo user-owned
  `packages/design-system/tsconfig.vue.tsbuildinfo` permanece modificado e
  deve ficar fora de qualquer commit.
- O slice DLQ desta sessão foi publicado em `35f68fd`; a correção de
  observabilidade multi-réplica foi publicada em `1217882`.

Retomada mínima:

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

## Incremento executado após o checkpoint — fronteira de API key

Foi implementada a projeção mínima do principal pré-contexto:

- `ApiKeyAuthenticationPrincipal` contém somente `id`, `accountId`, `keyHash`,
  `permissions`, `rateLimit`, `rateLimitWindow`, `expiresAt` e `isActive`;
- a capability `cvg_api_key_auth` e `app.resolve_active_api_key` não expõem
  mais nome, prefixo, timestamps, criador ou `last_used_at`;
- o teste de ACL sob PostgreSQL confirma exatamente as oito colunas mínimas e
  a negação para o worker continua preservada;
- duas instâncias HTTP no mesmo PostgreSQL compartilharam a janela de rate
  limit: 8 requests concorrentes produziram `2×201` e `6×429`;
- a política de runtime agora falha fechado (`fail-closed`) quando o Redis
  distribuído é exigido e está indisponível; não há fallback silencioso por
  processo. O runbook Redis foi alinhado a essa decisão.

Evidência desta fatia: mapper 4/4, contrato de migration 1/1, ACL PostgreSQL
1/1, API-key HTTP multi-réplica 4/4, política operacional 22/22 e builds de
types/module/api PASS. SIGKILL/restart real, provider, SPA, paridade Vetus,
WCAG, target ops e release continuam abertos.

## Regressão bounded após a implementação

Para evitar que a projeção estreita alterasse o slice PIX já verificado, foram
reexecutados PostgreSQL efêmero e HTTP real: module PIX `8/8`, B1 command
`17/17`, B2a request+dispatch `33/33`, ingress `11/11` e callback HTTP
`13/13`. A matriz anterior registrada como B1 `18/18` permanece evidência
histórica do conjunto então existente; o comando atual reporta 17 testes
independentes e não teve falha ou skip. O próximo gate continua sendo
SIGKILL/restart de processo, não um novo score de paridade.

## O que já foi implementado e verificado

Os números abaixo são evidência local, descartável e limitada ao escopo de cada
teste. Eles não promovem o ERP inteiro:

| Fatia | Evidência fresca |
| --- | ---: |
| Núcleo B1 confirmado-PIX | 18/18 |
| Request/dispatch B2a | 33/33 |
| Parser, fingerprints e ingresso PostgreSQL | 77/77 focados; 11/11 PostgreSQL |
| Callback HTTP real | 13/13 |
| Worker PIX settlement | 54/54 |
| UoW/shared transaction context | 4/4 |
| Principal/RLS/ACL | 5/5 serviço; 8/8 ACL/RLS; 1/1 runtime 0113 |
| API-key service/mapper/helper | 13/13; 3/3; 2/2 |
| HTTP → PostgreSQL sem adapter | 4/4: owner `410`, foreign `404`, direct `200`, concorrência `2×201/6×429` |
| OpenAPI, RLS, Helm, scans | 337 paths/390 schemas; RLS 153/154; validações estáticas PASS |

O slice de código API-key, ainda relevante para a base do callback, está em
`62db87e` e inclui:

- migration `0113_api_key_auth_boundary.sql`, com lookup pré-contexto por
  capability `SECURITY DEFINER`, `search_path` fixo, tabelas de uso/rate-limit
  tenantizadas e probe PIX sem vazamento de `account_id` estrangeiro;
- mapper JSONB estrito para arrays nativos e strings do driver `pg`;
- separação ACL API/worker, sem acesso do worker às tabelas de credenciais;
- rate limit obrigatório antes de `last_used_at` e consumo atômico no
  PostgreSQL;
- preservação da fronteira legada `410` para PIX ligado a attempt B2, sem
  gateway nem outbox legado.

Os commits anteriores continuam relevantes: B1 extraído em `packages/modules/pix`,
ingresso `0111`, principal `0112`, callback HTTP e recovery/fencing/DLQ de
telemetria. Os artefatos detalhados estão referenciados em
[`2026-08-22-handoff-cvg-002b2.md`](2026-08-22-handoff-cvg-002b2.md) e em
`.agent/artifacts/`.

## O que ainda está aberto — ordem de retomada

1. Exercitar a superfície de operador da fila
   `reconciliation_required` em ambiente target-like autorizado, incluindo
   refresh do gauge, rotação de credenciais e resposta a incidentes; o
   endpoint/runbook/alerta local já estão implementados.
2. Definir e medir a política de rate limit em múltiplas réplicas (janela,
   relógio, failover, Redis/PostgreSQL e comportamento quando a dependência
   está indisponível).
3. Reduzir a projeção do principal autenticado pré-contexto ao mínimo
   necessário; a revisão independente classificou a projeção atual como
   MEDIUM, sem bloqueio HIGH/CRITICAL.
4. Executar matriz de reinício/SIGKILL real, além do takeover por dois pools já
   comprovado. Repetir B1/B2a/ingress/HTTP e todos os artefatos invalidados.
5. Abrir gates separados para B2c/SPA, jornada clínica até recebimento,
   paridade Vetus (`11/11 + 3/3`), WCAG, provedores reais, restore/deploy/SLO e
   release.

O maior slice local é o DLQ operacional. Ele não deve alterar diretamente
receipt, PIX, billing ou ledger; somente reencaminhar uma delivery terminal,
com auditoria e invariantes já existentes. Provider real, credenciais, produção
e go-live continuam fora da autoridade desta sessão.

## Auditoria documental preservada

Foi refeito o inventário determinístico completo de `docs/`:

- 1.447 arquivos, 90 diretórios e 53.728.402 bytes;
- 995 Markdown, 255 PNG, 129 JSON, 67 HTML e 1 arquivo gzip;
- 1.191 arquivos textuais, classificados em camada ativa, `micro-build/`,
  referência `vetus/` e arquivo histórico `docs2/`;
- hash do manifesto ordenado desta execução:
  `52ab7100d5272df769f61fb6323da250987b10f404a9fb8fc0fdf4198d19c5bf`;
- `docs/README.md` e `docs/430-fonte-de-verdade-documental.md` continuam
  definindo a precedência: runtime/testes, código/contratos, camada ativa de
  agosto, arquitetura/ADRs, auditorias antigas, Vetus e, por último,
  `docs2/` histórico.

O acervo Vetus contém evidência de produto e imagens repetidas; não é prova de
implementação CVG-HIS. O inventário de referência registrou 1.447 arquivos no
checkpoint anterior; após a inclusão do runbook operacional, a recontagem do
working tree era de 1.449 arquivos, 90 diretórios e 53.746.820 bytes na
recontagem intermediária; após esta consolidação, a soma atual dos arquivos é
53.750.467 bytes. O score
estrutural `readiness:enterprise` segue em 95/100, enquanto a paridade
comportamental segue `0/11` geral e `0/3` clínica.
O Game Day que sugere fallback em memória continua incompatível com a política
de fail-closed e não deve ser executado sem revisão.

## Pesquisa de mercado registrada

O benchmark oficial de PIMS/ERP está em
[`2026-08-22-auditoria-integral-e-pesquisa-erp.md`](2026-08-22-auditoria-integral-e-pesquisa-erp.md)
e orienta prioridades de produto (fluxo clínico unificado, multiunidade,
charge capture, integrações, portal e relatórios). Ele não substitui testes de
comportamento nem autoriza copiar padrões inseguros observados em referências.

## Regra de honestidade para a próxima sessão

Não marcar `CVG-002B2B`, `CVG-002` ou o ERP geral como concluídos. Não afirmar
produção, provedor homologado, paridade, acessibilidade ou release com base
somente nestes slices. Antes de qualquer novo gate, revisar `git diff`, o
estado canônico, a validade dos artefatos e a presença exclusiva do cache
user-owned no worktree.

## Incremento executado nesta sessão — PIX settlement DLQ

O maior gap local foi convertido em uma fatia vertical implementável. O
artefato detalhado está em
[`CVG-002B2B-pix-settlement-dlq-2026-08-23.md`](../.agent/artifacts/CVG-002B2B-pix-settlement-dlq-2026-08-23.md).

- API: `GET /internal/pix-settlement/deliveries` sanitizado e tenant-scoped;
  `POST /internal/pix-settlement/deliveries/:deliveryId/redrive` com authz,
  validação e 404 opaco.
- PostgreSQL: migration `0114` com capability não-login e função
  `SECURITY DEFINER` que faz a transição terminal→pending e a auditoria na
  mesma transação, sem `UPDATE` direto para a API.
- ACL: reconciler, bootstrap shell e Helm preservam a separação API/worker;
  função só é executável pela API e a capability interna não possui login.
- Operação: alerta Prometheus, painel Grafana e runbook foram adicionados. O
  alerta/painel usam o gauge atual
  `worker_pix_provider_settlement_reconciliation_required`, alimentado por
  contagem PostgreSQL tenant-scoped a cada 15s; o contador monotônico fica
  reservado para histórico de promoções. Como cada worker observa o conjunto
  completo de contas, o alerta/painel usam `max(...)` para não duplicar o
  backlog quando há múltiplas réplicas.
- Os erros diretos `404/503` também carregam `correlationId`, alinhados ao
  envelope `ErrorResponse` do OpenAPI.
- Evidência fresca: route 4/4; PostgreSQL/ACL 3/3, incluindo backlog durável
  `1→0` após redrive; runtime grant 9/9; worker 54/54; API/DB/worker build,
  OpenAPI 337/390, alert alignment 5/5, Helm, YAML/JSON e shell checks PASS.

Esse incremento reduz o risco de uma entrega terminal ficar sem operador e foi
publicado em `35f68fd` com a correção de observabilidade em `1217882`. A fatia
seguinte, de principal mínimo e fail-closed, foi publicada em
`099ac2a1ff5f1ed9f74812d2466dccb42681737d`; ela não promove o gate: SIGKILL/
restart real, failover/clock-skew Redis, provider real, SPA, paridade Vetus,
WCAG, target ops e release seguem abertos. O cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` continua fora do escopo.

## Registro final para a próxima sessão — 23/08/2026, 02:08 BRT

Este registro é a referência mais recente caso a sessão seja interrompida.

- A base remota deste handoff inclui `099ac2a1ff5f1ed9f74812d2466dccb42681737d`,
  confirmado em `origin/agent/sync-v4-full-program`; o checkpoint documental
  anterior foi publicado em `76f7ec5`.
- `git status --short` deve mostrar somente
  `packages/design-system/tsconfig.vue.tsbuildinfo`; não adicionar, reverter
  ou limpar esse arquivo user-owned.
- O checker canônico foi executado com
  `python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py
  "$PWD"`: 11 PASS, 1 WARN histórico de ownership paralelo e 0 FAIL.
- A evidência mais recente desta fatia é
  `VFY-CVG-002B2B-REVIEW-001`; a evidência de regressões é
  `VFY-CVG-002B2B-REGRESSION-001`. A evidência mais recente do DLQ é
  `VFY-CVG-002B2B-DLQ-OPERATOR-001` e a
  correção de agregação é `VFY-CVG-002B2B-DLQ-REPLICA-001`; a publicação
  anterior é `VFY-DOCS-DLQ-PUBLICATION-001` e a correção de wording deste
  handoff é `VFY-DOCS-CONTINUATION-003`. Todas são evidências
  locais/descartáveis, não certificação de produção.
- Retomada executável: obter a matriz real de SIGKILL/restart e o exercício de
  failover/clock-skew Redis sob a política fail-closed; repetir B1/B2a/ingress/
  HTTP se esse trabalho mudar o runtime e então reavaliar o gate `VERIFIED`.

Comandos mínimos:

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

## Publicação desta continuação

O código, testes, Quality Bar e controle documental desta fatia foram
publicados em `855f53f` no branch `origin/agent/sync-v4-full-program`. O cache
`packages/design-system/tsconfig.vue.tsbuildinfo` permaneceu fora do commit.

## Registro de continuidade desta sessão — 23/08/2026, 03:13 BRT

Este registro é a referência mais recente para a próxima sessão. A base
remota verificada antes desta onda documental é
`4a5ead11e7809dfecd50b607df2e7dee99c2b3d3`, alinhada entre `HEAD` e
`origin/agent/sync-v4-full-program`. O checker canônico retornou 11 PASS, 1
WARN histórico de ownership e 0 FAIL. O único caminho dirty continua sendo o
cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo`, que não
deve entrar no commit. Esta onda documental foi publicada em
`a7bacda985e678970d562d0c0be9eb72c33b9124` no mesmo branch.

### Maior gap local confirmado

Uma auditoria read-only do worker confirmou que o takeover por dois pools já
existente (`6/6`) prova lease/fence, mas não prova morte abrupta de processo.
O entrypoint já trata `SIGTERM`/`SIGINT`, expõe `/ready`, `/health/ready` e
`/metrics`, e o settlement usa lease padrão de 60 segundos. Porém,
`pix-provider-settlement-consumer.ts` ainda não tem checkpoints injetáveis como
o dispatcher. O próximo slice P1 é, portanto, um contrato de checkpoints e um
harness de dois processos independentes que execute `SIGKILL` nos pontos
`after_claim_commit`, `before_b1`, `after_b1_before_cas` e `after_applied_cas`,
com takeover, fence, exatamente uma aplicação B1 e observação de readiness/
metrics. O detalhe executável está em
[`CVG-002B2B-process-restart-and-erp-slices-2026-08-23.md`](../.agent/artifacts/CVG-002B2B-process-restart-and-erp-slices-2026-08-23.md).

Não contar o teste de encerramento de pool como SIGKILL. O harness futuro deve
usar PostgreSQL descartável e provider sintético local; provider real,
credenciais e produção continuam fora da autoridade desta sessão.

### Próxima jornada de produto preservada

Depois de fechar a evidência operacional, a primeira fatia clínica-financeira
recomendada pelo benchmark é `internação -> handoff/permanência -> diária ->
item cobrável`. A base existente em `medical-records`, `encounters`,
`inpatient` e `diagnostics` deve ser inspecionada antes de criar código. A
fatia precisa garantir idempotência por `stayId`/período, proveniência
`stayId`/`encounterId`/ator, auditoria de cancelamento/estorno, cutoff de alta,
RLS/tenant e estados de UI `pendente`, `faturada` e `cancelada`. Isso é
planejamento executável, não evidência de implementação ou paridade.

### Retomada mínima

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

Ler primeiro este checkpoint, o artefato de continuidade, `.agent/state.json`,
`.agent/tasks/CVG-002B2B.md` e os tails de `.agent/execution-log.jsonl` e
`.agent/verification.jsonl`. Manter `CVG-002B2B` e o ERP geral em
`IN_PROGRESS/PARTIAL`; não promover provider, SPA, Vetus, WCAG, operações ou
release.

## Incremento executado — prova independente de SIGKILL/restart (23/08/2026)

O gap de processo foi fechado como slice local, sintético e reversível. O
consumer agora expõe checkpoints imutáveis em
`after_claim_commit`, `before_b1`, `after_b1_before_cas` e
`after_applied_cas`; callbacks com erro entram no fluxo existente de retry/
falha. O harness inicia A e B como processos Node distintos, usando o mesmo
PostgreSQL efêmero e `local-pix` sintético, bloqueia A no checkpoint, envia
`SIGKILL`, aguarda a lease expirar quando necessário e deixa B concluir.

Resultado fresco: matriz `4/4` verde nos quatro checkpoints, com PIDs distintos,
probes HTTP reais `/ready` e `/metrics` em A e B, takeover/fence e consulta
PostgreSQL final. Todos os casos terminaram com uma receipt, billing/attempt
settled, PIX completed/applied e delivery `applied`; o caso pós-CAS retornou
`idle` no sucessor e os casos pré-CAS convergiram com `attempts=2` e
`lease_version=2`.

Regressões após a mudança: worker unit/build `58` testes + build, settlement
PostgreSQL `6/6`, comando B1 `18/18` e callback HTTP/ingress PostgreSQL `2/2`.
O contrato e as limitações estão em
[`CVG-002B2B-sigkill-restart-quality-bar-2026-08-23.md`](../.agent/artifacts/CVG-002B2B-sigkill-restart-quality-bar-2026-08-23.md).
A crítica independente delimitou o resultado: ainda não há uma corrida em que
A permaneça vivo após B assumir e tenha sua tentativa stale observada e
rejeitada no boundary de processos; o teste stale existente é de consumer/
pools. A matriz também não conta cada linha de journal/outbox/inbox e usa um
entrypoint mínimo de probes, não a semântica completa de readiness do worker
principal. O protocolo foi endurecido para fd 3 dedicado (fora de stdout/
stderr), e o fixture exige `NODE_ENV=test` +
`PIX_SETTLEMENT_SYNTHETIC_FIXTURE=1` e fica fora do build de produção.
Isto não fecha Redis failover/clock-skew, provider real, SPA/B2c, paridade
Vetus, WCAG, target operations, cobertura dedicada ou release.

## Reconciliação final para a próxima sessão — 23/08/2026, 04:07 BRT

Verifique `git rev-parse HEAD` e `git rev-parse origin/agent/sync-v4-full-program`;
eles devem concordar na ponta publicada da branch. A implementação está em
`855f53f` e a reconciliação documental anterior em `260096a`; commits de
ponteiro posteriores são apenas continuidade documental. O estado canônico foi
atualizado para `EVT-0103`/revisão 90 e o checker continua em 11 PASS, 1 WARN
histórico e 0 FAIL. A próxima ação executável é provar o race stale-fence com A
vivo após o takeover de B; depois exercitar Redis failover/clock-skew e iniciar
a fatia clínico-financeira de internação até item cobrável.
