# Prompt OpenClaw - Deploy das Atualizacoes da Navbar Premium

Faça o deploy das atualizações mais recentes do frontend oficial `apps/web` do projeto `cvg-his-v2`, com foco nas mudanças da navbar premium.

## Objetivo do deploy

- publicar a nova versão com a sidebar premium
- garantir que a navegação lateral continue funcional
- validar comportamento em desktop e mobile após o deploy

## Escopo das mudanças esperadas

- limpeza estrutural da sidebar
- nova camada visual premium em `apps/web/src/styles.ts`
- persistência de estado do menu
- overlay mobile
- fechamento do menu no mobile ao clicar em links
- bloqueio de scroll do fundo com menu móvel aberto
- ajustes finos de comportamento do shell

## Instruções

1. Verifique o estado atual do workspace e identifique os arquivos alterados relevantes.
2. Rode as validações mínimas antes do deploy:
   - `pnpm --filter @cvg-his-v2/web typecheck`
   - `pnpm --filter @cvg-his-v2/web build`
3. Se houver processo de build/release padronizado no repositório, use o fluxo oficial.
4. Faça o deploy somente se as validações passarem.
5. Após o deploy, valide:
   - carregamento da aplicação
   - renderização da navbar
   - toggle abrir/fechar
   - navegação entre rotas
   - comportamento mobile da sidebar
6. Informe no final:
   - status: `Concluido`, `Parcial` ou `Bloqueado`
   - comandos executados
   - resultado das validações
   - URL/ambiente publicado
   - qualquer erro, risco ou pendência encontrada

## Importante

- não altere o escopo funcional além do deploy
- não faça refatorações extras
- se encontrar bloqueio de ambiente, descreva exatamente o ponto de falha e o que falta para concluir
