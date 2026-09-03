# Implementação do programa de usabilidade Playwright — CVG-HIS V4

Data de consolidação: 2 de setembro de 2026  
Escopo: backlog, plano executivo, relatório master e roadmap de usabilidade de 2 de setembro de 2026

## Situação executiva

A implementação técnica prevista em R0–R5 e nas ampliações P2 foi incorporada ao repositório. A homologação não é declarada por este documento: ela continua condicionada às três rodadas integrais no mesmo SHA com PostgreSQL, ao UAT assinado pelos quatro papéis e à validação manual por leitor de tela.

Foram descobertos 398 testes Playwright, acima da baseline mínima de 369. A auditoria master local coletou as 143 rotas em desktop e mobile, totalizando 286 registros, antes de bloquear o gate. Sem PostgreSQL neste host, 33 rotas por viewport falharam de forma explícita por fonte persistente indisponível; depois dos ajustes direcionados, as 286 renderizações não mantiveram achado estrutural de landmark, nome acessível, rótulo, alvo pequeno, foco ou overflow. A prova funcional definitiva dessas 66 navegações pertence ao workflow de certificação com banco.

## Rastreabilidade da implementação

| Itens                    | Estado técnico                                     | Evidência incorporada                                                                                                                                               |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ENV-001–004, QAG-001–002 | implementado; execução final pendente no CI        | stack PostgreSQL descartável, reset/migrations/seed, cache Playwright 1.58.2, relatórios por SHA, validação de zero skip/erro e gate master após coleta integral    |
| CLN-001–003              | implementado                                       | seleção explícita de persistência clínica, criação atômica, rollback induzido, retry idempotente sem duplicação e reidratação após fechamento da conexão            |
| BIL-001                  | implementado                                       | regressão de quitação atualiza imediatamente para `R$ 0,00` e confirma o mesmo estado ao reabrir                                                                    |
| API-001–004              | implementado; certificação DB pendente             | repositórios e contratos persistentes para catálogos, hubs e relatórios; auditoria transforma qualquer `4xx/5xx` inesperado em falha e conserva rota/correlation ID |
| EXP-001–003              | implementado                                       | contrato compartilhado de download com timeout de 12 s, bloqueio por loading, nome/MIME/encoding determinísticos e feedback acionável                               |
| OBS-001                  | implementado                                       | métrica e log por rota normalizada, papel, operação e resultado; alertas Prometheus e painel Grafana filtrável                                                      |
| A11Y-001–005             | implementado                                       | um `main`, skip link para `#main-content`, campos nomeados, alvos mínimos e seis jornadas críticas com Axe/teclado                                                  |
| RBAC-001–002             | implementado                                       | cargas secundárias condicionadas à permissão e matriz persistente allow/deny sem ampliar papéis                                                                     |
| RWD-001–004              | implementado                                       | correção dos dez overflows, tabela com scroll local e matriz 18/18 em 320, 768 e 1024 px                                                                            |
| QAG-003                  | implementado; execução DB pendente                 | os seis cenários persistentes não são ignorados no modo DB e o runner valida restart                                                                                |
| QAG-004–005, DOC-001     | automação implementada; aprovação externa pendente | workflow de três rodadas no mesmo SHA, campos UAT/approvers/riscos/go-no-go obrigatórios e índice de evidências gerado                                              |
| TAB-001–002              | implementado                                       | DataTable cobre 0, 1, 100 e 1.000 linhas; CSV cobre BOM/UTF-8, separador, escape, decimais, timezone e neutralização de fórmulas                                    |
| QAG-006                  | implementado; execução CI pendente                 | subconjunto essencial configurado para Chromium, Firefox e WebKit                                                                                                   |
| A11Y-006                 | roteiro implementado; execução humana pendente     | checklist NVDA/VoiceOver no runbook, exigido como evidência antes de `go`                                                                                           |

## Gates e evidências

O workflow `.github/workflows/usability-certification.yml` executa três rodadas integrais com banco no mesmo SHA, uma matriz cross-browser e um job final que recusa `go` se qualquer resultado técnico falhar. O validador `scripts/validate-usability-playwright-evidence.mjs` exige pelo menos 369 testes contabilizados, zero skip, zero unexpected e exatamente 286 auditorias aprovadas. O gerador `scripts/generate-usability-certification-index.mjs` consolida SHA, URL da execução, resultados, UAT, aprovadores, riscos e decisão.

O procedimento operacional e os limites de responsabilidade estão em [usability-certification-runbook.md](./usability-certification-runbook.md). Nenhuma credencial, aceite humano ou decisão de produção é fabricada automaticamente.

## Validações locais registradas

- build completo do SPA, incluindo `vue-tsc`, aprovado;
- build da API aprovado;
- suíte completa da API: 543/543 testes, sem falhas ou skips;
- suíte completa da SPA: 1.063/1.063 testes em 178 arquivos, com concorrência limitada a dois workers neste host;
- design system: 33/33 testes;
- Axe + teclado nas seis superfícies críticas: 6/6;
- matriz responsiva: 18/18;
- auditoria master: 286/286 registros coletados e gate corretamente reprovado no host sem banco;
- revalidação dirigida dos três resíduos estruturais: somente o erro de fonte persistente permaneceu;
- contrato de observabilidade: séries normalizadas para `forbidden` e `download` aprovadas;
- parser YAML, gerador do índice e contratos de CI/observabilidade: 28/28 aprovados;
- descoberta Playwright em modo DB: 398 testes, sem remoção dos seis persistentes.

## Pendências que não podem ser autoatestadas neste host

1. Disparar a certificação em um runner com Docker/PostgreSQL e obter três rodadas verdes no mesmo SHA.
2. Executar e assinar o UAT de recepção, veterinário, enfermagem e administração.
3. Executar o roteiro NVDA/VoiceOver e anexar o parecer do especialista.
4. Registrar riscos residuais, aprovadores e a decisão `go` ou `no-go` no workflow.

Até essas quatro ações ocorrerem, o estado correto é **implementação concluída, homologação pendente**.
