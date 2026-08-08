# Relatório Completo dos Módulos de Cadastro de Clientes e Cadastro de Animais

Data-base da inspeção: 23 de abril de 2026

Escopo:

- inspeção autenticada e somente leitura do beta em `erp-beta.vetus.com.br`;
- análise das telas de listagem e detalhe de `clientes` e `animais`;
- análise dos vínculos funcionais entre os dois módulos;
- identificação das chamadas de backend confirmadas na navegação beta;
- consolidação com evidências históricas já presentes em `docs/vetus/screenshots`.

Artefatos desta rodada:

- [clientes-lista-expandida.png](../inspection/2026-04-23T22-48-13-795Z-cadastros/screenshots/clientes-lista-expandida.png)
- [clientes-detalhe-expandido.png](../inspection/2026-04-23T22-48-13-795Z-cadastros/screenshots/clientes-detalhe-expandido.png)
- [animais-lista-expandida.png](../inspection/2026-04-23T22-48-13-795Z-cadastros/screenshots/animais-lista-expandida.png)
- [animais-detalhe-expandido.png](../inspection/2026-04-23T22-48-13-795Z-cadastros/screenshots/animais-detalhe-expandido.png)
- [clientes-detalhe-expandido.json](../inspection/2026-04-23T22-48-13-795Z-cadastros/clientes-detalhe-expandido.json)
- [animais-detalhe-expandido.json](../inspection/2026-04-23T22-48-13-795Z-cadastros/animais-detalhe-expandido.json)

Referências históricas úteis:

- [12-modulo-cadastros-animais-clientes.md](../guides/12-modulo-cadastros-animais-clientes.md)
- [animais-03-detalhe.png](../screenshots/animais-03-detalhe.png)
- [clientes-02-detalhe.png](../screenshots/clientes-02-detalhe.png)

## 1. Síntese executiva

Os módulos de cadastro de clientes e cadastro de animais formam o núcleo relacional da operação do Vetus beta.

Isso ficou confirmado por três fatos:

- o cadastro de clientes já centraliza identidade, contato, documentação, endereço, observações, vínculos com animais e indicadores operacionais;
- o cadastro de animais já centraliza identidade do animal, vínculo com tutor, observações e atalhos para subdomínios clínicos e assistenciais;
- os dois módulos se apontam mutuamente, funcionando como portas de entrada para atendimento, agenda, comandas, comunicação, financeiro e acompanhamento clínico.

Leitura arquitetural:

- `cliente` é a entidade-mãe de relacionamento, faturamento e comunicação;
- `animal` é a entidade-mãe clínico-assistencial;
- a experiência foi desenhada para permitir navegação cruzada entre tutor e paciente sem troca de contexto;
- o beta já cobre bem essa dupla de cadastros, mesmo em um produto ainda híbrido com legado.

## 2. Papel funcional dos módulos

### 2.1 Cadastro de clientes

O cadastro de clientes representa a conta principal de relacionamento.

Papel observado:

- identificar o tutor/responsável;
- concentrar dados cadastrais e documentais;
- servir como ponto de abertura de comanda;
- agrupar animais vinculados;
- concentrar visão de pacotes, pontos, situação financeira, agenda, orçamentos e histórico operacional;
- oferecer ponte para canais digitais como Live Animal e Live Lab.

### 2.2 Cadastro de animais

O cadastro de animais representa a entidade clínico-operacional principal.

Papel observado:

- identificar o paciente;
- associar o animal ao seu tutor;
- servir como ponto de abertura de comanda;
- concentrar observações e dados assistenciais;
- abrir acesso ao histórico de atendimento e submódulos clínicos;
- fornecer uma navegação rápida entre ficha clínica e cadastro do cliente.

## 3. Backend confirmado e dependências de dados

Chamadas confirmadas na navegação beta:

- `GET /clients/page-query`
  - usado na listagem de clientes;
  - também aparece como apoio na listagem de animais, porque cada animal exibe o tutor associado.

- `GET /animals`
  - usado na listagem de animais.

- `GET /breed`
  - usado no módulo de animais para apoio à informação de raça.

- `GET /notificacoes/contagens/47`
  - chamada transversal do shell.

Chamadas confirmadas por rota:

- `/cadastro/clientes`
  - `GET /clients/page-query`

- `/cadastro/animais`
  - `GET /clients/page-query`
  - `GET /animals`
  - `GET /breed`

Implicação prática:

- a listagem de clientes é centrada em uma consulta paginada da entidade cliente;
- a listagem de animais é uma composição de animal + cliente + raça;
- o módulo de animais depende explicitamente do relacionamento com o tutor já na própria listagem;
- o desenho confirma que cliente e animal não foram modelados como domínios isolados.

