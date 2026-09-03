---
document_status: historical
document_kind: plan
effective_date: 2026-08-07
owner: PMO CVG-HIS
review_cycle: archived
superseded_by: docs/2026-09-02-plano-executivo-melhorias-cvg-his-v4.md
---

# Plano executivo de resolução da auditoria do CVG-HIS V4

> **Documento histórico.** O plano executivo vigente é o [plano de melhorias
> de 2026-09-02](./2026-09-02-plano-executivo-melhorias-cvg-his-v4.md).

**Data:** 2026-08-07
**Status histórico:** execução pós-auditoria — M0 concluído; M1 técnico comprovado; M2/M3 incrementados com prontuário, agenda, compras, comissões e preventivos; G1/G2/G3+ condicionais
**Baseline:** 57/100
**Nota reavaliada:** 80/100
**Relatório de origem:** [`2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md`](2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md)
**Backlog executável:** [`2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md`](2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md)

## 1. Objetivo executivo

Transformar o CVG-HIS V4 de uma base funcional ampla, porém parcialmente comprovada, em uma plataforma operacional confiável para piloto controlado e, depois, produção crítica.

O plano considera como resultado mínimo:

1. nenhum P0 aberto em persistência, segurança, pagamentos, outbox ou isolamento;
2. banco PostgreSQL como fonte única de verdade em produção, sem fallback silencioso;
3. transações atômicas para clínica, estoque, comanda, caixa, cobrança e eventos;
4. testes unitários, integração e E2E reais, sem `skip` nos fluxos críticos;
5. zero vulnerabilidades `critical/high` no grafo de produção;
6. comprovação com dois tenants, restart, concorrência, retry e falha intermediária;
7. jornada Vetus verificável nos 11 domínios, sem elevar a nota por existência de telas ou arquivos.

A paridade Vetus `11/11` é um gate independente. Um produto pode atingir 90/100 em prontidão sem ter paridade integral em todos os domínios; nesse caso, o go-live deve permanecer limitado ao escopo homologado.

## 2. Situação inicial e restrições

| Dimensão | Estado em 2026-08-07 | Implicação |
|---|---|---|
| Build | Typecheck, lint e build passam | A base permite execução incremental |
| Testes | Suíte geral, cobertura e critical gate falham | Nenhuma feature nova deve contornar o gate |
| Banco | 77 migrações, 139 tabelas e 354 FKs aplicáveis | Persistência é recuperável, mas precisa ser tornada obrigatória |
| Tenant/RLS | 119/119 tabelas protegidas; testes de UoW positivos | Falta prova E2E completa entre dois tenants |
| Segurança | 22 vulnerabilidades no workspace; 13 em produção | Release de produção bloqueado |
| Paridade | 0/11 domínios e 0/3 jornadas clínicas verificadas | Telas isoladas não podem ser tratadas como entrega |
| Working tree | Já havia aproximadamente 610 entradas alteradas | Cada PR precisa declarar sua base e não pode assumir clean checkout |

### 2A. Snapshot pós-execução — 2026-08-07

| Indicador | Estado comprovado |
|---|---|
| P0 priorizados | `AUD-001`–`AUD-012` verificados; `AUD-013`/`AUD-014` parciais |
| Qualidade | 109 arquivos e 1.403 testes; 86,86% statements/lines, 80,06% branches e 90,00% funções |
| API/worker | 252/252 e 31/31 |
| PostgreSQL crítico | 230/230; migrações `0000`–`0096`; 157 tabelas, 43 enums e 399 FKs |
| Runtime DB | canonical runtime 1/1 após restart; E2E de dois tenants PostgreSQL 1/1 |
| Browser | 37/37 Chromium, login real, sem `skip` e sem retry; inclui isolamento PostgreSQL A/B |
| Contratos/segurança | OpenAPI 314 paths, 39 tags e 358 schemas; RLS 137/137; dependências critical/high/moderate = 0 |
| Operação | restore drill local passou com checksum, PostgreSQL e storage restaurados; RPO/RTO de alvo real ainda pendentes |
| Paridade Vetus | 0/11 domínios e 0/3 jornadas clínicas verificados |
| Incrementos de domínio | guardas de concorrência em folgas/agendamento, payable em compras/comissões, preventivos estruturados, anexos ClamAV/S3, prescrições assinadas, merge auditado, laboratório com retry, delivery fail-closed e fila clínica resiliente |
| Decisão | homologação controlada; sem go-live crítico |

