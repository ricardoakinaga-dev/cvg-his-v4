# PROMPT MASTER — CVG-HIS-V2 — CORREÇÃO DAS LACUNAS PARA PRODUÇÃO ENTERPRISE

## Objetivo

Executar somente as correcoes tecnicas e operacionais necessarias para elevar o CVG-HIS-V2 do estado atual de `78/100` para patamar minimo de producao controlada enterprise, sem reabrir escopo funcional dos modulos ja aprovados.

## Bases obrigatorias

- `/docs/90-hardening-global.md`
- `/docs/91-prompt-master-hardening-global-transversal.md`
- `/docs/98-matriz-prontidao-producao-enterprise.md`
- relatorios finais de reauditoria dos modulos em `/docs`

## Regra central

Esta tarefa e de **correcao de lacunas estruturais**, nao de construcao de novos modulos.

Nao fazer:

- novas features funcionais
- redesign de UX
- refatoracao arquitetural abstrata
- mudancas cosmeticas sem ganho de confiabilidade

## Alvos obrigatorios

1. Fechar o hardening global transversal.
2. Fazer a suite ampla da API fechar de forma reproduzivel.
3. Eliminar dependencia funcional de memoria como fonte primaria.
4. Consolidar constraints seguras e sensiveis ja planejadas.
5. Consolidar versionamento otimista nos pontos criticos.
6. Remover os principais pontos remanescentes de `delete+recreate`.
7. Padronizar lifecycle endpoints onde ainda houver ambiguidade relevante.
8. Reduzir a distancia entre runtime, testes, staging e comportamento real.

## Ordem obrigatoria

1. finalizar FASE 9 do hardening global, se ainda houver qualquer pendencia
2. corrigir bloqueios de readiness operacional que afetem deploy ou reproducibilidade
3. corrigir gaps criticos de governanca de release
4. rerodar validacoes tecnicas completas

## Critério de sucesso

- suite ampla da API verde
- typecheck e build verdes nos componentes principais
- sem bloqueio estrutural conhecido aberto
- sistema apto a nova auditoria de prontidao para producao

## Entregavel obrigatorio

Criar:

- `/docs/137-relatorio-correcao-lacunas-producao-enterprise.md`

Com:

1. lacunas corrigidas
2. arquivos alterados
3. validacoes executadas
4. bloqueios restantes, se houver
5. impacto esperado na nota da matriz
