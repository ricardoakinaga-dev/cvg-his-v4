---
document_status: current
document_kind: audit_report
effective_date: 2026-09-12
owner: Engenharia
---

# Reauditoria após a primeira onda de melhorias

## Parecer

**Melhorias locais confirmadas parcialmente; release e certificação Triplo AAA permanecem BLOCKED / NOT PROVEN.** A cobertura documental de autenticação, o tratamento OIDC, o pipeline de release e o empacotamento visual avançaram. O bloqueio técnico de snapshot documental stale foi resolvido após os commits. Entretanto, foi reproduzido um falso positivo adicional no validador OpenAPI, a governança ainda apresenta inconsistências e a paridade permanece em 4/11 áreas.

Não atribuo uma nova nota global: esta é uma reauditoria das melhorias e dos seus limites, e não uma nova medição completa das 12 dimensões. Os 69/100 da auditoria inicial são históricos. A régua permanece global >=97, dimensões críticas >=95 e zero P0, acompanhada de evidência e autoridade aplicáveis.

## Escopo e identidade

- HEAD auditado: `324099e5a54537ca1349f3310639c3a12afbae36`, branch `main`.
- Commit funcional: `49569934f9c4c25df98cc0d18203b57db1433440`; HEAD acrescenta a reconciliação documental.
- Janela: 12/09/2026, aproximadamente 18:36–18:40 UTC.
- Worktree inicialmente limpo. Auditoria sem alterações de implementação; este relatório é o único arquivo acrescentado.
- Método: inspeção de código e contratos, testes focais, mutações adversariais em diretório temporário, teste HTTP local de timeout e consulta somente leitura à API pública do GitHub.
- Referências: [auditoria anterior](2026-09-12-auditoria-repositorio-cvg-his-v4.md), [roadmap](2026-09-12-roadmap-erp-state-of-art-triplo-aaa.md), [backlog](2026-09-12-backlog-correcao-gaps-triplo-aaa.md) e [ExecPlan](../.agent/plans/repository-state-of-art-remediation-execplan.md).
- Foi usado o engineering-framework para estruturar evidência, severidade e limites. Esta execução não constitui um novo Gauntlet com revisores independentes nem uma certificação visual.

## Comparação com as alegações anteriores

| Melhoria | Resultado atual | Limite |
| --- | --- | --- |
| 11 operações críticas de autenticação no OpenAPI | Confirmada estruturalmente; validator PASS, 430 paths, 41 tags, 525 schemas | Equivalência método/path não valida todos os payloads nem prova alcance runtime geral |
| AST rejeita código morto | Parcial; os casos originais passam | Novos casos `&& (false)` e `&& !true` passam indevidamente no validator |
| Tokens e UserInfo OIDC normalizados/validados | Confirmada por fonte e testes | UserInfo continua opcional no callback; não demonstra SSO completo ou verificação de ID token |
| Timeout OIDC padrão de 5 segundos | Confirmado na fonte; abort real confirmado com configuração de 50 ms | Deadline é por chamada, não orçamento único do callback; não recebe cancelamento da requisição HTTP de entrada |
| Release com scan e gate | Contrato estático e testes PASS | Quarentena é publicada antes do gate final; ACL, retenção, cleanup e execução real não comprovados |
| Pacote visual com baselines herdados | 12/12 testes PASS | Empacotamento não prova render, responsividade, acessibilidade ou qualidade visual atual |
| Typecheck sem sujar cache do design system | PASS; worktree continuou limpo após check | Não implica remoção de todos os caches rastreados do projeto |
| Timestamp único do outbox | Fonte usa uma captura; 24/24 testes do serviço PASS | Não prova retry/lease/recuperação distribuídos em produção |
| Snapshot documental | `pnpm docs:validate` PASS | Validador verifica referência de SHA, não a veracidade de cada alegação histórica |
| Estado `.agent` reconciliado | Parcial | 50 falhas persistem e há contradição sobre o commit já publicado |

## Achados

### RA-01 — falso positivo residual no AST (GAP-API-01 / REM-003)

