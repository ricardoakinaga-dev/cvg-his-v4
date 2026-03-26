# Worker Architecture

## Papel do `apps/worker`

- processar jobs, eventos e tarefas assíncronas
- executar notificacoes, integracoes e reconciliacoes
- preservar correlacao entre origem e efeito

## Regras

- worker nao e bypass de policy
- efeitos materiais exigem trilha de auditoria quando aplicavel
- jobs devem transportar `correlation_id` e contexto suficiente

## Responsabilidades tipicas

- envio de notificacoes
- processamento de integracoes externas
- consolidacoes assíncronas
- tarefas operacionais pesadas ou agendadas
