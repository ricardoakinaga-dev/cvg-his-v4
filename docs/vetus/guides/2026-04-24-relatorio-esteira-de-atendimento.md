# Vetus ERP — Relatório Completo da Página `Esteira de Atendimento`

**Data:** 24/04/2026  
**Página solicitada:** `https://erp.vetus.com.br/Sistema/Atendimento/Esteira.htm`  
**Escopo pedido:** funcionamento completo da esteira, ritmo assistencial do hospital, transferências entre setores, acesso rápido a prontuário/comanda, início de atendimento com responsável e finalização do atendimento.  

## 1. Base de evidência usada

Este relatório foi construído com base em quatro camadas de evidência já preservadas no acervo local:

- captura visual da tela legacy funcional: `docs/vetus/modulos/att-04-esteira.png`;
- captura da tentativa de abertura pelo shell beta, que termina em indisponibilidade: `docs/vetus/screenshots/atendimento-esteira-01.png`;
- relatório já consolidado da entidade `Comanda`, onde apareceram `Histórico de Esteira` e `Encaminhar Esteira`;
- documento de planejamento e arquitetura do domínio, que descreve a `Esteira de Atendimento` como pipeline/Kanban de pacientes.

## 2. Síntese executiva

A `Esteira de Atendimento` deve ser lida como a fila operacional do hospital orientada por estágio/setor, e não como simples relatório de comanda. Ela organiza o trânsito do paciente ao longo do atendimento, preservando visibilidade de:

- onde o paciente está agora;
- quando ele entrou na etapa atual;
- quem o enviou;
- quem está atendendo;
- qual o grau de urgência;
- e qual comanda/atendimento sustenta o caso.

Mesmo com a captura disponível mostrando estado vazio, a composição da tela e a costura com a `Comanda` deixam claro que a esteira é uma superfície de controle do fluxo hospitalar. Na prática, ela dita ritmo porque transforma o atendimento em pipeline visível.

## 3. Estado de acesso da rotina

### 3.1 Legacy funcional

A rota legacy `Esteira.htm` abriu e foi capturada com sucesso no acervo. A tela aparece operacional no ambiente legado.

### 3.2 Shell beta indisponível

A captura do shell beta mostra a mensagem:

- `Desculpe, página indisponível`
- `A página que você tentou acessar está quebrada ou pode ter sido removida.`

Isso confirma que, em 24/04/2026, a esteira ainda não estava entregue como experiência SPA funcional no shell moderno e seguia dependente da página legacy.

## 4. Papel da esteira no hospital

A `Esteira de Atendimento` é uma rotina de coordenação. O seu valor não está em registrar detalhe clínico profundo; está em orquestrar movimento, prioridade, responsável e passagem do paciente entre fases assistenciais.

Por isso ela é crítica em hospital veterinário:

- evita pacientes “sumidos” no fluxo;
- reduz ambiguidade sobre quem está com o caso;
- mostra gargalos por etapa/setor;
- ajuda a controlar espera excessiva;
- conecta atendimento clínico à comanda operacional;
- cria trilha de movimentação entre setores.

Ela funciona, portanto, como uma combinação de:

- fila operacional;
- painel de handoff;
- rastreio setorial do paciente;
- ponte entre atendimento e comanda.

## 5. Construção visual da página

### 5.1 Cabeçalho principal

A captura legacy mostra um título claro:

- `Esteira de Atendimento`

O título ocupa a área principal da tela, em destaque, indicando que não se trata de subcomponente escondido de outro módulo. É uma rotina própria.

### 5.2 Estrutura geral do layout

A tela segue o padrão legacy do Vetus:

- menu lateral persistente;
- barra superior com busca e suporte;
- miolo principal com área branca de trabalho;
- bloco único central com filtros e grade.

Não é um Kanban visual por colunas na captura disponível; a implementação que aparece no legado está montada como **painel filtrável + tabela operacional**.

Essa diferença é importante:

- no planejamento, a esteira é descrita conceitualmente como Kanban/pipeline;
- no legado capturado, ela está materializada como grade operacional com colunas de estágio e responsabilidade.

## 6. Barra de filtros

### 6.1 Filtros confirmados

Na captura legacy estão visíveis os filtros:

