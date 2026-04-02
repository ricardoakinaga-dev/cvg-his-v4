# Especificacao Funcional dos Estados da Sidebar

Data: 2026-03-27
Escopo: definicao funcional e visual dos estados da futura sidebar esquerda
Regra desta etapa: sem alteracao de codigo
Base:

- `docs/134-auditoria-navbar-left-migration.md`
- `docs/135-plano-tecnico-sidebar-esquerda.md`
- `docs/136-roteiro-operacional-sidebar-por-arquivo.md`

## 1. Objetivo

Definir como a sidebar deve parecer e se comportar em cada estado antes da implementacao.

Estados cobertos:

- expandida
- recolhida
- escondida
- drawer mobile

Tambem cobre:

- topbar compacta de apoio
- transicoes esperadas
- comportamento em smartphone, tablet e desktop
- relacao com a paleta atual

## 2. Visao Geral da Experiencia

A futura navegacao lateral deve transmitir:

- clareza institucional
- fluidez operacional
- foco no conteudo
- sensacao de ferramenta madura

A shell deve equilibrar dois objetivos ao mesmo tempo:

1. facilitar navegação entre dominios
2. liberar area util quando o profissional estiver trabalhando em telas densas

## 3. Paleta e Linguagem Visual

### 3.1. Paleta obrigatoria

Manter a paleta existente:

- fundo base: `#f7f6f2`
- texto principal: `#1f2a37`
- cor de acento: `#1f6f78`
- acento suave: `rgba(31, 111, 120, 0.12)`
- superficie principal: `#ffffff`
- linhas e divisores: `#d6d3d1`
- texto secundario: `#475569`

### 3.2. Direcao visual

A sidebar deve parecer:

- leve, nao pesada
- clara, nao escura demais
- elegante, nao genérica
- discreta, sem sumir

Diretriz:

- usar camadas brancas e off-white
- usar `accent` para ativo, foco e elementos de acao
- usar divisores sutis
- usar sombra leve e bem controlada

## 4. Composicao Global da Shell

O layout futuro deve ter:

- sidebar esquerda
- topbar compacta
- area principal
- status bar discreta

Relacao espacial desejada:

- a sidebar e a ancora da navegacao
- a topbar e apenas um apoio de contexto e controle
- o `main` e o protagonista

## 5. Estado Expandido

## 5.1. Quando usar

Padrao recomendado para:

- desktop grande
- tablet landscape
- onboarding
- navegacao exploratoria

## 5.2. Aparencia

A sidebar expandida deve:

- ocupar largura confortavel
- mostrar branding completo
- mostrar nome dos grupos
- mostrar label completa dos links
- mostrar usuario no rodape

Largura funcional sugerida:

- `272px` como referencia principal

Visual esperado:

- fundo claro sobre `--card`
- separacao lateral sutil do conteudo principal
- espacamento vertical regular
- links alinhados em coluna unica

## 5.3. Estrutura visual

Topo:

- logo/nome `CVG-HIS V2`
- subtitulo institucional em escala reduzida
- botao de recolher

Corpo:

- grupos empilhados
- cada grupo com label pequena em uppercase
- links com icone ou marcador na esquerda
- item ativo com destaque nítido

Rodape:

- nome do usuario
- opcionalmente papel resumido
- botao sair

## 5.4. Estado ativo

O item ativo deve aparecer com:

- fundo em `--accent`
- texto claro
- contraste alto
- borda arredondada consistente

Opcional recomendado:

- uma barra fina lateral ou brilho suave no ativo

## 5.5. Impressao desejada

Esse estado deve passar a sensacao de:

- painel principal da aplicacao
- navegacao organizada
- ambiente confiavel e moderno

## 6. Estado Recolhido

## 6.1. Quando usar

Padrao recomendado para:

- desktop em foco operacional
- telas com densidade alta
- usuarios recorrentes

## 6.2. Aparencia

A sidebar recolhida deve virar um rail vertical estreito.

Largura funcional sugerida:

- `80px`

