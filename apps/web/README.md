# apps/web

Frontend oficial do CVG-HIS V2.

## Estrutura

```
src/
  index.ts              - Servidor HTTP + roteador de paginas
  styles.ts             - CSS base compartilhado
  pages/
    api-client.ts       - Script client-side para comunicacao com API
    login.ts            - Login com autenticacao via API V2
    dashboard.ts        - Dashboard com KPIs e atendimentos recentes
    owners.ts           - CRUD de tutores com busca e detalhe
    patients.ts         - CRUD de pacientes e vinculos owner-patient
    encounters.ts       - Fila, atendimentos e triagem (3 abas)
    medical-records.ts  - Prontuario com entries, timeline e anexos (3 abas)
```

## Fluxos Suportados

- **Login**: autenticacao com API V2, gestao de tokens em localStorage
- **Dashboard**: KPIs de tutores, pacientes, atendimentos e notificacoes
- **Cadastro mestre**: CRUD de owners e patients, vinculos owner-patient, busca
- **Atendimento**: fila com check-in/call, encounters com transicao/fechamento, triagem
- **Prontuario**: clinical entries, timeline clinica, anexos por encounter

## Navegacao

Server-side routing simples por pathname:

- `/` - Dashboard
- `/login` - Login
- `/owners` - Tutores
- `/patients` - Pacientes
- `/encounters` - Atendimentos
- `/medical-records` - Prontuario

## Como Rodar

```bash
# Desenvolvimento
pnpm dev:web

# Build
pnpm --filter @cvg-his-v2/web build

# Typecheck
pnpm --filter @cvg-his-v2/web typecheck
```

## Dependencias

- `@cvg-his-v2/shared-auth-sdk` - Token management
- `@cvg-his-v2/shared-config` - Configuracao (API base URL, porta)
- `@cvg-his-v2/shared-logging` - Logging

## Decisao Tecnica

Base atual: Node.js HTTP server + HTML inline com roteamento simples por pathname.
Decisao documentada em `docs/adr/ADR-007-frontend-canonico-v2.md`.
Framework UI pode ser introduzido em iteracao futura sem prejuizo.

## Smoke E2E

Smoke tests automatizados com Playwright em `e2e/tests/smoke.spec.ts`:

- Login → Dashboard (KPIs verificados)
- Owner flow (alert e listagem confirmados)
- Patient flow (feedback visual confirmado)
- Encounter flow (tabela confirmada)
- Medical record flow (busca validada)
- Navegação entre páginas

**Integrado ao gate oficial `test:all`.**

```bash
# Rodar gate completo (inclui smoke)
./pnpm test:all

# Rodar apenas smoke (atalho)
./pnpm test:smoke
```

Config: `e2e/playwright-smoke.config.ts`

- API: porta 4001 (auto-start)
- Web: porta 4000 (auto-start)
- Browser: Chromium headless