**Severidade média; prioridade P1; confiança alta.** Em [validate-openapi.js](../scripts/validate-openapi.js), `flattenConjunction` não normaliza parênteses e a verificação de inalcançabilidade reconhece somente `FalseKeyword` diretamente. A detecção não avalia `!true`.

Reprodução: copiar `auth-routes.ts` para diretório temporário, alterar apenas a condição de `/auth/oidc/callback` e executar `node scripts/validate-openapi.js apps/api/src/openapi.yaml <fixture>`.

| Guarda acrescentada | Exit observado | Resultado correto |
| --- | --- | --- |
| `&& false` | 1 | Rejeitar |
| `&& (false)` | 0 | Rejeitar |
| `&& !true` | 0 | Rejeitar |

O problema é na força do gate; não foi observada uma rota morta dessa forma no código de produção. Recomenda-se normalizar expressões e ampliar os known-bads, acompanhados de teste de dispatch real. Fechamento: os três casos devem ser rejeitados, mantendo rotas válidas aceitas. Owner sugerido: backend/QA.

### RA-02 — governança e evidências ainda contraditórias (GAP-GOV-01 e GAP-DOCS-01 / REM-001–002)

**Severidade média; prioridade P1; confiança alta.** O checker de engenharia retorna `RESULT FAIL (pass=6 warn=0 fail=50)`: transições e enums históricos inválidos, referências problemáticas, baseline DONE sem evidência corrente adequada e ausência de IMPLEMENTATION_READY.

Além disso, [.agent/state.json](../.agent/state.json) declara a onda commitada em `repository_state`, mas `blocked_by[0]` ainda diz `uncommitted`. O [registro corrente](triple-a/17-current-execution-evidence.md) foi reancorado no commit funcional novo e conserva sob “Validações locais” números como PostgreSQL 615/615 e k6 9/9 de execuções anteriores, sem estabelecer a origem individual de todas as linhas. A data do cabeçalho também antecede o novo candidato. Isso cria ambiguidade, embora haja ressalva geral sobre evidência histórica.

O bloqueio de SHA stale está fechado; a consistência semântica continua aberta. Recomenda-se separar resultados por commit/data/procedimento e migrar controles com histórico preservado. Fechamento: checker válido e cada alegação corrente rastreável ao candidato correto. Owner: engenharia/PMO.

### RA-03 — cobertura crítica continua incompleta (GAP-COVERAGE-01 / REM-006)

**Severidade alta para a certificação; prioridade P0; confiança alta na configuração.** [vitest.config.ts](../vitest.config.ts) exclui explicitamente rotas da API, repositórios, partes de persistência e módulos como auth/billing do denominador de coverage. Testes existentes podem exercitar essas áreas, mas seu sucesso não torna esse percentual global representativo de todas as fronteiras críticas.

Fechamento: publicar denominadores por área crítica e executar um gate que cubra essas fronteiras com critérios claros. Owner: QA/backend. Nenhum percentual de coverage foi recalculado nesta auditoria.

### RA-04 — timeout local não fecha deadline end-to-end (GAP-DEADLINE-01 / REM-005)

**Severidade média; prioridade P1; confiança alta.** [oidc.ts](../packages/modules/auth/src/oidc.ts) usa `AbortSignal.timeout`, padrão 5.000 ms, faixa configurável de 1 a 30.000 ms. O [callback](../apps/api/src/routes/auth-routes.ts) chama token e UserInfo sequencialmente; cada etapa recebe um orçamento novo. Uma falha de UserInfo é convertida em `userInfo: null` com HTTP 200. Isso é comportamento explícito, mas exige decisão de produto caso UserInfo seja obrigatório para autenticação.

Após compilar o módulo auth, um servidor HTTP local que aceita conexão e não responde produziu `TimeoutError` em 52 ms para token e 50 ms para UserInfo, com timeout configurado de 50 ms. Isso confirma cancelamento dessas chamadas. Não foi executado teste de interrupção pelo cliente nem de orçamento total de 5 s do callback. Fechamento: propagar sinal/orçamento de entrada e testar as etapas lentas. Owner: backend.

