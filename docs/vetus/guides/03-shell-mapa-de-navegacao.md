# VETUS — Mapa Hierárquico de Navegação
**Base visual:** `02-navbar-Atendimento-expanded.png`, `03-navbar-Laboratorio-expanded.png`, `04-navbar-Estoque-expanded.png`, `05-navbar-Financeiro-expanded.png`, `06-navbar-Marketing-expanded.png`, `07-navbar-RH-expanded.png`, `08-navbar-Relatorios-expanded.png`

## 1. Objetivo deste guia

Este documento descreve o **mapa mental do menu** do Vetus. O foco aqui não é anatomia visual do shell, e sim a organização de informação do produto.

## 2. Estrutura de primeiro nível

| Grupo | Papel no produto |
|---|---|
| Início | Dashboard e atalhos |
| Atendimento | Operação clínica, comercial e cadastros-base |
| Laboratório | Exames, laudos e cadastros laboratoriais |
| Estoque | Produtos, cadastros de estoque e fiscal |
| Financeiro | Caixa, contas, cartão, cadastros financeiros |
| Marketing | Campanhas e comunicação |
| RH | Usuários, profissionais e comissões |
| Relatórios | Visões analíticas e operacionais |

## 3. Árvore funcional observada

### 3.1 Início

- Início

### 3.2 Atendimento

- Atendimentos
- Internação
- Cadastros

Principais itens do grupo:

- Agenda
- Comandas
- Vendas
- Pacotes
- Esteira
- Esteira de Exames
- Vacinas e Vermífugos
- Orçamentos
- Resgate de Pontos
- Animais
- Clientes
- Serviços
- Importações e tabelas auxiliares

### 3.3 Laboratório

- Atendimentos
- Cadastrados

Principais itens:

- Exames
- Laudos
- Hemogramas
- Urina
- Bioquímico
- Equipamentos
- Tipos de Laudo
- Referências Hemograma
- Referências Bioquímico

### 3.4 Estoque

- Controles
- Cadastrados
- Configurações Fiscais

Principais itens:

- Consulta de Preços
- Entrada de Nota Fiscal
- Validade de Produtos
- Produtos
- Fornecedores e Despesas
- Estoques
- Fabricantes
- Grupos de Produto
- Tabela ICMS
- Tabela IPI
- Tabela PIS
- Tabela COFINS
- Tabela CFOP
- Tabela NFS-e
- Matriz ICMS
- Tabela IBS/CBS

### 3.5 Financeiro

- Gaveta
- Controles
- Maquininha de Cartão
- Cadastros

Principais itens:

- Gaveta
- Contas a Receber
- Contas a Pagar
- Pagamento Antecipado
- Contas Adm. Cartão
- Cheques
- Fluxo de Caixa
- Curva ABC
- Dashboard Financeiro
- Linha do Tempo
- Configuração do Split
- Simulador de Split
- Transações de Cartão
- Exportador de Split
- Formas de Pagamento
- Centros de Custo
- Custos e Despesas
- Cartões
- Bancos

### 3.6 Marketing

Principais itens inferidos pelas evidências:

- Campanhas
- Layout de E-mail
- SMS Simples

O grupo existe no menu expandido, mas parte das rotas do acervo está indisponível.

### 3.7 RH

- Usuários
- Comissões
- Cadastros

Principais itens:

- Usuários
- Profissionais
- Grupos de Acesso
- Folgas
- Regras de Comissão
- Cálculo de Comissões

### 3.8 Relatórios

Pelos nomes dos arquivos, os blocos analíticos contemplam:

- Agenda
- Atendimento
- Atendimento por Profissional
- Cadastros
- Estoque
- Financeiros
- Fluxo de Caixa
- Produção

## 4. Padrão de modelagem do menu

A arquitetura de informação do Vetus segue um padrão recorrente:

- primeiro o **domínio**;
- depois o **subdomínio**;
- por fim a **rotina**.

Exemplos:

- `Atendimento > Cadastros > Clientes`
- `Estoque > Configurações Fiscais > Tabela ICMS`
- `Financeiro > Maquininha de Cartão > Transações`

Isso facilita replicação em produtos que precisem de navegação em 3 níveis.

## 5. Leitura funcional por macrodomínio

### 5.1 Atendimento é o maior hub operacional

Ele concentra:

- agendamento;
- venda assistida;
- gestão de comandas;
- pacotes;
- esteiras;
- cadastros-base.

### 5.2 Estoque e Financeiro são profundos

Ambos possuem alta granularidade e mais de um tipo de subgrupo. Isso sugere que são módulos maduros, com forte herança de ERP.

### 5.3 RH, Marketing e Relatórios parecem mais dependentes de legado

No acervo há menu para esses grupos, mas a qualidade das evidências funcionais é mais desigual.

## 6. Conclusão

O menu do Vetus não é apenas navegação; ele revela a estratégia de produto:

- **SPA moderna** para experiência de entrada e alguns fluxos centrais;
- **ERP verticalizado** por domínio;
- **legado especializado** preservado nos módulos mais densos.

Esse mapa hierárquico deve ser lido em conjunto com os guias de Agenda, Comandas, Cadastros, Estoque/Fiscal e os relatórios anexos de legacy.
