# 480 - Plano de Execucao para Nota 85+/100 e ERP Enterprise

**Status:** vivo
**Data de validacao:** 2026-03-31
**Horizonte do plano:** consolidacao final do produto e da operacao
**Objetivo central:** levar o CVG-HIS V2 a `85+/100` em maturidade documental, tecnica, operacional e funcional

## 1. Resumo executivo

O repositorio ja tem base relevante:

- monorepo canonico estabelecido
- apps ativos de `api`, `web` e `worker`
- 20 modulos implementados
- superficie funcional ampla
- trilha inicial de testes
- artefatos reais de deploy

O que falta para chegar a `85+/100` nao e recomecar. O que falta e consolidar.

Este plano organiza essa consolidacao em entregas objetivas, com metrica, criterio de aceite e sequencia de execucao. O alvo final e um ERP veterinario enterprise com:

- documentacao viva confiavel
- arquitetura coerente com o codigo
- trilha unica e clara de banco/deploy
- gates repetiveis
- cobertura adequada dos fluxos criticos
- modulos enterprise sustentados por operacao real

## 2. Definicao de nota 85+/100

O projeto sera considerado em `85+/100` quando os 6 eixos abaixo estiverem dentro do alvo:

| Eixo | Peso | Nota alvo |
| --- | ---: | ---: |
| Documentacao viva | 15 | 90 |
| Arquitetura e coerencia estrutural | 15 | 85 |
| Persistencia, migrations e deploy | 20 | 85 |
| Qualidade e testes | 20 | 80 |
| Cobertura funcional enterprise | 20 | 85 |
| Operacao, observabilidade e release | 10 | 80 |

### Formula

`nota_final = soma(peso x nota_do_eixo) / 100`

### Regra adicional

Mesmo com media ponderada >= 85, o projeto nao fecha a meta se algum dos eixos abaixo estiver abaixo de 75:

- persistencia, migrations e deploy
- qualidade e testes
- cobertura funcional enterprise

## 3. Estado de partida

### Pontos fortes atuais

- arquitetura canonica identificada
- apps vivos e funcionais
- documentacao viva da raiz saneada
- modulos de negocio ja implementados
- testes existentes em varios niveis

### Pontos fracos atuais

- duas historias de persistencia/migrations coexistem
- deploy e docs ainda tem zonas de ambiguidade
- `test:critical` depende de banco alinhado
- documentacao por modulo ainda e desigual
- E2E nao cobre toda a superficie enterprise

## 4. Scorecard de controle

Este scorecard deve ser preenchido ao fim de cada onda.

| KPI | Estado inicial | Meta | Evidencia |
| --- | --- | --- | --- |
| Raiz `docs/` com apenas docs vivos | 17 arquivos vivos | manter <= 25 | `find docs -maxdepth 1 -type f` |
| Divergencias conhecidas entre docs e codigo nos apps canonicos | existe | 0 divergencias criticas | revisao dos docs `114`, `115`, `116`, `130`, `131` |
| Trilha oficial de migrations declarada e executavel | parcial | 1 trilha oficial | docs + script + ambiente |
| Script de cutover coerente com a trilha oficial | parcial | 100% coerente | `infra/scripts/cutover-v2.sh` |
| Gates documentados com pre-requisitos claros | parcial | 100% | docs `460` + README raiz |
| `pnpm typecheck` | existente | verde | execucao |
| `pnpm build` | existente | verde | execucao |
| `pnpm test` | existente | verde | execucao |
| `pnpm test:critical` com banco preparado | parcial | verde | execucao |
| `pnpm release:check` com ambiente preparado | parcial | verde | execucao |
| Fluxos enterprise cobertos por validacao automatizada | parcial | >= 10 fluxos criticos | testes + relatorio |
| Modulos subdocumentados com doc viva minima | baixo | 9/9 | docs novos ou consolidados |
| Ambiguidade de portas externas em deploy | existe | 0 | compose + docs + proxy |
| Checklist de cutover aderente ao ambiente real | parcial | 100% | `131` + script |
| Observabilidade minima de producao | parcial | health + ready + live + logs + release criteria | docs + execucao |

## 5. Onda 1 - Coerencia de base

### Objetivo

Eliminar as ambigudades mais perigosas entre documentacao, banco, deploy e apps canonicos.

### Entregas obrigatorias

1. Decisao oficial de trilha de migrations
2. Atualizacao do script de cutover para a trilha oficial
3. Alinhamento entre `docker-compose.v2.yml`, proxy e docs
4. Documentacao operacional e arquitetural sem divergencia critica
5. Documento de validacao da onda com evidencias

### Tarefas

#### T1. Escolher a trilha oficial de persistencia

Saida esperada:

- decisao registrada por ADR ou por atualizacao do documento `470`
- lista explicita do que e oficial e do que e legado ou transitorio

Aceite:

