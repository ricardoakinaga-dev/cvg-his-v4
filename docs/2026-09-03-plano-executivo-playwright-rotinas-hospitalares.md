# Plano executivo de estabilização das rotinas hospitalares Playwright

Data-base: 3 de setembro de 2026
Status: execução técnica e três rodadas concluídas; GH4 bloqueado por aceites humanos formais
Horizonte proposto: 6 semanas após o kickoff
Fonte: [Relatório de testes das rotinas hospitalares](./2026-09-03-relatorio-testes-playwright-rotinas-hospitalares.md)
Execução: [Roadmap](./2026-09-03-roadmap-playwright-rotinas-hospitalares.md)
Controle: [Backlog priorizado](./2026-09-03-backlog-priorizado-playwright-rotinas-hospitalares.md)

> Este plano é complementar à baseline executiva vigente definida em `docs/document-governance.json`. Ele governa a estabilização do recorte hospitalar testado e não substitui o plano global do produto.

Os IDs abreviados omitem o prefixo comum `HOSP-`; por exemplo, `ENV-001` referencia `HOSP-ENV-001` no backlog.

## 1. Decisão executiva proposta

Autorizar um programa de estabilização de seis semanas para transformar a evidência local positiva das cinco rotinas hospitalares em uma certificação reproduzível, persistente e apta a suportar uma decisão de release.

Até a conclusão dos gates deste plano, recomenda-se:

- manter desenvolvimento, demonstração e homologação controlada das rotinas;
- não declarar o sistema integralmente aprovado para produção;
- não usar a execução em memória como prova de persistência, RLS ou recuperação;
- não aceitar snapshots novos sem revisão visual;
- não converter falhas persistentes em `skip` para liberar o pipeline.

## 2. Baseline comprovada

| Indicador                              |   Baseline de 03/09/2026 |
| -------------------------------------- | -----------------------: |
| Casos Playwright únicos inventariados  |                      404 |
| Corpos de teste efetivamente tentados  |                      404 |
| Casos únicos aprovados                 |                      374 |
| Casos únicos falhos após forçar banco  |                       30 |
| Jornadas hospitalares por função       |            5/5 aprovadas |
| Casos únicos dependentes de PostgreSQL |           0/10 aprovados |
| Navegações master sem achados          |                  207/286 |
| Navegações master com achados          |                   79/286 |
| Registros com erro HTTP inesperado     |                       74 |
| Snapshots visuais                      | 14 aprovados / 14 falhos |
| Alvos interativos menores que 24×24 px |                       13 |
| Overflows globais                      |                        1 |
| Testes unitários                       |    1.607/1.607 aprovados |
| Flaky na bateria padrão                |                        0 |

A aprovação das cinco jornadas demonstra que recepção, clínica médica, patologia, ultrassonografia e administração possuem um caminho funcional no runtime local. Ela não prova, isoladamente, durabilidade após reinício, isolamento RLS real, comportamento em falha de banco nem portabilidade entre navegadores.

### Estado da execução em 03/09/2026

As etapas E0–E4 e os gates técnicos GH0–GH3 foram executados antecipadamente no ambiente PostgreSQL 16.15 isolado. As três baterias de certificação atingiram, cada uma, 404/404 casos, 10/10 casos dependentes de PostgreSQL, 5/5 personas, 286/286 navegações, zero erro HTTP inesperado, zero alvo pequeno, zero overflow e 28/28 snapshots. Firefox e WebKit aprovaram a matriz crítica com 18/18 casos em cada engine.

O SHA candidato `844596fc55d9e189a2e7be19ecac7b170a6acced` e as três rodadas integrais de E5 estão registrados no [dossiê de certificação](./2026-09-03-dossie-certificacao-playwright-rotinas-hospitalares.md). A parte automatizada de E5 foi concluída; GH4 e go-live permanecem bloqueados até existirem revisão formal dos snapshots e UAT assinado pelas cinco funções. Nenhuma aprovação humana é inferida da evidência automatizada.

## 3. Objetivo e metas

O objetivo é certificar o mesmo SHA com banco real, cobertura hospitalar completa e evidência repetível.

Metas obrigatórias:

