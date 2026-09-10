# CVG HIS — Triple-A Baseline

**Data da fotografia inicial:** 2026-09-09 (America/Sao_Paulo)
**Commit observado na fotografia inicial:** `main@696d7dd5`
**Estado da certificação:** `NOT PROVEN` / release bloqueado para Triple-A
**Prompt fonte:** [`docs/triple-a/MASTER_PROMPT.md`](../triple-a/MASTER_PROMPT.md)
**Quality bar:** [`docs/triple-a/QUALITY_BAR_V1.json`](../triple-a/QUALITY_BAR_V1.json)

## Reconciliação do candidato atual — 2026-09-10T11:47:12-03:00

- **Código candidato:** `main@1434514c4e0ce88bc29d0feda28b09a61a08670f`; worktree limpo e `origin/main` coincidente.
- **Estado:** `BLOCKED / NOT PROVEN`. Nenhum claim `TRIPLE-A VERIFIED` é emitido.
- **CI:** run #70 (`34490757429`) está em execução; `Release Artifacts` #50 (`34490858211`) foi pulado porque o workflow exige CI verde.
- **Evidência corrente:** os checks locais e o PostgreSQL descartável são úteis para os seus escopos, mas não fecham branch governance, HTTP/RLS autenticado, jornada clínica completa, UAT, restore/RPO/RTO, soak, target deploy ou autoridade de release.
- **Gate:** execução local estrita com evidência externa pulada retornou `BLOCKED`, `score=42`, `critical_score=20`, `open_p0=28` e `publication_allowed=false`.

O conjunto hospital-personas direcionado passou `5/5` em `35.2s`, os testes de infraestrutura do release-control passaram `20/20` e a suíte workspace local concluiu sem falha observada. Essas provas locais não substituem a execução remota nem os drills operacionais/externos.

As seções abaixo preservam a fotografia histórica da Fase 0. Seus números e SHAs não devem ser interpretados como prova do candidato atual sem uma nova execução registrada no ledger.

## 1. Escopo e regra de evidência

Esta é a Fase 0 do programa Triple-A. O sistema existente é um monólito modular brownfield com `apps/api`, `apps/spa`, `apps/worker`, `packages/modules/*`, contratos compartilhados, banco canônico em `packages/db`, RLS/contexto de tenant e rails Docker/Compose/Helm já estabelecidos. O objetivo é elevar a qualidade sem criar V5, microserviços, API/SPA paralelos ou migration/deploy rail paralelo.

Uma evidência só pode sustentar um critério quando estiver vinculada ao commit/ambiente, tiver sido executada ou inspecionada de forma verificável, registrar limitações e ainda estiver fresca. Docs antigas, estado `.gauntlet` de outra execução, screenshots isolados e artefatos não rastreados não são prova automática.

## 2. Saúde atual observada

| Área | Evidência atual | Resultado | Limitação |
|---|---|---|---|
| Integridade documental e namespaces | `pnpm docs:validate`, `pnpm validate:namespaces`, `pnpm validate:migration-source` | PASS | Validação estática |
| Contratos/OpenAPI | `pnpm validate:openapi` | PASS; 414 paths, 518 schemas | Não substitui teste de runtime |
| Tenant/RLS | `pnpm validate:rls` | PASS estático; 168/169 tabelas protegidas, 1 exceção documentada | Não prova isolamento sob conexão/runtime real |
| Deploy surface | `pnpm validate:deploy-surface` | PASS estático; 157 arquivos canônicos | Não prova rollout/rollback |
| Secrets | `pnpm security:secrets` | PASS | Não cobre toda a cadeia de supply chain |
| Type safety | `pnpm typecheck` | PASS; 67/68 projetos reportados | Não prova regras clínicas/runtime |
| Lint | `pnpm lint` | PASS | Não prova acessibilidade/UX |
| Build | `pnpm build` | PASS; API, SPA e worker; SPA 810 módulos | Não prova imagem reprodutível/deploy |
| Complexidade | `pnpm complexity:check` | PASS local | `AppointmentsListPage.vue` foi reduzida para 3045 linhas ao extrair o tema escuro para CSS; todos os hotspots do manifesto dentro do orçamento |
| Helm | `pnpm validate:helm` | PARTIAL | Binário Helm ausente; somente validação estática |
| Testes completos | `pnpm test` concluído com exit 0; workspace 67/68; SPA 211 arquivos/1865 testes, API 576 testes; worker e módulos concluídos | PASS local | Avisos jsdom de navegação/scrollTo; não substitui critical DB, E2E, recovery ou target evidence |

## 3. Pontos fortes existentes

- Workspaces e boundaries canônicos já são validados.
- OpenAPI, migrations canônicas, RLS estático, contratos, typecheck, lint e build possuem comandos operacionais.
- Há implementação e testes relevantes para auditoria, MFA, API keys, webhooks, PIX/idempotência, event bus, retry/DLQ, módulos clínicos, observabilidade, backup, k6 e game day.
- CI já declara checks de tipo, lint, build, testes, OpenAPI, migrations, RLS, deploy, Helm, backup, upgrade, E2E, visual, cobertura e performance.
- Release já produz imagens com BuildKit SBOM/provenance e captura digests em parte do fluxo.

## 4. Gaps classificados

### P0 — bloqueiam qualquer claim Triple-A

