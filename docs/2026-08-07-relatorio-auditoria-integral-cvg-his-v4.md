# Relatório de auditoria integral do CVG-HIS V4

**Data:** 2026-08-07
**Escopo:** documentação, API, SPA, worker, banco de dados, segurança, testes, operação e paridade Vetus
**Nota global da baseline:** **57/100**
**Nota global reavaliada após execução:** **80/100**
**Status atual:** P0 técnico tratado; runtime PostgreSQL canônico, restart, isolamento entre dois tenants, envelope transacional/idempotente global, anexos privados com scanner ClamAV, prescrições versionadas/assinadas, merge auditado de pacientes, importação laboratorial com retry, compras/transferências parciais, folgas persistentes, exportações binárias com delivery fail-closed, preventivos estruturados, prontuário resiliente e restore drill local comprovados; produção crítica ainda bloqueada por atomicidade cross-domain, homologação de provedores externos, DR/Game Day real, performance, WCAG e paridade Vetus.

## 1. Veredito executivo

O CVG-HIS V4 possui uma base técnica ampla e uma evolução importante em persistência, multi-tenancy, RLS, contratos e automação. Typecheck, lint, build, cobertura e os gates críticos passam; a fotografia histórica de baseline tinha 87 migrações, enquanto a execução final aplicou `0000`–`0102`, com 163 tabelas e 417 chaves estrangeiras.

Entretanto, o sistema ainda não deve ser considerado pronto para produção crítica nem equivalente ao Vetus. Os principais motivos residuais são atomicidade cross-domain e ERP incompletos, integrações externas ainda sem sandbox homologado, relatórios/entregas e comunicações externas sem homologação final, DR/performance/WCAG sem evidência final e ausência de paridade Vetus.

A auditoria anterior documentada em [2026-07-11-relatorio-reauditoria-funcional-erp.md](./2026-07-11-relatorio-reauditoria-funcional-erp.md) atribuía 58/100. A nota da baseline foi ajustada para 57/100 após a execução dos gates no working tree então inspecionado; a nota pós-resolução está registrada na seção 9.

## 2. Escopo e método

Foram examinados:

- a trilha documental vigente em `docs/`, incluindo README, fonte de verdade, ADRs, CI gates, roadmap, backlog, SOC2, Game Day e Micro-builds;
- o acervo Vetus e seus artefatos de inspeção;
- o histórico `docs/docs2/`, tratado como arquivo conforme a governança documental;
- a implementação em `apps/`, `packages/`, `tests/`, `e2e/` e `infra/`;
- configuração, migrações, composição de runtime, contratos OpenAPI e scripts de deploy;
- typecheck, lint, build, testes, cobertura, testes críticos com PostgreSQL real, RLS, OpenAPI, secret scan, Helm, deploy check, parity e auditoria de dependências.

A regua usada foi:

| Nota | Interpretação |
|---:|---|
| 0-39 | Bloqueado, simulado ou insuficiente |
| 40-59 | Parcial, com risco alto |
| 60-79 | Utilizável apenas em piloto controlado |
| 80-89 | Candidato à homologação |
| 90-99 | Produção comprovada |
| 100 | Paridade integral homologada |

Uma tela ou endpoint isolado não prova uma funcionalidade. A nota considera persistência, restart, tenant/RBAC/RLS, efeitos entre módulos, teste determinístico e integração real.

## 3. Resultado dos gates executados na baseline (histórico)

| Gate | Resultado |
|---|---|
| `pnpm typecheck` | **Passou** — 68/69 projetos selecionados |
| `pnpm lint` | **Passou** — o script é predominantemente baseado em verificações TypeScript/Vue |
| `pnpm build` | **Passou** — SPA compilada com 756 módulos transformados |
| `pnpm test` | **Falhou** — API: 226/230 testes; SPA: 973 testes passaram |
| `pnpm test:coverage` | **Falhou** — 1.352/1.363 testes passaram; cobertura numérica de 88,02% statements, 80% branches e 91,27% functions |
| `pnpm test:critical` | **Falhou** — 217/218 testes executados passaram; uma suíte não compilou |
| Migrações PostgreSQL | **Passou** — 77 migrações, 139 tabelas e 354 FKs |
| `pnpm validate:rls` | **Passou** — 119/119 tabelas tenant protegidas |
| `pnpm validate:openapi` | **Passou estruturalmente** — 295 paths, 39 tags e 335 schemas |
| `pnpm security:secrets` | **Passou** |
| `pnpm validate:helm` | **Passou estaticamente** |
| `pnpm deploy:check` | **Passou** — nove verificações; uma etapa foi omitida por documentação ausente |
| `pnpm security:enterprise` | **Falhou** — 22 vulnerabilidades no workspace: 16 altas e 6 moderadas |
| Auditoria de produção de dependências | **Falhou** — 13 vulnerabilidades: 11 altas e 2 moderadas |
| `pnpm vetus:parity` | **Falhou** — 0/11 domínios verificados |
| `pnpm vetus:clinical-parity` | **Falhou** — 0/3 jornadas clínicas verificadas |

