# 700 — Estratégia de Validação Sistêmica (ERP Veterinário)

**Status:** R0 — versão inicial baseada em diagnóstico real do repositório
**Data:** 2026-03-31
**Faixa:** 700-790

---

## 1. Objetivo

Construir uma camada de validação sistêmica que comprove, de forma automatizada e repetível, que os módulos do CVG-HIS-V2 operam como um ERP integrado — e não como partes isoladas que funcionam apenas em testes unitários.

A validação cobre fluxos ponta a ponta que cruzam módulos, com banco de dados real, e que exercem as permissões RBAC, as constraints de domínio e os reflexos entre módulos.

---

## 2. Princípios

1. **Evidência sobre hipótese.** Cada teste produz evidência executável de que um contrato de integração está satisfeito ou violado.
2. **Banco real como pré-requisito.** Nenhum teste de integração ou e2e roda contra mocks de banco. O PostgreSQL é parte do contrato.
3. **Fluxos, não rotas.** Os testes validam cadeias de causa-efeito entre módulos, não apenas respostas HTTP isoladas.
4. **Isolamento por execução.** Cada suite de fluxos limpa o estado do banco antes e depois. Sem dependência de ordem entre arquivos de teste.
5. **RBAC é parte do fluxo.** Permissões não são testadas separadamente do domínio — um usuário sem permissão que consegue operar um módulo é um bug de integração.
6. **Sem duplicação de runners.** A camada de validação usa os runners já existentes no repositório (vitest, node:test, playwright) sem introduzir novos.

---

## 3. Tipos de Teste Necessários

### 3.1 Testes de Fluxo de Integração (API-level, com banco real)

Nível: entre unitário e e2e. Usam `node:test` ou `vitest` com banco PostgreSQL isolado.

Validam cadeias como:

- usuário criado → autenticado → pode operar módulos conforme permissões reais
- tutor cadastrado → paciente vinculado → paciente aparece selecionável na agenda
- paciente + tutor → atendimento aberto → triagem registrada → status do encounter transita
- atendimento em andamento → prescrição registrada → execução de prescrição cria eventos de administração
- atendimento fechado → alta gerada → itens de billing refletidos
- consumo de estoque → notificação de reposição quando nível mínimo atingido
- setor/leito criados → internação com atribuição de leito → transferência de leito

### 3.2 Testes de Contrato de Módulo (API surface + contratos)

Validam que:

- cada rota aceita o schema de request definido em `packages/contracts/`
- cada rota produz o schema de response esperado
- erros de validação retornam `ValidationError` com correlationId
- erros de autorização retornam `AuthenticationError` ou `ForbiddenError`

### 3.3 Testes E2E (Playwright, UI + API)

Estender os fluxos existentes (`fluxo-principal`, `fluxo-internacao`, `fluxo-exames`) para cobrir:

- billing e financeiro (hoje ausente nos e2e)
- cirurgia (hoje ausente nos e2e)
- prescrição e execução (hoje ausente nos e2e UI)
- auditoria e controle de acesso (hoje ausente nos e2e)
- notificações operacionais (hoje ausente nos e2e)

### 3.4 Testes de Migração e Schema

Validam que:

- as migrations Drizzle (`packages/db/migrations/0000_`) aplicam sem erro em banco limpo
- o seed Drizzle (`packages/db/src/seed.ts`) popula dados consistentes
- não há divergência entre o schema Drizzle e o schema SQL legado usado nos testes de persistência
- FKs, índices e constraints estão presentes e funcionais

### 3.5 Testes de RBAC e Autorização

Validam que:

- cada role (admin, reception, veterinarian, nurse, finance, inventory, auditor) tem exatamente as permissões esperadas
- um usuário com role X consegue acessar rota Y e é bloqueado em rota Z
- o dual RBAC (`packages/rbac/` vs `packages/modules/access-control/`) é reconciliado ou um é eliminado

---

## 4. Lacunas Atuais Encontradas

### 4.1 Lacunas de Infraestrutura de Teste

