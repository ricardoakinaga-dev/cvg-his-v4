# Prompt Codex - Implementar Melhorias Finais da Navbar

Leia este arquivo e execute a tarefa exatamente como descrita.

## Objetivo

Implementar as melhorias finais da navbar do frontend oficial `apps/web` do projeto `cvg-his-v2`, com foco em deixá-la mais próxima de um estado aceitável para produção.

## Contexto

O shell da navbar já passou por várias rodadas de melhoria, mas ainda precisa de refinamento final em comportamento e percepção visual.

Os pontos já trabalhados incluem:

- limpeza estrutural da sidebar
- persistência de grupos e scroll
- overlay mobile
- ajuste de breakpoints para smartphone, tablet e desktop
- refinamentos visuais para reduzir excesso

Mesmo assim, ainda é necessário implementar a rodada final de melhorias com cuidado.

## Arquivos e documentos que você deve ler antes

Leia primeiro estes arquivos em `/docs`:

- `docs/907-navbar-premium-mobile-float-plan.md`
- `docs/908-navbar-premium-execution-plan.md`
- `docs/909-navbar-premium-file-ordered-implementation-plan.md`
- `docs/911-navbar-premium-refinement-plan-post-review.md`
- `docs/913-navbar-production-gap-report-and-recovery-plan.md`
- `docs/915-openclaw-final-breakpoint-behavior-adjustment-prompt.md`

Depois disso, trabalhe principalmente nestes arquivos:

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

## Escopo desta tarefa

Implemente a rodada final de melhorias focando em:

### 1. Smartphone

- garantir que o drawer lateral pareça natural
- abertura e fechamento corretos
- overlay consistente
- clique em link fecha o menu no breakpoint mobile
- não parecer desktop comprimido

### 2. Tablet

- garantir que o comportamento híbrido pareça deliberado
- não herdar comportamento mobile puro
- não parecer comportamento quebrado

### 3. Desktop

- manter o shell estável
- garantir que a navbar continue menos problemática e menos dominante
- não reintroduzir comportamento mobile indevido

### 4. Botão de colapso

- manter pequeno e discreto
- garantir que esteja funcional
- não deixar o controle empurrar ou dominar a navbar

### 5. Refinamento visual final

- só faça ajustes visuais pequenos e necessários
- não abra nova rodada de redesign
- mantenha foco em usabilidade e proporção

## O que não fazer

- não mexer no backend
- não criar novas features fora da navbar
- não abrir refatoração ampla
- não reescrever o shell inteiro
- não inflar o visual novamente

## Ordem recomendada

1. Ler os documentos listados
2. Revisar estado atual de `index.ts` e `styles.ts`
3. Ajustar comportamento final
4. Ajustar visual final apenas se necessário
5. Rodar validações

## Validações obrigatórias

Ao final, rode:

- `pnpm --filter @cvg-his-v2/web typecheck`
- `pnpm --filter @cvg-his-v2/web build`

## Resultado esperado

A tarefa só deve ser considerada bem-sucedida se, ao final:

1. smartphone estiver coerente
2. tablet estiver coerente
3. desktop continuar estável
4. botão de colapso estiver aceitável
5. `typecheck` passar
6. `build` passar

## Formato da resposta final

Ao terminar, responda com:

### Status

Use apenas um:

- `Concluido`
- `Parcial`
- `Bloqueado`

### Informe também

1. arquivos alterados
2. o que foi ajustado no smartphone
3. o que foi ajustado no tablet
4. o que foi ajustado no desktop
5. o que foi ajustado no botão de colapso
6. resultado do `typecheck`
7. resultado do `build`
8. qualquer risco ou pendência residual