Os testes críticos com banco efêmero comprovaram que as migrações e os fluxos de outbox/RLS têm boa base. O gate ainda falhou por uma expectativa de integridade desatualizada e por `foundational.test.ts` usar `await` em callback não assíncrono.

## 4. Notas por item analisado

| Item | Nota | Avaliação |
|---|---:|---|
| Governança e consistência documental | **66** | Há fonte de verdade, precedência e classificação de evidência, mas existem ADRs conflitantes e referências antigas. |
| Rastreabilidade de requisitos | **61** | Roadmap, backlog e critérios existem; muitas jornadas ainda não possuem prova E2E completa. |
| Arquitetura e modularidade | **64** | Boa separação entre API, SPA, worker e módulos; `server.ts` e várias páginas são excessivamente grandes. |
| Persistência e integridade | **58** | Schema robusto, mas existem fallbacks em memória e fluxos sem transação única. |
| Multi-tenancy, RBAC e RLS | **80** | RLS 119/119, runtime role sem `BYPASSRLS` e testes de isolamento; falta E2E real com dois tenants. |
| Contratos API/OpenAPI | **61** | Contrato válido estruturalmente, porém estados documentados e estados de faturamento divergem. |
| Autenticação, sessão e MFA | **58** | Há MFA e sessões, mas persistem tokens no `localStorage` e estados processuais/em memória. |
| UX e arquitetura de informação | **60** | SPA ampla e alinhada ao Vetus, com telas parciais, placeholders e componentes muito grandes. |
| Acessibilidade | **48** | Pouca evidência de auditoria sistemática e de cobertura WCAG. |
| Proprietários, pacientes e vínculos | **70** | Fluxo principal bem estruturado, faltando provas completas de merge, alteração e inativação. |
| Agendamento | **68** | Fluxo principal existe; configurações de agenda usam estado volátil em `Map`. |
| Check-in, fila, triagem e handoff | **63** | Implementação presente, mas jornada integral ainda não está comprovada. |
| Atendimento e prontuário | **68** | Núcleo clínico funcional; operações compostas ainda podem ficar parcialmente persistidas. |
| Prescrição, execução e alta | **63** | Módulos e estados existem, mas falta validação integrada completa. |
| Laboratório e diagnósticos | **42** | Pedidos e resultados têm persistência disparada sem `await` em pontos críticos. |
| Internação | **76** | Modelo e migrações maduros; falta E2E completo de admissão até encerramento. |
| Cirurgia | **68** | Há estados e persistência, mas a integração operacional ainda é parcial. |
| Preventivos e vacinas | **38** | Implementação e comprovação funcional insuficientes. |
| Venda no balcão/PDV | **44** | Fechamento não usa uma Unit of Work única entre estoque, caixa e venda. |
| Faturamento e recebíveis | **43** | Fontes administrativas divergem e há falha atual na publicação de eventos. |
| Estoque | **68** | Base persistente razoável; testes estão desalinhados e faltam jornadas NF/lote/estoque. |
| Caixa, cartão e PIX | **39** | Mocks locais por padrão, ownership insuficiente na captura e fluxos incompletos. |
| Fiscal/NFS-e | **30** | Provedor ainda é simulado; não há integração produtiva comprovada. |
| Compras e transferências | **46** | Funcionalidade parcial, sem jornada completa até contas a pagar. |
| RH, folgas e comissões | **36** | Baixa cobertura funcional e ausência de E2E representativo. |
| Relatórios e exportações | **38** | Workbench existe, mas execução, arquivo e entrega assíncrona não estão comprovados. |
| Marketing e comunicações | **30** | E-mail, SMS e WhatsApp possuem caminhos mock, NoOp ou incompletos. |
| Integrações, webhooks e importação | **46** | Webhooks têm boa base; consumidores reais e importação Vetus não estão comprovados. |
| Qualidade dos testes e CI | **46** | Build passa, mas testes gerais, cobertura e critical gate falham; E2E tem skips. |
| Segurança da aplicação | **56** | RLS e headers da API são bons; persistem riscos em pagamentos, tokens, CSP e rate limit. |
| Segurança de dependências | **35** | Há 13 vulnerabilidades de produção, incluindo 11 classificadas como altas. |
| Observabilidade e runtime | **70** | Health checks, logs e métricas existem; observabilidade é parcialmente opcional e há fallbacks. |
| Deploy, backup e recuperação | **59** | Compose, Helm e deploy check estão organizados; restore/DR real não foi comprovado. |
| Performance e escalabilidade | **58** | Existem Redis, timeouts e k6, mas não há benchmark atual conclusivo e ainda há estado em memória. |
| Paridade funcional comprovada com Vetus | **0** | O gate retorna 0/11 domínios gerais e 0/3 jornadas clínicas verificadas. |

