---
document_status: supporting
document_kind: worktree-audit
effective_date: 2026-09-23
owner: Engenharia CVG-HIS; avaliação técnica independente
review_cycle: on-candidate-change-or-material-evidence
inspected_head: ad2f0373f68635f2579253b013a4382219906921
overall_score: 66
verdict: RELEASE_BLOCKED
---

# Auditoria do repositório CVG-HIS V4 — 23/09/2026

[50 melhorias](2026-09-23-lista-50-melhorias.md) · [Plano executivo](2026-09-23-plano-executivo-melhorias.md) · [Roadmap](2026-09-23-roadmap-melhorias.md) · [Backlog](2026-09-23-backlog-melhorias.md)

## Veredito e identidade

**Nota ponderada: 66/100 (65,93 arredondado). Release bloqueado.** A nota é uma avaliação editorial do estado observado, não um resultado da [Quality Bar](triple-a/QUALITY_BAR_V1.json), aprovação de produção ou certificação de paridade.

- Inspeção: 23/09/2026, no checkout local do repositório CVG-HIS V4.
- `HEAD`: `ad2f0373f68635f2579253b013a4382219906921`; `origin/main` observado: `570920de3d12d9a1043aa2c36102a89d39f04569`.
- `main` local e `origin/main` têm 79 commits exclusivos cada um após a reescrita remota autorizada. O remoto reescrito já não contém blobs ≥100 MiB; o histórico local ainda alcança `.gauntlet/state.json` de 152.651.034 bytes. É preciso reconciliar as histórias preservando o trabalho local antes de promover outro candidato.
- A árvore de trabalho estava **suja** (124 caminhos modificados e 244 não rastreados no inventário da auditoria). Este relatório descreve `HEAD` **mais** alterações locais observadas; não identifica um SHA único reproduzível para todos os resultados. A [auditoria de 21/09](2026-09-21-auditoria-profunda-repositorio.md) mediu 68/100 em um checkout limpo daquele dia e continua sendo a baseline formal do manifesto documental até existir um novo candidato congelado.
- `P0_REGISTRY.json` registrava 11 controles abertos e três fechados; `.agent/backlog.json` registrava 25 `DONE`, oito `TODO` e 22 `BLOCKED` entre 55 itens `REM`. São snapshots de controles diferentes, que exigem reconciliação antes de qualquer declaração de fechamento.

## Escopo e método

Foram inventariados 788 arquivos documentais rastreados ou visíveis; 554 textos UTF-8 (19,4 MB) foram lidos programaticamente, e 234 binários foram inventariados por metadados. O diretório físico tem muitos artefatos gerados/ignorados, razão pela qual a contagem bruta não equivale a documentos normativos. A inspeção cruzou documentação vigente, código, migrations, testes, scripts, CI, manifests, controle operacional e execução local. A amostra de interface incluiu login e dashboard em desktop e viewport móvel.

Os resultados abaixo distinguem **validação observada**, **falha observada** e **não executado**. Não houve build integral, suíte integral, cobertura fresca, restauração real, carga, deploy, CI remoto, UAT ou homologação de provedores nesta rodada. A suíte de raiz prepara/reseta banco, enquanto o ambiente local compartilhado tinha credencial de migração inválida; preservou-se o banco e os serviços em uso.

## Scorecard

