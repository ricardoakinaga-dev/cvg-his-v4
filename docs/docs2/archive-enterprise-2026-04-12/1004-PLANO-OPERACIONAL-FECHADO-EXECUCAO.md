# PLANO OPERACIONAL FECHADO DE EXECUCAO - CVG-HIS-V2

## Objetivo

Transformar a auditoria de 08/04/2026 em um plano de execucao fechado, com:

- backlog semanal priorizado
- ordem exata de implementacao
- dependencias tecnicas explicitas
- criterio de pronto por frente
- sequenciamento orientado a risco real do workspace

## Premissas

Este plano assume quatro verdades observadas no repositorio em 08/04/2026:

1. o programa tem base tecnica boa, mas ainda nao esta plenamente estavel ponta a ponta
2. existe drift entre parte da documentacao de status e o estado executavel do workspace
3. a Onda 1 esta majoritariamente forte, a Onda 2 esta madura, e a Onda 3 ainda esta parcial
4. qualquer expansao de escopo antes da estabilizacao real aumenta risco de regressao

## Regra central de execucao

`Fundacao executavel primeiro, expansao depois.`

Nao abrir frente nova de alto escopo enquanto os tres comandos abaixo nao estiverem estaveis de forma repetivel:

- `pnpm typecheck`
- `pnpm build`
- `pnpm test`

## Horizonte do plano

`8 semanas`

Esse horizonte e suficiente para:

- estabilizar o core
- fechar quality gates reais
- consolidar a Onda 2
- entrar na Onda 3 com recorte pragmático

## Frentes oficiais

| Sigla | Frente | Dono principal | Apoio |
|------|--------|----------------|-------|
| `CORE` | Build, typecheck, integridade do monorepo | `TL` + `BE` | `QA` |
| `QA` | Tests, coverage, regressao, gates | `QA` | `TL`, `BE`, `FE` |
| `API` | Backend, OpenAPI, auth, webhooks, integracoes | `BE` | `TL`, `SEC` |
| `FE` | SPA, design system, reducao do legado | `FE` | `QA`, `PO` |
| `PLAT` | CI, ambientes, observabilidade, release | `PLAT` | `BE`, `QA` |
| `SEC` | Hardening, MFA, trilha enterprise residual | `SEC` | `BE`, `TL` |
| `GOV` | Scorecard, status real, decisao de escopo | `PO` + `TL` | todos |

## Ordem exata de implementacao

### Fase 0 - Nao negociar

Antes de qualquer expansao:

1. estabilizar build recursivo
2. estabilizar typecheck recursivo
3. estabilizar testes recursivos
4. alinhar CI com o que roda localmente
5. so depois abrir backlog de expansao funcional

### Fase 1 - Fechar base executavel

1. corrigir erros de `module-auth`
2. confirmar saude recursiva do workspace
3. remover falsos verdes documentais
4. subir gates minimos de coverage

### Fase 2 - Consolidar release confiavel

1. estabilizar suites
2. consolidar observabilidade minima operacional
3. fechar auth hardening residual
4. travar ritual de status por evidencia

### Fase 3 - Consolidar Onda 2 de forma definitiva

1. elevar adocao do design system
2. classificar ou aposentar partes do `apps/web`
3. expandir E2E/visual na trilha principal

### Fase 4 - Entrar na Onda 3 com corte controlado

1. consolidar webhooks management
2. formalizar backbone de eventos
3. entregar primeira integracao externa de alto valor

## Backlog semanal priorizado

## Semana 1 - Estabilizacao do workspace

### Objetivo da semana

Fazer o repositorio voltar a um estado tecnicamente confiavel no fluxo recursivo.

### Itens P0

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S1-01 | Corrigir falhas de build em `module-auth` | `CORE` | nenhuma | `pnpm --filter @cvg-his-v2/module-auth build` verde |
| S1-02 | Corrigir falhas de typecheck recursivo | `CORE` | S1-01 | `pnpm typecheck` verde |
| S1-03 | Corrigir falha do run recursivo de testes | `QA` | S1-02 | `pnpm test` executavel sem queda precoce |
| S1-04 | Capturar baseline oficial do workspace | `GOV` | S1-01..03 | snapshot com status real |

