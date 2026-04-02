# Plano - Remover Titulo Visual da Navbar Esquerda

Data: 2026-03-28
Escopo: planejamento apenas, sem escrita de codigo funcional
Objetivo: remover o titulo visual que aparece na navbar esquerda e deixar a estrutura mais limpa, priorizando os botoes e grupos de navegacao

## Pedido Interpretado

Desejo do produto nesta fase:

- remover o bloco de titulo visual da navbar esquerda
- manter a estrutura de botoes e grupos
- reduzir poluicao visual
- nao alterar codigo agora, apenas planejar com cuidado

## Diagnostico Tecnico Atual

A implementacao atual da sidebar esta centralizada no frontend oficial em:

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

Hoje a navbar esquerda contem tres camadas visuais principais acima da lista de links:

1. bloco de branding
2. bloco introdutorio com titulo da pagina
3. lista de grupos e botoes

Os elementos que mais contribuem para a poluicao visual percebida sao:

- `sidebar-brand-block`
- `sidebar-intro`
- uso de `${route.title}` dentro do bloco introdutorio

Tambem existe um titulo da pagina na topbar:

- `topbar-overline`
- `topbar-title`

Entao ha uma ambiguidade importante antes de implementar:

### Ambiguidade a confirmar

O pedido menciona "remover o titulo que esta aparecendo no navbar". Tecnicamente, hoje existem dois titulos visuais relevantes no shell:

- titulo no bloco da sidebar esquerda
- titulo da pagina na topbar

Pela formulacao "deixasse somente a estrutura dos botoes sem poluicao visual", a interpretacao mais provavel e:

- remover o bloco de branding da sidebar
- remover o bloco introdutorio da sidebar
- manter apenas os grupos e botoes de navegacao
- manter a topbar por enquanto, a menos que o produto queira uma limpeza ainda mais agressiva

## Mapeamento de Codigo Relevante

### Frontend principal

#### 1. Render da sidebar

Arquivo: `apps/web/src/index.ts`

Trechos relevantes:

- `routes` define `route.title` para cada tela
- `chromeHtml` monta o shell inteiro
- `sidebar-brand-block` renderiza `CVG-HIS` e subtitulo institucional
- `sidebar-intro` renderiza `Workspace`, `${route.title}` e texto explicativo
- `topbar-title` renderiza `${route.title}` novamente

Impacto:

- a remocao do titulo da sidebar exige ajuste de HTML em `chromeHtml`
- sera necessario revisar o uso de `route.title` para evitar redundancia ou espaco vazio

#### 2. Estilos da sidebar

Arquivo: `apps/web/src/styles.ts`

Trechos relevantes:

- `.sidebar-top`
- `.sidebar-brand-block`
- `.sidebar-brand`
- `.sidebar-subtitle`
- `.sidebar-intro`
- `.sidebar-intro-kicker`
- `.sidebar-intro strong`
- `.sidebar-intro p`
- regras de estado colapsado que escondem parte desses blocos

Impacto:

- a remocao visual nao e so deletar markup; sera preciso recalibrar espacamentos, grid e alinhamentos
- o estado colapsado tambem precisara ser simplificado para nao esconder elementos que deixarao de existir

#### 3. Layout legado paralelo

Arquivo: `apps/web/src/pages/layout.ts`

Diagnostico:

- existe um layout antigo com navegacao superior
- aparentemente nao e o caminho principal hoje
- nao deve ser a base da mudanca, mas precisa ser levado em conta para evitar drift documental e arquitetural

Impacto:

- a mudanca principal nao precisa nascer aqui
- ainda assim, o plano deve prever validacao para confirmar que nao ha reuso indireto desse arquivo

### Backend e dependencias relacionadas

Embora a mudanca seja visual, revisei o backend e as dependencias relacionadas para identificar efeitos colaterais.

#### 1. Autenticacao e sessao

Arquivos relevantes:

- `apps/api/src/server.ts`
- `apps/api/src/runtime.ts`
- `apps/api/src/bootstrap.ts`
- `packages/shared/auth-sdk`

Leitura:

- o backend fornece login, refresh, logout e sessao
- a sidebar consome apenas o estado autenticado no frontend para preencher `nav-user-info`
- a remocao do titulo visual da sidebar nao deve alterar contratos de auth, sessao ou logout

Conclusao:

- impacto backend: **nenhum esperado**
- apenas manter a area de usuario/logoff intacta

#### 2. Permissoes / access control

Arquivos relevantes:

- `apps/api/src/server.ts`
- `packages/modules/access-control`

Leitura:

- o menu atual e hardcoded no frontend
- ele nao e montado dinamicamente pelo backend com base em permissoes

Conclusao:

- a remocao do titulo da sidebar nao exige alteracao no backend de permissoes
- mas o plano deve evitar abrir escopo para "menu orientado por role" nesta fase

#### 3. Health / readiness / observabilidade

Arquivos relevantes:

- `apps/api/src/server.ts`
- `apps/api/src/health.ts`

Conclusao:

- sem impacto

## Decisao Arquitetural Recomendada

### Diretriz principal

