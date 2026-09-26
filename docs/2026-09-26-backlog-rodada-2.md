---
document_status: current
document_kind: backlog
effective_date: 2026-09-26
owner: Liderança técnica CVG-HIS
review_cycle: on-task-completion-or-blocker-change
---

# Backlog — rodada 2

[Auditoria](2026-09-26-auditoria-completa-sistema.md) ·
[Plano executivo](2026-09-26-plano-executivo-rodada-2.md) ·
[Roadmap](2026-09-26-roadmap-rodada-2.md)

**Data:** 26/09/2026 · **Itens:** 34 (11 P0, 15 P1, 8 P2)

**Legenda:**
- **Prioridade:** **P0** bloqueia produção · **P1** necessário para operar com segurança · **P2** melhoria contínua.
- **Esforço:** **P** até 2 dias · **M** até 1 semana · **G** mais de 1 semana.
- **Onda:** ver o [roadmap](2026-09-26-roadmap-rodada-2.md).

Um item só é concluído com o critério de aceite verificado **e** um teste de regressão, ou uma evidência de execução quando o item for operacional. Itens que dependem de decisão externa trazem a marca 🧑‍⚖️.

---

## P0 — bloqueiam produção

| ID | Item | Onda | Esf. | Depende | Critério de aceite |
|---|---|---|---|---|---|
| R2-REL-01 | Commitar as correções de 26/09 em branch própria, enviar ao GitHub e obter o CI remoto verde | 0 | P | — | PR aberto; todos os jobs de `ci.yml` verdes no SHA do PR |
| R2-REL-02 | Separar as 667 alterações antigas da árvore: commitar o que é produto e descartar ou arquivar evidências geradas (`.agent/evidence` r1–r21) | 0 | M | REL-01 | `git status` limpo após o merge; nenhum artefato gerado versionado |
| R2-ARC-01 | Mitigação A1: API com `replicaCount: 1` em `values.prod.yaml` e guard no startup que recusa mais de 1 réplica enquanto houver cache por processo | 0 | P | — | Teste do chart falha com 3 réplicas; runbook explica o limite |
| R2-ARC-02 | Correção A1: `getOrThrow(accountId, id)` com escopo obrigatório e *read-through* (cache miss consulta o repositório) em patients, owners e encounters | 1 | G | ARC-01 | Teste com duas instâncias da API no mesmo banco: criar na instância A e ler na B passa; os 60 pontos de chamada migrados |
| R2-ARC-03 | Invalidação entre réplicas (`LISTEN/NOTIFY` por conta e entidade) ou remoção do cache nas entidades transacionais; depois reavaliar ARC-01 | 1 | G | ARC-02 | Teste de duas instâncias com atualização e inativação; memória por réplica medida com uma conta grande |
| R2-OPS-01 | Configurar Alertmanager com receivers (e-mail/Slack/PagerDuty) e rota por severidade para as 22 regras | 0 | P | — | Alerta sintético disparado e recebido no canal; evidência anexada |
| R2-OPS-02 | Restore real: PostgreSQL gerenciado + S3 em ambiente limpo, com RPO e RTO medidos | 2 | M | OPS-01 | Relatório do drill com tempos, checksum dos anexos e contagem por tabela |
| R2-PAY-01 | Provedor Pix real no dispatcher de tentativas por atendimento (Pagar.me), com webhook de liquidação | 2 | G | REL-01 | Sandbox: criar, pagar, liquidar e conciliar; reenvio não duplica cobrança |
| R2-FIS-01 🧑‍⚖️ | NFS-e: escolher município e provedor. Implementar a assinatura XML e-CNPJ (ABRASF) ou usar um provedor com API key | 2 | G | decisão | Emissão e cancelamento homologados no ambiente de testes da prefeitura |
| R2-LGPD-01 | Executor de eliminação conforme a decisão de 26/09: apagar contatos, marketing e perfil do tutor; reter fiscal, clínico e auditoria com motivo | 1 | M | LGPD-03 | Pedido de exclusão concluído com a lista do que foi apagado e retido; teste de integração no PostgreSQL |
| R2-QA-01 | E2E SPA completo no CI (Chromium + visual) com banco e Redis efêmeros e portas dinâmicas | 1 | M | REL-01, TOOL-01 | Job de CI verde com o relatório Playwright publicado |

## P1 — necessários para operar

