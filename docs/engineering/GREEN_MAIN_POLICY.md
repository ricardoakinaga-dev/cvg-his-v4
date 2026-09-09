# Green Main Policy

**Estado:** política normativa, ainda não certificada por branch protection remoto
**Escopo:** `main`, commit candidato e release do CVG HIS
**Regra:** status verde é necessário, mas não suficiente, para `TRIPLE-A VERIFIED`.

## Objetivo

`main` só é considerado green quando o commit candidato tem checks reprodutíveis, sem falha P0, com artefatos vinculados ao SHA completo e sem `continue-on-error` nos checks críticos. O repositório permanece no monólito modular e usa os comandos canônicos existentes.

## Checks obrigatórios

| Gate | Comando/superfície | Bloqueia merge? | Evidência mínima |
|---|---|---:|---|
| Tipo | `pnpm typecheck` | Sim | Log CI + SHA |
| Lint | `pnpm lint` | Sim | Log CI + SHA |
| Build | `pnpm build` | Sim | Artefatos de build |
| Unitário | `pnpm test` | Sim | Relatório de testes |
| Integração crítica | `pnpm test:critical` | Sim | Banco descartável + relatório |
| Contratos | OpenAPI, namespaces, migration source, RLS | Sim | Saída dos validadores |
| Segurança | secret scan, audit/SAST/SBOM | Sim | `security-evidence.json` |
| Supply chain | `pnpm validate:supply-chain` | Sim | 100% dos `uses:` por SHA completo |
| Deploy surface | `pnpm validate:deploy-surface` e Helm real | Sim | Render/lint vinculado ao SHA |
| SPA/E2E | suite enterprise e visual quando aplicável | Sim | Relatório Playwright |
| Release | `pnpm release:triple-a` | Sim para release | `TRIPLE_A_RELEASE_EVIDENCE.json` |

## Estados

- **GREEN:** todos os checks obrigatórios PASS no mesmo SHA; nenhuma evidência required está stale; nenhum P0 aberto.
- **RED:** qualquer check obrigatório FAIL, ausência de evidência obrigatória ou `open_p0 > 0`.
- **NOT PROVEN:** o código pode estar localmente saudável, mas faltam execução/autoridade/target evidence para sustentar o claim.
- **OVERRIDE:** só pode existir com registro humano em `.agent/authority.jsonl`, escopo limitado, compensação, expiração e residual risk.

`TRIPLE_A_RELEASE_EVIDENCE.json` é a fonte do veredito do gate. O gate falha fechado: `NOT_RUN`, `FAIL` ou evidência sem vínculo ao commit não pode virar PASS. O modo advisory de `pnpm rc:evidence:triple-a` serve para coleta/triagem e nunca autoriza release.

## Proteções de branch e ownership

O repositório declara esta política, mas a configuração de branch protection do GitHub não é inspecionável pelo checkout. O owner do repositório deve configurar os checks obrigatórios pelo nome real dos jobs, exigir branch atualizada, impedir push direto sem revisão e manter permissões mínimas. Até essa confirmação remota, o critério de branch protection permanece `NOT PROVEN`.

## Release e revalidação

O release deve usar o SHA que passou CI, manifest com imagens por digest e SBOM/provenance. Um novo commit, migration, Dockerfile, workflow, contrato, módulo clínico, dependência ou configuração de produção reabre o gate afetado. O artefato de evidência não pode ser reutilizado silenciosamente em outro SHA.

## Current gap

Na fotografia inicial de 2026-09-09, a complexidade excedia o limite; a extração controlada do tema da agenda agora faz `pnpm complexity:check` passar. O gate agregador foi implementado, mas Helm real, browser/DB runtime, evidências externas, branch protection e autoridade de release ainda não estão comprovados no SHA final. Portanto, `main` permanece `NOT PROVEN` para Triple-A.
