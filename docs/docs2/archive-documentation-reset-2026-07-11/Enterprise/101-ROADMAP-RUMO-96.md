# ROADMAP RUMO A 96 - CVG-HIS-V2 ENTERPRISE

**Taxonomia:** `CANONICO`
**Papel no sistema documental:** roadmap vivo de ondas para elevar o programa do baseline atual a `96/100`
**Ler em conjunto com:** `README.md`, `0337-RELATORIO-REAUDITORIA-EXECUTAVEL-2026-04-22.md`, `0338-PLANO-EXECUTIVO-RUMO-96-2026-04-22.md`, `201-BACKLOG-RUMO-96.md`, `0100-EXECUTION-TRACKER.md`

**Versao:** `2026-04-22`
**Ponto de partida:** qualidade tecnica `84/100`, prontidao real `86/100`
**Meta:** `96/100`

---

## Principios do roadmap

- estabilizar antes de expandir;
- nenhuma onda fecha sem gate verificavel;
- operacao, seguranca e docs ativas valem mais do que superficie nova;
- AI/ML so avanca junto com telemetria, valor e governanca.

---

## Timeline executiva

```text
Semanas 0-2      Semanas 2-6      Semanas 6-10     Semanas 10-14     Semanas 14-18
Onda A           Onda B           Onda C          Onda D            Onda E
Governanca       Seguranca        Operacao        Integracoes       Excelencia
e checklist      e tenancy        premium         premium           e auditoria 96
```

---

## Resumo por onda

| Onda | Janela | Objetivo | Score alvo | Saida esperada |
|---|---|---|---:|---|
| A | Semanas 0-2 | Fechar checklist formal e docs vivas | 86 -> 88 | Linha mestra curta e auditavel |
| B | Semanas 2-6 | Endurecer seguranca, sessao e tenancy | 88 -> 90 | Identidade e isolamento premium |
| C | Semanas 6-10 | Subir operacao a nivel SLO/drill | 90 -> 92 | Operacao repetivel e evidenciada |
| D | Semanas 10-14 | Fechar integracoes e backoffice premium | 92 -> 94 | Integracoes confiaveis e administrativo premium |
| E | Semanas 14-18 | Fechar AI/ML governado e auditoria final | 94 -> 96 | Nota sustentada por evidencias formais |

---

## Onda A - Governanca e checklist formal

**Objetivo:** trocar percepcao difusa por prova documental curta e auditavel.

**Entregas:**

- auditoria formal item a item com `cumpre / cumpre parcial / nao cumpre`;
- consolidacao da linha mestra ativa;
- matriz `nota x evidencia x debito`;
- tracker atualizado por lote.

**Gate de saida:**

- checklist formal publicada;
- docs ativas coerentes entre si;
- nenhuma doc historica competindo com a linha mestra.

---

## Onda B - Seguranca, sessao e tenancy premium

**Objetivo:** elevar seguranca real e isolamento multi-tenant.

**Entregas:**

- endurecimento de expiracao e revogacao de sessao;
- provas adicionais de MFA/OIDC/WebAuthn;
- rotacao e uso de segredos com trilha auditavel;
- cobertura reforcada de ABAC/RLS em cenarios compostos.

**Gate de saida:**

- fluxos sensiveis com teste automatizado;
- tenant isolation e actor traceability reforcados;
- segredos criticos com politica e execucao verificaveis.

---

## Onda C - Operacao premium e release excellence

**Objetivo:** tornar a operacao repetivel, rastreavel e previsivel.

**Entregas:**

- SLOs refletidos em alertas e dashboards;
- restore drill e cutover reexecutados em cadencia definida;
- evidencias de release por ambiente;
- smoke e integracao com reducao de flakiness residual.

**Gate de saida:**

- trilha de release repetivel por duas rodadas;
- dashboards e alertas coerentes com os SLOs;
- drill com evidencias publicadas.

---

## Onda D - Integracoes e operacao administrativa premium

**Objetivo:** transformar integracoes entregues em capacidades premium de operacao.

**Entregas:**

- email, SMS, WhatsApp, cards, Google Calendar e equipment bridge com prova ponta a ponta;
- backoffice fiscal/financeiro com reconciliacao e relatorio operacional mais fortes;
- fallback, retry e auditoria consolidados por integracao.

**Gate de saida:**

- suites ponta a ponta por integracao prioritaria;
- fiscal e financeiro premium sem drift prioritario;
- relatorios operacionais confiaveis para suporte e operacao.

---

## Onda E - AI/ML governado e auditoria final

**Objetivo:** fechar a subida para `96/100` sem inflar score artificialmente.

**Entregas:**

- telemetria de uso, acuracia, override e impacto para AI/ML;
- rollout governado por flags;
- auditoria final comparativa;
- nova matriz de notas sustentada por evidencias formais.

**Gate de saida:**

- AI/ML com caso de uso mensuravel e rollback claro;
- auditoria final sem gaps criticos abertos;
- score `96/100` defensavel documental e tecnicamente.
