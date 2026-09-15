---
document_status: current
document_kind: audit_report
effective_date: 2026-09-12
owner: Engenharia
---

# Avaliação profunda: desbloqueio de release e evolução Triplo AAA

## 1. Parecer executivo

**Prontidão técnica e operacional avaliada: 60/100. Release: BLOCKED. Triplo AAA: NOT PROVEN.**

O ERP possui uma base significativa de módulos, contratos, testes e controles. A primeira onda melhorou autenticação, OpenAPI, timeout OIDC, outbox e documentação. Contudo, não faltam apenas credenciais ou homologações: há defeitos locais reproduzíveis no caminho de aprovação.

Os três pontos mais urgentes são:

1. O manifesto de fontes críticas não acompanha a alteração de `oidc.ts`: o teste de identidade falha e o CI do candidato apresenta falha em Repository Guards.
2. O gate exige `OBSERVABILITY-EVIDENCE`, mas seu caminho normal de construção não produz esse critério. A certificação pós-publicação não pode chegar a todos os critérios PASS por esse caminho, mesmo que as demais evidências estejam disponíveis.
3. A cobertura geral exclui fronteiras críticas; o CI inspecionado testa o verificador de cobertura crítica, mas não executa a verificação real dos shards atuais. O manifesto também referencia outro HEAD.

Depois dessas correções, ainda são necessários ensaios de banco, isolamento, recuperação, providers, browser, acessibilidade, carga e deploy, todos vinculados ao candidato, além de aprovação humana. Refatorar grandes arquivos e polir telas ajuda a excelência, mas não substitui essas provas.

## 2. Escopo, método e limites

- Candidato: `324099e5a54537ca1349f3310639c3a12afbae36`, branch `main`.
- Commit funcional: `49569934f9c4c25df98cc0d18203b57db1433440`; o HEAD acrescenta documentação.
- Data: 12/09/2026. Consulta de CI registrada aproximadamente às 18:48 UTC; estado remoto pode mudar depois.
- Auditoria somente: sem correções de implementação, commit, push, publicação ou alteração de infraestrutura.
- O relatório anterior `docs/2026-09-12-reauditoria-pos-melhorias.md` já estava não rastreado na entrada desta rodada e foi preservado.
- Método: inspeção de código/configuração/políticas; execução de typecheck, lint, testes, contratos e agregador diagnóstico; consulta somente leitura ao GitHub; correlação com as reproduções da reauditoria imediatamente anterior, no mesmo HEAD.
- Engineering-framework orientou a separação entre afirmação, evidência e aceite. Design-director orientou a avaliação de UX: testes de empacotamento não foram tratados como inspeção visual de produto.
- Esta é uma auditoria técnica aprofundada por fronteiras e risco, não uma inspeção exaustiva de cada linha, pentest, parecer legal, homologação clínica ou novo Gauntlet independente.

### Como interpretar as notas

Cada nota é um **juízo de prontidão sustentado pelas evidências disponíveis**, em escala 0–100, não percentual de funcionalidades implementadas, coverage ou probabilidade de ausência de bugs. A régua considera implementação, testes, prova na fronteira real e rastreabilidade, sem fingir precisão estatística.

| Faixa | Interpretação |
| --- | --- |
| 0–19 | Ausente ou inviável no recorte avaliado |
| 20–39 | Estrutura presente, mas caminho essencial de aprovação quebrado |
| 40–59 | Parcial; faltam integração, medição ou prova operacional determinante |
| 60–79 | Base consistente; permanecem lacunas relevantes de robustez ou homologação |
| 80–94 | Forte evidência local; fechamento de produção ainda incompleto |
| 95–100 | Excelência comprovada no escopo, com evidência atual e aceite aplicável |

Ausência de ensaio reduz **prontidão comprovada**, mas não demonstra implementação defeituosa. Não atribuo nota estética ao produto sem render atual. A média simples das 18 dimensões é `1080 / 18 = 60`. Ela é informativa: nenhuma média compensa um bloqueador obrigatório. Não é diretamente comparável aos 69/100 históricos, que usaram outro recorte.

## 3. Scorecard por item analisado

