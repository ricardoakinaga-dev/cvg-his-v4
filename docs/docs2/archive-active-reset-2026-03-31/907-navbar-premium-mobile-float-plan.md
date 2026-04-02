# Plano - Navbar Premium, Float, Mobile e Conforto Visual

Data: 2026-03-28
Escopo: planejamento apenas, sem implementacao de codigo nesta etapa
Base considerada:

- `docs/904-navbar-left-status-report.md`
- `docs/905-navbar-left-title-removal-plan.md`
- `docs/906-final-navbar-and-backend-frontend-integration-plan.md`
- estado atual de `apps/web/src/index.ts`
- estado atual de `apps/web/src/styles.ts`

## Objetivo

Definir um plano premium para evoluir a navbar do frontend oficial, cobrindo:

- navbar com percepcao flutuante
- adaptacao real para smartphone
- adaptacao real para tablet
- adaptacao para outros dispositivos moveis
- funcionalidade confiavel de esconder/exibir navbar
- eliminacao da sensacao estranha de o menu "voltar ao inicio" ao clicar em itens
- motion, sombras e paleta com tom suave
- contrastes confortaveis e sem agressividade visual

## Leitura do Pedido

O que se deseja nao e apenas "uma sidebar mais bonita". O pedido aponta para uma melhoria de nivel de produto:

- navegacao premium
- estabilidade de comportamento
- conforto visual
- fluidez de uso em multiplos tamanhos de tela

Isso significa que a navbar precisa deixar de ser apenas um bloco lateral funcional e passar a ser um **componente de navegacao de alta maturidade**, com:

- hierarquia visual limpa
- transicoes suaves
- densidade controlada
- comportamento previsivel
- continuidade de contexto entre rotas

## Diagnostico Atual

Hoje a navbar ja possui:

- grupos de navegacao
- links ativos
- estado expandido/recolhido
- persistencia em `localStorage`
- comportamento responsivo basico

Mas ainda apresenta sinais de primeira iteracao:

- a barra e mais "fixa/estrutural" do que "float premium"
- o mobile ainda esta simplificado demais
- o toggle existe, mas o fluxo de esconder/exibir ainda nao esta maduro
- o clique em links gera sensacao de reset
- a linguagem visual ainda tem sombras e contrastes que podem ser refinados para ficarem mais suaves

## Diagnostico Especifico por Tema

### 1. Navbar Float

Estado atual:

- a sidebar tem presenca forte e fixa no layout
- visualmente ela ainda se comporta como painel estrutural acoplado ao shell

Problema percebido:

- falta sensacao de painel premium "assentado" sobre o layout
- ainda nao comunica leveza

Diretriz de melhoria:

- a sidebar deve parecer uma camada visual elegante, nao um bloco pesado
- o efeito float precisa vir mais de composicao, borda, sombra, espacamento e backdrop do que de exagero visual

### 2. Adaptacao para smartphone

Estado atual:

- existe comportamento responsivo basico
- a sidebar vira painel lateral fixo

Problemas:

- falta overlay
- falta fechamento por clique fora
- falta `Escape`
- falta lock de scroll do fundo
- falta estrategia clara para largura, foco e toque

Diretriz:

- no smartphone, a navbar deve funcionar como drawer premium
- abertura e fechamento precisam parecer naturais e confiaveis

### 3. Adaptacao para tablet

Estado atual:

- o CSS ja tenta responder a larguras menores, mas sem uma estrategia realmente orientada a tablet

Problema:

- tablet nao deve herdar nem o comportamento puro de desktop nem o de smartphone sem criterio

Diretriz:

- definir comportamento proprio para tablet:
  - mini-sidebar persistente
  - ou drawer lateral parcialmente persistente
  - ou modo hibrido conforme largura/orientacao

### 4. Adaptacao para outros dispositivos moveis

Diretriz:

- considerar navegacao em landscape pequeno
- considerar touch area minima confortavel
- considerar leitura em densidade alta
- evitar hover-dependencia

### 5. Funcao de esconder navbar

