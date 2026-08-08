# 420 - Plano Priorizado de Atualizacao Documental

## Objetivo

Transformar a pasta `docs/` em uma base mais confiavel, navegavel e aderente ao codigo atual sem perder o historico relevante.

## Prioridade P0

### 1. Corrigir documentos que podem induzir erro operacional

- atualizar `114-frontend-architecture.md`
- atualizar `apps/web/README.md`
- atualizar `apps/api/README.md`
- atualizar `apps/worker/README.md`
- revisar `130-instalacao-publicacao-cvg-his-v2-real.md`
- revisar `131-checklist-cutover-servidor.md`
- revisar `infra/scripts/cutover-v2.sh` em paralelo com a documentacao

### 2. Alinhar deploy e banco com a realidade

- declarar explicitamente qual track de migration e oficial hoje
- se o track oficial continuar sendo `packages/shared/database/src/migrations`, documentar `001-016`
- se o track oficial passar a ser `packages/db/migrations`, atualizar todos os documentos operacionais para apontar para ele
- eliminar o estado atual de ambiguidade
- documentar as portas externas reais do `docker-compose.v2.yml`

### 3. Resolver a governanca de numeracao

- remover colisoes numericas
- criar regra: um numero, um artefato vivo
- mover duplicatas historicas para subpasta dedicada

## Prioridade P1

### 4. Reescrever o indice `docs/README.md`

O indice precisa responder:

- quais documentos sao fonte de verdade hoje
- quais sao referencia arquitetural
- quais sao historicos
- quais sao operacionais
- quais sao prompts ou artefatos auxiliares

### 5. Criar bloco `400-499` como trilha oficial de auditoria documental

Sugestao de estrutura:

- `400-auditoria-documental-pente-fino.md`
- `410-matriz-aderencia-documental.md`
- `420-plano-atualizacao-documental.md`
- `430-fonte-de-verdade-documental.md`
- `440-mapa-de-historicos-e-arquivos-arquivaveis.md`

### 6. Cobrir os modulos que ja existem no codigo e nao estao bem documentados

Criar ou consolidar documentacao viva para:

- `access-control`
- `attachments`
- `billing`
- `notifications`
- `scheduling`
- `staff`
- `surgery`
- `triage`
- `users`

## Prioridade P2

### 7. Reduzir a mistura entre documentacao e artefatos de execucao assistida

- mover prompts `13x`, `14x`, `15x`, `91x` e correlatos para subpasta propria
- manter no topo apenas documentos de leitura humana recorrente
- adicionar banner de classificacao no topo dos documentos historicos

### 8. Padronizar cabecalho minimo dos documentos vivos

Cada documento vivo deveria ter:

- status: `vivo`, `referencia`, `historico`, `operacional`
- data da ultima validacao
- fonte de evidencia
- responsavel pela manutencao
- dependencias de leitura

### 9. Melhorar a parte de testes operacionais

- explicitar pre-requisitos de banco para `pnpm test:critical`
- documentar `DATABASE_URL_TEST` e credenciais esperadas
- registrar o motivo atual de falha quando o banco local nao esta preparado
- amarrar isso aos documentos `700-790`

## Sequencia recomendada de execucao

1. atualizar `130`, `131`, `114`, `apps/web/README.md`, `apps/api/README.md`, `apps/worker/README.md`
2. decidir oficialmente a trilha unica de migrations
3. corrigir duplicidades de numeracao e reorganizar o indice
4. cobrir modulos ausentes ou subdocumentados
5. arquivar prompts e historicos em local apropriado

## Meta de qualidade sugerida

| Meta | Alvo |
| --- | --- |
| Fonte de verdade identificavel em ate 2 cliques | 100% |
| Documentos vivos com data de validacao | 100% |
| Colisoes numericas no topo de `docs/` | 0 |
| Modulos implementados com documentacao minima viva | 20/20 |
| Divergencias operacionais conhecidas entre docs e deploy | 0 |

## Resultado esperado

Ao final desse plano, a pasta `docs/` deixa de ser apenas um grande acervo e passa a operar como:

- mapa de onboarding
- referencia arquitetural
- manual operacional confiavel
- trilha auditavel de evolucao do produto