| # | Dimensão | Nota /100 | Principal fator que impede excelência |
| --- | --- | ---: | --- |
| 1 | Arquitetura e modularidade | 70 | Hotspots próximos do próprio teto; acoplamento operacional concentrado |
| 2 | API e contratos OpenAPI | 80 | Falsos positivos residuais de alcance no AST; contrato não prova dispatch completo |
| 3 | Autenticação, sessões e OIDC | 70 | SSO completo não demonstrado; deadline por etapa, não ponta a ponta |
| 4 | Segurança e privacidade técnica | 65 | Identificadores nos logs, política de edge e validação runtime pendentes |
| 5 | Dados, RLS, persistência e auditoria | 65 | Checks estáticos não substituem isolamento e integridade em PostgreSQL real |
| 6 | Fluxos críticos e confiabilidade do worker | 65 | Crash/replay/fencing e invariantes ponta a ponta sem fechamento atual |
| 7 | Completude funcional e integrações ERP | 45 | Paridade local verificada em 4/11 áreas; sete grupos sem fechamento |
| 8 | Testes e regressão local | 75 | Suíte global verde, mas contrato fora dela falha; faltam provas de fronteira |
| 9 | Cobertura crítica e identidade de evidência | 40 | Hash stale, HEAD divergente, exclusões e checker real não ligado ao CI inspecionado |
| 10 | CI e política de main verde | 60 | Repository Guards falhou; execução completa ainda não verde |
| 11 | Correção do gate e certificação | 35 | Critério de observabilidade sem produtor; exportações soak/rollback desconectadas |
| 12 | Dependências e cadeia de fornecimento | 60 | Advisory moderado e ausência de prova completa de imagens/assinaturas no alvo |
| 13 | Performance, capacidade e SLOs | 45 | Metas sem aceite operacional e certificação de capacidade atual incompleta |
| 14 | Backup, restore e continuidade | 40 | Políticas existem; recuperação cronometrada e game day não comprovados |
| 15 | Observabilidade e operação | 45 | Entrega de alertas, retenção, on-call e cadeia de traces não fechados |
| 16 | UX, acessibilidade e prontidão visual | 60 | Automação preparada; sem revisão visual atual e UAT comprovada nesta rodada |
| 17 | Governança e documentação | 55 | Documentos validam, mas controller e alegações históricas permanecem ambíguos |
| 18 | Deploy, Helm e rollback | 45 | Validação de superfície não prova implantação ou reversão real por digest |

## 4. Achados prioritários reproduzíveis

### DEEP-01 — identidade crítica stale quebra a validação de contratos

**Prioridade P0 para desbloqueio; defeito confirmado; confiança alta.**

Fonte: [manifesto](engineering/critical-coverage-scope.json), entrada de `packages/modules/auth/src/oidc.ts` na linha 4543; [teste](../scripts/critical-source-manifest.test.mjs), linhas 12–19.

Reprodução mínima:

```bash
node --test scripts/critical-source-manifest.test.mjs
```

Resultado nesta rodada: 2 testes, 1 PASS, 1 FAIL; erro `packages/modules/auth/src/oidc.ts: hash mismatch`. No lote maior dos contratos Node foram 88 testes: 87 PASS e 1 FAIL, com o mesmo erro. São execuções sobrepostas; não somar os totais.

O [CI do candidato](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34711492641) falhou em Repository Guards, etapa `Validate static and process contracts`, que inclui esse teste. A causa local reproduzida é consistente com a falha remota; o log remoto integral não foi obtido, portanto não excluo outras falhas na etapa.

**Fechamento:** revisar e regenerar a identidade das fontes alteradas, reconciliar a política de SHA do manifesto e regenerar os shards afetados. O teste deve passar; alteração subsequente não registrada deve fazê-lo falhar. Não basta apagar a assertiva ou trocar o hash e promover coverage antiga.

### DEEP-02 — agregador não consegue satisfazer a observabilidade

**Prioridade P0 para desbloqueio; defeito confirmado no caminho normal; confiança alta.** A prioridade do reparo é P0 porque bloqueia a decisão final; `OPS-001` continua P1 na régua congelada.

Em [run-triple-a-release-gate.mjs](../scripts/run-triple-a-release-gate.mjs), linha 1054, `OPS-001` consome `OBSERVABILITY-EVIDENCE`. O intake de evidências, linhas 1160–1178, não cria esse ID. A busca nos scripts, testes e workflows encontrou apenas esse consumidor. `currentStatus` retorna `NOT_RUN` quando o critério não existe; `FINAL-001` exige todos os critérios anteriores PASS.

Foi feita uma simulação do avaliador exportado com os demais inputs relevantes marcados PASS. Resultado: `OPS-001=NOT_RUN`, `FINAL-001=FAIL`, score 88 e critical score 89. **Esses números são uma reprodução sintética do defeito, não notas do ERP nem evidências válidas de release.**

