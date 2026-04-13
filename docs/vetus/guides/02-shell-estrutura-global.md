# VETUS — Estrutura Completa do Shell
**Base visual principal:** `01-navbar-inicio-collapsed.png` a `09-topbar-isolado.png`, `vetus-dashboard.png`  
**Objetivo:** descrever a camada compartilhada por praticamente todas as telas do acervo

## 1. Visão geral do shell

O Vetus usa uma composição recorrente de três faixas:

1. **Topbar fixa**
2. **Sidebar fixa à esquerda**
3. **Área de conteúdo com cards**

Em várias capturas ainda existe um quarto elemento recorrente:

4. **Widget de NPS flutuante** no canto inferior esquerdo

## 2. Topbar

### 2.1 Estrutura observada

Da esquerda para a direita, a topbar contém:

- logotipo `Vetus`;
- botão circular de recolhimento / retorno do menu;
- campo global de busca;
- ícone de notificações;
- área de suporte com ícone de ajuda;
- atalho para WhatsApp;
- bloco de usuário com nome `vetus` e identificador `Id. 220319`.

### 2.2 Comportamento visual

- altura enxuta e constante;
- fundo branco;
- divisória inferior sutil;
- alinhamento central vertical;
- busca com borda leve e ícone de lupa à direita;
- perfil encapsulado em pill com borda azul.

### 2.3 Papel funcional

A topbar atua como barra de sistema, não de módulo. Ela não muda de estrutura entre agenda, comandas, estoque, fiscal ou RH. O que muda é apenas o conteúdo principal da página.

## 3. Sidebar

### 3.1 Região superior

No topo da sidebar aparecem:

- label `Empresa:`;
- ação de troca com ícone lateral;
- empresa ativa `Centro Veterinário Guarapiranga`;
- campo de busca do menu.

Essa região reforça que o produto foi pensado para operação multiempresa, mesmo quando a troca de contexto está desabilitada.

### 3.2 Top-level navigation

Os grupos principais observados no shell são:

- Início
- Atendimento
- Laboratório
- Estoque
- Financeiro
- Marketing
- RH
- Relatórios

### 3.3 Padrão de expansão

Quando um grupo é expandido:

- a linha recebe destaque em azul;
- surgem subgrupos em faixa bege clara;
- cada subgrupo possui seta própria;
- o conteúdo do restante da tela não se desloca de forma agressiva.

Os exemplos mais claros são:

- `02-navbar-Atendimento-expanded.png`
- `05-navbar-Financeiro-expanded.png`
- `07-navbar-RH-expanded.png`

## 4. Área de conteúdo

### 4.1 Fundo e espaçamento

A área útil usa:

- fundo cinza-azulado muito claro;
- espaçamento generoso entre header da página e cards;
- cards brancos com borda cinza suave;
- títulos escuros em peso alto.

### 4.2 Componentes recorrentes

Ao longo do acervo aparecem repetidamente:

- breadcrumbs na parte superior esquerda;
- CTA laranja no topo direito;
- campo de busca horizontal;
- filtros em card ou em drawer;
- listas em cards;
- tabelas simples;
- accordions;
- botões outline laranja para detalhes;
- botão azul para pesquisar;
- botão verde para incluir nas telas legacy.

## 5. Footer institucional

O footer aparece em boa parte das telas ligadas ao legado e em algumas listas SPA. Os elementos observados são:

- razão social `Vetus Tecnologia Ltda.`;
- CNPJ;
- endereço corporativo em São Paulo;
- ícones sociais;
- referência temporal do copyright.

Esse rodapé ajuda a diferenciar parte das telas que ainda estão mais próximas do legado.

## 6. Widget de NPS

Um elemento constante e operacionalmente importante é o card laranja de avaliação:

`De 0 a 10, quanto você recomendaria Vetus para um amigo ou parente?`

Características:

- fica sobreposto no canto inferior esquerdo;
- cobre parte do conteúdo de listas e grids;
- em algumas capturas reduz a legibilidade da base da tela;
- faz parte do estado real do produto, portanto precisa ser considerado em benchmarks de UX.

## 7. Paleta e linguagem visual

### 7.1 Cores predominantes

- **Laranja:** ações primárias, destaques de título, CTAs
- **Azul:** pesquisa, navegação secundária, pills de usuário
- **Verde:** inclusão em legacy, status ativo, valores positivos
- **Vermelho:** exclusão, valores críticos

### 7.2 Tom geral

O sistema mistura dois estilos:

- um **beta SPA** mais limpo, baseado em cards e botões outline;
- um **legacy JSF** mais tabular, com formulários compactos e botões de barra.

Mesmo assim, a marca e a paleta dão uma sensação razoavelmente coesa ao conjunto.

## 8. O que este shell sugere sobre a arquitetura

Pelo comportamento visual, o shell parece operar como um contêiner de navegação para:

- páginas nativas SPA;
- rotas internas que renderizam listas e detalhe modernos;
- e tentativas de abertura de rotas externas ou legadas que nem sempre resolvem corretamente.

Isso explica por que alguns módulos funcionam plenamente no beta e outros terminam em páginas de indisponibilidade.

## 9. Conclusão

O shell do Vetus é uma das partes mais estáveis e legíveis do acervo. Ele oferece:

- identidade visual consistente;
- navegação modular bem definida;
- forte reaproveitamento de padrões;
- e uma base sólida para documentação, benchmark visual ou eventual reimplementação.

As inconsistências do acervo estão menos no shell e mais na camada de integração entre menu, rota e módulo final.
