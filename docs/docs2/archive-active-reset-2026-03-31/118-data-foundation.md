# Data Foundation

## Principios

- dados organizados por bounded context
- ownership de tabelas por modulo
- relacoes entre modulos via chaves e contratos
- historico preservado para dados clinicos sensiveis

## Padrao base

- cada agregado principal possui `id`, `account_id`, timestamps e autoria quando aplicavel
- soft delete apenas onde fizer sentido operacional
- conteudo clinico relevante preparado para versionamento
- tabelas de relacionamento explicitam o papel do vinculo

## Ownership inicial

- `auth`: sessoes e eventos de autenticacao
- `users` e `staff`: identidades e atribuicoes
- `owners`: dados do tutor
- `patients`: dados do paciente e vinculos
- `encounters`: episodio e transicoes
- `medical-records`: entries e revisoes
- `attachments`: metadados de artefatos
- `audit`: eventos append-only