O G0 técnico foi revalidado e o núcleo de M1 foi comprovado: o runtime canônico usa PostgreSQL, sobrevive a restart, executa UoW/rollback/idempotência e o cenário de dois tenants confirma isolamento de leitura, escrita, outbox e anexo. M1/G1 ainda não podem ser certificados para todos os agregados porque compras/transferências, alguns repositories clínicos e os providers externos ainda não têm a matriz completa de evidência.

## 3. Princípios de execução

1. **P0 antes de expansão:** bug de integridade, vazamento, perda de dados ou falha de segurança interrompe novas features do agregado afetado.
2. **TDD obrigatório:** teste RED, implementação mínima GREEN, refatoração e cobertura. O teste deve provar o comportamento real, não a presença de arquivo.
3. **PostgreSQL canônico:** Redis é cache, lock, rate limit e transporte auxiliar; não é fonte definitiva.
4. **Falha explícita:** ausência de schema, provider ou scanner deve gerar erro operacional visível, nunca lista vazia, mock silencioso ou sucesso fantasma.
5. **Uma ação, uma unidade de trabalho:** alterações correlatas em clínica, estoque, cobrança, caixa, auditoria e outbox compartilham transação ou possuem compensação formal.
6. **Tenant no boundary e no repository:** toda entrada externa é validada; toda consulta e mutação contém conta, autorização e contexto RLS.
7. **Evidência como definição de pronto:** cada item concluído aponta para código, migration, teste, comando e evidência de runtime.
8. **Documentação sincronizada:** a mudança de contrato, estado, arquitetura ou operação atualiza a documentação na mesma entrega.

## 4. Modelo de capacidade e responsabilidades

### Capacidade de referência

O cronograma assume duas squads, sprints de duas semanas e capacidade combinada de 55-65 pontos por sprint:

- plataforma/backend: transações, persistência, segurança, contratos e worker;
- domínio clínico: atendimento, prontuário, laboratório, internação e cirurgia;
- ERP/financeiro: billing, ledger, estoque, caixa, pagamentos e fiscal;
- frontend/UX: SPA, estados operacionais, acessibilidade e responsividade;
- QA/SRE: testes, ambientes, performance, observabilidade, backup e gates;
- produto, responsável técnico veterinário, fiscal e jurídico: aceite operacional e regulatório.

Com uma única squad, o prazo deve ser recalculado pelo throughput real. Não se deve prometer uma redução linear do calendário apenas adicionando pessoas.

### Responsabilidade de aceite

| Área | Aprova |
|---|---|
| Produto | escopo, UX, prioridade e mudança de requisito |
| Tech lead | arquitetura, migração, contratos e operabilidade |
| Segurança | autenticação, tenant, upload, pagamentos e dependências |
| Responsável veterinário | jornada clínica, prontuário, prescrição, exames e internação |
| Financeiro/fiscal | ledger, caixa, conciliação, comissão e NFS-e |
| QA/SRE | testes, evidências, SLO, restore e gate de release |

## 5. Roadmap executivo

O prazo abaixo é relativo ao início da execução e deve ser recalibrado após os dois primeiros sprints.

| Marco | Sprints | Semanas | Meta de nota | Entrega obrigatória | Gate de saída |
|---|---:|---:|---:|---|---|
| M0 — estabilização imediata | 1-2 | 1-4 | 64+ | P0 corrigido, testes alinhados, dependências tratadas e falha fechada | G0 Integridade |
| M1 — fundação segura e transacional | 3-5 | 5-10 | 70+ | UoW crítica, auth segura, agenda persistente, contratos canônicos e outbox real | G1 Segurança/dados |
| M2 — estação clínica comprovada | 6-9 | 11-18 | 76+ | atendimento, prontuário, receita, anexos, fila, exames e alta | G2 Clínica |
| M3 — hospital e ERP integrado | 10-14 | 19-28 | 83+ | internação, consumo, estoque, comanda, ledger, caixa e pagamento | G3 ERP |
| M4 — fiscal, gestão e integrações | 15-18 | 29-36 | 88+ | NFS-e, compras, relatórios, comunicações, RH, importação e providers reais | G4 Operação |
| M5 — certificação e produção controlada | 19-22 | 37-44 | 90+ | WCAG, performance, backup/restore, game day e homologação | G5 Release |

