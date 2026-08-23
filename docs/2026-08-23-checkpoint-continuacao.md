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
A crítica independente anterior delimitou o resultado naquele momento: ainda
não havia uma corrida em que A permanecesse vivo após B assumir. O caso foi
adicionado e passou no registro mais recente abaixo. A matriz continua sem
contar cada linha de journal/outbox/inbox e usa um entrypoint mínimo de probes,
não a semântica completa de readiness do worker principal. O protocolo foi
endurecido para fd 3 dedicado (fora de stdout/stderr), e o fixture exige
`NODE_ENV=test` +
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

## Registro mais recente — stale-fence e cobrança diária idempotente (23/08/2026)

Este é o checkpoint atual para a próxima sessão. A sessão não concluiu o ERP;
ela fechou duas fatias locais e deixou os gates externos explícitos.

O código desta atualização foi consolidado em `a89a2f0`; a documentação foi
publicada em `7059fd3` no branch `origin/agent/sync-v4-full-program`, com
`HEAD` e `origin` conferidos. O cache user-owned continua fora do commit.

### PIX settlement

- A matriz processual passou `5/5`: quatro pontos de `SIGKILL` e o race stale
  com A vivo em `after_claim_commit`, lease expirada, B assumindo
  `lease_version=2`, A liberado primeiro (`lease_lost` antes de `before_b1`) e
  B liberado depois (`applied` uma vez).
- PIDs distintos, PostgreSQL descartável, `local-pix`, probes `/ready`/
  `/metrics` e protocolo fd 3 foram observados. O Quality Bar foi atualizado em
  `.agent/artifacts/CVG-002B2B-sigkill-restart-quality-bar-2026-08-23.md`.
- Isto não prova Redis failover/clock-skew, provider real, readiness completo
  do worker principal ou contabilidade detalhada de journal/outbox/inbox.

### Internação → diária → billing

Foi implementada a primeira fronteira clínica-financeira não-PIX:

- migration `0115` e schema Drizzle aceitam `inpatient_daily_charge` e impõem
  índice unique partial por tenant/fonte;
- diária já faturada faz replay `200` e vínculo divergente dá `409`;
- `BillingService` resolve fonte existente, trata `23505` e recarrega o
  `billing_record` vencedor numa corrida de criação sem registro prévio;
- OpenAPI, rota, repository e testes compartilham a mesma proveniência.

Evidência fresca: route `10/10`, module-inpatient `17/17`, module-billing
`16/16`, integração PostgreSQL `2/2`, API `324/324`, worker `58` + build, DB
build, module/API builds e process matrix `5/5`. Detalhes em
`.agent/artifacts/CVG-002C-inpatient-daily-billing-idempotency-2026-08-23.md`.

### Retomada mínima

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

