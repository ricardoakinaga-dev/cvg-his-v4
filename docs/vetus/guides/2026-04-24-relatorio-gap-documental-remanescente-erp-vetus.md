# Vetus ERP — Relatório de GAP Documental Remanescente

**Data:** 24/04/2026  
**Objetivo:** verificar os relatórios já produzidos contra a árvore real do ERP Vetus já inspecionada e identificar o que ainda permanece sem cobertura documental suficiente.

## 1. Critério adotado

Para esta verificação, considerei três níveis de cobertura:

- **Cobertura forte**: existe relatório próprio ou consolidado com evidência visual/estrutural suficiente.
- **Cobertura parcial**: existe relatório, mas ele depende fortemente de arquitetura, menu, HTML parcial ou evidência cruzada com outros módulos.
- **GAP documental real**: a rotina aparece no ERP/menu/acervo, mas ainda não ganhou relatório dedicado nem cobertura analítica suficiente.

## 2. Base usada na auditoria

Esta verificação cruzou:

- os relatórios já salvos em `docs/vetus/guides`;
- o mapa de navegação em [03-shell-mapa-de-navegacao.md](../guides/03-shell-mapa-de-navegacao.md);
- o inventário de rotas e integrações em [2026-04-23-inspecao-erp-beta-shell-rotas-integracoes.md](../guides/2026-04-23-inspecao-erp-beta-shell-rotas-integracoes.md);
- os artefatos de inspeção salvos em `docs/vetus/inspection`;
- os relatórios mais recentes de atendimento, laboratório, RH, marketing, estoque, financeiro e relatórios.

## 3. Conclusão executiva

Sim: **ainda há GAP documental remanescente**.

O acervo já cobre muito bem os eixos principais do produto:

- atendimento core;
- cockpit clínico do animal;
- agenda;
- comandas;
- pacotes;
- vacinas;
- internação;
- laboratório;
- vendas;
- estoque macro;
- financeiro macro;
- RH macro;
- marketing macro;
- relatórios;
- segurança, compliance e integrações enterprise.

Mas ainda restam três tipos de lacuna:

1. **cadastros auxiliares e tabelas normativas** que aparecem no menu, mas ainda não viraram relatório próprio;
2. **submódulos financeiros e fiscais específicos** que só aparecem de passagem em relatórios amplos;
3. **fluxos transversais críticos** que já foram tocados por partes, mas ainda não foram consolidados como jornadas ponta a ponta.

## 4. GAPs documentais reais — sem relatório próprio suficiente

### 4.1 Cadastros auxiliares do domínio clínico/comercial

Esses itens aparecem repetidamente no menu e nos artefatos, mas ainda não têm relatório próprio com leitura suficiente:

- `Termos de Responsabilidade`
- `Raças`
- `Espécies`
- `Cores`
- `Grupos de Clientes`

Leitura:

- são cadastros-base;
- sustentam cadastro de animal, cliente, serviço e operação clínica;
- hoje só aparecem citados em mapas gerais ou no menu.

### 4.2 Cadastros auxiliares de internação

- `Boxes de Internação`

Observação:

- o relatório de `Internação` já menciona boxes e prova o conceito;
- mas o cadastro específico de boxes ainda não recebeu relatório próprio.

### 4.3 Cadastros auxiliares de estoque/comercial

Esses itens aparecem no shell e no inventário de rotas, mas ainda não receberam documentação específica:

- `Importar Dados Produtos`
- `Setores da Empresa`
- `Unidades de Medida`
- `Tabelas de Preço`
- `Ponto de Venda`

Observação importante:

- `Importar Dados Serviços` já aparece ao menos amarrado ao relatório de `Serviços`;
- mas ainda assim continua com cobertura fraca, não profunda.

### 4.4 Financeiro especializado ainda sem relatório próprio

O macrodomínio `Financeiro` foi bem coberto, mas os submódulos abaixo ainda não têm relatório dedicado:

- `Pagamento Antecipado`
- `Contas Adm. Cartão`
- `Cheques`
- `Curva ABC Clientes`
- `Curva ABC Produtos`
- `DashBoard do Multifilial`
- `Linha do Tempo`
- `Configuração do Split`
- `Maquininhas`
- `Simulador de Split`
- `Exportador de Split`
- `Habilitar Pagamento`
- `Pagamento Dashboard`
- `Centros de Custo`
- `Cartões Débito/Crédito`
- `Bancos`

Leitura:

- vários deles aparecem no menu e em alguns relatórios amplos;
- mas continuam sem descrição detalhada de estrutura, finalidade, campos e integração.

### 4.5 Fiscal especializado ainda sem relatório próprio

As tabelas fiscais do shell foram parcialmente inventariadas e aparecem no relatório global de rotas, mas ainda não viraram relatórios específicos:

- `Tabela ICMS`
- `Tabela IPI`
- `Tabela PIS`
- `Tabela COFINS`
- `Tabela CFOP`
- `Tabela NFS-e`
- `Matriz Estado ICMS`
- `Tabela IBS/CBS`

