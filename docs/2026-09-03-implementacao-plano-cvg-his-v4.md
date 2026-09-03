# Implementacao do plano geral CVG-HIS V4

**Data de consolidacao:** 3 de setembro de 2026  
**Documentos de origem:** reauditoria, plano executivo, roadmap e backlog de 2 de setembro de 2026  
**HEAD de partida observado:** `62175be7bdb98e38c6daf14f494682a93332279d`

## Resultado executivo

Todo o trabalho que pode ser implementado e exercitado somente neste workspace
foi incorporado. Isso inclui a fundacao P0, governanca documental e de release,
drills operacionais locais, contratos de performance e seguranca, cadastros
financeiros persistentes, semantica de datas, acessibilidade/usabilidade e game
day efemero.

Este checkpoint nao promove o sistema para producao. A arvore possui alteracoes
nao commitadas e trabalho concorrente preexistente; portanto ainda nao existe um
SHA imutavel da implementacao. CI remoto, protecao de branch, publicacao de
imagens, ambiente-alvo, provedores, aceite humano e homologacao de dados nao
podem ser fabricados por uma execucao local. Paridade Vetus permanece em 4/11.

Estados usados abaixo:

- **comprovado local:** comportamento e criterio tecnico exercitados neste host;
- **automacao pronta:** runner/workflow/runbook existe, mas a execucao ou aceite
  obrigatorio depende de outro ambiente ou pessoa;
- **parcial:** existe implementacao util, mas falta comportamento do proprio
  escopo alem de uma aprovacao;
- **bloqueado externo:** depende de acesso, credencial, dados, sandbox, ruleset
  ou autoridade nao fornecida.

## P0 — seguranca e determinismo

| IDs                                | Estado            | Evidencia e limite                                                                                                                                                                                             |
| ---------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB-001, DB-002, DB-003             | comprovado local  | politica unica em `packages/db/src/runtime-role-policy.ts`, reconciliador, inspetor, migration `0158`, testes positivos/negativos e PostgreSQL real com roles `NOINHERIT`, `NOBYPASSRLS` e funcoes allowlisted |
| DB-004                             | comprovado local  | guard de startup fail-closed e valores estritos versionados para ambientes de promocao; promocao real continua subordinada ao CI/alvo                                                                          |
| TST-001, TST-002, TST-003          | comprovado local  | subprocessos sem shell, resolucao portavel do pnpm e cleanup de prescricoes/revisions corrigidos                                                                                                               |
| TST-004, TST-005, TST-006, TST-007 | comprovado local  | cursor estavel, limites UTC inclusivos e projecoes de vendas/produtos/estoque corrigidos; o contrato vigente esta em [REPORT_DATE_SEMANTICS.md](./engineering/REPORT_DATE_SEMANTICS.md)                        |
| TST-008                            | comprovado local  | matriz critica executada sem skip: 561 testes database/setup/foundational e 10 process tests                                                                                                                   |
| QLT-001                            | parcial           | gate global passou com statements/lines 82,14%, branches 82,24% e functions 85,49%; a meta adicional de 85% por todos os modulos/repositories criticos nao foi demonstrada e permanece em QLT-002              |
| CI-001                             | automacao pronta  | suites locais relevantes passaram e o CI foi ampliado, mas o criterio exige checkout limpo e todos os gates no mesmo SHA remoto                                                                                |
| CI-002                             | bloqueado externo | checks e CODEOWNERS estao versionados; ruleset, revisao obrigatoria e bloqueio de push dependem de administracao do repositorio GitHub                                                                         |

## P1 — release, operacao e produto

