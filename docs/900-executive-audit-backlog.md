# Executive Audit Backlog

Data atualizacao: 2026-03-26
Origem: auditoria de aderencia ao roadmap + inspecao do sistema implementado
Status da revisao: backlog revisado contra o estado real do codigo e validacoes executaveis

## Escala

- 90-100: pronto, com melhorias incrementais
- 70-89: funcional, mas com lacunas relevantes
- 50-69: implementado de forma parcial ou pouco resiliente
- 0-49: documentado ou demonstrado, mas nao pronto para operacao real

## Revisao Executiva

- `./pnpm test`: PASS (testes rapidos sem DB)
- `./pnpm test:all`: PASS
- `./pnpm typecheck`: PASS
- `./pnpm build`: PASS
- Persistencia: DB real conectado ao fluxo principal; `db-persistence.test.ts` integrado ao fluxo oficial via `test:all`; politica de dois niveis documentada em `test-matrix.md` e validada com banco dedicado `cvg_his_test`
- Documentacao: existe evidencia forte de execucao em `/docs`

## Auditoria Executiva

| Backlog ID | Area                                             | Nota | Riscos P0                                                                                                                                                                                                                        | Riscos P1                                                                                                     | Riscos P2                                                        | Acao recomendada                                                                                         |
| ---------- | ------------------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| AUD-001    | Fundacao do monorepo e coerencia arquitetural    | 88   | Ainda existem sinais de coexistencia e drift entre trilhas canonicamente desejadas e trilhas legadas/paralelas                                                                                                                   | Scripts e docs melhoraram, mas o alinhamento final ainda nao esta encerrado                                   | Onboarding segue sujeito a contexto historico                    | Fechar consolidacao da trilha canonica do V2 e remover ambiguidades residuais de runtime, scripts e docs |
| AUD-002    | Identidade, acesso e governanca                  | 70   | AuthService e AuditService recebem repositories via runtime; teste 9 prova sobrevivencia de sessao e audit events a re-instanciação                                                                                              | Seeds e contas de validacao hardcoded reduzem confiabilidade                                                  | DB real conectado ao fluxo principal                             | Endurecer segredos e adicionar testes especificos                                                        |
| AUD-003    | Cadastro mestre                                  | 72   | OwnersService e PatientsService recebem repositories; teste 9 prova sobrevivencia de owners e patients a re-instanciação                                                                                                         | Dedupe e conciliacao de duplicidade ainda sao basicos                                                         | Sem historico materializado de merges e saneamento               | Implementar dedupe e merge com trilha de auditoria                                                       |
| AUD-004    | Atendimento e episodio clinico                   | 72   | EncountersService recebe repositories; teste 9 prova sobrevivencia de encounters e timeline a re-instanciação                                                                                                                    | Falta travas de integridade e concorrencia real                                                               | Cobertura de testes por modulo e cenarios de borda ainda e baixa | Adicionar controle de concorrencia e testes de lifecycle                                                 |
| AUD-005    | Prontuario clinico e anexos                      | 72   | ~~bootstrap/runtime ainda nao conectam repositories~~ bootstrap cria repositories de prontuario; runtime injeta; teste 11 prova sobrevivencia a re-instanciacao; `medical-records` e `attachments` agora possuem suites dedicadas de modulo no gate oficial | Upload binario, assinatura e revisao formal ainda nao existem                                                 | Entries textuais simples limitam evolucao clinica                | Expandir para storage real de anexos e versionamento                                                     |
| AUD-006    | Operacao assistencial avancada                   | 58   | Continua apoiada em base ainda nao endurecida nos dominios centrais, mas `inpatient`, `surgery` e `diagnostics` agora contam com suites dedicadas de modulo no gate oficial                                                    | Sem equipe cirurgica, transferencia, alta formal ou catalogos estruturados                                    | Integracoes externas ainda inexistentes                          | Endurecer regras operacionais agora que existe cobertura dedicada minima                                  |
| AUD-007    | Billing, inventory e notifications               | 68   | Billing e inventory ainda estao em nivel basico sem conciliacao ou entrada de estoque, mas agora contam com suites dedicadas de modulo no gate oficial                                                                           | Notifications seguem limitadas a canal interno simples e sem fila mais rica                                     | Falta endurecimento administrativo mais amplo                    | Ampliar conciliacao financeira e inventory agora que API/worker compartilham estado real                |
| AUD-008    | Persistencia, dados e infraestrutura operacional | 84   | Runtime integrado a repositories via bootstrap; `db-persistence.test.ts` passa no fluxo oficial `test:all` com DB real dedicado; `/health`, `/ready` e `/live` refletem estado operacional e dependencias reais | Migrations e schema seguem concentrados em wave 1 e ainda exigem evolucao para uso mais amplo | Observabilidade ainda depende de logs e probes basicos, sem stack dedicada | Avancar para ENT-004 e fortalecer observabilidade operacional sem perder a simplicidade do gate oficial |
| AUD-009    | Frontend e experiencia operacional               | 45   | Frontend canonico do roadmap ainda nao foi consolidado com a implementacao mais rica                                                                                                                                             | Navegacao e documentacao do front ainda estao parcialmente desalinhadas                                       | Cobertura e2e da trilha canonica e insuficiente                  | Escolher e consolidar o frontend oficial somente apos estabilizar backend e persistencia                 |
| AUD-010    | Qualidade, testes e confiabilidade               | 80   | `test`, `build`, `typecheck` e `test:all` passando; auth, encounters, notifications com 21 testes unitarios; API/DB com provas de re-instanciação, cross-aggregate, worker em processo separado e health/readiness/liveness cobertos; `medical-records`, `attachments`, `billing`, `inventory`, `inpatient`, `surgery` e `diagnostics` agora possuem suites executaveis de modulo | Matriz ainda cobre mais o nucleo do que alguns modulos compartilhados e o frontend; varios pacotes de suporte continuam sem suites dedicadas | Falta cobertura em mais modulos                                  | Expandir a cobertura para shared packages e trilha oficial de frontend sem perder o gate oficial       |
| AUD-011    | Migracao controlada e rollout                    | 35   | Fase 9 ainda nao executa migracao real, extratores, staging ou reconciliacao                                                                                                                                                     | Rollback e rollout so existem como estrategia documental                                                      | Desligamento do legado ainda nao tem ensaios operacionais        | Nao avancar migracao antes de estabilizar runtime, persistencia, testes e frontend canonico              |

