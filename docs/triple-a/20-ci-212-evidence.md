# CI #212 — evidência visual e de performance

## Identidade observada

- Run: [CI #212](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35198105802)
- SHA executado: `26176f7f0cb246463d50c11f5d9c3e270c716a6a`
- Artefato dos diffs: [visual-regression-diffs](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35198105802/artifacts/10487129596)
- Estado terminal: `failure`

## Visual Regression

O job passou `23/29` comparações e falhou somente nestes seis cenários:

| Cenário | Diferença observada | Limite congelado |
| --- | ---: | ---: |
| `encounters-list-page` | 175 pixels | 100 |
| `inpatient-list-page` | 108 pixels | 100 |
| `patient-detail-page` | 134 pixels | 120 |
| `encounter-detail-page` | 165 pixels | 150 |
| `appointment-detail-page` | 168 pixels | 150 |
| `patient-detail-page-dark` | 261 pixels | 220 |

Os pares `expected.png`, `actual.png` e `diff.png` foram inspecionados. As
diferenças estão concentradas nas bordas dos glifos: o expected contém
antialiasing subpixel colorido e o actual do runner contém antialiasing
monocromático. Não houve tela vazia, mudança de conteúdo, deslocamento de
layout ou falha de autenticação. Isso é evidência de drift de rasterização
entre hosts, não autorização para ampliar `maxDiffPixels`.

## E2E SPA e Performance

- E2E SPA: `418 passed`, `6 failed`; as seis falhas são as mesmas comparações
  visuais, sem falhas funcionais adicionais no resumo terminal.
- k6: `4/9` SLOs passaram; API p95 `241,77ms` contra `200ms`, query p95
  `182ms` contra `150ms`, write p95 `313ms` contra `300ms`, billing p95
  `276ms` contra `250ms` e inventory p95 `260,52ms` contra `200ms`.
  Erros `0%`, disponibilidade `100%` e diagnóstico passaram.

## Decisão de remediação

O candidato seguinte adiciona `--disable-lcd-text` ao Chromium e registra como
baseline exatamente os seis `actual.png` do artefato acima. Essa promoção é
limitada à causa de rasterização demonstrada, não altera thresholds e não fecha
nenhum P0. O commit local é
`4c12b259578d68a7babe2db3674d85c919015289`; a árvore funcional equivalente foi
publicada na `main` como `a4f2ef6705cebca552b07f20ebd3d596d5714079` e aguarda
uma execução CI exata.
