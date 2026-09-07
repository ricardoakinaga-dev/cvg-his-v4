---
document_status: current
document_kind: plan
effective_date: 2026-09-06
owner: Comitê executivo CVG-HIS
review_cycle: weekly
---

# Plano executivo — ERP State of Art / Triplo AAA

**Produto:** CVG-HIS V4  
**Horizonte de planejamento:** 16 semanas relativas a `T0`, mais sustentação contínua  
**Baseline:** [relatório de estado atual](./2026-09-06-relatorio-estado-atual-erp-cvg-his-v4.md) — **75/100**, sem certificação de produção  
**Execução:** [roadmap](./2026-09-06-roadmap-erp-state-of-art-triplo-aaa.md)  
**Controle:** [backlog AAA](./2026-09-06-backlog-erp-state-of-art-triplo-aaa.md)  
**Régua:** [Quality Bar](./engineering/QUALITY_BAR.md)

## 1. Decisão executiva

Tratar o CVG-HIS como um programa de produto e confiabilidade empresarial, não como uma soma de telas. A base construída já é extensa e real, especialmente em atendimento clínico, cadastros, estoque, financeiro interno e infraestrutura de testes. A prioridade agora é provar que essas capacidades funcionam juntas, de forma segura, recuperável e homologada, no mesmo candidato.

O objetivo **State of Art / Triplo AAA** significa entregar um ERP veterinário:

- clínico e financeiro coerente de ponta a ponta;
- seguro por padrão, com isolamento tenant e menor privilégio verificáveis;
- resiliente a retry, concorrência, restart, indisponibilidade e recuperação;
- integrado a providers reais com reconciliação, não apenas adapters;
- acessível, responsivo, observável e consistente em todas as jornadas críticas;
- governado por evidências atuais, owners, auditoria e decisão formal.

O programa não autoriza por si só deploy, go-live, contratação de provider ou aceite regulatório. Esses atos continuam dependendo da autoridade humana e do ambiente correspondente.

## 2. Ponto de partida

| Dimensão                      | Baseline atual | Alvo de checkpoint |             Alvo AAA candidato |
| ----------------------------- | -------------: | -----------------: | -----------------------------: |
| Engenharia                    |           85,5 |                ≥90 |                            ≥95 |
| Produto/paridade              |           75,6 |                ≥85 |                            ≥95 |
| Operação                      |           58,4 |                ≥80 |                            ≥95 |
| Governança                    |           59,4 |                ≥80 |                            ≥95 |
| **Global ponderada**          |         **75** |            **≥85** |                        **≥95** |
| Paridade comportamental Vetus |           4/11 |              ≥9/11 | 11/11 ou escopo/exceção formal |
| Dependências externas prontas |           0/10 |              ≥5/10 |     10/10 do escopo de release |
| P0/P1 obrigatório aberto      |         vários |               0 P0 |                 0 bloqueadores |

Os alvos são metas de gestão, não previsão de nota. Um gate obrigatório reprovado impede promoção independentemente da média.

## 3. Resultados empresariais e indicadores

| Resultado                            | Indicador                                                    | Meta de aceite                                                                                             |
| ------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Atendimento sem perda de integridade | transação Owner→Patient→Encounter→care→billing→stock→receipt | 100% dos cenários positivos, negativos, retry, concorrência e tenant A/B passam em PostgreSQL real         |
| Financeiro confiável                 | captura, PIX, estorno, split e conciliação                   | nenhum estado não confirmado vira sucesso; reconciliação de valores e eventos passa no sandbox do provider |
| Paridade útil                        | domínios Vetus verificados por comportamento                 | 11/11 no escopo amplo; cada domínio tem roteiro, dados, resultado persistido e aceite nominal              |
| Release reproduzível                 | candidato único                                              | mesmo SHA/digest passa checkout limpo, CI, artefato, deploy, restore e recertificação                      |
| Operação recuperável                 | RPO/RTO, SLO, rollback e alertas                             | metas aprovadas antes do ensaio e atingidas no target; game day registra detecção, resposta e recuperação  |
| Experiência AAA                      | estados e acessibilidade                                     | WCAG 2.2 AA, teclado, foco, leitor de tela, 375/768/1440, light/dark e estados críticos sem bloqueador     |
| Governança confiável                 | evidência vigente                                            | 100% dos gates obrigatórios com procedimento, ambiente, SHA, resultado, artefato, owner e revisor          |
| Evolução sustentável                 | complexidade e dívida                                        | nenhum hotspot crítico cresce acima do orçamento; decomposição incremental de composition roots            |