Esperado: apenas o cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` fora do commit. Depois:

1. Exercitar Redis failover/clock-skew sob `fail-closed`.
2. Decompor `admissão → handoff/permanência → diária → alta →
   item/recebimento` com REDs PostgreSQL/RLS e estados de UI.
3. Preservar B2c/SPA, provider real, paridade Vetus, WCAG, operações,
   cobertura e release como gates separados; não marcar `VERIFIED` ou produção.

## Registro de continuidade — cutoff de alta e fail-closed (23/08/2026)

Após a retomada, a auditoria Redis foi executada contra o Redis local: a suíte
passou `21/21`, incluindo atomicidade entre duas conexões, uso do relógio do
Redis quando o nó da aplicação está adiantado, rejeição bounded de endpoint
indisponível e descarte/recuperação de cliente falho. Isso é evidência local;
failover real entre processos ainda permanece aberto.

O próximo RED clínico confirmou uma lacuna de integridade: antes da proteção,
SQL direto ainda conseguia inserir evolução, ocorrência e diária depois de uma
stay `discharged`. A migration `0116_inpatient_discharge_cutoff.sql` agora
instala uma função PostgreSQL `SECURITY DEFINER` e triggers tenant-scoped para
esses três filhos e para consumo de estoque com
`source_entity_type=inpatient_stay`. A prova em PostgreSQL 16 descartável,
migrado até `0116`, passou `2/2`; o artefato está em
`.agent/artifacts/CVG-002D-inpatient-discharge-cutoff-2026-08-23.md`.

Também foi adicionada a prova HTTP de login fail-closed (`1/1`): falha do
backend Redis produz `500 INTERNAL_ERROR`, sem cookie de refresh ou token. A
descrição do experimento/runbook foi alinhada para não sugerir fallback local.
Builds de API, DB e chaos e `security:secrets` passaram.

O PostgreSQL compartilhado de testes entrou em recovery após repetidas bases
efêmeras; ele não deve ser usado para novas rodadas até recuperação/limpeza
operacional autorizada. O estado do ERP continua `IN_PROGRESS/PARTIAL`. Próxima
ação: implementar RED de atomicidade/rollback entre item de billing e marcação
da diária, depois costurar admissão → handoff/permanência → estoque → alta →
recebimento/ledger/auditoria/outbox sob PostgreSQL/RLS, sem fechar os gates
externos de provider, SPA/B2c, paridade, WCAG, operações, cobertura e release.

## Publicação do checkpoint

O commit `2b33aea` (`feat: enforce inpatient discharge cutoff`) foi publicado
em `origin/agent/sync-v4-full-program`. Ele contém a migration `0116`, a prova
PostgreSQL independente, a prova HTTP fail-closed, o artefato CVG-002D e todos
os registros de continuidade desta seção. O ponteiro documental foi
reconciliado em `432887f` (`docs: publish discharge cutoff checkpoint`) e
`HEAD == origin`. O cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` permaneceu fora dos commits.
Retome o RED de rollback billing ↔ diária a partir deste estado.

## Registro de continuidade mais recente — auditoria integral e benchmark (23/08/2026, 05:58 BRT)

Este é o ponto de entrada documental para a próxima sessão. Antes desta
publicação, `HEAD` e `origin/agent/sync-v4-full-program` estavam alinhados em
`48a3ad11b2a1a122751590b31b4760406a018de6`. O único caminho dirty continua
sendo o cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo`; ele
deve permanecer fora de qualquer commit.

### O que foi auditado e preservado

- Todos os 1.449 arquivos atuais de `docs/` foram enumerados e lidos; há 1.193
  arquivos textuais e 256 binários, totalizando 53.766.604 bytes. O manifesto
  ordenado desta execução é
  `d23f84a7000e42943093090e706db12e01a6e4189f61f5bd833f67b5e92ea2db` e o
  contador reprodutível de linhas textuais é 357.608.
- A classificação preservada é 543 referências `vetus/`, 835 históricos
  `docs2/`, 8 ADRs, 1 arquivo de Game Day e a camada ativa de arquitetura,
  operação, SOC2, runbooks e micro-build. `docs/README.md` e `docs/430` seguem
  a precedência já registrada; Vetus e `docs2` não são prova de implementação.
- A auditoria executável continua em 95/100 (42 PASS, 3 WARN, 1 FAIL), com
  paridade comportamental `0/11` geral e `0/3` clínica. Isso é o gate
  estrutural atual, não uma regressão escondida nem um certificado de release.
- O benchmark web primário foi atualizado com Shepherd, ezyVet/IDEXX,
  Digitail, Vetspire, Covetrus Ascend, Provet Cloud, Oracle Health e SAP
  S/4health. Os padrões convertidos em requisitos são: encounter como espinha,
  SOAP com autosave/versionamento, flowboard 24h, charge capture, estoque por
  lote/validade, portal do tutor, APIs com sandbox/scopes/replay e IA somente
  assistiva com revisão humana. Os links e a distinção entre alegação de
  fornecedor e evidência estão em
  [`2026-08-22-auditoria-integral-e-pesquisa-erp.md`](2026-08-22-auditoria-integral-e-pesquisa-erp.md)
  e [`.agent/artifacts/market-benchmark.md`](../.agent/artifacts/market-benchmark.md).

### Estado técnico honesto

As fatias já fechadas continuam sendo: ingestão/settlement PIX com fencing e
stale-fence local `5/5`, DLQ operacional, principal mínimo/rate-limit
multi-réplica (`2×201`/`6×429`), diária idempotente (`2/2` PostgreSQL), cutoff
de alta (`2/2` PostgreSQL), Redis local `21/21`, auth fail-closed `1/1`, API
`324/324`, worker `58` + build e scans/builds dirigidos. São provas focadas,
descartáveis e não equivalem à jornada clínica completa ou à produção.

### Retomada executável

1. Escrever o RED `ERP-ATOMIC-002` para rollback entre `billing.addItem` e
   `markDailyChargeBilled`.
2. Implementar a UoW/saga explícita da jornada admissão → handoff/permanência →
   estoque → alta → billing → recebimento/ledger/auditoria/outbox.
3. Cobrir dois tenants, replay, concorrência e failpoint em PostgreSQL
   descartável; atualizar os artefatos e ledgers somente com resultados
   reproduzidos.
4. Depois, tratar Redis failover/clock-skew real, SPA/B2c, provedores,
   paridade Vetus, WCAG, cobertura, deploy/restore e release como gates
   separados.

Comandos de retomada:

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
pnpm readiness:enterprise
```

