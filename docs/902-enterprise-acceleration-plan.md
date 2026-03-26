# Enterprise Acceleration Plan

Data atualizacao: 2026-03-26
Origem: consolidacao da auditoria executiva, backlog `900` e validacoes recentes do sistema
Objetivo: elevar o `cvg-his-v2` de beta tecnico solido para faixa de `88-92/100`, com prontidao para producao limitada e rollout controlado

## Contexto Executivo

O sistema saiu do estagio de demonstracao e ja possui:

- `typecheck`, `build` e `test` em verde
- persistencia transitoria validada por repositories compartilhados
- `AUD-008-03` concluido com bootstrap local, retries e healthcheck coberto por testes
- `AUD-007-01` e `AUD-010-03` concluídos no escopo atual de integracao worker/API

Ao mesmo tempo, a nota geral ainda permanece abaixo de producao enterprise porque faltam:

- persistencia real em banco no fluxo principal
- fechamento do frontend oficial
- smoke e2e da trilha canonica
- endurecimento de seguranca, prontuario e rollout
- plano executavel de migracao e operacao assistida

## Meta de Nota

| Faixa  | Estado                             |
| ------ | ---------------------------------- |
| 74/100 | estado atual consolidado           |
| 80-84  | producao tecnica inicial           |
| 85-88  | beta operacional forte             |
| 89-92  | producao limitada enterprise-ready |

## Principios do Plano

1. Nao inflar status sem prova executavel.
2. Priorizar runtime, persistencia e operacao antes de acabamento superficial.
3. Tratar `/docs` como fonte de verdade e manter backlog, testes e codigo coerentes.
4. Consolidar uma unica trilha canonica de backend, worker e frontend.
5. Fechar primeiro o que aumenta maturidade de producao, nao apenas escopo funcional.

## Ondas de Execucao

### Onda 1 - Producao Tecnica

Objetivo: remover os principais bloqueios tecnicos para operar em ambiente real controlado.

| Enterprise ID | Entrega                                                  | Backlog relacionado                                   | Resultado esperado                                                             | Criterio de aceite                                                                                          |
| ------------- | -------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| ENT-001       | Conectar DB real ao fluxo principal                      | `AUD-008`, `AUD-002`, `AUD-003`, `AUD-004`, `AUD-005` | **Concluido** - DB real conectado ao fluxo principal; `test:all` estabilizado com `db-persistence.test.ts` em banco dedicado de teste | Escrita e leitura sobrevivem a restart real de processo e a trilha principal usa repositories de banco real |
| ENT-002       | Fechar integracao real API/worker em processos separados | `AUD-007-01`, `AUD-010-03`                            | **Concluido** - API grava notificacoes no DB real e worker em processo separado consome e processa pelo mesmo repository | Worker processa notificacao criada pela API em outro processo com teste executavel                          |
| ENT-003       | Endurecer readiness e observabilidade                    | `AUD-008-03`, `AUD-010`                               | **Concluido** - API expõe `/health`, `/ready` e `/live`; dependencias refletem DB, repositories e worker; worker loga estado real de persistencia | DB, fila, worker e modo de persistencia ficam visiveis e testaveis                                          |
| ENT-004       | Expandir testes de integracao e contratos                | `AUD-010`                                             | **Concluido** - pipeline oficial segue verde com suites dedicadas para `medical-records`, `attachments`, `billing`, `inventory`, `inpatient`, `surgery` e `diagnostics`, alem dos contratos criticos do nucleo cobertos por `test:all` | Pipeline falha em regressao de contratos criticos                                                           |

### Onda 2 - Produto Operacional

Objetivo: consolidar a trilha oficial de uso do sistema e validar ponta a ponta.

