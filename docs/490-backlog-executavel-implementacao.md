# 490 - Backlog Executavel de Implementacao

**Status:** vivo
**Data de validacao:** 2026-03-31
**Base de referencia:** `480-plano-execucao-85-plus-enterprise.md`
**Objetivo:** quebrar o plano `85+/100` em uma ordem de implementacao acionavel, com entregas por arquivo, modulo e onda

## 1. Como usar este backlog

Cada item deste backlog tem:

- `ID`
- `Prioridade`
- `Onda`
- `Objetivo`
- `Arquivos-alvo`
- `Modulos afetados`
- `Dependencias`
- `Entrega esperada`
- `Criterio de pronto`

### Prioridades

- `P0`: bloqueador ou redutor direto de risco operacional
- `P1`: consolidacao forte para nota 85+
- `P2`: endurecimento e refinamento

### Status sugeridos para acompanhamento

- `todo`
- `doing`
- `blocked`
- `done`

## 2. Ordem macro de execucao

1. fechar a historia unica de persistencia, migrations e cutover
2. alinhar docs operacionais e artefatos reais de deploy
3. estabilizar ambiente e gates de qualidade
4. documentar e validar os modulos enterprise subrepresentados
5. automatizar fluxos criticos enterprise
6. fechar readiness, release e veredito final

## 3. Backlog por onda

## Onda 1 - Coerencia de base

### B001 - Declarar trilha oficial de migrations

- `Prioridade`: `P0`
- `Objetivo`: eliminar ambiguidade entre trilhas de persistencia
- `Arquivos-alvo`:
  - `docs/470-politica-migracao-e-deploy.md`
  - `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
  - `docs/131-checklist-cutover-servidor.md`
  - `infra/scripts/cutover-v2.sh`
- `Modulos afetados`: plataforma, banco, deploy
- `Dependencias`: nenhuma
- `Entrega esperada`: uma unica historia operacional de migrations declarada e usada na trilha viva
- `Criterio de pronto`:
  - nenhuma doc viva menciona trilha diferente como oficial
  - `cutover-v2.sh` aplica a trilha oficial
  - existe lista explicita do que e oficial e do que e legado/transitorio

### B002 - Alinhar portas externas, compose e proxy

- `Prioridade`: `P0`
- `Objetivo`: remover divergencia entre runtime e docs
- `Arquivos-alvo`:
  - `docker-compose.v2.yml`
  - `infra/docker/Caddyfile.v2`
  - `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
  - `docs/131-checklist-cutover-servidor.md`
- `Modulos afetados`: `apps/api`, `apps/web`, deploy
- `Dependencias`: `B001`
- `Entrega esperada`: documentacao, compose e proxy contando a mesma historia
- `Criterio de pronto`:
  - 0 divergencias entre portas documentadas e portas publicadas
  - comandos de validacao pos-deploy usam destinos corretos

### B003 - Revisar docs operacionais dos apps canonicos

- `Prioridade`: `P0`
- `Objetivo`: eliminar qualquer narrativa residual de skeleton
- `Arquivos-alvo`:
  - `apps/api/README.md`
  - `apps/web/README.md`
  - `apps/worker/README.md`
  - `docs/114-frontend-architecture.md`
  - `docs/115-backend-architecture.md`
  - `docs/116-worker-architecture.md`
- `Modulos afetados`: `apps/api`, `apps/web`, `apps/worker`
- `Dependencias`: nenhuma
- `Entrega esperada`: READMEs dos apps refletindo o estado real
- `Criterio de pronto`:
  - nenhum app canonico aparece como baseline nao implementado
  - superficie funcional principal esta descrita de forma aderente

### B004 - Gerar relatorio de fechamento da onda 1

- `Prioridade`: `P1`
- `Objetivo`: registrar evidencias e impacto na nota
- `Arquivos-alvo`:
  - `docs/491-onda-1-validacao.md`
- `Modulos afetados`: todos os eixos da onda
- `Dependencias`: `B001`, `B002`, `B003`
- `Entrega esperada`: relatorio de validacao com evidencias
- `Criterio de pronto`:
  - scorecard atualizado
  - evidencias de alinhamento anexadas

