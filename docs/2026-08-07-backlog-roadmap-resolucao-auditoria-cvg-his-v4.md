---
document_status: historical
document_kind: roadmap
effective_date: 2026-08-07
owner: PMO e líderes de domínio CVG-HIS
review_cycle: archived
superseded_by: docs/2026-09-02-roadmap-melhorias-cvg-his-v4.md
---

# Backlog e roadmap de resolução da auditoria do CVG-HIS V4

> **Documento histórico.** O sequenciamento vigente está no [roadmap de
> 2026-09-02](./2026-09-02-roadmap-melhorias-cvg-his-v4.md), com itens no
> [backlog priorizado](./2026-09-02-backlog-priorizado-cvg-his-v4.md).

**Data:** 2026-08-07
**Status histórico:** O0 concluído; O1 técnico comprovado; O2/O3 incrementados com prontuário, agenda, compras, comissões, preventivos, anexos seguros, prescrições, merge de pacientes e laboratório resiliente; G1/G2/G3+ condicionais
**Plano executivo:** [`2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md`](2026-08-07-plano-executivo-resolucao-auditoria-cvg-his-v4.md)
**Relatório de origem:** [`2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md`](2026-08-07-relatorio-auditoria-integral-cvg-his-v4.md)
**Backlogs anteriores:** mantidos como histórico e fonte de IDs já existentes; este documento atualiza a prioridade após a auditoria de 2026-08-07.

## 1. Convenções

Prioridades:

- `P0`: bloqueia segurança, integridade, release ou operação financeira;
- `P1`: necessário para piloto clínico/ERP confiável;
- `P2`: necessário para produção ampla, gestão, continuidade e paridade Vetus;
- `P3`: diferenciação posterior, sem entrar no caminho crítico.

Pontos (`SP`) são relativos e incluem código, migration, testes, revisão e documentação. Não representam dias.

Estados permitidos: `aberto`, `em execução`, `bloqueado`, `parcial`, `concluído`, `verificado`. O estado `parcial` não libera dependentes nem aumenta a nota do domínio.

Owners:

| Código | Responsabilidade                                          |
| ------ | --------------------------------------------------------- |
| `PLAT` | API, persistência, transações, worker e contratos         |
| `SEC`  | autenticação, tenant, autorização, secrets e dependências |
| `CLIN` | atendimento, prontuário, laboratório e hospital           |
| `FIN`  | billing, ledger, estoque, caixa, pagamentos e fiscal      |
| `WEB`  | SPA, UX, acessibilidade e responsividade                  |
| `QA`   | testes, evidência, performance e gates                    |
| `OPS`  | deploy, observabilidade, backup e recuperação             |
| `PROD` | produto, operação, responsável veterinário e aceite       |

Todo item exige TDD, validação de boundary, tenant/RBAC/RLS, auditoria, observabilidade e atualização da documentação quando aplicável.

## 2. Roadmap por ondas

| Onda                       | Sprints | Objetivo                                                     | Itens principais                                   | Gate |
| -------------------------- | ------: | ------------------------------------------------------------ | -------------------------------------------------- | ---- |
| O0 — correções imediatas   |     1-2 | remover falhas reproduzidas e desbloquear release            | `AUD-001` a `AUD-014`                              | G0   |
| O1 — fundação transacional |     3-5 | UoW, outbox real, fail-closed, auth e contratos              | `PLAT-001/002/003`, `SEC-001/002`, `API-001`       | G1   |
| O2 — clínica comprovada    |     6-9 | episódio, prontuário, anexos, fila, exames e alta            | `CLIN-*`, `LAB-*`, `FILE-*`, `E2E-001` a `E2E-005` | G2   |
| O3 — hospital e ERP        |   10-14 | internação, estoque, comanda, ledger, caixa e pagamento      | `INP-*`, `INV-*`, `BILL-*`, `FIN-*`, `PAY-*`       | G3   |
| O4 — gestão e integrações  |   15-18 | fiscal, relatórios, comunicações, RH, importação e providers | `FISC-*`, `REP-*`, `MKT-*`, `HR-*`, `INT-*`        | G4   |
| O5 — certificação          |   19-22 | WCAG, performance, DR, Game Day, reauditoria e homologação   | `A11Y-*`, `PERF-*`, `OPS-*`, `PAR-*`               | G5   |

As dependências devem ser respeitadas. A execução de uma tela não pode ser usada para declarar concluído um domínio cujo efeito persistente, financeiro ou de auditoria ainda esteja parcial.

## 3. P0 — correções imediatas da auditoria

