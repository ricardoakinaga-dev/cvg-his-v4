# VETUS — Comandas
**Evidências principais:** `comandas-01-visao-geral.png` a `comandas-07-animais.png`

## 1. Papel do módulo

Comandas é o principal módulo transacional do beta. Ele articula:

- cliente;
- animal;
- produtos;
- serviços;
- totalização financeira;
- fechamento operacional.

É a peça que mais claramente une clínica e faturamento.

## 2. Tela de listagem

### 2.1 Estrutura visual

A listagem não usa tabela clássica. Ela usa **cards expansíveis**, o que torna o módulo mais próximo de um CRM operacional.

Elementos observados:

- título `Comandas`;
- busca textual;
- botão laranja `+ Abrir Nova Comanda`;
- filtros;
- cards por comanda;
- badges de status como `Aberta`.

### 2.2 Conteúdo do card

Cada card apresenta, em diferentes capturas:

- status;
- dados do cliente;
- seções expansíveis de informações;
- serviços e produtos;
- controles de expansão e navegação.

Essa escolha reforça uma visão centrada na ocorrência clínica, não em volume massivo de linhas.

## 3. Filtros

`comandas-04-filtros.png` mostra que o módulo admite filtragem dedicada. A combinação mais provável, coerente com as demais telas, envolve:

- status;
- período;
- cliente;
- possivelmente profissional ou empresa.

Mesmo quando os detalhes finos não aparecem legíveis, o padrão visual é consistente com o restante do produto.

## 4. Fluxo de abertura de nova comanda

### 4.1 Entrada

O botão `+ Abrir Nova Comanda` abre modal.

### 4.2 Modal

Em `comandas-05-nova-comanda.png` aparecem:

- abas `Cliente Cadastrado` e `Novo Cliente`;
- busca por nome, id, CPF, telefone ou e-mail;
- paginação;
- ação `Ver mais informações`;
- CTA final `Criar comanda`.

### 4.3 Implicação operacional

Assim como a Agenda, o módulo foi desenhado para:

- recuperar cliente existente;
- permitir continuidade sem troca de contexto;
- reduzir fricção entre cadastro e operação.

## 5. Página de detalhe da comanda

`comandas-03-detalhe-comanda.png` é a captura mais rica do acervo para esse domínio.

### 5.1 Painel esquerdo

Blocos observados:

- `Animais Vinculados na Comanda`;
- lista de produtos;
- campo para bipar ou digitar código de barras;
- quantidade com controles `+` e `-`;
- valor por item;
- data e vendedor;
- ícones de editar e excluir.

### 5.2 Painel direito

O painel lateral direito concentra o fechamento:

- status da comanda;
- id;
- abertura;
- usuário que abriu;
- empresa;
- cliente;
- accordion de contato;
- CTA `Ver Cadastro do Cliente`;
- total a pagar;
- CTA `Finalizar Comanda`;
- ação de exclusão.

### 5.3 Conclusão de design

O módulo foi desenhado como um **workbench de balcão**:

- à esquerda o operador monta a cobrança;
- à direita acompanha contexto e total;
- o animal fica explicitamente vinculado ao evento.

## 6. Relação com clientes e animais

As capturas `comandas-06-clientes.png` e `comandas-07-animais.png` mostram o quanto o módulo depende de cadastros mestres.

Fluxos implícitos:

- abrir comanda a partir do cliente;
- abrir comanda a partir do animal;
- consultar prontuário do animal já dentro da comanda;
- voltar ao cadastro do cliente sem perder o contexto financeiro.

## 7. Padrões de UX relevantes

### 7.1 Pontos fortes

- excelente ligação entre entidade clínica e cobrança;
- cards e accordions reduzem rigidez de tabela;
- totalização financeira sempre visível;
- busca por código de barras acelera operação.

### 7.2 Pontos de atenção

- densidade elevada de ações por card;
- muito conteúdo numa única página de detalhe;
- sobreposição do NPS interfere na leitura inferior.

## 8. Entidades identificadas

- comanda;
- cliente;
- animal;
- item de produto;
- item de serviço;
- operador / vendedor;
- status;
- total / desconto / subtotal.

## 9. Conclusão

O módulo de Comandas é um dos melhores exemplos do beta porque:

- traduz bem o fluxo real de clínica;
- integra cadastro, prontuário e cobrança;
- e possui evidências suficientes para orientar especificação funcional detalhada.
