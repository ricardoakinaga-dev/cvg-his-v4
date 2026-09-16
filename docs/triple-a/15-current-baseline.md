# Baseline corrente — State of Art

Observado em `2026-09-16T18:04:21Z`, no snapshot corrente
`d13c5a44a91cedde687a9f5acedce80a5b56a047`, que contém a reancoragem do
workflow e do manifesto crítico. A identidade canônica está em
[`CURRENT_CANDIDATE_IDENTITY.json`](./CURRENT_CANDIDATE_IDENTITY.json) e o
evidence graph corrente é gerado por `pnpm evidence:triple-a:graph`.
O candidato preserva a reconciliação append-only do controlador e a paridade
do contrato de paciente entre OpenAPI, runtime e fixture de integração. Esta
fotografia não promove evidência histórica nem altera thresholds.

| Campo           | Evidência atual                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| current_sha     | `d13c5a44a91cedde687a9f5acedce80a5b56a047` (candidato corrente; documentação posterior pode ser somente documental) |
| main_sha        | `main@d13c5a44`; `origin/fix/state-of-art-ci-assurance@fe5406c2` é ancestral, sem commits exclusivos; rollback preservado |
| worktree        | Limpo após o commit documental de reancoragem; artefatos em `artifacts/` permanecem ignorados |
| rollback        | `origin/fix/state-of-art-ci-assurance@fe5406c2`; sem force-push |
| ci_run          | O [CI #188](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35130610217) foi executado no candidato e teve `Repository Guards` rejeitado porque este snapshot ainda estava stale; não é promovido como prova verde. |
| ci_failure      | Reancoragem documental publicada; o novo run precisa terminar antes de qualquer claim remoto. Nenhum threshold foi relaxado. |
| overall_score   | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `51`, abaixo do mínimo 97 |
| critical_score  | `NOT_EVALUATED` no gate de cobertura corrente; o último gate estrito histórico foi `49`, abaixo do mínimo 95 |
| open_p0         | `NOT_EVALUATED` no gate R05-010; o último gate estrito histórico registrou `18`, acima do máximo 0 |
| local_gate      | `FAIL/BLOCKED` no R05-010: cobertura crítica abaixo dos limiares e 25 aplicabilidades Vue sem evidência aceita; `claim=NOT PROVEN`, `publication_allowed=false` |
| implemented     | Paridade do contrato Patient; CORS credentialado restrito a origens permitidas; manifest crítico revision 49, ancorado em `dae7bae9`, com source set e thresholds inalterados; workflow agora provisiona Chromium para a evidência Vue; nenhum threshold foi alterado |
| verified_local  | unit `260/260` arquivos e `2824/2824` testes passou no candidato; recoleta crítica após a revisão 49 ainda é necessária; target externo permanece ausente |
| verified_remote | `NOT_PROVEN`: o CI #188 não é terminal verde e falhou em guard documental antes da correção; target, recovery, UAT, attestation, governança de branch e autoridade de release seguem ausentes |
| verified_target | `NOT_PROVEN` |
| blocked         | Recoleta crítica vinculada à revisão 49, CI remoto terminal do candidato, target, restore/DR, performance certificada, UAT e autoridade humana continuam abertos |
| not_proven      | Qualquer claim de release Triple-A, score ≥97, critical ≥95, zero P0, `main_green` ou `TRIPLE-A VERIFIED` |

## Decisão

O candidato `d13c5a44a91cedde687a9f5acedce80a5b56a047` foi reconciliado no snapshot corrente;
o manifesto crítico foi reancorado na revisão 49, com o código funcional e os
thresholds preservados. `origin/fix/state-of-art-ci-assurance` já era ancestral de `main` e
não possuía mudanças exclusivas, portanto nenhum merge seletivo adicional foi
necessário. A recoleta current passou os produtores locais unit, integração,
native-worker, native-api, critical-process e SQL; a evidência Vue especializada
permanece bloqueada e o R05-010 continua `FAIL/BLOCKED`. O CI #178 de outro SHA
terminou com falhas e não é transferido. A `main` permanece bloqueada para Green Main
sem relaxar thresholds; target, recovery, attestation, UAT, governança e
autoridade continuam bloqueados. Não há declaração de release ou
`TRIPLE-A VERIFIED`.

Os nomes de artefato pedidos conceitualmente pelo prompt são mapeados assim:
`artifacts/release/sbom.cdx.json` corresponde ao SBOM CycloneDX produzido como
`artifacts/release/sbom.cyclonedx.json`; `enterprise-release-manifest.json`
corresponde ao manifesto validado `release-manifest.json`. O mapeamento preserva
a validação existente e não transforma artefato local em prova externa.

O prompt byte a byte está em [`MASTER_PROMPT.md`](./MASTER_PROMPT.md), com
SHA-256 `95270384800c87fcbe7e823a41a7b57834ddaac274914226745f7fdc5137197a`.
A régua congelada está em [`QUALITY_BAR_V1.json`](./QUALITY_BAR_V1.json).