Paridade integral exige ainda `11/11` domínios Vetus, `3/3` jornadas clínicas e assinatura dos responsáveis de produto, clínica, financeiro, segurança e operação.

## 6. Sequência de execução por marco

### M0 — estabilização imediata

Corrigir primeiro os defeitos que já falham no estado atual:

- evento de alteração de billing sem `accountId`;
- persistência de diagnósticos sem `await`;
- captura de cartão sem comprovação suficiente de ownership;
- fechamento de venda sem Unit of Work única;
- testes de inventário, MFA, integridade e `foundational` desalinhados;
- vulnerabilidades atuais de produção;
- estados OpenAPI divergentes dos estados de billing.

Nenhuma meta de score pode ser considerada atingida enquanto `pnpm test`, `pnpm test:coverage`, `pnpm test:critical` e `pnpm security:enterprise` falharem.

### M1 — fundação segura e transacional

- completar `TenantUnitOfWork` nos agregados críticos;
- consolidar inbox/outbox, consumidores reais, retry, DLQ e idempotência;
- remover fallbacks silenciosos no modo database;
- migrar autenticação para cookies seguros e access token em memória;
- aplicar CSP na SPA e corrigir trust proxy/rate limit distribuído;
- persistir configuração da agenda;
- alinhar OpenAPI, tipos, estados e clientes;
- ampliar testes de routes, bootstrap, repositories e adapters, atualmente excluídos da cobertura.

### M2 — estação clínica comprovada

- consolidar o agregado de episódio e o comando atômico de ficha clínica;
- impedir edição de atendimento encerrado e permitir reabertura auditada;
- concluir cockpit, fila, handoff, timeline e busca;
- tornar anexos binários reais, privados, escaneados e auditáveis;
- tornar laboratório/diagnósticos duráveis e versionados;
- completar prescrição, execução, alta e documentos clínicos;
- executar E2E agendado, avulso, exame e dois tenants.

### M3 — hospital e ERP integrado

- fechar o ciclo internação → evolução → consumo → diária → alta;
- fechar atendimento → comanda → estoque → pagamento → auditoria;
- consolidar ledger único para billing, recebíveis, caixa e estornos;
- implementar lote, validade, FEFO, reserva, devolução, compras e transferências;
- homologar PIX/cartão com webhook assinado, replay protection e conciliação;
- eliminar divergência entre fontes financeiras.

### M4 — fiscal, gestão e integrações

- conectar provider NFS-e real com sandbox, rejeição, cancelamento e documentos;
- concluir relatórios reconciliados, exportação e execução pelo worker;
- implementar consentimento, preferências, entrega, retry e auditoria de comunicação;
- concluir preventivos/vacinas, RH/folgas/comissões;
- implementar importação Vetus idempotente e consumidores reais de webhook/outbox;
- remover cenografia, CTAs inativos e estados ambíguos da navegação.

### M5 — certificação

- executar testes de carga e confirmar SLOs;
- passar WCAG 2.2 AA nos fluxos críticos;
- executar backup/restore e Game Day com RPO/RTO medidos;
- fazer 20 execuções E2E sem flake, `skip` ou retry;
- repetir todos os gates em ambiente limpo;
- realizar reauditoria e homologação formal.

## 7. Gates obrigatórios

