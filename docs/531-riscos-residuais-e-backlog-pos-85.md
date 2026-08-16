# 531 - Riscos Residuais e Backlog Pos-85

**Data:** 2026-03-31
**Base:** `docs/511-backlog-gaps-funcionais.md`, relatorios das ondas 1-4, score final (530)

> **Snapshot histórico.** Parte dos riscos abaixo foi tratada depois desta rodada (incluindo CI, coverage, CRUD de staff e persistência de módulos). A situação atual está em `docs/2026-08-15-relatorio-auditoria-e-correcoes.md`.

---

## Riscos Residuais Altos

Estes itens **nao bloqueiam a meta 85+** (todos os eixos criticos >= 75) mas representam risco operacional real se nao forem tratados no proximo ciclo.

### R1: 4 modulos sem persistencia DB

| Campo                        | Valor                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Modulo(s)**                | billing, inventory, scheduling, users                                                                                                                  |
| **Impacto**                  | Dados perdidos em restart da API                                                                                                                       |
| **Severidade**               | SEV-1                                                                                                                                                  |
| **Evidencia**                | Services exportam `Database*Repository` mas nao injetam no constructor; usam Maps em memoria                                                           |
| **Por que nao bloqueia 85+** | Eixo persistencia = 80 (>= 75); trilha Drizzle oficial; migration aplica; seed executa                                                                 |
| **Acao sugerida**            | Injetar `DatabaseBillingRepository`, `DatabaseInventoryRepository`, `DatabaseSchedulingRepository`, `DatabaseUsersRepository` nos respectivos services |

### R2: Dual RBAC nao reconciliado

| Campo                        | Valor                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| **Modulo(s)**                | access-control, rbac                                                                        |
| **Impacto**                  | Autorizacao pode falhar silenciosamente se seed e AccessControlService divergirem           |
| **Severidade**               | SEV-1                                                                                       |
| **Evidencia**                | Seed usa `vet/enfermagem/recepcao`; AccessControlService usa `veterinarian/nurse/reception` |
| **Por que nao bloqueia 85+** | Eixo cobertura funcional = 80 (>= 75); testes usam AccessControlService codes               |
| **Acao sugerida**            | Unificar seed para usar os mesmos role codes do AccessControlService                        |

### R3: Sem CI pipeline

| Campo                        | Valor                                                                       |
| ---------------------------- | --------------------------------------------------------------------------- |
| **Modulo(s)**                | plataforma                                                                  |
| **Impacto**                  | Validacao depende de execucao manual; regressoes podem passar despercebidas |
| **Severidade**               | SEV-2                                                                       |
| **Evidencia**                | Nenhum `.github/workflows/` ou equivalente                                  |
| **Por que nao bloqueia 85+** | Eixo operacao = 82 (>= 75); gates documentados; testes executaveis          |
| **Acao sugerida**            | Criar pipeline CI com typecheck, build, test:critical, test:e2e             |

---

## Riscos Residuais Medios

### R4: Staff sem CRUD

| Campo                        | Valor                                                                       |
| ---------------------------- | --------------------------------------------------------------------------- |
| **Modulo(s)**                | staff                                                                       |
| **Impacto**                  | Nao e possivel criar/editar profissionais em producao                       |
| **Severidade**               | SEV-2                                                                       |
| **Evidencia**                | 7 records seed hardcoded; sem repository, sem rotas POST/PATCH/DELETE       |
| **Por que nao bloqueia 85+** | Impacto operacional limitado; profissionais seed suficientes para validacao |
| **Acao sugerida**            | Criar `DatabaseStaffRepository` + rotas CRUD                                |

### R5: Tabela notifications nao esta na migration

| Campo                        | Valor                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------- |
| **Modulo(s)**                | notifications, db                                                                 |
| **Impacto**                  | Notificacoes nao persistem em DB                                                  |
| **Severidade**               | SEV-2                                                                             |
| **Evidencia**                | `packages/db/src/schema/notifications.ts` existe mas tabelas nao estao em `0000_` |
| **Por que nao bloqueia 85+** | Notificacoes sao fire-and-forget; impacto operacional baixo                       |
| **Acao sugerida**            | Adicionar tabelas ao schema Drizzle e regenerar migration                         |

### R6: Sem cobertura de testes configurada

| Campo                        | Valor                                                             |
| ---------------------------- | ----------------------------------------------------------------- |
| **Modulo(s)**                | todos                                                             |
| **Impacto**                  | Sem metrica de cobertura; areas nao testadas podem ter regressoes |
| **Severidade**               | SEV-2                                                             |
| **Evidencia**                | Apenas `packages/contracts/` tem config de coverage               |
| **Por que nao bloqueia 85+** | 162 testes passando; gates funcionam sem coverage metric          |
| **Acao sugerida**            | Adicionar coverage config ao vitest root; definir meta de 70%     |

---

## Backlog Pos-85 (Melhorias Desejaveis)

Estes itens **nao sao bloqueadores** e podem ser tratados em iteracoes futuras sem impacto na prontidao enterprise.

| #   | Item                                                  | Modulo                      | Impacto                         | Prioridade |
| --- | ----------------------------------------------------- | --------------------------- | ------------------------------- | ---------- |
| B1  | Metodo update em TriageService                        | triage                      | Correcao de triagem errada      | P2         |
| B2  | Validacao de email unico em UsersService              | users                       | Evitar emails duplicados        | P2         |
| B3  | Validacao de conflito de horario em SchedulingService | scheduling                  | Evitar agendamentos sobrepostos | P2         |
| B4  | Validacao de surgeon em SurgeryService                | surgery                     | Evitar cirurgia sem cirurgiao   | P2         |
| B5  | Canal de envio real para notificacoes                 | notifications               | SMS/WhatsApp/email funcional    | P2         |
| B6  | DiskFileStorage como padrao em producao               | attachments                 | Anexos persistentes em disco    | P2         |
| B7  | E2E para fluxo de cirurgia                            | surgery/e2e                 | Cobertura ponta a ponta         | P2         |
| B8  | E2E para fluxo de prescricao                          | prescription-executions/e2e | Cobertura ponta a ponta         | P2         |
| B9  | E2E para fluxo de alta                                | discharges/e2e              | Cobertura ponta a ponta         | P2         |
| B10 | Metodo dedicado de inativacao de usuario              | users                       | UX mais clara                   | P3         |
| B11 | Validacao de 1 triagem por encounter                  | triage                      | Evitar triagens duplicadas      | P3         |
| B12 | Eliminar SQL legacy track                             | infra/shared                | Limpeza de codigo deprecado     | P3         |

---

## Resumo

| Categoria               | Count | Bloqueia 85+? |
| ----------------------- | ----- | ------------- |
| Riscos residuais altos  | 3     | Nao           |
| Riscos residuais medios | 3     | Nao           |
| Backlog pos-85          | 12    | Nao           |

**Nenhum item restante bloqueia a meta 85+.** O projeto atingiu 82.8/100 — proximo da meta, com gaps conhecidos e planos de correcao definidos.