Nesse estado:

- labels dos links somem
- labels dos grupos somem ou ficam minimizadas
- branding vira marca compacta
- usuario vira avatar textual curto ou botao compacto

## 6.3. Elementos que permanecem visiveis

Devem continuar visiveis:

- toggle de expandir
- item ativo
- indicadores visuais dos links
- acesso ao drawer/hover label em desktop

## 6.4. Elementos que podem sumir

Podem ser ocultados:

- subtitulo institucional
- texto dos grupos
- texto dos links
- detalhes do usuario

## 6.5. Comportamento funcional

Ao passar o mouse ou focar pelo teclado:

- o usuario deve conseguir entender o destino do item

Mecanismos aceitaveis:

- tooltip
- label flutuante
- mini popout lateral

## 6.6. Impressao desejada

Esse estado deve passar:

- agilidade
- foco
- ganho real de espaco

Sem parecer:

- menu quebrado
- menu “apagado”
- menu improvisado

## 7. Estado Escondido

## 7.1. Quando usar

Modo foco para:

- prontuario
- internacao
- bed map
- tabelas extensas
- futuras areas clinicas densas

## 7.2. Aparencia

Quando escondida:

- a sidebar desaparece por completo
- a area principal se expande
- um toggle de retorno continua acessivel

O toggle pode viver em:

- topbar compacta
- canto superior esquerdo da shell principal

## 7.3. Comportamento funcional

Ao esconder:

- o conteudo principal deve se reajustar
- o status bar nao deve ficar desalinhado
- a topbar deve continuar utilizavel

Nao basta:

- dar `display: none` na sidebar

E necessario:

- devolver espaco real ao layout

## 7.4. Impressao desejada

Esse estado deve parecer:

- intencional
- produtivo
- limpo

E nao:

- uma pane faltando
- uma barra que “sumiu sem contexto”

## 8. Estado Drawer Mobile

## 8.1. Quando usar

Padrao para:

- smartphone
- tablet portrait

## 8.2. Aparencia fechada

Quando fechada:

- a sidebar nao ocupa largura permanente
- a topbar compacta mostra o botao de menu
- o conteudo ocupa a tela

## 8.3. Aparencia aberta

Quando aberta:

- a sidebar entra da esquerda
- cobre parte relevante da largura
- aparece um overlay semitransparente sobre o conteudo

Largura recomendada:

- entre `82vw` e `88vw` no smartphone
- com limite maximo razoavel para nao ficar larga demais em tablets pequenos

## 8.4. Conteudo do drawer

O drawer deve mostrar:

- branding completo
- grupos e links com texto total
- usuario
- sair

No mobile:

- nao usar o modo recolhido
- o drawer deve ser sempre legivel

## 8.5. Fechamento

Deve ser possivel fechar por:

- clique no overlay
- botao de fechar
- tecla `Esc`
- selecao de um item de menu

## 8.6. Impressao desejada

O drawer deve parecer:

- leve
- suave
- rapido
- natural em toque

E nao:

- modal pesado
- painel travado
- camada visual agressiva

## 9. Topbar Compacta de Apoio

## 9.1. Papel

A topbar futura nao substitui a sidebar.

Ela existe para:

- toggle da sidebar
- titulo/contexto da tela
- acoes rapidas leves

## 9.2. Aparencia

Deve ser:

- discreta
- baixa em altura
- clara
- alinhada com a paleta atual

Conteudo minimo esperado:

- botao menu
- nome da tela atual
- opcionalmente nome do usuario em telas pequenas

## 9.3. Comportamento por breakpoint

Desktop:

- topbar pode ser bem minima

Tablet/mobile:

- topbar ganha mais importancia
- passa a ser o principal ponto de abertura do drawer

## 10. Especificacao do Item de Navegacao

## 10.1. Estado normal

Deve parecer:

- calmo
- legivel
- sem ruido visual excessivo

Esperado:

- padding confortavel
- texto claro
- fundo transparente ou muito sutil

## 10.2. Hover