1. executar e aprovar **404/404 casos únicos**, sem `skip` ambiental;
2. aprovar os **10/10 casos dependentes de PostgreSQL**;
3. manter as **5/5 jornadas hospitalares** verdes em banco real e após reinício;
4. obter **286/286 navegações master sem achados bloqueantes**;
5. eliminar as **74 ocorrências HTTP inesperadas**;
6. revisar e aprovar legitimamente **28/28 snapshots**;
7. eliminar os 13 alvos pequenos e o overflow de 57 px;
8. repetir a bateria completa três vezes no mesmo SHA, com zero flaky;
9. preservar builds e ampliar a suíte unitária sem perda de cobertura; a execução final aprovou 2.362/2.362 testes e os quatro limiares de 82%.

## 4. Frentes de trabalho

| Frente                              | Prioridade | Resultado esperado                                                            |
| ----------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| Ambiente PostgreSQL reproduzível    | P0         | banco saudável, migrations e seed idempotentes; API sem fallback para memória |
| Agenda e faturamento                | P0         | dois fluxos legados alinhados ao contrato atual e verdes                      |
| Relatórios e exports persistentes   | P0         | fontes canônicas disponíveis, downloads limitados e auditáveis                |
| RBAC, RLS e assinatura técnica      | P0         | matriz de papéis e tenants aprovada em banco real                             |
| Catálogos e hubs administrativos    | P0         | zero `4xx/5xx` inesperado nas 37 superfícies afetadas                         |
| Acessibilidade e responsividade     | P1         | alvos mínimos, teclado, nomes acessíveis e overflow corrigidos                |
| Regressão visual                    | P1         | 14 diferenças decididas e 28 snapshots aprovados                              |
| Resiliência das jornadas por função | P1         | cinco personas aprovadas após restart e retry seguro                          |
| Portabilidade e certificação        | P2         | Chromium, Firefox e WebKit; três rodadas verdes no SHA candidato              |

## 5. Sequência executiva

### Etapa E0 — tornar a prova reproduzível

Provisionar PostgreSQL de teste, automatizar migrations/seed/reset, bloquear fallback silencioso e publicar artefatos por SHA.

**Gate de saída:** os 10 testes persistentes iniciam contra PostgreSQL saudável; zero caso é ignorado por ambiente.

### Etapa E1 — corrigir as falhas funcionais críticas

Resolver o contrato acessível do modo da agenda e o fluxo de recebimento que não atualiza o saldo para `R$ 0,00`. Validar estado no backend, atualização da SPA e reabertura da tela.

**Gate de saída:** os dois testes legados passam sem remover as asserções de negócio; 5/5 jornadas por função continuam verdes.

### Etapa E2 — fechar persistência, relatórios e HTTP

Corrigir fontes de vendas canceladas, agenda, estoque, NFS-e, cadastros e hubs administrativos. Padronizar estados vazio, indisponível e retry, sem spinner infinito.

**Gate de saída:** 10/10 testes de banco verdes, exports concluídos dentro do timeout e zero resposta HTTP inesperada nas 286 navegações.

### Etapa E3 — concluir experiência e acessibilidade

Corrigir 13 alvos pequenos, overflow de 57 px e as 14 diferenças visuais. Toda mudança de baseline deve possuir aprovação explícita de Produto/UX.

**Gate de saída:** 286/286 navegações conformes e 28/28 snapshots aprovados.

### Etapa E4 — endurecer as cinco jornadas

Executar as personas em banco real, reiniciar API entre gravação e leitura, validar retry/idempotência e ampliar a matriz de navegador.

**Gate de saída:** recepção, clínico, patologista, ultrassonografista e administrador passam em Chromium; os fluxos críticos definidos passam também em Firefox e WebKit.

### Etapa E5 — certificar o release candidate

Congelar o SHA, executar três rodadas completas, realizar UAT por função e emitir parecer go/no-go com riscos residuais.

**Gate de saída:** 3 × 404/404, zero skip, zero flaky, 3 × 286/286 e aceite multidisciplinar vinculado ao SHA.

**Estado em 03/09/2026:** freeze e critérios automáticos concluídos no SHA candidato; UAT e aceites formais permanecem bloqueados por dependerem de pessoas reais.

## 6. Gates de promoção

| Gate                           | Bloqueia                       | Critério mínimo                                          |
| ------------------------------ | ------------------------------ | -------------------------------------------------------- |
| GH0 — Ambiente                 | qualquer rebaseline            | PostgreSQL saudável, reset seguro e relatório por SHA    |
| GH1 — Jornada crítica          | merge das correções funcionais | agenda, faturamento e 5 personas verdes                  |
| GH2 — Persistência e segurança | release candidate              | 10/10 PostgreSQL, RLS/RBAC e relatórios verdes           |
| GH3 — Experiência              | UAT final                      | 286/286, 28/28 visual, zero alvo pequeno e zero overflow |
| GH4 — Certificação             | go-live                        | três rodadas integrais verdes e aceite formal            |