## 5. Achados críticos registrados na baseline

Os achados abaixo preservam a fotografia que originou este relatório. A seção 9 registra a resolução implementada e o risco residual; ela é a referência atual para o estado pós-execução.

### P0 — Evento financeiro sem `accountId`

O callback de alteração de status em [apps/api/src/runtime.ts:556](../apps/api/src/runtime.ts:556) publica eventos sem `accountId`. Isso causa falhas reais em quatro testes de integração relacionados a PIX, cartão, billing e notificações.

### P0 — Persistência assíncrona não aguardada em diagnósticos

Em [packages/modules/diagnostics/src/index.ts:112](../packages/modules/diagnostics/src/index.ts:112), pedidos e resultados podem ser persistidos depois que a API já respondeu. Isso permite sucesso aparente sem durabilidade garantida.

### P0 — Ownership insuficiente na captura de cartão

Em [apps/api/src/routes/payments-routes.ts:379](../apps/api/src/routes/payments-routes.ts:379), a captura do intent precisa comprovar que o pagamento pertence à conta autenticada antes de chamar o gateway externo.

### P0 — Fechamento de PDV sem atomicidade

Em [packages/modules/counter-sales/src/index.ts:439](../packages/modules/counter-sales/src/index.ts:439), estoque, caixa e estado da venda são atualizados sequencialmente, sem uma transação única.

### P1 — Fallbacks de persistência

Em [apps/api/src/bootstrap.ts:786](../apps/api/src/bootstrap.ts:786), partes do sistema ainda podem cair para repositórios em memória quando o schema não está disponível. Em produção, o comportamento recomendado deve ser falhar explicitamente.

### P1 — Segurança do frontend

Tokens são armazenados em `localStorage` em [apps/spa/src/stores/auth.ts:96](../apps/spa/src/stores/auth.ts:96), e [apps/spa/nginx.conf](../apps/spa/nginx.conf) não aplica uma CSP completa.

### P1 — Testes desalinhados

Há testes usando assinaturas antigas de inventário e MFA. Além disso, [tests/integration/foundational.test.ts:377](../tests/integration/foundational.test.ts:377) possui `await` em callback não marcado como `async`.

## 6. Pontos fortes

- Typecheck, lint e build completos passam.
- As migrações atuais são aplicáveis em banco PostgreSQL limpo.
- RLS estático cobre todas as 119 tabelas tenant identificadas.
- O runtime role usa `NOBYPASSRLS`.
- OpenAPI, deploy check e secret scan possuem automação.
- Existe separação clara entre API, SPA, worker e módulos de domínio.
- A documentação explicita limitações e distingue evidência de planejamento.

## 7. Prioridades recomendadas

1. Corrigir o `accountId` do outbox, a persistência de diagnósticos e a validação de ownership de pagamentos.
2. Implementar Unit of Work para PDV, billing, estoque, caixa e recebimento.
3. Remover fallbacks silenciosos em modo de produção.
4. Corrigir as vulnerabilidades de dependências, principalmente as de produção.
5. Atualizar os testes para as assinaturas atuais e eliminar falhas de compilação.
6. Migrar tokens para cookies seguros, aplicar CSP na SPA e revisar o trust proxy/rate limit.
7. Executar jornadas E2E completas, sem skips, em dois tenants.
8. Fechar as jornadas Vetus de financeiro, estoque, laboratório, fiscal, comunicações e integrações.
9. Resolver a divergência entre ADRs antigos e a arquitetura canônica atual.

