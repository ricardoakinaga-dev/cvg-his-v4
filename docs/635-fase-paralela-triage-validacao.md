# 632 — Fase Paralela Triage Validacao

**Data:** 2026-04-01
**Status:** concluido
**Escopo:** amadurecimento do modulo `triage` sem interferir na frente E1

---

## 1. O que foi implementado

### T1 — Update controlado no modulo `triage`

- `TriageService` deixou de ser apenas criacao imutavel.
- Foi adicionado `updateTriage(triageId, payload)`.
- O update permite alterar apenas:
  - `priority`
  - `chiefComplaint`
  - `initialNotes`
  - `alerts`
  - `destination`
- O serviço preserva:
  - `encounterId`
  - `patientId`
  - `accountId`
  - `triagedByUserId`
  - `createdAt`
- O update e bloqueado quando o encounter estiver `closed`.

### T2 — Persistencia coerente

- O `DatabaseTriageRepository` passou a suportar `update(record)`.
- `findByAccountId` agora aceita carga global para hidratação.
- `apps/api/src/runtime.ts` passou a injetar `repos.triage`.
- `apps/api/src/runtime.ts` passou a executar `triage.hydrateFromDatabase(...)`.
- `apps/api/src/bootstrap.ts` passou a instanciar `DatabaseTriageRepository` no caminho com banco saudável.

### T3 — API para update

- Nova rota: `PATCH /triage/:id`
- Regras aplicadas:
  - exige `triage.manage`
  - atualiza triagem apenas se o encounter estiver aberto
  - registra `audit` de update
  - adiciona evento de timeline no encounter
  - transiciona o encounter para o novo `destination` quando aplicável

### T4 — Testes reais

- `packages/modules/triage/src/triage.test.ts` foi refeito para cobrir:
  - create
  - bloqueio de segunda triagem inicial
  - update válido
  - update inválido com encounter fechado
  - hydrate via repositório
- `packages/modules/triage/package.json` passou a executar suite real
- `apps/api/src/runtime.test.ts` ganhou cenário de update de triagem via runtime

---

## 2. Arquivos alterados

- `packages/shared/contracts/src/index.ts`
- `packages/modules/triage/src/index.ts`
- `packages/modules/triage/src/repositories/database-triage.repository.ts`
- `packages/modules/triage/src/triage.test.ts`
- `packages/modules/triage/package.json`
- `apps/api/src/runtime.ts`
- `apps/api/src/bootstrap.ts`
- `apps/api/src/server.ts`
- `apps/api/src/runtime.test.ts`
- `docs/507-modulo-triage.md`
- `docs/510-matriz-fluxos-criticos-enterprise.md`
- `docs/635-fase-paralela-triage-validacao.md`

---

## 3. Regras adotadas para update de triagem

1. A triagem continua sendo **única por encounter**.
2. O update nao recria a triagem; ele corrige o registro existente.
3. O update nao altera identidade do registro.
4. Encounter `closed` bloqueia a edição.
5. `priority` e `destination` passam por validação explícita.
6. A API gera rastreabilidade operacional via audit e timeline.

---

## 4. Validacoes executadas

- `pnpm --filter @cvg-his-v2/module-triage test` ✅
- `pnpm --filter @cvg-his-v2/api test` ✅
- `pnpm typecheck` ✅
- `pnpm build` ✅

---

## 5. Impacto na maturidade assistencial

- `triage` deixa de ser um ponto cego de correção operacional.
- O módulo passa a sustentar melhor a rotina real de atendimento, onde correção clínica controlada pode ser necessária.
- A persistência finalmente entra na trilha do módulo quando o runtime está em modo database.
- A lacuna “triagem imutável” sai do patamar de risco funcional imediato e vira evolução futura de versionamento.

---

## 6. Bloqueios remanescentes

1. Ainda nao existe versionamento completo de re-triagem.
2. Ainda nao existe teste HTTP dedicado para `PATCH /triage/:id`.
3. A política de edição ainda pode ser refinada por fase assistencial.

---

## 7. Proximo passo natural

O próximo passo mais forte nesta trilha assistencial é **persistir a fila operacional do scheduling**, porque esse segue sendo o risco operacional mais relevante ligado ao fluxo de atendimento em restart.