| Gate | Critério de saída |
|---|---|
| G0 — Integridade | zero falha P0, zero operação fire-and-forget crítica, testes e cobertura verdes, vulnerabilidades critical/high resolvidas ou bloqueadas explicitamente |
| G1 — Segurança/dados | runtime sem superuser/BYPASSRLS, dois tenants isolados, cookies/CSP/rate limit validados, migrations limpas e nenhum fallback obrigatório |
| G2 — Clínica | E2E agendado, avulso, exame e dois tenants passam com PostgreSQL, restart e zero `skip` |
| G3 — ERP | comanda, estoque, ledger, caixa, pagamento e auditoria reconciliam após falha, retry e concorrência |
| G4 — Operação | provider fiscal/comunicações/integracões reais, relatórios entregues pelo worker, importação idempotente e auditoria completa |
| G5 — Release | typecheck, lint, build, test, coverage, critical, RLS, OpenAPI, secrets, audit, Helm, deploy, E2E, performance, restore e paridade passam |

## 8. Indicadores de acompanhamento

| Indicador | Meta de release |
|---|---:|
| Falhas P0 abertas | 0 |
| Falhas em `pnpm test` | 0 |
| Falhas em `pnpm test:critical` | 0 |
| Testes críticos com `skip` ou retry | 0 |
| Cobertura global | >=80% |
| Cobertura de linhas críticas alteradas | >=90% |
| Vulnerabilidades critical/high de produção | 0 |
| Tabelas tenant protegidas | 100% |
| Escritas críticas sem transação/compensação | 0 |
| Divergência ledger/caixa/recebível | 0 |
| Efeitos outbox duplicados | 0 |
| Sucesso de restore | 100% nos ensaios |
| p95 de leitura crítica | <400 ms |
| p95 de comando sem provider externo | <800 ms |
| Erros 5xx em jornada crítica | <1% |
| Domínios Vetus verificados | 11/11 |

## 9. Definição de pronto

Um item só pode ser marcado como `concluído` quando possuir:

- teste RED anterior e testes GREEN determinísticos;
- código, migration e contrato revisados;
- validação de boundary, autorização, tenant/RLS e auditoria;
- teste unitário e de integração; E2E quando alterar jornada crítica;
- evidência de PostgreSQL real, restart e falha intermediária quando aplicável;
- observabilidade e mensagem de erro operacional;
- documentação e matriz de rastreabilidade atualizadas;
- revisão de segurança quando tratar autenticação, input, pagamentos, anexos ou secrets.

`Parcial`, `mock`, `NoOp`, `skip`, teste em memória ou presença de arquivo não elevam nota de homologação.

## 10. Riscos e decisões de governança

| Risco | Mitigação executiva |
|---|---|
| Escopo crescer antes da estabilização | WIP máximo de dois épicos por squad e bloqueio de novas features no agregado com P0 |
| Migração quebrar dados financeiros | dry-run, reconciliação, identificador externo único e cutover por unidade |
| Provider externo atrasar o cronograma | sandbox contratual, adapter isolado e feature flag fail-closed |
| Teste verde sem cobrir runtime | E2E PostgreSQL, restart, dois tenants, concorrência e falha injetada |
| Mudanças documentais conflitantes | este plano e o backlog passam a ser a referência pós-auditoria; documentos anteriores ficam como baseline |
| Falta de aceite clínico/fiscal | revisão formal ao fim de cada marco, não apenas no go-live |

Qualquer alteração de escopo, prioridade ou critério de aceite deve ser registrada no backlog e refletida na matriz de rastreabilidade. Não deve haver anúncio de go-live antes do G5.

## 11. Registro de execução — 2026-08-07 (rodada inicial)

### Entregas concluídas nesta rodada

