# Vetus ERP Beta — Relatório Detalhado do Cockpit Clínico de Animais

**Data:** 24/04/2026  
**Escopo solicitado:** `https://erp-beta.vetus.com.br/cadastro/animais` e `https://erp-beta.vetus.com.br/cadastro/animais/detalhes/10117`  
**Base de evidência confirmada no acervo local:** listagem `/cadastro/animais` e detalhe expandido de `https://erp-beta.vetus.com.br/cadastro/animais/detalhes/10115`, além de captura histórica equivalente de outra ficha de animal.  

## 1. Observação metodológica importante

O usuário solicitou análise detalhada da rota `.../detalhes/10117`. No acervo técnico já coletado nesta máquina, a evidência estrutural mais completa disponível para o cockpit clínico de animal está salva para a rota `.../detalhes/10115`, com HTML, JSON estrutural e screenshot expandido.  

Isso significa o seguinte:

- a leitura abaixo descreve com alto grau de confiança a **estrutura da página**, o **desenho do cockpit**, os **cards**, os **CTAs** e a **organização clínica do detalhe**;
- ela **não afirma** que o conteúdo clínico específico do animal `10117` seja idêntico ao do `10115`;
- ela afirma, sim, que a **arquitetura da tela** e o **modelo operacional da ficha clínica** já estão suficientemente confirmados pelas evidências salvas.

## 2. Síntese executiva

A página de detalhe de animal no Vetus beta funciona como um **cockpit clínico longitudinal**. Ela não é um cadastro simples e nem uma ficha estática: é uma superfície de trabalho desenhada para o clínico e para a operação de atendimento acessarem, em uma única tela, a identidade do paciente, o tutor, os eventos assistenciais recentes, o histórico narrativo, a linha preventiva, os sinais biométricos, os documentos clínicos e as portas de entrada para ações transacionais como abrir comanda.

Entre todos os módulos já inspecionados no ERP, esta é uma das telas mais densas e mais importantes porque concentra, em torno do animal, praticamente toda a navegação de contexto clínico:

- passado assistencial;
- prontuário narrativo;
- prevenção;
- agenda;
- exames;
- internação;
- receituário;
- evolução de peso;
- imagens;
- vínculo com o cliente/tutor;
- ação operacional imediata via `Abrir Nova Comanda`.

## 3. Página `/cadastro/animais` — papel da listagem

### 3.1 Função da listagem

A rota `https://erp-beta.vetus.com.br/cadastro/animais` é a porta de entrada para o cockpit clínico. Ela não foi desenhada como planilha administrativa; foi desenhada como lista operacional navegável para a equipe localizar rapidamente um paciente e saltar para atendimento.

### 3.2 Elementos confirmados na listagem

Pelas evidências estruturais salvas, a listagem contém:

- título `Animais`;
- busca simples;
- `Busca Avançada`;
- `Filtrar e ordenar`;
- CTA `Cadastrar Novo Animal`;
- paginação/contagem de resultados;
- cards individuais por animal;
- CTA `Detalhes`;
- CTA `Abrir Comanda`;
- expansão de `Informações do cliente` dentro do próprio card.

### 3.3 Estrutura do card da listagem

Cada card expõe uma versão resumida do contexto clínico-administrativo do paciente:

- nome do animal;
- `ID`;
- raça;
- idade;
- bloco recolhível do cliente;
- nome do tutor;
- CPF/CNPJ;
- celular;
- e-mail;
- atalho para `Detalhes`;
- atalho para `Abrir Comanda`.

### 3.4 Leitura operacional da listagem

Essa composição mostra uma decisão de produto muito clara: antes mesmo de entrar no detalhe, o usuário já consegue validar se encontrou o paciente certo e se está no tutor certo. Em clínica veterinária isso importa muito, porque o trabalho diário costuma começar por uma dessas necessidades:

- localizar rapidamente um animal;
- conferir se o tutor está correto;
- abrir uma nova comanda sem percorrer várias telas;
- entrar no detalhe do animal para ver contexto clínico acumulado.

Ou seja, a listagem não é apenas um índice; ela já funciona como **pré-cockpit**.

## 4. Página `/cadastro/animais/detalhes/<id>` — arquitetura geral

### 4.1 Estrutura macro

A página `Detalhes do Animal` se organiza em dois blocos principais:

- **coluna esquerda:** identidade do paciente, dados clínicos resumidos, observações e vínculo com cliente;
- **coluna direita:** conjunto de cards clínicos e assistenciais longitudinais.

Esse layout é especialmente adequado para rotina veterinária porque separa:

- o **contexto estável** do paciente, que precisa estar sempre visível;
- do **contexto evolutivo**, que muda com atendimento, agenda, exames, medição e documentação.

### 4.2 Cabeçalho e ações principais

Na área principal da ficha aparecem, de forma confirmada:

- título `Detalhes do Animal`;
- CTA superior `Abrir Nova Comanda`;
- botão `Imprimir`.

Esses dois comandos já deixam explícito o papel da tela:

- `Abrir Nova Comanda` conecta imediatamente a ficha clínica ao fluxo transacional/assistencial;
- `Imprimir` sugere necessidade de materializar a ficha ou partes dela para rotinas operacionais, auditoria, repasse ou uso clínico.

## 5. Coluna esquerda — identidade clínica e contexto do tutor

### 5.1 Dados-base do animal

No acervo capturado, a coluna esquerda exibe:

- `ID`;
- `Animal`;
- `Raça`;
- `Idade`;
- `Data de Cadastro`.

Esses cinco campos são o núcleo mínimo de identificação do paciente dentro da clínica. O valor da `Data de Cadastro` também é relevante porque ajuda a distinguir:

- paciente novo;
- paciente recorrente;
- paciente recém-absorvido de outra base ou recém-cadastrado na unidade.

### 5.2 Ações cadastrais

Ainda na mesma coluna aparecem:

- `Excluir Cadastro`;
- `Editar Cadastro`.

Essas ações não são clínicas, mas fazem parte do cockpit porque a ficha do animal não é apenas prontuário; ela também é o registro mestre do paciente.

### 5.3 Indicadores clínicos rápidos

O painel traz três campos muito importantes para triagem e risco operacional:

- `Doença Crônica`;
- `Alergia`;
- `Temperamento`.

No exemplo capturado, todos aparecem como `Não Informado`, mas a presença desses campos é mais importante do que o conteúdo concreto porque ela revela a modelagem pretendida:

- `Doença Crônica` sinaliza condição longitudinal de base;
- `Alergia` é um dado crítico para segurança clínica e medicamentosa;
- `Temperamento` é um dado operacional essencial para manejo, contenção, coleta, exame e internação.

### 5.4 Expansão de mais informações do animal

Há um CTA `Ver mais Informações do Animal`. Isso indica que a ficha visível no cockpit é propositalmente resumida e que existe uma segunda camada de detalhamento, provavelmente com:

- dados zootécnicos ou complementares;
- características físicas;
- dados reprodutivos;
- identificadores adicionais;
- informações clínicas não essenciais para o primeiro olhar.

### 5.5 Observações gerais

A coluna esquerda também traz `Observações Gerais do Animal`. No exemplo capturado, o valor visível é `PARTICULAR`.

Mesmo quando o valor parece simples, esse campo é arquiteturalmente forte, porque opera como espaço de contexto curto persistente. É o tipo de informação que a equipe precisa ver logo ao abrir a ficha, sem navegar por histórico completo.

### 5.6 Bloco do cliente/tutor

Abaixo do contexto do animal aparece a relação direta com o tutor:

- `Cliente`;
- CTA `Ver Informações de Contato`;
- CTA `Enviar Mensagem`;
- CTA `Ver cadastro do cliente`.