| ID      | Entrega                                                  | Owner       |  SP | Dependência | Aceite verificável                                                                                                                       | Estado                                                                                                                   |
| ------- | -------------------------------------------------------- | ----------- | --: | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| AUD-001 | Corrigir `accountId` no evento de mudança de billing     | `PLAT/FIN`  |   3 | -           | `onStatusChanged` publica `accountId` no payload; os quatro testes financeiros atuais passam; evento sem conta é rejeitado               | verificado                                                                                                               |
| AUD-002 | Aguardar persistência de pedidos/resultados diagnósticos | `CLIN/PLAT` |   5 | -           | rotas aguardam o repository; falha de banco não retorna sucesso; restart relê pedido e resultado                                         | verificado                                                                                                               |
| AUD-003 | Validar ownership de intent de cartão                    | `FIN/SEC`   |   5 | -           | criação e captura validam billing/intent da conta; provider não é chamado para intent de outro tenant; testes negativos passam           | verificado                                                                                                               |
| AUD-004 | Tornar fechamento de PDV atômico                         | `FIN/PLAT`  |  13 | `PLAT-001`  | estoque, caixa, sale e outbox estão na mesma UoW; falha injetada faz rollback integral; concorrência fecha uma única vez                 | verificado                                                                                                               |
| AUD-005 | Alinhar testes quebrados ao contrato atual               | `QA/PLAT`   |   5 | -           | `foundational` compila; testes de inventário, MFA e integridade usam assinaturas e invariantes atuais; `pnpm test` passa                 | verificado                                                                                                               |
| AUD-006 | Remediar vulnerabilidades de produção                    | `SEC`       |   8 | -           | `pnpm audit --prod` e `security:enterprise` sem `critical/high`; nenhuma vulnerabilidade é apenas suprimida por configuração             | verificado                                                                                                               |
| AUD-007 | Canonicalizar estados de billing                         | `FIN/PLAT`  |   5 | -           | OpenAPI, tipos, rotas, migrations, UI e testes usam o mesmo enum e documentam transições válidas                                         | verificado                                                                                                               |
| AUD-008 | Remover fallback obrigatório em modo database            | `PLAT/SEC`  |   8 | -           | schema/repository obrigatório ausente impede startup; nenhum `Map` substitui persistência em produção; health/readiness expõem causa     | verificado                                                                                                               |
| AUD-009 | Corrigir invalidação de cache após DELETE                | `PLAT`      |   5 | `PLAT-001`  | resposta 204 ocorre após commit; leitura imediatamente posterior retorna 404 em duas instâncias; cache não ressuscita registro           | verificado                                                                                                               |
| AUD-010 | Migrar tokens para sessão segura                         | `SEC/WEB`   |  13 | -           | access token não fica em `localStorage`; refresh em cookie `HttpOnly/Secure/SameSite`; rotação, revogação e CSRF testados                | evidência histórica verificada; `QB-AUTH-01` atual é `PARTIAL` até sessão/MFA/revogação entre réplicas serem comprovadas |
| AUD-011 | Aplicar CSP e headers na SPA                             | `WEB/SEC`   |   5 | `AUD-010`   | CSP começa em report-only, depois enforce; testes validam CSP, HSTS, `nosniff`, frame e assets legítimos                                 | verificado                                                                                                               |
| AUD-012 | Rate limit distribuído e proxy confiável                 | `SEC/PLAT`  |   8 | -           | Redis é usado em produção; `X-Forwarded-For` só é aceito de proxies configurados; chave inclui rota, conta e origem apropriadas          | evidência histórica verificada; `QB-AUTH-01` atual é `PARTIAL` até rate-limit entre réplicas ser comprovado              |
| AUD-013 | Expandir cobertura para runtime crítico                  | `QA/PLAT`   |   8 | -           | rotas, bootstrap, repositories, adapters e contratos críticos têm testes; exclusões do `vitest.config.ts` ficam justificadas ou cobertas | parcial                                                                                                                  |
| AUD-014 | Gate comportamental E2E sem atalhos                      | `QA/PROD`   |   8 | `AUD-005`   | inventário de cenários, PostgreSQL real, dois tenants, `retries=0`, zero `skip` e artefatos publicados no CI                             | parcial                                                                                                                  |

**Saída O0 histórica:** `AUD-001` a `AUD-012` tiveram evidência verificada na fotografia de 07/08; `AUD-013` e `AUD-014` eram parciais. Para promoção atual, prevalece a Quality Bar: `QB-AUTH-01`, `QB-DATA-01`, `QB-CORE-01` e os demais gates globais permanecem nos estados publicados no handoff global, sem inferir verde de produção a partir desta tabela histórica.

## 4. P1 — fundação, clínica e segurança operacional

