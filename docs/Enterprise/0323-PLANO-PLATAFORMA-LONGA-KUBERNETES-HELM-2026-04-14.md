# Plano: Plataforma Longa — Kubernetes / Helm

**Taxonomia:** `OPERACIONAL`
**Papel no sistema documental:** plano tematico vivo para plataforma longa, Helm, Kubernetes e operacao multiambiente
**Ler em conjunto com:** `README.md`, `0195-POLITICA-ROTACAO-DE-SEGREDOS-E-CREDENCIAIS.md`, `0335-RELATORIO-AUDITORIA-EXTREMA-WORKSPACE-2026-04-19.md`, `301-RISK-REGISTER.md`

**Data:** 2026-04-14  
**Pendente:** ALTO | Plataforma longa (K8s/Helm) | Docs dizem 20/100, código ~15/100  
**Fonte:** docs/Enterprise (0192, 0194, PLANO-F4/F4-11, 301-RISK-REGISTER)

---

## 1. Diagnóstico do Gap

### O que os docs exigem

#### 0192 — Roadmap Fase R5 (20+ semanas, meta 90/100)
> Formalizar a plataforma enterprise de longo prazo depois que produto, gates e runtime intermediário estiverem fechados.
> Entregas: Helm charts, trilha Kubernetes por ambiente, ADR de secrets manager, ADR de plataforma HTTP/runtime, governança event-driven por domínio.

#### 0194 — Sprint 12 (semanas 11-12)
> Decidir trilha de plataforma longa com base em runtime já estabilizado.
> **Regra explícita:** não puxar Helm/Kubernetes antes da Sprint 10.

> "Nao puxar antes de Sprint 10: Helm charts, Kubernetes, secrets manager dedicado, replanejamento amplo de arquitetura."

#### PLANO-F4 Tarefa F4-11
> Criar trilha de operação enterprise multiambiente:
> - Helm charts para API, worker e SPA
> - valores por ambiente (dev, staging, prod)
> - padrões de probes, secrets e autoscaling
> - chart mínimo implantável
> - runbook de deploy e rollback

#### Risk Register R-17
> "Ausência de estratégia Kubernetes/Helm trava operação enterprise multiambiente"
> Prob: Média | Impacto: Médio | Mitigação: Helm charts mínimos, ADR de runtime e plano progressivo

### O que existe hoje no código

| Componente | Status | Observação |
|---|---|---|
| Dockerfiles (api, worker, web, spa) | ✅ Existentes | Multi-stage, com healthcheck |
| docker-compose.v2.yml | ✅ Estruturado | Healthchecks, volumes, networks |
| Helm charts | ❌ Não existe | Nenhum chart, nenhum values.yaml |
| Kubernetes manifests | ❌ Não existe | Sem Deployment, Service, Ingress, ConfigMap |
| ADR de runtime/container | ❌ Não existe | Decisões de container ainda não documentadas |
| Secrets manager plan | ❌ Não existe | Política documentada (0195) mas sem implementação k8s |
| k8s runbooks | ❌ Não existe | Deploy/rollback ainda em scripts shell |

### Score atual
- Docs: 20/100 — apenas planejado (F4-11 em estado "planejado")
- Código: ~15/100 — nada materializado

---

## 2. Pré-requisitos para Iniciar (do que os docs dependem)

Conforme 0192 e 0194, a plataforma longa **não deve anteceder**:

| Pré-requisito | Status atual (2026-04-14) | Ref |
|---|---|---|
| Gates globais verdes | ✅ verde (typecheck, build, test:coverage) | Sprint 7 |
| Coverage 15% mínimo | ✅ 28.42% | Sprint 7 |
| API/SPA prescriptions fechada | ✅ fechada | Sprint 7 |
| PIX runtime real | ✅ implementado | Sprint 9 |
| Fiscal com persistência | ⚠️ parcial | Sprint 9 |
| Runtime distribuído (Redis expandido) | ⚠️ parcial | Sprint 10 |
| Feature flags com governança | ⚠️ parcial | Sprint 10 |
| Release hardening | ✅ em curso | Sprint 10 |
| Sprint 10 completa | ⚠️ em execução | — |

**Conclusão:** Os pré-requisitos estão sendo atingidos. A plataforma longa pode começar a ser planejada formalmente agora, mas a **execução** de Helm/K8s deve vir após Sprint 10-11.

---

## 3. Plano de Execução

### Fase A — Fundação de Container e Imagens (Pré-Helm)

**Objetivo:** Garantir que Dockerfiles e docker-compose estejam prontos para orquestração

1. **Auditar Dockerfiles existentes**
   - api: ✅ multi-stage, healthcheck, porta 3001
   - worker: ✅ existe, healthcheck implícito
   - spa: ✅ multi-stage, porta 3002
   - web: ✅ existe, profile legacy
   - Otimizar camadas (cache layers)
   - Adicionar labels de versão e metadata

2. **Consolidar docker-compose.v2.yml como source of truth**
   - Garantir que todos os serviços têm healthcheck
   - Documentar variáveis de ambiente obrigatórias
   - Criar `.env.example` completo para todos os serviços

3. **Criar imagem SHA-tagged automatizada**
   - CI que faz build + push com tag git-sha
   - Definir registry target (local ou cloud)

### Fase B — Helm Charts Mínimos (Primeiro Chart)

**Objetivo:** Criar estrutura Helm que permita deployar o stack CVG-HIS em k8s

