# Roteiro Operacional da Sidebar Esquerda por Arquivo

Data: 2026-03-27
Escopo: roteiro operacional da futura implementacao da sidebar esquerda
Regra desta etapa: sem alteracao de codigo
Base:

- `docs/134-auditoria-navbar-left-migration.md`
- `docs/135-plano-tecnico-sidebar-esquerda.md`

## 1. Objetivo

Detalhar, por arquivo, exatamente o que devera ser alterado na futura implementacao da sidebar esquerda recolhivel, escondivel e responsiva.

Arquivos principais:

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

Arquivos secundarios de verificacao:

- `apps/web/src/pages/api-client.ts`
- `apps/web/src/pages/login.ts`

## 2. Estrategia de Execucao

O trabalho futuro deve acontecer em duas frentes principais:

1. refatorar a shell HTML e a logica de montagem em `apps/web/src/index.ts`
2. substituir o modelo visual de top bar por um modelo de sidebar em `apps/web/src/styles.ts`

Importante:

- nao usar `apps/web/src/pages/layout.ts` como base de implementacao
- ele nao participa do fluxo real atual

## 3. Roteiro por Arquivo

## 3.1. Arquivo: `apps/web/src/index.ts`

Papel atual:

- define rotas
- monta o HTML global da pagina
- injeta navbar
- injeta scripts de autenticacao
- injeta status bar

Papel futuro:

- continuar sendo a fonte de verdade da shell
- passar a montar uma estrutura com sidebar lateral + area principal

### Bloco A. `routes`

Referencia atual:

- linhas 40-68

O que deve ser feito:

- manter o mapa de rotas atual
- manter o campo `nav` como identificador do item ativo no primeiro corte
- nao misturar a mudanca de layout com mudanca da taxonomia do menu

O que nao deve ser feito:

- nao reorganizar a arquitetura de rotas nesta mesma etapa
- nao tentar introduzir subrotas complexas junto com a sidebar

Resultado esperado:

- as rotas continuam estaveis
- a ativacao visual do item corrente continua funcionando

### Bloco B. `buildPage(path)`

Referencia atual:

- linhas 70-245

Esse e o bloco principal da futura implementacao.

O que deve ser feito:

- reestruturar a funcao para gerar uma shell lateral
- separar mentalmente a montagem em:
  - shell
  - sidebar
  - topbar compacta
  - area principal
  - status bar

Nova responsabilidade esperada:

- `buildPage()` deixa de produzir:
  - top nav + main + status bar

- e passa a produzir:
  - shell container
  - sidebar
  - shell-main
  - topbar
  - main
  - status bar

Resultado esperado:

- a funcao continua sendo a unica fonte de verdade da casca da aplicacao
- a sidebar nasce no mesmo ponto em que o navbar hoje e montado

### Bloco C. `navScript`

Referencia atual:

- linhas 80-84

Situacao atual:

- contem apenas `navigateTo(path)`
- tem baixo valor real no estado atual

O que deve ser feito:

- substituir esse bloco por um script real de shell
- concentrar aqui a logica de:
  - expandir sidebar
  - recolher sidebar
  - esconder sidebar
  - abrir/fechar drawer mobile
  - persistir preferencia local
  - responder ao click do toggle
  - responder a `Esc` no overlay mobile

Estado desejado:

- esse bloco deixa de ser residual
- passa a ser o controlador principal da interacao da shell

### Bloco D. `authBootstrapScript`

Referencia atual:

- linhas 86-104

O que deve ser mantido:

- redirecionamento para `/login` quando nao houver sessao valida
- remocao da classe `auth-pending` somente apos validacao local

O que deve ser adaptado:

- a ocultacao visual nao deve mirar apenas `nav`
- deve mirar a shell toda

Acao futura:

- trocar a logica visual para esconder:
  - sidebar
  - topbar
  - main
  - status bar

Resultado esperado:

- nenhuma parte da shell protegida aparece antes da sessao ser validada

### Bloco E. `navGroups`

Referencia atual:

- linhas 106-161

O que deve ser feito:

- manter o mesmo arranjo de grupos no primeiro corte
- reutilizar a mesma estrutura para montar a sidebar

O que pode evoluir sem mudar o contrato:

- o renderer dos grupos
- o container visual
- o comportamento em modo recolhido

O que nao deve ser feito agora:

- nao mudar IA
- nao aplicar filtragem por perfil junto com a mudanca de posicionamento

Resultado esperado:

- a sidebar reutiliza a estrutura atual de grupos e links

### Bloco F. `navHtml`

Referencia atual:

- linhas 163-173

O que deve ser feito:

- reescrever a montagem de `navHtml` para um renderer de sidebar
- o HTML futuro deve prever:
  - grupos verticais
  - link ativo com destaque lateral
  - suporte a estado expandido
  - suporte a estado recolhido