| ID        | Entrega                                             | Owner           |  SP | Dependência            | Aceite verificável                                                                                                            | Estado  |
| --------- | --------------------------------------------------- | --------------- | --: | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------- |
| PLAT-001  | Completar `TenantUnitOfWork` nos agregados críticos | `PLAT`          |  13 | `AUD-008`              | mesma conexão e `SET LOCAL` para mutação, auditoria, outbox e idempotência; rollback e NOBYPASSRLS testados                   | parcial |
| PLAT-002  | Inbox/outbox com consumidores reais                 | `PLAT/OPS`      |  13 | `PLAT-001`             | claim, lease, retry, DLQ, takeover, idempotência e consumidor real de billing/notificação/webhook sem duplicidade             | parcial |
| PLAT-003  | Fail-closed de repositories e providers             | `PLAT/SEC`      |   8 | `AUD-008`              | produção não inicia com repository em memória, provider mock ou scanner indisponível quando o recurso é obrigatório           | parcial |
| SEC-001   | Completar separação de roles                        | `SEC/OPS`       |   8 | -                      | migration, API e worker usam roles distintas; nenhum serviço de runtime possui superuser ou `BYPASSRLS`                       | parcial |
| SEC-002   | E2E real de dois tenants                            | `SEC/QA`        |  13 | `SEC-001`, `AUD-014`   | leitura, escrita, login, outbox, anexos e pagamentos de A nunca atravessam para B                                             | parcial |
| API-001   | Validar entradas e alinhar contrato runtime/OpenAPI | `PLAT/QA`       |   8 | `AUD-007`              | raw casts críticos eliminados; erros possuem envelope; estados, ownership, limites e códigos HTTP são testados contra OpenAPI | parcial |
| DATA-001  | Consolidar proprietário/paciente/vínculos           | `CLIN/PLAT`     |   8 | `SEC-002`              | vínculo primário, responsáveis autorizados, troca, merge e inativação persistem, auditam e respeitam tenant                   | parcial |
| SCH-001   | Persistir configuração de agenda                    | `CLIN/PLAT`     |  13 | `PLAT-001`             | tipos, disponibilidade, exceções, recursos e status sobrevivem restart; não há configuração em `Map`                          | parcial |
| SCH-002   | Disponibilidade, concorrência e encaixe             | `CLIN/PLAT`     |  13 | `SCH-001`              | exclusão de intervalos, DST, recorrência, bloqueio, recurso e reserva simultânea são testados                                 | parcial |
| CLIN-001  | Consolidar agregado de episódio clínico             | `CLIN`          |  13 | `PLAT-001`             | estados, versão, fechamento read-only, reabertura auditada e episódio ativo/último separados                                  | parcial |
| CLIN-002  | Comando atômico de ficha clínica                    | `CLIN/PLAT`     |  13 | `CLIN-001`             | ficha, receita, exame, procedimento e orientações salvam todos ou nenhum; conflito retorna 409                                | parcial |
| FILE-001  | Upload clínico seguro                               | `PLAT/SEC/CLIN` |  13 | `SEC-002`              | S3/MinIO privado, MIME/magic bytes/hash, tamanho, quarentena, antivirus, URL curta, auditoria e download somente `available`  | parcial |
| RX-001    | Prescrição versionada e verificável                 | `CLIN/PLAT`     |  13 | `CLIN-002`             | dose/via/frequência/duração, autoria, assinatura, snapshot imutável, cancelamento e substituição auditados                    | parcial |
| QUEUE-001 | Esteira, handoff e SLA                              | `CLIN/WEB`      |  13 | `SCH-002`, `CLIN-001`  | chegada, prioridade, chamada, atraso, transferência, responsável e histórico sobrevivem restart                               | parcial |
| LAB-001   | Pipeline laboratorial durável                       | `CLIN/PLAT`     |  13 | `AUD-002`, `FILE-001`  | pedido, coleta, análise, liberação, retificação e laudo têm transições válidas e persistência confirmada                      | parcial |
| LAB-002   | Integração laboratorial                             | `PLAT/CLIN`     |  13 | `LAB-001`, `PLAT-002`  | correlação, retry, deduplicação e resultado bidirecional com provider sandbox                                                 | parcial |
| INP-001   | Internação completa                                 | `CLIN/FIN`      |  13 | `CLIN-001`, `PLAT-001` | admissão, leito, plano 24h, evolução, ocorrência, diária, consumo, transferência e alta                                       | parcial |
| SUR-001   | Cirurgia integrada                                  | `CLIN/FIN`      |  13 | `INP-001`, `FILE-001`  | checklist, equipe, materiais, anestesia, recuperação, auditoria e alta                                                        | parcial |

## 5. P1/P2 — ERP, comercial e fiscal

| ID       | Entrega                                    | Owner      |  SP | Dependência                                   | Aceite verificável                                                                                 | Estado  |
| -------- | ------------------------------------------ | ---------- | --: | --------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------- |
| BILL-001 | Ledger único de billing/comanda/recebíveis | `FIN/PLAT` |  13 | `PLAT-001`, `AUD-007`                         | itens, pagamentos, estornos e projeções têm uma fonte canônica, journal balanceado e reconciliação | parcial |
| BILL-002 | Transação clínica/estoque/financeiro       | `FIN/CLIN` |  13 | `BILL-001`, `PLAT-001`                        | falha em qualquer efeito reverte todos; retry não duplica; auditoria e outbox são parte da UoW     | parcial |
| INV-001  | Lote, validade, FEFO e reserva             | `FIN/PLAT` |  13 | `BILL-002`                                    | saldo não negativo, consumo concorrente, devolução, custo e validade são consistentes              | parcial |
| INV-002  | Compras, NF, transferência e inventário    | `FIN`      |  13 | `INV-001`                                     | pedido/aprovação/entrada/lote/transferência/recebimento parcial reconciliam estoque e financeiro   | parcial |
| CASH-001 | Caixa completo                             | `FIN/WEB`  |  13 | `BILL-001`                                    | abertura, suprimento, sangria, depósito, fechamento, diferenças e auditoria                        | parcial |
| PAY-001  | PIX e cartão com provider real             | `FIN/PLAT` |  13 | `AUD-003`, `BILL-001`, `PLAT-002`             | webhook assinado, replay bloqueado, timeout, chargeback, captura, estorno e conciliação            | parcial |
| FISC-001 | Provider NFS-e homologado                  | `FIN/PLAT` |  13 | `BILL-001`, `PLAT-002`                        | sandbox, secrets, emissão, rejeição, correção, cancelamento, PDF/XML e idempotência                | parcial |
| HR-001   | Profissões, folgas e conflitos             | `CLIN/WEB` |   8 | `SCH-002`                                     | CRUD persistente, autorização, conflito de agenda, auditoria e E2E                                 | parcial |
| COMM-001 | Comissão até pagamento                     | `FIN`      |   8 | `BILL-001`, `CASH-001`                        | cálculo, revisão, fechamento, estorno e pagamento reconciliados                                    | parcial |
| PREV-001 | Preventivo e vacinas                       | `CLIN/WEB` |  13 | `CLIN-001`, `MKT-001`                         | protocolo, lote, execução, próxima dose, lembrete e histórico                                      | parcial |
| E2E-006  | Consulta até recebimento                   | `QA/PROD`  |  13 | `CLIN-002`, `BILL-002`, `INV-001`, `CASH-001` | consulta, comanda, estoque, ledger, caixa, pagamento, auditoria e restart                          | aberto  |
| E2E-007  | Internação até alta/caixa                  | `QA/PROD`  |  13 | `INP-001`, `BILL-002`, `INV-001`, `CASH-001`  | 24h simuladas, consumo, diária, alta, cobrança, pagamento e restart                                | aberto  |

