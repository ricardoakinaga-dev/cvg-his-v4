---
document_status: current
document_kind: plan
effective_date: 2026-09-26
owner: Liderança técnica CVG-HIS
review_cycle: weekly
---

# Plano executivo — rodada 2

[Auditoria](2026-09-26-auditoria-completa-sistema.md) ·
[Roadmap](2026-09-26-roadmap-rodada-2.md) ·
[Backlog](2026-09-26-backlog-rodada-2.md)

## Situação

O CVG-HIS V4 tem nota **70/100**. Em 26/09 foram corrigidos os cinco defeitos de integridade apontados em 25/09 (Pix, LGPD, anexos, MFA e NFS-e), além do worker travado, do cache de auditoria e do alerta de alergia na prescrição. A nova auditoria encontrou um risco arquitetural que impede escalar a API horizontalmente (A1) e um conjunto de ajustes financeiros, de UX e de infraestrutura.

## Objetivo da rodada

Chegar à **produção controlada numa clínica** até 20/11/2026, com zero P0 abertos, nota ≥ 82 e aceite das áreas usuárias.

## Resultados esperados

1. **Código governado:** tudo versionado, com CI remoto verde a cada merge.
2. **Dados consistentes:** nenhuma leitura desatualizada entre réplicas; valores e datas financeiras corretos no fuso da clínica.
3. **Fluxos fiscais e de pagamento reais:** Pix por atendimento e NFS-e homologados.
4. **Operação observável e recuperável:** alertas entregues, restore medido, carga validada.
5. **Segurança clínica:** alergia por classe e dose por peso na prescrição.

## Papéis

| Papel | Responsabilidade |
|---|---|
| Liderança técnica | Prioridade do backlog e decisão de go/no-go nos marcos |
| Backend/Plataforma | ARC, FIN, SEC, PAY, NOT, LGPD-01 |
| Frontend | UX-01 e as telas de CLI-01/02 |
| Operações | OPS, INF, QA-02 |
| Produto e clínica | CLI-01/02, UAT-01 |
| Jurídico/DPO 🧑‍⚖️ | LGPD-03 e a escolha fiscal em FIS-01 |

## Regras de execução

- **Um item por PR**, com teste de regressão e referência ao ID do backlog.
- **Nenhum merge sem CI verde.** Uma mudança local que não passou pelo CI não conta como entregue.
- **Decisões de produto e jurídicas** ficam registradas no backlog antes da implementação, como foi feito com retenção e alergia.
- **Nenhum P0 se fecha com mitigação.** A ARC-01 reduz o risco, mas a A1 só se encerra com a ARC-02 e a ARC-03.
- **Revisão semanal** do roadmap: marcos, riscos e prazos das dependências externas.

## Critério de go-live (M3)

- Zero itens P0 abertos no backlog.
- Reauditoria completa com nota ≥ 82 e nenhuma área abaixo de 55.
- E2E completo, carga de 2h no SLO e drill de restore aprovados no mesmo SHA.
- UAT assinada por recepção, clínica, enfermagem e financeiro.
