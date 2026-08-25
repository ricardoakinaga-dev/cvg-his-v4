# Handoff — idempotência da admissão e da diária de internação

Data: 2026-08-24<br>
Task: `CVG-002C6`<br>
Quality Bar: [`../.agent/artifacts/CVG-002C6-inpatient-command-idempotency-2026-08-24.md`](../.agent/artifacts/CVG-002C6-inpatient-command-idempotency-2026-08-24.md)

## Resultado

A admissão (`POST /inpatient`) e a criação de diária
(`POST /inpatient/:stayId/daily-charges`) passaram a usar o mesmo seam de
comando tenant-scoped que protege faturamento, consumo, alta, fechamento e
recebimento. A persistência, a auditoria e a conclusão da resposta ficam na
mesma unidade de trabalho; replay devolve o mesmo objeto e payload divergente
retorna `409`.

O billing da diária também reidrata o slice inpatient do account antes de
resolver o stay. Isso fecha o caso em que uma segunda API recebe o replay e
tem cache aquecido sem a admissão feita por outra instância.

## Evidência nova

- RED de rota: os dois testes novos falharam com `0 !== 1` porque o seam não
  era chamado.
- GREEN de rota: `NODE_ENV=test node --test
apps/api/dist/routes/inpatient-routes.test.js` — 16/16.
- HTTP/PostgreSQL descartável, duas instâncias, duas roles
  `LOGIN NOSUPERUSER NOBYPASSRLS`: 5/5. A jornada prova replay/conflito da
  admissão e da diária, uma linha de idempotência para cada comando, vínculo
  consumo→billing, diária→billing, alta, fechamento, recebimento e ledger
  balanceado.
- Restart controlado após consumo: 1/1.
- Child process com `SIGKILL`, expiração de lease, takeover, stale fence e
  replay: 4/4.
- Build do API: verde.

Comandos completos e limitações estão no artefato da Quality Bar. Os logs de
`409` são os conflitos divergentes esperados pelos testes, não falhas de
produção.

## Próxima fronteira

Este slice não promove a jornada global nem o ERP. Permanecem fora do escopo
idempotência explícita para handoffs/progress/occurrences, matriz de failpoints
cross-domain em processo filho, produção/cluster/Secrets, Redis/providers,
RLS/FORCE RLS global, paridade Vetus completa, DR/RPO, WCAG, cobertura,
operações e release.
