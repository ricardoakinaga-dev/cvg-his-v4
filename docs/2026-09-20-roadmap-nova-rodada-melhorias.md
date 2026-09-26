---
document_status: historical
document_kind: roadmap
effective_date: 2026-09-21
owner: Liderança técnica, Plataforma, Segurança, QA e Operações CVG-HIS
review_cycle: on-milestone-or-candidate-change
superseded_by: docs/2026-09-26-roadmap-rodada-2.md
---

# Roadmap — nova rodada de melhorias

[Auditoria](2026-09-20-auditoria-scorecard-db07cd02.md) ·
[Plano](2026-09-20-plano-executivo-nova-rodada-melhorias.md) ·
[Backlog](2026-09-20-backlog-nova-rodada-melhorias.md)

## Sequência por gates

| Onda | Resultado | Itens | Gate de saída |
| --- | --- | --- | --- |
| R-1 — reparar gates locais | Remover regressões encontradas pela auditoria | AUD21-01–04, AUD21-09–10 | PASS-LOCAL: supply-chain 17/17, dependências, segredos, backup/restore, métricas, upload e Helm obrigatório verdes |
| R0 — verdade operacional | Remover blockers internos de runtime e controle | NR-001–003 | PASS-LOCAL / TARGET-BLOCKED: Vault, controlador e Helm passam localmente; target ainda não provado |
| R1 — candidato local | Congelar, identificar e provar o último SHA | NR-004–009 | PASS-LOCAL / EXTERNAL-BLOCKED: novo freeze sobre runtime `cc063413`, P0 registry e snapshots vinculados; Trivy permanece NOT_RUN |
| R2 — CI/release | Provar a cadeia remota sem rebuild | NR-011–013 | CI 17/17; release encadeado; manifest/attestations/artefatos bound ao mesmo SHA |
| R3 — target | Provar operação e recuperação | NR-014–017 | deploy, RLS/migração, restore/rollback, soak/SLO e segurança no alvo aprovado |
| R4 — aceite | Fechar produto e autoridades | NR-018–020 | UAT, decisões formais, zero P0 e go/no-go |
| R5 — evolução | Reduzir custo e risco estrutural | NR-010, NR-021–024 | hotspots menores, oracle do parser, evidência compacta e governança automatizada |
| R6 Operação e target | Sustentar a operação depois do cutover | NR-015–017, PROD-037 | drill periódico cobre backup, restore/corrupção, RPO/RTO, rollback, soak e alertas no target |

## Caminho crítico

```text
AUD21-01–04/09–10 gates locais
  → NR-001 Vault Helm
  → NR-002 Helm/runtime negativo e positivo
  → NR-003 reconciliação do controlador
  → NR-006 regressão local
  → NR-004 freeze autorizado, identidade e snapshots
  → NR-007/008 OCI, runtime e scans do SHA congelado (runtime PASS; Trivy NOT_RUN)
  → NR-005 encerramento Gauntlet
  → NR-011 push + CI exato
  → NR-013 mutações do contrato de release
  → NR-012 release encadeado
  → NR-014 target/recovery
  → NR-018 UAT/autoridades
  → NR-020 decisão final
```

## Paralelismo permitido

- `NR-001/002` e o desenho de migração `NR-003` têm prova local histórica;
  novas mudanças em controles compartilhados continuam append-only.
- `NR-009` está `PASS-LOCAL`: a fixture impossível é hermética, o known-bad
  exige o finding exato e o harness fecha 17/17 no candidato.
- Trabalho externo `NR-014–019` pode preparar agendas e ambientes, mas nenhuma
  evidência é aceita antes do SHA de R2.
- Refatorações R5 não entram no candidato de release enquanto R0–R4 estiverem
  abertas, salvo correção indispensável e rebaseline explícito.

## Stop conditions

Parar e manter `BLOCKED` se qualquer gate R-1 falhar, se Vault não puder ser
exercitado, se o checker de controle não tiver migração segura, se o CI exato
falhar, se o release
reconstruir imagens, se qualquer scan tiver HIGH/CRITICAL, se o target divergir
do manifesto ou se faltar autoridade para a ação externa.

## Indicadores

- P0 internos abertos;
- distância `HEAD` ↔ `origin/main`;
- idade do candidate identity e dos snapshots;
- tempo/tamanho do fingerprint;
- jobs CI aprovados no SHA;
- OCI/attestations verificadas por componente;
- itens P0 externos fechados com fonte e autoridade.
