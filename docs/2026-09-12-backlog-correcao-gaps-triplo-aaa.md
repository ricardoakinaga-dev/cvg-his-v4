---
document_status: current
document_kind: remediation_backlog
effective_date: 2026-09-12
owner: PMO/Engenharia
source_audit: docs/2026-09-12-auditoria-repositorio-cvg-his-v4.md
---

# Backlog de correção dos GAPs — Triplo AAA

Este é o recorte executivo derivado da auditoria. O status operacional autoritativo fica em `.agent/backlog.json`; este documento registra escopo, prioridade, dependência e aceite para não criar uma segunda verdade mutável.

## P0 — caminho crítico

| ID | GAP | Entrega | Dependências | Aceite/prova | Owner |
| --- | --- | --- | --- | --- | --- |
| REM-001 | DOCS-01 | Atualizar snapshot e índice documental para o SHA atual, preservando limites. | — | `pnpm docs:validate` PASS e known-bad stale FAIL. | LT/PMO |
| REM-002 | GOV-01 | Reconciliar `.agent` e preservar/recuperar o run Gauntlet legado. | REM-001 | validadores de controle PASS; histórico não reescrito. | LT |
| REM-003 | API-01 | Cobrir sessões, WebAuthn e OIDC no OpenAPI e fechar runtime→OpenAPI. | — | OpenAPI PASS + fixture de rota omitida FAIL. | BE |
| REM-004 | CICD-01 | Escanear antes de publicar quarentena e impedir identidade/artefato de release antes do gate final. | — | sem scan, tag final ou pacote/manifesto consumível pré-gate é rejeitado; GHCR real ainda exige prova target. | PLAT/SEC |
| REM-005 | DEADLINE-01 | Propagar `AbortSignal`/deadline por handler, serviço, DB e provider. | REM-003 | timeout cancela trabalho, não duplica efeito e retorna erro canônico. | BE/ARQ |
| REM-006 | COVERAGE-01 | Publicar denominador e integrar coverage crítica ao CI. | REM-003 | API/persistência/domínio/SPA/worker medidos; abaixo do budget bloqueia. | QA/BE |
| REM-007 | EVIDENCE-01 | Executar PostgreSQL crítico e E2E navegador no mesmo SHA. | REM-003, REM-006 | zero skip ambiental, A/B tenant e jornadas persistidas. | QA/DB |
| REM-008 | PARITY-01 | Converter 11 áreas Vetus em matriz comportamental fechável. | REM-007 | 11/11 com positivo, negativo, permissão, persistência e reconciliação. | PROD/QA |
| REM-009 | OPS-01 | Aprovar perfil/SLO/RPO/RTO e executar k6, restore e game day. | REM-007 | metas aprovadas e observadas no target, com abort/rollback. | OPS/SRE/DB |
| REM-010 | TARGET-01 | Provar containers, Helm, deploy/rollback, branch rules e attestations. | REM-004, REM-009 | evidência remota no SHA/digest e target autorizados. | PLAT/OPS |
| REM-011 | UX-01 | Permitir revisão de baselines herdados e rodar matriz visual, a11y e interação atual do produto real. | REM-007, REM-008 | Pacote SHA-bound; 375/768/1440, estados, light/dark, AT/manual e crítico independente. | UX/FE/QA |
| REM-012 | AAA-GATE | Recertificar e emitir decisão formal. | REM-001–011 | global>=97, críticas>=95, P0=0, autoridade e evidência atual. | Comitê |

## P1 — segurança, operação e manutenção

| ID | GAP | Entrega | Dependências | Aceite/prova | Owner |
| --- | --- | --- | --- | --- | --- |
| REM-013 | SEC-01 | Atualizar Vitest/@vitest/mocker sem regressão. | REM-006 | auditoria sem findings não aceitos e suíte completa PASS. | DX/SEC |
| REM-014 | EDGE-01 | Definir e aplicar política de acesso a `/metrics` e health detalhado. | REM-010 | acesso externo indevido negado; probes permitidas continuam funcionais. | SEC/OPS |
| REM-015 | LOG-01 | Minimizar/pseudonimizar identificadores de brute force e fixar retenção. | — | testes de não vazamento e correlação operacional útil. | SEC/DPO/BE |
| REM-016 | MOD-01/API | Decompor `apps/api/src/server.ts` em slices de composição/roteamento. | REM-003, REM-005 | redução física e acoplamento sem quebra de auth/tenant/transações. | ARQ/BE |
| REM-017 | MOD-01/SPA | Decompor router/tabela de rotas por domínio e carregamento. | REM-011 | aliases, guards, focus/history e chunks preservados. | FE |
| REM-018 | MOD-01/WORKER | Decompor runner por tipo de job e políticas comuns. | REM-009 | retry/lease/fencing/DLQ preservados com testes de processo. | BE/OPS |
| REM-019 | PARITY-LAB | Homologar laboratório e equipamentos. | REM-008 | pedido→coleta→resultado→laudo, erro/replay/reconciliação. | LAB/BE |
| REM-020 | PARITY-FISCAL | Homologar fiscal/NFS-e. | REM-008 | emissão/consulta/cancelamento/rejeição/XML/PDF auditados. | FISCAL/BE |
| REM-021 | PARITY-FIN | Homologar PIX/cartão/split/refund/conciliação. | REM-008 | callbacks, replay, timeout e ledger reconciliados. | FIN/BE |
| REM-022 | PARITY-MKT | Homologar e-mail/SMS/WhatsApp com consentimento. | REM-008 | opt-out, bounce, rate limit, retry e isolamento. | MKT/BE |
| REM-023 | PARITY-REPORT | Certificar relatórios/exportações/agendamentos. | REM-008 | snapshot, filtros UTC, totais, CSV e delivery reconciliados. | REPORTS/BE |
| REM-024 | PARITY-LGPD | Executar DSR, retenção, anonimização e auditoria. | REM-014, REM-015 | destinos/backups/integradores cobertos e DPO aprova. | DPO/SEC |
| REM-025 | PARITY-MIG | Homologar importação Vetus e integrações. | REM-019–024 | checksums, rejeitos, resume, idempotência e rollback. | DATA/PROD |

## P2 — excelência contínua

| ID | GAP | Entrega | Dependências | Aceite/prova | Owner |
| --- | --- | --- | --- | --- | --- |
| REM-026 | DX-01 | Retirar caches incrementais do conjunto rastreado ou torná-los determinísticos. | — | typecheck não altera worktree limpo. | DX |
| REM-027 | TEST-01 | Eliminar diagnósticos jsdom acionáveis e justificar/fechar skips. | REM-006 | suíte sem ruído relevante; skip crítico é zero. | QA/FE |
| REM-028 | OBS | Correlacionar SPA→API→DB/Redis→worker→provider. | REM-009 | trace reproduzível sem PII e alertas acionáveis. | SRE/BE |
| REM-029 | PERF | Otimizar somente após baseline aprovado. | REM-009, REM-011 | budgets por rota/jornada e margem de capacidade observada. | FE/BE/SRE |
| REM-030 | GOV | Revisão mensal de evidência, dependências e hotspots. | REM-012 | freshness, owners, expiração e reabertura automáticas. | PMO/LT |

## Definition of Done comum

Um item só pode ser encerrado quando o comportamento está integrado, o teste de fronteira e o known-bad passam, a regressão proporcional passa, a evidência é atual e íntegra, o crítico independente aplicável não encontra Critical/High aberto e os riscos residuais têm owner. `NOT RUN`, `BLOCKED`, evidência de outro SHA e autoavaliação do implementador não contam como `DONE`.
