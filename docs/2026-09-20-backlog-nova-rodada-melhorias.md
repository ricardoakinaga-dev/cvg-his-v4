---
document_status: current
document_kind: backlog
effective_date: 2026-09-21
owner: Liderança técnica, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-task-completion-or-blocker-change
---

# Backlog executável — nova rodada de melhorias

[Auditoria](2026-09-20-auditoria-scorecard-db07cd02.md) ·
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
| AUD21-01 | Reconciliar identity, registro P0 e snapshots em um único SHA | PASS-LOCAL | AUD21-02–04, AUD21-09–10 | identidade `8b85e3a9`/P0/snapshots vinculados ao runtime `29b03941`; estados `NOT_PROVEN` preservados |
| AUD21-02 | Tornar a mutação 65 hermética à árvore real | PASS-LOCAL | — | fixture impossível; known-bad falha pelo finding esperado; supply-chain 17/17 |
| AUD21-03 | Alinhar pnpm e restaurar o gate de segredos | PASS-LOCAL | — | política e `packageManager` idênticos; secretlint e security enterprise verdes |
| AUD21-04 | Reconciliar contrato documental de backup/restore | DOC-FIXED-TARGET-BLOCKED | — | checker 4/4; roadmap/backlog atuais mutáveis pelo teste; drill/RPO/RTO seguem externos |
| AUD21-09 | Restringir e tornar bounded a superfície `/metrics` | PASS-LOCAL / TARGET-BLOCKED | — | token dedicado, cache bounded, cardinalidade limitada e exclusão no Ingress; admissão do cluster ainda externa |
| AUD21-10 | Unificar limite de upload no ingress, API e OpenAPI | PASS-LOCAL / TARGET-BLOCKED | — | 25 MiB decodificado, 413 e limites coerentes; E2E no ingress-alvo ainda externo |

Os itens `AUD21-*` são blockers descobertos nesta auditoria e precedem o
freeze. Não renumeram os 65 cartões `PROD`.

| ID | Item | Estado | Dependências | Aceite observável |
| --- | --- | --- | --- | --- |
| NR-001 | Modelar Vault no chart com `existingSecret` e keys para URL/role/secret/namespace/path | PASS-LOCAL | — | schema aceita configuração; Deployment usa `secretKeyRef`; nenhum segredo em ConfigMap; não é aceite externo |
| NR-002 | Cobrir prod render/runtime de Vault | PASS-LOCAL / TARGET-BLOCKED | NR-001 | fixture Vault e Helm 3.15.4 dev/staging/prod passam; target permanece ausente |
| NR-003 | Migrar/reconciliar `.agent` para o contrato atual | PASS-LOCAL | — | correções append-only; `check_state.py` 11/11; aceitação externa permanece bloqueada |
| NR-004 | Recriar identidade e snapshots do candidato sem promover prova stale | PASS-LOCAL | AUD21-01–04, AUD21-09–10, NR-001–003, NR-006 | guardas recusam worktree sujo; identidade `8b85e3a9`, P0 e snapshots convergem sobre runtime `29b03941` |
| NR-005 | Finalizar ou arquivar corretamente a rodada Gauntlet `p0-closure-images-final-20260920` | BLOCKED-EXTERNAL | NR-003, NR-004, NR-008 | rodada local registrada; CI/target/UAT/autoridade impedem `STOP`/aceite |
| NR-006 | Congelar novo SHA e executar regressão local integrada | PASS-LOCAL | AUD21-02–04, AUD21-09–10, NR-001–003 | gates locais passam no runtime `29b03941`; identidade `8b85e3a9`; Helm obrigatório disponível; críticos 11/11 e E2E 424/424 |
| NR-007 | Reconstruir API/worker/SPA e provar runtime production-shaped | PASS-LOCAL | NR-004, NR-006 | três imagens locais distintas, non-root/read-only, Vault e dependências descartáveis, proxy e readiness passam no runtime `29b03941`; sem publicação |
| NR-008 | Repetir digest cruzado e Trivy pinado | NOT_RUN / EXTERNAL-BLOCKED | NR-007 | raízes por digest local verificadas; Trivy não instalado, scan/attestation de registry permanecem pendentes |
| NR-011 | Publicar o SHA autorizado e obter CI 17/17 | EXTERNAL-BLOCKED | NR-004–008 | GitHub CI terminal no SHA exato e artefatos verificados |
| NR-012 | Executar release encadeado | EXTERNAL-BLOCKED | NR-011, NR-013 | `workflow_run` consome o SHA do CI, sem rebuild, publica quarentena/attestations/manifest/gate |
| NR-020 | Decisão final de release/Triplo AAA | EXTERNAL-BLOCKED | NR-012, NR-014–019 | zero P0, quality bar completa e go/no-go por autoridades nomeadas |

## P1 — endurecimento e dívida de engenharia

| ID | Item | Dependências | Aceite observável |
| --- | --- | --- | --- |
| NR-009 | Fixar regressões 380/381 e hermeticidade do parser em job e step | PASS-LOCAL | AUD21-02, NR-006 | assertions do finding exato; `toJSON(fromJSON())`; pai conhecido e fixture impossível falham; 17/17 testes |
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

Contrato de recuperação mantido para o validador operacional:

| ID | Controle | Estado | Aceite observável |
| --- | --- | --- | --- |
| PROD-037 | Backup, restore, corrupção e mismatch | EXTERNAL-BLOCKED | Aprovar RPO/RTO antes do drill; restaurar globals, banco, storage e configuração representativos, verificar hashes/contagens/RLS e cumprir RPO/RTO aprovados. |

## Ordem imediata

1. `NR-005/011–013` — concluir revisão fresh/Gauntlet e, mediante autorização, CI/release candidate-bound sem rebuild; preservar Trivy como `NOT_RUN` até ferramenta disponível.
2. `NR-014–019/PROD-037` — target, recuperação, UAT e autoridades nomeadas.
3. `NR-020` — decisão final; R5 continua fora do candidato enquanto os P0 estiverem abertos.

## Evidência local da rodada atual

- `NR-001/002`: Helm oficial 3.15.4, Vault production-shaped e runtime
  negativo/positivo passam localmente; admissão/target continuam externos.
- `NR-006/009/023`: typecheck/lint, semântica same-origin e supply-chain 17/17
  passaram no candidato `51982f48`; críticos 11/11 e E2E 424/424 têm escopo local
  explícito.
- `NR-007/008`: o [pacote local candidate-bound](triple-a/evidence/local-candidate-51982f48.json)
  registra raízes/configs imutáveis, usuários não-root, Vault/readiness/proxy e
  digest local; Trivy permanece `NOT_RUN` porque não está instalado.
- `NR-013`: a matriz local de mutações permanece controle histórico; não
  substitui CI/release encadeado no SHA candidato.
- Gauntlet: a rodada local deve ser reaberta em contexto fresh; a decisão
  externa continua `BLOCKED` e não cobre CI, target, UAT ou autoridade.
- O pacote é `LOCAL_COMPLETE / EXTERNAL_BLOCKED`: os gates locais passam, mas
  não há CI exato, attestation encadeada, target aprovado, UAT ou autoridade.