1. O gate agregador `pnpm release:triple-a`/`pnpm rc:evidence:triple-a` foi implementado, mas o veredito atual ainda é bloqueado por critérios sem evidência e o artefato de candidato só será válido após sua execução no SHA final.
2. A política Green Main executável foi criada, mas branch protection/required checks remotos ainda não são observáveis pelo checkout.
3. Criticidade clínica, invariantes de segurança, negative tests e critérios de owner foram consolidados em documentos normativos; a execução/aceite ainda está aberta.
4. O guard de complexidade agora passa; a dívida estrutural remanescente da agenda continua registrada como P2 e não deve ser confundida com decomposição completa.
5. Backup/restore, tenant/RLS runtime, auditoria imutável e integrações críticas não têm nesta fotografia a prova operacional necessária para release.
6. O replay genérico agora vincula novos registros ao ator, falha fechado para registros concluídos legados sem ator e revalida permissões antes do replay nas famílias clínicas críticas. A cobertura HTTP/DB real e a matriz completa para rotas ainda não mapeadas permanecem P0 abertas.

### P1 — exigem correção antes da certificação

1. Ações GitHub e imagens-base Docker foram fixadas por digest e há validator central; scanners de dependência/imagem, assinatura/verificação no registry e revisão de licença/abandono ainda faltam.
2. Supply chain não agrega dependency review, scanner de imagem, licença/abandono, assinatura/verificação e digests de SBOM no manifest.
3. Dockerfiles de API/worker/SPA agora usam lockfile congelado, usuários não-root e bases por digest; Compose ainda não demonstra o hardening mínimo, NetworkPolicy não foi encontrado e templates Helm só ficam imutáveis quando o release authority injeta os digests.
4. DR/RPO-RTO, drills de restore/corrupção/migration mismatch e ownership de retenção/criptografia/off-site não estão formalizados com evidência atual.
5. Chaos/game-day não demonstra todas as falhas exigidas (restart real de processos/dependências, storage e OTEL) com integridade/idempotência/recovery.
6. Performance/soak ainda dependem de target sign-off e não são pré-requisito do release-artifacts.
7. Observabilidade exporta para `debug` em ambiente local e não há, neste escopo, prova de Alertmanager/retention/on-call no alvo.
8. Fluxos frontend críticos receberam correções de contexto, anexos, tabs, timeline, agenda e estados clínicos, mas precisam de revisão visual/UX independente ligada ao commit candidato.
9. A SPA de diagnósticos agora só seleciona automaticamente quando há um único candidato; múltiplos atendimentos exigem escolha explícita e exibem mais contexto, mas browser/UAT continuam abertos.
10. Tabs, arquivos, ações de itens ocultos e estado de erro receberam semântica/a11y; touch targets, tokens visuais e validação em 320px/browser ainda precisam de evidência.

### P2 — governança e consistência

1. `docs/CI_GATES.md` menciona `main/develop`, enquanto o workflow observado dispara em `main`; a verdade de branch protection não é inspecionável pelo repositório.
2. `infra/docker/README.md` ainda descreve Compose/imagens como mínimos/futuros, em tensão com a identidade de release que o trata como superfície canônica.
3. Os documentos Triple-A obrigatórios foram criados; seus resultados permanecem honestamente parciais até a execução vinculada ao SHA candidato.
4. `.gauntlet` contém estado antigo e volumoso rastreado; deve ser reconciliado como higiene de repositório sem apagar histórico.

## 5. Achados independentes de CI/operações

O scout de CI/supply-chain/operações confirmou, sem modificar arquivos, que o status correto é `NOT PROVEN`. Em particular, observou que o release atual depende de CI mas não possui aprovação agregada; o manifest existente não contém o conjunto completo de testes, segurança, recuperação, performance e veredito; o backup estrutural não é um restore drill; e os targets de performance continuam pendentes de sign-off. Esses achados estão sendo tratados como insumo de backlog, não como execução substituta.

O scout clínico confirmou controles existentes em owner/patient, encounters, triage, handoff, prontuário, laboratório, prescrição, cirurgia, inpatient, discharge, billing, RLS, UoW, outbox, leases, auditoria e migrations. Também classificou como riscos a reautorização de replay, a composição de consumidores clínicos, fairness por conta e testes de failure-injection/DB real. O scout frontend encontrou risco de contexto implícito em diagnósticos, semântica incompleta de tabs, touch target abaixo de 44px em 320px, ações financeiras desabilitadas, cobertura a11y/responsiva incompleta, hierarquia duplicada de headings e combobox sem relações ARIA completas. Nenhum desses scouts executou runtime browser/DB, portanto os achados não fecham os critérios.

## 6. Itens não executados e autoridade necessária

Não foram tratados como PASS nesta Fase 0: deploy/rollback real, Helm lint/template com binário, E2E completo, critical soak, backup/restore destrutivo, game day contra infraestrutura compartilhada, teste de capacidade no alvo, entrega real de alertas, PIX/webhooks externos, UAT clínico, branch protection da organização, assinatura/verificação no registry e publicação de release. A suíte unitária/workspace `pnpm test` passou, mas isso não cobre essas superfícies.

Essas atividades exigem ambiente descartável/target aprovado e, quando envolverem produção, secrets, dados reais ou alteração organizacional, registro humano em `.agent/authority.jsonl`.

## 7. Próxima ação e critério de saída da Fase 0

A implementação da Fase 0 foi executada e o gate agregador está disponível. A certificação só pode avançar quando a matriz estiver vinculada a evidências externas frescas no SHA candidato, o teste completo tiver resultado capturado após o commit final e os critérios `AR-001` a `AR-003` possuírem evidência ou encaminhamento explícito.
