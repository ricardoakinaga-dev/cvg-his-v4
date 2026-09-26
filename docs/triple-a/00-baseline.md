# Triple-A — 00 Baseline

## Baseline local do candidato — 2026-09-21

Baseline autoritativo atual: `e26fe603741ff066402bd36e8be535d267b34bfc` (identidade do candidato; runtime/source `e26fe603741ff066402bd36e8be535d267b34bfc`).

> Nota: rebind de 26/09/2026 para o candidato da rodada 2; nenhuma evidência de execução foi refeita neste SHA (status BLOCKED / NOT PROVEN). As evidências registradas pertencem a `d9a16cf45898` — mapeamento em `evidence/sha-remap-20260926.json`.

Os gates locais do candidato passam; a descoberta de contas do worker agora falha fechada acima de 1.000 contas em vez de truncar tenants. Os gates incluem supply-chain 17/17,
dependências/segredos, Helm 3.15.4, qualidade, banco crítico 623/623,
processos 11/11, SPA E2E 424/424 e imagens production-shaped. CI/release,
registry/attestation, target/UAT/autoridade não foram provados.

O registro mantém **11 P0 abertos** e o Triplo AAA está **BLOCKED / NOT PROVEN**
até haver CI, target, recuperação, UAT e autoridade.

Detalhes, hashes e limites: [remediação dos P0](30-p0-remediation-20260918.md) e [avaliação por critério](evidence/p0-remediation-20260918.json). **Certificação Triplo AAA: BLOCKED / NOT PROVEN.**

---

## Fotografia histórica — consolidação anterior de 2026-09-18

Baseline autoritativo: `51391915eb165a9b99e33682d0ab557f6263cb2a`.

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

## Snapshot vigente — 2026-09-18T03:21:30Z

O baseline autoritativo do snapshot funcional atual está em: `0a2eba022fac4b1100138e1ad17cab87f8d049c8`, candidato integrado para publicação em `origin/main` (reconciliação seletiva de branches, lookup autoritativo combinado, health probe coalescido, verificação criptográfica WebAuthn/FIDO2, RP ID/origens server-owned, resolução robusta do artefato OpenAPI e thresholds preservados; o comportamento ERP anterior permanece preservado).