## 8. Conclusão

O sistema estava em nível de **desenvolvimento avançado e homologação controlada** na baseline, sem evidência suficiente para produção crítica ou paridade funcional com o Vetus. A nota 57/100 representa aquela fotografia histórica; o estado pós-resolução e a nota atual estão na seção 9.

A fotografia de baseline desta auditoria foi produzida sobre o working tree que já possuía aproximadamente 610 entradas modificadas, deletadas ou não rastreadas. A execução de resolução posterior alterou código, migrations, testes e documentação; esta seção 9 registra somente as evidências pós-implementação.

## 9. Atualização de execução — 2026-08-07

Esta seção atualiza a baseline sem apagar o histórico da auditoria. A execução aplicou as correções priorizadas e reexecutou os gates em banco PostgreSQL efêmero, API, worker, SPA e Chromium.

### 9.1 Resultado atual dos gates

| Gate | Evidência atual | Resultado |
|---|---|---|
| Typecheck | `pnpm typecheck` — 68/69 projetos selecionados | **passou** |
| Lint | `pnpm lint` | **passou** |
| Build | `pnpm build` — SPA/PWA, API e worker | **passou** |
| Cobertura | 109 arquivos, 1.403 testes; 86,86% statements/lines, 80,06% branches, 90,00% funções | **passou** |
| Suíte agregada | `pnpm test` — todos os jobs dos pacotes selecionados concluíram sem erro | **passou** |
| API | `pnpm --filter @cvg-his-v2/api test` — 252/252 | **passou** |
| Worker | `pnpm --filter @cvg-his-v2/worker test` — 31/31 | **passou** |
| PostgreSQL crítico | 7 arquivos, 230/230; migrações `0000`–`0096`; 157 tabelas, 43 enums, 399 FKs | **passou** |
| Runtime PostgreSQL canônico | teste de boot/login/tenant/UoW, rollback, idempotência, attachment, billing, inventário, compras, folgas, internação, cirurgia e restart — 1/1 | **passou** |
| E2E de dois tenants em PostgreSQL | login A/B, entidades homônimas, isolamento, outbox e anexo — 1/1 | **passou** |
| E2E SPA | Chromium, 37/37, `retries=0`, sem `skip`; inclui o cenário PostgreSQL de dois tenants e o fluxo crítico clínico | **passou** |
| OpenAPI | 314 paths, 39 tags, 358 schemas | **passou** |
| RLS | 137/137 tabelas tenant protegidas, 0 exceções documentadas | **passou** |
| Segurança | secret scan e dependências: critical=0, high=0, moderate=0 | **passou** |
| Restore drill local | checksums, globals, dump PostgreSQL, storage e diff de listagem; 2 tabelas e 2 arquivos restaurados | **passou** — evidência em `/tmp/cvg-his-v2-restore-drill-evidence-final` |
| Anexos | 11/11 no módulo; S3 compatível, URL assinada e protocolo ClamAV | **passou** — homologação externa ainda pendente |
| Prescrições | 30/30; duração, revisões, snapshots e assinatura vinculada à versão | **passou** |
| Replay HTTP idempotente | 31/31 no teste direto do servidor; segunda chamada reaproveita status/headers/body sem repetir mutação | **passou** |
| Compose/roles/Helm | Compose com secrets explícitos, `sh -n` válido e chart estático válido; Helm binário ausente | **passou parcialmente** — renderização Helm real pendente |
| Paridade Vetus geral | evidência 85/100, verificado 0/11 | **bloqueado** |
| Paridade clínica Vetus | evidência 87/100, verificado 0/3 | **bloqueado** |

### 9.2 Entregas implementadas

