---
document_status: historical
document_kind: baseline
effective_date: 2026-09-13
owner: Engenharia CVG-HIS
review_cycle: archived
superseded_by: docs/2026-09-20-auditoria-scorecard-8c1feddb.md
candidate_sha: 324099e5a54537ca1349f3310639c3a12afbae36
score: 63
verdict: BLOCKED
---

## Atualização após PROD-001–005 — 13/09/2026

A [reauditoria do checkpoint](2026-09-13-reauditoria-checkpoint-prod-001-005.md) é a leitura mais recente do delta. **NO-GO mantido; não confirmar 5/47 DONE integralmente.** Migração parcial e guard de relatórios exigem reabertura de PROD-004/005; controle, retenção e harness têm aceites pendentes. Checker crítico atual: **246 erros, sendo 241 substantivos e cinco divergências de hash**; manifesto rev12, 194 fontes especializadas (169 SQL + 25 Vue). O corpo abaixo preserva a auditoria inicial: seus números 63/100, rev9/240 e achados são históricos. Não houve nova pontuação global das 18 dimensões.

Esta publicação atualiza somente documentação e guarda provas da reauditoria; `.agent` precisa da reconciliação PROD-001-R1 descrita no backlog. A evidência financeira foi reexecutada em componente isolado; provas de migração e guard têm limites explícitos no novo relatório.

## Auditoria inicial preservada


> Publicação documental em 13/09/2026: esta é a auditoria já concluída, com conteúdo e notas preservados; foram acrescentados metadados e adaptados links para o repositório. A afirmação de não alteração do programa refere-se à janela da auditoria original, anterior a esta publicação documental. Evidências e original estão em `artifacts/auditoria-2026-09-13-atual/`, com SHA256SUMS; essa pasta é ignorada pelo Git e precisa de retenção externa controlada antes de servir como evidência de release. A aprovação independente original não certifica as melhorias futuras.

**Auditoria atualizada do CVG-HIS V4 — 13/09/2026**

**Prontidão comprovada do programa: 63/100. Release: FAIL / BLOCKED. Triplo AAA: NOT PROVEN.**

O programa tem uma implementação extensa e funcional, com backend transacional, aplicação Vue, persistência PostgreSQL, workers e testes relevantes. As últimas rodadas corrigiram problemas reais de contrato, medição e integração. A coleta crítica chegou a cinco shards aprovados, com identidade conferida contra o worktree atual. Isso é progresso verificável.

Ainda não há sustentação para liberar o programa no escopo completo dos roadmaps. O verificador crítico continua reprovando 240 condições; o CI citado nos relatórios terminou com falha; SSO corporativo e sete áreas de paridade não têm fechamento. Esta auditoria encontrou também defeitos concretos de migração, reautorização de replay, promoção de evidência e operação financeira na interface. Eles não desaparecem com a aprovação dos testes existentes.

A nota é uma avaliação de **prontidão sustentada por evidências**, não percentual de código pronto, cobertura de testes, probabilidade de segurança ou certificação clínica. Os 9/10 e 9,5/10 atribuídos às rodadas anteriores julgam reparos locais; não são notas do ERP inteiro.

**1. Identidade, escopo e método**

Repositório inspecionado: `/home/ricardo/cvg-his-v4`. HEAD: `324099e5a54537ca1349f3310639c3a12afbae36`, branch `main`. Foram encontrados 56 caminhos rastreados modificados e 29 entradas não rastreadas no status Git. Algumas entradas representam diretórios; esses números não são uma contagem de funcionalidades.

O alvo desta auditoria é **HEAD + alterações locais**, não apenas o commit. A sentinela inicial contém 3.155 arquivos rastreados/não ignorados, com digest agregado `8672cb40231208fc203604caf4cde37c6d3c02e1328dbed0bd956db818ed3a6c`. O manifesto crítico está na revisão 9, com `sourceSetSha256=0a5883cbf634be991f3d35e45cc9081b66b2f7c1d8b699a255fd10461e74e707`.

Foram lidos os 17 documentos indicados e confrontados seus resultados, contratos e próximos passos com código, configurações, estado `.agent`, artefatos de execução, consultas públicas ao GitHub e verificações locais. As skills gauntlet-loop, orchestrate, engineering-framework, design-director e backend-patterns orientaram a auditoria. Modo: auditoria brownfield, somente leitura do programa; três frentes independentes de investigação, sem descendentes. Os relatórios e as evidências desta entrega ficam fora do repositório.

A régua de produto foi preservada: global ≥97, dimensões críticas ≥95, zero P0, gates obrigatórios aprovados, candidato íntegro e autoridades aplicáveis. A auditoria adotou critérios rejeitáveis: autorização antes de respostas protegidas; atomicidade e isolamento; migração de dados prévios; eventos e replay; contrato público; cobertura completa e identidade; CI obrigatório; experiência renderizada e ações corretas; prova operacional e rastreabilidade. Nenhum limiar foi reduzido.

Âncoras das notas: 0–19 ausente/inviável; 20–39 estrutura inicial com caminho essencial incompleto; 40–59 parcial, faltando integração ou prova determinante; 60–79 base consistente com lacunas relevantes; 80–94 evidência local forte; 95–100 atendimento integral comprovado no escopo. As notas de tarefas abaixo avaliam o contrato completo da tarefa, não somente seu último slice. Confiança alta refere-se à observação descrita; não significa cobertura exaustiva do sistema.

**2. Notas por dimensão — mesmo recorte de 18 itens da avaliação profunda**

