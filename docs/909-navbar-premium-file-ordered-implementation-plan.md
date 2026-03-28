# Plano de Implementacao Real - Navbar Premium por Ordem de Arquivos

Data: 2026-03-28
Origem:

- `docs/907-navbar-premium-mobile-float-plan.md`
- `docs/908-navbar-premium-execution-plan.md`

## Objetivo

Converter o plano tecnico da navbar premium em uma ordem real de implementacao, organizada por arquivos e por etapas praticas.

A ideia e deixar claro:

1. qual arquivo vem primeiro
2. o que muda em cada arquivo
3. o que validar logo apos cada etapa
4. o que fica para refinamento posterior de produto

## Ordem Recomendada de Execucao

## Etapa 1 - `apps/web/src/index.ts`

### Motivo para vir primeiro

`index.ts` hoje concentra:

- a estrutura do shell
- o markup da sidebar
- o markup da topbar
- o toggle
- a persistencia do estado da sidebar
- a injecao do usuario no rodape

Sem reorganizar primeiro esse arquivo, qualquer refinamento de CSS tende a virar retrabalho.

### O que implementar aqui

1. remover o branding textual da sidebar
2. remover o bloco introdutorio da sidebar
3. manter apenas:
   - toggle
   - grupos
   - links
   - footer de usuario, se mantido
4. reorganizar o HTML para suportar melhor:
   - navbar float
   - overlay mobile
   - fechamento por clique fora
   - comportamento de tablet/mobile
5. revisar a estrutura do toggle para suportar estados mais claros
6. preparar persistencia de:
   - estado expandido/recolhido
   - grupos abertos
   - posicao de scroll da sidebar
7. garantir que o clique nos links nao destrua o contexto do menu mais do que o necessario

### O que nao fazer ainda

- nao fechar linguagem visual final
- nao tentar resolver toda a paleta aqui
- nao abrir refatoracao grande de navegacao

### Validacoes apos esta etapa

1. sidebar continua renderizando em todas as rotas
2. links continuam funcionando
3. destaque de rota ativa continua correto
4. login/logout continuam intactos
5. toggle continua funcional

## Etapa 2 - `apps/web/src/styles.ts`

### Motivo para vir em segundo

Depois da estrutura estar limpa, `styles.ts` recebe o trabalho de transformar o shell em navbar premium de verdade.

### O que implementar aqui

1. recalibrar layout da sidebar sem branding e sem intro
2. aplicar linguagem float
3. suavizar sombras
4. suavizar contrastes
5. refinar estados hover e active
6. refinar motion
7. definir comportamento por breakpoint:
   - desktop
   - tablet
   - smartphone
8. implementar visual do overlay mobile
9. revisar espacamentos, densidade e touch targets
10. revisar estado colapsado para o novo markup

### O que nao fazer ainda

- nao misturar CSS com decisao de arquitetura de layout legado
- nao sair ajustando paginas individuais sem necessidade

### Validacoes apos esta etapa

1. desktop expandido
2. desktop colapsado
3. smartphone com drawer
4. tablet no breakpoint escolhido
5. overlay aparece e desaparece corretamente
6. contraste continua legivel
7. hover e active nao ficam agressivos

## Etapa 3 - Validacoes Funcionais do Shell

### Motivo para vir antes de refinamentos finais

Depois que `index.ts` e `styles.ts` estiverem consolidados, a prioridade e testar comportamento real.

### O que validar

1. esconder/exibir navbar
2. persistencia do estado expandido/recolhido
3. persistencia dos grupos abertos
4. persistencia do scroll da sidebar
5. ausencia da sensacao de reset ao clicar nos itens
6. fechamento por clique fora no mobile
7. fechamento por `Escape`
8. bloqueio de scroll do fundo no mobile
9. interacao por toque
10. comportamento do menu ao trocar de rota

### Onde isso toca

Principalmente comportamento de:

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

E eventualmente:

- `apps/web/src/pages/api-client.ts` apenas se houver necessidade de coordenar melhor navegacao/percepcao de troca de rota

### Resultado esperado

- shell estavel
- sem estranheza de navegacao
- menu confiavel em uso real

## Etapa 4 - Refinamentos de Produto

### Motivo para deixar por ultimo

Esses itens dependem mais de preferencia de produto/UX do que de engenharia basica.

### O que entra aqui

1. decisao final de linguagem premium
2. decisao final da experiencia de tablet
3. confirmar se a topbar continua com titulo
4. confirmar se o rodape de usuario fica na sidebar
5. ajustar o nivel exato de contraste, sombra e profundidade
6. decidir se a navbar deve ficar mais:
   - clinica
   - executiva
   - neutra
7. revisar se algum grupo deve mudar de ordem ou nomenclatura

### Arquivos provaveis

- `apps/web/src/styles.ts`
- `apps/web/src/index.ts`
- eventualmente `docs/*.md`

### Resultado esperado

- acabamento premium final
- coerencia visual com intencao de produto

## Etapa 5 - Fechamento Arquitetural

### Motivo

Depois da implementacao funcional, vale fechar ambiguidades estruturais para evitar drift.

### O que entra

1. revisar `apps/web/src/pages/layout.ts`
2. decidir se permanece como legado sem uso
3. documentar a trilha canonica do shell no frontend oficial
4. registrar comportamento final da navbar em docs

### Arquivos provaveis

- `apps/web/src/pages/layout.ts`
- `docs/*.md`

### Resultado esperado

- menos ambiguidade no codigo
- menos risco de regressao futura por caminhos paralelos

## Ordem Resumida

1. `apps/web/src/index.ts`
2. `apps/web/src/styles.ts`
3. validacoes funcionais do shell
4. refinamentos de produto
5. fechamento arquitetural e documental

## Checklist Operacional da Implementacao

### Primeiro: estrutura

- limpar sidebar
- preparar estados
- preparar overlay e comportamento mobile

### Segundo: visual

- float
- sombras suaves
- motion suave
- paleta e contraste premium

### Terceiro: comportamento

- toggle
- groups state
- scroll persistence
- no reset perceptivo

### Quarto: acabamento

- produto
- tablet
- linguagem visual final

## O que pode ser feito logo no primeiro corte sem risco alto

1. limpar `index.ts`
2. limpar `styles.ts`
3. melhorar toggle
4. adicionar overlay mobile
5. persistir estado dos grupos
6. persistir scroll do menu

## O que eu evitaria no primeiro corte

1. trocar o modelo inteiro de navegacao
2. misturar refatoracao do shell com backlog funcional de modulos
3. refazer paginas internas ao mesmo tempo
4. mexer em backend para resolver problema que hoje e majoritariamente de shell/frontend

## Recomendacao Final

Se formos executar isso com seguranca, a sequencia mais forte e exatamente esta:

1. primeiro `index.ts`
2. depois `styles.ts`
3. depois validacoes
4. depois refinamentos de produto

E so no final:

5. fechamento arquitetural e documental

Essa ordem reduz retrabalho, protege o fluxo atual e aumenta a chance de a navbar premium nascer estavel desde a primeira entrega.
