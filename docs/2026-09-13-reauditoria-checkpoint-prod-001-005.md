---
document_status: supporting
document_kind: audit
effective_date: 2026-09-13
owner: Engenharia CVG-HIS
review_cycle: on-remediation-or-candidate-change
candidate_sha: 324099e5a54537ca1349f3310639c3a12afbae36
verdict: FAIL
---

# Reauditoria — checkpoint PROD-001 a PROD-005

**Parecer: FAIL / NO-GO. O checkpoint contém melhorias reais, mas não sustenta “5 de 47 entregas integralmente concluídas e verificadas” no candidato atual.** PROD-004 e PROD-005 precisam ser reabertos; controle, retenção e harness têm condições de aceite ainda pendentes. Os 42 cartões PROD-006–047 continuam no escopo, além do saneamento dos cinco primeiros.

A nota **63/100 pertence à avaliação global anterior**. Esta reauditoria verifica o delta do checkpoint, seus contratos e regressões relevantes; não recalcula as 18 dimensões nem atribui uma nova nota global. Concluir tickets não é percentual de prontidão. Triplo AAA permanece **NOT PROVEN**, com régua inalterada de total ≥97, críticas ≥95, zero P0 e todos os gates obrigatórios.

[Baseline e auditoria anterior](2026-09-13-relatorio-estado-atual-erp-cvg-his-v4.md) · [Plano atualizado](2026-09-13-plano-executivo-prontidao-producao.md) · [Roadmap atualizado](2026-09-13-roadmap-prontidao-producao.md) · [Backlog atualizado](2026-09-13-backlog-prontidao-producao.md)

## Escopo, identidade e método

Inspeção do worktree real, dos contratos PROD, código e testes de migração/replay, controles `.agent`, manifestos, cinco pacotes históricos, estado financeiro da SPA e CI pública. Autorização: auditoria e atualização documental; nenhuma correção de produto, migração no repositório ou alteração de produção foi executada nesta reauditoria. Probes e testes ocorreram em cópias temporárias e recursos privados. O estado operacional não foi reescrito para esconder as divergências encontradas.

HEAD `324099e5a54537ca1349f3310639c3a12afbae36` **mais alterações locais**. A sentinela inicial registra 3.184 arquivos rastreados/não ignorados; HEAD sozinho não identifica o candidato auditado. Manifesto rev12: 542 fontes críticas, 2.143 inputs de execução, `sourceSetSha256=0b636b86ba08d431bfc522563f13f43aa0c240ec51a47e4cfc0505947a1551ed`; digest do manifesto `8953597d8a64a8414823911d0a36ceb8fe7c15cfb8dc28bf8e08751beba95b62`.

Dois críticos frescos, com `fork_turns=none`, examinaram fronteiras distintas: `checkpoint_backend_critic` e `checkpoint_evidence_critic`. Independência I1, mesma família de modelo, sem contexto herdado e sem descendentes. O Lead confrontou os resultados com fontes, executou novamente os checkers e produziu provas financeiras em cópia isolada. Não equivalem a autoridade humana clínica, operacional ou de release.

Pacote desta auditoria: [índice e reprodução](../artifacts/auditoria-checkpoint-prod-001-005-2026-09-13/README.md). Inclui logs, scripts de probe, snapshots, hashes e limites. A pasta artifacts é ignorada pelo Git: sua retenção durável continua uma obrigação de PROD-002, sem alegação de cópia externa já realizada.

## Decisão por entrega

| Cartão | Comprovado no recorte | Situação após auditoria e condição faltante |
| --- | --- | --- |
| PROD-001 | Checker executado agora: 11/11 PASS, schemas e ponteiros formalmente coerentes | **PARCIAL / requer reconciliação**: ação textual do log é PROD-006, mas ação canônica e primeiro passo continuam cobertura; narrativa rev9/240 não descreve rev12/246. |
| PROD-002 | Pacotes históricos íntegros; manifesto rev12 passa; cópia/restauração local demonstrada no histórico | **PARCIAL / retenção externa pendente**: não há prova de armazenamento durável controlado; cinco shards estão stale por bytes divergentes. |
| PROD-003 | Logs históricos de PG, Redis, SPA e API privada; receita e quatro hashes de harness conferidos | **PARCIAL / smoke limitado**: falta fechar execução reproduzível da stack com artefato reconstruído e vinculado, portas alocadas e repetição integrada. |
| PROD-004 | 0171 corrige o caso de `_meta` ausente; 0170 preservada | **REABRIR**: dois casos de envelope parcial continuam inválidos; consumo real dos dados migrados não demonstrado. |
| PROD-005 | Hooks transacionais e prova HTTP histórica de compra/replay após revogação são progresso válido | **REABRIR**: guard de relatórios rejeita formato real do payload; prova atual de cobertura stale e regressão de relatórios não coberta. |