- nenhuma doc viva fala de uma historia diferente para banco
- scripts operacionais passam a apontar para a mesma historia

#### T2. Corrigir a ambiguidade de portas

Saida esperada:

- `docker-compose.v2.yml`
- `130`
- `131`
- proxy

tudo contando a mesma historia sobre:

- porta externa do web
- porta externa da api
- destino do proxy

Aceite:

- 0 divergencias entre compose, docs e proxy

#### T3. Revisar artefatos dos apps canonicos

Saida esperada:

- docs dos apps sem linguagem de skeleton
- estado real explicitado

Aceite:

- 0 referencias vivas aos apps canonicos como baseline nao implementado

### Metricas da onda 1

| Metrica | Meta |
| --- | --- |
| divergencias criticas banco/deploy/docs | 0 |
| historias de migrations tratadas como oficiais na trilha viva | 1 |
| documentos operacionais divergentes | 0 |

### Nota esperada apos onda 1

- documentacao viva: `90`
- persistencia/deploy: `72` -> `82`
- arquitetura/coerencia: `85`

## 6. Onda 2 - Gates e repetibilidade

### Objetivo

Transformar os gates atuais em algo reproduzivel por equipe, CI local e operacao de release.

### Entregas obrigatorias

1. Pre-requisitos de banco para testes documentados
2. Script ou rotina de bootstrap de ambiente de teste estabilizada
3. `test:critical` executavel em ambiente preparado
4. Relatorio de leitura de falhas dos gates

### Tarefas

#### T4. Fechar a historia de banco de teste

Saida esperada:

- documentar `DATABASE_URL_TEST`
- documentar credenciais e fluxo de preparacao
- alinhar isso com `tests/setup/env.ts`

Aceite:

- qualquer pessoa da equipe consegue entender como preparar o banco sem ler codigo fonte disperso

#### T5. Stabilizar o gate critico

Saida esperada:

- `pnpm test:critical` verde com ambiente preparado
- evidencias de execucao

Aceite:

- sem falhas por desconhecimento de ambiente
- falhas, quando ocorrerem, sao de produto e nao de setup oculto

#### T6. Definir gate minimo de release enterprise

Saida esperada:

- checklist curta do que precisa passar para merge/release/cutover

Aceite:

- `typecheck`
- `build`
- `test`
- `test:critical`
- checks operacionais minimos

### Metricas da onda 2

| Metrica | Meta |
| --- | --- |
| gates com pre-requisitos documentados | 100% |
| `test:critical` verde em ambiente preparado | sim |
| causa raiz de falha de gate identificavel em ate 5 min | sim |

### Nota esperada apos onda 2

- qualidade e testes: `60-70` -> `78-82`
- operacao/release: `70` -> `78`

## 7. Onda 3 - Cobertura funcional enterprise

### Objetivo

Garantir que os modulos ja implementados sustentem a narrativa de um ERP enterprise, com cobertura minima de dominio, operacao e governanca.

### Entregas obrigatorias

1. Documentacao viva minima dos modulos subrepresentados
2. Matriz de fluxos enterprise prioritarios
3. Validacao automatizada dos fluxos mais criticos
4. Lista fechada de gaps funcionais remanescentes

### Modulos foco

- `access-control`
- `attachments`
- `billing`
- `notifications`
- `scheduling`
- `staff`
- `surgery`
- `triage`
- `users`

### Tarefas

#### T7. Criar doc viva minima por modulo enterprise subdocumentado

Cada modulo deve ter ao menos:

- objetivo
- superficie funcional
- dependencias
- regras de negocio principais
- riscos conhecidos
- situacao de teste

Aceite:

- 9 de 9 modulos com documentacao minima viva

#### T8. Priorizar 10 fluxos criticos enterprise

Lista minima recomendada:

1. login -> sessao -> permissao
2. tutor -> paciente -> atendimento
3. atendimento -> triagem -> prontuario
4. atendimento -> internacao -> leito
5. atendimento -> exames -> resultado
6. atendimento -> cirurgia -> acompanhamento
7. atendimento -> prescricao -> execucao
8. atendimento -> billing -> recebiveis
9. estoque -> consumo -> reflexo assistencial
10. atendimento -> alta -> auditoria/notificacao

Aceite:

- fluxos definidos com entrada, saida, modulos tocados e criterio de sucesso

#### T9. Automatizar o maximo viavel desses fluxos

Aceite:

- pelo menos 6 dos 10 fluxos com validacao automatizada
- os outros 4, se nao automatizados, com razao explicita e plano de fechamento

### Metricas da onda 3

| Metrica | Meta |
| --- | --- |
| modulos subdocumentados cobertos | 9/9 |
| fluxos enterprise priorizados | >= 10 |
| fluxos automatizados | >= 6 |
| gaps funcionais sem dono | 0 |

### Nota esperada apos onda 3

- cobertura funcional enterprise: `55-65` -> `82-86`
- documentacao viva: `90+`