1. **Estrutura base**
```
infra/helm/
├── cvg-his-v2/
│   ├── Chart.yaml
│   ├── values.yaml              # valores globais
│   ├── values.dev.yaml         # ambiente dev
│   ├── values.staging.yaml     # ambiente staging
│   ├── values.prod.yaml        # ambiente prod
│   ├── templates/
│   │   ├── _helpers.tpl        # templates auxiliares
│   │   ├── api-deployment.yaml
│   │   ├── api-service.yaml
│   │   ├── worker-deployment.yaml
│   │   ├── spa-deployment.yaml
│   │   ├── spa-service.yaml
│   │   ├── postgres-statefulset.yaml
│   │   ├── redis-statefulset.yaml
│   │   ├── ingress.yaml
│   │   ├── configmap.yaml
│   │   └── secrets.yaml
│   └── templates/  # postgres + redis como StatefulSet/Deployment
```

2. **Chart mínimo implantável**
   - API como Deployment (1 replica para dev)
   - SPA como Deployment
   - Worker como Deployment (sem service)
   - PostgreSQL (StatefulSet com PVC)
   - Redis (StatefulSet com PVC)
   - Ingress (com anotação de proxy)
   - ConfigMap para variáveis de ambiente
   - Secrets para segredos

3. **Values por ambiente**
   - `values.dev.yaml`: 1 replica, imagePullPolicy Always, DEBUG flags
   - `values.staging.yaml`: 2 replicas, HPA preparado
   - `values.prod.yaml`: 3+ replicas, HPA, resource limits, pod disruption budget

### Fase C — Kubernetes Probes, Autoscaling e Hardening

1. **Probes padrão para todos os deployments**
   - readinessProbe: HTTP GET /health
   - livenessProbe: HTTP GET /health com delay
   - startupProbe: para serviços que inicializam lentamente

2. **Autoscaling (HPA)**
   - API: target CPU 70%, replicas 2-10
   - Worker: baseado em queue depth (futuro)

3. **Pod Disruption Budget**
   - API: minAvailable 1
   - SPA: minAvailable 1

4. **Resource limits e requests**
   - Definir requests (memória mínima) e limits (cap máxima)
   - Evitar OOMKilled em produção

5. **NetworkPolicies (restritivas)**
   - Postgres: só aceita conexões da API
   - Redis: só aceita conexões da API
   - API: permite 443 para internet

### Fase D — ADR de Runtime e Plataforma

1. **ADR-001: Container Runtime**
   - Imagens multi-stage node:22-bookworm-slim
   - Não usar root em produção
   - Healthcheck como gate de readiness

2. **ADR-002: Orquestração**
   - Kubernetes como target
   - Helm como package manager
   - Decisão: k3s para dev/local, EKS/GKE para prod

3. **ADR-003: Secrets Management**
   - Usar Kubernetes Secrets com external-secrets operator (futuro)
   - Plano inmediato: Secrets via Helm values com dry-run validation
   - Plano final: Vault ou AWS Secrets Manager

4. **ADR-004: Networking**
   - Ingress com TLS terminates
   - CORS via API, não via Ingress
   - Service mesh: não na fase inicial (Linkerd/Istio)

### Fase E — Runbooks de Deploy e Rollback

1. **Runbook: Deploy padrão**
   - `helm upgrade --install cvg-his-v2 ./infra/helm/cvg-his-v2 -f values.<env>.yaml`
   - Verificar healthchecks
   - Smoke test pós-deploy

2. **Runbook: Rollback**
   - `helm rollback cvg-his-v2`
   - Verificar versão anterior
   - Procedure de incidentes

3. **Runbook: Scale manual**
   - `kubectl scale deployment cvg-his-v2-api --replicas=5`

4. **Runbook: Backup/Restore**
   - PostgreSQL: backup WAL contínuo, restore point-in-time
   - Redis: AOF + backup periódico

---

## 4. Definição de Pronto

| Entrega | Critério |
|---|---|
| Helm chart mínimo | `helm template` gera manifestos válidos |
|values.dev/staging/prod | Diferenciação clara de recursos e configurações |
| Readiness/liveness probes | Todos os deployments têm probes configurados |
| Ingress configurável | TLS + host routing por ambiente |
| ADR documents | 4 ADRs publicados em docs/Enterprise |
| Runbook deploy | Documento com comandos passo a passo |
| Runbook rollback | Documento com procedure testada |
| CI pipeline | Build + push de imagens com git-sha tag |
| Teste em cluster dev | Chart deployado e funcional em ambiente isolado |

---

## 5. Dependências e Ordem

```
Fase A (Dockerfile audit) ──▶ Fase B (Helm charts)
                                   │
                                   ▼
Fase C (Probes/HPA) ◀──────────────┘
        │
        ▼
Fase D (ADRs)
        │
        ▼
Fase E (Runbooks)
        │
        ▼
Fase F (CI/CD integration)  ← CI precisa estar atualizada
```

**Importante:** Este plano não deve bloquear as sprints 11-12. Ele roda em paralelo após Sprint 10, conforme 0194.

---

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Helm chart mal dimensionado causa OOM em prod | Resource limits + dry-run validation |
| Segredos em values.yaml vazam | Não colocar secrets reais em values; usar external-secrets |
| Ingress mal configurado expõe API | Restrictive NetworkPolicy + CI scan |
| Sem testes em cluster, chart quebrado em prod | Testar em k3s local antes de prod |

---

## 7. Score Alvo

| Fase | Score incremental |
|---|---|
| Fase A (Dockerfile + compose auditado) | 15 → 25 |
| Fase B (Helm chart mínimo) | 25 → 45 |
| Fase C (Probes + HPA) | 45 → 60 |
| Fase D (ADRs) | 60 → 70 |
| Fase E (Runbooks) | 70 → 80 |
| Fase F (CI + testes k8s) | 80 → 90 |
