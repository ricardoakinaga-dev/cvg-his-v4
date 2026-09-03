---
document_status: current
document_kind: backlog
effective_date: 2026-09-02
owner: PMO e líderes de domínio CVG-HIS
review_cycle: monthly
---

> Atualizacao de execucao (2026-09-03): o status evidenciado de cada ID esta na [matriz de implementacao](./2026-09-03-implementacao-plano-cvg-his-v4.md); este arquivo preserva escopo, prioridade e criterios de aceite.

# Backlog priorizado de melhorias do CVG-HIS V4

**Origem:** [reauditoria de 2026-09-02](./2026-09-02-relatorio-reauditoria-cvg-his-v4.md)

**Direção:** [plano executivo](./2026-09-02-plano-executivo-melhorias-cvg-his-v4.md)

**Sequenciamento:** [roadmap](./2026-09-02-roadmap-melhorias-cvg-his-v4.md)

## 1. Convenções

- **P0:** bloqueia promoção e deve ser resolvido primeiro.
- **P1:** obrigatório para release candidate ou go-live.
- **P2:** melhoria importante, executada após estabilização dos gates.
- **Tamanho:** S, M, L e XL são estimativas relativas, não prazo.
- **Status inicial:** todos os itens estão em `TODO`; só mudam com evidência vinculada ao commit.

## 2. Backlog P0 — bloqueadores

| ID      | Item                                                                    | Tam. | Dependência          | Critério de aceite                                                                                                                 |
| ------- | ----------------------------------------------------------------------- | ---: | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| DB-001  | Definir uma especificação única de capabilities para roles API e worker |    M | —                    | reconciliador, inspetor e testes importam/validam o mesmo contrato; casos positivos e negativos documentados                       |
| DB-002  | Alinhar `NOINHERIT`, memberships e privilégios das roles                |    L | DB-001               | banco recriado do zero retorna `safe=true`; API/worker não recebem superuser, `BYPASSRLS`, create role/db ou privilégios proibidos |
| DB-003  | Alinhar funções `SECURITY DEFINER` e `search_path`                      |    M | DB-001               | apenas funções allowlisted são executáveis; `search_path` seguro é idêntico no reconciliador e inspetor                            |
| DB-004  | Ativar guard estrito nos ambientes de promoção                          |    S | DB-002, DB-003       | startup falha com role insegura e sobe com roles aprovadas; configuração versionada em staging/produção                            |
| TST-001 | Tornar `tests/db/db-schema.ts` independente de shell/path               |    S | —                    | usa binário + argumentos estruturados; teste passa em caminho com espaço e caracteres Unicode                                      |
| TST-002 | Corrigir resolução de `pnpm` no teste dos consumidores do worker        |    S | —                    | subprocesso localiza o gerenciador no ambiente local e CI; suíte não produz `ENOENT`                                               |
| TST-003 | Corrigir cleanup de prescrições e revisions                             |    S | —                    | teardown remove dados na ordem correta, preserva FKs e não mascara erro de teste                                                   |
| TST-004 | Corrigir paginação por cursor de auditoria                              |    M | TST-001              | segunda página retorna dados corretos, sem duplicidade/lacuna, com ordenação estável                                               |
| TST-005 | Padronizar limites inclusivos de data e timezone em vendas              |    M | TST-001              | registro no primeiro e no último instante definido aparece exatamente uma vez em fusos testados                                    |
| TST-006 | Corrigir filtros de data do relatório de produtos                       |    M | TST-005              | `Alpha Med` e demais fixtures de limite são retornados conforme contrato                                                           |
| TST-007 | Corrigir agregação/seleção do relatório de posição de estoque           |    M | TST-005              | conjunto e saldo esperado batem com ledger; teste cobre múltiplos produtos/lotes                                                   |
| TST-008 | Zerar skips não justificados da matriz crítica                          |    M | TST-001–007          | todo skip remanescente tem ticket, prazo, owner e aprovação; matriz de release não omite banco/Redis                               |
| QLT-001 | Recuperar e ampliar o gate de cobertura                                 |    M | DB-001–003           | todas as métricas ≥82%, sem reduzir threshold ou aumentar exclusões; módulos de roles e repositórios críticos ≥85%                 |
| CI-001  | Obter matriz completa verde em checkout limpo                           |    M | TST-001–008, QLT-001 | build, types, lint, test, coverage, critical, security e validadores verdes no mesmo SHA                                           |
| CI-002  | Proteger `main` com checks e revisão obrigatórios                       |    S | CI-001               | merge bloqueado com check pendente/vermelho; sem push direto; branches temporárias removidas após merge                            |