### Itens P1

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S1-05 | Revisar dependencias cruzadas de pacotes | `CORE` | S1-01 | imports e manifests coerentes |
| S1-06 | Revisar scripts quebraveis de teste/build | `QA` | S1-03 | scripts consistentes entre pacotes |

### Ordem tecnica obrigatoria

1. `packages/modules/auth`
2. pacotes de dependencia direta do auth
3. run recursivo de typecheck
4. run recursivo de build
5. run recursivo de test

### Criterio de pronto

- `pnpm typecheck` passa
- `pnpm build` passa
- `pnpm test` nao falha nos primeiros pacotes
- status real registrado documentalmente

## Semana 2 - Quality gates reais

### Objetivo da semana

Parar de depender de "aparencia de estabilidade" e comecar a bloquear regressao de verdade.

### Itens P0

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S2-01 | Subir coverage thresholds de `0` para baseline minimo | `QA` | Semana 1 pronta | thresholds ativos |
| S2-02 | Padronizar execucao local x CI | `PLAT` | S2-01 | CI refletindo realidade local |
| S2-03 | Marcar testes flaky e corrigir os criticos | `QA` | Semana 1 pronta | suite mais previsivel |
| S2-04 | Definir gate oficial de merge interno | `GOV` | S2-01..03 | criterio claro de pronto tecnico |

### Itens P1

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S2-05 | Separar suites lentas, estaveis e experimentais | `QA` | S2-03 | pipeline mais legivel |
| S2-06 | Revisar relatorios de status antigos com drift | `GOV` | S2-04 | docs de status atualizados |

### Ordem tecnica obrigatoria

1. thresholds
2. suites flaky
3. pipeline CI
4. documentacao de gate

### Criterio de pronto

- coverage deixa de estar em `0`
- CI roda com gates coerentes
- lista de testes flaky fica reduzida e controlada
- merge gate documentado

## Semana 3 - Auth hardening e seguranca residual

### Objetivo da semana

Fechar os principais riscos residuais de autenticacao antes de abrir integracoes mais amplas.

### Itens P0

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S3-01 | Fechar backlog curto de hardening de auth | `SEC` + `API` | Semana 2 pronta | auth mais robusta |
| S3-02 | Revisar MFA atual vs lacunas enterprise | `SEC` | S3-01 | gap list objetiva |
| S3-03 | Consolidar rate limiting operacional nas rotas criticas | `SEC` + `API` | S3-01 | protecao real em endpoints chave |
| S3-04 | Atualizar OpenAPI das rotas de auth e seguranca | `API` | S3-01..03 | contrato coerente |

### Itens P1

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S3-05 | Checklist de readiness para WebAuthn/SSO futuro | `SEC` | S3-02 | backlog preparado |

### Ordem tecnica obrigatoria

1. corrigir comportamento real da auth
2. endurecer rate limiting
3. alinhar contratos
4. registrar lacunas enterprise futuras

### Criterio de pronto

- auth sem regressao em fluxo principal
- rate limiting aplicado em rotas sensiveis
- OpenAPI alinhada ao comportamento real
- backlog residual de seguranca classificado

## Semana 4 - Observabilidade, release e ritual de status

### Objetivo da semana

Fechar a base minima de operacao e impedir novo drift documental.

### Itens P0

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S4-01 | Validar stack minima de observabilidade em uso real | `PLAT` | Semana 3 pronta | metricas, health e logs checados |
| S4-02 | Definir alertas minimos de release e regressao | `PLAT` + `QA` | S4-01 | baseline operacional |
| S4-03 | Instituir update semanal por evidencia | `GOV` | S4-01 | governanca viva |
| S4-04 | Revisar scorecard com status real | `GOV` | S4-03 | nota real do programa |

### Itens P1

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S4-05 | Definir checklist de release interno | `PLAT` | S4-02 | release mais previsivel |

### Ordem tecnica obrigatoria

1. validar telemetria real
2. mapear alertas minimos
3. implantar ritual de status
4. atualizar scorecard

### Criterio de pronto

- stack minima de observabilidade validada
- scorecard deixa de ser narrativo e vira evidencial
- release interno tem checklist definido

## Semana 5 - Consolidacao da Onda 2