## 8. Onda 4 - Endurecimento operacional

### Objetivo

Preparar o sistema para operacao real com criterio enterprise de release e suporte.

### Entregas obrigatorias

1. checklist de release consolidado
2. checklist de cutover validado
3. health/readiness/liveness tratados como criterio real
4. relatorio final de prontidao enterprise

### Tarefas

#### T10. Fechar leitura operacional dos servicos

Aceite:

- API com health, readiness e liveness documentados e verificados
- Web com validacao minima de disponibilidade
- Worker com criterio minimo de subida e observacao inicial

#### T11. Fechar criterio de rollback

Aceite:

- rollback operacional documentado
- sem passos ambiguos entre legado e V2

#### T12. Simular ou executar validacao de release

Aceite:

- evidencias guardadas
- checklist preenchido
- riscos residuais explicitados

### Metricas da onda 4

| Metrica | Meta |
| --- | --- |
| criterios de readiness definidos e usados | sim |
| cutover e rollback com roteiro coerente | sim |
| release checklist aplicado fim a fim | sim |

### Nota esperada apos onda 4

- operacao/observabilidade/release: `80+`
- persistencia/deploy: `85+`

## 9. Onda 5 - Fechamento para ERP enterprise

### Objetivo

Sair do estado "sistema funcional com lacunas" para "ERP veterinario enterprise operavel".

### Definicao pratica de ERP enterprise neste contexto

O sistema precisa sustentar, de forma coerente:

- cadastro mestre
- atendimento clinico
- prontuario
- internacao
- exames
- cirurgia
- prescricoes e execucao
- billing
- estoque
- usuarios, equipe e controle de acesso
- notificacoes
- auditoria
- deploy e operacao controlados

### Entregas obrigatorias

1. score final preenchido
2. riscos residuais classificados
3. backlog pos-85 separado de bloqueadores reais
4. documento de veredito final

### Metricas da onda 5

| Metrica | Meta |
| --- | --- |
| nota final ponderada | >= 85 |
| eixos criticos abaixo de 75 | 0 |
| bloqueadores de release enterprise | 0 |
| riscos residuais altos sem plano | 0 |

## 10. Plano de entregas por artefato

| Entrega | Tipo | Dono esperado | Evidencia de pronto |
| --- | --- | --- | --- |
| decisao oficial de migrations | doc + codigo | backend/platform | docs + script alinhados |
| cutover alinhado | script + doc | ops/platform | execucao validada |
| politica de portas e proxy | doc + infra | ops/web/api | compose + proxy + docs coerentes |
| pre-requisitos de testes | doc | quality/platform | guia curto e objetivo |
| gate critico estabilizado | execucao | quality/backend | `test:critical` verde |
| docs dos 9 modulos foco | doc viva | produto/engenharia | arquivos revisados |
| matriz de 10 fluxos criticos | doc + testes | quality/engenharia | lista fechada |
| 6 fluxos automatizados | codigo + testes | quality/engenharia | suite executavel |
| checklist de release | doc operacional | ops/tech lead | aplicado |
| veredito final 85+ | doc | tech lead | scorecard preenchido |

## 11. Riscos do plano

### R1. A equipe tentar subir a nota so com documentacao

Mitigacao:

- score tem pesos tecnicos e operacionais
- eixos criticos nao podem ficar abaixo de 75

### R2. Fechar testes sem fechar ambiente

Mitigacao:

- gate so conta quando o pre-requisito estiver documentado e reproduzivel

### R3. Tentar cobrir tudo ao mesmo tempo

Mitigacao:

- ondas
- foco em gaps de maior impacto operacional primeiro

### R4. Reintroduzir historico na raiz de `docs/`

Mitigacao:

- raiz `docs/` continua reservada a trilha viva

## 12. Cadencia recomendada

### Revisao semanal

- atualizar scorecard
- validar avancos de cada onda
- marcar bloqueios

### Revisao de marco

Ao fim de cada onda, registrar:

- entregas concluidas
- evidencias
- pendencias
- impacto na nota

## 13. Criterio final de aceite

O plano sera considerado concluido quando houver evidencia de que:

1. a raiz `docs/` continua pequena, viva e confiavel
2. banco, migrations, deploy e cutover contam uma unica historia operacional
3. gates principais rodam com pre-requisitos claros
4. fluxos enterprise criticos estao definidos e suficientemente cobertos
5. os modulos principais do ERP estao sustentados por documentacao, teste e operacao
6. a nota final ponderada esteja em `85+/100`

## 14. Veredito esperado

Se este plano for executado com disciplina, o resultado esperado nao e apenas uma documentacao melhor.

O resultado esperado e:

- um produto mais confiavel
- um deploy menos ambiguo
- uma trilha de qualidade mais repetivel
- uma operacao mais segura
- um CVG-HIS V2 mais proximo de um ERP veterinario enterprise real
