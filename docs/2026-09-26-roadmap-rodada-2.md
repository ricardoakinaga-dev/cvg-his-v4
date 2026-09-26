---
document_status: current
document_kind: roadmap
effective_date: 2026-09-26
owner: Liderança técnica CVG-HIS
review_cycle: weekly
---

# Roadmap — rodada 2

[Auditoria](2026-09-26-auditoria-completa-sistema.md) ·
[Plano executivo](2026-09-26-plano-executivo-rodada-2.md) ·
[Backlog](2026-09-26-backlog-rodada-2.md)

**Ponto de partida:** nota 70/100 e 11 itens P0.
**Meta da rodada:** zero P0 abertos e nota ≥ 82, com o sistema operando em produção controlada numa clínica.

As datas supõem uma equipe de 2 a 3 pessoas em tempo integral e o início em 28/09/2026. As ondas 2 e 3 dependem de terceiros (Pagar.me, prefeitura, jurídico, equipe clínica); seus prazos são estimativas e serão revistos a cada semana.

```
Semana   40   41   42   43   44   45   46   47   48   49
Onda 0   ███                                            Higiene e mitigações
Onda 1        ██████████                                Integridade e consistência
Onda 2             ███████████████                      Integrações externas
Onda 3                       ██████████████             Clínico, carga e UAT
Onda 4                                 ██████████       Manutenibilidade
Marco         M0        M1             M2        M3
```

## Onda 0 — Higiene e mitigações (28/09 → 02/10)

**Objetivo:** código versionado e validado pelo CI, e o risco A1 contido.

| Itens | Resultado |
|---|---|
| R2-REL-01, R2-REL-02 | Correções no GitHub, CI remoto verde, árvore limpa |
| R2-ARC-01 | API com 1 réplica em produção, com guard |
| R2-OPS-01 | Alertas chegando a um canal real |
| R2-FIN-03, R2-LGPD-02, R2-LGPD-04, R2-TOOL-01, R2-UX-02 | Correções pequenas e isoladas; E2E 100% verde |
| R2-LGPD-03 🧑‍⚖️ | Consulta jurídica aberta (a resposta pode chegar na onda 1) |

**M0 — saída da onda 0:** CI verde no `main`, `git status` limpo, alerta sintético recebido, produção configurada com 1 réplica.

## Onda 1 — Integridade e consistência (05/10 → 23/10)

**Objetivo:** eliminar leituras desatualizadas entre réplicas e divergências financeiras.

| Itens | Resultado |
|---|---|
| R2-ARC-02, R2-ARC-03 | Leitura autoritativa com escopo de conta; invalidação entre réplicas |
| R2-FIN-01, R2-FIN-02 | Centavos inteiros; dia civil no fuso da clínica |
| R2-SEC-01 | Política de senha única e fim dos hashes legados |
| R2-UX-01, R2-UX-03 | Mensagens de erro em português; snapshot visual revisado |
| R2-LGPD-01 | Executor de eliminação (depende da LGPD-03) |
| R2-QA-01 | E2E completo no CI |

**M1 — saída da onda 1:** teste de duas instâncias verde, e o guard de réplica única pode ser removido; relatório diário correto às 22h locais; E2E no CI.

## Onda 2 — Integrações externas (12/10 → 06/11, em paralelo)

**Objetivo:** fechar os fluxos que dependem de fornecedores.

| Itens | Resultado |
|---|---|
| R2-PAY-01 | Pix real por atendimento no sandbox do Pagar.me |
| R2-FIS-01 🧑‍⚖️ | NFS-e homologada em um município |
| R2-NOT-01 | Lembretes duráveis e agendados |
| R2-OPS-02 | Restore real com RPO/RTO medidos |
| R2-INF-01 | NetworkPolicy e HPA |

**M2 — saída da onda 2:** pagamento, nota fiscal e lembrete ponta a ponta em homologação; drill de restore aprovado.

## Onda 3 — Clínico, carga e aceite (26/10 → 20/11)

| Itens | Resultado |
|---|---|
| R2-CLI-01, R2-CLI-02 | Alergia por classe; dose por peso |
| R2-QA-02 | Carga e endurance no alvo |
| R2-UAT-01 🧑‍⚖️ | Aceite das áreas usuárias |
| R2-SEC-02, R2-AUD-01, R2-DB-01 | Endurecimento |

**M3 — saída da onda 3 (go/no-go de produção):** zero P0 abertos, UAT assinada, SLO sustentado por 2h e reauditoria com nota ≥ 82.

## Onda 4 — Manutenibilidade (09/11 → 04/12)

R2-COD-01, R2-COD-02 e R2-DOC-01, executados sem bloquear o go-live, em paralelo à operação assistida.

## Riscos do cronograma

| Risco | Efeito | Resposta |
|---|---|---|
| ARC-02/03 maiores do que o previsto (60 pontos de chamada) | Atrasa M1 | Manter ARC-01 (1 réplica) em produção; escalar verticalmente |
| Homologação municipal da NFS-e lenta | Atrasa M2 | Emitir por provedor intermediário com API key |
| Parecer jurídico da LGPD atrasado | Bloqueia LGPD-01 | Pedidos seguem abertos com 409 explícito, sem falsa conclusão |
| Disponibilidade da equipe clínica para a UAT | Atrasa M3 | Agendar as sessões já na onda 1 |
