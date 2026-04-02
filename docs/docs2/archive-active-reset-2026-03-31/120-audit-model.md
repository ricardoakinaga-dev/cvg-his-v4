# Audit Model

## Modelo alvo

A auditoria do V2 sera append-only, correlacionavel e separada de logs tecnicos.

## Componentes do modelo

- `audit event`: unidade imutavel de registro
- `correlation_id`: elo entre request, jobs e efeitos derivados
- `risk_level`: classificacao de criticidade
- `payload_summary`: resumo seguro do evento

## Casos minimos obrigatorios

- autenticacao e sessao
- cadastro mestre
- encounter e transicoes
- entries clinicas e revisoes
- eventos administrativos materiais

## Consulta

- acesso restrito por permissao especifica
- filtros por ator, agregado, periodo, modulo e correlacao
