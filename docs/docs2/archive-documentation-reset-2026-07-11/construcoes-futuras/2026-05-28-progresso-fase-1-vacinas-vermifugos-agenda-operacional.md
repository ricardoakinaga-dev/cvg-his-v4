# Progresso Fase 1 - F1-07 Vacinas e Vermifugos: agenda operacional

Data: 2026-05-28

## Objetivo

Evoluir o modulo de vacinas e vermifugos para aproximar o fluxo Vetus de uma rotina operacional diaria, com leitura rapida de agenda, status preventivo, vinculo com tutor/paciente e situacao de aviso.

## Entregue neste incremento

- A tela `Vacinas e Vermifugos` passou a exibir a situacao temporal do evento preventivo:
  - `Vencido ha N dia(s)` para aplicacoes agendadas em atraso.
  - `Vence hoje` para eventos do dia.
  - `Vence em N dia(s)` para proximos 7 dias.
  - `Programado` para eventos futuros fora da janela imediata.
  - `Executada em DD/MM/AAAA` para eventos ja baixados.
- A lista agora explicita o vinculo operacional:
  - link para abrir o paciente quando `patientId` existir;
  - link para abrir o tutor quando `ownerId` existir;
  - indicacao `Sem vinculo` quando o evento preventivo estiver avulso.
- A lista agora mostra o estado de aviso ao tutor:
  - `Aviso pendente` para agenda ainda nao avisada;
  - `Aviso preparado em DD/MM/AAAA` quando o backend ja registrou `reminderEmailPreparedAt`;
  - `Sem aviso pendente` para eventos executados sem aviso aberto.
- Os testes da tela preventiva foram ampliados para cobrir:
  - colunas de agenda, vinculo e aviso;
  - links de paciente e tutor;
  - leitura de atraso;
  - evento executado com data de baixa;
  - aviso de e-mail preparado.

## Arquivos alterados

- `apps/spa/src/pages/preventive/VaccinesDewormersPage.vue`
- `apps/spa/src/pages/preventive/__tests__/VaccinesDewormersPage.test.ts`

## Validacao executada

- `pnpm exec vitest run src/pages/preventive/__tests__/VaccinesDewormersPage.test.ts --pool=forks`
  - Resultado: 1 arquivo de teste, 5 testes aprovados.
- `pnpm --filter @cvg-his-v2/spa typecheck`
  - Resultado: aprovado.
- `pnpm --filter @cvg-his-v2/spa build`
  - Resultado: aprovado.

## Impacto no roadmap Premium Enterprise

Este incremento avanca o item F1-07 do roadmap, deixando o modulo preventivo mais utilizavel para operacao de clinica/hospital:

- antes: lista com CRUD, execucao, reagendamento e preparo de e-mail;
- agora: agenda preventiva com leitura de vencimento, status de aviso e navegacao direta para cadastro clinico.

## Pendencias recomendadas para completar F1-07

- Criar automacao real de notificacao, alem do preparo de e-mail atual.
- Permitir filtro rapido por `vencidos`, `vence hoje`, `proximos 7 dias` e `sem aviso`.
- Consolidar historico preventivo dentro do prontuario com trilha de aplicacao, lote, profissional e reforco.
- Avaliar inclusao de status adicional `cancelado` ou `dispensado`, caso a regra operacional exija manter historico sem excluir.
