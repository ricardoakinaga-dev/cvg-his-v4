# Continuidade de sessão — restart do worker e próximos slices ERP

Data: 23/08/2026, 03:13 BRT
Tarefa: `CVG-002B2B`
Natureza: auditoria read-only e handoff executável; nenhum código de produção foi alterado neste registro.

## Estado verificado

- `HEAD` e `origin/agent/sync-v4-full-program` estão alinhados em
  `4a5ead11e7809dfecd50b607df2e7dee99c2b3d3` antes desta onda documental.
- O checker canônico retorna `11 PASS`, `1 WARN` histórico de ownership e
  `0 FAIL`.
- O único caminho dirty é o cache user-owned
  `packages/design-system/tsconfig.vue.tsbuildinfo`; ele não pertence a esta
  tarefa e não deve ser revertido, limpo ou commitado.
- `CVG-002B2B` continua `IN_PROGRESS/PARTIAL`; o ERP geral também não tem
  gate de produção, paridade Vetus, WCAG, provider ou release concluído.

## Gap P1: SIGKILL/restart real

O worker já possui boundary operacional suficiente para um teste de processo:

- `apps/worker/src/index.ts` trata `SIGTERM`/`SIGINT`, expõe `/ready`,
  `/health/ready` e `/metrics`, e marca erro fatal com `process.exitCode = 1`;
- `apps/worker/src/bootstrap.ts` usa lease padrão de `60_000 ms` para o
  consumer de settlement;
- `apps/worker/src/jobs/pix-payment-dispatcher.ts` já demonstra um padrão de
  checkpoints injetáveis;
- `apps/worker/src/jobs/pix-provider-settlement-consumer.ts` ainda não expõe
  checkpoints equivalentes;
- o teste
  `tests/integration/database/pix-provider-settlement-consumer.test.ts` prova
  takeover, fence e um único B1 após encerrar o pool do primeiro worker, mas
  isso não é uma morte abrupta de processo.

### Conclusão

O próximo menor slice vertical é adicionar checkpoints testáveis ao consumer e
um harness com dois processos independentes. O harness deve usar PostgreSQL
descartável e provider sintético local, nunca credenciais ou provider real.

Contrato sugerido:

```ts
type PixProviderSettlementCheckpoint =
  | 'after_claim_commit'
  | 'before_b1'
  | 'after_b1_before_cas'
  | 'after_applied_cas'
```

O callback de checkpoint deve carregar `deliveryId`, `accountId` e
`leaseVersion`. A matriz mínima de aceitação é:

1. `SIGKILL` após `after_claim_commit`: sucessor aguarda a lease, assume com
   fence novo e aplica B1 exatamente uma vez.
2. `SIGKILL` em `before_b1`: o sucessor conclui sem duplicar nem perder o
   delivery.
3. `SIGKILL` em `after_b1_before_cas`: o efeito canônico converge para uma
   única liquidação/reconciliação, sem duas aplicações financeiras.
4. `SIGKILL` após `after_applied_cas`: o sucessor não reabre nem reaplica.
5. `/ready` e `/metrics` ficam observáveis antes do tick e após o restart.

Arquivos prováveis do slice futuro:

- `apps/worker/src/jobs/pix-provider-settlement-consumer.ts`
- `apps/worker/src/bootstrap.ts`
- `apps/worker/src/index.ts` ou entrypoint de execução única isolado para teste
- `tests/integration/process/pix-provider-settlement-sigkill.test.ts`
- helper de spawn/health/checkpoint em `tests/helpers/`

Riscos a controlar: flakiness por `sleep`, parsing de logs e confusão entre
`SIGTERM` limpo e `SIGKILL` abrupto. A sincronização deve usar sinais
determinísticos de checkpoint; o processo sucessor deve observar estado
persistido, não apenas logs.

## Próxima fatia de produto após o gate operacional

A auditoria de corpus e o benchmark oficial já registrados em
`docs/2026-08-22-auditoria-integral-e-pesquisa-erp.md` foram convertidos em
opções executáveis. A primeira jornada clínica-financeira recomendada, sem
sobrepor o trabalho PIX, é:

`internação -> handoff/permanência -> lançamento de diária -> item cobrável`

Critérios de aceitação para futura decomposição em backlog:

- uma diária é idempotente por `stayId` e período;
- o item financeiro preserva `stayId`, `encounterId`, período e ator;
- cancelamento/estorno preserva auditoria e não apaga histórico;
- alta impede novas diárias após o cutoff;
- tenant/RLS continuam fechados ponta a ponta;
- API e UI distinguem `pendente`, `faturada` e `cancelada`.

Arquivos já existentes que devem ser inspecionados antes de implementar:

- `packages/modules/inpatient/src/index.ts`
- `packages/modules/encounters/src/index.ts`
- `packages/modules/medical-records/src/index.ts`
- `packages/modules/diagnostics/src/index.ts`
- `apps/api/src/routes/inpatient-routes.ts`
- `tests/integration/clinical-handoff-persistence.test.ts`
- `tests/integration/advanced-care-persistence.test.ts`

Esta recomendação é planejamento de produto, não evidência de que a jornada já
está pronta. `CVG-002B2B`, `CVG-002`, paridade, WCAG, provider, operações alvo
e release permanecem abertos.

## Retomada determinística

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

Depois, ler este artefato, o checkpoint em
`docs/2026-08-23-checkpoint-continuacao.md`, `.agent/state.json`,
`.agent/tasks/CVG-002B2B.md` e os últimos registros dos dois ledgers antes de
escrever qualquer código.
