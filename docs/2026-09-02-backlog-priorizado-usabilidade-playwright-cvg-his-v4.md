# Backlog priorizado de usabilidade Playwright — CVG-HIS V4

Data-base: 2 de setembro de 2026  
Status inicial: todos os itens em `TODO`  
Origem: [Relatório master](./2026-09-02-relatorio-master-usabilidade-playwright-cvg-his-v4.md)  
Direção: [Plano executivo](./2026-09-02-plano-executivo-melhorias-usabilidade-playwright-cvg-his-v4.md)  
Sequenciamento: [Roadmap](./2026-09-02-roadmap-melhorias-usabilidade-playwright-cvg-his-v4.md)

> Atualização de execução: a implementação e as pendências de certificação estão consolidadas no [relatório de implementação](./2026-09-02-implementacao-usabilidade-playwright-cvg-his-v4.md).

## 1. Convenções

- **P0:** impede uma baseline confiável, jornada crítica ou homologação.
- **P1:** obrigatório para o release candidate de usabilidade.
- **P2:** amplia resiliência e cobertura depois da correção dos achados.
- **S:** 1–2 dias-pessoa; **M:** 3–5; **L:** 6–10; **XL:** deve ser quebrado antes de entrar na sprint.
- **Owner sugerido:** indica a disciplina responsável; uma pessoa nominal e um revisor devem ser definidos no planejamento.
- **Evidência obrigatória:** teste Playwright, ambiente, SHA, data, resultado e artefato.

Estimativas são faixas relativas e não compromisso de prazo. Descobertas da rebaseline com PostgreSQL podem alterar tamanho e prioridade.

## 2. P0 — Ambiente e gate confiável

| ID      | Item                                                              | Owner sugerido   | Tam. | Dependência | Onda | Critério de aceite                                                                                                                  |
| ------- | ----------------------------------------------------------------- | ---------------- | ---: | ----------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ENV-001 | Provisionar PostgreSQL de teste reproduzível                      | DevOps + Backend |    M | —           | R0   | comando documentado sobe banco saudável em checkout limpo; API não usa fallback e healthcheck confirma conexão                      |
| ENV-002 | Automatizar migrations, seed e reset seguro                       | Backend          |    M | ENV-001     | R0   | schema e usuário admin são criados de forma idempotente; duas execuções limpas produzem a mesma baseline                            |
| ENV-003 | Instalar/cachear Chromium e dependências na CI                    | DevOps + QA      |    S | —           | R0   | Playwright 1.58.2 executa Chrome compatível sem etapa manual; versão fica registrada no artefato                                    |
| ENV-004 | Publicar relatório HTML, JSON, screenshots e traces por SHA       | QA + DevOps      |    M | ENV-003     | R0   | cada pipeline preserva artefatos, viewport, timezone, commit e comando; retenção definida                                           |
| QAG-001 | Reexecutar os 369 casos com PostgreSQL e reclassificar a baseline | QA               |    M | ENV-001–004 | R0   | 369 casos descobertos; zero skip ambiental; cada falha possui causa, severidade e ticket                                            |
| QAG-002 | Transformar o status interno da auditoria em gate bloqueante      | QA               |    M | ENV-004     | R0   | pipeline falha quando qualquer registro do JSON está `failed`, mas conclui a coleta das 143 rotas; resumo não apresenta falso verde |

## 3. P0 — Jornadas clínicas e financeiras

| ID      | Item                                                 | Owner sugerido     | Tam. | Dependência      | Onda | Critério de aceite                                                                                                          |
| ------- | ---------------------------------------------------- | ------------------ | ---: | ---------------- | ---- | --------------------------------------------------------------------------------------------------------------------------- |
| CLN-001 | Disponibilizar o adapter atômico de prontuário       | Backend            |    L | ENV-001, ENV-002 | R1   | criação de prontuário e ordem não retorna `500`; adapter correto é injetado em teste e runtime alvo                         |
| CLN-002 | Provar atomicidade, idempotência, rollback e restart | Backend + QA       |    L | CLN-001          | R1   | falha induzida não deixa estado parcial; retry não duplica entrada; dados reaparecem após restart                           |
| CLN-003 | Recuperar jornadas e visual do prontuário            | Frontend + QA      |    M | CLN-001          | R1   | advanced care, fluxo crítico, Busca Mestre e walkthrough passam; snapshot escuro exibe prontuário real e 28/28 ficam verdes |
| BIL-001 | Atualizar saldo do faturamento após recebimento      | Backend + Frontend |    M | ENV-002          | R1   | quitação persiste e exibe `R$ 0,00` sem refresh manual; reabertura da tela mantém o resultado                               |