- correções `AUD-001` a `AUD-012`, incluindo outbox tenant-aware, persistência aguardada, ownership de pagamentos, fechamento de PDV, estados de billing, fail-closed, sessão HttpOnly, CSP, proxy/rate limit e cache SPA;
- cobertura de runtime reforçada, teste de recebível órfão e regressão financeira protegida;
- configuração de agenda removida do `Map` global e substituída por repositórios tenant-aware em memória e PostgreSQL;
- autenticação browser validada por UI real e cookie de refresh, com 37 jornadas Chromium aprovadas.
- guardas de concorrência para folgas e agendamento: exclusões PostgreSQL, advisory lock e conflitos HTTP 409;
- compras e comissões passaram a criar/vincular contas a pagar antes da liquidação, com método de pagamento explícito;
- preventivos/vacinas passaram a persistir protocolo, lote e próxima dose, com execução/reagendamento cobertos em API, SPA e catálogo;
- delivery de relatórios passou a falhar explicitamente sem provider ou quando o provider rejeita, e retry permanece ligado ao artefato;
- fila de persistência clínica passou a recuperar após falha e a evitar corrida entre criação lazy de prontuário e primeira entrada;
- `DsModal` ganhou Escape, foco inicial/restauração, trap e nome acessível, com regressão dedicada;
- migrações `0088`–`0091` consolidam as guardas de folgas, vínculos financeiros, sobreposição de agenda e dados estruturados de preventivos;
- runtime PostgreSQL canônico com IDs UUID, seed de dois tenants, restart, UoW, rollback e idempotência;
- persistência de alta, anexos, prontuário atômico, prescrições, lotes/FEFO, caixa atômico, ledger financeiro e hardening fiscal/marketing;
- E2E PostgreSQL de isolamento entre `admin` e `admin_b`, com entidades homônimas e tentativas cruzadas rejeitadas.

### Critérios ainda não satisfeitos

- M1/G1: ampliar a prova do runtime PostgreSQL para todos os agregados e fechar a matriz de dois tenants, providers e consumidores;
- M2/G2: episódio clínico completo, upload privado com antivírus, pipeline laboratorial com provider e alta integrada;
- M3/G3: compras/transferências e comissões/payables estão parciais; permanecem reserva/devolução FEFO, UoW cross-domain, caixa completo, provider de pagamento, estorno e reconciliação;
- M4/G4: preventivos estruturados e delivery fail-closed foram incrementados, mas permanecem NFS-e, comunicações externas, provider real de relatórios, lembretes consentidos, importação Vetus e providers externos;
- M5/G5: modal/foco recebeu cobertura dedicada, mas ainda faltam WCAG 2.2 AA completa, carga, DR de alvo real, RPO/RTO, Game Day, 20 execuções sem flake e paridade `11/11`/`3/3`.

**Decisão atual:** manter o produto em homologação controlada. A nota 80/100 representa avanço técnico comprovado e candidatura à homologação, não autorização de produção crítica.

## 12. Atualização complementar de execução — 2026-08-07

### Entregas incorporadas ao plano

1. **Plataforma e segurança:** toda mutação HTTP tenant-scoped passa pelo envelope de comando quando há UoW disponível; produção-like exige `Idempotency-Key`, a resposta é armazenada para replay e a auditoria é aguardada antes do commit. API e worker usam URLs/credenciais de roles PostgreSQL distintas, sem `SUPERUSER` ou `BYPASSRLS`.
2. **Clínica:** anexos possuem validação MIME/magic bytes/hash/tamanho, quarentena, ClamAV `INSTREAM`, storage S3/MinIO privado, URL curta HMAC e auditoria de download. Prescrições possuem duração, revisões, snapshots, assinatura versionada e documento verificável. Pacientes suportam merge auditado e atendimentos encerrados podem ser reabertos com motivo.
3. **Integrações:** resultados laboratoriais são correlacionados, deduplicados e persistidos com tentativas, erro e retry; a repetição não reprocessa importação concluída nem permite rebind cross-tenant.
4. **Contratos e operação:** OpenAPI, RLS, config de Compose, chart Helm, scanner/storage externos e migrations `0092`–`0096` foram alinhados ao runtime.

### Evidência de saída da rodada

| Gate | Resultado |
|---|---|
| API | 252/252 testes |
| Anexos | 11/11 testes; inclui S3 compatível e protocolo ClamAV |
| Prescrições | 30/30 testes |
| Servidor HTTP | 31/31 testes diretos |
| Cobertura | 109 arquivos, 1.403 testes; 86,86% statements/lines, 80,06% branches, 90,00% funções |
| Typecheck | 68/69 projetos selecionados |
| PostgreSQL crítico | 230/230; 157 tabelas, 43 enums, 399 FKs; migrations `0000`–`0096` |
| OpenAPI/RLS | 314/39/358 e 137/137 |
| Segurança | secret scan, auditoria enterprise e audit de produção sem vulnerabilidades reportadas |

