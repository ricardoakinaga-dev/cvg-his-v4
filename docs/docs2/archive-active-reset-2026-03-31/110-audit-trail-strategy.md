# Audit Trail Strategy

## Objetivo

Garantir evidencias suficientes para investigacao operacional, clinica e de seguranca.

## Eventos obrigatorios

- login, refresh, falha de autenticacao e revoke
- criacao, revisao e fechamento de entries clinicas
- abertura, transicao e encerramento de encounter
- alteracoes de cadastro mestre
- eventos administrativos materiais

## Campos minimos do evento

- `event_id`
- `occurred_at`
- `actor_id`
- `account_id`
- `module`
- `action`
- `entity_type`
- `entity_id`
- `correlation_id`
- `payload_summary`
- `risk_level`

## Regras

- auditoria e append-only
- payload nao deve conter segredos brutos
- trilha clinica e de seguranca precisa ser correlacionavel com request ou job