Adicionalmente, `soak: finalArtifactSection(criteria, [])` e `rollback: finalArtifactSection(criteria, [])`, linhas 1314 e 1317, exportam seções sem referências e com status `NOT_RUN`. Isso é uma lacuna de ligação do artefato final; não foi demonstrado como segundo bloqueador independente da decisão.

**Fechamento:** criar intake e validação de observabilidade vinculados ao candidato/alvo; mapear soak e rollback aos artefatos correspondentes; testar um caminho completo legítimo e conhecidos inválidos: ausência, SHA errado, resultado incompleto e referência incompatível. Preservar os critérios e limiares; não remover OPS para fabricar aprovação.

### DEEP-03 — coverage verde não prova cobertura das fronteiras críticas

**Prioridade P0 de certificação; configuração confirmada; confiança alta.**

- [vitest.config.ts](../vitest.config.ts), linhas 65–93, exclui do denominador geral rotas, repositórios e fontes de auth/billing, entre outras.
- O manifesto crítico aponta HEAD `132d0f6eb8e1721ff15ee26fd4ea3f9c6ce5c75c`, diferente do candidato auditado.
- Exige cinco shards: `vitest-unit`, `vitest-integration`, `native-api`, `native-worker`, `critical-process`; thresholds de 85 para lines/statements/functions/branches.
- [check-critical-coverage.mjs](../scripts/check-critical-coverage.mjs), linha 30, rejeita HEAD divergente. Seu entrypoint, linha 157, aponta o diretório histórico `artifacts/consolidacao-2026-09-05/coverage-scope`.
- O workflow [ci.yml](../.github/workflows/ci.yml), linha 329, executa testes do checker. Não foi encontrada execução do checker real nesse workflow.

**Fechamento:** produzir os cinco shards do candidato, parametrizar o local de coleta, validar identidade/denominador e tornar o checker real required check. Uma fonte crítica sem métrica, shard ausente, hash errado ou cobertura abaixo do limite deve bloquear. Não foi recalculado um percentual atual nesta auditoria.

### DEEP-04 — AST aceita duas variantes de rota inalcançável

**Prioridade P1; defeito do validador confirmado na reauditoria do mesmo HEAD.**

No [validador OpenAPI](../scripts/validate-openapi.js), a fixture com `&& false` falhou corretamente; `&& (false)` e `&& !true` passaram incorretamente. Isso não prova que uma rota de produção esteja morta, mas reduz a confiança no gate que pretende detectar esse caso.

**Fechamento:** normalizar parênteses e avaliar expressões constantes suportadas; rejeitar os três casos e manter conhecidos válidos. Complementar análise sintática com testes de dispatch real de autenticação, permissão e payloads. Relaciona-se a REM-003.

## 5. Avaliação detalhada das demais fronteiras

### Arquitetura — 70/100

Há módulos, políticas de namespaces e budgets verificáveis; os checks correspondentes passaram. Entretanto, `apps/api/src/server.ts` tem 8.335 linhas e teto de 8.335; o arquivo de rotas SPA tem 2.920, teto 2.931; o runner do worker tem 2.139, teto 2.147; PatientDetailPage tem 4.075, teto 4.124. O budget contém crescimento, não demonstra boa decomposição.

Evolução: extrair composição, handlers e políticas por domínio; preservar fronteiras de autenticação, tenant e transação com testes antes de mover código. Decompor páginas por responsabilidade e estado. REM-016–018. Não condicionar toda correção urgente a uma reescrita global.

### API — 80/100; identidade — 70/100

As 11 operações críticas de autenticação estão documentadas e o OpenAPI está estruturalmente consistente. Isso é progresso real. Faltam maior força dos conhecidos inválidos e demonstração da equivalência comportamental, não apenas método/path.

OIDC normaliza respostas e limita cada chamada externa a 5 segundos por padrão. A reauditoria confirmou abort real com timeout reduzido em servidor HTTP local. Entretanto, token e UserInfo são sequenciais e recebem orçamentos separados; não há sinal de cancelamento do cliente propagado por esse caminho.

Em [auth-routes.ts](../apps/api/src/routes/auth-routes.ts), linhas 1226–1241, falha de UserInfo vira `null` e o callback devolve `{tokens, userInfo}`; esse trecho não estabelece sessão do ERP. Não foi localizado fluxo OIDC na SPA nem demonstração de verificação completa de ID token no caminho examinado. **Não foi demonstrado bypass de autenticação.** O achado é incompletude de SSO comprovado; se OIDC for ofertado no release, exigir ensaio ponta a ponta, validação de identidade/claims aplicável e vínculo seguro a tenant/permissões. Se não for ofertado, documentar e verificar sua desativação. REM-005 e complemento de REM-003.

