# Convenções de labels, breadcrumbs e CTA primário

Data: 2026-04-22
Status: oficial para Sprint 1 e Fase A

## 1. Convenções de nomenclatura

### 1.1 Grupos principais
Usar exatamente:
- Início
- Atendimento
- Laboratório
- Estoque
- Financeiro
- Marketing
- RH
- Relatórios

### 1.2 Regras de labels
- preferir termos operacionais reconhecíveis pelo usuário final;
- usar singular/plural conforme o padrão mais natural da rotina;
- evitar labels excessivamente técnicas no menu;
- não misturar vocabulário de plataforma com vocabulário operacional;
- evitar sinônimos para a mesma rotina em lugares diferentes.

### 1.3 Labels oficiais por rotina principal
- Dashboard
- Agenda
- Fila Operacional
- Atendimentos
- Triagem
- Prontuário
- Cirurgias
- Comandas
- Internação
- Mapa de Leitos
- Setores
- Leitos
- Altas
- Pacientes
- Tutores
- Serviços
- Pedidos de Exame
- Resultados
- Central Diagnóstica
- Equipamentos
- Tipos de Laudo
- Valores de Referência
- Estoque
- Movimentações
- Validade de Produtos
- Produtos
- Fiscal
- ICMS
- PIS / COFINS
- CFOP
- NFS-e
- IBPT / NCM
- Matriz ICMS
- Caixa
- Faturamento
- PIX
- Usuários
- Equipe
- Hubs Administrativos (temporário, até decomposição final)

## 2. Convenções de breadcrumb

## 2.1 Estrutura base
Padrão preferencial:
- Grupo > Subdomínio > Rotina

Quando aplicável:
- Grupo > Subdomínio > Rotina > Detalhe
- Grupo > Subdomínio > Rotina > Novo
- Grupo > Subdomínio > Rotina > Editar

## 2.2 Regras
- breadcrumb deve refletir a árvore de navegação, não apenas a URL;
- páginas de detalhe devem herdar o pai da listagem;
- formulários de criação devem usar “Novo” ou “Nova” conforme o substantivo;
- formulários de edição devem usar “Editar”; 
- evitar breadcrumbs genéricos como “Dashboard” para tudo.

## 2.3 Exemplos oficiais
- Atendimento > Atendimentos > Agenda
- Atendimento > Atendimentos > Comandas
- Atendimento > Cadastros > Pacientes
- Atendimento > Cadastros > Pacientes > Novo Paciente
- Atendimento > Internação > Internação
- Laboratório > Atendimentos > Pedidos de Exame
- Estoque > Cadastrados > Produtos
- Estoque > Configurações Fiscais > ICMS
- Financeiro > Gaveta > Caixa
- RH > Usuários > Usuários
- Relatórios > Financeiro > Relatórios Financeiros

## 3. Convenções de título e subtítulo de página

### 3.1 Título
- deve refletir a rotina, não o grupo inteiro;
- deve ser curto e inequívoco;
- não repetir emoji no título final, salvo decisão explícita do design system.

### 3.2 Subtítulo
- explicar o propósito operacional da rotina;
- pode citar o caminho do domínio quando isso ajudar a orientar;
- deve evitar marketing genérico.

Exemplo bom:
- “Atendimento > Agenda. Cockpit multiprofissional com filtros, mini calendário e visões de mês, semana e dia.”

## 4. Convenções de CTA primário

## 4.1 Listagens
A CTA primária deve ser de criação ou abertura da rotina principal.

Exemplos:
- Agenda → + Criar agendamento
- Pacientes → Novo Paciente
- Produtos → Novo Produto
- Usuários → + Novo Usuário
- Comandas → + Abrir Nova Comanda

## 4.2 Dashboards / landing pages de domínio
A CTA primária deve apontar para a ação operacional mais importante do domínio.

Exemplos:
- Início → + Novo Agendamento
- Laboratório → Pedidos de Exame ou Nova Solicitação, se fizer sentido
- Relatórios → Aplicar filtros ou Abrir relatório prioritário, se a rotina for analítica

## 4.3 Detalhes
A CTA primária deve refletir a próxima ação de negócio mais comum.

Exemplos:
- detalhe de paciente → Editar Paciente
- detalhe de usuário → Editar Usuário
- detalhe de internação → Registrar Evolução ou ação equivalente, se existir

## 4.4 Regras gerais
- só pode haver uma CTA primária visual por página;
- ações secundárias devem ficar em botões secondary/ghost;
- CTA primária deve ficar no header da página.

## 5. Convenções de estados vazios e ausência de dados

- estados vazios devem citar a rotina específica;
- estados vazios devem propor a próxima ação útil;
- evitar mensagens vagas como “Nenhum resultado encontrado” sem contexto.

Exemplo:
- “Nenhum agendamento no período. Ajuste filtros ou registre o primeiro compromisso.”

## 6. Uso deste documento

Este documento deve orientar diretamente:
- `meta.title`
- `meta.breadcrumb`
- `meta.breadcrumbParent`
- títulos de `AppPageHeader`
- subtítulos de páginas
- labels do menu em `navigation.ts`
- texto da CTA principal