| Item analisado | Peso | Nota / 100 | Evidência e principal limite |
| --- | ---: | ---: | --- |
| Produto e paridade funcional | 14% | **58** | Quatro de 11 áreas Vetus verificadas; sete bloqueadas; cobertura de inventário não comprova jornada funcional. |
| Backend, API e contratos | 11% | **78** | OpenAPI válido com 431 paths, 41 tags e 525 schemas; `server.ts` concentra 8.318 linhas e requer separação. |
| Frontend, UX e acessibilidade | 8% | **76** | Login e dashboard renderizaram em desktop/móvel sem erro de página ou overflow horizontal; várias páginas excedem 2.000 linhas e falta UAT/WCAG integral. |
| Dados, migrations e multitenancy | 12% | **68** | Validação estática de migrations/RLS passou; 171 de 172 tabelas tenant têm proteção e uma exceção documentada; banco local não tinha a migration 0175 e usuário de migração não autenticou. |
| Segurança, privacidade e segredos | 11% | **80** | Scan local de segredos, política de dependências e supply chain passaram; falta prova target, revisão LGPD e aceite de autoridades. |
| Arquitetura e manutenibilidade | 8% | **65** | Guard de hotspots passou, mas módulos grandes fora da lista exigem decomposição e ownership claro. |
| Testes e qualidade | 10% | **68** | 12 testes SPA focais e 17 testes de mutação supply chain passaram; a suíte integral e coverage não foram executados nesta fotografia. |
| CI, cadeia de artefatos e release | 10% | **48** | Política de refs pinadas passou; não há execução de CI/release/OCI no SHA da árvore suja, e as histórias Git divergem. |
| Operação, backup e observabilidade | 7% | **57** | Validadores runtime/observabilidade passaram; `ops:backup:check` falhou em 2/4 por matcher documental defasado. Restore e RPO/RTO não foram ensaiados. |
| Documentação e rastreabilidade | 4% | **72** | Validador documental passou; quatro links locais quebrados em scorecards históricos, e baseline anterior não descreve a árvore atual. |
| DX e reprodutibilidade | 3% | **64** | Typecheck e lint passaram; há avisos `any`, ambiente DB incompleto e necessidade de checkout candidato limpo. |
| Governança, UAT e aceite | 2% | **30** | P0 abertos, autoridades e evidências externas pendentes; não há aceite formal de produção. |
| **Total ponderado** | **100%** | **66** | **Release bloqueado.** |

Regra de cálculo: soma de `peso × nota / 100` para as 12 dimensões; total bruto 65,93. As notas são julgamento de auditoria, não percentuais de testes aprovados. A régua Triplo AAA continua exigindo total ≥97, dimensões críticas ≥95, zero P0, gates obrigatórios e aprovações válidas.

## Evidências observadas nesta rodada

| Resultado | Observação |
| --- | --- |
| Aprovado | OpenAPI, complexidade, política de skips (36 allowlisted), documentação, política de dependências, supply chain, migrations, produção/runtime, observabilidade, segurança de segredos e superfície de deploy. |
| Aprovado, escopo limitado | RLS estático 171/172; `validate:helm` estático, sem binário Helm instalado; typecheck API/SPA; lint de 68/69 projetos com avisos, sem erros; 12 testes SPA focais; 17 testes de mutação supply chain. |
| Reprovado | `check-enterprise-readiness.mjs`: score estrutural 93/100, mas um `FAIL` e paridade 4/11; `ops:backup:check`: 2/4 por expressões antigas de roadmap/backlog. |
| Ambiente local | PostgreSQL e Redis já estavam em uso. Login de migração falhou com `28P01`; falta `access_control_change_versions` no banco runtime. A API de demonstração estava em modo memória, com `/health` 200 e `/ready` 503. |
| Navegador | Login de demonstração e dashboard abriram em 1440 px e 390 px; sem erro de página e sem overflow horizontal nessas duas telas. Isso não certifica outras jornadas nem acessibilidade. |
| Não executado | Build completo, testes integrais/coverage, migração local, restore, rollback, carga/soak, CI remoto, deploy target, UAT e homologação. |

## Achados prioritários

1. **Identidade de candidato e release.** A árvore suja e a divergência Git impedem vincular todos os resultados a um único SHA. O remoto reescrito resolveu o blob naquele alcance; o checkout local exige reconciliação segura, sem repetir automaticamente a reescrita.
2. **Dados locais não reproduzíveis.** A credencial de migração falha e a tabela da migration 0175 falta no banco runtime. A API em memória é útil para interface, mas não prova persistência clínica nem prontidão.
3. **Gates incompletos.** A suíte integral e o coverage precisam rodar em ambiente isolado e seguro; `ops:backup:check` deve voltar a representar os documentos atuais. O erro desse gate não demonstra falha no mecanismo de backup.
4. **Paridade e aceite.** Sete de 11 áreas permanecem sem verificação funcional; P0, target, restore, UAT e aceites humanos impedem release.
5. **Manutenibilidade.** `server.ts` e páginas SPA muito extensas elevam o custo de mudança; o guard atual não cobre todos os hotspots relevantes.

O detalhamento em 50 ações, com ordem, responsáveis sugeridos e critérios de aceite, está na [lista](2026-09-23-lista-50-melhorias.md) e no [backlog](2026-09-23-backlog-melhorias.md). O estado operacional efetivo continua em `.agent/backlog.json`; este pacote não altera status de tickets nem concede autoridade de release.
