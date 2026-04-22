# Backlog de Implementação — Melhorias CVG-HIS V2 alinhadas ao benchmark Vetus

Data: 2026-04-22
Tipo: backlog executivo e tático
Critério de priorização: P0 > P1 > P2 > P3

## Convenções
- P0 = fundacional, bloqueia outras frentes
- P1 = alta prioridade, entrega valor operacional direto
- P2 = importante, mas pode vir após estabilização da fundação
- P3 = complementar

- XS = até 1 dia
- S = 1 a 3 dias
- M = 3 a 5 dias
- L = 1 sprint
- XL = mais de 1 sprint

## EPIC 1 — Shell operacional Vetus-aligned

### BL-001 — Refatorar anatomia da sidebar
Prioridade: P0
Esforço: L
Objetivo:
- fazer a sidebar refletir a estrutura do benchmark.

Entregáveis:
- grupos principais fixos;
- comportamento de expansão coerente;
- destaque visual do item ativo;
- subgrupos em faixa visual distinta;
- redução de ruído lateral.

Arquivos-alvo:
- `apps/spa/src/layouts/AppLayout.vue`
- `apps/spa/src/navigation.ts`
- componentes de apoio do design system, se necessário.

### BL-002 — Reposicionar Favoritos, Recentes e Console Enterprise
Prioridade: P0
Esforço: M
Objetivo:
- impedir que superfícies utilitárias concorram com a navegação principal.

Entregáveis:
- Favoritos e Recentes em área secundária controlada;
- Console Enterprise separado da árvore operacional principal.

### BL-003 — Revisar topbar no padrão operacional do benchmark
Prioridade: P0
Esforço: M
Objetivo:
- aproximar a topbar do benchmark sem perder utilidades modernas.

Entregáveis:
- contexto de empresa mais explícito;
- suporte/ajuda/WhatsApp no padrão visual correto;
- hierarquia melhor entre título, ações globais e perfil.

### BL-004 — Padronizar breadcrumbs em todas as páginas
Prioridade: P0
Esforço: M
Objetivo:
- tornar a navegação rastreável em todo o sistema.

Entregáveis:
- breadcrumb estrutural por domínio;
- breadcrumb coerente com a árvore do menu;
- fallback padronizado para páginas detalhe/formulário.

### BL-005 — Padronizar cabeçalho de página e CTA principal
Prioridade: P0
Esforço: M
Objetivo:
- reproduzir o padrão de página do benchmark.

Entregáveis:
- header com título, subtítulo, breadcrumbs e CTA principal;
- hierarquia consistente entre CTA primário, secundário e busca/filtros.

## EPIC 2 — Taxonomia de produto e contrato de navegação

### BL-006 — Definir árvore final domínio > subdomínio > rotina
Prioridade: P0
Esforço: M
Objetivo:
- congelar a arquitetura de informação alvo.

Entregáveis:
- mapa único da navegação;
- matriz atual vs alvo;
- nomenclatura padronizada.

### BL-007 — Refatorar `navigation.ts` para a nova árvore
Prioridade: P0
Esforço: L
Objetivo:
- transformar a árvore aprovada em contrato real do front-end.

### BL-008 — Refatorar `router/routes.ts` para aderir à árvore
Prioridade: P0
Esforço: L
Objetivo:
- alinhar rotas, labels, breadcrumbs e navegação.

### BL-009 — Criar regra de estados por rotina
Prioridade: P0
Esforço: S
Objetivo:
- impedir ambiguidades entre módulo pronto, parcial e indisponível.

Estados sugeridos:
- funcional
- em construção
- sem permissão
- sem integração
- legado planejado

### BL-010 — Eliminar rotas órfãs e nomenclatura inconsistente
Prioridade: P1
Esforço: M
Objetivo:
- remover dívida estrutural da árvore de navegação.

## EPIC 3 — Atendimento como domínio modelo

### BL-011 — Reestruturar menu Atendimento
Prioridade: P1
Esforço: L
Objetivo:
- organizar o domínio em:
  - Atendimentos
  - Internação
  - Cadastros

### BL-012 — Reposicionar Agenda no subdomínio correto
Prioridade: P1
Esforço: S
Objetivo:
- alinhar Agenda à árvore oficial e aos breadcrumbs esperados.