### Objetivo da semana

Transformar a maturidade da SPA em padrao operacional, e nao apenas em boa base tecnica.

### Itens P0

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S5-01 | Priorizar telas SPA fora do padrao DS | `FE` | Semana 4 pronta | backlog objetivo de adocao |
| S5-02 | Corrigir paginas de maior uso para DS-first | `FE` | S5-01 | uniformidade nas telas core |
| S5-03 | Classificar papeis do `apps/web` | `FE` + `TL` | S5-01 | manter, congelar ou aposentar |
| S5-04 | Reforcar E2E da trilha principal SPA | `QA` + `FE` | S5-02 | cobertura funcional ampliada |

### Itens P1

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S5-05 | Formalizar backlog de Storybook ou alternativa documental | `FE` | S5-01 | trilha DS mais madura |

### Ordem tecnica obrigatoria

1. inventario DS
2. telas de maior uso
3. decisao sobre legado
4. E2E principal

### Criterio de pronto

- paginas core da SPA mais uniformes
- estrategia do legado definida
- E2E da trilha principal fortalecida

## Semana 6 - Webhooks management e API premium minima

### Objetivo da semana

Fechar a parte mais madura da Onda 3 antes de mexer em integracao externa maior.

### Itens P0

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S6-01 | Consolidar fluxo de gestao de webhooks | `API` + `FE` | Semana 5 pronta | cadastro, edicao, listagem e testes confiaveis |
| S6-02 | Endurecer OpenAPI para a trilha de webhooks | `API` | S6-01 | contrato consistente |
| S6-03 | Criar criterios de aceite de API premium minima | `API` + `GOV` | S6-02 | baseline de entrada da Onda 3 |

### Itens P1

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S6-04 | Preparar API key management no backlog tecnico | `API` | S6-03 | proxima trilha definida |

### Ordem tecnica obrigatoria

1. UX e fluxo de webhooks
2. testes
3. contrato OpenAPI
4. baseline de API premium

### Criterio de pronto

- webhook management confiavel
- trilha webhooks fechada ponta a ponta
- baseline de API premium formalizada

## Semana 7 - Backbone de eventos pragmático

### Objetivo da semana

Criar a fundacao real da Onda 3 sem tentar implantar a versao final enterprise inteira de uma vez.

### Itens P0

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S7-01 | Definir arquitetura alvo curta de eventos | `API` + `TL` | Semana 6 pronta | decisao tecnica registrada |
| S7-02 | Expandir `packages/events` para catalogo e contratos reais | `API` | S7-01 | base reutilizavel de eventos |
| S7-03 | Escolher 2-3 dominios para backbone inicial | `API` | S7-01 | recorte realista |
| S7-04 | Implementar mecanismo inicial de publicacao consistente | `API` | S7-02..03 | eventos reais emitidos |

### Itens P1

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S7-05 | Preparar backlog de outbox pattern por dominio | `API` | S7-04 | proxima fase pronta |

### Ordem tecnica obrigatoria

1. decisao arquitetural
2. contratos/event catalog
3. dominios pilotos
4. publicacao real

### Criterio de pronto

- existe backbone de eventos minimo e real
- dominios pilotos publicam eventos
- backlog de outbox fica pronto para ciclo seguinte

## Semana 8 - Primeira integracao externa de alto valor

### Objetivo da semana

Entrar na Onda 3 com uma integracao de negocio real e controlada.

### Itens P0

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S8-01 | Escolher a integracao numero 1 | `PO` + `TL` + `API` | Semana 7 pronta | decisao fechada |
| S8-02 | Implementar backbone tecnico da integracao escolhida | `API` | S8-01 | fluxo interno funcional |
| S8-03 | Monitorar a integracao com telemetria minima | `PLAT` + `API` | S8-02 | logs e metricas reais |
| S8-04 | Homologar com testes e runbook minimo | `QA` + `API` + `PLAT` | S8-02..03 | operacao assistida interna |

### Itens P1

| ID | Item | Frente | Dependencia | Saida esperada |
|----|------|--------|-------------|----------------|
| S8-05 | Atualizar plano enterprise com novo baseline real | `GOV` | S8-04 | novo marco executivo |

### Ordem tecnica obrigatoria

