# Semantica canonica de datas em relatorios

**Owner:** Backend, Dados e Produto  
**Revisao:** ao incluir ou alterar qualquer relatorio  
**Backlog:** REP-001, TST-005, TST-006 e TST-007

## Contrato

- Filtros de calendario usam exclusivamente `YYYY-MM-DD` e rejeitam datas
  inexistentes, timestamps, offsets e intervalos invertidos.
- `dateFrom` e `dateTo` sao inclusivos para o usuario e representam dias civis
  em UTC. A consulta SQL deve materializar esse contrato como intervalo
  semiaberto: `instante >= dateFrom 00:00:00Z` e
  `instante < (dateTo + 1 dia) 00:00:00Z`.
- Projecoes que comparam a parte de data de um `timestamptz` usam
  `AT TIME ZONE 'UTC'` antes do cast para `date`.
- Codigo em memoria compara timestamps pelo mesmo intervalo semiaberto. O uso de
  sufixos como `T23:59:59` e proibido porque perde fracoes de segundo.
- Campos de data pura, como competencia fiscal e periodos de comissao, usam
  comparacao inclusiva direta apos validacao de calendario.
- Timestamps devolvidos pela API e pelos exports sao RFC 3339 em UTC; a SPA pode
  localiza-los para exibicao, mas nao deve reinterpretar filtros de calendario.
- Ordenacao deve ter desempate estavel por identificador para impedir lacunas ou
  duplicidades em paginacao e exports.

## Fontes criticas cobertas

| Familia                           | Campo de referencia                           | Implementacao persistida |
| --------------------------------- | --------------------------------------------- | ------------------------ |
| vendas e cheques                  | `created_at`                                  | intervalo UTC semiaberto |
| agenda e atendimento profissional | `start_at`                                    | intervalo UTC semiaberto |
| estoque e movimentacoes           | `created_at`                                  | intervalo UTC semiaberto |
| produtos, compras e catalogos     | `created_at`                                  | data UTC inclusiva       |
| contas a receber                  | vencimento/liquidacao/emissao conforme status | data UTC inclusiva       |
| tutores, pacientes e servicos     | `created_at`                                  | data UTC inclusiva       |
| fiscal e comissoes                | competencia/periodo de calendario             | data pura inclusiva      |

O dispatcher de relatorios valida o periodo antes de consultar a fonte. As
fontes database-backed repetem a validacao na fronteira do modulo e aplicam
tenant/RLS, limite de linhas e ordem deterministica.

## Evidencia de regressao

```bash
pnpm --filter @cvg-his-v2/module-counter-sales test
pnpm exec vitest run tests/unit/infra/report-date-semantics-contract.test.ts --config vitest.config.ts --no-file-parallelism
```

Os testes PostgreSQL da matriz critica exercitam limites inclusivos reais para
agenda, vendas, produtos e posicao/movimentacao de estoque. Uma nova fonte de
relatorio entra no gate somente quando declara o campo temporal, aplica este
contrato e possui fixtures exatamente em `00:00:00.000Z`, `23:59:59.999Z` e no
inicio do dia seguinte.