| Item | Dimensão | Nota anterior | Nota atual /100 | Evidência e limite determinantes |
| --- | --- | ---: | ---: | --- |
| 1 | Arquitetura e modularidade | 70 | 70 | Monólito modular com fronteiras e budgets; API 8.309 linhas, worker 2.139, PatientDetail 4.075. Não houve decomposição ampla. |
| 2 | API e contratos OpenAPI | 80 | 85 | 430 paths/41 tags/525 schemas; AST fortalecido, dispatch auth e contratos SPA presentes. Validação estrutural não prova todos os payloads/handlers. |
| 3 | Autenticação, sessões e OIDC | 70 | 60 | Sessões e controles locais sólidos; SSO ofertado no plano ainda sem sessão ERP/JWKS/claims/jornada completa; deadline não é ponta a ponta. |
| 4 | Segurança e privacidade técnica | 65 | 65 | Tenant/ator vinculados e guards reais; replay sem reautorização em rota não mapeada, minimização de logs e edge pendentes. |
| 5 | Dados, RLS, persistência e auditoria | 65 | 60 | PostgreSQL crítico e RLS estático existentes; defeito de backfill 0170 comprovado; upgrade representativo e políticas no alvo não certificados. |
| 6 | Fluxos críticos e confiabilidade do worker | 65 | 72 | Shard de processo e outbox/inbox/lease duráveis; upgrade de eventos antigos e recovery operacional ainda abertos. |
| 7 | Completude funcional e integrações ERP | 45 | 50 | 4/11 áreas no verificador local; implementações presentes nas demais, mas providers/homologação e falhas financeiras impedem fechamento. |
| 8 | Testes e regressão local | 75 | 82 | Inventários ampliados, zero skip nos shards aprovados, contratos adversariais e testes SPA. Testes verdes não cobrem os novos contraexemplos. |
| 9 | Cobertura crítica e identidade de evidência | 40 | 58 | Cinco shards íntegros; 193 fontes sem evidência especializada, 18 instrumentações vazias, 29 métricas abaixo de 85; promoção tem lacuna. |
| 10 | CI e política de main verde | 60 | 55 | CI remoto terminou failure; checker crítico real não está no job obrigatório. Worktree local não é o artefato remoto. |
| 11 | Correção do gate e certificação | 35 | 75 | Intake e limites endurecidos; 53 testes focais passam. Produtores específicos/autoridade ainda não completam caminho de certificação real. |
| 12 | Dependências e cadeia de fornecimento | 60 | 80 | Audit atual sem ocorrências; pins, scan, quarentena e manifesto pós-gate implementados. Registry/attestation/ACL no alvo não provados. |
| 13 | Performance, capacidade e SLOs | 45 | 45 | Harness/perfis existem; CI k6 falhou; capacidade atual e metas operacionais aprovadas não demonstradas. |
| 14 | Backup, restore e continuidade | 40 | 40 | Runbooks/automação presentes; evidência corrente inspecionada NOT_PROVEN, sem recuperação representativa certificada. |
| 15 | Observabilidade e operação | 45 | 50 | Instrumentação e intake existem; alerta entregue, atendimento/on-call e cadeia completa no alvo não demonstrados. |
| 16 | UX, acessibilidade e prontidão visual | 60 | 76 | 12 renders/12 Axe limpos na amostra com API sintética; defeitos financeiros e estado de erro, sem UAT/integração real completa. |
| 17 | Governança e documentação | 55 | 60 | Docs validam; checker canônico retorna quatro falhas atuais; próximos passos de vários handoffs estão superados. |
| 18 | Deploy, Helm e rollback | 45 | 45 | Superfície e workflow implementados; rollout/rollback por digest e compatibilidade de dados no target não demonstrados. |

Média editorial: **1.128 / 18 = 62,67**, arredondada para **63/100**. A nota histórica de 60 usava estas mesmas dimensões; a comparação ajuda a localizar avanços, mas não constitui experimento controlado. Os 69/100 da auditoria inicial tinham 12 dimensões e outro candidato. Nenhuma média compensa uma condição obrigatória reprovada.

**3. Confronto dos 17 documentos solicitados**