## 6. P2/P3 — gestão, comunicação, operação e qualidade

| ID       | Entrega                                          | Owner       |  SP | Dependência                       | Aceite verificável                                                                                                 | Estado  |
| -------- | ------------------------------------------------ | ----------- | --: | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------- |
| ARCH-001 | Decompor arquivos gigantes e reduzir acoplamento | `PLAT/WEB`  |  13 | `AUD-013`                         | `server.ts` e páginas críticas divididos por domínio sem alteração comportamental; boundaries públicos preservados | aberto  |
| DOC-001  | Reconciliar ADRs e trilha documental             | `PROD/PLAT` |   5 | `GATE-001`                        | ADR-003/ADR-007 e links canônicos não divergem; documentos antigos ficam marcados como baseline/histórico          | aberto  |
| UX-001   | Navegação e estados operacionais canônicos       | `WEB/PROD`  |   8 | `API-001`                         | estados functional/building/no-permission/no-integration/planned/legacy claros; nenhum CTA principal inativo       | parcial |
| UX-002   | Cockpit clínico e timeline                       | `WEB/CLIN`  |  13 | `CLIN-002`, `QUEUE-001`           | identidade compacta, SOAP central, pendências, comanda e timeline sem IDs técnicos                                 | parcial |
| A11Y-001 | WCAG 2.2 AA nos fluxos críticos                  | `WEB/QA`    |  13 | `UX-001`                          | teclado, foco, leitores, contraste, modal e mensagens testados em login, agenda e atendimento                      | parcial |
| REP-001  | Camada semântica de relatórios                   | `FIN/PLAT`  |  13 | `BILL-001`, `INV-001`             | fonte, período, timezone e versão declarados; totais reconciliam com ledger                                        | parcial |
| REP-002  | Exportação e agendamento pelo worker             | `PLAT/OPS`  |  13 | `REP-001`, `PLAT-002`             | CSV/XLSX/PDF, RBAC, auditoria, retry e entrega única com arquivo persistido                                        | parcial |
| MKT-001  | Consentimento e preferências                     | `PLAT/PROD` |   8 | `SEC-002`                         | opt-in/out por finalidade/canal bloqueia envio não autorizado                                                      | parcial |
| MKT-002  | Comunicação real com retry e auditoria           | `PLAT/PROD` |  13 | `MKT-001`, `PLAT-002`             | email/SMS/WhatsApp provider, retry, bounce, resposta e histórico vinculados à entidade                             | parcial |
| INT-001  | API/webhooks públicos e integrações              | `PLAT/SEC`  |  13 | `PLAT-002`, `AUD-012`             | versionamento, scopes, assinatura, replay protection, rate limit e sandbox                                         | parcial |
| MIG-001  | Importação Vetus idempotente                     | `PLAT/QA`   |  13 | `DATA-001`, `BILL-001`, `INV-001` | dry-run, rejeitados, retomada, rollback, identificador externo e reconciliação                                     | parcial |
| PERF-001 | Performance e SLO                                | `QA/OPS`    |  13 | `E2E-006`, `E2E-007`              | p95 leitura <400ms, comando <800ms sem provider, erro <1%, carga k6 reproduzível                                   | aberto  |
| OPS-001  | Backup, restore e Game Day                       | `OPS/QA`    |  13 | `PLAT-003`                        | RPO/RTO medidos, restore validado, failover ensaiado e runbook com evidência real                                  | parcial |
| OBS-001  | Observabilidade e alertas                        | `OPS/PLAT`  |   8 | `AUD-008`                         | health/readiness, logs correlacionados, métricas de outbox, billing, fila, erro e fallback; alertas testados       | parcial |
| GATE-001 | Matriz requisito → código → teste → evidência    | `QA/PROD`   |   8 | `AUD-013`                         | cada nota possui prova comportamental; arquivo/tela isolados não aprovam domínio                                   | aberto  |
| GATE-002 | Coleção crítica no CI                            | `QA/OPS`    |   8 | `GATE-001`, `AUD-014`             | test, critical, E2E SPA, visual e segurança executam com política explícita de falha                               | parcial |
| PAR-001  | Verificação Vetus dos 11 domínios                | `PROD/QA`   |  21 | todos os domínios anteriores      | 10 critérios por domínio, E2E PostgreSQL, homologação assinada e `11/11`                                           | aberto  |

## 7. Jornadas E2E obrigatórias

