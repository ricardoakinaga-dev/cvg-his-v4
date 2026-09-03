# Backlog priorizado das rotinas hospitalares Playwright

Data-base: 3 de setembro de 2026
Status: execução técnica concluída; 32/37 tickets `DONE` e cinco dependências humanas `BLOCKED`
Fonte: [Relatório de testes](./2026-09-03-relatorio-testes-playwright-rotinas-hospitalares.md)
Direção: [Plano executivo](./2026-09-03-plano-executivo-playwright-rotinas-hospitalares.md)
Sequenciamento: [Roadmap](./2026-09-03-roadmap-playwright-rotinas-hospitalares.md)

> Este backlog é complementar ao backlog global vigente. Seus IDs `HOSP-*` tratam exclusivamente os achados e a certificação do recorte hospitalar de 03/09/2026.

## 1. Convenções

- **P0:** bloqueia baseline confiável, jornada crítica, segurança tenant ou release candidate.
- **P1:** obrigatório para concluir a certificação hospitalar.
- **P2:** amplia portabilidade, resiliência ou eficiência após os P0.
- **S:** até 2 dias-pessoa; **M:** 3–5; **L:** 6–10; **XL:** deve ser quebrado antes da sprint.
- **TODO:** não iniciado; **DOING:** em execução; **BLOCKED:** dependência externa; **DONE:** critério comprovado.
- Todo item precisa de owner nominal, revisor, SHA, comando, ambiente e artefato antes de ser considerado `DONE`.
- Nas dependências e no texto corrido, o prefixo comum `HOSP-` pode ser omitido; por exemplo, `ENV-001` significa `HOSP-ENV-001`.

## 2. Entregas já comprovadas

| ID            | Estado | Entrega                                                      | Evidência                                          |
| ------------- | ------ | ------------------------------------------------------------ | -------------------------------------------------- |
| HOSP-DONE-001 | DONE   | cinco jornadas por função automatizadas                      | `e2e/spa/hospital-personas-routines.spec.ts` — 5/5 |
| HOSP-DONE-002 | DONE   | submissões de prescrição, diagnóstico e orçamento corrigidas | build SPA + 1.063 testes                           |
| HOSP-DONE-003 | DONE   | assinatura laboratorial derivada do profissional autenticado | 544 testes API + jornada do patologista            |
| HOSP-DONE-004 | DONE   | impressão de prontuário exposta na página do paciente        | jornada do veterinário clínico                     |
| HOSP-DONE-005 | DONE   | inventário de 404 corpos efetivamente tentado                | relatório de 03/09/2026                            |

### Estado de execução dos 37 tickets

Esta visão não substitui os critérios abaixo. `DONE` significa critério técnico comprovado; `BLOCKED` identifica uma aprovação humana que não pode ser produzida pela automação.

| Estado  | Tickets                                                                                                                                                                                                                        | Evidência resumida                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| DONE    | `ENV-001–004`, `QA-001`, `AGD-001–002`, `BIL-001–002`, `REG-001`, `SEC-001–002`, `LAB-001`, `PER-001–002`, `RPT-001–003`, `EXP-001–002`, `CAT-001–002`, `API-001`, `A11Y-001–005`, `RWD-001`, `OBS-001`, `CERT-001`, `XBR-001` | SHA limpo; PostgreSQL real; 3 × 404/404; master 3 × 286/286; visual 3 × 28/28; Firefox/WebKit 18/18      |
| BLOCKED | `VIS-001`, `VIS-002`, `CERT-002`, `UAT-001`, `DOC-001`                                                                                                                                                                         | faltam aprovação formal de Produto/UX, UAT nominal das cinco operações e, por dependência, decisão final |

O detalhe por SHA, comando, ambiente e artefato está no [dossiê de certificação](./2026-09-03-dossie-certificacao-playwright-rotinas-hospitalares.md). O critério automático de `CERT-002` foi satisfeito por três rodadas de 404/404, sem skip, flaky ou falha, no SHA `844596fc55d9e189a2e7be19ecac7b170a6acced`. O ticket só poderá ser promovido a `DONE` quando sua dependência formal `VIS-002` for aprovada. O dossiê técnico de `DOC-001` foi emitido, mas o ticket aguarda UAT, assinaturas e decisão final.