| Item | Nota atual | Situação e evidência |
|---|---:|---|
| AUD-001 — `accountId` no billing/outbox | **95** | Payload canônico corrigido em `apps/api/src/runtime.ts`; API, worker, cobertura e critical green. |
| AUD-002 — persistência de diagnósticos | **92** | Escritas críticas aguardadas nas rotas/laboratório; 22 testes do módulo e API green. |
| AUD-003 — ownership de cartão | **95** | Billing/intent são escopados antes do provider; testes negativos comprovam que provider não é chamado entre tenants. |
| AUD-004 — fechamento atômico do PDV | **94** | Unit of Work/rollback implementados e exercitados em runtime, testes críticos e cobertura. |
| AUD-005 — contratos de testes | **91** | API 252/252, worker 31/31, cobertura e critical gate green. |
| AUD-006 — dependências | **98** | `security:enterprise` e auditoria de produção sem critical/high/moderate. |
| AUD-007 — estados de billing | **96** | Enum canônico alinhado entre tipos, rotas, OpenAPI, UI e testes. |
| AUD-008 — fail-closed | **96** | Readiness recusa repositories/UoW/providers críticos ausentes em produção-like; causa fica exposta. |
| AUD-009 — cache/invalidação SPA | **92** | Cache de API removido do service worker, invalidação pós-mutação e limpeza de sessão revisadas. |
| AUD-010 — sessão segura | **95** | Refresh em cookie HttpOnly/Secure/SameSite; access token não é persistido em `localStorage`; 17 testes de auth. |
| AUD-011 — CSP/headers SPA | **95** | Nginx e API aplicam CSP, HSTS, frame/nosniff e políticas correlatas. |
| AUD-012 — proxy/rate limit | **93** | Proxy confiável e Redis obrigatório em modo distribuído; testes de cadeia forwarded green. |
| AUD-013 — cobertura runtime | **84** | Cobertura global acima da meta e gates críticos green; adapters/provedores reais ainda têm áreas sem cobertura comportamental. |
| AUD-014 — E2E sem atalhos | **90** | 37/37 Chromium sem skip/retry, teste de runtime canônico 1/1 e dois tenants PostgreSQL 1/1; a matriz completa de jornadas ainda não está verde. |
| SCH-001 — configuração persistente de agenda | **82** | Repositório tenant-aware em memória/SQL, CRUD e isolamento testados; falta restart E2E em modo DB. |
| SCH-002 — concorrência da agenda | **78** | Exclusões PostgreSQL para profissional/paciente/recurso e conflitos 409 no serviço/API; DST, recorrência, disponibilidade completa e encaixe ainda não foram homologados. |
| INV-001 — lotes, validade e FEFO | **88** | Lotes persistem, vencidos são excluídos, custo ponderado e FEFO foram testados; reserva/devolução concorrente ainda falta. |
| INV-002 — compras e transferências | **76** | Pedido, aprovação, recebimento parcial/completo, lote, transferência FEFO, contas a pagar vinculadas e APIs persistem; UoW multi-linha cross-domain ainda é parcial. |
| HR-001 — folgas e conflitos | **72** | Folgas têm CRUD PostgreSQL, RLS, cancelamento, bloqueio de agenda e constraint/advisory lock contra corrida concorrente; comissão, E2E dedicado e reconciliação ainda faltam. |
| COMM-001 — comissão até contas a pagar | **68** | Pagamento exige método, cria/vincula payable e liquida antes de marcar a comissão; estorno, reconciliação e E2E financeiro completo ainda faltam. |
| PREV-001 — preventivo e vacinas | **68** | Protocolo, lote e próxima dose persistem; execução/reagendamento e tela/teste de catálogo foram atualizados; lembrete consentido e homologação clínica completa ainda faltam. |
| REP-002 — exportação e agendamento | **76** | JSON/CSV/XLSX/PDF são gerados e persistidos, provider só registra envio após sucesso, falhas ficam explícitas e retry liga a entrega ao artefato; provider externo e RBAC de destinatários ainda precisam de homologação. |
| A11Y-001 — modal e foco | **62** | Escape, foco inicial/restauração, trap e nome acessível do modal têm testes; auditoria WCAG 2.2 AA dos fluxos completos ainda não foi executada. |
| OPS-001 — restore drill | **72** | Fixture local restaurou checksums, PostgreSQL e storage com diff vazio; RPO/RTO de alvo real, failover e Game Day continuam pendentes. |

### 9.3 Notas reavaliadas por domínio