### BL-013 — Reposicionar Comandas como rotina central do balcão
Prioridade: P1
Esforço: S
Objetivo:
- manter Comandas como rotina premium do Atendimento.

### BL-014 — Estruturar Vendas e Orçamentos na navegação de Atendimento
Prioridade: P1
Esforço: M
Objetivo:
- refletir o benchmark sem deixar rotas comerciais dispersas.

### BL-015 — Definir estratégia para Pacotes, Esteira, Esteira de Exames e Vacinas
Prioridade: P1
Esforço: M
Objetivo:
- decidir se entram como páginas completas, hubs operacionais ou estados explícitos.

### BL-016 — Consolidar Cadastros-base do Atendimento
Prioridade: P1
Esforço: M
Objetivo:
- agrupar Pacientes, Tutores e Serviços na árvore correta.

### BL-017 — Melhorar cross-navigation entre Agenda, Fila, Atendimentos e Internação
Prioridade: P1
Esforço: M
Objetivo:
- reduzir atrito na jornada operacional.

## EPIC 4 — Laboratório

### BL-018 — Reestruturar menu Laboratório em Atendimentos e Cadastrados
Prioridade: P1
Esforço: S
Objetivo:
- aderir ao benchmark documental.

### BL-019 — Destacar Exames, Laudos, Hemogramas, Urina e Bioquímico
Prioridade: P1
Esforço: M
Objetivo:
- explicitar as rotinas laboratoriais centrais no front-end.

### BL-020 — Revisar hub laboratorial como landing page e não como fim da navegação
Prioridade: P2
Esforço: S
Objetivo:
- reforçar papel do hub sem esconder as rotinas.

## EPIC 5 — Estoque e Fiscal

### BL-021 — Reestruturar menu Estoque
Prioridade: P1
Esforço: M
Objetivo:
- organizar em:
  - Controles
  - Cadastrados
  - Configurações Fiscais

### BL-022 — Reconciliar Produtos com Inventário e Movimentações
Prioridade: P1
Esforço: M
Objetivo:
- fazer o usuário entender claramente a diferença entre catálogo e estoque operacional.

### BL-023 — Expor rotinas de cadastros do benchmark
Prioridade: P1
Esforço: L
Objetivo:
- incluir/organizar:
  - fornecedores;
  - estoques;
  - fabricantes;
  - grupos de produto.

### BL-024 — Completar árvore fiscal
Prioridade: P1
Esforço: L
Objetivo:
- refletir com clareza:
  - ICMS
  - IPI
  - PIS/COFINS
  - CFOP
  - NFS-e
  - Matriz ICMS
  - IBS/CBS
  - NCM/IBPT

## EPIC 6 — Financeiro

### BL-025 — Reestruturar menu Financeiro
Prioridade: P1
Esforço: L
Objetivo:
- organizar em:
  - Gaveta
  - Controles
  - Maquininha de Cartão
  - Cadastros

### BL-026 — Materializar contas a receber e contas a pagar como rotinas principais
Prioridade: P1
Esforço: L
Objetivo:
- sair de uma camada financeira excessivamente resumida.

### BL-027 — Materializar transações/cartão/split
Prioridade: P2
Esforço: L
Objetivo:
- aproximar a profundidade do benchmark financeiro.

### BL-028 — Materializar bancos, cartões, formas de pagamento e centros de custo
Prioridade: P2
Esforço: L
Objetivo:
- completar a camada de cadastros financeiros.

### BL-029 — Revisar fronteira entre Billing, Caixa e PIX
Prioridade: P1
Esforço: M
Objetivo:
- reduzir sobreposição conceitual e melhorar a navegação.

## EPIC 7 — RH

### BL-030 — Reestruturar menu RH
Prioridade: P1
Esforço: M
Objetivo:
- organizar em:
  - Usuários
  - Comissões
  - Cadastros

### BL-031 — Consolidar Usuários e Equipe como subárvore coerente
Prioridade: P1
Esforço: S
Objetivo:
- alinhar a superfície já existente com a taxonomia alvo.

### BL-032 — Planejar e expor o eixo de Comissões
Prioridade: P2
Esforço: L
Objetivo:
- preparar:
  - regras de comissão,
  - cálculo de comissão,
  - rotinas relacionadas.

