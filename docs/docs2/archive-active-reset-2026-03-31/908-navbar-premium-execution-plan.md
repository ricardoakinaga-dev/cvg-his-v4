# Plano de Execucao Tecnico - Navbar Premium

Data: 2026-03-28
Origem:

- `docs/904-navbar-left-status-report.md`
- `docs/905-navbar-left-title-removal-plan.md`
- `docs/906-final-navbar-and-backend-frontend-integration-plan.md`
- `docs/907-navbar-premium-mobile-float-plan.md`

## Objetivo

Traduzir o plano conceitual da navbar premium em execucao tecnica por etapas, deixando claro:

- o que entra em cada fase
- quais arquivos provavelmente serao tocados
- o que depende de decisao de produto
- o que pode ser feito com baixo risco sem quebrar o fluxo atual

## Escopo Tecnico Principal

O trabalho esta concentrado no shell do frontend oficial em `apps/web`, principalmente em:

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

Arquivos secundarios que podem ser impactados:

- `apps/web/src/pages/layout.ts`
- `apps/web/src/pages/*.ts` em casos pontuais de alinhamento visual com topbar/titulos
- documentacao em `docs/`

## Estrategia Geral

A ordem recomendada e:

1. limpar a estrutura visual da sidebar
2. estabilizar comportamento
3. consolidar responsividade
4. corrigir continuidade de navegacao
5. refinar motion e visual premium

Essa ordem reduz risco, porque evita polir um shell que ainda esteja estruturalmente instavel.

## Fase 1 - Limpeza Estrutural Segura

### O que entra

- remocao do branding textual da sidebar
- remocao do bloco introdutorio da sidebar
- manutencao apenas de:
  - toggle
  - grupos
  - links
  - area de usuario, se mantida
- rebalanceamento basico do topo da sidebar

### Objetivo tecnico

Reduzir poluicao visual sem alterar o fluxo funcional principal.

### Arquivos provaveis

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

### Dependencias de decisao de produto

- confirmar se a area de usuario permanece no rodape da sidebar
- confirmar se a topbar continua com titulo da tela

### O que pode ser feito sem risco alto

- remover `sidebar-brand-block`
- remover `sidebar-intro`
- ajustar gaps, paddings e alinhamento

### Risco

Baixo

### Resultado esperado

- sidebar mais limpa
- foco nos botoes e grupos

## Fase 2 - Consolidacao do Toggle e Estado de Visibilidade

### O que entra

- revisar o comportamento de esconder/exibir navbar
- unificar regras de estado entre desktop, tablet e mobile
- melhorar previsibilidade do toggle
- garantir persistencia coerente do estado quando fizer sentido

### Objetivo tecnico

Fazer o toggle deixar de parecer um recurso tecnico e passar a parecer comportamento confiavel de produto.

### Arquivos provaveis

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

### Dependencias de decisao de produto

- decidir se o estado colapsado deve persistir entre sessoes no desktop
- decidir se no mobile o menu deve sempre abrir fechado ao entrar em nova rota

### O que pode ser feito sem risco alto

- reorganizar o controle de `data-sidebar-state`
- revisar nomes e transicoes do estado
- melhorar consistencia do comportamento atual sem mudar arquitetura de navegacao

### Risco

Baixo a medio

### Resultado esperado

- esconder/exibir funcionando de forma mais previsivel

## Fase 3 - Responsividade Premium por Breakpoint

### O que entra

#### 3.1 Smartphone

- drawer lateral de verdade
- overlay
- fechamento por clique fora
- fechamento por `Escape`
- bloqueio de scroll do fundo
- largura otimizada para toque

#### 3.2 Tablet

- definicao de comportamento proprio
- mini-sidebar ou drawer hibrido
- validacao em portrait e landscape

#### 3.3 Outros moveis

- ajuste para densidade e orientacao
- revisao de espacos e touch targets

### Objetivo tecnico

Parar de tratar responsividade como adaptacao generica e passar a tratar cada contexto de tela como experiencia propria.

### Arquivos provaveis

- `apps/web/src/styles.ts`
- `apps/web/src/index.ts`

### Dependencias de decisao de produto

- decidir a experiencia de tablet:
  - mini-sidebar
  - drawer persistente
  - drawer contextual
- decidir se o menu no smartphone abre por gesto futuro ou apenas por botao

### O que pode ser feito sem risco alto

- melhorar smartphone com overlay e fechamento contextual
- ajustar breakpoints
- melhorar largura do painel

### O que tem risco medio

- definir comportamento hibrido de tablet sem validacao de produto

### Risco

Medio

### Resultado esperado

- navbar confortavel em smartphone e tablet

## Fase 4 - Continuidade de Navegacao e Fim do Reset Estranho

### O que entra

- preservar o scroll da sidebar
- preservar grupos abertos/fechados
- evitar sensacao de retorno ao topo do menu a cada clique
- revisar a continuidade perceptiva do shell entre rotas

### Objetivo tecnico

Eliminar a sensacao estranha relatada pelo usuario e melhorar a memoria espacial da navegacao.

### Arquivos provaveis

- `apps/web/src/index.ts`
- possivelmente `apps/web/src/pages/api-client.ts` apenas se houver necessidade de coordenar melhor navegacao ou reload

### Dependencias de decisao de produto

- nenhuma decisao forte e obrigatoria para a primeira iteracao
- decisao opcional futura: manter navegacao tradicional ou caminhar para experiencia mais SPA no shell

