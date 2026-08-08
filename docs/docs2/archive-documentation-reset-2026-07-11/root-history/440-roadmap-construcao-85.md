# 440 - Roadmap de Construcao para Nota 85

**Status:** vivo
**Data de validacao:** 2026-03-31

## Objetivo

Levar o sistema e a sua documentacao a um patamar de `85/100` em prontidao enterprise.

## Eixos de trabalho

### Eixo 1 - Documentacao viva

- alinhar docs de arquitetura com o codigo real
- manter somente fonte de verdade na raiz `docs/`
- remover ambiguidade editorial

### Eixo 2 - Persistencia e banco

- declarar uma politica oficial de migrations
- alinhar deploy, scripts e banco
- eliminar caminhos ambigudos de schema

### Eixo 3 - Validacao e qualidade

- tornar os gates mais repetiveis
- documentar pre-requisitos reais de teste
- priorizar fluxos criticos enterprise

### Eixo 4 - Fechamento funcional enterprise

- consolidar modulos subdocumentados
- endurecer integracoes cruzadas
- validar superficie assistencial, administrativa e governanca

## Marco 1 - Base documental confiavel

- raiz `docs/` saneada
- indice novo
- trilha viva definida

## Marco 2 - Banco e deploy coerentes

- migrations oficiais explicitas
- script de cutover alinhado com a documentacao
- compose e portas sem ambiguidade

## Marco 3 - Gaps enterprise priorizados

- lista curta de gaps com dono, risco e evidencia
- foco nos modulos ja implementados

## Marco 4 - Gates utilizaveis

- `typecheck`
- `build`
- `test`
- `test:critical`
- `release:check`

Todos com documentacao objetiva de pre-requisitos e leitura de falhas.

## Criterio de chegada

- documentacao viva confiavel
- operacao reproducivel
- backlog enterprise claro
- menor distancia entre o que esta documentado e o que esta em producao