O estado global permanece `IN_PROGRESS/PARTIAL`; não marcar `CVG-002B2B`,
`CVG-002`, paridade ou o ERP como concluídos.

## Publicação confirmada — 23/08/2026, 06:09 BRT

O checkpoint de auditoria/documentação foi publicado em `1400d83`
(`docs: record integral audit continuation checkpoint`). A reconciliação do
estado canônico foi publicada em `02f7927` (`docs: reconcile audit
control-plane state`). Após `git fetch`, `HEAD` e
`origin/agent/sync-v4-full-program` estão ambos em
`02f79278da71c4fe50b751fc05e4f3636b5d6f0e`. O único caminho dirty é o cache
user-owned `packages/design-system/tsconfig.vue.tsbuildinfo`, deliberadamente
fora dos commits.

## Registro de continuidade — rollback diaria/billing (23/08/2026, 06:32 BRT)

Este é o novo ponto de retomada da jornada clinico-financeira. A fatia
`ERP-ATOMIC-002` foi implementada de forma limitada: a rota
`POST /inpatient/:stayId/daily-charges/:chargeId/bill` agora executa a criacao
do item de billing, a marcacao da diaria, a persistencia e a auditoria aguardada
por `runTenantCommand`. Em falha do comando, os caches quentes de billing e
internacao sao reidratados a partir do estado commitado para evitar item ou
diaria fantasma em retries.

Arquivos principais:

- `apps/api/src/routes/inpatient-routes.ts`
- `apps/api/src/server.ts`
- `apps/api/src/routes/inpatient-routes.test.ts`
- `packages/modules/billing/src/index.ts`
- `packages/modules/inpatient/src/index.ts`
- `tests/integration/database/inpatient-daily-charge-billing-rollback.test.ts`
- [artefato CVG-002C rollback diaria/billing](../.agent/artifacts/CVG-002C-inpatient-daily-billing-rollback-2026-08-23.md)

Evidencia executada nesta sessao:

```bash
pnpm --filter @cvg-his-v2/api build
pnpm vitest run tests/integration/database/inpatient-daily-charge-billing-rollback.test.ts --config vitest.integration.config.ts --reporter=verbose
NODE_ENV=test node --test apps/api/dist/routes/inpatient-routes.test.js
git diff --check
```

Resultado: API build PASS, PostgreSQL efemero `1/1`, rota compilada de
internacao `12/12` e `git diff --check` PASS. No failpoint apos
`billing.addItem`, o banco permanece sem `billing_items`, sem `billing_records`,
com a diaria `pending` e `billing_record_id = NULL`.

O estado global continua `IN_PROGRESS/PARTIAL`. A proxima sessao deve expandir
esta fronteira para admissao -> handoff/permanencia -> estoque -> alta ->
billing -> recebimento/ledger/auditoria/outbox, com dois tenants, replay,
concorrencia e PostgreSQL/RLS. Nao declarar producao, paridade Vetus, WCAG,
providers, target operations, cobertura global ou release.

## Publicação confirmada — rollback diaria/billing (23/08/2026, 06:39 BRT)

