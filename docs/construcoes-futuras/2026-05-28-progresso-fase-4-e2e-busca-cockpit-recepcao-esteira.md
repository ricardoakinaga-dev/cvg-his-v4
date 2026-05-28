# Progresso Fase 4 - E2E Busca Mestre, cockpit 360, recepcao e esteira

Data: 2026-05-28

## Objetivo

Fechar a cobertura base do fluxo critico `Busca Mestre -> cockpit 360 -> recepcao -> cockpit 360 -> esteira`, recorrente nos proximos passos da Fase 4.

## Entregue

- Novo spec Playwright em `e2e/spa/master-search-360-reception.spec.ts`.
- O teste cria tutor e paciente via API com sinais clinicos (`chronicDisease` e `allergy`).
- A Busca Mestre localiza o paciente, exibe `Atenção clínica` na `Prioridade 360` e abre o cockpit.
- O cockpit 360 do paciente exibe os sinais clinicos usados na priorizacao.
- A recepcao pesquisa o mesmo paciente, exibe acao contextual `Prioridade 360` e abre o cockpit antes da continuidade operacional.
- O fluxo retorna para a recepcao, prepara a esteira e valida o check-in preparado.
- O spec foi expandido com a severidade `Exames pendentes`, criando atendimento e pedido laboratorial real via API.
- A Busca Mestre prioriza o paciente com exame pendente acima do sinal clinico cadastral.
- O cockpit 360 exibe `1 exame(s) pendente(s)` e a recepcao mostra a acao contextual `Exames pendentes`.
- O spec foi expandido com a severidade `Pendência financeira`, criando estimativa, item de cobranca e status `open` via API.
- A Busca Mestre, o cockpit 360 e a recepcao exibem `R$ 180,00 em aberto` como sinal financeiro operacional.
- O spec foi expandido com a severidade `Preventivo vencido`, criando evento preventivo agendado no passado via API.
- A Busca Mestre, o cockpit 360 e a recepcao exibem `Preventivo vencido` e a orientacao de abrir o cockpit antes de agenda, esteira ou comanda.
- O fallback do servidor para `API_DISABLE_INCOMPATIBLE_DB_REPOS=1` foi corrigido para usar store preventivo em memoria, evitando tentativa de PostgreSQL indisponivel em E2E.
- A configuracao Playwright passou a permitir `API_DISABLE_INCOMPATIBLE_DB_REPOS=0`, habilitando validacao da mesma jornada com PostgreSQL real.
- A migration `0047_commissions` foi corrigida para alinhar `staff_id` ao tipo `UUID` da tabela `staff`.
- A migration `0053_laboratory_result_release_signature` passou a criar as tabelas laboratoriais operacionais compativeis com os repositorios reais antes de aplicar metadados de assinatura.
- A jornada 360 foi reexecutada com `persistenceMode: "database"` e repositórios reais habilitados.
- A jornada recebeu uma spec mobile visual em viewport `390x844`, cobrindo Busca Mestre, cockpit 360 e recepcao com screenshots de artefato e verificacao de ausencia de overflow horizontal.
- A jornada 360 foi promovida para gate CI dedicado via `pnpm test:e2e:spa:360`, com execucao explicita das specs funcional e mobile e passo bloqueante no workflow `test-e2e-spa`.
- O gate foi expandido para `pnpm test:e2e:spa:enterprise`, somando Dashboard Executivo Premium e Motor Enterprise de Relatorios ao mesmo bloqueio E2E.

## Evidencias tecnicas

- `e2e/spa/master-search-360-reception.spec.ts`
- `apps/api/src/server.ts`
- `playwright-spa.config.ts`
- `infra/scripts/run-e2e-spa.sh`
- `e2e/spa/master-search-360-mobile.spec.ts`
- `.github/workflows/ci.yml`
- `package.json`
- `e2e/spa/enterprise-surfaces-gate.spec.ts`
- `packages/db/migrations/0047_commissions.sql`
- `packages/db/migrations/0053_laboratory_result_release_signature.sql`
- `apps/spa/src/pages/master-search/MasterSearchPage.vue`
- `apps/spa/src/pages/patients/PatientDetailPage.vue`
- `apps/spa/src/pages/reception/ReceptionGatewayPage.vue`
- `apps/spa/src/pages/scheduling/QueuePage.vue`

## Validacao executada

- `npx playwright install chromium` - instalou o browser necessario para o runner local.
- `pnpm --filter @cvg-his-v2/spa build` - build da SPA concluido.
- `pnpm --filter @cvg-his-v2/api build` - build da API concluido apos correcao do fallback preventivo.
- `npx playwright test --config playwright-spa.config.ts e2e/spa/master-search-360-reception.spec.ts` - 4/4 testes passando.
- `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/cvg_his_v2_test node infra/scripts/prepare-test-db.mjs` - migrations aplicadas com sucesso ate `0054_enterprise_rls_gap_closure`.
- `API_DISABLE_INCOMPATIBLE_DB_REPOS=0 E2E_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/cvg_his_v2_test npx playwright test --config playwright-spa.config.ts e2e/spa/master-search-360-reception.spec.ts` - 4/4 testes passando com `persistenceMode: "database"`.
- `pnpm validate:rls` - cobertura RLS validada em 96/96 tabelas tenant apos as tabelas laboratoriais adicionadas.
- `npx playwright test --config playwright-spa.config.ts e2e/spa/master-search-360-mobile.spec.ts` - 1/1 teste passando em viewport mobile com screenshots de Busca Mestre, cockpit 360 e recepcao.
- `pnpm test:e2e:spa:360` - 5/5 testes passando localmente.
- `pnpm test:e2e:spa:enterprise` - 7/7 testes passando localmente.
- Parse YAML de `.github/workflows/ci.yml` concluido com sucesso.

Observacao: a primeira tentativa com PostgreSQL real revelou gaps de migration em comissoes e laboratorio. Apos os ajustes, o banco de teste subiu saudavel em `127.0.0.1:5433`, o schema foi preparado e a API inicializou com repositórios reais.

## Impacto no Premium Enterprise

A cobertura deixa de depender apenas de testes unitarios dos componentes e passa a provar a navegacao operacional real entre busca federada, cockpit 360, decisao contextual da recepcao e preparacao da esteira.

## Proximos passos recomendados

- Executar o pipeline remoto e consolidar evidencias de release candidate.