## 4. P0 — APIs, relatórios e exports

| ID      | Item                                                     | Owner sugerido     | Tam. | Dependência      | Onda | Critério de aceite                                                                                                                              |
| ------- | -------------------------------------------------------- | ------------------ | ---: | ---------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| API-001 | Corrigir grupo de catálogos/financeiro com `503`         | Backend            |   XL | QAG-001          | R2   | as 11 rotas do grupo respondem conforme contrato em desktop/mobile; estado vazio válido não vira erro; item quebrado em subtarefas por endpoint |
| API-002 | Corrigir `/api/reports/administrative-hubs`              | Backend            |    L | QAG-001, ENV-002 | R2   | 11 rotas dependentes deixam de retornar `500`; totais e escopo tenant são validados com fixture persistida                                      |
| API-003 | Corrigir `/api/reports/executions` e fontes persistentes | Backend            |   XL | QAG-001, ENV-002 | R2   | 11 rotas deixam de retornar `400/500`; relatório de exclusão gera `reportId`; cada tipo possui teste de contrato; item quebrado por família     |
| EXP-001 | Corrigir export do workbench de agenda                   | Frontend + Backend |    M | API-003          | R2   | evento de download ocorre no timeout; arquivo abre, possui MIME/nome/colunas esperados e dados do filtro ativo                                  |
| EXP-002 | Corrigir export do workbench de estoque                  | Frontend + Backend |    M | API-003          | R2   | mesmos critérios de EXP-001 para estoque; falha de fonte encerra com mensagem e retry                                                           |

## 5. P1 — Experiência de erro e exports

| ID      | Item                                              | Owner sugerido     | Tam. | Dependência      | Onda | Critério de aceite                                                                                                    |
| ------- | ------------------------------------------------- | ------------------ | ---: | ---------------- | ---- | --------------------------------------------------------------------------------------------------------------------- |
| API-004 | Padronizar estado vazio, erro, retry e correlação | Frontend + Backend |    L | API-001–003      | R3   | todas as superfícies afetadas distinguem vazio de indisponível; mensagem é acionável; retry não duplica operação      |
| EXP-003 | Criar contrato compartilhado de download limitado | Frontend           |    M | EXP-001, EXP-002 | R3   | loading começa imediatamente, botão evita duplo clique, sucesso/erro são anunciados e espera nunca fica infinita      |
| OBS-001 | Instrumentar erros de rota, `403` e downloads     | Backend + DevOps   |    M | API-004          | R5   | painel permite filtrar endpoint, rota, papel, correlation ID e resultado; alerta cobre regressão dos erros observados |

## 6. P1 — Acessibilidade e design system

| ID       | Item                                                | Owner sugerido         | Tam. | Dependência  | Onda | Critério de aceite                                                                                                       |
| -------- | --------------------------------------------------- | ---------------------- | ---: | ------------ | ---- | ------------------------------------------------------------------------------------------------------------------------ |
| A11Y-001 | Remover landmark `main` duplicado do shell          | Frontend               |    S | —            | R3   | as 286 renderizações expõem exatamente um `main`; skip link continua focando `#main-content`                             |
| A11Y-002 | Corrigir contrato de label dos componentes de campo | Frontend/Design System |    M | —            | R3   | input/select exigem label visível ou nome programático; teste de componente cobre `for/id` e `aria-labelledby`           |
| A11Y-003 | Corrigir os sete campos observados                  | Frontend               |    S | A11Y-002     | R3   | `/patients`, `/owners`, `/users` e `/staff` ficam sem ocorrência em desktop/mobile; nome acessível descreve a finalidade |
| A11Y-004 | Ampliar os 90 alvos interativos observados          | Frontend/Design System |    M | —            | R3   | breadcrumbs, dismiss de alertas e links compactos atendem `24x24px`; 0 ocorrência na auditoria                           |
| A11Y-005 | Ampliar Axe, teclado e foco para jornadas críticas  | QA + Frontend          |    M | A11Y-001–004 | R3   | owner/patient, agenda, prontuário, billing, relatórios e perfis passam Axe configurado e roteiro completo de teclado     |