## Backlog Operacional

| Backlog ID | Area                                             | Owner                      | Esforco | Dependencias                                                  | Criterio de aceite                                                                                                                                                     |
| ---------- | ------------------------------------------------ | -------------------------- | ------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUD-008    | Persistencia, dados e infraestrutura operacional | Backend + Data             | XL      | Decisao sobre stack canonica de persistencia                  | Auth, audit, owners, patients, encounters e notifications persistem fora de memoria; healthcheck valida dependencias reais; bootstrap local sobe stack funcional       |
| AUD-007    | Billing, inventory e notifications               | Backend + Worker           | L       | AUD-008                                                       | API e worker compartilham estado/fila real; notificacoes criadas pela API sao processadas por worker em outro processo; existe teste de integracao cobrindo esse fluxo |
| AUD-009    | Frontend e experiencia operacional               | Frontend + Arquitetura     | XL      | AUD-001                                                       | Existe um frontend oficial unico do V2; navegacao, docs e scripts apontam para ele; smoke e2e cobrem login, cadastro mestre e atendimento                              |
| AUD-010    | Qualidade, testes e confiabilidade               | QA + Backend + Frontend    | L       | AUD-008, AUD-009                                              | Modulos criticos possuem testes unitarios e de integracao; gates minimos definidos por dominio; pipeline falha ao perder cobertura/contrato essencial                  |
| AUD-002    | Identidade, acesso e governanca                  | Backend + Security         | M       | AUD-008, AUD-010                                              | Sessao e auditoria persistidas; revogacao funciona entre processos; segredos e seeds revisados; modulo auth coberto por testes dedicados                               |
| AUD-003    | Cadastro mestre                                  | Backend + Produto          | M       | AUD-008                                                       | CRUD persistente de owners/patients/links; fluxo de dedupe documentado e implementado; auditoria e historico de merge disponiveis                                      |
| AUD-004    | Atendimento e episodio clinico                   | Backend + Operacoes        | M       | AUD-008, AUD-010                                              | Queue e encounter suportam concorrencia basica real; transicoes invalidas sao bloqueadas; testes cobrem check-in, chamada, triagem e fechamento                        |
| AUD-005    | Prontuario clinico e anexos                      | Backend + Clinical         | L       | AUD-008, AUD-010                                              | Entries e anexos persistem com rastreabilidade; anexos possuem storage real; existe versao/revisao minima para alteracoes sensiveis                                    |
| AUD-006    | Operacao assistencial avancada                   | Backend + Clinical         | XL      | AUD-004, AUD-005                                              | Internacao, cirurgia e diagnosticos cobrem estados operacionais minimos reais; transferencias e alta formal existem; contratos externos foram modelados                |
| AUD-001    | Fundacao do monorepo e coerencia arquitetural    | Arquitetura                | M       | Nenhuma                                                       | Uma trilha canonica de apps e packages foi definida; docs e scripts convergem; componentes/trilhas paralelas foram arquivados ou incorporados                          |
| AUD-011    | Migracao controlada e rollout                    | Data + Operacoes + Produto | XL      | AUD-002, AUD-003, AUD-004, AUD-005, AUD-006, AUD-007, AUD-008 | Extratores, staging e dry-runs existem; reconciliacao por onda foi validada; rollback foi ensaiado; criterios de cutover estao executaveis                             |

