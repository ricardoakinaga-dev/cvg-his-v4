# Prompt OpenClaw — Deploy Perfeito do CVG-HIS V2

Data atualizacao: 2026-03-27

## Objetivo

Este prompt consolida os documentos de deploy, cutover e validacao final do ambiente real para orientar o **OpenClaw** a executar o deploy do **CVG-HIS V2 real** com o maximo de rigor operacional.

## Prompt

```text
Você está atuando como agente principal de deploy e validação final do projeto `cvg-his-v2`.

OBJETIVO
Executar o deploy do `CVG-HIS V2 real` no servidor de forma correta, segura e validada, seguindo exclusivamente a trilha canônica do V2, realizando:
- preparação do ambiente
- subida do stack real
- aplicação das migrations oficiais
- validações técnicas
- cutover assistido
- validação final publicada
- validação real do `SPC-010` no ambiente persistente e no domínio

FONTES DE VERDADE OBRIGATÓRIAS
Leia e siga nesta ordem:
1. `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
2. `docs/131-checklist-cutover-servidor.md`
3. `docs/132-prompt-openclaw-deploy-v2.md`
4. `docs/133-prompt-openclaw-validacao-final-spc-010.md`

REGRA MÁXIMA
Se houver conflito entre memória, hábito, suposição e documentação, siga a documentação acima.
Não improvise trilha alternativa.

ESCOPO CANÔNICO OBRIGATÓRIO
Use apenas:
- `apps/api`
- `apps/web`
- `apps/worker`
- `.env.v2`
- `docker-compose.v2.yml`
- `infra/scripts/cutover-v2.sh`
- `packages/shared/database/src/migrations/*.sql`

PROIBIÇÕES ABSOLUTAS
- Não usar `apps/his-*`
- Não usar deploy legado como trilha principal
- Não aplicar migrations fora das oficiais
- Não declarar deploy concluído sem prova real
- Não expandir escopo para outros módulos
- Não iniciar frentes paralelas desnecessárias
- Não marcar `SPC-010` como concluído sem validação real publicada

MISSÃO COMPLETA

FASE 1 - LEITURA E CONFIRMAÇÃO
1. Ler os 4 documentos obrigatórios.
2. Confirmar que o repositório está na trilha V2 real.
3. Confirmar que o alvo do deploy é o stack:
   - PostgreSQL
   - Redis
   - API V2
   - Web V2
   - Worker V2

FASE 2 - VALIDAÇÃO DE AMBIENTE
4. Entrar no diretório do projeto.
5. Validar `.env.v2`.
6. Confirmar no `.env.v2`, no mínimo:
   - `POSTGRES_PASSWORD`
   - `AUTH_SECRET`
   - `FILE_STORAGE_PATH`
   - variáveis necessárias do compose
7. Parar imediatamente se:
   - `AUTH_SECRET` for fraco
   - `POSTGRES_PASSWORD` estiver inválido
   - `FILE_STORAGE_PATH` não for gravável
   - `.env.v2` estiver incompleto

FASE 3 - VALIDAÇÃO DE COMPOSE E SUBIDA DO STACK
8. Garantir permissão de execução em:
   - `infra/scripts/cutover-v2.sh`
9. Validar:
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml config`
10. Subir o stack V2:
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml up -d --build`
11. Confirmar containers esperados:
   - `postgres`
   - `redis`
   - `cvg-his-v2-api`
   - `cvg-his-v2-web`
   - `cvg-his-v2-worker`

FASE 4 - BANCO E MIGRATIONS
12. Aplicar exatamente nesta ordem:
   - `packages/shared/database/src/migrations/001_initial_schema.sql`
   - `packages/shared/database/src/migrations/002_entry_revisions.sql`
   - `packages/shared/database/src/migrations/003_advanced_care_persistence.sql`
   - `packages/shared/database/src/migrations/004_clinical_entry_governance.sql`
   - `packages/shared/database/src/migrations/005_sectors_beds.sql`
13. Não pular nenhuma migration.
14. Não trocar a ordem.
15. Confirmar no banco real a existência mínima de:
   - `sessions`
   - `audit_events`
   - `owners`
   - `patients`
   - `encounters`
   - `medical_records`
   - `clinical_entries`
   - `clinical_timeline`
   - `entry_revisions`
   - `attachments`
   - `notifications`
   - `inpatient_stays`
   - `surgery_cases`
   - `diagnostic_orders`
   - `sectors`
   - `beds`
16. Confirmar em `inpatient_stays` as colunas:
   - `sector_id`
   - `bed_id`
   - `transfer_to_sector_id`
   - `transfer_to_bed_id`