Esses status são conclusões desta auditoria, não transições silenciosas no ledger operacional. A próxima execução deve registrar a reconciliação append-only e conservar os PASS históricos com seus escopos e hashes. Não repetir reparos já comprovados; completar os critérios faltantes.

## Achados priorizados

### CP-01 — Envelope parcial passa pela migração e falha no consumidor

**Severidade alta; reparo P0; confiança alta.** A condição em [0171](../packages/db/migrations/0171_outbox_event_envelope_backfill_correction.sql:46) considera válido qualquer `_meta` objeto contendo a chave `eventId`, mesmo `null` ou sem actor e demais campos. O contrato de PROD-004 exige tratar envelope parcial.

Prova nova em PostgreSQL 16 privado: aplicar as migrations exatas 0170 e 0171, repetir 0171 e passar as seis fixtures ao parser real compilado. Quatro parseiam; `{_meta:{eventId:"partial-id"}}` e `{_meta:{eventId:null}}` permanecem inválidas com `Event actor must be an object`. A segunda execução atualiza zero linhas, sem reparar as duas inválidas. Ver [probe e saídas](../artifacts/auditoria-checkpoint-prod-001-005-2026-09-13/backend-probe/probe.log).

O “parcial” da prova histórica não tinha eventId. Os dez testes históricos de consumer usam envelopes válidos recém-inseridos; não demonstram consumo das fixtures efetivamente migradas. A prova nova é SQL + parser real, **não execução integral do worker**.

**Aceite de reparo:** definir validade completa segundo o consumidor, corrigir legados parciais sem corromper identidade/metadados válidos, preservar migrations aplicadas e executar as fixtures migradas no worker real com efeitos/IDs/duplicatas conferidos. Usar correção forward-only conforme a situação de aplicação; não editar checksums históricos para silenciar o problema.

### CP-02 — Guard de relatório interpreta payload no nível errado

**Severidade alta; reparo P0 pela regressão em autorização; confiança alta.** [readTenantCommandPayload](../apps/api/src/server.ts:3683) produz `{path, query, body}`. O [wiring](../apps/api/src/server.ts:8042) passa esse objeto ao resolver, que procura `reportId`/`executionId` na raiz. [beforeIdempotency](../apps/api/src/server.ts:8086) executa esse guard também antes da primeira mutação.

Prova composicional nova com o guard real e resolver extraído do servidor: controle com body plano passa pelas duas permissões; o wrapper real contendo um reportId válido retorna **403 REPLAY_AUTHORIZATION_UNMAPPED**. Isso demonstra o erro de composição; **não foi executado HTTP de relatórios nesta auditoria**. Código de exportação/agendamento também exige resolver IDs de rota conforme a operação.

Os testes atuais fornecem body plano e resolver stubado; o HTTP histórico cobre compras. Nenhum deles rejeita essa regressão. [Saída da prova](../artifacts/auditoria-checkpoint-prod-001-005-2026-09-13/backend-probe/probe.log).

**Aceite de reparo:** resolver body/path com contrato explícito por operação; exercitar execute/export/schedule por HTTP/PG real, primeira execução e replay, autorização válida, revogação persistida, tenant/ator/payload divergentes. Preservar fail-closed sem bloquear requisições legitimamente autorizadas.

### CP-03 — Cinco shards perderam identidade apesar de manifest --check PASS

**Severidade alta; reparo P0; confiança alta.** O [checker crítico executado agora](../artifacts/auditoria-checkpoint-prod-001-005-2026-09-13/critical-check.log) retorna **246 erros**:

| Classe | Quantidade |
| --- | ---: |
| Fontes especializadas sem evidência aceita | 194 = 169 SQL + 25 Vue |
| Métricas de componente insuficientes | 29 |
| Instrumentações vazias | 18 |
| Hash de input divergente | 5, uma por shard |

O helper `apps/api/src/helpers/idempotency-authorization.ts` tem SHA atual `d4de1f4a492f9c3f5f4b31ee31c27b377b6301d935674ef2297092900c4ec9e4`; os cinco shards registram `ef9eff121a5d8771ab119ba4be35eb114d5b25ea6241d53fe74ddd5da6215405`. Portanto, “241 substantivos, zero vínculo” é observação histórica, não resultado atual.