O checkpoint de implementacao e documentação foi publicado em
`ee04d92e5ed50c0cf6c6f46fca4c53d17d1ba36c`
(`fix: make inpatient daily-charge billing atomic`) no branch
`origin/agent/sync-v4-full-program`. Após `git fetch`, `HEAD` e
`origin/agent/sync-v4-full-program` estavam iguais nesse hash. O único caminho
dirty remanescente é o cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo`, deliberadamente fora do
commit.

## Revisão independente registrada — rollback diária/billing (23/08/2026, 06:44 BRT)

Uma revisão independente da fatia publicada não encontrou P0. Foram registrados
dois pontos para a próxima sessão:

- **P1:** a prova PostgreSQL exercita o `createTenantUnitOfWork` diretamente,
  mas ainda falta uma prova HTTP com `runTenantCommand` real e
  `Idempotency-Key`. Em ambientes production-like o header é obrigatório; sem
  ele, os fallbacks de teste/desenvolvimento podem executar fora da UoW.
- **P2:** em uma falha tardia, o cache em memória do AuditService pode conservar
  um evento antes que o rollback do banco seja concluído. Avaliar invalidação/
  reidratação do cache no `catch` ou publicação do cache somente após commit.

Esses achados não invalidam o rollback confirmado no PostgreSQL, mas mantêm a
fatia como `IN_PROGRESS/PARTIAL`. O próximo RED deve cobrir a superfície HTTP,
replay e concorrência; a consistência do cache de auditoria deve ser tratada
antes de promover este limite.

## Publicação da revisão independente — 23/08/2026, 06:45 BRT

O registro acima foi publicado em `1f1017436ec51a6fc0928e1b4f575f92533caf42`
(`docs: record post-publication review findings`) no branch
`origin/agent/sync-v4-full-program`. Após `git fetch`, `HEAD` e `origin` estão
iguais nesse hash. O único caminho dirty continua sendo o cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo`, fora do commit.

## Registro de continuidade mais recente — recibo de caixa HTTP/UoW (23/08/2026, 07:05 BRT)

Esta é a referência de retomada da próxima sessão para a fronteira pública de
recebimento. O slice de implementação está em `3e278c8`
(`fix: wire cash receipts through tenant commands`) e o artefato detalhado é
[`CVG-002C2-cash-receipt-http-uow-2026-08-23.md`](../.agent/artifacts/CVG-002C2-cash-receipt-http-uow-2026-08-23.md).

### O que foi fechado

- `POST /encounters/:encounterId/cash-receipts` recebe o `runTenantCommand`
  real no servidor e encaminha operação, `Idempotency-Key` e payload JSON-safe
  ao runner antes de executar o comando financeiro;
- a UoW global de mutações HTTP continua dona da transação/idempotência por
  operação HTTP, e o runner aninhado passa pela transação já ativa sem abrir
  uma segunda unidade de trabalho;
- `response-buffer.snapshot()` não grava mais campos opcionais com valor
  `undefined`, evitando rejeição do canonicalizador JSON durante o replay;
- foi adicionada prova HTTP → PostgreSQL real com primeiro POST, replay
  idempotente e conflito de payload, confirmando uma única cadeia de recibo,
  pagamento, movimento, journal, auditoria, outbox e idempotência concluída.

### Evidência fresca

```text
rota + response-buffer: 10/10
HTTP helper: 6/6
comando PostgreSQL de recibo: 8/8
HTTP/PostgreSQL publicado: 1/1
API typecheck: PASS
git diff --check: PASS
revisão independente: APPROVE, sem P0/P1
```