| ID      | Jornada                            | Prova mínima                                                                          | Dependências                       |
| ------- | ---------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------- |
| E2E-001 | Atendimento agendado até alta      | login, agenda, check-in, fila, prontuário, receita, anexo, alta, PostgreSQL e restart | `CLIN-002`, `SCH-002`, `FILE-001`  |
| E2E-002 | Atendimento avulso até recebimento | cadastro, vínculo, atendimento, comanda, estoque, caixa e pagamento                   | `DATA-001`, `BILL-002`, `CASH-001` |
| E2E-003 | Dois tenants                       | login A/B, entidades homônimas e tentativas cruzadas de leitura/escrita               | `SEC-001`, `SEC-002`               |
| E2E-004 | Agenda concorrente                 | duas reservas simultâneas, bloqueio, recorrência e no-show                            | `SCH-001`, `SCH-002`               |
| E2E-005 | Exame completo                     | pedido, coleta, upload, scanner, resultado, laudo, assinatura e restart               | `LAB-001`, `FILE-001`              |
| E2E-006 | Consulta até recebimento           | comanda, ledger, estoque, caixa, PIX/cartão, estorno e auditoria                      | `BILL-002`, `PAY-001`              |
| E2E-007 | Internação até alta                | leito, evolução 24h, consumo, diária, transferência, alta e caixa                     | `INP-001`, `INV-001`, `CASH-001`   |
| E2E-008 | Fiscal e comunicação               | NFSe, rejeição/cancelamento, consentimento, envio, retry e auditoria                  | `FISC-001`, `MKT-002`              |

Política: PostgreSQL real, `retries=0`, nenhum `skip`, nenhum atalho por API para substituir uma ação de usuário, captura de artefatos e execução repetida para comprovar ausência de flake.

## 8. Matriz de rastreabilidade do relatório

| Item do relatório                  | Backlog responsável                          | Evidência para marcar verificado                                  |
| ---------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| Governança/consistência documental | `GATE-001`, `DOC-001`                        | README, ADRs sem conflito, matriz de decisão e revisão de release |
| Rastreabilidade de requisitos      | `GATE-001`                                   | requisito, código, teste, artefato e aceite vinculados            |
| Arquitetura/modularidade           | `ARCH-001`, `PLAT-001`                       | boundaries, dependências e testes sem regressão                   |
| Persistência/integridade           | `PLAT-001`, `PLAT-003`, `BILL-002`           | rollback, FK, restart, falha intermediária e ausência de fallback |
| Tenant/RBAC/RLS                    | `SEC-001`, `SEC-002`, `API-001`              | role real, teste A/B, autorização e audit trail                   |
| API/OpenAPI                        | `API-001`, `AUD-007`                         | validação contrato-runtime e clientes/tests alinhados             |
| Auth/sessão/MFA                    | `AUD-010`, `AUD-011`, `AUD-012`              | cookies, CSRF, rotação, MFA multi-instância e rate limit          |
| UX/IA                              | `UX-001`, `UX-002`                           | jornadas sem CTA inativo, sem cenografia e com estados explícitos |
| Acessibilidade                     | `A11Y-001`                                   | auditoria automatizada e manual nos fluxos críticos               |
| Proprietários/pacientes            | `DATA-001`                                   | vínculo, merge, troca, inativação e isolamento persistentes       |
| Agendamento                        | `SCH-001`, `SCH-002`                         | restart, recorrência, disponibilidade e concorrência              |
| Fila/handoff                       | `QUEUE-001`                                  | SLA, transferência e histórico auditados                          |
| Atendimento/prontuário             | `CLIN-001`, `CLIN-002`, `UX-002`             | comando atômico, read-only, conflito e reabertura auditada        |
| Prescrição/alta                    | `RX-001`, `CLIN-002`                         | documento versionado, assinatura, alta e histórico                |
| Laboratório                        | `AUD-002`, `LAB-001`, `LAB-002`, `E2E-005`   | persistência, estados, provider, upload e restart                 |
| Internação/cirurgia                | `INP-001`, `SUR-001`, `E2E-007`              | 24h, leito, consumo, cirurgia, alta e caixa                       |
| Preventivo/vacinas                 | `PREV-001`, `MKT-001`                        | protocolo, execução, lote e lembrete consentido                   |
| PDV                                | `AUD-004`, `E2E-006`                         | UoW, rollback, concorrência e reconciliação                       |
| Billing/recebíveis                 | `AUD-001`, `AUD-007`, `BILL-001`, `BILL-002` | evento com conta, ledger único e saldo reconciliado               |
| Estoque                            | `INV-001`, `INV-002`                         | lote, FEFO, reserva, consumo, devolução e compra                  |
| Caixa/PIX/cartão                   | `AUD-003`, `CASH-001`, `PAY-001`             | ownership, webhook, estorno, conciliação e caixa                  |
| Fiscal/NFS-e                       | `FISC-001`, `E2E-008`                        | provider sandbox/produção, rejeição, cancelamento e XML/PDF       |
| Compras/transferências             | `INV-002`                                    | NF, lote, transferência, parcial e financeiro                     |
| RH/comissões                       | `HR-001`, `COMM-001`                         | persistência, agenda, cálculo, estorno e pagamento                |
| Relatórios/exportações             | `REP-001`, `REP-002`                         | total reconciliado, worker, arquivo, RBAC e retry                 |
| Marketing/comunicações             | `MKT-001`, `MKT-002`, `E2E-008`              | consentimento, provider, retry, bounce e auditoria                |
| Webhooks/importações               | `PLAT-002`, `INT-001`, `MIG-001`             | assinatura, idempotência, replay, dry-run e reconciliação         |
| Testes/CI                          | `AUD-005`, `AUD-013`, `AUD-014`, `GATE-002`  | todos os gates verdes e nenhum skip crítico                       |
| Segurança da aplicação             | `AUD-003`, `AUD-010` a `AUD-012`, `FILE-001` | threat model, testes negativos, headers e secrets                 |
| Dependências                       | `AUD-006`                                    | auditoria de produção sem critical/high                           |
| Observabilidade/runtime            | `OBS-001`, `PLAT-003`                        | métricas, logs, health, alertas e ausência de fallback            |
| Deploy/DR                          | `OPS-001`, `GATE-002`                        | restore, RPO/RTO, failover, Helm, Compose e runbook               |
| Performance                        | `PERF-001`                                   | carga reproduzível, p95, erro e saturação observados              |
| Paridade Vetus                     | `PAR-001`                                    | 11 domínios, 10 critérios por domínio e homologação assinada      |

