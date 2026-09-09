---
document_status: current
document_kind: evidence
effective_date: 2026-09-07
owner: QA, DB e Platform
review_cycle: per-release
---

# Evidência do critical gate — 2026-09-07

## Resultado

O comando agregado `pnpm test:critical` terminou com **exit 0** em runtime local
isolado, usando PostgreSQL e Redis locais, banco efêmero por cenário e ambiente
sem fallback de memória.

| Perna                   | Resultado        | Escopo observado                                                                                                                                                |
| ----------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical database/setup | **PASS**         | 65 arquivos e 594 testes; migrações 0000–0164 aplicadas, incluindo a 0163 de `FORCE RLS` e a 0164 de cascata de billing; seed, integridade e cleanup concluídos |
| Critical process        | **PASS**         | 10/10 cenários de processo verificados sem skip, cada um com banco efêmero próprio e cleanup concluído                                                          |
| Gate agregado           | **PASS_BOUNDED** | `pnpm test:critical`, exit 0                                                                                                                                    |

Os cenários de processo cobriram setup/sessão distribuída, laboratório,
reinício e SIGKILL clínico-financeiro, concorrência de recebimento, settlement
PIX, entrada do worker e entrega de webhook. Respostas negativas emitidas pelos
testes foram as assertions esperadas de validação, idempotência, autorização,
tenant e failpoint.

Nota de reprodutibilidade do host: a repetição final do wrapper usando o papel
de `DATABASE_URL` do `.env` não conseguiu criar a base efêmera porque esse papel
não possui `CREATEDB`. A mesma verificação foi concluída com a URL administrativa
de migração usada somente para bootstrap/teardown e com os binários Redis
privados explicitamente informados ao runner: a perna de banco passou 65/65
arquivos e 594/594 testes, e a perna de processos passou 10/10. Isso é uma
limitação de configuração do ambiente local; o pipeline deve manter um papel de
bootstrap equivalente documentado e nunca contornar o erro com fallback.

## Ambiente e reprodução

- PostgreSQL local com role administrativa apenas para criar/remover bancos
  efêmeros; nenhum banco de trabalho persistente foi resetado.
- Redis local com `redis-server`, `redis-cli` e sua biblioteca compartilhada
  passados explicitamente ao runner filho.
- `REQUIRE_TEST_DB=1` e `TEST_DB_EPHEMERAL=1` permaneceram ativos.
- O teste foi executado com `DATABASE_URL_TEST` apontando para uma base local
  canônica `cvg_his_v2_test`; os sufixos de cada fase foram gerados pelo runner.
- Os nomes dos bancos temporários não permaneceram após o teardown; a consulta
  de verificação não encontrou bancos `cvg_his_v2_critical_*` ativos.

## E2E SPA bounded — mesma revalidação

O recorte [E2E SPA de 07/09](E2E_SPA_2026-09-07.md) passou **9/9** contra
PostgreSQL e Redis reais locais, com API em `persistenceMode=database` e
`productionReady=true`. O cleanup foi concluído sem erro, incluindo exclusão
de encounters; as bases efêmeras foram descartadas e não restaram bancos
`cvg_his_v2_e2e_*` no cluster local.

A revalidação complementar passou **29/29** casos da matriz visual e **299/299**
casos da auditoria master de usabilidade, incluindo o gate agregado de 149
rotas em dois viewports. A captura visual do login usa poster determinístico e
a agenda usa a query pública de visão diária; ambas as correções eliminam
flutuações de teste sem relaxar `maxDiffPixels`.

Esse resultado promove o envelope local de `AAA-013` para `REVIEW`, sem
converter o ticket em `DONE`: o recorte ainda não cobre o target, CI remoto,
providers, paridade completa, a11y global ou aceite humano.

## Promoção honesta

Esta evidência promove a reprodução local do critical gate para
`PASS_BOUNDED` e o recorte E2E para `PASS_BOUNDED` scoped. Ela não fecha:

1. browser-to-database E2E completo da SPA e sua recertificação (`AAA-013`);
2. execução em checkout limpo, CI remoto e SHA/digest de release (`AAA-001`,
   `AAA-005`, `AAA-015`);
3. roles/grants e capacidade do PostgreSQL/Redis no target (`AAA-011`);
4. providers, paridade Vetus, restore/RPO-RTO, carga, UAT e go/no-go humano.

Referências de decisão: [Quality Bar](QUALITY_BAR.md), [matriz de requisitos](REQUIREMENT_EVIDENCE_MATRIX.md), [dashboard de risco](EVIDENCE_RISK_DASHBOARD.md) e [backlog AAA](../2026-09-06-backlog-erp-state-of-art-triplo-aaa.md).
