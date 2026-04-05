# ROADMAP ENTERPRISE — CVG-HIS-V2
## Visão Geral: 5 Ondas em 18 Meses

## Timeline

```
Mês 1────────4────5────────9────10────13──14────16──17──18
│ ONDA 1: Fundação Crítica │ ONDA 2: Frontend Premium │ ONDA 3: Integrações │ ONDA 4: AI │ ONDA 5: Excelência │
│ Score: 42→58             │ Score: 58→72             │ Score: 72→82        │ Score: 82→87│ Score: 87→90+     │
```

## Resumo por Onda

| Onda | Nome | Meses | Score Δ | Entregas Principais |
|------|------|-------|---------|-------------------|
| 1 | Fundação Crítica | 1-4 | 42→58 | Multi-tenancy, MFA, LGPD, Observabilidade, API Gateway |
| 2 | Frontend Premium | 5-9 | 58→72 | Design System, Vue 3 SPA, WebSocket, PWA |
| 3 | Integrações | 10-13 | 72→82 | Pagamentos, WhatsApp, Fiscal, Event Bus |
| 4 | AI/ML | 14-16 | 82→87 | Smart Scheduling, Demand Forecast, OCR |
| 5 | Excelência | 17-18 | 87→90+ | SOC2, Chaos, Docs, Performance |

## Marcos Executivos

| Marco | Mês | Entrega | Critério de Aceite |
|-------|-----|---------|-------------------|
| M1 | 4 | Fundação pronta | Multi-tenancy operando, MFA ativo, Observabilidade live |
| M2 | 9 | Frontend Premium | Vue 3 SPA com design system, dark mode, a11y |
| M3 | 13 | Integrações Live | PIX + WhatsApp + Fiscal operando |
| M4 | 16 | AI em Produção | Smart scheduling gerando valor mensurável |
| M5 | 18 | Enterprise Premium | Score ≥ 90, SOC2 path definido, docs completas |

## Dependências Críticas

```
Onda 1 (Multi-tenancy) ──→ Onda 2 (Frontend por tenant)
Onda 1 (API Gateway) ────→ Onda 3 (Integrações)
Onda 1 (Observability) ──→ Todas as ondas (métricas)
Onda 2 (WebSocket) ──────→ Onda 4 (Real-time AI)
Onda 3 (Event Bus) ──────→ Onda 4 (AI consuming events)
```

## Squads por Onda

| Onda | Squads | Pessoas |
|------|--------|---------|
| 1 | Platform, Security, Data, Backend | 12 |
| 2 | Frontend, Design, Platform | 10 |
| 3 | Backend, Integration, Frontend | 9 |
| 4 | AI/ML, Data, Backend | 6 |
| 5 | Platform, QA, Docs | 6