## Convencao de Owner

- `Arquitetura`: decisoes estruturais, consolidacao de trilhas e ownership de direcao tecnica
- `Backend`: API, dominio, persistencia e contratos internos
- `Data`: schema, migracoes, extratores e reconciliacao
- `Worker`: filas, jobs assincronos e processamento desacoplado
- `Frontend`: interface oficial, fluxos operacionais e testes e2e
- `QA`: cobertura, gates e confiabilidade de pipeline
- `Clinical`: aderencia assistencial, prontuario e seguranca clinica
- `Operacoes`: readiness operacional, rollout e fluxo real de uso
- `Security`: endurecimento de auth, segredos, sessao e auditoria
- `Produto`: prioridades, criterios de aceite e corte de escopo

## Convencao de Esforco

- `S`: ate 3 dias
- `M`: ate 1 sprint curta
- `L`: 1 a 2 sprints
- `XL`: 2+ sprints ou iniciativa transversal

## Ordem Recomendada de Execucao do Backlog

1. `AUD-008` - Persistencia, dados e infraestrutura operacional
2. `AUD-007` - Billing, inventory e notifications
3. `AUD-009` - Frontend e experiencia operacional
4. `AUD-010` - Qualidade, testes e confiabilidade
5. `AUD-002` - Identidade, acesso e governanca
6. `AUD-003` - Cadastro mestre
7. `AUD-004` - Atendimento e episodio clinico
8. `AUD-005` - Prontuario clinico e anexos
9. `AUD-006` - Operacao assistencial avancada
10. `AUD-001` - Fundacao do monorepo e coerencia arquitetural
11. `AUD-011` - Migracao controlada e rollout

## Definicao de Proximo Gate

- Gate 1: persistencia minima funcional para auth, audit, owners, patients, encounters e notifications
- Gate 2: worker e API integrados por fila/estado compartilhado real
- Gate 3: frontend oficial consolidado com smoke e2e
- Gate 4: cobertura automatizada minima por modulo critico
- Gate 5: readiness real para staging e migracao por ondas

## Historias Derivadas