| Item analisado | Nota atual | Risco residual principal |
|---|---:|---|
| Governança e consistência documental | **74** | ADRs antigos ainda precisam de reconciliação formal. |
| Rastreabilidade de requisitos | **72** | Nem todo domínio tem evidência E2E/provedor assinada. |
| Arquitetura e modularidade | **70** | `server.ts` e superfícies grandes continuam acoplados. |
| Persistência e integridade | **84** | Core clínico/financeiro, compras, folgas, relatórios, fila de persistência clínica resiliente e restore local têm evidência; atomicidade cross-domain e alvo DR real ainda faltam. |
| Multi-tenancy, RBAC e RLS | **91** | RLS 137/137 e dois tenants PostgreSQL foram comprovados; falta ampliar a matriz para todos os fluxos. |
| Contratos API/OpenAPI | **86** | Validação estrutural e suíte API passaram; ainda há raw casts e contratos sem prova de provider. |
| Autenticação, sessão e MFA | **88** | Sessão HttpOnly, rotação, rate limit e login DB passaram; WebAuthn distribuído real ainda precisa de homologação. |
| UX e arquitetura de informação | **70** | Placeholders, estados planejados e decomposição visual permanecem. |
| Acessibilidade | **62** | Modal, foco, Escape, trap e nome acessível têm cobertura; ainda não há auditoria WCAG 2.2 AA formal dos fluxos críticos. |
| Proprietários, pacientes e vínculos | **82** | Isolamento, CRUD, alteração/exclusão de vínculo e merge auditado estão implementados/testados; homologação completa de inativação e jornada clínica ainda falta. |
| Agendamento | **84** | Configuração SQL, exclusões contra sobreposição e conflitos 409 foram comprovados; DST, recorrência e restart E2E ainda não têm cobertura completa. |
| Check-in, fila, triagem e handoff | **75** | Falta comprovação cross-sector e persistência DB na jornada completa. |
| Atendimento e prontuário | **87** | Comando clínico atômico, fila de persistência resiliente, auditoria aguardada, anexos, restart e fluxo crítico SPA estão comprovados; episódio multiagregado ainda é parcial. |
| Prescrição, execução e alta | **82** | Duração, execução versionada, revisões, assinatura e persistência/restart passaram; integração clínica completa ainda é parcial. |
| Laboratório e diagnósticos | **78** | Persistência tenant-aware, importação correlacionada, deduplicação, tentativas e retry foram implementados; provider/upload/restart completo não está homologado. |
| Internação | **86** | Transição de leito atômica, persistência e restart foram exercitados; alta financeira completa ainda pendente. |
| Cirurgia | **79** | Persistência e restart de superfície passaram; integração ERP e materiais completos ainda são parciais. |
| Preventivos e vacinas | **68** | Protocolo, lote, próxima dose, execução/reagendamento e catálogo SPA/API têm evidência; lembrete consentido, provider e homologação clínica completa continuam pendentes. |
| Venda no balcão/PDV | **76** | UoW, rollback e persistência atômica foram testados; falta reconciliação PostgreSQL ponta a ponta. |
| Faturamento e recebíveis | **82** | Journal balanceado, callbacks e idempotência foram implementados; reconciliação completa e provider ainda pendentes. |
| Estoque | **86** | Lotes duráveis, FEFO, validade, recebimento, transferência e consumo passaram; reserva/devolução e fechamento financeiro continuam parciais. |
| Caixa, cartão e PIX | **68** | Ownership, movimento atômico e saldo autoritativo melhoraram; provider real, estorno e conciliação faltam. |
| Fiscal/NFS-e | **50** | Adapter real fail-closed e cancelamento foram implementados, mas nenhum sandbox/provedor foi homologado. |
| Compras e transferências | **70** | Pedido, aprovação, entrada, lote, FEFO, transferência, recebimento parcial e payable vinculado estão implementados; NF completa e UoW cross-domain ainda não. |
| RH, folgas e comissões | **66** | Folgas persistentes têm guardas contra corrida e comissões já vinculam contas a pagar; estorno, reconciliação e E2E financeiro ainda pendentes. |
| Relatórios e exportações | **74** | JSON/CSV/XLSX/PDF, artefato persistido, delivery fail-closed e retry estão comprovados; provider de entrega, destinatários e retry externo ainda pendentes. |
| Marketing e comunicações | **55** | Consentimento e roteamento para e-mail/SMS/WhatsApp foram implementados; retry, bounce e sandbox ainda pendentes. |
| Integrações, webhooks e importação | **60** | Base de webhook e isolamento existem; consumidores/provedores/importação Vetus ainda sem homologação. |
| Qualidade dos testes e CI | **90** | Cobertura, API 252/252, worker 31/31, critical, build e E2E 37/37 passaram; CI completo, paridade e performance ainda fecham a certificação. |
| Segurança da aplicação | **90** | Auth/headers/RLS/upload, scanner ClamAV protocolado e dois-tenants DB melhoraram; homologação do serviço externo e matriz completa ainda pendentes. |
| Segurança de dependências | **98** | Auditoria atual sem critical/high/moderate. |
| Observabilidade e runtime | **80** | Readiness fail-closed, logs, UoW e repos DB estão comprovados; alertas operacionais e todos os agregados ainda faltam. |
| Deploy, backup e recuperação | **72** | Restore drill local passou com evidência de checksum/DB/storage; DR de alvo real, RPO/RTO, failover e Game Day continuam pendentes. |
| Performance e escalabilidade | **60** | Não há benchmark conclusivo desta execução. |
| Paridade funcional comprovada com Vetus | **0** | Gates continuam 0/11 e 0/3 verificados. |

