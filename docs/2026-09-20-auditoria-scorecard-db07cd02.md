---
document_status: current
document_kind: baseline
effective_date: 2026-09-21
owner: Liderança técnica, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-candidate-change-or-material-evidence
candidate_sha: e052667526cc86c6b460afda3affdab54936684a
overall_score: 72
verdict: LOCAL_COMPLETE / EXTERNAL_BLOCKED
---

# Auditoria e scorecard do candidato local — identidade `e0526675`

## Veredito executivo

**Nota ponderada: 72/100 (53/100 na entrada; delta +19). Estado: `LOCAL_COMPLETE / EXTERNAL_BLOCKED`.**

Os gates locais da rodada foram reexecutados no runtime `29b03941`, sob a
identidade canônica `e052667526cc86c6b460afda3affdab54936684a`: supply-chain 17/17, política de
dependências, scanner de segredos, segurança enterprise, backup/restore
documental 4/4, upload/observabilidade, RLS, Helm 3.15.4, lint, typecheck,
build, suíte monorepo, PostgreSQL crítico 623/623, processos 11/11, SPA E2E
424/424 e imagens production-shaped passaram. A validação PostgreSQL efêmera,
E2E e as imagens são evidência local; não são CI remoto, target, restore
aprovado, UAT ou autoridade de release.

O resultado local é utilizável para revisão e preparação de candidato, mas o
Triplo AAA permanece **`BLOCKED / NOT PROVEN`**. `ci_sha` e `release_sha`
continuam nulos na identidade. Não houve push, publicação, deploy, uso de
credenciais reais ou aceite humano.

## Scorecard conservador

| Dimensão | Peso | Entrada | Atual | Delta | Limite/bloqueio remanescente |
| --- | ---: | ---: | ---: | ---: | --- |
| S01 Produto e cobertura funcional | 15% | 44 | 52 | +8 | paridade Vetus 4/11 verificada; provider e UAT externos ausentes |
| S02 Backend, API e contratos | 12% | 66 | 84 | +18 | ingress real e CI do SHA ainda não provados |
| S03 Frontend, UX e acessibilidade | 8% | 59 | 68 | +9 | E2E Chromium local 424/424; browser matrix, a11y e UAT ainda não aceitos |
| S04 Dados, migrações e isolamento | 12% | 74 | 82 | +8 | target, restore e mixed-version aprovados ausentes |
| S05 Segurança, privacidade e segredos | 12% | 42 | 80 | +38 | atestação/registry e homologação operacional externos |
| S06 Arquitetura e manutenibilidade | 8% | 52 | 52 | 0 | hotspots permanecem; refatoração está fora do caminho crítico |
| S07 Testes e engenharia de qualidade | 10% | 47 | 86 | +39 | coverage/CI exatos e aceites externos ainda não existem |
| S08 Supply chain, CI e release | 10% | 45 | 74 | +29 | CI remoto, release encadeado, registry/Trivy e attestation não provados |
| S09 Runtime, confiabilidade e operações | 7% | 68 | 82 | +14 | target, soak, SLO e rollback aprovados ausentes |
| S10 Documentação, controle e rastreabilidade | 3% | 42 | 78 | +36 | revisão independente fresh e governança remota ainda pendentes |
| S11 Governança, UAT e aceite | 3% | 30 | 30 | 0 | autoridades e UAT hospitalar não disponíveis |

A nota é uma medida de maturidade observada e não altera os critérios de saída:
zero P0, qualidade Triplo AAA, CI/release candidate-bound, target, recuperação,
UAT e autoridade continuam obrigatórios.

## Evidência local atual

| Gate | Resultado |
| --- | --- |
| Supply chain + mutações | 17/17; validador principal PASS |
| Dependências + segredos | 69 manifests; security secrets PASS; 0 critical/high/moderate conhecidos |
| Upload e observabilidade | limite canônico 25 MiB/413; métricas privadas, bounded e autenticadas; contratos PASS |
| Helm | render dev/staging/prod PASS com Helm oficial 3.15.4 |
| Qualidade | lint, typecheck e build PASS; suíte monorepo PASS |
| PostgreSQL crítico | conjunto efêmero real, migrações 0000–0177, 623/623 testes, RLS/concorrência/isolamento PASS |
| Processos críticos | 11/11 cenários não ignorados PASS, com cleanup por banco efêmero |
| SPA E2E local | 424/424, 0 falhas, 0 skips; 150 rotas/300 navegações no Chromium |
| Imagens production-shaped | API/worker/SPA PASS com usuários node/node/nginx, read-only, Vault, roles, readiness e proxy Helm; Trivy NOT_RUN |
| RLS/runtime/tracing | 171/172 tabelas, produção 3/3, tracing 3/3 |
| Backup/restore documental | 4/4 contratos e superfície operacional PASS |
| Readiness enterprise | 93/100: 33 PASS, 3 WARN, 1 FAIL de paridade externa bloqueada |

## Blockers externos preservados

1. Executar CI remoto obrigatório no SHA exato e obter revisão/proteção da
   branch.
2. Construir, publicar e verificar as três OCI, SBOM/Trivy e attestations por
   digest no workflow de release; nenhuma imagem local é promovida.
3. Provar deploy em target aprovado, migração/RLS, restore/rollback, carga,
   soak/SLO e alertas com credenciais e secrets do ambiente autorizado.
4. Obter homologação de providers, UAT hospitalar/acessibilidade e decisões
   formais Product, Clinical, Security/DPO, Operations e Release Authority.

## Decisão

Manter o release e a certificação Triplo AAA bloqueados. O próximo passo é a
revisão independente fresh do candidato e, somente com autorização externa,
CI/release/target. Esta auditoria não converte `NOT_PROVEN`, `WARN` ou
`BLOCKED` em aprovação.
