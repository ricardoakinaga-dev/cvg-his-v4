# ONDA 4 — AI/ML (Meses 14-16)
## Score: 82 → 87 (+5 pontos)

## Objetivo
Implementar os primeiros modelos de AI que geram valor mensurável na operação.

## Etapas

### Etapa 4.1 — Infraestrutura ML (Mês 14)
**Entregas:**
- [ ] Feature Store (armazenamento de features para modelos)
- [ ] Model Registry (MLflow) para versionamento
- [ ] Training Pipeline básico (scripts + scheduler)
- [ ] Model Serving (FastAPI + Redis para cache de predições)
- [ ] Monitoring de modelos (drift, accuracy, latency)

### Etapa 4.2 — Smart Scheduling (Mês 14-15)
**Entregas:**
- [ ] Modelo de sugestão de horários ótimos
- [ ] Baseado em: histórico de agendamentos, padrões de no-show, preferências de profissional
- [ ] API: `POST /ai/schedule/suggest`
- [ ] Integração com tela de agendamento
- [ ] A/B testing: sugestão vs não-sugestão
- [ ] Métrica: taxa de ocupação da agenda

### Etapa 4.3 — Demand Forecasting (Mês 15)
**Entregas:**
- [ ] Modelo de previsão de demanda de insumos
- [ ] Baseado em: histórico de consumo, sazonalidade, tendências
- [ ] API: `POST /ai/demand/forecast`
- [ ] Alertas automáticos de estoque abaixo do previsto
- [ ] Sugestão de pedido de compra
- [ ] Métrica: redução de ruptura de estoque

### Etapa 4.4 — OCR Pipeline (Mês 15-16)
**Entregas:**
- [ ] OCR para leitura de notas fiscais (foto → dados)
- [ ] Extração: CNPJ, itens, valores, impostos
- [ ] API: `POST /ai/ocr`
- [ ] Integração com tela de entrada de NF
- [ ] Validação automática dos dados extraídos
- [ ] Métrica: tempo de entrada de NF

### Etapa 4.5 — Anomaly Detection (Mês 16)
**Entregas:**
- [ ] Detecção de anomalias em resultados de exames
- [ ] Baseado em: valores de referência, histórico do animal, padrões populacionais
- [ ] Alertas visuais no laudo
- [ ] Métrica: falsos positivos/negativos

## Score Esperado: 82 → 87
