# Auditoria Completa do Navbar Atual

Data: 2026-03-27
Escopo: mapeamento detalhado da construcao atual do navbar do frontend canonico `apps/web`
Objetivo: preparar uma futura mudanca do navbar para a lateral esquerda, sem alterar codigo nesta etapa
Status: auditoria de leitura concluida

## 1. Resumo Executivo

O navbar atual do frontend canonico do V2 e construido de forma centralizada e server-side em `apps/web/src/index.ts`. Ele nao nasce em componentes reutilizaveis nem em um layout desacoplado; ele e interpolado diretamente no HTML final da pagina.

Isso tem uma vantagem importante: existe uma fonte principal de verdade para a estrutura do menu. Ao mesmo tempo, isso cria algumas restricoes para a migracao do navbar para a esquerda:

- estrutura, comportamento, autenticacao e marcacao ativa estao todos acoplados ao `buildPage()`
- o CSS foi desenhado para uma barra horizontal superior
- o `main` e o `status-bar` pressupõem layout de topo, nao layout com sidebar
- existe um `layout.ts` antigo com outra estrategia de navbar, mas ele nao esta em uso

Conclusao pratica:

- a mudanca para navbar lateral e viavel
- a base atual esta organizada o suficiente para isso
- a refatoracao deve partir de `apps/web/src/index.ts` e `apps/web/src/styles.ts`
- antes de mover a posicao, sera importante consolidar a fonte de verdade do layout e ignorar ou aposentar o `layout.ts` nao utilizado

## 2. Arquivos Auditados

Arquivos principais:

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`
- `apps/web/src/pages/api-client.ts`

Arquivo secundario relevante:

- `apps/web/src/pages/layout.ts`

Arquivos analisados para impacto de navegacao:

- `apps/web/src/pages/dashboard.ts`
- `apps/web/src/pages/owners.ts`
- `apps/web/src/pages/patients.ts`
- `apps/web/src/pages/encounters.ts`
- `apps/web/src/pages/medical-records.ts`
- `apps/web/src/pages/inpatient.ts`
- `apps/web/src/pages/sectors.ts`
- `apps/web/src/pages/beds.ts`
- `apps/web/src/pages/bedmap.ts`

## 3. Fonte de Verdade Atual

### 3.1. Montagem principal do navbar

A fonte principal do navbar hoje esta em `apps/web/src/index.ts`.

Pontos-chave:

- definicao das rotas: linhas 40-68
- montagem do HTML da pagina: linhas 70-245
- definicao dos grupos de navegacao: linhas 106-161
- renderizacao final do `<nav>`: linhas 196-206
- preenchimento dinamico do slot do usuario: linhas 230-242

Isso significa que o navbar nao e composto por:

- componente dedicado
- template externo
- funcao separada de layout em uso real

Ele e gerado inline dentro da funcao `buildPage(path)`.

### 3.2. Mapa de rotas ligado ao navbar

Cada rota da aplicacao declara:

- `render`
- `title`
- `nav`

O campo `nav` e usado como chave de ativacao visual do link atual.

Exemplo de comportamento:

- rota `/patients` define `nav: '/patients'`
- ao montar o navbar, cada link compara `route.nav === link.path`
- se for verdadeiro, recebe a classe `active`

Implicacao para sidebar:

- o mecanismo de destaque ativo pode ser reaproveitado sem mudanca conceitual
- a logica atual so funciona bem para paginas de primeiro nivel
- se surgirem subrotas reais no futuro, esse modelo provavelmente precisara evoluir

## 4. Estrutura HTML Atual do Navbar

O navbar so aparece quando `showChrome` e verdadeiro. Hoje isso significa:

- todas as paginas exceto `/login`

Marcacao renderizada:

```html
<nav>
  <div class="nav-branding">
    <span class="brand">CVG-HIS V2</span>
    <span class="nav-branding-subtitle">Centro Veterinario Guarapiranga</span>
  </div>
  <div class="nav-groups">...</div>
  <span class="spacer"></span>
  <span id="nav-user-info" class="nav-user-slot"></span>
