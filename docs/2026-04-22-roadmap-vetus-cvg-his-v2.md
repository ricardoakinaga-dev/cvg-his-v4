# Roadmap — Evolução CVG-HIS V2 alinhada ao benchmark Vetus

Data: 2026-04-22
Horizonte sugerido: 16 semanas
Cadência sugerida: 8 sprints quinzenais

## 1. Objetivo do roadmap

Conduzir o CVG-HIS V2 do estado atual para um produto com:
- shell operacional Vetus-aligned;
- navegação em 3 níveis consistente;
- módulos prioritários entregues na mesma linguagem operacional;
- redução do gap entre menu, rota e experiência final.

## 2. Princípios de execução

- primeiro corrigir arquitetura e navegação, depois expandir superfícies;
- evitar criar novas rotas fora da taxonomia-alvo;
- privilegiar módulos com maior densidade operacional antes de módulos satélite;
- cada fase deve encerrar com validação real de navegação, não só revisão visual;
- manter compatibilidade progressiva para usuários internos durante a transição.

## 3. Macroentregas

### Macroentrega A — Shell operacional e taxonomia
Resultado esperado:
- sidebar, topbar, breadcrumbs e headers alinhados ao benchmark;
- nova árvore de navegação validada.

### Macroentrega B — Atendimento como domínio modelo
Resultado esperado:
- Atendimento torna-se a referência de qualidade e consistência do produto.

### Macroentrega C — Densidade ERP em Estoque/Fiscal, Financeiro e RH
Resultado esperado:
- os domínios mais densos passam a ter navegação e rotinas explícitas, não hubs genéricos.

### Macroentrega D — Marketing e Relatórios organizados
Resultado esperado:
- domínios satélite e analíticos deixam de ser “apêndices” e passam a ter estrutura clara.

## 4. Roadmap por sprint

## Sprint 1 — Diagnóstico de navegação e contrato de informação
Objetivo:
- congelar a taxonomia alvo e o contrato de navegação.

Entregas:
- inventário final de domínio > subdomínio > rotina inspirado no benchmark Vetus;
- matriz de mapeamento entre:
  - menu atual,
  - rotas atuais,
  - rotas alvo,
  - páginas existentes,
  - páginas faltantes;
- decisão sobre o papel de:
  - Favoritos,
  - Recentes,
  - Console Enterprise,
  - command palette;
- especificação de breadcrumbs, CTA contextual e cabeçalho de página.

Critério de pronto:
- nenhuma nova rota entra no projeto sem estar encaixada na árvore alvo.

## Sprint 2 — Refatoração do shell
Objetivo:
- implementar o novo shell sem ainda mexer pesado nos módulos.

Entregas:
- sidebar no padrão Vetus-aligned;
- topbar revisada;
- contexto de empresa mais explícito;
- breadcrumbs permanentes;
- cabeçalhos de página padronizados;
- CTA principal por página com anatomia consistente;
- revisão de tokens visuais para fundo, cards, espaçamentos e destaques.

Critério de pronto:
- o shell deve se manter estável em desktop e navegação principal já deve parecer o produto alvo.

## Sprint 3 — Replatform da navegação
Objetivo:
- conectar a árvore do menu às rotas reais.

Entregas:
- refatoração de `navigation.ts`;
- alinhamento com `router/routes.ts`;
- normalização dos grupos:
  - Início
  - Atendimento
  - Laboratório
  - Estoque
  - Financeiro
  - Marketing
  - RH
  - Relatórios;
- criação explícita dos subgrupos do benchmark;
- definição de estados para rotinas em construção.

Critério de pronto:
- qualquer item do menu tem destino claro e estado inequívoco.

## Sprint 4 — Atendimento: alinhamento estrutural
Objetivo:
- transformar Atendimento no domínio-vitrine do produto.

Entregas:
- reorganização do menu Atendimento em:
  - Atendimentos
  - Internação
  - Cadastros;
- posicionamento correto de:
  - Agenda
  - Comandas
  - Vendas
  - Orçamentos
  - Pacotes
  - Esteira
  - Esteira de Exames
  - Vacinas
  - Animais/Pacientes
  - Clientes/Tutores
  - Serviços;
- revisão de breadcrumbs e atalhos cruzados entre Agenda, Comandas, Fila e Atendimentos.

Critério de pronto:
- Atendimento passa a contar a mesma história operacional do benchmark.

## Sprint 5 — Estoque/Fiscal
Objetivo:
- consolidar o bloco com melhor potencial ERP depois de Atendimento.

Entregas:
- reorganização de Estoque em:
  - Controles
  - Cadastrados
  - Configurações Fiscais;
- explicitação das rotinas já existentes;
- priorização das lacunas mais visíveis do benchmark:
  - fornecedores/despesas,
  - estoques,
  - fabricantes,
  - grupos de produto,
  - tabelas fiscais faltantes;
- revisão de fluxo entre Produtos, Estoque e Fiscal.