## 9. Gates de aceite do backlog

### G0 — integridade

- `AUD-001` a `AUD-009` verificados;
- `pnpm test`, `pnpm test:coverage` e `pnpm test:critical` passam;
- nenhuma operação crítica dispara persistência sem `await`;
- auditoria de produção sem vulnerabilidade `critical/high`;
- falha de schema obrigatório impede startup.

### G1 — segurança e dados

- evidência histórica para `AUD-010` a `AUD-014`, `PLAT-001` a `PLAT-003`, `SEC-001/002` e `API-001`; consultar a Quality Bar atual antes de qualquer promoção;
- RLS 100%, dois tenants, cookies/CSP/rate limit e contratos alinhados;
- cobertura de routes/bootstrap/repositories críticos sem exclusão não justificada.

### G2 — clínica

- `E2E-001` a `E2E-005` verdes;
- prontuário, anexos, receita, laboratório e alta sobrevivem a restart;
- nenhum atendimento encerrado é alterado sem reabertura auditada.

### G3 — ERP

- `E2E-006` e `E2E-007` verdes;
- ledger, caixa, estoque, comanda, pagamento e auditoria reconciliam;
- falha, retry e concorrência não criam efeito parcial ou duplicado.

### G4 — operação e integrações

- `E2E-008`, `FISC-001`, `REP-*`, `MKT-*`, `INT-*`, `MIG-001`, `OPS-001` e `PERF-001` verificados;
- providers reais/sandbox documentados, worker entrega arquivos e restore é comprovado.

### G5 — homologação

- todos os comandos de [CI_GATES.md](CI_GATES.md) passam;
- 20 execuções críticas sem flake;
- WCAG, performance, backup/restore, Game Day e segurança aprovados;
- `pnpm vetus:parity` retorna `11/11` e `pnpm vetus:clinical-parity` retorna `3/3`;
- aceite formal de produto, veterinário responsável, financeiro, segurança e operação.

## 10. Política de atualização

Ao concluir qualquer item, registrar no diário de execução:

- status anterior e novo;
- PR/commit e arquivos alterados;
- teste RED, testes GREEN e comandos completos;
- evidência de UI/API/DB/restart quando aplicável;
- risco residual e dependências desbloqueadas;
- impacto na nota do relatório;
- atualização deste backlog e da documentação de fonte de verdade.

Uma mudança de escopo precisa de decisão de produto. Uma vulnerabilidade P0 ou divergência financeira impede a promoção de novas entregas do mesmo agregado.

## 11. Atualização de execução — 2026-08-07 (rodada inicial)

Os números desta seção preservam a evidência da rodada inicial. A seção 12 contém a atualização complementar e os contadores finais desta execução.

### 11.1 Evidências registradas

| Frente                 | Resultado                                                                                                                                                                | Referência operacional                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| P0 `AUD-001`–`AUD-012` | evidência histórica verificada; não é status de promoção atual                                                                                                           | código, testes API/worker, cobertura e gates completos na fotografia documentada                                                            |
| Cobertura              | 106 arquivos, 1.384 testes; 87,28% statements/lines, 80,04% branches, 90,25% funções                                                                                     | `pnpm test:coverage`                                                                                                                        |
| PostgreSQL             | 230/230 testes; migrações `0000`–`0091`; 154 tabelas, 43 enums, 391 FKs                                                                                                  | `pnpm test:critical`                                                                                                                        |
| Runtime DB             | 1/1 após restart, rollback e idempotência; procurement e folgas em modo database                                                                                         | teste canônico compilado da API                                                                                                             |
| Dois tenants           | 1/1 com login A/B, entidades homônimas, outbox e anexo isolados                                                                                                          | `tenant-isolation-db.spec.ts`                                                                                                               |
| API e worker           | 248/248 e 31/31                                                                                                                                                          | testes compilados dos pacotes                                                                                                               |
| Browser                | 37/37 Chromium, sem `skip` e sem retry; inclui dois tenants PostgreSQL e fluxo clínico crítico                                                                           | `playwright-spa.config.ts`                                                                                                                  |
| Contratos e isolamento | OpenAPI 303 paths, 39 tags e 346 schemas; RLS 134/134                                                                                                                    | `validate:openapi` e `validate:rls`                                                                                                         |
| Dependências           | 0 critical/high/moderate                                                                                                                                                 | `security:enterprise`                                                                                                                       |
| Agenda                 | repositórios tenant-aware, SQL e in-memory; exclusões PostgreSQL para profissional/paciente/recurso e conflitos 409                                                      | migração `0090`, `apps/api/src/repositories/*agenda-config*` e testes de scheduling                                                         |
| Procurement            | compra draft/approve/partial/full receive, lotes, FEFO, transferências e payable vinculado                                                                               | migrações `0085`/`0089`, `inventory.test.ts`, API route test                                                                                |
| RH/folgas              | CRUD PostgreSQL, cancelamento, advisory lock e exclusão contra sobreposição                                                                                              | migração `0088`, testes de staff/scheduling                                                                                                 |
| Comissões              | método de pagamento obrigatório, payable criado/vinculado e liquidação ordenada                                                                                          | migração `0089`, `commissions.test.ts`, API route test                                                                                      |
| Preventivos            | protocolo, lote, próxima dose, execução/reagendamento e catálogo SPA/API                                                                                                 | migração `0091`, `server.test.ts`, testes de página                                                                                         |
| Prontuário             | fila de persistência recuperável e prevenção de corrida na criação lazy do registro                                                                                      | `medical-records.test.ts`, E2E clínico 37/37                                                                                                |
| Acessibilidade modal   | Escape, foco inicial/restauração, trap e nome acessível                                                                                                                  | `DsModal.test.ts`, typecheck do design system                                                                                               |
| Relatórios             | JSON/CSV/XLSX/PDF, artefato persistido, delivery fail-closed e retry vinculado ao export                                                                                 | migrações `0084`/`0087`, módulo/API/worker                                                                                                  |
| Restore drill          | checksums, globals, dump, storage e diff vazio; perfis mínimo e representativo; representativo com 176 tabelas, 3 arquivos e 19 assertions após `SET ROLE restore_probe` | `ops:restore:drill:fixture` e `ops:restore:drill:fixture:representative`, evidência em `/tmp/cvg-his-v2-restore-representative-rls-final-2` |

