# 116 - Worker Architecture

**Status:** vivo
**Data de validacao:** 2026-03-31
**Fonte principal de evidencia:** `apps/worker/src/index.ts`, `apps/worker/src/bootstrap.ts`, `apps/worker/src/runner.ts`

## Papel do worker

`apps/worker` e o worker canonico do CVG-HIS V2.

Ele existe para:

- processar rotinas assincronas
- executar notificacoes e consolidacoes
- preservar rastreabilidade por `correlationId`
- operar desacoplado do request HTTP

## Estado real atual

O worker ja nao deve ser tratado como skeleton.

Hoje ele:

- sobe configuracao e logger
- valida estado de dependencia de banco
- inicializa servicos de notificacao
- executa loop continuo com intervalo configuravel
- faz shutdown controlado

## Responsabilidades

- processamento assincrono de jobs
- tratamento de notificacoes
- execucao recorrente de ticks de trabalho
- operacao segura sem bypass de policy

## Nao responsabilidades

- substituir a API como entrada de negocio
- aplicar efeitos materiais sem trilha auditavel
- concentrar regra clinica fora dos modulos

## Lacunas ainda abertas

- cobertura automatizada do worker ainda e pequena
- documentacao operacional do worker ainda precisa ser simplificada e consolidada

## Direcao para a proxima fase

- manter `apps/worker` como worker oficial
- expandir cobertura de observabilidade e testes
- documentar claramente quais rotinas assincronas sao obrigatorias para producao