## Onda 2 - Gates e repetibilidade

### B005 - Documentar setup do banco de teste

- `Prioridade`: `P0`
- `Objetivo`: tornar o ambiente de teste compreensivel e reproduzivel
- `Arquivos-alvo`:
  - `docs/460-qualidade-testes-e-gates.md`
  - `README.md`
  - `tests/setup/env.ts`
  - `tests/db/db-admin.ts`
  - `infra/scripts/prepare-test-db.mjs`
  - `docker-compose.test.yml`
- `Modulos afetados`: qualidade, banco de teste
- `Dependencias`: `B001`
- `Entrega esperada`: trilha curta e objetiva para preparar banco de testes
- `Criterio de pronto`:
  - `DATABASE_URL_TEST` documentado
  - credenciais e fluxo de bootstrap claramente descritos

### B006 - Estabilizar `pnpm test:critical`

- `Prioridade`: `P0`
- `Objetivo`: fazer o gate critico rodar em ambiente preparado
- `Arquivos-alvo`:
  - `package.json`
  - `vitest.config.ts`
  - `tests/setup/global-setup.ts`
  - `tests/setup/env.ts`
  - `tests/db/*`
  - `infra/scripts/prepare-test-db.mjs`
- `Modulos afetados`: testes de integracao, banco
- `Dependencias`: `B005`
- `Entrega esperada`: execucao verde do gate critico com pre-requisitos satisfeitos
- `Criterio de pronto`:
  - `pnpm test:critical` verde em ambiente preparado
  - falhas residuais sao de produto e nao de setup oculto

### B007 - Definir gate minimo de release

- `Prioridade`: `P1`
- `Objetivo`: consolidar uma sequencia minima de qualidade para merge/release
- `Arquivos-alvo`:
  - `docs/460-qualidade-testes-e-gates.md`
  - `docs/131-checklist-cutover-servidor.md`
  - `package.json`
- `Modulos afetados`: qualidade, release
- `Dependencias`: `B006`
- `Entrega esperada`: gate curto, claro e praticavel
- `Criterio de pronto`:
  - comandos minimos definidos
  - pre-requisitos declarados
  - leitura de falha objetiva

### B008 - Gerar relatorio de fechamento da onda 2

- `Prioridade`: `P1`
- `Objetivo`: registrar repetibilidade dos gates
- `Arquivos-alvo`:
  - `docs/492-onda-2-validacao.md`
- `Modulos afetados`: qualidade e release
- `Dependencias`: `B005`, `B006`, `B007`
- `Entrega esperada`: relatorio com tempo de setup, execucao e principais falhas
- `Criterio de pronto`:
  - scorecard atualizado
  - status dos gates registrado

## Onda 3 - Cobertura funcional enterprise

### B009 - Criar docs vivas minimas dos modulos subrepresentados

- `Prioridade`: `P1`
- `Objetivo`: cobrir os 9 modulos com documentacao viva minima
- `Arquivos-alvo`:
  - `docs/500-modulo-access-control.md`
  - `docs/501-modulo-attachments.md`
  - `docs/502-modulo-billing.md`
  - `docs/503-modulo-notifications.md`
  - `docs/504-modulo-scheduling.md`
  - `docs/505-modulo-staff.md`
  - `docs/506-modulo-surgery.md`
  - `docs/507-modulo-triage.md`
  - `docs/508-modulo-users.md`
- `Modulos afetados`:
  - `packages/modules/access-control`
  - `packages/modules/attachments`
  - `packages/modules/billing`
  - `packages/modules/notifications`
  - `packages/modules/scheduling`
  - `packages/modules/staff`
  - `packages/modules/surgery`
  - `packages/modules/triage`
  - `packages/modules/users`
- `Dependencias`: `B003`
- `Entrega esperada`: um documento vivo por modulo com objetivo, superficie, dependencias, regras, riscos e situacao de teste
- `Criterio de pronto`:
  - 9 de 9 docs criados
  - indice `docs/README.md` atualizado

