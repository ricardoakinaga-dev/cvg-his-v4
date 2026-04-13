# VETUS — Cadastros de Animais e Clientes
**Evidências principais:** `animais-01-visao-geral.png` a `animais-04-busca-avancada.png`, `clientes-02-detalhe.png`, `vetus-animais.png`, `vetus-clientes.png`

## 1. Papel dos cadastros no produto

Animais e clientes formam o eixo mestre da operação do Vetus. Eles não são cadastros periféricos; são o ponto de conexão de:

- agenda;
- comandas;
- histórico clínico;
- exames;
- internação;
- comunicação;
- financeiro.

## 2. Cadastro de animais

### 2.1 Listagem

As capturas de listagem mostram:

- busca por nome, cliente ou e-mail;
- opção de busca avançada;
- filtro e ordenação;
- CTA `+ Cadastrar Novo Animal`;
- cards por animal;
- botão `Detalhes`;
- ação `Abrir Comanda`.

### 2.2 Estrutura do card

As informações recorrentes do card incluem:

- nome do animal;
- espécie;
- id;
- tutor;
- sexo;
- idade;
- ações principais.

O padrão é de card informativo, não de tabela seca.

### 2.3 Página de detalhe do animal

`animais-03-detalhe.png` revela uma página de alto valor clínico.

Bloco esquerdo:

- avatar / ícone do animal;
- id;
- nome;
- raça;
- idade;
- data de cadastro;
- doença crônica;
- alergia;
- temperamento;
- observações gerais;
- dados do cliente;
- contato;
- botões `Excluir Cadastro`, `Editar Cadastro`, `Enviar Mensagem`, `Ver cadastro do cliente`.

Bloco direito:

- últimos atendimentos;
- anamneses;
- vacinas e vermífugos;
- agenda;
- exames;
- internação;
- receituário;
- gráfico de peso;
- imagens;
- histórico clínico.

### 2.4 Interpretação funcional

O detalhe do animal funciona como **hub clínico longitudinal**. O cadastro não é apenas demográfico; ele já foi pensado como porta de entrada do prontuário.

## 3. Cadastro de clientes

### 3.1 Listagem

O padrão visual observado nas referências e no acervo sugere:

- cards por cliente;
- status ativo;
- dados de identificação;
- accordions para contato e animais vinculados;
- ação `Abrir Comanda`;
- CTA de novo cadastro.

### 3.2 Página de detalhe

`clientes-02-detalhe.png` mostra uma tela extremamente rica.

Bloco esquerdo:

- status `Ativo`;
- nome;
- id e data de cadastro;
- `Editar Cadastro`;
- `Enviar Mensagem`;
- identificação do cliente;
- informações de contato;
- documentação.

Bloco direito:

- animais cadastrados;
- CTA `Abrir Comanda`;
- CTA `Cadastrar Novo Animal`;
- resgate de pontos;
- pacotes;
- Live Animal e Live Lab;
- orçamentos;
- agenda;
- situação financeira.

### 3.3 Interpretação funcional

O cliente é tratado como conta central de relacionamento e faturamento. A tela mistura:

- CRM;
- financeiro;
- operação clínica;
- fidelização;
- canais digitais.

## 4. Busca avançada e filtros

`animais-04-busca-avancada.png` indica uma preocupação com recuperação de cadastro. Mesmo sem todos os campos legíveis, o produto mostra um padrão claro:

- busca simples para uso cotidiano;
- busca avançada para triagem mais refinada;
- filtros e ordenação como camada adicional.

## 5. Relação entre cliente e animal

O acervo deixa evidente uma modelagem relacional forte:

- um cliente pode ter múltiplos animais;
- o animal preserva vínculo explícito com o cliente;
- a comanda pode ser aberta tanto do lado do cliente quanto do animal;
- diversas informações financeiras permanecem ancoradas no cliente.

## 6. Integrações implícitas

Pelas evidências visuais, esses cadastros alimentam diretamente:

- agenda;
- comandas;
- exames;
- internação;
- vacinas;
- comunicação via mensagem;
- pacotes;
- pontos;
- histórico clínico.

## 7. Pontos fortes do desenho

- cadastros não ficam isolados do fluxo;
- páginas de detalhe são densas e úteis;
- excelente costura entre operação clínica e administrativa;
- linguagem visual moderna para um domínio naturalmente complexo.

## 8. Conclusão

Se fosse preciso eleger os três melhores blocos SPA do acervo, cadastros de animais e clientes estariam nessa lista. O conjunto mostra:

- profundidade funcional;
- boa organização de informação;
- e referências suficientes para servir como base de produto, benchmark ou reimplementação.
