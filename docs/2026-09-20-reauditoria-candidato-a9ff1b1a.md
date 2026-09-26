---
document_status: historical
document_kind: baseline
effective_date: 2026-09-20
owner: Engenharia e Liderança técnica CVG-HIS
review_cycle: on-candidate-change-or-material-evidence
candidate_sha: a9ff1b1aeec393084cea2405eafc0c4bbe403437
verdict: FAIL_BLOCKED
superseded_by: docs/2026-09-26-auditoria-completa-sistema.md
---

# Reauditoria do candidato `a9ff1b1a` — 20/09/2026

[Plano da nova rodada](2026-09-20-plano-executivo-nova-rodada-melhorias.md) ·
[Roadmap](2026-09-20-roadmap-nova-rodada-melhorias.md) ·
[Backlog](2026-09-20-backlog-nova-rodada-melhorias.md) ·
[Quality Bar](triple-a/QUALITY_BAR_V1.json)

## Veredito executivo

**A correção do parser em `a9ff1b1a`, o binding de Vault, o proxy same-origin
da SPA e as provas locais de OCI/Trivy estão aprovados no escopo local, mas o
candidato integrado e o release continuam `PARTIAL / BLOCKED`.** A regressão
distingue a implementação atual da implementação pai, os testes focais passam
e o validador continua fail-closed para condições estaticamente falsas.

O bloqueio não é apenas externo. A fotografia de entrada encontrou um P0 no
deploy: o Helm de produção ativava `VAULT_ENABLED=true` sem injetar
`VAULT_URL`, `VAULT_ROLE_ID` e `VAULT_SECRET_ID`. Esse defeito foi corrigido
com `existingSecret`/`secretKeyRef` e validado em Helm e runtime descartável;
isso não equivale a credenciais reais ou aceite de target.

Também há drift material de governança: `HEAD` está 28 commits à frente de
`origin/main`, a identidade canônica e os snapshots Triple-A ainda apontam para
`ec092d77`, o baseline executivo anterior aponta para `324099e5`; a migração
append-only do controlador agora passa `check_state.py` 11/11, mas a identidade
continua stale e o estado Gauntlet tem apenas uma rodada corrente `BLOCKED`, sem
aceite final candidate-bound.

Não há autorização para declarar `main green`, release pronto ou Triplo AAA.

## Escopo, método e barra congelada

Foram inspecionados o commit informado, parser e regressões, workflows, Helm,
runtime de segredos, scripts de imagem/release, documentação governada, estado
`.agent`, estado Gauntlet, topologia do monorepo e referências remotas. Nenhum
deploy, publicação, rotação de segredo ou operação destrutiva foi executado.

| ID | Critério obrigatório | Método | Resultado |
| --- | --- | --- | --- |
| A1 | Identidade e diff exatos | Git e inspeção do commit | PASS |
| A2 | Fix do parser rejeita o caso ruim | teste atual contra código atual e pai | PASS |
| A3 | Cadeia de supply chain continua fail-closed | testes, mutações e inspeção | PASS local |
| A4 | Runtime/deploy integrado é coerente | Helm, imagens e bootstrap | FAIL |
| A5 | Evidência e controle são atuais e reconciliados | docs, `.agent`, `.gauntlet` e remoto | FAIL |
| A6 | Bloqueios externos permanecem explícitos | registro P0 e dependências | PASS como bloqueio |

O follow-up corrigiu A4 no escopo local e reconciliou A5 estruturalmente, mas a
identidade continua stale e a worktree não está limpa; por isso o estado global
permanece `PARTIAL / BLOCKED`.

## Fotografia do repositório

- Perfil: brownfield, risco T4 crítico e blast radius cross-system.
- Monorepo: 68 pacotes, API, worker, SPA e módulos de domínio compartilhados.
- Dados: 181 arquivos de migração; a última migração ativa é `0177`.
- Automação: nove workflows GitHub Actions e 181 scripts locais.
- Testes inventariados por arquivo: 309 em `apps`, 147 em `packages`, 286 em
  `tests` e 44 em `e2e`.
- Portfólio operacional `.agent`: fotografia de entrada com 72 itens — 3
  `DONE`, 17 `BLOCKED`, 3 `READY`, 48 `TODO` e 1 `VERIFY`; estado atual após a
  reconciliação append-only: 3 `DONE`, 18 `BLOCKED`, 3 `READY`, 48 `TODO` e 0
  `VERIFY`. Nos 65 cartões `PROD`: 1/16/48.
- Superfície documental/evidência: `docs` ocupa aproximadamente 2,4 GB e
  `artifacts` local aproximadamente 53 GB; `.gauntlet/state.json` rastreado
  ocupa aproximadamente 146 MB.

Esses números descrevem volume e risco de mudança; não são nota de qualidade.

## Auditoria da melhoria do parser