O teste usa banco PostgreSQL efêmero, autenticação pelo endpoint publicado e
não executa limpeza destrutiva contra tabelas append-only. O cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` permanece fora do commit.

### Limite e próximo passo

A revisão independente deixou apenas um P2 local: falta uma matriz HTTP de
dois tenants com tokens distintos tentando acessar o encounter do outro. A
prova RLS/repository existente cobre isolamento no banco, mas a matriz HTTP A/B
deve ser adicionada junto com a expansão admissão → handoff/permanência →
estoque → alta → billing → recebimento/ledger/auditoria/outbox, incluindo
replay, concorrência e failpoints. O programa continua
`IN_PROGRESS/PARTIAL`; Redis failover real, provider, SPA/B2c, paridade Vetus,
WCAG, operações alvo, cobertura e release seguem gates abertos.
## Publicação confirmada — recibo de caixa HTTP/UoW (23/08/2026, 07:13 BRT)

O commit de implementação `3e278c8` e o checkpoint documental/control-plane
`d605351` foram publicados em `origin/agent/sync-v4-full-program`. Após
`git fetch`, `HEAD == origin == d6053511a8ed686c60e2e4c0601678317cb4737d`.
O checker canônico retorna 11 PASS, 1 WARN histórico de ownership paralelo e
0 FAIL. O único caminho dirty é o cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo`, deliberadamente fora dos
commits.
## Atualização mais recente — isolamento HTTP cross-tenant (23/08/2026, 07:20 BRT)

O P2 restante do recibo de caixa foi fechado no commit `0e0163c`
(`test: prove cash receipt tenant isolation`). O teste PostgreSQL agora cria
um segundo tenant e token e comprova que:

- o token B não lê o recibo do encounter A (`404 CASH_RECEIPT_NOT_FOUND`);
- o token B não cria recibo no encounter A (`404 BILLING_RECORD_NOT_FOUND`);
- o tenant B não recebe recibo nem linha de idempotência persistida.

Evidência: integração HTTP/PostgreSQL `2/2`, rota + response-buffer `10/10`,
API typecheck PASS e `git diff --check` PASS. A fronteira HTTP de recebimento
agora tem commit, replay, conflito e isolamento A/B comprovados. O próximo
trabalho volta à jornada maior admissão → handoff/permanência → estoque → alta
→ billing → recebimento/ledger/auditoria/outbox, mantendo o ERP
`IN_PROGRESS/PARTIAL` e os gates de Redis failover real, provider, SPA/B2c,
paridade Vetus, WCAG, operações, cobertura e release abertos.
## Publicação confirmada — isolamento HTTP cross-tenant (23/08/2026, 07:27 BRT)

O teste `0e0163c` e a reconciliação documental `037053c` estão publicados em
`origin/agent/sync-v4-full-program`. Após `git fetch`,
`HEAD == origin == 037053c77c841398b50e06f5bb02ab1b56bee87b`. O checker
canônico continua em 11 PASS, 1 WARN histórico e 0 FAIL; somente o cache
user-owned `packages/design-system/tsconfig.vue.tsbuildinfo` permanece dirty e
fora dos commits.

## Registro de continuidade — diária HTTP/UoW e cache recovery (23/08/2026, 07:31 BRT)

Este bloco salva o estado mais recente antes da próxima sessão. A mudança atual
fecha a primeira prova HTTP real da rota
`POST /inpatient/:stayId/daily-charges/:chargeId/bill`. O replay de uma diária
já faturada deixou de retornar antes do `runCommand` e agora permanece dentro
da mesma fronteira de comando tenant-aware. Além disso, o refresh dos caches de
internação e billing passou a ser atômico: ele lê o estado commitado para mapas
temporários e só substitui o cache quente depois de todas as leituras terem
sucesso. Isso evita que uma tentativa de reidratação dentro de uma transação
PostgreSQL abortada deixe o processo sem stays ou records em memória.

Arquivos alterados nesta fatia:

- `apps/api/src/routes/inpatient-routes.ts`
- `apps/api/src/routes/inpatient-routes.test.ts`
- `packages/modules/billing/src/index.ts`
- `packages/modules/inpatient/src/index.ts`
- `tests/integration/database/inpatient-daily-charge-bill-http-postgres.test.ts`
- `docs/2026-08-23-checkpoint-continuacao.md`

Evidência executada:

```bash
pnpm --filter @cvg-his-v2/api build
NODE_ENV=test node --test apps/api/dist/routes/inpatient-routes.test.js
pnpm --filter @cvg-his-v2/module-inpatient test
pnpm --filter @cvg-his-v2/module-billing test
pnpm vitest run tests/integration/database/inpatient-daily-charge-bill-http-postgres.test.ts --config vitest.integration.config.ts --reporter=verbose
git diff --check
```

