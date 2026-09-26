# M-08 critical coverage strategy

Date: 2026-09-24
Owner: Agente 1 (Plataforma e release)

## Goal

Cover critical surfaces previously excluded from the unit coverage gate without lowering the
82% thresholds and without adding unjustified excludes.

## Unit coverage gate (`vitest.config.ts`)

Probe measurement (2026-09-24) of previously excluded modules, branch coverage:

| Module | Branches | % | In unit gate? |
| --- | ---: | ---: | --- |
| prescription-executions | 79/89 | 88.76 | YES |
| auth | 344/396 | 86.87 | YES |
| surgery | 29/34 | 85.29 | YES |
| access-control | 396/465 | 85.16 | YES |
| prescriptions | 141/169 | 83.43 | YES |
| webhooks | 151/182 | 82.97 | YES |
| services | 91/112 | 81.25 | no (below 82) |
| soc2 | 62/80 | 77.50 | no |
| medical-records | 396/502 | 78.88 | no |
| notifications | 51/68 | 75.00 | no |
| attachments | 247/334 | 73.95 | no |
| api-keys | 24/33 | 72.73 | no |
| billing | 112/158 | 70.89 | no |
| discharges | 33/47 | 70.21 | no |
| cash | 69/101 | 68.32 | no |
| products | 27/41 | 65.85 | no |
| event-bus | 112/202 | 55.45 | no |
| inpatient | 197/371 | 53.10 | no |
| notifications-whatsapp | 82/156 | 52.56 | no |
| quotes | 73/127 | 57.48 | no |
| pix | 50/240 | 20.83 | no |
| feature-flags | 0/0 | n/a | no (native repo suite) |

Simulated unit-gate branches after including only the six YES rows:
**9557/11559 = 82.68%** (threshold 82 unchanged).

Modules still outside the unit denominator still run under their package `test` scripts in the
M-07 root suite; they remain on the follow-up list until branch coverage is raised honestly.

## HTTP routes

`apps/api/src/routes/**` remains outside the **unit** denominator. Route coverage is proven by:

1. Co-located `node:test` suites `apps/api/src/routes/*.test.ts` (API package test / M-07);
2. Vitest tests under `tests/unit/api/*routes*.test.ts` (feature-flags, financial, health,
   openapi, api-keys, billing, etc.);
3. Critical coverage gate: `vitest.critical-coverage.config.ts` +
   `docs/engineering/critical-coverage-scope.json` lists route sources as `javascript-metrics`
   and requires shards `vitest-unit`, `vitest-integration`, `native-api`, `native-worker`,
   `critical-process` at 85% thresholds.

## Thresholds

Unit thresholds remain 82% for statements, branches, functions, and lines.