Critério de pronto:
- o bloco Estoque/Fiscal deixa de parecer coleção de páginas soltas.

## Sprint 6 — Financeiro
Objetivo:
- dar profundidade operacional ao domínio mais defasado em relação ao benchmark.

Entregas:
- reorganização do menu Financeiro em:
  - Gaveta
  - Controles
  - Maquininha de Cartão
  - Cadastros;
- explicitação de rotinas prioritárias:
  - contas a receber,
  - contas a pagar,
  - transações,
  - bancos,
  - formas de pagamento,
  - centros de custo,
  - cartões;
- revisão da relação entre Billing, PIX, Caixa e relatórios administrativos.

Critério de pronto:
- Financeiro passa a ter leitura de ERP e não apenas visão resumida.

## Sprint 7 — RH e Relatórios
Objetivo:
- densificar a camada administrativa.

Entregas:
- RH reorganizado em:
  - Usuários
  - Comissões
  - Cadastros;
- revisão de fronteira entre RH e Governança/Access Control;
- decomposição de Relatórios por domínio:
  - Agenda
  - Atendimento
  - Cadastros
  - Estoque
  - Financeiros
  - Produção;
- revisão de páginas-hub para funcionarem como landing pages, não como substitutas de árvore.

Critério de pronto:
- RH e Relatórios deixam de ser estruturalmente rasos.

## Sprint 8 — Marketing, estados de construção e hardening
Objetivo:
- fechar o ciclo com consistência e anti-regressão.

Entregas:
- estrutura do módulo Marketing:
  - campanhas,
  - layout de e-mail,
  - SMS simples;
- padrão unificado para estados “em construção”, “sem permissão” e “sem integração”;
- testes de navegação por domínio;
- smoke tests críticos;
- checklist de consistência visual e semântica.

Critério de pronto:
- não há mais ambiguidades entre menu, rota, permissão e estado do produto.

## 5. Sequenciamento por valor

### Onda 1 — Fundamentos
Semanas 1 a 4
- Sprint 1
- Sprint 2

### Onda 2 — Arquitetura navegável
Semanas 5 a 6
- Sprint 3

### Onda 3 — Domínio core
Semanas 7 a 8
- Sprint 4

### Onda 4 — ERP operacional
Semanas 9 a 12
- Sprint 5
- Sprint 6

### Onda 5 — Camada administrativa e fechamento
Semanas 13 a 16
- Sprint 7
- Sprint 8

## 6. Dependências críticas

### Dependências de design/product
- congelamento da taxonomia final;
- definição do papel dos módulos satélite;
- validação dos estados do produto em construção.

### Dependências de front-end
- refatoração controlada de `AppLayout.vue`;
- refatoração de `navigation.ts`;
- alinhamento de `router/routes.ts`;
- revisão dos componentes de cabeçalho, cards, filtros e tabelas.

### Dependências de back-end/integração
- confirmação das superfícies reais por domínio;
- clareza sobre endpoints e recursos já estáveis;
- definição de mocks ou estados temporários quando a rotina ainda não estiver completa.

## 7. Riscos principais

### Risco 1 — redesenhar sem reorganizar a informação
Mitigação:
- toda mudança visual deve nascer da árvore de navegação aprovada.

### Risco 2 — manter hubs genéricos por conveniência
Mitigação:
- hub só pode existir como landing page do domínio, nunca como substituto de subárvore.

### Risco 3 — misturar governança com operação demais
Mitigação:
- Console Enterprise e ferramentas de plataforma devem sair da frente da operação principal.

### Risco 4 — regressão de navegação
Mitigação:
- testes de rotas e smoke tests a cada sprint.

### Risco 5 — abrir mais módulos do que a equipe consegue consolidar
Mitigação:
- priorização rígida: shell > navegação > Atendimento > Estoque/Fiscal > Financeiro > RH > Relatórios > Marketing.

## 8. Métricas de acompanhamento

### Métricas de produto
- % de rotinas do menu com destino funcional claro;
- % de rotinas com estado explícito e consistente;
- tempo médio para localizar uma rotina crítica;
- número de cliques entre Início e rotinas core.

### Métricas de engenharia
- rotas órfãs;
- itens de menu sem página associada;
- páginas sem breadcrumb correto;
- páginas sem CTA contextual padronizado;
- cobertura de smoke tests por domínio.

### Métricas de UX operacional
- taxa de uso dos módulos core após reordenação;
- uso de busca global vs navegação direta;
- recorrência em favoritos/recentes após mudança do shell;
- feedback interno de recepção, operação clínica e financeiro.

## 9. Marco de aceite final

O roadmap estará concluído quando:
- o shell estiver visualmente alinhado ao benchmark;
- a navegação tiver coerência total com a árvore definida;
- Atendimento, Estoque/Fiscal, Financeiro e RH estiverem organizados como macrodomínios explícitos;
- Marketing e Relatórios tiverem estrutura clara;
- o produto inteiro tiver uma linguagem única de navegação, cabeçalho, estados e ações.