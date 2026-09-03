# Roadmap de estabilização das rotinas hospitalares Playwright

Data-base: 3 de setembro de 2026
Status: R0–R4 executados tecnicamente em 03/09; R5 em certificação, com aceites humanos pendentes
Horizonte: 3 de setembro a 16 de outubro de 2026
Fonte: [Relatório de testes](./2026-09-03-relatorio-testes-playwright-rotinas-hospitalares.md)
Direção: [Plano executivo](./2026-09-03-plano-executivo-playwright-rotinas-hospitalares.md)
Controle: [Backlog priorizado](./2026-09-03-backlog-priorizado-playwright-rotinas-hospitalares.md)

> As datas são uma proposta baseada no escopo conhecido. O compromisso deve ser recalculado no kickoff após definir responsáveis nominais e capacidade. Os gates, porém, não mudam por pressão de data.

Os IDs abreviados ao longo deste documento omitem o prefixo comum `HOSP-`; por exemplo, `RPT-003` referencia `HOSP-RPT-003` no backlog.

## 1. Estratégia

O roadmap remove primeiro a incerteza de infraestrutura, depois corrige a operação crítica, fecha persistência e respostas HTTP, conclui experiência e termina com certificação repetível.

```text
PostgreSQL reproduzível
  ├──> baseline 404 sem skip
  ├──> RBAC/RLS e assinatura real
  └──> relatórios, catálogos e exports

Agenda + faturamento + persistência verdes
  └──> acessibilidade + visual + cinco personas resilientes
        └──> três rodadas no mesmo SHA + UAT + go/no-go
```

## 2. Marcos e datas

| Marco                       | Janela proposta | Objetivo                                     | Gate de saída   |
| --------------------------- | --------------- | -------------------------------------------- | --------------- |
| R0 — Fundação               | 03–11/09        | PostgreSQL, seed, fail-fast e artefatos      | GH0             |
| R1 — Operação crítica       | 07–18/09        | agenda, faturamento e jornada da recepção    | GH1             |
| R2 — Persistência e HTTP    | 14–25/09        | 10 casos DB, relatórios, exports e catálogos | GH2             |
| R3 — Experiência            | 21/09–02/10     | acessibilidade, overflow e snapshots         | GH3 técnico     |
| R4 — Resiliência e browsers | 28/09–09/10     | restart, retry, idempotência e engines       | prontidão de RC |
| R5 — Certificação           | 12–16/10        | três rodadas, UAT e decisão                  | GH4             |

As ondas R1–R4 têm sobreposição controlada por dependências; nenhuma equipe deve iniciar correção de relatório persistente antes de GH0.

### Execução antecipada

O trabalho técnico de R0–R4 foi concluído em 03/09/2026 porque as frentes puderam ser executadas em sequência contínua no ambiente isolado. As datas originais permanecem como baseline de planejamento, não como alegação de tempo transcorrido. A rodada pré-certificação aprovou 404/404 e a matriz crítica aprovou 18/18 tanto no Firefox quanto no WebKit.

R5 foi dividido em duas partes: certificação automatizada do mesmo SHA, executável imediatamente, e aceites humanos. O [dossiê](./2026-09-03-dossie-certificacao-playwright-rotinas-hospitalares.md) registra os resultados e mantém GH4 em `NO-GO` enquanto Produto/UX e as cinco funções hospitalares não assinarem os respectivos aceites.

## 3. R0 — Fundação reproduzível

### Janela

3 a 11 de setembro.

### Entregas

- `HOSP-ENV-001`: PostgreSQL local e CI saudável;
- `HOSP-ENV-002`: migrations, seed multi-tenant e reset idempotente;
- `HOSP-ENV-003`: setup fail-fast quando o modo DB cair para memória;
- `HOSP-ENV-004`: publicação de relatório e traces por SHA;
- primeira rebaseline dos 404 casos, sem classificar resultado como certificação.

### Critérios de saída

- healthcheck comprova persistência `database`;
- 404 testes são descobertos e nenhum é pulado por ambiente;
- os 10 casos DB alcançam suas asserções de negócio;
- toda falha possui causa inicial, owner e artefato;
- reset é limitado ao banco E2E e pode ser repetido com segurança.

