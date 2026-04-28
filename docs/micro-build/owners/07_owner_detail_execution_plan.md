# Plano de Implementação Futura

Este plano é deliberadamente faseado para evitar refatoração ampla e regressões na tela de tutor.

## Fase 0 - auditoria e mapeamento

Status: concluída por esta documentação.

Entregáveis:

- Mapa da estrutura atual.
- Mapa de rotas e integrações.
- Lista de problemas UX/UI e funcionais.
- Proposta de reorganização.
- Backlog priorizado.
- Checklist de validação.

Critério de saída:

- Os oito documentos em `docs/micro-build/owners/` existem e são consistentes.

## Fase 1 - reorganização visual sem mudar regra de negócio

Objetivo:

- Reduzir poluição visual e melhorar hierarquia sem alterar endpoints, payloads ou regras.

Ordem sugerida:

1. OWNER-P1-001 - Reduzir CTAs do header.
2. OWNER-P1-003 - Corrigir semântica dos KPIs.
3. OWNER-P1-004 - Consolidar cadastro completo.
4. OWNER-P1-005 - Priorizar pets vinculados.
5. OWNER-P1-008 - Reposicionar comunicação.
6. OWNER-P1-010 - Unificar financeiro visual.
7. OWNER-P1-012 - Remover jargão técnico da UI final.

Critério de saída:

- A tela mantém todos os dados atuais, mas pets, contato e alertas aparecem com prioridade correta.
- Nenhum comportamento de API muda.

## Fase 2 - correção de ações, botões e estados

Objetivo:

- Tornar ações seguras, contextuais e compreensíveis.

Ordem sugerida:

1. OWNER-P0-001 - Contextualizar ações de comanda e navegação.
2. OWNER-P0-002 - Separar alertas críticos de recomendações.
3. OWNER-P0-003 - Adicionar confirmação antes de criar orçamento.
4. OWNER-P0-004 - Tornar comunicação externa revisável.
5. OWNER-P1-006 - Tornar agenda acionável.
6. OWNER-P1-007 - Tornar atendimentos acionáveis.
7. OWNER-P1-009 - Melhorar estados vazios.
8. OWNER-P1-011 - Separar pacotes de orçamentos.

Critério de saída:

- Nenhuma ação perigosa acontece em um clique sem confirmação.
- Links preservam contexto.
- Estados vazios orientam próximo passo.

## Fase 3 - integração fina com backend

Objetivo:

- Trocar inferências locais e filtros globais por fontes explícitas, performáticas e auditáveis.

Ordem sugerida:

1. OWNER-P2-001 - Usar filtros backend para agenda e atendimentos.
2. OWNER-P2-002 - Criar resumo financeiro por tutor.
3. OWNER-P2-003 - Integrar fidelidade com módulo comercial.
4. OWNER-P2-004 - Validar CRM e recomendações comerciais.
5. OWNER-P2-005 - Isolar loading/error por bloco.
6. OWNER-P2-006 - Mapear e adicionar documentos/anexos do tutor.
7. OWNER-P2-007 - Mapear auditoria/logs por tutor.
8. OWNER-P2-008 - Validar permissões de ações.

Critério de saída:

- Métricas de financeiro, fidelidade e CRM têm origem declarada.
- A tela não depende de listas globais para dados do tutor quando houver endpoint filtrado.
- Permissões são respeitadas antes de ações sensíveis.

## Fase 4 - auditoria final e testes E2E

Objetivo:

- Validar fluxo completo em desktop e mobile, com dados reais/sanitizados e permissões diferentes.

Ordem sugerida:

1. OWNER-P3-001 - Validar responsividade desktop/tablet/mobile.
2. OWNER-P3-002 - Padronizar ícones.
3. OWNER-P3-003 - Revisar densidade e espaçamento.
4. Criar/atualizar E2E para fluxo principal do tutor.
5. Reexecutar checklist completo.

Critério de saída:

- Tela sem overflow.
- Ações principais cobertas por teste.
- Fluxos de tutor com e sem pets, com e sem financeiro, e com permissões limitadas validados.

## Observações de execução

- Cada microtarefa deve ter commit próprio.
- Evitar refatorar componentes globais sem necessidade.
- Não misturar reorganização visual com mudança de contrato backend.
- Quando uma origem de dado não estiver confirmada, manter `precisa validação` no PR/tarefa.
