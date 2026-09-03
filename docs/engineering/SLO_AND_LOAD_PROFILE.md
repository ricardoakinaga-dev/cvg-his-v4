# SLO e perfil de carga

**Vigente desde:** 2026-09-02  
**Owners:** Produto, Operações e SRE  
**Fonte executável:** [`benchmarks/k6/slos.json`](../../benchmarks/k6/slos.json)

## Objetivos técnicos

| Indicador | Objetivo | Alerta | Crítico | Janela |
|---|---:|---:|---:|---|
| latência API p95 | <200 ms | 250 ms | 300 ms | 5 min |
| latência API p99 | <500 ms | 600 ms | 800 ms | 5 min |
| erro HTTP 5xx | <0,1% | 0,5% | 1,0% | 5 min |
| disponibilidade | ≥99,5% | <99,0% | <98,0% | 1 h, orçamento em 30 d |
| autenticação p95 | <300 ms | 400 ms | 500 ms | execução |
| leitura/consulta p95 | <150 ms | 200 ms | 300 ms | execução |
| escrita p95 | <300 ms | — | — | execução |
| billing p95 | <250 ms | — | — | execução |
| inventário p95 | <200 ms | — | — | execução |

Os limites de regressão estão congelados e alinhados entre k6, `/slos`, Prometheus
e testes. Os volumes de produção permanecem com `pending-target-signoff` até
Produto e Operações aprovarem a capacidade no ambiente-alvo; isso impede que o
benchmark local seja apresentado como homologação de produção.

## Jornadas exercitadas

O workload autentica uma principal real e percorre health, owners, pacientes,
staff, atendimentos, agenda, billing, inventário, prontuário e OpenAPI. Leituras
e escritas usam PostgreSQL/Redis reais no CI. Falha de autenticação encerra a
execução; token vazio e account fictício não são aceitos como carga válida.

## Perfis

| Perfil | Concorrência | Duração | Uso |
|---|---:|---:|---|
| `operational-minimum-v1` | rampa 5→30→60 VUs, retorno a 5 | 3 min 30 s | bloqueio de regressão no CI em ambiente descartável |
| `endurance-2h-v1` | 30 VUs sustentados | 2 h 20 min com rampas | certificação manual no tenant de benchmark aprovado |

O perfil endurance gera dados de inventário/billing. Ele é proibido em tenant
real e exige o environment protegido `performance-certification`, confirmação
literal `BENCHMARK-DESCARTAVEL` e credenciais armazenadas em secrets do GitHub.

## Critério de aceite

- o SHA solicitado pertence a `main` e fica registrado no workflow;
- todas as thresholds do k6 passam sem `continue-on-error`;
- relatório JSON é retido mesmo quando o teste falha;
- execução alvo registra recursos de API, PostgreSQL e Redis, volume inicial,
  taxa de crescimento, gargalos, margem de capacidade e aprovadores;
- PERF-002 só pode ser encerrado após o perfil endurance passar no ambiente-alvo.
