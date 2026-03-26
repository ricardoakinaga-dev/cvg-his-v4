# Frontend Architecture

**Data atualizacao**: 2026-03-26
**Decisao**: ADR-003, ADR-007, ENT-005

## Frontend Canonico

**`apps/web` (`@cvg-his-v2/web`) e o frontend oficial do V2.**

Nenhum outro app de frontend e considerado trilha ativa. Ver `docs/adr/ADR-007-frontend-canonico-v2.md` para a decisao completa.

### Estado atual

| Atributo     | Estado                                                                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | Node.js HTTP server + SPA com hash routing                                                                                                                                                                    |
| Pacote       | `@cvg-his-v2/web`                                                                                                                                                                                             |
| Dependencias | `@cvg-his-v2/shared-auth-sdk`, `shared-config`, `shared-logging`                                                                                                                                              |
| Build        | Compila e passa typecheck                                                                                                                                                                                     |
| Modulos      | `index.ts` (server), `styles.ts`, `pages/api-client.ts`, `pages/layout.ts`, `pages/login.ts`, `pages/dashboard.ts`, `pages/owners.ts`, `pages/patients.ts`, `pages/encounters.ts`, `pages/medical-records.ts` |
| Fluxos       | Login, Dashboard, Cadastro (owners/patients/links), Atendimento (fila/encounters/triagem), Prontuario (entries/timeline/anexos)                                                                               |
| Navegacao    | Hash routing (`#/`, `#/login`, `#/owners`, `#/patients`, `#/encounters`, `#/medical-records`)                                                                                                                 |
| Smoke E2E    | Playwright (`e2e/tests/smoke.spec.ts`); 6 testes integrados ao gate `test:all`; comando `./pnpm test:smoke` como atalho                                                                                       |

### Trilhas classificadas

| App            | Classificacao | Destino                                            |
| -------------- | ------------- | -------------------------------------------------- |
| `apps/web`     | **Canonico**  | Evolui com a arquitetura modular do V2             |
| `apps/his-web` | **Legado**    | Referencia de implementacao. Nao recebe dev ativo. |

## Papel do `apps/web`

- navegacao e composicao de experiencia
- formulacao de comandos para API
- leitura de queries consolidadas
- consumo de `auth-sdk`, `contracts`, `types` e `ui`

## Responsabilidades

- traduzir capabilities em affordances de UX
- orientar o usuario sobre estados e riscos
- apresentar timeline clinica, cadastros e fluxos operacionais

## Nao responsabilidades

- decidir permissao soberana
- implementar regra clinica material de forma exclusiva
- substituir validacao de dominio

## Diretrizes

- fluxo guiado por contracts publicos (`@cvg-his-v2/shared-contracts`)
- evitar estado cliente que replique regra de negocio
- componentes de UI compartilhados ficam em `packages/shared/ui`, sem absorver dominio clinico
- framework de UI (React, Vue, etc.) pode ser introduzido em iteracao futura, se a trilha oficial precisar de mais ergonomia alem da base atual

## Referencia de implementacao

Componentes, hooks e padroes de UX de `apps/his-web` podem ser adaptados como referencia durante ENT-006. Isso inclui:

- componentes de UI (Card, Button, Input, ErrorBanner, LoadingState)
- hooks (useDebouncedSearch, useSmartAutoRefresh)
- padroes de auth e middleware
- estrutura de features (encounter, inpatient, patients)