</nav>
```

Componentes estruturais:

- `nav-branding`: bloco da marca
- `nav-groups`: container de todos os grupos
- `nav-group`: bloco de grupo
- `nav-group-label`: titulo do grupo
- `nav-links`: lista horizontal de links dentro do grupo
- `spacer`: empurra o slot do usuario para a direita
- `nav-user-info`: slot preenchido por script no cliente

## 5. Hierarquia de Informacao do Menu

Os grupos atuais sao:

1. `Essencial`
2. `Administrativo`
3. `Operacao`
4. `Assistencial`
5. `Administrativo+`
6. `Governanca`

Links por grupo:

### 5.1. Essencial

- `/`
- `/owners`
- `/patients`
- `/encounters`
- `/medical-records`

### 5.2. Administrativo

- `/users`
- `/staff`
- `/access-control`

### 5.3. Operacao

- `/appointments`
- `/queue`
- `/triage`

### 5.4. Assistencial

- `/inpatient`
- `/sectors`
- `/beds`
- `/bed-map`
- `/diagnostics`
- `/surgeries`

### 5.5. Administrativo+

- `/inventory`
- `/billing`
- `/notifications`

### 5.6. Governanca

- `/audit`
- `/master-search`

Observacao importante:

- o menu esta 100% hardcoded
- nao existe configuracao externa
- nao existe regra de visibilidade por perfil
- nao existe ordenacao por permissao derivada

## 6. Comportamento de Autenticacao Relacionado ao Navbar

O navbar depende diretamente do bootstrap de autenticacao injetado em `buildPage()`.

### 6.1. Gate visual inicial

Em `apps/web/src/index.ts`, linhas 86-104:

- paginas protegidas exigem `isLoggedIn()`
- se nao houver sessao valida, o usuario e redirecionado para `/login`
- enquanto isso, `body` recebe a classe `auth-pending`

CSS complementar:

- `body.auth-pending nav`
- `body.auth-pending main`
- `body.auth-pending .status-bar`
- todos ficam com `visibility: hidden`

Implicacao:

- o navbar participa diretamente da estrategia de ocultacao antes da validacao de sessao
- ao migrar para sidebar esquerda, essa regra continua necessaria

### 6.2. Slot de usuario

O bloco `#nav-user-info` e preenchido no cliente.

Se nao houver token:

- mostra link `Entrar`

Se houver token:

- extrai sessao via `getSession()`
- usa `session?.sub || session?.username || 'usuario'`
- renderiza nome + botao `Sair`

Logout atual:

- POST para `/auth/logout`
- limpa tokens do `localStorage`
- redireciona para `/login`

Observacoes:

- o nome exibido depende do payload do token, nao de uma chamada a `/auth/session`
- o navbar nao mostra role, unidade, capabilities ou contexto operacional
- o slot do usuario tambem esta inline no HTML scriptado, nao em funcao dedicada

## 7. CSS Atual do Navbar

### 7.1. Orientacao base

Em `apps/web/src/styles.ts`, linhas 26-115, o navbar foi desenhado explicitamente como barra horizontal superior:

- `display: flex`
- `align-items: center`
- `height: 56px`
- `position: sticky`
- `top: 0`
- `border-bottom`
- `padding: 0 24px`

Essa combinacao define uma top bar tradicional.

### 7.2. Blocos internos

Os estilos pressupõem fluxo horizontal:

- `nav-groups` usa `display: flex` e `align-items: center`
- `nav-links` usa `display: flex`
- `spacer` usa `flex: 1`
- `nav-user-slot` e alinhado na mesma linha do menu

Isso significa que:

- o CSS atual nao e neutro
- ele nao esta pronto para simplesmente trocar `top` por `left`
- a barra lateral exigira reorganizacao estrutural do fluxo principal

### 7.3. Relacao com o conteudo principal

O `main` atual nao leva em conta sidebar:

- `max-width: 1200px`
- `margin: 0 auto`
- `padding: 24px`

Esse desenho assume:

- navbar em cima
- conteudo ocupando a largura central da pagina

Para uma barra lateral esquerda, sera necessario redefinir:

- grade ou container da pagina
- offset lateral
- comportamento do `main`
- convivencia com `status-bar`

### 7.4. Status bar

O `status-bar` atual e fixo no rodape:

- `position: fixed`
- `left: 0`
- `right: 0`
- `bottom: 0`

Em uma futura sidebar esquerda, ele pode continuar funcionando, mas precisa ser reavaliado para:

- nao colidir visualmente com a nova navegacao
- manter alinhamento com o conteudo principal

## 8. Responsividade Atual

Existe um breakpoint em `@media (max-width: 768px)` nas linhas 412-421.

Comportamento atual em telas menores:

- `nav` ganha `overflow-x: auto`
- `height` vira `auto`
- `align-items` vira `flex-start`
- `nav-groups` muda para coluna
- `nav-links` mantem wrap
- `spacer` some

Leitura pratica:

- a responsividade atual e uma adaptacao da top bar
- nao e um comportamento de sidebar responsiva
- nao existe modo colapsado
- nao existe drawer
- nao existe toggle de abertura/fechamento

Para navbar esquerda, isso e um ponto central:

- o mobile tera de ser redesenhado
- o modelo atual nao oferece um estado intermediario reaproveitavel

## 9. Dependencias Funcionais do Navbar

### 9.1. Dependencias diretas

O navbar depende de:

- `routes` em `apps/web/src/index.ts`
- `baseStyles` em `apps/web/src/styles.ts`
- `apiClientScript` em `apps/web/src/pages/api-client.ts`
- `AUTH_STORAGE_KEYS`
- `loadWebConfig(process.env)`

### 9.2. Dependencias indiretas

Paginas de conteudo assumem:

- existencia de `<main id="page-content">`
- layout top-down
- pagina com largura centralizada
- espaco visual abaixo do navbar

Nenhuma das paginas auditadas gera navbar proprio.

Isso e bom para a futura migracao, porque:

- o navbar esta centralizado
- nao ha duplicacao da navegacao por pagina

## 10. Achados de Auditoria

### A1. A fonte real do navbar esta em `index.ts`, nao em `layout.ts`

Severidade: alta

Detalhe:

- `apps/web/src/pages/layout.ts` define outra estrategia de layout
- nao existe nenhuma referencia a `renderLayout(` fora do proprio arquivo
- portanto ele esta morto no fluxo principal

Impacto para a migracao:

- se alguem editar `layout.ts` esperando mover o navbar, nao vai alterar o sistema real
- a refatoracao deve ignorar `layout.ts` como fonte principal

### A2. Estrutura, navegacao, autenticacao e slot de usuario estao excessivamente acoplados em uma unica funcao

Severidade: alta

Detalhe:

- `buildPage()` concentra:
  - resolucao da rota
  - gating de autenticacao
  - montagem do navbar
  - montagem do `main`
  - montagem do `status-bar`
  - script do usuario logado

Impacto para a migracao:

- mover o navbar para a esquerda vai tocar layout global, nao apenas HTML do `nav`
- a mudanca e transversal dentro da pagina shell

### A3. O CSS atual foi concebido exclusivamente para barra superior horizontal

Severidade: alta

Detalhe:

- `nav` usa altura fixa, alinhamento horizontal e `sticky top`
- `spacer` e fluxo em linha sao essenciais no desenho atual

Impacto para a migracao:

- nao basta trocar `top` por `left`
- sera necessaria uma nova estrategia de shell visual

### A4. O menu e totalmente hardcoded e nao deriva de capabilities

Severidade: media

Detalhe:

- todos os links sempre aparecem
- a autorizacao continua sendo do backend, mas a UX nao filtra menu por papel

Impacto para a migracao:

- uma sidebar esquerda pode ampliar visualmente esse problema
- o menu ficara ainda mais "pesado" se todo mundo vir tudo o tempo inteiro

### A5. O estado ativo e simples e funciona so para rotas de primeiro nivel

Severidade: media

Detalhe:

- o match e exato entre `route.nav` e `link.path`
- nao ha estrategia para prefix match ou secao expandida

Impacto para a migracao:

- se a barra lateral vier com secoes expansiveis ou subniveis, essa logica precisara amadurecer

### A6. Existe codigo morto ou de baixo valor associado ao navbar

Severidade: media

Detalhe:

- `navigateTo(path)` e injetado, mas o navbar usa `<a href>`
- `layout.ts` nao participa da renderizacao real

Impacto para a migracao:

- isso aumenta risco de editar lugar errado
- tambem indica oportunidade de limpeza antes ou durante a refatoracao

