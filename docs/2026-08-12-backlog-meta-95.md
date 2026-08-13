# Backlog executável — CVG-HIS-V4 rumo a 95/100

> **Atualização de 13/08/2026:** a nota técnica local de **95/100** foi atingida. Este backlog passa a distinguir `Concluído local` de `Pendente externo`; nenhum requisito de staging, provedor, operação alvo ou sign-off foi marcado como concluído sem evidência. O consolidado verificável está no [relatório de fechamento](2026-08-13-relatorio-fechamento-meta-95.md).

**Data-base:** 12/08/2026  
**Plano:** [plano executivo rumo a 95](2026-08-12-plano-executivo-meta-95.md)  
**Roadmap:** [roadmap 81 → 95](2026-08-12-roadmap-meta-95.md)

## Convenções

- **P0:** bloqueia segurança, integridade ou release;
- **P1:** necessário para atingir 95 e receber aceite enterprise;
- **P2:** melhoria de sustentação que pode seguir após o gate, se não afetar a nota;
- **S/M/L/XL:** até 2, 5, 10 ou mais de 10 dias ideais de trabalho;
- nenhum item é concluído sem comando, log, relatório ou teste reproduzível.

## Consolidado de execução — 13/08/2026

| Bloco | Estado comprovado | Residual real |
|---|---|---|
| SEC-001..006 | **Concluído** — 48 ocorrências → 0; audit e secrets verdes | sustentar o gate continuamente |
| TEN-001..008 | **Concluído local** — inventário 119/119, role restrita, `FORCE RLS`, contexto transacional e matriz negativa | repetir contra a role/credencial definitiva de staging |
| AUTH-001..004 | **Parcial local** — sessão, revogação e controles de runtime testados | OIDC, WebAuthn/MFA, cookies e rotação no ambiente real |
| STG-001..002 | **Pendente externo** | provisionar staging production-like com TLS e credenciais reais |
| E2E-001..006 | **Concluído local** — API 17/17 e SPA 34/34 | repetir jornadas no staging candidato |
| INT-001..005 | **Contratos locais concluídos; smoke externo pendente** | Pagar.me, Resend, Twilio e Google Calendar em sandbox |
| API-001..002 | **Concluído local** — OpenAPI e contract tests verdes | preservar no CI remoto candidato |
| OPS-001..006 | **Concluído local/descartável** para backup, restore e cutover | staging, massa representativa, RPO/RTO e ambiente alvo |
| OPS-007..009 | **Parcial local** | Redis/worker sob falha e soak de 24h |
| OBS-001..003 | **Governança local concluída** | telemetria externa, alertas e game day |
| ARC-001..003 | **ARC-001/002 concluídos** — `server.ts` em 1.160 linhas e opções extraídas | formalizar gate automatizado de complexidade |
| DB-001..002 | **Política/migrations e upgrade local concluídos** | rollback e restore da versão candidata em staging |
| QA-001..003 | **Gates atuais concluídos** — 2.343 testes e cobertura acima de 80% | meta aspiracional 90/90/85 e acessibilidade integral |
| SEC-007..008 | **SBOM, SAST, Gitleaks, audit e Trivy concluídos** | DAST no alvo e automação periódica fora do CI de release |
| DOC-001 | **Concluído na trilha ativa** | revisão contínua de histórico legado |
| VET-001 | **Matriz automatizada 91/100** | UAT Vetus-like assinada e meta funcional 95 |
| REL-001..003 | **RC advisory verde; estrito bloqueado** | CI remoto, restore real, cutover alvo, auditoria independente e sign-off |

## F0 — Segurança de dependências

| ID | Prior. | Item | Owner | Tam. | Aceite | Estado |
|---|---|---|---|---:|---|---|
| SEC-001 | P0 | Reproduzir e classificar as 48 ocorrências | DevSecOps | S | inventário por advisory, severidade, pacote e caminho | Concluído |
| SEC-002 | P0 | Atualizar dependências diretas e transitivas vulneráveis | Tech Lead | M | lockfile sem versão vulnerável conhecida | Concluído |
| SEC-003 | P0 | Alinhar Vitest/Vite/tsx e OpenTelemetry | Tech Lead | M | build, tipos e suites compatíveis | Concluído |
| SEC-004 | P0 | Bloquear advisories a partir de severidade baixa | DevSecOps | S | `security:enterprise` falha com qualquer advisory | Concluído |
| SEC-005 | P0 | Reexecutar secret scan e audit completo | DevSecOps | S | secretlint verde e `audit-level=low` sem vulnerabilidades | Concluído |
| SEC-006 | P0 | Executar regressão completa pós-upgrade | QA | M | build, tipos, lint, testes, cobertura e contratos verdes | Concluído |

