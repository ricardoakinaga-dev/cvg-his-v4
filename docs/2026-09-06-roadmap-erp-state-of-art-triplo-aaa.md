---
document_status: current
document_kind: roadmap
effective_date: 2026-09-07
owner: PMO e Liderança técnica CVG-HIS
review_cycle: weekly
---

# Roadmap — ERP State of Art / Triplo AAA

**Baseline:** [relatório atual](./2026-09-06-relatorio-estado-atual-erp-cvg-his-v4.md) — 75/100  
**Plano executivo:** [plano State of Art / AAA](./2026-09-06-plano-executivo-erp-state-of-art-triplo-aaa.md)  
**Execução detalhada:** [backlog AAA](./2026-09-06-backlog-erp-state-of-art-triplo-aaa.md)

## 0. Checkpoint de execução — 07/09/2026

O caminho técnico local avançou: `pnpm test`, `pnpm test:critical`,
`pnpm typecheck`, `pnpm lint`, `pnpm build`, contratos
OpenAPI/namespaces/migration/RLS/deploy/security e as suítes API, SPA e worker
estão verdes no estado observado. O critical agregado passou com 65/65 arquivos,
594/594 testes e 10/10 processos usando runtime efêmero local. O recorte E2E
SPA passou 9/9 contra PostgreSQL/Redis reais, com cleanup sem erro. O
`readiness:enterprise` permanece em 92/100 (exit 1) por paridade Vetus. Foram incorporados
guardas fail-closed para banco/schema de produção, numeração durável de vendas
e runtime de relatórios.

O roadmap permanece em `NO-GO`: E2E browser-to-database completo, providers e
target, CI remoto, artefato imutável, paridade comportamental 11/11,
restore/RTO-RPO/carga, UAT e revisão independente ainda são dependências do
caminho crítico. Nenhum marco é promovido por causa de testes unitários locais.

## 1. Premissas

O calendário abaixo é relativo a `T0`, a data em que o Comitê confirmar equipe, escopo, ambiente, providers e autoridade de aceite. Não é uma promessa de prazo. Atrasos de provider, certificados, dados Vetus, CI remoto ou ambiente-alvo movem o caminho crítico e devem ser registrados, não escondidos por uma mudança de status.

Cada fase termina com uma demonstração verificável. Um documento, mock ou implementação existente pode acelerar a fase, mas não substitui o comportamento e o aceite pedidos no exit gate.

## 2. Visão em uma linha

`T0/G0 Mobilizar → G1 Fundação → G2 Integridade → G3 Produto e paridade → G4 Operação no target → G5 AAA candidato → G6 Go/no-go → Sustentação AAA`

## 3. Fases e entregas

| Fase                           | Janela relativa | Entrega demonstrável                                                                                               | Itens principais          | Exit gate                                            |
| ------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------- | ---------------------------------------------------- |
| F0 — Mobilização e verdade     | Dias 0–5        | escopo, owners, provider/target, RPO/RTO, snapshot de evidência e identidade do candidato                          | AAA-001–003, AAA-016      | G0: decisões e responsabilidades registradas         |
| F1 — Fundação confiável        | Semanas 1–2     | PostgreSQL/Redis dedicados, critical harness sem fallback, captura segura, CI coerente e hotspots sob controle     | AAA-002, 004–009, 049     | G1: ambiente e gates locais reproduzíveis            |
| F2 — Integridade ponta a ponta | Semanas 3–5     | jornada clínica-financeira real com RLS, idempotência, outbox, auditoria, retry e recuperação                      | AAA-010–014, 025–028      | G2: mesmo candidato passa banco/critical/API/browser |
| F3 — Produto e paridade        | Semanas 4–9     | relatórios, financeiro, estoque, cancelamentos e rotinas internas reconciliados; paridade medida por comportamento | AAA-017–021, 025–027, 048 | G3: domínio/Produto aceita escopo e divergências     |
| F4 — Providers e migração      | Semanas 5–10    | laboratório, fiscal, pagamento, comunicação, Live Pet, storage e Vetus no sandbox/target                           | AAA-022–024, 029–034      | G3 completo para o escopo; sem provider “presumido”  |
| F5 — Operação e segurança      | Semanas 7–12    | artefato imutável, deploy, upgrade, restore, carga, observabilidade, LGPD e supply chain                           | AAA-035–043               | G4: metas no target e controles reais                |
| F6 — UX e certificação         | Semanas 13–15   | UAT, visual/a11y, regressão integral, candidato final e dossiê                                                     | AAA-044–045               | G5: nota ≥95 e gates AAA sem bloqueador              |
| F7 — Cutover e decisão         | Semana 16       | ensaio cronometrado, rollback, plano de plantão e ata go/no-go                                                     | AAA-046–047               | G6: autorização formal ou no-go explícito            |
| F8 — Sustentação/evolução      | Após G6         | ML validado, decomposição contínua, revisão de evidência e melhoria de produto                                     | AAA-048–050               | revisão mensal sem regressão de gates                |

As fases F2, F3 e F4 podem ter frentes paralelas quando suas dependências forem atendidas. F5 pode preparar infraestrutura durante F3/F4, mas o gate só fecha quando o candidato e o target estiverem definidos.

## 4. Marcos de decisão

