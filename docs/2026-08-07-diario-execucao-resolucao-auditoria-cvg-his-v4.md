# Diário de execução da resolução da auditoria do CVG-HIS V4

**Data:** 2026-08-07
**Documentos de referência:** [relatório integral](2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md), [plano executivo](2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md) e [backlog/roadmap](2026-08-07-backlog-roadmap-resolucao-auditoria-cvg-his-v4.md)
**Estado:** O0 técnico encerrado; núcleo de O1 comprovado; prontuário, agenda concorrente, procurement, comissões, preventivos, exportações e restore drill local incrementados; O2/O3 parciais; produção crítica bloqueada.

## 1. Escopo executado

Foram implementadas e revalidadas as correções P0 `AUD-001` a `AUD-012`, além de persistência tenant-aware da configuração de agenda (`SCH-001`), guardas de concorrência (`SCH-002` parcial), vínculo de compras/comissões com contas a pagar, preventivos estruturados, delivery fail-closed de relatórios, fila de persistência clínica resiliente, proteção de integridade para recebíveis órfãos e os incrementos clínicos/ERP descritos neste registro.

Principais áreas alteradas:

- outbox/billing, diagnósticos, pagamentos, PDV, billing e bootstrap/runtime;
- autenticação, sessão HttpOnly, CSP, proxy confiável, rate limit e cache SPA;
- repositórios de agenda em memória/PostgreSQL e testes de isolamento;
- serviço financeiro e teste de regressão para não quebrar a worklist por referência órfã;
- fixtures e jornadas E2E para login real, limpeza de recursos, agenda, billing e internação.
- runtime PostgreSQL canônico com IDs UUID, seed de segundo tenant, restart, UoW, rollback e idempotência;
- alta, anexos binários, prontuário atômico, prescrições, lotes/FEFO, caixa atômico, ledger balanceado e fiscal/marketing fail-closed;
- isolamento PostgreSQL entre `admin` e `admin_b`, incluindo entidades homônimas, outbox, anexos e tentativas de acesso cruzado.
- compras com aprovação, recebimento parcial/completo, lotes, FEFO e transferências entre locais;
- folgas persistentes com RLS, cancelamento, advisory lock e exclusão contra sobreposição na agenda;
- agenda com exclusões PostgreSQL para profissional, paciente e recurso, convertendo colisões em 409;
- compras e comissões com contas a pagar vinculadas e método de pagamento explícito;
- preventivos/vacinas com protocolo, lote, execução, reagendamento e próxima dose persistidos;
- exportações JSON/CSV/XLSX/PDF com artefato persistido, delivery fail-closed e ligação entre retry e delivery;
- prontuário com fila de persistência recuperável após falha e proteção contra corrida de criação lazy;
- `DsModal` com Escape, foco inicial/restauração, trap e nome acessível;
- restore drill com checksum, globals, dump PostgreSQL, storage e diff de listagem.

O working tree já estava significativamente alterado antes desta execução; nenhuma alteração não relacionada foi descartada.

## 2. TDD e evidência

| Entrega | RED/GREEN e evidência |
|---|---|
| Configuração de agenda | testes de rota primeiro falharam sem repository; passaram após `InMemoryAgendaConfigRepository`/`DatabaseAgendaConfigRepository`, com isolamento entre contas |
| Recebíveis órfãos | teste primeiro reproduziu `NotFoundError`; serviço passou a ignorar somente referências ausentes e a propagar erros reais |
| Auth/refresh | testes comprovam cookie HttpOnly, ausência do refresh token na resposta, sessão inexistente e logout/revogação |
| Ownership de cartão | testes comprovam que billing/intent estrangeiro não alcança o provider |
| Runtime/Persistence | testes críticos comprovam rollback/UoW, RLS, leases, idempotência e migrações limpas |
| Browser | fixtures usam login UI/API real, refresh cookie e `retries=0`; não foram adicionados `skip` ou `continue` para mascarar falhas |
| Lotes/ledger | testes cobrem journal balanceado/idempotente, FEFO, expiração, restart e rollback de persistência |
| Procurement | testes cobrem compra draft/approve/partial/full receive, validações de transição, tenant e reidratação de repository |
| Folgas | testes cobrem criação, conflito de agenda, cancelamento, persistência e isolamento de conta |
| Concorrência de folgas/agendamento | testes reproduzem reserva simultânea e sobreposição; exclusões PostgreSQL/advisory lock retornam conflito sem duplicar efeito |
| Relatórios | testes cobrem CSV/JSON/XLSX/PDF, conteúdo base64, leitura cross-account e delivery ligado ao export |
| Comissões/procurement | testes cobrem método de pagamento, criação/vínculo de payable, liquidação ordenada, aprovação de compra e recebimento com vínculo financeiro |
| Preventivos/vacinas | testes cobrem protocolo, lote, próxima dose, execução/reagendamento, OpenAPI e catálogo SPA |
| Prontuário | teste de falha da primeira persistência comprova rollback e recuperação da fila; E2E clínico confirma o fluxo após a correção da corrida lazy |
| Modal/acessibilidade | testes cobrem Escape, foco inicial/restauração, trap e nome acessível |
| Restore drill | fixture real restaura checksums, PostgreSQL e storage; diff de conteúdo vazio |

## 3. Gates finais (rodada inicial)

Os números abaixo preservam a primeira rodada documentada; a seção 6 registra a reexecução complementar e os contadores finais.