### Risco dominante

Diferença entre ambiente local e CI. Mitigação: mesmo compose/script, mesmas migrations e seed, versões fixadas e teste a partir de checkout limpo.

## 4. R1 — Operação crítica

### Janela

7 a 18 de setembro.

### Entregas

- decisão de UX para “Modo da agenda”;
- correção do contrato acessível do cockpit;
- diagnóstico do `POST 404` no recebimento;
- atualização e persistência do saldo `R$ 0,00`;
- jornada da recepcionista mantida como gate;
- triagem inicial dos snapshots de agenda e faturamento.

### Critérios de saída

- `appointment-flow.spec.ts` verde por mouse e teclado;
- `billing-flow.spec.ts` verde e saldo correto após reabrir;
- 5/5 personas permanecem aprovadas;
- nenhum teste foi enfraquecido apenas para aceitar a tela atual;
- snapshots afetados permanecem pendentes até decisão visual formal.

## 5. R2 — Persistência, segurança, relatórios e HTTP

### Janela

14 a 25 de setembro.

### Trilhas

| Trilha               | Itens principais                | Saída                                       |
| -------------------- | ------------------------------- | ------------------------------------------- |
| Segurança            | `SEC-001`, `SEC-002`, `LAB-001` | RBAC/RLS/assinatura aprovados em banco real |
| Relatórios           | `RPT-001`, `RPT-002`, `RPT-003` | vendas canceladas, hubs e execuções verdes  |
| Exports              | `EXP-001`, `EXP-002`            | agenda e estoque baixam arquivo validado    |
| Catálogos            | `CAT-001`, `CAT-002`            | zero 503 inesperado nas famílias afetadas   |
| Experiência de falha | `API-001`                       | vazio, indisponível e retry distinguíveis   |

### Critérios de saída

- 10/10 casos únicos de PostgreSQL aprovados;
- `/flags`, seeds e fixtures retornam os contratos esperados;
- zero timeout aguardando download;
- `reportId`, tenant, filtros e auditoria são validados;
- zero `4xx/5xx` inesperado nas 37 superfícies afetadas;
- testes negativos continuam retornando `403` quando a negação é de negócio.

### Regra de decomposição

`RPT-003` e `CAT-002` são XL e não entram inteiros em uma sprint. Devem ser divididos por família de fonte/endpoint, preservando um ticket pai com métrica agregada.

## 6. R3 — Acessibilidade, responsividade e visual

### Janela

21 de setembro a 2 de outubro.

### Entregas

- 13 alvos pequenos corrigidos em fila, vacinas/vermífugos, prontuários e laboratório;
- navegação por teclado e Axe nas cinco personas;
- overflow de 57 px eliminado em auditoria de agenda;
- 14 diferenças visuais classificadas;
- defeitos visuais corrigidos e mudanças intencionais aprovadas;
- snapshots atualizados apenas após a decisão.

### Critérios de saída

- 286/286 navegações sem achados bloqueantes;
- zero alvo visível menor que 24×24 px;
- `scrollWidth <= clientWidth + 2px` na regra global;
- zero violação Axe crítica/séria nas jornadas;
- 28/28 snapshots aprovados com trilha de revisão.

## 7. R4 — Resiliência das personas e matriz de navegador

### Janela

28 de setembro a 9 de outubro.

### Entregas

- cinco personas executadas integralmente com PostgreSQL;
- reinício da API entre gravação e leitura de evidência;
- retry e idempotência de cadastros, comanda, prescrição, exame, laudo, orçamento e grants;
- matriz crítica em Chromium, Firefox e WebKit;
- painel operacional de falhas E2E/HTTP.

### Critérios de saída

- 5/5 personas passam após restart;
- zero duplicidade após retry;
- isolamento tenant preservado;
- fluxos críticos aprovados nos três engines;
- uma falha é localizável por SHA, rota, papel, navegador e correlation ID.

## 8. R5 — Certificação e decisão

### Janela