| ID         | Task                                                                                   | Owner                            | Prioridade | Esforco | Dependencia                                                            | Aceite                                                                                    | Status inicial                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------- | -------------------------------- | ---------- | ------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUD-008-01 | Definir stack canonica de persistencia da V2 e ADR de uso por modulo                   | Arquitetura + Backend + Data     | P0         | M       | Nenhuma                                                                | ADR aprovada define banco, repositorios, fronteiras e modulos alvo da primeira onda       | **Concluido**                                                                                                                                                                                                                                                                                                                                                                                                 |
| AUD-008-02 | Conectar auth, audit, owners, patients e encounters a persistencia real                | Backend + Data                   | P0         | XL      | AUD-008-01                                                             | Fluxos sobrevivem a restart e leitura/escrita nao dependem de memoria de processo         | **Concluido** (Caminho B: integracao estrutural concluida + teste automatizado de sobrevivencia a restart/re-instanciação; teste 9 prova que repositories sao a fronteira de persistencia e dados sobrevivem a criacao de novas instancias do runtime; DB real conectado ao fluxo principal via bootstrap com teste db-persistence.test.ts validando 5/5 scenarios integrado ao fluxo oficial via `test:all`) |
| AUD-008-03 | Endurecer bootstrap, healthcheck e ambiente local com dependencias reais               | Backend + Data                   | P0         | M       | AUD-008-02                                                             | `health` valida dependencias reais e bootstrap local sobe stack utilizavel para dev/teste | **Concluido** (`bootstrap.ts` inclui `connectWithRetry()` e `validateDependencies()`, `infra/scripts/bootstrap-local.mjs` sobe postgres/redis localmente, `health.ts` implementa 3 estados (healthy, unhealthy, in-memory-fallback), `health.test.ts` cobre 6 cenarios incluindo database saudavel, banco configurado mas indisponivel, e modo in-memory funcional)                                           |
| AUD-007-01 | Implementar fila/estado compartilhado entre API e worker para notifications            | Backend + Worker                 | P0         | L       | AUD-008-02                                                             | Notificacao criada na API e processada por worker em processo separado                    | **Concluido** (worker possui bootstrap proprio com repository de DB; `runWorkerTick` processa via repository; `db-persistence.test.ts` prova que a API grava no banco e um processo worker separado consome e processa o mesmo job)                                                                                                                                                                         |
| AUD-007-02 | Adicionar conciliacao basica entre consumo assistencial e billing                      | Backend + Produto                | P1         | L       | AUD-008-02                                                             | Consumo pode gerar referencia cobravel rastreavel por encounter e source entity           | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-007-03 | Expandir inventory para entrada, ajuste e catalogo minimo real                         | Backend + Operacoes              | P1         | L       | AUD-008-02                                                             | Estoque suporta entrada, ajuste e trilha de movimentacao por item                         | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-009-01 | Definir frontend oficial do V2 e plano de convergencia das trilhas atuais              | Arquitetura + Frontend           | P0         | M       | AUD-001-01                                                             | Existe decisao explicita do app canonico e plano de migracao/arquivamento                 | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-009-02 | Consolidar fluxos principais no frontend oficial: login, cadastro mestre e atendimento | Frontend                         | P0         | XL      | AUD-009-01, AUD-008-02                                                 | Fluxos principais funcionam no app oficial com integracao real com API V2                 | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-009-03 | Criar smoke e2e do frontend oficial para os fluxos principais                          | Frontend + QA                    | P1         | M       | AUD-009-02                                                             | Pipeline executa smoke cobrindo login, owner, patient e encounter                         | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-010-01 | Definir matriz de cobertura por modulo critico e gate minimo de testes                 | QA + Backend + Frontend          | P0         | S       | Nenhuma                                                                | Documento e pipeline definem suites minimas obrigatorias por dominio                      | **Concluido**                                                                                                                                                                                                                                                                                                                                                                                                 |
| AUD-010-02 | Adicionar testes unitarios aos modulos criticos de auth, encounters e notifications    | Backend + QA                     | P0         | L       | AUD-010-01                                                             | Modulos criticos deixam de usar script `no tests` e cobrem cenarios centrais e de borda   | **Concluido** (auth: 7 testes, encounters: 7 testes, notifications: 7 testes; cobrem login, refresh, logout, transitions, lifecycle, processamento)                                                                                                                                                                                                                                                           |
| AUD-010-03 | Adicionar testes de integracao para worker/API e persistencia                          | Backend + Worker + QA            | P1         | M       | AUD-007-01, AUD-008-02                                                 | Existe teste automatizado provando compartilhamento de estado e processamento assincrono  | **Concluido** (`db-persistence.test.ts` agora inclui prova com DB real e processo worker separado; API cria notificacao, worker externo processa, e o estado final fica visivel pelo mesmo repository persistido)                                                                                                                                                                                            |
| AUD-002-01 | Persistir sessao, refresh e revogacao entre processos                                  | Backend + Security               | P0         | L       | AUD-008-02                                                             | Logout e refresh seguem consistentes em multiplas instancias/processos                    | **Concluido** (AuthService recebe sessionRepository via runtime; teste 9 prova sobrevivencia de sessao a re-instanciação; DB real conectado ao fluxo principal)                                                                                                                                                                                                                                               |
| AUD-002-02 | Persistir eventos de auditoria e reforcar trilha append-only                           | Backend + Data + Security        | P0         | M       | AUD-008-02                                                             | Eventos de auth e acesso ficam auditaveis apos restart e com consulta consistente         | **Concluido** (AuditService recebe auditRepository; teste 9 prova sobrevivencia de eventos a re-instanciação; DB real conectado ao fluxo principal)                                                                                                                                                                                                                                                           |
| AUD-002-03 | Revisar seeds, credenciais de validacao e endurecimento de segredos                    | Backend + Security               | P1         | S       | AUD-002-01                                                             | Nao ha dependencia de contas hardcoded para uso normal e secrets seguem padrao definido   | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-003-01 | Persistir CRUD de owners, patients e owner-patient-links                               | Backend + Data                   | P0         | L       | AUD-008-02                                                             | Cadastro mestre completo usa repositorios reais e mantem integridade basica               | **Concluido** (services recebem repositories via runtime; teste 9 prova sobrevivencia de owners e patients a re-instanciação; DB real conectado ao fluxo principal)                                                                                                                                                                                                                                           |
| AUD-003-02 | Implementar dedupe e merge com trilha de auditoria                                     | Backend + Produto                | P1         | L       | AUD-003-01                                                             | Duplicidade pode ser identificada, conciliada e auditada com historico recuperavel        | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-003-03 | Formalizar saneamento cadastral e criterios operacionais                               | Produto + Operacoes              | P2         | S       | AUD-003-02                                                             | Existe regra objetiva para saneamento, merge e excecoes operacionais                      | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-004-01 | Persistir appointments, queue e encounters com integridade de transicao                | Backend + Data                   | P0         | L       | AUD-008-02                                                             | Queue e encounter nao perdem estado apos restart e bloqueiam transicoes invalidas         | **Concluido** (EncountersService recebe repositories via runtime; teste 9 prova sobrevivencia de encounters e timeline a re-instanciação; DB real conectado ao fluxo principal)                                                                                                                                                                                                                               |
| AUD-004-02 | Adicionar controle basico de concorrencia para fila e lifecycle                        | Backend                          | P1         | M       | AUD-004-01                                                             | Acao concorrente nao duplica chamada, fechamento ou triagem do mesmo episodio             | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-004-03 | Cobrir atendimento com testes de lifecycle e cenarios de borda                         | Backend + QA                     | P1         | M       | AUD-004-01, AUD-010-01                                                 | Suite cobre open, transition, close, check-in, call e erros de integridade                | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-005-01 | Persistir medical records, entries e timeline clinica                                  | Backend + Data                   | P0         | L       | AUD-008-02                                                             | Entries e timeline clinica sobrevivem a restart e ficam consultaveis por encounter        | **Concluido** (bootstrap cria repositories medicalRecord, clinicalEntry, clinicalTimeline; runtime injeta nos services; teste 11 prova sobrevivencia de records, entries e timeline a re-instanciacao; db-persistence.test.ts valida escrita e leitura com DB real; mapeamentos frageis corrigidos em DatabaseClinicalTimelineRepository e DatabaseNotificationRepository)                                    |
| AUD-005-02 | Implementar storage real de anexos e metadados de integridade                          | Backend + Data                   | P1         | L       | AUD-008-02                                                             | Anexo possui storage real, checksum e vinculo consistente ao agregado correto             | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-005-03 | Introduzir revisao/versionamento minimo para alteracoes sensiveis                      | Backend + Clinical               | P1         | M       | AUD-005-01                                                             | Alteracoes clinicas sensiveis deixam trilha de versao/revisao consultavel                 | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-006-01 | Expandir internacao com transferencia e alta formal                                    | Backend + Clinical               | P1         | L       | AUD-004-01, AUD-005-01                                                 | Stay suporta transferencia, alta e trilha coerente com o caso clinico                     | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-006-02 | Expandir cirurgia com equipe, preparo e estados operacionais minimos                   | Backend + Clinical               | P1         | L       | AUD-005-01                                                             | Caso cirurgico contempla equipe, preparo e fechamento minimo rastreavel                   | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-006-03 | Expandir diagnosticos com catalogo e contrato de integracao externa                    | Backend + Clinical               | P2         | L       | AUD-005-01                                                             | Exames possuem catalogo minimo e interface modelada para integracao externa               | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-001-01 | Inventariar trilhas duplicadas e decidir o que fica canonico                           | Arquitetura                      | P0         | S       | Nenhuma                                                                | Existe mapa objetivo do que permanece, migra ou arquiva entre `apps/*` e `apps/his-*`     | **Concluido**                                                                                                                                                                                                                                                                                                                                                                                                 |
| AUD-001-02 | Alinhar scripts, docs e onboarding com a trilha canonica                               | Arquitetura + Backend + Frontend | P1         | M       | AUD-001-01                                                             | `README`, scripts e docs apontam para a mesma arquitetura oficial                         | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-001-03 | Arquivar ou absorver componentes/trilhas paralelas restantes                           | Arquitetura                      | P2         | M       | AUD-001-02                                                             | Nao restam trilhas paralelas sem ownership e sem justificativa ativa                      | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-011-01 | Implementar extratores e manifestos executaveis por onda de migracao                   | Data + Backend                   | P1         | XL      | AUD-002-01, AUD-003-01, AUD-004-01, AUD-005-01, AUD-006-01, AUD-007-01 | Cada onda possui extrator, contrato de saida e validacao executavel                       | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-011-02 | Preparar staging e dry-runs com reconciliacao                                          | Data + Operacoes + QA            | P1         | L       | AUD-011-01                                                             | Dry-run roda em staging e gera relatorio de reconciliacao por onda                        | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |
| AUD-011-03 | Formalizar cutover e rollback ensaiado                                                 | Operacoes + Produto + Security   | P2         | M       | AUD-011-02                                                             | Cutover e rollback foram ensaiados e possuem checklist executavel aprovado                | Todo                                                                                                                                                                                                                                                                                                                                                                                                          |