## 3. P0 — ambiente e baseline persistente

| ID           | Item                                                              | Owner sugerido   | Tam. | Dependência | Critério de aceite                                                                                              |
| ------------ | ----------------------------------------------------------------- | ---------------- | ---: | ----------- | --------------------------------------------------------------------------------------------------------------- |
| HOSP-ENV-001 | Provisionar PostgreSQL de teste na CI e local                     | DevOps + Backend |    M | —           | comando único sobe banco saudável; API reporta modo `database`; nenhuma conexão usa fallback silencioso         |
| HOSP-ENV-002 | Automatizar migrations, seed multi-tenant e reset                 | Backend/Banco    |    M | ENV-001     | duas execuções a partir de base vazia produzem fixtures idênticas; reset não alcança banco fora do ambiente E2E |
| HOSP-ENV-003 | Falhar o setup E2E quando `E2E_DATABASE_MODE=1` cair para memória | QA + Backend     |    S | ENV-001     | setup encerra antes dos testes com mensagem acionável e código diferente de zero                                |
| HOSP-ENV-004 | Publicar HTML, JSON, traces e auditoria master por SHA            | DevOps + QA      |    M | —           | pipeline preserva todos os artefatos, versões, viewport, fuso, comando e retenção definida                      |
| HOSP-QA-001  | Reexecutar os 404 casos em checkout limpo                         | QA               |    M | ENV-001–004 | 404 descobertos, 404 executados, zero skip ambiental e toda falha com ticket/owner                              |

## 4. P0 — falhas funcionais de agenda e faturamento

| ID           | Item                                                | Owner sugerido     | Tam. | Dependência      | Critério de aceite                                                                                          |
| ------------ | --------------------------------------------------- | ------------------ | ---: | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| HOSP-AGD-001 | Definir o contrato do seletor “Modo da agenda”      | Produto + Frontend |    S | —                | decisão registrada: restaurar `tablist` acessível ou atualizar fluxo/asserção com semântica equivalente     |
| HOSP-AGD-002 | Corrigir cockpit da agenda e regressão associada    | Frontend + QA      |    M | AGD-001          | `appointment-flow.spec.ts` passa por mouse e teclado; estado selecionado possui nome e semântica acessíveis |
| HOSP-BIL-001 | Diagnosticar o `POST 404` do recebimento            | Backend + QA       |    S | ENV-001          | trace identifica rota/payload/estado; causa e contrato canônico ficam documentados                          |
| HOSP-BIL-002 | Persistir a quitação e atualizar o saldo sem reload | Backend + Frontend |    M | BIL-001, ENV-002 | confirmação responde sucesso, mostra `R$ 0,00` em até 2 s e permanece quitada após reabrir a página         |
| HOSP-REG-001 | Manter a jornada completa da recepção como gate     | QA                 |    S | AGD-002, BIL-002 | cadastro, dois agendamentos, esteira, comanda e fechamento permanecem 1/1 em toda PR afetada                |

## 5. P0 — PostgreSQL, segurança e persistência

| ID           | Item                                              | Owner sugerido      | Tam. | Dependência      | Critério de aceite                                                                                |
| ------------ | ------------------------------------------------- | ------------------- | ---: | ---------------- | ------------------------------------------------------------------------------------------------- |
| HOSP-SEC-001 | Aprovar matriz RBAC dos sete perfis               | Segurança + Backend |    M | ENV-002          | allow/deny esperado passa; nenhum papel recebe capability adicional para obter verde              |
| HOSP-SEC-002 | Aprovar isolamento entre tenants e trilha LGPD    | Segurança + QA      |    M | ENV-002          | dois testes tenant passam com respostas opacas e auditoria limitada ao account correto            |
| HOSP-LAB-001 | Validar assinatura técnica no repositório real    | Backend + Segurança |    M | ENV-002          | somente humano, usuário, staff e profissão ativos liberam laudo; identidade do browser é ignorada |
| HOSP-PER-001 | Executar as cinco personas com banco real         | QA + Backend        |    M | ENV-002, SEC-001 | 5/5 passam; dados reaparecem após reinício da API e permanecem isolados por tenant                |
| HOSP-PER-002 | Provar retry e idempotência das mutações críticas | Backend + QA        |    L | PER-001          | retry não duplica tutor, animal, comanda, prescrição, exame, laudo, orçamento ou grant            |