### 11.2 Pendências que mantêm O1/G1 condicionais

- o runtime PostgreSQL canônico já foi exercitado com IDs UUID; ainda é necessário ampliar a prova para os agregados e consumidores restantes;
- `PLAT-001/002`, `SCH-001`, `AUD-013` e `AUD-014` têm evidência parcial, não conclusão plena, apesar do teste canônico e do E2E de dois tenants já passarem;
- providers reais de pagamento, NFS-e, laboratório, e-mail, SMS, WhatsApp e Google Calendar ainda precisam de sandbox/homologação;
- compras/transferências e comissões já têm vínculo com contas a pagar, mas ainda não têm UoW única cross-domain com NF/caixa; reserva/devolução FEFO, caixa completo, upload com antivírus, delivery externo de relatórios, lembretes consentidos, DR de alvo real, performance, WCAG e paridade Vetus continuam no backlog.

### 11.3 Decisão de promoção

O0 técnico pode ser encerrado para os itens `AUD-001`–`AUD-012`. O núcleo de O1 está comprovado; agenda concorrente, procurement, comissões, preventivos, prontuário resiliente, exportações e restore drill local avançaram, mas O1/G1 só pode ser certificado quando a matriz de todos os agregados, consumidores, providers e DR alvo estiver verde. O produto permanece em desenvolvimento/homologação controlada; nenhum item parcial libera automaticamente seus dependentes e não há autorização de go-live crítico antes de G1–G5.

## 12. Rodada complementar de execução — 2026-08-07

### 12.1 Implementações aplicadas

- envelope transacional global para mutações HTTP tenant-aware, com `Idempotency-Key` obrigatório em produção-like, hash de payload, auditoria aguardada e replay da resposta HTTP completa sem repetir a mutação;
- parser de body com cache por request, limite de 1 MiB para comandos comuns e 32 MiB para anexos, sem duplicar o conteúdo binário no registro de idempotência;
- migrations `0092`–`0096`: timezone/validade de agenda, pipeline de segurança de anexos, assinatura de prescrições, auditoria/merge de pacientes e importações laboratoriais duráveis;
- armazenamento S3/MinIO privado com chave tenant-scoped e assinatura SigV4, URL curta HMAC para download autorizado e auditoria do download;
- adaptador ClamAV `INSTREAM` fail-closed, configuração por Secret e readiness de produção para scanner/storage externos;
- prescrições com duração, revisões/snapshots imutáveis, assinatura vinculada à versão e documento renderizado com hash/status de assinatura;
- alteração/exclusão de vínculos, merge de pacientes com regras de primary/tenant e evento auditável, e reabertura auditada de atendimento encerrado;
- importação de resultados laboratoriais com correlação durável, deduplicação tenant-scoped, tentativa/erro persistidos e retry explícito;
- roles PostgreSQL distintas para API/worker, sem `SUPERUSER`/`BYPASSRLS`, com auditoria append-only e injeção de credenciais por Secret no chart Helm.

### 12.2 Evidências desta rodada

| Frente                   | Resultado atual                                                                      | Evidência                                                          |
| ------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| API completa             | 252/252, 0 falhas                                                                    | `pnpm --filter @cvg-his-v2/api test`                               |
| Anexos                   | 11/11                                                                                | módulo de anexos: serviço, S3 compatível e protocolo ClamAV        |
| Prescrições              | 30/30                                                                                | módulo de prescrições, incluindo duração/revisões/assinatura       |
| Teste direto do servidor | 31/31                                                                                | replay idempotente da resposta completa e rotas HTTP               |
| Cobertura completa       | 109 arquivos, 1.403 testes; 86,86% statements/lines, 80,06% branches, 90,00% funções | `pnpm test:coverage`                                               |
| PostgreSQL crítico       | 230/230; 157 tabelas, 43 enums, 399 FKs; migrations `0000`–`0096`                    | `pnpm test:critical`                                               |
| Typecheck                | 68/69 projetos selecionados                                                          | `pnpm typecheck`                                                   |
| OpenAPI                  | 314 paths, 39 tags, 358 schemas                                                      | `pnpm validate:openapi`                                            |
| RLS                      | 137/137 tabelas tenant protegidas, 0 exceções                                        | `pnpm validate:rls`                                                |
| Segurança/dependências   | secret scan e auditorias sem critical/high/moderate                                  | `pnpm security:enterprise`, `pnpm audit --prod --audit-level=high` |
| Deploy estático          | Compose validado com secrets efêmeros, roles shell válidos e chart estático válido   | `docker compose config --quiet`, `sh -n`, `pnpm validate:helm`     |