### 9.4 Nota global e decisão

A nota permanece em **80/100**: os P0 reproduzidos foram tratados, os gates técnicos passaram, o runtime PostgreSQL canônico foi exercitado com restart, rollback e idempotência, dois tenants foram isolados em E2E real, compras/transferências, folgas, agenda concorrente, preventivos estruturados, prontuário resiliente, delivery fail-closed, exportações XLSX/PDF e restore drill local ganharam evidência, e as dependências ficaram sem vulnerabilidades reportadas. A nota não libera produção crítica: atomicidade cross-domain, delivery externo, providers fiscais/comunicações/pagamentos/laboratório, WCAG, performance, DR/Game Day real e paridade Vetus continuam sem homologação final.

**Decisão:** apto para desenvolvimento/homologação controlada; não autorizado como go-live de produção crítica até G1–G5 e os gates Vetus serem cumpridos.

### 9.5 Complemento de evidência da rodada final

Os números da seção 9.1 substituem os números de execução anteriores; os números da seção 3 permanecem deliberadamente históricos. Nesta rodada complementar foram confirmados:

- envelope de comando global tenant-aware, idempotência de mutações e replay de status/headers/body sem repetir a operação;
- migrations `0092`–`0096`, schema com 157 tabelas, 43 enums, 399 FKs e RLS em 137/137 tabelas tenant;
- anexos 11/11, incluindo teste do adaptador S3 compatível e servidor TCP local para o protocolo ClamAV `INSTREAM`;
- prescrições 30/30 com duração, snapshots de revisão, assinatura SHA-256 vinculada à versão e renderização do documento;
- laboratório com persistência de correlação, deduplicação, contagem de tentativas, falha explícita e retry;
- roles API/worker distintas no Compose/Helm e script shell sintaticamente válido; `docker compose config --quiet` passou com secrets efêmeros explícitos;
- `pnpm typecheck`, `pnpm validate:openapi`, `pnpm validate:rls`, `pnpm security:enterprise`, `pnpm audit --prod --audit-level=high` e `pnpm validate:helm` passaram. A validação Helm foi estática porque o executável Helm não está instalado.
- a cobertura completa foi reexecutada com 109 arquivos e 1.403 testes: 86,86% statements/lines, 80,06% branches e 90,00% funções, acima dos limiares configurados.

Essas entregas elevam a nota dos itens de segurança, contratos, anexos, prescrições, laboratório, pacientes e qualidade, mas não transformam homologação de adapter em homologação de provider. Permanecem bloqueadores de produção crítica: UoW de episódio clínico multiagregado, reconciliação financeira/caixa completa, providers reais e seus sandboxes, E2E integral de todas as jornadas, WCAG 2.2 AA, performance, DR/Game Day em ambiente alvo e paridade Vetus.

## 10. Rodada final de implementação e verificação — 2026-08-07

Esta seção é o fechamento da execução solicitada e substitui os contadores anteriores das seções 9.1 e 9.5. Os números históricos foram preservados para manter a trilha de auditoria; os resultados abaixo são os mais recentes após recompilar os pacotes afetados, corrigir a regressão do fluxo clínico e validar o runtime PostgreSQL em ambiente limpo.

### 10.1 Entregas implementadas nesta rodada