### BL-033 — Definir fronteira entre RH e Governança de Acesso
Prioridade: P1
Esforço: M
Objetivo:
- impedir mistura entre operação de pessoas e ferramentas de plataforma.

## EPIC 8 — Marketing

### BL-034 — Estruturar árvore mínima de Marketing
Prioridade: P2
Esforço: M
Objetivo:
- organizar:
  - campanhas,
  - layout de e-mail,
  - SMS simples.

### BL-035 — Revisar Central de Notificações e WhatsApp como base do domínio
Prioridade: P2
Esforço: M
Objetivo:
- decidir o que é comunicação operacional e o que é marketing de campanha.

## EPIC 9 — Relatórios

### BL-036 — Quebrar hub único em árvore de relatórios por domínio
Prioridade: P1
Esforço: L
Objetivo:
- substituir visão excessivamente genérica por navegação útil.

### BL-037 — Criar landing pages de relatórios por macrodomínio
Prioridade: P2
Esforço: L
Objetivo:
- suportar:
  - Agenda
  - Atendimento
  - Cadastros
  - Estoque
  - Financeiro
  - Produção

### BL-038 — Padronizar cards, filtros e tabelas dos relatórios
Prioridade: P2
Esforço: M
Objetivo:
- aproximar a camada analítica da linguagem visual do restante do sistema.

## EPIC 10 — Consistência visual e de estados

### BL-039 — Padronizar estados “em construção”
Prioridade: P0
Esforço: S
Objetivo:
- eliminar mensagens genéricas e ambíguas.

### BL-040 — Padronizar estados “sem permissão”
Prioridade: P1
Esforço: S
Objetivo:
- comunicar claramente bloqueio de acesso vs ausência de funcionalidade.

### BL-041 — Padronizar estados “sem dados”
Prioridade: P1
Esforço: S
Objetivo:
- manter consistência entre módulos ricos e listagens simples.

### BL-042 — Padronizar filtros laterais, drawers e barras de busca
Prioridade: P1
Esforço: M
Objetivo:
- reduzir inconsistência de interação entre páginas.

### BL-043 — Padronizar cards operacionais e tabelas leves
Prioridade: P2
Esforço: M
Objetivo:
- usar Agenda e Comandas como referência de linguagem.

## EPIC 11 — Qualidade e anti-regressão

### BL-044 — Criar testes de navegação do shell
Prioridade: P0
Esforço: M
Objetivo:
- garantir que menu, breadcrumbs e roteamento permaneçam coerentes.

### BL-045 — Criar smoke tests por macrodomínio
Prioridade: P1
Esforço: M
Objetivo:
- validar acesso e renderização básica das rotinas críticas.

### BL-046 — Criar checklist de aceite visual por página
Prioridade: P1
Esforço: S
Objetivo:
- reforçar consistência da linguagem Vetus-aligned.

### BL-047 — Criar inventário contínuo de rotas, menu e páginas
Prioridade: P1
Esforço: S
Objetivo:
- evitar drift entre implementação e arquitetura de informação.

## Ordenação recomendada de execução

### Lote 1 — Fundacional
- BL-001
- BL-002
- BL-003
- BL-004
- BL-005
- BL-006
- BL-007
- BL-008
- BL-009
- BL-039
- BL-044

### Lote 2 — Domínio modelo
- BL-011
- BL-012
- BL-013
- BL-014
- BL-015
- BL-016
- BL-017
- BL-018
- BL-019

### Lote 3 — Densidade ERP
- BL-021
- BL-022
- BL-023
- BL-024
- BL-025
- BL-026
- BL-029
- BL-030
- BL-031
- BL-033

### Lote 4 — Expansão controlada
- BL-020
- BL-027
- BL-028
- BL-032
- BL-034
- BL-035
- BL-036
- BL-037
- BL-038
- BL-040
- BL-041
- BL-042
- BL-043
- BL-045
- BL-046
- BL-047

## Resultado esperado do backlog

Ao concluir os itens P0 e P1, o CVG-HIS V2 deve atingir:
- shell fortemente alinhado ao benchmark Vetus;
- navegação com narrativa clara de produto;
- Atendimento como referência operacional;
- Estoque/Fiscal, Financeiro e RH com densidade adequada;
- Relatórios e Marketing posicionados corretamente;
- consistência de estados, rotas e experiência final.