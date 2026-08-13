# 430 - Fonte de Verdade Documental

**Status:** vivo
**Data de validacao:** 2026-08-11

O estado executável atual e os scores reproduzidos localmente estão registrados em [2026-08-11-relatorio-auditoria-p1.md](2026-08-11-relatorio-auditoria-p1.md). Os relatórios de release com scores 96/97 permanecem como histórico de seus ciclos.

## Objetivo

Definir quais documentos da raiz `docs/` devem ser tratados como fonte de verdade daqui para frente.

## Regra geral

Se um documento nao ajuda diretamente a construir, validar, operar ou publicar o sistema atual, ele nao fica na raiz `docs/`.

## Fontes de verdade por tema

### Arquitetura

- `112-target-architecture.md`
- `113-module-contracts.md`
- `114-frontend-architecture.md`
- `115-backend-architecture.md`
- `116-worker-architecture.md`

### Construcao e priorizacao

- `123-phased-execution-plan.md`
- `440-roadmap-construcao-85.md`
- `450-gaps-enterprise-priorizados.md`

### Qualidade

- `460-qualidade-testes-e-gates.md`
- `2026-08-11-relatorio-auditoria-p1.md`

### Banco, migrations e deploy

- `470-politica-migracao-e-deploy.md`
- `130-instalacao-publicacao-cvg-his-v2-real.md`
- `131-checklist-cutover-servidor.md`

### Auditoria documental

- `400-auditoria-documental-pente-fino.md`
- `410-matriz-aderencia-documental.md`
- `420-plano-atualizacao-documental.md`

## Regras de manutencao

- qualquer divergencia detectada entre docs e codigo deve ser corrigida na trilha viva
- historico vai para `docs/docs2/`
- prompts e roteiros de automacao nao permanecem na raiz
- documento sem owner editorial ou sem uso claro deve ser arquivado

## Meta

Ao final da consolidacao:

- a raiz `docs/` deve ser pequena, confiavel e navegavel
- a documentacao deve sustentar nota `85/100` ou superior