### A7. O `status-bar` participa da casca global da pagina e deve entrar no desenho futuro

Severidade: media

Detalhe:

- ele nao e navbar, mas compartilha a mesma shell da aplicacao
- mudar o navbar sem considerar o rodape fixo pode gerar desequilibrio visual

### A8. O breakpoint atual nao prepara a base para sidebar responsiva

Severidade: media

Detalhe:

- o menu em mobile apenas quebra e empilha
- nao existe experiencia lateral colapsavel

Impacto para a migracao:

- a versao mobile/compacta precisara ser pensada como parte do projeto

## 11. Mapa de Impacto para Migracao do Navbar para a Esquerda

### 11.1. Camada estrutural

Arquivos impactados com maior probabilidade:

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

Provaveis responsabilidades:

- criar um shell com coluna lateral + area principal
- reposicionar branding
- reposicionar grupo de usuario
- ajustar relacao entre `nav`, `main` e `status-bar`

### 11.2. Camada de navegacao

Pontos impactados:

- grupos `Essencial`, `Administrativo`, `Operacao`, `Assistencial`, `Administrativo+`, `Governanca`
- destaque de item ativo
- possivel necessidade de secoes colapsaveis

### 11.3. Camada de autenticacao

Pontos impactados:

- `body.auth-pending`
- ocultacao do shell antes da validacao de sessao
- renderizacao do slot de usuario

### 11.4. Camada de conteudo

Pontos impactados:

- `main`
- largura util do conteudo
- comportamento em desktop, tablet e mobile

## 12. Riscos Especificos da Futura Mudanca

1. Editar `layout.ts` em vez de `index.ts` e nao produzir efeito real.
2. Mover apenas o `<nav>` sem redesenhar a shell da pagina.
3. Quebrar o alinhamento do `main` ao manter `max-width: 1200px` e `margin: 0 auto` sem compensacao lateral.
4. Deixar o `status-bar` visualmente desconectado do novo layout.
5. Transformar a top bar em sidebar sem resolver a responsividade abaixo de `768px`.
6. Manter o menu inteiro sempre aberto e tornar a navegacao pesada demais visualmente.
7. Preservar o acoplamento atual e dificultar futuras mudancas de navegacao.

## 13. Pontos Positivos da Base Atual

1. O navbar tem uma unica fonte real de renderizacao.
2. O menu esta centralizado e nao duplicado por pagina.
3. O estado ativo ja existe e e simples de entender.
4. O branding, o slot de usuario e os grupos estao semanticamente separados.
5. O gate de autenticacao ja protege a shell visual.

## 14. Recomendacao Arquitetural para a Proxima Etapa

Sem alterar codigo agora, a leitura mais segura para a futura execucao e:

1. tratar `apps/web/src/index.ts` como unica fonte verdadeira do navbar atual
2. tratar `apps/web/src/styles.ts` como definicao atual da shell visual
3. considerar `apps/web/src/pages/layout.ts` como artefato legado/inativo ate prova contraria
4. planejar a mudanca como refatoracao da shell inteira, nao como reposicionamento isolado do `<nav>`
5. definir antecipadamente o comportamento desejado em desktop e mobile

## 15. Veredito Final

O navbar atual do V2 e:

- centralizado
- funcional
- simples de localizar
- mas fortemente acoplado a uma top bar horizontal

Para mover o navbar para a esquerda, a construcao atual oferece uma boa base de mapeamento, mas nao uma base pronta de reaproveitamento visual. A futura implementacao deve ser tratada como refatoracao de layout global da shell do frontend, com foco principal em:

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

e com atencao para:

- autenticacao visual
- destaque ativo
- responsividade
- integracao com `main`
- integracao com `status-bar`

## 16. Referencias de Codigo

- `apps/web/src/index.ts:40-68`
- `apps/web/src/index.ts:70-245`
- `apps/web/src/index.ts:106-173`
- `apps/web/src/index.ts:198-206`
- `apps/web/src/index.ts:230-242`
- `apps/web/src/styles.ts:26-115`
- `apps/web/src/styles.ts:116-120`
- `apps/web/src/styles.ts:356-369`
- `apps/web/src/styles.ts:412-421`
- `apps/web/src/pages/layout.ts:1-82`
- `apps/web/src/pages/api-client.ts:5-87`
