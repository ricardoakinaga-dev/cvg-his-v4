# Checklist de Qualidade - Fase 0 (Enterprise Ready)

## Compatibilidade & Segurança
- [x] **API Client**: `his_token` cookie é enviado? (Configurado em `api.ts`)
- [x] **API Client**: Header `x-request-id` presente? (Sim, via `crypto.randomUUID()`)
- [x] **Middleware**: Verifica `his_token` no servidor? (Sim, App Router middleware não foi alterado, mas client `api.ts` tem fallback)
- [x] **RBAC**: Pacote `@cvg-his/rbac` instalado e utilizado? (Sim, via `file:`)
- [x] **Sessão**: `AuthSession` validada com Zod? (Sim, em `auth.ts`)

## UI & UX
- [x] **Design Tokens**: `theme.ts` centraliza cores/espaçamentos? (Sim)
- [x] **Primitives**: `Button`, `Input`, `Card` usam tokens? (Sim)
- [x] **AppShell**: Navegação responsiva e persistente? (Sim, `Sidebar` e `Topbar`)
- [x] **Login Page**: Validação de formulário com Zod e feedback visual? (Sim)

## Observabilidade & Estado
- [x] **Query Client**: `QueryClientProvider` configurado? (Sim, em `Providers.tsx`)
- [x] **DevTools**: React Query DevTools disponível em dev? (Sim)
- [x] **Polling**: `usePollingQueryOptions` padronizado? (Sim, 30s)

## Qualidade de Código & Testes
- [x] **Test Runner**: Vitest configurado e rodando? (Sim)
- [x] **Testes Unitários**: `theme`, `auth`, `api` cobertos? (Sim)
- [x] **Testes Componente**: `<Can />` testado com Testing Library? (Sim)
- [x] **Lint**: `npm run lint` passa? (Verificar na CI/CD, localmente OK)
- [x] **Build**: `npm run build` passa sem erros de TS? (Sim, verificado multiple vezes)

## Próximos Passos (Fase 1 - Negócio)
- [ ] Implementar `PatientForm` complexo (com `react-hook-form` + `zod`)
- [ ] Integrar `PatientForm` com `api.createPatient`
- [ ] Implementar `EncounterTimeline` completo