Essa ligação deixa clara uma decisão importante do Vetus:

- o animal é o centro clínico;
- o cliente é o centro relacional, comunicacional e econômico;
- a ficha do animal precisa dar acesso direto ao cadastro do tutor sem quebrar o fluxo assistencial.

## 6. Coluna direita — cards do cockpit clínico

O lado direito da tela é o coração da experiência. Abaixo estão os cards confirmados e sua leitura funcional detalhada.

## 7. Card `Últimos Atendimentos`

### 7.1 O que está confirmado

O card existe com o título `Últimos Atendimentos` e pelo menos dois CTAs associados ao bloco:

- `Ver Comanda`;
- `Ver mais Atendimentos`.

Na evidência capturada, há um item explícito:

- `Comanda Sem Serviço`;
- `23/04/2026 às 19:33h`;
- `Qtd: 1`;
- `Responsável: MAURICIO TAKESHI`.

### 7.2 O que esse card representa

Esse card é a porta de entrada mais imediata para o histórico assistencial recente do paciente. Ele funciona como mini-timeline resumida dos eventos mais recentes ligados ao animal.

Os sinais mais importantes aqui são:

- presença do conceito de `Comanda`;
- data e hora do atendimento;
- quantidade associada;
- responsável profissional.

### 7.3 Papel clínico e operacional

Para o clínico, esse card resolve perguntas rápidas como:

- quando foi a última passagem do animal;
- quem atendeu;
- qual o evento mais recente;
- se existe comanda acessível para aprofundar.

Para recepção e operação, ele responde:

- se o animal já esteve recentemente na unidade;
- se existe lastro operacional recente;
- se é possível abrir a comanda anterior como contexto.

### 7.4 Por que ele é estruturalmente importante

Esse card reduz o tempo de reconstrução manual de contexto. Em vez de pedir que o usuário navegue por lista de comandas, ele já injeta no cockpit a camada de memória recente do paciente.

## 8. Card `Anamneses`

### 8.1 O que está confirmado

O card aparece como `Anamneses`, com ações:

- `Ver mais Anamneses`;
- `Incluir Nova Anamnese`.

### 8.2 Interpretação funcional

`Anamnese` é um dos elementos mais centrais do prontuário clínico. A existência de um card próprio dentro do detalhe do animal mostra que o Vetus separa claramente:

- evento operacional/comercial (`comanda`);
- documento clínico narrativo e semi-estruturado (`anamnese`).

### 8.3 Leitura de produto

Ao trazer esse card diretamente para o cockpit, o sistema assume que anamnese não é detalhe escondido dentro de um atendimento isolado. Ela passa a compor a memória longitudinal do paciente.

Isso é muito importante para clínica veterinária porque:

- o animal não verbaliza sintomas;
- parte importante do raciocínio clínico vem do relato do tutor;
- evolução e recorrência dependem de comparação com anamneses anteriores.

### 8.4 Papel na rotina

Esse card sustenta dois comportamentos:

- consulta de histórico anamnésico acumulado;
- inclusão rápida de uma nova anamnese durante a jornada do atendimento.

Em outras palavras, ele liga retrospectiva clínica e ação imediata.

## 9. Card `Vacinas e Vermífugos`

### 9.1 O que está confirmado

O cockpit exibe um card `Vacinas e Vermífugos` com ações:

- `Ver Mais Vacinas/Vermífugos`;
- `Incluir Nova Vacina/Vermífugo`.

### 9.2 Função assistencial

Esse card é a camada preventiva diretamente acoplada ao paciente. Ele traz para dentro do detalhe do animal um domínio que, em muitos ERPs, ficaria isolado em módulo próprio. Aqui, ele é tratado como parte natural da visão clínica.

### 9.3 Leitura longitudinal

Dentro do cockpit, `Vacinas e Vermífugos` opera como memória preventiva do animal:

- o que já foi aplicado;
- o que pode estar em atraso;
- o que ainda precisa ser incluído;
- como a prevenção conversa com agenda e comunicação.

### 9.4 Por que esse card é crítico

Na prática veterinária, prevenção não é periférica. Ela é recorrente, orienta retorno, gera contato com tutor, produz agenda futura e pode impactar faturamento e fidelização. Colocá-la no cockpit evita que o clínico trate prevenção como um módulo separado do paciente real.

## 10. Card `Agenda`

### 10.1 O que está confirmado

O card `Agenda` existe e, no caso capturado, mostra o estado vazio:

- `Este animal ainda não possui agendamentos cadastrados.`

### 10.2 O que isso revela sobre a modelagem

A agenda é vinculada diretamente ao animal, não apenas ao cliente ou à unidade. Isso é correto do ponto de vista assistencial, porque o agendamento precisa ser lido pelo paciente, mesmo quando o tutor tem vários animais.

### 10.3 Papel operacional

Esse card responde a perguntas de rotina:

- há retorno marcado;
- houve encaixe recente;
- existe procedimento planejado;
- há continuidade assistencial futura.

### 10.4 Importância para o cockpit

A presença da agenda dentro da ficha torna a tela útil não só para revisar passado, mas também para enxergar próximo passo. O cockpit deixa então de ser apenas retrospectivo e passa a apoiar continuidade.

## 11. Card `Exames`

### 11.1 O que está confirmado

O card `Exames` existe e no HTML salvo mostra:

- estado vazio `Esse animal não possui exames registrados.`;
- botão `Ver mais Exames`, desabilitado no estado capturado;
- botão `Upload de Exame PDF`.

### 11.2 Leitura funcional

Esse card cobre duas necessidades diferentes:

- consulta do acervo de exames já vinculados ao paciente;
- incorporação de documento externo via upload.

### 11.3 Importância clínica

Nem todo exame nasce dentro do próprio fluxo laboratorial interno do ERP. O CTA `Upload de Exame PDF` mostra que o produto aceita coexistência entre:

- exame produzido/estruturado dentro do sistema;
- exame vindo de fora, mas que precisa compor o prontuário do animal.

### 11.4 Papel no cockpit

Esse é o ponto em que o prontuário deixa de ser só textual e passa a absorver evidência diagnóstica documental. Para o clínico, isso é central porque exames costumam ser um dos principais insumos de decisão terapêutica e acompanhamento.

## 12. Card `Internação`

### 12.1 O que está confirmado

O card `Internação` aparece no cockpit e, no estado capturado, exibe:

- `Esse animal não possui internações registradas`

### 12.2 Significado arquitetural

O simples fato de internação estar presente na ficha do animal já diz muito sobre a ambição clínica da tela. O sistema não está modelando o paciente apenas para atendimento ambulatorial; ele prevê continuidade e complexidade clínica.

### 12.3 Papel assistencial

Quando houver registros, esse card tende a responder:

- se o paciente já foi internado;
- em que contexto;
- com qual recorrência;
- e com qual carga de cuidado contínuo.

### 12.4 Relevância no fluxo

Esse card é a ponte entre:

- atendimento pontual;
- caso clínico continuado;
- terapêutica prolongada;
- consumo assistencial que frequentemente se converte em comanda e reflexos financeiros.

## 13. Card `Receituário`

### 13.1 O que está confirmado

O card `Receituário` está presente com:

- estado vazio `Esse animal não possui receitas registradas.`;
- botão `Ver mais Receitas`, desabilitado no estado capturado;
- botão `Incluir Nova Receita`.

### 13.2 Função clínica

Esse card transforma o cockpit em ponto de acesso à terapêutica prescrita do animal. Ele não apenas registra que houve atendimento; ele preserva o que foi formalmente prescrito.

### 13.3 Por que isso é central para o clínico

