# TODO técnico — próxima onda funcional do Financeiro

Data: 2026-04-22
Trilha ativa: `Custos e Despesas + Centros de Custo`
Referência: `/root/cvg-his-v2/docs/2026-04-22-proxima-onda-funcional-financeiro-execucao.md`

## Bloco 1 — backend/runtime
- [ ] decidir política final do runtime do catálogo financeiro
- [ ] explicitar no código quando usar DB-backed e quando permitir fallback
- [ ] tornar o comportamento operacional observável por logs/auditoria
- [ ] revisar mensagens de erro para estados de banco/fallback

## Bloco 2 — auditoria do domínio
- [ ] enriquecer `payloadSummary` de create/update/delete em despesas
- [ ] enriquecer `payloadSummary` de create/update/delete em centros de custo
- [ ] padronizar `diffSummary` para mudanças relevantes
- [ ] validar efeitos colaterais em rename/update de centro vinculado a despesas

## Bloco 3 — front gerencial
- [ ] revisar filtros atuais de `ExpensesPage`
- [ ] decidir quais filtros ficam server-side e quais ficam locais
- [ ] expor ordenação mais clara na UI
- [ ] melhorar paginação/feedback de estado vazio
- [ ] alinhar `CostCentersPage` ao mesmo padrão operacional

## Bloco 4 — validação
- [ ] escrever/ajustar teste RED de API para a política escolhida
- [ ] ajustar `ExpensesPage.test.ts`
- [ ] ajustar `CostCentersPage.test.ts`
- [ ] rodar suíte financeira focada
- [ ] rodar regressão representativa SPA/API

## Bloco 5 — documentação
- [ ] gerar checkpoint da onda funcional concluída
- [ ] registrar resultado e recomendação da próxima frente (`Cartões`)
