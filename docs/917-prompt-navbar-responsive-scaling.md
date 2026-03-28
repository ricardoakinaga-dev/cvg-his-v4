# Prompt - Implementar Escala Responsiva Real da Navbar

Implemente uma escala responsiva real para a navbar do frontend oficial `apps/web` do projeto `cvg-his-v2`.

## Objetivo

Deixar o tamanho da navbar, das fontes, dos botões e dos ícones proporcional ao tamanho da tela, para que a interface não pareça estranha ou desbalanceada em smartphone, tablet e desktop.

## Arquivos principais

- `apps/web/src/styles.ts`
- `apps/web/src/index.ts` somente se for estritamente necessário

## Contexto

Hoje a navbar já passou por várias rodadas de refinamento, mas ainda parece desproporcional porque o tamanho da fonte, dos botões e da própria sidebar não escala bem com a viewport.

## O que fazer

1. Criar um pequeno sistema de variáveis CSS para escala da navbar, por exemplo:
   - `--sidebar-width`
   - `--sidebar-collapsed-width`
   - `--sidebar-font-size`
   - `--sidebar-group-font-size`
   - `--sidebar-link-padding-y`
   - `--sidebar-link-padding-x`
   - `--sidebar-icon-size`
   - `--sidebar-toggle-size`

2. Definir esses valores por breakpoint:
   - smartphone
   - tablet
   - desktop
   - desktop grande

3. Usar `clamp(...)` quando fizer sentido para suavizar a transição entre telas.

4. Aplicar a escala nos elementos da navbar:
   - largura da sidebar
   - tamanho das fontes
   - altura/padding dos botões
   - tamanho dos ícones
   - tamanho do botão de colapso

5. Manter o comportamento atual da navbar:
   - smartphone com drawer
   - tablet com comportamento próprio
   - desktop estável

6. Não abrir nova rodada de redesign visual.
7. Não mexer em backend.
8. Não reescrever o shell inteiro.

## Critérios de aceite

- no smartphone a navbar continua legível e natural
- no tablet a proporção parece equilibrada
- no desktop a navbar não parece pequena demais nem grande demais
- os botões e fontes ficam proporcionais à tela
- `pnpm --filter @cvg-his-v2/web typecheck` passa
- `pnpm --filter @cvg-his-v2/web build` passa

## Resposta final esperada

Ao final, responda com:

- status: `Concluido`, `Parcial` ou `Bloqueado`
- arquivos alterados
- quais variáveis/escala foram criadas
- o que mudou em smartphone
- o que mudou em tablet
- o que mudou em desktop
- resultado do typecheck
- resultado do build
- pendências restantes