Pontos obrigatorios:

- cada item precisa continuar com um estado `active`
- o renderer deve aceitar o modo da sidebar
- o HTML deve estar pronto para labels ocultas em modo recolhido

Resultado esperado:

- a mesma fonte de dados passa a renderizar uma sidebar vertical

### Bloco G. `<style>${baseStyles} ...`

Referencia atual:

- linhas 182-188

O que deve ser feito:

- atualizar o complemento inline de `auth-pending`
- em vez de esconder apenas `nav`, deve esconder a shell completa

Resultado esperado:

- a regra inline continua pequena
- mas passa a refletir o novo modelo de layout

### Bloco H. Marcacao do `nav`

Referencia atual:

- linhas 196-206

Esse e o ponto mais visivel da futura mudanca.

O que deve ser feito:

- substituir o bloco `<nav>` atual por uma estrutura de sidebar
- incluir no markup:
  - container da sidebar
  - branding superior
  - area de grupos
  - area de usuario no rodape
  - botao de toggle

Diretriz:

- o elemento pode continuar semanticamente sendo `nav`, mas visualmente deve viver dentro de `aside` ou estrutura equivalente

Resultado esperado:

- o menu deixa de ser barra superior e passa a ser trilha lateral esquerda

### Bloco I. `<main id="page-content">`

Referencia atual:

- linhas 209-211

O que deve ser feito:

- manter o `main`, mas inseri-lo dentro de `shell-main`
- permitir que a area principal cresca quando a sidebar estiver recolhida ou escondida

Resultado esperado:

- o `main` passa a responder ao estado da sidebar
- o ganho de area util se torna real

### Bloco J. `status-bar`

Referencia atual:

- linhas 213-218

O que deve ser feito:

- decidir sua nova posicao relativa a shell
- alinhar melhor com o novo layout

O mais seguro:

- manter funcionalidade
- reduzir protagonismo
- acoplar visualmente ao `shell-main`

Resultado esperado:

- o status bar deixa de parecer “solto” abaixo de uma shell lateral

### Bloco K. Script do tempo + usuario

Referencia atual:

- linhas 220-242

O que deve ser feito:

- separar esse script em duas responsabilidades:
  - atualizacao do relogio/status
  - renderizacao do usuario na sidebar/topbar

Mudancas futuras esperadas:

- o slot do usuario deve sair do topo horizontal e ir para o rodape da sidebar
- em mobile, o usuario pode migrar para o drawer ou topbar compacta

Resultado esperado:

- o usuario continua visivel
- mas adaptado ao novo layout

### Bloco L. `createServer(...)`

Referencia atual:

- linhas 248-265

O que deve ser feito:

- nenhuma mudanca estrutural grande no servidor
- apenas garantir que a nova shell continue sendo gerada para as mesmas rotas

Resultado esperado:

- o servidor continua minimalista
- a mudanca permanece apenas na renderizacao HTML/CSS/JS da shell

## 3.2. Arquivo: `apps/web/src/styles.ts`

Papel atual:

- define o estilo global
- define o navbar horizontal
- define `main`, cards, grids, tabelas, status bar e responsividade

Papel futuro:

- substituir a top bar por um sistema visual de sidebar
- introduzir classes de shell
- manter a mesma paleta

### Bloco A. `:root`

Referencia atual:

- linhas 2-17

O que deve ser feito:

- manter a paleta existente
- acrescentar variaveis novas para a shell

Variaveis futuras recomendadas:

- largura da sidebar expandida
- largura da sidebar recolhida
- largura do rail mobile
- duracao das transicoes
- sombra da shell
- cor/alpha do overlay

Resultado esperado:

- a futura implementacao usa tokens coerentes
- evita numeros magicos espalhados

### Bloco B. `body`

Referencia atual:

- linhas 18-24

O que deve ser feito:

- evoluir `body` para hospedar a nova shell
- possivelmente introduzir classes de estado:
  - `sidebar-expanded`
  - `sidebar-collapsed`
  - `sidebar-hidden`
  - `sidebar-overlay-open`

Resultado esperado:

- estados da navegacao podem ser refletidos por classe global

### Bloco C. `nav { ... }` e derivados

Referencia atual:

- linhas 26-115

Esse bloco sera o principal alvo de substituicao.

O que deve ser feito:

- remover a semantica visual de top bar
- redesenhar para sidebar vertical

Subblocos que deverao ser reescritos:

- `nav`
- `nav .brand`
- `nav .nav-branding`
- `nav .nav-branding-subtitle`
- `nav .nav-groups`
- `nav .nav-group`
- `nav .nav-group-label`
- `nav .nav-links`
- `nav .nav-user-slot`
- `nav a`
- `nav a.active`
- `nav .spacer`
- `nav .user-info`

Resultado esperado:

- o mesmo vocabulário de classes pode ser reaproveitado, mas com novo comportamento
- ou essas classes podem ser renomeadas para refletir sidebar de forma mais clara

### Bloco D. `main`

Referencia atual:

- linhas 116-120

O que deve ser feito:

- substituir o modelo “conteudo central fixo” por um modelo mais flexivel
- introduzir:
  - shell-main
  - content container interno
  - ajuste conforme estado da sidebar

Resultado esperado:

- o conteudo passa a ganhar espaco real
- ainda pode existir um container interno de leitura confortável

### Bloco E. `status-bar`

Referencia atual:

- linhas 356-369

O que deve ser feito:

- revisar o posicionamento fixo
- alinhar com o layout lateral
- evitar competicao com a sidebar

Resultado esperado:

- o rodape fica integrado ao novo shell design

### Bloco F. `@media (max-width: 768px)`

Referencia atual:

- linhas 412-421

O que deve ser feito:

- substituir a adaptacao atual de top bar por uma estrategia de drawer mobile
- o breakpoint atual deve deixar de apenas empilhar o nav

Comportamento futuro esperado:

- sidebar fechada por padrao
- topbar compacta com toggle
- drawer lateral com overlay

Resultado esperado:

- mobile com navegacao clara e nao invasiva

### Bloco G. Novas classes da shell

Esse bloco nao existe hoje e devera ser criado.

Classes futuras esperadas:

- `.shell`
- `.sidebar`
- `.sidebar-header`
- `.sidebar-brand`
- `.sidebar-groups`
- `.sidebar-footer`
- `.shell-main`
- `.topbar`
- `.sidebar-toggle`
- `.sidebar-overlay`
- classes de estado colapsado/oculto

Resultado esperado:

- o CSS passa a expressar claramente a arquitetura visual nova

## 3.3. Arquivo: `apps/web/src/pages/api-client.ts`

Papel atual:

- gerenciamento local de tokens
- `apiRequest`
- `isLoggedIn`
- helpers utilitarios

O que deve ser revisado na futura implementacao:

- persistencia da preferencia da sidebar

Acao futura sugerida:

- adicionar helpers simples para armazenar:
  - estado expandido
  - estado recolhido
  - estado escondido

O que nao deve ser feito:

- nao misturar logica de rede com logica visual de forma desorganizada

Resultado esperado:

- o arquivo pode continuar hospedando utilitarios de cliente
- mas o controle da shell deve ser minimamente organizado

## 3.4. Arquivo: `apps/web/src/pages/login.ts`

Papel atual:

- tela sem chrome

O que deve ser feito:

- nenhuma alteracao estrutural na experiencia visual principal da tela
- apenas confirmar compatibilidade com a nova shell geral

Resultado esperado:

- login continua sem sidebar
- login continua tendo identidade propria

## 4. Ordem Recomendada de Implementacao

1. refatorar a shell em `apps/web/src/index.ts`
2. criar a nova base visual em `apps/web/src/styles.ts`
3. integrar estados da sidebar no script de shell
4. ajustar responsividade mobile/tablet
5. revisar `status-bar`
6. adicionar persistencia de preferencia no cliente
7. validar que `/login` permanece fora da shell lateral

## 5. Checklist Operacional por Arquivo

## `apps/web/src/index.ts`

- [ ] manter `routes`
- [ ] reestruturar `buildPage()`
- [ ] substituir `navScript` por controller real da sidebar
- [ ] adaptar `authBootstrapScript` para a nova shell
- [ ] manter `navGroups`
- [ ] reescrever `navHtml` como renderer lateral
- [ ] substituir o bloco `<nav>` atual por sidebar + shell
- [ ] encaixar `main` em `shell-main`
- [ ] reposicionar ou redefinir `status-bar`
- [ ] mover a renderizacao do usuario para a nova estrutura

## `apps/web/src/styles.ts`

- [ ] manter paleta atual
- [ ] adicionar variaveis de largura/estado/transicao
- [ ] substituir o CSS do `nav` horizontal
- [ ] criar classes da shell lateral
- [ ] revisar `main`
- [ ] revisar `status-bar`
- [ ] substituir a responsividade atual por drawer mobile

## `apps/web/src/pages/api-client.ts`

- [ ] adicionar persistencia de preferencia da sidebar
- [ ] manter responsabilidade do arquivo sob controle

## `apps/web/src/pages/login.ts`

- [ ] confirmar que continua sem chrome lateral

## 6. Veredito

O trabalho futuro esta claramente concentrado em dois arquivos:

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

O primeiro sera a refatoracao estrutural da shell.
O segundo sera a refatoracao visual e responsiva da shell.

Esse roteiro permite iniciar a implementacao futura com clareza de escopo, sem dispersao e sem risco de editar o arquivo errado.