### Segurança — 65/100; supply chain — 60/100

Secret Scan, SAST e auditoria de dependências do CI concluíram com sucesso na consulta. O audit local encontrou 5 ocorrências moderadas no grafo, sem high/critical, em dois grupos de módulos: Vitest e `@vitest/mocker`, associados ao mesmo advisory [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9). Não são cinco CVEs independentes; tampouco foi demonstrada exploração em produção.

Priorizar atualização compatível e regressão do tooling, documentando exposição e eventual aceite explícito. O sucesso de um job de audit não significa ausência de qualquer finding; políticas podem usar limiares distintos. REM-013.

O caminho de brute force ainda emite `identifier` sem minimização nos testes, com valores sintéticos. Revisar pseudonimização, acesso e retenção, preservando correlação útil. Health e metrics são tratados antes da autenticação principal em `server.ts`; a exposição externa efetiva depende do edge. Definir endpoints públicos mínimos e restringir detalhes/metrics; testar a política pelo ingresso real. Não foi demonstrada exposição pública do ambiente de produção. REM-014–015.

Pins e contratos estáticos de supply chain passaram. Ainda faltam imagem por digest, SBOM, assinatura/provenance verificadas, associação ao commit e comprovação de isolamento da quarentena antes da promoção. REM-004/010.

### Dados — 65/100; fluxos críticos e worker — 65/100

Checks estáticos de migração, RLS e schema clínico passaram. A correção de timestamp do outbox elimina a corrida local identificada; os testes anteriores do serviço passaram. Isso não prova isolamento em roles reais nem recuperação distribuída.

Exigir PostgreSQL com roles de runtime, tenants A/B, negativa de acesso cruzado, auditoria append-only, rollback transacional e migrações sobre cópia representativa. Para workers: derrubar processos nos pontos antes/depois do commit e publicação, retomar lease, testar fencing, retry limitado, DLQ e replay sem efeitos duplicados. Para fluxo clínico: preservar autoria, autorização e invariantes nas falhas e concorrência. REM-007/009 e evidências CLINICAL-E2E, WORKER-CRASH, AUDIT-INTEGRITY.

### Completude ERP — 45/100

O comando de paridade da reauditoria retornou `Verified areas: 4/11` e `Functional parity: NOT VERIFIED`. O indicador documental `Evidence coverage: 100/100` não significa 100% de paridade. Os sete grupos sem fechamento são:

| Grupo pendente | Prova necessária | Backlog |
| --- | --- | --- |
| Laboratório | pedido, coleta, resultado, laudo, erro de equipamento e replay | REM-019 |
| Fiscal | emissão, rejeição, consulta, cancelamento e artefatos reconciliados | REM-020 |
| Financeiro | pagamento, callback duplicado, refund e conciliação do ledger | REM-021 |
| Marketing | consentimento, opt-out, entrega, bounce, retry e isolamento | REM-022 |
| Relatórios | filtros, datas, totais, exportação e entrega comparados à fonte | REM-023 |
| Acesso/auditoria/LGPD | permissões, DSR, retenção e efeitos nos destinos | REM-024 |
| Integrações/migração | rejeitos, checksums, retomada, idempotência e reversão | REM-025 |

São critérios de aceite a executar, não falhas funcionais já demonstradas em cada operação. Não atribuo sete notas fictícias de implementação a grupos sem homologação nova. A nota 45 refere-se à dimensão conjunta de prontidão/paridade. REM-008 exige 11/11 no escopo contratado; reduzir escopo de release requer decisão explícita, não exclusão silenciosa de testes.

### Testes — 75/100; CI — 60/100

`pnpm typecheck`, `pnpm lint` e `pnpm test` terminaram com exit 0 nesta rodada. API: 593 PASS, zero FAIL/skip. Não reatribuo automaticamente à rodada atual todos os totais históricos por pacote; a saída global foi volumosa e parcialmente truncada. A falha do manifesto ocorreu em contrato separado, mostrando que `pnpm test` verde não equivale à totalidade dos required checks.

Na consulta ao [CI 34711492641](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34711492641), passaram Dependency Audit, Secret Scan, SAST, Typecheck, Validate OpenAPI, Lint, Coverage, Build, API Contract Tests e Critical Process Runner (Windows contract). Repository Guards falhou. Unit Tests, Visual Regression, Performance, Integration Tests e E2E Tests ainda estavam em andamento. Isso é um snapshot, não resultado terminal verde.