| Documento em `docs/` | Alegação ou papel | Situação confrontada com o estado atual |
| --- | --- | --- |
| [2026-09-12-auditoria-repositorio-cvg-his-v4.md](2026-09-12-auditoria-repositorio-cvg-his-v4.md) | Baseline 69, contratos/CI/coverage deficientes | Histórico válido. OpenAPI e supply chain melhoraram; paridade, deadline e prova operacional continuam abertos. Não é a nota atual. |
| [2026-09-12-reauditoria-pos-melhorias.md](2026-09-12-reauditoria-pos-melhorias.md) | AST aceita `(false)`/`!true`; governança 50 falhas; paridade 4/11 | AST reparado; paridade permanece 4/11. Migração do controller reduziu problemas históricos, mas restam quatro falhas correntes. |
| [2026-09-12-avaliacao-profunda-release-triplo-aaa.md](2026-09-12-avaliacao-profunda-release-triplo-aaa.md) | DEEP-01 identidade stale; DEEP-02 intake ausente; DEEP-03 coverage; DEEP-04 AST | DEEP-01 e DEEP-04 têm reparos locais verificáveis; DEEP-02 tem intake reparado, não operação certificada. DEEP-03 permanece parcialmente aberto. |
| [2026-09-12-backlog-correcao-gaps-triplo-aaa.md](2026-09-12-backlog-correcao-gaps-triplo-aaa.md) | REM-001–030 e aceites | Continua útil como contrato. Vários REM agregam prova no alvo; implementar um helper não os encerra. Mapeamento atualizado na seção 7. |
| [2026-09-12-roadmap-erp-state-of-art-triplo-aaa.md](2026-09-12-roadmap-erp-state-of-art-triplo-aaa.md) | M0–M6 até recertificação | M0/M1/M2 avançaram parcialmente. M3–M6 não atingiram suas saídas; nenhum marco completo de release comprovado. |
| [2026-09-12-roadmap-backlog-multiagente-release-triplo-aaa.md](2026-09-12-roadmap-backlog-multiagente-release-triplo-aaa.md) | MA-01–35; prioridade F-NATIVE-R1 | Contratos preservam valor; o próximo passo antigo está superado por rev9/5 shards. Nova prioridade inclui defeitos desta auditoria, além de D5/coverage. |
| [2026-09-12-status-consolidado-execucao-multiagente.md](2026-09-12-status-consolidado-execucao-multiagente.md) | R3 integrado; S1 esperando inventário; MA33 descoberta | Fotografia de 12/09 superada: inventário e MA33 habilitador implementados; cinco shards disponíveis. Não executar seus despachos antigos automaticamente. |
| [2026-09-12-ma03-r2-parecer-independente.md](2026-09-12-ma03-r2-parecer-independente.md) | Duplicata e política sem limites aceitas | Contraexemplos históricos tratados pelo reparo R3; documento não deve ser apagado nem lido como defeito ainda presente nessa forma. |
| [2026-09-12-ma03-r3-parecer-independente.md](2026-09-12-ma03-r3-parecer-independente.md) | APPROVE do slice de suficiência | Comportamento endurecido permanece e testes atuais passam. Hashes de arquivos mudaram depois; parecer antigo não é aprovação automática do worktree inteiro. |
| [2026-09-12-auditoria-handoff-r3-s1-e-despacho.md](2026-09-12-auditoria-handoff-r3-s1-e-despacho.md) | R3 sem integração; nativos incompletos | Pendências de inventário e integração descritas foram superadas. Evidências atuais substituem esse despacho, sem reescrever sua história. |
| [2026-09-12-auditoria-native-ma04-s1.md](2026-09-12-auditoria-native-ma04-s1.md) | CLI aceita nativeTests ausente | Reparo fail-closed implementado/testado; inventário rev9 validado. Pendências antigas de dispatch/zero-hit não devem ser reabertas sem nova regressão. |
| [2026-09-12-ma04-status-e-proxima-tarefa.md](2026-09-12-ma04-status-e-proxima-tarefa.md) | Harness reparado; dispatch omitido dos inputs | Validador e teste presentes; dispatch incluído na descoberta atual. Não é preciso repetir R1. Limite de handler versus HTTP completo permanece. |
| [2026-09-12-ma05-preflight-e-slice-habilitador.md](2026-09-12-ma05-preflight-e-slice-habilitador.md) | Ambiente/inventários impedem coleta; D1–D7 | D1/D3/D4/D7 avançaram e há coleta efetiva. D5 e gate global de 82 continuam sem fechamento. D7 tem novo defeito no vínculo das referências. |
| [2026-09-12-ma08-decisao-e-despacho-proposto.md](2026-09-12-ma08-decisao-e-despacho-proposto.md) | D1: SSO ofertado; B1–B7 ainda propostos | Fonte atual continua sem SSO ERP completo. A decisão está relatada no documento; não foi localizado registro de autoridade correspondente no ledger canônico. C1–C6 não podem ser presumidos resolvidos. |
| [2026-09-13-execucao-round1-reparos-e-shards.md](2026-09-13-execucao-round1-reparos-e-shards.md) | AST/inventários/V8/CI de contratos; dois shards | Reparos locais presentes e contratos passam. “Ambiente ausente” e “três shards faltantes” são estados históricos, superados pelas rodadas posteriores. |
| [2026-09-13-execucao-round2-ambiente-cobertura-promocao.md](2026-09-13-execucao-round2-ambiente-cobertura-promocao.md) | Runtime isolado; 4 shards verdes, integração com seis falhas | Runtime privado existe; integração final está verde. Promoção existe, mas o seu verificador permite referência divergente dos bytes autenticados. |
| [2026-09-13-execucao-round3-correcoes-integracao-cobertura.md](2026-09-13-execucao-round3-correcoes-integracao-cobertura.md) | 5/5 verdes, 240 erros substantivos, zero vínculo | Confirmado pelos artefatos e recomputação atuais. “Gate funcional fechado” deve limitar-se às suítes coletadas; não cobre backfill legado, replay omitido ou defeitos de UI encontrados agora. |

Divergências editoriais adicionais: o relatório round3 cita 8.312 linhas de `server.ts`; o arquivo atual tem 8.309. O REPORT da tentativa final mistura cabeçalho de revisão 8, corpo rev9, nome de tentativa e datas anteriores. Os metadados e hashes sustentam a revisão 9; a narrativa deve ser reconciliada sem substituir os artefatos históricos.

**4. Achados por severidade, confiança e prova**

**A01 — Alta: migração 0170 deixa eventos legados sem envelope. Confirmado em PostgreSQL.**

[0170_outbox_event_envelope.sql](../packages/db/migrations/0170_outbox_event_envelope.sql:21) usa `WHERE NOT (jsonb_typeof(payload -> '_meta') = 'object' AND payload -> '_meta' ? 'eventId')`. Para payload sem `_meta`, a expressão resulta em SQL NULL e não seleciona a linha.

Em PostgreSQL 16.15 privado, a migração original foi aplicada a uma tabela mínima com duas linhas: uma sem `_meta`, outra com `_meta: {}`. Resultado: `UPDATE 1`; a primeira continuou sem envelope. O consumidor atual [event-bus.service.ts](../packages/modules/event-bus/src/event-bus.service.ts:749) exige envelope antes de chamar handlers. O impacto de retry/falha/DLQ deriva desse caminho inspecionado; não foi executado o consumer completo com as duas linhas.

A correção de fixtures do round3 é válida para eventos novos, mas não prova upgrade dos existentes. Recomenda-se migração corretiva forward-only, respeitando checksums, e testes com payload ausente, vazio, null e parcialmente formado. Prova: [SQL](../artifacts/auditoria-2026-09-13-atual/evidencias/backend-migration-repro.sql), [resultado](../artifacts/auditoria-2026-09-13-atual/evidencias/backend-migration-repro.log). Critérios: dados/upgrade/eventos; REM-007/009, MA-12/13/24 e D5. Não foi demonstrada perda de dados de produção.

**A02 — Alta: replay de rota não mapeada pode devolver resposta protegida sem reautorizar. Prova composicional com ledger PostgreSQL.**

`POST /inventory/purchases` exige `inventory.manage` em [inventory-routes.ts](../apps/api/src/routes/inventory-routes.ts:107), mas não consta no mapa [idempotency-authorization.ts](../apps/api/src/helpers/idempotency-authorization.ts:65). O [server](../apps/api/src/server.ts:8053) passa `beforeIdempotency: undefined` nesse caso; a unidade transacional devolve `response_body` concluído antes de executar o dispatcher que contém a guarda de permissão.

