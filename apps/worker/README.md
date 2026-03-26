# apps/worker

Worker assíncrono do CVG-HIS V2.

## Responsabilidades

- processar jobs derivados de eventos e rotinas programadas
- executar notificacoes, reconciliacoes e integracoes
- preservar rastreabilidade com `correlation_id`

## Nao responsabilidades

- burlar policies ou auditoria
- virar ponto de entrada de regra clinica sem contrato

## Status

Skeleton estrutural aberto na Fase 1. Implementacao entra na Fase 2 em diante.