## 6. P0 — relatórios, exports e superfícies HTTP

| ID           | Item                                              | Owner sugerido     | Tam. | Dependência              | Critério de aceite                                                                                                                                                   |
| ------------ | ------------------------------------------------- | ------------------ | ---: | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HOSP-RPT-001 | Recuperar relatório de vendas/comandas canceladas | Backend            |    M | ENV-002                  | execução retorna `reportId`, uma linha filtrada e export auditado                                                                                                    |
| HOSP-RPT-002 | Corrigir `/api/reports/administrative-hubs`       | Backend            |    L | ENV-002                  | as 22 ocorrências desktop/mobile deixam de retornar 500; tenant e totais validados                                                                                   |
| HOSP-RPT-003 | Corrigir `/api/reports/executions` por família    | Backend            |   XL | ENV-002                  | 20 respostas 400 e 2 respostas 500 inesperadas são eliminadas; quebrar em subtarefas por fonte antes da sprint                                                       |
| HOSP-EXP-001 | Corrigir export do workbench de agenda            | Frontend + Backend |    M | RPT-003                  | download começa dentro do timeout; nome, MIME, colunas, filtro e auditoria são validados                                                                             |
| HOSP-EXP-002 | Corrigir export do workbench de estoque           | Frontend + Backend |    M | RPT-003                  | mesmos critérios de EXP-001; indisponibilidade termina com erro e retry, não espera infinita                                                                         |
| HOSP-CAT-001 | Corrigir dependência de `expenses-catalog`        | Backend            |    M | ENV-002                  | oito ocorrências 503 deixam de existir; estado vazio válido responde conforme contrato                                                                               |
| HOSP-CAT-002 | Corrigir os demais catálogos com 503              | Backend            |   XL | ENV-002                  | warehouses, manufacturers, product-groups, sectors, units, advance payments, split, card machines, payment methods, cost centers e banks passam; quebrar por domínio |
| HOSP-API-001 | Padronizar estado vazio, indisponível e retry     | Frontend + Backend |    L | RPT-002–003, CAT-001–002 | 37 superfícies distinguem vazio de falha, anunciam correlação e não mantêm spinner infinito                                                                          |

## 7. P1 — acessibilidade, responsividade e visual

| ID            | Item                                             | Owner sugerido    | Tam. | Dependência      | Critério de aceite                                                                                       |
| ------------- | ------------------------------------------------ | ----------------- | ---: | ---------------- | -------------------------------------------------------------------------------------------------------- |
| HOSP-A11Y-001 | Corrigir dois alvos pequenos em `/queue`         | Frontend/DS       |    S | —                | todos os controles visíveis medem ao menos 24×24 px e mantêm foco visível                                |
| HOSP-A11Y-002 | Corrigir dois alvos em `/vaccines-dewormers`     | Frontend/DS       |    S | —                | mesma regra de A11Y-001                                                                                  |
| HOSP-A11Y-003 | Corrigir três alvos em `/medical-records`        | Frontend/DS       |    S | —                | mesma regra de A11Y-001, sem reduzir densidade clínica essencial                                         |
| HOSP-A11Y-004 | Corrigir seis alvos em `/laboratory/orders`      | Frontend/DS       |    M | —                | mesma regra de A11Y-001 e operação completa por teclado                                                  |
| HOSP-RWD-001  | Remover overflow de 57 px em auditoria de agenda | Frontend/DS       |    S | —                | `scrollWidth <= clientWidth + 2px` no viewport 1440×900; tabela mantém scroll apenas local se necessário |
| HOSP-VIS-001  | Triar os 14 diffs visuais                        | Produto + UX + QA |    M | AGD-002, BIL-002 | cada diff é classificado como defeito ou mudança intencional, com responsável e decisão registrada       |
| HOSP-VIS-002  | Corrigir defeitos e rebaseline aprovado          | Frontend + QA     |    M | VIS-001          | 28/28 snapshots passam; nenhum baseline muda sem aprovação vinculada                                     |
| HOSP-A11Y-005 | Executar Axe e teclado nas cinco personas        | QA + Frontend     |    M | A11Y-001–004     | zero violação crítica/séria e ações primárias alcançáveis sem mouse                                      |