## 4. Princípios de execução

1. **Evidência antes de promoção.** Código, endpoint, screenshot, score ou mock não são prova suficiente quando o requisito pede runtime, persistência, provider ou aceite humano.
2. **Uma fonte canônica por decisão.** O relatório, plano, roadmap, backlog, Quality Bar, matriz e dashboard têm papéis diferentes e devem se referenciar, não competir.
3. **Vertical slices.** Exercitar uma jornada completa cedo: UI → API → autorização → PostgreSQL → outbox/worker → provider/efeito → auditoria → recuperação.
4. **Falha fechada.** Ambiente ausente, provider desconhecido, callback inválido, tenant incompatível, evidência vencida e teste pulado não viram PASS.
5. **Mesmo candidato.** Toda alteração relevante invalida as evidências afetadas; UAT e certificação devem apontar para o mesmo SHA/digest.
6. **Sem reescrita indiscriminada.** Reusar o que já existe quando a auditoria de comportamento comprovar adequação; decompor hotspots e corrigir contratos antes de criar duplicatas.
7. **Dados seguros.** Fixtures sanitizadas, contas e tokens não expostos, logs redigidos, acesso mínimo e descarte dos ambientes temporários.

## 5. Frentes estratégicas

| Frente                       | Objetivo                                                                     | Saída executiva                             |
| ---------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------- |
| F1 — Fundação e candidato    | ambiente integrado, identidade de release, CI, banco e evidência rastreáveis | checkpoint técnico em SHA limpo             |
| F2 — Confiabilidade clínica  | jornadas clínicas e financeiras atômicas, idempotentes e tenant-safe         | vertical crítica aprovada em PostgreSQL     |
| F3 — Financeiro e relatórios | fechar ciclo de cobrança, conciliação, cancelamento, relatórios e entrega    | subledger reconciliado e relatórios aceitos |
| F4 — Paridade e providers    | laboratório, fiscal, pagamentos, comunicação, Live Pet e migração            | matriz comportamental homologada            |
| F5 — Operação e segurança    | deploy, upgrade, restore, carga, observabilidade, LGPD e supply chain        | operação exercitada no target               |
| F6 — Experiência AAA         | visual, responsividade, acessibilidade e recuperação nas jornadas do release | pacote visual/a11y independente             |
| F7 — Certificação e decisão  | UAT, recertificação, cutover, rollback e go/no-go                            | dossiê final e ata de decisão               |
| F8 — Evolução contínua       | ML responsável, decomposição e governança documental                         | backlog contínuo orientado por evidência    |

## 6. Gates de decisão

| Gate               | Quando           | Condição de saída                                                                                        | Donos do aceite                   |
| ------------------ | ---------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------- |
| G0 — Mobilização   | início de T0     | owners, escopo, provider, target, RPO/RTO, dados e autoridade definidos                                  | Comitê executivo                  |
| G1 — Fundação      | fim da semana 2  | ambiente dedicado, sem fallback nos gates, captura segura, CI coerente e worktree candidato identificado | Engenharia / QA / OPS             |
| G2 — Integridade   | fim da semana 5  | critical gate, RLS, roles, migrações e vertical clínica passam em banco real                             | Engenharia / DB / Segurança       |
| G3 — Produto       | fim da semana 10 | relatórios, finanças internas, paridade e providers do escopo têm comportamento e aceite                 | Produto / donos de domínio        |
| G4 — Operação      | fim da semana 12 | artefato imutável, deploy, restore, RTO/RPO, carga, alertas, LGPD e supply chain comprovados no target   | OPS / DB / SEC / DPO              |
| G5 — AAA candidato | semanas 13–15    | UX/a11y independente, UAT e todos os gates no mesmo SHA; nota ≥95 sem item crítico abaixo de 85          | QA / Produto / Segurança          |
| G6 — Go/no-go      | semana 16        | cutover/rollback ensaiados, riscos residuais aceitos e ata assinada                                      | responsável formal pela liberação |