Reprodução com helpers atuais e ledger real: primeiro comando autorizado retorna 201; após revogação simulada na guarda da rota, mesmo ator/chave/payload recebe novamente 201 e o comando permanece chamado uma única vez. Não há nova mutação, cruzamento de tenant ou sessão revogada demonstrados. A revogação foi simulada no callback; o encadeamento do servidor foi inspecionado, não exercitado por HTTP completo.

Recomenda-se completar a autorização antes de todo replay protegido, com teste HTTP de revogação persistida. Prova: [reprodução](../artifacts/auditoria-2026-09-13-atual/evidencias/backend-replay-repro.ts), [log](../artifacts/auditoria-2026-09-13-atual/evidencias/backend-replay-repro.log), [análise das guardas externas](../artifacts/auditoria-2026-09-13-atual/evidencias/backend-notes.md). Critérios: autorização/idempotência; MA-12/14/21. Confiança alta no comportamento dos helpers; limite HTTP explicitado.

**A03 — Alta: listagem financeira limita resultados e mistura totais de escopos diferentes. Confirmado no navegador com API sintética.**

[BillingListPage.vue](../apps/spa/src/pages/billing/BillingListPage.vue:182) consulta sempre `page:1/pageSize:20` e não oferece paginação. Datas de vencimento filtram somente as linhas retornadas. O total original soma essas linhas, enquanto contagem e outros acumuladores vêm da resposta completa.

Cenário sintético de 21 títulos de R$100: 20 linhas acessíveis, contagem 21 e “Total R$2.000”, sem próxima página; conjunto total R$2.100. Trata-se de truncamento/ambiguidade observável, não de erro de ledger demonstrado. Aceite: navegar além da primeira página, aplicar filtros na população correta e explicitar/reconciliar o escopo dos KPIs.

**A04 — Alta: filtro “Cancelada” não funciona. Confirmado por interação e requisição.**

A opção existe em [BillingListPage.vue](../apps/spa/src/pages/billing/BillingListPage.vue:46), mas em `:184` só `open`/`settled` são enviados; `cancelled` vira vazio. A interação repetiu a URL sem status e manteve títulos “A Receber”. É necessário implementar o estado no contrato aplicável ou retirar a opção com decisão explícita de produto; não simular filtragem concluída.

**A05 — Alta para clareza financeira: saldo pendente desaparece do cartão. Confirmado no render.**

[BillingListPage.vue](../apps/spa/src/pages/billing/BillingListPage.vue:17) usa a propriedade `error` para representar saldo positivo. O componente DsStatCard substitui a informação pelo erro; R$2.100 fica oculto e aparece somente “Saldo pendente”. Saldo em aberto é estado financeiro esperado. Aceite: manter valor visível e usar indicador de estado separado.

Provas A03–A05: [resultados adversariais](../artifacts/auditoria-2026-09-13-atual/evidencias/frontend-adversarial-results.json), [captura financeira](../artifacts/auditoria-2026-09-13-atual/evidencias/frontend-adversarial-_billing-1440.png), [análise frontend](../artifacts/auditoria-2026-09-13-atual/evidencias/frontend-audit.md). MA-18/26, REM-021/011. A API foi interceptada; não foi alterado dado financeiro real.

**A06 — Alta para confiabilidade da evidência: promoção valida bytes diferentes dos referenciados. Reproduzido independentemente e reconferido pelo Lead.**

[promote-critical-shard.mjs](../scripts/promote-critical-shard.mjs:75) confere o hash de `candidate/coverage-final.json` e `candidate/test-result.json`, mas em `:94` só exige que as referências `coverageFile/testResultFile` existam dentro de `shardRoot`. Uma fixture mantém arquivos fixos válidos e aponta as referências para arquivos irmãos contendo `CORRUPTED`: `verifyCandidate` retorna `errors: []`.

O checker posterior rejeitaria esses destinos; **não foi demonstrado bypass do checker nem adulteração dos cinco shards existentes**. O defeito invalida a promessa de promoção integralmente verificada. Aceite: provar que referências consumidas e bytes autenticados são os mesmos, e que a promoção rejeita destinos divergentes. [Probe](../artifacts/auditoria-2026-09-13-atual/evidencias/release-promotion-probe.mjs), [resultado](../artifacts/auditoria-2026-09-13-atual/evidencias/promotion-lead-recheck.json). MA-05/D7.

**A07 — Bloqueador obrigatório: coverage crítica continua incompleta e não é executada como gate real no CI.**

O checker atual reprova corretamente 240 condições. A [.github/workflows/ci.yml](../.github/workflows/ci.yml:329) testa o checker, enquanto o job Coverage executa o percentual convencional em `:782`. Não foi encontrada execução do checker real crítico no workflow. O denominador convencional exclui fronteiras relevantes e não inclui worker/SPA. Acrescentar testes do verificador não equivale a verificar o candidato. A seção 5 contém as medições.

**A08 — Bloqueador de completude: SSO previsto ainda é integração parcial.**

O callback [auth-routes.ts](../apps/api/src/routes/auth-routes.ts:1226) troca código e retorna tokens/UserInfo, podendo retornar UserInfo null. Não estabelece nessa jornada uma sessão ERP com identidade JWKS/claims verificada e vínculo usuário/tenant/RBAC; falta jornada SPA correspondente. Timeout OIDC é por chamada, sem orçamento único/cancelamento propagado por toda a operação. O logout verifica configuração, mas não a mesma flag de habilitação. A proposta MA-08 registra SSO no próximo release; portanto não pode ser encerrada como simples requisito opcional sem nova decisão. Não foi demonstrado bypass de login.

**A09 — Média: estado canônico e documentos discordam sobre a próxima ação. Confirmado pelo checker.**

Estado/log/backlog apontam `MA05-D5-AND-COVERAGE`; o marcador e primeiro Concrete Step do [ExecPlan](../.agent/plans/repository-state-of-art-remediation-execplan.md:3) ainda apontam `FRESH-REVIEW-MA02-F-NATIVE-R1`. O backlog usa `next_action.kind=BUILD`, inválido para o schema atual. Checker: 10 PASS e 4 FAIL. `docs:validate` verde não valida essa consistência semântica. [Saída canônica](../artifacts/auditoria-2026-09-13-atual/evidencias/governance-current.log). MA-01/34.