- `Setor Atual`
- `Profissional Responsável`
- `Cliente`
- `ID Animal`
- opção `Todas`
- botão `Pesquisar`

### 6.2 Leitura funcional dos filtros

Esses filtros dizem muito sobre o desenho da esteira.

#### `Setor Atual`

É o filtro mais importante da tela. Ele indica que a esteira é organizada por localização/etapa assistencial corrente. Em contexto hospitalar isso tende a refletir setores como:

- recepção;
- triagem;
- consultório;
- exame;
- medicação/procedimento;
- observação;
- internação;
- alta/finalização.

Mesmo que os nomes concretos não estejam visíveis na captura, o campo `Setor Atual` já prova que o paciente é rastreado por estágio físico ou operacional.

#### `Profissional Responsável`

Esse filtro confirma que a esteira não controla só lugar do paciente; ela também controla **responsabilidade clínica/operacional**. Isso é essencial para:

- saber quem está conduzindo o caso;
- repartir carga entre profissionais;
- localizar rapidamente atendimentos sob determinada pessoa;
- apoiar início de atendimento e acompanhamento do responsável ativo.

#### `Cliente`

Mesmo sendo esteira de atendimento, a busca por `Cliente` mostra que o tutor continua sendo chave de recuperação operacional. Isso é coerente com a modelagem geral do Vetus: o animal é o centro clínico, mas o cliente continua âncora relacional e econômica.

#### `ID Animal`

Esse filtro é particularmente forte para rotina hospitalar, porque evita ambiguidade quando:

- o tutor tem múltiplos animais;
- há nomes de animais repetidos;
- a equipe precisa localizar o paciente com precisão.

#### `Todas`

A opção `Todas` sugere visão transversal, provavelmente removendo recorte de setor ou ampliando a consulta para o fluxo inteiro.

### 6.3 Consequência operacional dos filtros

O conjunto de filtros mostra que a tela foi pensada para duas formas de uso:

- **gestão macro do fluxo**, por setor e por responsável;
- **localização rápida de caso específico**, por cliente ou por animal.

## 7. Grade principal da esteira

### 7.1 Colunas confirmadas

A tabela exibida na captura legacy mostra as colunas:

- `Setor Atual`
- `Recebido em`
- `Enviado por`
- `Cliente`
- `Animal`
- `Em atendimento com`
- `Atendimento`
- `Urgência`
- `Comanda`

Essa grade resume com bastante precisão a função da esteira.

### 7.2 Leitura detalhada de cada coluna

#### `Setor Atual`

É a posição corrente do paciente no fluxo. Essa coluna responde a pergunta mais importante da esteira:

- onde o paciente está agora?

#### `Recebido em`

É a marca temporal da entrada na etapa corrente. Ela é indispensável para:

- medir tempo parado em setor;
- detectar atraso;
- verificar ordem de chegada por estágio;
- embasar alertas de SLA/tempo excedido.

#### `Enviado por`

Essa coluna é central para handoff entre setores. Ela registra a origem humana da movimentação:

- quem encaminhou o caso;
- qual profissional ou operador fez a transição;
- quem é o emissor do handoff.

#### `Cliente`

Identifica o tutor associado ao caso e garante contexto relacional/econômico sem obrigar o operador a sair da esteira.

#### `Animal`

É o paciente propriamente dito. Em hospital veterinário, essa coluna é a âncora clínica real do fluxo.

#### `Em atendimento com`

Essa coluna é uma das mais importantes da tela porque torna visível o profissional atualmente vinculado à condução do caso. Ela é o ponto mais claro, na própria grade, de que a esteira não controla apenas fila, mas também **responsabilidade ativa**.

#### `Atendimento`

Essa coluna indica vínculo com o episódio assistencial em si. A leitura mais provável é que ela permita identificar ou acessar o atendimento corrente do paciente.

#### `Urgência`

A presença dessa coluna prova que a esteira suporta diferenciação de prioridade clínica/operacional. Em hospital, isso é decisivo para ordenar o fluxo e reduzir risco assistencial.

#### `Comanda`

Essa coluna amarra a esteira ao lado transacional. O caso clínico não fica isolado do evento operacional/econômico; ele pode ser correlacionado à comanda correspondente.

## 8. Transferência do paciente entre setores

### 8.1 O que está confirmado diretamente

