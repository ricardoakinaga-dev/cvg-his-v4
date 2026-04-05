# PRIORIDADES E ACOES RECOMENDADAS - ENTERPRISE PLAN CVG-HIS-V2

## Objetivo

Este documento traduz o plano enterprise em uma visao mais pratica de prioridades, decisoes imediatas e acoes recomendadas para reduzir risco de execucao.

## Prioridades estrategicas

| Prioridade | Tema | Motivo | Janela |
|------------|------|--------|--------|
| P0 | Multi-tenancy | Base tecnica de todo o programa | Onda 1 |
| P0 | Seguranca e MFA | Risco operacional e de compliance | Onda 1 |
| P0 | LGPD minimo viavel | Risco juridico direto | Onda 1 |
| P0 | Observabilidade | Necessaria para escalar com seguranca | Onda 1 |
| P0 | Quality gates | Reduz regressao acumulada | Onda 1 |
| P1 | Design system | Base para migracao frontend consistente | Onda 2 |
| P1 | Migracao SPA das telas core | Maior impacto percebido pelo usuario | Onda 2 |
| P1 | Event Bus e pagamentos | Habilita integracoes e monetizacao | Onda 3 |
| P2 | Casos de AI/ML | Diferenciacao competitiva | Onda 4 |
| P2 | SOC2 e excelencia operacional | Consolidacao enterprise | Onda 5 |

## Acoes recomendadas imediatas

| Acao | Objetivo | Resultado esperado |
|------|----------|-------------------|
| Validar baseline tecnico atual | Confirmar score real do produto | Medicao confiavel de partida |
| Definir MVP da Onda 1 | Evitar sobrecarga de escopo | Entregas obrigatorias claras |
| Revisar estrategia de migracao frontend | Reduzir risco da Onda 2 | Plano de convivencia com legado |
| Formalizar custo total do programa | Alinhar decisao executiva | Visao unica de investimento |
| Operacionalizar o scorecard | Transformar plano em acompanhamento real | Governanca de execucao |

## Tabela de prioridades por onda

| Onda | Itens obrigatorios | Itens recomendados | Itens que podem ser fatiados |
|------|--------------------|--------------------|------------------------------|
| 1 | tenant_id, RLS, MFA, LGPD base, observabilidade, gateway, coverage > 60% | contract tests, scans avancados | etapas mais sofisticadas de step-up e politicas secundarias |
| 2 | design tokens, componentes base, shell SPA, login, dashboard, modulos core | dark mode total, atalhos globais, PWA | offline avancado e recursos menos criticos |
| 3 | Event Bus, PIX, WhatsApp, OpenAPI, webhooks | cartao, SMS fallback, dashboard financeiro ampliado | partes menos urgentes do motor fiscal |
| 4 | infra ML, smart scheduling | demand forecasting | OCR e anomaly detection se dados ainda estiverem imaturos |
| 5 | documentacao, performance, quality gates finais | chaos engineering e SOC2 path detalhado | atividades mais sofisticadas de preparacao de auditoria |

## Riscos mais importantes e resposta sugerida

| Risco | Impacto | Resposta sugerida |
|------|---------|-------------------|
| Multi-tenancy quebrar fluxos existentes | Critico | rollout gradual, feature flags, testes de isolamento |
| Migracao Vue 3 atrasar | Alto | foco em modulos core e convivencia com legado |
| LGPD incompleto | Critico | apoio juridico e auditoria antes de go-live |
| Performance piorar com tenancy | Alto | benchmarks, indices compostos, tuning desde o inicio |
| AI sem precisao suficiente | Medio | fallback por regras e A/B testing |
| Time insuficiente | Alto | priorizacao rigida e corte formal de escopo |

## Decisoes executivas que precisam ser fechadas

### 1. Custo oficial do programa

Definir se o numero de referencia sera:

- `R$ 8.2M` como custo direto de squads
- `R$ 8.9M` como custo total do programa

### 2. Estrategia de migracao do frontend

Fechar uma abordagem clara:

- migracao gradual por modulo
- convivencia temporaria com legado
- criterios para desligamento do frontend antigo

### 3. Gate de cada onda

Cada onda deve ter:

- criterio de entrada
- criterio de saida
- MVP obrigatorio
- itens adiaveis

## Sequencia recomendada de execucao

### Proximos 30 dias

- validar baseline tecnico
- fechar escopo minimo da Onda 1
- modelar tenant, company e branch
- definir arquitetura de RLS e injeção de contexto
- iniciar instrumentacao de observabilidade

### Proximos 60 dias

- concluir tenant_id nas tabelas criticas
- entregar MFA para perfis criticos
- colocar pipeline inicial de consentimento e exportacao LGPD
- ativar dashboards e alertas base
- subir quality gates no CI

### Proximos 90 dias

- estabilizar gateway
- validar regressao e performance
- fechar aceite da Onda 1
- detalhar MVP fechado da Onda 2

## Recomendacao final

O programa deve ser conduzido com foco em `fundacao primeiro, sofisticacao depois`. O melhor caminho nao e tentar executar todo o escopo ideal de cada onda de uma vez, mas garantir que cada etapa gere uma base segura para a seguinte.

Se houver necessidade de corte, a prioridade recomendada e:

1. preservar multi-tenancy, seguranca, LGPD base e observabilidade
2. preservar design system e migracao dos modulos mais usados
3. preservar integracoes com maior retorno operacional e comercial
4. postergar iniciativas de AI e certificacao que dependam de maturidade ainda nao consolidada