**A10 — Média: estado vazio de tutores pode ser exibido após indisponibilidade.**

GET 503 em OwnersListPage produz alerta de falha e simultaneamente “Nenhum tutor encontrado / Cadastre o primeiro tutor”. Isso confunde ausência de dados com falha de consulta. Aceite: estado de erro com retry que não sugira cadastro por desconhecer os dados. [Captura](../artifacts/auditoria-2026-09-13-atual/evidencias/frontend-adversarial-_owners-1440.png).

**A11 — Média: ação avulsa não implementada e evidência visual parcialmente fabricada.**

“Gerar Conta Avulsa” está permanentemente disabled em BillingListPage `:22`; é limite funcional visível, sem demonstração de promessa comercial específica. Separadamente, [visual-regression.spec.ts](../e2e/spa/visual/visual-regression.spec.ts:1381) usa `innerHTML` para fabricar estados vazios e remove linhas em `:1354`. Esses snapshots podem ajudar layout, mas não provam que o componente produz o estado ou que a ação funciona. Os renders desta auditoria usaram componentes reais com respostas interceptadas.

**A12 — Pendências conhecidas: logs de autenticação, edge, operação e autoridades.**

Minimização de identificadores de brute force, política de acesso a metrics/health detalhado, SLO/RPO/RTO aprovados, restore, soak, alertas atendidos, providers e UAT continuam sem fechamento comprovado. Código de controle e documentos existem; não houve prova de exposição pública, vazamento de produção ou incidente operacional. Ausência de evidência foi classificada como não comprovada, não como exploração.

**5. Cobertura: o que os cinco shards realmente provam**

Manifesto rev9: **541 fontes**, sendo 348 com métrica JavaScript e 193 pendentes de evidência especializada; 2.143 inputs; 343 suítes Vitest, 73 nativas de API, 12 nativas de worker e 11 de processo. Os cinco metadados, hashes de fontes/inputs e digests consumidos pelo checker conferem com o estado atual. Isso é revalidação dos artefatos existentes, não nova execução integral dos cinco shards nesta auditoria.

| Shard | RunId existente revalidado | Resultado |
| --- | --- | --- |
| vitest-unit | `bdf8094e-3fc8-47de-baad-6ad35ca49434` | passed; 240 arquivos; log histórico registra 2.694 testes |
| vitest-integration | `a5f4d64a-50b4-4cb2-8ede-9c4204e7c3b8` | passed; 103 arquivos; log histórico registra 916 testes |
| native-worker | `e073d5cf-2361-4a35-9fa8-398c0402050b` | passed; candidato promovido |
| native-api | `857d84ec-c476-49bd-b555-e157cc6c9f3a` | passed; candidato promovido |
| critical-process | `51d81f9d-f3df-4212-bc7a-c83ad177eec3` | passed; candidato promovido |

Resultado recomputado: **FAIL — 240 erros: 193 fontes especializadas + 18 instrumentações vazias + 29 métricas abaixo de 85. Zero erro de vínculo reportado.** As 193 incluem 168 SQL e 25 Vue. As 18 são classificadas nos relatórios como type-only; o checker observa instrumentação vazia que exige revisão, não autoriza remoção automática. D5 trata medição/prova, não significa que essas 193 fontes estejam ausentes do programa.

| Componente | Linhas % | Statements % | Funções % | Branches % | Gate 85 em todas |
| --- | ---: | ---: | ---: | ---: | --- |
| auth | 90,98 | 91,56 | 70,53 | 84,25 | FAIL |
| roles-rls | 80,78 | 82,58 | 62,09 | 71,38 | FAIL |
| billing-cash | 86,68 | 87,44 | 78,88 | 81,49 | FAIL |
| inpatient | 86,09 | 86,73 | 84,64 | 79,84 | FAIL |
| records | 83,08 | 84,13 | 73,75 | 78,49 | FAIL |
| prescriptions | 83,15 | 83,55 | 70,27 | 79,97 | FAIL |
| pix | 90,01 | 88,87 | 73,60 | 84,59 | FAIL |
| webhooks | 80,36 | 80,80 | 62,93 | 76,53 | FAIL |
| http-routes | 86,40 | 86,27 | 86,35 | 79,07 | FAIL |
| repositories | 72,63 | 71,38 | 59,98 | 65,58 | FAIL |

Não há componente com todas as quatro métricas aprovadas. Os percentuais são coverage medida; não são as notas editoriais. O gate global de 82 tem outro denominador: a medição histórica 78,32/71,64/79,86/79,90 continua histórica e não foi recalculada aqui. Nenhuma soma de percentuais dos shards foi usada. [Saída completa do checker](../artifacts/auditoria-2026-09-13-atual/evidencias/release-coverage-current.json).

**6. Interface, produto e paridade**

Foram renderizados login, tutores, contas a receber, agenda, prontuários e motor de relatórios, em Chromium, larguras 375 e 1440: 12 cenários. A amostra apresentou zero violações Axe, nenhum overflow horizontal do documento e skip link como primeiro foco nas dez páginas privadas. A identidade visual é coerente; no motor de relatórios, o empilhamento de muitos cartões vazios aumenta rolagem e reduz densidade útil.

Essa evidência fecha parcialmente a ausência de render atual dos relatórios anteriores. APIs e autenticação foram inteiramente sintéticas; não fecha integração navegador→API→PostgreSQL. Não houve matriz completa 768, dark, zoom, leitor de tela, todos os estados, outros navegadores ou UAT. Não se atribui selo WCAG/AAA pela ausência de violações automatizadas na amostra.

Subnotas da frente frontend: caminhos/ações 75; estados 75; a11y/mobile 85; consistência visual da amostra 80; jornadas/paridade 65. Média 76, confiança média. São recortes da dimensão 16, não notas adicionais somadas à nota global.

O verificador Vetus atual retorna **4/11 áreas** e `Functional parity: NOT VERIFIED`. `Evidence coverage:100/100` mede existência das camadas listadas em arquivos; não executa nem certifica seus cenários. Mesmo as quatro áreas “verified” abaixo precisam de prova atual no candidato final.