## Sequencia Sugerida por Sprint

### Sprint 1

Objetivo: decidir a trilha canonica, fechar arquitetura-base e abrir a fundacao de persistencia.

| ID         | Task                                                                   | Motivo da Sprint                                                     |
| ---------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| AUD-001-01 | Inventariar trilhas duplicadas e decidir o que fica canonico           | Remove ambiguidade estrutural antes de consolidar frontend e runtime |
| AUD-008-01 | Definir stack canonica de persistencia da V2 e ADR de uso por modulo   | Destrava todas as historias de persistencia e integracao real        |
| AUD-010-01 | Definir matriz de cobertura por modulo critico e gate minimo de testes | Garante que as proximas entregas ja nascam com criterio de validacao |

### Sprint 2

Objetivo: tirar o nucleo do modo em memoria e consolidar o baseline operacional minimo.

| ID         | Task                                                                     | Motivo da Sprint                                         |
| ---------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| AUD-008-02 | Conectar auth, audit, owners, patients e encounters a persistencia real  | Coloca o nucleo clinico-operacional em base persistente  |
| AUD-008-03 | Endurecer bootstrap, healthcheck e ambiente local com dependencias reais | Fecha o baseline de ambiente e readiness tecnica         |
| AUD-002-01 | Persistir sessao, refresh e revogacao entre processos                    | Resolve risco P0 de auth distribuido                     |
| AUD-002-02 | Persistir eventos de auditoria e reforcar trilha append-only             | Resolve rastreabilidade minima para os dominios criticos |
| AUD-003-01 | Persistir CRUD de owners, patients e owner-patient-links                 | Fecha cadastro mestre em base real                       |
| AUD-004-01 | Persistir appointments, queue e encounters com integridade de transicao  | Fecha atendimento basico em base real                    |
| AUD-005-01 | Persistir medical records, entries e timeline clinica                    | Fecha prontuario base em persistencia real               |