O commit `a9ff1b1aeec393084cea2405eafc0c4bbe403437` altera somente
`scripts/validate-supply-chain.mjs` e
`scripts/validate-supply-chain.test.mjs`. O caso assinado com token numérico
acima do limite total é rejeitado, enquanto o caminho unsigned com zeros à
esquerda preserva a semântica octal legada observada no runner.

Evidência da entrada e do follow-up:

- `node --test scripts/validate-supply-chain.test.mjs`: 17/17;
- `node --check` nos dois arquivos: PASS;
- teste atual contra o validador pai: 15/16, falhando exatamente na nova
  regressão;
- fronteiras focais: decimal 380 aceita; octal legado 381 aceita; decimal 381
  rejeita com o finding exato; `toJSON(fromJSON())`, job e step estáticos
  falsos têm findings parent/step fixados;
- crítico I1 `critic_parser_audit_20260920`: `APPROVE`.

O gap residual desta frente é externo: o arquivo ainda não é um candidato
congelado e não existe CI no SHA exato. A suíte local não promove release.

## Achados materiais

### AUD20-01 — Vault de produção não é injetável — P0, crítico

`values.prod.yaml` ativa Vault; o ConfigMap só publica o flag e o Deployment
não possui `secretKeyRef` para URL, role ID ou secret ID. `createSecretsManager`
lança erro em ambiente production-like quando qualquer um falta. O smoke local
de imagens não exercita essa configuração.

Aceite de fechamento: values/schema/templates permitem um Secret existente,
o render prod contém as quatro referências esperadas, o caso ausente falha
antes do rollout e um runtime isolado com Vault de teste chega a ready.

Follow-up local: o aceite técnico bounded passou; o pacote final3 registra os
renders, AppRole inválido `403`, API `/ready`, migrações e roles em rede
descartável. O achado permanece aberto para target e credenciais reais.

### AUD20-02 — identidade do candidato e snapshots estão stale — P0, crítico

`HEAD=a9ff1b1a`, `origin/main=363c87ef`, mas
`CURRENT_CANDIDATE_IDENTITY.json`, `P0_REGISTRY.json` e os seis snapshots
correntes continuam vinculados a `ec092d77`. `pnpm docs:validate` e
`pnpm validate:candidate-identity` falham corretamente.

Não se deve simplesmente trocar hashes: evidência fechada precisa ser renovada
ou marcada stale. A identidade só pode ser regenerada depois da correção P0,
freeze e coleta candidate-bound.

Follow-up local: o gerador agora recusa validação e geração em worktree suja. A
identidade atual foi mantida stale por desenho; não há snapshot novo até existir
freeze autorizado.

### AUD20-03 — controlador operacional incompatível com o contrato atual — P0, alto

O checker do engineering framework reporta 30 falhas: enums `VERIFY` usados
como lifecycle stage, ExecPlan inválido, transições repetidas, registros antigos
sem campos obrigatórios, evidências absolutas, gate fora do escopo e `DONE` sem
prova tipada suficiente. O relato do usuário diz `blocked`, mas estado e backlog
mantêm `P0-CLOSURE` em `VERIFY`.

Como os ledgers são append-only, a correção deve ser uma migração/reconciliação
explícita; não se deve editar silenciosamente o histórico para produzir verde.

Follow-up local: migração append-only e gate `AUDIT_RESOLVED` foram registrados;
`check_state.py` passa 11/11. O histórico não foi apagado e a aceitação externa
continua bloqueada.

### AUD20-04 — estado Gauntlet não sustenta um PASS final — P0, alto

O histórico da fotografia de entrada terminava no rebaseline histórico
`c01c2ad58ca0…`, porém `state.json` e `progress.md` ainda estavam `ACTIVE`,
`FIX_RETEST` e `STALE`. Há registros das rodadas rejeitadas `final2`/`final3`,
mas não um round final válido de `final29`; a rodada final7 registrada em
`20:05:07Z` ficou stale quando o controle NR-013 foi ampliado. A rodada
candidate-local pós-NR-013 foi então rebaselineada e registrada como
`BLOCKED`, com os oito critérios P0 e uma sentinela bounded nova; nenhum
fingerprint histórico (`996e…`/`3f88…`) foi reutilizado.

Follow-up local: a rodada corrente permanece `BLOCKED` e não é `STOP` porque CI,
target, UAT e autoridade ainda não existem.

### AUD20-05 — CI/release exatos não existem para o SHA — P0, crítico

O remoto confirma `origin/main=363c87ef`; o candidato local está 28 commits à
frente. Logo não pode existir workflow encadeado do GitHub para `a9ff1b1a` no
estado observado. As provas OCI/Trivy da rodada corrente são locais e efêmeras;
não substituem CI/release encadeado.

### AUD20-06 — Helm local admite fallback estático — P1, médio

`validate-helm.mjs` passou, mas informou que o binário Helm não está instalado.
Isso prova regras estáticas, não `helm lint/template`. O caminho obrigatório de
CI deve usar `REQUIRE_HELM=1`.