| Comando/checagem | Resultado |
|---|---|
| `pnpm typecheck` | passou |
| `pnpm lint` | passou |
| `pnpm build` | passou; SPA/PWA, API e worker compilados |
| `pnpm test` | passou; todos os jobs dos pacotes selecionados concluíram sem erro |
| `pnpm test:coverage` | 106 arquivos, 1.384/1.384; 87,28% statements/lines, 80,04% branches, 90,25% funções |
| `pnpm --filter @cvg-his-v2/api test` | 248/248 |
| `pnpm --filter @cvg-his-v2/worker test` | 31/31 |
| `pnpm test:critical` | 7 arquivos, 230/230; PostgreSQL efêmero; 154 tabelas, 43 enums e 391 FKs; migrações `0000`–`0091` |
| Runtime PostgreSQL canônico | 1/1; restart, rollback e idempotência comprovados |
| E2E PostgreSQL de dois tenants | 1/1; login A/B e isolamento de entidades, outbox e anexos |
| `bash infra/scripts/run-e2e-spa.sh` | 37/37 Chromium; 2,8 min; sem skip/retry; inclui dois tenants PostgreSQL e fluxo clínico crítico |
| `pnpm validate:openapi` | 303 paths, 39 tags, 346 schemas |
| `pnpm validate:rls` | 134/134 tabelas tenant protegidas |
| `pnpm security:enterprise` | critical=0, high=0, moderate=0 |
| Restore drill | passou; 2 tabelas e 2 arquivos restaurados, checksums válidos e diff de storage vazio | `ops:restore:drill:fixture` — `/tmp/cvg-his-v2-restore-drill-evidence-final` |
| Migrações PostgreSQL | `0000`–`0091`; 154 tabelas, 43 enums, 391 FKs |

## 4. Pendências e bloqueios reais

Os comandos de paridade Vetus permanecem bloqueados: evidência 85/100 e 0/11 domínios gerais; evidência 87/100 e 0/3 jornadas clínicas. Isso não é tratado como falha de teste nem como item concluído.

O runtime canônico PostgreSQL agora tem prova executável de boot, login, tenant context, rollback, idempotência, restart e isolamento A/B. A evidência ainda não cobre todos os agregados nem os providers externos; por isso não libera G1 integral.

Também permanecem no backlog: episódio clínico completo, homologação externa do upload privado/antivírus, pipeline e provider laboratorial, UoW cross-domain de compras com NF/contas a pagar/caixa, reserva/devolução FEFO, caixa completo, provider de pagamentos real, NFS-e, estorno/reconciliação de comissões, lembretes consentidos de preventivos, delivery externo de relatórios, consentimento/retry/bounce, importação Vetus, performance, WCAG, DR de alvo real, Game Day e decomposição estrutural. O restore drill local passou, mas não substitui o exercício de DR do ambiente alvo.

## 5. Decisão e impacto na nota

A nota global reavaliada passa de **57/100 para 80/100**. O incremento decorre dos P0 tratados, gates técnicos verdes, runtime PostgreSQL com restart/UoW/rollback/idempotência, isolamento A/B comprovado, procurement/folgas/comissões/preventivos estruturados/exportações implementados, prontuário resiliente, restore drill local aprovado, segurança de dependências sem vulnerabilidades reportadas, autenticação browser real e E2E sem atalhos. A nota permanece sem autorização de produção crítica porque G1–G5, providers externos, DR alvo real e a paridade Vetus continuam não satisfeitos.

**Promoção autorizada:** desenvolvimento e homologação controlada.
**Go-live crítico:** não autorizado nesta rodada.

## 6. Complemento de execução — plataforma, clínica e integrações

### 6.1 Entregas aplicadas

- envelope transacional global para mutações HTTP tenant-aware, com `Idempotency-Key` em produção-like, payload canonizado, auditoria aguardada e replay da resposta completa;
- parser de body com cache por request e limites distintos para comandos comuns/anexos;
- migrations `0092`–`0096` para validade/timezone de agenda, segurança de anexos, assinatura de prescrição, merge de pacientes e importação laboratorial;
- S3/MinIO privado com SigV4, URL curta HMAC, auditoria de download e scanner ClamAV `INSTREAM` fail-closed;
- prescrições com duração, revisões/snapshots, assinatura ligada à versão e documento verificável;
- merge auditado de pacientes, alteração/exclusão de vínculos, reabertura auditada de atendimento e laboratório com correlação, deduplicação, falha persistida e retry;
- roles PostgreSQL separadas para API/worker, sem `SUPERUSER`/`BYPASSRLS`, com auditoria append-only e configuração Helm/Compose alinhada.

### 6.2 Evidência reexecutada

| Verificação | Resultado |
|---|---|
| API completa | 252/252 |
| Anexos | 11/11 |
| Prescrições | 30/30 |
| Teste direto do servidor | 31/31 |
| Cobertura completa | 109 arquivos, 1.403 testes; 86,86% statements/lines, 80,06% branches, 90,00% funções |
| Typecheck workspace | 68/69 projetos selecionados |
| PostgreSQL crítico | 230/230; 157 tabelas, 43 enums, 399 FKs; `0000`–`0096` |
| OpenAPI/RLS | 314/39/358; 137/137 |
| Segurança/audit | 0 critical/high/moderate reportados |
| Compose/roles/Helm | Compose e shell válidos; chart estático válido; Helm binário ausente |

### 6.3 Risco residual

Os adapters externos estão implementados e protocolados, mas ClamAV, S3/MinIO, pagamentos, NFS-e, laboratório bidirecional e comunicações ainda precisam de homologação com serviços reais. Também permanecem a atomicidade clínica multiagregado, ERP/caixa/reconciliação completa, E2E integral, WCAG, performance, DR/Game Day alvo e paridade Vetus. A nota global permanece **80/100** e a promoção continua limitada a desenvolvimento/homologação controlada.
