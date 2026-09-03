# Dossiê de certificação Playwright das rotinas hospitalares

Data: 3 de setembro de 2026
Status: certificação técnica concluída; decisão formal `NO-GO` até os aceites humanos
Plano: [Plano executivo](./2026-09-03-plano-executivo-playwright-rotinas-hospitalares.md)
Controle: [Backlog priorizado](./2026-09-03-backlog-priorizado-playwright-rotinas-hospitalares.md)
Sequenciamento: [Roadmap](./2026-09-03-roadmap-playwright-rotinas-hospitalares.md)

## 1. Parecer

Os 37 tickets planejados foram levados até o limite automatizável. Trinta e dois estão `DONE`; cinco permanecem `BLOCKED` exclusivamente por dependência humana formal. GH0, GH1, GH2 e GH3 possuem evidência técnica verde. A parte automática de GH4 foi concluída com três rodadas integrais no mesmo SHA, mas o gate completo não está aprovado: a revisão técnica não substitui a aprovação de Produto/UX dos baselines visuais nem o UAT assinado por recepção, clínica médica, patologia, ultrassonografia e administração.

O parecer permanece `NO-GO` para go-live até essas dependências serem anexadas ao mesmo SHA. Não há exceção, assinatura presumida ou `skip` criado para encerrar o plano.

## 2. Identidade do candidato

| Campo                 | Valor                                                         |
| --------------------- | ------------------------------------------------------------- |
| SHA técnico candidato | `844596fc55d9e189a2e7be19ecac7b170a6acced`                    |
| Branch                | `main`                                                        |
| Banco                 | PostgreSQL 16.15, banco isolado com marcador `e2e`            |
| Locale/fuso           | `pt-BR` / `America/Sao_Paulo`                                 |
| Browser integral      | Chromium                                                      |
| Engines críticos      | Chromium, Firefox e WebKit                                    |
| Estado do worktree    | limpo nas três rodadas integrais e nas duas matrizes críticas |

O candidato foi publicado em `origin/main` antes das execuções. O commit posterior que atualiza este dossiê é exclusivamente documental; o SHA técnico certificado permanece o identificado acima.

## 3. Resultado técnico consolidado

| Gate técnico                                 |          Resultado final | Estado                                     |
| -------------------------------------------- | -----------------------: | ------------------------------------------ |
| Casos Playwright únicos                      |              3 × 404/404 | aprovado                                   |
| Casos dependentes de PostgreSQL              |                3 × 10/10 | aprovado                                   |
| Personas hospitalares em banco real          |                  3 × 5/5 | aprovado após reset/restart                |
| Navegações master                            |              3 × 286/286 | aprovado                                   |
| HTTP inesperado / page error                 |                    0 / 0 | aprovado                                   |
| Snapshots                                    |                3 × 28/28 | automação aprovada; aceite formal pendente |
| Alvos menores que 24×24 px / overflow global |                    0 / 0 | aprovado                                   |
| Matriz crítica Firefox                       |                    18/18 | aprovado no SHA candidato                  |
| Matriz crítica WebKit                        |                    18/18 | aprovado no SHA candidato                  |
| Testes unitários consolidados com cobertura  |              2.362/2.362 | aprovado                                   |
| Cobertura linhas/branches/funções/statements | 82,09/82,23/85,45/82,09% | aprovado                                   |

O único caso não executado no comando genérico de cobertura é a integração opcional `laboratory-postgres.integration.test.ts`. Ele não integra o inventário Playwright e sua regra de banco real é coberta pelos 10 testes PostgreSQL e pela jornada do patologista na bateria dedicada.

### Rodadas integrais no SHA candidato

| Rodada   | Início (`America/Sao_Paulo`) | Duração     | Playwright | Master  | Visual | Skip / flaky / falha |
| -------- | ---------------------------- | ----------- | ---------- | ------- | ------ | -------------------- |
| `cert-1` | 03/09/2026 03:15:46          | 8min55,947s | 404/404    | 286/286 | 28/28  | 0 / 0 / 0            |
| `cert-2` | 03/09/2026 03:25:37          | 8min56,917s | 404/404    | 286/286 | 28/28  | 0 / 0 / 0            |
| `cert-3` | 03/09/2026 03:35:28          | 8min55,511s | 404/404    | 286/286 | 28/28  | 0 / 0 / 0            |

Cada rodada executou as cinco personas, os 10 casos dependentes de PostgreSQL e resetou o banco isolado. Os 858 registros de navegação master resultantes estão com estado `passed`, sem issue, erro HTTP ou page error.

### Matriz crítica cross-browser

| Engine  | Início (`America/Sao_Paulo`) | Duração     | Resultado | Skip / flaky / falha |
| ------- | ---------------------------- | ----------- | --------- | -------------------- |
| Firefox | 03/09/2026 03:10:06          | 1min37,889s | 18/18     | 0 / 0 / 0            |
| WebKit  | 03/09/2026 03:12:41          | 1min57,336s | 18/18     | 0 / 0 / 0            |

## 4. Mudanças implementadas