## 4. Módulo de cadastro de clientes

### 4.1 Estrutura da listagem

Rota:

- `/cadastro/clientes`

Evidência principal:

- [clientes-lista-expandida.png](../inspection/2026-04-23T22-48-13-795Z-cadastros/screenshots/clientes-lista-expandida.png)

Componentes visíveis:

- campo de busca principal com placeholder `Buscar por Nome, CPF, E-mail ou ID`;
- botão `Filtrar`;
- CTA `Cadastrar Novo Cliente`;
- paginação;
- cartões por cliente em vez de tabela tradicional.

Cada card da listagem contém:

- status visual `Ativo`;
- nome do cliente;
- ID;
- CPF/CNPJ;
- ação `Detalhes`;
- ação `Abrir comanda`;
- acordeon `Informações de Contato`;
- acordeon `Animais do Cliente`.

Leitura de UX:

- a tela privilegia consulta operacional rápida;
- o card já evita a ida obrigatória ao detalhe para tarefas recorrentes;
- o padrão usa disclosure progressive:
  - card resumido por padrão;
  - expansões para contato e animais;
  - navegação para detalhe completo quando necessário.

### 4.2 Composição da listagem

Informação observada na listagem expandida:

- bloco principal do cliente com status e identificadores;
- expansão de contato;
- expansão com os animais vinculados;
- ação `Ver Detalhes` dentro do bloco dos animais vinculados;
- ação `Abrir comanda` no nível do cliente.

Isso sugere dois níveis de navegação:

- nível tutor;
- nível animal vinculado ao tutor.

É uma decisão importante porque reduz atrito para recepção e atendimento.

### 4.3 Tela de detalhe do cliente

Rota observada:

- `/cadastro/clientes/detalhes/7716`

Evidência principal:

- [clientes-detalhe-expandido.png](../inspection/2026-04-23T22-48-13-795Z-cadastros/screenshots/clientes-detalhe-expandido.png)

Organização estrutural:

- layout em duas colunas;
- coluna esquerda para cadastro mestre do cliente;
- coluna direita para módulos relacionados e indicadores.

#### Coluna esquerda

Blocos confirmados:

- status do cliente;
- nome do cliente;
- ID e data de cadastro;
- botão `Editar Cadastro`;
- botão `Enviar Mensagem`;
- seção `Identificação do Cliente`;
- seção `Informações de Contato`;
- seção `Documentação do Cliente`;
- seção `Endereço do Cliente`;
- seção `Observações Gerais`.

Campos confirmados:

- sexo;
- data de nascimento;
- recebe SMS?;
- grupo;
- telefone 1;
- telefone 2;
- celular;
- e-mail;
- física ou jurídica;
- CPF/CNPJ;
- RG;
- CEP;
- endereço;
- número;
- complemento;
- estado;
- cidade;
- bairro;
- observações gerais.

Leitura funcional:

- essa ficha já cobre dados cadastrais, documentais e de comunicação;
- há preocupação explícita com consentimento/uso operacional de SMS;
- a presença de `grupo` sugere segmentação comercial ou operacional;
- endereço e documentação estão completos o suficiente para uso financeiro e fiscal em vários contextos.

#### Coluna direita

Blocos confirmados:

- `Animais Cadastrados`
- `Resgate de Pontos`
- `Pacotes`
- `Live Animal e Live Lab`
- `Agenda`
- `Comandas e Vendas`
- `Orçamentos`
- `Situação Financeira`

O que cada bloco expressa:

- `Animais Cadastrados`
  - mostra animal vinculado, raça, idade;
  - permite `Detalhes` do animal;
  - permite `Abrir Comanda`;
  - permite `Cadastrar Novo Animal`.

- `Resgate de Pontos`
  - mostra `Disponíveis` e `Bloqueados`;
  - indica existência de mecânica de fidelização.

- `Pacotes`
  - mostra adicionados, executados e vencimento;
  - indica vínculo do cliente com venda de pacotes/planos.

- `Live Animal e Live Lab`
  - indica integração com canais digitais para acompanhamento;
  - possui estado de ativação/desativação;
  - possui botão `Configurar`.

- `Agenda`
  - resume próximo agendamento e indicadores associados;
  - posiciona o cliente como eixo de relacionamento agendado.

- `Comandas e Vendas`
  - informa quantidade total;
  - informa quantidade em aberto;
  - informa valor total.

- `Orçamentos`
  - mostra último orçamento;
  - mostra total de orçamentos.

- `Situação Financeira`
  - mostra saldo em créditos;
  - mostra saldo devedor.

Leitura de negócio:

- o detalhe do cliente não é apenas cadastro;
- ele funciona como cockpit de relacionamento, faturamento e jornada;
- a tela mistura CRM, operação, comercial e financeiro numa mesma superfície.