Estado atual:

- o toggle existe
- o estado expandido/recolhido tambem existe

Problema:

- funcionalmente ainda parece um toggle tecnico, nao um comportamento premium e totalmente confiavel

Diretriz:

- esconder/exibir deve ser consistente em desktop, tablet e mobile
- o estado precisa ser previsivel
- a iconografia e a transicao precisam comunicar claramente o que aconteceu

### 6. Menu voltar ao inicio ao clicar

Leitura tecnica mais provavel:

- os links da navbar usam navegacao tradicional por `href`
- a pagina inteira e re-renderizada a cada troca de rota
- com isso, o estado de scroll da sidebar pode ser reiniciado

Impacto percebido:

- sensacao de quebra de continuidade
- navegacao parece "pulando"
- especialmente ruim em menus com muitos grupos/itens

Diretriz:

- preservar contexto da navegacao entre cliques
- impedir reset inutil da posicao da sidebar
- manter abertura dos grupos e scroll de navegacao de forma mais estavel

### 7. Motion e movimentos dos botoes

Estado atual:

- existem hovers, sombras e pequenas transicoes

Problema:

- ainda ha espaco para amadurecer o motion para algo mais premium e menos "mecanico"

Diretriz:

- reduzir agressividade de movimento
- usar deslocamentos pequenos
- priorizar suavidade e continuidade
- evitar animacoes que parecam brinquedo ou ruido visual

### 8. Sombras, paleta e contraste

Estado atual:

- a base visual e boa, mas ainda pode ser refinada

Problema:

- contrastes, profundidade e brilhos ainda podem gerar mais tensao visual do que o necessario

Diretriz:

- premium aqui significa:
  - menos dureza
  - menos saturacao
  - menos contraste abrupto
  - mais profundidade sutil
  - melhor conforto ocular

## Principios do Navbar Premium

### 1. Menos texto, mais estrutura

- remover excesso de titulos visuais
- deixar o usuario ler a estrutura primeiro

### 2. Leveza visual

- sombras macias
- bordas suaves
- transicoes discretas
- sem excesso de brilho

### 3. Continuidade de contexto

- menu nao pode parecer reiniciar a cada clique
- grupos e scroll precisam respeitar a memoria do usuario

### 4. Responsividade de verdade

- smartphone, tablet e desktop devem ter comportamentos pensados
- nao apenas o mesmo layout espremido

### 5. Estado confiavel

- esconder/exibir deve funcionar sempre
- comportamento nao pode parecer ambiguo

## Plano de Implementacao Proposto

## Fase 1 - Limpeza premium da estrutura

Objetivo:

- reduzir poluicao visual e abrir espaco para a linguagem premium

Escopo:

- remover branding textual e bloco introdutorio da sidebar
- preservar apenas:
  - toggle
  - grupos
  - links
  - area de usuario, se aprovada
- revisar hierarquia entre sidebar e topbar

Resultado esperado:

- sidebar visualmente mais limpa
- foco primario nos botoes e modulos

## Fase 2 - Reprojetar a navbar como painel float

Objetivo:

- criar a sensacao premium de navbar flutuante

Escopo:

- revisar espacamentos externos
- revisar raio de bordas
- suavizar sombras
- ajustar separacao do painel em relacao ao fundo
- trabalhar profundidade leve e nao pesada

Resultado esperado:

- a navbar passa a parecer uma camada refinada e nao um bloco duro

## Fase 3 - Responsividade por classe de dispositivo

### 3.1 Smartphone

Escopo:

- drawer lateral premium
- overlay
- clique fora para fechar
- `Escape`
- lock de scroll do fundo
- largura otimizada para polegar e leitura
- areas de toque mais confortaveis

### 3.2 Tablet

Escopo:

- definir modo hibrido
- decidir entre:
  - mini-sidebar
  - drawer persistente
  - sidebar expansivel por contexto
- validar portrait e landscape

### 3.3 Outros moveis

Escopo:

- revisar landscape baixo
- revisar densidade de itens
- garantir que o drawer nao fique pesado nem apertado

