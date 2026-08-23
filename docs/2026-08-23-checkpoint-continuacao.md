# Checkpoint de continuidade — 23 de agosto de 2026

Este é o ponto de entrada para retomar o trabalho em outra sessão. O programa
continua ativo; este documento não é uma declaração de produção, paridade ou
release.

## Estado canônico

- Repositório: `/home/ricardo/cvg-his-v4`
- Branch: `agent/sync-v4-full-program`
- Tarefa ativa: `CVG-002B2B` — ingestão de recibos PIX sintéticos e aplicação
  durável pelo núcleo B1
- Estado: `IN_PROGRESS / PARTIAL`; próximo gate: `VERIFIED`
- Última implementação publicada antes deste checkpoint: `62db87e`
  (`feat: harden PostgreSQL API-key boundary`)
- Documentação publicada: `8d226d0`; reconciliação de hashes: `3c76ce0`;
  ponteiros finais anteriores: `409efea`
- O arquivo user-owned
  `packages/design-system/tsconfig.vue.tsbuildinfo` permanece modificado e
  deve ficar fora de qualquer commit.

Retomada mínima:

```bash
cd /home/ricardo/cvg-his-v4
git switch agent/sync-v4-full-program
git status --short
python3 /home/ricardo/.codex/skills/engineering-framework/scripts/check_state.py "$PWD"
```

## O que já foi implementado e verificado

Os números abaixo são evidência local, descartável e limitada ao escopo de cada
teste. Eles não promovem o ERP inteiro:

| Fatia | Evidência fresca |
| --- | ---: |
| Núcleo B1 confirmado-PIX | 18/18 |
| Request/dispatch B2a | 33/33 |
| Parser, fingerprints e ingresso PostgreSQL | 77/77 focados; 11/11 PostgreSQL |
| Callback HTTP real | 13/13 |
| Worker PIX settlement | 54/54 |
| UoW/shared transaction context | 4/4 |
| Principal/RLS/ACL | 5/5 serviço; 8/8 ACL/RLS; 1/1 runtime 0113 |
| API-key service/mapper/helper | 13/13; 3/3; 2/2 |
| HTTP → PostgreSQL sem adapter | 4/4: owner `410`, foreign `404`, direct `200`, concorrência `2×201/6×429` |
| OpenAPI, RLS, Helm, scans | 335 paths/386 schemas; RLS 153/154; validações estáticas PASS |

O último slice de código está em `62db87e` e inclui:

- migration `0113_api_key_auth_boundary.sql`, com lookup pré-contexto por
  capability `SECURITY DEFINER`, `search_path` fixo, tabelas de uso/rate-limit
  tenantizadas e probe PIX sem vazamento de `account_id` estrangeiro;
- mapper JSONB estrito para arrays nativos e strings do driver `pg`;
- separação ACL API/worker, sem acesso do worker às tabelas de credenciais;
- rate limit obrigatório antes de `last_used_at` e consumo atômico no
  PostgreSQL;
- preservação da fronteira legada `410` para PIX ligado a attempt B2, sem
  gateway nem outbox legado.

Os commits anteriores continuam relevantes: B1 extraído em `packages/modules/pix`,
ingresso `0111`, principal `0112`, callback HTTP e recovery/fencing/DLQ de
telemetria. Os artefatos detalhados estão referenciados em
[`2026-08-22-handoff-cvg-002b2.md`](2026-08-22-handoff-cvg-002b2.md) e em
`.agent/artifacts/`.

## O que ainda está aberto — ordem de retomada

1. Criar superfície de operador para a fila
   `reconciliation_required` (consulta sanitizada, redrive auditado e escopo
   tenant), contrato OpenAPI, runbook, alertas Prometheus e dashboard.
2. Definir e medir a política de rate limit em múltiplas réplicas (janela,
   relógio, failover, Redis/PostgreSQL e comportamento quando a dependência
   está indisponível).
3. Reduzir a projeção do principal autenticado pré-contexto ao mínimo
   necessário; a revisão independente classificou a projeção atual como
   MEDIUM, sem bloqueio HIGH/CRITICAL.
4. Executar matriz de reinício/SIGKILL real, além do takeover por dois pools já
   comprovado. Repetir B1/B2a/ingress/HTTP e todos os artefatos invalidados.
5. Abrir gates separados para B2c/SPA, jornada clínica até recebimento,
   paridade Vetus (`11/11 + 3/3`), WCAG, provedores reais, restore/deploy/SLO e
   release.

O maior slice local é o DLQ operacional. Ele não deve alterar diretamente
receipt, PIX, billing ou ledger; somente reencaminhar uma delivery terminal,
com auditoria e invariantes já existentes. Provider real, credenciais, produção
e go-live continuam fora da autoridade desta sessão.

## Auditoria documental preservada

Foi refeito o inventário determinístico completo de `docs/`:

- 1.447 arquivos, 90 diretórios e 53.728.402 bytes;
- 995 Markdown, 255 PNG, 129 JSON, 67 HTML e 1 arquivo gzip;
- 1.191 arquivos textuais, classificados em camada ativa, `micro-build/`,
  referência `vetus/` e arquivo histórico `docs2/`;
- hash do manifesto ordenado desta execução:
  `52ab7100d5272df769f61fb6323da250987b10f404a9fb8fc0fdf4198d19c5bf`;
- `docs/README.md` e `docs/430-fonte-de-verdade-documental.md` continuam
  definindo a precedência: runtime/testes, código/contratos, camada ativa de
  agosto, arquitetura/ADRs, auditorias antigas, Vetus e, por último,
  `docs2/` histórico.

O acervo Vetus contém evidência de produto e imagens repetidas; não é prova de
implementação CVG-HIS. O score estrutural `readiness:enterprise` segue em
95/100, enquanto a paridade comportamental segue `0/11` geral e `0/3` clínica.
O Game Day que sugere fallback em memória continua incompatível com a política
de fail-closed e não deve ser executado sem revisão.

## Pesquisa de mercado registrada

O benchmark oficial de PIMS/ERP está em
[`2026-08-22-auditoria-integral-e-pesquisa-erp.md`](2026-08-22-auditoria-integral-e-pesquisa-erp.md)
e orienta prioridades de produto (fluxo clínico unificado, multiunidade,
charge capture, integrações, portal e relatórios). Ele não substitui testes de
comportamento nem autoriza copiar padrões inseguros observados em referências.

## Regra de honestidade para a próxima sessão

Não marcar `CVG-002B2B`, `CVG-002` ou o ERP geral como concluídos. Não afirmar
produção, provedor homologado, paridade, acessibilidade ou release com base
somente nestes slices. Antes de qualquer novo gate, revisar `git diff`, o
estado canônico, a validade dos artefatos e a presença exclusiva do cache
user-owned no worktree.