| Área | Nota /100 | Estado do checker | Evidência/limite atualizado |
| --- | ---: | --- | --- |
| Atendimento, agenda, comanda e internação | 75 | verified | Implementação e testes/jornadas existentes; certificação operacional/aceite clínico não foi refeita. |
| Clientes, animais e auxiliares | 75 | verified | CRUD e páginas presentes; erro/vazio de tutores requer reparo. |
| Estoque, compras e movimentações | 65 | verified | Domínio presente; novo achado de reautorização de replay afeta compras. |
| Profissionais, folgas e comissões | 75 | verified | Camadas de prova presentes; não homologado novamente em operação real. |
| Laboratório | 55 | blocked | Fluxo local estruturado; provider/equipamentos Live Lab e homologação abertos. |
| Fiscal | 45 | blocked | Adapter e persistência; sandbox municipal/certificado/XML/PDF/rejeição não certificados. |
| Financeiro | 45 | blocked | PIX mock, captura/repasse de cartão não habilitados no contrato; estorno/conciliação e defeitos de contas a receber. |
| Marketing | 55 | blocked | Sandbox determinístico; provider externo/bounce/entrega real não homologados. |
| Relatórios | 60 | blocked | Fontes/exportações/worker existem; equivalência de todas as famílias Vetus e entrega externa não demonstradas. |
| Acesso, auditoria e LGPD | 50 | blocked | Controles locais e testes; retenção/destinos/aceites operacionais/DPO sem fechamento. |
| Integrações e migração Vetus | 60 | blocked | Importador e consumidores locais; operação Vetus alvo, Live Pet/Live Lab e observabilidade distribuída não certificados. |

As notas por área são julgamentos locais de prontidão, não percentuais de funcionalidades. A dimensão 7 recebe **50/100** pelo fechamento transversal insuficiente (4/11), não pela média dessas notas; não se chamam os sete grupos de “não implementados”. [Saída do verificador](../artifacts/auditoria-2026-09-13-atual/evidencias/parity.log).

**7. Estado dos 35 pacotes, com notas e vínculo aos 30 REM**

Notas são julgamento do contrato completo à luz desta auditoria; não percentual de tarefas executadas. “Local confirmado” não equivale a DONE operacional ou aceitação humana. Essa tabela é um parecer de auditoria, não alteração do backlog canônico.

| MA | REM de origem | Nota /100 | Situação atual e prova que falta |
| --- | --- | ---: | --- |
| 01 — controle | 001/002 | 60 | Migração/histórico existentes; quatro falhas atuais de controle e handoffs superados. |
| 02 — identidade | 006 | 92 | Rev9, inventários nativos/Vitest e inputs conferidos; sem nova certificação de coverage por isso. |
| 03 — intake/gate | 012/028 | 85 | R3 endurecido/testado; produtores operacionais e suficiência autorizada continuam pendentes. |
| 04 — OpenAPI/dispatch | 003 | 92 | AST/fixtures/dispatch/inventário locais presentes; aceite limitado ao contrato inspecionado. |
| 05 — cobertura | 006 | 58 | 5/5 artefatos íntegros; 240 falhas, D5/D6 e defeito D7 abertos. |
| 06 — dependências | 013 | 85 | Audit zero; tooling atualizado; AC05 global 82 não encerrado. |
| 07 — CI integrado | 006/012 | 50 | Contratos adicionados; falta checker real, execução terminal verde do worktree final. |
| 08 — SSO/deadline | 003/005 | 30 | Exchange/config parcial; B1–B7 e decisões associadas sem fechamento. |
| 09 — logs | 015 | 35 | Logging existe; minimização/retenção e teste de não exposição incompletos. |
| 10 — edge | 014 | 40 | Health/metrics/infra presentes; política negativa pelo ingresso real não provada. |
| 11 — ambiente | 007/010 | 88 | Runtime privado possibilitou shards e reproduções; não representa target operacional completo. |
| 12 — dados/RLS/auditoria | 007 | 65 | Prova local e UoW fortes; A01/A02 e upgrade representativo impedem aceite completo. |
| 13 — worker | 007/009/018 | 75 | Lease/inbox/processos implementados; backfill e recuperação operacional completa abertos. |
| 14 — jornadas/permissões | 007 | 65 | Testes de domínio/integração; replay omitido, SSO e aceite humano não completos. |
| 15 — matriz de paridade | 008 | 60 | Matriz existe; 4/11 no checker, cenário atual/aceite por área incompletos. |
| 16 — laboratório | 019 | 55 | Caminho local; homologação equipamentos/provider pendente. |
| 17 — fiscal | 020 | 45 | Adapter/contratos locais; ciclo fiscal real autorizado não provado. |
| 18 — financeiro | 021 | 45 | Persistência e fluxos locais; providers/estorno/conciliação e A03–A05 abertos. |
| 19 — marketing | 022 | 55 | Sandbox e consentimento presentes; entrega/bounce/provider real não provados. |
| 20 — relatórios | 023 | 60 | Workbench/exportação/agendamento; equivalência completa e entrega operacional pendentes. |
| 21 — acesso/LGPD | 024 | 50 | RBAC/DSR/auditoria locais; replay, retenção/destinos e aceite DPO pendentes. |
| 22 — migração/integrações | 025 | 60 | Importador/jornadas locais; homologação Vetus, conectores e recovery transversal incompletos. |
| 23 — performance/soak | 009/029 | 45 | Scripts/perfis; k6 remoto falhou, metas/target/soak não certificados. |
| 24 — restore/game day | 009 | 40 | Automação presente; recuperação representativa/tempo/consistência sem prova atual. |
| 25 — traces/alertas | 028/009 | 50 | Instrumentação/intake; alerta entregue e atendido/trace completo não comprovados. |
| 26 — UX/a11y/UAT | 011 | 74 | Amostra renderizada satisfatória com defeitos; falta matriz completa, integração real e UAT. |
| 27 — supply chain | 004/010 | 75 | Scan/quarentena/promoção em workflow; registry, attestation e isolamento reais pendentes. |
| 28 — deploy/rollback | 010 | 45 | Config/automação; target/digest/rollback e compatibilidade não demonstrados. |
| 29 — checks/autoridade | 010/012 | 30 | Política e consulta de CI existem; branch rules autenticadas/autoridade final não verificadas. |
| 30 — decompor API | 016 | 35 | Pequena redução de duplicação; server permanece 8.309 linhas, sem decomposição ampla. |
| 31 — decompor SPA | 017 | 45 | Shell/router/componentes presentes; routes e PatientDetail continuam hotspots. |
| 32 — decompor worker | 018 | 40 | Políticas e auxiliares existentes; runner permanece 2.139 linhas. |
| 33 — higiene de testes | 026/027 | 82 | Inventário/higiene crítica melhorados; ruído jsdom e força de cenários ainda pendentes. |
| 34 — freshness | 030 | 50 | Hashes e histórico presentes; drift dos próximos passos e retenção externa não resolvidos. |
| 35 — recertificar | 012 | 20 | Agregador existe e bloqueia; sem candidato limpo/CI verde/provas completas/autoridade. |

