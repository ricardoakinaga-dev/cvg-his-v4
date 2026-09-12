# Crosswalk do prompt State of Art / Triplo AAA

Este documento liga o prompt congelado `MASTER_PROMPT.md` às 76 linhas
operacionais de `16-requirement-traceability.md`. O JSON ao lado é a fonte
machine-readable e é validado por `pnpm validate:prompt-traceability`.

## Precedência

`MASTER_PROMPT.md` é a fonte congelada do quality bar e conserva o hash
`95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
`MASTER_PROMPT_STATE_OF_ART.md` é a missão expandida preservada para execução.
O crosswalk não altera nenhum threshold, não transforma `NOT PROVEN` em `PASS` e
mantém os dois documentos vinculados por SHA-256.

Cada linha `MP-00` a `MP-60` contém no JSON o título exato, linha inicial/final,
hash do trecho original, requisitos explícitos, IDs `F00`–`F75`, status de
evidência e comandos de aceitação. Toda linha da matriz aparece em pelo menos
uma fase. `MP-57` permanece explicitamente sem linha dedicada na matriz porque
feature flags são uma lacuna real, e essa ausência é preservada no audit.

## Requisitos clínicos preservados

- `MP-10` exige reminder configurável e registra explicitamente a proibição de uma regra hardcoded para Bob.
- `MP-11` preserva a estrutura de handover e os eventos `handover.created`, `handover.updated`, `handover.ready`, `handover.acknowledged` e `handover.overdue`.
- `MP-12` preserva `ClinicalEvent`, referências de tenant/paciente/encounter, ator, tempo, correlação, causalidade, resumo e metadata segura.
- `MP-13` preserva schema version, event ID, replay, ordering, duplicatas e eventos fora de ordem.
- `MP-57`, `MP-58` e `MP-59` mantêm feature flags, LGPD e logging seguro como requisitos explícitos, mesmo quando a decomposição operacional não lhes dá uma linha exclusiva.
- As fases de supply chain e release mantêm os nomes literais `sbom.cdx.json`, `enterprise-release-manifest.json` e `TRIPLE_A_RELEASE_EVIDENCE.json`.

## Verificação

```bash
pnpm validate:prompt-traceability
pnpm docs:validate
pnpm exec vitest run tests/unit/infra/master-prompt-crosswalk.test.ts --config vitest.config.ts
```

Um `PASS` no crosswalk prova apenas a fidelidade documental da rastreabilidade.
Não prova CI verde, target, UAT, recovery, performance, attestation ou
autoridade de release; essas provas continuam fail-closed no scorecard.