## 7. P1 — RBAC sem ruído

| ID       | Item                                               | Owner sugerido     | Tam. | Dependência | Onda | Critério de aceite                                                                                                               |
| -------- | -------------------------------------------------- | ------------------ | ---: | ----------- | ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| RBAC-001 | Condicionar cargas globais à capacidade do papel   | Frontend + Backend |    M | ENV-002     | R3   | veterinário, enfermagem e recepção não disparam chamadas desnecessárias proibidas; UI não exibe alerta ruidoso                   |
| RBAC-002 | Expandir matriz Playwright de allow/deny por papel | QA + Segurança     |    M | RBAC-001    | R3   | 12/12 cenários positivos permanecem verdes e testes negativos comprovam negação; nenhuma permissão foi ampliada para obter verde |

## 8. P1 — Responsividade

| ID      | Item                                              | Owner sugerido | Tam. | Dependência               | Onda | Critério de aceite                                                                                                                           |
| ------- | ------------------------------------------------- | -------------- | ---: | ------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| RWD-001 | Corrigir seis overflows financeiros mobile graves | Frontend       |    L | componentes identificados | R4   | `/finance/split`, card machines, simulador, payment enablement, payment methods e bancos não excedem o viewport; ações permanecem acessíveis |
| RWD-002 | Corrigir quatro overflows residuais               | Frontend       |    M | RWD-001                   | R4   | card accounts e cards desktop, accounts payable e deleted sales mobile ficam dentro da tolerância de 2px                                     |
| RWD-003 | Padronizar tabelas/formulários responsivos e gate | Frontend + QA  |    L | RWD-001, RWD-002          | R4   | design system define scroll local/card/colunas; auditoria falha com overflow global novo; 286/286 passam                                     |

## 9. P1 — Regressão e certificação

| ID      | Item                                                             | Owner sugerido | Tam. | Dependência          | Onda | Critério de aceite                                                                                                                     |
| ------- | ---------------------------------------------------------------- | -------------- | ---: | -------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| QAG-003 | Executar e estabilizar os seis testes persistentes antes pulados | QA + Backend   |    L | ENV-001, API-001–003 | R4   | estoque, compras, produtos, notas, movimentações e serviços passam sem skip e validam dados após restart                               |
| QAG-004 | Rodar certificação integral três vezes no mesmo SHA              | QA + DevOps    |    M | todos os P0/P1       | R5   | três rodadas aprovam todos os casos descobertos (mínimo 369), 286/286 auditorias e 28/28 visuais, sem retry oculto ou artefato perdido |
| QAG-005 | Executar UAT por papel operacional                               | Produto + QA   |    M | QAG-004, RBAC-002    | R5   | recepção, veterinário, enfermagem e administração concluem roteiro e registram aceite/ressalva                                         |
| DOC-001 | Publicar pacote de evidências e decisão go/no-go                 | QA + Liderança |    S | QAG-004, QAG-005     | R5   | índice liga SHA, ambiente, resultados, screenshots, riscos, aprovadores e decisão; nenhuma credencial/dado sensível incluído           |

## 10. P2 — Ampliações após estabilização

