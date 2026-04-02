# 450 - Gaps Enterprise Priorizados

**Status:** vivo
**Data de validacao:** 2026-03-31

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
