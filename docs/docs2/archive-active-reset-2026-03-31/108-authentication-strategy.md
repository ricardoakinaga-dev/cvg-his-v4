# Authentication Strategy

## Objetivo

Autenticar usuarios do V2 com sessao segura, revogavel e rastreavel, separando identidade, colaborador operacional e autorizacao.

## Componentes alvo

- `auth`: login, refresh, revoke, lifecycle de sessao
- `users`: identidade autenticavel
- `staff`: vinculacao operacional
- `auth-sdk`: cliente compartilhado entre apps

## Regras

- token nao define permissao sozinho
- sessoes precisam ser revogaveis
- eventos de autenticacao entram em auditoria
- claims minimas: `sub`, `account_id`, `session_id`, `auth_time`

## Evolucao prevista

- MFA por politica institucional
- federacao externa por adaptadores
- refresh rotacionado
