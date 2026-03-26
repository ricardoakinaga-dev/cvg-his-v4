# Phased Execution Plan

## Fase 0 - Congelamento estrategico e inventario

- diagnostico estrutural do legado
- mapa de reaproveitamento
- mapa de descarte
- rationale da reconstrucao

## Fase 1 - Fundacao documental

- visao e principios do produto
- dominio, workflows e seguranca assistencial
- acesso, auditoria, arquitetura e dados
- roadmap e checkpoints

## Fase 2 - Fundacao do monorepo

- workspace, pipelines e `turbo`
- shared foundation minima
- skeletons de `apps/web`, `apps/api` e `apps/worker`
- infra minima

## Fase 3 - Core de identidade, acesso e governanca

- `auth`
- `access-control`
- `users`
- `staff`
- `audit`

## Fase 4 - Cadastro mestre

- `owners`
- `patients`
- relacionamento tutor-paciente

## Fase 5 - Atendimento e episodio clinico

- `scheduling`
- `triage`
- `encounters`

## Fase 6 - Prontuario clinico base

- `medical-records`
- `attachments`
- timeline, evolucao, prescricao e conduta

## Fase 7 - Operacao assistencial avancada

- `inpatient`
- `surgery`
- `diagnostics`

## Fase 8 - Administrativo e consumo assistencial

- `billing`
- `inventory`
- `notifications`

## Fase 9 - Migracao controlada

- migracao funcional
- migracao de dados
- convivio assistido legado -> V2

## Regra de passagem entre fases

Nenhuma fase avanca sem artefatos previstos, validacao documentada, riscos explicitados e proximo corte de trabalho definido.