O delta de autenticação foi validado localmente com credencial P-256 real,
attestation `fmt:none`, assertions assinadas, rejeição de replay/origem/RP ID e
CAS de contador. O [CI #35302897107](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35302897107)
estava `pending` na observação; a closure do State of Art #35302897028 estava
em execução, mas não prova target, recovery, UAT, attestation de fabricante ou
autoridade de release.
Ele também está indexado em
[`15-current-baseline.md`](./15-current-baseline.md) e
[`17-current-execution-evidence.md`](./17-current-execution-evidence.md), com identidade canônica em
[`CURRENT_CANDIDATE_IDENTITY.json`](./CURRENT_CANDIDATE_IDENTITY.json). A
documentação corrente sucede os candidatos históricos sem transferir evidência;
o candidato `4c12b259` consolida a cobertura de contratos de pagamento, marketing,
laboratório, ML e limites operacionais, preservando o runner PostgreSQL 16, os
checksums de migração e a aceitação restrita do par de inicializadores V8; a
branch de assurance é ancestral, sem commits exclusivos. O graph e o gate corrente permanecem
`BLOCKED / NOT PROVEN`. O registro canônico [`P0_REGISTRY.json`](./P0_REGISTRY.json)
contém 14 itens, dos quais 2 estão fechados com evidência fresca e 12 permanecem
abertos, sem usar o status legado `DONE`.

Os CI #191/#192 dos ancestrais terminaram `failure` com `13/17` jobs verdes e Critical Coverage Gate aprovado; não são transferidos para o novo candidato. No candidato anterior, a cobertura global passou `273` arquivos, `2.907` testes e o threshold congelado (`87,46%` statements, `82,00%` branches, `89,32%` functions e `88,91%` lines), além de lint e typecheck. A otimização corrente elimina a leitura duplicada de sessão antes da resolução de tenant: o JWT assinado fornece somente contexto de roteamento, enquanto a guarda final continua relendo sessão, usuário, função e permissões de forma autoritativa. A correção `95227098` preserva o mapeamento fail-closed de erros genéricos de sessão para HTTP 503 sem reintroduzir a leitura duplicada e mantém `server.ts` dentro do orçamento de `8.335` linhas; a suíte API passou `618/618` e a integração PostgreSQL descartável passou `16/16`. A captura visual local do candidato anterior passou `29/29` e o benchmark local PostgreSQL passou `9/9` SLOs. O [CI #214](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35204183554), executado no candidato publicado com documentação, passou todos os gates estruturais, críticos, unitários, integração, API, Windows, E2E SPA (`424/424`) e Visual (`29/29`), mas reprovou 2 de 9 SLOs do k6: query p95 `217 ms` e inventory p95 `202,76 ms`. Nenhuma baseline ou threshold foi relaxada. Target, recovery, UAT e autoridade permanecem `NOT PROVEN`. Nenhum resultado
parcial ou histórico é promovido. Target, recovery, UAT, attestation,
governança e autoridade de release continuam `NOT PROVEN`.

## Reconciliação local — 2026-09-18

- A recoleta local fechou `P0-DATA-POSTGRESQL-RUNTIME` com migration-source,
  SQL producer e integração PostgreSQL efêmera candidate-bound; o registro
  completo está em [`24-local-automated-closure-2026-09-18.md`](./24-local-automated-closure-2026-09-18.md).
- O CI exato `35296518702` está em execução no candidato publicado; nenhum
  resultado remoto é promovido antes do estado terminal. O veredicto global
  continua `BLOCKED / NOT PROVEN` por gates externos e humanos.

## Reconciliação da correção visual — 2026-09-17

- O candidato local `e4acaf40e399dd29f7c6ec51232dd0ecc92301b7` adiciona
  `--disable-lcd-text` ao Chromium e registra os seis baselines derivados dos
  `actual.png` do artefato visual do CI #212, depois de inspeção pixel-a-pixel
  que encontrou somente fringes de antialiasing de texto, sem mudança de layout
  ou conteúdo.
- A mesma árvore funcional foi publicada na `main` remota como
  `a4f2ef6705cebca552b07f20ebd3d596d5714079`, sem force-push. A branch
  `origin/fix/state-of-art-ci-assurance@fe5406c2` continua ancestral e sem
  commits exclusivos; não há merge seletivo adicional a reaplicar.
- O [CI #214](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35204183554)
  confirmou Visual `29/29`, E2E SPA `424/424` e Critical Coverage `PASS`, mas
  terminou `failure` nos SLOs remotos de query e inventory. Até a correção de
  performance e as provas externas, `main green`, certificação Triple-A e
  release continuam `BLOCKED / NOT PROVEN`.

## Reconciliação do ciclo de feature flags — 2026-09-17

- O commit `e4acaf40e399dd29f7c6ec51232dd0ecc92301b7` corrige o provider raw usado
  pela API: aplica `enabled=false` e `expiresAt` antes dos overrides, seleciona
  o escopo mais específico entre usuário/conta/ambiente, nega allowlist sem
  correspondência e limita o cache ao vencimento.
- O boundary de leitura foi injetado para testes sem remover a fronteira
  tenant-scoped de PostgreSQL; percentuais inválidos falham fechado e erros de
  infraestrutura continuam observáveis e delegam ao fallback.
- O ADR-014 e os testes específicos do provider/API documentam e verificam o comportamento.
  O manifesto crítico foi reancorado pela ferramenta oficial na revisão 68;
  nenhum threshold, shard ou evidência histórica foi promovido.

## Registro obrigatório do prompt

| Campo              | Registro                                                                                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Problema           | Estabelecer arquitetura, forças, dívidas e riscos antes da implementação.                                                                                                                                                                                  |
| Estado anterior    | Baselines misturavam candidatos e não distinguiam local, CI e target.                                                                                                                                                                                      |
| Decisão            | Usar este índice histórico com o snapshot corrente em `15-current-baseline.md`.                                                                                                                                                                            |
| Implementação      | Prompt preservado, quality bar congelado, matriz, ledger append-only e registro P0 candidate-bound com fechamento fail-closed.                                                                                                                              |
| Arquivos alterados | `docs/triple-a/MASTER_PROMPT.md`, `QUALITY_BAR_V1.json`, `P0_REGISTRY.json`, `scripts/validate-p0-registry.mjs`, `15-current-baseline.md`, `17-current-execution-evidence.md`, `.github/workflows/ci.yml`.                                                |
| Testes             | `pnpm docs:validate`, `pnpm validate:p0-registry`, 3 testes do registro e contratos de CI.                                                                                                                                                                  |
| Evidências         | Registro P0 com `1` fechado e `13` abertos; CI #203 do ancestral foi rejeitado por divergência do harness e não é transferido; gate local continua `BLOCKED / NOT PROVEN`; gates de target permanecem sem prova.                                                                                |
| Riscos residuais   | Evidência de target, recovery, governança, UAT e autoridade humana ausente.                                                                                                                                                                                |

## Reconciliação corrente — 2026-09-11T22:12:14Z

- Snapshot atual: `68600d6a55dcf18bd04c28ff3ee7528cc686efdb` (código funcional; documentação de reconciliação acompanha o candidato); `main`, `HEAD` e `origin/main` coincidem, com rollback remoto preservado e sem force-push.
- Esta fotografia vincula a evidência ao SHA exato e não transfere resultados históricos para commits documentais posteriores.
- CI atual: [#129](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34650926250) terminou `failure` com 15/16 jobs aprovados; somente Performance falhou em `Run k6 benchmark`/`Check SLO results`. O artefato está vinculado ao run, mas as métricas detalhadas não foram baixadas sem credencial.
- Veredicto: **BLOCKED / NOT PROVEN**. O prompt exige CI verde, quality bar, evidência operacional/humana atual e zero P0; nenhum score histórico é reutilizado e a publicação não é autorizada.
- Gate estrito local: `pnpm release:triple-a` retornou `BLOCKED`, score `54`, critical `54`, `16` P0 abertos e `publication_allowed=false`; a avaliação derivada do quality bar foi `31/33/7`.
- Checks locais de documentação, namespaces, migration source, OpenAPI, RLS estático, deploy surface, Helm estático, supply chain, dependências, schema clínico, secrets, complexidade, typecheck, lint e build passaram. A suíte de cobertura passou com 2.525 testes e 1 skipped.
- O artefato de performance e a limitação de acesso estão documentados em [`critic-performance-assurance-20260911.md`](./critic-performance-assurance-20260911.md). Nenhum threshold foi relaxado e nenhuma evidência de outro SHA foi transferida.
- O prompt e o quality bar mantêm os hashes registrados. O claim `TRIPLE-A VERIFIED` permanece proibido.

## Fotografia histórica da Fase 0

## Resultado histórico da fotografia inicial da Fase 0

| Classe                                                                                          | Situação atual                                                                                                | Prioridade              |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Fundamentos de workspace, contratos, OpenAPI, migrations, RLS estático, typecheck, lint e build | Confirmados por comandos locais com exit 0                                                                    | PASS parcial            |
| Complexidade                                                                                    | `AppointmentsListPage.vue` excede o limite em 106 linhas                                                      | P0 aberto na fotografia |
| Helm                                                                                            | Só validação estática; binário ausente                                                                        | P1 aberto               |
| Testes completos                                                                                | `pnpm test` passou com exit 0 na fotografia inicial; SPA 211 arquivos/1862 testes e API 576 testes reportados | PASS local              |
| Release Triple-A                                                                                | Não existia gate agregador, evidence JSON ou scorecard final                                                  | P0 aberto na fotografia |
| DR/RPO-RTO/performance/chaos/supply chain                                                       | Implementações parciais, sem prova de release atual                                                           | P1 aberto               |
| Clinical criticality/safety invariants                                                          | Matriz consolidada ainda não existia                                                                          | P0 aberto na fotografia |
| UX/design                                                                                       | Base existente, mas certificação visual/UX desta missão ainda não executada                                   | P1 aberto               |

## Classificação de risco

- **Projeto:** `BROWNFIELD`
- **Tier:** `T4_CRITICAL`
- **Risco:** `CRITICAL`
- **Blast radius:** `CROSS_SYSTEM`
- **Trilho preservado:** monólito modular atual; sem V5/microserviços/rail paralelo.

## Decisão

O programa segue para implementação controlada. Não há autorização nem evidência para publicar `TRIPLE-A VERIFIED`, fazer deploy produtivo ou considerar os artefatos legados como prova. O baseline detalhado e as limitações estão em [`TRIPLE_A_BASELINE.md`](../engineering/TRIPLE_A_BASELINE.md), e a próxima ação persistida é `TRIPLE-A-BASELINE-RECORD`.

## Delta de implementação — 2026-09-09

- `pnpm complexity:check`, `pnpm validate:supply-chain`, typecheck e lint passam no worktree atual; a validação final deve ser repetida no commit publicado.
- O gate `pnpm release:triple-a` agora verifica worktree limpo, quality bar, thresholds, manifest por digest, SBOM/security evidence, supply chain, Helm/deploy identity e autoridade externa; sem essas provas, decide `BLOCKED / NOT PROVEN`.
- O replay idempotente grava e compara o ator, falha fechado para legado sem ator e revalida permissões nas famílias críticas mapeadas; runtime PostgreSQL/HTTP revogado ainda está aberto.
- Diagnósticos, prontuário, atendimento e agenda receberam correções de contexto, anexos binários, semântica de tabs, erros visíveis e ações para itens ocultos; browser/Axe/UAT ainda não foram executados.

## Atualização do candidato — 2026-09-10T11:47:12-03:00

- O código candidato local/remoto observado é `1434514c4e0ce88bc29d0feda28b09a61a08670f`; o worktree está limpo e `origin/main` coincide.
- O conjunto hospital-personas direcionado passou `5/5` em `35.2s`; os testes direcionados de controle de release passaram `20/20`; `pnpm test` concluiu sem falha observada na sessão local. Isso não prova HTTP autenticado com roles canônicas, RLS em runtime, auditoria genérica, jornada clínica completa, recovery ou UAT.
- CI #70 ([run 34490757429](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34490757429)) está `in_progress` no SHA exato; `Release Artifacts` #50 foi pulado enquanto CI não está verde.
- O gate local estrito com execução externa pulada retornou `BLOCKED`, com `score=42`, `critical_score=20`, `open_p0=28`, `claim=NOT PROVEN` e `publication_allowed=false`.

Nenhuma dessas evidências autoriza `TRIPLE-A VERIFIED`. O PostgreSQL usado pela E2E era descartável e foi encerrado após o teste.

## Atualização do candidato corrente — 2026-09-10T08:23:05Z

- `HEAD` e `origin/main` coincidem em `a4a5658aa66200a70be709e986152fe61ffc0fe5`, com worktree limpo antes desta atualização documental.
- O candidato corrige a invocação Windows do `pnpm.cmd` no runner (`cmd /d /c call` com argumentos separados). O contrato crítico Linux passou `24/24` e `pnpm lint` passou localmente.
- A execução local de `pnpm test` com PostgreSQL descartável não foi classificada como PASS: falhou na preparação de permissões do banco (`permission denied for table tenants/accounts`). Isso não substitui a execução CI nem prova o workflow PostgreSQL de release.
- CI #58 (`https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885`) está em execução para o SHA corrente. O run #57 foi cancelado quando esse push mais novo o substituiu; seus failures parciais não são evidência do candidato atual.
- O gate estrito com execução externa explicitamente pulada retornou `BLOCKED`, `score=43`, `critical_score=23`, `open_p0=27`, `claim=NOT PROVEN` e `publication_allowed=false`. A execução pulada não autoriza release.
- Permanecem não provados: governança remota de `main`, restore/RPO/RTO, soak/performance alvo, observabilidade entregue, deploy/rollback, imagem assinada, UAT clínico e certificação visual corrente.

## Reconciliação terminal do CI #58 e candidato local — 2026-09-10T08:53:47Z

- O candidato local corrente é `0dc4809b3e06c8334667f39bf51c33e33c3c0f9`, quatro commits à frente de `origin/main` (`a4a5658aa66200a70be709e986152fe61ffc0fe5`). A documentação desta reconciliação ainda não foi publicada remotamente.
- O CI #58 ([run 34454422885](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34454422885)), vinculado ao SHA `a4a5658aa66200a70be709e986152fe61ffc0fe5`, terminou não verde: Typecheck, Dependency Audit, Secret Scan, SAST, Coverage, Repository Guards, Lint, Validate OpenAPI, Build e API Contract Tests passaram; Unit Tests, E2E, Visual Regression, Integration Tests, Windows Critical Process Runner e Performance falharam.
- Unit Tests falhou em duas datas da página de loyalty por formatação dependente de UTC; a correção local fixa `America/Sao_Paulo`.
- Integration Tests executou `65 passed, 1 failed` e `606 passed, 1 failed`; a falha foi a resposta concorrente de billing com `updatedAt` divergente. A correção local torna a atualização condicional e relê a linha autoritativa antes da resposta HTTP.
- O contrato do package manager Windows passou, mas quatro testes do supervisor de processo falharam porque o alvo Node recebeu `-e` e o script como um único argumento. A correção local preserva os limites dos argumentos no PowerShell.
- Visual Regression falhou em 29 snapshots coerentes com a UI consolidada; os 29 `actual.png` do artefato real foram inspecionados e promovidos localmente como baselines versionados para a próxima execução.
- Performance teve disponibilidade 100%, erros HTTP 0% e quatro SLOs de latência acima do alvo; o candidato local explicita pool de PostgreSQL de 60 conexões e mínimo 8 para o perfil de 60 VUs, sem relaxar thresholds.
- E2E SPA executou 422 testes: `387 passed` e `35 failed`. As cinco falhas funcionais foram registradas para correção: três controles/formulários nas personas hospitalares, uma permissão efetiva de diagnóstico, a auditoria master de `/api-keys` e `/api-client` retornando 401, e o botão `Fechamento` no walkthrough; as outras 29 falhas foram visuais.
- O gate local estrito no SHA `0dc4809b` terminou `BLOCKED`, `score=68`, `critical_score=54`, `open_p0=16`, `claim=NOT PROVEN` e `publication_allowed=false`. O Docker local continua indisponível por permissão no socket; nenhum resultado de PostgreSQL local bloqueado foi promovido a PASS.

Nenhum desses resultados autoriza `TRIPLE-A VERIFIED`, release ou deploy. O próximo candidato só será avaliado após os fixes funcionais e uma execução remota nova, vinculada ao SHA publicado.
