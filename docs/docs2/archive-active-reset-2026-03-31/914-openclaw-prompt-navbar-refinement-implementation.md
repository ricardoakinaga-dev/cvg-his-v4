# Prompt OpenClaw - Implementar Refinamento da Navbar

Leia este arquivo e execute as instrucoes exatamente nesta ordem.

## Objetivo

Implementar a nova rodada de refinamento da navbar premium do frontend oficial `apps/web`, focando em reduzir excesso visual e aproximar a interface de um nivel mais satisfatorio para producao.

## Contexto

As iteracoes anteriores melhoraram o shell, mas o feedback visual atual indica que a navbar ainda esta:

- larga demais
- com fontes ainda grandes
- com bordas/raios ainda chamando muita atencao
- com botao de colapso exagerado
- distante do nivel visual esperado para producao

O foco desta rodada e **retirar excesso**, nao adicionar complexidade.

## Arquivos Principais

Trabalhe prioritariamente nestes arquivos:

- `apps/web/src/styles.ts`
- `apps/web/src/index.ts`

## Diretriz Principal

O resultado final deve fazer a navbar parecer:

- menor
- mais discreta
- mais fina
- menos decorativa
- mais operacional
- mais premium pela sobriedade

## Escopo da Implementacao

### 1. Reduzir massa visual da sidebar

Implemente refinamentos para:

- reduzir largura geral da navbar, se ainda estiver dominante
- reduzir largura do estado colapsado
- reduzir paddings e gaps excessivos
- fazer o container pesar menos visualmente que os links

### 2. Compactar tipografia

Implemente refinamentos para:

- reduzir tamanho das fontes dos grupos
- reduzir tamanho das fontes dos links
- revisar pesos tipograficos se ainda parecerem pesados
- manter legibilidade sem inflar o menu

### 3. Reduzir protagonismo do container

Implemente refinamentos para:

- reduzir destaque das bordas
- reduzir raio das bordas se ainda estiver exagerado
- suavizar ainda mais sombras
- suavizar o estado ativo sem perder clareza

### 4. Corrigir o botao de colapso

Implemente refinamentos para:

- deixar o botao pequeno
- deixar o botao discreto
- evitar que ele empurre os links para baixo
- fazer o controle parecer recurso secundario e nao elemento principal
- garantir que o controle continue funcional

### 5. Deixar a scrollbar quase invisivel

Implemente refinamentos para:

- esconder a scrollbar em repouso
- mostrar de forma discreta em hover/interacao
- evitar thumb chamativa

## O que Nao Fazer

- nao abrir refatoracao ampla do backend
- nao criar novas features
- nao adicionar decoracao extra na sidebar
- nao inflar ainda mais blur, borda ou sombra para tentar parecer premium
- nao fugir do escopo principal do navbar

## Ordem de Execucao

1. Leia o estado atual dos arquivos:
   - `apps/web/src/styles.ts`
   - `apps/web/src/index.ts`
2. Implemente primeiro os refinamentos principais em `styles.ts`.
3. Mexa em `index.ts` apenas se for necessario para o controle de colapso.
4. Rode validacoes:
   - `pnpm --filter @cvg-his-v2/web typecheck`
   - `pnpm --filter @cvg-his-v2/web build`
5. Ao final, entregue um resumo objetivo do que foi mudado.

## Critérios de Aceite

Considere a tarefa bem sucedida apenas se, ao final:

1. a navbar estiver visualmente mais compacta
2. a tipografia parecer menos inflada
3. o container chamar menos atencao que os links
4. o botao de colapso estiver menor e mais discreto
5. a scrollbar estiver mais invisivel em repouso
6. `typecheck` passar
7. `build` passar

## Formato da Resposta Final Esperada

Ao terminar, responda com:

### Status

Use apenas um:

- `Concluido`
- `Parcial`
- `Bloqueado`

### Informe tambem

1. quais arquivos foram alterados
2. quais ajustes principais foram feitos
3. resultado do `typecheck`
4. resultado do `build`
5. qualquer risco ou pendencia residual
