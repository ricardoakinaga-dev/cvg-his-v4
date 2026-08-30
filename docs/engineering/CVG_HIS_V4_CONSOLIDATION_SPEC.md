# SPEC — Slice operacional de consolidação CVG-HIS V4

**Status:** pronto para implementação  
**Escopo:** migration integrity + health contract + graceful shutdown  
**Fora do slice:** rename V2/V4, provider, RLS de produção, restore real, parity e refatoração ampla do `server.ts`.

## S1 — Runner de migrations

### Contrato

`packages/db/src/migrate.ts` deve carregar registros aplicados como `{ migrationName, hash }`, comparar cada migration local antes de aplicar qualquer migration nova e falhar com erro seguro quando:

- o mesmo nome existir com hash registrado diferente do hash local;
- o registro não tiver hash válido;
- houver qualquer inconsistência que impeça determinar a ordem aplicada.

Hash igual continua sendo idempotente e é ignorado. Migration nova é aplicada em transação como hoje. O erro deve conter nome e os prefixos dos hashes esperado/registrado, nunca SQL ou segredo.

### Testes

- função pura: mesmo hash retorna sucesso;
- função pura: mismatch retorna erro com nome e hashes truncados;
- função pura: lista aplicada é normalizada sem mutação;
- contrato de query seleciona `migration_name, hash`;
- regressão de build/typecheck e teste do package DB.

Não se altera nem se apaga migration existente.

## S2 — Healthcheck Compose

Adicionar ao serviço `cvg-his-v2-api` em `docker-compose.v2.yml`:

```yaml
healthcheck:
  test: ['CMD-SHELL', 'curl -fsS http://127.0.0.1:3001/ready >/dev/null || exit 1']
  interval: 10s
  timeout: 3s
  retries: 20
  start_period: 15s
```

A API image já instala `curl`; o YAML passa a declarar o contrato na mesma superfície que usa `condition: service_healthy`. `/ready` retorna 503 enquanto DB/repositories não estão prontos.

Teste: parser/config do Compose com `.env.v2.example` e teste textual/estrutural que confirme serviço, porta e endpoint.

## S3 — Shutdown gracioso

### API

- manter referência ao `ApiServer` depois da composição;
- receber SIGTERM/SIGINT por função idempotente;
- parar de aceitar conexões e aguardar `server.close()` quando estiver ouvindo;
- chamar `shutdownServices()` e observabilidade uma vez;
- definir `process.exitCode = 0` no caminho normal e `1` no erro;
- não usar `process.exit(0)` para o caminho gracioso;
- impedir que um sinal recebido antes do listen continue iniciando o servidor.

### Worker

- sinaliza estado de encerramento;
- fecha health server se iniciado;
- evita iniciar novo tick e sai do loop;
- chama `shutdownWorkerServices()` e observabilidade uma vez;
- deixa o `finally` ser seguro contra chamadas duplicadas;
- não usa `process.exit(0)` no caminho gracioso.

### Testes

- process test com SIGTERM confirma exit code 0 e encerramento;
- health/ready deixa de anunciar serviço ativo conforme contrato de drain;
- shutdown chamado duas vezes não falha nem duplica fechamento;
- teste existente do worker continua verde.

## Segurança e compatibilidade

Não mudar autenticação, tenant, RLS, schemas, contratos clínicos ou persistência de negócio neste slice. Erros não devem expor DATABASE_URL, SQL, token, secret ou payload clínico.

## Critérios de aceite

Todos os itens de `QUALITY_BAR.md` para o primeiro slice, além de revisão independente do diff. Se a prova de processo exigir PostgreSQL/Redis indisponível, marcar `PARTIAL`; não fabricar PASS.
