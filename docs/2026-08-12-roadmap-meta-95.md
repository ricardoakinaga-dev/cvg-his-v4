# Roadmap executivo — 81 → 95/100

> **Status em 13/08/2026:** **95/100 técnico local atingido**; readiness 97/100. F1 foi concluída no ambiente local production-like; F2, F3 e F4 tiveram seus gates locais concluídos. As parcelas que exigem sistemas externos continuam abertas e formam o caminho para `GO` produtivo, não um motivo para falsificar a nota local. Consulte o [relatório de fechamento](2026-08-13-relatorio-fechamento-meta-95.md).

**Data-base:** 12/08/2026  
**Horizonte sugerido:** 13/08/2026 a 09/10/2026  
**Plano-mãe:** [plano executivo rumo a 95](2026-08-12-plano-executivo-meta-95.md)  
**Backlog:** [backlog executável rumo a 95](2026-08-12-backlog-meta-95.md)

## Visão geral

| Fase | Janela sugerida | Nota de entrada | Meta de saída | Tema | Gate de saída |
|---|---|---:|---:|---|---|
| F0 | concluída em 12/08 | 78 | 81 | dependências, RLS de sessões e regressão | audit zero, RLS 98/98 e suítes verdes |
| F1 | 13/08–28/08 | 81 | 85 | RLS, multi-tenancy e identidade | isolamento comprovado com role production-like |
| F2 | 31/08–11/09 | 85 | 89 | staging, E2E e provedores | jornadas e integrações reais verdes |
| F3 | 14/09–25/09 | 89 | 93 | resiliência e operação | restore, cutover, rollback e soak comprovados |
| F4 | 28/09–09/10 | 93 | 95+ | arquitetura, qualidade e aceite | pacote RC estrito e auditoria final |

### Situação executada por fase em 13/08/2026

| Fase | Parte local | Parte externa residual |
|---|---|---|
| F0 | **Concluída** — audit em zero e gates de segurança ativos | monitoramento contínuo de novos advisories |
| F1 | **Concluída** — role restrita, `FORCE RLS`, 119/119 e testes cross-tenant | smoke OIDC/WebAuthn em IdP/dispositivo real |
| F2 | **Concluída localmente** — API E2E 17/17, SPA E2E 34/34 e contratos verdes | staging production-like e quatro provedores em sandbox |
| F3 | **Concluída localmente** — restore descartável e cutover/rehearsal local verdes | restore/cutover no alvo, RPO/RTO aceito e soak de 24h |
| F4 | **Meta técnica concluída** — 95/100, SAST/SBOM/Trivy e RC advisory verdes | CI remoto, UAT assinado e RC estrito com evidências externas |

As datas são uma referência de sequenciamento, não autorização para reduzir escopo. Se um gate falhar, a fase não avança até a evidência ficar verde.

## F0 — Segurança de dependências

**Estado:** concluída nesta rodada.

Entregas:

- 44 advisories únicos / 48 ocorrências classificados;
- 3 críticas, 27 altas, 14 moderadas e 4 baixas eliminadas;
- OpenTelemetry, Vitest, Vite, tsx/esbuild e transitivos vulneráveis atualizados;
- `pnpm audit --audit-level=low` sem vulnerabilidades conhecidas;
- `pnpm security:enterprise` endurecido para bloquear qualquer severidade;
- gap de RLS da tabela `sessions` fechado pela migration 0058 e teste negativo cross-tenant;
- `validate:rls` com 98/98 tabelas protegidas;
- build, typecheck, lint, API, suíte crítica, SPA e integração 1.682/1.682 validados.

Critério de sustentação:

- audit zero em toda execução de CI e antes de qualquer release;
- lockfile versionado e instalação com frozen lockfile na CI;
- novo advisory abre incidente conforme SLA do backlog.

## F1 — Isolamento multi-tenant e autenticação

**Objetivo:** remover o maior risco residual da auditoria.

### Semana 1 — Banco e contexto tenant

- inventariar tabelas tenant e exceções;
- criar role de runtime sem superuser/BYPASSRLS;
- separar owner de migration da role de aplicação;
- aplicar `FORCE ROW LEVEL SECURITY` onde cabível;
- garantir `account_id`/`unit_id` e contexto por transação.

### Semana 2 — Provas negativas e identidade

- criar matriz cross-tenant para leitura, escrita, update e delete;
- validar API, worker e queries diretas sob a role real;
- testar pool/reuso de conexão sem vazamento de contexto;
- executar sessão, revogação, OIDC e WebAuthn/MFA em ambiente production-like.

Gate F1:

- `validate:rls` cobre 100% das tabelas tenant ou exceções aprovadas;
- role da aplicação não possui `SUPERUSER`, `BYPASSRLS` ou ownership das tabelas;
- zero caso cross-tenant positivo em testes negativos;
- contexto não vaza entre conexões/requisições;
- autenticação forte e revogação têm evidência real.