### Sprint 3

Objetivo: integrar processamento assincrono real e escolher a trilha oficial de UX.

| ID         | Task                                                                                | Motivo da Sprint                                       |
| ---------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| AUD-007-01 | Implementar fila/estado compartilhado entre API e worker para notifications         | Resolve ruptura entre API e worker                     |
| AUD-009-01 | Definir frontend oficial do V2 e plano de convergencia das trilhas atuais           | Necessario para consolidar a camada web correta        |
| AUD-001-02 | Alinhar scripts, docs e onboarding com a trilha canonica                            | Ajusta a plataforma para a decisao arquitetural tomada |
| AUD-010-02 | Adicionar testes unitarios aos modulos criticos de auth, encounters e notifications | Aumenta confiabilidade sobre a fundacao persistida     |
| AUD-010-03 | Adicionar testes de integracao para worker/API e persistencia                       | Valida a nova arquitetura integrada                    |

### Sprint 4

Objetivo: consolidar a operacao principal no frontend oficial e elevar seguranca/confiabilidade.

| ID         | Task                                                                                   | Motivo da Sprint                               |
| ---------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| AUD-009-02 | Consolidar fluxos principais no frontend oficial: login, cadastro mestre e atendimento | Materializa a trilha oficial de uso            |
| AUD-009-03 | Criar smoke e2e do frontend oficial para os fluxos principais                          | Fecha validacao ponta a ponta do front oficial |
| AUD-002-03 | Revisar seeds, credenciais de validacao e endurecimento de segredos                    | Endurece seguranca apos estabilizar o runtime  |
| AUD-004-02 | Adicionar controle basico de concorrencia para fila e lifecycle                        | Endurece operacao real do episodio             |
| AUD-004-03 | Cobrir atendimento com testes de lifecycle e cenarios de borda                         | Reduz risco de regressao no fluxo principal    |