## 3. Backlog P1 — release e operação

| ID       | Item                                                   | Tam. | Dependência           | Critério de aceite                                                                                         |
| -------- | ------------------------------------------------------ | ---: | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| REL-001  | Publicar artefatos imutáveis e rastreáveis por SHA     |    M | CI-001                | imagem/bundle tem digest, SBOM e vínculo com pipeline e commit                                             |
| OPS-001  | Validar Helm com binário real em dev/staging/prod      |    M | CI-001                | renderização e validação reais passam; Secrets e capabilities são fail-closed                              |
| OPS-002  | Ensaiar instalação vazia e upgrade                     |    M | DB-002, REL-001       | migrations/seed controlado funcionam em banco vazio e snapshot anterior; rollback definido                 |
| OPS-003  | Executar backup e restore no ambiente-alvo             |    L | OPS-002               | dados, anexos e configuração restaurados; RPO/RTO medidos e aprovados                                      |
| OPS-004  | Ensaiar deploy, cutover e rollback                     |    L | OPS-001–003           | runbook cronometrado, responsáveis e decisão go/no-go exercitados                                          |
| OPS-005  | Executar 20 rodadas consecutivas do critical gate      |    M | CI-001                | 20/20 verdes no mesmo SHA/ambiente, sem flaky retry oculto                                                 |
| PERF-001 | Definir SLOs e perfil de carga                         |    M | produto/operação      | jornadas, concorrência, volume, p95/p99 e limites aprovados                                                |
| PERF-002 | Executar carga e endurance representativas             |    L | PERF-001, OPS-001     | SLOs cumpridos com margem; gargalos e capacidade registrados                                               |
| OBS-001  | Comprovar observabilidade distribuída                  |    L | OPS-001               | uma transação é rastreável entre SPA/API, PostgreSQL/Redis, worker e provedor; alertas acionáveis testados |
| SEC-001  | Revisar roles/RLS de forma independente                |    M | DB-004                | revisão negativa comprova isolamento A/B, deny-by-default e ausência de escalation                         |
| SEC-002  | Revisar segredos, rotação e acesso de produção         |    M | OPS-001               | nenhum segredo em Git/log; rotação, break-glass e auditoria exercitados                                    |
| E2E-001  | Consolidar matriz E2E de jornadas críticas             |    L | CI-001                | atendimento, estoque, financeiro, acesso e relatórios passam com persistência/restart e dois tenants       |
| REP-001  | Consolidar semântica de datas nos relatórios           |    M | TST-005–007           | contrato de timezone/período documentado e aplicado a todos os relatórios críticos                         |
| REP-002  | Completar relatórios históricos equivalentes ao Vetus  |   XL | REP-001               | negócio reconcilia amostras, totais e filtros; exportações são auditáveis                                  |
| REP-003  | Homologar geração e entrega agendada                   |    L | REP-002, OBS-001      | worker gera, entrega, retenta e registra falhas/duplicidades sem perda                                     |
| FIN-001  | Persistir cadastros financeiros hoje estáticos         |    L | DB-002                | bancos, meios, máquinas e split têm CRUD, RBAC, auditoria e isolamento tenant                              |
| FIN-002  | Completar cartão/PIX, settlement, refund e conciliação |   XL | FIN-001               | ledger fecha com provedor; idempotência, rejeição, retry e divergência cobertos                            |
| LAB-001  | Integrar e homologar Live Lab/provedor laboratorial    |   XL | acesso ao sandbox     | ciclo completo e matriz de falhas aprovados; reconciliação auditável                                       |
| FIS-001  | Homologar NFS-e municipal                              |   XL | certificado e sandbox | emissão, rejeição, consulta, cancelamento, timeout, XML/PDF e idempotência aprovados                       |
| MKT-001  | Homologar e-mail/SMS/WhatsApp real                     |    L | contas de teste       | consentimento, envio, bounce, opt-out, retry e rate limit comprovados                                      |
| INT-001  | Homologar Live Pet                                     |    L | acesso ao sandbox     | sync, duplicidade, erro, retry e reconciliação aprovados                                                   |
| INT-002  | Homologar Live Lab                                     |    L | LAB-001               | integração observável, resiliente e aceita pelo negócio                                                    |
| MIG-001  | Homologar migração Vetus no destino                    |   XL | dados sanitizados     | contagem, checksum e reconciliação clínica/financeira aprovadas; rollback testado                          |
| GOV-001  | Executar aceite operacional LGPD                       |    L | Segurança/DPO         | exportação, correção, retenção, anonimização, mascaramento e logs exercitados                              |
| A11Y-001 | Auditar e corrigir acessibilidade crítica              |    L | matriz de jornadas    | zero bloqueador WCAG nas jornadas críticas; teclado, foco, labels e contraste testados                     |