Receita é uma das peças mais consultadas em retorno e continuidade de cuidado. O clínico precisa saber:

- o que já foi prescrito;
- quando foi prescrito;
- se há nova necessidade de prescrição;
- se o tratamento atual conflita com histórico anterior.

### 13.4 Leitura de produto

Ao colocar `Incluir Nova Receita` direto no detalhe, o Vetus elimina fricção operacional. A ficha do animal vira lugar de trabalho real, e não apenas lugar de consulta.

## 14. Card `Gráfico de peso`

### 14.1 O que está confirmado

O card `Gráfico de peso` é um dos mais ricos estruturalmente no HTML capturado. Ele contém:

- seletores de período `3 meses`, `6 meses` e `1 ano`;
- cabeçalho com `Peso atual: 0 Kg` no estado registrado;
- área de gráfico em `canvas`;
- botão `Ver mais Pesos`;
- botão `Atualizar peso`.

### 14.2 O que esse card representa

Esse card introduz no cockpit uma camada biométrica e evolutiva. Diferente dos cards documentais ou transacionais, ele organiza dado seriado ao longo do tempo.

### 14.3 Valor clínico

Peso é uma variável extremamente relevante na prática veterinária:

- dosagem medicamentosa;
- acompanhamento nutricional;
- avaliação de evolução clínica;
- comparação entre consultas;
- monitoramento de pacientes crônicos, geriátricos, pediátricos ou internados.

### 14.4 Valor de UX clínica

Os recortes `3 meses`, `6 meses` e `1 ano` mostram que o produto foi pensado para leitura comparativa temporal, não só para cadastro de um valor isolado. Isso muda bastante a utilidade da tela porque transforma dado bruto em tendência.

### 14.5 Papel dentro do cockpit

Esse card dá ao clínico uma visão rápida de evolução física do paciente sem exigir ida a módulo externo. Entre todos os cards do detalhe, ele é um dos que mais claramente sustentam a ideia de prontuário longitudinal.

## 15. Card `Imagens`

### 15.1 O que está confirmado

O card `Imagens` aparece com:

- estado vazio `Esse animal não possui imagens registradas`;
- botão `Ver mais Imagens`, desabilitado no estado capturado.

### 15.2 Interpretação funcional

Esse card é a camada visual/documental do prontuário. Ele abre espaço para registro imagético associado ao animal, o que pode incluir materiais de acompanhamento clínico, lesões, evolução, documentação de procedimentos ou anexos visuais diversos.

### 15.3 Relevância clínica

Imagem é um tipo de evidência muito útil em acompanhamento veterinário porque:

- permite comparar evolução;
- reduz dependência de descrição puramente textual;
- melhora comunicação entre profissionais;
- ajuda em retorno e reavaliação.

### 15.4 Papel no cockpit

Ao viver dentro do detalhe do animal, esse card reforça que o prontuário é multimodal:

- textual;
- documental;
- gráfico;
- imagético.

## 16. Card `Histórico Clinico`

### 16.1 O que está confirmado

O card `Histórico Clinico` aparece como bloco expansível com:

- título `Histórico Clinico`;
- área de texto;
- placeholder `Escreva aqui o histórico clínico do animal`.

### 16.2 O que esse card representa

Esse é possivelmente o card mais conceitualmente importante do cockpit. Ele é o espaço de narrativa clínica longitudinal do paciente.

Enquanto outros cards capturam eventos ou documentos específicos, `Histórico Clinico` concentra a memória escrita geral do caso.

### 16.3 Valor assistencial

Esse bloco é o que permite ao clínico manter uma leitura contínua do paciente para além de eventos pontuais. É nele que cabem, em tese:

- síntese de evolução;
- padrões de recorrência;
- contexto não estruturado relevante;
- notas clínicas persistentes;
- observações que precisam sobreviver entre atendimentos.

### 16.4 Por que ele é o centro cognitivo da ficha

