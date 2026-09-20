---
document_status: current
document_kind: baseline
effective_date: 2026-09-20
owner: Liderança técnica, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-candidate-change-or-material-evidence
candidate_sha: fc636c3fa16bfc56fef710b4baf4ba289a42da3a
overall_score: 68
verdict: LOCAL_COMPLETE / EXTERNAL_BLOCKED
---

# Auditoria e scorecard do candidato local — `fc636c3f`

## Veredito executivo

**Nota ponderada: 68/100 (53/100 na entrada; delta +15). Estado: `LOCAL_COMPLETE / EXTERNAL_BLOCKED`.**

Os gates locais da rodada foram reexecutados no candidato de fonte congelada
`fc636c3fa16bfc56fef710b4baf4ba289a42da3a`: supply-chain 17/17, política de
dependências, scanner de segredos, segurança enterprise, backup/restore
documental 4/4, upload/observabilidade, RLS, Helm 3.15.4, lint, typecheck,
build, suíte monorepo e contratos críticos passaram. A validação PostgreSQL
efêmera e a suíte de processos são evidência local; não são CI remoto, target,
restore aprovado, UAT ou autoridade de release.

O resultado local é utilizável para revisão e preparação de candidato, mas o
Triplo AAA permanece **`BLOCKED / NOT PROVEN`**. `ci_sha` e `release_sha`
continuam nulos na identidade. Não houve push, publicação, deploy, uso de
credenciais reais ou aceite humano.

## Scorecard conservador

| Dimensão | Peso | Entrada | Atual | Delta | Limite/bloqueio remanescente |
| --- | ---: | ---: | ---: | ---: | --- |
| S01 Produto e cobertura funcional | 15% | 44 | 48 | +4 | paridade Vetus 4/11 verificada; provider e UAT externos ausentes |
| S02 Backend, API e contratos | 12% | 66 | 80 | +14 | ingress real e CI do SHA ainda não provados |
| S03 Frontend, UX e acessibilidade | 8% | 59 | 60 | +1 | browser/visual/a11y e UAT do candidato ainda não aceitos |
| S04 Dados, migrações e isolamento | 12% | 74 | 80 | +6 | target, restore e mixed-version aprovados ausentes |
| S05 Segurança, privacidade e segredos | 12% | 42 | 80 | +38 | atestação/registry e homologação operacional externos |
| S06 Arquitetura e manutenibilidade | 8% | 52 | 52 | 0 | hotspots permanecem; refatoração está fora do caminho crítico |
| S07 Testes e engenharia de qualidade | 10% | 47 | 78 | +31 | coverage/CI exatos e aceites externos ainda não existem |
| S08 Supply chain, CI e release | 10% | 45 | 68 | +23 | CI remoto, release encadeado, OCI/Trivy e attestation não provados |
| S09 Runtime, confiabilidade e operações | 7% | 68 | 78 | +10 | target, soak, SLO e rollback aprovados ausentes |
| S10 Documentação, controle e rastreabilidade | 3% | 42 | 74 | +32 | revisão independente e governança remota ainda pendentes |
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
| PostgreSQL crítico | conjunto efêmero real, migrações 0000–0177, RLS/concorrência/isolamento PASS |
| Processos críticos | 11/11 cenários não ignorados PASS |
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
