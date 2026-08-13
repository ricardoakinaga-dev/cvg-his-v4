# 450 - Gaps Enterprise Priorizados

**Status:** vivo
**Data de validacao:** 2026-08-11

O P1 desta matriz foi executado nesta rodada: adapters locais e persistência agora exigem seleção explícita ou falham em ambientes production-like, a composição da API foi extraída para módulos, a cobertura de rotas/autenticação/repositórios/integrações foi ampliada, e a documentação ativa foi reconciliada. O detalhamento dos gates e dos itens ainda fora do aceite enterprise está no [relatório atual](2026-08-11-relatorio-auditoria-p1.md).

Em 12/08/2026, as 48 ocorrências de vulnerabilidade de dependências também foram eliminadas e o gate enterprise passou a bloquear advisories a partir de severidade baixa. O programa residual até 95 está em [plano executivo](2026-08-12-plano-executivo-meta-95.md), [roadmap](2026-08-12-roadmap-meta-95.md) e [backlog](2026-08-12-backlog-meta-95.md).

Na mesma verificação, o gap RLS de `sessions` foi fechado por migration aditiva e teste negativo; `validate:rls` passou com 98/98 tabelas tenant protegidas. Permanecem na F1 a role production-like sem bypass, `FORCE RLS`, contexto por transação e a matriz cross-tenant completa.

## P0 - Corrigir agora

### 1. Politica unica de migrations e banco

- hoje ha duas trilhas no repositorio
- deploy, testes e documentacao ainda nao contam a mesma historia

### 2. Alinhamento entre docs de deploy e ambiente real

- compose publica portas diferentes das portas sugeridas em parte da documentacao
- cutover precisa usar a realidade do ambiente, nao a memoria do projeto

### 3. Documentacao viva dos apps canonicos

- frontend, backend e worker historicamente foram descritos como skeleton em alguns pontos
- isso nao pode continuar

## P1 - Fechar na fase de consolidacao

### 4. Cobertura documental dos modulos subrepresentados

- `access-control`
- `attachments`
- `billing`
- `notifications`
- `scheduling`
- `staff`
- `surgery`
- `triage`
- `users`

### 5. Gaps de teste e repetibilidade

- `test:critical` depende de banco alinhado
- E2E nao cobre toda a superficie enterprise

## P2 - Endurecimento

### 6. Curadoria editorial permanente

- sem novos documentos historicos no topo
- sem prompts misturados com referencia
- sem duplicidade de numeracao

### 7. Observabilidade e operacao

- health, readiness, logs e criterio de release precisam continuar convergindo

## Regra de priorizacao

Priorizar o que reduz risco real de:

- deploy errado
- leitura errada do estado do produto
- regressao silenciosa
- operacao hospitalar inconsistente