## 4. Backlog P2 — sustentabilidade

| ID       | Item                                               | Tam. | Dependência       | Critério de aceite                                                                                 |
| -------- | -------------------------------------------------- | ---: | ----------------- | -------------------------------------------------------------------------------------------------- |
| DOC-001  | Definir índice documental canônico                 |    S | —                 | `docs/README.md` aponta para baseline, plano, roadmap e backlog vigentes                           |
| DOC-002  | Rotular baselines e planos superados               |    M | DOC-001           | documento antigo informa status histórico e link para a versão atual; links quebrados corrigidos   |
| DOC-003  | Automatizar verificação de links/status documental |    M | DOC-001           | CI detecta link local quebrado, metadata ausente e duas baselines marcadas como vigentes           |
| REL-002  | Decidir identidade V4 e política SemVer            |    M | liderança/produto | ADR define nomes de pacotes/serviços/OpenAPI e caminho de migração de `v2`/`0.1.0`                 |
| ARCH-001 | Mapear hotspots de complexidade e ownership        |    M | CI-001            | módulos críticos têm owner, limite e plano de decomposição baseado em métricas                     |
| QLT-002  | Elevar cobertura crítica para 85%                  |    L | QLT-001           | roles, RLS, pagamentos, migrações e repositórios críticos ≥85% por métrica relevante               |
| OPS-006  | Automatizar game day periódico                     |    L | OBS-001, OPS-004  | falhas de API/worker/Redis/banco/provedor são injetadas, detectadas e recuperadas conforme runbook |
| GOV-002  | Instituir revisão mensal de risco e evidência      |    S | DOC-001           | dashboard registra gates, exceções, responsáveis, vencimentos e decisões                           |

## 5. Primeira fila recomendada

A primeira sprint deve limitar trabalho em andamento e atacar, nesta ordem:

1. DB-001, DB-002 e DB-003;
2. TST-001, TST-002 e TST-003;
3. TST-004, TST-005, TST-006 e TST-007;
4. DB-004 e SEC-001;
5. QLT-001;
6. CI-001 e CI-002.

Itens externos podem ser preparados em paralelo apenas para obter acesso, agenda e critérios; não devem desviar capacidade de engenharia dos P0.

## 6. Definition of Ready

Um item pode entrar em execução quando possui:

- resultado de negócio/técnico esperado;
- responsável primário e revisor;
- dependências e ambiente disponíveis;
- critérios de aceite testáveis;
- risco de dados, segurança e rollback identificado;
- estimativa relativa validada pela equipe.

## 7. Definition of Done

Um item só está concluído quando:

- implementação e documentação foram revisadas;
- testes positivos, negativos e de regressão passaram;
- build, types, lint, coverage, segurança e gates afetados estão verdes;
- evidência contém SHA, ambiente, data, comando e resultado;
- observabilidade e runbook foram atualizados quando aplicável;
- não houve redução de gate, exclusão oportunista ou skip não aprovado;
- responsável de produto/operação aceitou mudanças de comportamento.

## 8. Modelo de evidência por item

Cada conclusão deve anexar, no ticket ou artefato equivalente:

```text
ID:
Commit/SHA:
Ambiente:
Data e timezone:
Comandos executados:
Resultado resumido:
Artefatos/logs:
Riscos residuais:
Aprovadores:
```

## 9. Regra de replanejamento

O backlog deve ser repriorizado se surgir vulnerabilidade crítica/alta, perda ou corrupção de dados, quebra de isolamento tenant, falha de restauração ou regressão clínica/financeira. Nesses casos, o novo incidente assume P0 e o roadmap volta ao último gate comprovadamente verde.