### 4.4 Ações disponíveis no módulo de clientes

Ações confirmadas:

- buscar cliente por nome, CPF, e-mail ou ID;
- filtrar;
- cadastrar novo cliente;
- abrir detalhe;
- abrir comanda;
- enviar mensagem;
- editar cadastro;
- navegar para animal associado;
- cadastrar novo animal a partir do detalhe do cliente;
- configurar Live Animal / Live Lab.

Consequência arquitetural:

- o módulo de clientes foi desenhado como ponto de comando;
- várias ações operacionais saem diretamente dele, sem depender de menu adicional.

## 5. Módulo de cadastro de animais

### 5.1 Estrutura da listagem

Rota:

- `/cadastro/animais`

Evidência principal:

- [animais-lista-expandida.png](../inspection/2026-04-23T22-48-13-795Z-cadastros/screenshots/animais-lista-expandida.png)

Componentes visíveis:

- campo de busca principal com placeholder `Buscar por Nome, Cliente ou E-mail`;
- botão `Busca Avançada`;
- botão `Filtrar e ordenar`;
- CTA `Cadastrar Novo Animal`;
- paginação;
- cards por animal.

Cada card da listagem contém:

- nome do animal;
- ID;
- raça;
- idade;
- ação `Detalhes`;
- ação `Abrir Comanda`;
- bloco expansível `Informações do cliente`.

Dentro da expansão do cliente:

- nome do tutor;
- CPF/CNPJ;
- celular;
- e-mail.

Leitura de UX:

- o módulo privilegia a entidade animal, mas não perde o tutor de vista;
- a recepção consegue localizar o animal e validar o responsável sem abrir outra tela;
- há equilíbrio entre dado clínico curto e dado administrativo essencial.

### 5.2 Busca e filtragem

A tela expõe dois mecanismos distintos:

- busca principal textual;
- busca avançada;
- filtro e ordenação.

Isso indica uma arquitetura de recuperação pensada para bases grandes.

A própria tela exibe grande volume paginado de resultados, reforçando que:

- o módulo foi projetado para operação com cadastros extensos;
- busca simples e busca avançada têm papéis complementares.

### 5.3 Tela de detalhe do animal

Rota observada:

- `/cadastro/animais/detalhes/10115`

Evidência principal:

- [animais-detalhe-expandido.png](../inspection/2026-04-23T22-48-13-795Z-cadastros/screenshots/animais-detalhe-expandido.png)

Organização estrutural:

- layout em duas colunas;
- coluna esquerda para ficha-base do animal;
- coluna direita para áreas clínicas/operacionais relacionadas.

#### Coluna esquerda

Blocos confirmados:

- ID do animal;
- nome do animal;
- raça;
- idade;
- data de cadastro;
- botão `Excluir Cadastro`;
- botão `Editar Cadastro`;
- doença crônica;
- alergia;
- temperamento;
- `Ver mais Informações do Animal`;
- observações gerais do animal;
- vínculo com cliente;
- `Ver Informações de Contato`;
- botão `Enviar Mensagem`;
- botão `Ver cadastro do cliente`.

Leitura funcional:

- a tela não trata o animal como item passivo de cadastro;
- ela já é uma ficha operacional com semântica clínica;
- os campos `doença crônica`, `alergia` e `temperamento` mostram preocupação com segurança e contexto de atendimento;
- o botão para voltar ao cadastro do cliente fecha o ciclo relacional tutor-paciente.

#### Coluna direita

Blocos confirmados:

- `Últimos Atendimentos`
- `Anamneses`
- `Vacinas e Vermífugos`
- `Agenda`
- `Exames`
- `Internação`
- `Receituário`
- `Gráfico de peso`
- `Imagens`
- `Histórico Clinico`

Leitura funcional:

- essa coluna transforma o detalhe do animal em hub clínico;
- o cadastro já é ponto de entrada para histórico longitudinal;
- a navegação foi pensada para centralizar tudo que gira em torno do paciente.

Pontos fortes desse desenho:

- evita navegação fragmentada;
- reduz tempo para localizar contexto do animal;
- prepara bem a transição entre cadastro e prontuário operacional;
- sustenta atendimento recorrente e acompanhamento ao longo do tempo.

### 5.4 Ações disponíveis no módulo de animais

Ações confirmadas:

- buscar animal por nome, cliente ou e-mail;
- abrir busca avançada;
- filtrar e ordenar;
- cadastrar novo animal;
- abrir detalhe;
- abrir comanda;
- editar cadastro;
- excluir cadastro;
- enviar mensagem;
- acessar cadastro do cliente;
- navegar para histórico e módulos clínicos auxiliares;
- imprimir.

