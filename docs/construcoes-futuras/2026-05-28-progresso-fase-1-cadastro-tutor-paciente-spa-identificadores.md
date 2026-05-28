# Progresso - Fase 1 Cadastro Tutor/Paciente - SPA Identificadores Vetus

Data: 2026-05-28

## Escopo

Incremento da F1-03 do roadmap Premium Enterprise, focado em tornar a listagem de pacientes mais útil para recepção e paridade Vetus.

## Implementado

- A listagem de pacientes passou a exibir, no card do animal:
  - Microchip.
  - ID Vetus legado.
  - Alerta clínico consolidado com alergia e doença crônica.
- Quando não houver informação clínica crítica, a tela exibe `Sem alerta`.
- O teste da listagem foi ampliado para cobrir microchip, ID Vetus e alertas clínicos.

## Arquivos alterados

- `apps/spa/src/pages/patients/PatientsListPage.vue`
- `apps/spa/src/pages/patients/__tests__/PatientsListPage.test.ts`

## Validações

- `pnpm exec vitest run src/pages/patients/__tests__/PatientsListPage.test.ts --pool=forks`
  - 1 arquivo aprovado.
  - 17 testes aprovados.
- `pnpm --filter @cvg-his-v2/spa typecheck`
  - Aprovado.
- `pnpm --filter @cvg-his-v2/spa build`
  - Aprovado.

## Observação técnica

A primeira tentativa de rodar o teste via `pnpm --filter @cvg-his-v2/spa test -- src/pages/patients/__tests__/PatientsListPage.test.ts` ficou sem finalizar. O processo foi encerrado e o teste foi repetido diretamente no workspace da SPA com `vitest run`, concluindo com sucesso.
