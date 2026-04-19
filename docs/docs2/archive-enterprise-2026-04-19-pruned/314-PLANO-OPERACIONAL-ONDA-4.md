# PLANO OPERACIONAL — ONDA 4 (Meses 14-16)
## AI/ML e Analytics

---

## 1. CONTEXTO

A Onda 4 introduz os primeiros casos de uso de AI com foco em ganhos operacionais mensuráveis. Diferente das ondas anteriores, esta onda requer integração entre dados, infraestrutura ML e casos de uso de negócio.

**Score Atual:** 82/100 → **Meta:** 87/100

---

## 2. ESTRUTURA DE SQUADS

### Squad AI/ML (Mes 14-16)
| Papel | Qtd | Foco |
|-------|-----|------|
| ML Engineer | 2 | Modelos, training, serving |
| Data Engineer | 1 | Feature store, pipeline |
| Backend Senior | 1 | API integration, caching |
| Product Manager | 0.5 | Priorização de casos de uso |

### Consultores Externos (se necessário)
| Papel | Qtd | Foco |
|-------|-----|------|
| Data Scientist | 1 | Modelagem, validação |
| AI/ML Architect | 0.5 | Arquitetura, review |

**Total por mês:** 4-5 pessoas

---

## 3. DATA READINESS CRITÉRIOS

Antes de iniciar training de modelos, validar:

- [ ] Feature Store com histórico de 12+ meses
- [ ] Dados de agendamento com pelo menos 50K registros
- [ ] Dados de estoque com pelo menos 100K movimentações
- [ ] Dados de exames com pelo menos 10K resultados
- [ ] Pipeline de quality assurance de dados documentado
- [ ] LGPD compliance para uso de dados em modelos

---

## 4. ETAPAS E DEPENDÊNCIAS

```
Mês 14: Infraestrutura ML + Smart Scheduling
├── Feature Store (Redis ou PostgreSQL + caching)
├── Model Registry (MLflow)
├── Training pipeline básico
├── Smart Scheduling v1 (A/B testing)
└── Serving API com cache

Mês 15: Demand Forecasting + OCR
├── Demand forecasting model
├── Integration com inventory alerts
├── OCR pipeline (Tesseract ou cloud)
├── NF-e parsing validation
└── Métricas de accuracy

Mês 16: Anomaly Detection + Polish
├── Anomaly detection em exames
├── Monitoramento de drift
├── API documentation completa
├── A/B testing resultados
└── Preparação Wave 5
```

---

## 5. CRITÉRIOS DE ENTREGA POR ETAPA

### 5.1 Infraestrutura ML + Smart Scheduling (Mês 14)
- [ ] Feature Store operacional com histórico
- [ ] MLflow rodando com versioning
- [ ] Training pipeline documentado
- [ ] Smart Scheduling v1 em A/B test
- [ ] API: `POST /ai/schedule/suggest` funcional
- [ ] Métrica: baseline de ocupação da agenda

### 5.2 Demand Forecasting + OCR (Mês 15)
- [ ] Demand forecast model v1
- [ ] API: `POST /ai/demand/forecast` funcional
- [ ] Integração com inventory alerts
- [ ] OCR pipeline rodando para notas fiscais
- [ ] API: `POST /ai/ocr` funcional
- [ ] Métrica: taxa de ruptura de estoque

### 5.3 Anomaly Detection + Polish (Mês 16)
- [ ] Anomaly detection em resultados de exames
- [ ] Alertas visuais no laudo
- [ ] Monitoramento de drift configurado
- [ ] Modelos documentados com performance
- [ ] Preparação para escala na Wave 5

---

## 6. CRITÉRIOS DE SUCESSO

| Métrica | Baseline | Target |
|---------|----------|--------|
| Agenda occupation rate | ~65% | 80% |
| Stock rupture rate | ~15% | 5% |
| NF entry time | ~5min | 30sec |
| Exam anomaly detection | 0 | > 80% accuracy |
| Model serving latency P95 | N/A | < 500ms |
| A/B test winning rate | N/A | > 60% |

---

## 7. RISCO DE DATA LEAKAGE

**Crítico:** Garantir que dados de treinamento não vazem para validação.

**Mitigações:**
- Temporal split: treinar com dados passados, validar com dados futuros
- No data leakage entre treino/validação (separar por período, não aleatório)
- LGPD: anonimizar dados de pacientes antes de usar em modelos

---

## 8. ORQUESTRADOR E EXECUTORES

**Orquestrador:** ML Engineer Lead
- Coordena roadmap de modelos
- Garante data quality e versioning
- Valida métricas de A/B tests

**Executores:**
- Executor A: Infraestrutura ML + Feature Store (Data Eng + ML Eng)
- Executor B: Smart Scheduling + Demand Forecasting (ML Eng 2)
- Executor C: OCR + Anomaly Detection (ML Eng + Backend)