### AUD20-07 — configuração SPA sugere runtime que Vite não consome — P1, médio

O chart injeta `VITE_API_BASE_URL` via ConfigMap em runtime; Vite normalmente
resolve essa variável no build. O proxy same-origin atual reduz o impacto, mas
a configuração é inefetiva/ambígua e deve ter fonte única.

Follow-up local: o valor foi removido dos ConfigMaps de produção/staging; a
única exceção é o `ARG` de build para builds locais/direct API. O contrato
same-origin `/api` e seu teste Helm permanecem explícitos em
`docs/architecture/spa-api-base-url.md`.

### AUD20-08 — estado/evidência excessivamente grandes — P1, médio

O fingerprint inclui grande inventário de arquivos ignorados e persiste o
resultado em `.gauntlet/state.json`. Isso aumenta custo, conflito de Git e risco
de drift. O estado ativo também duplica hashes, logs e caminhos `/tmp` que
deveriam estar em artefatos referenciados.

### AUD20-09 — hotspots arquiteturais continuam ativos — P1, alto

O inventário vigente registra, entre outros, `apps/api/src/server.ts` com 8.328
linhas, `apps/worker/src/runner.ts` com 2.139 e o validador de supply chain com
3.593. A próxima rodada não deve iniciar refatoração ampla antes de estabilizar
release e governança, mas esses hotspots precisam de decomposição testável.

## Verificações da fotografia de entrada

| Verificação | Resultado |
| --- | --- |
| HEAD e diff do commit | PASS; SHA e dois arquivos confirmados |
| Testes do parser | PASS 17/17 |
| Known-bad com código pai | FAIL esperado 15/16 |
| `pnpm validate:supply-chain` | PASS; 131/13/15/6/4 |
| mutações de digest/severidade/exit/final gate | rejeitadas |
| Helm local | PASS com Helm pinado; renders dev/staging/prod e known-bad Vault |
| `pnpm validate:p0-registry` | PASS estrutural; 3 fechados/11 abertos em candidato stale |
| `node scripts/validate-documentation.mjs` | PASS para a topologia documental e links |
| `pnpm docs:validate` | BLOCKED pelo snapshot Triple-A stale `ec092d77`; identidade stale permanece explícita |
| `pnpm validate:candidate-identity` | BLOCKED por source/control worktree suja e identidade stale |
| checker `.agent` | PASS 11/11 após migração append-only; aceitação continua bloqueada |
| remoto `main` | `363c87ef`; 28 commits atrás do HEAD |
| OCI/Trivy/runtime | PASS local final4; três scans 0 HIGH/CRITICAL e gate prebuilt passou |
| sentinela das críticas | revisão fresh pós-correção aprovou os controles locais sem mutação; round Gauntlet corrente permanece BLOCKED por externalidades |

Não executados na fotografia de entrada: builds OCI, Trivy, runtime Docker
completo, CI GitHub, release encadeado, deploy em target, restore/soak, UAT e
aceites. O follow-up local final4 executou OCI/Trivy/runtime descartável, mas
não substitui os itens externos.

## Referências correntes do control-plane e da evidência

As referências canônicas da rodada atual são [estado `.agent`](../.agent/state.json),
[backlog operacional](../.agent/backlog.json), [ledger de verificação](../.agent/verification.jsonl),
[evidência NR-013](../.agent/evidence/nr013-release-mutation-20260920.json) e
[gate local NR-013](../.agent/gates/nr013-local-blocked-20260920.json). Os artefatos
Gauntlet locais (`.gauntlet/state.json` e `.gauntlet/history.jsonl`) são opcionais e
podem não estar presentes em um checkout limpo.
O pacote e a sentinela são escopados à worktree corrente; não representam uma
identidade candidate-bound até que fonte e controle sejam congelados. Ledgers
históricos ainda retêm caminhos locais absolutos/`file://`; isso é uma limitação
de portabilidade documentada, não uma alegação de artefato externo. A rodada
Gauntlet final7 anterior está stale; a rodada corrente pós-NR-013 é `BLOCKED`,
inclui os oito critérios P0 (inclusive CI e visual), registra `mutation_clean` e
exclui deliberadamente o estado mutável do próprio Gauntlet.

## Decisão e próxima ação

O parser pode permanecer integrado e as correções locais de Vault/SPA/runtime
estão registradas. O candidato não deve ser publicado como release-ready. A
próxima ação técnica é `NR-004`: obter um commit/freeze autorizado dos bytes de
fonte e controle e só então regenerar identidade/snapshots; em seguida exigir
CI/release candidate-bound e target/UAT/autoridade.

Veredito global: **PARTIAL / BLOCKED**, confiança alta. Limitações: worktree e
controles não congelados, sem CI/release candidate-bound, target, credenciais
reais, UAT ou autoridade; as provas final4 são locais e descartáveis.
