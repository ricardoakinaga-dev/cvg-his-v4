# Plano executivo de melhorias do CVG-HIS V4

**Baseline:** [reauditoria de 2026-09-02](./2026-09-02-relatorio-reauditoria-cvg-his-v4.md) — **84/100**

**Execução:** [roadmap](./2026-09-02-roadmap-melhorias-cvg-his-v4.md)

**Controle de trabalho:** [backlog priorizado](./2026-09-02-backlog-priorizado-cvg-his-v4.md)

## 1. Objetivo executivo

Elevar o CVG-HIS V4 de candidato à homologação para plataforma comprovadamente pronta para produção, sem confundir volume de implementação com evidência operacional.

Metas do programa:

- elevar a nota global de **84 para pelo menos 92/100** na próxima reauditoria;
- elevar prontidão para produção de **68 para pelo menos 90/100**;
- eliminar todos os P0 e manter build, typecheck, lint, segurança, cobertura e suíte crítica verdes;
- avançar de **4/11 para 9/11** domínios Vetus antes do release candidate e para **11/11**, ou exceção formal aprovada, antes do go-live;
- produzir evidência de CI remoto, restauração, carga, observabilidade, rollback e cutover no ambiente-alvo.

## 2. Resultado esperado

Ao final, qualquer decisão de promoção deverá responder objetivamente:

1. O mesmo commit passou em todos os gates?
2. API e worker usam roles mínimas e aprovadas pelo inspetor em modo estrito?
3. Uma instalação vazia pode ser migrada, testada, restaurada e atualizada sem ação manual oculta?
4. Os fluxos críticos funcionam após restart, concorrência, falha parcial e retry?
5. Os provedores externos foram homologados inclusive em rejeição, cancelamento e indisponibilidade?
6. Negócio, operação, segurança e engenharia aprovaram a mesma evidência?

Qualquer resposta negativa bloqueia a promoção correspondente.

## 3. Frentes de trabalho

| Frente | Prioridade | Objetivo | Saída mensurável |
|---|---|---|---|
| Segurança das roles PostgreSQL | P0 | unificar reconciliador, permissões e inspetor | API/worker retornam `safe=true` com modo estrito ligado |
| Harness e regressões PostgreSQL | P0 | tornar o critical gate portável e confiável | zero erro/falha/skip injustificado em 20 execuções consecutivas |
| Cobertura baseada em risco | P0 | recuperar o gate sem maquiar exclusões | todas as métricas ≥82%; módulos críticos ≥85% |
| CI e governança de `main` | P0 | garantir que só commits comprovados cheguem à branch única | checks obrigatórios, revisão e artefatos vinculados ao SHA |
| Release e infraestrutura | P1 | provar build, deploy, rollback, backup e restore | instalação limpa e ensaio de cutover aprovados |
| Performance e observabilidade | P1 | validar SLOs e diagnóstico distribuído | relatório de carga, alertas e trace de ponta a ponta |
| Paridade ERP interna | P1 | fechar relatórios e financeiro persistido | jornadas E2E sem mock e reconciliação auditável |
| Homologação de provedores | P1 | validar laboratório, fiscal, pagamentos e comunicação | sandboxes aprovados e matriz de falhas executada |
| LGPD e operação | P1 | comprovar procedimentos, não apenas código | retenção, exportação, anonimização e auditoria aceitas |
| Governança documental/versão | P2 | remover fontes de verdade concorrentes | índice canônico, histórico rotulado e identidade de release definida |

## 4. Sequência executiva

### Etapa A — estabilizar a fundação

Corrigir o contrato das roles, o executor de testes em caminhos com espaço, os dois erros de harness e as quatro regressões PostgreSQL. Cobrir os trechos alterados e ligar o guard estrito em todos os ambientes de promoção.

**Gate de saída:** suíte crítica e cobertura verdes; `safe=true`; nenhuma redução de threshold ou exclusão usada para obter o resultado.

### Etapa B — criar um release candidate reproduzível

Executar a matriz completa na CI remota a partir de um checkout limpo, proteger `main`, renderizar Helm com a ferramenta real, publicar artefatos imutáveis e ensaiar backup/restore, upgrade e rollback.

**Gate de saída:** um único SHA percorre CI, artefato, deploy e rollback; restore atende aos RPO/RTO aprovados.

### Etapa C — fechar paridade interna e limites operacionais

Finalizar relatórios Vetus, limites inclusivos de data, cadastros financeiros persistidos, conciliação e entregas agendadas. Executar carga representativa e configurar alertas acionáveis.

**Gate de saída:** pelo menos 9/11 domínios verificados, metas de desempenho aprovadas e zero regressão dos quatro domínios já verdes.

### Etapa D — homologar integrações e preparar go-live

Executar cenários reais de laboratório, NFS-e, cartões/PIX, mensagens, Live Pet/Live Lab e migração Vetus. Incluir sucesso, rejeição, timeout, duplicidade, cancelamento, retry e reconciliação.