Na prática, um cockpit clínico só funciona de verdade quando combina:

- dados estruturados;
- linha de eventos;
- e uma camada narrativa interpretável.

É exatamente isso que o `Histórico Clinico` oferece. Ele impede que a ficha se reduza a uma coleção de cards desconectados.

## 17. Como os cards se conectam entre si

A grande força dessa tela não está apenas em cada card isoladamente, mas no fato de eles comporem uma narrativa integrada do paciente.

### 17.1 Linha de passado recente

- `Últimos Atendimentos`
- `Anamneses`
- `Receituário`

Esses cards contam o que aconteceu clinicamente e o que foi formalizado.

### 17.2 Linha preventiva e de continuidade

- `Vacinas e Vermífugos`
- `Agenda`

Esses cards mostram continuidade e retorno, não só evento passado.

### 17.3 Linha diagnóstica e documental

- `Exames`
- `Imagens`

Esses cards materializam a evidência clínica e diagnóstica.

### 17.4 Linha de gravidade/acompanhamento complexo

- `Internação`

Esse card sinaliza quando o caso sai da rotina ambulatorial e entra em cuidado contínuo.

### 17.5 Linha evolutiva longitudinal

- `Gráfico de peso`
- `Histórico Clinico`

Aqui o cockpit mostra tendência e memória clínica acumulada.

## 18. Por que esta tela pode ser chamada de cockpit do clínico veterinário

O termo `cockpit` faz sentido por quatro motivos.

### 18.1 Centraliza contexto

O clínico não precisa abrir cinco módulos para começar a raciocinar sobre o paciente.

### 18.2 Mantém identidade estável à esquerda

Enquanto percorre eventos e cards, o profissional continua vendo:

- quem é o animal;
- quem é o tutor;
- quais são os alertas clínicos básicos;
- e quais ações imediatas estão disponíveis.

### 18.3 Mistura leitura e ação

Não é uma página passiva. Ela permite:

- abrir comanda;
- incluir anamnese;
- incluir vacina/vermífugo;
- subir exame;
- incluir receita;
- atualizar peso;
- navegar para cadastro do cliente.

### 18.4 Suporta raciocínio longitudinal

A composição foi claramente feita para acompanhar o paciente ao longo do tempo, e não apenas para registrar um encontro isolado.

## 19. Pontos fortes da construção

### 19.1 Excelente costura entre domínio clínico e domínio operacional

O detalhe do animal conversa com clínica, agenda, comunicação e fluxo transacional sem romper a experiência.

### 19.2 Modelo de informação muito bem escolhido

A combinação `identidade fixa + cards evolutivos` é adequada para rotina assistencial.

### 19.3 Profundidade real de prontuário

A página não para em cadastro básico. Ela já funciona como um prontuário clínico agregador.

### 19.4 Baixa fricção para ações frequentes

Os CTAs distribuídos pelos cards sugerem redução de cliques para as tarefas mais comuns da equipe.

## 20. Limitações da evidência desta rodada

- O pedido nominal foi para `detalhes/10117`, mas a evidência detalhada disponível no acervo é de `detalhes/10115`.
- Nem todos os cards tinham conteúdo populado no momento da captura; vários apareceram em estado vazio.
- Mesmo assim, a estrutura da tela, os títulos, os CTAs e o desenho do cockpit ficaram claramente confirmados.

## 21. Conclusão

O detalhe de animal no Vetus beta deve ser tratado como uma das telas mais estratégicas de todo o ERP. Ela é, de fato, um cockpit clínico veterinário.  

Sua força vem de três decisões de produto muito acertadas:

- colocar o animal como centro do contexto assistencial;
- manter o tutor acessível sem tirar o foco do paciente;
- organizar o prontuário em cards que combinam memória, ação e continuidade.

Para times de produto, UX, engenharia e migração, esta tela merece prioridade alta porque ela condensa grande parte da experiência clínica de maior valor do sistema.