| Enterprise ID | Entrega                                          | Backlog relacionado                           | Resultado esperado                                                     | Criterio de aceite                                                         |
| ------------- | ------------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ENT-005       | Definir frontend oficial do V2                   | `AUD-009-01`, `AUD-001-02`                    | Um unico app oficial para a trilha operacional                         | Docs, scripts e onboarding apontam para o mesmo frontend                   |
| ENT-006       | Consolidar fluxos principais no frontend oficial | `AUD-009-02`, `AUD-003`, `AUD-004`, `AUD-005` | Login, cadastro, atendimento e prontuario funcionam na trilha canonica | Usuario completa fluxo principal sem depender de app paralelo              |
| ENT-007       | Criar smoke e2e oficial                          | `AUD-009-03`, `AUD-010`                       | Validacao ponta a ponta do produto oficial                             | Pipeline roda smoke cobrindo login, owner, patient, encounter e prontuario |
| ENT-008       | Fechar prontuario enterprise base                | `AUD-005-02`, `AUD-005-03`                    | Anexos reais, revisao e trilha minima de integridade                   | Storage real, checksum e versionamento minimo estao ativos                 |

### Onda 3 - Endurecimento Enterprise

Objetivo: preparar o sistema para operacao controlada com governanca, seguranca e migracao.

| Enterprise ID | Entrega                                      | Backlog relacionado | Resultado esperado                                                       | Criterio de aceite                                                       |
| ------------- | -------------------------------------------- | ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| ENT-009       | Endurecimento de seguranca                   | `AUD-002-03`        | Seeds, segredos e credenciais deixam de ser risco operacional            | Nao ha dependencia de contas hardcoded ou segredos fracos no uso normal  |
| ENT-010       | Fechar operacao assistencial avancada minima | `AUD-006`           | Internacao, cirurgia e diagnosticos deixam de ser apenas base estrutural | Transferencia, alta formal, equipe cirurgica e catalogos minimos existem |
| ENT-011       | Preparar migracao e rollout controlado       | `AUD-011`           | Dry-run, staging, reconciliacao e rollback passam a ser executaveis      | Existe plano de corte controlado com checklist e ensaio real             |

## Backlog Executivo Derivado

| ID      | Task                                                                     | Owner                      | Prioridade | Esforco | Dependencia               | Aceite                                                                  | Status inicial                                                                                                                                                                                                                                                                                                                |
| ------- | ------------------------------------------------------------------------ | -------------------------- | ---------- | ------- | ------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ENT-001 | Conectar repositories reais de banco ao fluxo principal da API           | Backend + Data             | P0         | XL      | `AUD-008-03`              | Fluxos centrais operam com DB real e sobrevivem a restart de processo   | **Concluido** (`db-persistence.test.ts` estabilizado no fluxo oficial via `./pnpm test:all`, com banco dedicado `cvg_his_test`, preparo automatico e 5/5 testes de persistencia real passando) |
| ENT-002 | Compartilhar estado/fila real entre API e worker                         | Backend + Worker           | P0         | L       | ENT-001                   | Notificacao criada na API e processada por worker em outro processo     | **Concluido** (worker ganhou bootstrap proprio com DB real; `runWorkerTick` processa via repository; `db-persistence.test.ts` prova que a API grava notificacao no banco e um processo worker separado a marca como `sent` e o job como `processed`) |
| ENT-003 | Consolidar readiness, liveness e observabilidade de dependencias         | Backend + Operacoes        | P0         | M       | ENT-001, ENT-002          | Health/readiness refletem DB, fila, worker e modo real de operacao      | **Concluido** (`health.ts` passou a expor estado de database, repositories e worker; API ganhou `/ready` e `/live`; `health.test.ts` cobre 8 cenarios; worker passou a logar `persistenceMode`, `databaseHealthy` e `databaseDetail` reais) |
| ENT-004 | Expandir testes de integracao e contratos criticos                       | QA + Backend               | P0         | L       | ENT-001, ENT-002          | Pipeline cobre persistencia real, worker/API e fluxos clinicos centrais | **Concluido** (`medical-records`, `attachments`, `billing`, `inventory`, `inpatient`, `surgery` e `diagnostics` deixaram de usar placeholder `no tests` e ganharam suites de modulo executadas no gate oficial; `./pnpm test:all` segue verde com contratos criticos do nucleo, DB real e worker em processo separado)                                                                                                                                 |
| ENT-005 | Definir frontend oficial do V2                                           | Arquitetura + Frontend     | P0         | M       | `AUD-001-01`              | Um frontend canonico unico foi formalizado                              | Todo                                                                                                                                                                                                                                                                                                                          |
| ENT-006 | Consolidar login, cadastro, atendimento e prontuario no frontend oficial | Frontend + Backend         | P0         | XL      | ENT-005, ENT-001          | Fluxo operacional principal funciona no app oficial                     | Todo                                                                                                                                                                                                                                                                                                                          |
| ENT-007 | Criar smoke e2e do produto oficial                                       | Frontend + QA              | P1         | M       | ENT-006                   | Pipeline executa smoke dos fluxos principais                            | Todo                                                                                                                                                                                                                                                                                                                          |
| ENT-008 | Implementar anexos reais e versionamento clinico minimo                  | Backend + Clinical + Data  | P1         | L       | ENT-001                   | Prontuario possui storage real, integridade e revisao minima            | Todo                                                                                                                                                                                                                                                                                                                          |
| ENT-009 | Endurecer seeds, credenciais e segredos                                  | Backend + Security         | P1         | S       | ENT-001                   | Nao ha dependencia de contas padrao inseguras no uso normal             | Todo                                                                                                                                                                                                                                                                                                                          |
| ENT-010 | Fechar operacao assistencial avancada minima                             | Backend + Clinical         | P1         | XL      | ENT-001, ENT-008          | Internacao, cirurgia e diagnosticos atingem operacao minima real        | Todo                                                                                                                                                                                                                                                                                                                          |
| ENT-011 | Preparar staging, dry-run, reconciliacao e rollback                      | Data + Operacoes + Produto | P1         | XL      | ENT-001, ENT-002, ENT-006 | Migracao e rollout controlado tornam-se executaveis                     | Todo                                                                                                                                                                                                                                                                                                                          |