### Sprint 5

Objetivo: amadurecer dominios administrativo, cadastro e prontuario.

| ID         | Task                                                              | Motivo da Sprint                                       |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| AUD-007-02 | Adicionar conciliacao basica entre consumo assistencial e billing | Aproxima o administrativo do fluxo real de atendimento |
| AUD-007-03 | Expandir inventory para entrada, ajuste e catalogo minimo real    | Fecha lacunas operacionais do estoque                  |
| AUD-003-02 | Implementar dedupe e merge com trilha de auditoria                | Melhora qualidade do cadastro mestre                   |
| AUD-003-03 | Formalizar saneamento cadastral e criterios operacionais          | Consolida regra de uso e saneamento                    |
| AUD-005-02 | Implementar storage real de anexos e metadados de integridade     | Fecha lacuna material de anexos                        |
| AUD-005-03 | Introduzir revisao/versionamento minimo para alteracoes sensiveis | Endurece prontuario para uso real                      |

### Sprint 6

Objetivo: expandir a cobertura assistencial avancada.

| ID         | Task                                                                 | Motivo da Sprint                                 |
| ---------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| AUD-006-01 | Expandir internacao com transferencia e alta formal                  | Fecha operacao basica de internacao              |
| AUD-006-02 | Expandir cirurgia com equipe, preparo e estados operacionais minimos | Evolui cirurgia para operacao real               |
| AUD-006-03 | Expandir diagnosticos com catalogo e contrato de integracao externa  | Prepara diagnosticos para integracao e escala    |
| AUD-001-03 | Arquivar ou absorver componentes/trilhas paralelas restantes         | Limpa o repositorio apos convergencia estrutural |

