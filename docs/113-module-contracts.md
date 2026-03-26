# Module Contracts

## Contrato padrao de modulo

Cada modulo do V2 deve expor:

- `index.ts` como surface publica
- `contracts.ts` com comandos, queries, eventos e tipos externos
- `application/*` com casos de uso
- `domain/*` com regras, entities e value objects
- `infrastructure/*` com adapters locais

## Contratos iniciais do core

### `auth`

- comandos: login, refresh, revoke
- eventos: session-created, session-revoked, login-failed

### `access-control`

- queries: evaluate-policy, list-capabilities
- eventos: role-assignment-changed, policy-definition-changed

### `owners`

- comandos: create-owner, update-owner, merge-owner
- queries: get-owner, search-owners

### `patients`

- comandos: create-patient, update-patient, attach-owner
- queries: get-patient, search-patients

### `encounters`

- comandos: open-encounter, transition-encounter, close-encounter
- queries: get-encounter, list-active-encounters

### `medical-records`

- comandos: append-entry, revise-entry, close-entry
- queries: list-timeline, get-entry-history

### `audit`

- comandos: append-audit-event
- queries: search-audit-events

## Regras

- contratos nao vazam detalhes de persistencia
- eventos publicados devem ser versionados
- breaking changes exigem revisao de consumidores e registro documental
