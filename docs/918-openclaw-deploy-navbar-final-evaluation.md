# Prompt OpenClaw - Subir Navbar para Avaliacao Final

Leia os arquivos abaixo antes de começar:

- `/root/.openclaw/workspace/cvg-his-v2/docs/912-openclaw-navbar-improvements-rollout-instructions.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/915-openclaw-final-breakpoint-behavior-adjustment-prompt.md`
- `/root/.openclaw/workspace/cvg-his-v2/docs/917-prompt-navbar-responsive-scaling.md`

## Objetivo

Subir a versão mais recente do frontend oficial `apps/web` com todas as melhorias atuais da navbar, para avaliação visual final.

## Instruções

1. Verifique os arquivos alterados no workspace.
2. Confirme que o escopo principal está em `apps/web`.
3. Rode antes do deploy:
   - `pnpm --filter @cvg-his-v2/web typecheck`
   - `pnpm --filter @cvg-his-v2/web build`
4. Se ambos passarem, faça o deploy/publicação usando o fluxo oficial do projeto.
5. Após subir, valide no ambiente publicado:
   - carregamento da aplicação
   - navbar renderizando
   - comportamento em desktop
   - comportamento em tablet
   - comportamento em smartphone
   - toggle/colapso
   - drawer mobile
6. Não abra nova rodada de implementação. Esta tarefa é só subir e validar a versão atual.

## Resposta final esperada

- status: `Concluido`, `Parcial` ou `Bloqueado`
- comandos executados
- resultado do typecheck
- resultado do build
- como o deploy foi feito
- URL/ambiente publicado
- qualquer erro, risco ou pendência residual
