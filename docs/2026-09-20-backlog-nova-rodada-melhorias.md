---
document_status: current
document_kind: backlog
effective_date: 2026-09-20
owner: Liderança técnica, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-task-completion-or-blocker-change
---

# Backlog executável — nova rodada de melhorias

[Auditoria](2026-09-20-reauditoria-candidato-a9ff1b1a.md) ·
[Plano](2026-09-20-plano-executivo-nova-rodada-melhorias.md) ·
[Roadmap](2026-09-20-roadmap-nova-rodada-melhorias.md)

## Contrato deste backlog

Este documento prioriza a próxima rodada sem renumerar os 65 cartões `PROD`.
Os contratos de produto permanecem em
[backlog detalhado de 14/09](2026-09-14-backlog-state-of-art-triplo-aaa.md) e o
estado legado está em `.agent/backlog.json`. O controlador foi migrado de forma
append-only e `check_state.py` passa no estado atual. Este arquivo continua
sendo a fila de execução e deve ser reconciliado com `.agent` a cada mudança
material; não promove prova local a aceite externo.

## Definition of Done comum

1. Resultado observável e known-bad definidos antes da mudança.
2. Teste focal falha antes e passa depois; regressão proporcional permanece
   verde.
3. Evidência identifica SHA, ambiente, comando, exit, artefatos e limitações.
4. Crítico fresh não modifica o artefato e julga critérios congelados.
5. Mudança material invalida CI, OCI, scan, runtime e parecer anteriores.
6. `DONE` exige bloqueios vazios e autoridade correta; local não substitui
   remoto, target ou humano.

## P0 — executar primeiro

| ID | Item | Estado | Dependências | Aceite observável |
| --- | --- | --- | --- | --- |
| NR-001 | Modelar Vault no chart com `existingSecret` e keys para URL/role/secret/namespace/path | PASS-LOCAL | — | schema aceita configuração; Deployment usa `secretKeyRef`; nenhum segredo em ConfigMap; não é aceite externo |
| NR-002 | Cobrir prod render/runtime de Vault | PASS-LOCAL | NR-001 | ausência reprova; fixture Vault válida permite startup/readiness; Helm dev/staging/prod real passa; target real permanece ausente |
| NR-003 | Migrar/reconciliar `.agent` para o contrato atual | PASS-LOCAL | — | correções append-only; `check_state.py` 11/11; aceitação externa permanece bloqueada |
| NR-004 | Recriar identidade e snapshots do candidato sem promover prova stale | BLOCKED-CANDIDATE | NR-001–003, NR-006 | guardas recusam worktree sujo; identity/snapshots só podem ser regenerados após fonte/controle congelados |
| NR-005 | Finalizar ou arquivar corretamente a rodada Gauntlet `p0-closure-images-final-20260920` | BLOCKED-EXTERNAL | NR-003, NR-004, NR-008 | final7 ficou stale após NR-013; a rodada candidate-local corrente foi registrada BLOCKED com oito critérios P0 e sentinela fresh; CI/target/UAT/autoridade impedem `STOP`/aceite |
| NR-006 | Congelar novo SHA e executar regressão local integrada | PASS-LOCAL-CANDIDATE-BLOCKED | NR-001–003 | parser, supply chain, build/typecheck/lint, Helm real e suítes focais passam; não há SHA limpo congelado |
| NR-007 | Reconstruir API/worker/SPA e provar runtime production-shaped | PASS-LOCAL-CANDIDATE-BLOCKED | NR-004, NR-006 | três OCI distintas, non-root/read-only, Vault e dependências descartáveis, proxy e readiness passam; fonte permanece não congelada |
| NR-008 | Repetir digest cruzado e Trivy pinado | PASS-LOCAL-CANDIDATE-BLOCKED | NR-007 | digest trocado exit 1; três scans 0 HIGH/CRITICAL; não substitui CI/attestation |
| NR-011 | Publicar o SHA autorizado e obter CI 17/17 | EXTERNAL-BLOCKED | NR-004–008 | GitHub CI terminal no SHA exato e artefatos verificados |
| NR-012 | Executar release encadeado | EXTERNAL-BLOCKED | NR-011, NR-013 | `workflow_run` consome o SHA do CI, sem rebuild, publica quarentena/attestations/manifest/gate |
| NR-020 | Decisão final de release/Triplo AAA | EXTERNAL-BLOCKED | NR-012, NR-014–019 | zero P0, quality bar completa e go/no-go por autoridades nomeadas |

## P1 — endurecimento e dívida de engenharia