## 8. P1/P2 — certificação e expansão

| ID            | Pri. | Item                               | Owner sugerido   | Tam. | Dependência                | Critério de aceite                                                                |
| ------------- | ---- | ---------------------------------- | ---------------- | ---: | -------------------------- | --------------------------------------------------------------------------------- |
| HOSP-OBS-001  | P1   | Painel de falhas E2E e HTTP        | DevOps/SRE       |    M | ENV-004                    | filtro por SHA, rota, endpoint, papel, navegador e correlation ID                 |
| HOSP-CERT-001 | P1   | Rodar auditoria master sem achados | QA               |    M | API-001, A11Y-005, RWD-001 | 286/286 registros com status aprovado e zero HTTP inesperado                      |
| HOSP-CERT-002 | P1   | Executar três rodadas no mesmo SHA | QA + DevOps      |    M | QA-001, CERT-001, VIS-002  | 3 × 404/404, zero skip, zero flaky e artefatos preservados                        |
| HOSP-UAT-001  | P1   | UAT das cinco funções hospitalares | Produto/Operação |    M | PER-001, CERT-001          | recepção, clínico, patologista, ultrassonografista e administrador assinam aceite |
| HOSP-XBR-001  | P2   | Matriz crítica em Firefox e WebKit | QA + Frontend    |    L | CERT-001                   | login, agenda, prontuário, laboratório, comanda e RBAC passam nos três engines    |
| HOSP-DOC-001  | P2   | Emitir dossiê e decisão go/no-go   | QA + PMO         |    S | CERT-002, UAT-001          | SHA, resultados, exceções, owners e parecer ficam publicados e imutáveis          |

## 9. Ordem de ataque

1. `ENV-001`, `ENV-002`, `ENV-003` e `ENV-004`.
2. Em paralelo: `AGD-001/002`, `BIL-001/002` e triagem de `VIS-001`.
3. `SEC-001/002`, `LAB-001`, `RPT-001/002/003`, `CAT-001/002`.
4. `EXP-001/002`, `API-001` e `PER-001/002`.
5. `A11Y-001–005`, `RWD-001` e `VIS-002`.
6. `QA-001`, `CERT-001/002`, `UAT-001`, `XBR-001` e `DOC-001`.

## 10. Definition of Ready

Um ticket só entra em execução quando possui:

- owner e revisor nominais;
- falha reproduzível ou métrica de baseline;
- ambiente e fixture identificados;
- critério de aceite automatizável;
- dependências atendidas;
- plano de rollback para mudança de contrato, permissão ou migration.

## 11. Definition of Done

Um ticket só recebe `DONE` quando:

- código, testes e documentação estão revisados;
- teste falhava antes e passa depois, quando aplicável;
- testes negativos continuam verdes;
- build e 1.607 unitários permanecem aprovados;
- evidência contém SHA, comando, ambiente, resultado e artefato;
- não houve redução de cobertura, exclusão ou atualização visual sem aceite;
- qualquer risco residual possui owner e prazo.

## 12. Regra de severidade

Falha de isolamento tenant, assinatura indevida, perda financeira, laudo atribuído ao profissional errado ou corrupção de prontuário deve ser promovida imediatamente a P0 e interromper a certificação, mesmo que não estivesse no inventário original.
