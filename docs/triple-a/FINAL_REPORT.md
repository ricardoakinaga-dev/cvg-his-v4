# CVG-HIS V4 — Current Assurance Report

## Relatório local do candidato — 2026-09-21

**Candidate funcional avaliado:** `29b03941c5d46a4598c11f27bbb7125d1d205f0f` (runtime sob freeze; a identidade canônica será regenerada no commit limpo final).

Os gates locais passam: supply-chain 17/17, dependências, segredos,
backup/restore documental, métricas/upload, sanitização do health do worker,
Helm 3.15.4, lint, typecheck, build, suíte monorepo, PostgreSQL crítico
623/623, processos 11/11, SPA E2E 424/424 e imagens production-shaped. Não há CI/release candidate-bound,
registry/attestation, target, UAT ou autoridade.

O registro mantém **11 P0 abertos** e o veredito é **LOCAL_COMPLETE /
EXTERNAL_BLOCKED**; certificação Triplo AAA segue **BLOCKED / NOT PROVEN**.

Detalhes, hashes e limites: [remediação dos P0](30-p0-remediation-20260918.md) e [avaliação por critério](evidence/p0-remediation-20260918.json). **Certificação Triplo AAA: BLOCKED / NOT PROVEN.**

---

## Fotografia histórica — consolidação anterior de 2026-09-18

**Candidate funcional avaliado:** `51391915eb165a9b99e33682d0ab557f6263cb2a`

**Verdict:** **BLOCKED / NOT PROVEN** para certificação Triplo AAA.

A consolidação Git está concluída: somente main permanece localmente e no
GitHub, com histórico anterior em bundle verificado. O runtime da aplicação
permanece na fonte `d8d8b821`; a mudança atual corrige a execução do benchmark.

O [CI 35352873670](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35352873670)
do predecessor `47ba9c54` terminou com **16/17 jobs aprovados**, incluindo
cobertura crítica, global **2.932 testes/82,03% de branches**, **619 testes de
integração**, E2E, visual, API, Windows, build, tipos, lint e segurança.
Performance falhou: query p95 **184,8ms**, API p95 **207,65ms**, contra150/200ms.
A correção do encerramento de fixtures PostgreSQL foi confirmada no CI.

O candidato usa `response.json()` nativo do k6 para interpretar o corpo completo
do OpenAPI, mantendo o mesmo predicado, pedidos, dados, estágios e limites.
O teste nativo de equivalência passou **63/63 verificações**; os contratos
passaram **6/6**. A crítica independente aprovou a preservação do instrumento e
verificou propagação de falhas, encerramento e fingerprints sem alterações.

A reprodução anterior de quatro CPUs usava `GOMAXPROCS=4`; o CI usa1. Na nova
comparação controlada, ambos os casos usam quatro CPUs, `GOMAXPROCS=1`, seed
novo e profiler de180s: query p95 **102→20ms**, API **102,79→17,77ms**,
**3.421→4.516 iterações**, CPU do gerador **116,86→66,06s**. Ambos passaram9/9
localmente; esses resultados explicam o custo removido, sem provar o CI remoto.
A configuração do gerador agora consta na proveniência antes/depois. O CI final
exato e sem profiler permanece pendente na publicação deste registro.

[Relatório atual, decisões por branch e limitações](./29-main-unification-20260918.md).
Manifesto crítico revision85, ancorado no candidato acima, com os quatro novos
inputs de execução registrados. Os555 caminhos de fonte e thresholds não
mudaram. Target, UAT, recuperação, attestations e autoridade de release
continuam sem prova suficiente; não há certificação AAA.

## Registro histórico anterior

As seções abaixo preservam observações de candidatos anteriores. Referências a
“corrente”, “mais recente” ou “PASS” nessas seções valem para suas datas e SHAs;
o relatório acima é a fotografia atual.

**Candidate funcional avaliado:** `0a2eba022fac4b1100138e1ad17cab87f8d049c8`
(snapshot integrado seletivamente das branches, com registro P0 candidate-bound, evidence graph, lookup autoritativo combinado, health probe coalescido, verificação criptográfica WebAuthn/FIDO2, resolução OpenAPI cross-runtime, configuração de RP/origens server-owned e thresholds inalterados)

**Verdict:** **BLOCKED / NOT PROVEN**