O helper pode estar fora da curadoria de fontes que recebem métricas, mas **está nos 2.143 executionInputs**. A conclusão histórica de que estaria fora da identidade confunde esses conjuntos. `--check` valida identidade/estrutura do manifesto e existência do inventário, não substitui a comparação dos bytes capturados nos shards.

**Aceite de reparo:** classificar a alteração, preservar candidatos antigos como STALE e recolher/promover todos os shards afetados após os reparos de produto. Não editar hashes em evidência antiga. Conferir o checker real e apenas então declarar vínculo atual; 241 erros substantivos ainda seriam FAIL. Expandir curadoria de helpers/UoW/migrations conforme risco em PROD-011/047, separadamente do reparo de freshness.

### CP-04 — Controle passa estruturalmente, mas não aponta para o trabalho real

**Severidade média; prioridade P0 de retomada; confiança alta.** [State](../.agent/state.json), [backlog operacional](../.agent/backlog.json:95) e [primeiro passo](../.agent/plans/repository-state-of-art-remediation-execplan.md:198) ainda apontam `MA05-D5-AND-COVERAGE`. O último evento declara PROD-006 como próxima frente. Há cinco macroitens no backlog operacional, não 47 cartões PROD com estados individualizados.

O checker atual registra **46 eventos, 38 verificações, revisão 48 e zero autoridades**, em vez de 44/37 do resumo recebido. O PASS 11/11 confirma o contrato estrutural verificado, sem validar atualidade semântica. Não se atribui a divergência a um autor sem evidência.

**Aceite de reparo:** registrar um recovery append-only e uma única próxima ação com significado coerente em estado, plano, backlog e log; representar os 47 cartões dentro do modelo canônico suportado, com vínculos/evidências por cartão e sem duplicar controle. Atualizar resumo rev12/246 e obrigações reabertas; teste de retomada por outro agente deve selecionar o mesmo passo.

### CP-05 — Retenção e harness ainda têm condições abertas

**Severidade alta para retenção e média para harness; confiança alta nas lacunas documentadas.** Os SHA256SUMS históricos foram recomputados: PROD-001 13/13, 002 14/14, 003 21/21, 004 25/25, 005 18/18; pacote da auditoria anterior 65/65 entradas listadas. Isso comprova integridade dos arquivos listados, não suficiência, autoria ou atualidade em relação ao produto.

PROD-002 copiou pacote local ignorado para `/tmp`, validou e removeu a cópia. A cópia externa controlada permanece explicitamente pendente na verificação histórica. É necessário demonstrar recuperação a partir do destino durável aprovado, sem apagar a única cópia válida.

O smoke da API em PROD-003 usa porta fixa 38923 e `dist` precompilado sem vinculação suficiente aos bytes de origem. Há provas úteis de componentes isolados, mas não de repetição integrada da stack com builds ligados à identidade. O próprio checkpoint registrou incidente em que dist antigo mascarou o fix de autorização. Uma resposta 200 de SPA/health não demonstra essa ligação.

**Aceite de reparo:** destino/retention/owner aprovados e restore verificável; harness parametrizável com portas/recursos exclusivos, build de fonte congelada, hashes dos outputs, duas execuções da stack integrada e teardown limitado aos PIDs/recursos da tentativa. Credenciais e recursos compartilhados dependem de autoridade; trabalho independente prossegue.

### CP-06 — Financeiro continua com defeitos reproduzíveis

**Severidade alta; prioridade P0 nos cartões 006–008; confiança alta.** A página mantém page 1/pageSize 20, vencimento filtrado apenas sobre a página carregada, status Cancelada convertido em vazio, saldo positivo no estado de erro e ação avulsa desabilitada.

Executamos os **quatro testes existentes**, aprovados. Na cópia exclusiva, dois probes adicionais montaram o componente Vue real com serviço simulado: 21 títulos declarados/20 linhas acessíveis/total da página R$ 2.000 em vez de R$ 2.100 do conjunto; card de saldo mostra apenas “Saldo pendente”; Cancelada e vencimento não chegam à consulta do serviço; botão avulso permanece desabilitado. A execução combinada passa **6/6 porque os dois probes afirmam a presença do defeito**, não porque o produto está correto. [Log](../artifacts/auditoria-checkpoint-prod-001-005-2026-09-13/financial-adversarial.log) e [fonte do probe](../artifacts/auditoria-checkpoint-prod-001-005-2026-09-13/BillingListPage.audit.test.ts).