| ID       | Item                                             | Owner sugerido    | Tam. | Dependência | Critério de aceite                                                                                               |
| -------- | ------------------------------------------------ | ----------------- | ---: | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| TAB-001  | Testar tabelas com 0, 1, 100 e 1.000 linhas      | QA + Frontend     |    L | RWD-003     | paginação, ordenação, filtro, foco, loading e estado vazio funcionam sem travar ou perder contexto               |
| TAB-002  | Validar conteúdo e segurança de CSV/planilhas    | QA + Backend      |    M | EXP-003     | UTF-8, separador, cabeçalho, casas decimais e timezone corretos; valores iniciados por fórmula são neutralizados |
| QAG-006  | Executar jornadas essenciais em Firefox e WebKit | QA                |    L | QAG-004     | subconjunto de login, tutor/animal, agenda, prontuário, billing e export passa nos três engines                  |
| A11Y-006 | Realizar validação manual com leitor de tela     | Especialista A11y |    M | A11Y-005    | roteiro NVDA/VoiceOver registra landmarks, nomes, estados, tabelas e mensagens; bloqueadores são zerados         |
| RWD-004  | Ampliar matriz para 320, 768 e 1024px            | QA + Frontend     |    M | RWD-003     | jornadas prioritárias permanecem utilizáveis nos breakpoints e orientação paisagem                               |

## 11. Rastreabilidade com o laudo

| Achado do relatório                                       | Itens que o encerram               |
| --------------------------------------------------------- | ---------------------------------- |
| PostgreSQL/Docker ausente e seis skips                    | ENV-001, ENV-002, QAG-001, QAG-003 |
| adapter atômico indisponível                              | CLN-001, CLN-002, CLN-003          |
| 33 rotas com erro HTTP                                    | API-001, API-002, API-003, API-004 |
| exports de agenda/estoque em timeout                      | EXP-001, EXP-002, EXP-003          |
| saldo não atualiza após quitação                          | BIL-001                            |
| relatório de exclusão sem `reportId`                      | API-003                            |
| `403` em cargas secundárias                               | RBAC-001, RBAC-002, OBS-001        |
| dois `main` em 286 telas                                  | A11Y-001                           |
| sete campos sem rótulo                                    | A11Y-002, A11Y-003                 |
| 90 alvos pequenos                                         | A11Y-004                           |
| dez overflows                                             | RWD-001, RWD-002, RWD-003          |
| 27/28 snapshots                                           | CLN-003, QAG-004                   |
| 286 coletas verdes no runner, mas internamente reprovadas | QAG-002                            |

## 12. Ordem de puxada recomendada

### Sprint 1

1. ENV-001 e ENV-003 em paralelo;
2. ENV-002 após ENV-001;
3. ENV-004;
4. QAG-002;
5. QAG-001 e triagem executiva da nova baseline.

### Sprint 2

1. CLN-001;
2. BIL-001 em paralelo;
3. CLN-002;
4. CLN-003;
5. correção de novos P0 revelados em QAG-001.

Itens `XL` devem ser decompostos em tickets por endpoint/família antes de serem puxados.

## 13. Definition of Ready

Um item pode entrar na sprint quando possui:

- comportamento esperado e impacto de usuário descritos;
- owner nominal e revisor;
- dependências/ambiente disponíveis;
- rota, endpoint, papel e viewport identificados;
- critérios positivos, negativos e de regressão;
- plano para dados sintéticos, rollback e observabilidade;
- tamanho aceito pela equipe; itens `XL` já decompostos.

## 14. Definition of Done

Um item só muda para `DONE` quando:

- implementação e documentação foram revisadas;
- teste Playwright navega pela interface real nos viewports aplicáveis;
- contratos unitários/integrados necessários também passaram;
- nenhuma falha virou skip e nenhum threshold foi relaxado;
- snapshots alterados foram revisados por duas pessoas e não contêm tela de erro;
- build, types, lint, segurança e conjuntos afetados estão verdes;
- artefato registra SHA, ambiente, data, comando e resultado;
- Produto/Operação aceitou mudanças de comportamento;
- risco residual e rollback estão documentados.

## 15. Modelo de evidência

```text
ID do backlog:
Owner / revisor:
Commit ou SHA:
Ambiente e modo de persistência:
Playwright / browser / viewport:
Dados sintéticos utilizados:
Comandos executados:
Resultado antes / depois:
Relatório HTML, JSON, screenshots ou trace:
Riscos residuais:
Aceite de Produto/Operação:
```

## 16. Regra de prioridade

Perda/corrupção de dado clínico, quebra de isolamento, permissão ampliada indevidamente ou falha de quitação assume P0 imediatamente. O roadmap volta ao último gate verde e qualquer exceção exige owner, prazo, compensação e aprovação executiva.