12 a 16 de outubro.

### Entregas

- freeze do SHA candidato;
- três execuções integrais consecutivas;
- UAT com as cinco funções;
- dossiê de evidências;
- reunião e registro de go/no-go.

### Critérios de saída

- 3 × 404/404 Playwright;
- 3 × 286/286 navegações master;
- 3 × 28/28 snapshots;
- zero skip, zero flaky e zero HTTP inesperado;
- builds e 1.607 unitários verdes nas três rodadas;
- UAT assinado e riscos residuais com owner/prazo;
- SHA remoto e artefatos imutáveis identificados no parecer.

## 9. Plano por disciplina

| Semana      | Backend/Banco               | Frontend/UX           | QA/DevOps                  | Produto/Operação           |
| ----------- | --------------------------- | --------------------- | -------------------------- | -------------------------- |
| 03–04/09    | desenho do banco/seed       | reproduções críticas  | runner e artefatos         | validar prioridades        |
| 07–11/09    | PostgreSQL e billing        | agenda e saldo        | fail-fast e rebaseline     | decidir contrato da agenda |
| 14–18/09    | RBAC/RLS e relatórios       | estados e exports     | 404 sem skip               | validar relatórios         |
| 21–25/09    | hubs, execuções e catálogos | A11y e responsividade | contratos/downloads        | triar 14 diffs             |
| 28/09–02/10 | persistência residual       | correções visuais     | master 286 + browsers      | aprovar baselines          |
| 05–09/10    | restart/idempotência        | compatibilidade       | personas e observabilidade | UAT preparatória           |
| 12–16/10    | suporte ao freeze           | correções apenas P0   | três rodadas e dossiê      | UAT e go/no-go             |

## 10. Evolução esperada dos indicadores

Não se define uma quantidade artificial de testes verdes por semana. Cada marco possui uma métrica de saída que só muda com evidência.

| Marco    |                  Playwright |         DB |      Master |         HTTP |     Visual |   A11y/RWD |
| -------- | --------------------------: | ---------: | ----------: | -----------: | ---------: | ---------: |
| Baseline |                     374/404 |       0/10 |     207/286 |           74 |      14/28 | 14 achados |
| Saída R0 |             medido sem skip | executável |  rebaseline | classificado | preservado | preservado |
| Saída R1 |      falhas AGD/BIL zeradas | executável |  ≥ baseline |     em queda |     triado | preservado |
| Saída R2 | falhas persistentes zeradas |      10/10 |    sem HTTP |            0 |     triado | preservado |
| Saída R3 |         candidato a 404/404 |      10/10 |     286/286 |            0 |      28/28 |          0 |
| Saída R4 |                     404/404 |      10/10 |     286/286 |            0 |      28/28 |          0 |
| Saída R5 |                 3 × 404/404 |  3 × 10/10 | 3 × 286/286 |            0 |  3 × 28/28 |          0 |

## 11. Caminho crítico

O caminho crítico é:

1. `ENV-001` → `ENV-002` → `ENV-003`;
2. `BIL-001` → `BIL-002` e `AGD-001` → `AGD-002`;
3. `RPT-003` → `EXP-001/002` e `CAT-002` → `API-001`;
4. `SEC-001/002` + `PER-001`;
5. `A11Y-001–005` + `RWD-001` + `VIS-001/002`;
6. `CERT-001` → `CERT-002` → `DOC-001`.

Qualquer atraso em PostgreSQL, relatórios ou aprovação visual desloca GH4. A data não autoriza pular o gate.

## 12. Replanejamento

O programa retorna ao último gate verde se ocorrer:

- falha de isolamento tenant ou assinatura atribuída incorretamente;
- perda, duplicidade ou corrupção de prontuário, comanda ou laudo;
- teste persistente voltar a usar fallback em memória;
- mudança visual aceita sem revisão;
- flaky acima de zero nas três rodadas de certificação;
- diferença entre o SHA testado e o SHA promovido.

O bloqueador deve receber owner em um dia útil. Prazo, impacto e nova sequência são recalculados na revisão semanal, mantendo explícita a decisão de release.