### RA-05 — IDs de autenticação continuam nos logs (GAP-LOG-01 / REM-015)

**Severidade média; prioridade P1; confiança alta.** A suíte auth desta auditoria emitiu logs de `auth-brute-force` contendo `identifier: user1` e `identifier: user_admin`. São dados sintéticos do teste, mas demonstram que o campo não é minimizado pelo caminho exercitado. A proteção do payload OIDC não fecha esse GAP. Fechamento: política de minimização/pseudonimização e teste de não exposição. Owner: segurança/backend/DPO.

### RA-06 — paridade e prova operacional seguem abertas (REM-007–012 e REM-019–025)

**Prioridade P0 para release; confiança alta no resultado do gate local.** `pnpm vetus:parity` retorna exit 1, `Verified areas: 4/11`, `Functional parity: NOT VERIFIED`. Os sete grupos bloqueados são laboratório; fiscal; financeiro; marketing; relatórios; acesso/auditoria/LGPD; integrações/migração. O indicador `Evidence coverage: 100/100` mede existência das camadas de prova declaradas e não equivale a paridade funcional total.

GHCR/attestations, PostgreSQL crítico, browser/Axe, k6, restore/game day, Helm/deploy/rollback, providers, UAT e branch protection não receberam comprovação completa nesta reauditoria. Ausência de evidência não prova defeito de implementação, mas impede aprovação final.

## Verificações executadas nesta auditoria

| Procedimento | Resultado |
| --- | --- |
| `pnpm docs:validate` | PASS |
| `pnpm validate:openapi` | PASS estrutural |
| `pnpm validate:supply-chain` | PASS estrutural; 118 actions, 13 imagens de workflows, 15 Compose, 6 bases Docker, 4 scripts |
| OpenAPI runtime + contratos de release + OIDC | 51/51 PASS |
| `pnpm --filter @cvg-his-v2/module-auth test` | 53/53 PASS; contém os mesmos 4 testes OIDC já contados acima |
| `pnpm --filter @cvg-his-v2/api test:auth-route` | 31/31 PASS |
| `node --test scripts/usability-certification.test.mjs` | 12/12 PASS |
| Testes de `event-bus.test.ts` | 24/24 PASS |
| Typecheck do design system | PASS; sem alteração rastreada |
| Probe HTTP OIDC após build do módulo | TimeoutError observado nas duas chamadas |
| Mutações adicionais do AST | FAIL do critério: 2 variantes mortas foram aceitas |
| Checker engineering-framework | FAIL: 50 achados |
| `pnpm vetus:parity` | FAIL: 4/11 |

A primeira tentativa da probe importou um `dist/oidc.js` local antigo sem timeout e precisou ser encerrada. O módulo foi recompilado antes da prova válida. Isso limita a validade de testes que importam builds locais sem reconstruir suas dependências; não foi tratado como falha do código-fonte atual.

Não foram repetidos `pnpm typecheck`, `pnpm lint` ou `pnpm test` globais. Seus PASS anteriores — incluindo SPA 1.876 e API 593 — permanecem resultados da rodada anterior. Também não foi feita nova inspeção visual ou executado o gate Triple-A completo.

## CI remoto e próximo passo

Às 18:38:58 UTC, o [CI 34711492641](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34711492641), vinculado ao HEAD `324099e5`, estava `in_progress`, sem conclusão. Na consulta dos jobs, Dependency Audit, Secret Scan e SAST haviam concluído com sucesso; Typecheck estava em execução. Isso não é CI verde completo e não permite afirmar ausência de vulnerabilidades em todos os artefatos.

Próxima ação recomendada: corrigir e testar RA-01, reconciliar RA-02 e registrar o resultado terminal do CI do candidato. Em seguida, fechar o denominador de coverage crítica e executar PostgreSQL/browser no mesmo candidato, conforme REM-006/007. O roadmap continua válido, com esses achados anexados aos GAPs existentes.
