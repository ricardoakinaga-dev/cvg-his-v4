---
document_status: current
document_kind: remediation_roadmap
effective_date: 2026-09-12
owner: Engenharia/Produto/Operações/Segurança
source_audit: docs/2026-09-12-auditoria-repositorio-cvg-his-v4.md
---

# Roadmap de remediação — ERP State of Art / Triplo AAA

## Objetivo e regra de execução

Elevar o CVG-HIS V4 do baseline **69/100 / FAIL** para um candidato verificável com nota global `>=97`, dimensões críticas `>=95`, zero P0 e todos os gates correntes. As ondas são ordenadas por redução de risco e evidência; prazo de calendário só será definido depois de capacidade, owners e ambientes serem confirmados.

Cada marco entrega comportamento observável. Código presente, script existente, arquivo de evidência ou nota isolada não encerram um gate. Uma mudança material invalida a evidência do limite afetado.

## Caminho crítico

```text
M0 baseline/controle
  -> M1 contratos e release fail-closed
  -> M2 dados clínico-financeiros e cobertura crítica
  -> M3 paridade e integrações
  -> M4 UX/a11y e performance
  -> M5 operação, recovery e supply chain no target
  -> M6 recertificação, UAT e decisão independente
```

## Marcos

### M0 — Reconciliar baseline e governança

**Entrega:** auditoria, roadmap, backlog, ExecPlan e controles apontam para o candidato atual; snapshot documental volta a validar sem promover evidência histórica.

**Saída:** `docs:validate` PASS; todos os GAPs têm ID, owner funcional, dependência e prova; drift `.agent/.gauntlet` está preservado e roteado.

### M1 — Fechar contratos públicos e publicação fail-closed

**Entrega:** equivalência bidirecional runtime/OpenAPI nas rotas críticas; deadline/cancelamento propagado; release só publica depois dos gates e do scan de imagens.

**Saída:** known-bad de rota ausente, push prematuro e imagem vulnerável falham deterministicamente; CI local de contrato passa.

### M2 — Provar dados, segurança clínica e cobertura crítica

**Entrega:** PostgreSQL descartável executa RLS A/B, grants, migrations/upgrade, transações, idempotência, concorrência, crash/restart e jornadas clínicas/financeiras; cobertura crítica tem denominador explícito e é gate de CI.

**Saída:** zero skip no perfil crítico; coverage por API, persistência, domínio, SPA e worker; falha real em qualquer shard bloqueia promoção.

### M3 — Fechar paridade de produto e integrações

**Entrega:** as 11 áreas Vetus possuem cenários comportamentais, incluindo laboratório, fiscal, financeiro, marketing, relatórios, acesso/LGPD e migração; providers são homologados em sandbox autorizado.

**Saída:** 11/11 áreas verificadas no mesmo candidato, com reconciliação, erro, retry, replay, auditoria e isolamento tenant onde aplicável.

### M4 — Certificar experiência, acessibilidade e performance

**Entrega:** design system e fluxos prioritários são avaliados na aplicação real em 375/768/1440, light/dark e estados relevantes; k6 e SPA budgets usam perfil aprovado e dados representativos.

**Saída:** zero Critical/High não aceito; Axe + teclado + foco + reflow + leitor de tela/manual; screenshots atuais e crítica independente; SLOs aprovados sem relaxamento oportunista.

### M5 — Operar e recuperar no ambiente-alvo

**Entrega:** imagens por digest com SBOM/provenance/scan, Helm e containers reais; observabilidade com acesso protegido; restore, RPO/RTO, game day, soak e rollback ensaiados.

**Saída:** recuperação medida dentro das metas aprovadas, ausência de duplicidade/perda não aceita, alertas acionáveis e rollback reproduzível.

### M6 — Recertificar e decidir

**Entrega:** checkout limpo e SHA congelado passam todos os gates; Produto, Segurança/DPO, Operações e revisão independente concluem UAT/assurance.

**Saída:** score `>=97`, críticas `>=95`, P0=0, CI verde, evidência íntegra e decisão formal. Qualquer ausência resulta em `BLOCKED / NOT PROVEN`, nunca em aprovação implícita.

## Frentes de trabalho

| Frente | GAPs | Owner proposto | Primeiro artefato | Gate final |
| --- | --- | --- | --- | --- |
| Governança e docs | DOCS-01, GOV-01 | LT/PMO | baseline e ExecPlan reconciliados | docs + state validators |
| API/backend | API-01, DEADLINE-01, MOD-01 | BE/ARQ | mapa runtime/OpenAPI | contrato HTTP + regressão |
| Dados e testes | COVERAGE-01, TEST-01 | DB/QA/BE | denominador crítico | PostgreSQL + coverage CI |
| Segurança | SEC-01, EDGE-01, LOG-01 | SEC/OPS | threat/policy delta | scan + testes negativos |
| Supply chain | CICD-01, TARGET-01 | PLAT/SEC | workflow fail-closed | registry/attestation target |
| Produto/paridade | PARITY-01 | PROD/QA | matriz 11 áreas | 11/11 behavioral PASS |
| UX/design | UX-01 | UX/FE/QA | baseline visual atual | visual/a11y/UAT independente |
| Performance/recovery | EVIDENCE-01, OPS-01 | OPS/SRE/DB | perfil e metas aprovados | k6/restore/game day/soak |

## Dependências humanas e externas

- Produto define fluxos de aceite e participantes de UAT.
- Segurança/DPO decide retenção, minimização, exposição de métricas e aceites LGPD.
- Operações aprova SLO, RPO/RTO, target e janela de drills.
- Owners de providers fornecem sandboxes/credenciais e dados sanitizados.
- Administração do repositório comprova branch protection e required checks.
- Autoridade de release decide publicação/deploy; este roadmap não concede essa autoridade.

## Estratégia de ondas

1. Executar correções locais P0 com testes known-bad e manter arquivos compartilhados sob um integrador.
2. Integrar e submeter cada mudança a crítico fresco que não a implementou.
3. Congelar um SHA somente após P0 local zerado; então gerar evidência remota/target.
4. Repetir o Gauntlet por maior GAP material: construir, verificar, criticar, corrigir e reexecutar.
5. Parar apenas em sucesso comprovado ou em bloqueio externo explicitamente documentado.