## F2 — Homologação real, E2E e provedores

**Objetivo:** substituir confiança em mocks por prova externa controlada.

### Semana 3 — Staging e jornadas críticas

- provisionar staging com PostgreSQL, Redis, API, worker, SPA e proxy/TLS;
- desabilitar todos os fallbacks locais;
- executar login, recepção, agenda, tutor/paciente, atendimento e alta;
- executar estoque, faturamento/caixa, PIX e relatórios;
- validar desktop, mobile, falhas de rede e permissões.

### Semana 4 — Provedores e contratos

- Pagar.me: criação, confirmação, webhook, idempotência e reconciliação;
- Resend: entrega, rejeição, retry e correlação;
- Twilio: envio, erro, callback e limites;
- Google Calendar: criação, atualização, cancelamento e conflito;
- OpenAPI/runtime: cobertura 100% das rotas críticas e contract tests.

Gate F2:

- E2E P0/P1 100% verde em staging;
- zero fallback local observado em logs/configuração;
- quatro provedores com smoke e cenários de falha registrados;
- webhooks autenticados, idempotentes e auditáveis;
- OpenAPI sem drift nas rotas críticas.

## F3 — Continuidade, cutover e observabilidade

**Objetivo:** provar que o sistema pode falhar e ser recuperado de modo previsível.

### Semana 5 — Backup, restore e dados

- gerar backup completo de banco/storage/metadados;
- validar checksums e restaurar em ambiente descartável;
- repetir restore em staging com massa representativa;
- validar contagens, FKs, hashes, objetos e jornadas após restauração;
- medir e aprovar RPO/RTO.

### Semana 6 — Cutover, rollback e soak

- executar rehearsal completo de cutover;
- executar rollback após migration e após troca de proxy;
- validar Redis compartilhado, rate limits e estado distribuído;
- executar soak de 24h da API/worker e testes de graceful shutdown;
- conectar telemetria externa e disparar alertas/game day.

Gate F3:

- restore íntegro e RPO/RTO registrados;
- cutover e rollback reproduzíveis por runbook;
- API/worker sem crash, perda ou duplicação no soak;
- traces, logs, métricas e alertas correlacionados externamente;
- SLOs e error budget exercitados em game day.

## F4 — Arquitetura, qualidade e aceite

**Objetivo:** fechar os pontos que separam uma base funcional de um produto enterprise sustentável.

### Semana 7 — Estrutura e qualidade

- extrair o dispatch restante de `server.ts` por domínio;
- impor limites de arquivo/função e análise de complexidade;
- consolidar a trilha única de migrations e remover instruções conflitantes;
- elevar cobertura para 90/90/85;
- executar SAST, DAST, SBOM e scan de imagens.

### Semana 8 — Paridade e pacote RC

- UAT Vetus-like com operação clínica/administrativa;
- acessibilidade e responsividade das jornadas P0/P1;
- atualizar fontes vivas e arquivar instruções obsoletas;
- executar `rc:evidence:strict`, CI remoto e release rehearsal final;
- realizar auditoria independente e sign-off multidisciplinar.

Gate F4:

- média final ≥95/100;
- zero vulnerabilidade conhecida;
- zero item P0/P1 aberto;
- cobertura e contratos acima das metas;
- pacote RC contém evidências reproduzíveis, não apenas checklists;
- Engenharia, Segurança, QA, Operações e Produto aprovam o release.

## Caminho crítico

```text
role PostgreSQL sem bypass
  → RLS/cross-tenant comprovado
    → staging production-like
      → credenciais sandbox e E2E real
        → backup/restore
          → cutover/rollback
            → soak + telemetria
              → pacote RC estrito
                → auditoria 95+
```

## Métricas semanais

| Métrica | Meta contínua |
|---|---:|
| Vulnerabilidades conhecidas | 0 |
| Gates estáticos verdes | 100% |
| Testes P0/P1 verdes | 100% |
| Casos cross-tenant indevidamente permitidos | 0 |
| Flaky tests não triados | 0 |
| Cobertura | tendência crescente até 90/90/85 |
| RPO/RTO | dentro da meta aprovada |
| Erros não correlacionados por trace/request ID | 0 |
| Itens P0/P1 sem owner ou prazo | 0 |

## Regra de replanejamento

- vulnerabilidade crítica/alta nova: interromper promoção e remediar imediatamente;
- falha de isolamento tenant: interromper a fase e tratar como incidente crítico;
- falha de restore/rollback: bloquear cutover;
- falha E2E intermitente: não ocultar com retry indiscriminado; isolar causa;
- dependência externa indisponível: registrar evidência e repetir no ambiente, sem substituir o aceite por mock.
