# Prompt OpenClaw - Ajuste Final de Breakpoint e Comportamento da Navbar

Leia este arquivo e execute somente esta rodada final de ajuste.

## Objetivo

Fazer apenas o ajuste final de breakpoint/comportamento da navbar do frontend oficial `apps/web`, sem abrir nova rodada de redesign.

## Problema Atual

O comportamento da sidebar ainda usa uma regra ampla demais para fechamento/controle mobile baseada em `window.innerWidth <= 1180`.

Isso precisa ser refinado para refletir melhor a estrategia atual:

- smartphone: drawer com comportamento mobile real
- tablet: comportamento proprio, sem ser tratado como mobile puro
- desktop: comportamento de shell estavel, sem efeitos mobile indevidos

## Escopo

Trabalhe apenas onde for necessario:

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts` somente se realmente precisar alinhar breakpoints

Nao abra nova rodada de redesign visual.

## O que ajustar

1. Revisar a logica de controle da sidebar que hoje depende de `window.innerWidth <= 1180`.
2. Definir breakpoint(s) coerente(s) com a estrategia atual:
   - smartphone: drawer/fechamento automatico
   - tablet: comportamento hibrido ou proprio
   - desktop: sem tratamento mobile indevido
3. Garantir consistencia entre:
   - clique em link
   - clique fora
   - tecla `Escape`
   - classe `body.sidebar-open`
4. Manter:
   - persistencia dos grupos
   - persistencia do scroll
   - persistencia do estado da sidebar onde fizer sentido

## O que nao fazer

- nao redesenhar a navbar de novo
- nao alterar paleta, tipografia ou sombras sem necessidade
- nao abrir backlog novo
- nao mexer em backend

## Validacoes obrigatorias

Execute ao final:

- `pnpm --filter @cvg-his-v2/web typecheck`
- `pnpm --filter @cvg-his-v2/web build`

## Revisao visual minima obrigatoria

Depois do ajuste, valide visualmente:

1. smartphone
2. tablet
3. desktop

Verifique especificamente:

- o menu fecha corretamente no smartphone
- o tablet nao se comporta como mobile improvisado
- o desktop nao sofre colapso/fechamento indevido

## Formato da resposta final

### Status

Use apenas um:

- `Concluido`
- `Parcial`
- `Bloqueado`

### Informe tambem

1. arquivos alterados
2. breakpoint final adotado
3. o que mudou no smartphone
4. o que mudou no tablet
5. o que mudou no desktop
6. resultado do `typecheck`
7. resultado do `build`
8. riscos ou pendencias restantes
