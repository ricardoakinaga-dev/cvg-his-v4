# Handoff — idempotência de handoff, evolução e ocorrência clínica

Data: 2026-08-24<br>
Task: `CVG-002C6`<br>
Quality Bar: [`../.agent/artifacts/CVG-002C6-inpatient-clinical-notes-idempotency-2026-08-24.md`](../.agent/artifacts/CVG-002C6-inpatient-clinical-notes-idempotency-2026-08-24.md)

## Resultado

Progress (`POST /inpatient/:stayId/progress`) e occurrence
(`POST /inpatient/:stayId/occurrences`) agora passam pelo command seam
tenant-scoped. A validação do stay, a persistência, a auditoria e os callbacks
ficam dentro da mesma fronteira; em falha, o cache inpatient/audit é
reidratado.

O callback que projeta a evolução para o prontuário passou a ser awaitable e a
API espera `MedicalRecordsService.waitForPersistence()` antes de concluir o
comando. Assim, o teste público reconcilia a linha `inpatient_progressed` em
`clinical_timeline`, não apenas a linha inpatient.

## Evidência nova

- RED: os dois testes de seam novos falharam com `0 !== 1`; o failpoint de
  progress/occurrence observou `0` reidratações antes da implementação.
- GREEN: build do API e rota inpatient — 19/19.
- HTTP/PostgreSQL descartável, duas APIs, dois tenants e roles reais
  `LOGIN NOSUPERUSER NOBYPASSRLS` — 5/5. Handoff send/ack, progress e
  occurrence provaram replay cross-instance, conflito divergente, uma linha
  durável por comando e timeline clínica persistida.
- Restart controlado — 1/1.
- Child process com `SIGKILL`, expiração de lease, takeover, stale fence e
  replay — 4/4.
- Prettier focado e `git diff --check` — verdes.

Os logs de `409` são os conflitos divergentes esperados pelos testes. O
artefato Quality Bar contém os comandos completos, os nomes dos bancos
descartáveis e as limitações.

## Próxima fronteira

O próximo P0 é colocar assignment/transfer/status inpatient e as operações de
bed/medical-record relacionadas na mesma matriz explícita de command seam e
failpoints. Permanecem abertos os gates globais de produção/cluster/Secrets,
Redis/providers, RLS/FORCE RLS global, DR/RPO, paridade Vetus completa, WCAG,
cobertura, operações e release. Este checkpoint não promove o ERP global.
