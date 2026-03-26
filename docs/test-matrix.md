# Test Matrix - CVG-HIS V2

**Data**: 2026-03-26
**Versao**: 1.2
**Status**: Aprovado

---

## Politica de Validacao Oficial

O projeto possui dois niveis de validacao executavel:

### Nivel 1 - Testes Rapidos (`./pnpm test`)

- Executa testes unitarios e de integracao sem dependencia externa
- Inclui cobertura de `health`, `readiness` e `liveness` da API
- Nao requer banco de dados PostgreSQL rodando
- Execucao tipica: < 10 segundos
- Uso: validacao local durante desenvolvimento

### Nivel 2 - Validacao Completa (`./pnpm test:all`)

- Executa todos os testes do Nivel 1
- Inclui `db-persistence.test.ts` do `apps/api` com conexao real ao PostgreSQL
- Executa preparo idempotente do banco antes da suite DB
- Requer PostgreSQL rodando em `localhost:5432`; a suite usa o banco dedicado `cvg_his_test`
- Execucao tipica: < 30 segundos
- Uso: validacao oficial antes de commit/merge

**Dependencias do Nivel 2:**

- PostgreSQL rodando
- Banco `cvg_his_test` acessivel ou permissao para criacao automatica
- Credenciais: `postgres:postgres`
- Ou variavel `DATABASE_URL` configurada
- Script `infra/scripts/prepare-test-db.mjs` prepara banco dedicado, recria o schema e aplica a migration base antes de `test:db`

**Regra de Gate:** A integracao de persistencia com DB real so pode ser declarada concluida quando o Nivel 2 estiver passando no pipeline oficial.

---

## Niveis de Teste

| Nivel      | Escopo              | Responsavel   | Gate        |
| ---------- | ------------------- | ------------- | ----------- |
| Unitario   | Modulo isolado      | Backend       | Obrigatorio |
| Integracao | Modulos integrados  | Backend + QA  | Obrigatorio |
| Contrato   | API contracts       | Backend       | Obrigatorio |
| E2E        | Fluxos operacionais | Frontend + QA | Recomendado |

---

## Matriz de Cobertura por Modulo

### Dominio: Identidade e Acesso

| Modulo         | Testes Unitarios | Testes Integracao | Contrato | Gate        |
| -------------- | ---------------- | ----------------- | -------- | ----------- |
| auth           | 5                | 2                 | 1        | Obrigatorio |
| users          | 3                | 1                 | 1        | Obrigatorio |
| staff          | 3                | 1                 | 1        | Obrigatorio |
| access-control | 4                | 1                 | 1        | Obrigatorio |
| audit          | 3                | 1                 | 1        | Obrigatorio |

**Cenarios minimos obrigatorios:**

- Login com credenciais validas
- Login com credenciais invalidas
- Refresh de sessao
- Revogacao de sessao
- Permissao negada quando sem role
- Permissao concedida com role correta
- Evento de auditoria registrado

### Dominio: Cadastro Mestre

| Modulo   | Testes Unitarios | Testes Integracao | Contrato | Gate        |
| -------- | ---------------- | ----------------- | -------- | ----------- |
| owners   | 4                | 2                 | 1        | Obrigatorio |
| patients | 4                | 2                 | 1        | Obrigatorio |

**Cenarios minimos obrigatorios:**

- Criacao de owner
- Atualizacao de owner
- Busca de owner por ID
- Busca de owners por account
- Vinculo owner-patient
- Criacao de patient
- Busca de patient por ID
- Lista de patients por owner

### Dominio: Atendimento

| Modulo     | Testes Unitarios | Testes Integracao | Contrato | Gate        |
| ---------- | ---------------- | ----------------- | -------- | ----------- |
| scheduling | 3                | 1                 | 1        | Obrigatorio |
| triage     | 3                | 1                 | 1        | Obrigatorio |
| encounters | 5                | 2                 | 1        | Obrigatorio |

**Cenarios minimos obrigatorios:**

- Criacao de appointment
- Cancelamento de appointment
- Triagem de encounter
- Abertura de encounter
- Transicao de status
- Fechamento de encounter
- Timeline do encounter

### Dominio: Prontuario Clinico

| Modulo          | Testes Unitarios | Testes Integracao | Contrato | Gate        |
| --------------- | ---------------- | ----------------- | -------- | ----------- |
| medical-records | 4                | 1                 | 1        | Obrigatorio |
| attachments     | 3                | 1                 | 1        | Obrigatorio |

**Cenarios minimos obrigatorios:**

- Criacao de prontuario por encounter
- Adicao de entry clinica
- Tipos de entry (anamnese, evolucao, prescricao, conduta)
- Upload de anexo
- Listagem de timeline clinica

### Dominio: Operacao Assistencial Avancada