| ID | Item | Onda | Esf. | Depende | Critério de aceite |
|---|---|---|---|---|---|
| R2-FIN-01 | Centavos inteiros em `billing`, `cash` e `quotes`, com conversão só na borda da API (A3) | 1 | M | — | Testes de propriedade de soma e arredondamento; reconciliação de caixa sem diferença de centavos |
| R2-FIN-02 | Dia civil no fuso da clínica (configuração por conta, padrão `America/Sao_Paulo`) em relatórios, caixa e "hoje" (A4); revisar `REPORT_DATE_SEMANTICS.md` | 1 | M | — | Venda às 22h local aparece no dia correto no relatório diário e no fechamento |
| R2-FIN-03 | Remover o fallback de cache em `findOpenRegister` (A2) | 0 | P | — | Teste: caixa fechado no banco não aparece como aberto |
| R2-NOT-01 | Lembretes com outbox, agendamento relativo à consulta (ex.: 24h antes), retry e cancelamento quando a consulta é remarcada | 2 | G | — | Lembrete sobrevive a reinício; remarcação cancela o lembrete anterior |
| R2-UX-01 | Mapear códigos de erro da API para mensagens pt-BR no SPA, com fallback genérico; nunca exibir texto técnico (A5) | 1 | M | — | Nenhuma mensagem em inglês nos testes E2E; catálogo de códigos coberto |
| R2-SEC-01 | Política de senha única (12+ caracteres, verificação contra senhas vazadas) e reset forçado dos hashes SHA-256 legados (A6) | 1 | M | — | Criação de usuário com senha fraca recusada; nenhum hash legado após a migração |
| R2-INF-01 | `NetworkPolicy` (API ↔ banco/Redis, worker ↔ banco, ingress → SPA/API) e HPA do worker (A7) | 2 | M | ARC-01 | `helm template` validado; teste de conectividade negada entre pods não autorizados |
| R2-LGPD-02 | Texto da tabela de retenção alinhado à decisão de 26/09 (A8) | 0 | P | — | Pacote de exportação sem a promessa de anonimização automática |
| R2-LGPD-03 🧑‍⚖️ | Validação jurídica: prazo de guarda do prontuário veterinário (20 anos x CFMV), campos retidos por obrigação fiscal e texto ao titular | 0 | P | jurídico | Parecer registrado e prazos configurados |
| R2-CLI-01 | Alergias estruturadas (substância ou classe, reação, gravidade) e produtos com princípio ativo e classe; comparação por classe; bloqueio só para "anafilaxia" | 3 | G | — | Alergia a penicilinas dispara em amoxicilina; migração do texto livre sem perda |
| R2-CLI-02 | Peso obrigatório e visível na prescrição; base de dose por espécie para medicamentos críticos | 3 | G | CLI-01 | Alerta de dose fora da faixa com justificativa |
| R2-QA-02 | Carga e endurance no alvo (perfil de `SLO_AND_LOAD_PROFILE.md`) | 3 | M | ARC-03 | p95 dentro do SLO por 2h sem crescimento de memória |
| R2-UAT-01 🧑‍⚖️ | UAT com recepção, veterinário, enfermagem e financeiro nas jornadas canônicas | 3 | M | ondas 0–2 | Termo de aceite assinado por área |
| R2-UX-02 | Corrigir o menu compacto: `div.app-layout` intercepta o clique em "Recolher menu lateral" (A12) | 0 | P | — | `deleted-sales-report-flow.spec.ts` verde; teste de componente do layout |
| R2-TOOL-01 | Script de E2E sem dependência de `rg` e com portas configuráveis por variável (A9) | 0 | P | — | O script roda num host sem ripgrep e com as portas 5434/6381 ocupadas |

## P2 — melhoria contínua

| ID | Item | Onda | Esf. | Critério de aceite |
|---|---|---|---|---|
| R2-SEC-02 | Timestamp assinado nos webhooks de saída e janela de tolerância documentada (A10) | 3 | P | O receptor de exemplo rejeita uma assinatura com mais de 5 min |
| R2-LGPD-04 | 404 na exportação de titular inexistente (A11) | 0 | P | Teste da rota |
| R2-AUD-01 | `writeAndWait` nas ações de risco alto (login, pagamentos, LGPD, prescrição) | 3 | M | Falha de persistência da auditoria falha a operação |
| R2-DB-01 | `EXPLAIN` das 18 tabelas candidatas sem índice iniciado por `account_id`; criar os que faltarem | 3 | P | Nenhum seq scan nas consultas por conta com volume de teste |
| R2-COD-01 | Quebrar `server.ts` (3.477 linhas) e as cinco páginas Vue acima de 2.800 linhas | 4 | G | Nenhum arquivo acima de 1.500 linhas; orçamento de complexidade reduzido |
| R2-COD-02 | Zerar os 158 avisos de lint, começando por event-bus (44) e SPA (32) | 4 | M | Lint com `--max-warnings 0` no CI |
| R2-UX-03 | Revisar o prontuário reescrito no tema escuro e atualizar o snapshot visual (A13) | 1 | P | `visual-regression.spec.ts:603` verde, com revisão visual registrada |
| R2-DOC-01 | Podar `docs/` (2,4 GB) e `artifacts/` (54 GB) conforme a política de retenção de artefatos | 4 | P | `docs/` abaixo de 50 MB; `artifacts:retention:dry-run` sem pendências |

## Decisões registradas nesta rodada

- **Retenção do cadastro do tutor:** mantido por padrão; eliminação só quando a lei obriga (pedido do titular, LGPD art. 18, VI) — ver [controles](security/PRIVACY_AUTH_AND_PAYMENT_CONTROLS.md).
- **Alergia na prescrição:** alertar e exigir justificativa, sem bloquear (fase 1 entregue); o bloqueio fica restrito a gravidade "anafilaxia" na fase 2 (R2-CLI-01).