| ID       | Estado            | Evidencia e limite                                                                                                                                                                                                                               |
| -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| REL-001  | automacao pronta  | `release-artifacts.yml` publica imagens por SHA/digest, SBOM, provenance, manifest e checksums somente apos CI verde em `main`; nenhuma imagem foi publicada nesta execucao                                                                      |
| OPS-001  | comprovado local  | Helm real validado em dev, staging e producao, incluindo Secrets e capabilities fail-closed; nao equivale a aplicar em cluster                                                                                                                   |
| OPS-002  | comprovado local  | drill de instalacao vazia e upgrade passou, com migration target e rollback documentados em [INSTALL_UPGRADE_ROLLBACK.md](./engineering/INSTALL_UPGRADE_ROLLBACK.md)                                                                             |
| OPS-003  | automacao pronta  | validadores de backup/restore e runbook existem; RPO/RTO, anexos e configuracao precisam ser medidos no alvo por OPS/DBA                                                                                                                         |
| OPS-004  | automacao pronta  | cutover/readiness/rollback e drill local existem; ensaio cronometrado e go/no-go no alvo dependem do comite de release                                                                                                                           |
| OPS-005  | automacao pronta  | runner fail-fast e workflow executam exatamente 20 rodadas no mesmo SHA sem retry oculto; uma rodada longa local passou, mas 20/20 remotas ainda nao ocorreram                                                                                   |
| PERF-001 | automacao pronta  | SLOs e perfis reproduziveis estao em [SLO_AND_LOAD_PROFILE.md](./engineering/SLO_AND_LOAD_PROFILE.md) e `benchmarks/k6/slos.json`; aprovacao de Produto/Operacao ainda e externa                                                                 |
| PERF-002 | automacao pronta  | workflow protegido fixa k6, SHA, perfil, credenciais e alvo descartavel; carga/endurance representativa ainda precisa ser executada                                                                                                              |
| OBS-001  | parcial           | metricas normalizadas, alertas, Grafana, readiness e propagacao de trace existem; uma transacao SPA/API/PostgreSQL/Redis/worker/provider ainda nao foi comprovada no alvo, nem a entrega humana dos alertas                                      |
| SEC-001  | automacao pronta  | testes negativos reais provam A/B, deny-by-default e ausencia de privilegios proibidos; falta o revisor independente exigido pelo ticket                                                                                                         |
| SEC-002  | automacao pronta  | [SECRET_ROTATION_AND_BREAK_GLASS.md](./engineering/SECRET_ROTATION_AND_BREAK_GLASS.md), workflow protegido, secret scan, Vault fail-closed e indice sem valores sensiveis implementados; rotacao, break-glass e audit log reais seguem pendentes |
| E2E-001  | automacao pronta  | matriz Playwright database-backed, persistencia/restart, RBAC e dois tenants consolidada; certificacao integral repetida no mesmo SHA remoto segue pendente                                                                                      |
| REP-001  | comprovado local  | `YYYY-MM-DD`, dias UTC inclusivos, SQL semiaberto e desempate deterministico documentados e contratados; regressao cobre o ultimo milissegundo em todas as familias do relatorio comercial                                                       |
| REP-002  | parcial           | workbench e exports auditaveis existem, mas relatorios historicos Vetus de cheques, antecipados, cancelamentos e personalizados continuam incompletos                                                                                            |
| REP-003  | parcial           | worker, lease, retry, run-once, recuperacao e entrega controlada possuem testes; homologacao da entrega externa e dependente de REP-002/OBS-001                                                                                                  |
| FIN-001  | comprovado local  | migration `0159`, CRUD API/SPA, RBAC, auditoria e RLS A/B para bancos, meios, maquinas e split; E2E browser/API/PostgreSQL passou                                                                                                                |
| FIN-002  | parcial           | ledger/PIX/DLQ possuem implementacao e testes locais; estorno, conciliacao nao-caixa, captura/settlement de cartao e provedor real continuam ausentes ou simulados                                                                               |
| LAB-001  | bloqueado externo | contratos e fluxo local nao substituem Live Lab ou sandbox laboratorial aprovado                                                                                                                                                                 |
| FIS-001  | bloqueado externo | adapter local nao substitui certificado, municipio e sandbox NFS-e com rejeicao/cancelamento/XML/PDF                                                                                                                                             |
| MKT-001  | bloqueado externo | consentimento, filas e sandbox deterministico existem; contas reais, bounce, opt-out e rate limit do provedor nao foram homologados                                                                                                              |
| INT-001  | bloqueado externo | nao foi fornecido sandbox Live Pet                                                                                                                                                                                                               |
| INT-002  | bloqueado externo | depende de LAB-001 e aceite do negocio                                                                                                                                                                                                           |
| MIG-001  | bloqueado externo | importador possui provas locais de idempotencia, conflito, rollback e A/B; faltam dados sanitizados e destino Vetus autorizado                                                                                                                   |
| GOV-001  | bloqueado externo | DSR, auditoria e controles locais existem; aceite operacional requer DPO/Seguranca e tenant-alvo                                                                                                                                                 |
| A11Y-001 | automacao pronta  | Axe, teclado, foco, labels, contraste e matriz responsiva foram implementados; leitor de tela e aceite WCAG independente continuam pendentes                                                                                                     |

