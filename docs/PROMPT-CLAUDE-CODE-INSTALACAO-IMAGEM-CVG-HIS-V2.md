# Prompt Claude Code — Instalacao da Imagem Nova do CVG-HIS V2

```text
Você está trabalhando no repositório `cvg-his-v2`.

OBJETIVO
Instalar a imagem nova do `cvg-his-v2` com segurança, sem usar artefatos legados, sem usar migrations erradas e sem publicar portas erradas.

FONTE DA VERDADE
Use obrigatoriamente estes arquivos como fonte oficial do deploy:
- `/root/.openclaw/workspace/cvg-his-v2/README.md`
- `/root/.openclaw/workspace/cvg-his-v2/OPENCLAW_DEPLOY_DIRETRIZES.md`
- `/root/.openclaw/workspace/cvg-his-v2/INSTALACAO_V2_OPENCLAW.md`
- `/root/.openclaw/workspace/cvg-his-v2/docker-compose.v2.yml`
- `/root/.openclaw/workspace/cvg-his-v2/.env.v2.example`
- `/root/.openclaw/workspace/cvg-his-v2/infra/scripts/cutover-v2.sh`
- `/root/.openclaw/workspace/cvg-his-v2/infra/docker/Caddyfile.v2`

MISSÃO
Executar a atualização/instalação da stack nova do `cvg-his-v2` seguindo exatamente o fluxo canônico do repositório.

REGRAS OBRIGATÓRIAS
- Não use nenhuma imagem legada:
  - `cvg-his-api`
  - `cvg-his-web`
  - `cvg-his-worker`
- Não use nenhuma trilha `apps/his-*`
- Não use compose antigo
- Não use `packages/shared/database/src/migrations/*.sql` como fluxo principal
- Use somente:
  - `docker-compose.v2.yml`
  - `.env.v2`
  - `packages/db/src/migrate.ts`
  - `packages/db/src/seed.ts`
- Reconstrua as imagens a partir do código atual
- Não assuma portas antigas 3000/3001 para API/Web
- Considere as portas reais do compose atual:
  - API: `3003`
  - Web: `3004`
  - SPA: `3002`
  - Postgres: `5432`
  - Redis: `6380`

ORDEM OBRIGATÓRIA DE EXECUÇÃO
1. Ler atentamente os arquivos de documentação acima.
2. Confirmar quais serviços a stack real sobe hoje.
3. Validar se existe `.env.v2`; se não existir, criar a partir de `.env.v2.example`.
4. Validar o compose:
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml config`
5. Derrubar a stack V2 antiga:
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml down --remove-orphans`
6. Reconstruir as imagens novas explicitamente:
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml build --no-cache cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker cvg-his-v2-spa`
7. Subir primeiro as dependências:
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d postgres redis`
8. Aguardar Postgres e Redis ficarem saudáveis.
9. Aplicar migrations oficiais:
   - `DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB npx tsx packages/db/src/migrate.ts`
10. Se for necessário e intencional, aplicar seed inicial:
   - `DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx packages/db/src/seed.ts`
11. Subir a aplicação:
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d cvg-his-v2-api cvg-his-v2-web cvg-his-v2-worker cvg-his-v2-spa`
12. Validar a instalação:
   - `curl http://127.0.0.1:3003/health`
   - `curl http://127.0.0.1:3003/ready`
   - `curl -I http://127.0.0.1:3004/`
   - `curl -I http://127.0.0.1:3002/`
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml ps`
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-api`
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-web`
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-worker`
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml logs --tail=100 cvg-his-v2-spa`

REGRAS SOBRE CUTOVER E PROXY
- Não use defaults antigos de proxy
- Considere que o `infra/docker/Caddyfile.v2` já foi alinhado para:
  - Web em `3004`
  - API em `3003`
- Não valide worker via porta `3002`, porque `3002` é a SPA no compose atual
- Se precisar validar health HTTP do worker, só faça isso se a porta dele tiver sido exposta explicitamente

COMPORTAMENTO ESPERADO
- Trabalhe com extremo cuidado
- Mostre cada comando antes de executar
- Pare ao primeiro erro real
- Explique claramente o bloqueio
- Não improvise migrations alternativas
- Não marque sucesso sem validação real

ENTREGÁVEIS NO FINAL
Quero um relatório completo contendo:
1. Arquivos de documentação lidos
2. Comandos executados
3. Resultado de cada etapa
4. Imagens reconstruídas
5. Containers ativos
6. Resultado das validações HTTP
7. Logs relevantes
8. Pendências ou bloqueios
9. Veredito final:
   - instalação concluída com sucesso
   - instalação parcialmente concluída
   - instalação bloqueada

IMPORTANTE
Se encontrar qualquer divergência entre comando antigo e os arquivos de documentação da raiz, siga os arquivos da raiz atualizados como fonte da verdade.
```