## F1 — Multi-tenancy, RLS e autenticação

| ID | Prior. | Item | Owner | Tam. | Aceite | Estado |
|---|---|---|---|---:|---|---|
| TEN-000 | P0 | Fechar RLS de sessões persistidas | Backend/DBA | S | migration aditiva, 98/98 tabelas protegidas e leitura/escrita cross-tenant negadas | Concluído |

| ID | Prior. | Item | Owner | Tam. | Dep. | Critério de aceite |
|---|---|---|---|---:|---|---|
| TEN-001 | P0 | Gerar inventário canônico de tabelas tenant e exceções | Backend/DBA | M | — | 100% das tabelas classificadas; exceções justificadas e revisadas |
| TEN-002 | P0 | Criar role PostgreSQL exclusiva da aplicação | DBA/SRE | M | TEN-001 | sem `SUPERUSER`, `BYPASSRLS`, `CREATEDB`, `CREATEROLE` ou ownership |
| TEN-003 | P0 | Separar role de migrations da role de runtime | DBA/SRE | M | TEN-002 | migrations usam owner dedicado; API/worker usam role restrita |
| TEN-004 | P0 | Aplicar `FORCE ROW LEVEL SECURITY` onde cabível | Backend/DBA | L | TEN-001/003 | owner/runtime não contornam políticas nas tabelas tenant |
| TEN-005 | P0 | Padronizar contexto `account_id`/`unit_id` por transação | Backend | L | TEN-003 | contexto definido com `SET LOCAL` e sempre limpo ao fim da transação |
| TEN-006 | P0 | Testar reuso de pool sem vazamento de tenant | Backend/QA | M | TEN-005 | alternância concorrente de tenants não revela dados |
| TEN-007 | P0 | Criar matriz negativa cross-tenant por domínio | QA/Backend | XL | TEN-004/005 | SELECT/INSERT/UPDATE/DELETE indevidos falham em todos os domínios P0/P1 |
| TEN-008 | P0 | Cobrir worker, relatórios e jobs assíncronos | Backend/QA | L | TEN-005/007 | jobs respeitam tenant e não processam dados de outra conta |
| TEN-009 | P1 | Endurecer escopo por unidade | Backend/Produto | L | TEN-007 | matriz de unidade aprovada e testada para perfis críticos |
| AUTH-001 | P0 | Smoke real de sessão e revogação | Backend/QA | M | staging | login, refresh, logout, revoke sibling e expiração verdes |
| AUTH-002 | P0 | Smoke OIDC com state/nonce e callback | Backend/QA | M | staging/IdP | replay/tamper bloqueados e fluxo válido concluído |
| AUTH-003 | P0 | Smoke WebAuthn/MFA com dispositivo real | Backend/QA | L | staging/TLS | setup, assert, recovery, expiração e revogação comprovados |
| AUTH-004 | P1 | Revisar cookies, CSRF e rotação de segredos | Segurança | M | AUTH-001 | cookies Secure/HttpOnly/SameSite, CSRF e rotação evidenciados |

## F2 — Staging, E2E e integrações