| Lacuna                                        | Evidência                                                           | Impacto                                               |
| --------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| 3 runners de teste coexistem sem orquestração | vitest nos módulos, node:test na API, playwright nos e2e            | `pnpm test` não executa tudo de forma integrada       |
| Sem vitest.config para 20 módulos             | Nenhum `vitest.config.ts` encontrado em `packages/modules/*/`       | Configuração frágil, sem cobertura, sem isolamento    |
| Sem cobertura configurada para módulos ou API | Apenas `packages/contracts/` tem config de coverage                 | Não há métrica de cobertura real                      |
| Sem shared test utilities                     | Cada módulo constrói seu grafo de serviços do zero                  | Duplicação, inconsistência, dificuldade de manutenção |
| E2E fixture com baseURL mismatch              | `cvg-his.fixture.ts` usa `localhost:3000`, smoke config usa `:4001` | Testes de fluxo podem apontar para API errada         |
| Sem CI pipeline                               | Nenhum `.github/workflows/` ou equivalente                          | Sem execução automática de testes                     |

### 4.2 Lacunas de Integração entre Módulos

| Lacuna                                                                              | Evidência                                                                                            | Impacto                                                                         |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Billing, Inventory, Scheduling, Users: repositórios DB exportados mas não injetados | Service constructors não aceitam repo DB                                                             | Dados persistem apenas em memória — perdidos entre requisições reais            |
| Discharges e PrescriptionExecutions sem validação de encounter                      | Não verificam existência do encounter referenciado                                                   | Dados órfãos possíveis                                                          |
| Staff: sem repositório, sem CRUD, sem persistência DB                               | Apenas 7 seed records hardcoded                                                                      | Não é possível criar/editar staff em produção                                   |
| Dual RBAC com role names diferentes                                                 | `rbac/permissions.ts`: vet, enfermaria, recepcao vs `access-control`: veterinarian, nurse, reception | Autorização pode falhar silenciosamente dependendo de qual sistema é consultado |
| Dual audit packages                                                                 | `packages/audit/` (DB-backed) e `modules/audit/` (in-memory)                                         | Eventos de auditoria podem ser gravados em dois lugares diferentes              |
| Triage imutável                                                                     | Sem método update em TriageService                                                                   | Não há correção de triagem errada                                               |
| Prescription-executions sem validação de existência                                 | Não valida clinicalEntryId, patientId, encounterId                                                   | Execuções podem referenciar entidades inexistentes                              |

### 4.3 Lacunas de Banco de Dados

| Lacuna                                   | Evidência                                                                                      | Impacto                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Dual migration tracks                    | Drizzle (`packages/db/migrations/`) vs SQL legado (`packages/shared/database/src/migrations/`) | Testes de persistência usam schema diferente do production |
| seed.sql referencia tabelas inexistentes | `inventory_items`, `medical_records`, `owner_patient_links` não existem no schema Drizzle      | Seed legado falha silenciosamente ou corrompe estado       |
| Permission keys diferentes entre seeds   | `owner.read` (seed.ts) vs `owners.read` (seed.sql)                                             | Permissões inconsistentes entre ambientes                  |
| Role names diferentes entre seeds        | `vet/enfermagem/recepcao` vs `veterinarian/nurse/reception`                                    | Roles não mapeiam corretamente                             |
| SHA-256 para hash de senha no seed       | `seed.ts` usa `crypto.createHash('sha256')`                                                    | Inseguro e incompatível com bcrypt do UsersService         |

### 4.4 Lacunas de Cobertura de Fluxos E2E

| Fluxo                   | Cobertura Atual                    | Status           |
| ----------------------- | ---------------------------------- | ---------------- |
| Login → Dashboard       | UI (smoke)                         | Coberto          |
| Tutor CRUD              | UI (smoke)                         | Coberto          |
| Paciente CRUD           | UI (smoke)                         | Coberto          |
| Atendimento (encounter) | UI (smoke) + API (fluxo-principal) | Coberto          |
| Prontuário              | UI (smoke)                         | Coberto          |
| Agendamento             | API (fluxo-principal)              | Parcial (sem UI) |
| Internação              | API (fluxo-internacao)             | Parcial (sem UI) |
| Exames                  | API (fluxo-exames)                 | Parcial (sem UI) |
| Cirurgia                | Nenhum teste                       | **Ausente**      |
| Billing/Financeiro      | Nenhum teste e2e                   | **Ausente**      |
| Prescrição + Execução   | Nenhum teste e2e                   | **Ausente**      |
| Estoque/Farmácia        | Nenhum teste e2e                   | **Ausente**      |
| Notificações            | Nenhum teste e2e                   | **Ausente**      |
| Auditoria               | Nenhum teste e2e                   | **Ausente**      |
| Controle de Acesso      | Nenhum teste e2e                   | **Ausente**      |
| Alta (discharge)        | API (fluxo-internacao)             | Parcial          |

