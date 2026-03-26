# Target Architecture

## Estrutura alvo do repositorio

- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/modules/*`
- `packages/shared/*`
- `infra/*`
- `tools/*`

## Principios arquiteturais

- modular monolith primeiro, distribuicao depois
- dominio antes de transporte
- contratos explicitos entre modulos
- side effects assíncronos por eventos e jobs
- shared packages pequenos e controlados

## Regras de dependencia

- `apps/*` dependem de `packages/modules/*` e `packages/shared/*`
- `packages/modules/*` dependem de `packages/shared/*`
- modulos se comunicam por surface publica
- `infra/*` nao contem regra de negocio

## Decisao estrutural

O V2 coexistira com o legado durante a reconstrucao, mas a nova arquitetura nao nasce como extensao cosmetica de `apps/his-*` ou `packages/*` antigos.
