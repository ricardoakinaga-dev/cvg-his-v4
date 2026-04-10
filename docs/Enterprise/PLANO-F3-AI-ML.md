# PLANO FASE 3 — AI/ML
**Data:** 09/04/2026
**Status:** PLANEJADO

---

## OBJETIVO

Implementar capacidades de AI/ML para melhorar:
- Agendamento inteligente
- Previsão de demanda
- OCR para documentos

**Meta de Score:** 50 → 80

---

## TAREFA F3-01: Feature Store (ALTA PRIORIDADE)

### Descrição

Feature Store é uma camada de abstração de dados que:
- Centraliza features para modelos de ML
- Garantem consistência entre training e inference
- Permitem reuso de features entre modelos

### Implementação

```
packages/ml/feature-store/
├── src/
│   ├── index.ts
│   ├── types.ts              # Feature, FeatureVector, FeatureGroup
│   ├── feature.service.ts    # CRUD de features
│   ├── vector.service.ts     # Aggregation de features
│   └── repositories/
│       └── postgres.repository.ts  # Armazenamento PostgreSQL
├── feature-store.test.ts
└── package.json
```

### Tipos

```typescript
interface Feature {
  id: string;
  name: string;
  group: FeatureGroup;
  dataType: 'number' | 'string' | 'boolean' | 'timestamp';
  description?: string;
  createdAt: string;
}

interface FeatureVector {
  id: string;
  name: string;
  features: readonly string[];  // feature IDs
  entityType: 'patient' | 'appointment' | 'inventory';
  entityId: string;
  values: Record<string, unknown>;
  createdAt: string;
}
```

### Ambiente

```bash
FEATURE_STORE_ENABLED=true
FEATURE_STORE_POSTGRES=true
```

---

## TAREFA F3-02: Model Registry (MLflow) (ALTA PRIORIDADE)

### Descrição

Model Registry para:
- Versioning de modelos
- Metadata tracking
- Deployment staging (dev → staging → prod)

### Implementação

```
packages/ml/model-registry/
├── src/
│   ├── index.ts
│   ├── types.ts              # Model, ModelVersion, ModelStage
│   ├── registry.service.ts   # CRUD de modelos
│   ├── versioning.ts         # Version control
│   └── adapters/
│       └── mlflow.adapter.ts  # Integration with MLflow
└── package.json
```

### Tipos

```typescript
type ModelStage = 'none' | 'staging' | 'production' | 'archived';

interface Model {
  id: string;
  name: string;
  description?: string;
  algorithm: 'regression' | 'classification' | 'forecasting';
  currentVersion: number;
  createdAt: string;
}

interface ModelVersion {
  id: string;
  modelId: string;
  version: number;
  stage: ModelStage;
  artifactUri: string;
  metrics: Record<string, number>;
  stageHistory: StageTransition[];
  createdAt: string;
}
```

---

## TAREFA F3-03: Smart Scheduling MVP (ALTA PRIORIDADE)

### Descrição

Algoritmo de agendamento inteligente que:
- Prediz duração de consultas baseado em histórico
- Otimiza alocação de recursos
- Reduz tempo de espera

### Implementação

```
packages/ml/smart-scheduling/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── duration-predictor.ts   # Predição de duração
│   ├── slot-optimizer.ts         # Otimização de slots
│   ├── recommendation.service.ts # Recomendações
│   └── ml/
│       ├── training.ts           # Treinamento
│       └── inference.ts          # Inference
└── package.json
```

### Algoritmo

```typescript
interface SchedulingRecommendation {
  appointmentId: string;
  predictedDuration: number;  // minutos
  recommendedSlot: TimeSlot;
  confidence: number;          // 0-1
  factors: string[];          // razones da recomendação
}
```

---

## TAREFA F3-04: Demand Forecasting (MÉDIA PRIORIDADE)

### Descrição

Previsão de demanda para:
- Inventário inteligente
- Dimensionamento de staff
- Planejamento de capacidade

### Implementação

```
packages/ml/demand-forecasting/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── forecaster.ts          # Main forecasting
│   ├── models/
│   │   ├── arima.ts           # ARIMA implementation
│   │   └── exponential-smoothing.ts
│   └── indicators.ts          # Key indicators
└── package.json
```

---

## TAREFA F3-05: OCR Pipeline (MÉDIA PRIORIDADE)

### Descrição

Pipeline de OCR para:
- Digitalização de documentos
- Extração de dados de receipts
- Reconhecimento de prescrições

### Implementação

```
packages/ml/ocr/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── ocr.service.ts        # Main service
│   ├── extractors/
│   │   ├── receipt.extractor.ts
│   │   └── prescription.extractor.ts
│   └── adapters/
│       ├── tesseract.adapter.ts   # Local OCR
│       └── cloud-vision.adapter.ts # GCP/AWS OCR
└── package.json
```

---

## DEPENDÊNCIAS

```
F3-01 (Feature Store)
    ↓
F3-02 (Model Registry)
    ↓
F3-03 (Smart Scheduling MVP)
    ↓
F3-04 (Demand Forecasting)

F3-01 ─────→ F3-05 (OCR Pipeline)
```

---

## PRÓXIMOS PASSOS

1. [x] Planejar arquitetura
2. [ ] Implementar F3-01: Feature Store
3. [ ] Implementar F3-02: Model Registry
4. [ ] Implementar F3-03: Smart Scheduling MVP
5. [ ] Implementar F3-04: Demand Forecasting
6. [ ] Implementar F3-05: OCR Pipeline

---

*Plano criado em 09/04/2026*