| Marco                               | Momento            | Evidência obrigatória                                                | Se não passar                                 |
| ----------------------------------- | ------------------ | -------------------------------------------------------------------- | --------------------------------------------- |
| M0 — Escopo autorizado              | Dia 0              | ata G0, matriz RACI, escopo de release e exceções                    | não iniciar compromisso de go-live            |
| M1 — Ambiente reproduzível          | fim da semana 2    | banco/Redis isolados, comandos, logs, cleanup e sem fallback         | manter em F1; bloquear certificação           |
| M2 — Integridade clínica-financeira | fim da semana 5    | positive/negative/retry/concurrency/A-B, persistência e auditoria    | corrigir antes de ampliar escopo              |
| M3 — Produto aceito                 | fim da semana 9/10 | roteiros por domínio, relatórios reconciliados, provider evidence    | recortar escopo formalmente ou replanejar     |
| M4 — Operação no target             | fim da semana 12   | deploy, restore/RTO-RPO, carga/SLO, alertas, secrets e LGPD          | NO-GO operacional                             |
| M5 — AAA candidato                  | semana 15          | mesmo SHA/digest, UAT, visual/a11y, revisão independente e scorecard | gerar novo candidato; não misturar evidências |
| M6 — Decisão                        | semana 16          | cutover/rollback, riscos residuais e assinaturas                     | registrar NO-GO com próxima ação              |

## 5. Trajetória de maturidade

| Checkpoint        | Nota orientativa |                Paridade | O que deve ser verdade                                                             |
| ----------------- | ---------------: | ----------------------: | ---------------------------------------------------------------------------------- |
| Atual             |           **75** |                    4/11 | base construída, gates locais bounded, promoção bloqueada                          |
| Técnico           |              ≥85 |                   ≥6/11 | critical gate reproduzível, banco/RLS/roles e candidate checkpoint                 |
| Release candidate |              ≥90 |                   ≥9/11 | produto interno reconciliado, providers principais em sandbox e operação preparada |
| AAA candidato     |              ≥95 | 11/11 ou exceção formal | todos os gates, UX/a11y, operação e aceite no mesmo SHA                            |
| Pós-go-live       |       manter ≥95 |           manter escopo | SLO, incidentes, auditoria, restore drill e revisão mensal sem regressão           |

Valores são objetivos de decisão e não devem ser obtidos reduzindo denominadores, removendo fontes difíceis ou convertendo `BLOCKED` em zero conveniente.

## 6. Caminho crítico e dependências

| Cadeia                                    | Dependência de negócio                                              |
| ----------------------------------------- | ------------------------------------------------------------------- |
| AAA-001 → AAA-002 → AAA-011/012 → AAA-014 | sem ambiente e identidade, nenhum resultado integra o candidato     |
| AAA-004 → AAA-022 → AAA-024 → AAA-025     | captura correta sustenta todo o subledger financeiro                |
| AAA-009/010 → AAA-011/012 → AAA-013       | cobertura só vale quando alcança cenários críticos em banco/browser |
| AAA-017 → AAA-018/019/020 → AAA-021       | relatórios precisam de contrato histórico antes da entrega agendada |
| AAA-003 → AAA-022/023/029/030/031/032/034 | providers dependem de decisão, credencial, sandbox e segurança      |
| AAA-014/015 → AAA-035/036/037 → AAA-046   | deploy, restore e rollback precisam do mesmo artefato               |
| AAA-027/029–034/042 → AAA-044/045         | UAT não pode validar uma superfície que ainda está simulada         |
| AAA-045 → AAA-046 → AAA-047               | go/no-go só ocorre após recertificação e ensaio                     |

O maior risco de prazo é externo: providers, dados/migração e target. O segundo é a qualidade do harness; se o teste cair em fallback, a fase retorna a F1 em vez de produzir um falso verde.

## 7. Cadência de acompanhamento

**Diário:** impedimentos, ambiente, P0/P1, alteração de candidato e próxima ação por ticket.  
**Semanal:** gate atual, burn-up de backlog, envelhecimento de bloqueios, dependências externas, scorecard, capacidade e risco.  
**Por marco:** demonstração independente, evidência com SHA/ambiente/resultado e decisão explícita.  
**Mensal após go-live:** SLO, incidentes, restore drill, vulnerabilidades, acessibilidade, paridade e documentação.

O status deve separar `IMPLEMENTADO`, `PASS_BOUNDED`, `INTEGRADO`, `HOMOLOGADO`, `ACEITO` e `RELEASE_READY`. Não usar “pronto” para estados diferentes.

## 8. Critérios de mudança de rota

- Se provider ou município não estiver disponível até o fim da F0, registrar recorte de release ou substituir a dependência com aprovação; não simular a homologação.
- Se o ambiente integrado não estiver disponível até a F1, congelar qualquer afirmação de readiness e priorizar ambiente.
- Se uma regressão crítica reaparecer, suspender polish visual e retornar à integridade da jornada.
- Se uma mudança posterior alterar o SHA, renovar todas as provas afetadas, inclusive UAT, screenshots e performance quando aplicável.
- Se a nota subir mas um gate obrigatório falhar, manter NO-GO.

## 9. Estado inicial e próxima ação

O estado documentado em 06/09 é: `R05` com 31 itens em REVIEW, 3 em DOING, 16 BLOCKED e 0 DONE no checkpoint de salvamento; o experimento de cobertura R05-010 ainda não foi integrado; providers, target, CI remoto, parity completa e aceite humano estão abertos.

**Próxima ação:** executar F0 com AAA-001–003, nomear owners e obter ambiente PostgreSQL/Redis dedicado antes de repetir o critical gate. O [backlog](./2026-09-06-backlog-erp-state-of-art-triplo-aaa.md) contém o detalhamento de cada entrega.
