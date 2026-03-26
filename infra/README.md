# infra

Infraestrutura do V2 separada da regra de negocio.

## Estruturas previstas

- `docker`: imagens e compose de ambiente
- `db`: base de migrations, seeds e operacao de banco
- `observability`: stack de logs, metricas e tracing
- `scripts`: automacoes operacionais

## Regra geral

Infraestrutura apoia os modulos, mas nao define regras de dominio.