- `0097`–`0102`: persistência tenant-aware de NFS-e, logs e lotes de importação Vetus, configurações de marketing, reservas de estoque e movimento de depósito de caixa;
- controle de lotes Vetus com dry-run, rejeitados, idempotência, retomada, replay e rollback registrados;
- cobertura adicional para `TenantUnitOfWork`, idempotência, outbox/inbox/auditoria, marketing e fiscal;
- atualização aguardada de MFA e API keys, evitando mutações fire-and-forget em caminhos críticos;
- fallback clínico explícito para repositórios em memória com identificadores sintéticos, preservando a transação PostgreSQL para contas UUID; regressão coberta por teste unitário;
- recompilação do módulo de prontuário e da API antes do E2E, evitando que o artefato `dist` ficasse atrás do código-fonte;
- correção da relação entre `professionalUserId` e `staff.id`, refresh do read model de agenda após mutações de disponibilidade e seeds E2E autocontidos;
- correção dos fluxos E2E de cirurgia, estoque e agendamento para usar usuários/profissionais reais e horários livres pesquisados em janela determinística.

### 10.2 Gates finais

| Gate | Evidência final | Resultado |
|---|---|---|
| Typecheck | `pnpm typecheck` — 68/69 projetos selecionados | **passou** |
| Lint | `pnpm lint` | **passou** |
| Cobertura | 109 arquivos, 1.427 testes; 87,45% statements/lines, 80,04% branches e 90,65% funções | **passou** |
| API | `pnpm --filter @cvg-his-v2/api test` — 263/263 | **passou** |
| PostgreSQL crítico | `pnpm test:critical` — 230/230; migrations `0000`–`0102`; 163 tabelas, 43 enums e 417 FKs | **passou** |
| Prontuário clínico | teste unitário do módulo — 17/17; fluxo crítico isolado — 1/1 | **passou** |
| E2E SPA PostgreSQL | `pnpm test:e2e:spa:docker` — PostgreSQL limpo, Chromium, 37/37, `retries=0`, sem skip, `productionReady=true` após restart/rehydration | **passou** |
| E2E legado PostgreSQL | `playwright.config.ts` com `E2E_DATABASE_MODE=1` — 22/22 fluxos, PostgreSQL limpo, `productionReady=true` | **passou** |
| E2E enterprise | `pnpm test:e2e:spa:enterprise` — 7/7 | **passou** |
| OpenAPI | 327 paths, 39 tags e 377 schemas | **passou** |
| RLS | 144/144 tabelas tenant protegidas | **passou** |
| Segurança | secret/dependency audit sem critical, high ou moderate | **passou** |
| Deploy estático | Compose, roles shell e chart Helm estático válidos; binário Helm ausente | **parcial** |
| Higiene do diff | `git diff --check` | **passou** |

O gate oficial `test:e2e:spa:docker` e a suíte legada foram executados com PostgreSQL limpo, `API_DISABLE_INCOMPATIBLE_DB_REPOS=0` e `productionReady=true`; o restart/rehydration canônico também passou. A suíte enterprise 7/7 permanece uma prova adicional de superfícies administrativas. Esses resultados comprovam o runtime local, mas não substituem homologação de providers, aceite operacional ou os fluxos Vetus ainda bloqueados.

### 10.3 Nota e decisão atualizadas

A nota global permanece em **80/100**. O aumento de cobertura, o fechamento do controle de importação Vetus, a persistência de fiscal/marketing/estoque/caixa, o alinhamento da agenda e a execução E2E em PostgreSQL elevam a confiança técnica, mas não alteram a decisão de go-live porque ainda não há homologação de providers externos, reconciliação financeira completa, UoW de episódio clínico multiagregado, auditoria WCAG 2.2 AA, benchmark de performance, DR/Game Day em ambiente-alvo ou paridade funcional assinada.

| Dimensão de aceite | Estado final |
|---|---|
| G0 — integridade técnica | **atendido para os gates executados** |
| G1 — segurança, dados e contratos | **parcialmente atendido; validação externa e matriz completa pendentes** |
| G2 — clínica | **parcial; 37/37 SPA DB e 22/22 legados passam, mas as oito jornadas clínicas completas ainda não foram certificadas** |
| G3 — ERP | **parcial; ledger, reservas, depósito e UoW possuem evidência, reconciliação ponta a ponta ainda pendente** |
| G4 — operação e integrações | **pendente; providers, DR, performance e comunicações reais não homologados** |
| G5 — homologação | **bloqueado** |
| Paridade Vetus geral/clínica | **evidência 95/100 e 100/100; 0/11 e 0/3 verificados** |

**Decisão:** apto para desenvolvimento e homologação controlada; não autorizado para produção crítica até os bloqueios acima serem comprovados e aceitos formalmente.
