# Baseline de performance laboratorial da SPA — 07/09/2026

Artefato medido: `apps/spa/dist`, após `pnpm --filter @cvg-his-v2/spa run build`. Execuções: 3 por rota; Chromium headless; viewport 1440×900; DPR 1.

## Artefato

- 494 arquivos; 3882719 B brutos no dist.
- Fingerprint SHA-256 imutável do inventário: `27554f339943a519eaee331155a3669d491100cfc3f41320e9ca17f2065f42b8`.
- Assets do HTML inicial: 253360 B brutos / 76910 B gzip nível 9.
- Transporte: gzip observado pelo Resource Timing em todas as rotas: sim.

## Navegação (mediana)

| Rota solicitada | Destino final | Tempo total | FCP | LCP | Maior long task |
| --- | --- | ---: | ---: | ---: | ---: |
| / | /login?next=/ | 1621.0089930000004 ms | 164 ms | 164 ms | 0 ms |
| /login | /login | 1585.1401969999997 ms | 120 ms | 120 ms | 0 ms |
| /appointments?agendaDate=2026-09-07&agendaView=week | /appointments?agendaDate=2026-09-07&agendaView=week | 1787.5992879999994 ms | 164 ms | 164 ms | 54.0 ms |

## Orçamento laboratorial proposto

- HTML inicial: alvo igual ao baseline de 92.406 B gzip; observado 76910 B (-16.77%); decisão permanece HOLD para aprovação técnica do desvio.
- Por rota: FCP máximo ≤ 1.000 ms, LCP máximo ≤ 1.500 ms, maior long task ≤ 200 ms e zero erros de página nesta coleta; esses limites são de laboratório e não substituem INP/RUM.

## Limites

Esta é uma medição laboratorial reproduzível do build local. A rota de Agenda é exercitada com massa controlada e respostas de autenticação/API interceptadas localmente; não é RUM, INP de campo, latência real de API/DB, estudo com participantes, UAT ou aprovação de orçamento.

JSON completo: [performance-lab-2026-09-07.json](performance-lab-2026-09-07.json). Hash do script deve ser registrado junto ao rerun.