**Atualização terminal — 2026-09-18:** além do baseline PostgreSQL local,
WebAuthn FIDO2 passou `14/14` testes criptográficos, configuração `47/47`, MFA
`66/66`, rotas nativas `47/47`, typechecks MFA/API e guards OpenAPI/runtime/
dependências; as rotas OpenAPI passaram `5/5`, o build da API e as rotas nativas
compiladas passaram `2/2`. O registro persiste o credential ID e a chave pública reais e
rejeita RP ID vindo de header. O [CI exato #282](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35306907606)
terminou `failure`: `Critical Coverage Gate` e `Performance (k6 SLOs)` falharam;
E2E SPA, integração, unitários, build, guards, OpenAPI, visual e os demais jobs
terminaram `success`. A ficha de jobs e artefatos está em
[`26-remote-ci-35306907606.md`](./26-remote-ci-35306907606.md). O [State of Art Closure #43](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35306907572)
terminou `success`, mas não substitui os gates obrigatórios. Há `2` P0 fechados
e `12` abertos; target, recovery, UAT, attestation de fabricante, governança e
autoridade de release continuam sem prova. A matriz local cross-browser também
falhou fora do Chromium e está registrada em
[`27-local-visual-matrix-20260918.md`](./27-local-visual-matrix-20260918.md).

## Executive Summary

O candidato preserva o modular monolith e a reconciliação fail-closed de
proveniência. A paridade de Patient, o CORS credentialado restrito, os contratos
de validação HTTP e o fluxo WebAuthn criptográfico foram validados. O manifesto
crítico está na revisão 80 e o workflow publica evidência SQL antes do checker.
Os shards locais atuais passam,
mas essa prova não substitui o CI terminal exato nem os gates de target,
recovery, attestation, UAT, governança ou autoridade de release.
O provider raw de feature flags agora respeita kill switch persistido, expiração,
precedência de escopo e allowlist fail-closed, com cache limitado ao vencimento;
os limites estão documentados no ADR-014. Nenhum threshold ou baseline visual foi
relaxado e não há autorização para declarar `main green`,
release produtivo ou `TRIPLE-A VERIFIED`.

## Validação local do candidato atual

A reconciliação seletiva preservou as migrations ACL canônicas `0175/0176` de
`main` e incorporou somente os deltas não conflitantes da branch final-ci. O
novo candidato passou build, DB `36/36`, auth `72/72`, API `620/620`, reexport
`17/17` e SQL evidence `6/6`; o CI remoto exato desse candidato ainda precisa
terminar.

A validação local corrente passou a fonte canônica de migrações, o produtor SQL
com `175` migrações ativas e `7` históricos, a integração efêmera com `105/105`
arquivos e `933/933` testes, WebAuthn `14/14`, configuração `47/47`, MFA
`66/66`, rotas nativas `47/47`, R05-010 e os typechecks da API. Isso é evidência
local; não substitui CI terminal, target, recovery, UAT, attestation ou
autoridade de release.

## Contexto histórico — revisão 59 / snapshot `d9acec6e`

O manifest crítico revision 59 foi reancorado no commit de fonte `d9acec6e` e
complexidade, sem mudança de
thresholds, fontes ou aplicabilidade funcional; o snapshot corrente é
`d9acec6ef1763138d0b8b04a31ba7960db865c9c`, com implementação funcional em
`95227098193966638102ccfe1e54842289ebe7f1`, sobre `15ba86a883a4283c5bf86c5825bf7d9a6ca5d089`. O runner crítico preserva o SQL histórico,
usa PostgreSQL 16 e trata os inicializadores V8 do Node 22 sem fundir identidades.
O produtor SQL agora é executado e publicado antes do checker. Os produtores atuais são identificados na
[`evidência corrente`](./17-current-execution-evidence.md). Os CI #191/#192
terminaram `failure` com `13/17` jobs verdes nos ancestrais, mas o Critical
Coverage Gate passou com R05-010, processo crítico, Vue especializado e
evidência SQL aceitos. A correção do teste ML e a reconciliação do inventário Vitest
inauguraram o candidato anterior. O candidato atual elimina a leitura redundante
de sessão antes da resolução de tenant, usando o JWT apenas como contexto de
roteamento e mantendo a guarda final autoritativa; a correção `95227098` mapeia
erros genéricos do carregamento autoritativo para 503 e ajusta o teste de
revogação para a única leitura final e mantém `server.ts` dentro de `8.335`
linhas. O CI #198 anterior terminou `failure` e o #199 falhou em complexity;
nenhum dos dois é transferido; o #203 falhou nos gates E2E/visual/performance no ancestral antes de
representar o snapshot reancorado. O #205 executou o `main` remoto com o workflow corrigido: o fluxo funcional passou, mas a matriz visual falhou em `29/29` por drift provável de fonte/renderização e o k6 excedeu `query p95=212 ms` e `inventory p95=200,36 ms`. O candidato permanece
**BLOCKED / NOT PROVEN**.

O CI #203 foi executado no ancestral `261e5b45` e não é promovido. A correção do
manifesto, o registro P0, a identidade e o harness SPA foram validados localmente, não relaxam
nenhum guard, threshold ou baseline; a falha terminal do #205 está registrada em
[`20-ci-205-evidence.md`](./20-ci-205-evidence.md).

O registro [`P0_REGISTRY.json`](./P0_REGISTRY.json) contabiliza 14 itens, com 2
fechados por evidência local fresca e 12 abertos por dependerem de CI remoto,
infraestrutura alvo, operação autorizada ou decisão humana. A regra é
fail-closed: ausência de evidência não vira `PASS`, e o status legado `DONE` é
inválido.

## Atualização terminal — isolamento da prova clínica

O CI #146 falhou no passo de API E2E canônico depois de a suíte SPA passar. A
reprodução local com PostgreSQL real passou as duas jornadas. O workflow agora
prepara `cvg_his_e2e_canonical` e executa a API canônica em `3113`, separada do
banco mutável da suíte SPA. O contrato CI passou `18/18`; o CI #147 confirmou
essa correção em `8s`. O #148 falhou nos SLOs remotos de k6, sem alteração de
threshold. O veredito geral permanece **BLOCKED / NOT PROVEN** por performance
remota e pelos gates externos de target e release.

## Scorecard

| Área                 | Estado atual                 | Evidência                                                                                                                               |
| -------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture         | BOUNDED PASS                 | guards e contratos locais                                                                                                               |
| Security             | PARTIAL                      | SAST, secrets, dependency audit e testes locais                                                                                         |
| Testing              | PARTIAL                      | API `619/619` e integração `16/16` locais passaram; o CI #205 teve `395` testes SPA funcionais passados, mas `29` screenshots falharam; API clínica canônica `2/2` passou |
| Clinical Safety      | PARTIAL                      | matriz, invariantes e jornadas canônicas                                                                                                |
| Worker               | LOCAL PASS / target aberto   | retries, lease, fencing e DLQ                                                                                                           |
| CI/CD                | BLOQUEADO no SHA atual       | CI exato terminou `failure` em Critical Coverage e Performance; não há `main green` |
| Observability        | LOCAL PASS / target aberto   | métricas, traces e diagnósticos                                                                                                         |
| Recovery             | BLOCKED                      | Docker impediu restore drill real                                                                                                       |
| Frontend             | LOCAL PASS / REMOTE PASS     | E2E SPA e Visual Regression passaram no CI exato; nenhuma baseline foi promovida |
| Database             | PARTIAL                      | testes locais; RLS target não provado                                                                                                   |
| Supply Chain         | PARTIAL                      | pins/guards locais; attestations abertas                                                                                                |
| Production Readiness | NOT PROVEN                   | deploy, target, UAT e autoridade ausentes                                                                                               |
| Overall              | `FAIL/BLOCKED`               | CI exato tem dois gates rejeitados; target, recovery, UAT, governança e autoridade continuam abertos |

## P0 Findings

Permanecem abertos: RLS/runtime target, workflow PostgreSQL externo, crash
recovery do worker, auditoria externa, backup/restore, deploy/rollback,
attestation, soak, UAT e autoridade de go/no-go.

## Remaining Risks

O k6 local no banco descartável, com a API limitada a quatro CPUs, passou `9/9`
SLOs sem alteração de threshold: API p95 `124,89 ms`, p99 `190,66 ms`, query
p95 `138 ms`, auth p95 `36,56 ms`, erros HTTP `0%` e disponibilidade `100%`.
Essa prova é local e não substitui o CI remoto, o target ou um envelope externo.
O Docker daemon indisponível ainda impede o drill real de recuperação nesta
estação.

O CI #205 confirmou a execução remota no `main`, mas terminou `failure`: o
workflow funcional e clínico passou, enquanto as 29 imagens divergiram em
desktop/mobile e light/dark. O comparativo esperado/atual aponta drift provável
de fonte/renderização entre o host local e Ubuntu 22.04; nenhuma baseline foi
promovida. No mesmo run, `query_latency_ms.p95=212 ms` e
`inventory_latency_ms.p95=200,36 ms` excederam os limites congelados, embora
erros tenham permanecido em `0%`. A evidência terminal está em
[`20-ci-205-evidence.md`](./20-ci-205-evidence.md).

## Release Recommendation

**BLOCKED**. O claim `TRIPLE-A VERIFIED` continua proibido até que todos os
gates da régua congelada sejam satisfeitos no mesmo candidato e com evidência
externa verificável.
