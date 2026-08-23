# Quality Bar v1 — processo PIX settlement e SIGKILL/restart

Data: 23/08/2026
Tarefa: `CVG-002B2B`
Escopo: prova local, reversível e sintética do boundary de processo do worker
de settlement. PostgreSQL é descartável; nenhum provider real, segredo,
produção ou mutação externa entra nesta rodada.

Este bar é complementar ao gate `GATE-CVG-002B2B-IR-001`; não altera o gate
global nem promove `CVG-002B2B` para `VERIFIED`.

## Critérios congelados

| ID | Dimensão | Alvo obrigatório | Evidência | Baseline/limitação |
| --- | --- | --- | --- | --- |
| `REL-SIGKILL-01` | boundary | Worker A e B são processos Node distintos, com PIDs distintos, iniciados pelo harness e ligados ao mesmo PostgreSQL descartável | `pix-provider-settlement-sigkill.test.ts`: quatro casos com `spawn(process.execPath, ['--import','tsx/esm', ...])`, assert de PID e mesmo `DATABASE_URL` descartável — PASS | o provider continua sintético/local; não é homologação externa |
| `REL-SIGKILL-02` | restart | `SIGKILL` em `after_claim_commit`, `before_b1`, `after_b1_before_cas` e `after_applied_cas` deixa o sucessor tomar a lease e concluir sem erro não observado | matriz parametrizada 4/4 verde; cada kill aguarda o evento de checkpoint e o sucessor aguarda `PIX_RESULT` — PASS | lease curta é deliberadamente de teste; não representa tuning de produção |
| `REL-SIGKILL-03` | integridade | cada caso termina com delivery canônico único, exatamente uma receipt/efeito B1, sem duas aplicações financeiras; tick seguinte não encontra item | consultas PostgreSQL finais: `delivery_state=applied`, `receipt_count=1`, billing/attempt/PIX settled/completed/applied; B e um tick C retornam o estado esperado — PASS limitado | ainda não agrega nesta matriz contagens detalhadas de journal/outbox/inbox nem valores contábeis linha a linha; provider local sintético não é homologação externa |
| `REL-SIGKILL-04` | fence | claim antigo não pode executar B1/CAS depois que o sucessor assumiu | casos pré-CAS terminam em `attempts=2`, `lease_version=2`; teste stale negativo existe na suíte do consumer/PostgreSQL — NÃO PROVADO no boundary de processos | A é morto antes de uma corrida pós-takeover deliberada; falta manter A vivo, liberar o checkpoint e observar tentativa stale rejeitada |
| `OPS-RESTART-01` | operação | `/ready` ou `/health/ready` e `/metrics` respondem no processo vivo antes do tick e no sucessor após restart | requests HTTP reais para `/ready` e `/metrics` em A e B em todos os quatro casos — PASS | o fixture é um entrypoint mínimo de prova, não um deploy de produção |
| `REL-SIGKILL-05` | determinismo | checkpoint sinaliza por canal determinístico; o harness não depende de parsing de log ou atraso arbitrário para decidir o kill | fd 3 dedicado com linhas JSON `PIX_READY`/`PIX_CHECKPOINT`/`PIX_RESULT`, `readline`, timeouts e cleanup; stdout/stderr ficam fora do protocolo — PASS limitado | IPC de produção e sinais de orquestrador ainda não foram homologados |
| `REG-SIGKILL-01` | regressão | suíte unitária do consumer, integração PostgreSQL de settlement e build/typecheck do worker permanecem verdes | worker: 58 testes + build; settlement PostgreSQL 6/6; B1 18/18; ingress HTTP 2/2; matriz processo 4/4 — PASS | regressões adicionais só são necessárias se a próxima fatia alterar este boundary |

## Matriz de eventos

- `after_claim_commit`: o claim foi commitado; A pode morrer antes de qualquer
  B1. O sucessor deve observar lease expirada e assumir com fence novo.
- `before_b1`: a transação de execução está aberta, mas nenhum efeito B1 foi
  aplicado. `SIGKILL` deve permitir rollback/retomada segura.
- `after_b1_before_cas`: B1 retornou dentro da mesma transação, mas o CAS final
  ainda não ocorreu. `SIGKILL` deve impedir estado financeiro parcial ou dupla
  aplicação após takeover.
- `after_applied_cas`: o CAS e o commit já terminaram. `SIGKILL` posterior não
  pode reabrir nem reaplicar o delivery.

## Regras de validade

Um PASS exige processo realmente separado, observação atual, consulta do estado
persistido e execução do caso conhecido. Dois listeners no mesmo processo,
dois pools sem morte de PID, mocks do repository ou apenas logs não contam como
prova. O caso que não atingir o checkpoint, perder o filho sem status ou não
conseguir confirmar o estado deve ser `FAIL`/`NOT_RUN`, nunca PASS implícito.

## Evidência executada — 23/08/2026

- RED/GREEN: a primeira compilação falhou por ausência do contrato `onCheckpoint`;
  depois o worker passou `pnpm --filter @cvg-his-v2/worker test` (58 testes) e
  `pnpm --filter @cvg-his-v2/worker build`.
- Processo independente: `pnpm vitest run
  tests/integration/process/pix-provider-settlement-sigkill.test.ts
  --config vitest.integration.config.ts --pool=forks
  --poolOptions.forks.singleFork=true` — 4/4, incluindo os quatro checkpoints,
  PIDs distintos, takeover, probes e estado final PostgreSQL.
- Regressões afetadas: `pix-provider-settlement-consumer.test.ts` 6/6,
  `confirmed-pix-settlement-command.test.ts` 18/18 e
  `pix-provider-webhook-postgres.test.ts` 2/2.
- Crítica independente: `REL-SIGKILL-01/02` PASS delimitado,
  `REL-SIGKILL-03` PASS limitado, `REL-SIGKILL-04` não provado no boundary de
  processos e `REL-SIGKILL-05` PASS limitado após a troca para fd 3 dedicado.
  O risco de `allowSyntheticProviders=true` foi corrigido: o entrypoint agora
  exige `NODE_ENV=test`, `PIX_SETTLEMENT_SYNTHETIC_FIXTURE=1` e vive em
  `apps/worker/test-fixtures/`, fora do `tsconfig` de produção.

Este resultado fecha somente a prova local delimitada de processo do slice B2b.
Não promove o gate global: o race stale pós-takeover, Redis/failover/clock-skew,
provider real, SPA/Vetus parity, WCAG, operações alvo e release continuam
separados e pendentes.

## Próxima ação

Registrar a crítica independente, manter o race stale pós-takeover como próximo
gap de confiabilidade, atualizar os ledgers e publicar este artefato com o
código. Em seguida, selecionar a próxima fatia do plano (internação → diária →
item cobrável) sem apagar os gates de Redis, provider, SPA, paridade, WCAG,
operações e release.