Resultado: API build PASS, rota de internação `13/13`, module-inpatient
`17/17`, module-billing `16/16`, HTTP/PostgreSQL `3/3` e `git diff --check`
PASS. A integração nova prova primeiro POST, replay com o mesmo
`Idempotency-Key`, conflito de payload, rollback via failpoint PostgreSQL entre
item de billing e marcação da diária, e concorrência same-key convergindo para
um único item e uma única linha de idempotência.

Limite honesto: a fronteira HTTP/UoW da diária agora tem evidência real, mas
ainda falta matriz HTTP A/B para tenant/RLS da internação, inspeção dedicada do
cache de auditoria em falha tardia e expansão da jornada admissão →
handoff/permanência → estoque → alta → billing → recebimento/ledger/auditoria/
outbox. O ERP continua `IN_PROGRESS/PARTIAL`; provider real, SPA/B2c, paridade
Vetus, WCAG, operações alvo, cobertura global e release seguem gates separados.
O cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo` permanece fora do commit.

## Publicação confirmada — diária HTTP/UoW (23/08/2026, 07:36 BRT)

O código e o teste de integração foram publicados em `9a93ebc`
(`fix: harden inpatient daily-charge HTTP billing`) no branch
`origin/agent/sync-v4-full-program`. A prova HTTP/PostgreSQL passou `3/3` e
os testes/builds dirigidos ficaram em rota `13/13`, module-inpatient `17/17`,
module-billing `16/16` e API build PASS. A correção adia a reidratação dos
caches quando o wrapper HTTP ainda está encerrando uma transação abortada;
isso foi necessário para que o retry concorrente não observasse um cache vazio.

O controle-plane agora aponta para o artefato
`.agent/artifacts/CVG-002C3-inpatient-daily-charge-http-uow-2026-08-23.md`, para
`VFY-CVG-002C3-INPATIENT-BILL-HTTP-001` e para a próxima ação completa:
admissão → handoff/permanência → estoque → alta → billing →
recebimento/ledger/auditoria/outbox. A matriz HTTP A/B da internação e a
inspeção de auditoria em falha tardia ainda estão abertas, assim como Redis
failover real, provider, SPA/B2c, paridade, WCAG, operações, cobertura e
release. O estado permanece `IN_PROGRESS/PARTIAL`.
## Reconciliação final publicada — diária HTTP/UoW (23/08/2026, 07:40 BRT)

O commit documental/control-plane `46896bc4bf9990420c3ee9b651101c7c5376b6d4`
está publicado em `origin/agent/sync-v4-full-program`; após `git fetch`,
`HEAD == origin`. O checker canônico retorna 11 PASS, 1 WARN histórico de
ownership paralelo e 0 FAIL. O único caminho dirty é o cache user-owned
`packages/design-system/tsconfig.vue.tsbuildinfo`, preservado fora do stage.

Para a próxima sessão, leia este checkpoint, o artefato
`.agent/artifacts/CVG-002C3-inpatient-daily-charge-http-uow-2026-08-23.md` e a
verificação `VFY-DOCS-CONTINUATION-018`. O próximo trabalho é a matriz HTTP A/B
da internação e a revisão do cache de auditoria em falha tardia, seguida da
jornada clínica-financeira completa. O programa permanece
`IN_PROGRESS/PARTIAL`.
## Ponteiro final confirmado — 23/08/2026, 07:42 BRT

Após a reconciliação final, `HEAD == origin/agent/sync-v4-full-program ==
c8d78d058d7f95dc37fc7ec6802253419d048e0b`. A verificação correspondente é
`VFY-DOCS-CONTINUATION-019`; o checker mantém 11 PASS, 1 WARN histórico e 0
FAIL. O cache user-owned `packages/design-system/tsconfig.vue.tsbuildinfo`
continua sendo o único caminho dirty e não deve ser staged.

Ponto de entrada executável:

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
git log -1 --oneline
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

Retomar pela matriz HTTP A/B da internação e pela revisão de auditoria em
falha tardia; depois expandir admissão → handoff/permanência → estoque → alta
→ billing → recebimento/ledger/auditoria/outbox. O estado global permanece
`IN_PROGRESS/PARTIAL`.