---

## 5. Proposta Inicial da Arquitetura de Testes

### 5.1 Estrutura de Diretórios

```
tests/                          # Nova raiz para validação sistêmica
├── integration/                # Testes de fluxo com banco real
│   ├── fixtures/               # Factories, builders, helpers compartilhados
│   │   ├── db-setup.ts         # Setup/teardown de banco isolado
│   │   ├── auth-fixture.ts     # Cria usuário, faz login, retorna principal
│   │   ├── owner-factory.ts    # Factory para tutores
│   │   ├── patient-factory.ts  # Factory para pacientes
│   │   ├── encounter-factory.ts
│   │   └── ...
│   ├── flows/                  # Fluxos de integração por domínio
│   │   ├── auth-rbac-flow.test.ts
│   │   ├── owner-patient-flow.test.ts
│   │   ├── scheduling-flow.test.ts
│   │   ├── encounter-triage-flow.test.ts
│   │   ├── medical-records-flow.test.ts
│   │   ├── inpatient-flow.test.ts
│   │   ├── surgery-flow.test.ts
│   │   ├── diagnostics-flow.test.ts
│   │   ├── billing-flow.test.ts
│   │   ├── inventory-flow.test.ts
│   │   ├── prescription-execution-flow.test.ts
│   │   ├── discharge-flow.test.ts
│   │   └── notifications-flow.test.ts
│   └── vitest.config.ts        # Config unificada para testes de integração
├── migration/                  # Testes de migração e schema
│   └── migration-integrity.test.ts
├── e2e/                        # Extensão dos e2e existentes (symlink ou cópia)
│   └── (herda de e2e/ existente)
└── README.md
```

### 5.2 Runner Unificado

- **Integração:** vitest com `globalSetup`/`globalTeardown` para banco isolado
- **E2E:** playwright mantém config atual, aponta para API real
- **Comando raiz:** `pnpm test:validation` orquestra vitest (integração) + playwright (e2e) em sequência

### 5.3 Banco de Teste Isolado

- Database: `cvg_his_v2_validation` (separado de dev e test existentes)
- Setup: aplica migration Drizzle `0000_` + seed Drizzle `seed.ts`
- Teardown: drop schema public após cada suite
- Sem uso do SQL legado para testes de validação

### 5.4 Factories Compartilhadas

Cada factory:

- Cria entidade via service real (não via insert direto no DB)
- Retorna o objeto criado com IDs válidos
- Registra para cleanup automático
- Aceita overrides parciais

Exemplo de cadeia de factories:

```
createAccount() → createUser(account, roles) → login(user) → principal
principal → createOwner() → createPatient(owner) → createAppointment(patient)
```

---

## 6. Próximos Arquivos da Faixa 700-790

| Arquivo                                | Conteúdo                                                              |
| -------------------------------------- | --------------------------------------------------------------------- |
| `710-integration-test-architecture.md` | Arquitetura detalhada dos testes de integração                        |
| `720-flow-specifications.md`           | Especificação de cada fluxo de validação (inputs, outputs, asserções) |
| `730-rbac-validation-matrix.md`        | Matriz de permissões por role × recurso                               |
| `740-database-isolation-strategy.md`   | Estratégia de isolamento de banco para testes                         |
| `750-factory-and-fixture-design.md`    | Design das factories e fixtures compartilhadas                        |
| `760-e2e-extension-plan.md`            | Plano de extensão dos testes e2e existentes                           |
| `770-migration-integrity-tests.md`     | Especificação dos testes de migração                                  |
| `780-ci-pipeline-for-validation.md`    | Pipeline de CI para execução automática                               |
| `790-validation-gate-criteria.md`      | Critérios de aceite para a camada de validação                        |

---

## 7. Notas de Execução

- Este documento é uma versão R0 baseada exclusivamente no estado real do repositório em 2026-03-31.
- Nenhuma estrutura de teste foi criada nesta etapa.
- Nenhuma lógica de negócio foi alterada.
- Os documentos 710-790 serão construídos sobre as evidências levantadas aqui e no documento 705.