### Sprint 7

Objetivo: preparar execucao de migracao controlada.

| ID         | Task                                                                 | Motivo da Sprint                          |
| ---------- | -------------------------------------------------------------------- | ----------------------------------------- |
| AUD-011-01 | Implementar extratores e manifestos executaveis por onda de migracao | Primeira etapa executavel da migracao     |
| AUD-011-02 | Preparar staging e dry-runs com reconciliacao                        | Valida migracao sem tocar operacao real   |
| AUD-011-03 | Formalizar cutover e rollback ensaiado                               | Fecha readiness para transicao controlada |

## Dependencias Criticas

- A trilha `AUD-008` destrava `AUD-002`, `AUD-003`, `AUD-004`, `AUD-005` e `AUD-007`.

## Diretrizes Seguintes

### O que atacar agora

1. Concluir `AUD-008-02` antes de abrir novas frentes funcionais.
2. Usar `Session`, `Audit`, `Owner`, `Patient` e `Encounter` como primeira onda de integracao real.
3. Tratar `bootstrap` e `runtime` como uma unica trilha canonica de composicao.
4. Nao marcar `AUD-003-01`, `AUD-004-01` ou `AUD-005-01` como iniciados de forma real antes de prova executavel de `AUD-008-02`.

### Sequencia imediata recomendada

| Ordem | Item       | Diretriz                                                                                                     |
| ----- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| 1     | AUD-008-02 | Adicionar teste executavel que prove sobrevivencia a restart ou persistencia real no criterio aceito         |
| 2     | AUD-008-02 | Conectar repositories reais de banco no lugar da trilha puramente in-memory, ou formalizar fallback e aceite |
| 3     | AUD-008-03 | Fazer o `bootstrap` distinguir readiness de DB real versus fallback in-memory de forma explicita             |
| 4     | AUD-002-01 | Validar sessao, refresh e revogacao fora da memoria local                                                    |
| 5     | AUD-002-02 | Validar auditoria fora da memoria local                                                                      |
| 6     | AUD-003-01 | Promover cadastro mestre para concluido somente apos persistencia comprovada                                 |
| 7     | AUD-004-01 | Promover encounters para concluido somente apos persistencia comprovada                                      |

### Regra de progresso

- Um item so deve mudar para `Concluido` quando houver codigo integrado, validacao executavel e reflexo honesto em `/docs`.
- Relatorios de sprint devem referenciar explicitamente a auditoria executiva correspondente quando o item permanecer parcial.
- A trilha `AUD-001` destrava `AUD-009` e reduz drift entre arquitetura, scripts e docs.
- A trilha `AUD-010` deve acompanhar as entregas centrais a partir da Sprint 1 para evitar retrabalho.
- A trilha `AUD-011` so deve ganhar tracao real depois da estabilizacao das areas nucleares.

## Prioridades Imediatas da Revisao

1. Concluir `AUD-008-02` com prova de persistencia real ou sobrevivencia a restart
2. Fazer o `bootstrap` distinguir claramente DB real de fallback in-memory
3. Revisar `/docs` para remover conclusoes otimistas onde a entrega ainda e parcial
4. Implementar os primeiros testes reais dos dominios criticos definidos em `docs/test-matrix.md`
