# Reuse And Discard Map

## Reaproveitar como referencia de regra

- auth e RBAC atuais: fonte de atores, claims, permissoes e modelos de sessao
- owners e patients: referencia para cadastro mestre e relacionamento tutor-paciente
- encounters: referencia para ciclo de atendimento e eixo clinico
- clinical notes e documents: referencia para prontuario, autoria e anexos
- audit events: referencia para trilha de auditoria
- inpatient e exams: referencia funcional para fases avancadas
- schemas do `packages/db`: base para descoberta de entidades, estados e relacionamentos existentes

## Reaproveitar apenas como padrao tecnico

- estilo `repo/service/routes` do backend legado
- tenant scoping e request context
- componentes e fluxos maduros do frontend como inspiracao de UX
- automacoes de worker e operacao

## Reaproveitar com forte restricao

- qualquer schema de billing, stock ou payments
- agregadores como `patientContext`
- modulo `search`
- modulos de reports e integrations

Regra: esses artefatos nao entram no V2 por copia direta; entram apenas apos redesenho de fronteira, contrato e ownership.

## Descartar como base estrutural

- organizacao atual de `apps/his-*` como destino final do V2
- documentacao antiga que presume continuidade incremental
- qualquer acoplamento frontend-first de autorizacao ou regra clinica
- mistura de prontuario, faturamento e estoque no mesmo modulo ou fluxo transacional
- naming legado incoerente com bounded contexts alvo

## Decisao operacional

O V2 mantera o legado ao lado da nova arvore. O codigo antigo continua disponivel para consulta, comparacao funcional e migracao controlada, mas a implementacao nova nascera nos caminhos abaixo:

- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/modules/*`
- `packages/shared/*`
- `infra/*`
- `tools/*`
