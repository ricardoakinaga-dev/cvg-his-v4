# Target Architecture

## Estrutura alvo do repositorio

- `apps/api`
- `apps/worker`
- `apps/spa`
- `packages/modules/*`
- `packages/shared/*`
- `infra/*`
- `tools/*`

`apps/spa` é o frontend canônico. `apps/web` não existe no worktree verificado em 05/09/2026; suas referências de migração pertencem ao histórico. Os namespaces V2 preservados no runtime seguem o ADR-012 e não indicam outro frontend ativo.

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

O produto é CVG-HIS V4. A estrutura canônica é API/SPA/worker e módulos de domínio; namespaces V2 permanecem por compatibilidade conforme o [ADR-012](adr/ADR-012-release-identity-and-semver-v4.md). A descrição de coexistência durante a reconstrução pertence ao histórico e não indica uma segunda aplicação ativa.
