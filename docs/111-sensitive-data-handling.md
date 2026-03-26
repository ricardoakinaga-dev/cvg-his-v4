# Sensitive Data Handling

## Escopo

Dados sensiveis no V2 incluem:

- identificacao de usuarios e equipe
- dados de tutores
- dados clinicos do paciente
- anexos, laudos e artefatos diagnosticos
- sessoes, credenciais e evidencias de auditoria

## Regras de tratamento

- minimizacao de exposicao em responses e logs
- segregacao de acesso por policy e contexto
- trilha de auditoria para alteracoes materiais
- historico preservado para dados clinicos relevantes

## Logs e observabilidade

- nao logar segredos, tokens ou payloads clinicos completos
- usar resumos seguros em auditoria
- correlacionar requests por `correlation_id`

## Anexos

- armazenar checksum, mime type, origem e actor
- controlar acesso por contrato e policy
- impedir uso de nome de arquivo como unica referencia de seguranca
