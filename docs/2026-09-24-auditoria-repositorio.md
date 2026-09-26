---
document_status: supporting
document_kind: worktree-audit
effective_date: 2026-09-24
owner: Auditoria técnica local
review_cycle: on-candidate-change-or-material-evidence
inspected_head: ad2f0373f68635f2579253b013a4382219906921
overall_score: 66
verdict: RELEASE_BLOCKED
---

# Auditoria do repositório CVG-HIS V4 — 24/09/2026

## Veredito e método

**Nota ponderada: 66/100 (66,14 antes do arredondamento). Release bloqueado.** A nota mede maturidade observada nesta árvore local; não é certificação Triplo AAA nem aceite de produção. A régua vigente exige nota total ≥97, dimensões críticas ≥95, zero P0 aberto e evidência/autoridade no mesmo candidato, conforme `docs/triple-a/QUALITY_BAR_V1.json`.

Foram lidos o README, o índice e a fonte de verdade documental, as auditorias e o backlog vigentes, a régua de qualidade, os contratos de arquitetura, identidade de release, segurança de dados, recuperação e SLO. O inventário identificou 303 documentos Markdown em `docs/`; a leitura aprofundada concentrou-se nos documentos vigentes e nos contratos relacionados aos riscos encontrados. A comparação incluiu código, scripts, CI, manifests, testes e comandos locais. Documentos históricos foram usados apenas como comparação, sem transferir seus resultados para esta execução.

Fotografia antes da criação deste relatório: `HEAD` `ad2f0373f68635f2579253b013a4382219906921`, branch `main`, **178 caminhos modificados e 467 não rastreados**. `main` e `origin/main` têm 79 commits exclusivos de cada lado. O `HEAD` local ainda referencia `.gauntlet/state.json` com 152.651.034 bytes. Os resultados abaixo pertencem ao `HEAD` mais alterações locais e **não identificam um SHA reproduzível do código avaliado**. Nenhum arquivo preexistente foi alterado por esta auditoria.

Pesos seguem as 12 dimensões da auditoria de 21/09. Cada nota é um julgamento técnico de 0 a 100 baseado em implementação, execução atual e lacunas de prova; não representa percentual de testes aprovados. O total é `Σ(peso × nota) / 100`, arredondado ao inteiro mais próximo. Falha de gate obrigatório não é compensada pela média.

## Scorecard

| Item analisado | Peso | Nota / 100 | Evidência decisiva e limite |
| --- | ---: | ---: | --- |
| Produto e paridade funcional | 14% | **58** | `readiness:enterprise` falhou: 4/11 áreas verificadas, sete com bloqueadores de integração, reconciliação ou homologação. |
| Backend, API e contratos | 11% | **82** | Build e typecheck passaram; OpenAPI válido com 431 paths, 41 tags e 527 schemas. `apps/api/src/server.ts` caiu para 3.473 linhas, mas segue concentrando composição e transporte. |
| Frontend, UX e acessibilidade | 8% | **74** | SPA compilou para produção; páginas clínicas, agenda, vendas e relatórios seguem extensas. Não houve browser matrix, WCAG ou UAT nesta rodada. |
| Dados, migrations e multitenancy | 12% | **70** | Fonte canônica de migrations e validador RLS passaram; proteção estática em 171/172 tabelas tenant, com uma exceção documentada. Não houve PostgreSQL, migração ou teste cross-tenant atual. |
| Segurança, privacidade e segredos | 11% | **78** | `security:secrets`, política de dependências e refs/imagens imutáveis passaram; ACL/RLS no target, LGPD e provas de provider continuam pendentes. |
| Arquitetura e manutenibilidade | 8% | **72** | Guard de complexidade passou e extrações reduziram API/worker; permanecem arquivos de 2 mil a 4 mil linhas e forte concentração em páginas e rotas. |
| Testes e qualidade | 10% | **67** | Suíte unitária ampla: 1.633/1.635 passaram, dois timeouts sob execução concorrente; os dois arquivos afetados passaram 28/28 isoladamente. Coverage, integração DB e E2E atuais não foram executados. |
| CI, cadeia de artefatos e release | 10% | **42** | Política local de supply chain passou, mas `validate:candidate-identity` falhou por worktree sujo; Git diverge 79/79, há blob >100 MiB no `HEAD` e faltam CI/OCI/attestation no SHA exato. |
| Operação, backup e observabilidade | 7% | **60** | `ops:backup:check` passou com 6 testes e validação estática; restore, rollback, RPO/RTO, alertas e SLO em target não foram medidos. Helm teve apenas validação estática local. |
| Documentação e rastreabilidade | 4% | **68** | `docs:validate` passou, mas `docs/README.md` ainda afirma que `pnpm test` não inclui a raiz, enquanto o script atual inclui raiz e workspaces; `tests/README.md` ainda diz que não há CI nem coverage. |
| DX e reprodutibilidade | 3% | **64** | Build, typecheck e lint passaram; lint deixou 17 avisos `any` na API. Ambiente usou Node 24.20.0, enquanto `package.json` fixa 22.23.2; worktree não é reproduzível por um SHA. |
| Governança, UAT e aceite | 2% | **30** | Registro P0 válido, porém 11/14 controles abertos. Sem UAT hospitalar, aceites de Produto/Clínica, Segurança/DPO, Operações e autoridade de release do candidato atual. |
| **Total ponderado** | **100%** | **66** | **RELEASE_BLOCKED** |