| ID | Item | Dependências | Aceite observável |
| --- | --- | --- | --- |
| NR-009 | Fixar regressões 380/381 do parser em job e step | PASS-LOCAL | NR-006 | assertions do finding exato; `toJSON(fromJSON())`; pai conhecido falha; 17/17 testes do parser |
| NR-010 | Separar parser/evaluator do scanner de supply chain | DEFERRED-R5 | NR-009, NR-020 | somente após R0–R4, salvo correção indispensável com novo freeze |
| NR-013 | Validar contrato de release contra reorder/substituição completo | PASS-LOCAL-CONTROL-BLOCKED | NR-011 | matriz local cobre severidade, `ignore-unfixed`, `exit-code`, scan/imagem substituídos, preparação OCI depois do scanner, reorder e remoção do gate; CI exato ainda é pré-requisito externo |
| NR-021 | Compactar estado e fingerprint Gauntlet | DEFERRED-R5 | NR-003, NR-020 | estado sem inventário massivo; somente após R0–R4 ou nova indispensabilidade formalizada |
| NR-022 | Fortalecer governança documental | DEFERRED-R5 | NR-004, NR-020 | comparar candidate SHA, status counts, next action e freshness após identidade congelada |
| NR-023 | Resolver semântica de `VITE_API_BASE_URL` | PASS-LOCAL | NR-002 | URL é override de build; produção usa proxy same-origin `/api`; ConfigMap não injeta variável inefetiva |
| NR-024 | Decompor hotspots por fatias | DEFERRED-R5 | R0–R4 fechadas | `server.ts`, páginas SPA, runner e validador só reduzem tamanho após o caminho crítico |

## Dependências externas preservadas

| ID | Resultado | Autoridade/ambiente | Estado |
| --- | --- | --- | --- |
| NR-014 | Target aprovado, namespaces, secrets provider e credenciais | Platform/Security | BLOCKED |
| NR-015 | Migração/RLS, backup, restore e rollback | DBA/Operations | BLOCKED |
| NR-016 | Carga, soak, SLO e alertas | SRE/Operations | BLOCKED |
| NR-017 | Providers externos e segurança operacional | Security/donos de domínio | BLOCKED |
| NR-018 | UAT hospitalar, acessibilidade e fluxos críticos | Product/Clinical/QA | BLOCKED |
| NR-019 | Branch protection, revisão independente e aceites | Repository owner/Release authority | BLOCKED |

## Ordem imediata

1. `NR-004` — congelar, por commit autorizado, fonte e controle; então regenerar identidade/snapshots.
2. `NR-005` — reexecutar o Gauntlet candidate-bound e encerrar apenas se as externalidades forem fornecidas.
3. `NR-011` — CI remoto no SHA exato, somente após autorização.
4. `NR-013` — hardening do contrato antes da publicação.
5. `NR-012` — release encadeado sem rebuild.
6. `NR-014–019` — target, recuperação, UAT e autoridades nomeadas.
7. `NR-020` — decisão final; NR-010/021/022/024 continuam fora do candidato enquanto R0–R4 estiverem abertos.

## Evidência local da rodada atual

- `NR-001/002`: `REQUIRE_HELM=1 pnpm validate:helm`, testes Helm e fixture
  Vault production-shaped; API `/ready`, migrações `0000–0177` e reconciliação
  de roles passaram em banco descartável.
- `NR-006/009/023`: typecheck/lint, contrato de supply chain (17/17),
  semântica build-time da SPA e proxy same-origin passaram localmente.
- `NR-007/008`: pacote [OCI/Trivy final4](../.agent/evidence/nr007-nr008-release-oci-trivy-20260920-final4.json)
  registra raízes/configs imutáveis, Trivy 0 HIGH/CRITICAL, AppRole inválido
  403 e digest cruzado rejeitado.
- `NR-013`: [matriz de mutações do contrato de release](../.agent/evidence/nr013-release-mutation-20260920.json)
  passou 19/19 contratos do workflow e 17/17 verificações supply-chain, incluindo
  a rejeição de preparação OCI depois de qualquer scanner; a prova é local e não
  substitui CI/release encadeado.
- Gauntlet: a rodada final7 anterior ficou stale após a ampliação NR-013; a
  rodada corrente foi registrada `BLOCKED` com críticos fresh, oito critérios
  P0 e `mutation_clean=true`. A decisão local não cobre CI, target, UAT, freeze
  candidate-bound ou autoridade.
- O pacote é `PARTIAL/BLOCKED`: os artefatos são locais, a worktree está suja,
  não há CI exato, attestation encadeada, target aprovado, UAT ou autoridade.
