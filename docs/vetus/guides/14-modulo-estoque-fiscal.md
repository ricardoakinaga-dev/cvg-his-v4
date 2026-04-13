# VETUS — Estoque e Fiscal
**Evidências principais:** `estoque-*.png`, `fiscal-*.png`, `vetus-produtos.png`

## 1. Leitura geral do bloco

Estoque e Fiscal formam um dos conjuntos SPA mais consistentes do acervo. Diferente de laboratório, internação e parte do financeiro, aqui há uma presença clara de telas modernas funcionando dentro do shell.

O bloco combina:

- cadastros mestre de estoque;
- listas operacionais;
- tabelas fiscais;
- empty states bem padronizados;
- CTAs de criação em laranja.

## 2. Produtos

### 2.1 Tela observada

`estoque-produtos-01.png` mostra uma listagem rica com:

- título `Produtos`;
- busca por id, código de barras, descrição ou nome;
- `Busca Avançada`;
- `Filtrar e ordenar`;
- CTA `+ Incluir Novo Produto`;
- cards de produto com nome, id, código de barras, valor de venda e descrição;
- ação `Ver Detalhes`.

### 2.2 Conclusão

Produtos é claramente uma tela SPA madura e pronta para uso operacional.

## 3. Cadastros de estoque

### 3.1 Estoques

`estoque-estoques-01.png` mostra:

- busca por id ou descrição;
- lista em cards;
- ids reais de estoque;
- CTA `+ Incluir Novo Estoque`;
- ação `Ver Detalhes`.

### 3.2 Fabricantes

`estoque-fabricantes-01.png` mostra:

- busca por id ou nome;
- CTA `+ Incluir Novo Fabricante`;
- estado vazio `Nenhum registro encontrado`.

### 3.3 Fornecedores e despesas

`estoque-fornecedores-01.png` mostra:

- busca;
- `Busca Avançada`;
- `Filtrar e Ordenar`;
- CTA `+ Incluir Novo Registro`;
- cards com descrição, categoria e contato;
- ação `Ver Detalhes`.

### 3.4 Grupos de produto

`estoque-grupos-produto-01.png` mostra:

- busca por id ou descrição;
- CTA `+ Incluir Novo Grupo`;
- cards por grupo com descrição e id;
- ação `Ver Detalhes`.

## 4. Rotas com evidência de indisponibilidade no bloco de estoque

As seguintes capturas do shell registram indisponibilidade:

- `estoque-consulta-precos-01.png`
- `estoque-entrada-nf-01.png`
- `estoque-validade-01.png`

Isso sugere que a camada SPA cobre melhor os cadastros do que alguns controles operacionais mais especializados.

## 5. Fiscal

### 5.1 Tabelas fiscais observadas

Há evidência direta para:

- `fiscal-icms-01.png`
- `fiscal-ipi-01.png`
- `fiscal-pis-01.png`
- `fiscal-cofins-01.png`
- `fiscal-cfop-01.png`
- `fiscal-nfse-01.png`
- `fiscal-matriz-icms-01.png`
- `fiscal-ibs-cbs-01.png`

### 5.2 Padrão visual recorrente

As tabelas fiscais seguem quase o mesmo esqueleto:

- breadcrumb `Estoque > Configurações Fiscais > ...`;
- título da tabela;
- busca por código ou descrição;
- CTA `+ Incluir Nova Tabela`;
- empty state amigável quando não há registros.

### 5.3 Implicação funcional

O módulo fiscal foi claramente tratado como extensão do bloco de estoque, não como domínio separado. Isso faz sentido em um ERP veterinário com forte operação de produto e faturamento.

## 6. Padrões de UX do bloco

Padrões fortes observados:

- consistência visual muito alta;
- cards simples e claros;
- CTAs sempre no topo direito;
- empty state neutro e legível;
- combinação de busca simples + busca avançada.

Pontos de atenção:

- o NPS interfere na base da tela;
- algumas rotas operacionais ainda não estão estáveis;
- parte das telas de estoque mais profundas parece depender de integrações não concluídas.

## 7. Conclusão

Estoque e Fiscal são dos melhores candidatos a benchmark visual e funcional dentro do shell SPA do Vetus. O bloco mostra:

- boa coerência de informação;
- profundidade de cadastro;
- relação natural com financeiro;
- e uma base mais madura do que a observada em marketing, relatórios, internação e laboratório no shell.
