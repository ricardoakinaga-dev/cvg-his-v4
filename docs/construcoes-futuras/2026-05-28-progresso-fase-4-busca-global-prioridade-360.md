# Progresso Fase 4 - Busca global com prioridade 360

Data: 2026-05-28

## Objetivo

Avancar `F4-04 - Otimizar busca global`, usando os sinais do cockpit como contexto visivel na Busca Mestre e reduzindo o tempo para abrir o cockpit correto.

## Entregue

- A tabela de pacientes da `Busca Mestre` ganhou a coluna `Prioridade 360`.
- Pacientes com doenca cronica ou alergia aparecem como `Atencao clinica`.
- Pacientes sem alerta cadastral aparecem como `Sem alerta`.
- A acao principal do resultado de paciente passou a ser `Abrir cockpit`, mantendo o destino `/patients/:id`.
- O teste da Busca Mestre cobre o sinal `Prioridade 360`, a exibicao de `Atencao clinica` e o atalho para o cockpit do paciente.
- A mesma linguagem foi conectada nas acoes rapidas contextuais da `Recepcao`, criando um atalho `Prioridade 360` para pacientes com alerta clinico cadastral.
- A recepcao passou a enriquecer o mesmo atalho com exames pendentes e preventivo vencido carregados por servicos reais.
- A recepcao passou a incluir pendencia financeira do paciente na mesma hierarquia, abaixo de laboratorio e preventivo.
- A `Busca Mestre` passou a usar a mesma hierarquia enriquecida com exames pendentes, preventivo vencido e pendencia financeira, incluindo filtro `Filtrar prioridade 360`.
- A `Busca Mestre` passou a ordenar pacientes por severidade da prioridade 360, com desempate alfabetico.
- A `Busca Mestre` passou a exibir resumo agregado por severidade da prioridade 360.
- O resumo da `Busca Mestre` passou a ser acionavel, filtrando pacientes por severidade especifica.

## Evidencias tecnicas

- `apps/spa/src/pages/master-search/MasterSearchPage.vue`
- `apps/spa/src/pages/master-search/__tests__/MasterSearchPage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/master-search/__tests__/MasterSearchPage.test.ts` - 5/5 testes passando.

## Impacto no Premium Enterprise

A busca federada deixa de ser apenas localizador cadastral e passa a carregar sinal operacional de cockpit. Isso ajuda recepcao, suporte e atendimento a identificar rapidamente pacientes que exigem atencao clinica antes de abrir a ficha.

## Proximos passos recomendados

- Rodar a jornada 360 E2E em ambiente com PostgreSQL de teste ativo para validar persistencia real.