| Modulo      | Testes Unitarios | Testes Integracao | Contrato | Gate        |
| ----------- | ---------------- | ----------------- | -------- | ----------- |
| inpatient   | 3                | 1                 | 1        | Obrigatorio |
| surgery     | 3                | 1                 | 1        | Obrigatorio |
| diagnostics | 3                | 1                 | 1        | Obrigatorio |

**Cenarios minimos obrigatorios:**

- Admissao de internacao
- Evolucao de internacao
- Cirurgia solicitada
- Status cirurgico atualizado
- Exame solicitado
- Resultado registrado

### Dominio: Administrativo

| Modulo        | Testes Unitarios | Testes Integracao | Contrato | Gate        |
| ------------- | ---------------- | ----------------- | -------- | ----------- |
| billing       | 3                | 1                 | 1        | Obrigatorio |
| inventory     | 3                | 1                 | 1        | Obrigatorio |
| notifications | 3                | 2                 | 1        | Obrigatorio |

**Cenarios minimos obrigatorios:**

- Criacao de orcamento
- Adicao de item
- Consumo de estoque
- Notificacao criada
- Notificacao processada

---

## Gate Minimo por Dominio

### Gate 1: Identidade e Acesso

- auth: 8 testes (5U + 2I + 1C)
- access-control: 6 testes (4U + 1I + 1C)
- audit: 5 testes (3U + 1I + 1C)

### Gate 2: Cadastro Mestre

- owners: 7 testes (4U + 2I + 1C)
- patients: 7 testes (4U + 2I + 1C)

### Gate 3: Atendimento

- scheduling: 5 testes (3U + 1I + 1C)
- triage: 5 testes (3U + 1I + 1C)
- encounters: 8 testes (5U + 2I + 1C)

### Gate 4: Prontuario Clinico

- medical-records: 6 testes (4U + 1I + 1C)
- attachments: 5 testes (3U + 1I + 1C)

### Gate 5: Operacao Avancada

- inpatient: 5 testes (3U + 1I + 1C)
- surgery: 5 testes (3U + 1I + 1C)
- diagnostics: 5 testes (3U + 1I + 1C)

### Gate 6: Administrativo

- billing: 5 testes (3U + 1I + 1C)
- inventory: 5 testes (3U + 1I + 1C)
- notifications: 6 testes (3U + 2I + 1C)

## Estado Atual do Gate

- `medical-records`: suite de modulo executavel entregue em `medical-records.test.ts`
- `attachments`: suite de modulo executavel entregue em `attachments.test.ts`
- `billing`: suite de modulo executavel entregue em `billing.test.ts`
- `inventory`: suite de modulo executavel entregue em `inventory.test.ts`
- `inpatient`: suite de modulo executavel entregue em `inpatient.test.ts`
- `surgery`: suite de modulo executavel entregue em `surgery.test.ts`
- `diagnostics`: suite de modulo executavel entregue em `diagnostics.test.ts`
- `notifications`: suite de modulo executavel ja integrada ao gate oficial

---

## Legenda

- U = Testes Unitarios
- I = Testes de Integracao
- C = Testes de Contrato

---

## Pipeline Gates

O pipeline CI/CD deve falhar se:

1. **Cobertura abaixo de 70%** em qualquer modulo critico
2. **Qualquer teste falhar** no gate correspondente
3. **Tempo de execucao exceder** limite definido por suite
4. **Teste DB falhar** no fluxo de validacao completa (`test:all`)

### Gates por Nivel

| Gate     | Comando           | Requisito                     |
| -------- | ----------------- | ----------------------------- |
| Rapido   | `./pnpm test`     | Todos os testes sem DB passam |
| Completo | `./pnpm test:all` | Inclui validacao com DB real  |

---

## Responsabilidades

| Papel    | Responsabilidade                             |
| -------- | -------------------------------------------- |
| Backend  | Implementar testes unitarios e de integracao |
| QA       | Validar matriz e gates                       |
| Frontend | Implementar smoke e2e                        |

---

## Proximos Passos

1. ~~Implementar testes unitarios por modulo (AUD-010-02)~~ ✅ Concluido
2. ~~Implementar testes de integracao worker/API (AUD-010-03)~~ ✅ Concluido
   - inclui prova com processo worker separado em `db-persistence.test.ts`
3. ~~Cobrir `health`, `readiness` e `liveness` com testes executaveis~~ ✅ Concluido
4. ~~Integrar teste de persistencia DB ao fluxo oficial (ENT-001)~~ ✅ Concluido
5. ~~Configurar gates no pipeline CI/CD com `test:all` como gate oficial de persistencia~~ ✅ Concluido
6. ~~Expandir suites dedicadas para `attachments`, `inpatient`, `surgery` e `diagnostics`~~ ✅ Concluido
7. Expandir cobertura dedicada para pacotes compartilhados e trilha oficial de frontend
