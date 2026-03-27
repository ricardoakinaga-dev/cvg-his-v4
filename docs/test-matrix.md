# Test Matrix - CVG-HIS V2

**Data**: 2026-03-26
**Versao**: 1.2
**Status**: Aprovado

---

## Politica de Validacao Oficial

O projeto possui dois niveis de validacao executavel e um gate explicito de release:

### Nivel 1 - Testes Rapidos (`./pnpm test`)

- Executa testes unitarios e de integracao sem dependencia externa
- Inclui cobertura de `health`, `readiness` e `liveness` da API
- Nao requer banco de dados PostgreSQL rodando
- Execucao tipica: < 10 segundos
- Uso: validacao local durante desenvolvimento

### Nivel 2 - Validacao Completa (`./pnpm test:all`)

- Executa todos os testes do Nivel 1
- Inclui `db-persistence.test.ts` do `apps/api` com conexao real ao PostgreSQL
- Valida persistencia real de `medical-records`, `attachments`, `notifications`, `inpatient`, `surgery` e `diagnostics`
- Executa preparo idempotente do banco antes da suite DB
- Requer PostgreSQL rodando em `localhost:5432`; a suite usa o banco dedicado `cvg_his_test`
- Execucao tipica: < 30 segundos
- Uso: validacao oficial antes de commit/merge

### Nivel 3 - Smoke E2E (integrado a `./pnpm test:all`)

- Executa smoke ponta a ponta com Playwright contra `apps/web` e `apps/api`
- Inicia automaticamente API (porta 4001) e Web (porta 4000) via Playwright webServer
- Cobre 6 cenarios: login→dashboard, owner flow, patient flow, encounter flow, medical-record flow, navegacao
- Nao requer PostgreSQL (usa in-memory repositories)
- Nao requer servidores externos rodando
- Execucao tipica: < 40 segundos
- Uso: integrado ao gate `test:all`; validacao oficial de integridade do frontend canonico

### Gate de Release (`./pnpm release:check`)

- Executa `./pnpm typecheck`
- Executa `./pnpm build`
- Executa `./pnpm test:all`
- Representa o gate oficial antes de release/merge sensivel
- Uso: validacao final de release, mantendo um unico comando rastreavel
- Estado atual: **FORMALIZADO** - passa no ambiente validado com PostgreSQL disponivel; em ambiente restrito pode bloquear na preparacao do DB de teste

**Observacao atual do Nivel 3:**

- smoke integrado ao gate oficial `test:all`
- assercoes endurecidas: login confirma KPIs e quick-actions, owner confirma alert e listagem, patient confirma feedback visual, encounter confirma tabela, medical-record confirma busca funcional

**Politica de validacao oficial estabilizada:**

- `./pnpm release:check` permanece o gate oficial; typecheck e build passam, e `test:all` passa no ambiente validado com PostgreSQL disponivel
- `./pnpm test:all` cobre suites de modulo + db-persistence.test.ts + smoke e2e
- O gate oficial de release esta operacional, mas sua reproducao completa depende de banco acessivel ou permissao de Docker para `prepare-test-db.mjs`

**Dependencias do Nivel 2:**

- PostgreSQL rodando
- Banco `cvg_his_test` acessivel ou permissao para criacao automatica
- Credenciais: `postgres:postgres`
- Ou variavel `DATABASE_URL` configurada
- Script `infra/scripts/prepare-test-db.mjs` prepara banco dedicado, recria o schema e aplica as migrations antes de `test:db`
- Se PostgreSQL nao estiver previamente acessivel, o script depende de permissao para usar Docker e subir `postgres` via `docker compose`
- **Alternativa**: Para usar uma instancia PostgreSQL existente sem preparar via Docker, defina:
  - `SKIP_DB_SETUP=true` - pula a preparacao automatica do banco
  - `DATABASE_URL` - URL completa para o banco existente com schema ja aplicado
  - Exemplo: `SKIP_DB_SETUP=true DATABASE_URL=postgres://user:pass@host:5432/cvg_his_test pnpm test:db`

**Dependencias minimas de staging:**

- `DATABASE_URL`
- `FILE_STORAGE_PATH`
- `AUTH_SECRET` diferente do secret default quando `NODE_ENV=staging`
- `STAGING_READY_URL` opcional para validar `/ready` em ambiente ativo
- Script `infra/scripts/check-staging.mjs` formaliza a checagem minima

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
| medical-records | 11               | 1                 | 1        | Obrigatorio |
| attachments     | 4                | 1                 | 1        | Obrigatorio |

**Cenarios minimos obrigatorios:**

- Criacao de prontuario por encounter
- Adicao de entry clinica com version 1
- Tipos de entry (anamnese, evolucao, prescricao, conduta)
- Atualizacao de entry com incremento de versao e revisao
- Bloqueio de stale update via guarda de versao (`expectedVersion`)
- Arquivamento logico de entry com autoria e motivo
- Historico de revisoes consultavel
- Upload de anexo com checksum verificado
- Integridade de anexo (SHA-256, sizeBytes, mimeType)
- Conteudo do anexo recuperavel apos restart real
- Entry atual, revisoes e timeline reidratadas por repository apos restart
- Entry arquivada deixa de aparecer na listagem ativa, mas continua disponivel no historico apos restart
- Listagem de timeline clinica