## P2 — sustentabilidade

| ID                        | Estado           | Evidencia e limite                                                                                                                                                                |
| ------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOC-001, DOC-002, DOC-003 | comprovado local | indice canonico, rotulos historicos, manifesto e `pnpm docs:validate` bloqueiam metadata duplicada e links locais quebrados                                                       |
| REL-002                   | automacao pronta | ADR-012 define identidade V4, compatibilidade `v2` e politica SemVer; adocao organizacional depende de Lideranca/Produto                                                          |
| ARCH-001                  | comprovado local | CODEOWNERS, owners de dominio, hotspots, limites e planos de decomposicao possuem gate de complexidade                                                                            |
| QLT-002                   | parcial          | cobertura global supera 82%, mas 85% por metrica relevante em todos os componentes criticos ainda nao possui relatorio/gate dedicado                                              |
| OPS-006                   | comprovado local | game day trimestral/manual cobre API, rede, Redis, worker, provedor e banco; 6/6 passaram no stack efemero, com 503 nas falhas criticas e recuperacao final sem experimento ativo |
| GOV-002                   | comprovado local | dashboard mensal registra gates, owners, prazos, excecoes e regra de ata; a reuniao mensal continua sendo uma atividade humana recorrente                                         |

## Evidencias locais executadas

- roles/R0: 76 testes focados aprovados;
- matriz critica PostgreSQL: 60 arquivos e 561 testes aprovados;
- process gate: 10 testes aprovados;
- cobertura: 213 arquivos, 2.361 testes aprovados, 1 skip fora da matriz
  critica; statements/lines 82,14%, branches 82,24% e functions 85,49%;
- API server apos contexto tenant e game day: 63/63;
- modulo de vendas: 49/49, incluindo datas no ultimo milissegundo;
- FIN-001: repositories/RLS em PostgreSQL real, API/SPA e E2E completo aprovados;
- SPA/API/design system e suites de usabilidade: resultados detalhados em
  [implementacao de usabilidade](./2026-09-02-implementacao-usabilidade-playwright-cvg-his-v4.md);
- Helm real: dev/staging/prod aprovados;
- instalacao/upgrade: drill aprovado;
- game day: 6/6, deteccao entre 6 e 9 ms, recuperacao com
  `productionReady=true` e lista ativa vazia;
- contratos de documentacao, CI, release, performance, complexidade, seguranca,
  datas e game day aprovados;
- pacote de seguranca: secret scan, dependencias critical/high/moderate, SBOM com
  583 componentes e contrato SAST aprovados;
- paridade Vetus: evidencia 100/100, somente 4/11 areas sem bloqueador.

## Proxima sequencia autorizada

1. Formar um commit/SHA imutavel e executar CI completo em checkout limpo.
2. Configurar ruleset de `main` e environments protegidos no GitHub.
3. Publicar artefatos por SHA e executar 20/20 critical soak.
4. Executar performance, observabilidade, backup/restore e cutover no ambiente-alvo.
5. Fornecer sandboxes/credenciais/dados para pagamentos, laboratorio, fiscal,
   comunicacao, Live Pet/Live Lab e migracao Vetus.
6. Obter revisoes independentes de Seguranca, DPO, Acessibilidade, Produto e
   Operacao antes de qualquer decisao `go`.