Resultado esperado:

- comportamento especifico por contexto, nao apenas um fallback generico

## Fase 4 - Consertar a continuidade da navegacao

Objetivo:

- eliminar a sensacao estranha de reset ao clicar em links

Hipoteses de causa:

- reset de scroll por navegacao full reload
- grupos reabertos do zero
- sidebar sempre reposicionada no topo

Escopo:

- persistir scroll da sidebar
- persistir grupos abertos/fechados
- revisar estrategia de navegacao para minimizar reset perceptivel
- avaliar se basta persistir estado do menu ou se o shell precisa de navegacao mais suave

Resultado esperado:

- ao clicar em um item, o usuario sente continuidade e nao "teleporte" do menu

## Fase 5 - Motion premium

Objetivo:

- deixar movimentos mais sofisticados e menos agressivos

Escopo:

- suavizar transicoes de hover
- reduzir deslocamento lateral excessivo
- padronizar easing
- animar abertura/fechamento com mais naturalidade
- revisar feedback do toggle

Resultado esperado:

- motion elegante, discreto e confortavel

## Fase 6 - Paleta, sombras e conforto visual

Objetivo:

- reduzir fadiga visual e elevar percepcao premium

Escopo:

- suavizar contrastes
- revisar acento principal
- revisar opacidades
- suavizar sombras
- melhorar relacao entre fundo, painel, links e estados ativos
- revisar estado ativo para continuar claro sem ser agressivo

Resultado esperado:

- interface mais confortavel e mais "cara" visualmente

## O que precisa ser validado antes de implementar

### 1. Produto

Confirmar:

- a topbar continua existindo?
- a area de usuario fica no rodape da sidebar ou migra para outro lugar?
- no tablet, a preferencia e mini-sidebar ou drawer?

### 2. Tecnologia

Confirmar:

- se a correcao do reset do menu sera feita por persistencia de estado
- ou se no futuro a navegacao do shell deve migrar para fluxo mais SPA

### 3. UX

Confirmar:

- tamanho ideal dos alvos de toque
- largura ideal da sidebar por breakpoint
- intensidade maxima aceitavel de sombra e contraste

## Critérios de Aceite Recomendados

Para considerar a navbar premium bem implementada:

1. a sidebar parece leve e refinada
2. o menu funciona confortavelmente em smartphone
3. o menu funciona confortavelmente em tablet
4. esconder/exibir funciona sem ambiguidade
5. o usuario nao sente reset irritante da navegacao ao trocar de item
6. grupos e contexto da sidebar permanecem estaveis
7. sombras, movimentos e cores sao suaves
8. o contraste continua acessivel, mas sem dureza visual

## Riscos

### Risco 1 - Foco excessivo em estetica sem resolver comportamento

Mitigacao:

- tratar continuidade, scroll e responsividade como prioridade junto com visual

### Risco 2 - Navbar premium virar navbar pesada

Mitigacao:

- premium aqui deve significar sobriedade, nao excesso

### Risco 3 - Mobile herdar solucoes de desktop

Mitigacao:

- projetar smartphone e tablet como contextos proprios

### Risco 4 - Resolver o reset apenas visualmente

Mitigacao:

- atacar a causa estrutural do reset perceptivo e nao apenas mascarar com animacao

## Sequencia Recomendada

1. executar limpeza da sidebar
2. redefinir o comportamento float
3. desenhar responsividade premium por breakpoint
4. corrigir continuidade de scroll/grupos/contexto
5. refinar motion
6. refinar paleta e sombras

## Recomendacao Final

O caminho mais forte para um **navbar padrao premium** e tratar essa melhoria como combinacao de:

- arquitetura do shell
- comportamento de navegacao
- sistema visual

E nao apenas como ajuste de CSS.

Traduzindo para implementacao futura:

- primeiro limpar
- depois estabilizar comportamento
- depois elevar acabamento visual

Essa ordem reduz retrabalho e aumenta a chance de o resultado final parecer realmente premium.