Limite: DOM de componente em jsdom e serviço simulado, não navegador/HTTP/PG integrado nem certificação visual/UAT. O reparo deve ter regressão no contrato API/DB, UI, filtros e agregados globais, com mais de uma página, limites de data e permissões.

## Gates e verificações desta reauditoria

| Verificação | Resultado e alcance |
| --- | --- |
| Checker canônico | Executado pelo Lead e crítico: PASS 11/11, com limites semânticos CP-04 |
| Manifesto --check | Executado: PASS rev12; não substitui CP-03 |
| Checker crítico real | Executado: FAIL 246; os cinco shards não são prova atual de cobertura |
| Integridade histórica | Recomputada pelo crítico; contagens acima; não é aceite funcional |
| Migration + parser | Executados em PG privado: 4/6 válidos, 2 defeitos confirmados; teardown registrado |
| Guard de relatórios | Executado composicionalmente: controle passa, wrapper real 403 |
| Financeiro componente | 4 testes existentes + 2 observações adversariais; falhas funcionais confirmadas |
| Documentação | Validada antes e após publicação por pnpm docs:validate |
| CI remota | Consulta nova à API pública GitHub: CI 34711492641 completed/failure; Release Artifacts 34712992687 skipped |

A [CI remota](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/34711492641) executou no HEAD em 12/09/2026 e continua falha; não contém o diff local. A consulta foi feita por API HTTP, pois `gh` não está instalado; resposta preservada no pacote. Não houve novo disparo de CI, push ou deploy.

Não foram reexecutados nesta auditoria: cinco shards completos, todas as suítes do monorepo, worker integral sobre fixtures migradas, HTTP de relatórios, navegador integrado, cobertura global, providers, UAT, soak/restore no alvo e autoridade de release. A evidência histórica de compras é reconhecida com sua identidade e limites; não foi tratada como certificação da nova composição inteira.

## Próximas etapas e encerramento

**Próxima ação única: PROD-001-R1 — reconciliar a retomada com os achados desta auditoria.** Na sequência, preparar PROD-003-R1; reparar PROD-004-R1 e PROD-005-R1 com provas de regressão; resolver freshness em PROD-002-R1 após estabilizar os bytes. Retenção externa pode avançar como frente de Operações sem impedir reparos locais. Financeiro 006–009 pode avançar em escopo isolado após harness comprovado. Detalhes, dependências e gates estão no backlog atualizado.

Os 47 IDs e toda a rastreabilidade MA/REM são preservados. Sufixos R1 são pacotes de reparo dentro dos cartões originais, não novos itens contabilizados. O restante do roadmap mantém identidade/SSO, 11 áreas integradas, SQL/Vue, cobertura 82/85, CI, segurança, performance/restore, cadeia de confiança, UAT e liberação 97/95/0. Nenhum gate foi dispensado.

A conclusão de produto é **FAIL / NO-GO**. As correções de ausência de `_meta` e replay de compras são avanços úteis; as provas disponíveis não autorizam encerrar seus contratos completos nem avançar diretamente como se os cinco primeiros cartões estivessem aceitos sem ressalvas.

## Revisão independente e preservação do trabalho

O crítico final `checkpoint_final_audit_critic`, distinto dos dois investigadores e iniciado com `fork_turns=none` (I1), emitiu **APPROVE para a suficiência desta auditoria/documentação**, mantendo o produto FAIL/NO-GO. Conferiu fontes e saídas, distinções de escopo, os 47 contratos originais preservados e a sequência de retomada. Não reexecutou suítes de runtime. Seu parecer não equivale a aprovação de release.

Os 47 arquivos capturados pela sentinela do crítico final ficaram inalterados durante sua revisão. A comparação do Lead com os 3.184 arquivos iniciais confirmou zero alteração fora de documentação, incluindo código e `.agent`. O crítico de backend preservou os oito arquivos de sua sentinela; o crítico de evidências não capturou sentinela própria, limitação suprida parcialmente pela comparação global do Lead. Arquivos ignorados de cache/dependências não integram essa sentinela global. Os probes usaram cópias e recursos privados; a publicação acrescentou apenas documentos e o pacote de evidências.

`pnpm docs:validate` passou após a publicação; 94 links locais dos cinco documentos principais foram conferidos, os 47 cartões/35 MA/30 REM permaneceram rastreados e o grafo original não tem ciclos. O checker crítico foi repetido após a atualização documental e continuou **FAIL 246**. Pareceres, sentinelas, logs e SHA256SUMS estão no pacote vinculado acima.
