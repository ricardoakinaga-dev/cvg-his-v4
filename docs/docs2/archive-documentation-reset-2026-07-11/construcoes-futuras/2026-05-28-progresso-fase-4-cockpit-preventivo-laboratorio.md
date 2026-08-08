# Progresso Fase 4 - Cockpit 360 com preventivo e laboratorio

Data: 2026-05-28

## Objetivo

Expandir o item `F4-03 - Criar cockpit do paciente/tutor` para que o detalhe do tutor consolide tambem sinais assistenciais de vacinas, vermifugos e exames laboratoriais pendentes.

## Entregue

- O `Cockpit 360 tutor/paciente` passou a carregar eventos reais de `Vacinas e Vermifugos` pelo servico `vaccinesDewormersService`.
- O cockpit passou a carregar pedidos reais de laboratorio pelo servico `laboratoryService`.
- O resumo executivo da jornada assistencial agora exibe:
  - pacientes ativos;
  - atendimentos em aberto;
  - preventivos pendentes;
  - exames laboratoriais pendentes.
- Cada card de paciente no cockpit ganhou os blocos:
  - `Prevencao`, com o proximo evento preventivo agendado;
  - `Laboratorio`, com a contagem de exames pendentes.
- A carga usa tolerancia a falhas por bloco, mantendo o hub do tutor operacional e registrando aviso parcial para `preventivo` ou `laboratorio` quando alguma fonte nao responder.

## Evidencias tecnicas

- `apps/spa/src/pages/owners/OwnerDetailPage.vue`
- `apps/spa/src/pages/owners/__tests__/OwnerDetailPage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/owners/__tests__/OwnerDetailPage.test.ts` - 2/2 testes passando.

## Impacto no Premium Enterprise

O cockpit do tutor deixa de ser apenas uma leitura cadastral, financeira e de agenda. A tela agora aproxima a decisao operacional da rotina clinica real, mostrando preventivo e laboratorio diretamente no relacionamento tutor/paciente.

Isso reduz alternancia entre modulos e fortalece a proposta Premium Enterprise de visao 360 acionavel para recepcao, atendimento clinico, relacionamento e gestao.

## Proximos passos recomendados

- Ampliar o cockpit do paciente com indicadores de vencimento preventivo e criticidade laboratorial.
- Usar criticidade dos sinais preventivos e laboratoriais para ordenar a proxima acao do cockpit.
- Usar os sinais de preventivo e laboratorio para priorizar a busca global e a proxima acao contextual.
