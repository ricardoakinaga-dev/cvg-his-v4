# Build de produção candidato — 07/09/2026

## Resultado

- Comando: `pnpm --filter @cvg-his-v2/spa run build`
- Resultado: `exit 0`
- Vite: 802 módulos transformados; build Vite em 13,45 s.
- PWA: 480 entradas precacheadas (`3199,49 KiB` no resumo do build).
- `apps/spa/dist`: 486 arquivos, 3.757.259 bytes.

## Orçamento observado

Os três assets referenciados pelo HTML inicial somam 367.659 bytes brutos; gzip local medido sobre os mesmos arquivos totalizou 102.488 bytes:

Fingerprint SHA-256 do inventário completo do `dist` no rerun: `2a1e266ba2c3b874623d9eaa2856efe50e26b2e2c518d90c856292d59e89a65e`.

| Asset | Bruto | Gzip |
| --- | ---: | ---: |
| `index-CazWy70P.js` | 210.628 B | 50.991 B |
| `vue-vendor-B9eduW0d.js` | 108.667 B | 42.394 B |
| `index-CzpPXHtF.css` | 48.364 B | 9.103 B |
| **Total inicial** | **367.659 B** | **102.488 B** |

Baseline registrada em `production-size-baseline.json`: 92.406 B gzip no HTML inicial. A variação observada no mesmo cálculo é +10.082 B (+10,91%), sem promoção automática de orçamento.

Maiores chunks brutos: `index` 210.628 B, `vue-vendor` 108.667 B, `ReportWorkbenchPage` 83.272 B, `PatientDetailPage` 69.570 B e `CounterSalesPage` 63.845 B. Os artefatos visuais `art/*.mp4` e `art/*.webp` permanecem fora do HTML inicial, mas entram no total do `dist`.

O [baseline laboratorial reproduzível](performance-lab-2026-09-07.md) repetiu a
navegação do build três vezes por rota em Chromium 145, incluindo a Agenda
autenticada com massa/API sintéticas, gzip de transporte observado via Resource
Timing e orçamento explícito por rota. FCP/LCP continuam sendo somente sinais
de laboratório; o relatório não é evidência de INP de campo, RUM, latência real
de API/DB ou UAT.

## Limites e alertas

Esta é uma medição de laboratório do artefato local, com transporte HTTP gzip observado apenas no servidor local; não é LCP/CLS/INP de campo, RUM ou rede lenta. O build emitiu os avisos de `api.ts` e `router/index.ts` serem importados estática e dinamicamente; não são tratados como falha nesta rodada, mas permanecem candidatos de otimização. A aceitação de FEA-031 continua dependente de metas do plano e dados de campo rotulados.

## Atualização pós-split — 08/09/2026

Após separar o catálogo de autorização e tornar os imports de `api.ts` e
`setup.ts` dinâmicos no guard, o build PWA passou com 808 módulos e 484 entradas
de precache. O `dist` corrente tem 491 arquivos e 3.853.209 bytes; os assets
referenciados pelo HTML inicial somam 346.131 B brutos / 96.440 B gzip. A meta
de 92.406 B permanece fora por 4.034 B (+4,37%), em
`HOLD_FOR_OWNER_APPROVAL`; o fingerprint corrente está no relatório
`performance-lab-2026-09-07.json`.

O split reduziu 1.496 B gzip contra a rodada anterior sem alteração observada
na Agenda: recaptura browser 30/30, e a matriz de acessibilidade 56/56 com Axe
0. FCP/LCP continuam dentro dos limites laboratoriais e a aceitação ainda não
é promoção global: dados de campo, INP/RUM, rede lenta, backend/RLS, UAT,
touch/zoom nativos e leitor de tela permanecem fora deste artefato.

## Atualização final do candidato — 08/09/2026

O router passou a manter MFA/login/setup no entry público e a carregar a tabela
privada de `apps/spa/src/router/routes.ts` uma única vez quando necessário. A
primeira recaptura detectou aliases da Agenda em `NotFound`; o fallback foi
corrigido para hidratar caminhos deferred antes da resolução do Vue Router. O
recorte passou 32/32 testes de rota/guard, `vue-tsc` passou e a SPA passou
209/1.822.

O build PWA final passou com 809 módulos e 485 precaches. O `dist` tem 492
arquivos/3.855.394 bytes e o HTML inicial soma 253.272 B brutos/76.875 B gzip,
abaixo da baseline proposta de 92.406 B em 15.531 B (16,81%); o fingerprint
do inventário é `b3641b09abd0412535fd6e0c285382818b9b3ad9208e255763bf03c3ad3c6f12`.
O laboratório mediu FCP/LCP máximos de 172/172 ms (`/`), 84/84 ms (`/login`)
e 128/128 ms (Agenda), sem long task ou erro de página. O budget continua
`HOLD_FOR_OWNER_APPROVAL`: o número é laboratorial e não substitui RUM/INP,
rede lenta, API/DB real, backend/RLS ou UAT.

As evidências finais são Agenda `continuity-wCJGZ6` (30/30 nos cinco aliases)
e acessibilidade `continuity-tQnwrY` (56/56, Axe 0, sete larguras, dois temas e
reduced motion), ambas com entradas estáveis. O estado global permanece
`ACTIVE/HOLD`.