### B010 - Definir matriz dos 10 fluxos criticos enterprise

- `Prioridade`: `P1`
- `Objetivo`: transformar a superficie funcional em fluxos verificaveis
- `Arquivos-alvo`:
  - `docs/510-matriz-fluxos-criticos-enterprise.md`
- `Modulos afetados`: auth, access-control, owners, patients, encounters, triage, medical-records, inpatient, diagnostics, surgery, prescription-executions, billing, inventory, discharges, notifications, audit
- `Dependencias`: `B009`
- `Entrega esperada`: matriz com entrada, saida, modulos envolvidos, risco e criterio de sucesso
- `Criterio de pronto`:
  - pelo menos 10 fluxos definidos
  - cada fluxo com dono e prioridade

### B011 - Automatizar fluxos criticos priorizados

- `Prioridade`: `P1`
- `Objetivo`: cobrir no minimo 6 fluxos com validacao automatizada
- `Arquivos-alvo`:
  - `tests/integration/**/*`
  - `e2e/tests/**/*`
  - `tests/helpers/**/*`
  - `tests/factories/**/*`
  - `docs/510-matriz-fluxos-criticos-enterprise.md`
- `Modulos afetados`: multiplos, conforme fluxo
- `Dependencias`: `B010`
- `Entrega esperada`: suite automatizada dos fluxos mais criticos
- `Criterio de pronto`:
  - >= 6 fluxos automatizados
  - os fluxos restantes possuem justificativa e plano de fechamento

### B012 - Fechar gaps funcionais remanescentes por modulo

- `Prioridade`: `P1`
- `Objetivo`: transformar achados funcionais em backlog com dono
- `Arquivos-alvo`:
  - `docs/511-backlog-gaps-funcionais.md`
- `Modulos afetados`: todos os modulos dos fluxos criticos
- `Dependencias`: `B010`, `B011`
- `Entrega esperada`: backlog curto de gaps reais e remanescentes
- `Criterio de pronto`:
  - nenhum gap critico sem dono
  - nenhum gap critico sem criterio de aceite

### B013 - Gerar relatorio de fechamento da onda 3

- `Prioridade`: `P1`
- `Objetivo`: registrar cobertura funcional enterprise atingida
- `Arquivos-alvo`:
  - `docs/493-onda-3-validacao.md`
- `Modulos afetados`: modulos enterprise
- `Dependencias`: `B009`, `B010`, `B011`, `B012`
- `Entrega esperada`: relatorio consolidado de cobertura funcional
- `Criterio de pronto`:
  - scorecard atualizado
  - numero de fluxos cobertos e modulos documentados registrado

## Onda 4 - Endurecimento operacional

### B014 - Consolidar readiness operacional dos servicos

