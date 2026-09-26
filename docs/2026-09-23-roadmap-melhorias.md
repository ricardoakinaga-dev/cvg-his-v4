---
document_status: supporting
document_kind: improvement-roadmap
effective_date: 2026-09-23
owner: Liderança técnica, Produto, Plataforma, Segurança e Operações CVG-HIS
review_cycle: weekly-or-gate-change
---

# Roadmap de execução — 50 melhorias

[Auditoria](2026-09-23-relatorio-auditoria-repositorio.md) · [Lista](2026-09-23-lista-50-melhorias.md) · [Plano executivo](2026-09-23-plano-executivo-melhorias.md) · [Backlog](2026-09-23-backlog-melhorias.md)

As janelas são **estimativas relativas a D0**, início após definição de capacidade, owners e alvo de teste. Não são promessa de release. Frentes independentes podem preparar trabalho em paralelo; a promoção do candidato segue os gates em ordem. Status e evidência pertencem a `.agent/backlog.json` e aos artefatos candidate-bound, não a esta tabela.

| Onda | Janela indicativa | Melhoria principal | Gate de saída |
| --- | --- | --- | --- |
| **W0 — preservar e identificar** | D0–D5 | M-01–03, M-37, M-39, M-48–49 | Trabalho recuperável; histórias Git reconciliadas; candidato limpo ou bloqueio explicitado; check de backup corrigido. |
| **W1 — persistência e gates locais** | Semanas 1–3 | M-04–08, M-26, M-29–32, M-38 | Banco isolado migrado; API pronta com persistência; suíte integral/coverage e Helm real; falhas restantes registradas. |
| **W2 — CI e release rastreável** | Semanas 2–4 | M-09–10 | CI terminal e artefatos assinados no SHA congelado, com digest/SBOM/scan/attestations verificáveis. |
| **W3 — target, resiliência e paridade** | Semanas 3–8 | M-11–17, M-27–28, M-33–36, M-40 | RLS/worker/recovery/carga e integrações provados no target; 11 áreas avaliadas por jornada, defeitos abertos visíveis. |
| **W4 — experiência e sustentabilidade** | Semanas 4–10 | M-18, M-21–25, M-41–47, M-50 | UAT e acessibilidade avaliadas; hotspots menores; documentos e evidências atuais. |
| **W5 — decisão** | Após G0–G4 | M-19–20 | P0 zerados por prova, Quality Bar reavaliada, reauditoria independente e go/no-go formal. |

## Caminho crítico

```text
Preservação e reconciliação Git (M-01)
  → candidato limpo (M-02)
  → banco isolado + migration 0175 (M-04/M-05)
  → API persistente e testes/coverage (M-06–08)
  → CI exato (M-09) → cadeia OCI (M-10)
  → RLS, worker, restore, carga e jornada (M-11–17)
  → UAT (M-18) → P0/Quality Bar (M-19)
  → go/no-go (M-20)
```

`M-03` é um gate local importante, mas seu check textual corrigido não substitui o ensaio de restore de `M-14`. Trabalho de arquitetura e documentação pode avançar com candidate branches isoladas; cada integração após o freeze exige reavaliar a evidência afetada.

## W0 — preservar e identificar

**Entregas:** inventário das refs e diffs locais, backup verificável antes de operações destrutivas, plano de reconciliação com o remoto reescrito, prevenção de novo blob gerado, runtime Node/pnpm fixado e preflight de configuração. Atualizar matcher e teste do backup para os documentos atuais. Registrar quais evidências pertencem ao HEAD e quais dependem da árvore suja.

**Gate G0:** nenhuma alteração local perdida; história publicável sem blob proibido; identidade de candidato proposta e verificável. Se a resolução depender de ação externa/destrutiva, registrar bloqueio e preparar o resultado revisável antes da decisão.

## W1 — persistência e gates locais

**Entregas:** credenciais geridas por canal seguro, banco descartável com migrations completas, API persistente com `/ready` aprovado, preflight, contratos HTTP revisados, testes da raiz e workspaces, coverage, skips classificados, Helm real e lint semântico. O banco local em uso não é alvo implícito.

**Gate G1:** checkout do candidato executa matriz local obrigatória em exit 0, sem reduzir thresholds nem mascarar dependências. O resultado de falhas é publicado com causa e owner.

## W2 — CI e cadeia de release

**Entregas:** checks remotos no SHA congelado, artefatos API/worker/SPA por digest, SBOM, scan, assinatura e attestations; prova de que a promoção não recompila o código.

**Gate G2:** identidade CI/OCI/release consistente, logs terminais e proveniência verificável. Um novo commit reinicia o gate aplicável.

## W3 — target, resiliência e paridade

**Entregas:** RLS com roles reais e negativas cross-tenant; redelivery/restart do worker; jornada clínica/financeira; restore/rollback e RPO/RTO medidos; carga e alertas; upload seguro, pagamentos, relatórios e providers; critérios de 11 áreas assinados por Produto. O target deve ser autorizado, representativo e recuperável.

**Gate G3:** provas target-bound, limites publicados e defeitos críticos resolvidos. Ausência de ambiente, credencial ou aprovação significa `BLOCKED/NOT_PROVEN`.

## W4 — experiência e sustentabilidade

**Entregas:** UAT com papéis hospitalares, avaliação assistida de acessibilidade, estados de UI completos, decomposição incremental de hotspots, correções documentais, retenção de artefatos e changelog de evidências. Refatorações que alterem o candidato renovam testes/CI/target pertinentes.

**Gate G4:** cenários UAT e acessibilidade aceitos pelas autoridades competentes; dívida remanescente explicitada e sem bloquear os controles da Quality Bar.

## W5 — reconciliação e decisão

**Entregas:** tabela única de `M` ↔ `REM` ↔ P0, Quality Bar, registry e snapshots no mesmo SHA; reauditoria independente; pacote de risco residual e decisão formal.

**Gate G5:** zero P0, gates obrigatórios aprovados, notas da Quality Bar dentro da régua e go/no-go registrado. A nota editorial de 66/100 é ponto de partida, não um gate substituto.