| ID | Prior. | Item | Owner | Tam. | Dep. | Critério de aceite |
|---|---|---|---|---:|---|---|
| STG-001 | P0 | Provisionar staging production-like | SRE | L | TEN-003 | Postgres/Redis/API/worker/SPA/proxy/TLS healthy |
| STG-002 | P0 | Bloquear e observar fallbacks locais | SRE/QA | M | STG-001 | startup falha com provider ausente; logs mostram somente adapters reais |
| E2E-001 | P0 | Jornada login → recepção → agenda | QA/Frontend | L | STG-001/AUTH-001 | desktop/mobile verdes com dados isolados |
| E2E-002 | P0 | Jornada tutor/paciente → triagem → atendimento → alta | QA/Produto | L | E2E-001 | cadeia clínica, auditoria e vínculos preservados |
| E2E-003 | P0 | Jornada estoque → comanda → faturamento → caixa | QA/Produto | L | STG-001 | estoque e razão financeiro reconciliados |
| E2E-004 | P0 | Jornada internação/laboratório/prescrição | QA/Produto | L | STG-001 | status, resultados, assinatura e billing coerentes |
| E2E-005 | P1 | Jornada relatórios e exportação agendada | QA | M | STG-001 | execução, exportação, entrega, retry e auditoria verdes |
| E2E-006 | P0 | E2E negativo de RBAC e tenant | QA/Segurança | L | TEN-007/STG-001 | usuário sem permissão/tenant recebe 403/404 sem vazamento |
| INT-001 | P0 | Smoke Pagar.me/PIX/cartão em sandbox | Backend/QA | L | STG-001 | intent, confirmação, webhook, idempotência e reconciliação |
| INT-002 | P0 | Smoke Resend | Backend/QA | M | STG-001 | entrega, rejeição, retry e provider ID correlacionado |
| INT-003 | P0 | Smoke Twilio | Backend/QA | M | STG-001 | envio, callback, erro, timeout e rate limit |
| INT-004 | P0 | Smoke Google Calendar | Backend/QA | M | STG-001 | create/update/cancel e conflito reconciliados |
| INT-005 | P0 | Testar webhooks hostis e duplicados | Segurança/QA | L | INT-001/003 | assinatura inválida bloqueada; replay/duplicata idempotentes |
| API-001 | P1 | Medir paridade OpenAPI ↔ runtime | Backend/QA | L | STG-001 | 100% das rotas críticas com status/schema compatíveis |
| API-002 | P1 | Contract tests de consumidores críticos | Backend/Frontend | L | API-001 | SPA e worker falham CI quando contrato incompatível é introduzido |

## F3 — Operação, continuidade e observabilidade

| ID | Prior. | Item | Owner | Tam. | Dep. | Critério de aceite |
|---|---|---|---|---:|---|---|
| OPS-001 | P0 | Executar backup completo em staging | SRE/DBA | M | STG-001 | banco, storage, metadata, manifest e checksums gerados |
| OPS-002 | P0 | Restore drill descartável | SRE/DBA | M | OPS-001 | restore íntegro e relatório automático verde |
| OPS-003 | P0 | Restore drill com massa representativa | SRE/QA | L | OPS-002 | contagens, FKs, hashes e jornadas pós-restore validadas |
| OPS-004 | P0 | Definir e medir RPO/RTO | Operações/SRE | M | OPS-003 | metas aprovadas e tempos reais registrados |
| OPS-005 | P0 | Rehearsal completo de cutover | SRE/QA | L | OPS-003 | runbook executado sem passo implícito; health e smoke verdes |
| OPS-006 | P0 | Rehearsal de rollback | SRE/QA | L | OPS-005 | rollback após migration/proxy restaura serviço e dados |
| OPS-007 | P0 | Validar Redis compartilhado e indisponibilidade | SRE/Backend | L | STG-001 | rate limits/estado distribuído coerentes; falha observável e segura |
| OPS-008 | P0 | Soak de API/worker por 24h | SRE/QA | L | OPS-007 | sem crash, leak, perda ou duplicação; shutdown limpo |
| OPS-009 | P1 | Testar retry, idempotência e DLQ/reprocessamento | Backend/QA | L | OPS-008 | falhas transitórias e poison messages não causam duplicação |
| OBS-001 | P0 | Conectar logs, traces e métricas externos | SRE | M | STG-001 | request/trace ID correlaciona SPA/API/worker/provider |
| OBS-002 | P1 | Configurar alertas de SLO/burn rate | SRE/Operações | M | OBS-001 | alertas disparam e apontam runbook correto |
| OBS-003 | P1 | Executar game day | SRE/QA | L | OBS-002 | DB/Redis/provider/worker failures detectadas e recuperadas |

## F4 — Arquitetura, qualidade, produto e release