A combinação das colunas `Setor Atual`, `Recebido em` e `Enviado por` já confirma que há lógica de transferência/handoff entre etapas.

### 8.2 O que a `Comanda` adiciona à leitura

No relatório já consolidado da `Comanda`, o bloco `Histórico de Esteira` revelou os seguintes elementos:

- urgência/status de fila;
- horário de entrada;
- setor anterior;
- setor receptor;
- enviado por;
- ação para ver mais informações.

Além disso, o detalhe da comanda mostra o botão:

- `Encaminhar Esteira`

### 8.3 Conclusão sobre transferência setorial

Com isso, a leitura fica forte:

- a esteira registra movimentação do paciente por setores;
- cada passagem tem carimbo de tempo;
- há rastreio do emissor da transferência;
- existe relação direta entre comanda e movimento na esteira;
- o fluxo não é só visual, ele deixa trilha histórica.

### 8.4 Papel hospitalar dessa transferência

Em hospital, a transferência entre setores é um dos pontos mais sensíveis da operação. A esteira serve exatamente para formalizar esse handoff:

- recepção -> atendimento;
- atendimento -> exame/procedimento;
- atendimento -> internação;
- etapa atual -> finalização.

Mesmo sem ver os botões de transição no estado vazio, a estrutura do sistema já confirma a existência de um pipeline com encaminhamento.

## 9. Início do atendimento e responsável pelo caso

### 9.1 Evidência direta

A coluna `Em atendimento com` é a principal evidência direta da associação do caso com um profissional responsável.

### 9.2 Leitura operacional

Isso sugere um marco de estado importante no fluxo:

- o paciente deixa de estar só aguardando ou transitando;
- ele passa a estar em atendimento com alguém nominalmente definido.

### 9.3 Relação com “iniciar atendimento”

Na captura disponível não aparece um botão visível de `Iniciar Atendimento`, porque a grade está vazia. Ainda assim, a existência da coluna `Em atendimento com` e do filtro `Profissional Responsável` torna muito forte a leitura de que o início do atendimento materializa ao menos dois efeitos:

- definição do profissional responsável;
- mudança do caso para um estado/setor de atendimento ativo.

### 9.4 Valor assistencial

Esse vínculo é essencial para evitar o problema clássico de operação hospitalar:

- caso sem dono;
- paciente parado;
- equipe sem clareza sobre quem assumiu o atendimento.

## 10. Finalização do atendimento

### 10.1 O que a tela mostra indiretamente

A própria ideia de esteira implica entrada, permanência e saída do fluxo. O documento de planejamento do domínio descreve a esteira como pipeline com etapas:

- `Aguardando`
- `Em Atendimento`
- `Em Exame`
- `Finalizado`

### 10.2 O que isso significa na prática

Mesmo que a captura legacy não mostre linhas preenchidas com botão de finalizar, o conceito de `Finalizado` já está documentado como etapa do fluxo.

### 10.3 Relação com comanda

Como a grade traz coluna `Comanda` e a comanda possui `Finalizar Comanda`, a interpretação operacional correta é:

- finalizar atendimento na esteira não é a mesma coisa que apenas fechar cobrança;
- mas os dois eventos precisam conversar;
- a esteira marca encerramento do fluxo assistencial;
- a comanda consolida/fecha o reflexo operacional-financeiro.

### 10.4 Consequência prática

Para o hospital, isso é importante porque impede tratar “caso finalizado” e “comanda finalizada” como a mesma coisa. Um caso pode ter ciclo assistencial concluído e ainda depender de fechamento operacional/comercial, ou o contrário.

## 11. Acesso rápido a prontuário e comanda

### 11.1 `Comanda` — evidência forte

A coluna `Comanda` está explicitamente presente na grade, e a `Comanda` já se mostrou integrada à esteira por:

- coluna própria na grade da esteira;
- `Histórico de Esteira` no detalhe da comanda;
- botão `Encaminhar Esteira` na comanda.

Isso torna a relação com comanda objetivamente confirmada.

### 11.2 `Prontuário` — evidência indireta, mas muito forte

Na captura da esteira vazia não aparece botão visível de `Prontuário`, porque não há linhas carregadas. Porém, em outros pontos do acervo:

- o detalhe da comanda exibe ação `Prontuário` no bloco de animais vinculados;
- o detalhe do animal funciona como cockpit clínico/prontuário longitudinal;
- o desenho geral do domínio de atendimento já foi consolidado como jornada `agenda -> atendimento -> prontuário`.

### 11.3 Leitura correta

Portanto:

- acesso rápido à `Comanda` está diretamente sustentado pela própria estrutura da esteira;
- acesso rápido a `Prontuário` é uma leitura arquitetural muito forte e coerente com o domínio, mas **não ficou visualmente comprovado na captura vazia da própria esteira**.

## 12. “Cards” ou ações rápidas da rotina

Na captura legacy, a esteira aparece em formato de grade, não em cards visuais. Ainda assim, o usuário pediu leitura de “cards de acesso rápido”, o que faz sentido operacionalmente. A tradução correta disso, à luz da evidência disponível, é:

- a esteira funciona como **linha operacional acionável** por paciente;
- cada linha equivale ao “card” daquele caso no pipeline;
- os acessos rápidos mais prováveis orbitam comanda, atendimento, prontuário e movimentação.

Com base no acoplamento já comprovado com `Comanda` e no papel da tela, a linha/caso da esteira tende a concentrar ou demandar:

- identificação do paciente;
- identificação do tutor;
- responsável atual;
- urgência;
- setor atual;
- vínculo com atendimento;
- vínculo com comanda;
- ação de encaminhar/mover;
- ação de abrir contexto clínico.

## 13. Como a esteira dita o ritmo do hospital

Essa página dita o ritmo do hospital porque ela distribui a operação em cinco dimensões simultâneas.

### 13.1 Ritmo por setor

O filtro e a coluna `Setor Atual` fazem a equipe enxergar acúmulo e dispersão por etapa.

### 13.2 Ritmo por profissional

O filtro `Profissional Responsável` e a coluna `Em atendimento com` expõem carga e posse do caso.

### 13.3 Ritmo por tempo

`Recebido em` permite acompanhar envelhecimento da fila/etapa.

### 13.4 Ritmo por prioridade

`Urgência` impede leitura cega por ordem simples.

### 13.5 Ritmo por vínculo operacional

`Atendimento` e `Comanda` conectam a fila assistencial aos objetos transacionais e clínicos do ERP.

## 14. Pontos fortes da construção atual

### 14.1 Modelo de informação muito bom

A grade foi desenhada com colunas certas para operação hospitalar real.

### 14.2 Boa separação entre posição, tempo, dono e transação

A tela consegue distinguir:

- onde está;
- desde quando está;
- quem enviou;
- com quem está;
- qual caso/comanda sustenta.

### 14.3 Integração forte com comanda

A esteira não vive isolada; ela conversa com a entidade transacional mais importante do domínio.

### 14.4 Potencial alto para gestão de gargalo

Mesmo uma grade simples já entrega excelente base para supervisão da operação.

## 15. Limitações e gaps observados

### 15.1 Experiência ainda concentrada no legacy

O shell beta, na data de 24/04/2026, não entregava a tela funcionalmente.

### 15.2 Captura disponível em estado vazio

A principal limitação desta análise é que a evidência visual direta da esteira está vazia:

- `Nenhuma comanda nesta esteira.`

Isso impede confirmar visualmente, nesta rodada, os botões por linha/caso.

### 15.3 Algumas leituras dependem de amarração com módulos vizinhos

Especialmente:

- acesso rápido a prontuário;
- exata forma de iniciar atendimento;
- exata forma de finalizar atendimento.

Esses pontos foram descritos com base em evidência cruzada e arquitetura do domínio, não em clique direto nesta captura.

## 16. Conclusão

A `Esteira de Atendimento` do Vetus é uma rotina de controle operacional hospitalar centrada no deslocamento do paciente entre setores e na visibilidade do responsável atual do caso.  

Mesmo sem linhas preenchidas na captura disponível, a construção da página é suficientemente forte para concluir que ela foi pensada para governar:

- entrada e progressão do atendimento;
- handoff entre setores;
- vinculação do caso a profissional responsável;
- leitura de urgência;
- vínculo com atendimento e comanda;
- e encerramento do fluxo assistencial.

Em resumo: a esteira não é um detalhe acessório do atendimento. Ela é o painel que transforma o hospital em fluxo observável e coordenável.