### 12.3 Limites de aceite que permanecem

O código de scanner ClamAV e storage S3/MinIO está implementado e testado por protocolo/adapter, porém ainda depende de homologação com serviços externos reais. O mesmo vale para providers de pagamento, NFS-e, laboratório bidirecional, comunicações e calendário. Permanecem parciais a atomicidade de um episódio clínico composto por múltiplos agregados, reservas/devoluções FEFO, caixa/reconciliação completa, E2E de todas as jornadas, WCAG 2.2 AA, performance, DR/Game Day em alvo real e paridade Vetus. A ausência do binário Helm impede o gate de renderização efetiva nesta máquina; a validação estática passou.

## 13. Rodada final de implementação e verificação — 2026-08-07

### 13.1 Status consolidado do backlog

| Item                                                  | Status nesta rodada                                                                       | Evidência                                                                                                                            | Residual que impede `verificado`                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `AUD-001`–`AUD-012`                                   | evidência histórica verificada; `AUD-013/014` parciais; não substitui a Quality Bar atual | API 263/263, coverage 1.427 testes, critical 230/230, E2E DB e security green na fotografia documentada                              | expansão da cobertura de runtime, matriz completa de providers e CI externo |
| `PLAT-001/002/003`                                    | parcial                                                                                   | UoW, outbox/inbox, fail-closed, roles e restore local                                                                                | UoW cross-domain, consumidores reais e DR alvo                              |
| `CLIN-001/002`, `LAB-001/002`, `FILE-001`             | parcial avançado                                                                          | prontuário 17/17, fluxo legado DB 22/22, SPA DB 37/37, anexos/prescrições/laboratório cobertos                                       | episódio multiagregado, provider de laboratório e storage/scanner reais     |
| `INV-001/002`, `BILL-001/002`, `CASH-001`, `COMM-001` | parcial avançado                                                                          | reservas, compras, ledger, comissões, depósito e E2E legado DB 22/22 persistidos/testados                                            | reconciliação financeira completa, estorno e UoW cross-domain               |
| `FISC-001`                                            | parcial                                                                                   | configuração/persistência tenant-aware e adapter fail-closed                                                                         | sandbox municipal, XML/PDF, rejeição e cancelamento reais                   |
| `MKT-001/002`                                         | parcial                                                                                   | consentimento estrito, settings e retry cobertos                                                                                     | provider de e-mail/SMS/WhatsApp, bounce e opt-out externo                   |
| `MIG-001`                                             | parcial                                                                                   | batch Vetus com dry-run, rejeitados, idempotência, replay, resume e rollback                                                         | reconciliação/paridade assinada: 0/11                                       |
| `SCH-001/002`, `QUEUE-001`, `PREV-001`                | parcial avançado                                                                          | persistência, refresh do read model após mutações, conflitos de agenda, fila, protocolo preventivo e E2E legado DB 22/22 exercitados | recorrência/DST completa, lembrete consentido e restart DB amplo            |
| `REP-001/002`, `OBS-001`, `OPS-001`                   | parcial                                                                                   | artefatos, retry, readiness e restore drill local                                                                                    | delivery externo, alertas, RPO/RTO e Game Day reais                         |
| `A11Y-001`, `PERF-001`                                | aberto para aceite                                                                        | modal/foco testados; não há benchmark conclusivo                                                                                     | auditoria WCAG 2.2 AA e k6/SLO reproduzível                                 |
| `PAR-001`                                             | bloqueado                                                                                 | evidência geral 95/100 e clínica 100/100; 37/37 SPA DB, 22/22 legado DB e 7/7 enterprise                                             | verificado continua 0/11 e 0/3                                              |

### 13.2 Gates do roadmap

| Gate                      | Resultado                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| G0 — integridade          | **passou nos gates locais executados**                                                     |
| G1 — segurança e dados    | **parcial; RLS/OpenAPI/security passaram, mas matriz completa e providers permanecem**     |
| G2 — clínica              | **parcial; SPA DB 37/37 e legado DB 22/22 passam, mas não são as oito jornadas completas** |
| G3 — ERP                  | **parcial; persistência e UoW têm evidência, reconciliação ponta a ponta pendente**        |
| G4 — operação/integrações | **pendente**                                                                               |
| G5 — homologação/paridade | **bloqueado**                                                                              |

### 13.3 Próximos critérios obrigatórios

1. Homologar os providers e sandboxes reais de pagamento, NFS-e, laboratório, storage/scanner e comunicações.
2. Executar as oito jornadas E2E obrigatórias em PostgreSQL, com restart, falha intermediária, dois tenants e `retries=0`.
3. Fechar reconciliação de ledger, caixa, estoque, reservas/devoluções, estornos e contas a pagar em uma matriz cross-domain.
4. Medir performance/SLO, executar auditoria WCAG 2.2 AA, restore/failover/Game Day e renderização Helm real.
5. Obter homologação Vetus assinada, elevando `pnpm vetus:parity` para 11/11 e `pnpm vetus:clinical-parity` para 3/3.

Até esses critérios, os itens parcialmente implementados não liberam seus dependentes e não há autorização de produção crítica.