REM-001 passa na validação documental estreita, mas precisa manter a distinção entre snapshot e fatos atuais. REM-002 não está encerrado porque o checker canônico falha. REM-003/004 têm implementação local substancial; REM-006/007 são parciais. REM-012 não foi alcançado. Os outros REM estão cobertos nas linhas correspondentes, sem encerramento implícito por dependência ou nota.

**8. Verificações executadas e evidências ausentes**

| Procedimento executado | Resultado observado | Limite / evidência |
| --- | --- | --- |
| `pnpm typecheck` e `pnpm lint` | PASS, exit 0 em ambos | Repetidos em cópia exclusiva; 3.155 inputs sem drift ao final. [Registro](../artifacts/auditoria-2026-09-13-atual/evidencias/exclusive-checks.json). |
| `pnpm --filter @cvg-his-v2/spa test` | PASS, 213 arquivos / 1.876 testes | Suíte SPA real; persistem avisos jsdom de navegação/scrollTo. [Log](../artifacts/auditoria-2026-09-13-atual/evidencias/spa-tests-valid.log). |
| Vitest focal: auth dispatch, OpenAPI runtime, contrato SPA/API, complexity | PASS, 4 arquivos / 47 testes | Config derivada atual com include restrito e hooks DB desativados; não é HTTP/DB E2E completo. [Config](../artifacts/auditoria-2026-09-13-atual/evidencias/audit-focused.config.mjs), [log](../artifacts/auditoria-2026-09-13-atual/evidencias/http-contracts-valid.log). |
| 12 arquivos Node de inventário, V8, shards, promoção e pacote visual/gate | PASS, 134 testes, zero skips | Contratos/harnesses; não provas de produto inteiro. Lista/comando em [checks-extra.json](../artifacts/auditoria-2026-09-13-atual/evidencias/checks-extra.json), [log](../artifacts/auditoria-2026-09-13-atual/evidencias/contracts.log). |
| Crítico release: checker/promoção e gate focal | PASS, 46 Node + 53 Vitest | Há sobreposição com lote anterior; não somar como testes únicos. Config sem DB. [Log Node](../artifacts/auditoria-2026-09-13-atual/evidencias/release-unit.log), [gate](../artifacts/auditoria-2026-09-13-atual/evidencias/release-gate-tests.log). |
| Backend: locks/context e dispatch/tenant/migrations focais | PASS, 10 Node + 18 Vitest | Mocks onde declarado; sobreposição parcial com outras suites. Não substitui probes PG. [Comandos](../artifacts/auditoria-2026-09-13-atual/evidencias/backend-notes.md). |
| Migração 0170 em PG privado | Invariante FAIL reproduzida; SQL exit 0 | Comando executou corretamente a migração defeituosa: somente uma de duas linhas atualizada. |
| Replay de helpers com ledger PG privado | Invariante FAIL reproduzida; probe exit 0 | Resposta reaparece sem segunda autorização; revogação simulada, não HTTP completo. |
| `refresh-critical-source-manifest.mjs --check` | PASS, revisão 9 | Identidade/inventário; não certifica coverage. [Log](../artifacts/auditoria-2026-09-13-atual/evidencias/identity.log). |
| `check-critical-coverage.mjs` | FAIL, exit 1, 240 erros | Recomputação atual sobre os cinco shards existentes. |
| Probe da promoção | Caso inválido aceito: `errors:[]` | Confirma defeito A06; checker posterior não foi contornado. |
| OpenAPI / namespaces / migrations / deploy surface / supply chain / dependencies / complexity | PASS estrutural | Fontes/configuração e contratos, não target. [Log](../artifacts/auditoria-2026-09-13-atual/evidencias/structural.log). |
| RLS estático | PASS, 170/171 tabelas; 1 exceção documentada | Não executa matriz completa das políticas instaladas. |
| `pnpm audit --json` | PASS, zero info/low/moderate/high/critical | Resultado do grafo consultado nesta janela; não é pentest nem scan de imagem. [Log](../artifacts/auditoria-2026-09-13-atual/evidencias/audit.log). |
| `pnpm docs:validate` | PASS | Estrutura/snapshot; não verdade semântica de todas as narrativas. |
| Checker canônico de engenharia | FAIL, 10 PASS / 4 FAIL | Executado corretamente com argumento posicional; tentativa inicial com `--root` foi erro de invocação, não falha do programa. |
| `pnpm vetus:parity` e `pnpm readiness:enterprise` | FAIL, exit 1 | Paridade 4/11; documentação/camadas existentes não fecham homologação. |
| Chromium + Axe | 12 renders / 12 scans sem violações; 2 cenários adversariais adicionais | API/auth sintéticas; confirma UI atual e seus defeitos, sem certificar integração real. |
| Agregador Triple-A em diagnóstico isolado | BLOCKED / NOT PROVEN, exit 1 | Checks/build/testes desativados nessa execução, sem aprovação ou score de produto inferido. |

