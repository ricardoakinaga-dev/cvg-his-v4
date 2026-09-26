# Drill de entrega de alertas — 26/09/2026 (R2-OPS-01)

**Comando:** `pnpm ops:alerts:drill` · **Modo:** Alertmanager descartável em Docker · **Resultado:** `PASS`

| Campo | Valor |
|---|---|
| Run | `2026-09-26T13-40-31-475Z-941043` |
| HEAD durante o drill | `69d67672edcce5a36238fad6d856be477cfa991b` (branch `fable/r2-ops-01`, árvore com a configuração nova) |
| `alertmanager.yml` SHA-256 | `e66607cb19f394d9e950be81d8c0aa4c5bf1b1f3bc1bbbd52fd168de954ed703` |
| Imagem | `prom/alertmanager@sha256:27c475db5fb156cab31d5c18a4251ac7ed567746a2483ff264516437a39b15ba` (v0.28.1) |
| `amtool check-config` | SUCCESS: global config, route, 1 inhibit rule, 2 receivers |

| Alerta sintético | Receiver | Caminho | Latência | Roteamento |
|---|---|---|---|---|
| `CVG_HIS_SyntheticDrill_Critical` (`severity=critical`) | `critical-pager` | `/webhook/critical` | 10.002 ms | correto |
| `CVG_HIS_SyntheticDrill_Warning` (`severity=warning`) | `warning-chat` | `/webhook/warning` | 30.001 ms | correto |

As latências correspondem ao `group_wait` de cada rota (10 s e 30 s).

## O que este drill prova e o que não prova

- **Prova:** a configuração é válida, o Prometheus está apontado ao
  Alertmanager, e a árvore de rotas entrega cada severidade ao receiver
  correto, com os segredos lidos de arquivo.
- **Não prova:** a entrega a um canal real (Slack, e-mail, PagerDuty). Isso
  depende de o operador fornecer a URL do canal nos arquivos de segredo
  (pré-requisito U2 do [plano suplementar](../2026-09-26-plano-suplementar-fable-rodada-2.md)).
  Assim que existir, repetir `ALERTMANAGER_URL=http://127.0.0.1:9093 pnpm ops:alerts:drill`
  contra o stack do `docker-compose.v2.yml` e anexar a captura do canal.

Duas execuções anteriores no mesmo dia falharam e motivaram correções no
próprio drill: arquivos de segredo criados com `0700` (o container roda sem
privilégio e não conseguia lê-los) e a regra de inibição suprimindo o
`warning` sintético por compartilhar `service` com o `critical`. Ambas as
causas estão documentadas no runbook
[`observability-alerts.md`](../runbooks/observability-alerts.md#entrega).