A consulta de branch protection respondeu HTTP 401. Seu estado é **não verificado**, não “inexistente”. Exigir evidência autenticada dos required checks e das regras de promoção. REM-006/010/012.

### Performance — 45/100; recuperação — 40/100; observabilidade — 45/100

[SLO_SLI_POLICY.md](operations/SLO_SLI_POLICY.md) registra contrato-alvo e sign-off de produção pendente; alert routing/retention não estão comprovados. [RPO_RTO_POLICY.md](operations/RPO_RTO_POLICY.md) apresenta metas propostas, como RPO de banco de 15 minutos e RTO de 60 minutos, explicitamente não aceitas ainda. São propostas, não resultados atingidos.

Antes de otimizar, aprovar população de dados, concorrência, mix de rotas, duração, percentis, erro tolerável e dependências degradadas. Executar k6/soak no alvo representativo e guardar séries, perfil e identidade. Depois atacar os gargalos observados; não substituir medição por cache ou índices especulativos.

Restaurar backup em ambiente isolado, medir RPO/RTO e validar consistência clínica/financeira, auditoria e outbox. Exercitar corrupção, migration mismatch e indisponibilidade. Provar que alertas chegam ao responsável, geram ação e possuem runbook; correlacionar SPA→API→DB/Redis→worker→provider sem dados sensíveis. REM-009/028/029, além de DEEP-02.

### UX e acessibilidade — 60/100 de prontidão, não de estética

Existem design system, specs de regressão visual, jornadas de acessibilidade e empacotamento com testes. O pacote visual anterior passou 12 testes. Não houve render atual inspecionado nesta rodada; aprovação de arquivos ou baselines não comprova a experiência.

Exigir jornadas reais nos viewports 375/768/1440, teclado, foco/restauração, modal, navegação, formulários longos, loading/empty/error, falha de rede, permissões e temas suportados. Complementar Axe com revisão manual e tecnologia assistiva, inspeção das telas renderizadas e UAT por usuários responsáveis. Medir sucesso da tarefa e erros, não apenas aparência. Baseline alterada precisa de revisão, não aceitação automática. REM-011/027.

### Governança — 55/100; deploy — 45/100

A validação documental passou, inclusive no diagnóstico atual. Porém, a reauditoria registra 50 inconsistências no controller histórico e contradição de commit em `.agent/state.json`. Resultados antigos de PostgreSQL/k6 não devem ser reancorados implicitamente no novo SHA. Preservar histórico e criar migração/registro corrente consistente, com origem individual de cada alegação. REM-001–002/030.

Checks de superfície de deploy e Helm passaram; isso não é execução de `helm` contra o ambiente. Faltam rollout, readiness, compatibilidade de schema, digest efetivamente executado, reversão e smoke de negócio no alvo. Separar rollback de aplicação de rollback de dados; definir estratégia segura quando uma migração não for reversível. REM-010.

## 6. Resultado real do agregador diagnóstico

Execução desta rodada, com diretórios novos de artefatos:

```bash
TRIPLE_A_RELEASE_OUTPUT_DIR=artifacts/audit-20260912-deep/release \
TRIPLE_A_FINAL_ARTIFACT_DIR=artifacts/audit-20260912-deep/final \
TRIPLE_A_RUN_BUILD=0 TRIPLE_A_RUN_TESTS=0 pnpm release:triple-a
```

Artefato local: `artifacts/audit-20260912-deep/release/TRIPLE_A_RELEASE_EVIDENCE.json` (gerado em 18:45:08 UTC; diretório de artifacts ignorado pelo Git).

| Medida do agregador | Resultado |
| --- | --- |
| Decisão | BLOCKED; publication_allowed=false; NOT PROVEN |
| Score operacional agregado | 49/100 |
| Critical score agregado | 43/100 |
| open_p0 agregado | 20 |
| Avaliação específica da quality bar | 28/100; críticas 22/100; open_p0=8 |
| Limiares declarados | total >=97; críticas >=95; P0=0 |

Essas são camadas diferentes do JSON, com critérios e contagens diferentes; não somar nem comparar como se fossem a mesma métrica. Os P0 do agregador incluem falta de evidência, não vinte vulnerabilidades confirmadas.

