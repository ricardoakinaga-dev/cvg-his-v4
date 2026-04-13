# RELATORIO DE AUDITORIA TECNICA — CVG-HIS-V2

**Data:** 09/04/2026
**Autor:** Codex
**Escopo:** leitura integral de `/docs/Enterprise`, auditoria do monorepo na raiz, validacao executavel do build, typecheck e testes criticos

---

## 1. Resumo Executivo

Foi realizada leitura e consolidacao dos **110 arquivos** de [`/docs/Enterprise`](./), totalizando aproximadamente **25.033 linhas** e **3.029 headings**, seguida de auditoria estrutural, arquitetural, operacional e executavel do monorepo `cvg-his-v2`.

**Veredito executivo:** o programa possui **base real e ampla de construcao**, com arquitetura modular, SPA madura, API extensa, conjunto expressivo de modulos de dominio e documentacao de alto nivel muito rica. Porem, o estado atual **nao sustenta integralmente** os scores de 87-88/100 declarados nos documentos executivos.

**Score tecnico estimado nesta auditoria:** **70-75/100**

**Motivo do downgrade em relacao ao material documental:**

- drift entre documentacao e estado executavel real;
- falha no `pnpm typecheck` e no `pnpm build` global por causa do modulo ML;
- falha ampla no `pnpm test:critical`, com mistura de problema ambiental e quebra real de contratos de dominio;
- multi-tenancy incompleto na borda HTTP e em partes da persistencia;
- exposicao OpenAPI real inferior ao que a documentacao afirma;
- seguranca ainda dependente de credenciais seed previsiveis no nucleo de autenticacao.

---

## 2. Metodologia

### 2.1 Fontes documentais analisadas

Foram lidos e consolidados os 110 documentos de `/docs/Enterprise`, abrangendo:

- documentos-mestre e planos executivos;
- blueprint, roadmap, backlog e scorecards;
- especificacoes por onda;
- baselines de CI, observabilidade, LGPD, RLS, OpenAPI, rate limiting e visual regression;
- runbooks;
- relatorios de executores e auditorias anteriores.

### 2.2 Fontes de codigo auditadas

Foram inspecionados:

- `apps/api`, `apps/spa`, `apps/web`, `apps/worker`;
- `packages/modules/*`;
- `packages/shared/*`;
- `packages/db`, `packages/tenant-context`, `packages/design-system`;
- `infra/*`, `.github/workflows/ci.yml`, `tests/*`.

### 2.3 Validacoes executadas

Foram executados:

- `pnpm typecheck`
- `pnpm build`
- `pnpm test:critical`

Resultado:

- `pnpm typecheck`: **FAIL**
- `pnpm build`: **FAIL**
- `pnpm test:critical`: **FAIL**

---

## 3. Estado Geral do Programa

## 3.1 O que esta forte

O projeto tem varios sinais claros de construcao real, nao apenas scaffolding:

- monorepo organizado com apps, modulos, shared packages, infra e testes;
- SPA Vue 3 com muitas telas, servicos, stores, componentes e build funcional;
- API HTTP ampla, cobrindo auth, MFA, LGPD, owners, patients, encounters, queue, billing, inventory, webhooks e outras areas;
- modulos de dominio separados por bounded context;
- design system com camada Vue, stories e testes;
- pipeline CI real com jobs de typecheck, openapi, build, testes e coverage;
- instrumentacao basica de saude, metricas e logs;
- modelagem de dados extensa.

## 3.2 O que esta fragil

Os principais problemas observados sao de **coerencia final**:

- a documentacao descreve um estado mais maduro do que a execucao sustenta;
- o modulo ML quebra o workspace global;
- a trilha multi-tenant existe conceitualmente, mas nao esta fechada na borda nem em toda a persistencia;
- ha duplicidade de camada de banco;
- a exposicao OpenAPI real nao representa a spec documentada;
- parte dos testes criticos nao e confiavel como gate operacional.

---

## 4. Achados Criticos

## 4.1 Documentacao executiva em desacordo com a realidade executavel

O tracker executivo afirma que `pnpm typecheck`, `pnpm build` e `pnpm test` estao em estado PASS:

- [`0100-EXECUTION-TRACKER.md#L31`](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/0100-EXECUTION-TRACKER.md#L31)

Na verificacao desta auditoria:

- `pnpm typecheck` falhou em `@cvg-his-v2/module-ml`;
- `pnpm build` falhou em `@cvg-his-v2/module-ml`;
- `pnpm test:critical` falhou com 161 testes falhos e 8 passando.

Conclusao: o projeto tem progresso real, mas a governanca documental esta **superestimando maturidade operacional**.

## 4.2 Modulo ML quebra o workspace global

O build e o typecheck do monorepo falham por problemas concretos no modulo ML:

- incompatibilidade de contrato em [`feature-store.service.ts#L82`](/root/.openclaw/workspace/cvg-his-v2/packages/modules/ml/src/feature-store.service.ts#L82)
- imports quebrados em [`database-feature.repository.ts#L6`](/root/.openclaw/workspace/cvg-his-v2/packages/modules/ml/src/repositories/database-feature.repository.ts#L6)
- imports quebrados e erros de query em [`database-model.repository.ts#L6`](/root/.openclaw/workspace/cvg-his-v2/packages/modules/ml/src/repositories/database-model.repository.ts#L6)

Impacto:

- invalida o claim de workspace plenamente verde;
- impede considerar o programa como build-stable;
- contamina a confianca em qualquer score global.

## 4.3 Multi-tenancy incompleto na borda da API

No runtime HTTP real, a API injeta tenant context com `accountId: 'pending'`:

- [`apps/api/src/server.ts#L233`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts#L233)

Porem o middleware de tenant exige explicitamente `x-account-id`:

- [`packages/tenant-context/src/middleware.ts#L8`](/root/.openclaw/workspace/cvg-his-v2/packages/tenant-context/src/middleware.ts#L8)

E a SPA nao envia `x-account-id` nem `x-tenant-id`:

- [`apps/spa/src/services/api.ts#L40`](/root/.openclaw/workspace/cvg-his-v2/apps/spa/src/services/api.ts#L40)

Impacto:

- isolamento multi-tenant depende de estado incompleto;
- risco de comportamento inconsistente em queries dependentes de contexto;
- distancia relevante entre blueprint enterprise e implementacao efetiva.

## 4.4 Persistencia com accountId hardcoded em fluxo clinico central

No repositorio de patients/owner links, `accountId` e fixado em `acc_cvg_demo`:

- [`database-patient.repository.ts#L189`](/root/.openclaw/workspace/cvg-his-v2/packages/modules/patients/src/repositories/database-patient.repository.ts#L189)

Impacto:

- quebra a confianca no isolamento por tenant;
- compromete auditoria de LGPD, RLS e segregacao de contas;
- e incompatível com padrao enterprise multi-tenant.

## 4.5 OpenAPI runtime nao corresponde ao OpenAPI documentado

O documento OpenAPI premium afirma 107 paths e exposicao real via `/openapi.json` e `/openapi.yaml`:

- [`1050-API-PREMIUM-OPENAPI.md#L16`](/root/.openclaw/workspace/cvg-his-v2/docs/Enterprise/1050-API-PREMIUM-OPENAPI.md#L16)

Mas o runtime serve um JSON minimo com `paths: {}`:

- [`apps/api/src/server.ts#L291`](/root/.openclaw/workspace/cvg-his-v2/apps/api/src/server.ts#L291)

Nao foi encontrada exposicao efetiva de `/openapi.yaml` no servidor.

Impacto:

- quebra do contrato API-first;
- documentacao de integracao pode induzir terceiros ao erro;
- CI valida o arquivo, mas o runtime nao publica a spec real entregue.

## 4.6 Credenciais seed previsiveis no nucleo de autenticacao

O modulo de usuarios possui fallback explicito para senhas seed previsiveis:

- [`packages/modules/users/src/index.ts#L36`](/root/.openclaw/workspace/cvg-his-v2/packages/modules/users/src/index.ts#L36)
- [`packages/modules/users/src/index.ts#L53`](/root/.openclaw/workspace/cvg-his-v2/packages/modules/users/src/index.ts#L53)

Impacto:

- aceitavel apenas em ambiente de desenvolvimento muito controlado;
- perigoso se vazar para staging/producao;
- reduz a nota de hardening de auth.

---

## 5. Achados Altos

## 5.1 Testes criticos falham por mistura de ambiente e dominio

O `pnpm test:critical` falhou amplamente.

Parte da falha vem de autenticacao do PostgreSQL no ambiente local de auditoria, mas houve tambem falhas reais em contratos de dominio:

- expectativa assíncrona mal modelada em [`foundational.test.ts#L35`](/root/.openclaw/workspace/cvg-his-v2/tests/integration/foundational.test.ts#L35)
- encadeamento scheduling -> queue -> encounter inconsistente em [`foundational.test.ts#L221`](/root/.openclaw/workspace/cvg-his-v2/tests/integration/foundational.test.ts#L221)

Impacto:

- reduz confiabilidade da suite como gate;
- dificulta diferenciar erro do produto de erro de setup;
- enfraquece claims de “fundacao validada”.

## 5.2 Setup de testes degrada silenciosamente

O setup global faz warning e segue quando o banco nao sobe:

- [`tests/setup/global-setup.ts#L6`](/root/.openclaw/workspace/cvg-his-v2/tests/setup/global-setup.ts#L6)

Impacto:

- o pipeline local pode continuar em estado parcialmente invalido;
- a telemetria do teste fica enganosa;
- o feedback loop fica ruidoso.

## 5.3 Divergencia entre ambiente local e CI para banco de testes

Localmente, o fallback usa `localhost:5432`:

- [`tests/setup/env.ts#L3`](/root/.openclaw/workspace/cvg-his-v2/tests/setup/env.ts#L3)

No CI, o workflow sobe Postgres em `5433` e injeta as envs explicitamente:

- [`ci.yml#L161`](/root/.openclaw/workspace/cvg-his-v2/.github/workflows/ci.yml#L161)

Impacto:

- maior chance de “passa no CI, falha localmente” ou o inverso;
- aumenta o custo operacional para contribuidores.

## 5.4 Event bus ainda nao materializa o patamar enterprise prometido

O modulo existe e persiste eventos, mas `processPending` apenas conclui o ciclo do outbox sem integracao efetiva com barramento externo:

- [`packages/modules/event-bus/src/event-bus.service.ts#L131`](/root/.openclaw/workspace/cvg-his-v2/packages/modules/event-bus/src/event-bus.service.ts#L131)

Impacto:

- atende parcialmente MVP;
- nao sustenta sozinho o discurso de Redis/Kafka/event backbone.

---

## 6. Achados Medios

- duplicidade arquitetural entre [`packages/shared/database/src/client.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/shared/database/src/client.ts) e [`packages/db/src/connection.ts`](/root/.openclaw/workspace/cvg-his-v2/packages/db/src/connection.ts);
- artefatos gerados e `dist/` commitados no repositório;
- inconsistência entre storage keys da SPA e do shared auth SDK:
  - SPA usa `cvg-his-v2:access_token` em [`apps/spa/src/stores/auth.ts#L4`](/root/.openclaw/workspace/cvg-his-v2/apps/spa/src/stores/auth.ts#L4)
  - SDK usa `cvg_his_v2_access_token` em [`packages/shared/auth-sdk/src/index.ts#L22`](/root/.openclaw/workspace/cvg-his-v2/packages/shared/auth-sdk/src/index.ts#L22)
- coverage documentado ainda depende de thresholds muito baixos;
- parte do runtime faz fallback para in-memory, o que ajuda desenvolvimento, mas mascara incompletude operacional.

---

## 7. Avaliacao por Area

| Area | Avaliacao | Nota Estimada |
|------|-----------|---------------|
| Arquitetura modular | boa | 8.5/10 |
| Frontend SPA | forte | 8.5/10 |
| API backend | ampla, mas inconsistente em pontos-chave | 7.5/10 |
| Multi-tenancy / isolamento | incompleto | 5.5/10 |
| Banco / persistencia | amplo, mas com duplicidade e drift | 7.0/10 |
| Seguranca de auth | media | 6.5/10 |
| Qualidade executavel | abaixo do declarado | 6.0/10 |
| Testes / gates | heterogeneos | 6.5/10 |
| Documentacao | muito rica, mas com drift | 8.0/10 |
| Operacao / CI | razoavel, ainda nao totalmente confiavel | 7.0/10 |

---

## 8. Leitura de Construcao do Programa

O CVG-HIS-V2 **nao e um projeto vazio nem superficial**. Existe construcao real, extensa e tecnicamente relevante. O que falta hoje nao e “fazer nascer o sistema”, e sim **fechar coerencia, endurecer fundacoes e alinhar declaracao com evidencia**.

O programa esta em um ponto tipico de projetos que cresceram rapido:

- arquitetura e documentacao avançaram;
- muitos modulos ja existem;
- a interface principal amadureceu;
- mas o fechamento de qualidade, tenancy, contratos e operacao ainda nao acompanhou por completo.

Em outras palavras: **o projeto esta perto de ser auditavel de verdade, mas ainda nao esta.**

---

## 9. Conclusao

### Veredito final

O programa tem **potencial enterprise real** e uma base melhor do que a media de repositórios em fase similar. Porem, o estado auditado hoje ainda apresenta desvios importantes que impedem classificá-lo como plenamente coerente, build-stable e audit-ready.

### Juizo final desta auditoria

- **Base tecnica:** forte
- **Maturidade operacional real:** media
- **Governanca documental:** forte, mas otimista demais
- **Prontidao para auditoria externa rigorosa:** parcial

### Prioridade imediata

As tres frentes de maior urgencia sao:

1. restaurar verdade executavel do workspace;
2. fechar multi-tenancy/account isolation;
3. alinhar runtime e documentacao oficial do sistema.

---

## 10. Proximo Passo Recomendado

Transformar esta auditoria em um **plano de remediacao priorizado por severidade e esforco**, com ordem exata de execucao para levar o projeto de “bom com drift” para “auditavel de verdade”.