**Gate de saída:** 11/11 domínios verificados ou exceção formal com prazo, responsável, compensação e aceite executivo.

### Etapa E — certificação e corte

Congelar escopo, rodar regressão no SHA candidato, simular cutover e rollback, realizar revisão de segurança e obter os aceites de negócio/operação.

**Gate de saída:** pacote de evidências assinado, monitoramento ativo e decisão go/no-go registrada.

## 5. Gates obrigatórios de promoção

| Gate | Obrigatório para | Critério mínimo |
|---|---|---|
| G0 — Engenharia | qualquer merge em `main` | build, types, lint, unitários e segurança verdes |
| G1 — Banco e segurança | release candidate | migração vazia/upgrade, critical gate, RLS e runtime roles verdes |
| G2 — Operação | staging | deploy/rollback, backup/restore, Helm real e observabilidade comprovados |
| G3 — Produto | produção limitada | 9/11 domínios verificados e exceções restantes aprovadas |
| G4 — Go-live | produção plena | 11/11, carga/SLO, cutover, DR e aceite multidisciplinar |

Nenhum gate pode ser aprovado com teste ignorado sem justificativa registrada. Readiness documental não compensa falha funcional.

## 6. Indicadores de acompanhamento

| Indicador | Baseline | Meta de release candidate | Meta de go-live |
|---|---:|---:|---:|
| Nota global | 84 | ≥92 | ≥95 |
| Prontidão para produção | 68 | ≥90 | ≥95 |
| Paridade Vetus | 4/11 | ≥9/11 | 11/11 ou exceção formal |
| P0 abertos | 3 grupos | 0 | 0 |
| Cobertura global | 79,98% statements/lines | ≥82% em todas as métricas | ≥85% nos módulos críticos |
| Critical gate | falha/bloqueado | 20 execuções verdes | verde no SHA de produção |
| Runtime roles | `safe=false` | `safe=true` | monitorado e fail-closed |
| Vulnerabilidades críticas/altas | 0 | 0 | 0 |
| Restore/cutover | sem prova alvo | ensaio aprovado | prova final aprovada |
| Performance | sem baseline representativa | SLO e capacidade definidos | SLO cumprido com margem acordada |

## 7. Governança e responsabilidades

| Papel | Responsabilidade de decisão |
|---|---|
| Liderança técnica | arquitetura, contrato de roles, qualidade e aprovação do SHA |
| Backend/Banco | migrações, RLS, transações, relatórios e integrações server-side |
| Frontend | jornadas, acessibilidade e evidência E2E da SPA |
| QA | matriz crítica, critérios de aceite, regressão e rastreabilidade |
| DevOps/SRE | CI, artefatos, Helm, deploy, restore, carga e observabilidade |
| Segurança/DPO | roles mínimas, segredos, auditoria e controles LGPD |
| Produto/Operação | paridade Vetus, regras de negócio e aceite de homologação |
| Patrocinador executivo | prioridade, orçamento, exceções e decisão go/no-go |

Cada item do backlog deve ter um responsável nominal antes de entrar em execução. Quem implementa não deve ser o único aprovador de um gate crítico.

## 8. Regras de execução

- Não reduzir thresholds, excluir arquivos ou transformar falhas em skips para liberar o pipeline.
- Não usar mocks como evidência final de provedor.
- Não editar migrations aplicadas; correções de banco entram em nova migration canônica.
- Manter apenas `main` como branch permanente; trabalho temporário usa PR curto e é removido após merge.
- Vincular toda evidência ao commit, ambiente, data, comando e resultado.
- Rotular documentos superados como históricos; o índice em `docs/README.md` define a baseline corrente.
- Recalcular notas apenas com prova executada, nunca por estimativa de conclusão.

## 9. Principais riscos executivos

| Risco | Efeito | Mitigação |
|---|---|---|
| capacidade insuficiente para homologação externa | atraso imprevisível | reservar janelas e responsáveis dos provedores desde a Etapa A |
| correção apressada das roles amplia privilégios | quebra do isolamento tenant | testes negativos de capability e revisão de segurança independente |
| suíte verde apenas em uma máquina | falsa confiança | checkout limpo, caminhos com espaço, CI remota e repetição determinística |
| 1.486 documentos geram decisões contraditórias | operação usa regra antiga | índice canônico, status explícito e arquivamento lógico |
| expansão de escopo durante estabilização | P0 permanece aberto | freeze funcional até G1, salvo correção crítica |
| dependência de uma única pessoa | risco de continuidade | donos primário/secundário, runbooks e revisão cruzada |

## 10. Decisão recomendada

Autorizar imediatamente as Etapas A e B. Manter a aplicação disponível para desenvolvimento e demonstração controlada. Não autorizar dados reais sensíveis, operação financeira/fiscal real nem promoção crítica antes da conclusão de G0–G2. O go-live só deve ser pautado após a evidência de G3 e G4.