Leitura:

- há visibilidade de rotas beta e endpoints em alguns casos;
- mas falta leitura documental orientada a negócio, governança fiscal e papel no faturamento.

## 5. Cobertura parcial — já existe relatório, mas ainda há fragilidade de prova

### 5.1 Esteiras

- `Esteira de Atendimento`
- `Esteira de Exames`

Motivo:

- ambas já têm relatório;
- porém a evidência visual direta ficou limitada por tela vazia ou bloqueio de borda;
- os relatórios ficaram corretamente sustentados por evidência cruzada, mas ainda não são prova funcional completa de todos os CTAs por linha.

### 5.2 Trilhas analíticas do laboratório

- `Hemogramas`
- `Urina`
- `Bioquímico`
- `Vlr. Ref. Hemograma`
- `Vlr. Ref. Bioquímico`
- `Equipamentos`

Motivo:

- a arquitetura e a posição funcional foram bem mapeadas;
- mas as telas diretas ficaram bloqueadas na borda em várias passadas;
- a cobertura é boa para planejamento, mas não equivalente a inspeção funcional rica.

### 5.3 RH de governança operacional

- `Usuários`
- `Grupos de Acesso`

Motivo:

- a camada conceitual/governança ficou forte;
- a prova visual operacional da jornada real do módulo ainda é mais fraca que em `Profissionais`.

### 5.4 Relatórios analíticos do legado

Os grupos de `Relatórios` já foram consolidados, mas muitos itens internos permanecem como leitura inferida a partir do menu e dos domínios correlatos, não como telas detalhadas abertas uma a uma.

Isso vale principalmente para:

- `Produtos/Serviços Produzidos`
- `Produção`
- parte dos `Relatórios Financeiros`
- parte dos `Relatórios de Cadastros`

## 6. GAPs transversais — faltam relatórios de jornada ponta a ponta

Além de módulos específicos, ainda restam lacunas de fluxo transversal que são importantes para entendimento de operação hospitalar.

### 6.1 Jornada recepção -> triagem -> esteira -> prontuário -> comanda

Hoje essa cadeia aparece distribuída entre:

- agenda;
- esteira;
- detalhe do animal;
- comanda;
- documentação arquitetural.

Mas ainda não há um relatório único amarrando:

- entrada do paciente;
- priorização/triagem;
- posse do caso;
- prontuário;
- reflexo transacional.

### 6.2 Jornada atendimento -> internação -> box -> medicação -> alta

O módulo `Internação` foi bem lido, mas ainda falta um relatório transversal específico do fluxo hospitalar contínuo.

### 6.3 Jornada serviço/produto -> comanda/venda -> pagamento -> financeiro -> split

A cadeia econômica principal já foi coberta por partes, porém ainda não há consolidação específica da malha:

- venda/comanda;
- meios de pagamento;
- split/cartão;
- financeiro operacional;
- conciliação.

### 6.4 Jornada preventiva -> marketing -> agenda -> retorno

`Vacinas e Vermífugos`, `Marketing` e detalhe do animal já permitem essa leitura, mas ainda não existe um relatório transversal dedicado à automação de relacionamento preventivo.

## 7. Priorização dos GAPs remanescentes

### Prioridade alta

- `Termos de Responsabilidade`
- `Boxes de Internação`
- `Tabelas de Preço`
- `Ponto de Venda`
- `Pagamento Antecipado`
- `Contas Adm. Cartão`
- `Configuração do Split`
- `Maquininhas`
- `Transações de Cartão` em leitura mais profunda que a atual
- jornada `recepção -> triagem -> esteira -> prontuário -> comanda`

### Prioridade média

- `Raças`
- `Espécies`
- `Cores`
- `Grupos de Clientes`
- `Importar Dados Produtos`
- `Setores da Empresa`
- `Unidades de Medida`
- `Cheques`
- `Centros de Custo`
- `Cartões Débito/Crédito`
- `Bancos`

### Prioridade baixa

- `Curva ABC Clientes`
- `Curva ABC Produtos`
- `DashBoard do Multifilial`
- `Linha do Tempo`
- `Exportador de Split`
- `Habilitar Pagamento`
- `Pagamento Dashboard`

## 8. Veredito final

O conjunto documental atual já cobre muito bem a espinha do Vetus. O que falta agora não está mais no core óbvio do produto, e sim nas camadas adjacentes:

- cadastros auxiliares;
- fiscal especializado;
- meios de pagamento e split;
- jornadas transversais hospitalares.

Portanto, o cenário correto é este:

- **não há mais um GAP documental massivo no core principal**;
- **ainda existem GAPs relevantes nas bordas operacionais e normativas**;
- **o próximo ciclo ideal de documentação deve sair de módulos isolados e migrar para cadastros auxiliares + fluxos transversais críticos**.