## Execução observada

| Comando ou verificação | Resultado nesta auditoria |
| --- | --- |
| `pnpm build`, `pnpm typecheck`, `pnpm lint` | Exit 0; lint com 17 avisos `any` na API. |
| `pnpm validate:openapi` | Exit 0; 431 paths, 41 tags, 527 schemas. |
| `pnpm validate:migration-source`, `pnpm validate:rls`, `pnpm validate:production-runtime` | Exit 0; RLS estático 171/172 e uma exceção documentada. |
| `pnpm docs:validate`, `pnpm validate:test-skips`, `pnpm complexity:check` | Exit 0; 36 ocorrências de skip na allowlist e hotspots dentro do orçamento. |
| `pnpm validate:deploy-surface`, `pnpm validate:supply-chain`, `pnpm validate:dependencies`, `pnpm security:secrets` | Exit 0; checks estáticos e scan local. |
| `pnpm ops:backup:check` | Exit 0; 6/6 testes de contrato e validação estática. Não executa restore real. |
| `pnpm validate:p0-registry` | Exit 0; 14 controles, 11 abertos e três fechados. |
| `pnpm validate:helm` | Exit 0 em fallback estático; binário Helm indisponível. |
| `pnpm readiness:enterprise` | Exit 1; score estrutural 93/100, porém paridade funcional 4/11. |
| `pnpm validate:candidate-identity` | Exit 1; requer árvore de trabalho limpa. |
| `pnpm exec vitest run --config vitest.unit.config.ts` | Exit 1; 1.633 passaram, dois timeouts de 10 s enquanto typecheck e lint também rodavam. |
| Reexecução isolada dos dois arquivos, `--maxWorkers=1` | Exit 0; 28/28 testes passaram. Isto reduz a suspeita de falha funcional nesses casos, mas não transforma a rodada ampla em verde. |

Os comandos pnpm emitiram aviso de engine por execução sob Node 24.20.0, em vez do Node 22.23.2 fixado. `pnpm test` agregado não foi executado porque exige `DATABASE_URL_TEST`, `REQUIRE_TEST_DB=1`, `TEST_DB_EPHEMERAL=1` e sufixo exclusivo; a auditoria não utilizou um banco descartável preparado. Coverage, suíte PostgreSQL, E2E/browser, carga/soak, restore, deploy, CI remoto, registry e UAT não foram executados nesta rodada. Logs resumidos de typecheck, lint e unitários estão em `/tmp/cvg-audit-*-20260924.log` nesta estação e não compõem um artefato de candidato.

## Achados prioritários

1. **P0 — Candidato não congelado.** A árvore suja, as histórias Git divergentes, o blob >100 MiB no `HEAD` e a falha de `validate:candidate-identity` impedem associar build/testes a um único artefato publicável. Inventariar e preservar os diffs, reconciliar a história e então repetir os gates em checkout limpo.
2. **P0 — Produto sem paridade demonstrada.** O gate `readiness:enterprise` reprova por 4/11 áreas. Laboratório, fiscal, financeiro, marketing, relatórios, acesso/LGPD e integrações requerem as provas comportamentais e homologações especificadas na matriz; presença de arquivos não fecha o critério.
3. **P0 — Evidência de release e target ausente.** CI no SHA exato, artefatos OCI/digest/attestation, RLS e worker no target, restore/RPO/RTO, performance, UAT e aceites humanos permanecem `NOT_PROVEN`. Os contratos locais aprovados são preparação, não autorização de produção.
4. **P1 — Gate de testes ainda incompleto.** A rodada unitária ampla teve dois timeouts sob concorrência; a repetição isolada passou. Executar a suíte agregada, coverage e testes críticos com Node 22.23.2 e banco descartável dedicado, registrando um resultado único e sem skips indevidos.
5. **P1 — Rastreabilidade documental e manutenção.** Atualizar afirmações obsoletas em `docs/README.md` e `tests/README.md` após congelar o candidato. Prosseguir com a decomposição dos hotspots remanescentes e medir regressões nos contratos públicos.

**Próxima ação técnica:** preservar/reconciliar os 645 caminhos locais já alterados ou não rastreados, produzir um candidato limpo e executar os gates de teste e identidade sobre esse SHA. A baseline formal de 21/09 em `docs/document-governance.json` continua histórica e não é substituída automaticamente por este relatório complementar.
