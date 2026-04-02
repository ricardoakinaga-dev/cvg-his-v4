# 115 - Backend Architecture

**Status:** vivo
**Data de validacao:** 2026-03-31
**Fonte principal de evidencia:** `apps/api/src/server.ts`, `apps/api/src/runtime.ts`, `packages/modules/*`

## Papel do backend

`apps/api` e o backend HTTP canonico do CVG-HIS V2.

Ele centraliza:

- autenticacao
- autorizacao
- composition root dos modulos
- validacao de requests
- serializacao de respostas e erros
- auditoria e correlacao de requests

## Estado real atual

O backend ja nao e skeleton.

Hoje a API expoe superficie funcional relevante para:

- auth
- owners
- patients
- owner-patient-links
- appointments
- queue
- encounters
- triage
- medical-records
- attachments
- inpatient
- sectors
- beds
- bed-map
- surgeries
- diagnostics
- billing
- inventory
- notifications
- users
- staff
- access-control
- audit
- master-search
- discharges
- prescription-executions
- health, readiness e liveness
- lookup de CEP

## Principios obrigatorios

- regra de negocio mora nos modulos
- transporte HTTP nao define dominio
- mutacao relevante deve passar por validacao, policy e auditoria
- o backend e a fonte soberana das decisoes de dominio e acesso

## Estrutura esperada

- `apps/api/src/server.ts`: transporte HTTP
- `apps/api/src/runtime.ts`: composition root e injecao de modulos
- `packages/modules/*`: servicos de dominio e repositorios
- `packages/shared/*`: contratos, erros, logging, config, validacao e utilitarios

## Estado administrativo relevante

- `staff` agora opera com CRUD real, repositório DB, hidratação no runtime e rotas administrativas dedicadas
- `notifications` agora usa leitura/processamento persistentes na API e no worker quando o repositório está disponível

## Lacunas ainda abertas

- parte da superficie funcional ainda carece de mais testes de integracao com banco real fora dos fluxos residuais ja fechados

## Direcao para a proxima fase

- manter `apps/api` como unica trilha backend oficial
- fortalecer testes de integracao com banco real
- reduzir divergencia entre documentacao, deploy e persistencia
- eliminar documentacao que ainda venda a API como skeleton