Executar a melhoria como **simplificacao visual localizada do shell do `apps/web`**, sem acoplar a mudanca a:

- auth
- backend de permissoes
- rotas da API
- reestruturacao ampla do layout legado

### O que deve permanecer

- lista de grupos
- botoes/links
- estado ativo
- colapso/expansao
- area de usuario no rodape, se continuar agregando valor
- topbar, salvo decisao explicita em contrario

### O que deve sair na primeira iteracao

- branding textual da sidebar
- bloco introdutorio com `Workspace`
- titulo duplicado dentro da sidebar
- subtitulo descritivo institucional dentro da sidebar

## Plano de Implementacao Proposto

### Fase 1 - Limpeza minima segura

Objetivo:

- deixar a sidebar esquerda focada apenas em navegacao

Escopo:

- remover `sidebar-brand-block`
- remover `sidebar-intro`
- manter botao de toggle
- manter grupos e links
- manter rodape de usuario

Validacoes:

- desktop expandido
- desktop colapsado
- tablet/mobile
- login
- logout
- troca de rota com destaque do item ativo

### Fase 2 - Rebalanceamento visual

Objetivo:

- evitar buracos visuais e excesso de espacamento apos a remocao

Escopo:

- recalibrar padding da sidebar
- revisar alinhamento do botao de toggle
- revisar espacamento entre topo, grupos e rodape
- revisar comportamento do estado colapsado

Validacoes:

- densidade visual
- clareza dos grupos
- leitura do menu em uso real

### Fase 3 - Revisao de consistencia do shell

Objetivo:

- garantir que a limpeza da sidebar nao crie duplicidade ou desbalanceamento no resto da pagina

Escopo:

- avaliar se a topbar continua com o nivel certo de informacao
- confirmar se `route.title` deve permanecer apenas na topbar
- confirmar se o documento HTML continua com `<title>` coerente

Validacoes:

- cada pagina ainda comunica claramente onde o usuario esta
- o shell continua orientando sem excesso de texto

## Riscos Tecnicos

### Risco 1 - Remocao parcial gerar layout "vazio"

Se remover apenas o conteudo textual sem revisar o grid e os espacamentos, a sidebar pode ficar com bloco morto no topo.

Mitigacao:

- tratar HTML e CSS juntos
- revisar `grid-template-rows`, gaps e paddings

### Risco 2 - Perda de orientacao contextual

Se a sidebar perder o titulo e a topbar tambem ficar fraca ou redundante, o usuario pode perder referencia da tela atual.

Mitigacao:

- manter `route.title` ao menos na topbar nesta fase inicial
- validar se o titulo dentro do conteudo de cada pagina ja cumpre esse papel

### Risco 3 - Drift com estado colapsado

As regras de colapso hoje escondem elementos que podem deixar de existir.

Mitigacao:

- revisar seletores de colapso junto com a limpeza do markup

### Risco 4 - Drift com layout legado

Mesmo que `layout.ts` nao pareca ativo, ele continua no projeto.

Mitigacao:

- confirmar que o fluxo principal continua saindo exclusivamente de `index.ts`
- registrar a decisao em docs para nao haver reintroducao acidental

## Riscos de Produto / UX

- simplificar demais a sidebar pode remover identidade visual demais
- remover o titulo lateral sem revisar a topbar pode manter redundancia em outro lugar
- se o usuario se acostumou com o bloco contextual da sidebar, a mudanca precisa preservar orientacao minima

## Fora de Escopo Nesta Fase

- refatorar menu por permissao/role
- reescrever layout antigo
- alterar API
- alterar contratos backend
- redesenhar o sistema inteiro de navegacao
- trocar a topbar sem confirmacao explicita do produto

## Criterios de Aceite Recomendados

Para considerar a mudanca bem-sucedida na futura implementacao:

1. a sidebar esquerda exibe prioritariamente grupos e botoes, sem bloco textual redundante
2. o toggle continua funcional em desktop e mobile
3. o estado colapsado continua coerente
4. o destaque de rota ativa continua funcionando
5. login/logout e area de usuario nao quebram
6. a pagina ainda comunica contexto suficiente por topbar e/ou conteudo principal
7. nao ha impacto em auth, sessao, permissao ou rotas backend

## Sequencia Recomendada de Execucao

1. Confirmar com produto se o titulo a remover e apenas o da sidebar ou tambem o da topbar
2. Implementar a limpeza do markup da sidebar em `apps/web/src/index.ts`
3. Rebalancear estilos em `apps/web/src/styles.ts`
4. Validar estado expandido, colapsado e mobile
5. Revisar se `layout.ts` exige observacao documental ou limpeza futura

## Recomendacao Final

A melhor abordagem e tratar essa melhoria como **limpeza localizada do shell visual**, nao como refatoracao ampla.

Minha recomendacao pratica para a proxima etapa de implementacao e:

- remover completamente o branding e o bloco introdutorio da sidebar
- manter os grupos/botoes como foco principal
- preservar o titulo da tela na topbar nesta primeira entrega

Isso atende o objetivo de reduzir poluicao visual com risco tecnico baixo e sem abrir dependencia real no backend.