Treze checks estáticos passaram. Candidate integrity falhou no contexto da auditoria com relatório anterior não rastreado. Typecheck/lint/build/unit foram deliberadamente `NOT_RUN` dentro desse comando; typecheck/lint/unit passaram em execução separada e não foram injetados artificialmente no JSON. Evidências externas obrigatórias não foram fornecidas ao agregador. Portanto, 49 não é uma medição de gate completo nem substitui a nota editorial 60.

O achado DEEP-02 é independente dessa execução incompleta: ele decorre da ligação ausente no código do avaliador.

## 7. Plano priorizado de fechamento

Owners abaixo são papéis sugeridos, não designações já aprovadas. O [backlog REM-001–030](2026-09-12-backlog-correcao-gaps-triplo-aaa.md) continua sendo a referência; este relatório não altera seus estados.

| Ordem | Entrega | Responsável sugerido | Aceite objetivo |
| --- | --- | --- | --- |
| M0.1 | Corrigir manifesto e política de identidade — DEEP-01 / REM-006 | QA/Backend | contrato verde; fontes e shards atuais; mutação de fonte invalida evidência |
| M0.2 | Fechar intake de observabilidade e mapeamentos — DEEP-02 / REM-012/028 | Plataforma/SRE | caminho completo válido aprova; ausência/SHA errado/incompletude bloqueiam |
| M0.3 | Endurecer AST e reconciliar controle — DEEP-04 / REM-002/003 | Backend/Engenharia | fixtures mortas rejeitadas; controller corrente válido; histórico preservado |
| M1 | Instrumentar cinco shards e integrar checker real — DEEP-03 / REM-006 | QA/CI | required check mede todas as fontes críticas do candidato e falha abaixo do limiar |
| M2 | Provar dados, auth e processos — REM-005/007 | Backend/DB/QA | isolamento A/B, cancelamento, crash/replay e jornadas persistidas sem skips críticos |
| M3 | Fechar paridade e providers — REM-008/019–025 | Produto/Domínios/QA | 11/11 com positivo, negativo, permissão, persistência e reconciliação |
| M4 | Homologar operação — REM-009/028/029 | SRE/DB | metas aprovadas; carga/soak, restore e alertas demonstrados no alvo |
| M5 | Homologar interface — REM-011/027 | UX/Frontend/QA/Usuários | renders reais revisados, matriz responsiva/a11y e UAT atual |
| M6 | Fechar cadeia de entrega — REM-004/010/013–015 | Plataforma/Segurança | scans aceitos, digest/attestations, branch rules, deploy/rollback e edge comprovados |
| M7 | Congelar e recertificar — REM-012 | Release authority | candidato íntegro, CI terminal verde, evidências atuais, critérios PASS e assinatura humana |

M3, M4 e M5 podem avançar em frentes independentes depois das pré-condições de ambiente/dados. O candidato final de M7 deve ser revalidado após as últimas alterações; não misturar resultados de commits diferentes sem regra explícita de equivalência.

Para excelência sustentada, executar decomposição incremental REM-016–018 e revisão de budgets, ruído de testes e freshness REM-026–030. Não há fundamento para prometer prazo ou “perfeição” sem conhecer acesso aos ambientes, capacidade da equipe e janelas de homologação.

## 8. O que depende de ambiente ou autoridade

- Docker está instalado, mas o socket local respondeu permission denied; `psql` e `helm` não foram encontrados. k6 está disponível. Não havia serviços escutando nas portas locais verificadas para banco/SPA/API. Não foi tentado contornar permissões.
- PostgreSQL runtime, render/browser/Axe, restore, carga, Helm/deploy/rollback e providers não foram reexecutados localmente nesta rodada. Jobs remotos em andamento não contam como PASS.
- GHCR, attestations e branch governance precisam de evidência autenticada ligada ao candidato/digest.
- SLO/RPO/RTO precisam de aceite dos responsáveis; UAT e autoridade final não podem ser autoatribuídos pelo executor.

## 9. Critério final de liberação

Liberar somente quando os defeitos locais acima estiverem fechados com regressão, os required checks do candidato terminarem verdes, a régua congelada for satisfeita sem exceções implícitas e cada evidência mandatória estiver íntegra, atual e vinculada ao alvo. Exigir global >=97, críticas >=95, zero P0, todos os critérios obrigatórios PASS e autoridade de release válida.

**Conclusão:** o próximo salto de qualidade não é aumentar o número de documentos ou declarar uma média melhor. É corrigir a confiabilidade da própria aprovação e completar as provas reais de operação e negócio. A base suporta evolução incremental; o release ainda não está demonstrado como seguro e completo no escopo Triplo AAA.