### O que pode ser feito sem risco alto

- persistir grupos abertos em `localStorage`
- persistir scroll do container da sidebar
- reidratar estado ao carregar a proxima rota

### O que tem risco medio

- tentar resolver isso trocando o modelo de navegacao inteiro nesta fase

### Risco

Baixo a medio

### Resultado esperado

- usuario deixa de sentir que o menu "reinicia"

## Fase 5 - Motion Premium

### O que entra

- revisar hover dos links
- revisar hover dos grupos
- revisar transicao do toggle
- revisar abertura/fechamento da navbar
- reduzir agressividade de deslocamentos e sombras

### Objetivo tecnico

Tornar a navegacao mais elegante e menos mecanica.

### Arquivos provaveis

- `apps/web/src/styles.ts`

### Dependencias de decisao de produto

- praticamente nenhuma, desde que o objetivo permaneça "suave e premium"

### O que pode ser feito sem risco alto

- reduzir amplitude das animacoes
- padronizar tempos e easing
- suavizar hover e active

### Risco

Baixo

### Resultado esperado

- movimentos discretos e confortaveis

## Fase 6 - Paleta, Sombras e Contraste Premium

### O que entra

- revisao de variaveis de cor
- revisao das sombras da sidebar
- revisao do estado ativo dos links
- revisao de contraste do fundo e do painel
- reduzir saturacao visual sem perder legibilidade

### Objetivo tecnico

Elevar conforto visual e percepcao premium sem comprometer acessibilidade.

### Arquivos provaveis

- `apps/web/src/styles.ts`

### Dependencias de decisao de produto

- confirmar se a direcao visual premium desejada e:
  - mais neutra
  - mais clinica
  - mais executiva

### O que pode ser feito sem risco alto

- suavizar sombras
- suavizar contraste de fundo/painel
- refinar cor ativa dos links

### O que exige cuidado

- reduzir contraste demais e piorar acessibilidade

### Risco

Baixo a medio

### Resultado esperado

- navbar premium com conforto ocular melhor

## Fase 7 - Fechamento Arquitetural do Shell

### O que entra

- revisar o papel de `apps/web/src/pages/layout.ts`
- decidir se continua como legado
- documentar a trilha canonica da navegacao
- reduzir drift entre shell principal e artefatos antigos

### Objetivo tecnico

Evitar que a navbar premium nasca num shell visualmente bom, mas estruturalmente ambiguo.

### Arquivos provaveis

- `apps/web/src/pages/layout.ts`
- `apps/web/src/index.ts`
- `docs/*.md`

### Dependencias de decisao de produto

- nenhuma forte

### O que pode ser feito sem risco alto

- documentar que `index.ts` e a trilha canonica atual
- marcar `layout.ts` como legado interno se necessario

### Risco

Baixo

### Resultado esperado

- menos drift arquitetural

## Decisoes de Produto Pendentes

Esses pontos idealmente devem ser decididos antes da implementacao completa:

1. A topbar permanece com titulo da tela?
2. A area de usuario continua no rodape da sidebar?
3. Em tablet, o comportamento preferido e mini-sidebar ou drawer?
4. O estado colapsado deve persistir entre sessoes no desktop?
5. No mobile, o menu deve fechar automaticamente apos clicar em um item?
6. A linguagem premium deve ser mais clinica/suave ou mais executiva/sofisticada?

## Itens que Podem Ser Feitos com Baixo Risco Imediato

Esses itens sao os melhores candidatos para comecar sem quebrar o fluxo atual:

1. remover titulo/branding da sidebar
2. ajustar espacamentos da sidebar
3. suavizar sombras e hover
4. melhorar toggle atual
5. adicionar overlay e clique-fora no mobile
6. persistir grupos abertos/scroll da sidebar

## Itens com Risco Medio que Pedem Mais Validacao

1. definir experiencia propria de tablet
2. mudar demais a topbar ao mesmo tempo
3. alterar o modelo de navegacao em vez de apenas preservar estado
4. reduzir contraste sem validar acessibilidade

## Ordem Recomendada de Execucao

1. Fase 1 - Limpeza estrutural segura
2. Fase 2 - Consolidacao do toggle
3. Fase 3 - Smartphone primeiro
4. Fase 4 - Continuidade de navegacao
5. Fase 5 - Motion premium
6. Fase 6 - Paleta e sombras
7. Fase 3 tablet refinada com decisao de produto
8. Fase 7 - Fechamento arquitetural

## Criterios de Pronto

A navbar premium pode ser considerada pronta quando:

1. estiver limpa visualmente
2. esconder/exibir funcionar de forma confiavel
3. smartphone estiver realmente bem resolvido
4. tablet tiver comportamento deliberado
5. o menu nao reiniciar perceptivamente ao trocar de rota
6. motion estiver suave
7. sombras e contraste estiverem confortaveis
8. o shell canonico estiver claro no codigo

## Recomendacao Final

O melhor caminho e executar a melhoria em duas macro-etapas:

### Macro-etapa A - baixo risco

- limpeza
- toggle
- smartphone
- continuidade do menu
- motion e suavizacao visual

### Macro-etapa B - validacao orientada por produto

- tablet
- refinamento final da linguagem premium
- fechamento arquitetural

Essa divisao permite entregar valor rapido sem comprometer estabilidade e sem abrir uma refatoracao grande demais de uma vez.
