# Evidência terminal — CI #205

**Observado:** `2026-09-17T06:47:06Z`  
**Run:** [CI #205](https://github.com/ricardoakinaga-dev/cvg-his-v4/actions/runs/35188872670)  
**HEAD remoto:** `7ff8847b52c0914ad65a4a5dec21f27c378b20f2`  
**Candidato funcional remoto:** `b313fba795175947559347b7e82b460040fc459d`  
**Conclusão:** `failure`

O run é a execução corrente do `main` remoto. O HEAD publicado é um
descendente documental do candidato funcional; o conteúdo de código/workflow é
equivalente ao candidato local `d9acec6ef1763138d0b8b04a31ba7960db865c9c`.
Essa equivalência não transfere SHA nem transforma falha em aprovação.

## Resultado por gate

- `Critical Coverage Gate`: PASS.
- Segurança, dependências, secrets, SAST, OpenAPI, lint, typecheck, coverage,
  guards, build, unitários, integração, contratos API e processo Windows: PASS.
- API clínica canônica: PASS, `2/2` jornadas.
- E2E SPA/usabilidade: `395 passed`, `29 failed`; as 29 falhas são as
  comparações visuais da matriz.
- Visual Regression isolado: `29/29` falharam em `toHaveScreenshot`; a API,
  o seed, o banco PostgreSQL e a SPA estavam saudáveis e os screenshots foram
  capturados após as fontes carregarem.
- Performance/k6: `7/9` SLOs. API p95 `189,15 ms` e p99 `235,63 ms`, erros
  `0%` e disponibilidade `100%`; `query_latency_ms.p95=212 ms` excedeu
  `150 ms` e `inventory_latency_ms.p95=200,36 ms` excedeu `200 ms`.

## Crítica visual independente

Os artefatos remoto esperado/atual/diff mostram conteúdo renderizado, não tela
em branco, erro de autenticação ou falha de proxy. A diferença é consistente
em desktop, mobile, light e dark, com deslocamentos de métrica de texto e
quebras/layout diferentes. O runner remoto usa Playwright `1.58.2` e Chrome
for Testing `145`; o host que gerou os baselines é Linux Mint, enquanto o CI
usa Ubuntu `22.04`. A folha de estilo usa fontes do sistema (`Aptos`/`Segoe UI`
com fallback) e não versiona uma fonte web. O parecer é, portanto, **drift
provável de fonte/renderização**, inferido pelos artefatos e pelo ambiente; não
é uma autorização para atualizar baselines automaticamente.

## Decisão

Nenhum snapshot, threshold ou status de P0 foi promovido. O CI remoto
permanece `NOT GREEN / NOT PROVEN`; a certificação de performance exige
reprodução/certificação autorizada e a matriz visual exige uma fonte ou runner
canônico antes de qualquer atualização de baseline. Target, restore/DR, UAT,
attestation, governança de branch e autoridade de release continuam abertos.