| ID | Prior. | Item | Owner | Tam. | Dep. | Critério de aceite |
|---|---|---|---|---:|---|---|
| ARC-001 | P1 | Mapear handlers restantes de `server.ts` | Tech Lead | S | — | mapa por domínio, dependências e characterization tests |
| ARC-002 | P1 | Extrair dispatch por domínio | Backend | XL | ARC-001 | `server.ts` ≤1.200 linhas; handlers focados e sem drift de rota |
| ARC-003 | P1 | Adicionar gate de tamanho/complexidade | Tech Lead | M | ARC-002 | arquivos novos ≤800 linhas; funções críticas ≤50 linhas ou exceção revisada |
| DB-001 | P0 | Consolidar política única de migrations | DBA/Tech Lead | L | TEN-003 | código, CI, deploy e docs usam somente `packages/db` |
| DB-002 | P1 | Ensaiar upgrade e rollback de schema | DBA/QA | L | DB-001/OPS-003 | upgrade de versão anterior e rollback documentado/reproduzido |
| QA-001 | P1 | Elevar cobertura global | QA/Engenharia | XL | — | ≥90% statements/lines/functions e ≥85% branches |
| QA-002 | P1 | Eliminar skips e flakes não justificados | QA | M | QA-001 | zero skip/flaky sem issue, owner e prazo |
| QA-003 | P1 | Adicionar acessibilidade às jornadas P0/P1 | Frontend/QA | L | E2E-001..005 | axe/teclado/foco/labels sem violação crítica |
| SEC-007 | P0 | Gerar SBOM e executar SAST/DAST/container scan | DevSecOps | L | STG-001 | zero crítico/alto; demais com SLA e risco aceito formalmente |
| SEC-008 | P1 | Automatizar audit diário e atualização segura | DevSecOps | M | SEC-004 | PR automático, frozen lockfile, gate e SLA por severidade |
| DOC-001 | P1 | Reconciliar fontes vivas e arquivar instruções antigas | Docs/Tech Lead | L | DB-001/ARC-002 | links/IDs válidos e nenhuma orientação operacional conflitante |
| VET-001 | P1 | Executar UAT Vetus-like por rotina | Produto/QA | XL | E2E/OPS | matriz assinada, nenhum gap crítico e nota de paridade ≥95 |
| REL-001 | P0 | Executar CI remoto e `rc:evidence:strict` | Release Manager | M | todos P0/P1 | pacote de evidência completo e reexecutável |
| REL-002 | P0 | Auditoria final independente | Segurança/Arquitetura/QA | L | REL-001 | nota ≥95, zero vulnerabilidade e zero P0/P1 aberto |
| REL-003 | P0 | Sign-off e decisão go/no-go | Comitê de release | S | REL-002 | Engenharia, Segurança, QA, Operações e Produto aprovam |

## SLAs de vulnerabilidade

| Severidade | Bloqueia release | Prazo máximo de triagem | Prazo máximo de correção |
|---|---|---:|---:|
| Crítica | sim | 4 horas | 24 horas |
| Alta | sim | 1 dia útil | 3 dias úteis |
| Moderada | sim no gate enterprise | 2 dias úteis | 10 dias corridos |
| Baixa | sim no gate enterprise | 5 dias úteis | próximo ciclo, antes do release |

## Definition of Done

Um item só pode ser marcado concluído quando:

1. código/configuração e testes estão revisados;
2. critérios negativos e caminhos de erro foram exercitados;
3. build, typecheck, lint e suites afetadas passam;
4. segurança e observabilidade foram avaliadas quando aplicável;
5. evidência está vinculada ao item;
6. documentação viva foi atualizada sem duplicação;
7. nenhum workaround reduz o gate ou introduz fallback de produção.

## Ordem de puxada

1. sustentar SEC-004 a SEC-006 como gates contínuos;
2. executar TEN-001 a TEN-008 e AUTH-001 a AUTH-004;
3. executar STG-001/002 e E2E/INT/API;
4. executar OPS/OBS;
5. executar ARC/DB/QA/SEC-007/008/DOC/VET;
6. executar REL-001 a REL-003.

O backlog somente alcança o objetivo quando todos os P0 e P1 estiverem concluídos e a auditoria REL-002 confirmar média igual ou superior a 95/100.