## 6. Relação entre clientes e animais

Essa é a parte mais importante do desenho.

O relacionamento ficou explicitamente materializado em ambos os lados.

### 6.1 No lado de clientes

O detalhe do cliente mostra:

- animais cadastrados;
- detalhes do animal;
- ação de abrir comanda por animal;
- ação de cadastrar novo animal para aquele cliente.

### 6.2 No lado de animais

O detalhe do animal mostra:

- tutor associado;
- informações de contato do tutor;
- botão para abrir o cadastro do cliente.

### 6.3 Conclusão do relacionamento

O modelo funcional parece ser:

- `Cliente` 1:N `Animais`

Mas a implementação não deixa isso apenas no backend. Ela materializa essa relação na interface de forma operacional.

Consequências:

- recepção pode partir do tutor e chegar no animal;
- equipe clínica pode partir do animal e recuperar o tutor;
- abertura de comanda pode nascer em ambos os contextos;
- o cadastro do cliente funciona como visão portfólio dos animais;
- o cadastro do animal funciona como visão individual do paciente.

## 7. Comparação entre os dois módulos

### 7.1 Foco primário

- `Clientes`
  - foco em relacionamento, faturamento, comunicação e vínculo com vários animais.

- `Animais`
  - foco em atendimento, contexto clínico e histórico assistencial do paciente.

### 7.2 Tipo de detalhe

- `Clientes`
  - detalhe mais administrativo-comercial;
  - forte presença de pacotes, pontos, financeiro, agenda e integrações de acompanhamento.

- `Animais`
  - detalhe mais clínico-assistencial;
  - forte presença de anamneses, exames, receituário, histórico e peso.

### 7.3 Papel na jornada

- `Clientes`
  - inicia relacionamento;
  - organiza vínculo financeiro e multianimal.

- `Animais`
  - concentra a jornada assistencial contínua.

## 8. Qualidade do desenho de interface

Aspectos positivos:

- cards em vez de tabelas duras para reduzir ruído visual;
- ações principais sempre visíveis;
- hierarquia clara entre listagem e detalhe;
- uso consistente de acordeons;
- detalhe em duas colunas bem separado por contexto;
- relação tutor-animal muito bem explicitada;
- suporte à operação sem exigir troca constante de tela.

Tradeoff identificado:

- a tela de detalhe concentra muita informação;
- isso é bom para produtividade de usuário frequente, mas exige disciplina de layout para não virar sobrecarga;
- no estado atual, a organização por seções ainda segura bem essa densidade.

## 9. Limitações e gaps observados

- Não inspecionei fluxos de criação/edição para não correr risco de gravação indevida no ERP.
- As chamadas de backend confirmadas são robustas para as listagens, mas não houve captura dedicada de network por clique interno de cada seção do detalhe.
- Alguns blocos clínicos e financeiros no detalhe aparecem como summaries ou entradas de navegação, não como expansão total de conteúdo nesta rodada.
- O shell continua híbrido; portanto, parte das rotinas relacionadas a esses cadastros ainda pode desembocar em telas legacy em outras áreas.

## 10. Conclusão

Os módulos de cadastro de clientes e cadastro de animais estão entre os blocos mais maduros do beta.

O módulo de clientes já funciona como centro de relacionamento e visão consolidada do tutor:

- cadastro;
- comunicação;
- animais vinculados;
- agenda;
- comandas e vendas;
- financeiro;
- pacotes;
- fidelização;
- integrações digitais.

O módulo de animais já funciona como centro clínico-operacional do paciente:

- identificação do animal;
- observações;
- vínculo com tutor;
- atalhos para atendimento;
- anamneses;
- vacinas;
- exames;
- receituário;
- histórico;
- peso;
- imagens.

Em termos de construção de produto, a dupla está bem resolvida:

- `clientes` organiza a conta;
- `animais` organiza o paciente;
- ambos se conectam diretamente;
- e essa costura é o principal acerto funcional observado nessa parte do ERP.

## 11. Verificação

Evidências confirmadas nesta rodada:

- listagem de clientes;
- detalhe expandido de cliente;
- listagem de animais;
- detalhe expandido de animal.

Arquivos de suporte confirmados:

- [clientes-lista-expandida.json](../inspection/2026-04-23T22-48-13-795Z-cadastros/clientes-lista-expandida.json)
- [clientes-detalhe-expandido.json](../inspection/2026-04-23T22-48-13-795Z-cadastros/clientes-detalhe-expandido.json)
- [animais-lista-expandida.json](../inspection/2026-04-23T22-48-13-795Z-cadastros/animais-lista-expandida.json)
- [animais-detalhe-expandido.json](../inspection/2026-04-23T22-48-13-795Z-cadastros/animais-detalhe-expandido.json)