Nenhum gate é aprovado com teste ignorado, retry ocultando defeito, baseline visual atualizada sem revisão ou evidência produzida em SHA diferente.

### Estado dos gates em 03/09/2026

| Gate | Estado       | Evidência / bloqueio                                                                     |
| ---- | ------------ | ---------------------------------------------------------------------------------------- |
| GH0  | PASS         | PostgreSQL 16.15 isolado, reset protegido, fail-fast e artefatos por SHA                 |
| GH1  | PASS         | agenda, faturamento e cinco personas verdes                                              |
| GH2  | PASS         | 10/10 PostgreSQL, RBAC/RLS, assinatura e relatórios verdes                               |
| GH3  | PASS técnico | 3 × 286/286, 3 × 28/28, zero alvo pequeno e zero overflow; aceite visual formal pendente |
| GH4  | BLOCKED      | 3 × 404/404 concluído; faltam aprovação Produto/UX e UAT nominal das cinco funções       |

## 7. Organização recomendada

| Disciplina       | Responsabilidade principal                                                 |
| ---------------- | -------------------------------------------------------------------------- |
| Backend/Banco    | PostgreSQL, migrations, RLS, fontes persistentes, relatórios e atomicidade |
| Frontend/UX      | agenda, atualização de saldo, estados de erro, acessibilidade e visual     |
| QA               | critérios, automação, traces, classificação de falhas e certificação       |
| DevOps/SRE       | ambiente reproduzível, CI, artefatos, retenção e observabilidade           |
| Segurança        | revisão de RBAC/RLS, assinatura técnica e testes negativos                 |
| Produto/Operação | decisão visual e UAT das cinco funções hospitalares                        |
| Patrocinador     | prioridade, capacidade e decisão go/no-go                                  |

Capacidade mínima sugerida durante as quatro primeiras semanas: uma pessoa de Backend/Banco, uma de Frontend/UX, uma de QA automation e participação compartilhada de DevOps e Produto. Responsáveis nominais e revisores devem ser definidos antes do início.

## 8. Indicadores semanais

| Indicador              |       Baseline | Meta final |
| ---------------------- | -------------: | ---------: |
| Playwright único       |        374/404 |    404/404 |
| PostgreSQL             |           0/10 |      10/10 |
| Personas em banco real | não comprovado |        5/5 |
| Navegações sem achado  |        207/286 |    286/286 |
| HTTP inesperado        |             74 |          0 |
| Visual                 |          14/28 |      28/28 |
| Alvos pequenos         |             13 |          0 |
| Overflow global        |              1 |          0 |
| Flaky                  |              0 |          0 |

O painel semanal deve exibir resultado por SHA, ambiente, navegador, causa e owner. Percentual agregado sem lista de falhas não constitui evidência.

## 9. Riscos e respostas

| Risco                                         | Efeito                                           | Resposta                                                      |
| --------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| PostgreSQL local/CI continua indisponível     | bloqueia 10 testes e mascara fontes persistentes | owner DevOps, healthcheck bloqueante e runbook de recuperação |
| atualização indiscriminada dos snapshots      | esconde regressão de interface                   | revisão lado a lado e aceite Produto/UX por snapshot          |
| corrigir teste em vez do contrato             | falso verde em agenda/faturamento                | validar regra com API, SPA e reabertura do estado             |
| ampliação de permissão para fazer RBAC passar | quebra de isolamento                             | manter testes negativos e revisão de Segurança                |
| escopo de catálogos cresce sem decomposição   | atraso do caminho crítico                        | dividir por endpoint/família e limitar WIP                    |
| sucesso somente em Chromium                   | risco em ambiente do cliente                     | matriz mínima Firefox/WebKit antes da certificação            |
| evidência de SHA não reproduzível             | decisão de release inválida                      | freeze e três rodadas no mesmo commit                         |

## 10. Decisão recomendada

Manter o candidato tecnicamente certificado em homologação controlada e preservar o SHA e seus artefatos. A decisão vigente é `NO-GO por aceite pendente`: Produto/UX deve aprovar nominalmente os baselines e as cinco funções hospitalares devem executar e assinar o UAT. Somente então GH4 poderá ser promovido e o go-live deliberado, sem exceção implícita para teste persistente, segurança tenant, jornada financeira ou divergência de SHA.