FASE 5 - VALIDAÇÕES TÉCNICAS DO STACK
17. Validar:
   - `docker compose --env-file .env.v2 -f docker-compose.v2.yml ps`
18. Validar API:
   - `/health`
   - `/ready`
   - `/live`
19. Validar Web:
   - `/`
   - `/login`
20. Validar staging mínimo via `pnpm staging:check` se o ambiente permitir.
21. Confirmar:
   - banco acessível
   - redis acessível
   - storage persistente gravável
   - API saudável
   - web servindo corretamente
   - worker estável e sem crash

FASE 6 - CUTOVER ASSISTIDO
22. Executar:
   - `infra/scripts/cutover-v2.sh`
23. Se o ambiente já estiver validado e houver autorização explícita no contexto, permitir:
   - `ENABLE_CADDY_SWITCH=true`
   - `CADDYFILE_TARGET=/etc/caddy/Caddyfile`
24. Só permitir parada do legado após validação real de sucesso.
25. Se usar parada do legado, registrar claramente:
   - quais containers foram parados
   - em que momento
   - com que evidência de sucesso do V2

FASE 7 - VALIDAÇÃO PUBLICADA REAL
26. Validar no domínio publicado:
   - web responde
   - API responde
   - login abre
   - acesso sem autenticação vai para `/login`
   - login válido redireciona corretamente
   - dashboard carrega
   - worker segue estável
27. Validar especificamente o `SPC-010` no ambiente real publicado:
   - `/sectors`
   - `/beds`
   - `/bed-map`
   - fluxo `assign-bed`
   - fluxo `transfer-bed`
   - bedmap refletindo ocupação corretamente
28. Executar um cenário mínimo real:
   - criar setor
   - criar leito
   - usar ou criar internação
   - fazer `assign-bed`
   - fazer `transfer-bed`
   - confirmar liberação e ocupação corretas

BLOQUEIOS OBRIGATÓRIOS
Pare imediatamente se encontrar:
- stack legado sendo usado por engano
- `.env.v2` inválido
- compose inválido
- Redis indisponível
- banco errado ou legado
- migration ausente
- migration falhando
- tabela obrigatória ausente
- coluna obrigatória ausente
- `/login` quebrado
- web abrindo protegido incorretamente
- dashboard quebrado
- worker crashando
- `/sectors`, `/beds` ou `/bed-map` indisponíveis
- `assign-bed` falhando
- `transfer-bed` falhando

ROLLBACK
Se o V2 falhar após o cutover:
- derrubar o stack V2
- preservar evidências
- restaurar proxy/alvo anterior se necessário
- registrar claramente o motivo do rollback
Não ocultar falhas.

FORMATO DE SAÍDA OBRIGATÓRIO
Responder exatamente com:
1. Documentos seguidos
2. Stack validada
3. `.env.v2` validado
4. Compose validado
5. Banco validado
6. Migrations aplicadas
7. Serviços publicados
8. Validações técnicas executadas
9. Cutover executado ou não
10. Validação publicada executada
11. Validação do SPC-010 executada
12. Status final: `Concluido`, `Parcial` ou `Bloqueado`
13. Bloqueio real encontrado, se existir
14. Próximo passo recomendado

CRITÉRIO DE SUCESSO
Só classifique como `Concluido` se estiver provado que:
- o stack V2 real está publicado
- banco e redis estão operacionais
- migrations 001 a 005 foram aplicadas corretamente no banco real
- `/health`, `/ready`, `/live` respondem
- `/login` e dashboard funcionam
- worker está estável
- `/sectors`, `/beds` e `/bed-map` funcionam no ambiente publicado
- `assign-bed` funciona
- `transfer-bed` funciona
- bedmap reflete corretamente a ocupação

COMECE AGORA POR:
1. abrir `docs/130-instalacao-publicacao-cvg-his-v2-real.md`
2. abrir `docs/131-checklist-cutover-servidor.md`
3. abrir `docs/132-prompt-openclaw-deploy-v2.md`
4. abrir `docs/133-prompt-openclaw-validacao-final-spc-010.md`
5. validar `.env.v2`
6. validar `docker-compose.v2.yml`
7. seguir rigorosamente a ordem acima
```

## Fontes usadas

- [130-instalacao-publicacao-cvg-his-v2-real.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/130-instalacao-publicacao-cvg-his-v2-real.md)
- [131-checklist-cutover-servidor.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/131-checklist-cutover-servidor.md)
- [132-prompt-openclaw-deploy-v2.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/132-prompt-openclaw-deploy-v2.md)
- [133-prompt-openclaw-validacao-final-spc-010.md](/home/cvgserver3/.openclaw/workspace/cvg-his-v2/docs/133-prompt-openclaw-validacao-final-spc-010.md)
