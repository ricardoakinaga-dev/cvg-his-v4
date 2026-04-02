# Plano Tecnico de Implementacao da Sidebar Esquerda

Data: 2026-03-27
Escopo: planejamento tecnico da evolucao do navbar atual para sidebar esquerda recolhivel
Base documental: `docs/134-auditoria-navbar-left-migration.md`
Regra desta etapa: sem alteracao de codigo, somente planejamento detalhado

## 1. Objetivo

Definir a implementacao futura de uma navegacao lateral esquerda para o frontend canonico `apps/web`, com os seguintes requisitos:

- a navegacao deve poder ser escondida para ampliar a area de trabalho
- o layout deve funcionar bem em smartphone, tablet e desktop
- a experiencia deve ser moderna, fluida e harmoniosa
- a paleta atual deve ser preservada
- a shell deve continuar compativel com a autenticacao e com o estado de pagina protegida

## 2. Resultado Desejado

Ao final da futura implementacao, a aplicacao devera ter:

- uma sidebar fixa a esquerda em desktop
- um estado expandido e um estado recolhido
- um modo overlay/drawer para mobile
- um layout principal que cresca quando a sidebar estiver escondida
- uma experiencia visual consistente com a identidade atual do V2
- uma shell de pagina preparada para evolucoes futuras

## 3. Principios de Desenho

### 3.1. Manter a identidade visual atual

Preservar a paleta atual definida em `apps/web/src/styles.ts`:

- `--bg: #f7f6f2`
- `--ink: #1f2a37`
- `--accent: #1f6f78`
- `--accent-light: rgba(31, 111, 120, 0.12)`
- `--card: #ffffff`
- `--line: #d6d3d1`
- `--text-secondary: #475569`

Diretriz:

- nao mudar o eixo cromatico
- mudar a composicao espacial e o ritmo visual
- reforcar contraste, hierarquia e respiracao sem descaracterizar a aplicacao

### 3.2. Priorizar area util de trabalho

A sidebar nao deve competir com o conteudo principal.

Diretriz:

- em desktop, permitir colapso para um trilho estreito
- em mobile, ocultar por padrao e abrir sob demanda
- quando fechada, devolver area util real ao `main`

### 3.3. Tornar a shell mais previsivel

A futura implementacao nao deve ser um simples reposicionamento do `<nav>`.

Diretriz:

- tratar a mudanca como refatoracao da shell global
- separar claramente:
  - container da aplicacao
  - sidebar
  - header de contexto, se existir
  - area principal
  - status bar

## 4. Arquitetura Alvo da Shell

## 4.1. Estrutura conceitual proposta

O layout futuro deve evoluir da estrutura atual:

- `nav`
- `main`
- `status-bar`

para uma shell semelhante a:

```html
<body class="app-shell ...">
  <div class="shell">
    <aside class="sidebar ...">...</aside>
    <div class="shell-main">
      <header class="topbar">...</header>
      <main id="page-content">...</main>
    </div>
  </div>
  <div class="status-bar">...</div>
</body>
```

Observacao:

- o `header` superior pode ser minimo
- ele nao precisa reproduzir o navbar antigo
- ele pode servir apenas para:
  - toggle da sidebar
  - titulo/contexto da tela
  - usuario

## 4.2. Fonte de verdade da implementacao

Na futura execucao, a fonte principal deve continuar sendo:

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

`apps/web/src/pages/layout.ts` nao deve ser tratado como base de implementacao, porque hoje nao participa do fluxo real.

## 5. Estados da Sidebar

## 5.1. Estado expandido

Uso principal:

- desktop
- tablet landscape

Caracteristicas:

- largura completa da navegacao
- branding visivel
- labels dos grupos visiveis
- labels dos links visiveis
- usuario visivel

Largura sugerida:

- entre `264px` e `296px`

## 5.2. Estado recolhido

Uso principal:

- desktop com foco operacional
- telas densas como prontuario, internacao, bed map e tabelas

Caracteristicas:

- largura reduzida
- branding simplificado
- grupos sem label textual ou com label minimizada
- links por icone ou marcador curto
- tooltip ou label auxiliar ao hover/focus

Largura sugerida:

- entre `72px` e `88px`

Regra central:

- quando recolhida, a sidebar deve devolver largura real ao conteudo

## 5.3. Estado oculto

Uso principal:

- modo foco
- telas com grande densidade de informacao

Caracteristicas:

- sidebar totalmente escondida
- conteudo ocupa quase toda a largura disponivel
- toggle de reabertura sempre acessivel

Observacao:

- esse estado e especialmente valioso para `bed-map`, internacao, tabelas extensas e futuras telas clinicas mais densas

## 5.4. Estado overlay

Uso principal:

- smartphone
- tablet portrait

Caracteristicas:

- sidebar abre sobre o conteudo
- fundo com overlay
- fechamento por:
  - botao
  - clique fora
  - `Esc`

Regra:

- em telas pequenas, a navegacao nao deve consumir largura permanente

## 6. Breakpoints Propostos

## 6.1. Desktop grande

Faixa sugerida:

- `>= 1280px`

Comportamento:

- sidebar expandida por padrao
- pode recolher
- pode esconder
- conteudo com maior area util

## 6.2. Desktop pequeno / tablet landscape

Faixa sugerida:

- `960px` a `1279px`

Comportamento:

- sidebar recolhida por padrao ou expandida conforme preferencia persistida
- possibilidade de expandir temporariamente
- foco em equilibrio entre navegação e área útil

## 6.3. Tablet portrait

Faixa sugerida:

- `768px` a `959px`

Comportamento:

- sidebar em modo overlay
- topbar compacta com toggle
- conteudo ocupa largura principal

## 6.4. Smartphone

Faixa sugerida:

- `< 768px`

Comportamento:

- sidebar fechada por padrao
- abertura como drawer
- interacoes maiores e mais claras
- labels totalmente legiveis

## 7. Estrategia de Navegacao

## 7.1. Manter a taxonomia atual no primeiro corte

Grupos atuais:

- Essencial
- Administrativo
- Operacao
- Assistencial
- Administrativo+
- Governanca

Recomendacao:

- manter a mesma taxonomia na primeira implementacao
- evitar mudar IA e layout ao mesmo tempo

## 7.2. Melhorar a densidade visual

Na sidebar esquerda, os grupos devem ficar mais claros visualmente:

- branding no topo
- grupos com espacamento consistente
- links com estado ativo bem marcado
- hierarquia forte, mas sem poluicao

## 7.3. Estado ativo

Manter a logica atual no primeiro corte:

- comparacao por `route.nav === link.path`

Melhoria futura opcional:

- suportar `startsWith`
- suportar subniveis
- suportar grupo ativo expandido

## 7.4. Scroll da navegacao

A sidebar deve ser rolavel de forma independente do conteudo principal.

Diretriz:

- `aside` com scroll proprio
- `main` com scroll proprio
- evitar que toda a pagina dependa de um unico scroll

## 8. Estrategia Visual

## 8.1. Direcao estetica

A nova sidebar deve parecer:

- institucional
- limpa
- contemporanea
- mais proxima de ferramenta operacional madura

Sem usar outra paleta, o ganho virá de:

- composicao vertical mais clara
- fundos e camadas melhor distribuídos
- contrastes suaves com o `accent`
- transicoes elegantes e discretas

## 8.2. Composicao recomendada

Topo da sidebar:

- marca
- subtitulo institucional reduzido
- toggle de recolher

Centro:

- grupos e links

Rodape da sidebar:

- usuario atual
- acao de logout

## 8.3. Tratamento do item ativo

O item ativo deve ser facilmente reconhecivel em qualquer estado:

- expandido
- recolhido
- mobile overlay

Diretriz visual:

- fundo com `--accent`
- texto claro
- possivel faixa lateral ou marcador

## 8.4. Tratamento quando recolhida

Quando a sidebar estiver recolhida:

- cada item deve manter identificabilidade rapida
- o usuario nao deve perder contexto

Diretriz:

- usar icones ou iniciais curtas consistentes
- usar tooltip no hover/focus em desktop

Observacao:

- como o frontend atual nao tem sistema de icones consolidado, essa decisao deve ser planejada junto da execucao

## 9. Comportamento e Interacao

## 9.1. Toggle principal

Deve existir um toggle persistente para:

- expandir
- recolher
- esconder

Possiveis pontos de acionamento:

- cabecalho da sidebar
- topbar

## 9.2. Persistencia de preferencia

A preferencia de layout deve poder persistir no cliente.

Estado recomendado:

- `expanded`
- `collapsed`
- `hidden`

Persistencia sugerida:

- `localStorage`

## 9.3. Transicoes

As transicoes devem ser discretas e funcionais.

Diretriz:

- duracao curta
- easing suave
- sem animacoes excessivas

Animacoes recomendadas:

- largura da sidebar
- deslocamento do `main`
- fade leve no overlay mobile

## 9.4. Acessibilidade minima esperada

A sidebar deve respeitar:

- navegacao por teclado
- foco visivel
- `aria-expanded` no toggle
- `aria-hidden` no overlay quando fechado
- fechamento por `Esc` em modo drawer

## 10. Relacao com o Conteudo Principal

## 10.1. `main` deve deixar de assumir layout central puro

Hoje:

- `max-width: 1200px`
- `margin: 0 auto`

Plano futuro:

- o conteudo deve passar a viver dentro de uma shell lateral
- o centro visual ainda pode existir, mas nao como unica estrategia

Recomendacao:

- usar container interno para leitura confortavel
- permitir que telas operacionais largas escapem do limite fixo quando fizer sentido

## 10.2. Modos de largura do conteudo

Recomendacao para fases seguintes:

- telas administrativas e formularios: largura mais contida
- telas operacionais densas: largura mais ampla

Especialmente sensiveis:

- `/bed-map`
- `/inpatient`
- `/medical-records`
- futuras telas clinicas mais densas

## 11. Relacao com a Tela de Login

A tela de login atual tem identidade visual propria e nao deve receber a sidebar.

Diretriz:

- manter `showChrome = false` para `/login`
- a nova shell lateral deve ser aplicada apenas em paginas autenticadas

## 12. Relacao com a Autenticacao

O mecanismo de `auth-pending` deve ser mantido.

No layout futuro, a regra de ocultacao inicial precisa cobrir:

- sidebar
- topbar, se existir
- main
- status-bar

Objetivo:

- evitar flash de UI protegida antes da validacao local da sessao

## 13. Relacao com o Status Bar

O `status-bar` atual pode continuar existindo, mas precisa ser redesenhado dentro da nova shell.

Opcoes futuras:

1. manter fixo no rodape, ocupando toda a largura
2. alinhar ao `shell-main`, respeitando a sidebar
3. reduzir protagonismo visual para nao competir com a navegação lateral

Recomendacao:

- manter funcionalidade
- reduzir peso visual
- alinhar melhor ao conteudo principal

## 14. Etapas Tecnicas de Implementacao Futuras

## Etapa 1. Consolidacao da shell

Objetivo:

- transformar o HTML principal em uma shell com `aside` + `shell-main`

Arquivos-alvo:

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

## Etapa 2. Introducao dos estados da sidebar

Objetivo:

- expandida
- recolhida
- escondida
- overlay mobile

## Etapa 3. Integracao com autenticacao e preferencia local

Objetivo:

- manter `auth-pending`
- persistir preferencia do usuario no cliente

## Etapa 4. Ajuste responsivo fino

Objetivo:

- smartphone
- tablet portrait
- tablet landscape
- desktop

## Etapa 5. Refinamento visual

Objetivo:

- harmonizar proporcoes
- ajustar espacamento
- equilibrar hierarchy entre sidebar, conteudo e status bar

## 15. Riscos e Mitigacoes

## R1. Reposicionamento parcial em vez de refatoracao da shell

Risco:

- sidebar ficar improvisada e conflitar com `main`

Mitigacao:

- tratar `nav`, `main` e `status-bar` como um unico problema de layout

## R2. Sidebar recolhida perder legibilidade

Risco:

- usuario nao entender o menu no modo compacto

Mitigacao:

- planejar rotulos auxiliares e/ou icones consistentes

## R3. Mobile ficar pior que o layout atual

Risco:

- drawer ruim, dificil de usar ou invasivo

Mitigacao:

- definir modo overlay como comportamento oficial para mobile

## R4. Conteudo continuar preso a uma largura antiga

Risco:

- ganhar sidebar esquerda, mas nao ganhar area util real

Mitigacao:

- revisar a estrategia de container do `main`

## R5. Editar arquivo errado

Risco:

- alterar `layout.ts` sem efeito real

Mitigacao:

- implementar a mudanca a partir de `apps/web/src/index.ts`

## 16. Criterios de Aceite para a Futura Implementacao

O trabalho futuro deve ser considerado pronto quando:

1. a navegacao principal estiver posicionada na esquerda
2. a sidebar puder expandir, recolher e esconder
3. o `main` realmente ganhar area util quando a sidebar estiver recolhida ou escondida
4. o layout estiver usavel em smartphone, tablet e desktop
5. a paleta atual continuar reconhecivel
6. a experiencia visual parecer mais moderna, fluida e harmoniosa
7. a tela de login continuar sem shell lateral
8. o gate de autenticacao continuar escondendo a UI protegida antes da validacao

## 17. Recomendacao Final

A melhor estrategia para a proxima fase de codigo e:

- nao tentar "mover o navbar"
- sim reconstruir a shell da aplicacao em torno de uma sidebar lateral esquerda

Isso atende melhor aos objetivos de:

- esconder a navegação
- ampliar a area de trabalho
- melhorar a experiencia em tablet e smartphone
- manter identidade visual
- preparar o frontend para crescer com mais maturidade

## 18. Arquivos de Referencia

- `docs/134-auditoria-navbar-left-migration.md`
- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`
- `apps/web/src/pages/api-client.ts`
- `apps/web/src/pages/login.ts`