- `Prioridade`: `P1`
- `Objetivo`: usar health, ready e live como criterio real
- `Arquivos-alvo`:
  - `apps/api/src/health.ts`
  - `apps/api/src/server.ts`
  - `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
  - `docs/131-checklist-cutover-servidor.md`
  - `docs/470-politica-migracao-e-deploy.md`
- `Modulos afetados`: `apps/api`, `apps/web`, `apps/worker`, operacao
- `Dependencias`: `B002`
- `Entrega esperada`: readiness como criterio operacional explicito
- `Criterio de pronto`:
  - checks minimos de api, web e worker descritos e testados

### B015 - Fechar roteiro de rollback e cutover

- `Prioridade`: `P1`
- `Objetivo`: reduzir risco de janela operacional
- `Arquivos-alvo`:
  - `docs/131-checklist-cutover-servidor.md`
  - `infra/scripts/cutover-v2.sh`
  - `docs/470-politica-migracao-e-deploy.md`
- `Modulos afetados`: deploy, ops
- `Dependencias`: `B001`, `B002`, `B014`
- `Entrega esperada`: roteiro de cutover/rollback coerente e executavel
- `Criterio de pronto`:
  - passos de ida e volta sem ambiguidade
  - checklist alinhado ao script

### B016 - Fechar checklist de release enterprise

- `Prioridade`: `P1`
- `Objetivo`: formalizar o criterio de liberacao
- `Arquivos-alvo`:
  - `docs/520-checklist-release-enterprise.md`
  - `docs/460-qualidade-testes-e-gates.md`
  - `docs/131-checklist-cutover-servidor.md`
- `Modulos afetados`: qualidade, release, operacao
- `Dependencias`: `B007`, `B014`, `B015`
- `Entrega esperada`: checklist unico de release
- `Criterio de pronto`:
  - gates tecnicos e operacionais definidos no mesmo artefato

### B017 - Gerar relatorio de fechamento da onda 4

- `Prioridade`: `P1`
- `Objetivo`: medir prontidao operacional
- `Arquivos-alvo`:
  - `docs/494-onda-4-validacao.md`
- `Modulos afetados`: operacao e release
- `Dependencias`: `B014`, `B015`, `B016`
- `Entrega esperada`: relatorio de prontidao operacional
- `Criterio de pronto`:
  - scorecard atualizado
  - readiness, cutover e rollback avaliados

## Onda 5 - Fechamento 85+ e veredito enterprise

### B018 - Consolidar score final por eixo

- `Prioridade`: `P1`
- `Objetivo`: medir formalmente se a meta foi atingida
- `Arquivos-alvo`:
  - `docs/530-score-final-85-plus.md`
- `Modulos afetados`: todos
- `Dependencias`: `B004`, `B008`, `B013`, `B017`
- `Entrega esperada`: score ponderado final com evidencias
- `Criterio de pronto`:
  - nota final calculada
  - eixos criticos todos >= 75

### B019 - Separar riscos residuais de backlog pos-meta

- `Prioridade`: `P2`
- `Objetivo`: nao misturar bloqueador com melhoria futura
- `Arquivos-alvo`:
  - `docs/531-riscos-residuais-e-backlog-pos-85.md`
- `Modulos afetados`: todos
- `Dependencias`: `B018`
- `Entrega esperada`: lista clara do que ainda existe sem impedir nota 85+
- `Criterio de pronto`:
  - nenhum risco alto sem classificacao
  - backlog pos-meta separado de bloqueadores

### B020 - Emitir veredito final de prontidao enterprise

- `Prioridade`: `P1`
- `Objetivo`: fechar a fase de consolidacao com decisao executiva
- `Arquivos-alvo`:
  - `docs/540-veredito-final-enterprise.md`
- `Modulos afetados`: todos
- `Dependencias`: `B018`, `B019`
- `Entrega esperada`: documento final de pronto ou nao pronto
- `Criterio de pronto`:
  - veredito objetivo
  - nota final
  - riscos residuais
  - recomendacao de proximo ciclo

## 4. Backlog por modulo

## Plataforma e arquitetura

### M001 - `apps/api`

- revisar `apps/api/README.md`
- alinhar rotas reais com docs vivas
- revisar health/readiness/liveness
- garantir coerencia com deploy e release

### M002 - `apps/web`

- revisar `apps/web/README.md`
- alinhar navegacao real
- validar superficie funcional documentada
- alinhar com testes E2E prioritarios

### M003 - `apps/worker`

- revisar `apps/worker/README.md`
- explicitar o comportamento real do loop de processamento
- documentar readiness operacional minima

### M004 - Persistencia/deploy

- `infra/scripts/cutover-v2.sh`
- `docker-compose.v2.yml`
- `infra/docker/Caddyfile.v2`
- `infra/systemd/*`
- docs `130`, `131`, `470`

## Modulos de governanca

### M005 - `packages/modules/auth`

- participar da matriz de fluxo `login -> sessao -> permissao`
- validar docs e testes ligados a sessao

### M006 - `packages/modules/access-control`

- criar doc viva minima
- revisar capacidades, permissoes e dependencias
- amarrar com fluxos de RBAC

### M007 - `packages/modules/users`

- criar doc viva minima
- mapear superficie funcional e risco
- amarrar com auth e access-control

### M008 - `packages/modules/staff`

- criar doc viva minima
- revisar se a superficie atual sustenta operacao enterprise

### M009 - `packages/modules/audit`

- garantir presenca na matriz de fluxos criticos
- refletir criterios de auditoria no veredito final

## Modulos assistenciais

### M010 - `packages/modules/owners`

- cobrir fluxo tutor -> paciente -> atendimento

### M011 - `packages/modules/patients`

- cobrir fluxo tutor -> paciente -> atendimento

### M012 - `packages/modules/scheduling`

- criar doc viva minima
- inserir em fluxo critico de atendimento

### M013 - `packages/modules/encounters`

- consolidar fluxo principal assistencial

### M014 - `packages/modules/triage`

- criar doc viva minima
- inserir em fluxo atendimento -> triagem -> prontuario

### M015 - `packages/modules/medical-records`

- garantir cobertura do prontuario como fluxo enterprise

### M016 - `packages/modules/attachments`

- criar doc viva minima
- alinhar com prontuario e diagnostico

### M017 - `packages/modules/inpatient`

- validar fluxo atendimento -> internacao -> leito

### M018 - `packages/modules/surgery`

- criar doc viva minima
- validar fluxo cirurgico minimo

### M019 - `packages/modules/diagnostics`

- validar fluxo exame -> resultado

### M020 - `packages/modules/prescription-executions`

- validar fluxo prescricao -> execucao

### M021 - `packages/modules/discharges`

- validar fluxo atendimento -> alta

## Modulos administrativos

### M022 - `packages/modules/billing`

- criar doc viva minima
- validar fluxo atendimento -> billing -> recebiveis

### M023 - `packages/modules/inventory`

- validar fluxo estoque -> consumo -> reflexo assistencial

### M024 - `packages/modules/notifications`

- criar doc viva minima
- inserir nos fluxos com reflexo operacional

## 5. Backlog por arquivo prioritario

## Arquivos `P0`

- `infra/scripts/cutover-v2.sh`
- `docker-compose.v2.yml`
- `infra/docker/Caddyfile.v2`
- `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
- `docs/131-checklist-cutover-servidor.md`
- `docs/460-qualidade-testes-e-gates.md`
- `docs/470-politica-migracao-e-deploy.md`
- `tests/setup/env.ts`
- `tests/db/db-admin.ts`
- `infra/scripts/prepare-test-db.mjs`
- `apps/api/README.md`
- `apps/web/README.md`
- `apps/worker/README.md`

## Arquivos `P1`

- `docs/500-modulo-access-control.md`
- `docs/501-modulo-attachments.md`
- `docs/502-modulo-billing.md`
- `docs/503-modulo-notifications.md`
- `docs/504-modulo-scheduling.md`
- `docs/505-modulo-staff.md`
- `docs/506-modulo-surgery.md`
- `docs/507-modulo-triage.md`
- `docs/508-modulo-users.md`
- `docs/510-matriz-fluxos-criticos-enterprise.md`
- `docs/511-backlog-gaps-funcionais.md`
- `docs/520-checklist-release-enterprise.md`
- `docs/530-score-final-85-plus.md`
- `docs/540-veredito-final-enterprise.md`

## 6. Sequencia recomendada de execucao real

### Sprint A - Base e risco operacional

- `B001`
- `B002`
- `B003`
- `B005`

### Sprint B - Gates

- `B006`
- `B007`
- `B004`
- `B008`

### Sprint C - Cobertura enterprise

- `B009`
- `B010`
- `B011`
- `B012`
- `B013`

### Sprint D - Operacao

- `B014`
- `B015`
- `B016`
- `B017`

### Sprint E - Fechamento

- `B018`
- `B019`
- `B020`

## 7. Definicao de pronto do backlog

Este backlog sera considerado bem executado quando:

- todos os itens `P0` estiverem `done`
- ao menos 80% dos `P1` estiverem `done`
- a nota final ponderada estiver em `85+/100`
- os eixos criticos estiverem todos em `>= 75`
- o veredito final enterprise estiver emitido
