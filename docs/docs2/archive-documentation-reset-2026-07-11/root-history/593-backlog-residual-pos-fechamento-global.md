# 593 — Backlog Residual Pos-Fechamento Global

**Data:** 2026-04-01
**Status:** Final
**Base:** docs 531, 561, 587, 590, 592

---

## 1. Bloqueadores de Producao Autonoma

Estes itens **impedem a producao autonoma** mas **nao impedem a producao assistida forte**.

| #   | Item                                | Area/Modulo | Impacto                                                        | Severidade | Evidencia                                  | Por que bloqueia                                   | Acao sugerida                                             | Prioridade |
| --- | ----------------------------------- | ----------- | -------------------------------------------------------------- | ---------- | ------------------------------------------ | -------------------------------------------------- | --------------------------------------------------------- | ---------- |
| A1  | Sem cobertura de testes configurada | Qualidade   | Sem metrica de coverage; regressoes podem passar despercebidas | SEV-2      | Apenas contracts tem coverage config       | Sem metrica, nao ha garantia de qualidade continua | ✅ Resolvido — vitest v8 + script + CI coverage job       | ✅ Fechado |
| A2  | 3 fluxos sem E2E                    | E2E         | Cirurgia, prescricao e alta sem validacao ponta a ponta        | SEV-2      | 8/8 fluxos E2E, mas 3 assistenciais faltam | Validacao automatizada incompleta                  | ✅ Resolvido — 11 fluxos E2E (flows 9, 10, 11)            | ✅ Fechado |
| A3  | Sem monitoramento de producao       | Operacao    | Sem metrics, alerting ou APM                                   | SEV-2      | Logs via journal/systemd apenas            | Sem visibilidade proativa de problemas             | ✅ Resolvido — /metrics API + worker health + CI coverage | ✅ Fechado |
| A4  | Salt hardcoded em UsersService      | Seguranca   | `cvg-his-v2-seed-salt-v1` e constante                          | SEV-2      | Hardcoded em UsersService                  | Seguranca de senhas comprometida se codigo vazar   | ✅ Resolvido — randomBytes(16) por usuario                | ✅ Fechado |
| A5  | scryptSync bloqueante               | Performance | Hashing bloqueia event loop sob carga                          | SEV-2      | scryptSync em UsersService                 | Performance degrada sob carga de autenticao        | ✅ Resolvido — promisify(scrypt)                          | ✅ Fechado |

---

## 2. Riscos Residuais Altos

| #   | Item                                      | Area/Modulo | Impacto                | Severidade | Evidencia                                             | Por que nao bloqueia assistida | Acao sugerida | Prioridade |
| --- | ----------------------------------------- | ----------- | ---------------------- | ---------- | ----------------------------------------------------- | ------------------------------ | ------------- | ---------- |
| R1  | Queue entries do scheduling sao in-memory | scheduling  | ✅ Fechado neste ciclo | —          | `scheduling_queue_entries` + hydrate + testes HTTP/DB | —                              | ✅ Concluido  | ✅ Fechado |

---

## 3. Riscos Residuais Medios

| #   | Item                             | Area/Modulo   | Impacto                              | Severidade | Evidencia                                | Por que nao bloqueia assistida    | Acao sugerida                  | Prioridade |
| --- | -------------------------------- | ------------- | ------------------------------------ | ---------- | ---------------------------------------- | --------------------------------- | ------------------------------ | ---------- |
| R2  | Staff CRUD real                  | staff         | ✅ Fechado neste ciclo               | —          | Service + repository + API + UI + testes | —                                 | ✅ Concluido                   | ✅ Fechado |
| R3  | Notifications na migration       | notifications | ✅ Fechado neste ciclo               | —          | Migration + schema + API + worker        | —                                 | ✅ Concluido                   | ✅ Fechado |
| R4  | Triage sem versionamento clinico | triage        | Update existe, mas sem diff dedicado | SEV-3      | `PATCH /triage/:id` funcional e coberto  | Correcao operacional ja existe    | Versionar update clinico       | P2         |
| R5  | PDF server-side e HTML inline    | quotes        | Depende do browser para salvar PDF   | SEV-3      | `/quotes/:id/pdf` retorna HTML           | Funcional para operacao assistida | Adicionar geracao PDF dedicada | P3         |

---

## 4. Backlog Pos-Publicacao Assistida

Estes itens **nao sao bloqueadores** e podem ser tratados em iteracoes futuras.

| #   | Item                                                  | Modulo                    | Impacto                           | Prioridade |
| --- | ----------------------------------------------------- | ------------------------- | --------------------------------- | ---------- |
| B1  | Validacao de email unico em UsersService              | users                     | Evitar emails duplicados          | P2         |
| B2  | Validacao de conflito de horario em SchedulingService | scheduling                | Evitar agendamentos sobrepostos   | P2         |
| B3  | Validacao de surgeon em SurgeryService                | surgery                   | Evitar cirurgia sem cirurgiao     | P2         |
| B4  | Canal de envio real para notificacoes                 | notifications             | SMS/WhatsApp/email funcional      | P2         |
| B5  | DiskFileStorage como padrao em producao               | attachments               | Anexos persistentes em disco      | P2         |
| B6  | Metodo dedicado de inativacao de usuario              | users                     | UX mais clara                     | P3         |
| B7  | Validacao de 1 triagem por encounter                  | triage                    | ✅ Ja coberta pelo service        | ✅ Fechado |
| B8  | Eliminar SQL legacy track                             | infra/shared              | Limpeza de codigo deprecado       | P3         |
| B9  | Rotacao de caixa por operador/turno                   | cash                      | Suporte multi-turno               | P2         |
| B10 | E2E para fluxos comerciais                            | counter-sales/quotes/cash | Cobertura ponta a ponta comercial | P2         |
| B11 | Suites dedicadas para `staff`, `users` e `scheduling` | quality                   | ✅ Fechado na Fase E1             | ✅ Fechado |
| B12 | Smoke/regression automatizado do `apps/web`           | web                       | ✅ Fechado na Fase E1             | ✅ Fechado |

---

## 5. Resumo

| Categoria                 | Count | Bloqueia assistida? | Bloqueia autonoma? |
| ------------------------- | ----- | ------------------: | -----------------: |
| Bloqueadores de autonomia | 5     |                 Nao |                Sim |
| Riscos residuais altos    | 0     |                 Nao |                Nao |
| Riscos residuais medios   | 2     |                 Nao |                Nao |
| Backlog pos-assistida     | 10    |                 Nao |                Nao |

**Nenhum item bloqueia a publicacao para producao assistida forte.**

**5 itens bloqueiam a producao autonoma.** Estes devem ser tratados no proximo ciclo de endurecimento.

---

## 6. Recomendacao de Priorizacao

### Proximo Ciclo — Autonomia Operacional (3-4 sprints)

1. **Sprint 1:** Cobertura de testes + E2E cirurgia
2. **Sprint 2:** E2E prescricao + E2E alta + conflito de agenda
3. **Sprint 3:** versionamento clinico de triage + PDF dedicado + regressao web ampliada
4. **Sprint 4:** observabilidade externa, se necessario

**Nota projetada apos Ciclo de Autonomia: 93+/100**