Uma tentativa de verificação em `/tmp/cvg-audit-20260913/worktree` recebeu 18 mudanças de arquivos correspondentes a outro workspace. A autoria desse processo não foi determinada. O teste focal configurado nessa cópia acabou descobrindo uma suíte ampla indevida e foi encerrado; suas falhas **não foram atribuídas ao programa**. Typecheck, lint, contratos focais e SPA foram repetidos em diretório exclusivo aleatório, com fontes conferidas antes/depois e zero drift. Os resultados finais da tabela são os dessa repetição quando aplicável. Os checks estruturais e Node anteriores têm logs próprios; achados PG/browser/promoção foram produzidos em diretórios separados. Isso limita a primeira cópia, não os contraexemplos independentes.


O CI remoto [34711492641](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34711492641), citado nos documentos, foi consultado em 13/09. Está `completed/failure`, atualizado em 12/09 às 19:02:42Z. Falharam Repository Guards, Integration Tests, E2E Tests (SPA) e Performance (k6 SLOs); os demais 12 jobs consultados terminaram success. Essa consulta atualiza o estado antes descrito como “em andamento”; não demonstra que todas essas falhas permaneçam no worktree corrigido. As alterações locais não commitadas não foram executadas por aquele run. [Registro consultado](../artifacts/auditoria-2026-09-13-atual/evidencias/remote-ci.json), [jobs](../artifacts/auditoria-2026-09-13-atual/evidencias/remote-jobs.json).

Não executados como certificação integral nesta auditoria: cinco shards novamente do início, coverage global 82, build completo de release/container, banco/HTTP inteiro, upgrade de schema e dataset representativo, RLS completo com roles instaladas, E2E oficial sem mocks, k6/soak atuais, restore/game day, Helm no cluster, deploy/rollback, registry/attestation real, branch rules autenticadas, providers ou UAT. Resultados dessas fronteiras permanecem históricos, parciais ou não comprovados conforme indicado; não foram transformados em PASS.

O gate foi executado apenas em diagnóstico com saídas isoladas e checks/build/testes deliberadamente desativados. Retornou BLOCKED/NOT PROVEN e `publication_allowed=false`. Seu score de execução incompleta não é a nota deste relatório. O contrato de validação local passou nos testes; a certificação operacional não foi obtida.

**9. Ordem recomendada de correção e provas de encerramento**

1. Corrigir **A01** com migração forward-only e reproduzir sobre estados legados; fechar **A02** com autorização antes do replay e teste HTTP de revogação persistida. São riscos de dados/autorização que justificam precedência sobre refatoração estética.
2. Corrigir **A03–A05** em contas a receber: paginação, escopo dos totais, filtro de status e visibilidade de saldo. Reexecutar as mesmas fixtures de 21 títulos e depois jornada persistida real. Resolver erro/vazio e explicitar o destino da ação avulsa.
3. Fechar **A06/D7**, implementar evidência especializada D5 e tratar instrumentações vazias por contrato. A01 demonstra por que migrations precisam de dados anteriores, não apenas aplicação em banco vazio.
4. Elevar as 29 métricas aos 85 exigidos, preservar o gate global 82 e ligar o checker crítico real ao CI obrigatório. Gerar novos artefatos após mudanças, sem reaproveitar hashes antigos.
5. Reconciliar `.agent`/ExecPlan/handoffs e registrar a decisão SSO com procedência. Completar MA-08 segundo o contrato ofertado; tratar logs e edge.
6. Fechar as sete áreas de paridade com seus responsáveis; executar matriz UX real e UAT. Aprovar perfil/metas operacionais e produzir carga, recuperação, alertas, supply chain e rollout/rollback no alvo autorizado.
7. Congelar candidato limpo e somente então executar MA-35 com CI terminal verde, evidências do mesmo candidato/alvo, crítico final novo e autoridade humana. Refatorações de API/SPA/worker devem preservar testes de caracterização; não exigem reescrita total.

Não há base para prometer data de release sem capacidade da equipe, decisões SSO, providers e janelas de homologação. A próxima ação técnica de maior risco é o reparo de backfill legado acompanhado de teste de upgrade; o controle operacional deve apontar uma ação coerente antes de delegá-la.

**10. Independência, integridade e conclusão**

As frentes backend, frontend e release usaram contexto novo, sem descendentes. Backend/frontend leram documentos históricos para comparação: são investigações independentes do Lead, mas suas notas não constituem comparação cega. A frente release recebeu critérios e artefato, sem pareceres ou scores anteriores: I1, mesmo modelo/família, não autoridade externa. A inspeção visual do Lead foi adicional à do frontend; não foi um benchmark A/B com dois juízes cegos nem certificação visual formal.

Crítico final `/root/final_audit_critic`, contexto sem histórico, I1, somente leitura: **APPROVE da suficiência deste relatório**, confiança alta nos achados e contagens conferidos; nenhuma correção material exigida. Conferiu matriz de 17 documentos, 18 dimensões, 35 MA/30 REM, matemática, evidências dos achados e logs finais. Aprovação restrita à auditoria, não ao produto. [Parecer](../artifacts/auditoria-2026-09-13-atual/evidencias/final-critic.md).

A [sentinela final](../artifacts/auditoria-2026-09-13-atual/evidencias/mutation-sentinel-final.json), registrada em 13/09/2026 às 13:01:28 UTC, confirma 3.155 arquivos antes/depois, sem adição, remoção ou alteração de conteúdo. Digest final igual ao inicial: `8672cb40231208fc203604caf4cde37c6d3c02e1328dbed0bd956db818ed3a6c`.

O relatório não alterou código, testes, thresholds, documentos do projeto, backlog ou infraestrutura compartilhada; não houve commit, push, deploy, envio a pessoas ou uso de dados clínicos reais. PostgreSQL e servidor visual próprios foram encerrados. A sentinela cobre conteúdo de arquivos rastreados/não ignorados, não todos os caches/artefatos ignorados nem prova de ausência de qualquer escrita transitória. Os artefatos críticos consumidos tiveram validação de hashes pelo checker.

**Parecer de produto: FAIL para o release integral pretendido; Triplo AAA não comprovado. A auditoria entrega um diagnóstico atualizado com avanços locais confirmados, defeitos reproduzidos e obrigações abertas — sem confundir conclusão da auditoria com conclusão da remediação.**
