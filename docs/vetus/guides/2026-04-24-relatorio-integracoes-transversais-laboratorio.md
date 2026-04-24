# Relatório de Integrações e Entidades Transversais do Domínio Laboratório

Data: 2026-04-24
Escopo: consolidação das integrações transversais do domínio `Laboratório`, com foco em como ele conversa com `atendimento`, `internação`, `cliente`, `animal`, `financeiro` e eventuais reflexos comerciais.

## 1. Síntese executiva

O domínio `Laboratório` no Vetus não funciona isolado. Ele se apoia em entidades transversais e devolve efeitos para outros domínios.

A leitura consolidada ficou assim:

- `animal` é a âncora assistencial do laboratório;
- `cliente` é a âncora relacional e econômica indireta;
- `atendimento` é o contexto de origem da requisição;
- `internação` é o contexto clínico contínuo onde o laboratório ganha densidade operacional;
- `financeiro` recebe o reflexo econômico via títulos, comandas, vendas ou cobrança de procedimentos;
- o eixo comercial aparece principalmente por `valor`, `comanda`, `origem do título` e potencial faturamento do exame/laudo.

O laboratório, portanto, é um subdomínio clínico transversal, não um bloco autocontido.

## 2. Entidades transversais centrais

### 2.1 Animal

`animal` é a entidade transversal mais forte do laboratório.

Sinais confirmados em relatórios anteriores:

- `Exames` lista `Animal`;
- `Laudos` lista `Animal`;
- o detalhe do animal expõe bloco explícito `Exames`;
- `Internação` trabalha em torno do paciente internado.

Leitura:

- o laboratório é acionado sobre o paciente;
- o exame é sempre contextualizado por animal;
- a jornada diagnóstica conversa diretamente com prontuário, internação, histórico clínico e acompanhamento assistencial.

### 2.2 Cliente

`cliente` é a entidade transversal relacional e econômica.

Sinais confirmados:

- `Exames` lista `Cliente`;
- `Laudos` lista `Cliente` e `Proprietário`;
- o detalhe do cliente concentra blocos financeiros e operacionais;
- `Situação Financeira`, `Comandas e Vendas`, `Pacotes` e `Orçamentos` vivem no cockpit do cliente.

Leitura:

- o cliente não é o centro clínico do laboratório;
- ele é o centro de relacionamento e repercussão econômica;
- o exame nasce no animal, mas repercute no cliente.

## 3. Integração com atendimento

O vínculo com `atendimento` é estrutural.

Sinais consolidados:

- `Esteira de Exames` vive tecnicamente dentro do bloco `Atendimento`;
- o fluxo confirmado é `Requisição de exame -> Esteira de Exames -> Coleta -> Resultado -> Laudo -> Entrega`;
- `Exames` funciona como ordem/fila diagnóstica;
- `cliente` e `animal` já expõem atalhos e blocos que os conectam com a operação assistencial.

Leitura:

- o laboratório começa no atendimento;
- não é um domínio que nasce por demanda administrativa isolada;
- a requisição do exame faz parte da jornada clínica;
- a esteira funciona como ponto de passagem entre atendimento e laboratório.

## 4. Integração com internação

O vínculo com `internação` é um dos mais fortes do domínio clínico.

Sinais consolidados:

- `internação` é o módulo de cuidado contínuo do paciente;
- o detalhe do animal já expõe `Exames` e `Internação` lado a lado como continuidade clínica;
- a esteira de exames recebe requisições vindas de atendimento clínico e de internação;
- `internação` mostra complexidade clínica suficiente para demandar exames recorrentes, monitorização e evolução.

Leitura:

- quando o caso clínico sobe de densidade, o laboratório deixa de ser episódico e passa a ser parte do acompanhamento contínuo;
- em `internação`, o laboratório conversa com medicação, evolução, monitorização e decisão clínica;
- o exame não é apenas diagnóstico inicial, mas instrumento de acompanhamento do estado do paciente.

## 5. Integração com cliente e animal como dupla relacional

O laboratório conversa com a dupla `cliente` + `animal`, mas com papéis diferentes.

`animal`:

- contexto clínico primário;
- alvo do exame;
- eixo do prontuário e da evolução.

`cliente`:

- tutor/proprietário;
- canal de comunicação;
- centro de consolidação econômica.

Leitura:

- o laboratório é modelado com paciente e tutor simultaneamente;
- isso evita perda de contexto entre clínica e operação;
- o exame pertence assistencialmente ao animal, mas repercute operacionalmente no cliente.

## 6. Integração com financeiro

O domínio `financeiro` aparece como receptor indireto do laboratório, não como controlador do fluxo clínico.

Sinais confirmados:

- `Laudos` expõem coluna `Valor`;
- `Contas a Receber` distingue `Origem`, `Cliente`, `Total`, `Recebido` e `A Receber`;
- o detalhe do cliente já agrega `Situação Financeira` e `Comandas e Vendas`;
- o financeiro trabalha com títulos e origens, não com a lógica clínica do exame.

Leitura:

- o laboratório gera potencial reflexo monetário;
- esse reflexo tende a ser consolidado como título ou origem financeira;
- o financeiro não precisa conhecer a anatomia do exame para operar a cobrança;
- ele recebe o reflexo econômico de um domínio clínico já executado.

## 7. Relação com comanda e reflexo comercial

Mesmo sem um botão explícito de `comanda` dentro do laboratório ter sido confirmado nesta passada, a leitura arquitetural do reflexo comercial é forte.

Sinais de sustentação:

- o detalhe do cliente agrega `Comandas e Vendas`;
- `internação` expõe `Abrir a Comanda` e confirma o elo entre cuidado clínico e reflexo transacional;
- `Laudos` têm `Valor`;
- `financeiro` distingue a `Origem` dos títulos.

Leitura:

- o laboratório pode não ser a superfície comercial primária;
- mas ele produz eventos faturáveis ou cobrados;
- a materialização econômica mais provável passa por `comanda`, `venda`, título financeiro ou combinação desses mecanismos;
- o exame/laudo é clínico na origem e comercial no reflexo.

## 8. Integração com comunicação e entrega

A última etapa do fluxo laboratorial é `Entrega`, e isso implica interface com comunicação e relacionamento.

Sinais consolidados:

- o fluxo confirmado termina em `Entrega ao cliente`;
- `Laudos` são documentos voltados à comunicação diagnóstica;
- o detalhe do cliente concentra `Enviar Mensagem` e canais digitais;
- o domínio `marketing` e os canais digitais já existem no ERP como infraestrutura de relacionamento.

Leitura:

- a saída do laboratório não termina no resultado interno;
- ela precisa ser comunicada, entregue ou disponibilizada;
- isso faz o domínio encostar em comunicação operacional mesmo sem um módulo laboratorial próprio de mensageria ter sido confirmado.

## 9. Integração com entidades técnicas e normativas

Além das integrações de negócio, o laboratório também conversa com suas próprias entidades transversais internas:

- `Vlr. Ref. Hemograma`
- `Vlr. Ref. Bioquímico`
- `Equipamentos`
- `Tipos de Laudo`

Leitura:

- `referência` conecta resultado a interpretação;
- `equipamento` conecta resultado a confiabilidade técnica;
- `tipo de laudo` conecta resultado a formalização documental.

Essas entidades não pertencem ao atendimento, cliente ou financeiro, mas sustentam a integridade do domínio quando ele se integra com os demais.

## 10. Mapa transversal consolidado

O mapa mais coerente do domínio ficou assim:

### 10.1 Origem

- `Atendimento`
- `Internação`

### 10.2 Identidade relacional

- `Animal`
- `Cliente`

### 10.3 Execução laboratorial

- `Exames`
- `Esteira de Exames`
- `Hemogramas`
- `Urina`
- `Bioquímico`

### 10.4 Suporte técnico e normativo

- `Vlr. Ref. ...`
- `Equipamentos`
- `Tipos de Laudo`

### 10.5 Saída e repercussão

- `Laudos`
- `Entrega`
- `Comanda` e/ou títulos de origem financeira
- `Financeiro`

## 11. Leitura arquitetural final

O laboratório do Vetus se comporta como um domínio clínico transversal com três direções simultâneas:

- para trás, ele recebe contexto de `atendimento`, `internação`, `animal` e `cliente`;
- para dentro, ele processa `ordem`, `esteira`, `resultado`, `referência`, `equipamento` e `laudo`;
- para frente, ele devolve `entrega`, `decisão clínica` e `reflexo econômico`.

Isso significa que o laboratório:

- não é apenas suporte diagnóstico;
- não é apenas registro documental;
- não é apenas gerador de cobrança;
- ele é um domínio articulador entre clínica, operação e economia.

## 12. Conclusão final

O domínio `Laboratório` conversa diretamente com os principais eixos do ERP:

- `atendimento` como origem;
- `internação` como continuidade clínica;
- `animal` como paciente;
- `cliente` como titular relacional e econômico;
- `financeiro` como receptor do reflexo monetário;
- `comercial` como repercussão indireta via `comanda`, `valor` e `origem` de títulos.

Essa consolidação já é suficiente para tratar o laboratório como um subdomínio transversal maduro, pronto para ser mapeado em arquitetura alvo, migração funcional ou desenho de módulos futuros.