### Replanejamento dos marcos

O envelope transacional, o pipeline de anexos, as assinaturas/revisões, o merge auditado e o retry laboratorial elevam a prontidão técnica dos marcos M1/M2/M4, mas não encerram os gates: falta comprovação com providers reais, episódio clínico multiagregado, E2E completo de ERP/clínica, WCAG, performance, DR/Game Day e paridade Vetus. O próximo ciclo deve priorizar homologação externa e os testes de aceitação, sem marcar os itens parciais como concluídos.

## 13. Rodada final de implementação e verificação — 2026-08-07

Esta seção supersede os contadores das rodadas anteriores e registra a execução efetiva do plano. O código foi recompilado após a correção do fallback clínico para identificadores sintéticos usados pelo ambiente E2E.

### 13.1 Plano executado

| Frente | Resultado da implementação | Evidência final | Limite de aceite |
|---|---|---|---|
| O1 — fundação transacional e segurança | `TenantUnitOfWork`, idempotência, outbox/inbox/auditoria, fail-closed, roles, sessão e contratos reforçados | cobertura, API 263/263, critical 230/230, OpenAPI 327/39/377 e RLS 144/144 | UoW cross-domain e providers reais ainda precisam de homologação |
| O2 — clínica | persistência de episódio/entrada/timeline, fila recuperável, anexos, prescrições, laboratório, internação, cirurgia e agenda avançados | prontuário 17/17, fluxo legado DB 22/22 e SPA DB 37/37 | episódio multiagregado, laboratório bidirecional, upload/ClamAV/S3 reais e oito jornadas completas |
| O3 — ERP e financeiro | ledger, reservas, compras, comissões, depósito de caixa, fiscal tenant-aware e relatórios reforçados | critical 230/230, coverage 1.427 testes, E2E enterprise 7/7 e legado DB 22/22 | reconciliação completa, NFSe/Pagar.me e entrega externa ainda sem sandbox |
| O4 — integrações e importação | lotes Vetus com dry-run/replay/resume/rollback, marketing settings/retry/consentimento e contratos de API | API 263/263; paridade geral 95/100 e clínica 100/100 em evidência estrutural | paridade Vetus assinada permanece 0/11 e clínica 0/3 |
| O5 — operação e qualidade | cobertura, builds afetados, E2E DB, segurança, RLS/OpenAPI, Compose/roles e validação Helm estática | typecheck/lint, cobertura 87,45/80,04/90,65 e gates finais registrados no relatório | WCAG formal, k6/SLO, DR/Game Day e Helm renderizado continuam pendentes |

### 13.2 Contadores finais

- cobertura: **109 arquivos / 1.427 testes**, 87,45% statements/lines, 80,04% branches e 90,65% funções;
- PostgreSQL crítico: **230/230**, migrations `0000`–`0102`, 163 tabelas, 43 enums e 417 FKs;
- API: **263/263**;
- E2E: **37/37 SPA em PostgreSQL limpo**, **22/22 fluxos legados em PostgreSQL** e **7/7 enterprise**;
- OpenAPI: **327 paths / 39 tags / 377 schemas**;
- RLS: **144/144** tabelas tenant;
- segurança: sem vulnerabilidades critical/high/moderate nos gates executados.

### 13.3 Decisão de promoção

O plano está implementado no que é verificável localmente e o G0 técnico foi atendido. O produto permanece em **homologação controlada**, não em go-live: a aceitação final depende de providers/sandboxes reais, paridade Vetus, reconciliação financeira, jornadas E2E restantes, WCAG 2.2 AA, performance e DR/Game Day no ambiente-alvo. A nota global do relatório permanece 80/100 até essas evidências externas existirem. O runtime PostgreSQL foi comprovado nos gates SPA e legados, sem fallback incompatível e sem retry/skips nos testes registrados.