### Dominio: Operacao Assistencial Avancada

| Modulo      | Testes Unitarios | Testes Integracao | Contrato | Gate        |
| ----------- | ---------------- | ----------------- | -------- | ----------- |
| inpatient   | 7                | 1                 | 1        | Obrigatorio |
| surgery     | 7                | 1                 | 1        | Obrigatorio |
| diagnostics | 9                | 1                 | 1        | Obrigatorio |
| sectors     | 0                | 1                 | 1        | Obrigatorio |
| beds        | 0                | 1                 | 1        | Obrigatorio |

**Cenarios minimos obrigatorios:**

- Admissao de internacao
- Evolucao de internacao
- Transferencia de unidade/ala com metadados
- Alta formal com motivo e timestamp
- Transicoes validas/invalidas de status
- Cirurgia solicitada com equipe
- Lifecycle cirurgico completo (requested->pre_op->in_progress->recovery->completed)
- Cancelamento de caso cirurgico
- Exame solicitado com catalogo
- Coleta de exame com profissional
- Resultado de exame com resumo
- Transicoes validas/invalidas de diagnostico
- Catalogo de exames disponivel
- Criacao de setor (sector)
- Criacao de leito (bed) em setor
- Atribuicao de leito a internacao (assign-bed)
- Transferencia de leito (transfer-bed)
- Bedmap com ocupacao atualizada
- Alta libera leito automaticamente

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

- medical-records: 13 testes (11U + 1I + 1C)
- attachments: 5 testes (3U + 1I + 1C)

### Gate 5: Operacao Avancada

- inpatient: 8 testes (7U + 1I)
- surgery: 8 testes (7U + 1I)
- diagnostics: 10 testes (9U + 1I)
- sectors: 1 teste integracao (1I)
- beds: 1 teste integracao (1I)

### Gate 6: Administrativo

- billing: 5 testes (3U + 1I + 1C)
- inventory: 5 testes (3U + 1I + 1C)
- notifications: 6 testes (3U + 2I + 1C)

## Estado Atual do Gate

- `medical-records`: suite de modulo executavel entregue em `medical-records.test.ts`, incluindo soft-delete logico e bloqueio de stale update por versao
- `attachments`: suite de modulo executavel entregue em `attachments.test.ts`
- `billing`: suite de modulo executavel entregue em `billing.test.ts`
- `inventory`: suite de modulo executavel entregue em `inventory.test.ts`
- `inpatient`: suite de modulo executavel entregue em `inpatient.test.ts`
- `surgery`: suite de modulo executavel entregue em `surgery.test.ts`
- `diagnostics`: suite de modulo executavel entregue em `diagnostics.test.ts`
- `notifications`: suite de modulo executavel ja integrada ao gate oficial
- `sectors`: CRUD integrado ao teste de persistencia de internacao
- `beds`: CRUD integrado ao teste de persistencia de internacao; bedmap testado
- `db-persistence.test.ts`: prova integrada ao gate oficial para `medical-records`, `attachments`, `notifications`, worker/API, `inpatient`, `surgery`, `diagnostics`, `sectors` e `beds` com DB real e re-instanciacao; para prontuario, cobre anexos reais, revisoes/versionamento, soft-delete logico e reidratacao apos restart; para estrutura hospitalar, cobre criacao de setores/leitos, atribuicao de leito a internacao, transferencia, bedmap com ocupacao e persistencia apos restart

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

| Gate     | Comando                | Requisito                                           |
| -------- | ---------------------- | --------------------------------------------------- |
| Rapido   | `./pnpm test`          | Todos os testes sem DB passam                       |
| Completo | `./pnpm test:all`      | Inclui validacao com DB real + smoke e2e Playwright |
| Smoke    | `./pnpm test:smoke`    | (atalho) Executa apenas smoke e2e Playwright        |
| Release  | `./pnpm release:check` | Executa typecheck + build + validacao completa      |

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
7. ~~Smoke e2e do frontend canonico com Playwright (ENT-007)~~ ✅ Concluido
   - integrado ao gate `test:all`
8. ~~Corrigir regressoes em `medical-records` e `attachments`~~ ✅ Concluido
   - gates de release agora estao verdes
9. ~~Endurecer segredos, credenciais e seeds (ENT-009)~~ ✅ Concluido
   - validacao de secret em staging/production (min 32 chars)
   - senhas seed com prefixo `seed_` e salt dedicado
10. Expandir cobertura dedicada para pacotes compartilhados

- assercoes endurecidas para provar efeito real nos fluxos

8. ~~Corrigir regressoes em `medical-records` e `attachments`~~ ✅ Concluido
   - gates de release agora estao verdes
9. Expandir cobertura dedicada para pacotes compartilhados
