# Module Contracts

## Estrutura canônica de módulo (implementation reality)

Cada módulo do V2 deve expor:

- `src/index.ts` como surface pública (service + repositório interfaces)
- `src/repositories/` (abstração de repositório + implementação)
- Tipos públicos definidos em `packages/shared/contracts/src/index.ts` (centralizado)
- Eventos públicos versionados

**Nota:** A estrutura original com `contracts.ts` local, `application/`, `domain/`, `infrastructure/` não é utilizada na implementação atual. Ver `docs/adr/ADR-009-module-structure-simplified.md`.

## Contracts centralizados

Todos os comandos, queries, tipos e eventos públicos estão em:

```
packages/shared/contracts/src/index.ts
```

Por exemplo:

- `CreatePatientRequest`, `UpdatePatientRequest`
- `CreateEncounterRequest`, `TransitionEncounterRequest`
- `CreateMedicalRecordRequest`, `UpdateClinicalEntryRequest`
- `LoginRequest`, `AuthTokens`, `AuthenticatedPrincipal`
- `HealthResponse`, `ReadinessResponse`

## Módulos core e suas operações principais

### `auth`

- comandos: `login`, `refresh`, `revoke`
- eventos: `session-created`, `session-revoked`, `login-failed`

### `access-control`

- queries: `evaluate-policy`, `list-capabilities`
- eventos: `role-assignment-changed`, `policy-definition-changed`

### `owners`

- comandos: `create-owner`, `update-owner`, `merge-owner`
- queries: `get-owner`, `search-owners`

### `patients`

- comandos: `create-patient`, `update-patient`, `attach-owner`
- queries: `get-patient`, `search-patients`

### `encounters`

- comandos: `open-encounter`, `transition-encounter`, `close-encounter`
- queries: `get-encounter`, `list-active-encounters`

### `medical-records`

- comandos: `append-entry`, `revise-entry`, `close-entry`
- queries: `list-timeline`, `get-entry-history`

### `audit`

- comandos: `append-audit-event`
- queries: `search-audit-events`

## Regras

- contracts não vazam detalhes de persistência
- eventos publicados devem ser versionados
- breaking changes exigem revisão de consumidores e registro documental
- módulos comunicam-se apenas via contracts públicos e repositórios abstraídos
