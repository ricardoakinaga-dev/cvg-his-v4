# Progresso Fase 4 - Recepcao com prioridade 360

Data: 2026-05-28

## Objetivo

Avancar `F4-05 - Criar acoes rapidas contextuais`, levando a mesma linguagem de prioridade do cockpit e da Busca Mestre para a mesa operacional da recepcao.

## Entregue

- As acoes rapidas contextuais da `Recepcao` passaram a destacar `Prioridade 360` quando o paciente encontrado possui doenca cronica ou alergia cadastrada.
- O atalho de prioridade abre diretamente o cockpit do paciente em `/patients/:id`.
- A mensagem orienta a recepcao a abrir o cockpit 360 antes de seguir com agenda, esteira ou comanda.
- Os atalhos existentes de cockpit, agenda, check-in e comanda foram preservados.
- O teste da recepcao cobre paciente com alerta clinico cadastral e valida `Prioridade 360`, `Atencao clinica` e o texto operacional do atalho.
- Incremento posterior conectou laboratorio pendente e preventivo vencido como fontes reais da prioridade 360 na recepcao.
- Incremento posterior conectou pendencia financeira via billing do tutor, preservando risco clinico/preventivo acima de cobranca comum.

## Evidencias tecnicas

- `apps/spa/src/pages/reception/ReceptionGatewayPage.vue`
- `apps/spa/src/pages/reception/__tests__/ReceptionGatewayPage.test.ts`

## Validacao executada

- `pnpm --filter @cvg-his-v2/spa exec vitest run src/pages/reception/__tests__/ReceptionGatewayPage.test.ts` - 6/6 testes passando.

## Impacto no Premium Enterprise

A recepcao passa a enxergar o mesmo sinal operacional usado pela Busca Mestre e pelo cockpit. Isso reduz o risco de encaminhar paciente com alerta clinico diretamente para agenda, esteira ou comanda sem revisar o contexto 360.

## Proximos passos recomendados

- Rodar a jornada 360 E2E em ambiente com PostgreSQL de teste ativo para validar persistencia real.
