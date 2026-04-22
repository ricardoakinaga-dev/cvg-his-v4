# Contrato canônico de navegação — CVG-HIS V2 Vetus-aligned

Data: 2026-04-22
Status: canônico para Sprint 1
Objetivo: definir a árvore oficial domínio > subdomínio > rotina que deve governar menu, breadcrumbs, rotas, estados e headers do SPA.

## 1. Grupos principais oficiais

A navegação principal do shell deve expor somente estes grupos de primeiro nível:
- Início
- Atendimento
- Laboratório
- Estoque
- Financeiro
- Marketing
- RH
- Relatórios

Observação:
- superfícies de plataforma, governança e integrações não devem competir com a árvore operacional principal;
- Console Enterprise pode continuar existindo, mas fora da espinha dorsal do menu clínico-operacional.

## 2. Árvore oficial por domínio

## 2.1 Início

### Subdomínio: Visão geral
Rotinas:
- Dashboard — existente

## 2.2 Atendimento

### Subdomínio: Atendimentos
Rotinas:
- Agenda — existente
- Fila Operacional — existente
- Atendimentos — existente
- Triagem — existente
- Prontuário — existente
- Cirurgias — existente
- Comandas — existente
- Vendas — a posicionar / revisar
- Orçamentos — existente, mas hoje fora da narrativa ideal
- Pacotes — planejado / em construção
- Esteira — planejado / em construção
- Esteira de Exames — planejado / em construção
- Vacinas e Vermífugos — planejado / em construção

### Subdomínio: Internação
Rotinas:
- Internação — existente
- Mapa de Leitos — existente
- Setores — existente
- Leitos — existente
- Altas — existente
- Ocorrências — planejado
- Diárias — planejado
- Prescrição de Internação — planejado

### Subdomínio: Cadastros
Rotinas:
- Pacientes — existente
- Tutores — existente
- Serviços — existente
- Importações e tabelas auxiliares — planejado

## 2.3 Laboratório

### Subdomínio: Atendimentos
Rotinas:
- Exames / Pedidos de Exame — existente
- Laudos / Resultados — existente
- Hemogramas — parcialmente representado, precisa explicitação
- Urina — parcialmente representado, precisa explicitação
- Bioquímico — parcialmente representado, precisa explicitação
- Central Diagnóstica — existente

### Subdomínio: Cadastrados
Rotinas:
- Equipamentos — existente
- Tipos de Laudo — existente
- Referências Hemograma — planejado / a derivar de valores de referência
- Referências Bioquímico — planejado / a derivar de valores de referência
- Valores de Referência — existente

## 2.4 Estoque

### Subdomínio: Controles
Rotinas:
- Estoque — existente
- Movimentações — existente
- Validade de Produtos — existente
- Consulta de Preços — planejado
- Entrada de Nota Fiscal — planejado

### Subdomínio: Cadastrados
Rotinas:
- Produtos — existente
- Fornecedores — planejado
- Estoques — planejado
- Fabricantes — planejado
- Grupos de Produto — planejado
- Despesas vinculadas ao domínio — planejado

### Subdomínio: Configurações Fiscais
Rotinas:
- Fiscal / Configuração Fiscal — existente
- Tabela ICMS — existente
- Tabela IPI — planejado
- Tabela PIS / COFINS — parcialmente existente
- Tabela CFOP — existente
- Tabela NFS-e — existente
- Matriz ICMS — existente
- Tabela IBS/CBS — planejado
- NCM / IBPT — existente

## 2.5 Financeiro

### Subdomínio: Gaveta
Rotinas:
- Caixa / Gaveta — existente

### Subdomínio: Controles
Rotinas:
- Faturamento — existente
- Contas a Receber — planejado prioritário
- Contas a Pagar — planejado prioritário
- Pagamento Antecipado — planejado
- Fluxo de Caixa — planejado / hoje parcialmente coberto em relatórios
- Linha do Tempo — planejado
- Dashboard Financeiro — parcialmente coberto em relatórios
- Orçamentos — existente, mas precisa decisão final entre Atendimento e Financeiro
- PIX — existente

### Subdomínio: Maquininha de Cartão
Rotinas:
- Transações de Cartão — planejado prioritário
- Contas Adm. Cartão — planejado
- Simulador de Split — planejado
- Configuração do Split — planejado
- Exportador de Split — planejado

### Subdomínio: Cadastros
Rotinas:
- Formas de Pagamento — planejado prioritário
- Centros de Custo — planejado prioritário
- Custos e Despesas — planejado
- Cartões — planejado
- Bancos — planejado prioritário
- Cheques — planejado

## 2.6 Marketing

### Subdomínio: Campanhas
Rotinas:
- Campanhas — planejado

### Subdomínio: Comunicação
Rotinas:
- Layout de E-mail — planejado
- SMS Simples — planejado
- Central de Notificações — existente, precisa decisão de fronteira
- WhatsApp Operacional — existente, precisa decisão de fronteira

## 2.7 RH

### Subdomínio: Usuários
Rotinas:
- Usuários — existente
- Profissionais / Equipe — existente
- Grupos de Acesso — planejado

### Subdomínio: Comissões
Rotinas:
- Regras de Comissão — planejado prioritário
- Cálculo de Comissões — planejado prioritário

### Subdomínio: Cadastros
Rotinas:
- Folgas — planejado
- Cadastros auxiliares de RH — planejado

## 2.8 Relatórios

### Subdomínio: Agenda
Rotinas:
- Relatórios de Agenda — planejado

### Subdomínio: Atendimento
Rotinas:
- Relatórios de Atendimento — planejado
- Atendimento por Profissional — planejado

### Subdomínio: Cadastros
Rotinas:
- Relatórios de Cadastros — planejado

### Subdomínio: Estoque
Rotinas:
- Relatórios de Estoque — planejado

### Subdomínio: Financeiro
Rotinas:
- Relatórios Financeiros — parcialmente coberto
- Relatórios de Fluxo de Caixa — parcialmente coberto

### Subdomínio: Produção
Rotinas:
- Relatórios de Produção — planejado

## 3. Regras canônicas

- cada rotina deve pertencer a exatamente um subdomínio principal no menu;
- landing pages são permitidas, mas não substituem a árvore operacional;
- rotinas planejadas podem aparecer no menu apenas se tiverem estado explícito;
- itens de plataforma e governança não devem ser confundidos com domínios operacionais;
- aliases legados são permitidos no roteamento, mas não devem dominar a navegação principal.

## 4. Fronteiras que exigem decisão controlada

- Orçamentos: manter em Financeiro, mover para Atendimento, ou expor em ambos via atalhos controlados;
- Vendas: decidir se permanece como braço de Comandas/Atendimento ou entra em subárvore comercial mais explícita;
- Notificações e WhatsApp: decidir se pertencem a Marketing, Operação, ou se terão dupla entrada controlada;
- Governança de Acesso, Auditoria, LGPD, API Keys e Webhooks: manter fora da árvore operacional principal.

## 5. Uso deste documento

Este documento é o contrato primário para:
- `apps/spa/src/navigation.ts`
- `apps/spa/src/router/routes.ts`
- breadcrumbs
- headers de página
- placeholders e estados de rotina
- backlog técnico da Fase A
