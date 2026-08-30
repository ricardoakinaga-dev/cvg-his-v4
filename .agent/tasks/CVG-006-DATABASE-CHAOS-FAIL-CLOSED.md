# CVG-006-DATABASE-CHAOS-FAIL-CLOSED — falha de banco sem fallback destrutivo

**Status:** `PASS_BOUNDED`; o parent CVG-006 permanece `TODO/OPEN`.
**Stage/activity:** `VERIFY` / `RECONCILE`
**Owner:** root integrator com TDD, revisão independente e prova local
**Parent:** CVG-006 — acessibilidade, performance, deploy e recovery
**Tier/risk/blast radius:** `T4_CRITICAL` / `CRITICAL` / `CROSS_SYSTEM`
**Priority:** `P0` — risco de perda ou corrupção de dados
**Authority:** `.agent/authority.jsonl#AUTH-CVG-006-DATABASE-CHAOS-FAIL-CLOSED-IR-001`
**Implementation-ready gate:** `.agent/gates/implementation-ready-CVG-006-database-chaos-fail-closed.json`

## Gap confirmado

O experimento `database-failure` alterava o estado operacional para
`persistenceMode=in-memory`, e os runbooks orientavam o operador a aceitar
escritas em memória durante uma indisponibilidade PostgreSQL. Isso misturava o
fallback deliberado de bootstrap local com uma falha de uma instalação que
estava usando banco, podendo anunciar uma continuidade que não é durável.

## Contrato congelado

1. Adicionar `unavailable` ao contrato de `PersistenceMode`. Quando o
   experimento `database-failure` estiver ativo, um runtime que estava em modo
   `database` deve expor `databaseHealthy=false`, `persistenceMode=unavailable`
   e `productionReady=false`; não pode ser convertido para `in-memory`.
2. `/health` deve manter a semântica de transporte atual (`200` com `ok=false`
   quando degradado), `/ready` e `/health/ready` devem retornar `503`, e
   `/live` deve continuar independente e retornar `200`. Nenhuma resposta
   deve indicar que operações clínicas/financeiras serão persistidas em memória.
3. Durante a falha simulada, a fronteira HTTP deve rejeitar mutações
   autenticadas de tenant e webhooks duráveis antes do dispatcher/body handler,
   com `503 DATABASE_PERSISTENCE_UNAVAILABLE`; leituras e probes permanecem
   disponíveis.
4. Métricas, estado operacional, resposta de listagem de experimentos e
   OpenAPI devem usar o valor `unavailable` de forma consistente. O fallback
   `in-memory` permanece permitido somente quando o runtime local foi
   explicitamente inicializado sem banco; este slice não remove esse modo de
   desenvolvimento/teste já existente.
5. Em ambientes `production`, `prod`, `staging` ou `stage`, os endpoints HTTP
   de `POST /chaos/experiments/:id/start|stop` devem rejeitar mutações antes de
   executar o experimento. A listagem autenticada continua somente leitura.
   A resposta é estável e não expõe segredo, configuração ou stack trace.
6. O experimento e os runbooks devem descrever indisponibilidade, contenção,
   manutenção e recuperação do banco; não devem prometer fila ou escrita em
   memória, retorno automático sem confirmação, ou aceitar perda de dados.
7. A prova local deve cobrir estado puro, métricas, saúde, rejeição HTTP de
   mutações clínicas/financeiras e webhook em ambiente de teste, os aliases
   de readiness/liveness, rejeição HTTP em ambiente production-like e
   contrato estático dos runbooks/OpenAPI. Deve demonstrar que iniciar/parar
   o experimento fora de production-like não cria uma rota de persistência
   alternativa.
8. Não estão autorizados neste slice: matar banco real, target/staging/
   produção, provider, credenciais, deploy, alteração de schema, dados reais,
   mudança de módulos clínicos/financeiros ou promoção de readiness/release.

## TDD e Quality Bar

### RED

- O estado operacional rejeita `in-memory` durante `database-failure` e usa
  `unavailable`.
- A listagem e a saúde deixam de reportar `in-memory` para a falha simulada.
- A métrica e o contrato OpenAPI reconhecem `unavailable`.
- A mutação HTTP é rejeitada em `production` sem iniciar/parar o experimento.
- O runbook não instrui escrita durável em memória ou perda aceita.

### GREEN e verificação

- Unit/API/observability e contratos estáticos passam.
- A fronteira HTTP rejeita mutações antes de validação/execução do handler e
  não deixa webhooks públicos duráveis serem reconhecidos como aceitos.
- Typecheck, build, segurança, cobertura oficial e regressão da suíte existente
  passam sem alterar o fallback local explicitamente suportado.
- Uma revisão independente confirma que o estado de falha é fail-closed e que
  o guard de ambiente não pode ser contornado pela rota HTTP coberta.

## Resultado reconciliado — 2026-08-27

O slice foi reconciliado como `PASS_BOUNDED`, com residual `HIGH`. O runtime
configurado para PostgreSQL agora projeta `unavailable` durante
`database-failure`, fecha readiness sem converter a instalação para memória e
rejeita mutações clínicas/financeiras e webhooks duráveis com
`503 DATABASE_PERSISTENCE_UNAVAILABLE` antes do dispatcher. `/health` mantém o
transporte `200` com `ok=false`, `/ready` e `/health/ready` retornam `503` e
`/live` permanece independente em `200`. Start/stop HTTP de caos é bloqueado
em ambientes production-like.

Evidência fresca: contrato focalizado `77/77`, API `414/414`, suíte raiz
`pnpm test` com exit `0`, cobertura oficial `2.021 passados / 1 skip` em
`80,48%` statements, `80,23%` branches e `87,76%` functions, além de
typecheck, build, lint, security, OpenAPI, RLS, migration-source,
deploy-surface, Helm estático e diff hygiene. A revisão independente foi
`CONDITIONAL`, sem Critical/High, e não é aprovação de produção.

Artefatos: `.agent/gates/verified-CVG-006-database-chaos-fail-closed.json`,
`.agent/artifacts/CVG-006-database-chaos-fail-closed-2026-08-27.md` e os
registros `VFY-CVG-006-DATABASE-CHAOS-FAIL-CLOSED-*`.

## Exclusões e risco residual

Este resultado é `PASS_BOUNDED` apenas para o modelo local do experimento,
contratos de saúde/métricas, contenção HTTP e documentação. Não prova
isolamento de banco em ambiente alvo, backup/restore, RTO/RPO, failover,
recovery automatizado, jobs em execução, persistência real ou release. O
fallback in-memory de desenvolvimento continua sendo um risco separado e
exige uma decisão própria caso o produto passe a proibi-lo globalmente.

## Próxima ação

Manter este resultado bounded e o parent CVG-006/programa global em
`IN_PROGRESS/PARTIAL`. Selecionar somente o próximo gap com autoridade própria;
preservar paridade Vetus, provider/homologação laboratorial e fiscal,
target/RLS, restore/RTO-RPO, worker distribuído, acessibilidade, CI remoto,
operações e release como gates abertos. Não interpretar este slice como
produção pronta nem alterar target/provider/credenciais/deploy sem nova
autoridade.