1. decidir integracao
2. implementar backbone
3. observar
4. homologar
5. atualizar baseline

### Criterio de pronto

- uma integracao externa real em ambiente interno controlado
- observabilidade minima ativa
- runbook minimo publicado
- plano enterprise revisado

## Dependencias cruzadas

| Frente | Depende de | Motivo |
|--------|------------|--------|
| `QA` | `CORE` | sem estabilidade recursiva, o gate perde credibilidade |
| `SEC` | `CORE` | auth e hardening nao podem ser tratados sobre build quebrada |
| `FE` | `QA` | consolidacao da SPA depende de regressao confiavel |
| `API` Onda 3 | `CORE`, `QA`, `SEC` | integracoes nao devem abrir antes da base ficar estavel |
| `PLAT` | `CORE`, `QA` | pipeline e release precisam refletir a realidade executavel |
| `GOV` | todas | status so vale se houver evidencia tecnica |

## Critério de pronto por frente

### `CORE`

- run recursivo verde
- manifests coerentes
- sem erro escondido por execucao isolada

### `QA`

- thresholds ativos
- suites classificadas
- E2E principal executavel

### `API`

- OpenAPI coerente com implementacao
- webhooks estaveis
- primeira trilha de eventos real

### `FE`

- telas core alinhadas ao DS
- backlog do legado classificado
- regressao principal coberta

### `PLAT`

- CI alinhado ao local
- checklist de release definido
- observabilidade minima validada

### `SEC`

- auth hardening residual tratado
- MFA e rate limiting em baseline operacional
- lacunas enterprise futuras explicitadas

### `GOV`

- scorecard atualizado por evidencia
- relatorios de status sem drift grave
- decisao de escopo registrada por ciclo

## Itens explicitamente fora deste ciclo

- AI/ML de producao
- SOC2 formal
- chaos engineering
- motor fiscal completo
- PWA/offline completo
- SSO/OIDC completo
- WebAuthn completo

Esses itens nao entram neste plano de 8 semanas porque ainda dependem de:

- estabilidade executavel
- qualidade de release
- maturidade de eventos
- disciplina operacional mais forte

## KPIs de acompanhamento do ciclo

| KPI | Meta Semana 2 | Meta Semana 4 | Meta Semana 8 |
|-----|---------------|---------------|---------------|
| `pnpm typecheck` | verde | verde estavel | verde estavel |
| `pnpm build` | verde | verde estavel | verde estavel |
| `pnpm test` | executavel | estavel | estavel |
| Coverage gate | baseline ativa | consolidada | ajustada por dominio |
| E2E principal | baseline | reforcada | cobrindo trilha principal |
| Aderencia docs x repo | melhorando | governada | status confiavel |
| Webhooks | estavel | estavel | integrado ao plano Onda 3 |
| Eventos reais | nenhum | nenhum | backbone inicial ativo |
| Integracao externa | nenhuma | nenhuma | 1 interna assistida |

## Ritual operacional recomendado

### Segunda-feira

- revisar backlog da semana
- confirmar bloqueios
- validar dependencias

### Quarta-feira

- revisar risco tecnico
- cortar escopo se necessario
- impedir abertura de frente prematura

### Sexta-feira

- fechar evidencias
- atualizar score real
- decidir entrada ou nao da proxima semana

## Regra de escalacao

Escalar imediatamente para `TL` e `PO` quando:

- um item P0 ficar bloqueado por mais de 2 dias uteis
- a semana perder o objetivo principal
- aparecer novo drift grave entre status documental e estado do repo
- uma integracao for aberta sem observabilidade minima

## Resumo executivo final

Este plano fecha a ordem correta de construcao para o momento atual do programa:

1. estabilizar o workspace de verdade
2. travar quality gates reais
3. fechar seguranca residual e release minimo confiavel
4. consolidar Onda 2
5. entrar na Onda 3 com webhooks, eventos e uma integracao realista

Se essa ordem for respeitada, o programa ganha previsibilidade e reduz bastante o risco de crescer sobre uma base irregular. Se a equipe inverter a ordem e tentar acelerar integracoes ou iniciativas mais sofisticadas antes da estabilizacao, o custo de retrabalho tende a subir rapidamente.
