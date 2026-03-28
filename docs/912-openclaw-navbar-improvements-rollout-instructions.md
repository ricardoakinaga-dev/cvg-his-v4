# Instrucoes para OpenClaw - Subir as Melhorias da Navbar

Leia este arquivo e execute as instrucoes exatamente nesta ordem.

## Objetivo

Subir as melhorias mais recentes da navbar premium do frontend oficial `apps/web` do projeto `cvg-his-v2`, validando o build antes e confirmando o estado final da publicacao.

## Escopo Esperado

As melhorias ja implementadas e que devem ser consideradas neste rollout incluem:

- limpeza estrutural da sidebar
- sidebar premium com menor peso visual
- reducao de largura e densidade da navbar
- suavizacao de bordas, sombras e contrastes
- persistencia de estado do menu
- persistencia dos grupos abertos
- persistencia do scroll da sidebar
- overlay mobile
- fechamento do menu em mobile ao clicar em item
- bloqueio de scroll do fundo com menu aberto em mobile
- refinamento do botao de retracao para ficar menor e menos invasivo
- scrollbar mais discreta

## Arquivos Principais Envolvidos

- `apps/web/src/index.ts`
- `apps/web/src/styles.ts`

## Passo a Passo

### Passo 1 - Verificar o estado atual do workspace

1. Liste os arquivos alterados relacionados ao frontend oficial.
2. Confirme que as mudancas relevantes estao concentradas em `apps/web`.
3. Nao faca refatoracoes extras fora do escopo.

### Passo 2 - Validar o frontend antes de subir

Execute exatamente:

- `pnpm --filter @cvg-his-v2/web typecheck`
- `pnpm --filter @cvg-his-v2/web build`

Se qualquer um falhar:

- pare a execucao
- informe o erro exato
- marque o status como `Bloqueado`

### Passo 3 - Usar o fluxo oficial de publicacao do projeto

1. Descubra qual e o fluxo oficial de deploy/release do repositorio.
2. Se existir script oficial, use o script oficial.
3. Nao invente fluxo paralelo se o repositorio ja tiver procedimento padrao.

Se houver mais de um caminho possivel:

- priorize o caminho oficial de staging/release do projeto

### Passo 4 - Subir a versao atualizada

1. Execute o deploy/publicacao do frontend oficial com as mudancas atuais.
2. Garanta que a aplicacao publicada corresponda ao estado atual do codigo local.
3. Nao altere o escopo funcional durante o deploy.

### Passo 5 - Validar apos a subida

Apos publicar, valide no ambiente alvo:

1. a aplicacao abre normalmente
2. a navbar renderiza
3. o toggle abrir/fechar funciona
4. a navegacao entre rotas funciona
5. o menu em mobile abre corretamente
6. o overlay mobile funciona
7. a sidebar nao quebrou o layout principal
8. o frontend carregou sem erro fatal

### Passo 6 - Revisao visual minima obrigatoria

Verifique, pelo menos de forma basica:

1. a largura da navbar nao esta excessiva
2. o botao de retracao nao esta dominante demais
3. a scrollbar esta discreta

Se algum desses pontos falhar, descreva claramente:

- o que foi observado
- em qual viewport
- se o deploy ficou `Parcial` ou `Bloqueado`

## Regras Importantes

- nao implemente novas features nesta etapa
- nao faca refatoracoes fora do escopo da navbar
- nao altere backend sem necessidade
- nao esconda erros
- se houver bloqueio de ambiente, relate com precisao

## Formato da Resposta Final Esperada

Ao terminar, responda com:

### Status

Use apenas um:

- `Concluido`
- `Parcial`
- `Bloqueado`

### Informe tambem

1. quais comandos foram executados
2. resultado do `typecheck`
3. resultado do `build`
4. como o deploy foi feito
5. qual ambiente/URL foi atualizado
6. quais validacoes visuais e funcionais foram realizadas
7. qualquer risco, falha ou pendencia residual

## Criterio de Sucesso

Considere a tarefa bem sucedida apenas se:

1. o frontend oficial subir com sucesso
2. `typecheck` e `build` passarem
3. a navbar funcionar no ambiente publicado
4. nao houver erro evidente de layout ou navegacao