Deve parecer:

- acolhedor
- discreto

Esperado:

- uso de `--accent-light`
- sem saltos agressivos

## 10.3. Focus

Deve parecer:

- visivel
- acessivel

Esperado:

- contorno claro
- contraste suficiente

## 10.4. Active

Deve parecer:

- inequívoco
- elegante

Esperado:

- fundo em `--accent`
- texto claro
- borda arredondada consistente

## 10.5. Disabled ou indisponivel

Se futuramente houver menu condicionado por capability:

- itens indisponiveis nao devem parecer quebrados
- podem sumir ou ficar discretos conforme decisao de produto

Nesta fase:

- fora de escopo visual obrigatorio

## 11. Especificacao dos Grupos

## 11.1. Expandida

Cada grupo deve ter:

- label pequena
- separacao visual clara
- links compactos abaixo

## 11.2. Recolhida

Cada grupo pode:

- perder label textual
- manter apenas separador/ritmo vertical

## 11.3. Mobile drawer

No drawer:

- labels dos grupos devem continuar visiveis
- melhor legibilidade que no desktop recolhido

## 12. Branding

## 12.1. Expandida

Mostrar:

- `CVG-HIS V2`
- subtitulo institucional curto

## 12.2. Recolhida

Mostrar:

- marca resumida
- monograma
- ou sigla compacta

## 12.3. Drawer mobile

Mostrar:

- branding completo

## 13. Usuario e Sessao

## 13.1. Expandida

Mostrar:

- nome
- opcionalmente role resumida
- sair

## 13.2. Recolhida

Mostrar:

- representacao compacta
- saida ainda acessivel

## 13.3. Drawer mobile

Mostrar:

- nome legivel
- sair facil

## 14. Comportamento de Transicao

## 14.1. Expandir/recolher

Deve transmitir:

- fluidez
- controle

Nao deve:

- atrasar a interacao
- “pular” layout

## 14.2. Abrir/fechar drawer

Deve transmitir:

- leveza
- resposta rapida

Nao deve:

- bloquear a tela por tempo demais
- parecer modal dramatico

## 14.3. Esconder/exibir

Deve parecer:

- modo foco
- alternancia intencional

## 15. Comportamento por Dispositivo

## 15.1. Desktop grande

Estado inicial recomendado:

- expandida

Opcoes disponiveis:

- recolher
- esconder

## 15.2. Desktop menor

Estado inicial recomendado:

- recolhida

Opcoes disponiveis:

- expandir
- esconder

## 15.3. Tablet landscape

Estado inicial recomendado:

- recolhida ou expandida leve, conforme teste visual

## 15.4. Tablet portrait

Estado inicial recomendado:

- drawer fechado

## 15.5. Smartphone

Estado inicial recomendado:

- drawer fechado

## 16. Criterios Funcionais de Aceite por Estado

## Expandida

- [ ] branding completo visivel
- [ ] grupos visiveis
- [ ] labels dos links visiveis
- [ ] item ativo claro
- [ ] usuario visivel

## Recolhida

- [ ] area util do `main` aumenta
- [ ] navegacao continua identificavel
- [ ] item ativo continua claro
- [ ] labels auxiliares funcionam

## Escondida

- [ ] sidebar some completamente
- [ ] conteudo cresce
- [ ] toggle de retorno continua visivel

## Drawer mobile

- [ ] abre sobre o conteudo
- [ ] fecha por overlay
- [ ] fecha por `Esc`
- [ ] fecha ao navegar
- [ ] texto continua legivel

## 17. Veredito Final

Esta especificacao define o comportamento esperado da futura sidebar sem entrar ainda em implementacao.

Ela fecha a etapa documental porque descreve:

- como cada estado deve parecer
- como cada estado deve se comportar
- como a experiencia deve variar entre desktop, tablet e smartphone
- como manter a identidade visual atual enquanto a shell evolui para algo mais moderno, fluido e harmonioso

Com este documento, a proxima etapa ja pode ser implementacao.