- runner PostgreSQL único para local e CI, com migrations, seed multi-tenant, reset limitado a bancos `test`/`e2e`, restart canônico e falha imediata se a API cair para memória;
- credenciais separadas para administrador, recepção, veterinário e segundo tenant;
- artefatos HTML, JSON, traces, descoberta, auditoria e dashboard arquivados por SHA, ambiente, engine e rodada;
- correções nos contratos da agenda, recebimento, filtros de atendimentos encerrados, relatórios e responsividade;
- gravações privilegiadas serializadas para evitar corrida na administração de acessos;
- assinatura laboratorial vinculada ao profissional autenticado e seed com staff/profissão ativos;
- hidratação do contador de orçamentos após restart, impedindo colisão de `QT-000001`;
- replay explícito da mesma chave de idempotência para tutor, animal, comanda, grant, prescrição, exame, laudo e orçamento;
- auditoria master com SHA real do commit e validação exata de 404 testes, zero `skip`, zero flaky e zero falha;
- matriz de certificação com Chromium integral e fluxos críticos em Firefox/WebKit.

## 5. Revisão visual técnica

As diferenças foram abertas e comparadas antes da atualização. Quatorze regressões da baseline e uma imagem adicional afetada no fechamento foram classificadas tecnicamente como mudanças coerentes com alvos mínimos, correção de overflow, botão de impressão e reposicionamentos consequentes:

- agenda kanban desktop/mobile, claro/escuro;
- detalhe e lista de faturamento;
- dashboard escuro;
- detalhe do atendimento claro/escuro;
- prontuário escuro;
- tutor e paciente claro, além de paciente escuro;
- fila escura e gateway da recepção escuro.

Resultado automatizado final: 3 × 28/28 snapshots no SHA candidato. Estado de governança: revisão técnica concluída; aprovação formal de Produto/UX pendente. Os arquivos não devem ser novamente atualizados para resolver falha de pipeline sem uma nova triagem lado a lado.

## 6. Comandos de prova

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm test:coverage
pnpm docs:validate
pnpm complexity:check

E2E_DATABASE_URL='<postgresql-e2e-url>' \
E2E_EVIDENCE_RUN_ID='cert-1' \
E2E_ENVIRONMENT='local-postgresql-16.15' \
bash infra/scripts/run-e2e-spa.sh
```

As rodadas `cert-2` e `cert-3` usam o mesmo comando, banco resetado e SHA, alterando somente `E2E_EVIDENCE_RUN_ID`.

## 7. Evidências

| Evidência                      | Localização                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Resultado JSON mais recente    | `playwright-report/usability/results.json`                                              |
| Relatório HTML mais recente    | `playwright-report/usability/index.html`                                                |
| Auditoria master consolidada   | `tmp/master-usability-audit.json`                                                       |
| Rodada integral 1              | `artifacts/playwright/844596fc55d9e189a2e7be19ecac7b170a6acced/cert-1/`                 |
| Rodada integral 2              | `artifacts/playwright/844596fc55d9e189a2e7be19ecac7b170a6acced/cert-2/`                 |
| Rodada integral 3              | `artifacts/playwright/844596fc55d9e189a2e7be19ecac7b170a6acced/cert-3/`                 |
| Matriz Firefox                 | `artifacts/playwright/844596fc55d9e189a2e7be19ecac7b170a6acced/cross-browser-firefox/`  |
| Matriz WebKit                  | `artifacts/playwright/844596fc55d9e189a2e7be19ecac7b170a6acced/cross-browser-webkit/`   |
| Dashboard filtrável por rodada | `artifacts/playwright/844596fc55d9e189a2e7be19ecac7b170a6acced/<run-id>/dashboard.json` |
| Workflow de 90 dias            | `.github/workflows/usability-certification.yml`                                         |
| Runbook                        | `infra/scripts/README.md`                                                               |

## 8. Dependências externas e decisão

| Dependência                     | Owner requerido     | Evidência necessária                  | Estado  |
| ------------------------------- | ------------------- | ------------------------------------- | ------- |
| Triagem/aprovação dos baselines | Produto + UX        | decisão por snapshot vinculada ao SHA | BLOCKED |
| UAT recepção                    | Operação/Recepção   | roteiro executado e aceite nominal    | BLOCKED |
| UAT clínica médica              | Veterinário clínico | roteiro executado e aceite nominal    | BLOCKED |
| UAT patologia                   | Patologista         | roteiro executado e aceite nominal    | BLOCKED |
| UAT ultrassonografia            | Ultrassonografista  | roteiro executado e aceite nominal    | BLOCKED |
| UAT administração               | Administração       | roteiro executado e aceite nominal    | BLOCKED |

Após receber os nomes e referências reais, o workflow `Usability Certification` deve ser disparado no SHA candidato. Ele recusa uma decisão `go` se as três rodadas técnicas ou a matriz cross-browser falharem. Até lá, a decisão honesta é `NO-GO por aceite pendente`, e não reprovação técnica. O resultado automático de `CERT-002` foi satisfeito, mas o ticket permanece formalmente bloqueado pela dependência `VIS-002`; `DOC-001` permanece bloqueado até que o parecer possa incorporar as assinaturas e a decisão final.