## Sequencia Recomendada

1. `ENT-001`
2. `ENT-002`
3. `ENT-003`
4. `ENT-004`
5. `ENT-005`
6. `ENT-006`
7. `ENT-007`
8. `ENT-008`
9. `ENT-009`
10. `ENT-010`
11. `ENT-011`

## Metas por Onda

| Onda   | Meta de nota | Estado esperado                    |
| ------ | ------------ | ---------------------------------- |
| Onda 1 | 80-84        | producao tecnica inicial           |
| Onda 2 | 85-88        | beta operacional forte             |
| Onda 3 | 89-92        | producao limitada enterprise-ready |

## Criterios de Prontidao 90+

O sistema so deve ser tratado como proximo de `90/100` quando:

1. o fluxo principal nao depender de persistencia in-memory como base operacional
2. API e worker compartilharem fila/estado real entre processos
3. o frontend oficial estiver definido e validado por smoke e2e
4. prontuario possuir storage real e revisao minima
5. readiness e observabilidade refletirem as dependencias reais
6. migracao e rollout controlado tiverem trilha executavel
7. nenhum dominio nuclear (`AUD-002`, `AUD-003`, `AUD-004`, `AUD-005`, `AUD-007`, `AUD-008`, `AUD-010`) estiver abaixo de `75`

## Relacao com o Backlog 900

- Este plano nao substitui o `900-executive-audit-backlog.md`.
- O `900` continua sendo a auditoria executiva por area.
- O `902` e o plano de aceleracao para transformar a auditoria em execucao rumo a `90+`.
- Quando uma entrega `ENT-*` for concluida, o `900` deve ser atualizado com a nova leitura por area.

## Proximo Passo Recomendado

Iniciar por `ENT-001`, porque:

- ele destrava a maturidade real de `AUD-008`
- melhora `AUD-002`, `AUD-003`, `AUD-004` e `AUD-005`
- reduz o principal gap entre beta tecnico e operacao real
- prepara o terreno para `ENT-002` e `ENT-003`