Gates são cumulativos. `PASS_BOUNDED` local é progresso, não G5. Um escopo piloto precisa registrar explicitamente funcionalidades desabilitadas, riscos, prazo de exceção e autoridade aprovadora.

## 7. Governança e responsabilidades

| Papel                     | Responsabilidade                                                               |
| ------------------------- | ------------------------------------------------------------------------------ |
| Comitê executivo          | escopo, investimento, risco residual, provider, target e go/no-go              |
| Produto                   | priorização, roteiros de negócio, paridade, UAT e aceite funcional             |
| Liderança técnica         | arquitetura, contratos, sequencing, integridade e decisão técnica              |
| Backend/DB                | APIs, transações, migrações, RLS, conciliação e performance de dados           |
| Frontend/UX               | jornadas, estados, design system, responsividade e acessibilidade              |
| QA                        | matriz de evidência, regressão, testes críticos, revisão independente e dossiê |
| OPS/SRE                   | CI/CD, ambiente, deploy, restore, observabilidade, carga e game day            |
| Segurança/DPO             | threat model, secrets, RBAC, LGPD, revisão assistiva e risco residual          |
| Donos de domínio/provider | sandbox, credenciais, cenários de falha e aceite nominal                       |

Ninguém aprova sozinho o risco que criou. O mesmo profissional pode acumular execução e revisão técnica de baixo risco, mas gates de produção exigem revisão independente e autoridade formal.

## 8. Capacidade e investimento

Premissa inicial para dimensionamento: 2 backend, 1 frontend, 1 QA, 1 OPS, apoio part-time de DB, Segurança/DPO, Produto e representantes clínico/financeiro/fiscal. É uma hipótese de planejamento; o Comitê deve confirmar capacidade antes de assumir calendário.

Reservar aproximadamente 20% da capacidade para testes, revisão, documentação e recuperação de regressões. O custo deve ser calculado por esforço refinado, infraestrutura de ambientes, licenças/providers e operação; não somar dias-pessoa como duração de calendário.

Prioridade de investimento:

1. ambiente e evidência de integridade;
2. dinheiro, dados clínicos e isolamento;
3. providers e paridade que destravam valor de negócio;
4. operação no target e recuperação;
5. experiência, acessibilidade e diferenciação State of Art;
6. ML e otimizações depois de segurança, utilidade e medição.

## 9. Definition of Done executivo

Uma entrega só entra como concluída quando:

- comportamento de sucesso, erro, retry e recuperação foi observado no boundary correto;
- testes relevantes passaram com harness válido, sem skip oculto;
- autorização, tenant, auditoria, concorrência e dados foram verificados quando aplicável;
- documentação, contratos, backlog, matriz e artefatos estão sincronizados;
- migração, compatibilidade, rollout, rollback e recuperação têm prova quando expostos;
- revisão independente ocorreu quando exigida;
- owner, revisor, limitações, risco residual e próxima ação estão registrados.

## 10. Decisões que precisam ser tomadas no G0

1. Qual é o escopo de go-live: ERP amplo, piloto hospitalar ou recorte por domínio?
2. Quais providers e municípios entram no primeiro release?
3. Qual ambiente fornece PostgreSQL, Redis, storage, scanner, CI remoto e Kubernetes/Helm?
4. Quais metas formais de RPO/RTO, volume, concorrência e SLO serão usadas?
5. Quem são os aprovadores nominais de Produto, Operação, Segurança, DPO e liberação?
6. Quais exceções de paridade, acessibilidade ou integração são aceitáveis, por quanto tempo e com qual compensação?

Sem essas decisões, o trabalho técnico pode avançar em modo discovery/READY, mas a data de go-live e o selo AAA permanecem indeterminados.

## 11. Próximo checkpoint executivo

Ao final dos primeiros dez dias úteis, o Comitê deve receber: scorecard atualizado, owners e bloqueios, ambiente de teste, mapa de cobertura crítica, contrato de captura financeira, decisão de providers, SHA candidato preliminar, riscos com vencimento e evidência dos primeiros slices clínico/financeiro/UI. A revisão deve manter a decisão NO-GO caso qualquer bloqueador obrigatório continue sem prova.
